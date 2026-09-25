'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), copy = x => JSON.parse(JSON.stringify(x));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'src', manifest.engine.shell), 'utf8').replace('/* @modules */', () =>
  manifest.engine.modules.map(name => fs.readFileSync(path.join(root, 'src', name), 'utf8')).join('\n'));
const ctx = { console };
vm.runInNewContext(script.replace('root.BWEngine={', 'root.pricingTests={depositRate,baseDepositRate,productPricingEdges,startProject,advanceProjects,repriceWithdrawableDeposits,productPricingSchedule,planProductPricing,productPublicQuotes};root.BWEngine={'), ctx);
const E = ctx.BWEngine, H = ctx.pricingTests;
const base = { campaignRulesVersion: 1, serviceExpansionVersion: 1, managementVersion: 2, customerDemandVersion: 2,
  workforceVersion: 1, customerOwnershipVersion: 1, creditPerformanceVersion: 1, segmentDepositsVersion: 1,
  productProgramsVersion: 2, mode: 'hotseat', seed: 'pricing-contract', created: 1 };
const fresh = extra => E.createGame({ ...base, ...extra });
const plan = p => ({ focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: 'balanced',
  lendingPolicy: 'balanced', capitalPolicy: 'balanced', products: { ...p.products }, newProjects: [], investments: {},
  hires: 0, competitiveAction: 'none', productProgramPolicy: E.productProgramPolicy(p) });
function valid(g) { E.validatePilot(g); E.validateLedger(g); E.validateCampaignRules(g, 'game'); }
const profiles = [{}, { advertisingVersion: 1 }, { advertisingVersion: 1, regionalGrowthVersion: 1 },
  { advertisingVersion: 1, regionalGrowthVersion: 1, relationshipOffersVersion: 1 },
  { advertisingVersion: 1, regionalGrowthVersion: 1, relationshipOffersVersion: 1, onboardingVersion: 1 }];
