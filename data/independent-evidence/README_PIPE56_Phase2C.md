# SUBTERRA — Pipe 56 Phase 2C: Independent Route Evidence Register

**Case:** `NCSF-P56-BLIND-V1`  
**Recorded:** 2026-11-21  
**Status:** Source discovery and spatial coverage checks completed; road/trench geometry **not yet extracted**.  
**Controlled replay:** Pipe 56 historical GIS geometry and length remain withheld from the inference model.

The machine-readable, query-reproducible snapshot is [NCSF_PIPE56_phase2c_sources_v1.json](NCSF_PIPE56_phase2c_sources_v1.json).

## Test area

- Location: NC State Fairgrounds, Raleigh, North Carolina, USA.
- Study AOI: **WGS84 [west, south, east, north]** = `[-78.7146, 35.7947, -78.7119, 35.7964]`.
- Independent checks sample the two **already documented** manhole top locations (MH-42, MH-45) and their arithmetic WGS84 midpoint.
- ImageServer sampling used coordinates transformed from WGS84 into North Carolina State Plane `EPSG:6543` (US survey feet). These are transforms of the known inputs, **not new surveyed evidence**.

## Road geometry: public ROW centerline layer

**Provider:** Wake County GIS Addressing Team.  
**Layer:** [Streets (MapServer/1)](https://maps.wake.gov/arcgis/rest/services/Transportation/Transportation/MapServer/1).  
**Metadata:** [Wake Streets](https://maps.wake.gov/metadata/Streets.html) and [Data.gov dataset](https://catalog.data.gov/dataset/streets-in-wake-county-nc).

| Query | Bounding box, WGS84 | Returned features | Finding |
|---|---|---:|---|
| Narrow AOI | -78.7146, 35.7947, -78.7119, 35.7964 | **0** | No public ROW centerline inside this particular small window |
| Broader reference area | -78.719, 35.792, -78.708, 35.799 | **29** | Service responds; features include Trinity Rd, Hillsborough St, Youth Center Dr |

Both queries are recorded with their exact REST URL in the JSON file.

**Engineering meaning:** A zero count in this official ROW-centerline dataset **does not imply no paved internal access road exists** at the fairgrounds. It provides **no valid internal roadway centerline constraint** for Pipe 56 at this stage. The service is updated frequently and should not be interpreted as a 2004-era roadway alignment.

## Historical orthophotos: NC OneMap ImageServer

Official NC OneMap image services were queried via `identify` at **MH-42**, **midpoint**, and **MH-45**. Pixel values are logged in the JSON, alongside each exact request URL. A non-`NoData` response confirms *raster availability at the query location*, **not** the presence of a road, trench, or utility.

| Service year | MH-42 | Midpoint | MH-45 | Assessment |
|---|---|---|---|---|
| [1999](https://services.gis.nc.gov/secure/rest/services/Imagery/Orthoimagery_1999/ImageServer) | Pixel returned | Pixel returned | Pixel returned | Available at 3/3 samples |
| [2005](https://services.gis.nc.gov/secure/rest/services/Imagery/Orthoimagery_2005/ImageServer) | Pixel returned | Pixel returned | Pixel returned | Available at 3/3 samples |
| [2004](https://services.gis.nc.gov/secure/rest/services/Imagery/Orthoimagery_2004/ImageServer) | NoData | NoData | NoData | No imagery returned from **this specific service** at 3/3 samples |

NC State University Libraries [lists City of Raleigh 2004 SID orthoimagery holdings](https://www.lib.ncsu.edu/gis/wake). These separate holdings have **not** been accessed, and their actual AOI imagery has not been independently verified. Do **not** generalize the online NC OneMap 2004 `NoData` response into “no 2004 aerial photographs exist.”

**Limitations:** Raster services' advertised years do not verify the exact day of capture at these sample points. No image crops have been acquired or visually interpreted in this step. No georeferenced road edge, obstacle footprint, suspected trench, or utility line has been digitized. Generic image-service metadata must not be mistaken for local positional accuracy.

## Explicit evidentiary decision

| Proposed constraint | Status |
|---|---|
| Public ROW centerline in Pipe 56 AOI | **Unavailable from queried Wake layer** |
| 1999 + 2005 aerial coverage at 3 sampled locations | **Service availability verified** |
| Actual internal fairground road centerline | **Not identified or surveyed** |
| Historical 2004 aerial within these sample locations | **NoData on tested NC OneMap service; alternative archives unverified** |
| Georeferenced road-edge / obstruction polygon | **Not digitized** |
| Underground pipe geometry / exact route | **Not inferred from these sources** |
| Changes to existing frozen Phase 2A / Phase 2B test | **None** |

The next *evidence step* is to open and inspect georeferenced 1999 and 2005 image crops within the same AOI; if an interpretable and date-relevant roadway edge exists, digitize it independently, record its geometry and uncertainty, and then introduce it as a **soft corridor constraint**. Any route inference must continue to exclude the historical sewer polyline used for later validation.

**Do not claim** the source-discovery step validates Pipe 56's location, road alignment, construction period, or the proposed 3D subsurface model.
