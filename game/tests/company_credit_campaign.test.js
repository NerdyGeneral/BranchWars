'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x)),context={};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('Object.assign(root.BWEngine,{CompanyCreditBank});','Object.assign(root.BWEngine,{CompanyCreditBank,fundCompanyCreditOrders,corporateStatement});'),context);
const E=context.BWEngine,options=()=>({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:1,mode:'hotseat',seed:'credit-queue',created:1});
const fresh=()=>E.createGame(options());
const offer=()=>({companyId:'company:0',principal:10000,months:48,annualRateBp:800,appetite:'balanced',product:'middleMarket'});
function plan(g,i,target=null){
 const p=g.players[i],x=E.chooseBot(g,i);
 Object.assign(x,{newProjects:[],newProject:null,investments:{},hires:0,specialistHires:E.emptySpecialistOrders(),competitiveAction:'none',opportunity:null,contractBid:null,capitalAction:false});
 x.groupPolicy.bankDividend=0;x.groupPolicy.bankSupport=0;x.allocation={...p.allocation};x.servicePolicy=copy(p.serviceDesk.policy);x.servicePolicy.staff=0;
 x.departmentFunctionsPolicy=E.defaultDepartmentFunctionsPolicy(p);
 for(const row of Object.values(x.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const key of Object.keys(x.departmentFunctionsPolicy.vendors))x.departmentFunctionsPolicy.vendors[key]=0;
 x.departmentFunctionsPolicy.quotas.credit.operations=1;x.commercialAccountPolicy={target,staffQuarters:target?2:0};
 x.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,x).policy;return x;
}
function check(g){E.validatePilot(g);E.validateLedger(g);for(let i=0;i<2;i++)E.validateFinancialGroupView(E.publicState(g,i));E.migrateCampaign(copy(g));}
function tick(g,edit=()=>{}){const plans=[plan(g,0,'company:0'),plan(g,1)];edit(plans);E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);check(g);}

test('conditional draft lending uses only public companies and the owner ledger with shared funding and capacity',()=>{
 const g=fresh();tick(g);tick(g);const plans=[plan(g,0,'company:0'),plan(g,1)],v=E.publicState(g,0);
 plans[0].companyCreditOrders=[offer()];const before=JSON.stringify({g,plans,v}),q=E.companyCreditPlanForecast(v,v.me,plans[0]);
 assert.equal(q.review.principal,10000);assert(q.review.reservedCapacity>0);
 assert.equal(q.funded.companyCredit.advanced,10000);assert(q.funded.companyCredit.interest>0);
 const actual=E.fundCompanyCreditOrders(g,plans.map((x,i)=>({bankId:g.players[i].id,orders:x.companyCreditOrders||[],plan:x}))),
  actualOwner=actual.players[0];actualOwner.companySnapshot={...E.corporateStatement(g),world:actual.world};actualOwner.marketSnapshot=actual.marketEconomy;
 const expected=E.operatingPreview(actualOwner,{...plans[0],companyCreditOrders:[]},g.economy,{...g,marketEconomy:actual.marketEconomy},true);
 assert.equal(q.funded.profit,expected.profit);assert.equal(q.funded.closingCash,expected.closingCash);assert.equal(q.funded.loanGrowth,expected.loanGrowth);
 assert.equal(q.funded.commercial.companyLoanGrowth,q.funded.commercial.companyLoans,'Opening owner has no named loans');
 assert.equal(q.funded.commercial.companyLoanGrowth,10000-q.funded.companyCredit.principalPaid);
 assert.equal(JSON.stringify({g,plans,v}),before,'No state, plans or RNG changes');
 assert.deepEqual(copy(q),copy(E.companyCreditPlanForecast(v,v.me,plans[0])));
 const shared=E.operatingPreview(v.me,plans[0],v.economy,v,true);assert.equal(shared.closingCash,q.funded.closingCash);assert.equal(shared.companyCredit.advanced,10000);assert.match(shared.companyCreditAssumptions,/Conditional/);
 const empty=E.companyCreditPlanForecast(v,v.me,{...plans[0],companyCreditOrders:[]});assert.deepEqual(copy(empty.baseline),copy(empty.funded));
 const denied=copy(plans[0]);denied.companyCreditOrders[0].principal=999999999;
 assert.throws(()=>E.companyCreditPlanForecast(v,v.me,denied));assert.equal(JSON.stringify({g,plans,v}),before);
});

test('company credit uses explicit 9.28 creation; supported selections and old saves never upgrade automatically',()=>{
 const g=fresh();assert.equal(g.version,'9.28');assert.equal(g.companyCreditVersion,1);assert.equal(g.companyEconomy.version,7);check(g);
 const oldOptions={...options(),companyCreditVersion:0},old=E.createGame(oldOptions);delete oldOptions.companyCreditVersion;
 assert.equal(old.version,'9.27');assert.deepEqual(copy(old),copy(E.createGame(oldOptions)));
 assert.equal(E.createGame({...E.previewCampaignEdition({},'expanded').options,created:1,seed:1}).version,'9.28','The single Expanded choice enables the integrated company-loan workflow');
 assert.equal(old.companyCreditVersion,undefined);assert(old.players.every(p=>p.companyCredit===undefined));
 for(const change of [x=>x.companyCreditVersion=2,x=>x.sharedPremisesVersion=0]){const x=options();change(x);assert.throws(()=>E.createGame(x));}
 const caps=E.campaignCapabilities();assert.equal(caps.companyCreditSupported,1);delete caps.companyCreditSupported;
 assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'companyCreditVersion');
 assert.equal(E.peerRulesIssue(E.campaignRules(old,{context:'game'}),caps),null);
});

