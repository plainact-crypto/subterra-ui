# SUBTERRA — Competition Site Full-Rebuild / Recovery Plan
**Version:** 2.0 — 21 November 2026  
**Status:** Approved direction from current discussion; implementation plan, NOT a claim that new code is deployed.  
**Scope:** Existing GitHub Pages prototype `plainact-crypto/subterra-ui`, currently v0.16.  
**Decision:** Field-FIRST workflow, 3D survey point truth, deterministic reconstruction, one confidence-colored active route, adaptive evidence rounds. Historic GIS is kept out of the first reconstruction.

## 0. Main product decision

**Start screen = NEW FIELD SURVEY PROJECT.** The user must not first see the hard-coded Pipe 56 blind test, old orange/green comparison, or a demo-only dashboard. Pipe 56 becomes an optional controlled example in a clearly labeled `Samples / Technical Validation` area.

The field crew may use a **total station** for the control network, surveyed above-ground manhole positions and high-precision reference points. A future mobile surveying **pen/click tool** can supply detailed geometric points within each manhole via a calibrated reference system. SUBTERRA is the independent software that ingests both data sources, normalizes and QA-checks X,Y,Z, computes geometric properties, infers candidate connections/routes, assigns a traceable confidence INDEX and requests the next most informative measurement.

**Accuracy boundary:** A cheap pen/click trigger does not independently measure 3D coordinates; the measurement source/relative-localization system, calibration, shared datum, instrument sigma and bias determine accuracy. GNSS on a typical phone alone cannot substitute for a manhole survey or give reliable invert Z inside the chamber. A favorable accuracy claim requires test data against a calibrated survey reference. Surveyed portal XYZ does NOT by itself verify buried pipe alignment between portals.

## 1. Current-site diagnosis and decision

### What can be retained
- `subterra-ui` GitHub Pages deployment, repository, icons/brand and basemap where licensed/usable.
- Existing evidence-first conceptual separation, original non-destructive historical fixtures, 2A/2B computations as comparison benchmarks (not user-facing starting steps), import/export patterns and informative caution text.
- Existing sample with 87 manholes / 103 reference pipes as a **legacy data fixture**, not user-visible Round 0 geometry.
- 430-field master checklist from `SUBTERRA_Field_Checklist.csv`; source specification `SUBTERRA_Engineering_Specification.md`; `SUBTERRA_Reference_Policy.json` as an **incomplete, project-review-required policy template**.

### What must be replaced
- A ~70 KB `app.js` monolith, browser-local-only `localStorage` primary state, rigid 8-step wizard, specialized `Pipe56` assumptions, 2A/2B-driven workflow, old double-route canvas behavior.
- Current v0.16 `confidence-dashboard.js` scoring that yields `65.5/100` for one simulated test using illustrative fixed weights; it is not calibrated hidden-route truth and must not become the universal production scoring formula.
- Any assumption that wall-opening bearings, visual inlet/outlet roles or a straight manhole-to-manhole chord prove continuity, hidden straightness or actual pipe length.

### Suggested rebuild choice
Use a **new `v2` UI/application structure** in the same repository; preserve the existing prototype in an immutable release/tag/archive and migrate ONLY validated data. Refactor the site, not the field data. Do not rename or delete current saved browser projects without an export and migration plan. A clean TypeScript/Vite architecture with separate engine and UI layers is preferred to extending the monolith. Choose a form framework only after profiling 430-field repeatable entities; no AI dependency.

## 2. Canonical field dictionary, not 430 fields as one giant form

The supplied checklist has **430 atomic fields** (88 required, 324 conditional, 18 optional), grouped by field type and repeat scope. It is a **schema catalog**, not a request for users to complete every field on every manhole. Maintain stable `field_id` and `section`, data type, units, validation rules, applicability and provenance.