// The modular pilot is retired, so these four combinations can no longer be
// created. The five profiles above still cover pricing along the real feature
// chain, which is this suite's subject.
let months = 0;
for (const profile of profiles) {
  const g = fresh(profile); valid(g); assert.equal(g.version, '8.15');
  assert.deepEqual(copy(g.players[0].productPrograms.pricingBp), { essential: 0, rewards: 0 });
  const rules = E.validateCampaignRules(g, 'game'), caps = E.campaignCapabilities();
  assert.equal(E.peerRulesIssue(rules, caps), null);
  assert.equal(E.peerRulesIssue(rules, { ...caps, productProgramsSupported: 1 }).field, 'productProgramsVersion');
  for (const seat of [0, 1]) {
    const view = E.publicState(g, seat);
    assert.equal(E.validateCampaignRules(view, 'view').signature, rules.signature);
    assert.equal(view.productProgramsVersion, 2); assert.equal(view.me.productPrograms.version, 2);
    assert.equal(view.rival.productPrograms, undefined);
  }
  for (let month = 0; month < 3; month++) {
    const q = g.players.map(plan); q[0].productProgramPolicy.pricingBp.essential = month === 1 ? -25 : 25;
    const raw = JSON.stringify(g);
    E.operatingPreview(E.publicState(g, 0).me, q[0], g.economy);
    assert.equal(JSON.stringify(g), raw, 'Forecast mutated authoritative state.');
    E.submit(g, 0, q[0]);
    const resumed = E.migrateCampaign(copy(g));
    assert.equal(E.publicState(g, 1).rival.productPrograms, undefined);
    E.submit(g, 1, q[1]); E.submit(resumed, 1, copy(q[1])); valid(g); valid(resumed);
    assert.deepEqual(copy(E.migrateCampaign(g)), copy(E.migrateCampaign(resumed)), 'Sealed save continuation drift.');
    assert.equal(E.publicState(g, 1).lastPlans[g.players[0].id].productProgramPolicy, undefined);
    months++;
  }
  g.gameOver = true; E.rematch(g, 0); E.rematch(g, 1); valid(g);
  assert.equal(g.version, '8.15'); assert.equal(g.productProgramsVersion, 2);
  assert.deepEqual(copy(g.players[0].productPrograms.pricingBp), { essential: 0, rewards: 0 });
}
const g = fresh(), p = g.players[0], q = plan(p);
for (const bp of [-25, 0, 25]) {
  q.productProgramPolicy.pricingBp.essential = bp; E.applyProductProgramPolicy(p, q.productProgramPolicy);
  assert.equal(H.depositRate(p, g, 'essential'), Math.max(0, Math.min(100000, H.baseDepositRate(p, g, 'essential') + Math.round(bp * 1000000 / 120000))));
  assert.equal(H.depositRate(p, g, 'highYield'), H.baseDepositRate(p, g, 'highYield'));
}
const zeroRate = copy(g); zeroRate.economy.rate = 0; zeroRate.players[0].productPrograms.pricingBp.essential = -25;
assert.equal(H.depositRate(zeroRate.players[0], zeroRate, 'essential'), 0);
for (const damage of [
  x => delete x.players[0].productPrograms.pricingBp,
  x => x.players[0].productPrograms.pricingBp.essential = 24,
  x => x.players[0].productPrograms.pricingBp.essential = '25',
  x => x.players[0].productPrograms.pricingBp.highYield = 25,
  x => x.players[0].productPrograms.pricingBp.rewards = 25,
  x => x.players[0].productPrograms.version = 1,
  x => x.productProgramsVersion = 3, x => delete x.productProgramsVersion,
  x => x.version = '8.14', x => x.version = '8.9', x => x.featureRulesVersion = 2
]) {
  const bad = fresh(); damage(bad); const before = JSON.stringify(bad);
  assert.throws(() => E.migrateCampaign(bad)); assert.equal(JSON.stringify(bad), before);
}
assert.throws(() => fresh({ productProgramsVersion: 3 }), /version/);
assert.throws(() => fresh({ segmentDepositsVersion: 0 }), /requires/);
assert.throws(() => fresh({ featureRulesVersion: 1, advertisingVersion: 1, regionalGrowthVersion: 1, relationshipOffersVersion: 1 }), /not supported|Unsupported modular/);
// A forged set of thousands of distinct same-month guarantees used to fill the
// loose legacy limit and become unsaveable after one organic intake. New priced
// books enforce the two issuing banks' quote provenance before adoption, without
// repairing the input or discarding promises. Legacy parsing remains unchanged.
for(const priced of [false,true]){
 const bomb=fresh({productProgramsVersion:priced?2:1});let remaining=5000;
 bomb.players[0].depositBook.cohorts=bomb.players[0].depositBook.cohorts.flatMap((c,i,rows)=>{
  const count=Math.ceil(remaining/(rows.length-i));remaining-=count;
  return Array.from({length:count},(_,j)=>({...c,principal:Math.floor(c.principal/count)+(j<c.principal%count?1:0),product:'highYield',remaining:6,rate:1000+j,quotedCycle:0}));
 });
 const before=JSON.stringify(bomb);
 if(priced)assert.throws(()=>E.migrateCampaign(bomb),/provenance/);else E.validatePilot(bomb);
 assert.equal(JSON.stringify(bomb),before);
}
for(const mutate of [
 x=>{const c=x.players[0].depositBook.cohorts[0],half=Math.floor(c.principal/2);c.principal-=half;x.players[0].depositBook.cohorts.push({...c,principal:half});},
 x=>x.players[0].depositBook.cohorts[0].unexpected=1,
 x=>Object.assign(x.players[0].depositBook.cohorts[0],{product:'highYield',remaining:2}),
 x=>x.players[0].depositBook.cohorts[0].quotedCycle=1
]){
 const bad=fresh();mutate(bad);const before=JSON.stringify(bad);
 assert.throws(()=>E.migrateCampaign(bad),/provenance/);assert.equal(JSON.stringify(bad),before);
}
// A neutral upgrade changes metadata, not the old account books or base pricing.
const old = fresh({ productProgramsVersion: 1 }); valid(old); assert.equal(old.version, '8.9');
assert.equal(old.players[0].productPrograms.pricingBp, undefined);
assert.equal(E.productProgramPolicy(old.players[0]).pricingBp, undefined);
for (const productProgramsSupported of [1, 2])
  assert.equal(E.peerRulesIssue(E.campaignRules(old, { context: 'game' }), { ...E.campaignCapabilities(), productProgramsSupported }), null);
