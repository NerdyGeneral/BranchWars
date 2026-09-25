'use strict';
// Human-directed reserve-for-group route, not an unmodified AI balance run.
// All funds, obligations and customers are settled through ordinary two-seat
// turns. No journal, cash, retained earnings, event or employee state is edited.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=x=>createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const html=require('../tools/build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(source,context);const E=context.BWEngine;
const portable=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
const identity={engineHash:hash(source),assembledHash:hash(html),portableHash:hash(portable),testHash:hash(fs.readFileSync(__filename))};
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options;
const g=E.createGame({...options,mode:'hotseat',scenario:'balanced',seed:'facility-long',created:1});
assert.equal(g.version,'9.4');assert(g.players.every(p=>p.financialGroup.parent.accounts.cash===0&&p.accounting.retainedEarnings===0));
const trace=[],launchMonths=[null,null],firstCommission=[null,null],dividends=[0,0];let months=0;
function validate(){E.validatePilot(g);E.validateLedger(g);const before=JSON.stringify(g);
 for(const seat of [0,1]){const view=E.publicState(g,seat);E.validateFinancialGroupView(view);E.validateAgencyView(view);
  assert.equal(view.rival.agency,undefined);assert.equal(view.lastPlans?.[view.rival.id]?.agencyPolicy,undefined);}
 assert.equal(JSON.stringify(g),before,'Private forecasts/views may not change campaign state.');}
function reservePlan(seat){
 const p=g.players[seat],q=E.chooseBot(g,seat);
 // Explicit player choices: postpone new expansion/research/recruitment and
 // paid customer acquisition. Existing contracts, payroll, products, real
 // announced event decision and ordinary maintenance remain in operation.
 Object.assign(q,{newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',opportunity:null,contractBid:null,contractExit:null,capitalAction:false});
 // Decline the real expansion-window funding option rather than counting an
 // authored cash windfall as ordinary earnings. The event itself is unchanged.
 if(g.event.key==='expansion')q.decision='b';
 for(const key of Object.keys(q.specialistHires))q.specialistHires[key]=0;
 for(const key of Object.keys(q.workforcePolicy.training))q.workforcePolicy.training[key]=0;
 q.facilityPolicy=E.defaultFacilityPolicy(p);q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);
 q.departmentPolicy=copy(p.departmentOffice.policy);q.leaderOrders=E.defaultDepartmentPlan(p).leaderOrders;
 q.advertisingPolicy.budget=0;q.relationshipOfferPolicy.share=0;q.onboardingPolicy.share=0;
 q.productProgramPolicy.retire=[];
 q.groupPolicy.bankSupport=0;q.groupPolicy.bankDividend=0;q.agencyPolicy=E.defaultAgencyPlan(p);
 const parent=p.financialGroup.parent.accounts.cash;
 if(p.agency.status==='unopened'){
  if(parent>=E.AGENCY_RULES.launchMinimum){Object.assign(q.agencyPolicy,{launch:true,capital:E.AGENCY_RULES.launchMinimum,staff:1,outreach:2,target:seat?'liability':'property'});}
  else q.groupPolicy.bankDividend=Math.min(E.groupCapitalQuote(p).dividendLimit,E.AGENCY_RULES.launchMinimum-parent);
 }
 q.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,q).policy;
 return q;
}
validate();
while(months<12&&!g.gameOver&&(firstCommission.some(x=>x===null))){
 const plans=g.players.map((p,i)=>reservePlan(i));
 const before=g.players.map(p=>({cash:p.stats.cash,retainedEarnings:p.accounting.retainedEarnings,parent:p.financialGroup.parent.accounts.cash,quote:E.groupCapitalQuote(p)}));
 for(const [seat,q]of plans.entries()){
  assert.equal(q.newProjects.length,0);assert.equal(Object.keys(q.investments).length,0);assert.equal(q.hires,0);
  if(g.event.key==='expansion')assert.equal(q.decision,'b','Do not finance this route with expansion-window funds.');
  assert(q.groupPolicy.bankDividend<=before[seat].quote.dividendLimit);
  if(q.agencyPolicy.launch){assert(before[seat].parent>=E.AGENCY_RULES.launchMinimum);assert.equal(q.groupPolicy.bankDividend,0,'A proposed same-month dividend cannot finance launch.');}
 }
 const cycle=g.cycle,event=copy(g.event);E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);months++;validate();
 const after=g.players.map((p,seat)=>{
  dividends[seat]+=p.financialGroup.report.dividend;
  if(plans[seat].agencyPolicy.launch){launchMonths[seat]=cycle;
   assert.equal(p.agency.status,'active');assert.equal(p.agency.staff,1);
   assert.equal(p.agency.report.capital,E.AGENCY_RULES.launchMinimum);
   assert.equal(p.financialGroup.parent.accounts.cash,before[seat].parent-E.AGENCY_RULES.launchMinimum);
   assert.equal(p.agency.report.setup,E.AGENCY_RULES.setupCost);assert(p.agency.report.recruitment>0);
   assert.equal(p.agency.report.expense,p.agency.report.paid);assert(p.agency.report.paid>0);
   assert.equal(p.financialGroup.investmentBasis.agency,E.AGENCY_RULES.launchMinimum);
   assert(p.financialGroup.parent.journal.some(e=>e.source==='dividend.bank'));
  }
  if(p.agency.report.commission>0&&firstCommission[seat]===null)firstCommission[seat]=cycle;
  return {cash:p.stats.cash,retainedEarnings:p.accounting.retainedEarnings,parent:p.financialGroup.parent.accounts.cash,
   group:copy(p.financialGroup.report),agencyStatus:p.agency.status,agency:copy(p.agency.report)};
 });
 assert.equal(g.companyEconomy.agencyCashNet,g.agencyEconomy.premiumPaid);
 const agencyCash=g.agencyEconomy.carrier.accounts.cash+g.agencyEconomy.supplier.accounts.cash+g.players.reduce((n,p)=>n+p.agency.book.accounts.cash,0);
 assert.equal(agencyCash,g.agencyEconomy.parentCashNet+g.agencyEconomy.premiumPaid);
 trace.push({cycle,event,before,orders:plans.map(q=>({decision:q.decision,dividend:q.groupPolicy.bankDividend,agency:copy(q.agencyPolicy)})),after});
}
const result={suite:'agency-group5-earned-launch',identity,scenario:'balanced',seed:'facility-long',months,launchMonths,firstCommission,dividends,
 premiumPaid:g.agencyEconomy.premiumPaid,commissionPaid:g.agencyEconomy.commissionPaid,operatingPaid:g.agencyEconomy.operatingPaid,
 sourceUnchanged:require('../tools/build_game').assemble().html===html,portableUnchanged:fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8')===portable,trace,
 limits:'Explicit human reserve-for-group policy, not untouched AI. Actual expansion-window funding is declined. No funding/state fixtures, gifted profits, quiet-event replacement or forced survival. Short reachability is not long-run agency viability.'};
console.log(JSON.stringify(result));
assert(launchMonths.some(x=>Number.isInteger(x)&&x>1),'At least one bank must earn real parent launch capital within the12-month route; inspect actual counterdrivers on failure.');
for(const [seat,launched]of launchMonths.entries())if(launched!==null)
 assert(Number.isInteger(firstCommission[seat]),'Each launched staffed agency must win an actually paid first commission.');
assert(result.sourceUnchanged&&result.portableUnchanged);
