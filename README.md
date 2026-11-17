# SUBTERRA — Infrastructure Reconstruction UI (v0.3)

Front-end-only evidence-capture prototype for existing underground utility assets. The platform **does not design new networks or perform reverse-engineering calculations yet**.

## Workflow

1. **Create project**: enter project name, location (optional), and WGS84 latitude/longitude or local/projected XY metres.
2. **Choose infrastructure system**: sanitary sewer is the first active workspace. Other utility categories remain placeholders.
3. **Open sewer workspace**: view the pan/zoom metric canvas and manhole schedule.
4. **Add / select a manhole**: complete the eight-step entry wizard. Each step is available by number or Previous / Next.

## Manhole wizard: exact engineering taxonomy

1. **Location:** optional custom name; top/cover point coordinates and top RL; separately recorded invert/base point coordinates and main invert RL; evidence status Known/Measured, Unknown, or Request inference for elevations.
2. **By Geometry:** Circular; Rectangular; Square; Tee-Section; Conical; Elliptical.
3. **By Construction Material:** Precast Concrete; Cast-in-Place Concrete; FRP; GRP; PE; PP; PVC; Brick; Resin Concrete.
4. **By Depth:** Shallow; Normal; Deep; Non-Entry Access Point; Inspection Chamber; Man-Entry Manhole.
5. **By Hydraulic / Functional Type:** Straight-Through; Junction / Junction Chamber; Drop; Internal Drop; External Drop; Flushing; Lamp Hole; Terminal Cleanout; Vented; Metering; Flow Control; Diversion; Siphon / Inverted Siphon; Tangential; Discharge; Terminal / End.
6. **By Utility Type:** Sanitary Sewer; Storm Sewer; Power; Communications; Meter / Meter Chamber.
7. **By Construction Method:** Standard; Special; Assembled.
8. **Pipe Openings & Manhole Components:** keep existing v0.2 pipe-opening evidence capture and detailed components checklist. Each opening can be marked Present, Not present, or Unknown; individual information can be Known/Measured, Unknown, or Request inference.

Each classification Dropdown contains **Unknown / not recorded** and **Unknown — request inference**. Unverified classifications are never silently selected. The six groups reflect the supplied categorisation; they are not used as a design specification.

## Auto-generated identifiers

Leave the Custom manhole name blank and the app generates an identifier from the abbreviations for the **selected** categories plus a stable numeric sequence, e.g. `MH-CIR-CIP-DP-JNC-SAN-STD-001`. Unknown or inference-requested category codes are omitted. The identifier updates whenever the classifications change. A manually entered Custom name is preserved until it is cleared (or **Use auto name** is pressed). The current name is shown on the canvas.

## Persistence and exports

Data is automatically saved in the browser under the existing `subterra_ui_v1` localStorage key so v0.1/v0.2 projects and their openings/components stay available. Older type-library records are retained in legacy project JSON for safe compatibility but **the previous Manhole Type Library interface has been removed**; new projects do not create the old sample types. Existing saved manholes are **not deleted** during this migration.

Exports: project JSON (all values including classification, statuses and pipe-opening records), manhole schedule CSV (top/invert coordinates/elevations and all six classifications), pipe-openings CSV, and WGS84 top-position KML for Google Earth. The canvas uses an approximate local equirectangular projection, **not** a certified georeferenced survey system.

## Run / deploy

Open `index.html` or serve this directory with `python -m http.server 8000`. GitHub Pages can deploy the repository's `main` branch from `/(root)`.

No backend is required. No AI inference, hidden utility detection, automatic pipe connection, probabilistic reconstruction or new drawing/design is implemented in this release.

## Data safety

LocalStorage is specific to the browser and can be cleared by the user or browser. Export the JSON regularly. Survey observations and hypotheses are not a substitute for safe utility location and verification procedures before excavation.

## License

No open-source licence is granted by this prototype. Decide the distribution and ownership terms before publishing proprietary inference algorithms.