#!/usr/bin/env node
/**
 * generate-stdmag.mjs
 *
 * Generates catalog/stdmag.json — a lookup table of satellite standard visual
 * magnitudes keyed by NORAD catalog number.
 *
 * Data sources (in priority order):
 *   1. McCants qs.mag  — observationally-derived visual magnitudes (~4,100 sats)
 *   2. CelesTrak SATCAT — RCS (radar cross-section) converted to estimated mag
 *   3. Built-in name-prefix heuristics — for known constellations missing from both
 *
 * Ported from satvisor's scripts/generate-stdmag.ts (same logic, zero npm deps).
 *
 * Usage:
 *   node scripts/generate-stdmag.mjs
 *
 * Output:
 *   catalog/stdmag.json — compact { [noradId]: stdMag } mapping
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MCCANTS_URL = 'https://raw.githubusercontent.com/barolfe/satellite-tracker/master/qs.mag';
const SATCAT_URL = 'https://celestrak.org/pub/satcat.csv';

// ─── Magnitude Conversion ────────────────────────────────────────

/**
 * Convert RCS (m²) to approximate standard magnitude.
 *
 * Based on the reflected-sunlight formula for a Lambertian sphere:
 *   stdMag = -26.74 - 2.5 * log10(albedo * RCS / (4π * range²))
 * evaluated at range = 1000 km, 90° phase angle.
 *
 * At 90° phase for a Lambertian sphere, the phase function F(90°) = 1/π,
 * so the effective reflected fraction is albedo * F(90°) = albedo/π.
 *
 * We use albedo = 0.15 (typical spacecraft average).
 */
function rcsToStdMag(rcsM2) {
  const albedo = 0.15;
  const flux = (albedo * rcsM2) / (4 * Math.PI * Math.PI * 1e12);
  return -26.74 - 2.5 * Math.log10(flux);
}

/**
 * McCants "QuickSat" magnitude convention:
 * Brightness at 1000 km, FULL (100%) illumination, brightest orientation.
 * Our model uses 90° phase (half illumination) as the reference.
 *
 * The Lambertian phase function ratio: F(0°)/F(90°) = 2 (full/half).
 * In magnitudes: -2.5 * log10(2) ≈ -0.75
 * So McCants magnitudes are ~0.75 mag brighter than our 90° convention.
 *
 * Additionally, McCants uses "brightest likely" orientation which is
 * another ~0.3–0.7 mag brighter than average. We split the difference
 * and add 1.0 mag to convert McCants → our convention.
 */
const MCCANTS_OFFSET = 1.0;

// ─── Name-prefix heuristics ──────────────────────────────────────

// Values are standard magnitude at 1000 km, 90° phase angle.
const PREFIX_RULES = [
  ['STARLINK',    7.0],
  ['ONEWEB',      7.0],
  ['IRIDIUM',     6.5],
  ['GLOBALSTAR',  5.0],
  ['ORBCOMM',     8.0],
  ['BEIDOU',      5.5],
  ['GALILEO',     5.5],
  ['GLONASS',     5.5],
  ['GPS ',        5.5],
  ['NAVSTAR',     5.5],
  ['FENGYUN',     5.0],
  ['METEOR-M',    5.0],
  ['NOAA ',       5.5],
  ['COSMOS',      5.0],
  ['SL-',         3.5],
  ['CZ-',         3.5],
  ['FALCON 9',    3.0],
  ['DELTA',       3.5],
  ['ATLAS',       3.5],
];

function prefixMag(name) {
  const upper = name.toUpperCase();
  for (const [prefix, mag] of PREFIX_RULES) {
    if (upper.startsWith(prefix)) return mag;
  }
  return null;
}

// Object type fallback based on median RCS per type
function objectTypeMag(objectType) {
  switch (objectType) {
    case 'PAY': return rcsToStdMag(2.3);    // ~5.8
    case 'R/B': return rcsToStdMag(4.6);    // ~5.0
    case 'DEB': return rcsToStdMag(0.02);   // ~10.9
    default:    return 6.0;
  }
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// ─── Fetching ────────────────────────────────────────────────────

async function fetchText(url, label) {
  console.log(`Fetching ${label}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${label}: ${resp.status} ${resp.statusText}`);
  const text = await resp.text();
  console.log(`  → ${(text.length / 1024).toFixed(0)} KB`);
  return text;
}

// ─── Parsing ─────────────────────────────────────────────────────

function parseMcCants(text) {
  const lines = text.split('\n');
  const entries = [];

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (line.length < 37) continue;

    const idStr = line.substring(0, 5).trim();
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0 || id >= 99999) continue;

    const flag = line[6] || ' ';
    const magStr = line.substring(32, 37).trim();
    if (!magStr) continue;

    const mag = parseFloat(magStr);
    if (isNaN(mag)) continue;

    entries.push({ noradId: id, mag, flag });
  }

  return entries;
}

