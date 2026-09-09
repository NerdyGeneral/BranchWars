'use strict';
// Optional, read-only mature-save navigation microbenchmark. This intentionally
// isolates routing/public-view construction; it is NOT full renderer latency.
// node game/tools/measure_navigation.js --baseline <commit> --save <raw-save.json>
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createHash}=require('node:crypto'),{performance}=require('node:perf_hooks');
const args=process.argv.slice(2),at=flag=>args[args.indexOf(flag)+1];
if(args.length!==4||!args.includes('--baseline')||!args.includes('--save'))throw Error('Usage: measure_navigation.js --baseline <commit> --save <raw-save.json>');
const baseline=at('--baseline'),savePath=path.resolve(at('--save')),root=path.resolve(__dirname,'../..');
const sha=x=>createHash('sha256').update(x).digest('hex'),input=fs.readFileSync(savePath),rows=[];
process.argv.push('--source');const {harness}=require('../tests/github_resilience.test.js');
const old=file=>execFileSync('git',['show',baseline+':game/src/ui/'+file],{cwd:root,encoding:'utf8',maxBuffer:2e6});
const oldDraft=old('draft.js'),oldNavigation=old('workspace-navigation.js');
for(const variant of ['baseline','candidate']){
 const h=harness();h.c.measureInput=input.toString();h.c.requestAnimationFrame=fn=>fn();
 const find=h.c.document.querySelector;h.c.document.querySelector=selector=>{const el=find(selector);el.style||={};el.offsetHeight=100;el.scrollIntoView||=()=>{};return el;};
 h.c.window.innerWidth=1265;h.c.window.matchMedia=()=>({matches:true});
 h.run("game=migrateGame(JSON.parse(measureInput));seat=0;gh.active=false;p2pRole='';newDraft(currentView());");
 delete h.c.measureInput;
 if(variant==='baseline'){
  h.run(oldDraft.slice(oldDraft.indexOf('function setWorkspaceTab(')));
  // Declarations already exist in the current client. Replace only routing
  // functions, keeping the tested engine and data identical in both cases.
  h.run(oldNavigation.slice(oldNavigation.indexOf('function availableWorkspaces(')));
 }
 h.run("for(const key of ['renderFacilityNetwork','renderFacilityLifecycle','renderProductPrograms','renderCollections','renderFinancialGroup','renderHouseholds','renderWorkforce','renderBankOverview'])eval(key+'=()=>{}');monthlyPlanReview=()=>({});const measureCurrentView=currentView;let measureCalls=0;currentView=function(){measureCalls++;return measureCurrentView()};");
 const before=sha(h.run('JSON.stringify({game,draft})'));
 for(const action of ["setWorkspaceTab('products')","setWorkspaceTab('workforce')","setWorkspaceTab('overview')","selectWorkspaceGroup('customers')"]){
  const timings=[],counts=[];
  for(let trial=0;trial<5;trial++){h.run('measureCalls=0');const started=performance.now();h.run(action);timings.push(performance.now()-started);counts.push(h.run('measureCalls'));}
  timings.sort((a,b)=>a-b);rows.push({variant,action,viewCalls:counts,medianMs:Number(timings[2].toFixed(3)),minMs:Number(timings[0].toFixed(3)),maxMs:Number(timings[4].toFixed(3))});
 }
 if(sha(h.run('JSON.stringify({game,draft})'))!==before)throw Error('Navigation changed campaign or draft');
}
console.log(JSON.stringify({scope:'Routing and actual public-view construction only; business painters are inert. No balance, frame-time or full-renderer claim.',baseline,baselineDraftSha256:sha(oldDraft),saveSha256:sha(input),saveBytes:input.length,candidateSha256:sha(require('./build_game').assemble().html),rows},null,2));