- A Survey metadata/control: 74; B External surface: 29; C Cover/frame/chimney/cone: 35; D Chamber/access: 40.
- E Every pipe opening: 52 **repeated separately for each opening**; F Bench/channel: 20; G Defects: 25.
- H External spatial features: 24; I Independent evidence: 50; I Independent evidence points: 16.
- J Safety: 27; K Media: 17; K Measurement lineage: 21.

**User experience:** project wizard → route scope → survey control/CRS → asset list → manhole → **all visible pipe openings**, then relevant conditional details. Render `applicable`, `missing`, `unknown`, `not accessible`, `not applicable`; never replace unknown with 0. Condition, ladder and cover data improve **inspection completeness**, not automatically route confidence.

**Measurement record must include:**
`{pointId, featureId, featureType, x, y, z, units, crs, verticalDatum, coordinateEpoch, acquisitionMethod, instrumentId, calibrationId, measuredAt, observerId, covariance3x3, controlGroupId, surveyRoundId, status, evidenceRefs, sourceType}`.
It may additionally include local pen coordinate frame and its approved surveyed transformation. Keep original/raw coordinates, converted ENU coordinates, conversion version, covariance and correlated errors separately.

**Geometric entities:** `ControlPoint`, `Manhole`, `Cover`, `ChamberSection`, `Opening`, `InvertPoint`, `ChannelPoint`, `BenchPoint`, `StepPoint`, `SpatialFeature`, `PipeTracePoint`. Every geometrically surveyed feature is anchored by XYZ; non-geometric properties remain explicit attributes (material, status, classification, photo, defect, inspection notes). Multi-point shapes are arrays of measured XYZ, not manually fabricated meshes.

**For the pen:** future separate mobile client selects `manhole > component > point type`, clicks/receives position, submits signed/time-stamped `PointObservation` to SUBTERRA. The web app must already support equivalent manually imported **XYZ CSV/JSON** and a simulator event stream. No hardware-specific assumptions in route calculation. Point coordinate value **and error model** must arrive together.

## 3. Measurement control and dual-instrument workflow

**Reference station / total station:**
1. Establish/control/check the project horizontal + vertical reference, ENU/CRS transformation and benchmark.
2. Survey known control and manhole cover/chamber anchors; record instrument identity, target height, prism vs nonprism method, field checks, repeated shots, datum, and covariance.
3. Set local anchors for detailed manhole observations; do not assume cover center = chamber center.

**Pen / detail device (future):**
1. Calibrate tip offset and coordinate alignment to the surveyed reference network.
2. Record click XYZ and associated `σx,σy,σz` / covariance, timestamp and lock/visibility status, plus local-to-project transform and uncertainty.
3. Flag no 3D fix, drift, multipath, magnetometer issues, lost optical/laser tracking, obstruction or no repeatability.
4. Site-specific benchmark comparisons and repeated shots determine if method is acceptable; never hardcode “±5 mm” as demonstrated accuracy.
5. If Z cannot be measured, mark it `UNKNOWN` or `UNVERIFIED`; do not manufacture a level or project a cover elevation onto the pipe.

**Transformation / QC:** use surveyed 3D reference points to fit and validate device-to-survey coordinates using versioned least squares/rigid transforms as appropriate. Preserve fitted residuals, covariance, and check-point residuals; bad transform blocks route scoring. Where the point and anchor share survey control, carry cross-covariance rather than counting them as independent.

## 4. Workflow and screens — competition-first

