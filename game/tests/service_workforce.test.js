'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
function engine(s){const c={console};vm.runInNewContext(s.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine}
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
const E=engine(source),g=E.createGame({customerDemandVersion:2,managementVersion:2,campaignRulesVersion:1,mode:'hotseat',seed:'workforce',created:1}),p=E.publicState(g,0).me;
const plan={...E.chooseBot(g,0),allocation:copy(p.allocation),servicePolicy:copy(p.serviceDesk.policy),newProjects:[],newProject:null,investments:{},competitiveAction:'none',hires:0,contractBid:null};
const before=JSON.stringify({g,p,plan}),options=E.serviceWorkforceOptions(p,plan,g.economy);
assert.equal(options.options.length,7);assert.equal(options.requiredService,3);assert.equal(JSON.stringify({g,p,plan}),before);
for(const o of options.options.filter(o=>!o.blocked)){
 assert.equal(Object.values(o.allocation).reduce((a,b)=>a+b,0),p.stats.staff);
 const direct=E.operatingPreview({...p,focus:plan.focus},{...plan,allocation:o.allocation},g.economy);
 assert.deepEqual(copy(o.forecast),copy(direct));assert.equal(o.bankProfit,direct.profit-(direct.fundingLoss||0));
}
assert(options.options.find(o=>o.id==='lending-to-service').forecast.relationshipCoverage>options.options[0].forecast.relationshipCoverage);
const reserved=copy(plan);reserved.servicePolicy.staff=reserved.allocation.business;
assert(E.serviceWorkforceOptions(p,reserved,g.economy).options.find(o=>o.id==='business-to-service').blocked);
const bid=copy(plan);bid.allocation={service:4,business:1,lending:2,operations:1};bid.contractBid='explicit';
assert(E.serviceWorkforceOptions(p,bid,g.economy).options.find(o=>o.id==='business-to-service').blocked);
const projects=copy(plan);projects.newProjects=['acquisition'];
assert(E.serviceWorkforceOptions(p,projects,g.economy).options.find(o=>o.id==='operations-to-service').blocked);
const empty=copy(plan);empty.allocation.lending=0;empty.allocation.service+=2;
assert(E.serviceWorkforceOptions(p,empty,g.economy).options.find(o=>o.id==='lending-to-service').blocked);
const invalid=copy(plan);invalid.allocation.service++;assert(E.serviceWorkforceOptions(p,invalid,g.economy).error);
const hires=E.serviceWorkforceOptions(p,plan,g.economy).hiring;assert.equal(hires.total,1);assert.equal(hires.basePayrollAdded,18000);assert.equal(hires.incrementalCost,E.hireCost(p,1));
const capped=copy(plan);capped.hires=E.hireLimit(p);assert(E.serviceWorkforceOptions(p,capped,g.economy).hiring.blocked);
const poor=copy(p);poor.stats.cash=0;assert(E.serviceWorkforceOptions(poor,plan,g.economy).hiring.blocked);
assert.equal(E.serviceWorkforceOptions(E.createGame({seed:1}).players[0],plan,g.economy),null);
// Exercise real client handlers through DOM sinks: draft only, all unrelated intents preserved.
const markup=source.slice(source.indexOf('function renderServiceWorkforce('),source.indexOf('const workforcePipelineUI='));
let html='',callbacks=[],panel={open:true,remove(){},addEventListener(){}};
const c={E,draft:copy(plan),esc:String,money:String,renderStaff(){},renderProjects(){},renderReady(){},
 $:selector=>selector==='#serviceWorkforce'?panel:{insertAdjacentHTML:(_,s)=>html=s},
 $$:selector=>selector==='[data-workforce]'?[{dataset:{workforce:'lending-to-service'},addEventListener:(_,f)=>callbacks.push(f)}]:[{addEventListener:(_,f)=>callbacks.push(f)}]};
vm.runInNewContext(markup+';globalThis.draw=renderServiceWorkforce;',c);c.draw({me:p,economy:g.economy},true);
assert(html.includes('SERVICE WORKFORCE PLANNER'));callbacks[0]();assert.equal(c.draft.allocation.service,4);assert.equal(c.draft.allocation.lending,1);assert.equal(c.draft.contractBid,plan.contractBid);assert.equal(c.draft.decision,plan.decision);callbacks[1]();assert.equal(c.draft.hires,1);assert.equal(c.draft.allocation.service,4);
const locked=JSON.stringify(c.draft);callbacks=[];c.draw({me:{...p,submitted:true},economy:g.economy},true);callbacks.forEach(f=>f());assert.equal(JSON.stringify(c.draft),locked);
panel.open=false;c.draft=invalid;c.draw({me:p,economy:g.economy},true);assert(html.includes('Allocate every existing banker'));assert.equal(panel.open,true,'invalid-allocation guidance remains visible');
// UI-only addition must preserve complete simulation and AI behavior from the published build.
const prior=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_goodwill_0ae290e.html'),'utf8'),Old=engine(prior);
for(const scenario of Object.keys(E.SCENARIOS)){
 const opts={customerDemandVersion:2,managementVersion:2,campaignRulesVersion:1,scenario,seed:'workforce-'+scenario,created:1},a=E.createGame(opts),b=Old.createGame(opts);
 for(let t=0;t<20&&!a.gameOver;t++){
  const ps=[E.chooseBot(a,0),E.chooseBot(a,1)],qs=[Old.chooseBot(b,0),Old.chooseBot(b,1)];assert.deepEqual(copy(ps),copy(qs));
  E.serviceWorkforceOptions(E.publicState(a,0).me,ps[0],a.economy);
  for(let i=0;i<2;i++){E.submit(a,i,ps[i]);Old.submit(b,i,qs[i])}assert.deepEqual(copy(a),copy(b));E.validatePilot(a);E.validateLedger(a);Old.validatePilot(b);Old.validateLedger(b);
 }
}
console.log(JSON.stringify({passed:true,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),checks:['pure engine forecasts','staff conservation','commercial reservations','explicit bid protection','project capacity','hiring timing cost and limit','invalid allocation','draft-only UI handlers','locked plan guard','four scenarios 20-turn full-state compatibility']}));
