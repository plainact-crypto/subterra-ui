/* Subterra UI prototype — No backend, no design/reconstruction calculations yet. */
(() => {
  'use strict';

  const STORAGE_KEY = 'subterra_ui_v1';
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
  const MATERIALS = ['Precast Reinforced Concrete','Cast-in-Situ Reinforced Concrete','GRP','HDPE','Polypropylene (PP)','PVC','Brick Masonry','Other'];
  const DEFAULT_TYPES = [
    {id:'t-rc-1200',code:'MH-RC-1200',name:'Precast RC Manhole',material:'Precast Reinforced Concrete',shape:'Round',diameter:1200},
    {id:'t-rc-insitu',code:'MH-CIS',name:'Cast-in-Situ Manhole',material:'Cast-in-Situ Reinforced Concrete',shape:'Rectangular',diameter:null},
    {id:'t-grp',code:'MH-GRP',name:'GRP Inspection Chamber',material:'GRP',shape:'Round',diameter:1000},
    {id:'t-hdpe',code:'MH-HDPE',name:'HDPE Inspection Chamber',material:'HDPE',shape:'Round',diameter:600},
    {id:'t-brick',code:'MH-BRICK',name:'Brick Manhole',material:'Brick Masonry',shape:'Round',diameter:1000}
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
    inspectorTab:'manholes',
    selectedMh:null,
    canvas:{panX:0,panY:0,scale:2,dirtyFit:true},
    pointer:null,
    toastTimer:null
  };

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({projects:state.projects,activeId:state.activeId}));
      $('#saveStatus').innerHTML = '<span class="save-circle"></span> Saved locally';
    } catch { $('#saveStatus').textContent = 'Storage unavailable'; }
  }
  function active() { return state.projects.find(p => p.id===state.activeId) || null; }
  function announce(message) { const t=$('#toast'); t.textContent=message; t.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>t.classList.remove('show'),2500); }
  function navigate(page) { state.page=page; state.inspectorTab='manholes'; window.scrollTo(0,0); render(); }
  function selectProject(id) { state.activeId=id; state.selectedMh=null; state.canvas.dirtyFit=true; save(); navigate('systems'); }
  function renderNav() {
    $('#projectCount').textContent=state.projects.length;
    $('#navProjects').classList.toggle('active',state.page==='projects');
    $('#navSystems').classList.toggle('active',state.page==='systems');
    $('#sideProjectList').innerHTML=state.projects.slice().reverse().map(p=>`<button class="side-project ${state.activeId===p.id?'current':''}" data-open-project="${escapeHtml(p.id)}"><span class="p-dot"></span><span title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span></button>`).join('');
    const p=active(); const trail=state.page==='projects'?['Workspace','Projects']:state.page==='systems'?['Projects',p?.name||'Systems']:['Projects',p?.name||'Project','Sanitary Sewer'];
    $('#breadcrumbs').innerHTML=trail.map((x,i)=>`${i?'<span class="crumb-arrow">/</span>':''}${i===trail.length-1?`<b>${escapeHtml(x)}</b>`:`<span>${escapeHtml(x)}</span>`}`).join('');
  }
  function render() { renderNav(); if(state.page==='projects') renderProjects(); else if(state.page==='systems') renderSystems(); else if(state.page==='sewer') renderWorkspace(); }
  function renderProjects() {
    $('#mainContent').innerHTML=`<section class="page"><div class="eyebrow">INFRASTRUCTURE RECONSTRUCTION</div><div class="page-header"><div><h1>Your projects</h1><p class="page-subtitle">Create a project, select an infrastructure system, then start recording actual site evidence.</p></div><button class="btn btn-primary" data-new-project>＋ New project</button></div>${state.projects.length?`<div class="project-cards">${state.projects.slice().reverse().map(p=>`<article class="project-card" data-select-project="${escapeHtml(p.id)}" role="button" tabindex="0"><div class="project-card-top"><span class="project-icon">▧</span><span class="light-label">PROJECT</span></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.location||'Location not specified')}</p><div class="project-card-bottom"><span>${p.manholes?.length||0} manholes · ${escapeHtml(p.coordMode==='projected'?'XY metres':'WGS84')}</span><span>Open project ↗</span></div></article>`).join('')}</div>`:`<div class="empty-state"><div class="empty-art">▧</div><h2>No projects yet</h2><p>Create a new project to organize your infrastructure systems, survey coordinates and engineering evidence.</p><button class="btn btn-primary" data-new-project>＋ Create first project</button></div>`}</section>`;
  }
  function renderSystems() {
    const p=active(); if(!p){navigate('projects');return;}
    $('#mainContent').innerHTML=`<section class="page"><div class="eyebrow">PROJECT / ${escapeHtml(p.name)}</div><div class="page-header"><div><h1>Infrastructure systems</h1><p class="page-subtitle">Choose a system to open its data workspace. The first prototype supports sanitary sewer manholes.</p></div><button class="btn btn-outline" data-all-projects>← All projects</button></div><div class="project-summary"><strong>${escapeHtml(p.name)}</strong><span class="summary-divider"></span><span>${escapeHtml(p.location||'Location not set')}</span><span class="summary-divider"></span><span>${escapeHtml(p.coordMode==='geographic'?'WGS84 · Latitude / Longitude':'Projected coordinates · XY metres')}</span></div><div class="system-grid">${SYSTEMS.map(([id,name,desc,sym,ready])=>`<button class="system-card" data-open-system="${id}" ${ready?'':'disabled'}><div class="system-head"><span class="system-symbol">${sym}</span><span class="${ready?'ready':'coming'}">${ready?'OPEN WORKSPACE':'COMING LATER'}</span></div><div><div class="system-title">${escapeHtml(name)}</div><div class="system-desc">${escapeHtml(desc)}</div></div></button>`).join('')}</div></section>`;
  }
  function renderWorkspace() {
    const p=active(); if(!p){navigate('projects');return;}
    $('#mainContent').innerHTML=`<div class="workspace"><div class="ws-header"><div><h1>Sanitary Sewer <span style="font-size:12px;color:#80a3a3;font-weight:600">/ Data Workspace</span></h1><div class="ws-sub">${escapeHtml(p.name)} · Evidence capture & spatial plotting · No design calculations</div></div><div class="ws-actions"><button class="btn btn-outline btn-sm hide-sm" id="exportCsv">↓ Export CSV</button><button class="btn btn-outline btn-sm" id="exportJson">↓ JSON</button><button class="btn btn-outline btn-sm hide-sm" id="exportKml">↗ Google Earth KML</button><button class="btn btn-primary btn-sm" id="topAddMh">＋ Manhole</button></div></div><div class="ws-main"><section class="canvas-pane"><canvas class="canvas-surface" id="mapCanvas" aria-label="Infinite canvas with surveyed manholes. Drag to pan, scroll to zoom."></canvas><div class="canvas-toolbar"><span class="canvas-pill green">● Sewer / Manholes</span><span class="canvas-pill">${p.coordMode==='geographic'?'WGS84 · Local metric view':'Local XY · Metres'}</span></div><div class="canvas-controls"><button id="zoomIn" title="Zoom in">＋</button><button id="zoomOut" title="Zoom out">−</button><button class="fit" id="fitCanvas" title="Fit all manholes">FIT</button></div><div id="canvasEmpty" class="canvas-overlay-empty"><div class="ghost-icon">⌖</div><strong>Your survey canvas is ready</strong><p>Add a manhole with coordinates on the right. It will appear here automatically.</p></div><div class="canvas-hint">✥ Drag to pan <span style="opacity:.35">·</span> Scroll to zoom <span style="opacity:.35">·</span> Click a manhole to select</div><div class="canvas-legend"><span class="dot-legend"></span> Surveyed manhole</div></section><aside class="inspector"><div class="inspector-tabs"><button class="tab ${state.inspectorTab==='manholes'?'active':''}" data-tab="manholes">Manholes</button><button class="tab ${state.inspectorTab==='types'?'active':''}" data-tab="types">Manhole type library</button></div><div class="inspector-scroll" id="inspectorBody"></div></aside></div></div>`;
    renderInspector(); setupCanvas(); requestAnimationFrame(()=>{if(state.canvas.dirtyFit)fitCanvas();else drawCanvas();});
  }
  function renderInspector() { if(state.inspectorTab==='types')renderTypes();else renderManholes(); }
  function getSelectedMh(){const p=active(); return p?.manholes?.find(m=>m.id===state.selectedMh)||null;}
  function validMh(p,m){ if(p.coordMode==='geographic')return m.lat!==''&&m.lon!==''&&Number.isFinite(+m.lat)&&Number.isFinite(+m.lon)&&Math.abs(+m.lat)<=90&&Math.abs(+m.lon)<=180;return m.x!==''&&m.y!==''&&Number.isFinite(+m.x)&&Number.isFinite(+m.y); }
  function renderManholes(){
    const p=active();if(!p)return;const mh=getSelectedMh();const located=p.manholes.filter(m=>validMh(p,m)).length;
    const valueOf=(m,k)=>m[k]===null||m[k]===undefined?'':m[k];
    const r=(label,key,placeholder='',type='text')=>`<div class="field-row"><div class="field-key">${label}</div><div class="field-value"><input data-mh-field="${key}" type="${type}" ${type==='number'?'step="any"':''} placeholder="${placeholder}" value="${escapeHtml(valueOf(mh,key))}" autocomplete="off" /></div></div>`;
    const selectedType=p.types.find(t=>t.id===mh?.typeId);
    $('#inspectorBody').innerHTML=`<div class="panel-top"><span class="panel-title">Manhole schedule</span><span class="panel-counter">${located} / ${p.manholes.length} located</span></div><p class="panel-desc">Every manhole is an observed asset. Enter surveyed coordinates; the point appears on the canvas immediately.</p><button class="btn btn-outline btn-sm" id="addMhRight">＋ Add manhole</button>${p.manholes.length?`<div class="mh-list">${p.manholes.map(m=>`<button class="mh-list-item ${mh?.id===m.id?'selected':''}" data-select-mh="${escapeHtml(m.id)}"><span class="mh-item-icon">◎</span><span class="mh-row-main"><strong>${escapeHtml(m.name||'Unnamed manhole')}</strong><small>${validMh(p,m)?escapeHtml(p.coordMode==='geographic'?`${m.lat}, ${m.lon}`:`X ${m.x} · Y ${m.y}`):'Coordinates not entered'} · ${escapeHtml(p.types.find(t=>t.id===m.typeId)?.code||'No type')}</small></span><span class="mh-arrow">›</span></button>`).join('')}</div>`:'<div class="no-mh" style="margin-top:16px">No manholes yet. Add your first surveyed manhole to begin.</div>'}${mh?`<div class="section-head"><h3>Manhole properties</h3><small>FIELD / VALUE</small></div><div class="field-table">${r('Name','name','Auto: MH-001')}${p.coordMode==='geographic'?r('Latitude','lat','30.116926','number')+r('Longitude','lon','31.881307','number'):r('Easting X (m)','x','500000.00','number')+r('Northing Y (m)','y','3330000.00','number')}${r('Cover / Ground RL','cover','e.g. 102.50','number')}${r('Invert RL','invert','e.g. 100.40','number')}<div class="field-row"><div class="field-key">Manhole type</div><div class="field-value"><select data-mh-field="typeId"><option value="">Select from library…</option>${p.types.map(t=>`<option value="${escapeHtml(t.id)}" ${mh.typeId===t.id?'selected':''}>${escapeHtml(t.code)} · ${escapeHtml(t.name)}</option>`).join('')}</select></div></div><div class="field-row"><div class="field-key">Material</div><div class="field-value"><span class="muted-value" id="selectedMaterial">${escapeHtml(selectedType?.material||'Inherited from type library')}</span></div></div>${r('Observed / Notes','notes','Site survey remarks')}</div><div class="property-footer"><button class="btn-text" id="editLibraryFromMh">↗ Edit type library</button><button class="danger-link" id="deleteMh">Delete manhole</button></div><div class="hint-inline">Measured values are stored exactly as entered. Missing values are left blank — this screen does not infer pipe connections, depths or alignments yet.</div>`:`<div class="hint-inline">Choose a manhole to edit its name, coordinates, levels and type. Type materials are managed separately in the library.</div>`}`;
  }
  function renderTypes(){const p=active();$('#inspectorBody').innerHTML=`<div class="panel-top"><span class="panel-title">Manhole type library</span><span class="panel-counter">${p.types.length} types</span></div><p class="panel-desc">Define reusable manhole types. The selected type controls the material and typical chamber dimensions — independently of manhole names or locations.</p><button class="btn btn-outline btn-sm" id="addType">＋ New type</button><div style="margin-top:18px">${p.types.map(t=>`<div class="type-card"><div><span class="type-code">${escapeHtml(t.code)}</span><br><strong>${escapeHtml(t.name)}</strong><p>${escapeHtml(t.material)} · ${escapeHtml(t.shape)}${t.diameter?' · Ø '+escapeHtml(t.diameter)+' mm':''}</p></div><div class="type-actions"><button class="mini-action" data-edit-type="${escapeHtml(t.id)}" title="Edit">Edit</button><button class="mini-action delete" data-delete-type="${escapeHtml(t.id)}" title="Delete">×</button></div></div>`).join('')}</div><div class="callout" style="margin-top:15px">Example: MH-001 and MH-002 can be different locations while both use type <strong>MH-RC-1200</strong>. A type belongs to the library; a manhole is a surveyed individual asset.</div>`;}
  function addManhole(){const p=active();if(!p)return;let i=1;const used=new Set(p.manholes.map(m=>m.name));let name;do{name='MH-'+String(i++).padStart(3,'0')}while(used.has(name));const m={id:uid(),name,lat:'',lon:'',x:'',y:'',cover:'',invert:'',typeId:'t-rc-1200',notes:''};p.manholes.push(m);state.selectedMh=m.id;state.inspectorTab='manholes';save();renderInspector();drawCanvas();document.querySelector('[data-mh-field="name"]')?.focus();announce(`${name} added`);}
  function updateMh(key,value){const p=active(),m=getSelectedMh();if(!m)return;if(['lat','lon','x','y'].includes(key)&&value!==''){const n=Number(value);if(!Number.isFinite(n))return;}m[key]=value;save();if(['lat','lon','x','y'].includes(key)&&validMh(p,m)){fitCanvas();}else{drawCanvas();}if(key==='name'||key==='typeId'){const sel=document.activeElement?.getAttribute('data-mh-field');renderInspector();if(sel&&key==='name'){const input=document.querySelector('[data-mh-field="name"]');input?.focus();input?.setSelectionRange(value.length,value.length);}}}
  function selectMh(id){state.selectedMh=id;state.inspectorTab='manholes';renderInspector();drawCanvas();}
  function openTypeDialog(typeId){const p=active(),t=p?.types.find(o=>o.id===typeId);$('#typeForm').reset();$('#editTypeId').value=t?.id||'';$('#typeDialogHeading').textContent=t?'Edit manhole type':'Create manhole type';$('#typeCode').value=t?.code||'';$('#typeName').value=t?.name||'';$('#typeMaterial').value=t?.material||MATERIALS[0];$('#typeShape').value=t?.shape||'Round';$('#typeDiameter').value=t?.diameter??'';$('#typeDialog').showModal();}
  function saveType(form){const field=n=>form.elements.namedItem(n).value;const p=active(),id=field('typeId')||uid(),code=field('code').trim(),name=field('name').trim();if(!code||!name)return;const dupe=p.types.find(t=>t.code.toLowerCase()===code.toLowerCase()&&t.id!==id);if(dupe){announce('Type code already exists');return;}const obj={id,code,name,material:field('material'),shape:field('shape'),diameter:field('diameter')===''?null:Number(field('diameter'))};const idx=p.types.findIndex(t=>t.id===id);if(idx>=0)p.types[idx]=obj;else p.types.push(obj);save();$('#typeDialog').close();renderInspector();announce('Type saved to project library');}
  function deleteType(id){const p=active();if(p.manholes.some(m=>m.typeId===id)){announce('Type is used by a manhole; change that manhole first');return;}if(!confirm('Delete this type from the library?'))return;p.types=p.types.filter(t=>t.id!==id);save();renderInspector();}
  function openProjectDialog(){$('#projectForm').reset();$('#projectDialog').showModal();setTimeout(()=>$('#projectName').focus(),30);}
  function createProject(form){const field=n=>form.elements.namedItem(n).value;const p={id:uid(),name:field('name').trim(),location:field('location').trim(),coordMode:field('coordMode'),createdAt:new Date().toISOString(),types:clone(DEFAULT_TYPES),manholes:[]};if(!p.name)return;state.projects.push(p);state.activeId=p.id;state.selectedMh=null;save();$('#projectDialog').close();navigate('systems');announce('Project created');}
  function exportFile(name,content,mime){const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),300);}
  const safeFilename = s => (s||'project').replace(/[^a-z0-9\-_]/gi,'_').slice(0,40);
  function escapeCsv(s){return '"'+String(s??'').replaceAll('"','""')+'"';}
  function exportCsv(){const p=active();const h=['Name','Latitude','Longitude','Easting_X','Northing_Y','Cover_RL','Invert_RL','Manhole_Type','Material','Notes'];const rows=p.manholes.map(m=>[m.name,m.lat,m.lon,m.x,m.y,m.cover,m.invert,p.types.find(t=>t.id===m.typeId)?.code||'',p.types.find(t=>t.id===m.typeId)?.material||'',m.notes]);exportFile(`${safeFilename(p.name)}_manholes.csv`,[h,...rows].map(r=>r.map(escapeCsv).join(',')).join('\n'),'text/csv;charset=utf-8');announce('Manhole schedule exported');}
  function exportJson(){const p=active();exportFile(`${safeFilename(p.name)}_project.json`,JSON.stringify(p,null,2),'application/json');announce('Project JSON exported');}
  function xmlEscape(value){return String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&quot;',"'":'&apos;'}[c]));}
  function exportKml(){const p=active();if(p.coordMode!=='geographic'){announce('KML requires WGS84 coordinates. Use a WGS84 project for Google Earth.');return;}const placemarks=p.manholes.filter(m=>validMh(p,m)).map(m=>`<Placemark><name>${xmlEscape(m.name)}</name><description>${xmlEscape('Manhole type: '+(p.types.find(t=>t.id===m.typeId)?.code||'Unspecified')+'; Cover RL: '+(m.cover||'Unknown')+'; Invert RL: '+(m.invert||'Unknown'))}</description><Point><coordinates>${m.lon},${m.lat},0</coordinates></Point></Placemark>`).join('');if(!placemarks){announce('Add at least one manhole with valid coordinates first');return;}exportFile(`${safeFilename(p.name)}_manholes.kml`,`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEscape(p.name)}</name>${placemarks}</Document></kml>`,'application/vnd.google-earth.kml+xml');announce('KML ready for Google Earth');}

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
  function drawCanvas(){if(!canvas?.isConnected||!ctx)return;const{w,h}=dims();ctx.clearRect(0,0,w,h);ctx.fillStyle='#f2f6f8';ctx.fillRect(0,0,w,h);const v=state.canvas;const step=gridStep(50/v.scale),spacing=step*v.scale;const pointA=invPos(0,h),pointB=invPos(w,0);if(Number.isFinite(spacing)&&spacing>2){ctx.lineWidth=1;ctx.strokeStyle='#dce7ed';ctx.beginPath();const startX=Math.floor(pointA.x/step)*step;for(let x=startX;x<pointB.x+step;x+=step){const sx=pos(x,0).x;ctx.moveTo(sx,0);ctx.lineTo(sx,h);}const startY=Math.floor(pointA.y/step)*step;for(let y=startY;y<pointB.y+step;y+=step){const sy=pos(0,y).y;ctx.moveTo(0,sy);ctx.lineTo(w,sy);}ctx.stroke();ctx.font='10px ui-sans-serif, sans-serif';ctx.fillStyle='#a4b6c2';ctx.textBaseline='bottom';for(let x=startX;x<pointB.x+step;x+=step){const sx=pos(x,0).x;if(sx>10&&sx<w-30)ctx.fillText(Math.round(x*10)/10+' m',sx+4,h-10);}}const origin=pos(0,0);ctx.strokeStyle='#b7d0d4';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(origin.x,0);ctx.lineTo(origin.x,h);ctx.moveTo(0,origin.y);ctx.lineTo(w,origin.y);ctx.stroke();
    const points=locatedPoints();$('#canvasEmpty')?.style.setProperty('display',points.length?'none':'block');for(const pt of points){const at=pos(pt.x,pt.y);if(at.x < -120||at.x>w+120||at.y < -80||at.y>h+80)continue;const selected=pt.mh.id===state.selectedMh;ctx.beginPath();ctx.arc(at.x,at.y,selected?15:12,0,Math.PI*2);ctx.fillStyle=selected?'rgba(12,129,120,.16)':'rgba(12,129,120,.10)';ctx.fill();ctx.beginPath();ctx.arc(at.x,at.y,selected?7.5:6,0,Math.PI*2);ctx.fillStyle=selected?'#075c58':'#0c8178';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();ctx.font=(selected?'700 ':'600 ')+'12px ui-sans-serif, sans-serif';const title=String(pt.mh.name||'Manhole');const tw=ctx.measureText(title).width;const lx=at.x+13,ly=at.y-16;ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(lx-6,ly-12,tw+12,22,5);ctx.fill();ctx.fillStyle='#213e50';ctx.fillText(title,lx,ly+3);}
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
    if(target.matches('[data-select-project],[data-open-project]'))return selectProject(target.dataset.selectProject||target.dataset.openProject);
    if(target.matches('[data-all-projects]'))return navigate('projects');
    if(target.matches('[data-open-system]')){if(target.dataset.openSystem==='sewer'){state.canvas.dirtyFit=true;navigate('sewer');}return;}
    if(target.matches('[data-tab]')){state.inspectorTab=target.dataset.tab;renderInspector();return;}
    if(target.matches('#topAddMh,#addMhRight'))return addManhole();
    if(target.matches('[data-select-mh]'))return selectMh(target.dataset.selectMh);
    if(target.matches('#editLibraryFromMh')){state.inspectorTab='types';renderInspector();return;}
    if(target.matches('#deleteMh')){const p=active(),m=getSelectedMh();if(m&&confirm(`Delete ${m.name||'this manhole'}?`)){p.manholes=p.manholes.filter(x=>x.id!==m.id);state.selectedMh=p.manholes.at(-1)?.id||null;save();renderInspector();drawCanvas();}return;}
    if(target.matches('#addType'))return openTypeDialog(null);
    if(target.matches('[data-edit-type]'))return openTypeDialog(target.dataset.editType);
    if(target.matches('[data-delete-type]'))return deleteType(target.dataset.deleteType);
    if(target.matches('#fitCanvas'))return fitCanvas();
    if(target.matches('#zoomIn,#zoomOut')){state.canvas.scale=Math.max(.0002,Math.min(80,state.canvas.scale*(target.id==='zoomIn'?1.4:1/1.4)));drawCanvas();return;}
    if(target.matches('#exportCsv'))return exportCsv();
    if(target.matches('#exportJson'))return exportJson();
    if(target.matches('#exportKml'))return exportKml();
  });
  document.addEventListener('input',e=>{const key=e.target.dataset.mhField;if(key!==undefined && e.target.tagName==='INPUT')updateMh(key,e.target.value);});
  document.addEventListener('change',e=>{const key=e.target.dataset.mhField;if(key!==undefined&&e.target.tagName==='SELECT')updateMh(key,e.target.value);});
  $('#projectForm').addEventListener('submit',e=>{e.preventDefault();createProject(e.currentTarget);});
  $('#typeForm').addEventListener('submit',e=>{e.preventDefault();saveType(e.currentTarget);});
  $('#cancelProject').addEventListener('click',()=>$('#projectDialog').close());
  $('#cancelType').addEventListener('click',()=>$('#typeDialog').close());
  $('#navProjects').addEventListener('click',()=>navigate('projects'));
  $('#navSystems').addEventListener('click',()=>{if(active())navigate('systems');else announce('Create a project first');});
  $('#brandHome').addEventListener('click',()=>navigate('projects'));
  $('#brandHome').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')navigate('projects');});
  $('#helpButton').addEventListener('click',()=>alert('Subterra v0.1 — UI prototype. Create projects, choose Sanitary Sewer, add manholes on an infinite coordinate canvas, and manage a project-specific manhole type library. No underground predictions or design calculations yet. Data is stored only in this browser; export JSON/CSV regularly.'));
  $('#typeMaterial').innerHTML=MATERIALS.map(s=>`<option>${escapeHtml(s)}</option>`).join('');
  render();
})();