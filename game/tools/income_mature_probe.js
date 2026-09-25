'use strict';
// Read-only prospective policy comparisons from a preserved real campaign.
// Counterfactual staffing can redistribute only existing employees on private
// plans. Never assign a scenario owner back to the campaign or inject resources.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),name=process.argv[2],facilities=process.argv.includes('--facilities'),joint=process.argv.includes('--joint'),commercial=process.argv.includes('--commercial');
const snapshotOptions=process.argv.slice(3).filter(x=>x.startsWith('--snapshot=')),snapshotFolder=snapshotOptions[0]?.slice(11)||'income-extended-66';
const throughputOptions=process.argv.slice(3).filter(x=>x.startsWith('--throughput=')),throughput=Number(throughputOptions[0]?.slice(13)||1);
if(!/^income-mature-[a-z0-9-]+\.json$/.test(name||'')||snapshotOptions.length>1||throughputOptions.length>1||![1,2,3].includes(throughput)||!/^[a-z0-9-]+$/.test(snapshotFolder)||process.argv.slice(3).some(x=>!['--facilities','--joint','--commercial'].includes(x)&&!x.startsWith('--snapshot=')&&!x.startsWith('--throughput=')))throw Error('Usage: node tools/income_mature_probe.js income-mature-unique.json [--facilities] [--joint] [--commercial] [--snapshot=output-folder] [--throughput=1|2|3; experiment only]');
const snapshot=fs.readFileSync(path.join(root,'output',snapshotFolder,'closing.json.gz'));
const html=require('./build_game').assemble().html,context={};
let script=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Explicit read-only sensitivity experiment: never write these alternate rules
// to the source, campaign or normal artifact, and never label it a balance run.
if(throughput!==1){assert.equal(script.split('lending*185000*multiplier').length,2);script=script.replace('lending*185000*multiplier','lending*'+(185000*throughput)+'*multiplier');}
const experimentalEngineSha256=createHash('sha256').update(script).digest('hex');
// Test-only visibility into the existing pure valuation, not a patched game.
vm.runInNewContext(script.replace('root.BWEngine={',`root.incomeProbe={
 facilityInvestmentReview:(g,i,p,r)=>withCorporateForecast(g,()=>facilityInvestmentReview(g,i,p,r)),
 jointReview:(g,index,input,request,allocation)=>withCorporateForecast(g,()=>{
  const p=g.players[index],plan=facilityInvestmentDraft(input),quote=FacilityNetwork.quote(p,request,facilityContext(g,p,plan));
  if(!quote.eligible)return {eligible:false,reason:quote.reason};
  const future=facilityInvestmentFutureOwner(g,p,plan,quote);
  const futureGame={...g,players:g.players.map((x,i)=>i===index?future.owner:x)};
  future.plan.allocation={...allocation};
  // The scenario pays the quoted conversion; no hire, cash contribution or
  // permission is invented. Re-plan already supported department/office work.
  future.plan=planDepartmentFunctionsCore(futureGame,index,future.plan,true);
  future.plan.facilityLifecyclePolicy=facilityLifecycleStaffProposal(futureGame,future.owner,future.plan).policy;
  const work=departmentFunctionsQuote(futureGame,future.owner,future.plan),local=lifecycleInstructionQuote(futureGame,future.owner,future.plan);
  if(!work.status.eligible||!local.status.eligible)return {eligible:false,reason:work.status.reason||local.status.reason};
  const duringPlan={...plan,facilityPolicy:{convert:{...request},cancel:null}},
   duringWork=departmentFunctionsQuote(g,p,duringPlan),duringLocal=lifecycleInstructionQuote(g,p,duringPlan);
  if(!duringWork.status.eligible||!duringLocal.status.eligible)return {eligible:false,reason:duringWork.status.reason||duringLocal.status.reason};
  const forecast=(owner,draft,world)=>operatingPreview({...owner,focus:draft.focus,marketSnapshot:world.marketEconomy},draft,world.economy,world),
   before=forecast(p,plan,g),during=forecast(p,duringPlan,g),after=forecast(future.owner,future.plan,futureGame),
   ready=quote.cost<=aiCashPlanningReview(g,index,plan).limit-planBudget(p,plan,g).total;
  return {eligible:true,ready,cost:quote.cost,allocation:future.plan.allocation,before,during,after,
   beforeOriginations:facilityInvestmentGross(before,p),afterOriginations:facilityInvestmentGross(after,p),
   value:null,valuationUnavailableReason:'A staffing change needs staged future delivery. The existing frozen-allocation stream does not establish this joint strategy valuation.',
   service:work.delivery.rows.map(x=>({id:x.id,workload:x.workload,served:x.delivered.served})),remainingPools:work.remainingPools};
 })};root.BWEngine={`),context);
