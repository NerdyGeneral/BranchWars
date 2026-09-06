'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const hooks='root.segmentTest={withMarket,delta,transferMarket,syncAccounts,settleHouseholdRetention,prepareTermFunding,takeDeposits,compactDeposits,repriceWithdrawableDeposits,segmentRetentionOutflow};';
const ctx={console};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',hooks+'root.BWEngine={'),ctx);
const E=ctx.BWEngine,H=ctx.segmentTest;
const options={segmentDepositsVersion:1,creditPerformanceVersion:1,customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,serviceExpansionVersion:1,campaignRulesVersion:1,mode:'hotseat',seed:42,created:1};
const fresh=extra=>E.createGame({...options,...extra});
const plan=p=>({focus:p.focus,allocation:{...p.allocation},decision:'b',depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',products:{...p.products},newProjects:[],investments:{},hires:0,competitiveAction:'none'});
const sum=(xs,key)=>xs.reduce((n,x)=>n+x[key],0);
function totals(g){return Object.fromEntries(Object.entries(g.marketEconomy.markets).map(([key,m])=>[key,Object.fromEntries(Object.keys(E.CUSTOMER_SEGMENTS).map(s=>[s,m.segmentDeposits.community[s]+m.segmentDeposits.union[s]+g.players.reduce((n,p)=>n+sum(p.depositBook.cohorts.filter(c=>c.market===key&&c.segment===s),'principal'),0)]))]));}
const g=fresh(),p=g.players[0],initial=totals(g);assert.equal(g.version,'8.8');E.validatePilot(g);
assert.throws(()=>fresh({segmentDepositsVersion:2}),/version/);assert.throws(()=>fresh({creditPerformanceVersion:0}),/requires/);
const old=fresh({segmentDepositsVersion:0});assert.equal(old.version,'8.7');assert.equal(old.players[0].segmentDeposits,undefined);
const opening=E.segmentDepositSummary(p,g);assert.equal(sum(Object.values(opening.rows),'principal'),p.stats.deposits);
const downtown=opening.markets.downtown,counts=p.householdBook.markets.downtown;
assert(downtown.reserve.principal/counts.reserve>3.9*downtown.everyday.principal/counts.everyday);
assert.equal(opening.fees,p.stats.customers*6);
assert.equal(sum(Object.values(opening.rows),'service'),opening.service);
assert.equal(sum(Object.values(opening.markets).flatMap(Object.values),'directCost')+opening.centralPlatform,opening.interest+opening.service-opening.fees);
const unchanged=JSON.stringify(g);E.segmentDepositSummary(p,g);assert.equal(JSON.stringify(g),unchanged);
// Active zero-balance platforms still cost money; they are not allocated to an invented owner.
const idle=copy(p);idle.retailLifecycle.mix={essential:1,rewards:1,highYield:1};
assert.equal(E.segmentDepositSummary(idle,g).centralPlatform,22000);
assert.equal(JSON.stringify(p),JSON.stringify(g.players[0]));
H.withMarket(g,()=>{H.delta(p,'deposits',100000);H.delta(p,'deposits',-234567);H.transferMarket(g,p,g.players[1],'downtown','deposits',112233)});
assert.deepEqual(totals(g),initial);E.validatePilot(g);
// Whole-book and partial acquisitions keep segment ownership, guarantees and pending exits.
const beforeAcq=totals(g);E.finishProject(g,p,{key:'acquisition',target:'northside'});assert.deepEqual(totals(g),beforeAcq);E.validatePilot(g);
const promises=fresh(),seller=promises.players[0],buyer=promises.players[1];
const guaranteed=seller.depositBook.cohorts.find(c=>c.market==='downtown'&&c.segment==='reserve');
guaranteed.product='highYield';guaranteed.remaining=5;guaranteed.rate=4321;
H.withMarket(promises,()=>H.transferMarket(promises,seller,buyer,'downtown','deposits',200000));
assert(buyer.depositBook.cohorts.some(c=>c.segment==='reserve'&&c.rate===4321&&c.remaining===5));E.validatePilot(promises);
const changedMix=copy(seller),book=copy(changedMix.depositBook);changedMix.retailLifecycle.mix={essential:0,rewards:0,highYield:4};
assert.deepEqual(copy(changedMix.depositBook),book);
// Retention pulls only the abandoned segment's own account balance, not another's.
const poor=fresh(),bad=poor.players[0],key='downtown',owned=copy(bad.householdBook.markets[key]);
const beforeRows=copy(E.segmentDepositSummary(bad,poor).markets[key]),moneyBefore=copy(bad.accounting.accounts);
H.withMarket(poor,()=>H.segmentRetentionOutflow(poor,bad,key,{everyday:0,connected:0,reserve:5}));
const afterRows=E.segmentDepositSummary(bad,poor).markets[key],out=Math.floor(beforeRows.reserve.principal*5/owned.reserve);
assert.equal(afterRows.reserve.principal,beforeRows.reserve.principal-out);assert.equal(afterRows.everyday.principal,beforeRows.everyday.principal);
assert.equal(bad.stats.cash,moneyBefore.cash-out);assert.equal(bad.stats.capital,moneyBefore.equity);assert.deepEqual(totals(poor),totals(fresh()));
// Locked funds stay until maturity. Recurring neglect cannot mark them twice;
// forced renewal cannot capture former customers' money forever.
const term=fresh(),tp=term.players[0],totalBefore=totals(term);
tp.termFunding.policy={offer:'six',maturity:'renew'};H.prepareTermFunding(term,tp);
const locked=tp.depositBook.cohorts.filter(c=>c.locked);assert(locked.length>1);
for(const r of Object.values(tp.customerRelationships.markets))for(const s of Object.keys(r))r[s]=0;
const retained=H.settleHouseholdRetention(term,tp);assert(retained.departed>0);
const pending=sum(tp.depositBook.cohorts,'exiting');assert(pending>0);
assert(tp.depositBook.cohorts.filter(c=>c.exiting).every(c=>c.locked));
for(const c of tp.depositBook.cohorts.filter(c=>c.locked))c.remaining=1;
term.cycle=2;tp.termFunding.policy.offer='off';
const assets=copy(tp.accounting.accounts),mature=H.prepareTermFunding(term,tp);
assert.equal(mature.departed,pending);assert.equal(tp.stats.deposits,assets.deposits-pending);assert.equal(tp.stats.cash,assets.cash-pending);assert.equal(tp.stats.capital,assets.equity);
assert.equal(sum(tp.depositBook.cohorts,'exiting'),0);assert.deepEqual(totals(term),totalBefore);
const same=JSON.stringify(term);assert.equal(H.prepareTermFunding(term,tp).departed,0);assert.equal(JSON.stringify(term),same);
// Book acquisitions carry locked exit obligations as well as principal.
const acquired=fresh(),ap=acquired.players[0],as=acquired.players[1];
as.termFunding.policy={offer:'six',maturity:'renew'};H.prepareTermFunding(acquired,as);
for(const c of as.depositBook.cohorts.filter(c=>c.locked))c.exiting=Math.floor(c.principal*.4);
const obligations=sum(as.depositBook.cohorts,'exiting'),acquiredTotals=totals(acquired);
E.finishProject(acquired,ap,{key:'acquisition',target:'northside'});
assert(sum(ap.depositBook.cohorts,'exiting')>0);
assert.equal(sum(ap.depositBook.cohorts,'exiting')+sum(as.depositBook.cohorts,'exiting'),obligations);
assert.deepEqual(totals(acquired),acquiredTotals);E.validatePilot(acquired);
// Term maturity previews cannot mutate outside pools, source accounts or RNG.
const maturityPreview=fresh(),mp=maturityPreview.players[0];
mp.termFunding.policy={offer:'six',maturity:'renew'};H.prepareTermFunding(maturityPreview,mp);
for(const c of mp.depositBook.cohorts.filter(c=>c.locked)){c.remaining=1;c.exiting=Math.floor(c.principal/3);}
maturityPreview.cycle=2;const mpBefore=JSON.stringify(maturityPreview),mpCopy=copy(mp);
assert(H.prepareTermFunding(maturityPreview,mpCopy,true).departed>0);
assert.equal(JSON.stringify(maturityPreview),mpBefore);
// No active relationships means no primary-account fees even when money remains.
const empty=fresh(),ep=empty.players[0];H.withMarket(empty,()=>H.delta(ep,'customers',-ep.stats.customers));
assert.equal(E.segmentDepositSummary(ep,empty).fees,0);assert(ep.stats.deposits>0);E.validatePilot(empty);
// Funding stress recognizes the sale loss, rather than treating a withdrawal as an expense.
const stressed=fresh(),sp=stressed.players[0];sp.accounting=E.AccountingPrototype.transact(sp.accounting,'buySecurities',sp.stats.cash);H.syncAccounts(sp);
for(const r of Object.values(sp.customerRelationships.markets))for(const s of Object.keys(r))r[s]=0;
const capital=sp.stats.capital,r=H.settleHouseholdRetention(stressed,sp);assert(r.fundingLoss>0);assert.equal(sp.stats.capital,capital-r.fundingLoss);
E.AccountingPrototype.check(sp.accounting);
// Preview, sealed import continuation, public projection and malformed owner data.
const previewGame=fresh(),serialized=JSON.stringify(previewGame),view=E.publicState(previewGame,0);
assert(view.me.segmentDeposits);assert.equal(view.rival.depositBook,undefined);assert.equal(view.rival.segmentDeposits,undefined);
assert.equal(view.me.marketSnapshot.markets.downtown.segmentDeposits.total,undefined);
E.operatingPreview(view.me,plan(view.me),previewGame.economy);assert.equal(JSON.stringify(previewGame),serialized);
E.submit(previewGame,0,plan(previewGame.players[0]));const imported=E.migrateCampaign(previewGame),next=plan(previewGame.players[1]);
E.submit(previewGame,1,copy(next));E.submit(imported,1,copy(next));E.validatePilot(previewGame);
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
assert.deepEqual(normal(previewGame),normal(imported));
for(const damage of [x=>delete x.segmentDepositsVersion,x=>x.segmentDepositsVersion=2,x=>x.version='8.7',x=>delete x.players[0].segmentDeposits,
 x=>delete x.players[0].depositBook.cohorts[0].segment,x=>x.players[0].depositBook.cohorts[0].segment='unknown',
 x=>x.players[0].depositBook.cohorts[0].exiting=-1,x=>x.players[0].depositBook.cohorts[0].exiting=1,
 x=>x.players[0].operatingReport.termDepartures=-1,x=>x.marketEconomy.markets.downtown.segmentDeposits.total.reserve++,x=>delete x.creditPerformanceVersion]){
 const invalid=copy(previewGame);damage(invalid);const before=JSON.stringify(invalid);assert.throws(()=>E.migrateCampaign(invalid));assert.equal(JSON.stringify(invalid),before);
}
const rematch=copy(previewGame);rematch.gameOver=true;E.rematch(rematch,0);E.rematch(rematch,1);assert.equal(rematch.version,'8.8');E.validatePilot(rematch);
// Reachability and conservation through ordinary simultaneous AI plans.
let turns=0;
for(const scenario of Object.keys(E.SCENARIOS)){
 const world=fresh({scenario,seed:'segment-'+scenario}),conserved=totals(world);
 for(let month=0;month<24&&!world.gameOver;month++){
  const plans=[E.chooseBot(world,0),E.chooseBot(world,1)];E.submit(world,0,plans[0]);E.submit(world,1,plans[1]);E.validatePilot(world);E.validateLedger(world);
  assert.deepEqual(totals(world),conserved);for(const p of world.players)E.AccountingPrototype.check(p.accounting);
  for(const seat of [0,1])assert(Buffer.byteLength(JSON.stringify(E.publicState(world,seat)))<1048576);turns++;
 }
}
const {harness}=require('./github_resilience.test.js'),ui=harness();ui.c.world=fresh();
ui.run("game=world;seat=0;workspaceTab='customers';householdWorkspace='deposits';newDraft(E.publicState(game,0));renderReady=()=>{};renderHouseholds(E.publicState(game,0))");
assert(ui.elements.get('#householdPanel').innerHTML.includes('SEGMENT DEPOSIT BOOK'));
const focus=ui.run('draft.focus');ui.run("selectedHouseholdMarket='university';renderHouseholds(E.publicState(game,0))");assert.equal(ui.run('draft.focus'),focus);
console.log(JSON.stringify({passed:true,turns,checks:['segment balance conservation','finite outside intake','owned retention outflows','promised terms transfer','maturity exits despite renewal','cost reconciliation','funding stress','pure preview','sealed save','corrupt imports','owner privacy','UI inspection']},null,2));