1. **Projects / Start Survey:** Create project, select gravity sewer, enter known study limits and coordinate reference.
2. **Survey Setup:** CRS, horizontal/vertical datum, benchmark, equipment and measurement policy; block false-precision routes if unknown.
3. **Field Survey Workspace:** List/grid of manholes, visible point records, repeatable 52-field opening forms, dynamic conditional fields, imported instrument XYZ and completeness, evidence/media.
4. **Engineering Map (primary):** Render surveyed manholes/port markers and ONE active reconstructed line, its **continuous score-driven color** (single scale, not fixed “old orange vs new green” layers), dashed / unresolved style for unsurveyed spans, optional uncertainty envelope. If no defensible route, show **UNRESOLVED** and NO fabricated line.
5. **Left Evidence Dashboard:** Separate `Survey Completeness /100`, `Route Verification Index /100`, uncertainty XY/Z, observed/inferred/unverified badges, conflicts and source provenance; each number expandable to formula and observation IDs. Score is an **evidence index**, never “X% guaranteed correct location.”
6. **Next Best Measurements:** Ranked concrete missing-point tasks: specific manhole/opening/field, required point or test, why important, estimated model impact, difficulty, method, safety caveat. `Measure next / mark inaccessible / skip with reason`.
7. **Verification Rounds:** Immutable Round 0, Round 1+, comparison table (score, selected route, gates, uncertainty, new evidence, unresolved checks) and export.
8. **Historical Review (locked by default):** After Round 0 snapshot/hash, user explicitly admits historical GIS/as-built, sees a comparison result separated from the primary reconstruction. Reference must not seed Round 0.
9. **Competition Demo / Technical Report:** Run scripted sample with known simulated sources, import XYZ, recalculate, request field measurement, show result delta, disclose ambiguity, holdout independent comparison and export JSON/PDF.

**Design:** Arabic/English labels as needed, accessible text contrast, always-visible measurement units, mobile-responsive tables, progress bars but not deceptive probability displays, tooltips for datum/source, immediate form validation and clear empty/loading/error states.

## 5. The deterministic computation engine

Package pure functions for:
- `ingestSurvey`, `validateAndNormalize`, `applyCRSTransforms`, `surveyControlAdjust`, `computeXYZFeatures`, `classifyOpenings`, `buildManholeTransitions`, `enumerateCandidateLinks`, `solveRouteHypotheses`, `propagateCovariance`, `computeRCS`, `rankNextMeasurements`, `publishRound`.
- From two surveyed points, derive distances and bearings; from surveyed circle/plane/port-point sets, derive geometry via least-squares fit with residuals and supported uncertainty. Never infer diameter if there are insufficient observations; preserve raw points.
- Port coordinates: `E_port=E_chamber + r sin(theta)`, `N_port=N_chamber+r cos(theta)` only when those are observed, appropriately referenced, and have an error model. Prefer directly surveyed port XYZ. Use correlated 3×3 covariance and Jacobian propagation; avoid duplicate confidence credit for direct coordinates plus derived copies.
- Candidate topology is a graph of **openings**, including within-manhole transitions, not an automatic MST of cover centers. Enforce only documented physical hard gates and configured route mode. Keep alternative candidates internally; expose one qualified active route.
- Endpoint-only straight segments are `UNSURVEYED_ENDPOINT_CONNECTOR`, not proof of hidden straightness; strong mismatch yields request for independent trace instead of invented bend. Full tracing may be polyline through measured, georeferenced pipe points.
- Hydraulic grade from two verifiably same-datum inverts is only a conditional check; nominal chord length is not a verified pipe length. Manning calculations do not determine buried XY geometry.
- Include missing/alternative route hypothesis `H_other` if model-relative support is calculated; do not normalize truncated top-K as complete. Log status `INCOMPLETE_SEARCH` where appropriate.
- Hard failures for missing/invalid CRS/datum, wrong units, invalid covariance, unsupported measurement transform, impossible portal connection, conflict under approved hard gate; severity must be explicit.

**Implementation gate:** `SUBTERRA_Reference_Policy.json` is a template, not a deployment-ready model. Populate and professionally review project CRS, precision assumptions, trace method error models, bearing curvature parameters and any hydraulic envelopes before enabling model-relative probabilities. Missing model parameters => disable that evidence contribution with reason, never silently supply an invented default.

## 6. Two scores and explicit, achievable 100

