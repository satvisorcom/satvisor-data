# satvisor-data

Automated mirror of satellite orbital data and catalog metadata for [Satvisor](https://github.com/satvisorcom/satvisor). GitHub Actions fetch from external APIs on tiered cron schedules so the app can consume static files from `raw.githubusercontent.com` without hitting rate limits.

Each group is available in both TLE and OMM JSON formats.

## Mega-Constellations

Updated every 2 hours.

| Group | Slug | Sats | TLE | JSON |
|-------|------|-----:|-----|------|
| Starlink | `starlink` | ~9,700 | [tle](celestrak/tle/starlink.tle) | [json](celestrak/json/starlink.json) |
| OneWeb | `oneweb` | ~650 | [tle](celestrak/tle/oneweb.tle) | [json](celestrak/json/oneweb.json) |
| Kuiper | `kuiper` | ~210 | [tle](celestrak/tle/kuiper.tle) | [json](celestrak/json/kuiper.json) |
| Qianfan (G60) | `qianfan` | ~110 | [tle](celestrak/tle/qianfan.tle) | [json](celestrak/json/qianfan.json) |
| Hulianwang (Guowang) | `hulianwang` | ~150 | [tle](celestrak/tle/hulianwang.tle) | [json](celestrak/json/hulianwang.json) |

## Special Interest

Updated every 2-12 hours.

| Group | Slug | Sats | TLE | JSON |
|-------|------|-----:|-----|------|
| Space Stations | `stations` | ~35 | [tle](celestrak/tle/stations.tle) | [json](celestrak/json/stations.json) |
| 100 Brightest | `visual` | ~150 | [tle](celestrak/tle/visual.tle) | [json](celestrak/json/visual.json) |
| Active Satellites | `active` | ~14,500 | [tle](celestrak/tle/active.tle) | [json](celestrak/json/active.json) |
| Last 30 Days' Launches | `last-30-days` | ~270 | [tle](celestrak/tle/last-30-days.tle) | [json](celestrak/json/last-30-days.json) |
| Analyst Satellites | `analyst` | ~220 | [tle](celestrak/tle/analyst.tle) | [json](celestrak/json/analyst.json) |

## Communications

Updated every 6-12 hours.

| Group | Slug | Sats | TLE | JSON |
|-------|------|-----:|-----|------|
| Iridium NEXT | `iridium-NEXT` | ~80 | [tle](celestrak/tle/iridium-NEXT.tle) | [json](celestrak/json/iridium-NEXT.json) |
| Globalstar | `globalstar` | ~85 | [tle](celestrak/tle/globalstar.tle) | [json](celestrak/json/globalstar.json) |
| Orbcomm | `orbcomm` | ~60 | [tle](celestrak/tle/orbcomm.tle) | [json](celestrak/json/orbcomm.json) |
| Intelsat | `intelsat` | ~60 | [tle](celestrak/tle/intelsat.tle) | [json](celestrak/json/intelsat.json) |
| SES | `ses` | ~65 | [tle](celestrak/tle/ses.tle) | [json](celestrak/json/ses.json) |
| Eutelsat | `eutelsat` | ~30 | [tle](celestrak/tle/eutelsat.tle) | [json](celestrak/json/eutelsat.json) |
| Telesat | `telesat` | ~20 | [tle](celestrak/tle/telesat.tle) | [json](celestrak/json/telesat.json) |
| Geostationary | `geo` | ~570 | [tle](celestrak/tle/geo.tle) | [json](celestrak/json/geo.json) |
| Amateur Radio | `amateur` | ~100 | [tle](celestrak/tle/amateur.tle) | [json](celestrak/json/amateur.json) |
| SatNOGS | `satnogs` | ~700 | [tle](celestrak/tle/satnogs.tle) | [json](celestrak/json/satnogs.json) |
| Experimental Comms | `x-comm` | ~20 | [tle](celestrak/tle/x-comm.tle) | [json](celestrak/json/x-comm.json) |
| Other Comms | `other-comm` | ~25 | [tle](celestrak/tle/other-comm.tle) | [json](celestrak/json/other-comm.json) |

## Navigation

Updated every 6-12 hours.

| Group | Slug | Sats | TLE | JSON |
|-------|------|-----:|-----|------|
| All GNSS | `gnss` | ~170 | [tle](celestrak/tle/gnss.tle) | [json](celestrak/json/gnss.json) |
| GPS | `gps-ops` | ~30 | [tle](celestrak/tle/gps-ops.tle) | [json](celestrak/json/gps-ops.json) |
| GLONASS | `glo-ops` | ~30 | [tle](celestrak/tle/glo-ops.tle) | [json](celestrak/json/glo-ops.json) |
| Galileo | `galileo` | ~35 | [tle](celestrak/tle/galileo.tle) | [json](celestrak/json/galileo.json) |
| BeiDou | `beidou` | ~55 | [tle](celestrak/tle/beidou.tle) | [json](celestrak/json/beidou.json) |
| SBAS | `sbas` | ~20 | [tle](celestrak/tle/sbas.tle) | [json](celestrak/json/sbas.json) |
| NNSS | `nnss` | ~20 | [tle](celestrak/tle/nnss.tle) | [json](celestrak/json/nnss.json) |
| Musson | `musson` | ~10 | [tle](celestrak/tle/musson.tle) | [json](celestrak/json/musson.json) |

## Weather & Earth Observation

Updated every 6-12 hours.

| Group | Slug | Sats | TLE | JSON |
|-------|------|-----:|-----|------|
| Weather | `weather` | ~70 | [tle](celestrak/tle/weather.tle) | [json](celestrak/json/weather.json) |
| NOAA | `noaa` | ~25 | [tle](celestrak/tle/noaa.tle) | [json](celestrak/json/noaa.json) |
| GOES | `goes` | ~20 | [tle](celestrak/tle/goes.tle) | [json](celestrak/json/goes.json) |
| Earth Resources | `resource` | ~160 | [tle](celestrak/tle/resource.tle) | [json](celestrak/json/resource.json) |
| Planet | `planet` | ~75 | [tle](celestrak/tle/planet.tle) | [json](celestrak/json/planet.json) |
| Spire | `spire` | ~50 | [tle](celestrak/tle/spire.tle) | [json](celestrak/json/spire.json) |
| SARSAT | `sarsat` | ~85 | [tle](celestrak/tle/sarsat.tle) | [json](celestrak/json/sarsat.json) |
| ARGOS | `argos` | ~30 | [tle](celestrak/tle/argos.tle) | [json](celestrak/json/argos.json) |
| Disaster Monitoring | `dmc` | ~10 | [tle](celestrak/tle/dmc.tle) | [json](celestrak/json/dmc.json) |
| TDRSS | `tdrss` | ~25 | [tle](celestrak/tle/tdrss.tle) | [json](celestrak/json/tdrss.json) |

## Scientific & Other

Updated every 12 hours.

| Group | Slug | Sats | TLE | JSON |
|-------|------|-----:|-----|------|
| Science | `science` | ~50 | [tle](celestrak/tle/science.tle) | [json](celestrak/json/science.json) |
| Geodetic | `geodetic` | ~10 | [tle](celestrak/tle/geodetic.tle) | [json](celestrak/json/geodetic.json) |
| Engineering | `engineering` | ~40 | [tle](celestrak/tle/engineering.tle) | [json](celestrak/json/engineering.json) |
| Education | `education` | ~6 | [tle](celestrak/tle/education.tle) | [json](celestrak/json/education.json) |
| Military | `military` | ~20 | [tle](celestrak/tle/military.tle) | [json](celestrak/json/military.json) |
| Radar Calibration | `radar` | ~10 | [tle](celestrak/tle/radar.tle) | [json](celestrak/json/radar.json) |
| CubeSats | `cubesat` | ~90 | [tle](celestrak/tle/cubesat.tle) | [json](celestrak/json/cubesat.json) |
| Other | `other` | ~1 | [tle](celestrak/tle/other.tle) | [json](celestrak/json/other.json) |

## Debris

Updated every 6-12 hours.

| Group | Slug | Sats | TLE | JSON |
|-------|------|-----:|-----|------|
| FENGYUN 1C Debris | `fengyun-1c-debris` | ~1,850 | [tle](celestrak/tle/fengyun-1c-debris.tle) | [json](celestrak/json/fengyun-1c-debris.json) |
| COSMOS 2251 Debris | `cosmos-2251-debris` | ~580 | [tle](celestrak/tle/cosmos-2251-debris.tle) | [json](celestrak/json/cosmos-2251-debris.json) |
| IRIDIUM 33 Debris | `iridium-33-debris` | ~110 | [tle](celestrak/tle/iridium-33-debris.tle) | [json](celestrak/json/iridium-33-debris.json) |
| COSMOS 1408 Debris (ASAT) | `cosmos-1408-debris` | ~4 | [tle](celestrak/tle/cosmos-1408-debris.tle) | [json](celestrak/json/cosmos-1408-debris.json) |

## Special Datasets

Updated every 2-6 hours.

| Dataset | Slug | Sats | TLE | JSON |
|---------|------|-----:|-----|------|
| Decaying (reentry candidates) | `decaying` | ~75 | [tle](celestrak/special/tle/decaying.tle) | [json](celestrak/special/json/decaying.json) |
| GEO Protected Zone | `gpz` | ~870 | [tle](celestrak/special/tle/gpz.tle) | [json](celestrak/special/json/gpz.json) |
| GEO Protected Zone+ | `gpz-plus` | ~1,750 | [tle](celestrak/special/tle/gpz-plus.tle) | [json](celestrak/special/json/gpz-plus.json) |

## Catalog Data

Updated weekly.

| File | Source | Entries | Description |
|------|--------|--------:|-------------|
| [`catalog/satnogs.json`](catalog/satnogs.json) | [SatNOGS DB](https://db.satnogs.org) | ~2,600 | Satellite metadata + ~2,600 transmitter frequencies |
| [`catalog/stdmag.json`](catalog/stdmag.json) | McCants + SATCAT | ~33,000 | Standard visual magnitudes (observed + RCS-derived + heuristic) |

## Usage

Raw URLs follow the pattern:
```
https://raw.githubusercontent.com/satvisorcom/satvisor-data/master/celestrak/tle/{slug}.tle
https://raw.githubusercontent.com/satvisorcom/satvisor-data/master/celestrak/json/{slug}.json
```

Freshness metadata: [`manifest.json`](manifest.json)

## Running Scripts Locally

All scripts are zero-dependency Node.js (requires Node 18+).

```bash
node scripts/fetch-celestrak.mjs --tier hot          # fetch a tier
node scripts/fetch-celestrak.mjs --groups starlink    # fetch specific groups
node scripts/fetch-celestrak.mjs --special decaying   # fetch special datasets
node scripts/generate-satnogs.mjs                     # update SatNOGS catalog
node scripts/generate-stdmag.mjs                      # update visual magnitudes
```

## Repo Cleanup

A weekly workflow replaces all git history with a single commit containing the current data. Old satellite data has no archival value — only the latest TLEs matter.