function parseSatcat(csv) {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',');
  const idx = {
    name: header.indexOf('OBJECT_NAME'),
    norad: header.indexOf('NORAD_CAT_ID'),
    type: header.indexOf('OBJECT_TYPE'),
    rcs: header.indexOf('RCS'),
    decay: header.indexOf('DECAY_DATE'),
  };

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    const noradId = parseInt(cols[idx.norad], 10);
    if (isNaN(noradId)) continue;

    const rcsStr = cols[idx.rcs]?.trim();
    const rcs = rcsStr ? parseFloat(rcsStr) : null;

    entries.push({
      noradId,
      name: cols[idx.name] || '',
      objectType: cols[idx.type] || '',
      rcs: (rcs !== null && !isNaN(rcs) && rcs > 0) ? rcs : null,
      decayed: !!(cols[idx.decay]?.trim()),
    });
  }

  return entries;
}

// ─── Manifest ────────────────────────────────────────────────────

function loadManifest() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf-8'));
  } catch {
    return { generatedAt: null, groups: {}, special: {}, catalog: {} };
  }
}

function saveManifest(manifest) {
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const [mccantsText, satcatText] = await Promise.all([
    fetchText(MCCANTS_URL, 'McCants qs.mag'),
    fetchText(SATCAT_URL, 'CelesTrak SATCAT CSV'),
  ]);

  const mccants = parseMcCants(mccantsText);
  const satcat = parseSatcat(satcatText);

  console.log(`\nParsed:`);
  console.log(`  McCants: ${mccants.length} entries with magnitude`);
  console.log(`  SATCAT:  ${satcat.length} total, ${satcat.filter(s => s.rcs !== null).length} with RCS`);

  const result = {};
  const stats = { mccants: 0, rcs: 0, prefix: 0, objectType: 0, skippedDecayed: 0 };

  // Index McCants by NORAD ID
  const mccantsMap = new Map();
  for (const entry of mccants) {
    if (entry.flag === 'd') {
      stats.skippedDecayed++;
      continue;
    }
    mccantsMap.set(entry.noradId, entry.mag + MCCANTS_OFFSET);
  }

  // Build a set of decayed NORAD IDs from SATCAT
  const decayedIds = new Set();
  for (const entry of satcat) {
    if (entry.decayed) decayedIds.add(entry.noradId);
  }

  // Process SATCAT entries (on-orbit only)
  for (const entry of satcat) {
    if (entry.decayed) continue;

    const noradId = entry.noradId;

    // Priority 1: McCants observed magnitude
    if (mccantsMap.has(noradId)) {
      result[noradId] = round1(mccantsMap.get(noradId));
      stats.mccants++;
      continue;
    }

    // Priority 2: RCS-derived magnitude
    if (entry.rcs !== null) {
      result[noradId] = round1(rcsToStdMag(entry.rcs));
      stats.rcs++;
      continue;
    }

    // Priority 3: Name-prefix heuristic
    const pmag = prefixMag(entry.name);
    if (pmag !== null) {
      result[noradId] = pmag;
      stats.prefix++;
      continue;
    }

    // Priority 4: Object-type fallback
    result[noradId] = round1(objectTypeMag(entry.objectType));
    stats.objectType++;
  }

  // Also add McCants entries that might not be in SATCAT
  for (const [noradId, mag] of mccantsMap) {
    if (!(noradId in result) && !decayedIds.has(noradId)) {
      result[noradId] = round1(mag);
      stats.mccants++;
    }
  }

  console.log(`\nOutput: ${Object.keys(result).length} entries`);
  console.log(`  Source breakdown:`);
  console.log(`    McCants observed:    ${stats.mccants}`);
  console.log(`    SATCAT RCS-derived:  ${stats.rcs}`);
  console.log(`    Name-prefix rule:    ${stats.prefix}`);
  console.log(`    Object-type fallback:${stats.objectType}`);
  console.log(`    Skipped (decayed):   ${stats.skippedDecayed}`);

  // Spot-check well-known satellites
  console.log(`\n  Spot checks:`);
  const checks = [
    ['ISS', 25544], ['Hubble', 20580], ['Vanguard 1', 5],
  ];
  for (const [name, id] of checks) {
    console.log(`    ${name} (${id}): ${result[id] ?? 'missing'}`);
  }

  // Write output
  const outDir = join(ROOT, 'catalog');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'stdmag.json');

  const json = JSON.stringify(result);
  writeFileSync(outPath, json + '\n');
  console.log(`\nWritten to ${outPath} (${(json.length / 1024).toFixed(0)} KB)`);

  // Update manifest
  const manifest = loadManifest();
  manifest.catalog.stdmag = {
    updatedAt: new Date().toISOString(),
    count: Object.keys(result).length,
  };
  saveManifest(manifest);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
