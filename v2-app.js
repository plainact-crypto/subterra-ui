/* SUBTERRA v2 / clean survey-first UI. NO legacy runtime or Pipe56 fixtures. */
(() => {
  "use strict";
  const E=window.SubterraV2, STORE="subterra_v2_survey_first";
  const el=document.getElementById("app");
  const state={p:null,catalog:[],tab:"survey",filter:"",section:"ALL",lastError:null,mapScope:"sector",demoBundle:null,historicalComparison:null};
  const safe=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const n=(v,d=2)=>Number.isFinite(v)?Number(v).toFixed(d):"—";
  const color=score=>{
    const t=Math.min(1,Math.max(0,(score??0)/100));
    const a=[159,176,193],b=[27,71,151];
    return "rgb("+a.map((x,i)=>Math.round(x+(b[i]-x)*t)).join(",")+")";
  };
  const dataForm=(name,content,label)=>'<form data-form="'+name+'" class="form-panel">'+content+'<button class="btn btn-primary" type="submit">'+label+'</button></form>';
  const field=(label,input)=>'<label class="form-field"><span>'+label+'</span>'+input+'</label>';
  const txt=(name,placeholder="",req=true,value="")=>'<input name="'+name+'" type="text" placeholder="'+safe(placeholder)+'" value="'+safe(value)+'" '+(req?"required":"")+'/>';
  const number=(name,placeholder="",req=true,step="any",value="")=>'<input name="'+name+'" type="number" step="'+step+'" placeholder="'+placeholder+'" value="'+safe(value)+'" '+(req?"required":"")+'/>';
  const select=(name,opts,extra="")=>'<select name="'+name+'" '+extra+'>'+opts.map(([v,l])=>'<option value="'+safe(v)+'">'+safe(l)+'</option>').join("")+'</select>';
  const dateText=()=>new Date().toLocaleString();
  const stored=()=>{try{const v=localStorage.getItem(STORE);return v?JSON.parse(v):null;}catch{return null;}};
  const persist=()=>{try{if(state.p)localStorage.setItem(STORE,JSON.stringify(state.p));}catch{notify("Browser storage is unavailable; export JSON frequently");}};
  function notify(message){
    state.lastError=String(message||"");const p=document.getElementById("notification");
    if(p){p.textContent=state.lastError;p.hidden=false;}
  }
  function update(p,message){
    state.p=p;persist();render();if(message)notify(message);
  }
  const allVisible=p=>p?.manholes?.length||0;
  function sections(){
    const s=[...new Set(state.catalog.map(x=>x.section))];
    return [["ALL","All 430 fields"],...s.map(x=>[x,x])];
  }
  function catalogRows(){
    let list=state.catalog;
    if(state.section!=="ALL")list=list.filter(f=>f.section===state.section);
    const q=state.filter.trim().toLowerCase();
    if(q)list=list.filter(f=>(f.id+" "+f.key+" "+f.description+" "+f.scope).toLowerCase().includes(q));
    return list;
  }
  async function simulationBundle(){
    if(state.demoBundle)return state.demoBundle;
    const res=await fetch("data/demo/NCSF_87_MH_Pipe56_Four_Rounds.json?v=2.1",{cache:"no-store"});
    if(!res.ok)throw Error("Cannot fetch NCSF simulation: HTTP "+res.status);
    const bundle=await res.json();
    if(bundle.schema!=="subterra-ncsf-multiround-simulation/v1"||
       bundle.mode!=="SIMULATED_DEMO_ONLY"||
       !Array.isArray(bundle.stages)||bundle.stages.length!==4||
       bundle.stages[0].project.manholes.length!==87)
       throw Error("Unexpected NCSF simulation package");
    state.demoBundle=bundle;
    return bundle;
  }
  async function loadSimulationStage(index,askBeforeReplace=false){
    const bundle=await simulationBundle();
    if(!Number.isInteger(index)||index<0||index>=bundle.stages.length)throw Error("Invalid simulation round");
    if(askBeforeReplace&&state.p&&!window.confirm("Replace your active project with the prebuilt NCSF demo? Export your project first if required."))return;
    if(state.p?.demo?.synthetic && index!==state.p.demo.stage){
      const current=JSON.stringify(state.p);
      const expected=JSON.stringify(bundle.stages[state.p.demo.stage].project);
      if(current!==expected&&!window.confirm("Switching to a prebuilt simulated round replaces edits made to this demo stage. Continue?"))return;
    }
    const project=JSON.parse(JSON.stringify(bundle.stages[index].project));
    if(project.demo?.synthetic!==true||project.id!=="NCSF-87-MH-PIPE56-SIM-V21")throw Error("Not a valid synthetic NCSF scenario");
    const actual=E.assess(project),snapshot=project.rounds.at(-1)?.result;
    if(actual.score!==snapshot?.score)throw Error("NCSF scenario score integrity mismatch");
    state.mapScope="sector";state.historicalComparison=null;
    state.tab=index===0?"survey":index===3?"rounds":"verify";
    update(project,"SIMULATION ONLY — "+bundle.stages[index].id+" loaded. "+bundle.stages[index].title+". No new site measurements exist.");
  }
  async function compareHistoricalPipe56(){
    const p=state.p;
    if(!p?.demo?.synthetic||p.demo.stage<3)throw Error("Historical GIS comparison unlocks only after ROUND-03");
    const res=await fetch("data/demo/NCSF_103_Historical_Pipes_HOLDOUT.json?v=2.1",{cache:"no-store"});
    if(!res.ok)throw Error("Historical reference could not be loaded");
    const ref=await res.json();
    if(ref.schema!=="subterra-ncsf-historical-pipe-holdout/v1")throw Error("Unexpected historic source format");
    const pipe=ref.pipes.find(x=>x.id==="NCSF-GIS-PIPE-56");
    if(!pipe)throw Error("Historic Pipe 56 unavailable");
    const match=String(pipe.source).match(/Shape__Length=([\d.]+) ft/);
    if(!match)throw Error("Source historic pipe length missing");
    const historicLengthM=Number(match[1])*.3048;
    const revised=E.assess(p);
    state.historicalComparison={pipeId:pipe.id,historicalLengthM:historicLengthM,modeledFaceLengthM:revised.route.lengthM,
      historicYear:"2004 GIS / AutoCAD reference",deltaM:revised.route.lengthM-historicLengthM,
      disclaimer:"Historical centerline length and current simulated opening-face length are not the same endpoint definition. Their delta is NOT field measured positional error. GIS source is NOT ground truth."};
    render();
  }
  function projectView(){
    return '<section class="start"><div class="eyebrow">SUBTERRA ENGINEERING / VERSION 2</div><h1>Start with what the surveyor actually measures.</h1>'+
      '<p class="intro">The first input is accurate <strong>Total Station X, Y, Z for every visible manhole</strong>. SUBTERRA proposes a low-evidence connection and asks for targeted measurements between at least two manholes. No historical GIS route is used in the first pass.</p>'+
      dataForm("create",'<div class="form-grid">'+field("Project name",txt("name","New Sewer Survey"))+
      field("Network",select("network",[["sanitary","Sanitary Sewer"],["storm","Stormwater Drainage"]]))+
      field("Projected coordinate reference (metres)",txt("crs","EPSG code or surveyed local engineering grid"))+
      field("Vertical datum / benchmark",txt("verticalDatum","e.g. Project BM-01"))+
      field("Project XY target σ (m)",number("targetXY","Specify target",true,"any",".03"))+
      field("Project Z target σ (m)",number("targetZ","Specify target",true,"any",".025"))+
      field("Total Station instrument / serial",txt("instrumentId","Instrument identifier",false))+
      field("Surveyor",txt("surveyor","Survey team",false))+'</div>','Create Field Survey Project')+
      '<div class="demo-cta"><div class="demo-label">READY COMPETITION PROJECT · SIMULATED</div><h2>NC State Fairgrounds · 87 manholes · Pipe 56</h2><p>Four reproducible survey rounds (14 → 49 → 70 → 100). Historical manhole records anchor a <strong>fictional</strong> Total Station survey. All pen, CCTV and sonde measurements are generated; no field visit occurred.</p><button type="button" class="btn btn-primary" data-action="load-ncsf-demo">Open NCSF Project & Start Simulation</button></div>'+
      '<div class="start-foot">Old application data are not imported. This is a new survey-first product. No AI is used for geometry or scoring.</div></section>';
  }
  function mapSvg(p,r){
    const all=p.manholes;
    if(!all.length)return '<div class="map-empty">Survey visible manholes with Total Station XYZ to see the plan.</div>';
    const focus=p.demo?.synthetic===true&&state.mapScope!=="site"&&r.route&&p.pair?.length===2;
    const a=all.find(m=>m.id===p.pair?.[0]),b=all.find(m=>m.id===p.pair?.[1]);
    const mid=focus&&a&&b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2}:null;
    const radius=focus&&a&&b?Math.max(145,Math.hypot(b.x-a.x,b.y-a.y)*1.4):Infinity;
    const shown=mid?all.filter(m=>p.pair.includes(m.id)||Math.hypot(m.x-mid.x,m.y-mid.y)<radius):all;
    const xs=shown.map(m=>m.x),ys=shown.map(m=>m.y);
    if(r.route)for(const q of r.route.geometry){xs.push(q.x);ys.push(q.y);}
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const sx=Math.max(maxX-minX,18),sy=Math.max(maxY-minY,18);
    const scale=Math.min(750/sx,300/sy);
    const mx=(minX+maxX)/2,my=(minY+maxY)/2;
    const xy=q=>[(450+(q.x-mx)*scale),(210-(q.y-my)*scale)];
    const grid='<path d="M0 105H900 M0 210H900 M0 315H900 M225 0V420 M450 0V420 M675 0V420" fill="none" stroke="#e5edf2" stroke-width="1"/>';
    const line=r.route&&r.route.geometry.length>1?
      '<polyline points="'+r.route.geometry.map(q=>xy(q).map(v=>v.toFixed(1)).join(",")).join(" ")+'" fill="none" stroke="'+color(r.score)+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" '+(r.status==="PROVISIONAL_ENDPOINT_CONNECTOR"?'stroke-dasharray="10 7"':'')+'/>' : "";
    const markers=shown.map(m=>{
      const c=xy(m),selected=p.pair?.includes(m.id);
      return '<g><circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(selected?9:4)+'" fill="'+(selected?'#fff':'#aec6d2')+'" stroke="#173d59" stroke-width="'+(selected?3:1)+'"/>'+
      (selected?'<text x="'+(c[0]+14)+'" y="'+(c[1]-12)+'" fill="#183d57" font-size="15" font-weight="700">'+safe(m.id)+'</text>':'')+'</g>';
    }).join("");
    const stamp=r.route?'<text x="18" y="392" font-size="12" fill="#667b89">'+safe(r.status.replaceAll("_"," "))+' · '+n(r.route.lengthM,2)+' m plan · Bearing '+n(r.route.bearingDeg,1)+'° · Z pipe '+(r.route.gradePercent===null?"UNKNOWN":"Measured fall")+'</text>':
      '<text x="18" y="392" font-size="13" fill="#687e91">Add at least two manholes and select a pair</text>';
    return '<svg class="plan-svg" viewBox="0 0 900 420" role="img" aria-label="Surveyed manholes and one active hypothetical confidence-colored route"><rect width="900" height="420" fill="#f7fafb"/>'+grid+line+markers+stamp+'</svg>';
  }
  function dashboard(p,r){
    const points=r.score===null?"—":n(r.score,1),pct=r.score===null?0:r.score;
    const bars=r.factors?.length?r.factors.map(f=>'<div class="score-factor"><div><span>'+safe(f.label)+'</span><b>'+n(f.score,1)+' / '+f.max+'</b></div><div class="track"><i style="width:'+(100*f.score/f.max)+'%;background:'+color(pct)+'"></i></div></div>').join(""):"";
    return '<aside class="confidence-col"><div class="panel-head">ROUTE CONFIDENCE'+(p.demo?.synthetic?' · SIMULATED':'')+'</div><div class="score-big" style="color:'+color(pct)+'">'+points+'<span>/100</span></div>'+
      '<p class="score-sub">Verification coverage · not probability'+(p.demo?.synthetic?' · NOT SITE VERIFIED':'')+'</p><div class="track track-main"><i style="width:'+pct+'%;background:'+color(pct)+'"></i></div>'+
      '<div class="metric-line"><span>Key field survey progress</span><b>'+((r.completeness===null)?"—":n(r.completeness,0)+"%")+'</b></div>'+
      '<div class="metric-line"><span>Active route</span><b>'+safe(r.status.replaceAll("_"," "))+'</b></div>'+
      '<div class="metric-line"><span>Surveyed manholes</span><b>'+p.manholes.length+'</b></div>'+
      '<div class="metric-line"><span>Checklist fields available</span><b>'+state.catalog.length+'</b></div>'+
      '<div class="metric-line"><span>Checklist observations</span><b>'+p.fieldValues.length+'</b></div>'+
      '<hr/><div class="factors">'+bars+'</div>'+
      (p.demo?.synthetic?'<div class="sim-score-alert">All evidence is synthetic. Even 100/100 does not prove physical pipe geometry.</div>':'')+
      '<p class="technical-note">Score is based on declared evidence conditions and measurement availability. Total Station cover Z is NOT pipe invert Z. Buried path uncertainty remains unquantified until traced.</p>'+
      (p.accepted?'<div class="accepted"><strong>USER ACCEPTED</strong><p>Score '+n(p.accepted.score,1)+'/100 with '+p.accepted.remaining.length+' unresolved evidence tasks.</p></div>':'')+
      '<div class="side-actions"><button class="btn secondary" data-action="export">Export Project JSON</button><button class="btn subtle" data-action="reset">Start Another Project</button></div></aside>';
  }
  function surveyTab(p,r){
    const rows=p.manholes.map(m=>'<tr><td><strong>'+safe(m.id)+'</strong></td><td>'+n(m.x,3)+'</td><td>'+n(m.y,3)+'</td><td>'+n(m.z,3)+'</td><td>±'+n(m.sigmaXY,3)+' m</td></tr>').join("");
    const stationImport='<div class="station-import"><label class="file-control">↑ Import Total Station CSV<input type="file" id="importStation" accept=".csv,text/csv"/></label><a href="data/SUBTERRA_Synthetic_Total_Station_Example.csv" download class="sample-link">Sample CSV (SIMULATED)</a><small>Required columns: id,x,y,z,sigmaXY,sigmaZ · projected metres · common vertical datum.</small></div>';
    const surveyForm=dataForm("manhole",'<div class="form-grid five">'+field("Manhole ID",txt("id","MH-01"))+
      field("Easting X (m)",number("x","XYZ"))+field("Northing Y (m)",number("y","XYZ"))+
      field("Cover RL Z (m)",number("z","XYZ"))+field("XY σ (m)",number("sigmaXY",".02",true,"any",".02"))+
      field("Z σ (m)",number("sigmaZ",".01",true,"any",".01"))+'</div>','Add Total Station Manhole');
    const pairForm=p.manholes.length>1?dataForm("pair",'<div class="form-grid">'+
      field("From manhole",select("from",p.manholes.map(m=>[m.id,m.id])))+
      field("To manhole",'<select name="to">'+p.manholes.map((m,i)=>'<option value="'+safe(m.id)+'" '+((p.pair[1]||p.manholes[1].id)===m.id?'selected':'')+'>'+safe(m.id)+'</option>').join("")+'</select>')+'</div>','Select Sector / Recompute'):"";
    const ready=p.manholes.length>=2;const complete=!!p.surfaceSurveyComplete;
    return '<div class="block"><div class="step">01 · REQUIRED SURVEY FIRST</div><h2>Total Station XYZ — All Visible Manholes</h2>'+
      '<p class="muted">Record each visible manhole cover position and RL from a total station. Coordinates must be in the declared projected system. Other internal points come later via calibrated detail survey.</p>'+surveyForm+stationImport+
      '<div class="table-scroll"><table><thead><tr><th>Asset</th><th>X (m)</th><th>Y (m)</th><th>Cover Z (m)</th><th>XY uncertainty</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<h3>Initial sector hypothesis</h3><p class="muted">Select at least two manholes. The line is provisional and starts with low verification coverage. Its buried Z and alignment are unknown until field evidence is added.</p>'+pairForm+
      '<div class="step-note">'+(ready?(complete?'Total Station visible-manhole inventory confirmed. Select one sector and proceed.':'Before a provisional route can be generated, explicitly confirm ALL visible manholes have been surveyed.'):'At least two total-station manholes required before route reconstruction.')+'</div>'+
      (ready&&!complete?'<button class="btn btn-primary" data-action="surface-complete">Confirm All Visible Manholes Surveyed</button>':'')+
      (r.route?'<button class="btn btn-primary" data-tab="verify">Continue to Field Checklist →</button>':'')+'</div>';
  }
  const mhOptions=p=>p.manholes.map(m=>[m.id,m.id]);
  function verifyTab(p,r){
    const mhSelect=select("manholeId",mhOptions(p));
    const openingForm=dataForm("opening",'<div class="form-grid">'+field("Manhole",mhSelect)+field("Opening ID",txt("id","OUT-01"))+
      field("Observed role",select("role",[["UNKNOWN","Unknown"],["OUTLET","Outlet"],["INLET","Inlet"],["LATERAL","Lateral"],["BRANCH","Branch"],["DROP","Drop"],["CAPPED","Capped"]]))+
      field("Condition",select("condition",[["UNKNOWN","Unknown"],["OPEN","Open"],["CAPPED","Capped"],["BLOCKED","Blocked"]]))+
      field("Diameter (mm)",number("diameterMm","If known",false))+field("Material",txt("material","If observed",false))+'</div>','Register Visible Opening');
    const list=p.manholes.map(m=>'<div class="opening-group"><div class="opening-group-head"><strong>'+safe(m.id)+'</strong><small>'+m.openings.length+' documented openings</small></div>'+
      '<div class="opening-pills">'+(m.openings.map(o=>'<span>'+safe(o.id)+' · '+safe(o.role)+'</span>').join("")||'<small>No openings captured</small>')+'</div>'+
      '<button class="btn secondary small" data-action="inventory" data-id="'+safe(m.id)+'">'+(m.inventoryComplete?'✓ Inventory Complete':'Mark All Visible Openings Recorded')+'</button></div>').join("");
    const openingRefs=p.manholes.flatMap(m=>m.openings.map(o=>[m.id+"|"+o.id,m.id+" / "+o.id]));
    const pointForm=dataForm("point",'<div class="form-grid">'+
      field("Point type",select("kind",[
        ["OPENING_CENTER","Pipe opening center XYZ"],["PIPE_INVERT","Pipe invert XYZ"],["CHAMBER_CENTER","Chamber center XYZ"],["CHANNEL_POINT","Channel XYZ"],["BENCH_POINT","Bench XYZ"],["STEP_POINT","Step / ladder XYZ"],["PIPE_TRACE_POINT","Intermediate pipe trace XYZ"],["OTHER_POINT","Other visible feature XYZ"]]))+
      field("Manhole",select("manholeId",mhOptions(p)))+
      field("Associated opening",select("openingRef",[["","Not applicable / choose if opening point"],...openingRefs]))+
      field("Measurement method",select("method",[["TOTAL_STATION","Total Station"],["SURVEY_PEN_SIMULATED","Simulated Pen Click (DEMO)"],["PEN_CALIBRATED","Calibrated Pen"],["LASER_SCAN","Laser Scan"],["SONDE","Sonde / trace"],["DIRECT_EXPOSURE","Direct exposure"],["OTHER","Other"]]))+
      field("X / Easting (m)",number("x"))+field("Y / Northing (m)",number("y"))+field("Z / RL (m)",number("z"))+
      field("XY σ (m)",number("sigmaXY","",true,"any",".025"))+
      field("Z σ (m)",number("sigmaZ","",true,"any",".025"))+
      field("Evidence / calibration ref",txt("evidenceRef","e.g. TS-2026-BM01",false))+'</div>','Record XYZ Observation');
    const ev=dataForm("evidence",'<div class="form-grid">'+
      field("Evidence type",select("type",[["CCTV_CONTINUITY","CCTV proves connection"],["DIRECT_EXPOSURE","Direct exposure"],["SONDE_TRACE","Sonde trace"],["CCTV_TRACE","Georeferenced CCTV trace"],["EM_TRACE","EM trace"],["GPR_TRACE","GPR trace"],["AS_BUILT_LATER_ROUND","Historical as-built (later round)"]]))+
      field("Document / evidence ID",txt("ref","Provide attributable record"))+
      field("Independent reviewer",txt("reviewer","Reviewer ID (claimed)",false))+
      '<label class="form-field"><span>Evidence review status</span><span class="check-field"><input type="checkbox" name="reviewed"/>Independent review recorded (user-declared)</span></label></div>',
      'Attach Evidence Record');
    const pair=p.pair.join("|");
    const quick=dataForm("review",'<div class="form-grid">'+field("Action",select("type",[["constraints","Constraints physically checked"],["qa","Independent QA signed (user-declared)"]]))+
      field("Reviewer / proof reference",txt("reference","Evidence identifier"))+'</div>','Record Review Check');
    return '<div class="block"><div class="step">02 · TARGETED FIELD VERIFICATION</div><h2>Inspect the sector between '+safe(p.pair[0]||"?")+' and '+safe(p.pair[1]||"?")+'</h2>'+
      '<p class="muted">Survey all visible connections in both manholes. Every measured geometric point must be XYZ, with capture method and uncertainty. Record roles and material only if actually observed.</p>'+
      '<h3>Every opening — no exceptions</h3>'+openingForm+'<div class="opening-list">'+list+'</div>'+
      '<h3>Survey actual point XYZ</h3>'+pointForm+
      '<h3>Connection & independent tracing evidence</h3>'+ev+
      '<p class="caution">A user-ticked independent-review box is only a declared document status, not an external verification performed by SUBTERRA. Never use the initial historical GIS to create Round 0 points.</p>'+
      '<h3>Constraint / QA completion</h3>'+quick+
      '<div class="next-footer"><button class="btn btn-primary" data-action="next-round">Recalculate and Save Verification Round</button><button class="btn secondary" data-tab="catalog">Open Complete 430-Field Checklist</button></div></div>';
  }
  function catalogTab(p){
    const list=catalogRows(),view=list.slice(0,60);
    const options=view.map(f=>[f.id,f.id+" · "+f.key]);
    const saved=p.fieldValues.slice(-12).reverse().map(r=>'<tr><td>'+safe(r.fid)+'</td><td>'+safe(r.scope)+'</td><td>'+safe(r.value)+'</td></tr>').join("");
    return '<div class="block"><div class="step">03 · FULL FIELD DATA DICTIONARY</div><h2>Complete 430-Field Checklist</h2>'+
      '<p class="muted">All 430 atomic fields from the supplied engineering checklist are available. Repeat opening fields for each opening and keep attributes separate from XYZ coordinates. Missing is never zero.</p>'+
      dataForm("filter",'<div class="form-grid">'+field("Search field ID, description or name",txt("query","e.g. invert / OPN-020",false,state.filter))+
      field("Section",select("section",sections().map(([a,b])=>[a,b])))+'</div>','Filter Fields')+
      '<div class="table-scroll catalog-table"><table><thead><tr><th>ID</th><th>Field / measurement</th><th>Scope</th><th>Type</th><th>Rule</th></tr></thead><tbody>'+
      view.map(f=>'<tr><td>'+safe(f.id)+'</td><td><strong>'+safe(f.key)+'</strong><small>'+safe(f.description)+'</small></td><td>'+safe(f.scope)+'</td><td>'+safe(f.type)+' · '+safe(f.unit)+'</td><td>'+safe(f.requirement)+'</td></tr>').join("")+
      '</tbody></table></div><p class="muted">Showing '+view.length+' of '+list.length+' matching fields. Filter to locate any of the 430.</p>'+
      (options.length?dataForm("catalog",'<div class="form-grid">'+field("Catalog field",select("fieldId",options))+
      field("Associated asset / scope",select("scope",[["PROJECT","Project"],[p.pair.join("|"),"Active sector"],...p.manholes.map(m=>[m.id,m.id]),...p.manholes.flatMap(m=>m.openings.map(o=>[m.id+"|"+o.id,m.id+" / "+o.id]))]))+
      field("Value / observation",txt("value","Recorded value or UNKNOWN"))+
      field("Source reference",txt("evidenceRef","Record ID (optional)",false))+'</div>','Record Checklist Field'):"")+
      '<h3>Latest field observations</h3><div class="table-scroll"><table><thead><tr><th>Field</th><th>Scope</th><th>Value</th></tr></thead><tbody>'+saved+'</tbody></table></div></div>';
  }
  function roundsTab(p,r){
    const rows=p.rounds.slice().reverse().map(x=>
      '<article class="round-card"><b>'+safe(x.id)+'</b><span>'+safe(new Date(x.at).toLocaleString())+
      '</span><strong>'+n(x.result.score,1)+'/100</strong><small>'+safe(x.result.status)+'</small></article>').join("");
    let demo="";
    if(p.demo?.synthetic){
      demo='<section class="demo-round-buttons"><h3>Replay the four simulated rounds</h3>'+
        '<p class="muted">Select a frozen synthetic snapshot. The 103 historical GIS pipe lines were not used in the calculations.</p>'+
        [0,1,2,3].map(i=>'<button class="btn '+(p.demo.stage===i?'btn-primary':'secondary')+
          '" data-action="demo-stage" data-index="'+i+'">ROUND-0'+i+(p.demo.stage===i?' · CURRENT':'')+'</button>').join("")+
        '</section>';
      if(p.demo.stage===3){
        demo+='<section class="historical-review"><h3>Historical GIS: late validation only</h3>'+
          '<p>Historical Pipe 56 reference unlocks only after Round 03 and is not drawn as a competing route.</p>'+
          '<button class="btn secondary" data-action="historic-compare">Compare with held-out GIS Pipe 56</button></section>';
      }
      if(state.historicalComparison){
        const x=state.historicalComparison;
        demo+='<section class="historical-result"><b>HISTORICAL RECORD / NOT GROUND TRUTH</b>'+
          '<div>2004 recorded GIS centerline length: '+n(x.historicalLengthM,3)+' m</div>'+
          '<div>Current simulated opening-face length: '+n(x.modeledFaceLengthM,3)+' m</div>'+
          '<div>Length-definition difference: '+n(x.deltaM,3)+' m</div>'+
          '<p>'+safe(x.disclaimer)+'</p></section>';
      }
    }
    return '<div class="block"><div class="step">04 · EVIDENCE-BASED ITERATION</div><h2>Reconstruction Rounds</h2>'+
      '<p class="muted">Each round freezes its raw XYZ and attribute observations. Demo evidence is SIMULATED, not independently verified field truth.</p>'+
      '<div class="rounds">'+(rows||'<p>No completed verification rounds.</p>')+'</div>'+demo+
      '<div class="next-footer"><button class="btn btn-primary" data-action="next-round">Save Next Assessment Round</button>'+
      '<button class="btn secondary" data-tab="verify">Add more observations</button></div></div>';
  }
  function tasks(p,r){
    if(!r.route)return '<section class="block tasks"><h2>What to measure next</h2><p>Record ALL visible manholes with Total Station XYZ, then confirm survey completion to generate the first low-confidence route.</p></section>';
    if(p.accepted)return '<section class="block tasks"><div class="step">USER ACCEPTANCE</div><h2>Accepted at '+n(p.accepted.score,1)+'/100</h2><p class="muted">You accepted the current reconstruction while '+p.accepted.remaining.length+' verification tasks remain. No additional rounds are forced.</p><button class="btn secondary" data-action="resume">Resume Verification</button></section>';
    return '<section class="block tasks"><div class="step">NEXT BEST MEASUREMENTS</div><h2>Raise confidence with evidence</h2>'+
      '<p class="muted">Deterministic ranking by unfulfilled rubric weight divided by indicative effort. This is a task priority, not a promise of percentage gain.</p>'+
      '<div class="task-list">'+r.tasks.slice(0,5).map((t,i)=>'<div class="task"><span class="task-index">'+(i+1).toString().padStart(2,"0")+'</span><div><strong>'+safe(t.label)+'</strong><small>'+safe(t.method)+' · up to '+n(t.maxMissing,1)+' remaining points</small></div></div>').join("")+
      '</div><button class="btn btn-primary" data-tab="verify">Collect next measurement</button>'+
      '<button class="btn secondary" data-action="accept">Accept current confidence & stop</button>'+
      '<div class="footnote">Acceptance is a user decision, not a professional certification or proof of hidden pipe position.</div></section>';
  }
  function main(p,r){
    const status=r.score===null?"Awaiting ≥ 2 surveyed manholes":r.route?.hiddenAlignmentUnquantified?"Buried route untraced — hypothesis":"Trace evidence recorded — review status required";
    return '<header class="app-header"><div><div class="eyebrow">SANITARY / STORMWATER · XYZ RECONSTRUCTION ENGINE</div><h1>'+safe(p.name)+'</h1><p>'+safe(p.network.toUpperCase())+' · '+safe(p.control.crs)+' · '+safe(p.control.verticalDatum)+' · Total Station First</p></div><div class="header-actions"><button class="btn secondary" data-action="export">Export JSON</button><label class="file-control">Import v2 JSON<input type="file" id="importProject" accept=".json,application/json"/></label></div></header>'+
      '<div class="workspace"><div class="confidence-wrapper">'+dashboard(p,r)+'</div>'+
      '<main class="workspace-main"><div class="map-panel"><div class="map-title"><strong>RECONSTRUCTED ROUTE</strong><span>'+safe(status)+'</span></div>'+mapSvg(p,r)+
      '<div class="map-legend"><span><i style="background:'+color(r.score)+'"></i>Single active route · score '+(r.score===null?"—":n(r.score,1))+'</span><span>'+safe(r.status.replaceAll("_"," "))+'</span></div></div>'+
      '<div class="tabs"><button data-tab="survey" class="'+(state.tab==="survey"?"active":"")+'">1 · Total Station</button>'+
      '<button data-tab="verify" class="'+(state.tab==="verify"?"active":"")+'">2 · Field Verification</button>'+
      '<button data-tab="catalog" class="'+(state.tab==="catalog"?"active":"")+'">3 · 430-Field Checklist</button>'+
      '<button data-tab="rounds" class="'+(state.tab==="rounds"?"active":"")+'">4 · Rounds</button></div>'+
      (state.tab==="verify"?(r.route?verifyTab(p,r):surveyTab(p,r)):state.tab==="catalog"?catalogTab(p):state.tab==="rounds"?roundsTab(p,r):surveyTab(p,r))+
      '<footer class="application-footer">SUBTERRA v2 · Deterministic geometry and verification-coverage score · NO AI · Browser-local competition build; mobile live sync is a separate backend integration.</footer></main>'+
      '<aside class="tasks-wrapper">'+tasks(p,r)+'</aside></div>';
  }
  function render(){
    if(!state.p){el.innerHTML=projectView()+'<div class="notification" id="notification" hidden></div>';return;}
    let r;try{r=E.assess(state.p);}catch(err){el.innerHTML='<div class="start"><h1>Input validation error</h1><p>'+safe(err.message)+'</p><button data-action="reset">Start new project</button></div>';return;}
    el.innerHTML=main(state.p,r)+'<div class="notification" id="notification" hidden></div>';
  }
  function toData(form){return Object.fromEntries(new FormData(form).entries());}
  function parseNums(obj,keys){
    const out={...obj};for(const k of keys)out[k]=Number(obj[k]);return out;
  }
  function doForm(name,data,form){
    const p=state.p;
    if(name==="create"){const a=E.project({...data,targetXY:Number(data.targetXY),targetZ:Number(data.targetZ)});state.tab="survey";update(a,"New v2 project created. Survey ALL visible manholes first.");return;}
    if(!p)throw Error("Create a project first");
    if(name==="manhole"){
      let next=E.addManhole(p,parseNums(data,["x","y","z","sigmaXY","sigmaZ"]));
      if(next.manholes.length===2&&p.pair.length!==2)next=E.setPair(next,next.manholes[0].id,next.manholes[1].id);
      update(next,"Total Station XYZ recorded; only a provisional route is inferred.");return;
    }
    if(name==="pair"){update(E.setPair(p,data.from,data.to),"Active sector selected; Round 0 remains a hypothesis.");return;}
    if(name==="opening"){update(E.addOpening(p,data.manholeId,parseNums(data,["diameterMm"])),"Physical opening registered.");return;}
    if(name==="point"){
      const raw=parseNums(data,["x","y","z","sigmaXY","sigmaZ"]);
      if(raw.openingRef){const [m,o]=raw.openingRef.split("|");raw.manholeId=m;raw.openingId=o;}
      update(E.addPoint(p,raw),"XYZ measurement recorded with method and precision.");return;
    }
    if(name==="evidence"){
      const reviewed=!!form.elements.namedItem("reviewed")?.checked;
      update(E.evidence(p,{type:data.type,ref:data.ref,reviewer:data.reviewer,reviewed}),"Evidence entered; stated review status is user-declared.");return;
    }
    if(name==="review"){
      if(!data.reference?.trim())throw Error("Evidence reference needed");
      const key=p.pair.join("|");
      const x=data.type==="constraints"?"SFP-REVIEW":"SFP-QA";
      const y=data.type==="constraints"?"COMPLETE":"INDEPENDENT_REVIEWED";
      update(E.field(p,key,x,y),"Review statement captured. Inspect source documentation independently.");return;
    }
    if(name==="filter"){state.filter=String(data.query||"");state.section=String(data.section||"ALL");render();return;}
    if(name==="catalog"){update(E.field(p,data.scope,data.fieldId,data.value),"Checklist observation recorded.");return;}
  }
  document.addEventListener("submit",e=>{
    const form=e.target.closest("form[data-form]");if(!form)return;
    e.preventDefault();
    try{doForm(form.dataset.form,toData(form),form);}catch(err){notify(err.message||String(err));}
  });
  document.addEventListener("click",e=>{
    const target=e.target.closest("[data-tab],[data-action]");if(!target)return;
    if(target.dataset.tab){state.tab=target.dataset.tab;render();return;}
    const action=target.dataset.action,p=state.p;
    try{
      if(action==="surface-complete"){
        if(window.confirm("Confirm Total Station XYZ has been captured for ALL visible manholes in this survey area?")){let next=E.setSurfaceSurveyComplete(p,true);next=E.nextRound(next);update(next,"Round 0 frozen. Low-confidence route created; buried pipe Z remains unknown.");}
        return;
      }
      if(action==="inventory"){
        const mh=p.manholes.find(x=>x.id===target.dataset.id);
        update(E.inventory(p,target.dataset.id,!mh.inventoryComplete),"Opening inventory status updated.");return;
      }
      if(action==="next-round"){update(E.nextRound(p),"New immutable verification round saved; score recalculated.");return;}
      if(action==="accept"){
        const value=window.prompt("Reason for accepting the current evidence score (remaining risks will be recorded):","Current evidence accepted for preliminary planning");
        if(value===null)return;
        update(E.accept(p,value),"Accepted with outstanding verification limitations; resume whenever needed.");return;
      }
      if(action==="resume"){update({...p,accepted:null},"Verification rounds resumed.");return;}
      if(action==="reset"){
        if(window.confirm("Replace this local v2 project? Export a JSON copy first if required.")){
          localStorage.removeItem(STORE);state.p=null;state.tab="survey";render();
        }return;
      }
      if(action==="export"){
        if(!p)return;
        const a=document.createElement("a"),blob=new Blob([JSON.stringify(p,null,2)],{type:"application/json"});
        a.href=URL.createObjectURL(blob);a.download="SUBTERRA_v2_"+p.name.replace(/[^a-z0-9_-]+/gi,"_").slice(0,32)+".json";
        a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);return;
      }
    }catch(err){notify(err.message||String(err));}
  });
  document.addEventListener("change",async e=>{
    if(e.target.id==="importStation"){
      const file=e.target.files?.[0];if(!file||!state.p)return;
      try{
        if(file.size>3*1024*1024)throw Error("CSV exceeds 3 MB");
        const raw=await file.text(),lines=raw.replace(/\r/g,"").split("\n").filter(x=>x.trim());
        if(lines.length<2)throw Error("Empty CSV");
        const heads=lines.shift().split(",").map(x=>x.trim().toLowerCase().replace(/[^a-z0-9]/g,""));
        const required=["id","x","y","z","sigmaxy","sigmaz"];
        for(const h of required)if(!heads.includes(h))throw Error("Missing CSV column "+h+"; expected id,x,y,z,sigmaXY,sigmaZ");
        let next=state.p,count=0;
        for(const line of lines){
          const cells=line.split(",");if(cells.length!==heads.length)throw Error("Incorrect column count on row "+(count+2));
          const at=k=>cells[heads.indexOf(k)].trim().replace(/^"|"$/g,"");
          const numberStrict=k=>{const raw=at(k);if(!raw)throw Error("Missing "+k+" in row "+(count+2));return Number(raw);};
          next=E.addManhole(next,{id:at("id"),x:numberStrict("x"),y:numberStrict("y"),z:numberStrict("z"),
            sigmaXY:numberStrict("sigmaxy"),sigmaZ:numberStrict("sigmaz")});count++;
        }
        if(next.manholes.length>=2&&next.pair.length!==2)next=E.setPair(next,next.manholes[0].id,next.manholes[1].id);
        update(next,count+" Total Station manholes imported. Confirm ALL visible assets were surveyed to enable route.");
      }catch(err){notify("Station CSV rejected: "+String(err.message||err));}
      return;
    }
    if(e.target.id!=="importProject")return;
    const file=e.target.files?.[0];if(!file)return;
    try{
      if(file.size>10*1024*1024)throw Error("Project JSON file larger than 10 MB");
      const p=JSON.parse(await file.text());
      if(p.schema!=="subterra-v2"||!Array.isArray(p.manholes)||!Array.isArray(p.points)||!Array.isArray(p.rounds))
        throw Error("Only Subterra v2 project JSON can be imported. Old app project formats are intentionally rejected");
      E.assess(p);state.tab="survey";update(p,"SUBTERRA v2 project imported");
    }catch(err){notify(err.message||String(err));}
  });
  async function init(){
    // Explicit v2 cut-over: the retired v0.16 browser project store is discarded.
    try{localStorage.removeItem("subterra_ui_v1");}catch{}
    const old=stored();
    if(old?.schema==="subterra-v2"){try{E.assess(old);state.p=old;}catch{}}
    try{
      const res=await fetch("data/field-catalog-v2.json?v=2.0",{cache:"no-store"});
      if(!res.ok)throw Error("Checklist could not be loaded: HTTP "+res.status);
      const cat=await res.json();
      if(cat.count!==430||!Array.isArray(cat.fields)||cat.fields.length!==430)throw Error("Incomplete field dictionary");
      state.catalog=cat.fields;
    }catch(err){state.lastError=String(err.message||err);}
    render();if(state.lastError)notify(state.lastError);
  }
  init();
})();