'use strict';
// Domain and real accounting checks. Full campaign/transport integration is
// tested after the shared Expanded business registry hooks are assembled.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{test}=require('node:test');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
let source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
source=source.replace('root.BWEngine={','root.BWEngine={BrandCampaigns,withCorporateForecast,planFinalCashReserve,beginAdvertisingCycle,adjustAdvertisingReport,finishAdvertisingCycle,cleanupAdvertisingCycle,postMonthlyOperations,');
const c={console};vm.runInNewContext(source,c);const E=c.BWEngine,B=E.BrandCampaigns,copy=x=>JSON.parse(JSON.stringify(x));
function fresh(){return E.createGame({...E.previewCampaignEdition({},'expanded',{currentEconomics:true,currentRivalry:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true}).options,mode:'hotseat',seed:'brand-campaigns',created:1});}
function plan(p,changes={}){const policy=B.defaults(p);Object.assign(policy.regular,changes);return {brandCampaignPolicy:policy};}
function intent(p,changes={}){return {focus:p.focus,allocation:copy(p.allocation),decision:'b',depositPolicy:p.policies.deposit,lendingPolicy:p.policies.lending,capitalPolicy:p.policies.capital,products:copy(p.products),newProjects:[],investments:{},hires:0,competitiveAction:'none',...plan(p),...changes};}
function turn(g,first=intent(g.players[0]),second=intent(g.players[1])){E.submit(g,0,first);E.submit(g,1,second);E.validatePilot(g);return g;}
function settle(g,p,input){B.apply(p,input.brandCampaignPolicy);E.beginAdvertisingCycle(g,p);const expense=p._advertisingCycle.spent,r={expense:0,profit:0};E.adjustAdvertisingReport(p,r);E.finishAdvertisingCycle(g,p);E.cleanupAdvertisingCycle(p);return {expense,r};}
test('quotes are pure, fixed team coverage and installment totals remain explicit',()=>{
 const g=fresh(),p=g.players[0],a=plan(p,{mode:'general',scope:'served',budget:23457});a.brandCampaignPolicy.sponsorship={action:'start',package:'burs',scope:'served',market:'northside'};const before=JSON.stringify({g,a}),q=B.quote(g,p,a);
 assert.equal(q.total,53457);assert.equal(q.futurePayments,150000);assert.equal(q.endMonth,6);assert.equal(q.cancellationFee,60000);assert.deepEqual(copy(q.sponsorMarkets),['downtown']);assert.equal(JSON.stringify({g,a}),before);
});
test('all served markets split one campaign budget and general exposure has diminishing returns',()=>{
 const g=fresh(),p=g.players[0];p.branches.northside=1;const a=plan(p,{mode:'general',scope:'served',budget:40001}),before=JSON.stringify(p.stats);B.apply(p,a.brandCampaignPolicy);E.beginAdvertisingCycle(g,p);
 const rows=p._brandCampaignCycle.regularRows;assert.equal(rows.reduce((n,r)=>n+r.spend,0),40001);assert.equal(rows.filter(r=>r.market==='downtown').reduce((n,r)=>n+r.spend,0),20001);assert.equal(rows.filter(r=>r.market==='northside').reduce((n,r)=>n+r.spend,0),20000);assert.equal(JSON.stringify(p.stats),before);assert(rows.every(r=>r.after<=10000));assert.equal(p._advertisingCycle.spent,40001);
 assert.throws(()=>E.beginAdvertisingCycle(g,p),/already/);E.adjustAdvertisingReport(p,{expense:0,profit:0});E.finishAdvertisingCycle(g,p);assert.throws(()=>E.finishAdvertisingCycle(g,p),/exactly once/);E.cleanupAdvertisingCycle(p);
 const first=copy(p.brandCampaigns.awareness.regular);g.cycle++;settle(g,p,a);for(const [m,row]of Object.entries(first))for(const [s,mix]of Object.entries(row))for(const [k,n]of Object.entries(mix))assert(p.brandCampaigns.awareness.regular[m][s][k]<=Math.floor(n*.75)+(10000-Math.floor(n*.75)));
});
test('six contractual installments charge exactly $180k and awareness fades after expiry',()=>{
 const g=fresh(),p=g.players[0],a=plan(p);a.brandCampaignPolicy.sponsorship.action='start';a.brandCampaignPolicy.sponsorship.package='burs';let total=0,starts=0;
 for(let cycle=1;cycle<=6;cycle++){g.cycle=cycle;const result=settle(g,p,cycle===1?a:plan(p));total+=result.expense;starts+=p.brandCampaigns.events.filter(e=>e.type==='start').length;assert.equal(result.expense,30000);}
 assert.equal(total,180000);assert.equal(starts,1);assert.equal(p.brandCampaigns.contract,null);const before=p.brandCampaigns.awareness.sponsorship.downtown.everyday.essential;assert(before>0);g.cycle=7;assert.equal(settle(g,p,plan(p)).expense,0);assert.equal(p.brandCampaigns.awareness.sponsorship.downtown.everyday.essential,Math.floor(before*.85));
});
test('cancellation charges at most two remaining installments and blocks a second contract',()=>{
 const g=fresh(),p=g.players[0],a=plan(p);a.brandCampaignPolicy.sponsorship.action='start';a.brandCampaignPolicy.sponsorship.package='burs';settle(g,p,a);g.cycle=2;assert.throws(()=>B.normalize(p,a),/one sponsorship/);const stop=plan(p);stop.brandCampaignPolicy.sponsorship.action='cancel';assert.equal(B.quote(g,p,stop).sponsorDue,60000);assert.equal(settle(g,p,stop).expense,60000);assert.equal(p.brandCampaigns.contract,null);assert.equal(p.brandCampaigns.report.sponsorActive,false);assert.throws(()=>B.normalize(p,stop),/no active sponsorship/);
});
test('unfunded new contract creates no obligation or exposure; an existing payment never disappears',()=>{
 const g=fresh(),p=g.players[0],a=plan(p);a.brandCampaignPolicy.sponsorship.action='start';a.brandCampaignPolicy.sponsorship.package='burs';p.stats.cash=0;assert.equal(settle(g,p,a).expense,0);assert.equal(p.brandCampaigns.contract,null);assert.equal(p.brandCampaigns.report.startFailed,true);assert(p.brandCampaigns.report.sponsorRows.length===0);
 const funded=fresh(),bank=funded.players[0];settle(funded,bank,a);funded.cycle=2;bank.stats.cash=0;assert.equal(settle(funded,bank,plan(bank)).expense,30000);assert.equal(bank.brandCampaigns.contract.status,'suspended');assert.equal(bank.brandCampaigns.report.sponsorActive,false);assert.equal(bank.brandCampaigns.contract.paidMonths,2);
});
test('new sponsorship expense enters the real operating accounting once',()=>{
 const a=fresh(),b=copy(a),p=a.players[0],q=b.players[0],input=intent(p);input.brandCampaignPolicy.sponsorship.action='start';input.brandCampaignPolicy.sponsorship.package='burs';
 // The normal operation coordinator starts/finishes advertising and posts the
 // operating expense through accounting, including any required funding.
 turn(a,input);turn(b);E.AccountingPrototype.check(p.accounting);E.AccountingPrototype.check(q.accounting);assert.equal(p.operatingReport.advertisingCost,30000);assert.equal(q.operatingReport.advertisingCost,0);assert.equal(p.brandCampaigns.lastCycle,1);assert.equal(p._advertisingCycle,undefined);assert.equal(p._brandCampaignCycle,undefined);
});
test('public projection exposes the sponsorship identity but no private campaign budget',()=>{
 const g=fresh(),p=g.players[0],a=plan(p,{mode:'general',budget:12345});a.brandCampaignPolicy.sponsorship.action='start';a.brandCampaignPolicy.sponsorship.package='burs';settle(g,p,a);const out=B.project(g,{me:{},rival:{}},1);assert.equal(out.rival.brandCampaigns,undefined);assert.equal(out.rival.sponsorship.package,'burs');assert(out.rival.sponsorshipEvents.some(e=>e.type==='start'));assert(!JSON.stringify(out.rival).includes('12345'));
});
test('legacy campaigns receive no brand state and invalid instructions fail closed',()=>{
 const g=E.createGame({mode:'hotseat',seed:'brand-legacy',created:1}),before=JSON.stringify(g);B.initialize(g);assert.equal(JSON.stringify(g),before);assert.throws(()=>B.normalize(g.players[0],{brandCampaignPolicy:{}}),/new Expanded/);
 const modern=fresh(),p=modern.players[0];for(const amount of [-1,1.5,250001,NaN])assert.throws(()=>B.normalize(p,plan(p,{mode:'general',budget:amount})),/whole-dollar/);const invalid=plan(p);invalid.brandCampaignPolicy.extra=true;assert.throws(()=>B.normalize(p,invalid),/Invalid brand/);
});
test('half-ready save resumes the exact private campaign and settles only once',()=>{
 const g=fresh(),input=intent(g.players[0],plan(g.players[0],{mode:'general',scope:'served',budget:12345}));input.brandCampaignPolicy.sponsorship={action:'start',package:'burs',scope:'market',market:'downtown'};
 E.submit(g,0,input);const locked=JSON.stringify(g);assert.throws(()=>E.submit(g,0,input),/already locked/);assert.equal(JSON.stringify(g),locked);
 const mine=E.publicState(g,0),other=E.publicState(g,1);B.validateView(mine);B.validateView(other);assert.deepEqual(copy(mine.me.pendingBrandCampaignPolicy),copy(input.brandCampaignPolicy));assert.equal(other.rival.pendingBrandCampaignPolicy,undefined);assert.equal(other.rival.brandCampaigns,undefined);
 const resumed=E.migrateCampaign(copy(g));E.submit(g,1,intent(g.players[1]));E.submit(resumed,1,intent(resumed.players[1]));assert.equal(JSON.stringify(resumed),JSON.stringify(g));E.validatePilot(g);
 assert.equal(g.players[0].operatingReport.advertisingCost,42345);assert.equal(g.players[0].brandCampaigns.contract.paidMonths,1);assert.equal(g.players[0].brandCampaigns.events.filter(e=>e.type==='start').length,1);
 const before=JSON.stringify(g),publicOther=E.publicState(g,1);assert.equal(publicOther.lastPlans[g.players[0].id].brandCampaignPolicy,undefined);assert.equal(JSON.stringify(g),before,'Projection must not redact the authoritative last plan');B.validateView(publicOther);
});
test('targeted all-served budget is split only among currently eligible offers and closure pauses',()=>{
 const g=fresh(),p=g.players[0];p.branches.northside=1;const x=plan(p,{mode:'targeted',scope:'served',budget:15001});p.productPrograms.markets.northside.everyday.essential=0;
 const q=B.quote(g,p,x);assert.deepEqual(copy(q.markets),['downtown']);settle(g,p,x);assert.equal(p.brandCampaigns.report.regularRows.reduce((n,r)=>n+r.spend,0),15001);
 p.productPrograms.markets.downtown.everyday.essential=0;const closed=B.quote({...g,cycle:2},p,x);assert.equal(closed.regularRequested,0);assert.equal(closed.policy.regular.mode,'off');
 for(const m of Object.keys(p.branches))p.branches[m]=0;assert.throws(()=>B.normalize(p,plan(p,{mode:'general',scope:'served',budget:1})),/served markets/);
});
test('community contract ends after one payment and cannot create a second recurring charge',()=>{
 const g=fresh(),input=intent(g.players[0]);input.brandCampaignPolicy.sponsorship.action='start';turn(g,input);const p=g.players[0];assert.equal(p.operatingReport.advertisingCost,15000);assert.equal(p.brandCampaigns.contract,null);assert.deepEqual(copy(p.brandCampaigns.events.map(e=>e.type)),['start','end']);
 turn(g);assert.equal(p.operatingReport.advertisingCost,0);assert.equal(p.brandCampaigns.events.length,0);E.validatePilot(E.migrateCampaign(copy(g)));
});
test('campaign forecasts are pure, include the same expense, and obsolete advertising cannot double charge',()=>{
 const g=fresh(),p=g.players[0],input=intent(p,plan(p,{mode:'general',budget:12345}));input.advertisingPolicy={...p.advertising.policy,budget:80000};input.brandCampaignPolicy.sponsorship.action='start';input.brandCampaignPolicy.sponsorship.package='burs';
 E.normalizeAdvertisingPlan(p,input);assert.equal(input.advertisingPolicy.budget,0);const before=JSON.stringify({g,input}),v=E.publicState(g,0),q=E.operatingPreview(v.me,input,v.economy,v);assert.equal(q.advertisingCost,42345);assert.equal(E.planBudget(v.me,input,v).advertising,42345);assert.equal(JSON.stringify({g,input}),before);turn(g,input);assert.equal(p.operatingReport.advertisingCost,42345);
});
test('malformed reports, awareness, private view leaks and unpaid books fail validation',()=>{
 const g=fresh(),input=intent(g.players[0],plan(g.players[0],{mode:'general',budget:15000}));input.brandCampaignPolicy.sponsorship.action='start';input.brandCampaignPolicy.sponsorship.package='burs';turn(g,input);
 for(const damage of [p=>p.brandCampaigns.report.sponsorDue++,p=>p.brandCampaigns.report.regularRows[0].spend++,p=>p.brandCampaigns.report.sponsorRows[0].after++,p=>p.brandCampaigns.report.regularRows.push(copy(p.brandCampaigns.report.regularRows[0])),p=>p.brandCampaigns.awareness.regular.downtown.everyday.essential++,p=>p.brandCampaigns.contract.paidMonths++,p=>p.advertising.report.assistedDeposits++,p=>p.advertising.report.rows[0].households++,p=>p.advertising.report.rows=[],p=>p.advertising.policy.budget=15000]){const bad=copy(g);damage(bad.players[0]);assert.throws(()=>B.validate(bad));}
 const v=E.publicState(g,0);v.rival.pendingBrandCampaignPolicy=B.defaults(g.players[1]);assert.throws(()=>B.validateView(v),/private/);delete v.rival.pendingBrandCampaignPolicy;v.me.pendingBrandCampaignPolicy=B.defaults(g.players[0]);assert.throws(()=>B.validateView(v),/locked plan/);
});
test('an already signed payment stays mandatory when liquid cash is exhausted',()=>{
 const g=fresh(),input=intent(g.players[0]);input.brandCampaignPolicy.sponsorship.action='start';input.brandCampaignPolicy.sponsorship.package='burs';turn(g,input);
 const p=g.players[0],cash=p.stats.cash;p.accounting=E.AccountingPrototype.post(p.accounting,'treasury.reserve',{cash:-cash,securities:cash});p.treasury.liquid+=cash;p.stats.cash=0;const next=intent(p);next.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);for(const office of Object.values(next.facilityLifecyclePolicy.offices))office.maintenance='off';const v=E.publicState(g,0),q=E.planBudget(v.me,next,v);assert.equal(B.mandatory(p,next),30000);assert(q.mandatoryObligations>=30000);
 const optional=copy(next);optional.brandCampaignPolicy.regular={...optional.brandCampaignPolicy.regular,mode:'general',budget:1000};assert.throws(()=>E.submit(copy(g),0,optional),/available|reserve|cash/,'Mandatory payment cannot subsidize a new discretionary advertisement');
 turn(g,next);const settled=g.players[0];assert.equal(settled.operatingReport.advertisingCost,30000);assert.equal(settled.brandCampaigns.contract.paidMonths,2);assert.equal(settled.brandCampaigns.contract.status,'suspended');assert.equal(settled.brandCampaigns.report.sponsorRows.length,0);assert.equal(E.AccountingPrototype.check(settled.accounting).residual,0);
});
test('both banks publish start once in seat order and continuing contracts do not repeat it',()=>{
 const g=fresh(),orders=g.players.map((p,i)=>{const x=intent(p);x.brandCampaignPolicy.sponsorship.action='start';x.brandCampaignPolicy.sponsorship.package=i?'community':'burs';return x;});turn(g,...orders);
 const messages=g.players.map(p=>p.brandCampaigns.events.find(e=>e.type==='start').text);assert.deepEqual(copy(g.resolution.slice(0,2)),copy(messages));for(const text of messages)assert.equal(g.resolution.filter(x=>x===text).length,1);
 for(let seat=0;seat<2;seat++){const v=E.publicState(g,seat);B.validateView(v);assert.equal(v.me.sponsorshipEvents.filter(e=>e.type==='start').length,1);assert.equal(v.rival.sponsorshipEvents.filter(e=>e.type==='start').length,1);assert.equal(v[seat?'rival':'me'].sponsorship.package,'burs');assert.equal(v[seat?'me':'rival'].sponsorship,null);}
 turn(g);for(const text of messages)assert(!g.resolution.includes(text));assert.equal(g.players[0].brandCampaigns.contract.paidMonths,2);
});
test('modern AI uses the canonical campaign and late cash cleanup never cancels an existing contract',()=>{
 const g=fresh(),p=g.players[1];p.stats.lastProfit=200000;p.householdBook.policy.retention=50;const input=intent(p),before=JSON.stringify({g,input}),selected=B.plan(g,1,input);assert.equal(selected.brandCampaignPolicy.regular.mode,'targeted');assert.equal(selected.brandCampaignPolicy.regular.budget,15000);assert.equal(JSON.stringify({g,input}),before);assert.equal(selected.brandCampaignPolicy.sponsorship.action,'none');
 const current=fresh(),start=intent(current.players[0]);start.brandCampaignPolicy.sponsorship.action='start';start.brandCampaignPolicy.sponsorship.package='burs';turn(current,start);const owner=current.players[0],cash=owner.stats.cash-50000;owner.accounting=E.AccountingPrototype.post(owner.accounting,'treasury.reserve',{cash:-cash,securities:cash});owner.treasury.liquid+=cash;owner.stats.cash=50000;
 const proposed=E.chooseBot(current,0);proposed.brandCampaignPolicy.regular={...proposed.brandCampaignPolicy.regular,mode:'general',budget:80000};const stable=JSON.stringify(current),trimmed=E.withCorporateForecast(current,()=>E.planFinalCashReserve(current,0,proposed));assert.equal(trimmed.brandCampaignPolicy.regular.budget,0);assert.equal(trimmed.brandCampaignPolicy.regular.mode,'off');assert.equal(trimmed.brandCampaignPolicy.sponsorship.action,'none');assert.equal(B.mandatory(owner,trimmed),30000);assert.equal(JSON.stringify(current),stable);E.submit(current,0,trimmed);E.submit(current,1,E.chooseBot(current,1));E.validatePilot(current);
});
