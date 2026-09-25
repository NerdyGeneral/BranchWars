'use strict';
// Owner-only display feedback must never change settlement, saved text or RNG.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),source=process.argv.includes('--source');
assert(process.argv.slice(2).every(x=>['--source','--fixture'].includes(x)),'Usage: node tests/initiative_feedback.test.js [--source] [--fixture]');
const bytes=source?require('../tools/build_game.js').assemble().html:fs.readFileSync(path.join(root,'BRANCH_WARS.html')),hash=crypto.createHash('sha256').update(bytes).digest('hex');
const context={console};vm.runInNewContext(String(bytes).match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.feedbackTest={syncAccounts};root.BWEngine={'),context);
const E=context.BWEngine;
// Execute the actual assembled UI helper; there is no test-side implementation.
const helperStart=String(bytes).indexOf('function initiativeFeedback(v)'),helperEnd=String(bytes).indexOf('let gameOverlayReturnFocus',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'Build must include initiative feedback');
context.E=E;vm.runInNewContext(String(bytes).slice(helperStart,helperEnd),context);
const {initiativeFeedback,initiativeFeedbackLines}=context;
const cumulative={campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,workforceVersion:1,customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,productProgramsVersion:1,advertisingVersion:1,regionalGrowthVersion:1,relationshipOffersVersion:1,onboardingVersion:1};
const intent=(p,project)=>({focus:p.focus,allocation:{...p.allocation},depositPolicy:p.policies.deposit,lendingPolicy:p.policies.lending,capitalPolicy:p.policies.capital,products:{...p.products},decision:'a',newProjects:project?[project]:[],investments:{},hires:0,competitiveAction:'none',opportunity:null,capitalAction:false});
const styles=[{depositPolicy:'aggressive',lendingPolicy:'growth',capitalPolicy:'reinvest'},{depositPolicy:'margin',lendingPolicy:'conservative',capitalPolicy:'balanced'}];
const g=E.createGame({mode:'hotseat',scenario:'balanced',seed:'paired-balanced-0',created:1,name1:'Seat One Bank',name2:'Seat Two Bank'});
for(let month=1;month<=14;month++){
 const plans=g.players.map((p,seat)=>{
  const plan=copy(E.chooseBot(g,seat));
  if(!(E.tierRank(p)>=1||p.stats.lastProfit<0||p.fundingCovenant&&E.fundingPosition(p).excess>0))Object.assign(plan,styles[seat]);
  return plan;
 });
 E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);
}
E.validateLedger(g);assert.equal(g.cycle,15);
for(const seat of [0,1]){
 const v=E.publicState(g,seat),before=JSON.stringify({g,v});
 assert.deepEqual(copy(initiativeFeedback(v)),[{key:'remediation',name:E.PROJECTS.remediation.name,status:'not-started'}]);
 assert.equal(initiativeFeedbackLines(v).length,1);assert(initiativeFeedbackLines(v)[0].includes('No project cost was charged'));
 assert(!g.resolution.some(line=>line.includes('cancelled')),'Natural legacy reproduction has no existing cancellation notice');
 assert.equal(JSON.stringify({g,v}),before,'Derived feedback changes no world, view, ledger or saved text');
 const rivalId=g.players[1-seat].id;
 v.lastPlans={...v.lastPlans};
 Object.defineProperty(v.lastPlans,rivalId,{get(){throw Error('Rival plan must never be read');}});
 assert.equal(initiativeFeedback(v)[0].status,'not-started');
 // Public name strings are neither identity nor evidence of execution.
 v.resolution=[`${v.me.name} began ${E.PROJECTS.remediation.name}.`];
 assert.equal(initiativeFeedback(v)[0].status,'not-started');
 for(const transform of [x=>delete x.causalEvents,x=>x.causalEvents=[],x=>x.causalEvents=x.causalEvents.filter(e=>e.category!=='resolution.start'),x=>x.resolutionId++,x=>x.cycle++,x=>x.ledgerPrunedThrough=Number.MAX_SAFE_INTEGER,x=>x.causalEvents=x.causalEvents.filter(e=>e.category!=='operations')]){
  const unknown=E.publicState(g,seat);transform(unknown);
  assert.equal(initiativeFeedback(unknown)[0].status,'unknown');
  assert(!initiativeFeedbackLines(unknown)[0].includes('No project cost was charged'));
 }
 const malformed=copy(E.publicState(g,seat)),parent=malformed.causalEvents.find(e=>e.category==='resolution.start'&&e.resolutionId===malformed.resolutionId);
 malformed.causalEvents.push({id:parent.id+1,cycle:parent.cycle,parentCause:parent.id,target:malformed.me.id,visibility:'owner',category:'project.start',source:'startProject',changes:{},deltas:{cash:-170000}});
 assert.equal(initiativeFeedback(malformed)[0].status,'unknown','Incomplete project-stage evidence cannot establish no charge');
 const oldPlan=copy(E.publicState(g,seat));oldPlan.lastPlans[oldPlan.me.id]={newProject:'remediation'};
 assert.equal(initiativeFeedback(oldPlan)[0].status,'not-started','Historical singular plan field remains supported');
}
// Full monthly success and genuine paid-decision/cash-gate cancellation in
// default and cumulative profiles. Fixture capitalization uses accounting
// transactions, not a runtime exception or a free-resource override.
let fixtures=0;const fixtureViews=[];
for(const options of [{},cumulative])for(const cancel of [false,true]){
 const world=E.createGame({...options,mode:'hotseat',seed:'initiative-feedback',created:1,name1:'Same Bank',name2:'Same Bank'});
 world.event=copy(E.EVENTS.find(e=>e.key==='fintech'));
 if(cancel)for(const p of world.players){
  if(p.accounting){p.accounting=E.AccountingPrototype.transact(p.accounting,'buySecurities',p.stats.cash-200000);context.feedbackTest.syncAccounts(p);}
  else p.stats.cash=200000;
 }
 const before=world.players.map(p=>p.buildSpend||0);
 E.submit(world,0,intent(world.players[0],'remediation'));E.submit(world,1,intent(world.players[1],'remediation'));
 E.validatePilot(world);E.validateLedger(world);
 for(const seat of [0,1]){
  const v=E.publicState(world,seat),rows=initiativeFeedback(v);
  assert.equal(rows[0].status,cancel?'not-started':'started');
  fixtureViews.push({v:copy(v),pilot:!!options.serviceExpansionVersion,cancel});
  if(!cancel){v.me.projects=[];assert.equal(initiativeFeedback(v)[0].status,'started','Current completed/removed projects are not evidence of an earlier non-start');}
  assert.equal(world.players[seat].buildSpend-before[seat],cancel?0:170000,'Real project charge is authoritative, not end-month net cash');
  if(options.serviceExpansionVersion){
   assert.equal(initiativeFeedbackLines(v).length,0,'Pilot preserves existing start/cancel notices without duplication');
   assert(world.resolution.some(line=>line.startsWith('Same Bank '+(cancel?'cancelled':'began')+' '+E.PROJECTS.remediation.name)));
  }else assert.equal(initiativeFeedbackLines(v).length,cancel?1:0);
 }
 fixtures++;
}
// Synthetic browser harness exercises the proposed append-only results path
// using both engine-created owner projections; no rooms, live saves or network.
const {harness}=require('./github_resilience.test.js'),h=harness();
for(const {v,pilot,cancel}of fixtureViews){
 h.c.feedbackView=v;h.run('renderHistory(feedbackView);lastResolutionId=0;maybeResolution(feedbackView)');
 const history=h.elements.get('#lastResolution').innerHTML,overlay=h.elements.get('#resolutionList').innerHTML;
 assert.equal(history.includes('Your submitted'),!pilot&&cancel);
 assert.equal(overlay.includes('Your submitted'),!pilot&&cancel);
 if(pilot&&cancel){assert(history.includes('cancelled Compliance Remediation'));assert(overlay.includes('cancelled Compliance Remediation'));}
}
for(const seat of [0,1]){
 h.c.feedbackView=copy(E.publicState(g,seat));
 const input=JSON.stringify(h.c.feedbackView);
 h.run('renderHistory(feedbackView);lastResolutionId=0;maybeResolution(feedbackView)');
 assert(h.elements.get('#lastResolution').innerHTML.includes('No project cost was charged'));
 assert(h.elements.get('#resolutionList').innerHTML.includes('No project cost was charged'));
 assert.equal(JSON.stringify(h.c.feedbackView),input);
 const roundtrip=JSON.parse(JSON.stringify(h.c.feedbackView));
 assert.deepEqual(copy(initiativeFeedback(roundtrip)),copy(initiativeFeedback(h.c.feedbackView)),'Guest checkpoint serialization preserves owner evidence');
}
h.c.feedbackWorld=copy(g);
for(const transport of ['direct','lan','github']){
 h.c.feedbackTransport=transport;
 h.run("game=feedbackWorld;gh.active=feedbackTransport==='github';lan.active=feedbackTransport==='lan';send=message=>{globalThis.feedbackMessage=message};syncPeers()");
 const host=h.run('view'),guest=h.c.feedbackMessage.state;
 assert.equal(host.me.id,g.players[0].id);assert.equal(guest.me.id,g.players[1].id);
 assert.equal(initiativeFeedback(host)[0].status,'not-started');assert.equal(initiativeFeedback(guest)[0].status,'not-started');
 assert(guest.causalEvents.every(e=>e.target===guest.me.id),'The shared transport publication retains owner-only ledger data');
 assert.equal(guest.me.projects.length,g.players[1].projects.length);
 assert.equal(guest.rival.projects,undefined,'Derived feedback does not require private rival projects');
}
if(!source)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'BRANCH_WARS.html'))).digest('hex'),hash);
if(process.argv.includes('--fixture')){
 const dir=path.join(root,'reports/local'),file=path.join(dir,'living-bank-ui-initiative-fixture.json'),data=JSON.stringify(g,null,2)+'\n';
 fs.mkdirSync(dir,{recursive:true});
 if(fs.existsSync(file))assert.equal(fs.readFileSync(file,'utf8'),data,'Do not replace a different fixture silently');
 else fs.writeFileSync(file,data,{flag:'wx'});
 console.log('Isolated import fixture: '+file);
}
console.log(JSON.stringify({passed:true,artifact:source?'source-assembly':'portable',artifactSha256:hash,naturalReproductionMonths:14,fullResolutionFixtures:fixtures,scope:'Actual UI helper/history/overlay; shared host/guest publication and serialized guest views. No live transport or browser acceptance claim.'}));
