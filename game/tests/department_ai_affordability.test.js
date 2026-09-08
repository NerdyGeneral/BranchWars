'use strict';
// --candidate-patch runs a quarantined in-memory repair while a release gate
// holds production bytes frozen. Default checks use a small, explicitly scoped
// planner fixture. Optional --checkpoint[=path] reproduces a saved diagnosis;
// --checkpoint --continue retains that RNG and resolves the remaining months.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto'),{validate,metrics}=require('../tools/institution_qa_fixture');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(x).digest('hex');
const checkpointArg=process.argv.find(x=>x==='--checkpoint'||x.startsWith('--checkpoint='));
const checkpointPath=checkpointArg?(checkpointArg.includes('=')?path.resolve(checkpointArg.slice(13)):
 path.join(root,'reports/qa/institution-failure-7e5f2e4c5c07-204.json')):null;
const checkpointText=checkpointPath?fs.readFileSync(checkpointPath,'utf8'):null,checkpoint=checkpointText?JSON.parse(checkpointText):null;
assert(!process.argv.includes('--continue')||checkpoint,'Use --checkpoint with --continue.');
const patch=fs.readFileSync(path.join(root,'experiments/institution/department-ai-affordability.patch'),'utf8').replace(/\r\n/g,'\n');
const lines=patch.split('\n'),before=lines.filter(x=>x.startsWith('-')).map(x=>x.slice(1)).join('\n'),after=lines.filter(x=>x.startsWith('+')).map(x=>x.slice(1)).join('\n');
const html=require('../tools/build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const candidateMode=process.argv.includes('--candidate-patch');
let candidate=source,baseline=source;
if(candidateMode){if(checkpoint)assert.equal(hash(source),checkpoint.engineHash,'Frozen production engine changed before experiment capture');assert.equal(source.split(before).length,2);candidate=source.replace(before,after);}
else{assert(source.includes(after),'Production must contain the approved AI affordability repair');baseline=source.replace(after,before);}
if(process.argv.includes('--mandatory-preview')){
 assert(candidateMode,'Use --candidate-patch with --mandatory-preview.');
 candidate=require('../experiments/institution/patch-engine.cjs')(candidate,['department-mandatory-obligations.patch']);
}
function load(code,diagnostic=false){const ctx={console};
 if(diagnostic)code=code.replace(before,'  root.failedDepartmentCandidate={index,plan:departmentCopy(plan)};\n'+before);
 code=code.replace('root.BWEngine={','root.BWEngine={planDepartments,');
 vm.runInNewContext(code,ctx,{filename:diagnostic?'department-ai-before.js':'department-ai-candidate.js'});return ctx;}
const original=load(baseline,true),fixed=load(candidate),E=fixed.BWEngine;
let failing=null,game;
if(checkpoint){
 for(const seat of [0,1])try{original.BWEngine.chooseBot(copy(checkpoint.game),seat);}catch(error){
  if(/Leadership appointment exceeds/.test(error.message)){failing=copy(original.failedDepartmentCandidate);break;}throw error;}
 game=copy(checkpoint.game);
}else{
 const O=original.BWEngine,options=O.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
 game=O.createGame({...options,mode:'hotseat',seed:'department-ai-affordability',created:1});
 const plan=O.chooseBot(game,0),p=game.players[0];
 // Planner-only boundary fixture, not a claimed played campaign. Existing eight
 // employees include three qualified business bankers; no extra staff or money.
 p.workforce.departments.business.count=3;p.workforce.departments.business.skill=20;
 p.allocation={service:3,business:3,lending:1,operations:1};
 const move=p.accounting.accounts.cash-792000;
 p.accounting=O.AccountingPrototype.post(p.accounting,'fixture.assetAllocation',{cash:-move,securities:move});
 p.stats.cash=p.accounting.accounts.cash;p.stats.lastProfit=130000;game.cycle=6;
 // Both capability instructions remain within their individual per-cycle cap.
 // The deliberately unaffordable combined INTERMEDIATE proposal is what the
 // final AI reserve pass will later trim; it is not claimed as a valid turn.
 Object.assign(plan,{allocation:copy(p.allocation),investments:{network:200000,digital:200000},newProjects:[],newProject:null,hires:0,competitiveAction:'none'});
 plan.facilityPolicy={convert:null,cancel:null};for(const role of Object.keys(plan.specialistHires))plan.specialistHires[role]=0;
 assert.throws(()=>O.planDepartments(game,0,plan),/Leadership appointment exceeds/);
 failing=copy(original.failedDepartmentCandidate);
}
assert(failing,'Fixture must reproduce the original speculative-appointment failure');
const player=game.players[failing.index],state=JSON.stringify(player);
assert.throws(()=>E.normalizeDepartmentPlan(player,copy(failing.plan)),/Leadership appointment exceeds/);
const repaired=E.planDepartments(game,failing.index,copy(failing.plan));
assert.doesNotThrow(()=>E.normalizeDepartmentPlan(player,copy(repaired)));
assert.equal(JSON.stringify(player),state,'AI repair cannot change live leaders, liabilities or balances');
for(const key of ['investments','newProjects','allocation','workforcePolicy','departmentPolicy'])assert.deepEqual(copy(repaired[key]),copy(failing.plan[key]));
assert(Object.values(repaired.leaderOrders).every(value=>value===null));
let checks=4,resolved=0,pendingPlans=null,submittingSeat=null;
const target=checkpoint?(process.argv.includes('--continue')?480-checkpoint.resolved:1):0,start=Date.now();
console.log(JSON.stringify({suite:'department-ai-affordability',stage:'regression-passed',checks,checkpointCycle:checkpoint?game.cycle:null,
 checkpointHash:checkpointText?hash(checkpointText):null,originalEngineHash:checkpoint?.engineHash||hash(baseline),candidateEngineHash:hash(candidate),candidateMode,targetMonths:target}));
try{
 if(checkpoint)validate(E,game,true);
 while(resolved<target&&!game.gameOver){
  pendingPlans=null;submittingSeat=null;
  const plans=game.players.map((p,i)=>E.chooseBot(game,i));pendingPlans=plans;
  for(const seat of [0,1]){submittingSeat=seat;E.submit(game,seat,plans[seat]);}
  resolved++;submittingSeat=null;
  validate(E,game,resolved%24===0||resolved===target||!!game.gameOver);
  if(resolved%24===0)console.log(JSON.stringify({stage:'continuation',resolved,totalResolved:checkpoint.resolved+resolved,cycle:game.cycle,seconds:(Date.now()-start)/1000}));
 }
}catch(error){
 const directory=path.join(root,'reports/qa');fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,'institution-failure-'+hash(candidate).slice(0,12)+'-'+game.cycle+'.json');
 const diagnosis={spec:checkpoint.spec,resolved:checkpoint.resolved+resolved,submittingSeat,
  htmlHash:hash(html),engineHash:hash(candidate),sourceEngineHash:hash(source),parentCheckpointHash:hash(checkpointText),
  error:error.stack,game,pending:pendingPlans};
 if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(diagnosis)+'\n',{flag:'wx'});
 console.error(JSON.stringify({stage:'continuation-failed',resolved,totalResolved:checkpoint.resolved+resolved,cycle:game.cycle,file,error:error.stack}));throw error;
}
console.log(JSON.stringify({suite:'department-ai-affordability',checks,resolved,totalResolved:checkpoint?checkpoint.resolved+resolved:null,
 seconds:(Date.now()-start)/1000,candidateEngineHash:hash(candidate),...(checkpoint?metrics(E,game):{}),
 note:checkpoint?'Continuation preserves captured state and RNG. No funding gifts, forced survival, or production writes.':
 'Self-contained planner boundary fixture, not a full campaign or performance claim.'}));
