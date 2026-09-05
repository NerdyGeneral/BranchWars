'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
const script=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={awardOpportunity,');
vm.runInNewContext(script,ctx);const E=ctx.BWEngine,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x));
const create=(version=2)=>E.createGame({seed:'activities',created:1,mode:'hotseat',scope:'national',fundingRulesVersion:version});
const opening=A.opening(),frozen=JSON.stringify(opening);
for(const kind of ['hiring','research','project','competitiveAction','decisionExpense']){
 const b=A.activity(opening,kind,100000);assert.equal(b.accounts.cash,2300000);assert.equal(b.accounts.equity,1700000);assert.equal(b.retainedEarnings,-100000);
 assert.equal(b.journal.at(-1).source,'activity.'+kind);
 assert.throws(()=>A.activity(opening,kind,2400001),'discretionary spending cannot silently borrow');
}
for(const kind of ['boardCapital','milestoneCapital','grant','franchiseIncome']){
 const b=A.activity(opening,kind,100000);assert.equal(b.accounts.cash,2500000);assert.equal(b.accounts.equity,1900000);
 assert.equal(b.retainedEarnings,['grant','franchiseIncome'].includes(kind)?100000:0);
}
const penalized=A.activity(opening,'penalty',3000000);assert.equal(penalized.accounts.emergencyDebt,600000);assert.equal(penalized.accounts.equity,-1200000);
assert.throws(()=>A.activity(opening,'mystery',0),/Unknown/);
const dividend=A.franchise(opening,96000,40000);assert.equal(dividend.accounts.cash,2536000);assert.equal(dividend.accounts.deposits,24040000);assert.equal(dividend.accounts.equity,1896000);
// Actual opportunity rewards and the accounting adapter consume the same terms.
for(const type of ['deposit','business','loan','wealth','payroll','public'])for(const value of [0,1,1001,1000000]){
 const g=create(),p=g.players[0],before=copy(p.stats),offer={type,value};
 const t=E.opportunityTerms(offer),b=A.opportunity(opening,offer);
 E.awardOpportunity(p,offer);
 assert.equal(p.stats.deposits-before.deposits,t.deposits);assert.equal(p.stats.loans-before.loans,t.loans);assert.equal(p.stats.cash-before.cash,t.feeIncome);
 assert.equal(b.accounts.deposits-opening.accounts.deposits,t.deposits);assert.equal(b.accounts.loans-opening.accounts.loans,t.loans);
 assert.equal(b.accounts.equity-opening.accounts.equity,t.feeIncome);A.check(b);
}
const bigLoan=A.opportunity(opening,{type:'loan',value:5000000});assert.equal(bigLoan.accounts.emergencyDebt,2600000);assert.equal(bigLoan.accounts.cash,90000);
for(const offer of [{type:'unknown',value:1},{type:'loan',value:-1},{type:'deposit',value:.5},{type:'wealth',value:NaN}])assert.throws(()=>A.opportunity(opening,offer));
// Confirm extracted acquisition formulas and live book transfers remain unchanged.
let deals=0;
for(const version of [1,2])for(let level=0;level<=4;level++)for(const seat of [0,1]){
 const g=create(version),p=g.players[seat],rival=g.players[1-seat],target='downtown';
 p.capability.acquisition=level?E.CAPABILITY_TIERS.acquisition[level-1]:0;
 const before=copy(g),t=E.acquisitionTerms(g,p,target),share=g.territories[target].shares[1-seat]/100;
 assert.equal(t.depositTake,Math.round(Math.min(rival.stats.deposits*(.045+level*.012)*Math.max(.45,share),4200000)));
 assert.equal(t.loanTake,Math.round(Math.min(rival.stats.loans*(.025+level*.007)*Math.max(.4,share),1900000)));
 const b=A.opening(),s=A.opening(),pair=A.gameAcquisition(b,s,g,p,target,50000);
 E.finishProject(g,p,{key:'acquisition',target});
 assert.equal(p.stats.deposits-before.players[seat].stats.deposits,t.depositTake);
 assert.equal(rival.stats.deposits-before.players[1-seat].stats.deposits,-t.depositTake);
 assert.equal(p.stats.loans-before.players[seat].stats.loans,t.loanTake);
 assert.equal(rival.stats.loans-before.players[1-seat].stats.loans,-t.loanTake);
 assert.equal(pair.buyer.accounts.deposits-b.accounts.deposits,t.depositTake);
 assert.equal(pair.seller.accounts.loans-s.accounts.loans,-t.loanTake);
 assert.equal(pair.buyer.accounts.equity-b.accounts.equity,-50000);
 assert.equal(pair.seller.accounts.equity-s.accounts.equity,50000);
 for(const key of ['deposits','loans','equity'])assert.equal(pair.buyer.accounts[key]+pair.seller.accounts[key],b.accounts[key]+s.accounts[key]);
 A.check(pair.buyer);A.check(pair.seller);deals++;
}
// Both settlement directions and mandatory funding preserve joint net cash/debt.
for(const [deposits,loans,premium] of [[10000000,1000000,0],[0,9000000,100000],[0,0,0],[1001,999,1]]){
 const b=A.opening(),s=A.opening(),pair=A.acquisition(b,s,{deposits,loans,premium});
 const net=x=>x.accounts.cash-x.accounts.emergencyDebt;
 assert.equal(net(pair.buyer)+net(pair.seller),net(b)+net(s));A.check(pair.buyer);A.check(pair.seller);
 assert.equal(pair.settlement,deposits-loans-premium);
}
const seller=A.opening(),snapshot=JSON.stringify(seller);
assert.throws(()=>A.acquisition(opening,seller,{deposits:24000001,loans:0,premium:0}));
assert.throws(()=>A.acquisition(opening,seller,{deposits:0,loans:9500001,premium:0}));
assert.throws(()=>A.acquisition(opening,opening,{deposits:0,loans:0,premium:0}));
assert.equal(JSON.stringify(seller),snapshot);
// Quotes use actual project prices, recruiting costs, and capability budget totals.
const planner=create(),player=planner.players[0],basePlan=E.chooseBot(planner,0);
const wealthy=A.transact(opening,'issueEquity',50000000),plannedBefore=JSON.stringify(player);
for(const key of Object.keys(E.PROJECTS)){
 const plan={...basePlan,newProjects:[key],newProject:null,hires:2,investments:{network:50000},competitiveAction:'none'};
 const quote=E.planBudget(player,plan),result=A.planSpending(wealthy,player,plan);
 assert.equal(result.expense,quote.total);
 assert.equal(wealthy.accounts.cash-result.book.accounts.cash,quote.total);
 assert.equal(wealthy.accounts.equity-result.book.accounts.equity,quote.total);
 A.check(result.book);
}
assert.equal(JSON.stringify(player),plannedBefore);
const events=[{kind:'research',amount:100000},{kind:'opportunity',offer:{type:'business',value:500000}},{kind:'milestoneCapital',amount:100000},{kind:'franchise',cashIncome:20000,depositInflow:50000}];
const batch=A.activities(opening,events);A.check(batch);assert.equal(batch.retainedEarnings,5000);assert.equal(batch.accounts.equity,1905000);
assert.throws(()=>A.activities(opening,[...events,{kind:'project',amount:50000000}]));
assert.equal(JSON.stringify(opening),frozen,'all failed and successful adapters preserve input books');
let expected=copy(opening.accounts),earnings=0;
for(const e of batch.journal){for(const [k,n] of Object.entries(e.changes))expected[k]+=n;earnings+=e.earnings}
assert.deepEqual(expected,copy(batch.accounts));assert.equal(earnings,batch.retainedEarnings);
console.log('Accounting activity tests passed: expense/capital classification, 24 live opportunity rewards, '+deals+' live acquisition comparisons, two-sided settlements, debt conservation, penalties, franchise funding and atomic batches. Campaign economy remains v1/v2.');
