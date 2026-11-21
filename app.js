/* Subterra UI v0.9 — multi-manhole calculated candidate network overlay. */
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
    $('#mainContent').innerHTML=`<section class="page"><div class="eyebrow">INFRASTRUCTURE RECONSTRUCTION</div><div class="page-header"><div><h1>Your projects</h1><p class="page-subtitle">Create a project, select an infrastructure system, then start recording actual site evidence.</p></div><button class="btn btn-primary" data-new-project>＋ New project</button></div>${state.projects.length?`<div class="project-cards">${state.projects.slice().reverse().map(p=>`<article class="project-card" data-select-project="${escapeHtml(p.id)}" role="button" tabindex="0"><div class="project-card-top"><span class="project-icon">▧</span><div class="project-card-tools"><span class="light-label">PROJECT</span><button type="button" class="project-delete-btn project-card-delete" data-delete-project="${escapeHtml(p.id)}" title="Delete ${escapeHtml(p.name)}" aria-label="Delete project ${escapeHtml(p.name)}">${TRASH_ICON}</button></div></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.location||'Location not specified')}</p><div class="project-card-bottom"><span>${p.manholes?.length||0} manholes · ${escapeHtml(p.coordMode==='projected'?'XY metres':'WGS84')}</span><span>Open project ↗</span></div></article>`).join('')}</div>`:`<div class="empty-state"><div class="empty-art">▧</div><h2>No projects yet</h2><p>Create a new project to organize your infrastructure systems, survey coordinates and engineering evidence.</p><button class="btn btn-primary" data-new-project>＋ Create first project</button></div>`}</section>`;
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
    const count=result?.candidates?.length||0;
    const eligible=result?.eligiblePairs||0;
    const visible=p?.showCalculatedCandidate!==false;
    display.hidden=false;
    if(!visible) {
      display.textContent='Calculated Candidatess hidden · '+count+' available';
    } else if(count) {
      display.textContent=count+' calculated candidate'+(count===1?'':'s')+
        ' · '+eligible+' plausible opening pairs screened · Unverified straight-line hypotheses';
    } else {
      display.textContent='0 calculated candidates · '+(result?.reason||'Insufficient documented evidence');
    }
  }
  function renderWorkspace() {
    const p=active(); if(!p){navigate('projects');return;}
    const mapLayer=['none','streets','satellite'].includes(p.mapLayer)?p.mapLayer:'none';
    $('#mainContent').innerHTML=`<div class="workspace"><div class="ws-header"><div><h1>Sanitary Sewer <span style="font-size:12px;color:#80a3a3;font-weight:600">/ Data Workspace</span></h1><div class="ws-sub">${escapeHtml(p.name)} · Surveyed evidence & manhole classification · No design calculations</div></div><div class="ws-actions"><button class="btn btn-outline btn-sm hide-sm" id="exportCsv">↓ Export CSV</button><button class="btn btn-outline btn-sm" id="importJson">↑ Import JSON</button><input id="importJsonFile" type="file" accept=".json,application/json" hidden aria-label="Select Subterra observation JSON" /><button class="btn btn-outline btn-sm" id="exportJson">↓ JSON</button><button class="btn btn-outline btn-sm hide-sm" id="exportKml">↗ Google Earth KML</button><button class="btn btn-primary btn-sm" id="topAddMh">＋ Manhole</button></div></div><div class="ws-main"><section class="canvas-pane"><canvas class="canvas-surface" id="mapCanvas" aria-label="Infinite canvas with surveyed manholes. Drag to pan, scroll to zoom."></canvas><div class="canvas-toolbar"><span class="canvas-pill green">● Sewer / Manholes</span><span class="canvas-pill">${p.coordMode==='geographic'?'WGS84 · Local metric view':'Local XY · Metres'}</span><label class="canvas-pill map-layer-control">Background <select id="mapLayerPicker" aria-label="Background map layer" ${p.coordMode==='geographic'?'':'disabled title="Basemaps require WGS84 coordinates"'}><option value="none" ${mapLayer==='none'?'selected':''}>None</option><option value="streets" ${mapLayer==='streets'?'selected':''}>Streets · OSM</option><option value="satellite" ${mapLayer==='satellite'?'selected':''}>Satellite · USGS (USA)</option></select></label>${historicalPipesButton(p)}${calculatedCandidateButton(p)}</div><div class="basemap-attribution" id="basemapAttribution" hidden></div><div class="canvas-controls"><button id="zoomIn" title="Zoom in">＋</button><button id="zoomOut" title="Zoom out">−</button><button class="fit" id="fitCanvas" title="Fit all manholes">FIT</button></div><div class="candidate-summary" id="candidateSummary" hidden></div><div id="canvasEmpty" class="canvas-overlay-empty"><div class="ghost-icon">⌖</div><strong>Your survey canvas is ready</strong><p>Add a manhole and enter its surveyed top coordinates. It will appear here automatically.</p></div><div class="canvas-hint">✥ Drag to pan <span style="opacity:.35">·</span> Scroll to zoom <span style="opacity:.35">·</span> Click a manhole to select</div><div class="canvas-legend"><span class="dot-legend"></span> Manholes · <span class="legend-route-orange">━━</span> Calculated Candidates · <span class="legend-route-blue">┄┄</span> Historical GIS</div></section><aside class="inspector"><div class="inspector-tabs"><span class="inspector-caption">MANHOLE RECORDS &amp; CLASSIFICATION</span></div><div class="inspector-scroll" id="inspectorBody"></div></aside></div></div>`;
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
    const p=active();if(!p||p.coordMode!=='geographic'||p.showHistoricalPipes===false||!points.length||!Array.isArray(p.observedPipes))return;
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
    const points=locatedPoints();$('#canvasEmpty')?.style.setProperty('display',points.length?'none':'block');const candidate=computeCandidate(project);drawCalculatedCandidate(points,candidate);drawObservedPipes(points);updateCandidateSummary(candidate,project);for(const pt of points){const at=pos(pt.x,pt.y);if(at.x < -120||at.x>w+120||at.y < -80||at.y>h+80)continue;const selected=pt.mh.id===state.selectedMh;ctx.beginPath();ctx.arc(at.x,at.y,selected?15:12,0,Math.PI*2);ctx.fillStyle=selected?'rgba(12,129,120,.16)':'rgba(12,129,120,.10)';ctx.fill();ctx.beginPath();ctx.arc(at.x,at.y,selected?7.5:6,0,Math.PI*2);ctx.fillStyle=selected?'#075c58':'#0c8178';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();ctx.font=(selected?'700 ':'600 ')+'12px ui-sans-serif, sans-serif';const title=String(pt.mh.name||'Manhole');const tw=ctx.measureText(title).width;const lx=at.x+13,ly=at.y-16;ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(lx-6,ly-12,tw+12,22,5);ctx.fill();ctx.fillStyle='#213e50';ctx.fillText(title,lx,ly+3);}
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
    if(target.matches('[data-delete-project]')){e.preventDefault();e.stopPropagation();return deleteProject(target.dataset.deleteProject);}
    if(target.matches('[data-select-project],[data-open-project]'))return selectProject(target.dataset.selectProject||target.dataset.openProject);
    if(target.matches('[data-all-projects]'))return navigate('projects');
    if(target.matches('[data-open-system]')){if(target.dataset.openSystem==='sewer'){state.canvas.dirtyFit=true;navigate('sewer');}return;}
    if(target.matches('#topAddMh,#addMhRight'))return addManhole();
    if(target.matches('[data-select-mh]'))return selectMh(target.dataset.selectMh);
    if(target.matches('#deleteMh')){const p=active(),m=getSelectedMh();if(m&&confirm(`Delete ${m.name||'this manhole'}?`)){p.manholes=p.manholes.filter(x=>x.id!==m.id);state.selectedMh=p.manholes.at(-1)?.id||null;window.SubterraWizard.resetStep();save();renderInspector();drawCanvas();}return;}
    if(target.matches('#fitCanvas'))return fitCanvas();
    if(target.matches('#zoomIn,#zoomOut')){state.canvas.scale=Math.max(.0002,Math.min(80,state.canvas.scale*(target.id==='zoomIn'?1.4:1/1.4)));drawCanvas();return;}
    if(target.matches('#toggleCalculatedCandidate')){
      const p=active();if(!p)return;
      const visible=p.showCalculatedCandidate===false;
      p.showCalculatedCandidate=visible;
      target.outerHTML=calculatedCandidateButton(p);
      save();drawCanvas();
      announce(visible?'Calculated candidate visible':'Calculated candidate hidden');
      return;
    }
    if(target.matches('#toggleHistoricalPipes')){
      const p=active();if(!p)return;
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
    if(target.matches('#exportKml'))return exportKml();
  });
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
  $('#helpButton').addEventListener('click',()=>alert('Subterra v0.9 — Record measured top and invert coordinates, classify each manhole through the supplied engineering taxonomy, and document existing pipe openings and components. No reconstruction calculations or AI inferences are executed. Data is stored locally in your browser. Export JSON backups regularly.'));
  window.SubterraDetails.setup({getSelectedMh,active,save,renderInspector,announce});
  window.SubterraWizard.setup({getSelectedMh,active,save,renderInspector,announce,drawCanvas,refreshLocation});
  render();
  handleDeleteProjectLink();
})();