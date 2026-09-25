'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
function engine(h){const c={console,Math,Date};vm.runInNewContext(h.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine}
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
const E=engine(source),opts={campaignRulesVersion:1,managementVersion:1,mode:'hotseat',seed:'institution-tests',created:1};
const g=E.createGame(opts),p=E.publicState(g,0).me;
assert.equal(g.managementVersion,1);assert.equal(g.serviceAgreements.length,6);E.validatePilot(g);
for(const kind of Object.keys(E.SERVICE_TYPES)){const clients=g.serviceAgreements.filter(c=>c.kind===kind);assert.equal(new Set(clients.map(c=>E.clientProfile(c).priority)).size,2,'same service has distinct local client preferences')}
assert.equal(p.management.research.enabled,false);assert.equal(p.management.delivery.mode,'manual');
assert(!E.publicState(g,0).rival.management,'rival mandates stay private');
assert.throws(()=>E.createGame({...opts,serviceExpansionVersion:0}),/requires/);
assert.throws(()=>E.createGame({...opts,managementVersion:3}),/Unsupported/);
for(const corrupt of [
 x=>delete x.managementVersion,x=>x.managementVersion=7,x=>x.serviceAgreements[0].clientIndex=99,
 x=>x.players[0].management.research.budget=-1,x=>x.players[0].management.research.targets.digital=5,
 x=>x.players[0].management.research.priority=['network','network','network','network','network'],
 x=>x.players[0].management.delivery.vendorLimit=5,x=>x.players[0].management.delivery.mode='hire'
]){const c=copy(g);corrupt(c);assert.throws(()=>E.validatePilot(c))}
const plain={...E.chooseBot(g,0),management:copy(p.management),newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',contractBid:null,opportunity:null};
plain.management.research.enabled=true;plain.management.research.budget=50000;
const before=JSON.stringify(g),input=JSON.stringify(plain),pub=JSON.stringify(p),prepared=E.managementPlan(p,plain,g.economy);
assert.equal(Object.values(prepared.plan.investments).reduce((n,x)=>n+x,0),50000);
assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(plain),input);assert.equal(JSON.stringify(p),pub);
assert.deepEqual(copy(E.managementPlan(p,prepared.plan,g.economy).plan),copy(prepared.plan),'reapplying does not double fund');
const near=copy(p);near.capability.network=E.CAPABILITY_TIERS.network[0]-3000;
const target=copy(plain);for(const k of Object.keys(target.management.research.targets))target.management.research.targets[k]=k==='network'?1:0;
assert.equal(E.managementPlan(near,target,g.economy).plan.investments.network,3000);
near.capability.network+=3000;assert.deepEqual(copy(E.managementPlan(near,target,g.economy).plan.investments),{});
const reserved=copy(plain);reserved.management.research.reserve=p.stats.cash;
assert.deepEqual(copy(E.managementPlan(p,reserved,g.economy).plan.investments),{});
const priority=copy(plain);priority.management.research.priority=['digital','network','commercial','operations','acquisition'];
assert.equal(E.managementPlan(p,priority,g.economy).plan.investments.digital,50000);
// Profiles affect bids, not fees, balances or free customer awards.
const price=g.serviceAgreements.find(c=>E.clientProfile(c).priority==='price');
const seller=copy(p);seller.serviceDesk.policy.pricing[price.kind]='discount';
assert.equal(E.clientBidAdjustment(seller,price),2);seller.serviceDesk.policy.pricing[price.kind]='premium';assert.equal(E.clientBidAdjustment(seller,price),-2);
const reliable=g.serviceAgreements[0];seller.allocation.business=4;seller.serviceDesk.policy.staff=1;
assert.equal(E.clientBidAdjustment(seller,reliable),2);seller.serviceDesk.policy.staff=0;assert.equal(E.clientBidAdjustment(seller,reliable),0);
const controls=g.serviceAgreements[2];seller.capability.operations=E.CAPABILITY_TIERS.operations[2];assert.equal(E.clientBidAdjustment(seller,controls),2);
const owner=copy(p);owner.serviceDesk.contracts=[{id:reliable.id,kind:'payroll',fee:18000,due:4,misses:0}];
const managed=copy(plain);managed.management.research.enabled=false;managed.management.delivery={mode:'inhouse',staffLimit:1,vendorLimit:1,salesFloor:1};
managed.allocation={service:2,business:4,lending:1,operations:1};
const m=E.managementPlan(owner,managed,g.economy);assert.equal(m.plan.servicePolicy.staff,1);assert.equal(m.plan.servicePolicy.outsourcing,0);
managed.management.delivery.staffLimit=0;managed.management.delivery.vendorLimit=0;
const blocked=E.managementPlan(owner,managed,g.economy);assert.deepEqual(copy(blocked.plan.servicePolicy),copy(managed.servicePolicy));assert(blocked.notes.some(x=>x.includes('paused')));
managed.management.delivery.vendorLimit=1;managed.contractBid='explicit-bid';
assert.deepEqual(copy(E.managementPlan(owner,managed,g.economy).plan.servicePolicy),copy(managed.servicePolicy),'do not silently invalidate an explicit bid');
// Both locked intents retain their exact explicit allocations and investments.
const locked=copy(g),lp=copy(prepared.plan);lp.decision='b';E.submit(locked,0,lp);
assert.deepEqual(copy(locked.players[0].submitted),copy(lp));assert.equal(locked.players[0].management.research.enabled,false);
const other=E.chooseBot(locked,1);E.submit(locked,1,other);E.validatePilot(locked);E.validateLedger(locked);
assert.equal(locked.players[0].management.research.enabled,true);
const a=copy(locked),b=copy(locked),plans=[E.chooseBot(a,0),E.chooseBot(a,1)];b.rng=copy(a.rng);
E.managementPlan(E.publicState(b,0).me,plans[0],b.economy);
for(let i=0;i<2;i++){E.submit(a,i,copy(plans[i]));E.submit(b,i,copy(plans[i]))}
assert.deepEqual(copy(a),copy(b),'preview/save roundtrip preserves fixed-intent resolution');
// Off-mode compatibility against the preserved pre-batch engine.
const prior=engine(fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_planning_0704591.html'),'utf8'));
const oldOptions={...opts,managementVersion:0},old=prior.createGame(oldOptions),off=E.createGame(oldOptions);
for(let turn=0;turn<20&&!old.gameOver;turn++){for(let i=0;i<2;i++){const x=prior.chooseBot(old,i),y=E.chooseBot(off,i);assert.deepEqual(copy(x),copy(y));prior.submit(old,i,x);E.submit(off,i,y)}assert.deepEqual(copy(off),copy(old))}
const runs=[];
for(const scenario of Object.keys(E.SCENARIOS)){
 const campaign=E.createGame({...opts,scenario,seed:'institution-long-'+scenario});
 let count=0;for(;count<120&&!campaign.gameOver;count++){
  const ps=[E.chooseBot(campaign,0),E.chooseBot(campaign,1)];
  E.submit(campaign,0,ps[0]);E.submit(campaign,1,ps[1]);E.validatePilot(campaign);E.validateLedger(campaign);
  for(const bank of campaign.players){E.AccountingPrototype.check(bank.accounting);assert.equal(bank.stats.capital,bank.accounting.accounts.equity);assert.equal(bank.depositBook.cohorts.reduce((n,c)=>n+c.principal,0),bank.stats.deposits)}
  assert(Buffer.byteLength(JSON.stringify(E.publicState(campaign,0)))<1048576);
 }
 runs.push({scenario,turns:count,ended:campaign.gameOver,reason:campaign.endReason||null});
}
const setup=require('./github_resilience.test.js').harness(),setupBefore=setup.run('JSON.stringify(readSetupFeatureOptions())');
assert.match(setup.elements.get('#setupFeatureOptions').innerHTML,/data-feature-field="managementVersion"/,'institution controls come from shared feature rules');
assert.equal(setup.elements.get('#institutionManagement').checked,false,'institution management remains opt-in');
assert.equal(setup.elements.get('#serviceExpansion').checked,false);assert.equal(setup.elements.get('#rivalryPilot').checked,false);
setup.changeFeature('#institutionManagement',true);assert(setup.run('featureSelectionPending()'));
assert.equal(setup.run('JSON.stringify(readSetupFeatureOptions())'),setupBefore);
setup.run('cancelFeatureSelectionConfirmation()');assert.equal(setup.run('JSON.stringify(readSetupFeatureOptions())'),setupBefore);
setup.changeFeature('#institutionManagement',true);assert(setup.confirmFeatures());
assert.equal(setup.elements.get('#institutionManagement').checked,true);assert.equal(setup.elements.get('#serviceExpansion').checked,true);assert.equal(setup.elements.get('#rivalryPilot').checked,true);
assert.equal(setup.run('readSetupFeatureOptions().managementVersion'),2,'setup retains its existing current-management version');
setup.changeFeature('#serviceExpansion',false);assert(setup.run('featureSelectionPending()'));assert(setup.confirmFeatures());
assert.equal(setup.elements.get('#institutionManagement').checked,false,'removing a prerequisite disables management only after consent');
assert.equal(setup.elements.get('#rivalryPilot').checked,true);
const managementRules=E.campaignRules(opts,{context:'creation'}),capabilities=E.campaignCapabilities();
assert.equal(E.peerRulesIssue(managementRules,capabilities),null);
delete capabilities.managementSupported;
assert.equal(E.peerRulesIssue(managementRules,capabilities).field,'managementVersion','old peers still refuse institution mechanics through the shared capability gate');
assert.match(source,/RECURRING RESEARCH & SERVICE MANAGER/);assert.match(source,/id="prepareManagement"/);
console.log(JSON.stringify({passed:true,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),runs,checks:['strict versioning','private mandates','bounded recurring funding','milestone stop','cash reserve','editable priorities','client differentiation','bounded service delegation','explicit bid preservation','sealed plans','saved fixed-intent replay','20-turn prior-build compatibility']},null,2));
