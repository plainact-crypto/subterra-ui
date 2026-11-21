/* NCSF browser-workflow smoke test against the REAL 4-stage JSON fixture. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const bundle=read("data/demo/NCSF_87_MH_Pipe56_Four_Rounds.json");
const catalog=read("data/field-catalog-v2.json");
const holdout=read("data/demo/NCSF_103_Historical_Pipes_HOLDOUT.json");
const page={innerHTML:""},notification={hidden:true,textContent:""};
const handlers={},memory={};
const window={location:{search:"?demo=ncsf&v=2.1"},confirm:()=>true,prompt:()=>"Accepted simulated demonstration"};
const document={
 getElementById:(id)=>id==="app"?page:notification,
 addEventListener:(type,callback)=>handlers[type]=callback,
 createElement:()=>({click(){}})
};
const localStorage={
 getItem:key=>memory[key]??null,
 setItem:(key,val)=>memory[key]=val,
 removeItem:key=>delete memory[key]
};
const fetch=async url=>({
 ok:true,
 json:async()=>url.includes("field-catalog")?catalog:
    url.includes("NCSF_87_MH_Pipe56")?bundle:
    url.includes("NCSF_103_Historical_Pipes")?holdout:Promise.reject(new Error("Unexpected URL "+url))
});
const FormData=class{constructor(){this.items=[];}entries(){return this.items;}};
const Blob=class{};
const URL={createObjectURL:()=>"#",revokeObjectURL:()=>{}};
const code=fs.readFileSync(path.join(root,"v2-engine.js"),"utf8");
new Function("window",code)(window);
const app=fs.readFileSync(path.join(root,"v2-app.js"),"utf8");
new Function("window","document","localStorage","fetch","FormData","Blob","URL","setTimeout",app)
 (window,document,localStorage,fetch,FormData,Blob,URL,setTimeout);
const tick=async()=>{await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));};
const project=()=>JSON.parse(memory.subterra_v2_survey_first||"null");
const click=(action,additional={})=>{
 const attrs={action,...additional},target={dataset:attrs};
 handlers.click({target:{closest:()=>target}});
};
const tab=name=>handlers.click({target:{closest:()=>({dataset:{tab:name}})}});
(async()=>{
 await tick();
 assert.equal(project()?.demo?.stage,0,"Direct deep link must open Round 00");
 assert.equal(project().manholes.length,87);
 assert.ok(page.innerHTML.includes("SIMULATED — NOT A REAL FIELD SURVEY"));
 assert.ok(page.innerHTML.includes("14.0"));
 assert.ok(page.innerHTML.includes("Run Next Simulated Survey Round"));
 for(const [i,expected] of [[1,49],[2,70],[3,100]]){
  click("demo-next");await tick();
  assert.equal(project()?.demo.stage,i);
  assert.equal(window.SubterraV2.assess(project()).score,expected);
  assert.ok(page.innerHTML.includes(expected.toFixed(1)));
 }
 assert.ok(page.innerHTML.includes("All 4 demonstration rounds completed"));
 click("map-scope");
 assert.ok(page.innerHTML.includes("Zoom to Pipe 56"));
 tab("rounds");
 assert.ok(page.innerHTML.includes("Replay the four simulated rounds"));
 assert.ok(page.innerHTML.includes("Compare with Historic GIS Pipe 56"));
 click("historic-compare");await tick();
 assert.ok(page.innerHTML.includes("HISTORICAL RECORD / NOT GROUND TRUTH"));
 assert.ok(page.innerHTML.includes("2004 recorded GIS centerline length"));
 click("demo-stage",{index:"1"});await tick();
 assert.equal(project().demo.stage,1);
 assert.ok(!page.innerHTML.includes("HISTORICAL RECORD / NOT GROUND TRUTH"));
 click("accept");
 assert.equal(project().accepted?.status,"USER_ACCEPTED_WITH_UNRESOLVED_RISK");
 console.log("NCSF UI validated: deep link, real 87-MH fixture, 14→49→70→100 round buttons, 87-site zoom, deferred holdout comparison, replay and acceptance.");
})().catch(error=>{console.error(error);process.exitCode=1;});
