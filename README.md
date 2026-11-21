# SUBTERRA — Infrastructure Reconstruction UI (v0.11)

Front-end-only evidence-capture prototype for existing underground utility assets. The platform **does not design new networks or perform reverse-engineering calculations yet**.

## Workflow

1. **Create project**: enter project name, location (optional), and WGS84 latitude/longitude or local/projected XY metres.
2. **Choose infrastructure system**: sanitary sewer is the first active workspace. Other utility categories remain placeholders.
3. **Open sewer workspace**: view the pan/zoom metric canvas and manhole schedule.
4. **Add / select a manhole**: complete the eight-step entry wizard. Each step is available by number or Previous / Next.

## Pipe 56 Phase 2A — Geometry & Gravity (v0.11)

- In the isolated **PIPE-56 Blind Reconstruction** project, click **Run Phase 2A** to calculate and freeze an orange **straight-line geometric candidate** between documented MH-42 and MH-45 WGS84 top coordinates. No inference is run automatically on project open.
- Engine `pipe56-phase2.js` consumes `SubterraInferenceEvidence.build(project)` only, which has already omitted historical pipe polylines. It does not request or access Layer 4 GIS, reference route geometry, historic pipe length, source images, or field geometry.
- Results include Haversine shortest endpoint distance (~84.874216 m), endpoint azimuth (291.67193° clockwise from north), hypothesized opening-to-opening invert drop (2.60604 m), straight-line gradient (~3.070473%), nominal diameter (304.8 mm), TCP material and recorded cover-to-invert differences. Values are recomputed from supplied manhole evidence; no hydraulic flow or velocity is calculated.
- The historical GIS route stays explicitly withheld. A permanent copy of the calculation and input assumptions is stored inside the isolated project as `blindCase.phase2`, can be exported independently as JSON, and is verified by recalculation upon display. No calculation overwrites the Phase 1 source or the 87-manhole project. Re-running does not change frozen results.
- The physical connection between specific openings, vertical datum, actual buried alignment and depth between endpoints remain **unverified**. The orange line shows a mathematical endpoint baseline and is NOT evidence that the actual buried pipe takes that route. No confidence or field accuracy is claimed. Hydraulic checks and alternative routes are future tasks.

## Pipe 56 — isolated, frozen Phase 1 evidence test (v0.10)

One-click **Pipe 56 Blind Test** opens (or creates, once) a **separate local project** with precisely the documented NC State Fairgrounds manholes 42 and 45. The existing 87-manhole test project and all browser data remain intact.

- **Source**: ArcGIS `Sanitary Sewer Manhole Layer 1` OBJECTIDs **42** and **45**, historical `AutoCAD Data` (Stantec 2004). Coordinates WGS84. Historical recorded elevations in feet are copied at the prior **0.3048 m/ft** conversion. No field survey or vertical datum was verified.
- **Read-only / frozen**: the project is marked `blindCase.stage=PHASE_1_FROZEN`; wizard editing, JSON import, add-manholes and automatic calculated lines are disabled. The project can be exported. Creation is append-only and idempotent by `caseId`; it never migrates or overwrites an existing project.
- **Allowed evidence**: 2 manhole WGS84 top points, cover and known invert levels, documented openings, diameters/materials and explicit uncertainty states. "Known/measured" is the wizard's legacy enum but the values here are **historical source-recorded, not contemporary field measurements**.
- **Forbidden inference inputs**: layer-4 pipe route vertices, reference length, inferred bearings or route geometry. A separate JSON snapshot under `data/validation-reference/NCSF_PIPE56_reference_v1.json` contains the **benchmark only**, never automatically loaded by the Phase 1 app. The reference is **public in GitHub**, so this is only an application/workflow holdout, **not cryptographically secure blinding**.
- **Protocol frozen before next run**: `data/validation-protocol/NCSF_PIPE56_phase1_protocol_v1.json` documents constraints, evaluation rules and limitations. **Retrospective controlled replay**: the reference pipe was seen in earlier sessions, so future testing cannot be advertised as a genuinely previously-unseen blind study.
- **Opening association**: MH-42 OUT-01 → MH-45 IN-01 is a **hypothesis**. Historical Layer 1 itself does not identify that specific inter-manhole pipe link.
- **Acceptance**: integrity checks for the two records, no pipe geometry/length in input, stage1 inference not run, source and uncertainty fields present, separate benchmark, and pre-registered reporting. Plan deviation targets in the protocol are internal **historical GIS agreement benchmarks**, not claimed detection accuracy or competition compliance.
- **Exports**: **Evidence JSON** returns the existing `SubterraInferenceEvidence.build(project)` whitelist payload; **Protocol** returns the frozen rules; **Project JSON** exports the entire isolated project, which contains no historical pipes.
- **Phase 1 is preparation, not proof of pipe reconstruction**; its evidence integrity can be checked immediately. Phase 2 still needs to implement its own locked result snapshot and then validation.

## Multi-manhole calculated candidates (v0.9)

- The v0.8 engine returned nothing if the project contained more than **two** located manholes. v0.9 removes that restriction: on the original complete **87-manhole** NC State Fairgrounds dataset, it finds **31 preliminary straight-line opening-to-opening hypotheses** from **92** gravity-compatible candidate pairs (from known outlet/inlet invert levels and matching diameters), without consulting `observedPipes`.
- For each documented outlet/inlet opening pair it requires matching diameters, matching materials when both are known, a positive downhill gradient, distance between **1 and 180 m**, and grade between **0.01% and 15%**. The distance and grade limits are pilot *search bounds*, **not** approved engineering design criteria.
- A greedy shortlist prefers shortest compatible 2D separation and allows each documented opening to appear in at most one displayed candidate. Other plausible alternatives are tracked in the calculation result; the selected segment is **not** established connectivity.
- **Orange solid** = straight-line *candidate hypotheses* based on independent manhole evidence. **Blue dashed** = documented historical GIS pipe geometry for comparison. The two remain separately toggleable and no actual geometry is shifted to make the lines look different.
- A summary shows how many candidate lines are produced, or a reason if none qualify. Candidate computations are cached until project records change to keep pan/zoom responsive.
- No documented connection claims, hydraulic flow network solution, certainty percentages, or construction-grade pipe reconstruction have been added.