const E=context.BWEngine,g=E.migrateCampaign(JSON.parse(zlib.gunzipSync(snapshot))),original=JSON.stringify(g);
if(throughput!==1)assert.equal(g.creditWorkloadVersion,1,'Sensitivity experiments require an explicit workload-corrected snapshot');
function unchanged(label){
 if(JSON.stringify(g)===original)return;
 const differences=[];
 function visit(a,b,key){
  if(differences.length>=8||a===b)return;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'){differences.push({key,before:a,after:b});return;}
  for(const field of new Set([...Object.keys(a),...Object.keys(b)]))visit(a[field],b[field],key+'.'+field);
 }
 visit(JSON.parse(original),g,'campaign');
 throw Error(label+' changed campaign: '+JSON.stringify(differences));
}
const pick=(value,keys)=>Object.fromEntries(keys.map(key=>[key,value[key]??null]));
const result={probeVersion:2,candidateSha256:createHash('sha256').update(html).digest('hex'),snapshotSha256:createHash('sha256').update(snapshot).digest('hex'),snapshotFolder,saveVersion:g.version,cycle:g.cycle,throughput,experimentalEngineSha256,
 scope:'Pure scenarios at the selected preserved campaign; no rules are upgraded. Policy variants change only lending policy. Joint scenarios compare conservative/balanced/growth policy and existing-staff allocations after a quoted conversion. They report next-operating-stage estimates, not long-run values: the original fixed-allocation stream cannot value staged staffing changes. Separate facility-only reviews retain the actual game valuation. No turns settled, resources injected, strategic optimality or realized long-run effects claimed.',banks:[]};
