'use strict';
// Paid, finite policy experiment. Never changes engine rates, reserves or saves
// to obtain a preferred outcome. A failed proposal is recorded, not hidden.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {runtime,bankingProposal,serviceAwareProposal}=require('./income_banking_trial');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function conventionalProposal(E,g,index,base,expand){
 const p=g.players[index],input=copy(base);
 // Unlike the earlier lending trial, do not inherit a recovery AI's seven or
 // eight Operations employees as a minimum. Two is a tested policy choice,
 // not free Risk coverage: shortfalls, morale and losses still settle normally.
 input.allocation.operations=Math.min(2,p.stats.staff);
 let selected=bankingProposal(E,g,index,input,'lending');
 if(!selected.accepted)return selected;
 if(!expand){
  const plan=E.facilityInvestmentDraft(copy(selected.plan));plan.hires=0;
  if(plan.projectTargets!==undefined)plan.projectTargets={};
  plan.departmentFunctionsPolicy=E.planDepartmentFunctionsCore(g,index,plan,true).departmentFunctionsPolicy;
  plan.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,plan).policy;
  try{E.validatePortfolioPlan(p,plan,g);E.validatePlan(g,p,plan);}catch(error){return {plan:base,accepted:false,reason:error.message,steps:selected.steps};}
  selected={...selected,plan,steps:[...selected.steps,{action:'defer-new-expansion',accepted:true}]};
 }
 return serviceAwareProposal(E,g,index,selected);
}
function main(){
 const [name,scenario='balanced',seed='business-balance:1',monthsText='24']=process.argv.slice(2),months=Number(monthsText);
 assert(/^stabilization68-[a-z0-9-]+$/.test(name||''));assert(['balanced','rate','regulatory','growth'].includes(scenario));assert(/^business-balance:[12]$/.test(seed));assert(Number.isInteger(months)&&months>=1&&months<=120);
 const root=path.resolve(__dirname,'..'),folder=path.join(root,'output',name);fs.mkdirSync(folder);
 const html=require('./build_game').assemble().html,{E,source}=runtime(html),driver=fs.readFileSync(__filename);
 fs.writeFileSync(path.join(folder,'engine.html'),html);fs.writeFileSync(path.join(folder,'trial-driver.js'),driver);
 const opening=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true}).options,startingWorkforce:'covered',mode:'hotseat',created:1,scenario,seed});
 const arms=['prior-lending','covered-no-expansion','covered-paid-expansion'].map(kind=>({kind,g:copy(opening),history:[]}));
 const report={portableSha256:hash(html),engineSha256:hash(source),driverSha256:hash(driver),scenario,seed,months,scope:'Same current human start, same laws and ordinary AI rival. Prior lending policy versus a two-Operations policy, with and without new paid hiring/construction. Existing contracts/work remain. Protected commercial service is purchased only when legal and forecast net-positive. Two Operations is not guaranteed adequate risk coverage. No claim of optimal play or balanced endgame.',arms:[]};
 const start=performance.now();
 function write(running){report.running=running;report.elapsedMs=Math.round(performance.now()-start);report.arms=arms.map(({g,...rest})=>({...rest,ended:g.gameOver,endReason:g.endReason||null,winnerId:g.winnerId||null}));fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');}
 write(true);
 for(let month=1;month<=months;month++)for(const arm of arms){
  const g=arm.g;if(g.gameOver||arm.failure)continue;
  try{
   const plans=g.players.map((_,i)=>E.chooseBot(g,i)),before=JSON.stringify(g),openingStats=copy(g.players.map(p=>p.stats));
   const selected=arm.kind==='prior-lending'?serviceAwareProposal(E,g,0,bankingProposal(E,g,0,plans[0],'lending')):conventionalProposal(E,g,0,plans[0],arm.kind==='covered-paid-expansion');
   assert.equal(JSON.stringify(g),before,'Proposal/forecast mutated world');plans[0]=selected.plan;
   for(let i=0;i<2;i++){E.validatePortfolioPlan(g.players[i],plans[i],g);E.validatePlan(g,g.players[i],plans[i]);}
   E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);
   const banks=g.players.map((p,i)=>{
    assert(E.IncomeReview.reconciliation(p.operatingReport).reconciled);
    const roots=g.eventLedger.filter(e=>e.cycle===month&&e.target===p.id&&e.category==='resolution.start');assert.equal(roots.length,1);
    const events=g.eventLedger.filter(e=>e.parentCause===roots[0].id&&e.target===p.id&&e.deltas);
    for(const field of ['earnings','cash','loans'])assert.equal(events.reduce((n,e)=>n+(e.deltas[field]||0),0),p.stats[field]-openingStats[i][field],field+' bridge');
    return {stats:copy(p.stats),allocation:copy(p.allocation),report:copy(p.operatingReport),loanFlow:copy(E.loanProductionBreakdown(p.operatingReport)),plan:copy(plans[i]),offices:copy(p.facilityNetwork.offices)};
   });
   arm.history.push({month,accepted:selected.accepted,reason:selected.reason||null,steps:selected.steps,banks});
   console.log(arm.kind+' M'+month+' equity '+banks[0].stats.capital+' profit '+banks[0].stats.lastProfit+' loans '+banks[0].stats.loans);
  }catch(error){arm.failure={month,message:error.stack};process.exitCode=1;}
  write(true);
 }
 for(const arm of arms){const bytes=zlib.gzipSync(JSON.stringify(arm.g));fs.writeFileSync(path.join(folder,arm.kind+'-closing.json.gz'),bytes);arm.closingSnapshotSha256=hash(bytes);}
 write(false);console.log(JSON.stringify(report.arms.map(a=>({kind:a.kind,months:a.history.length,ended:a.ended,failure:a.failure||null}))));
}
module.exports={conventionalProposal};if(require.main===module)main();
