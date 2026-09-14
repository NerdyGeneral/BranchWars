'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),ctx={};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,{GroupAccounting:G,CompanyConsolidation:C}=E,copy=x=>JSON.parse(JSON.stringify(x));
const book=(id,cash)=>G.post(G.opening(id),'fixture.capital','external-founder',{cash,equity:cash});
const base=(assets=2000000,liabilities=0,retainedEarnings=0)=>({assets,liabilities,equity:assets-liabilities,retainedEarnings,custodyAssets:0,operatingAssets:assets,eliminatedInvestment:0,residual:0});
const capture=b=>C.capture({month:3,book:b,sharesBefore:0,basisBefore:0,addedShares:60000,purchase:720000});
const row=(b,a=capture(b),rest={})=>({issuer:'company:0',shares:60000,basis:720000,book:b,acquisition:a,internalDeposits:0,internalFees:0,...rest});

test('controlled totals eliminate investment basis, identify outside equity and never move real money',()=>{
 const b=book('company:0',1000000),a=capture(b),entries=[row(b,a)],before=JSON.stringify(entries),s=C.summarize(base(),entries);
 assert.equal(s.assets,2400000);assert.equal(s.equity,2400000);assert.equal(s.ownerEquity,2000000);assert.equal(s.noncontrollingEquity,400000);assert.equal(s.companyGoodwill,120000);assert.equal(s.controlledBasisEliminated,720000);assert.equal(s.residual,0);assert.equal(JSON.stringify(entries),before);
 assert.equal(C.summarize(base(),[]).ownerEquity,2000000);
 assert.throws(()=>C.summarize(base(),[...entries,...entries]),/worksheet/);
 assert.throws(()=>C.summarize(base(),[row(b,a,{shares:50000})]),/controlling/);
});
test('only post-acquisition earnings belong to the group and dividends do not count twice',()=>{
 const opening=G.post(book('company:0',900000),'historic.profit','external-customer',{cash:100000,equity:100000},100000),a=capture(opening);
 assert.equal(C.summarize(base(),[row(opening,a)]).retainedEarnings,0);
 const earned=G.post(opening,'sales','external-customer',{cash:100000,equity:100000},100000),before=C.summarize(base(),[row(earned,a)]);
 assert.equal(before.ownerEquity,2060000);assert.equal(before.retainedEarnings,60000);
 const paid=G.post(earned,'dividend','shareholders',{cash:-100000,equity:-100000},-100000),after=C.summarize(base(2060000,0,60000),[row(paid,a)]);
 assert.equal(after.ownerEquity,before.ownerEquity);assert.equal(after.retainedEarnings,before.retainedEarnings);assert.equal(after.noncontrollingEquity,400000);
});
test('own-bank deposit and service claims cancel on both sides, not at other banks',()=>{
 const b=G.post(book('company:0',1000000),'service.invoice','bank',{payables:10000,equity:-10000},-10000),a=capture(b);
 const outside=C.summarize(base(2400000,400000),[row(b,a)]),internal=C.summarize(base(2400000,400000),[row(b,a,{internalDeposits:300000,internalFees:10000})]);
 assert.equal(outside.assets-internal.assets,310000);assert.equal(outside.liabilities-internal.liabilities,310000);assert.equal(internal.ownerEquity,outside.ownerEquity);assert.equal(internal.internalBalancesEliminated,310000);
 assert.throws(()=>C.summarize(base(),[row(b,a,{internalFees:10001})]),/Internal/);
 assert.throws(()=>C.summarize(base(),[row(b,a,{internalDeposits:1000001})]),/Internal/);
});
test('additional purchases preserve earlier goodwill and earnings; reduced holdings scale correctly',()=>{
 const b=book('company:0',1000000),a=capture(b),earned=G.post(b,'sales','customers',{cash:100000,equity:100000},100000);
 const next=C.capture({month:9,book:earned,sharesBefore:60000,basisBefore:720000,addedShares:10000,purchase:140000,previous:a});
 assert.equal(C.goodwill(next),150000);assert.equal(next.earningsOffset,60000);
 const s=C.summarize(base(),[row(earned,next,{shares:70000,basis:860000})]);assert.equal(s.ownerEquity,2060000);assert.equal(s.retainedEarnings,60000);
 assert.equal(C.contribution(next,earned,56000).goodwill,120000);assert.equal(C.contribution(next,earned,56000).earnings,48000);
 const reacquired=C.capture({month:15,book:earned,sharesBefore:40000,basisBefore:400000,addedShares:20000,purchase:300000,previous:a});assert.equal(reacquired.continuedControl,false);assert.equal(reacquired.earningsOffset,0);
 assert.throws(()=>C.capture({month:9,book:earned,sharesBefore:60000,basisBefore:720000,addedShares:10000,purchase:140000}),/worksheet/);
 assert.throws(()=>C.contribution(a,earned,70000),/increased/);
});