for(const seat of [0,1]){
 const v=E.publicState(g,seat);unchanged('Owner view');
 // AI planning legitimately consumes the separate AI random stream. Generate
 // the diagnostic plan on a copy, then check forecast purity on the original.
 const base=E.chooseBot(JSON.parse(original),seat);unchanged('AI planning copy');
 const orders=JSON.stringify(base),p=g.players[seat],variants=[];
 for(const policy of ['conservative','balanced','growth']){
  const plan=JSON.parse(orders);plan.lendingPolicy=policy;
  try{
   const q=E.departmentCreditPreview(v.me,v,plan),r=q.operating;
   // Forecast gross principal is only reconstructed when all engine fields
   // exist. Named-company interest writeoffs are not principal movements.
   const c=r.companyCredit||{},parts=[r.loanGrowth,r.principalRepaid,r.creditRecovery,r.chargeoff];
   const gross=parts.every(Number.isFinite)?parts.reduce((a,b)=>a+b,0)+(c.principalPaid||0)+(c.recoveredPrincipal||0)-(c.interestWrittenOff||0):null;
   variants.push({policy,staffing:q.staffing,facilityLoanCapacity:q.facilityLoanCapacity,grossFundedPrincipal:gross,
    operating:pick(r,['loanIncome','commercialIncome','depositIncome','otherIncome','expense','fundingCost','chargeoff','principalRepaid','creditRecovery','loanGrowth','profit'])});
  }catch(error){variants.push({policy,rejected:error.message});}
  unchanged('Policy forecast');
  assert.equal(JSON.stringify(base),orders,'Probe changed the original AI draft');
 }
 const investment=[],jointInvestment=[],commercialService=[];
 if(commercial)for(const kind of ['current','unserved','vendor-served']){
  const plan=JSON.parse(orders);
  if(kind!=='current'){
   for(const role of Object.keys(plan.departmentFunctionsPolicy.quotas.relationships))plan.departmentFunctionsPolicy.quotas.relationships[role]=0;
   plan.departmentFunctionsPolicy.vendors.relationships=kind==='vendor-served'?4:0;
  }
  const work=E.departmentFunctionsQuote(v,v.me,plan);
  if(!work.status.eligible){commercialService.push({kind,rejected:work.status.reason});continue;}
  const r=E.operatingPreview(v.me,plan,v.economy,v,true),task=work.delivery.rows.find(x=>x.id==='commercialRelationships');
  commercialService.push({kind,task,remainingPools:work.remainingPools,vendorExpense:work.vendorExpense,commercial:r.commercial,
   operating:pick(r,['commercialIncome','otherIncome','expense','profit'])});
  unchanged('Commercial service comparison');
 }
 if(joint)for(const office of p.facilityNetwork.offices.filter(o=>o.closedCycle===null))for(const model of ['retail','commercial','digital'])for(const policy of ['conservative','balanced','growth'])for(const kind of ['current','one-to-credit','two-to-credit']){
  const allocation={...base.allocation};
  let left=kind==='one-to-credit'?1:kind==='two-to-credit'?2:0;
  for(const role of ['business','service']){const n=Math.min(left,Math.max(0,allocation[role]-1));allocation[role]-=n;allocation.lending+=n;left-=n;}
  if(left)continue;
  assert.equal(Object.values(allocation).reduce((a,b)=>a+b,0),Object.values(base.allocation).reduce((a,b)=>a+b,0));
  const input=JSON.parse(orders);input.lendingPolicy=policy;
  const q=context.incomeProbe.jointReview(g,seat,input,{officeId:office.id,model},allocation);
  unchanged('Joint investment scenario');assert.equal(JSON.stringify(base),orders);
  jointInvestment.push({market:office.market,model,policy,kind,...q});
 }
 if(facilities)for(const office of p.facilityNetwork.offices.filter(o=>o.closedCycle===null))for(const model of ['retail','commercial','digital','wealth','financialCenter','regionalHub']){
  const q=context.incomeProbe.facilityInvestmentReview(g,seat,base,{officeId:office.id,model});
  unchanged('Facility investment review');
  investment.push({market:office.market,model,eligible:q.eligible,ready:q.ready,reason:q.reason,cost:q.quote?.cost,value:q.value,
   beforeOriginations:q.beforeOriginations,afterOriginations:q.afterOriginations,beforeProfit:q.before?.profit,duringProfit:q.during?.profit,afterProfit:q.after?.profit});
 }
 result.banks.push({seat,allocation:base.allocation,capital:p.stats.capital,cash:p.stats.cash,loans:p.stats.loans,
  ...(facilities?{investment}:{}),
  ...(joint?{jointInvestment}:{}),...(commercial?{commercialService}:{}),
  actual:pick(p.operatingReport,['cycle','loanIncome','commercialIncome','principalRepaid','creditRecovery','loanGrowth','chargeoff']),variants});
}
unchanged('Completed probe');
fs.writeFileSync(path.join(root,'output',name),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidateSha256:result.candidateSha256,output:name,cycle:result.cycle,banks:result.banks.map(b=>({seat:b.seat,policyComparisons:b.variants.length,facilityComparisons:b.investment?.length||0,jointComparisons:b.jointInvestment?.length||0,serviceComparisons:b.commercialService?.length||0}))}));