const badOld = copy(old); badOld.players[0].productPrograms.pricingBp = { essential: 0, rewards: 0 };
assert.throws(() => E.migrateCampaign(badOld));
// Retiring or converting a delivery route never erases the variable-account tariff.
const retire = fresh(), owner = retire.players[0];
H.startProject(retire, owner, 'licenseRewards'); H.advanceProjects(retire);
const rp = plan(owner); rp.productProgramPolicy.pricingBp.rewards = 25;
E.applyProductProgramPolicy(owner, rp.productProgramPolicy);
const retirement = E.productProgramPolicy(owner); retirement.retire = ['rewards'];
E.applyProductProgramPolicy(owner, retirement, true); valid(retire);
assert.equal(owner.productPrograms.pricingBp.rewards, 25);
const editRetired = E.productProgramPolicy(owner); editRetired.pricingBp.rewards = 0;
assert.throws(() => E.applyProductProgramPolicy(owner, editRetired), /Retired/);
// The frozen price signal uses only mutually marketable, unpromised balances.
const contest = fresh(), beforeContest = JSON.stringify(contest);
assert(Object.values(H.productPricingEdges(contest)).every(r => r.edge === 0));
assert.equal(JSON.stringify(contest), beforeContest);
contest.players.forEach((p, i) => {
  p.productPrograms.pricingBp.essential = i ? -25 : 25;
  p.householdBook.policy.retention = 100; p.allocation = { service: 8, business: 0, lending: 0, operations: 0 };
});
const edge = H.productPricingEdges(contest), swapped = copy(contest); swapped.players.reverse();
assert(edge.downtown.edge > 0 && edge.downtown.edge <= 1.5);
assert.equal(edge.downtown.edge, -H.productPricingEdges(swapped).downtown.edge);
assert(Object.isFrozen(edge) && Object.isFrozen(edge.downtown) && Object.isFrozen(edge.downtown.signal));
const neglected = copy(contest); neglected.players[0].allocation.service = 0; neglected.players[0].upgrades.training = 0;
assert.equal(H.productPricingEdges(neglected).downtown.signal[0], 0);
assert.equal(H.productPricingEdges(neglected).downtown.signal[1], edge.downtown.signal[1]);
for (const locked of [false, true]) {
  const promised = copy(contest);
  promised.players.forEach(p => p.depositBook.cohorts.forEach(c => { c.locked = locked; c.remaining = 4; }));
  assert(Object.values(H.productPricingEdges(promised)).every(r => r.edge === 0));
}
const scarce = copy(contest);
scarce.players.forEach(p => p.depositBook.cohorts.forEach(c => { if (c.segment !== 'everyday') c.remaining = 3; }));
assert(H.productPricingEdges(scarce).downtown.edge < edge.downtown.edge);
const priorEdge = JSON.stringify(edge);
contest.players[0].depositBook.cohorts.length = 0;
assert.equal(JSON.stringify(edge), priorEdge, 'Later transfers changed the frozen snapshot.');
// Existing stamped guarantees and locked principal retain their rate until the
// sixth forecast boundary. This forecast never opens new term subscriptions.
for(const locked of [false,true])for(const maturity of ['release','renew']){
 const world=fresh(),owner=world.players[0];
 owner.depositBook.cohorts.forEach(c=>{c.remaining=6;c.quotedCycle=0;c.rate=4321;c.product='highYield';if(locked)c.locked=true;});valid(world);
 const me={...owner,marketSnapshot:world.marketEconomy},request={...plan(owner),termPolicy:{offer:'six',maturity}};
 request.productProgramPolicy.pricingBp.essential=25;
 const before=JSON.stringify(world),keep=H.productPricingSchedule(me,request,world.economy,{essential:0,rewards:0}),staged=H.productPricingSchedule(me,request,world.economy);
 assert.equal(JSON.stringify(world),before,'Six-month schedule mutated the bank or outside books');
 assert.equal(staged.length,6);assert(staged.slice(0,5).every((row,i)=>row.interest===keep[i].interest));
 if(locked&&maturity==='renew'){
  assert.deepEqual(copy(staged),copy(keep));assert(staged.every(row=>row.locked===owner.stats.deposits));
 }else{
  assert(staged[5].interest>keep[5].interest,'Expired guarantees/releases must use the staged variable tariff');
  assert.equal(staged[5].locked,0,'Comparison must not manufacture new term subscriptions');
 }
 assert(staged.every(row=>row.principal===owner.stats.deposits));
}
const departing=fresh(),leaver=departing.players[0],departingAmount=100;
const lockedCohort=leaver.depositBook.cohorts[0];
Object.assign(lockedCohort,{locked:true,product:'highYield',remaining:2,quotedCycle:0,rate:4321,exiting:departingAmount});
const departingBefore=JSON.stringify(departing),departingSchedule=H.productPricingSchedule({...leaver,marketSnapshot:departing.marketEconomy},
 {...plan(leaver),termPolicy:{offer:'six',maturity:'renew'}},departing.economy);