**Inspection Completeness `ICS`:** based on applicable checklist fields only, separated into required/conditional/optional according to published policy; nonapplicable fields do not penalize. Includes ladder, cover, physical condition and media.

**Route Verification Index `RVI`:** use one published versioned 100-point rubric, proposed category maxima:
- 8 survey control; 10 surveyed chamber/portal control; 10 opening inventory; 15 port XYZ/orientation; 12 supported vertical/gravity evidence; 6 pipe attributes; 5 within-manhole channel/flow evidence; 12 physical continuity; 12 independent intermediate-route trace; 4 spatial constraints; 6 provenance/QA.
- Each category `q_i∈[0,1]` is the fraction of its documented, independently checkable conditions met; score is `RVI=round(Σ W_i*q_i,1)`, after any declared gate and contradiction resolution. Correlated copies share a single evidence group. Do **not** implement positive points for irrelevant ladder data in route score.
- **100/100 is achievable in any round** when all applicable route-verification criteria are satisfied. No arbitrary round-based cap. It is “100% of predeclared evidence criteria,” never proof of zero positional error or posterior probability 1.
- A valid `RVI=100` must have supported full selected route geometry, source IDs, accepted trace/continuity evidence, acceptable project-configured uncertainty, no unresolved incompatible observations and completed applicable QA. A synthetic “perfect test” can test the 100 rule but must always be labeled SIMULATION, not site verification.
- Keep optional **`modelRelativeSupport`** from evidence likelihoods separate from `RVI`. Do not multiply an uncalibrated posterior by the checklist index and then claim a physical success probability. If a model uses `pi_other>0`, that posterior need not equal 1, while the verification index still can reach 100.
- New contradictory evidence can **lower** the score, alter the selected route, or set `UNRESOLVED`; historical record cannot replace field measurements.
- No route score until minimum input policy/coordinate requirements are configured; otherwise show **NOT SCORED**. Detailed formula, thresholds, reasons, and contributions remain visible.

**One-line color:** map continuous verified `RVI/100` to a documented **single-hue blue-gray to deep-blue** visual scale; no traffic-light score bins and no orange/green *version lines*. Set line opacity/dash/uncertainty separately for untraced vs traced portions. `UNRESOLVED` shows no asserted line regardless of score.

## 7. Adaptive rounds / missing measurement prioritization

`Round 0`: strictly measured/declared field and survey-control evidence; no historical GIS line loaded or queried by inference. `Round 1+`: independent current measurements, tracing and (later) historical records under source provenance. The chronology is NOT a compulsory quality ceiling.

Generate all relevant candidate actions for missing data and conflicts; rank with deterministic expected uncertainty reduction or versioned expected information gain per unit of estimated effort, with safety as an absolute gate. If predictive models or costs are unavailable, mark `ENGINEER REVIEW — UNRANKED` rather than fabricate numeric benefit. Request only next 3–5 high-value actions.

Every round persists immutable raw observations, normalizations, version hash, selected route, alternative count, score breakdown, uncertainty, missing tasks, conflict register and audit. Editing an observation produces a superseding record, not an overwrite. User can inspect “What changed between Round N and N+1”.

## 8. API boundary and mobile-pen integration (future, not current hardware build)

Design versioned interfaces now, keep mobile device implementation for a **separate product / later phase**:
- `POST /v1/projects/:id/survey-rounds`
- `POST /v1/projects/:id/point-observations` (single or batch XYZ + covariance + device + CRS)
- `POST /v1/projects/:id/evidence`
- `POST /v1/projects/:id/reconstructions`
- `GET /v1/projects/:id/active-route`
- `GET /v1/projects/:id/next-measurements`
- `GET /v1/projects/:id/rounds`
- `GET /v1/projects/:id/exports`

Required idempotency keys, per-device sequence numbers, timestamps, offline queue/replay, auth/ownership, schema and unit validation, signed evidence provenance, delta updates (SSE/WebSocket), version collision handling and immutable log. Source `captureMethod` may be `TOTAL_STATION`, `SURVEY_PEN`, `GNSS_RTK`, `MANUAL_IMPORT`, `SIMULATED` or `DIRECT_TRACE`.

