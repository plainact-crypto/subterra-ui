/* Subterra UI v0.15 — independent field survey and deterministic correction. */
(() => {
  'use strict';

  const STORAGE_KEY = 'subterra_ui_v1';
  const TRASH_ICON = '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 15H6L5 6M10 10v7M14 10v7"/></svg>';
  const SYSTEMS = [
    ['sewer','Sanitary Sewer','Gravity sewers, manholes and service connections','◉',true],
    ['storm','Stormwater Drainage','Catch basins, culverts and storm drainage','☂',false],
    ['water','Potable Water','Distribution mains, valves and water chambers','≈',false],
    ['irrigation','Irrigation','Irrigation mains, valves and sprinklers','✿',false],
    ['fire','Firefighting Network','Fire mains, hydrants and valve chambers','♜',false],
    ['gas','Natural Gas','Gas distribution and service lines','◇',false],
    ['electrical-lv','Electrical — LV','Low-voltage cable routes and panels','ϟ',false],
    ['electrical-mv','Electrical — MV','Medium-voltage feeders and substations','ϟ',false],
    ['electrical-hv','Electrical — HV','High-voltage underground and overhead lines','ϟ',false],
    ['lighting','Street Lighting','Lighting poles, feeders and pull boxes','☼',false],
    ['telecom','Telecommunications / Fiber','Duct banks, fiber cables and chambers','⌘',false],
    ['district','District Cooling','Cooling distribution supply and return','❄',false],
    ['fuel','Fuel / Oil Pipelines','Fuel distribution networks','◈',false],
    ['other','Other Utilities','Additional infrastructure systems','＋',false]
  ];
  const $ = sel => document.querySelector(sel);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const persisted = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } })();
  const state = {
    projects:Array.isArray(persisted.projects) ? persisted.projects : [],
    activeId:persisted.activeId||null,
    page:'projects',
    selectedMh:null,
    canvas:{panX:0,panY:0,scale:2,dirtyFit:true},
    pointer:null,
    toastTimer:null
  };

  let candidateRevision=0;
  let candidateCache=null;
  function save() {
    candidateRevision++;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({projects:state.projects,activeId:state.activeId}));
      $('#saveStatus').innerHTML = '<span class="save-circle"></span> Saved locally';
    } catch { $('#saveStatus').textContent = 'Storage unavailable'; }
  }
  function active() { return state.projects.find(p => p.id===state.activeId) || null; }
  function announce(message) { const t=$('#toast'); t.textContent=message; t.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>t.classList.remove('show'),2500); }
  function navigate(page) { state.page=page; window.scrollTo(0,0); render(); }
  function selectProject(id) { state.activeId=id; state.selectedMh=null; window.SubterraWizard.resetStep(); state.canvas.dirtyFit=true; save(); navigate('systems'); }
  function deleteProject(id) {
    const project=state.projects.find(p=>p.id===id);
    if(!project)return false;
    const count=project.manholes?.length||0;
    // The entire project object includes its nested manholes, openings and components.
    if(!window.confirm(`Permanently delete project "${project.name}"?\n\nThis removes all ${count} manhole records and project settings saved in this browser. This cannot be undone.\n\nExport a JSON backup first if required.`))return false;
    state.projects=state.projects.filter(p=>p.id!==id);
    if(state.activeId===id)state.activeId=null;
    state.selectedMh=null;
    state.canvas.dirtyFit=true;
    window.SubterraWizard.resetStep();
    save();
    navigate('projects');
    announce(`Project "${project.name}" deleted from this browser`);
    return true;
  }
  function handleDeleteProjectLink() {
    // A deletion link must be visited explicitly: ?deleteProject=Sewer%20Test%2001
    const params=new URLSearchParams(window.location.search);
    const name=params.get('deleteProject');
    if(name===null)return;
    params.delete('deleteProject');
    const rest=params.toString();
    window.history.replaceState(null,'',window.location.pathname+(rest?'?'+rest:'')+window.location.hash);
    const matches=state.projects.filter(p=>p.name.trim()===name.trim());
    if(matches.length===1)deleteProject(matches[0].id);
    else if(matches.length>1)announce('Multiple projects share this name. Use the trash icon for a specific project.');
    else announce('Project not found in this browser.');
  }
  function renderNav() {
    $('#projectCount').textContent=state.projects.length;
    $('#navProjects').classList.toggle('active',state.page==='projects');
    $('#navSystems').classList.toggle('active',state.page==='systems');
    $('#sideProjectList').innerHTML=state.projects.slice().reverse().map(p=>`<div class="side-project-row"><button class="side-project ${state.activeId===p.id?'current':''}" data-open-project="${escapeHtml(p.id)}"><span class="p-dot"></span><span class="side-project-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span></button><button type="button" class="project-delete-btn side-project-delete" data-delete-project="${escapeHtml(p.id)}" title="Delete ${escapeHtml(p.name)}" aria-label="Delete project ${escapeHtml(p.name)}">${TRASH_ICON}</button></div>`).join('');
    const p=active(); const trail=state.page==='projects'?['Workspace','Projects']:state.page==='systems'?['Projects',p?.name||'Systems']:['Projects',p?.name||'Project','Sanitary Sewer'];
    $('#breadcrumbs').innerHTML=trail.map((x,i)=>`${i?'<span class="crumb-arrow">/</span>':''}${i===trail.length-1?`<b>${escapeHtml(x)}</b>`:`<span>${escapeHtml(x)}</span>`}`).join('');
  }
  function render() { renderNav(); if(state.page==='projects') renderProjects(); else if(state.page==='systems') renderSystems(); else if(state.page==='sewer') renderWorkspace(); }
  function renderProjects() {
    $('#mainContent').innerHTML=`<section class="page"><div class="eyebrow">INFRASTRUCTURE RECONSTRUCTION</div><div class="page-header"><div><h1>Your projects</h1><p class="page-subtitle">Create a project, select an infrastructure system, then start recording actual site evidence.</p></div><div class="project-header-actions"><button class="btn btn-outline" data-create-blind-test>◈ Pipe 56 Blind Test</button><button class="btn btn-primary" data-new-project>＋ New project</button></div></div>${state.projects.length?`<div class="project-cards">${state.projects.slice().reverse().map(p=>`<article class="project-card" data-select-project="${escapeHtml(p.id)}" role="button" tabindex="0"><div class="project-card-top"><span class="project-icon">▧</span><div class="project-card-tools"><span class="light-label">PROJECT</span><button type="button" class="project-delete-btn project-card-delete" data-delete-project="${escapeHtml(p.id)}" title="Delete ${escapeHtml(p.name)}" aria-label="Delete project ${escapeHtml(p.name)}">${TRASH_ICON}</button></div></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.location||'Location not specified')}</p><div class="project-card-bottom"><span>${p.manholes?.length||0} manholes · ${escapeHtml(p.coordMode==='projected'?'XY metres':'WGS84')}</span><span>Open project ↗</span></div></article>`).join('')}</div>`:`<div class="empty-state"><div class="empty-art">▧</div><h2>No projects yet</h2><p>Create a new project to organize your infrastructure systems, survey coordinates and engineering evidence.</p><button class="btn btn-primary" data-new-project>＋ Create first project</button></div>`}</section>`;
  }
  function renderSystems() {
    const p=active(); if(!p){navigate('projects');return;}
    $('#mainContent').innerHTML=`<section class="page"><div class="eyebrow">PROJECT / ${escapeHtml(p.name)}</div><div class="page-header"><div><h1>Infrastructure systems</h1><p class="page-subtitle">Choose a system to open its data workspace. The first prototype supports sanitary sewer manholes.</p></div><div class="project-header-actions"><button class="btn btn-outline" data-all-projects>← All projects</button><button class="btn btn-danger-outline" data-delete-project="${escapeHtml(p.id)}">${TRASH_ICON} Delete project</button></div></div><div class="project-summary"><strong>${escapeHtml(p.name)}</strong><span class="summary-divider"></span><span>${escapeHtml(p.location||'Location not set')}</span><span class="summary-divider"></span><span>${escapeHtml(p.coordMode==='geographic'?'WGS84 · Latitude / Longitude':'Projected coordinates · XY metres')}</span></div><div class="system-grid">${SYSTEMS.map(([id,name,desc,sym,ready])=>`<button class="system-card" data-open-system="${id}" ${ready?'':'disabled'}><div class="system-head"><span class="system-symbol">${sym}</span><span class="${ready?'ready':'coming'}">${ready?'OPEN WORKSPACE':'COMING LATER'}</span></div><div><div class="system-title">${escapeHtml(name)}</div><div class="system-desc">${escapeHtml(desc)}</div></div></button>`).join('')}</div></section>`;
  }

  // Visualization only: never mutates the documented GIS pipe geometries.
  function historicalPipesButton(p){
    const visible=p.showHistoricalPipes!==false;
    const icon=visible
      ? '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 4.5 19.5 19.5M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.5 4.3M6.1 6.6C3.5 8.5 2 12 2 12s3.6 7 10 7a11.8 11.8 0 0 0 4.4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
    return `<button type="button" class="canvas-pill historical-pipes-toggle ${visible?'visible':'hidden-pipes'}" id="toggleHistoricalPipes" aria-pressed="${visible}" aria-label="${visible?'Hide':'Show'} Historical GIS Pipes" title="Historical GIS pipes are validation reference, not inferred results">${icon}<span>Historical GIS Pipes</span><span class="historical-pipes-state">${visible?'Visible':'Hidden'}</span></button>`;
  }


  function calculatedCandidateButton(p){
    const visible=p.showCalculatedCandidate!==false;
    const icon=visible
      ? '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 4.5 19.5 19.5M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.5 4.3M6.1 6.6C3.5 8.5 2 12 2 12s3.6 7 10 7a11.8 11.8 0 0 0 4.4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
    return `<button type="button" class="canvas-pill calculated-pipes-toggle ${visible?'visible':'hidden-pipes'}" id="toggleCalculatedCandidate" aria-pressed="${visible}" aria-label="${visible?'Hide':'Show'} Calculated Candidates" title="Computed from manhole locations and outlet/inlet invert levels only; straight-line hypothesis">${icon}<span>Calculated Candidates</span><span class="candidate-pipes-state">${visible?'Visible':'Hidden'}</span></button>`;
  }

  function computeCandidate(p){
    const empty={candidates:[],eligiblePairs:0,reason:'Project has no WGS84 evidence'};
    if(p?.blindCase?.locked){
      const r=pipe56StoredResult(p);
      return r?{candidates:[r.candidate],eligiblePairs:1,reason:'Phase 2A evidence-only result'}
        :{...empty,reason:p.blindCase.phase2?'Frozen result integrity mismatch':'Phase 1: no calculations'};
    }
    if(p?.coordMode!=='geographic')return empty;
    if(candidateCache && candidateCache.project===p && candidateCache.revision===candidateRevision)
      return candidateCache.result;
    const evidence=window.SubterraInferenceEvidence?.build(p);
    const result=evidence ? window.SubterraCandidate?.candidatesFromEvidence(evidence) : empty;
    candidateCache={project:p,revision:candidateRevision,result:result||empty};
    return result||empty;
  }
  function drawCalculatedCandidate(points,result){
    const p=active();
    if(!p||p.showCalculatedCandidate===false||!points.length||!result?.candidates?.length)return;
    const origin=points[0].mh;
    ctx.save();
    // Orange candidate centerlines use ONLY manhole evidence. Historic GIS remains an
    // independently rendered blue dashed reference overlay drawn AFTER the orange layer.
    ctx.strokeStyle='#e58b24';ctx.lineWidth=6;ctx.lineCap='round';ctx.setLineDash([]);
    for(const candidate of result.candidates) {
      const vertices=candidate.coordinates;
      if(!Array.isArray(vertices)||vertices.length!==2)continue;
      const start=toWorld(p,{lat:vertices[0][1],lon:vertices[0][0]},origin);
      const finish=toWorld(p,{lat:vertices[1][1],lon:vertices[1][0]},origin);
      const a=pos(start.x,start.y),b=pos(finish.x,finish.y);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.restore();
  }
  function updateCandidateSummary(result,p){
    const display=$('#candidateSummary');
    if(!display)return;
    if(p?.blindCase?.locked){
      display.hidden=false;
      const r=pipe56StoredResult(p);
      display.textContent=r
        ? (p.showCalculatedCandidate!==false
            ? 'Calculated straight line · '+r.candidate.distanceM.toFixed(3)+' m · S '+r.candidate.slopePercent.toFixed(4)+'% · Historical GIS withheld'
            : 'Calculated candidate hidden · Historical GIS withheld')
        : (p.blindCase.phase2?'Calculation integrity mismatch · GIS withheld':'Phase 1 · Frozen manhole evidence · No inference run · Historical GIS reference withheld');
      return;
    }
    const count=result?.candidates?.length||0;
    const eligible=result?.eligiblePairs||0;
    const visible=p?.showCalculatedCandidate!==false;
    display.hidden=false;
    if(!visible) {
      display.textContent='Calculated Candidates hidden · '+count+' available';
    } else if(count) {
      display.textContent=count+' calculated candidate'+(count===1?'':'s')+
        ' · '+eligible+' plausible opening pairs screened · Unverified straight-line hypotheses';
    } else {
      display.textContent='0 calculated candidates · '+(result?.reason||'Insufficient documented evidence');
    }
  }


  function pipe56StoredResult(p){
    if(!p?.blindCase?.phase2 || window.SubterraBlindTest?.validatorVersion!==3)return null;
    if(!window.SubterraBlindTest.validate(p).pass)return null;
    const evidence=window.SubterraInferenceEvidence.build(p);
    return window.SubterraPipe56Phase2?.verify(evidence,p.blindCase.phase2).pass
      ? p.blindCase.phase2 : null;
  }

  function pipe56StoredHydraulics(p) {
    if(!p?.blindCase?.phase2b || window.SubterraBlindTest?.validatorVersion!==3)return null;
    const prior=pipe56StoredResult(p);
    if(!prior)return null;
    return window.SubterraPipe56Hydraulics?.verify(prior,p.blindCase.phase2b).pass
      ? p.blindCase.phase2b : null;
  }
  function runPipe56Hydraulics(){
    const p=active();
    if(!p?.blindCase?.locked || !p.blindCase.phase2)return;
    if(p.blindCase.phase2b){announce('Frozen hydraulic scenarios already exist — kept unchanged');return;}
    if(p.blindCase.stage!=='PHASE_2A_CALCULATED'){announce('Phase 2A stage required first');return;}
    const prior=pipe56StoredResult(p);
    if(!prior){announce('Phase 2A integrity mismatch — hydraulics blocked');return;}
    try{
      const result=window.SubterraPipe56Hydraulics.compute(prior);
      if(!window.SubterraPipe56Hydraulics.verify(prior,result).pass)throw Error('Hydraulic recalculation mismatch');
      p.blindCase.phase2b=result;
      p.blindCase.stage='PHASE_2B_HYDRAULIC_SCENARIO';
      save();renderWorkspace();
      announce('Phase 2B hydraulic scenarios frozen · historical GIS still withheld');
    }catch(err){announce('Phase 2B blocked: '+String(err?.message||err));}
  }
  function pipe56HydraulicsHtml(p){
    const saved=p.blindCase?.phase2b;
    if(!saved)return '<div class="blind-caution">No hydraulic scenario run. The Phase 2A evidence and calculation stay frozen.</div>';
    if(window.SubterraBlindTest?.validatorVersion!==3)
      return '<div class="blind-caution">Outdated validator. Refresh the application; stored calculations have not been erased.</div>';
    const r=pipe56StoredHydraulics(p);
    if(!r)return '<div class="blind-caution">Hydraulic scenario integrity mismatch — existing snapshot preserved for inspection, not displayed as verified.</div>';
    const fmt=(x,d=3)=>Number(x).toFixed(d);
    const base=r.scenarios.find(x=>x.manningN===0.013);
    return `<div class="phase2-summary hydraulic-results">
      <strong>PHASE 2B · MANNING SCENARIO / FROZEN</strong>
      <p class="hydraulic-muted">Theoretical uniform full-flow capacity using ${fmt(r.inputs.nominalDiameterMm,1)} mm <b>nominal</b> diameter as assumed internal diameter and the Phase 2A straight-line slope.</p>
      <div class="phase2-kpis">
        <div><small>Base Manning n</small><b>0.013</b></div>
        <div><small>Assumed hydraulic radius</small><b>${fmt(r.geometry.hydraulicRadiusM,4)} m</b></div>
        <div><small>Theoretical full-flow velocity</small><b>${fmt(base.velocityMps,3)} m/s</b></div>
        <div><small>Theoretical full-flow capacity</small><b>${fmt(base.capacityLps,1)} L/s</b></div>
      </div>
      <div class="phase2-equations">
        <b>Equations and scenario assumptions</b>
        <p>A = πD²/4 = ${fmt(r.geometry.areaM2,5)} m²</p>
        <p>R = D/4 = ${fmt(r.geometry.hydraulicRadiusM,4)} m</p>
        <p>V = (1/n) × R^(2/3) × √S</p>
        <p>S = ΔInvert / L = ${fmt(r.inputs.straightLineGradient*100,4)}%</p>
        <p>Q = A × V = ${fmt(base.capacityLps,1)} L/s (at n = 0.013)</p>
      </div>
      <div class="hydraulic-table-wrap"><table class="hydraulic-table">
        <thead><tr><th>Manning n</th><th>V full (m/s)</th><th>Q full (L/s)</th></tr></thead>
        <tbody>${r.scenarios.map(x=>`<tr class="${x.manningN===0.013?'base':''}"><td>${fmt(x.manningN,3)}</td><td>${fmt(x.velocityMps,3)}</td><td>${fmt(x.capacityLps,1)}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="blind-caution">
        <b>NO MEASURED FLOW / NO COMPLIANCE CLAIM</b>
        <p>Actual Q, V, flow depth, roughness, bore and pipe condition are unknown. The hydraulic slope and assumed connection are not independently verified. These numbers are conditional capacity scenarios only, not actual operating performance or proof of buried alignment.</p>
      </div>
      <div class="hydraulic-citation">Literature: <a href="${r.source.url}" target="_blank" rel="noopener noreferrer">EPA SWMM 5.1 Appendix A.7</a> · clay n = 0.011–0.015. Source is not a historic acceptance record.</div>
    </div>`;
  }

  function runPipe56Phase2(){
    const p=active();
    if(!p?.blindCase?.locked)return;
    if(p.blindCase.phase2){announce('Phase 2A is already frozen');return;}
    if(!window.SubterraBlindTest?.validate(p).pass){announce('Frozen evidence has changed — run blocked');return;}
    try{
      const evidence=window.SubterraInferenceEvidence.build(p);
      const calc=window.SubterraPipe56Phase2.compute(evidence);
      if(!window.SubterraPipe56Phase2.verify(evidence,calc).pass)throw Error('Calculation check failed');
      p.blindCase.phase2=calc;
      p.blindCase.stage='PHASE_2A_CALCULATED';
      p.showCalculatedCandidate=true;
      save();renderWorkspace();
      announce('Phase 2A calculated and frozen — GIS reference withheld');
    }catch(err){announce('Phase 2A not run: '+String(err.message||err));}
  }
  function pipe56Phase2Html(p){
    if(!p.blindCase.phase2)return '<div class="blind-caution">No calculations run. Press Run Phase 2A to calculate from frozen evidence.</div>';
    if(window.SubterraBlindTest?.validatorVersion!==3)
      return '<div class="blind-caution">Outdated validator loaded. Reload the latest app version; the saved Phase 2A result has not been erased.</div>';
    const r=pipe56StoredResult(p);
    if(!r)return '<div class="blind-caution">Calculation integrity mismatch — results cannot be verified.</div>';
    const e=r.engineering,fmt=(v,d=3)=>Number(v).toFixed(d);
    return `<div class="phase2-summary">
      <strong>PHASE 2A · CALCULATED / FROZEN</strong>
      <div class="phase2-kpis">
        <div><small>Endpoint Distance</small><b>${fmt(e.horizontalDistanceM)} m</b></div>
        <div><small>Endpoint Azimuth</small><b>${fmt(e.azimuthDegFromNorthClockwise,2)}°</b></div>
        <div><small>Invert Drop</small><b>${fmt(e.straightLineInvertDropM,6)} m</b></div>
        <div><small>Candidate Slope</small><b>${fmt(e.straightLineSlopePercent,4)}%</b></div>
      </div>
      <div class="phase2-equations">
        <b>Engineering Equations</b>
        <p>L = Haversine(MH-42 top, MH-45 top) = ${fmt(e.horizontalDistanceM)} m</p>
        <p>ΔInvert = ${fmt(e.upstreamOutletInvertRL,6)} − ${fmt(e.downstreamInletInvertRL,6)} = ${fmt(e.straightLineInvertDropM,6)} m</p>
        <p>S = (ΔInvert / L) × 100 = ${fmt(e.straightLineSlopePercent,4)}%</p>
        <p>Cover-to-Invert: MH-42 ${fmt(e.upstreamCoverToInvertDepthM,3)} m · MH-45 ${fmt(e.downstreamCoverToInvertDepthM,3)} m</p>
        <p>Documented openings: Ø ${fmt(e.documentedNominalDiameterMm,1)} mm · ${escapeHtml(e.documentedPipeMaterial)}</p>
      </div>
      <div class="blind-caution"><b>STRAIGHT-LINE HYPOTHESIS ONLY</b>
        <p>Azimuth is derived from top positions, not a measured pipe bearing. Opening association is unverified; vertical datum unknown. Historical GIS route and pipe length remain withheld. Actual operating velocity is not measured. Phase 2B shows a conditional theoretical full-flow scenario, not a verified operating velocity. Calibrated confidence has not been calculated.</p>
      </div>
    </div>`;
  }

  function startBlindTest(){
    const api=window.SubterraBlindTest;
    if(!api){announce('Blind test module unavailable. Reload SUBTERRA.');return;}
    const found=state.projects.find(x=>x.blindCase?.caseId===api.caseId);
    if(found){
      const v=api.validate(found);
      if(!v.pass){announce('Existing test changed. Re-import the evidence only after backing up; original kept.');return;}
      state.activeId=found.id;state.selectedMh=null;state.canvas.dirtyFit=true;
      save();navigate('sewer');announce('Existing frozen Pipe 56 test opened — no duplicates');return;
    }
    const template=api.buildTemplate();
    const project={...template,id:uid(),createdAt:new Date().toISOString(),
      manholes:template.manholes.map((m,i)=>({...m,id:uid(),autoIndex:i+1}))};
    const validation=api.validate(project);
    if(!validation.pass){announce('Fixture integrity failed. Test was NOT created.');return;}
    // Append-only: no changes to any existing project, including the 87-manhole dataset.
    state.projects.push(project);state.activeId=project.id;state.selectedMh=null;
    state.canvas.dirtyFit=true;save();navigate('sewer');
    announce('Separate Pipe 56 Phase 1 evidence test created — locked, reference withheld');
  }

  // Field survey overlays are ADDITIVE. Never overwrite frozen Phase 1, 2A, or 2B.
  function fieldSurveyActiveRun(p){
    const runs=Array.isArray(p?.fieldSurveyRuns)?p.fieldSurveyRuns:[];
    if(!runs.length)return null;
    const run=runs.find(r=>r.id===p.activeFieldSurveyRunId)||runs[runs.length-1];
    const frozen=pipe56StoredResult(p);
    if(!frozen||!window.SubterraFieldSurvey?.verify(run?.input,frozen,run?.result)?.pass)return null;
    return run;
  }
  function addFieldSurveyInput(input){
    const p=active(),prior=pipe56StoredResult(p);
    if(!p?.blindCase?.locked||!prior){announce('Field survey requires a verified frozen Phase 2A case');return;}
    try{
      const engine=window.SubterraFieldSurvey;
      if(!engine)throw Error('Field survey module was not loaded');
      const parsed=engine.validate(input);
      const result=engine.compute(input,prior);
      if(!engine.verify(input,prior,result).pass)throw Error('Deterministic recomputation did not match');
      p.fieldSurveyRuns=Array.isArray(p.fieldSurveyRuns)?p.fieldSurveyRuns:[];
      if(p.fieldSurveyRuns.length>=20)throw Error('20 survey versions reached. Export project JSON before creating a fresh test case');
      if(p.fieldSurveyRuns.some(r=>r.id===input.metadata.surveyId))
        throw Error('Survey ID already imported: use a new surveyId for revisions');
      const entry={id:input.metadata.surveyId,input:JSON.parse(JSON.stringify(input)),result};
      p.fieldSurveyRuns.push(entry);
      p.activeFieldSurveyRunId=entry.id;
      save();renderWorkspace();
      announce(result.geometry.lineDrawingAllowed
        ? 'Field scenario saved · green line is a constrained geometric hypothesis'
        : 'Field scenario saved · geometry conflict, green line withheld');
    }catch(err){announce('Field survey rejected: '+String(err?.message||err));}
  }
  async function importFieldSurveyJsonFile(file){
    if(!file)return;
    if(file.size>2*1024*1024){announce('Field survey JSON exceeds 2 MB');return;}
    try{const data=JSON.parse(await file.text());addFieldSurveyInput(data);}
    catch(err){announce('Field survey JSON error: '+String(err?.message||err));}
  }
  async function loadSimulatedFieldSurvey(){
    try{
      const response=await fetch('data/field-survey/SUBTERRA_PIPE56_SIMULATED_Field_Survey_v1.json',{cache:'no-store'});
      if(!response.ok)throw Error('Demo file HTTP '+response.status);
      const data=await response.json();
      // A repeated demo import is not a reason to overwrite a frozen snapshot.
      if(active()?.fieldSurveyRuns?.some(r=>r.id===data.metadata.surveyId)){
        active().activeFieldSurveyRunId=data.metadata.surveyId;
        save();renderWorkspace();announce('Existing simulated demo selected');return;
      }
      addFieldSurveyInput(data);
    }catch(err){announce('Could not load demo: '+String(err?.message||err));}
  }
  function fieldSurveyHtml(p){
    const runs=Array.isArray(p.fieldSurveyRuns)?p.fieldSurveyRuns:[];
    const run=fieldSurveyActiveRun(p),err=runs.length&&!run;
    const fmt=(v,d=3)=>typeof v==='number'?Number(v).toFixed(d):escapeHtml(v??'UNKNOWN');
    const links='<div class="field-survey-links"><a href="docs/SUBTERRA_Field_Survey_JSON_Manual_AR.pdf" target="_blank" rel="noopener noreferrer">📄 Arabic PDF Manual</a><a href="docs/field-survey-manual-ar.html" target="_blank" rel="noopener noreferrer">Manual HTML</a><a href="data/field-survey/SUBTERRA_Field_Survey_Template_v1.json" download>↓ Blank JSON Template</a><a href="data/field-survey/SUBTERRA_PIPE56_SIMULATED_Field_Survey_v1.json" download>↓ Simulated Example JSON</a></div>';
    const ctrl='<div class="field-survey-controls"><button type="button" id="loadSimulatedFieldSurvey" class="btn btn-outline btn-sm">▶ Load Simulated Demo</button><button type="button" id="importFieldSurveyJson" class="btn btn-primary btn-sm">↑ Import Field Survey JSON</button><input type="file" id="fieldSurveyFileInput" accept=".json,application/json" hidden aria-label="Choose field survey JSON"/></div>';
    if(!runs.length)return '<div class="blind-record field-survey-panel"><strong>Field Survey · No observations imported</strong><div>Record every visible opening, pipe type/material if known, ladder, bench, channel, defects, coordinate accuracy and benchmark. Unknowns remain null.</div><div class="blind-caution">Original Phase 2A orange route stays frozen. Field observations are a separate overlay. Demo is synthetic and NOT field-verified.</div>'+ctrl+links+'</div>';
    if(err)return '<div class="blind-caution">Stored field scenario failed independent recomputation — corrected line withheld. Original Phase 2A and 2B are unchanged.</div>'+ctrl+links;
    const r=run.result,g=r.geometry,classification=r.classifications;
    const summary='<div class="phase2-kpis"><div><small>Resurveyed centers</small><b>'+fmt(g.resurveyedCenterToCenterM)+' m</b></div><div><small>Opening face span</small><b>'+fmt(g.openingFaceToFaceLengthM)+' m</b></div><div><small>Max cross-offset*</small><b>'+fmt(Math.max(...g.referenceLinePerpendicularOffsetsM))+' m</b></div><div><small>Corrected grade</small><b>'+(r.gravity.faceToFaceSlopePercent===null?'UNKNOWN':fmt(r.gravity.faceToFaceSlopePercent,4)+'%')+'</b></div></div>';
    const classified=classification.map(c=>'<div class="field-survey-mh"><strong>'+escapeHtml(c.manholeId)+' · '+escapeHtml(c.manhole.type)+' ('+escapeHtml(c.manhole.status)+')</strong><div>Steps / Ladder: '+escapeHtml(c.ladderOrSteps)+' · Steps '+fmt(c.stepCount,0)+' · Missing '+fmt(c.missingStepsCount,0)+'</div><table class="field-survey-openings"><thead><tr><th>Opening</th><th>Role</th><th>Material</th><th>Type</th></tr></thead><tbody>'+c.openings.map(o=>'<tr><td>'+escapeHtml(o.openingId)+'</td><td>'+escapeHtml(o.role)+'</td><td>'+escapeHtml(o.pipeMaterial)+'</td><td>'+escapeHtml(o.pipeType)+'</td></tr>').join('')+'</tbody></table></div>').join('');
    const status=r.geometry.lineDrawingAllowed
       ? '<strong class="field-survey-status">GEOMETRIC CHECK PASSED — Green face-to-face line (hypothesis)</strong>'
       : '<strong class="field-survey-blocked">GEOMETRIC / VERTICAL CONFLICT — No green route displayed</strong>';
    const runsHtml=runs.length>1?'<div class="field-survey-history">'+runs.map(x=>'<button type="button" class="btn btn-outline btn-sm" data-select-field-run="'+escapeHtml(x.id)+'">'+escapeHtml(x.id)+'</button>').join('')+'</div>':'';
    return '<div class="blind-record field-survey-panel">'+status+'<div class="field-survey-subtitle">'+escapeHtml(r.surveyId)+' · '+escapeHtml(r.evidenceStatus)+'</div>'
      +summary
      +'<div>Bearing: '+fmt(r.bearingConsistency.lineBearingDeg,2)+'° · Departure mismatch '+fmt(r.bearingConsistency.fromDifferenceDeg,2)+'° · Arrival mismatch '+fmt(r.bearingConsistency.toDifferenceDeg,2)+'°</div>'
      +'<div>Combined approximate opening-position uncertainty: '+fmt(g.combinedApprox1SigmaM)+' m (input error propagation only; old baseline uncertainty unknown).</div>'
      +'<div>Original MH-42 center shift '+fmt(g.sourceCenterOffsetFromOldM)+' m · MH-45 center shift '+fmt(g.destinationCenterOffsetFromOldM)+' m</div>'
      +'<div>Face-to-face length vs original center-to-center: '+fmt(g.faceToFaceLengthDeltaVsCenterBaselineM)+' m. This includes chamber radii, NOT an as-built route length discrepancy.</div>'
      +'<div class="field-survey-warning">*Cross-offset is relative to the old mathematical line, NOT independently measured underground pipe error. A geometric check does not prove underground continuity.</div>'
      +classified
      +'<div class="field-survey-warnings"><strong>Constraints and warnings</strong><ul>'+r.warnings.map(w=>'<li>'+escapeHtml(w)+'</li>').join('')+'</ul></div>'
      +'<button type="button" class="btn btn-outline btn-sm" id="exportFieldSurveyCorrection">↓ Export Current Field Scenario JSON</button>'
      +runsHtml+ctrl+links+'</div>';
  }
  function drawFieldSurveyCorrection(points){
    const p=active(),run=fieldSurveyActiveRun(p);
    if(!p?.blindCase?.locked ||!run?.result.geometry.lineDrawingAllowed ||!points.length)return;
    const coords=run.result.geometry.correctedLineCoordinatesWgs84,origin=points[0].mh;
    if(!Array.isArray(coords)||coords.length!==2)return;
    const a=toWorld(p,{lon:coords[0][0],lat:coords[0][1]},origin);
    const b=toWorld(p,{lon:coords[1][0],lat:coords[1][1]},origin);
    const p1=pos(a.x,a.y),p2=pos(b.x,b.y);
    ctx.save();ctx.strokeStyle='#16a371';ctx.lineWidth=3.5;ctx.setLineDash([9,4]);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
    ctx.restore();
  }

  function renderBlindInspector(project){
    const api=window.SubterraBlindTest;
    const v=api?.validate(project)||{pass:false,issues:['Missing test fixture']};
    const info=api?.getFixtureInfo();
    const fmt=(v)=>escapeHtml(v??'Unknown');
    const num=(field)=>field?.mode==='measured' ? fmt(field.value) : 'Unknown / Request Inference';
    const mhCards=project.manholes.map(m=>`<div class="blind-record">
      <strong>${fmt(m.name)}</strong>
      <div>Top WGS84: ${fmt(m.lat)}, ${fmt(m.lon)}</div>
      <div>Cover RL: <b>${fmt(m.cover)} m</b> · Main Outlet Invert: <b>${fmt(m.invert)} m</b></div>
      <div>Documented openings: ${(m.evidence?.openings||[]).map(o=>
        `<span class="blind-opening">${fmt(o.name)} · ${fmt(o.role)} · DN ${num(o.fields?.diameter)} mm · Invert ${num(o.fields?.invert)} m · Bearing ${fmt(o.fields?.bearing?.mode||'unknown')}</span>`
      ).join('')}</div>
    </div>`).join('');
    const completed=!!pipe56StoredResult(project);
    const hydraulicComplete=!!pipe56StoredHydraulics(project);
    const stageList=[
      ['01','Separate test case','Created / independent project'],
      ['02','Permitted inference evidence','Frozen manhole coordinates, recorded levels & openings only'],
      ['03','Historical GIS reference','Withheld / no observedPipes in test project'],
      ['04','Source, units, datum','Stantec 2004 / ft×0.3048 / vertical datum unconfirmed'],
      ['05','Opening-to-pipe identity','UNVERIFIED — candidate association only'],
      ['06','Freeze and evaluation rules','V1 committed prior to controlled replay'],
      ['07','Calculation / validation',hydraulicComplete?'Phase 2A / 2B calculations frozen · GIS validation not run':completed?'Phase 2A geometry & gravity calculated; no GIS validation yet':'Not run — next phase']
    ];
    $('#inspectorBody').innerHTML=`<div class="blind-inspector">
      <div class="panel-top"><span class="panel-title">${hydraulicComplete?'PIPE 56 · PHASE 2B':project.blindCase.phase2?'PIPE 56 · PHASE 2A':'PIPE 56 · PHASE 1'}</span>
        <span class="panel-counter">${v.pass?'Inputs locked':'Integrity warning'}</span></div>
      <p class="panel-desc">Retrospective controlled replay. The earlier reference was already seen; no prospective-blind claim.</p>
      <div class="blind-status">${v.pass?'Frozen evidence verified':'Fixture mismatch: '+v.issues.map(fmt).join('; ')}</div>
      <h3>Phase 1 checklist</h3>
      <div class="blind-stage-list">${stageList.map(([n,t,d])=>`<div><b>${n} · ${t}</b><small>${d}</small></div>`).join('')}</div>
      <h3>Phase 2A — Geometric & Gravity Results</h3>
      ${pipe56Phase2Html(project)}
      ${project.blindCase.phase2?'<h3>Phase 2B — Conditional Hydraulic Checks</h3>'+pipe56HydraulicsHtml(project):''}
      ${project.blindCase?.phase2b?`<h3>Phase 2C · Independent Route Evidence</h3>
      <div class="blind-record">
        <strong>Source Register · Discovery only</strong>
        <div>Wake County Street Centerlines: <b>0</b> official ROW features in Pipe 56 study area (does not mean no internal paved road).</div>
        <div>NC OneMap Orthoimagery 1999: <b>3/3</b> sampling points returned raster values.</div>
        <div>NC OneMap Orthoimagery 2005: <b>3/3</b> sampling points returned raster values.</div>
        <div>NC OneMap Orthoimagery 2004: <b>NoData</b> at all three sample points (this service only).</div>
        <div><b>Road alignment, obstacle polygons and route constraints: NOT YET DIGITIZED.</b></div>
        <div>Images are not visually interpreted yet. No extra historical pipe geometry is imported into the frozen project.</div>
        <a class="blind-source-link" href="data/independent-evidence/NCSF_PIPE56_phase2c_sources_v1.json" target="_blank" rel="noopener noreferrer">Open Independent Evidence JSON</a>
        <a class="blind-source-link" href="https://github.com/plainact-crypto/subterra-ui/blob/main/data/independent-evidence/README_PIPE56_Phase2C.md" target="_blank" rel="noopener noreferrer">Open Source Assessment Report</a>
      </div>`:''}
      ${project.blindCase?.phase2b?'<h3>Phase 3 · Field Verification & Deterministic Correction</h3>'+fieldSurveyHtml(project):''}
      <h3>Recorded manholes (read-only)</h3>
      ${mhCards}
      <div class="blind-caution"><b>Source:</b> ArcGIS Manhole Layer 1 OBJECTIDs 42 / 45; ${fmt(info?.source?.sourceDetail)}.
        Historical records, not new field measurements.<br>
        <b>Vertical Datum:</b> Unknown.<br><b>Link OUT-01 → IN-01:</b> Hypothesis, not confirmed.
        <br><b>Reference:</b> GIS Pipe 56 geometry is in a separate holdout file, not in this project.
      </div>
      <a class="blind-source-link" href="${fmt(info?.source?.featureServer)}" target="_blank" rel="noopener noreferrer">Open manhole evidence source (Layer 1)</a>
    </div>`;
  }

  function renderWorkspace() {
    const p=active(); if(!p){navigate('projects');return;}
    const mapLayer=['none','streets','satellite'].includes(p.mapLayer)?p.mapLayer:'none';
    const blindLocked=!!p.blindCase?.locked;
    const phase2Stored=!!p.blindCase?.phase2;
    const phase2bStored=!!p.blindCase?.phase2b;
    $('#mainContent').innerHTML=`<div class="workspace"><div class="ws-header"><div><h1>Sanitary Sewer <span style="font-size:12px;color:#80a3a3;font-weight:600">/ Data Workspace</span></h1><div class="ws-sub">${escapeHtml(p.name)} · ${blindLocked?(phase2Stored?(phase2bStored?'PHASE 2B FROZEN · Hydraulic Scenarios · Reference withheld':'PHASE 2A FROZEN · Geometry & Gravity · Reference withheld'):'PHASE 1 FROZEN · Manhole evidence only · Reference withheld'):'Surveyed evidence & manhole classification · No design calculations'}</div></div><div class="ws-actions">${blindLocked?
  (phase2bStored?'<button class="btn btn-outline btn-sm" id="exportPhase2bResult">↓ Phase 2B JSON</button>':phase2Stored?'<button class="btn btn-primary btn-sm" id="runPipe56Hydraulics">▶ Run Phase 2B</button>':'')+(phase2Stored?'<button class="btn btn-outline btn-sm" id="exportPhase2Result">↓ Phase 2A JSON</button>':'<button class="btn btn-primary btn-sm" id="runPipe56Phase2">▶ Run Phase 2A</button>')+'<button class="btn btn-outline btn-sm" id="exportBlindEvidence">↓ Evidence JSON</button><button class="btn btn-outline btn-sm" id="exportBlindProtocol">↓ Protocol</button><button class="btn btn-outline btn-sm" id="exportJson">↓ Project JSON</button><button class="btn btn-outline btn-sm" data-all-projects>← Projects</button>'
  : '<button class="btn btn-outline btn-sm" data-create-blind-test>◈ Pipe 56 Blind Test</button><button class="btn btn-outline btn-sm hide-sm" id="exportCsv">↓ Export CSV</button><button class="btn btn-outline btn-sm" id="importJson">↑ Import JSON</button><input id="importJsonFile" type="file" accept=".json,application/json" hidden aria-label="Select Subterra observation JSON" /><button class="btn btn-outline btn-sm" id="exportJson">↓ JSON</button><button class="btn btn-outline btn-sm hide-sm" id="exportKml">↗ Google Earth KML</button><button class="btn btn-primary btn-sm" id="topAddMh">＋ Manhole</button>'}</div></div><div class="ws-main"><section class="canvas-pane"><canvas class="canvas-surface" id="mapCanvas" aria-label="Infinite canvas with surveyed manholes. Drag to pan, scroll to zoom."></canvas><div class="canvas-toolbar"><span class="canvas-pill green">● Sewer / Manholes</span><span class="canvas-pill">${p.coordMode==='geographic'?'WGS84 · Local metric view':'Local XY · Metres'}</span><label class="canvas-pill map-layer-control">Background <select id="mapLayerPicker" aria-label="Background map layer" ${p.coordMode==='geographic'?'':'disabled title="Basemaps require WGS84 coordinates"'}><option value="none" ${mapLayer==='none'?'selected':''}>None</option><option value="streets" ${mapLayer==='streets'?'selected':''}>Streets · OSM</option><option value="satellite" ${mapLayer==='satellite'?'selected':''}>Satellite · USGS (USA)</option></select></label>${blindLocked?'<span class="canvas-pill blind-lock-chip">◈ '+(phase2bStored?'Phase 2B hydraulic scenario':phase2Stored?'Phase 2A calculated':'Evidence frozen')+' · GIS withheld</span>'+(phase2Stored?calculatedCandidateButton(p):''):historicalPipesButton(p)+calculatedCandidateButton(p)}</div><div class="basemap-attribution" id="basemapAttribution" hidden></div><div class="canvas-controls"><button id="zoomIn" title="Zoom in">＋</button><button id="zoomOut" title="Zoom out">−</button><button class="fit" id="fitCanvas" title="Fit all manholes">FIT</button></div><div class="candidate-summary" id="candidateSummary" hidden></div><div id="canvasEmpty" class="canvas-overlay-empty"><div class="ghost-icon">⌖</div><strong>Your survey canvas is ready</strong><p>Add a manhole and enter its surveyed top coordinates. It will appear here automatically.</p></div><div class="canvas-hint">✥ Drag to pan <span style="opacity:.35">·</span> Scroll to zoom <span style="opacity:.35">·</span> Click a manhole to select</div><div class="canvas-legend"><span class="dot-legend"></span> Manholes · <span class="legend-route-orange">━━</span> Calculated Candidates · <span style="color:#16a371;font-weight:900">┄┄</span> Field-Corrected · <span class="legend-route-blue">┄┄</span> Historical GIS</div></section><aside class="inspector"><div class="inspector-tabs"><span class="inspector-caption">MANHOLE RECORDS &amp; CLASSIFICATION</span></div><div class="inspector-scroll" id="inspectorBody"></div></aside></div></div>`;
    renderInspector(); setupCanvas(); requestAnimationFrame(()=>{if(state.canvas.dirtyFit)fitCanvas();else drawCanvas();});
  }
  function renderInspector(){renderManholes();}
  function getSelectedMh(){const p=active();return p?.manholes?.find(m=>m.id===state.selectedMh)||null;}
  function validMh(p,m){
    if(p.coordMode==='geographic')return m.lat!==''&&m.lon!==''&&Number.isFinite(+m.lat)&&Number.isFinite(+m.lon)&&Math.abs(+m.lat)<=90&&Math.abs(+m.lon)<=180;
    return m.x!==''&&m.y!==''&&Number.isFinite(+m.x)&&Number.isFinite(+m.y);
  }
  function renderManholes(){
    const p=active();if(!p)return;
    if(p.blindCase?.locked){renderBlindInspector(p);return;}
    const mh=getSelectedMh();
    const located=p.manholes.filter(m=>validMh(p,m)).length;
    for(const m of p.manholes)window.SubterraWizard.ensure(m,p);
    $('#inspectorBody').innerHTML=`<div class="panel-top"><span class="panel-title">Manhole schedule</span><span class="panel-counter">${located} / ${p.manholes.length} located</span></div>
      <p class="panel-desc">Each manhole is classified step-by-step. Surveyed top coordinates plot its position; unknown values remain unknown.</p>
      <button class="btn btn-outline btn-sm" id="addMhRight">＋ Add manhole</button>
      ${p.manholes.length?`<div class="mh-list">${p.manholes.map(m=>`<button class="mh-list-item ${mh?.id===m.id?'selected':''}" data-select-mh="${escapeHtml(m.id)}"><span class="mh-item-icon">◎</span><span class="mh-row-main"><strong>${escapeHtml(m.name)}</strong><small>${validMh(p,m)?escapeHtml(p.coordMode==='geographic'?`${m.lat}, ${m.lon}`:`X ${m.x} · Y ${m.y}`):'Top coordinates not entered'} · ${Object.values(m.classification||{}).filter(v=>v && v!=='__infer__').length}/6 classifications</small></span><span class="mh-arrow">›</span></button>`).join('')}</div>`:'<div class="no-mh" style="margin-top:16px">No manholes. Add your first existing manhole to begin recording evidence.</div>'}
      ${mh?`${window.SubterraWizard.render(mh,p)}<div class="property-footer"><button class="danger-link" id="deleteMh">Delete manhole</button></div>`:'<div class="hint-inline">Select a manhole to open its step-by-step classification.</div>'}`;
  }
  function addManhole(){
    const p=active();if(!p)return;
    if(p.blindCase?.locked){announce('Frozen evidence: editing disabled');return;}
    const index=Math.max(0,...p.manholes.map(m=>m.autoIndex||0))+1;
    const m={id:uid(),name:'',customName:'',autoIndex:index,lat:'',lon:'',x:'',y:'',cover:'',invert:'',invertPosition:{lat:'',lon:'',x:'',y:''},classification:{},notes:''};
    p.manholes.push(m);window.SubterraWizard.ensure(m,p);state.selectedMh=m.id;window.SubterraWizard.resetStep();save();renderInspector();drawCanvas();
    document.querySelector('[data-wiz-custom-name]')?.focus();announce(`${m.name} added`);
  }
  function selectMh(id){state.selectedMh=id;window.SubterraWizard.resetStep();renderInspector();drawCanvas();}
  function refreshLocation(){
    const p=active(),m=getSelectedMh();if(!p||!m)return;
    const row=Array.from(document.querySelectorAll('[data-select-mh]')).find(b=>b.dataset.selectMh===m.id);
    if(row){const summary=row.querySelector('small');if(summary)summary.textContent=(validMh(p,m)?(p.coordMode==='geographic'?`${m.lat}, ${m.lon}`:`X ${m.x} · Y ${m.y}`):'Top coordinates not entered')+' · '+Object.values(m.classification||{}).filter(v=>v&&v!=='__infer__').length+'/6 classifications';}
    const located=p.manholes.filter(mm=>validMh(p,mm)).length;
    const badge=document.querySelector('.panel-counter');if(badge)badge.textContent=`${located} / ${p.manholes.length} located`;
    if(validMh(p,m))fitCanvas();else drawCanvas();
  }
  function openProjectDialog(){$('#projectForm').reset();$('#projectDialog').showModal();setTimeout(()=>$('#projectName').focus(),30);}
  function createProject(form){
    const field=n=>form.elements.namedItem(n).value;
    const p={id:uid(),name:field('name').trim(),location:field('location').trim(),coordMode:field('coordMode'),createdAt:new Date().toISOString(),types:[],manholes:[]};
    if(!p.name)return;state.projects.push(p);state.activeId=p.id;state.selectedMh=null;save();$('#projectDialog').close();navigate('systems');announce('Project created');
  }
  function exportFile(name,content,mime){const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),300);}
  const safeFilename=s=>(s||'project').replace(/[^a-z0-9\-_]/gi,'_').slice(0,40);
  function escapeCsv(s){return '"'+String(s??'').replaceAll('"','""')+'"';}
  function exportCsv(){
    const p=active();const categories=window.SubterraWizard.TAXONOMY;
    const h=['Name','Latitude','Longitude','Easting_X','Northing_Y','Top_RL','Invert_Latitude','Invert_Longitude','Invert_X','Invert_Y','Invert_RL',...categories.map(c=>c.title),'Notes'];
    const rows=p.manholes.map(m=>{window.SubterraWizard.ensure(m,p);return [m.name,m.lat,m.lon,m.x,m.y,m.cover,m.invertPosition.lat,m.invertPosition.lon,m.invertPosition.x,m.invertPosition.y,m.invert,...categories.map(c=>m.classification[c.key]==='__infer__'?'REQUEST INFERENCE':m.classification[c.key]),m.notes];});
    exportFile(`${safeFilename(p.name)}_manholes.csv`,[h,...rows].map(row=>row.map(escapeCsv).join(',')).join('\n'),'text/csv;charset=utf-8');announce('Manhole schedule exported');
  }
  function exportJson(){const p=active();exportFile(`${safeFilename(p.name)}_project.json`,JSON.stringify(p,null,2),'application/json');announce('Project JSON exported');}
  function xmlEscape(v){return String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&quot;',"'":'&apos;'}[c]));}
  function exportKml(){
    const p=active();if(p.coordMode!=='geographic'){announce('KML requires WGS84 coordinates. Use a WGS84 project for Google Earth.');return;}
    const placemarks=p.manholes.filter(m=>validMh(p,m)).map(m=>{
      window.SubterraWizard.ensure(m,p);
      const cls=window.SubterraWizard.TAXONOMY.map(c=>`${c.short}: ${m.classification[c.key]||'Unknown'}`).join('; ');
      return `<Placemark><name>${xmlEscape(m.name)}</name><description>${xmlEscape(cls+'; Top RL: '+(m.cover||'Unknown')+'; Invert RL: '+(m.invert||'Unknown'))}</description><Point><coordinates>${m.lon},${m.lat},0</coordinates></Point></Placemark>`;
    }).join('');
    if(!placemarks){announce('Add at least one manhole with valid top coordinates first');return;}
    exportFile(`${safeFilename(p.name)}_manholes.kml`,`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEscape(p.name)}</name>${placemarks}</Document></kml>`,'application/vnd.google-earth.kml+xml');announce('KML ready for Google Earth');
  }


  // Only documented, explicitly imported GIS traces are drawn. No connection is inferred by proximity.
  function drawObservedPipes(points) {
    const p=active();if(!p||p.blindCase?.locked||p.coordMode!=='geographic'||p.showHistoricalPipes===false||!points.length||!Array.isArray(p.observedPipes))return;
    const origin=points[0].mh;
    ctx.save();ctx.strokeStyle='#377bd2';ctx.lineWidth=2.5;ctx.setLineDash([7,5]);
    for(const line of p.observedPipes){
      if(!Array.isArray(line.coordinates)||line.coordinates.length<2)continue;
      ctx.beginPath();
      for(let i=0;i<line.coordinates.length;i++){
        const point=line.coordinates[i];
        const w=toWorld(p,{lon:point[0],lat:point[1]},origin),at=pos(w.x,w.y);
        if(i===0)ctx.moveTo(at.x,at.y);else ctx.lineTo(at.x,at.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  async function importJsonFile(file){
    const p=active();if(!p)return;
    if(p.blindCase?.locked){announce('Frozen test: Import is disabled');return;}
    if(file.size>5*1024*1024){announce('JSON exceeds 5 MB. Split the observation file.');return;}
    try {
      const payload=window.SubterraJsonImport.parse(await file.text(),p.coordMode);
      const existingNames=new Set(p.manholes.map(m=>String(m.name||'').trim().toLowerCase()).filter(Boolean));
      const existing=[...p.manholes],added=[];
      let skipped=0,nextIndex=Math.max(0,...p.manholes.map(m=>m.autoIndex||0))+1;
      const samePosition=(a,b)=>{
        if(!validMh(p,a)||!validMh(p,b))return false;
        if(p.coordMode==='geographic')return Math.abs(+a.lat - +b.lat)<1e-7 && Math.abs(+a.lon - +b.lon)<1e-7;
        return Math.hypot(+a.x - +b.x,+a.y - +b.y)<0.01;
      };
      for(const record of payload.manholes){
        const name=String(record.customName||record.name||'').trim().toLowerCase();
        if((name&&existingNames.has(name))||existing.some(m=>samePosition(m,record))){
          skipped++;continue;
        }
        const m={...record,id:uid(),autoIndex:nextIndex++};
        window.SubterraWizard.ensure(m,p);
        added.push(m);existing.push(m);
        existingNames.add(m.name.trim().toLowerCase());
      }
      const pipes=Array.isArray(p.observedPipes)?p.observedPipes:[];
      const ids=new Set(pipes.map(x=>String(x.id).toLowerCase()));
      const addedPipes=payload.observedPipes.filter(x=>{
        const k=x.id.toLowerCase();if(ids.has(k))return false;ids.add(k);return true;
      });
      if(!added.length&&!addedPipes.length){announce('No new observations: existing records were preserved ('+skipped+' duplicates).');return;}
      p.manholes.push(...added);
      p.observedPipes=[...pipes,...addedPipes];
      if(added.length){state.selectedMh=added.at(-1).id;window.SubterraWizard.resetStep();}
      state.canvas.dirtyFit=true;
      save();renderWorkspace();
      announce('Imported '+added.length+' manholes and '+addedPipes.length+' historical GIS pipes'+(skipped?' · '+skipped+' duplicates skipped':''));
    }catch(err){announce('Import rejected: '+(err?.message||'Invalid file'));}
  }

  // Canvas — Cartesian metre coordinates with WGS84 values converted to a local equirectangular view.
  // This is for plotting only; it is NOT survey-grade projection/georeferencing.
  let canvas=null,ctx=null,ro=null;
  function toWorld(p,m,origin){if(p.coordMode==='geographic'){const cos=Math.cos((+origin.lat)*Math.PI/180);return{x:((+m.lon)-(+origin.lon))*111320*cos,y:((+m.lat)-(+origin.lat))*111320};}return{x:(+m.x)-(+origin.x),y:(+m.y)-(+origin.y)};}
  function locatedPoints(){const p=active();if(!p)return[];const good=p.manholes.filter(m=>validMh(p,m));if(!good.length)return[];return good.map(m=>({mh:m,...toWorld(p,m,good[0])}));}
  function setupCanvas(){canvas=$('#mapCanvas');if(ro){ro.disconnect();ro=null;}ctx=canvas.getContext('2d');ro=new ResizeObserver(()=>{if(!canvas?.isConnected)return;resizeCanvas();if(state.canvas.dirtyFit)fitCanvas();else drawCanvas();});ro.observe(canvas);canvas.addEventListener('wheel',canvasWheel,{passive:false});canvas.addEventListener('pointerdown',canvasDown);canvas.addEventListener('pointermove',canvasMove);canvas.addEventListener('pointerup',canvasUp);canvas.addEventListener('pointercancel',canvasUp);canvas.addEventListener('dblclick',()=>fitCanvas());resizeCanvas();}
  function resizeCanvas(){if(!canvas)return;const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);}
  function dims(){const r=canvas?.getBoundingClientRect();return{w:r?.width||800,h:r?.height||600};}
  function pos(wx,wy){const {w,h}=dims(),v=state.canvas;return{x:w/2+v.panX+wx*v.scale,y:h/2+v.panY-wy*v.scale};}
  function invPos(sx,sy){const{w,h}=dims(),v=state.canvas;return{x:(sx-w/2-v.panX)/v.scale,y:-(sy-h/2-v.panY)/v.scale};}
  function fitCanvas(){const pts=locatedPoints(),v=state.canvas,{w,h}=dims();if(!pts.length){v.scale=2;v.panX=0;v.panY=0;}else{const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));const xrange=Math.max(maxX-minX,32),yrange=Math.max(maxY-minY,32);v.scale=Math.min(12,Math.max(.003,Math.min((w-130)/xrange,(h-130)/yrange)));v.panX=-(minX+maxX)/2*v.scale;v.panY=(minY+maxY)/2*v.scale;}v.dirtyFit=false;drawCanvas();}
  function gridStep(raw){const p=Math.pow(10,Math.floor(Math.log10(raw)));const n=raw/p;return(n<1.5?1:n<3.5?2:n<7.5?5:10)*p;}
  function drawCanvas(){if(!canvas?.isConnected||!ctx)return;const{w,h}=dims();ctx.clearRect(0,0,w,h);ctx.fillStyle='#f2f6f8';ctx.fillRect(0,0,w,h);const v=state.canvas;
    const project=active();
    const basemapLayer=project?.mapLayer||'none';
    const basePoints=locatedPoints();
    const attr=$('#basemapAttribution');
    if(attr) {
      attr.hidden=basemapLayer==='none'||!basePoints.length;
      attr.innerHTML=basemapLayer==='streets'
        ? '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · Map context only'
        : basemapLayer==='satellite' ? 'Imagery: USDA / USGS The National Map · USA only · Map context only' : '';
    }
    if(basePoints.length && basemapLayer!=='none') {
      window.SubterraBasemap?.draw({ctx,layer:basemapLayer,project,view:v,width:w,height:h,origin:basePoints[0].mh,redraw:drawCanvas});
    }
    const step=gridStep(50/v.scale),spacing=step*v.scale;const pointA=invPos(0,h),pointB=invPos(w,0);if(Number.isFinite(spacing)&&spacing>2){ctx.lineWidth=1;ctx.strokeStyle='#dce7ed';ctx.beginPath();const startX=Math.floor(pointA.x/step)*step;for(let x=startX;x<pointB.x+step;x+=step){const sx=pos(x,0).x;ctx.moveTo(sx,0);ctx.lineTo(sx,h);}const startY=Math.floor(pointA.y/step)*step;for(let y=startY;y<pointB.y+step;y+=step){const sy=pos(0,y).y;ctx.moveTo(0,sy);ctx.lineTo(w,sy);}ctx.stroke();ctx.font='10px ui-sans-serif, sans-serif';ctx.fillStyle='#a4b6c2';ctx.textBaseline='bottom';for(let x=startX;x<pointB.x+step;x+=step){const sx=pos(x,0).x;if(sx>10&&sx<w-30)ctx.fillText(Math.round(x*10)/10+' m',sx+4,h-10);}}const origin=pos(0,0);ctx.strokeStyle='#b7d0d4';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(origin.x,0);ctx.lineTo(origin.x,h);ctx.moveTo(0,origin.y);ctx.lineTo(w,origin.y);ctx.stroke();
    const points=locatedPoints();$('#canvasEmpty')?.style.setProperty('display',points.length?'none':'block');const candidate=computeCandidate(project);drawCalculatedCandidate(points,candidate);drawFieldSurveyCorrection(points);drawObservedPipes(points);updateCandidateSummary(candidate,project);for(const pt of points){const at=pos(pt.x,pt.y);if(at.x < -120||at.x>w+120||at.y < -80||at.y>h+80)continue;const selected=pt.mh.id===state.selectedMh;ctx.beginPath();ctx.arc(at.x,at.y,selected?15:12,0,Math.PI*2);ctx.fillStyle=selected?'rgba(12,129,120,.16)':'rgba(12,129,120,.10)';ctx.fill();ctx.beginPath();ctx.arc(at.x,at.y,selected?7.5:6,0,Math.PI*2);ctx.fillStyle=selected?'#075c58':'#0c8178';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();ctx.font=(selected?'700 ':'600 ')+'12px ui-sans-serif, sans-serif';const title=String(pt.mh.name||'Manhole');const tw=ctx.measureText(title).width;const lx=at.x+13,ly=at.y-16;ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(lx-6,ly-12,tw+12,22,5);ctx.fill();ctx.fillStyle='#213e50';ctx.fillText(title,lx,ly+3);}
    // Scale bar: visually supports metric view only, not a precision survey scale.
    const real=gridStep(100/v.scale);const sw=real*v.scale;if(sw>24&&sw<300){ctx.strokeStyle='#4e6e7a';ctx.fillStyle='#4e6e7a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,h-67);ctx.lineTo(22+sw,h-67);ctx.moveTo(22,h-72);ctx.lineTo(22,h-62);ctx.moveTo(22+sw,h-72);ctx.lineTo(22+sw,h-62);ctx.stroke();ctx.font='11px sans-serif';ctx.fillText(`${real} m (approx.)`,22,h-77);}}
  function canvasWheel(e){e.preventDefault();const r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,before=invPos(sx,sy);state.canvas.scale=Math.max(.0002,Math.min(80,state.canvas.scale*Math.exp(-e.deltaY*.0012)));const after=pos(before.x,before.y);state.canvas.panX+=sx-after.x;state.canvas.panY+=sy-after.y;drawCanvas();}
  function nearestPoint(sx,sy){for(const pt of locatedPoints()){const p=pos(pt.x,pt.y);if(Math.hypot(sx-p.x,sy-p.y)<15)return pt;}return null;}
  function canvasDown(e){if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;state.pointer={x,y,lastX:x,lastY:y,moved:false,id:e.pointerId};canvas.classList.add('dragging');}
  function canvasMove(e){const pt=state.pointer;if(!pt||pt.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;const dx=x-pt.lastX,dy=y-pt.lastY;if(Math.hypot(x-pt.x,y-pt.y)>4)pt.moved=true;if(pt.moved){state.canvas.panX+=dx;state.canvas.panY+=dy;drawCanvas();}pt.lastX=x;pt.lastY=y;}
  function canvasUp(e){const pt=state.pointer;if(!pt||pt.id!==e.pointerId)return;state.pointer=null;canvas.classList.remove('dragging');if(!pt.moved){const found=nearestPoint(pt.x,pt.y);if(found)selectMh(found.mh.id);}}

  // Event delegation keeps the DOM implementation small and GitHub Pages compatible.
  document.addEventListener('click',e=>{
    const target=e.target.closest('button,[data-select-project]');if(!target)return;
    if(target.matches('[data-new-project]'))return openProjectDialog();
    if(target.matches('[data-create-blind-test]'))return startBlindTest();
    if(target.matches('#runPipe56Phase2'))return runPipe56Phase2();
    if(target.matches('#runPipe56Hydraulics'))return runPipe56Hydraulics();
    if(target.matches('#loadSimulatedFieldSurvey'))return void loadSimulatedFieldSurvey();
    if(target.matches('#importFieldSurveyJson'))return $('#fieldSurveyFileInput')?.click();
    if(target.matches('[data-select-field-run]')){const p=active();if(!p?.fieldSurveyRuns?.some(r=>r.id===target.dataset.selectFieldRun))return;p.activeFieldSurveyRunId=target.dataset.selectFieldRun;save();renderWorkspace();return;}
    if(target.matches('[data-delete-project]')){e.preventDefault();e.stopPropagation();return deleteProject(target.dataset.deleteProject);}
    if(target.matches('[data-select-project],[data-open-project]'))return selectProject(target.dataset.selectProject||target.dataset.openProject);
    if(target.matches('[data-all-projects]'))return navigate('projects');
    if(target.matches('[data-open-system]')){if(target.dataset.openSystem==='sewer'){state.canvas.dirtyFit=true;navigate('sewer');}return;}
    if(target.matches('#topAddMh,#addMhRight'))return addManhole();
    if(target.matches('[data-select-mh]'))return selectMh(target.dataset.selectMh);
    if(target.matches('#deleteMh')){const p=active();if(p?.blindCase?.locked){announce('Frozen evidence: no deletions');return;}const m=getSelectedMh();if(m&&confirm(`Delete ${m.name||'this manhole'}?`)){p.manholes=p.manholes.filter(x=>x.id!==m.id);state.selectedMh=p.manholes.at(-1)?.id||null;window.SubterraWizard.resetStep();save();renderInspector();drawCanvas();}return;}
    if(target.matches('#fitCanvas'))return fitCanvas();
    if(target.matches('#zoomIn,#zoomOut')){state.canvas.scale=Math.max(.0002,Math.min(80,state.canvas.scale*(target.id==='zoomIn'?1.4:1/1.4)));drawCanvas();return;}
    if(target.matches('#toggleCalculatedCandidate')){
      const p=active();if(!p||(p.blindCase?.locked&&!pipe56StoredResult(p)))return;
      const visible=p.showCalculatedCandidate===false;
      p.showCalculatedCandidate=visible;
      target.outerHTML=calculatedCandidateButton(p);
      save();drawCanvas();
      announce(visible?'Calculated candidate visible':'Calculated candidate hidden');
      return;
    }
    if(target.matches('#toggleHistoricalPipes')){
      const p=active();if(!p||p.blindCase?.locked)return;
      const nowVisible=p.showHistoricalPipes===false;
      p.showHistoricalPipes=nowVisible;
      target.outerHTML=historicalPipesButton(p);
      save();
      drawCanvas();
      announce(nowVisible?'Historical GIS pipes visible':'Historical GIS pipes hidden (reference data preserved)');
      return;
    }
    if(target.matches('#importJson'))return $('#importJsonFile')?.click();
    if(target.matches('#exportCsv'))return exportCsv();
    if(target.matches('#exportJson'))return exportJson();
    if(target.matches('#exportFieldSurveyCorrection')){
      const p=active(),run=fieldSurveyActiveRun(p);
      if(!run){announce('No verified local field survey result');return;}
      exportFile('SUBTERRA_'+safeFilename(run.id)+'_Field_Scenario.json',JSON.stringify(run,null,2),'application/json');
      announce('Field survey and deterministic result exported');return;
    }
    if(target.matches('#exportPhase2bResult')){
      const p=active();if(!p?.blindCase?.locked)return;
      const r=pipe56StoredHydraulics(p);
      if(!r){announce('Hydraulic calculation integrity mismatch — export rejected');return;}
      exportFile('NCSF_PIPE56_Phase2B_Manning_Scenarios_v1.json',JSON.stringify(r,null,2),'application/json');
      announce('Phase 2B theoretical Manning scenarios exported');return;
    }
    if(target.matches('#exportPhase2Result')){
      const p=active();if(!p?.blindCase?.locked)return;
      const result=pipe56StoredResult(p);
      if(!result){announce('Calculation integrity mismatch — export rejected');return;}
      exportFile('NCSF_PIPE56_Phase2A_Calculation_v1.json',JSON.stringify(result,null,2),'application/json');
      announce('Frozen Phase 2A calculation exported');return;
    }
    if(target.matches('#exportBlindProtocol')){
      const p=active();if(!p?.blindCase?.locked)return;
      exportFile('NCSF_PIPE56_Phase1_Protocol_v1.json',JSON.stringify(window.SubterraBlindTest.getProtocol(),null,2),'application/json');
      announce('Frozen Phase 1 protocol exported');return;
    }
    if(target.matches('#exportBlindEvidence')){
      const p=active();if(!p?.blindCase?.locked)return;
      const result=window.SubterraBlindTest.validate(p);
      if(!result.pass){announce('Frozen evidence mismatch: export rejected');return;}
      exportFile('NCSF_PIPE56_Inference_Evidence_v1.json',JSON.stringify(window.SubterraInferenceEvidence.build(p),null,2),'application/json');
      announce('Evidence-only JSON exported — no historical pipe geometry');return;
    }
    if(target.matches('#exportKml'))return exportKml();
  });
  document.addEventListener('change',e=>{if(e.target.id!=='fieldSurveyFileInput')return;const file=e.target.files?.[0];e.target.value='';if(file)void importFieldSurveyJsonFile(file);});
  document.addEventListener('change',e=>{if(e.target.id!=='importJsonFile')return;const file=e.target.files?.[0];e.target.value='';if(file)void importJsonFile(file);});
  document.addEventListener('change',e=>{
    if(e.target.id!=='mapLayerPicker')return;
    const p=active();if(!p||p.coordMode!=='geographic')return;
    const layer=e.target.value;
    if(!['none','streets','satellite'].includes(layer))return;
    if(layer==='satellite'){
      const first=locatedPoints()[0]?.mh;
      if(!first||!window.SubterraBasemap?.layerAvailable('satellite',{lat:+first.lat,lon:+first.lon})){
        e.target.value=p.mapLayer||'none';
        announce('USGS aerial imagery is available for the USA; use Streets outside the US.');
        return;
      }
    }
    p.mapLayer=layer;save();drawCanvas();
    announce(layer==='none'?'Background hidden':layer==='streets'?'OpenStreetMap streets enabled':'USGS aerial imagery enabled');
  });
  $('#projectForm').addEventListener('submit',e=>{e.preventDefault();createProject(e.currentTarget);});
  $('#cancelProject').addEventListener('click',()=>$('#projectDialog').close());
  $('#navProjects').addEventListener('click',()=>navigate('projects'));
  $('#navSystems').addEventListener('click',()=>{if(active())navigate('systems');else announce('Create a project first');});
  $('#brandHome').addEventListener('click',()=>navigate('projects'));
  $('#brandHome').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')navigate('projects');});
  $('#helpButton').addEventListener('click',()=>alert('Subterra v0.15 — Record measured top and invert coordinates, classify each manhole through the supplied engineering taxonomy, and document existing pipe openings and components. Normal projects display preliminary geometric candidate hypotheses; those are not verified buried pipes. Pipe 56 Phase 1 is a separate read-only, manhole-only fixture with calculations disabled and the historical reference withheld. Data is saved locally; export backups regularly.'));
  window.SubterraDetails.setup({getSelectedMh,active,save,renderInspector,announce});
  window.SubterraWizard.setup({getSelectedMh,active,save,renderInspector,announce,drawCanvas,refreshLocation});
  render();
  handleDeleteProjectLink();
})();