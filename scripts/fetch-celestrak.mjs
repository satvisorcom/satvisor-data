#!/usr/bin/env node
/**
 * fetch-celestrak.mjs
 *
 * Fetches CelesTrak GP data (TLE + JSON formats) for satellite groups
 * and writes them to celestrak/tle/ and celestrak/json/.
 *
 * Zero npm dependencies — uses Node built-in fetch, fs, path.
 *
 * Usage:
 *   node scripts/fetch-celestrak.mjs --tier hot
 *   node scripts/fetch-celestrak.mjs --tier warm
 *   node scripts/fetch-celestrak.mjs --tier cold
 *   node scripts/fetch-celestrak.mjs --groups starlink,gps-ops
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Tier Definitions ────────────────────────────────────────────

const TIERS = {
  hot: {
    groups: [
      'starlink', 'oneweb', 'qianfan', 'hulianwang', 'kuiper',
      'active', 'visual',
    ],
    special: ['decaying'],
  },
  warm: {
    groups: [
      'last-30-days', 'stations',
      'gps-ops', 'glo-ops', 'galileo', 'beidou', 'gnss',
      'weather', 'noaa', 'goes',
      'iridium-NEXT', 'planet', 'spire', 'globalstar', 'orbcomm',
      'geo', 'satnogs', 'fengyun-1c-debris',
    ],
    special: ['gpz', 'gpz-plus'],
  },
  cold: {
    groups: [
      'analyst',
      'intelsat', 'ses', 'eutelsat', 'telesat',
      'amateur', 'cubesat',
      'military', 'radar',
      'science', 'geodetic', 'engineering', 'education',
      'resource', 'sarsat', 'dmc', 'tdrss', 'argos',
      'x-comm', 'other-comm',
      'sbas', 'nnss', 'musson',
      'other',
      'cosmos-1408-debris',
      'iridium-33-debris', 'cosmos-2251-debris',
    ],
    special: [],
  },
};

// ─── CelesTrak URLs ──────────────────────────────────────────────

const GP_BASE = 'https://celestrak.org/NORAD/elements/gp.php';

function celestrakUrl(name, format, isSpecial) {
  const param = isSpecial ? 'SPECIAL' : 'GROUP';
  return `${GP_BASE}?${param}=${name}&FORMAT=${format}`;
}

// ─── Helpers ─────────────────────────────────────────────────────

const DELAY_MS = 2000;
const TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return resp;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/** Count TLE line-1 entries in text (lines starting with "1 "). */
function countTleSats(text) {
  let count = text.startsWith('1 ') ? 1 : 0;
  let pos = 0;
  while ((pos = text.indexOf('\n1 ', pos)) !== -1) {
    count++;
    pos += 3;
  }
  return count;
}