**Hosting decision:** current GitHub Pages static site + `localStorage` cannot on its own provide robust online multi-device synchronization. For competition initial browser demo, retain import/export + simulated event ingestion; for genuine cross-device live ingest, deploy API + persistent database/storage on an appropriate service (e.g., PostgreSQL/PostGIS) while keeping GitHub Pages as UI if desired. Do not claim mobile sync exists until tested.

## 9. Phases / deliverables / stop criteria

| Phase | Priority | Deliverable | Exit condition |
|---|---|---|---|
| P0 — Baseline and freeze | Critical | Existing deployed v0.16 archive/tag, exported original projects, evidence separation test, screenshot/functional baseline | No lost existing project; old client remains accessible |
| P1 — Policy & data contract | Critical | Versioned 430-field dictionary, normalized `PointObservation XYZ` schema, CRS/datum/covariance models, explicit policy gaps | Schema validation and round-trip import tests pass |
| P2 — Architecture rebuild | Critical | TypeScript/Vite modules, isolated engine/renderer/data; stable deterministic fixtures and migration | Old snapshots import read-only; no accidental fixture ingestion |
| P3 — Survey-first UI | Critical | Project → manhole → opening → XYZ point → checklist; dynamic 430 catalog and missingness | Every opening repeatable; no unknown-to-zero coercion |
| P4 — Geometry and topology | Critical | XYZ QC/transforms, port geometry, graph candidates, resolved/unresolved route, uncertainty envelope | Known test fixtures pass in 2D and 3D |
| P5 — Scoring/dashboard | Critical | `ICS` and `RVI`, algebra/weights explanation, continuously colored one active route | 100/100 synthetic acceptance test; no false probability claim |
| P6 — Adaptive rounds | Critical | Top 3–5 next measurements, evidence ledger, immutable rounds, import live-like stream | Adding one survey point deterministically changes route/score/tasks where mathematically warranted |
| P7 — Historical holdout & demo | High | Blind Round 0, explicit later unlock, held-out comparison and exports | No historical centerline influence before unlock; separate audit |
| P8 — Competition QA/release | Critical | Responsive UI, English/Arabic guidance, tests, accessibility, demo mode, PDF/JSON report and deployment | CI and live smoke tests green, reproducible demo on clean browser |

**Execution principle:** P1–P7 are the product core. Visual polish, sales claims and optional utility types follow demonstrable geometry/uncertainty correctness. If rebuilding requires breaking the old app, build v2 as separate branch/route then cut over after regression tests.

## 10. Hard acceptance tests for the competition

1. Start with fresh browser: user lands on `New Field Survey`, NOT historical Pipe 56 and NOT stage 2A.
2. Import multiple manholes with **XYZ**, explicit CRS/datum/covariance; change reference with controlled transform or reject mismatched inputs.
3. Select `MH42 → Outlet → Invert XYZ`; store exact typed point, measurement method, sigma, timestamp and evidence.
4. Accept total-station survey control and pen-event **simulations** via same point contract; never call these pen points actual hardware accuracy.
5. Every manhole has unlimited separately identifiable pipe openings and repeatable channel/bench/steps/defect points; dynamic 430-field dictionary.
6. No artificial elevation for null Z; no grade calculation across unknown/incompatible vertical datums.
7. Multiple viable pipe connections remain alternatives, no auto-connection by manhole nearest distance only.
8. One ACTIVE route drawn with continuous confidence-dependent color; no orange/green comparison clutter; no route if `UNRESOLVED`.
9. 2D and 3D measurement and instrument uncertainty propagate, with endpoint and between-endpoint uncertainty distinguished; undetected bends are not invented.
10. Initial Round 0 is unchanged if the historical GIS reference is present in private storage; system passes an exclusion test.
11. New independent trace evidence in Round 1/2 can change the route and decrease score under conflict; prior snapshots remain byte-identical.
12. `RVI=100` is achievable for a **fully evidenced simulated acceptance fixture**, explicitly labeled `SIMULATED TEST`; a field scenario is not falsely declared verified.
13. Bad pen calibration, unknown CRS, non-PSD covariance and inconsistent XYZ lead to explicit blockers, not hidden fallbacks.
14. `Next Best Measurement` names actual object/point, reason, method and effect; no uncalibrated invented “+20%” predictions.
15. Reorder input JSON: deterministic normalized output, same content hashes/candidate rankings, no duplicate evidence weighting.
16. On reload, export/import round history does not lose observation provenance, IDs or supersession lineage.
17. Competition demo script demonstrates: low-confidence initial field inputs → requested better portal XYZ / verified link evidence → updated single active line → confidence and uncertainty explanation → later history comparison.
18. Accessible responsive layout; simulated-vs-observed distinction readable without color alone; all survey and results export in CSV/JSON/PDF.