## Two-layer comparison — calculated candidate vs. historical GIS (v0.8)

The canvas now shows **two independently controlled line types** for the current two-manhole NC State Fairgrounds pilot:
- **Solid orange** = **Calculated Candidate** computed from precisely two manhole coordinates, a documented upstream outlet invert, a downstream inlet invert, and matching recorded pipe diameters. Straight-line plan hypothesis only; the independent WGS84 geodesic distance and gravitational gradient are computed. It does **not** read historical GIS geometry.
- **Dashed blue** = **Historical GIS** geometry from `project.observedPipes`, used only as validation reference. This is an archived GIS record, not newly surveyed physical proof.
- The orange line is drawn wide and underneath the narrow dashed blue line, so **both remain distinguishable even when their centerlines coincide**. Neither is moved or geometrically altered for presentation.
- Independent visibility eye toggles are saved in the active project, preserving its old localStorage key and unchanged exports. No network route inference, hydraulic flow simulation, road constraints, or confidence score is claimed.
- The calculated candidate is hidden when there are not exactly two located WGS84 manholes, when relevant invert/dimension evidence is missing, the gravity level difference is non-positive, or multiple candidates are ambiguous; no arbitrary pipes are created.

## Historical GIS pipe visibility & inference boundary (v0.7)

- In the Sanitary Sewer canvas, the **Historical GIS Pipes** eye button toggles only the blue dashed reference pipe traces. **Visible** is the default for existing v0.5/v0.6 projects; **Hidden** removes their drawing but does not delete any historical pipes or change manhole records.
- Toggle state is stored per-project in the existing browser storage key `subterra_ui_v1`. JSON exports still contain all imported documented pipes regardless of the display switch; reopening restores the selected state.
- The historical GIS polyline data in `project.observedPipes` is deliberately treated as a **validation reference**. The new `SubterraInferenceEvidence.build(project)` constructs a fresh, whitelisted payload of manhole positions, measured levels, classifications and opening parameters **without** pipe geometry, source notes or other ground-truth metadata. Any future inference engine should consume **only this evidence payload**, never the raw project. This is an application-data contract, not a security boundary; no inference engine has been implemented yet. Real blind validation must also avoid deriving the engine input from unblinded geometry.
- This release adds no inferred pipe, calculation, user data migration or changes to source records.

## Optional map backgrounds (v0.6)

For a WGS84 Sanitary Sewer project, the canvas offers **Background**: None, Streets · OSM, or Satellite · USGS (USA). These are drawn **behind** recorded manhole markers and imported historical GIS pipe traces. Panning, zooming, selecting assets, and FIT still work, and the selected background is stored per project in the existing browser storage key.

- **Streets · OSM**: worldwide OpenStreetMap standard tiles, visible attribution, viewport-only requests and normal browser caching. No bulk downloading.
- **Satellite · USGS (USA)**: USGS National Map **NAIP Plus** dynamic aerial imagery for the current Raleigh, NC, USA test. Imagery is not available globally; use OSM Streets elsewhere. Attribution is displayed.
- **None**: original empty metric-grid canvas.
- Imagery is visual context for interpreting roads/buildings. It is **not independent validation** of buried utility location and must never be treated as surveying evidence. Alignments use the existing approximate local WGS84 canvas transformation; no survey-grade georeferencing is claimed. The earlier v0.5 engineering records remain untouched and continue to export normally.

## Additive JSON observation import (v0.5)

The Sanitary Sewer workspace includes **Import JSON**. Choose a JSON object with a `manholes` array and a matching optional `coordMode` (`geographic` or `projected`). The existing **Export JSON** project file also works as an import source. The importer validates observed values and wizard evidence status, adds only new records to the **currently open project**, skips duplicate names/coordinates, then fits the canvas to show imported manholes. It never replaces a project or resets local browser storage.

Optional `observedPipes` contain externally documented WGS84 pipe traces with `id`, `source`, and `coordinates` as `[longitude, latitude]` vertices. These are rendered dashed blue as historical GIS evidence, not engineered/inferred connections. No pipes are generated from proximity. Export JSON also includes imported observed pipes.

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

## Delete projects (v0.4)

On **All projects**, use the trash icon on any project card. The same icon appears next to every project under **Recent Projects** in the sidebar. The systems page for an opened project also includes **Delete project**. All deletion actions ask for confirmation, then remove the whole project and its nested manholes, pipe openings, and components from `subterra_ui_v1` localStorage in **this browser**, without affecting other projects.

For a one-time requested deletion, open `?deleteProject=Sewer%20Test%2001` on the same browser and approve the confirmation dialog. This only matches the exact project name and refuses to choose automatically if duplicate project names exist. The query parameter is removed from the address immediately. This static GitHub site cannot remove data stored in another browser remotely.

## Data safety

LocalStorage is specific to the browser and can be cleared by the user or browser. Export the JSON regularly. Survey observations and hypotheses are not a substitute for safe utility location and verification procedures before excavation.

## License

No open-source licence is granted by this prototype. Decide the distribution and ownership terms before publishing proprietary inference algorithms.