assert.equal(departingSchedule[0].departed,0);assert.equal(departingSchedule[1].departed,departingAmount);
assert.equal(departingSchedule[1].principal,leaver.stats.deposits-departingAmount);
assert(departingSchedule.slice(2).every(row=>row.departed===0&&row.principal===leaver.stats.deposits-departingAmount));
assert.equal(JSON.stringify(departing),departingBefore,'Known maturity payout changed the live bank or outside supply');
// Last-settled public quotes are the only rival data admitted by the pricing AI.
const guarded=fresh();guarded.players[0].stats.lastProfit=1000000;
guarded.players[0].productPrograms.review={flows:{rivalTransfers:{'downtown/everyday/essential':-10000}}};
guarded.players[1].productPrograms.quotes=H.productPublicQuotes(guarded,guarded.players[1]);
const safePlan=plan(guarded.players[0]),expected=H.planProductPricing(guarded,0,safePlan),quoteCard=copy(guarded.players[1].productPrograms.quotes);
let quoteReads=0;
guarded.players[1]=new Proxy({}, {get(_,key){if(key==='productPrograms')return new Proxy({}, {get(_p,field){assert.equal(field,'quotes','Pricing AI read private rival programme data');quoteReads++;return quoteCard;}});throw Error('Pricing AI read private rival '+String(key));}});
assert.deepEqual(copy(H.planProductPricing(guarded,0,safePlan)),copy(expected));assert(quoteReads>0,'Exercise the defensive quote path, not just its early exit');
let aiMonths=0;
for(const profile of profiles){
 const world=fresh(profile);
 for(let month=0;month<6&&!world.gameOver;month++){
  const plans=world.players.map((p,i)=>E.chooseBot(world,i));
  E.submit(world,0,plans[0]);E.submit(world,1,plans[1]);valid(world);aiMonths++;
  for(const owner of world.players){
   const review=owner.productPrograms.review;
   assert.equal(review.billed.interest,owner.operatingReport.depositInterest);
   assert.equal(review.billed.service,owner.operatingReport.depositServiceCost);
   assert.equal(Object.values(review.closing).reduce((n,x)=>n+x,0),owner.stats.deposits);
   assert.equal(owner.productPrograms.quotes.cycle,review.cycle);
   const view=E.publicState(world,world.players.indexOf(owner));
   const before=JSON.stringify(world);
   E.productPricingComparison(view.me,plan(view.me),world.economy);
   assert.equal(JSON.stringify(world),before,'Comparison leaked state changes.');
  }
 }
 for(const damage of [
  x=>x.players[0].productPrograms.review.billed.interest++,
  x=>x.players[0].productPrograms.review.flows.other['downtown/everyday/essential']++,
  x=>x.players[0].productPrograms.quotes.privateBook={secret:1},
  x=>x.players[0].productPrograms.quotes.cycle++,
  x=>x.players[0].productPrograms.quotes.available.essential=false,
  x=>x.players[0].productPrograms.review=null
 ]){
  const bad=copy(world);damage(bad);assert.throws(()=>E.migrateCampaign(bad));
 }
 const brokenView=E.publicState(world,0);brokenView.me.productPrograms.products.rewards.route='unknown';
 assert.throws(()=>E.validateProductPricingView(brokenView),/delivery/);
 // Pricing previews always use the accounting/persistent-rivalry failure path.
 // Finalization before the end check is safe only while that check does not
 // transfer assets or erase obligations; catch future takeover regressions here.
 const failed=copy(world),books=JSON.stringify(failed.players.map(p=>[p.depositBook,p.creditBook,p.marketBook,p.productPrograms]));
 // evaluateStrategicEnd runs before advancing the completed cycle counter.
 failed.cycle--;failed.players[0].distress=E.RECEIVERSHIP_CYCLES;E.evaluateStrategicEnd(failed);
 assert(failed.gameOver);assert.equal(JSON.stringify(failed.players.map(p=>[p.depositBook,p.creditBook,p.marketBook,p.productPrograms])),books);
 valid(failed);
}
console.log(JSON.stringify({ passed: true, profiles: profiles.length, months, aiMonths,
  checks: ['versioned tariffs', 'exact integer quotes', 'strict saves and plans', 'all profiles', 'sealed resume', 'peer versions', 'rematch', 'forecast purity', 'retirement obligations'] }));