function fresh(funded=false){const g=E.createGame({...{...E.previewCampaignEdition({},'expanded').options,sharedPremisesVersion:0,companyControlStrategyVersion:0},mode:'hotseat',seed:5,created:1});
 // Explicit external founder fixture tests funded mechanics, not ordinary balance.
 if(funded)for(const p of g.players)p.financialGroup.parent=G.post(p.financialGroup.parent,'fixture.shareholders','external-test-shareholder',{cash:3000000,equity:3000000});return g;}
function plan(g,i){const p=g.players[i],x={...E.chooseBot(g,i),companyControlPolicy:E.defaultCompanyControlPlan(p),companyShareOrders:[],investmentPolicy:E.defaultInvestmentPlan(p),investments:{},newProjects:[],newProject:null};x.groupPolicy.bankSupport=0;x.groupPolicy.bankDividend=0;return x;}
function advance(g,edit=()=>{}){const plans=g.players.map((p,i)=>plan(g,i));edit(plans);for(let i=0;i<2;i++)E.submit(g,i,plans[i]);E.validatePilot(g);E.validateLedger(g);for(let i=0;i<2;i++)E.validateFinancialGroupView(E.publicState(g,i));}
test('new reporting boundary is explicit, owner-private and preserved by recovery and rematch',()=>{
 const g=fresh();assert.equal(g.version,'9.25');assert.equal(E.campaignCapabilities().companyConsolidationSupported,1);
 const caps=E.campaignCapabilities();delete caps.companyConsolidationSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'companyConsolidationVersion');
 for(const change of [x=>delete x.companyConsolidationVersion,x=>x.companyConsolidationVersion=2,x=>x.version='9.24',x=>delete x.players[0].companyConsolidation]){const x=copy(g);change(x);assert.throws(()=>E.migrateCampaign(x));}
 const v=E.publicState(g,0);E.validateFinancialGroupView(v);v.rival.companyConsolidation=copy(v.me.companyConsolidation);assert.throws(()=>E.validateFinancialGroupView(v),/Private acquisition/);
 E.migrateCampaign(copy(g));g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.25');assert.equal(g.companyConsolidationVersion,1);
});
test('real campaign closes, reconciles company claims, restores half-ready plans and removes sold control',()=>{
 const g=fresh(true);advance(g,p=>p[0].companyControlPolicy.diligence='company:0');
 const offer={issuer:'company:0',shares:50001,priceCents:Math.ceil(E.companyControlCompany(g,'company:0').referenceCents*1.5),borrow:5000};
 const plans=g.players.map((p,i)=>plan(g,i));plans[0].companyControlPolicy.offer=offer;E.submit(g,0,plans[0]);assert.equal(E.migrateCampaign(copy(g)).companyConsolidationVersion,1);E.submit(g,1,plans[1]);
 advance(g);const p=g.players[0],a=p.companyConsolidation.acquisitions['company:0'];assert(a);assert.equal(a.month,3);assert.equal(p.financialGroup.parent.accounts.debt,5000);
 const s=E.companyConsolidatedSummary(g,p);assert.equal(s.controlledCompanies.length,1);assert.equal(s.residual,0);assert.equal(s.ownerEquity,s.equity-s.noncontrollingEquity);
 const before=JSON.stringify(g);E.publicState(g,0);E.companyConsolidatedSummary(g,p);assert.equal(JSON.stringify(g),before);
 for(const mutate of [x=>x.players[0].companyConsolidation.acquisitions['company:0'].purchase++,x=>x.players[0].companyConsolidation.acquisitions['company:0'].netAssets++,x=>delete x.players[0].companyConsolidation.acquisitions['company:0']]){const bad=copy(g);mutate(bad);assert.throws(()=>E.migrateCampaign(bad));}
 const v=E.publicState(g,0);v.me.groupSummary.controlledCompanies[0].goodwill++;assert.throws(()=>E.validateFinancialGroupView(v),/totals/);
 for(let month=0;month<6;month++)advance(g);
 assert.equal(g.players[0].companyControl.deals[0].integration.workDone,6);assert.equal(g.players[0].companyConsolidation.acquisitions['company:0'].month,3,'Acquisition basis must not roll forward with current earnings');E.migrateCampaign(copy(g));
 advance(g,p=>{p[0].companyShareOrders=[{issuer:'company:0',side:'sell',shares:1000,limitCents:1}];});
 assert(g.players[0].companyShares.positions['company:0'].shares<=50000);assert.equal(g.players[0].companyConsolidation.acquisitions['company:0'],undefined);assert.equal(E.companyConsolidatedSummary(g,g.players[0]).controlledCompanies.length,0);assert(g.players[0].financialGroup.parent.accounts.debt>0,'Selling control does not forgive acquisition debt');E.migrateCampaign(copy(g));
});