test('inconsistent markers, lender assets and unfinished settlement are rejected without repair',()=>{
 const g=fresh(),before=JSON.stringify(g);
 for(const change of [x=>delete x.companyCreditVersion,x=>x.companyCreditVersion=0,x=>x.companyCreditVersion=2,x=>x.version='9.27',x=>delete x.players[0].companyCredit,x=>x.players[0].companyCredit.month++,x=>x._companyCreditAccountOpening=[],x=>x.players[0]._companyCreditFunded=0]){
  const x=copy(g);change(x);assert.throws(()=>E.migrateCampaign(x));
 }
 assert.equal(JSON.stringify(g),before);
 const v=E.publicState(g,0);v.rival.companyCredit=copy(v.me.companyCredit);assert.throws(()=>E.validateFinancialGroupView(v),/Private/);
 const old=E.createGame({...options(),companyCreditVersion:0});old.players[0]._companyCreditFunded=0;assert.throws(()=>E.migrateCampaign(old),/Unfinished/);
});

test('actual paid development, submitted loan, half-ready recovery and monthly repayment form one campaign',()=>{
 const g=fresh();tick(g);tick(g);assert(g.players[0].commercialAccounts.accounts['company:0']);
 const plans=[plan(g,0,'company:0'),plan(g,1)],opening=copy(g);plans[0].companyCreditOrders=[offer()];
 assert(E.companyCreditOrderReview(g,g.players[0],plans[0],plans[0].companyCreditOrders).eligible);
 E.submit(g,0,plans[0]);const restored=E.migrateCampaign(copy(g));
 assert.deepEqual(copy(restored.players[0].submitted.companyCreditOrders),[offer()]);
 const locked=JSON.stringify(g);assert.throws(()=>E.submit(g,0,plans[0]),/locked/);assert.equal(JSON.stringify(g),locked);
 E.submit(g,1,plans[1]);E.submit(restored,1,copy(plans[1]));check(g);check(restored);
 assert.deepEqual(copy(g),copy(restored),'Resume cannot repeat or change the funded loan');
 const note=g.companyEconomy.credit.notes[0],p=g.players[0];
 assert.equal(g.companyEconomy.credit.notes.length,1);assert.equal(note.original,10000);assert(note.principal<10000);assert.equal(note.bankId,p.id);
 assert.equal(p.operatingReport.companyCredit.advanced,10000);assert(p.operatingReport.companyCredit.interest>0);
 assert.equal(p.accounting.journal.filter(e=>e.source==='companyCredit.advance').length,1);
 assert.equal(g.players[1].companyCredit.claims.length,0);
 assert.equal(g._companyCreditAccountOpening,undefined);assert(p.productPrograms.review,'Loan funding must preserve live owner identity for pricing traces');
 assert.equal(E.commercialAccountBalance(p),Math.floor(g.companyEconomy.companies[0].book.accounts.cash/2));
 const own=E.publicState(g,0),rival=E.publicState(g,1);
 assert.equal(rival.lastPlans[p.id].companyCreditOrders,undefined);assert.deepEqual(copy(own.lastPlans[p.id].companyCreditOrders),[offer()]);
 const leaked=copy(rival);leaked.lastPlans[p.id].companyCreditOrders=[offer()];assert.throws(()=>E.validateFinancialGroupView(leaked),/Private/);
 const invalid=plan(g,0,'company:0');invalid.companyCreditOrders=[offer()];assert.throws(()=>E.submit(g,0,invalid),/outstanding/);
 const principal=note.principal;for(let m=0;m<3;m++)tick(g);
 assert(g.companyEconomy.credit.notes[0].principal<principal);assert.equal(g.companyEconomy.credit.notes.length,1);
 assert.equal(opening.companyEconomy.credit.notes.length,0);
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);check(g);assert.equal(g.version,'9.28');assert.equal(g.companyEconomy.credit.notes.length,0);
});

test('unsupported or unfunded company orders cannot partially change a campaign',()=>{
 const g=fresh(),p=plan(g,0),before=JSON.stringify(g);p.companyCreditOrders=[offer()];assert.throws(()=>E.submit(g,0,p),/Develop an operating account/);assert.equal(JSON.stringify(g),before);
 // Bot planning consumes its own deterministic RNG. Capture after planning so
 // this assertion isolates rejected submission, not unrelated plan generation.
 for(const value of [null,{},[{...offer(),principal:NaN}],[offer(),offer()]]){const x=plan(g,0),snapshot=JSON.stringify(g);x.companyCreditOrders=value;assert.throws(()=>E.submit(g,0,x));assert.equal(JSON.stringify(g),snapshot);}
 const old=E.createGame({...options(),companyCreditVersion:0}),x=plan(old,0),oldBefore=JSON.stringify(old);x.companyCreditOrders=[];assert.throws(()=>E.submit(old,0,x),/not enabled/);assert.equal(JSON.stringify(old),oldBefore);
});
