'use strict';
// Bounded, paid new-game strategy comparison. This is not a balance modifier.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(x).digest('hex');

function runtime(html){
 const source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={};
 // Expose existing pure preparation/validation functions; no alternate formula.
 const exposed=source.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,facilityInvestmentDraft,planDepartmentFunctionsCore,validatePlan,validatePortfolioPlan,');
 assert.notEqual(exposed,source);vm.runInNewContext(exposed,context);
 return {E:context.BWEngine,source};
}

function bankingProposal(E,g,index,base,strategy){
 if(strategy==='ordinary')return {plan:base,accepted:true,steps:[]};
 const p=g.players[index],before=JSON.stringify(g),steps=[];
 let plan=E.facilityInvestmentDraft(base);
 if(plan.projectTargets!==undefined)plan.projectTargets={};
 // Both intentional strategies defer new research and discretionary initiatives,
 // preserve ongoing work/obligations and share the same paid expansion limits.
 const operations=Math.min(p.stats.staff,Math.max(2,base.allocation.operations));
 const remaining=p.stats.staff-operations,allocation={service:0,business:0,lending:0,operations};
 for(const role of ['service','business','lending'])if(Object.values(allocation).reduce((a,b)=>a+b,0)<p.stats.staff)allocation[role]++;
 const weights=strategy==='lending'?['lending','lending','lending','service','business']:['business','business','business','service','lending'];
 for(let at=0,left=p.stats.staff-Object.values(allocation).reduce((a,b)=>a+b,0);left>0;at++,left--)allocation[weights[at%weights.length]]++;
 assert(remaining>=0);assert.equal(Object.values(allocation).reduce((a,b)=>a+b,0),p.stats.staff);
 plan.allocation=allocation;plan.lendingPolicy='balanced';plan.capitalPolicy='balanced';plan.depositPolicy='balanced';
 function prepared(input){
  const candidate=E.planDepartmentFunctionsCore(g,index,copy(input),true);
  candidate.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,candidate).policy;
  E.validatePortfolioPlan(p,candidate,g);E.validatePlan(g,p,candidate);
  const work=E.departmentFunctionsQuote(g,p,candidate),local=E.lifecycleInstructionQuote(g,p,candidate);
  assert(work.status.eligible,work.status.reason);assert(local.status.eligible,local.status.reason);
  return candidate;
 }
 try{plan=prepared(plan);}catch(error){
  assert.equal(JSON.stringify(g),before);
  return {plan:base,accepted:false,reason:error.message,steps:[{action:'staffing-and-deferral',accepted:false,reason:error.message}]};
 }
 steps.push({action:'staffing-and-deferral',accepted:true,allocation:copy(plan.allocation)});
 function optional(action,change){
  try{
   const candidate=prepared(change(copy(plan))),budget=E.planBudget(p,candidate,g);
   // Paid entry costs plus six months of incremental base payroll stay funded;
   // actual capital checks remain authoritative. No loan/fee forecast pays now.
   // `remaining` is capped by regulatory capital, not simply cash. Capital has
   // already passed authoritative validation; do not reserve cash twice there.
   const cashRemaining=budget.discretionaryCashAvailable-budget.discretionaryCommitments;
   const payroll=(budget.basePayrollAdded||0)+(budget.specialistPayrollAdded||0);
   assert(cashRemaining>=600000+payroll*6,'Keep cash buffer and funded incremental payroll');
   plan=candidate;steps.push({action,accepted:true,committed:budget.total,cashRemaining,capitalRemaining:budget.discretionaryRemaining,payrollReserved:payroll*6});
  }catch(error){steps.push({action,accepted:false,reason:error.message});}
 }
 if(p.stats.staff<10&&(plan.hires||0)<1)optional('one-paid-recruit',candidate=>({...candidate,hires:1}));
 const active=p.facilityNetwork.offices.filter(o=>o.closedCycle===null);
 if(active.length<3&&g.cycle%6===1&&!p.projects.some(project=>E.PROJECTS[project.key]?.kind==='branch')){
  const targets=Object.entries(g.territories).filter(([key,t])=>t.unlock<=g.cycle&&!t.exited?.[index]);
  targets.sort(([a,ta],[b,tb])=>(p.branches[a]||0)-(p.branches[b]||0)||tb.shares[index]-ta.shares[index]||a.localeCompare(b));
  const market=targets[0]?.[0];
  if(market)optional('paid-commercial-office',candidate=>({...candidate,newProjects:['branchCommercial'],newProject:'branchCommercial',projectTargets:{branchCommercial:market}}));
 }
 assert.equal(JSON.stringify(g),before,'Preparing an intentional strategy changed the campaign');
 return {plan,accepted:true,steps};
}

