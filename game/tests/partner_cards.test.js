'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const context={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);const E=context.BWEngine,C=E.PartnerCards,copy=x=>JSON.parse(JSON.stringify(x));
const flags={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true,currentDigitalCommercial:true,currentPartnerCards:true};
const create=(cards=true)=>E.createGame({...E.previewCampaignEdition({},'expanded',{...flags,currentPartnerCards:cards}).options,mode:'hotseat',seed:'partner-card-journey',created:1,startingWorkforce:'covered'});
function plan(g,i=0){const q=E.chooseBot(g,i);return {...q,cardPolicy:C.defaults(g.players[i]),newProjects:[],newProject:null,projectTargets:{},nodeFunding:{},investments:{},hires:0,specialistHires:E.emptySpecialistOrders(),opportunity:null,contractBid:null,contractExit:null,competitiveAction:'none',capitalAction:false,decision:'b',departmentPolicy:{...q.departmentPolicy,envelopes:{...q.departmentPolicy.envelopes,research:250000}}};}
test('explicit 9.38 boundary, initialized finite books, pure quote, privacy and old saves',()=>{
 const g=create();assert.equal(g.version,'9.38');E.validatePilot(g);const proposed=plan(g),before=JSON.stringify(g),q=C.quote(g,g.players[0],proposed);assert.equal(q.cost,0);assert.equal(JSON.stringify(g),before);assert.equal(g.cardMarket.prospects.length,80);
 const v=E.publicState(g,0);assert.equal(v.partnerCardsVersion,1);assert.equal(v.rival.cardProgram,undefined);assert.equal(v.cardMarket,undefined);C.validate(v,'view');assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));
 const old=create(false);assert.equal(old.version,'9.37');assert.equal(old.cardMarket,undefined);assert.throws(()=>C.validatePlan(old,old.players[0],{cardPolicy:{action:'launch',intake:false,marketing:0}}),/9.38/);
 const invalid=copy(g);invalid.cardMarket.prospects.pop();assert.throws(()=>E.validatePilot(invalid));assert.throws(()=>C.policy(g.players[0],{cardPolicy:{action:'launch',intake:false,marketing:0}}),/Complete/);
});
test('paid research and deployment survive half-ready migration; normal cycle accounting reconciles',()=>{
 let g=create();
 for(const node of ['digitalArchitecture','relationshipPlanning']){const q=plan(g);q.nodeFunding={[node]:E.DigitalCommercial.NODES[node].cost};E.submit(g,0,q);g=E.migrateCampaign(copy(g));E.submit(g,1,plan(g,1));E.validatePilot(g);}
 let q=plan(g);q.cardPolicy={action:'launch',intake:false,marketing:0};assert.equal(E.planBudget(g.players[0],q,g).cards,25000);E.submit(g,0,q);const v=E.publicState(g,0);assert.equal(v.me.pendingCardPolicy.action,'launch');assert.equal(E.publicState(g,1).lastPlans?.[g.players[0].id]?.cardPolicy,undefined);g=E.migrateCampaign(copy(g));E.submit(g,1,plan(g,1));
 assert.equal(g.players[0].cardProgram.ready,4);assert.equal(g.players[0].cardProgram.history.at(-1).setup,25000);assert.equal(g.players[0].cardProgram.accounts.length,0);E.validatePilot(g);E.validateLedger(g);
 for(let j=0;j<3;j++){q=plan(g);q.cardPolicy={action:'none',intake:true,marketing:1000};E.submit(g,0,q);E.submit(g,1,plan(g,1));E.validatePilot(g);E.validateLedger(g);}
 assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));
});
// Kernel fixtures explicitly fund/learn only to isolate adverse cash paths;
// the preceding journey proves launch with paid research and legal submissions.
function kernel(){const g=create();for(const p of g.players){for(const node of ['digitalArchitecture','relationshipPlanning'])p.digitalCommercial.nodes[node]={funded:E.DigitalCommercial.NODES[node].cost,completed:1};p.cardProgram.status='active';p.cardProgram.ready=1;p._departmentFunctionExecution={rows:['technology','risk'].map(id=>({id,workload:4,delivered:{served:4}}))};}return g;}
const instructions=()=>[{cardPolicy:{action:'none',intake:true,marketing:5000}},{cardPolicy:{action:'none',intake:false,marketing:0}}];
function kernelMonth(g,qs=instructions()){C.settle(g,qs);g.cycle++;C.validate(g,'game');for(let i=0;i<2;i++){const v={version:g.version,cycle:g.cycle,me:{id:g.players[i].id},rival:{},lastPlans:{}};C.project(g,v,i);C.validate(v,'view');}}
test('funded purchases, cash payments, reversals, refunds, arrears and losses conserve counterparties',()=>{
 const g=kernel();let purchase=0,pay=0,loss=0,refund=0,returned=0;
 for(let m=0;m<30;m++){kernelMonth(g);const r=g.players[0].cardProgram.history.at(-1);purchase+=r.purchases;pay+=r.principalPaid;loss+=r.chargeoffs;refund+=r.refunds;returned+=r.returnedPayments;assert.equal(r.authorized,r.purchases+r.reversed+r.failedSettlement);}
 assert(purchase>0);assert(pay>0);assert(loss>0);assert(refund>0);assert(returned>0);assert.equal(g.players[0].accounting.accounts.loans,g.players[1].accounting.accounts.loans,'Partner claims never enter player loan assets');
 const lender=g.companyControlMarket.lender;assert.equal(lender.accounts.businessAssets,C.claims(g));assert.throws(()=>C.settle({...g,cycle:g.cycle-1},instructions()),/exactly once/);
});
test('cash-limited issuer and bank do not mint purchases; wind-down blocks all new borrowing',()=>{
 const g=kernel();kernelMonth(g);const lender=g.companyControlMarket.lender,amount=lender.accounts.cash;g.companyControlMarket.lender=E.GroupAccounting.post(lender,'test.withdrawal','fixture',{cash:-amount,equity:-amount},-amount);
 kernelMonth(g);const b=g.players[0].cardProgram,r=b.history.at(-1);assert.equal(r.purchases,0);assert(r.failedSettlement>0);
 const qs=instructions();qs[0].cardPolicy={action:'windDown',intake:false,marketing:0};kernelMonth(g,qs);assert.equal(b.history.at(-1).purchases,0);assert(['windingDown','closed'].includes(b.status));assert.throws(()=>C.policy(g.players[0],{cardPolicy:{action:'none',intake:true,marketing:0}}),/stop intake/);
});
test('zero delivery coverage allows no intake or new purchases and quotes remain read-only',()=>{
 const g=kernel();for(const p of g.players)for(const row of p._departmentFunctionExecution.rows)row.delivered.served=0;kernelMonth(g);assert.equal(g.players[0].cardProgram.accounts.length,0);assert.equal(g.players[0].cardProgram.history.at(-1).purchases,0);
});
test('unfunded bank delivery pauses without expense or phantom vendor debt',()=>{
 const g=kernel();kernelMonth(g);const p=g.players[0],amount=p.accounting.accounts.cash;p.accounting=E.AccountingPrototype.post(p.accounting,'test.cashWithdrawal',{cash:-amount,equity:-amount},-amount);p.stats.cash=0;p.stats.capital=p.accounting.accounts.equity;p.stats.earnings=p.accounting.retainedEarnings;
 const payables=p.accounting.accounts.payables;kernelMonth(g);const r=p.cardProgram.history.at(-1);assert.equal(r.suspended,true);assert.equal(r.costs+r.marketing+r.purchases,0);assert.equal(p.accounting.accounts.payables,payables);
});
test('shared issuer competition conserves one cash balance and retains no duplicate authorization holds',()=>{
 const g=kernel(),qs=instructions();qs[1]=copy(qs[0]);kernelMonth(g,qs);const book=g.companyControlMarket.lender,withdraw=book.accounts.cash-2000;g.companyControlMarket.lender=E.GroupAccounting.post(book,'test.withdrawal','fixture',{cash:-withdraw,equity:-withdraw},-withdraw);kernelMonth(g,qs);
 assert(g.players.some(p=>p.cardProgram.history.at(-1).failedSettlement>0));assert(g.companyControlMarket.lender.accounts.cash>=0);assert.equal(g.companyControlMarket.lender.accounts.businessAssets,C.claims(g));
 assert(g.players.every(p=>p.cardProgram.accounts.every(a=>a.hold===0)));
});
test('saved books reject missing history, counterfeit balances, duplicate customers and rival leakage',()=>{
 const g=kernel();kernelMonth(g);kernelMonth(g);
 for(const corrupt of [x=>delete x.players[0].cardProgram.history[0].feesPaid,x=>x.players[0].cardProgram.accounts[0].principal++,x=>x.cardMarket.prospects.push(copy(x.cardMarket.prospects[0])),x=>x.cardMarket.netFromBanks++]){const bad=copy(g);corrupt(bad);assert.throws(()=>C.validate(bad,'game'));}
 const v={version:g.version,cycle:g.cycle,me:{id:g.players[0].id},rival:{},lastPlans:{}};C.project(g,v,0);v.rival.cardProgram=copy(g.players[1].cardProgram);assert.throws(()=>C.validate(v,'view'));
 for(const q of [{action:'none',intake:true,marketing:1},{action:'none',intake:true,marketing:5500},{action:'none',intake:false,marketing:1000},{action:'none',intake:true,marketing:0,rewards:100}])assert.throws(()=>C.policy(g.players[0],{cardPolicy:q}));
});
