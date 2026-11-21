/* SUBTERRA v0.13 — Pipe 56 Phase 2B: theoretical Manning full-flow scenarios.
   Consumes the separately frozen and validated Phase 2A candidate ONLY.
   No GIS reference data, observed pipes or actual flow measurement is used. */
(() => {
  'use strict';
  const CASE='NCSF-P56-BLIND-V1';
  const N_VALUES=[0.011,0.013,0.015];
  const SOURCE='U.S. EPA SWMM 5.1 User Manual, Appendix A.7: Vitrified clay pipe n=0.011–0.015';
  const URL='https://19january2021snapshot.epa.gov/sites/static/files/2019-02/documents/epaswmm5_1_manual_master_8-2-15.pdf';
  function compute(phase2a) {
    if(phase2a?.schema!=='subterra-pipe56-phase2a-result/v1' ||
      phase2a.caseId!==CASE || phase2a.stage!=='CALCULATED_FROZEN')
      throw Error('A verified, frozen Pipe 56 Phase 2A result is required');
    const diameter=phase2a.engineering?.documentedNominalDiameterMm;
    const drop=phase2a.engineering?.straightLineInvertDropM;
    const length=phase2a.engineering?.horizontalDistanceM;
    if(![diameter,drop,length].every(v=>typeof v==='number'&&Number.isFinite(v)) ||
       diameter<=0||drop<=0||length<=0)throw Error('Invalid Phase 2A hydraulic inputs');
    const D=diameter/1000; // nominal diameter as assumed internal hydraulic diameter
    const S=drop/length;
    if(!(S>0))throw Error('Gravity slope must be positive');
    const area=Math.PI*D**2/4;
    const wettedPerimeter=Math.PI*D;
    const radius=area/wettedPerimeter;
    const scenarios=N_VALUES.map(n=>{
      const velocityMps=(1/n)*radius**(2/3)*Math.sqrt(S);
      const capacityM3s=area*velocityMps;
      return {manningN:n,assumedCondition:'FULL_CIRCULAR_PIPE_UNIFORM_GRAVITY_FLOW',
        velocityMps,capacityM3s,capacityLps:1000*capacityM3s};
    });
    return {
      schema:'subterra-pipe56-phase2b-hydraulics/v1',
      caseId:CASE,stage:'CALCULATED_FROZEN',
      basis:'FROZEN_PHASE_2A_GEOMETRIC_HYPOTHESIS',
      condition:'THEORETICAL_FULL_FLOW_UNIFORM_GRAVITY',
      inputs:{
        nominalDiameterMm:diameter,
        assumedInternalDiameterM:D,
        straightLineGradient:S,
        candidateDistanceM:length,
        candidateInvertDropM:drop,
        roughnessRange:[...N_VALUES],
        baseManningN:0.013
      },
      equations:{
        area:'A=pi*D^2/4',
        wettedPerimeter:'P=pi*D',
        hydraulicRadius:'R=A/P=D/4',
        velocity:'V=(1/n)*R^(2/3)*sqrt(S)',
        capacity:'Q=A*V'
      },
      geometry:{areaM2:area,wettedPerimeterM:wettedPerimeter,hydraulicRadiusM:radius},
      scenarios,
      assumptions:{
        diameter:'Documented DN 304.8 mm nominal size is used as an assumed internal diameter. Actual bore is unknown.',
        slope:'Slope uses the hypothesis between preselected manhole openings and straight-line endpoint separation; NOT a verified pipe gradient.',
        regime:'Uniform, steady, gravity, full-flow open-channel limiting scenario; not pressure-network modelling.',
        roughness:'Values are example literature scenarios for vitrified clay, not observed roughness of this existing pipe.',
        dataAge:'Original openings are historical AutoCAD records; physical condition and deposits unknown.'
      },
      source:{description:SOURCE,url:URL,roughnessValuesAre:'LITERATURE_ASSUMPTIONS_NOT_MEASUREMENTS'},
      assessments:{
        theoreticalFullFlowHydraulics:'COMPUTED_CONDITIONALLY',
        gravityPlausibility:'POSITIVE_DROP_IF_OPENINGS_AND_DATUM_COMPATIBLE',
        selfCleansingAtActualFlow:'NOT_ASSESSED_WITHOUT_FLOW',
        maximumVelocityCompliance:'NOT_ASSESSED_AGAINST_HISTORIC_APPROVED_STANDARD',
        actualDischarge:'UNKNOWN',
        actualVelocity:'UNKNOWN',
        actualFlowDepth:'UNKNOWN',
        pipeCondition:'UNKNOWN',
        verifiedAlignment:'UNKNOWN',
        fieldAccuracy:'NOT_MEASURED'
      },
      limitations:[
        'Full-flow Manning velocity is a theoretical capacity scenario, not observed speed in the existing sewer.',
        'No flow rate, depth of flow, filling ratio, inflow, pipe roughness survey or service condition measurements are available.',
        'No approval against present-day or construction-era design limits is claimed.',
        'Roughness uncertainty is illustrated by n=0.011/0.013/0.015, but it is not a calibrated probability or confidence interval.',
        'No historical GIS route is used or revealed by this calculation.'
      ]
    };
  }
  function verify(phase2a,stored) {
    if(!stored||typeof stored!=='object')return {pass:false,reason:'No saved hydraulic calculation'};
    try{
      const expected=compute(phase2a);
      const same=JSON.stringify(expected)===JSON.stringify(stored);
      return {pass:same,reason:same?'Hydraulic scenarios reproduce frozen snapshot':'Hydraulic snapshot differs from recomputation'};
    }catch(err){return {pass:false,reason:String(err?.message||err)};}
  }
  window.SubterraPipe56Hydraulics={compute,verify,version:1};
})();