/** Count entries in JSON array response. */
function countJsonEntries(text) {
  try {
    return JSON.parse(text).length;
  } catch {
    return 0;
  }
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

// ─── Fetch a single format ────────────────────────────────────────

/**
 * Fetch a single format (TLE or JSON) for a group.
 * Returns { ok, rateLimited, text } where:
 *   - ok: true if data was fetched successfully
 *   - rateLimited: true if CelesTrak returned 403
 *   - text: response text (only if ok)
 */
async function fetchFormat(name, format, isSpecial) {
  const url = celestrakUrl(name, format, isSpecial);
  try {
    const resp = await fetchWithTimeout(url);
    if (resp.status === 403) {
      console.warn(`  ⚠ ${name} ${format.toUpperCase()}: HTTP 403 (rate limited)`);
      return { ok: false, rateLimited: true };
    }
    if (!resp.ok) {
      console.warn(`  ⚠ ${name} ${format.toUpperCase()}: HTTP ${resp.status} — skipping`);
      return { ok: false, rateLimited: false };
    }
    const text = await resp.text();
    if (text.trim().length === 0) {
      console.warn(`  ⚠ ${name} ${format.toUpperCase()}: empty response — skipping`);
      return { ok: false, rateLimited: false };
    }
    return { ok: true, rateLimited: false, text };
  } catch (err) {
    console.warn(`  ⚠ ${name} ${format.toUpperCase()}: ${err.message} — skipping`);
    return { ok: false, rateLimited: false };
  }
}

// ─── Fetch a single group ────────────────────────────────────────

/**
 * Returns 'ok' | 'failed' | 'rate-limited'.
 * On 'rate-limited', the caller should abort all remaining groups.
 */
async function fetchGroup(name, isSpecial, tier, manifest) {
  const section = isSpecial ? 'special' : 'groups';
  const baseDir = isSpecial
    ? join(ROOT, 'celestrak', 'special')
    : join(ROOT, 'celestrak');

  const tleDir = join(baseDir, 'tle');
  const jsonDir = join(baseDir, 'json');
  mkdirSync(tleDir, { recursive: true });
  mkdirSync(jsonDir, { recursive: true });

  const tlePath = join(tleDir, `${name}.tle`);
  const jsonPath = join(jsonDir, `${name}.json`);

  let tleOk = false;
  let jsonOk = false;
  let count = 0;

  // Fetch TLE format
  const tleResult = await fetchFormat(name, 'tle', isSpecial);
  if (tleResult.rateLimited) return 'rate-limited';
  if (tleResult.ok) {
    count = countTleSats(tleResult.text);
    writeFileSync(tlePath, tleResult.text);
    tleOk = true;
  }

  await sleep(DELAY_MS);

  // Fetch JSON format
  const jsonResult = await fetchFormat(name, 'json', isSpecial);
  if (jsonResult.rateLimited) return 'rate-limited';
  if (jsonResult.ok) {
    if (count === 0) count = countJsonEntries(jsonResult.text);
    writeFileSync(jsonPath, jsonResult.text);
    jsonOk = true;
  }

  // Update manifest
  if (tleOk || jsonOk) {
    const now = new Date().toISOString();
    const formats = [];
    if (tleOk) formats.push('tle');
    if (jsonOk) formats.push('json');

    manifest[section][name] = {
      updatedAt: now,
      count,
      tier,
      formats,
    };
    console.log(`  ✓ ${name}: ${count} sats [${formats.join(', ')}]`);
    return 'ok';
  }

  return 'failed';
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  let groups = [];
  let specialGroups = [];
  let tierName = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tier' && args[i + 1]) {
      tierName = args[++i];
      const tier = TIERS[tierName];
      if (!tier) {
        console.error(`Unknown tier: ${tierName}. Valid: ${Object.keys(TIERS).join(', ')}`);
        process.exit(1);
      }
      groups = tier.groups;
      specialGroups = tier.special;
    } else if (args[i] === '--groups' && args[i + 1]) {
      groups = args[++i].split(',').map(g => g.trim()).filter(Boolean);
    } else if (args[i] === '--special' && args[i + 1]) {
      specialGroups = args[++i].split(',').map(g => g.trim()).filter(Boolean);
    }
  }

  if (groups.length === 0 && specialGroups.length === 0) {
    console.error('Usage: node fetch-celestrak.mjs --tier hot|warm|cold');
    console.error('       node fetch-celestrak.mjs --groups starlink,gps-ops [--special decaying]');
    process.exit(1);
  }

  const total = groups.length + specialGroups.length;
  console.log(`Fetching ${total} group(s)${tierName ? ` (tier: ${tierName})` : ''}...\n`);

  const manifest = loadManifest();
  let success = 0;
  let failed = 0;
  let aborted = false;

  // Fetch regular groups
  for (let i = 0; i < groups.length; i++) {
    const result = await fetchGroup(groups[i], false, tierName ?? 'manual', manifest);
    if (result === 'rate-limited') {
      console.error(`\n✗ Rate limited by CelesTrak — aborting remaining groups to avoid further 403s.`);
      aborted = true;
      break;
    }
    if (result === 'ok') success++;
    else failed++;
    if (i < groups.length - 1 || specialGroups.length > 0) {
      await sleep(DELAY_MS);
    }
  }

  // Fetch special groups (skip if already rate-limited)
  if (!aborted) {
    for (let i = 0; i < specialGroups.length; i++) {
      const result = await fetchGroup(specialGroups[i], true, tierName ?? 'manual', manifest);
      if (result === 'rate-limited') {
        console.error(`\n✗ Rate limited by CelesTrak — aborting remaining groups to avoid further 403s.`);
        aborted = true;
        break;
      }
      if (result === 'ok') success++;
      else failed++;
      if (i < specialGroups.length - 1) {
        await sleep(DELAY_MS);
      }
    }
  }

  // Always save manifest — even partial updates are worth persisting
  saveManifest(manifest);

  if (aborted) {
    console.log(`\nAborted: ${success} updated before rate limit. Existing files preserved.`);
  } else {
    console.log(`\nDone: ${success} updated, ${failed} failed/skipped`);
    if (failed > 0) {
      console.log('(Partial failures are expected — existing files preserved)');
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
