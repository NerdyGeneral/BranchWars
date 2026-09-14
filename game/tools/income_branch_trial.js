'use strict';
// Actual-turn, same-start comparison. No projected office is installed directly.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),[priorName,name,count]=process.argv.slice(2),months=Number(count);
if(process.argv.length!==5||!/^[a-z0-9-]+$/.test(priorName||'')||!/^income-branch-[a-z0-9-]+$/.test(name||'')||![1,12,24,120].includes(months))throw Error('Usage: node tools/income_branch_trial.js prior-output-folder income-branch-unique 1|12|24|120');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(x).digest('hex'),prior=path.join(root,'output',priorName),previous=JSON.parse(fs.readFileSync(path.join(prior,'report.json'))),bytes=fs.readFileSync(path.join(prior,'closing.json.gz'));
assert.equal(previous.running,false,'Only terminal evidence can seed a comparison');assert(!previous.failure,'Failed evidence must not become a successful baseline');
assert.equal(hash(bytes),previous.closingSnapshotSha256);assert.equal(hash(fs.readFileSync(path.join(prior,'engine.html'))),previous.portableSha256);
const html=require('./build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={};
// Expose existing planning/validation functions only; change no economic rule.
const exposed=source.replace('root.BWEngine={','root.BWEngine={facilityInvestmentDraft,planDepartmentFunctionsCore,facilityContext,validatePlan,validatePortfolioPlan,');assert.notEqual(source,exposed);
vm.runInNewContext(exposed,context);const E=context.BWEngine,opening=E.migrateCampaign(JSON.parse(zlib.gunzipSync(bytes)));
assert(!opening.gameOver,'Never revive an ended campaign');assert.equal(opening.bankEconomicsVersion,1);assert.equal(opening.creditWorkloadVersion,1);
E.validatePilot(opening);E.validateLedger(opening);
const office=opening.players[0].facilityNetwork.offices.find(o=>o.closedCycle===null&&o.model==='atm');
assert(office,'This bounded trial needs a real existing ATM to convert');
const folder=path.join(root,'output',name);fs.mkdirSync(folder);
fs.writeFileSync(path.join(folder,'engine.html'),html,{flag:'wx'});fs.writeFileSync(path.join(folder,'opening.json.gz'),bytes,{flag:'wx'});
const arms=['ordinary','defer','lending-office'].map(kind=>({kind,g:copy(opening),history:[],totals:[{},{}]}));
const report={portableSha256:hash(html),engineSha256:hash(source),snapshotSha256:hash(bytes),predecessor:priorName,requestedMonths:months,fromMonth:opening.cycle-1,officeId:office.id,
 scope:'Three actual-turn continuations of the same active saved campaign. Seat 1 remains ordinary AI. Seat 0 ordinary versus deferring unstarted research/projects versus that deferral plus a paid retail conversion and up to two existing employees reassigned to lending. Existing obligations remain; shared planners rebuild legal work. No money, assets, customers or staff injected. Strategies may be rejected and those failures are reported. Not a new-game balance matrix or proof of optimal play.',arms:[]};
const start=performance.now();
function write(running){report.running=running;report.elapsedMs=Math.round(performance.now()-start);report.arms=arms.map(a=>({kind:a.kind,history:a.history,totals:a.totals,gameOver:a.g.gameOver,endReason:a.g.endReason||null,failure:a.failure||null,closingSnapshotSha256:a.closingSnapshotSha256||null}));fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');}
function proposal(g,base,kind){
 if(kind==='ordinary')return {plan:base,accepted:true};
 const p=g.players[0];let plan=E.facilityInvestmentDraft(base);
 if(kind==='lending-office'){
  let left=2;for(const role of ['business','service']){const move=Math.min(left,Math.max(0,plan.allocation[role]-1));plan.allocation[role]-=move;plan.allocation.lending+=move;left-=move;}
  assert.equal(Object.values(plan.allocation).reduce((a,b)=>a+b,0),p.stats.staff);
  plan.lendingPolicy='balanced';
  const site=p.facilityNetwork.offices.find(o=>o.id===office.id);
  if(site&&site.closedCycle===null&&site.model==='atm'&&!site.conversion){
   const request={officeId:site.id,model:'retail'},q=E.FacilityNetwork.quote(p,request,E.facilityContext(g,p,plan));
   if(q.eligible)plan.facilityPolicy={convert:request,cancel:null};
  }
 }
 plan=E.planDepartmentFunctionsCore(g,0,plan,true);
 plan.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,plan).policy;
 const work=E.departmentFunctionsQuote(g,p,plan),local=E.lifecycleInstructionQuote(g,p,plan);
 if(!work.status.eligible||!local.status.eligible)return {plan:base,accepted:false,reason:work.status.reason||local.status.reason};
 try{E.validatePortfolioPlan(p,plan,g);E.validatePlan(g,p,plan);}catch(error){return {plan:base,accepted:false,reason:error.message};}
 return {plan,accepted:true};
}
write(true);
for(let step=0;step<months;step++)for(const arm of arms){
 if(arm.g.gameOver||arm.failure)continue;
 const g=arm.g,month=g.cycle;
 try{
  const plans=g.players.map((_,i)=>E.chooseBot(g,i)),before=JSON.stringify(g),selected=proposal(g,plans[0],arm.kind);
  assert.equal(JSON.stringify(g),before,'Preparing the trial changed the campaign');plans[0]=selected.plan;
  const openingStats=copy(g.players.map(p=>p.stats));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);
  const banks=g.players.map((p,i)=>{
   const r=p.operatingReport;assert(E.IncomeReview.reconciliation(r).reconciled);
   const roots=g.eventLedger.filter(e=>e.cycle===month&&e.target===p.id&&e.category==='resolution.start');assert.equal(roots.length,1);
   const changes=g.eventLedger.filter(e=>e.parentCause===roots[0].id&&e.target===p.id&&e.deltas);
   for(const field of ['earnings','cash','loans'])assert.equal(changes.reduce((n,e)=>n+(e.deltas[field]||0),0),p.stats[field]-openingStats[i][field],field+' causal bridge');
   for(const k of ['loanIncome','depositIncome','commercialIncome','otherIncome','fundingCost','expense','chargeoff','profit'])arm.totals[i][k]=(arm.totals[i][k]||0)+r[k];
   return {stats:copy(p.stats),operatingReport:copy(r),plan:copy(plans[i]),offices:copy(p.facilityNetwork.offices),allocation:copy(p.allocation)};
  });
  arm.history.push({month,accepted:selected.accepted,reason:selected.reason||null,banks});console.log(arm.kind+' month '+month+'; accepted '+selected.accepted+'; loans '+banks.map(b=>b.stats.loans).join('/'));
 }catch(error){arm.failure={month,message:error.stack};process.exitCode=1;console.error(arm.kind+': '+error.stack);}
 write(true);
}
for(const arm of arms){const b=zlib.gzipSync(JSON.stringify(arm.g));fs.writeFileSync(path.join(folder,arm.kind+'-closing.json.gz'),b,{flag:'wx'});arm.closingSnapshotSha256=hash(b);}
write(false);console.log(JSON.stringify({folder,arms:report.arms.map(a=>({kind:a.kind,months:a.history.length,ended:a.gameOver,failure:a.failure}))}));