function main(){
 const [monthArg,name,...flags]=process.argv.slice(2),months=Number(monthArg),options={};
 for(const flag of flags){const match=/^--(scenario|seed|strategies|resume|service|rivalry)=(.+)$/.exec(flag);if(!match||options[match[1]])throw Error('Unknown/repeated trial option');options[match[1]]=match[2];}
 if(options.service!==undefined&&options.service!=='protected')throw Error('Only --service=protected is supported');
 if(options.rivalry!==undefined&&options.rivalry!=='persistent')throw Error('Only --rivalry=persistent is supported');
 let protectedService=options.service==='protected';
 let scenario=options.scenario||'balanced',seed=options.seed||'business-balance:1',strategies=(options.strategies||'ordinary,lending,commercial').split(',');
 if(!Number.isInteger(months)||months<1||months>480||!/^income-banking-[a-z0-9-]+$/.test(name||'')||!['balanced','rate','regulatory','growth'].includes(scenario)||!/^business-balance:[12]$/.test(seed)||new Set(strategies).size!==strategies.length||strategies.some(s=>!['ordinary','lending','commercial'].includes(s))||options.resume&&(!/^income-banking-[a-z0-9-]+$/.test(options.resume)||flags.length!==1))throw Error('Usage: node tools/income_banking_trial.js THROUGH_MONTH income-banking-unique [--scenario=balanced|rate|regulatory|growth] [--seed=business-balance:1|2] [--strategies=ordinary,lending,commercial] OR [--resume=income-banking-prior; no creation overrides]');
 const html=require('./build_game').assemble().html,{E,source}=runtime(html),folder=path.join(root,'output',name);
 let prior,restored;
 const driver=fs.readFileSync(__filename);
 if(options.resume){
  const priorFolder=path.join(root,'output',options.resume);prior=JSON.parse(fs.readFileSync(path.join(priorFolder,'report.json')));
  assert.equal(prior.running,false,'Predecessor is still running');assert([2,3].includes(prior.trialVersion),'Do not upgrade the earlier extra-capital-buffer trial');
  if(prior.trialVersion===3)assert.equal(prior.servicePolicy?.version,1,'Missing protected service policy');
  else assert.equal(prior.servicePolicy,undefined,'Unversioned protected service policy');
  assert.equal(prior.engineSha256,hash(source),'Campaign engine changed; this continuation cannot claim unchanged rules');
  const priorDriver=fs.readFileSync(path.join(priorFolder,'trial-driver.js'));
  assert.equal(hash(priorDriver),prior.driverSha256);
  if(prior.servicePolicy!==undefined){
   assert.equal(prior.servicePolicy.version,1,'Unsupported trial service policy');
   assert.equal(prior.servicePolicy.sha256,hash(serviceAwareProposal.toString().replace(/\r\n/g,'\n')),'Trial servicing policy changed');
   protectedService=true;
  }
  const policy=bytes=>bytes.toString('utf8').replace(/\r\n/g,'\n').split('function bankingProposal(')[1].split('\nfunction main(')[0];
  assert.equal(policy(priorDriver),policy(driver),'Intentional strategy changed; do not silently continue it');
  assert.equal(hash(fs.readFileSync(path.join(priorFolder,'engine.html'))),prior.portableSha256);
  scenario=prior.scenario;seed=prior.seed;strategies=prior.arms.map(a=>a.strategy);
  restored=prior.arms.map(a=>{
   assert(!a.failure,'Failed predecessor must not be resumed as passing');
   const bytes=fs.readFileSync(path.join(priorFolder,a.strategy+'-closing.json.gz'));
   assert.equal(hash(bytes),a.closingSnapshotSha256);const g=E.migrateCampaign(JSON.parse(zlib.gunzipSync(bytes)));
   E.validatePilot(g);E.validateLedger(g);assert.equal(g.version,g.bankRivalryVersion===1?'9.33':'9.32');
   assert(g.gameOver||g.cycle<=months,'Requested target must follow the saved month');
   const fromMonth=a.completedMonth??(a.fromMonth||0)+a.completed;
   if(!g.gameOver)assert.equal(g.cycle-1,fromMonth,'Saved month does not match the predecessor');
   return {strategy:a.strategy,g,history:[],totals:copy(a.totals),fromMonth,priorSnapshotSha256:hash(bytes)};
  });
  assert(restored.some(a=>!a.g.gameOver),'Never revive an ended campaign');
 }
 fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'engine.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(folder,'trial-driver.js'),driver,{flag:'wx'});
 const opening=restored?restored[0].g:E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true,currentRivalry:options.rivalry==='persistent'}).options,mode:'hotseat',created:1,scenario,seed});
 assert.equal(opening.version,opening.bankRivalryVersion===1?'9.33':'9.32');E.validatePilot(opening);E.validateLedger(opening);
 const initial=zlib.gzipSync(JSON.stringify(opening));fs.writeFileSync(path.join(folder,'opening.json.gz'),initial,{flag:'wx'});
 const report={trialVersion:2,driverSha256:hash(driver),portableSha256:hash(html),engineSha256:hash(source),openingSha256:hash(initial),requestedMonths:months,scenario,seed,saveVersion:opening.version,
  scope:'Ordinary AI control versus two deliberate paid banking strategies against an ordinary same-rule rival. Intentional strategies defer new discretionary research/projects, rebuild finite work, favor Lending or Business staffing, try one funded hire toward ten employees and a commercial office every six months toward three sites. Both use balanced deposit/lending/capital policies and the same buffers. Existing obligations remain. No injected resources, altered yields, changed rules, revived endings or subsidiary mandates. This is an explainable policy experiment, not optimal play, identical subsequent shocks, a pure one-variable intervention or final balance acceptance.',arms:[]};
 const arms=restored||strategies.map(strategy=>({strategy,g:copy(opening),history:[],totals:[{},{}],fromMonth:0})),started=performance.now();
 if(protectedService){
  report.trialVersion=3;
  report.servicePolicy={version:1,sha256:hash(serviceAwareProposal.toString().replace(/\r\n/g,'\n'))};
  report.scope+=' Service-aware variant: deliberate strategies may buy existing relationship-service capacity after final staffing, using current cash, protected work and a net-improving forecast. This is a human-policy comparison, not changed AI or saved rules.';
 }
 if(prior)report.predecessor={folder:options.resume,portableSha256:prior.portableSha256,driverSha256:prior.driverSha256};
 for(const arm of arms)if(restored)fs.writeFileSync(path.join(folder,arm.strategy+'-opening.json.gz'),zlib.gzipSync(JSON.stringify(arm.g)),{flag:'wx'});
 function save(running){report.running=running;report.elapsedMs=Math.round(performance.now()-started);report.arms=arms.map(a=>({strategy:a.strategy,history:a.history,totals:a.totals,fromMonth:a.fromMonth,priorSnapshotSha256:a.priorSnapshotSha256||null,completed:a.history.length,completedMonth:a.fromMonth+a.history.length,gameOver:a.g.gameOver,endReason:a.g.endReason||null,failure:a.failure||null,closingSnapshotSha256:a.closingSnapshotSha256||null}));fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');}
 save(true);
 for(let step=0;step<months;step++)for(const arm of arms){
  if(arm.g.gameOver||arm.failure||arm.g.cycle>months)continue;
  const g=arm.g,month=g.cycle;
  try{
   const plans=g.players.map((_,i)=>E.chooseBot(g,i));
   let selected=bankingProposal(E,g,0,plans[0],arm.strategy);
   if(protectedService&&arm.strategy!=='ordinary')selected=serviceAwareProposal(E,g,0,selected);
   const openingStats=copy(g.players.map(p=>p.stats));
   plans[0]=selected.plan;E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);
   const banks=g.players.map((p,i)=>{
    const r=p.operatingReport;assert(E.IncomeReview.reconciliation(r).reconciled);
    const roots=g.eventLedger.filter(e=>e.cycle===month&&e.target===p.id&&e.category==='resolution.start');assert.equal(roots.length,1);
    const movements=g.eventLedger.filter(e=>e.parentCause===roots[0].id&&e.target===p.id&&e.deltas);
    for(const key of ['cash','loans','earnings'])assert.equal(movements.reduce((n,e)=>n+(e.deltas[key]||0),0),p.stats[key]-openingStats[i][key],key+' bridge');
    for(const key of ['loanIncome','depositIncome','commercialIncome','otherIncome','fundingCost','expense','chargeoff','profit'])arm.totals[i][key]=(arm.totals[i][key]||0)+r[key];
    return {stats:copy(p.stats),capitalRatio:E.capitalRatio(p),allocation:copy(p.allocation),report:copy(r),plan:copy(plans[i]),offices:copy(p.facilityNetwork.offices)};
   });
   arm.history.push({month,accepted:selected.accepted,reason:selected.reason||null,steps:selected.steps,banks});
   console.log(arm.strategy+' month '+month+'; adopted '+selected.accepted+'; loans '+banks.map(b=>b.stats.loans).join('/')+'; staff '+banks[0].stats.staff);
  }catch(error){arm.failure={month,message:error.stack};process.exitCode=1;console.error(arm.strategy+': '+error.stack);}
  save(true);
 }
 for(const arm of arms){const bytes=zlib.gzipSync(JSON.stringify(arm.g));fs.writeFileSync(path.join(folder,arm.strategy+'-closing.json.gz'),bytes,{flag:'wx'});arm.closingSnapshotSha256=hash(bytes);}
 save(false);console.log(JSON.stringify({folder,arms:report.arms.map(a=>({strategy:a.strategy,completed:a.completed,ended:a.gameOver,failure:a.failure}))}));
}
function serviceAwareProposal(E,g,index,selected){
 if(!selected.accepted)return selected;
 const before=JSON.stringify({g,selected}),p=g.players[index],result={...selected,steps:copy(selected.steps)};
 try{
  const review=E.withCorporateForecast(g,()=>{
   const plan=copy(selected.plan),old=E.departmentFunctionsQuote(g,p,plan);
   assert(old.status.eligible,old.status.reason);
   const row=old.delivery.rows.find(r=>r.id==='commercialRelationships');
   assert(row,'Relationship-service task unavailable');
   const extra=Math.ceil(Math.max(0,row.workload-row.delivered.served));
   if(!extra)return {accepted:false,reason:'Existing relationship service is covered.'};
   assert(extra<=E.DepartmentProvider.ENTITLEMENT-plan.departmentFunctionsPolicy.vendors.relationships,'Insufficient finite provider capacity');
   plan.departmentFunctionsPolicy.vendors.relationships+=extra;
   E.validatePortfolioPlan(p,plan,g);E.validatePlan(g,p,plan);
   const next=E.departmentFunctionsQuote(g,p,plan),local=E.lifecycleInstructionQuote(g,p,plan),budget=E.planBudget(p,plan,g);
   assert(next.status.eligible,next.status.reason);assert(local.status.eligible,local.status.reason);
   assert(budget.remaining>=0&&budget.freeCapacity>=0&&E.projectPlanStatus(p,plan,g).eligible,'Protected spend or execution is unavailable');
   assert(E.facilityLifecycleProtectedBudget(p,plan,budget,g).remaining>=0,'Facility obligations must stay funded');
   assert.deepEqual(copy(next.attribution.paidTeacherQuarters),copy(old.attribution.paidTeacherQuarters),'Paid teaching cannot change');
   for(const prior of old.delivery.rows)assert(next.delivery.rows.find(r=>r.id===prior.id).delivered.served+1e-8>=prior.delivered.served,'Do not displace existing '+prior.id+' work');
   const cashRemaining=budget.discretionaryCashAvailable-budget.discretionaryCommitments;
   const payroll=(budget.basePayrollAdded||0)+(budget.specialistPayrollAdded||0);
   assert(cashRemaining>=250000+payroll*6,'Current cash must cover vendor costs, reserve and added payroll');
   const forecast=input=>E.operatingPreview({...p,focus:input.focus,marketSnapshot:g.marketEconomy},input,g.economy,g);
   const a=forecast(selected.plan),b=forecast(plan),net=r=>r.profit-(r.fundingLoss||0);
   assert(net(b)>net(a),'Servicing must improve earnings after its recurring costs');
   assert((b.fundingLoss||0)<=(a.fundingLoss||0)&&(b.emergencyDebt||0)<=(a.emergencyDebt||0),'Do not worsen funding stress');
   assert(b.capitalRatio>=Math.max(10,a.capitalRatio),'Capital protection must improve or remain intact');
   return {accepted:true,plan,extra,cashRemaining,additionalExpense:extra*E.DepartmentFunctions.FUNCTIONS.relationships.vendorRate,
    beforeFees:a.commercialIncome,afterFees:b.commercialIncome,beforeProfit:net(a),afterProfit:net(b)};
  });
  const {plan,...evidence}=review;
  if(review.accepted)result.plan=plan;
  result.steps.push({action:'protected-relationship-service',...evidence});
 }catch(error){result.steps.push({action:'protected-relationship-service',accepted:false,reason:error.message});}
 assert.equal(JSON.stringify({g,selected}),before,'Service-aware proposal changed source state or the original plan');
 return result;
}
module.exports={runtime,bankingProposal,serviceAwareProposal};
if(require.main===module)main();
