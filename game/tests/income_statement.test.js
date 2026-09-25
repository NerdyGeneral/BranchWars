'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),withoutDetail=x=>JSON.parse(JSON.stringify(x,(key,value)=>key.startsWith('incomeSource_')?undefined:value));
function engine(html){const c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=engine(require('../tools/build_game').assemble().html);
const components={version:1,staffActivity:10,wealthRelationships:20,technologyBonus:30,wealthUpgradeBonus:40,digitalStrategyBonus:50,basePayroll:60,facilityUpkeep:20,securitiesInterest:100};
function sample(){return {cycle:1,...Object.fromEntries(Object.entries(components).map(([key,value])=>['incomeSource_'+key,value])),depositIncome:40,loanIncome:200,commercialIncome:50,otherIncome:280,contractFees:30,
 fundingCost:25,depositInterest:20,expense:100,depositServiceCost:10,retailPlatformCost:5,chargeoff:30,corporateInvoiceLoss:4,eventAdjustment:0,profit:411};}
test('statement separates interest, fees and abstract income without double-counting platform costs or subtotals',()=>{
 const r=sample(),before=JSON.stringify(r),s=E.IncomeReview.statement(r);assert(s.available,s.reason);
 assert.equal(s.netInterest,275);assert.equal(s.abstract,150);assert.equal(s.unclassified,0);assert.equal(s.remainingExpense,10);
 assert.equal(s.expenses.reduce((n,row)=>n+row[2],0),r.expense);
 const signed=s.rows.filter(row=>!['loanInterest','securitiesInterest','depositInterest','otherFunding','profit'].includes(row[0])).reduce((n,row)=>n+row[2],0);
 assert.equal(signed,r.profit,'Net interest subtotal must replace its four components, not be added to them');
 assert.equal(JSON.stringify(r),before);
 const extra={...r,otherIncome:r.otherIncome+7,profit:r.profit+7};assert.equal(E.IncomeReview.statement(extra).unclassified,7);
});
test('unavailable, malformed and inconsistent detail never becomes a fabricated historical statement',()=>{
 assert(!E.IncomeReview.statement(undefined).available);assert(!E.IncomeReview.statement(withoutDetail(sample())).available);
 for(const mutate of [r=>r.incomeSource_version=2,r=>r.incomeSource_staffActivity=NaN,r=>r.incomeSource_securitiesInterest=99999,
  r=>r.incomeSource_basePayroll=99999,r=>r.incomeSource_extra=0,r=>r.contractFees=-1,r=>r.depositInterest=99999,r=>r.profit+=50]){
  const r=sample();mutate(r);assert(!E.IncomeReview.statement(r).available);
 }
});
test('recorded statement details preserve economics, decisions, RNG, recovery and previous workload-peer acceptance',()=>{
 const reference=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_credit_shared_04f118ef.html'),'utf8');
 assert.equal(createHash('sha256').update(reference).digest('hex'),'04f118ef304abc5746040540d3435abe432d6a5cb90731e104bcb2d26136d3d6');
 const old=engine(reference),options={...old.previewCampaignEdition({},'expanded',{currentReporting:true}).options,commercialServiceVersion:1,creditWorkloadVersion:1,mode:'hotseat',seed:'income-components',created:1},g=E.createGame(options),baseline=old.createGame(options);
 assert.deepEqual(copy(g),copy(baseline));
 for(let month=0;month<3;month++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i)),prior=baseline.players.map((_,i)=>old.chooseBot(baseline,i));assert.deepEqual(copy(plans),copy(prior));
  for(const seat of [0,1]){E.submit(g,seat,plans[seat]);old.submit(baseline,seat,prior[seat]);}
  assert.deepEqual(withoutDetail(g),copy(baseline),'Only additive diagnostic report components may differ');
  for(const seat of [0,1]){
   const v=E.publicState(g,seat),before=JSON.stringify(v),statement=E.IncomeReview.statement(v.me.operatingReport);assert(statement.available,statement.reason);
   assert(Math.abs(statement.unclassified)<2);assert(Math.abs(statement.remainingExpense)<2);assert.equal(v.rival.operatingReport,undefined);
   assert.equal(JSON.stringify(v),before);
  }
  const restored=E.migrateCampaign(copy(g));assert.deepEqual(copy(restored),copy(g));
  // No stricter history schema or additional capability: the previous9.31
  // receiver accepts the additive detail and its existing bounded history.
  const olderReader=old.migrateCampaign(copy(g));old.validatePilot(olderReader);assert.deepEqual(copy(olderReader),copy(g));
 }
});
