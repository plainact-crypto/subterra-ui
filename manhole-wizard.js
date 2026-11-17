/* SUBTERRA v0.3 — evidence-led manhole classification wizard.
   Classification choices are observed descriptions, NOT a generated engineering design. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TAXONOMY = [
    {key:'geometry', title:'By Geometry', short:'Geometry', hint:'Select the observed manhole geometry.', options:[
      ['Circular Manhole','CIR'], ['Rectangular Manhole','REC'], ['Square Manhole','SQR'],
      ['Tee-Section Manhole','TEE'], ['Conical Manhole','CON'], ['Elliptical Manhole','ELL']
    ]},
    {key:'material', title:'By Construction Material', short:'Material', hint:'Record the actual construction material, not a proposed alternative.', options:[
      ['Precast Concrete Manhole','PCC'], ['Cast-in-Place Concrete Manhole','CIP'],
      ['Fiberglass Reinforced Plastic (FRP) Manhole','FRP'], ['Glass Reinforced Plastic (GRP) Manhole','GRP'],
      ['Polyethylene (PE) Manhole','PE'], ['Polypropylene (PP) Manhole','PP'],
      ['Polyvinyl Chloride (PVC) Manhole','PVC'], ['Brick Manhole','BRK'], ['Resin Concrete Manhole','RSC']
    ]},
    {key:'depth', title:'By Depth', short:'Depth', hint:'Classify from reliable evidence; leave unknown if depth or access is unverified.', options:[
      ['Shallow Manhole','SH'], ['Normal Manhole','NOR'], ['Deep Manhole','DP'],
      ['Non-Entry Access Point','NE'], ['Inspection Chamber','IC'], ['Man-Entry Manhole','ME']
    ]},
    {key:'function', title:'By Hydraulic / Functional Type', short:'Function', hint:'Record the existing flow configuration or operational purpose.', options:[
      ['Straight-Through Manhole','STR'], ['Junction Manhole / Junction Chamber','JNC'],
      ['Drop Manhole','DRP'], ['Internal Drop Manhole','IDR'], ['External Drop Manhole','EDR'],
      ['Flushing Manhole','FLU'], ['Lamp Hole','LMP'], ['Terminal Cleanout','TCL'],
      ['Vented Manhole','VNT'], ['Metering Manhole','MTR'], ['Flow Control Manhole','FLC'],
      ['Diversion Manhole','DIV'], ['Siphon Manhole / Inverted Siphon','SIP'],
      ['Tangential Manhole','TAN'], ['Discharge Manhole','DIS'], ['Terminal / End Manhole','END']
    ]},
    {key:'utility', title:'By Utility Type', short:'Utility', hint:'Specify which infrastructure system this manhole actually belongs to.', options:[
      ['Sanitary Sewer Manhole','SAN'], ['Storm Sewer Manhole','STM'], ['Power Manhole','PWR'],
      ['Communications Manhole','COM'], ['Meter Manhole / Meter Chamber','MET']
    ]},
    {key:'method', title:'By Construction Method', short:'Method', hint:'Choose the recorded construction method, where verified.', options:[
      ['Standard Manhole','STD'], ['Special Manhole','SPC'], ['Assembled Manhole','ASM']
    ]}
  ];
  const STEPS = [{key:'coordinates',short:'Location',title:'Name & surveyed coordinates'}, ...TAXONOMY, {key:'details',short:'Contents',title:'Pipe openings & manhole components'}];
  let currentStep = 0;
  let api = null;
  const UNKNOWN = '__infer__';
  function ensure(m,p){
    if(!m.classification || typeof m.classification!=='object') m.classification = {};
    for(const cat of TAXONOMY) if(typeof m.classification[cat.key]!=='string') m.classification[cat.key]='';
    if(!m.invertPosition || typeof m.invertPosition!=='object') m.invertPosition={lat:'',lon:'',x:'',y:''};
    for(const k of ['lat','lon','x','y']) if(m.invertPosition[k]===undefined) m.invertPosition[k]='';
    if(!m.evidence || !m.evidence.levels) window.SubterraDetails.ensure(m);
    if(!Number.isInteger(m.autoIndex) || m.autoIndex < 1){
      const idx=p?.manholes?.indexOf(m) ?? -1;
      m.autoIndex = idx>=0 ? idx + 1 : 1;
    }
    if(typeof m.customName !== 'string'){
      // Legacy v0.1/v0.2 names matching MH-001 etc. were generated; other names are respected.
      m.customName = /^MH-\d+$/i.test(m.name||'') ? '' : (m.name||'');
    }
    m.name = m.customName.trim() || autoName(m);
  }
  function autoName(m){
    const parts=['MH'];
    for(const cat of TAXONOMY){const val=m.classification?.[cat.key];const item=cat.options.find(([label])=>label===val);if(item) parts.push(item[1]);}
    parts.push(String(m.autoIndex||1).padStart(3,'0'));
    return parts.join('-');
  }
  function statusOptions(mode){
    const items=[['measured','Known / measured'],['unknown','Unknown'],['infer','Request inference']];
    return items.map(([v,label])=>`<option value="${v}" ${v===mode?'selected':''}>${label}</option>`).join('');
  }
  function topField(label,key,value,placeholder,extra=''){
    return `<label class="wizard-field"><span>${esc(label)}</span><input data-wiz-top="${key}" inputmode="decimal" type="number" step="any" value="${esc(value??'')}" placeholder="${esc(placeholder)}" ${extra}/></label>`;
  }
  function invertXYField(label,key,value,placeholder){
    return `<label class="wizard-field"><span>${esc(label)}</span><input data-wiz-invert-xy="${key}" inputmode="decimal" type="number" step="any" value="${esc(value??'')}" placeholder="${esc(placeholder)}" /></label>`;
  }
  function levelField(label,key,m){
    const status=m.evidence?.levels?.[key]||'unknown';
    return `<div class="wizard-level"><label class="wizard-field"><span>${esc(label)} (m RL)</span><input data-wiz-level="${key}" type="number" step="any" inputmode="decimal" value="${status==='measured'?esc(m[key]??''):''}" placeholder="e.g. 100.250" ${status==='measured'?'':'disabled'}/></label><label class="wizard-field wizard-status"><span>Evidence status</span><select data-wiz-level-mode="${key}">${statusOptions(status)}</select></label></div>`;
  }
  function coordinates(m,p){
    const geo=p.coordMode==='geographic';
    return `<div class="wizard-section-intro">Enter measured information only. <b>Top</b> and <b>invert</b> positions can differ; blank invert coordinates are not assumed to match the top.</div>
      <div class="wizard-subcard"><div class="wizard-subhead"><span class="wizard-dot">1</span><strong>Manhole identification</strong></div>
        <label class="wizard-field"><span>Custom manhole name <small>(optional)</small></span><input data-wiz-custom-name="true" type="text" maxlength="90" placeholder="Leave blank to generate the name" value="${esc(m.customName)}" /></label>
        <div class="wizard-generated"><div><small>Current name</small><strong data-wiz-name-preview>${esc(m.name)}</strong></div><button class="btn btn-outline btn-sm" type="button" data-wiz-auto-name>Use auto name</button></div>
      </div>
      <div class="wizard-subcard"><div class="wizard-subhead"><span class="wizard-dot">2</span><strong>Top / cover point</strong></div>
        <div class="wizard-two-cols">${geo?topField('Latitude','lat',m.lat,'30.116926')+topField('Longitude','lon',m.lon,'31.881307'):topField('Easting X (m)','x',m.x,'500000.000')+topField('Northing Y (m)','y',m.y,'3330000.000')}</div>
        ${levelField('Top / cover RL','cover',m)}</div>
      <div class="wizard-subcard"><div class="wizard-subhead"><span class="wizard-dot">3</span><strong>Invert / base point</strong></div>
        <div class="wizard-two-cols">${geo?invertXYField('Invert latitude','lat',m.invertPosition.lat,'optional')+invertXYField('Invert longitude','lon',m.invertPosition.lon,'optional'):invertXYField('Invert Easting X (m)','x',m.invertPosition.x,'optional')+invertXYField('Invert Northing Y (m)','y',m.invertPosition.y,'optional')}</div>
        ${levelField('Main invert RL','invert',m)}</div>
      <div class="wizard-subcard"><label class="wizard-field"><span>Survey / evidence notes</span><textarea data-wiz-notes="true" rows="3" placeholder="Photo ref, survey date, drawing ref, observation...">${esc(m.notes||'')}</textarea></label></div>`;
  }
  function taxonomyStep(m,cat){
    const val=m.classification[cat.key];
    return `<div class="wizard-section-intro">${esc(cat.hint)} This is a classification of an <b>existing asset</b>; no design is generated.</div>
      <div class="wizard-taxonomy"><label class="wizard-field"><span>${esc(cat.title)}</span><select data-wiz-class="${cat.key}">
        <option value="" ${val===''?'selected':''}>Unknown / not recorded</option>
        <option value="${UNKNOWN}" ${val===UNKNOWN?'selected':''}>Unknown — request inference</option>
        ${cat.options.map(([label])=>`<option value="${esc(label)}" ${val===label?'selected':''}>${esc(label)}</option>`).join('')}
      </select></label>
      <div class="wizard-selected-state">${val===UNKNOWN?'Inference requested — no classification assumed.':val?`Recorded classification: <b>${esc(val)}</b>`:'No classification selected yet.'}</div></div>
      <div class="wizard-recap"><span>Auto-generated name</span><strong data-wiz-name-preview>${esc(autoName(m))}</strong><small>Selected categories are abbreviated. Unknown categories are omitted.</small></div>`;
  }
  function render(m,p){
    ensure(m,p);
    const step=STEPS[currentStep];
    let content = step.key==='coordinates' ? coordinates(m,p) : step.key==='details'
      ? window.SubterraDetails.render(m) : taxonomyStep(m,TAXONOMY.find(c=>c.key===step.key));
    const completed=TAXONOMY.filter(c=>c.options.some(([label])=>label===m.classification[c.key])).length;
    const pending=window.SubterraDetails.countRequests(m) + TAXONOMY.filter(c=>m.classification[c.key]===UNKNOWN).length;
    return `<section class="wizard"><div class="wizard-topline"><div><span class="wizard-kicker">MANHOLE RECORD · STEP ${currentStep+1} OF ${STEPS.length}</span><h3>${esc(step.title)}</h3></div><span class="wizard-progress">${completed}/6 classified</span></div>
      <div class="wizard-step-grid" aria-label="Manhole entry steps">${STEPS.map((s,i)=>`<button class="wizard-step ${i===currentStep?'active':''}" type="button" data-wiz-step="${i}" title="${esc(s.title)}"><span>${i+1}</span><small>${esc(s.short)}</small></button>`).join('')}</div>
      ${content}
      <div class="wizard-summary"><span>${pending} inference request${pending===1?'':'s'}</span><span>Saved locally · Not inferred</span></div>
      <div class="wizard-nav"><button type="button" class="btn btn-outline btn-sm" data-wiz-prev ${currentStep===0?'disabled':''}>← Previous</button><button type="button" class="btn btn-primary btn-sm" data-wiz-next ${currentStep===STEPS.length-1?'disabled':''}>Next step →</button></div>
    </section>`;
  }
  function resetStep(){currentStep=0;}
  function setStep(index){currentStep=Math.max(0,Math.min(STEPS.length-1,index));}
  function updateName(m){m.name=m.customName.trim() || autoName(m);}
  function refreshName(m){
    document.querySelectorAll('[data-wiz-name-preview]').forEach(el=>{el.textContent=el.closest('.wizard-recap')?autoName(m):m.name;});
    const button=Array.from(document.querySelectorAll('[data-select-mh]')).find(el=>el.dataset.selectMh===m.id);
    if(button) button.querySelector('strong').textContent=m.name;
    api.drawCanvas();
  }
  function setup(bridge){
    api=bridge;
    document.addEventListener('click', e=>{
      const target=e.target.closest('button');if(!target)return;
      const m=api.getSelectedMh();if(!m)return;
      if(target.hasAttribute('data-wiz-step') || target.hasAttribute('data-wiz-prev') || target.hasAttribute('data-wiz-next')){
        const panel=document.querySelector('#inspectorBody');
        setStep(target.hasAttribute('data-wiz-step')?Number(target.dataset.wizStep):currentStep+(target.hasAttribute('data-wiz-next')?1:-1));
        api.renderInspector(); if(panel) panel.scrollTop=0;
      } else if(target.hasAttribute('data-wiz-auto-name')){
        m.customName='';updateName(m);api.save();api.renderInspector();api.drawCanvas();
      }
    });
    const change=e=>{
      const el=e.target,m=api.getSelectedMh(),p=api.active();if(!m||!p)return;
      ensure(m,p);
      if(el.hasAttribute('data-wiz-class')){
        const key=el.dataset.wizClass;
        const cat=TAXONOMY.find(c=>c.key===key);
        if(!cat || (el.value!==''&&el.value!==UNKNOWN&&!cat.options.some(([label])=>label===el.value)))return;
        m.classification[key]=el.value;updateName(m);api.save();api.renderInspector();api.drawCanvas();
      } else if(el.hasAttribute('data-wiz-level-mode')){
        const key=el.dataset.wizLevelMode;
        if(!['cover','invert'].includes(key))return;
        const mode=el.value;
        if(!['measured','unknown','infer'].includes(mode))return;
        window.SubterraDetails.ensure(m);
        m.evidence.levels[key]=mode;
        if(mode!=='measured')m[key]='';
        api.save();api.renderInspector();api.drawCanvas();
      }
    };
    document.addEventListener('change',change);
    document.addEventListener('input',e=>{
      const el=e.target,m=api.getSelectedMh(),p=api.active();if(!m||!p)return;
      ensure(m,p);
      if(el.hasAttribute('data-wiz-custom-name')){
        m.customName=el.value;updateName(m);api.save();refreshName(m);
      } else if(el.hasAttribute('data-wiz-top')){
        const key=el.dataset.wizTop;
        if(!['lat','lon','x','y'].includes(key))return;
        if(el.value!==''&&!Number.isFinite(Number(el.value)))return;
        m[key]=el.value;api.save();api.refreshLocation();
      } else if(el.hasAttribute('data-wiz-invert-xy')){
        const key=el.dataset.wizInvertXy;
        if(!['lat','lon','x','y'].includes(key))return;
        if(el.value!==''&&!Number.isFinite(Number(el.value)))return;
        m.invertPosition[key]=el.value;api.save();
      } else if(el.hasAttribute('data-wiz-level')){
        const key=el.dataset.wizLevel;
        if(!['cover','invert'].includes(key))return;
        if(el.value!==''&&!Number.isFinite(Number(el.value)))return;
        m[key]=el.value;window.SubterraDetails.ensure(m);m.evidence.levels[key]='measured';api.save();
      } else if(el.hasAttribute('data-wiz-notes')){
        m.notes=el.value;api.save();
      }
    });
  }
  window.SubterraWizard={TAXONOMY, STEPS, ensure, autoName, render, resetStep, setup};
})();