## 11. Competition demo sequence

**Storyboard (not a measured accuracy demonstration):** create project → import a synthetic total-station reference and 2–4 manholes → collect detailed XYZ points by `SIMULATED_PEN_CLICK` → classify each visible port → compute an endpoint connector and see limited RVI → ask for next missing survey point → add trace/control measurement → recompute 3D geometry, visible route and confidence → unlock historical reference in later round and show discrepancy plus independent QA → export reproducible evidence report.

The demo must show genuine problem-solving, especially **why one specific requested measurement improves the solution**, not only a polished map. Show open questions/limitations and distinguish *measured*, *simulated*, *inferred*, and *historically recorded* with readable labels.

## 12. Scope exclusions

- No physical pen prototype, mobile sensor firmware, GNSS survey hardware or real-time mobile app build in this website-recovery phase.
- No AI inference for geometry, connectivity or scoring.
- No blanket accuracy claim for cheap sensors relative to licensed surveying instruments.
- No automatic official ASCE SUE quality level or NASSCO MACP grade based on an internal score.
- No deployment-ready route-likelihood model until method performance, datums and project policies are configured and reviewed.
- No claim that a map line between two manholes is a proven underground as-built alignment.

## 13. Immediate next engineering change set (first implementation PR)

- Tag/archive `v0.16`, export current localStorage test projects and make a migration harness.
- Publish the controlling 430-field catalog and `PointObservation` JSON Schema with stable IDs; add parser/validation tests.
- Replace project landing screen with **Survey First**; preserve `Legacy Pipe 56` as an explicit optional test.
- Build a mocked `Total Station XYZ` and `Pen Click XYZ` importer using one normalized 3D input contract; retain measurement accuracy.
- Build a working 2–4-manhole route demonstration with one active provisional connector and explicit `UNKNOWN` state.
- Add real unit and workflow tests before replacing scoring or geometry algorithm.
- Keep the live v0.16 untouched until this first PR is reviewed/green.

## 14. Reference files and conflict-resolution precedence

Primary engineering specification: uploaded `SUBTERRA_Engineering_Specification.md` (v1.0).  
Controlling field catalog: uploaded `SUBTERRA_Field_Checklist.csv` (430 fields), paired XLSX.  
Policy scaffold: uploaded `SUBTERRA_Reference_Policy.json` (**incomplete; project engineer approval required**).  
Secondary/alternative research: uploaded `SUBTERRA Engineering Specification.pdf` and pasted research text; compare and reconcile conflicts explicitly, never blindly merge numerical thresholds.

**Unresolved approvals before operational use:** CRS and vertical datum, instrument classes and measured accuracy, source-model covariance and calibration, physical trace method likelihoods, survey safety policy, method-specific grade/turn limits, inspection acceptance criteria and independent evidence standards. Competition demo may use clearly synthetic, fully specified parameters.
