'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=require('../tools/build_game').assemble().html,code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(code.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,facilityInvestmentDraft,facilityInvestmentReview,facilityInvestmentCreditStream,planFacilityInvestment,'),context);
const E=context.BWEngine,bytes=fs.readFileSync(path.join(__dirname,'fixtures/department-regulatory480.json.gz'));
assert.equal(hash(bytes),'126318f35b4bb048445ab6dae700a430a26db281c41efd22a56d1fd7f6d758b9');
const g=JSON.parse(zlib.gunzipSync(bytes)).game;E.validatePilot(g);assert.equal(g.cycle,481);assert.equal(g.financialGroupVersion,6);
let scenarios=0,conservationMonths=0;
for(const bank of [0,1]){
 const p=g.players[bank],plan=E.chooseBot(g,bank),saved=JSON.stringify(g),instructions=JSON.stringify(plan),
  office=p.facilityNetwork.offices.find(o=>o.closedCycle===null);
 assert.equal(E.planFacilityInvestment(g,bank,plan),plan,'Legacy AI never adopts the new valuation');
 // A legal, read-only scenario on the preserved old bank is NOT a save upgrade.
 const assess=model=>E.withCorporateForecast(g,()=>E.facilityInvestmentReview(g,bank,plan,{officeId:office.id,model}));
 const commercial=assess('commercial'),digital=assess('digital');
 assert(commercial.eligible,commercial.reason);assert(commercial.value>0);assert.equal(commercial.ready,false);
 assert.equal(commercial.plan.facilityPolicy.convert,null,'Do not submit or charge an unaffordable conversion');
 assert(commercial.afterOriginations>commercial.beforeOriginations);assert.equal(commercial.horizon,60);
 assert(digital.eligible,digital.reason);assert(digital.value<0,'Costlier unchanged productive capacity is not an arbitrary strategy bonus');
 assert.equal(assess('wealth').eligible,false,'No hidden wealth license');
 for(const result of [commercial,digital])for(const [stream,upfront]of [[result.baseStream,0],[result.futureStream,result.quote.cost]]){
  const draft=E.facilityInvestmentDraft(plan),budget=E.planBudget(p,draft);
  let cash=p.stats.cash-upfront-budget.total-(p.accounting.accounts.payables||0),capital=p.stats.capital-upfront-budget.total,principal=p.stats.loans;
  for(const row of stream.rows){
   assert(Math.abs(row.cash-cash-(row.repaid+row.recovered-row.originations+row.interest-row.collectionsCost+row.noncredit))<1e-6);
   assert.equal(row.principal-principal,row.originations-row.repaid-row.recovered-row.loss);
   assert(Math.abs(row.capital-capital-row.net)<1e-6);
   assert(Math.abs(row.net-(row.interest-row.loss-row.collectionsCost+row.noncredit))<1e-6,'Principal repayments are not earnings');
   assert(row.originations<=row.requested&&row.originations>=0);assert(row.cash>=0&&row.capitalRatio>=10);
   cash=row.cash;capital=row.capital;principal=row.principal;conservationMonths++;
  }
 }
 const hidden=copy(g);hidden.players[1-bank].stats.cash+=123456789;
 const privateIndependent=E.withCorporateForecast(hidden,()=>E.facilityInvestmentReview(hidden,bank,plan,{officeId:office.id,model:'commercial'}));
 assert.deepEqual(copy(privateIndependent),copy(commercial),'A bank cannot fund its scenario from private rival cash');
 assert.equal(JSON.stringify(g),saved);assert.equal(JSON.stringify(plan),instructions);scenarios+=2;
}
const modern=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'fixtures/v31-group7-growth24.json.gz')))).game;
const twin=copy(modern),plans=modern.players.map((p,i)=>E.chooseBot(modern,i)),again=twin.players.map((p,i)=>E.chooseBot(twin,i));
assert.deepEqual(copy(plans),copy(again));assert.deepEqual(copy(modern.rng),copy(twin.rng));
for(const [i,plan]of plans.entries()){assert.equal(Object.values(plan.allocation).reduce((n,x)=>n+x,0),modern.players[i].stats.staff);assert(E.planBudget(modern.players[i],plan).remaining>=0);}
E.submit(modern,0,plans[0]);const restored=E.migrateCampaign(copy(modern));E.submit(modern,1,plans[1]);E.submit(restored,1,copy(plans[1]));
E.validatePilot(modern);E.validateLedger(modern);assert.deepEqual(copy(E.migrateCampaign(modern)),copy(E.migrateCampaign(restored)));
console.log(JSON.stringify({suite:'v31-facility-investment',status:'PASS',engineSha256:hash(code),scenarios,conservationMonths,
 scope:'Preserved mature banks, debt-free cash/equity/loan scenario identities, unaffordable deferral, negative alternatives, no phantom license/rival funds, exact legacy no-op, full Group7 planning and month25 replay. Not long-campaign balance acceptance.'}));
