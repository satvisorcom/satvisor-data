#!/usr/bin/env node
/**
 * generate-satnogs.mjs
 *
 * Generates catalog/satnogs.json — a lookup table of satellite metadata and
 * transmitter frequencies keyed by NORAD catalog number.
 *
 * Data source: SatNOGS DB API (public, no auth)
 *   https://db.satnogs.org/api/satellites/?format=json
 *   https://db.satnogs.org/api/transmitters/?format=json
 *
 * Ported from satvisor's scripts/generate-satfreq.ts (same logic, zero npm deps).
 *
 * Usage:
 *   node scripts/generate-satnogs.mjs
 *
 * Output:
 *   catalog/satnogs.json — { [noradId]: { sat: [...], tx: [[...], ...] } }
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SAT_API_URL = 'https://db.satnogs.org/api/satellites/?format=json';
const TX_API_URL = 'https://db.satnogs.org/api/transmitters/?format=json';

// Service priority for sorting (lower = more relevant for radio hobbyists)
const SERVICE_PRIORITY = {
  'Amateur': 0,
  'Meteorological': 1,
  'Space Research': 2,
  'Radiolocation': 3,
  'Radionavigational': 4,
  'Aeronautical': 5,
  'Inter-satellite': 6,
};

function servicePriority(service) {
  return SERVICE_PRIORITY[service] ?? 99;
}

async function fetchJson(url, label) {
  console.log(`Fetching ${label}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  const data = await resp.json();
  console.log(`  → ${Array.isArray(data) ? data.length + ' entries' : 'ok'}`);
  return data;
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
  const [satellites, transmitters] = await Promise.all([
    fetchJson(SAT_API_URL, 'SatNOGS satellites'),
    fetchJson(TX_API_URL, 'SatNOGS transmitters'),
  ]);

  // Filter to active, alive transmitters with a downlink frequency
  const activeTx = transmitters.filter(tx =>
    tx.alive &&
    tx.status === 'active' &&
    tx.downlink_low !== null &&
    tx.downlink_low > 0
  );
  console.log(`\n  ${activeTx.length} active transmitters with downlink`);

  // Group transmitters by NORAD ID
  const txByNorad = new Map();
  for (const tx of activeTx) {
    const id = tx.norad_cat_id;
    if (!id || id <= 0) continue;
    if (!txByNorad.has(id)) txByNorad.set(id, []);
    txByNorad.get(id).push(tx);
  }

  // Build output — include ALL satellites
  const result = {};

  for (const s of satellites) {
    if (s.norad_cat_id <= 0) continue;
    const noradId = s.norad_cat_id;

    const txList = txByNorad.get(noradId) ?? [];
    txList.sort((a, b) => {
      const sp = servicePriority(a.service) - servicePriority(b.service);
      if (sp !== 0) return sp;
      return (a.downlink_low ?? 0) - (b.downlink_low ?? 0);
    });

    const tx = txList.map(t => [
      t.description || 'Unknown',
      t.downlink_low,
      t.mode || null,
      t.service || null,
    ]);

    result[String(noradId)] = {
      sat: [
        s.name || null,
        s.sat_id,
        s.names || null,
        s.status || null,
        s.launched?.slice(0, 10) || null,
        s.countries || null,
        (s.operator && s.operator !== 'None') ? s.operator : null,
        s.image || null,
        s.website || null,
      ],
      tx,
    };
  }

  // Also include orphan transmitters (NORAD IDs with tx but no satellite entry)
  for (const [noradId, txList] of txByNorad) {
    if (result[String(noradId)]) continue;
    txList.sort((a, b) => {
      const sp = servicePriority(a.service) - servicePriority(b.service);
      if (sp !== 0) return sp;
      return (a.downlink_low ?? 0) - (b.downlink_low ?? 0);
    });
    result[String(noradId)] = {
      tx: txList.map(t => [
        t.description || 'Unknown',
        t.downlink_low,
        t.mode || null,
        t.service || null,
      ]),
    };
  }

  // Statistics
  const totalTx = Object.values(result).reduce((s, e) => s + e.tx.length, 0);
  const withSat = Object.values(result).filter(e => e.sat).length;
  const withTx = Object.values(result).filter(e => e.tx.length > 0).length;
  const statusCounts = {};
  for (const e of Object.values(result)) {
    const status = e.sat?.[3] || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  console.log(`\nOutput: ${Object.keys(result).length} satellites, ${totalTx} transmitters`);
  console.log(`  ${withSat} with metadata, ${withTx} with transmitters`);
  console.log(`  Status: ${Object.entries(statusCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);

  // Spot checks — these must all pass or the script fails (CI gate)
  const checks = [
    ['ISS', '25544'],
    ['NOAA-15', '25338'],
    ['NOAA-18', '28654'],
    ['NOAA-19', '33591'],
  ];
  let spotFailed = false;
  console.log('\n  Spot checks:');
  for (const [name, id] of checks) {
    const e = result[id];
    if (e && e.tx.length > 0 && e.sat) {
      const first = e.tx[0];
      console.log(`    ✓ ${name} (${id}): ${e.tx.length} tx — first: ${(first[1] / 1e6).toFixed(3)} MHz (${first[2] ?? '?'})`);
    } else {
      console.error(`    ✗ ${name} (${id}): MISSING — expected transmitter data`);
      spotFailed = true;
    }
  }
  if (spotFailed) {
    console.error('\nSpot check failed — aborting. SatNOGS data may be incomplete.');
    process.exit(1);
  }

  // Write output
  const outDir = join(ROOT, 'catalog');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'satnogs.json');

  const json = JSON.stringify(result);
  writeFileSync(outPath, json + '\n');
  console.log(`\nWritten to ${outPath} (${(json.length / 1024).toFixed(0)} KB)`);

  // Update manifest
  const manifest = loadManifest();
  manifest.catalog.satnogs = {
    updatedAt: new Date().toISOString(),
    count: Object.keys(result).length,
  };
  saveManifest(manifest);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
