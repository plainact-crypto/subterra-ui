/* SUBTERRA v0.2 — observed manhole contents and evidence capture.
   No engineering inference is executed here. A requested inference is a queued task. */
(() => {
  'use strict';
  const COMPONENTS = [
    ['accessCover','Access cover / lid','Cover material, size, load rating'],
    ['frame','Cover frame','Frame dimensions / fixing'],
    ['neck','Neck / cone / reducing slab','Neck dimensions / construction'],
    ['shaft','Manhole shaft / chamber','Actual clear dimensions / height'],
    ['baseSlab','Base slab','Thickness / base construction'],
    ['channel','Flow channel / invert channel','Channel configuration / size'],
    ['benching','Benching','Benching height / finish'],
    ['steps','Steps / ladder','Step count, spacing or ladder type'],
    ['drop','Internal / external drop connection','Drop pipe diameter / drop height'],
    ['sump','Sump / collection pit','Dimensions / depth'],
    ['seals','Pipe penetration seals / sleeves','Seal and connection details'],
    ['lining','Waterproofing / internal lining','Type / thickness'],
    ['vent','Vent / ventilation opening','Vent details'],
    ['other','Other manhole components','Description of anything else observed']
  ];
  const PRESENCE = [['present','Present'],['absent','Not present'],['unknown','Unknown']];
  const KNOWLEDGE = [['measured','Known / measured'],['unknown','Unknown'],['infer','Request inference']];
  const PIPE_MATERIALS = ['','uPVC','HDPE','GRP','Reinforced Concrete','Vitrified Clay','Terra Cotta Pipe (TCP)','Ductile Iron','Steel','Other / unspecified'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const uid = () => (globalThis.crypto?.randomUUID?.() || ('op-' + Date.now() + '-' + Math.random().toString(36).slice(2)));
  const num = v => v === '' || v === null || v === undefined ? '' : String(v);
  const attr = v => esc(v);
  const options = (items, value) => items.map(([id,label]) => `<option value="${attr(id)}" ${id === value ? 'selected' : ''}>${esc(label)}</option>`).join('');
  const select = (dataset,items,value,extra='') => `<select ${dataset} ${extra}>${options(items,value)}</select>`;
  const field = (dataset, value, placeholder='', extra='') => `<input ${dataset} value="${attr(num(value))}" placeholder="${attr(placeholder)}" autocomplete="off" ${extra} />`;
  const newOpening = (n) => ({
    id:uid(), name:'Opening ' + n, presence:'present', role:'unknown',
    fields:{ diameter:{mode:'unknown',value:''}, invert:{mode:'unknown',value:''},
      center:{mode:'unknown',value:''}, height:{mode:'unknown',value:''}, bearing:{mode:'unknown',value:''},
      material:{mode:'unknown',value:''}, notes:{mode:'unknown',value:''} }
  });
  function ensure(mh) {
    if (!mh) return;
    if (!mh.evidence || typeof mh.evidence !== 'object') mh.evidence = {};
    if (!mh.evidence.levels || typeof mh.evidence.levels !== 'object') mh.evidence.levels = {};
    for (const key of ['cover','invert']) {
      if (!['measured','unknown','infer'].includes(mh.evidence.levels[key]))
        mh.evidence.levels[key] = num(mh[key]) !== '' ? 'measured' : 'unknown';
    }
    if (!mh.evidence.openingCount || typeof mh.evidence.openingCount !== 'object') mh.evidence.openingCount = {mode:'unknown',value:''};
    if (!Array.isArray(mh.evidence.openings)) mh.evidence.openings = [];
    if (!mh.evidence.components || typeof mh.evidence.components !== 'object') mh.evidence.components = {};
    for (const [key] of COMPONENTS) {
      if (!mh.evidence.components[key] || typeof mh.evidence.components[key] !== 'object')
        mh.evidence.components[key] = {presence:'unknown',mode:'unknown',value:'',notes:''};
    }
    for (const o of mh.evidence.openings) {
      if (!o.fields) o.fields = {};
      for (const key of ['diameter','invert','center','height','bearing','material','notes'])
        if (!o.fields[key] || typeof o.fields[key] !== 'object') o.fields[key] = {mode:'unknown',value:''};
      if (!o.presence) o.presence = 'unknown';
    }
  }
  const metricFieldRows = [
    ['diameter','Pipe diameter','mm','e.g. 300'],
    ['invert','Pipe invert level','m RL','e.g. 97.50'],
    ['center','Opening centre level','m RL','optional'],
    ['height','Opening invert above base','m','e.g. 0.45'],
    ['bearing','Pipe bearing / azimuth','degrees (0–360)','e.g. 135'],
    ['material','Pipe material','', 'Select material'],
    ['notes','Field observation / evidence','', 'Photo ID / drawing ref / site notes']
  ];
  function metricRow(o,key,label,unit,placeholder) {
    const f = o.fields[key];
    const data = `data-opening-field="${attr(o.id)}" data-property="${key}"`;
    const locked = f.mode !== 'measured' || o.presence !== 'present';
    const ctrl = key === 'material' ? select(`${data} data-kind="value"`,PIPE_MATERIALS.map(k=>[k,k || 'Select / not specified']), f.value, locked?'disabled':'')
      : field(`${data} data-kind="value"`, f.value, placeholder, (['diameter','invert','center','height','bearing'].includes(key)?'type="number" step="any" '+(key==='diameter'||key==='height'?'min="0" ':key==='bearing'?'min="0" max="360" ':''):'') + (locked?'disabled':''));
    return `<div class="evidence-metric"><div class="evidence-metric-title">${esc(label)} <small>${esc(unit)}</small></div><div class="evidence-metric-inputs">${ctrl}${select(`${data} data-kind="mode"`,KNOWLEDGE,f.mode,o.presence !== 'present'?'disabled':'')}</div>${f.mode==='infer' && o.presence==='present' ? '<div class="infer-hint">Inference requested — value intentionally left unverified.</div>':''}</div>`;
  }
  function openingCard(o,index) {
    return `<div class="opening-card"><div class="opening-top"><span class="opening-number">${String(index+1).padStart(2,'0')}</span>${field(`data-opening-key="${attr(o.id)}" data-property="name"`,o.name,'Opening name')}<button class="tiny-danger" data-remove-opening="${attr(o.id)}" title="Remove this opening" aria-label="Remove opening">×</button></div><div class="opening-primary"><div><label>Pipe function</label>${select(`data-opening-key="${attr(o.id)}" data-property="role"`,[['unknown','Unknown'],['inlet','Inlet'],['outlet','Outlet'],['both','Bidirectional / other']],o.role)}</div><div><label>Existence</label>${select(`data-opening-key="${attr(o.id)}" data-property="presence"`,PRESENCE,o.presence)}</div></div><div class="opening-fields ${o.presence !== 'present'?'fields-inactive':''}">${metricFieldRows.map(([k,l,u,p])=>metricRow(o,k,l,u,p)).join('')}</div></div>`;
  }
  function componentCard(key,label,desc,c) {
    const locked=c.presence!=='present';
    return `<div class="component-row"><div class="component-label"><strong>${esc(label)}</strong><small>${esc(desc)}</small></div><div class="component-presence">${select(`data-component="${key}" data-property="presence"`,PRESENCE,c.presence)}</div><div class="component-value">${select(`data-component="${key}" data-property="mode"`,KNOWLEDGE,c.mode,locked?'disabled':'')}${field(`data-component="${key}" data-property="value"`,c.value,'Dimension / detail / observation',locked||c.mode!=='measured'?'disabled':'')}${field(`data-component="${key}" data-property="notes"`,c.notes,'Evidence / photo ref / comment')}</div></div>`;
  }
  function countRequests(mh) {
    ensure(mh);
    let pending=0;
    for (const key of ['cover','invert']) if (mh.evidence.levels[key]==='infer') pending++;
    if (mh.evidence.openingCount.mode==='infer') pending++;
    for (const o of mh.evidence.openings) if (o.presence==='present') for (const f of Object.values(o.fields)) if(f.mode==='infer') pending++;
    for (const c of Object.values(mh.evidence.components)) if (c.presence==='present'&&c.mode==='infer') pending++;
    return pending;
  }
  function render(mh) {
    ensure(mh);
    const ev=mh.evidence;
    const requested=countRequests(mh);
    const counts=ev.openings.filter(o=>o.presence==='present').length;
    const inferredLabel=`${requested} pending inference request${requested===1?'':'s'}`;
    return `<div class="data-capture">
      <div class="section-head evidence-heading"><h3>Survey evidence &amp; missing information</h3><small class="inference-counter">${inferredLabel}</small></div>
      <p class="evidence-explainer">A known value is measured / documented. If an item is known to exist but cannot be measured, set its existence to <b>Present</b> and its value to <b>Request inference</b>. No estimates are generated in this UI version.</p>
      <div class="evidence-subheading">Main manhole levels</div>
      <div class="level-status">${[['cover','Cover / ground RL'],['invert','Main channel invert RL']].map(([k,label])=>`<label>${esc(label)} ${select(`data-level-state="${k}"`,KNOWLEDGE,ev.levels[k])}</label>`).join('')}</div>
      <div class="section-head evidence-heading"><h3>Pipe openings / penetrations</h3><small>${counts} present recorded · ${ev.openings.length} listed</small></div>
      <div class="opening-total"><label><strong>Total openings in this manhole</strong><small>May be different from openings individually surveyed</small></label>${field('data-opening-count="value"',ev.openingCount.value,'e.g. 3','type="number" min="0" step="1" ' + (ev.openingCount.mode==='measured'?'':'disabled'))}${select('data-opening-count="mode"',KNOWLEDGE,ev.openingCount.mode)}</div>
      <div class="opening-cards">${ev.openings.map(openingCard).join('')||'<p class="evidence-empty">No pipe openings recorded. Add an opening for every observed penetration; mark any inaccessible dimensions for inference.</p>'}</div>
      <button class="btn btn-outline btn-sm add-opening-btn" data-add-opening="true">＋ Add pipe opening</button>
      <div class="section-head evidence-heading"><h3>Manhole components checklist</h3><small>Existing / absent / unknown</small></div>
      <p class="evidence-explainer">Choose existence for each component, then document its details or request inference. Unknown is not the same as absent.</p>
      <div class="components-list">${COMPONENTS.map(([key,label,desc])=>componentCard(key,label,desc,ev.components[key])).join('')}</div>
      <div class="inference-summary"><span class="infer-icon">◇</span><div><strong>${inferredLabel}</strong><p>Saved as explicit evidence gaps for a future reconstruction engine. The program has not inferred any dimensions, elevations or pipe routes.</p></div></div>
      <button class="btn btn-outline btn-sm export-opening" data-export-openings="true">↓ Export openings CSV</button>
    </div>`;
  }
  function updateEvidenceLevel(mh,key,value) { ensure(mh);mh.evidence.levels[key]=value; }
  function handleOpeningCount(mh,key,value) {
    ensure(mh);const x=mh.evidence.openingCount;
    if(key==='mode'){x.mode=value;if(value==='infer'||value==='unknown')x.value='';}
    else if(value===''||(Number.isInteger(+value)&&+value>=0&&+value<=10000))x.value=value;
  }
  function handleOpening(mh,id,property,kind,value) {
    ensure(mh);
    const o=mh.evidence.openings.find(o=>o.id===id);if(!o)return;
    if(kind==='key') {
      o[property]=value;
      if(property==='presence'&&value!=='present') for (const f of Object.values(o.fields)) if(f.mode==='infer'){f.mode='unknown';f.value='';}
      return;
    }
    const f=o.fields[property];if(!f)return;
    if(kind==='mode'){f.mode=value;if(value!=='measured')f.value='';}
    else if(o.presence==='present') f.value=value;
  }
  function handleComponent(mh,key,property,value) {
    ensure(mh);const c=mh.evidence.components[key];if(!c)return;
    c[property]=value;
    if(property==='presence'&&value!=='present'){c.mode='unknown';c.value='';}
    if(property==='mode'&&value!=='measured')c.value='';
  }
  function setup(api) {
    document.addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button)return;
      const mh=api.getSelectedMh();if(!mh)return;
      if(button.hasAttribute('data-add-opening')) {
        ensure(mh);mh.evidence.openings.push(newOpening(mh.evidence.openings.length+1));api.save();api.renderInspector();api.announce('Pipe opening added');
      } else if(button.hasAttribute('data-remove-opening')) {
        const id=button.dataset.removeOpening;const o=mh.evidence.openings.find(o=>o.id===id);
        if(o&&confirm('Remove '+(o.name||'this opening')+' from the record?')){mh.evidence.openings=mh.evidence.openings.filter(x=>x.id!==id);api.save();api.renderInspector();}
      } else if(button.hasAttribute('data-export-openings')) {
        const p=api.active();const h=['Manhole','Opening','Existence','Function','Diameter_mm','Diameter_Status','Invert_RL','Invert_Status','Center_RL','Center_Status','Height_Above_Base_m','Height_Status','Bearing_deg','Bearing_Status','Material','Material_Status','Notes','Notes_Status'];
        const rows=p.manholes.flatMap(m=>{ensure(m);return m.evidence.openings.map(o=>[m.name,o.name,o.presence,o.role,...['diameter','invert','center','height','bearing','material','notes'].flatMap(k=>[o.fields[k].value,o.fields[k].mode])]);});
        const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';const csv=[h,...rows].map(row=>row.map(quote).join(',')).join('\n');
        const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(p.name||'project').replace(/[^a-z0-9_-]/gi,'_')+'_pipe_openings.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);api.announce('Pipe openings CSV exported');
      }
    });
    const update = e => {
      const el=e.target;const mh=api.getSelectedMh();if(!mh||!el.dataset)return;
      let touched=false,rerender=false;
      if(el.dataset.levelState){updateEvidenceLevel(mh,el.dataset.levelState,el.value);touched=true;}
      else if(el.dataset.openingCount){handleOpeningCount(mh,el.dataset.openingCount,el.value);touched=true;rerender=el.dataset.openingCount==='mode';}
      else if(el.dataset.openingKey){handleOpening(mh,el.dataset.openingKey,el.dataset.property,'key',el.value);touched=true;rerender=el.dataset.property==='presence';}
      else if(el.dataset.openingField){handleOpening(mh,el.dataset.openingField,el.dataset.property,el.dataset.kind,el.value);touched=true;rerender=el.dataset.kind==='mode';}
      else if(el.dataset.component){handleComponent(mh,el.dataset.component,el.dataset.property,el.value);touched=true;rerender=['presence','mode'].includes(el.dataset.property);}
      if(touched){api.save();if(rerender){const panel=document.querySelector('#inspectorBody');const scrollTop=panel?.scrollTop||0;api.renderInspector();const newPanel=document.querySelector('#inspectorBody');if(newPanel)newPanel.scrollTop=scrollTop;}else {const badge=document.querySelector('.inference-counter');if(badge){let n=countRequests(mh);badge.textContent=n+' pending inference request'+(n===1?'':'s');}}}
    };
    document.addEventListener('change',e=>{if(e.target.matches('[data-level-state], [data-opening-count="mode"], [data-opening-key][data-property="presence"], [data-opening-key][data-property="role"], [data-opening-field][data-kind="mode"], [data-opening-field][data-kind="value"]:is(select), [data-component][data-property="presence"], [data-component][data-property="mode"]'))update(e);});
    document.addEventListener('input',e=>{if(e.target.matches('[data-opening-count="value"], [data-opening-key][data-property="name"], [data-opening-field][data-kind="value"]:not(select), [data-component][data-property="value"], [data-component][data-property="notes"]'))update(e);});
  }
  window.SubterraDetails={ensure,render,setup,updateEvidenceLevel,countRequests};
})();
