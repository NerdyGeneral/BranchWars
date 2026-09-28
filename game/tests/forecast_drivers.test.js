'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
// Forecast & books → Growth & limits: growth limits, project effects once
// complete, and research/model contributions. Engine checks run on the
// assembled source; the panel check uses the shared client harness.
const assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,c={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const CORE={currentReporting:true,currentEconomics:true,currentResearch:true};
function core(seed='forecast-drivers',months=4){
 const g=E.createGame({...E.previewCampaignEdition({},'core',CORE).options,mode:'hotseat',seed,scenario:'balanced',created:1});
 for(let m=0;m<months;m++){const plans=g.players.map((_,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);}
 return g;
}
const branchKey=Object.keys(E.PROJECTS).find(k=>E.PROJECTS[k].kind==='branch');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}

test('drivers are pure: game, view and draft are unchanged',()=>{
 const g=core(),v=E.publicState(g,0),plan=E.chooseBot(g,0);plan.newProjects=[branchKey];
 const before=[JSON.stringify(g),JSON.stringify(v),JSON.stringify(plan)];
 const d=E.forecastDrivers(v,v.me,plan,0);
 assert(d.limits.value&&d.projects.value&&d.research.value,JSON.stringify(d).slice(0,300));
 assert.deepEqual([JSON.stringify(g),JSON.stringify(v),JSON.stringify(plan)],before);
});

test('the limiting term is the smallest and matches the forecast deposit gain',()=>{
 const g=core(),v=E.publicState(g,0),plan=E.chooseBot(g,0),L=E.forecastDrivers(v,v.me,plan,0).limits.value;
 for(const part of [L.deposits,L.loans]){
  assert(part.terms.length>0);const least=Math.min(...part.terms.map(t=>t.amount));
  assert.equal(part.terms.find(t=>t.key===part.binding).amount,least);
 }
 assert.equal(L.deposits.gain,Math.min(...L.deposits.terms.map(t=>t.amount)));
 assert(L.relationships&&L.relationships.capacity>0,'Core research reports relationship room');
});

test('asking for drivers leaves the next real month byte-identical',()=>{
 // The AI planner has its own random stream, so both games plan exactly once.
 const a=core('drivers-inert',3),b=core('drivers-inert',3),plansA=a.players.map((_,i)=>E.chooseBot(a,i)),plansB=b.players.map((_,i)=>E.chooseBot(b,i));
 for(const seat of [0,1]){const v=E.publicState(a,seat);E.forecastDrivers(v,v.me,{...copy(plansA[seat]),newProjects:[branchKey]},seat);}
 for(const [g,plans] of [[a,plansA],[b,plansB]]){E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);}
 assert.equal(JSON.stringify(a),JSON.stringify(b));
});

test('a staged branch adds deposit growth and costs upkeep once complete',()=>{
 const g=core(),v=E.publicState(g,0),plan=E.chooseBot(g,0);plan.newProjects=[branchKey];plan.newProject=null;
 const rows=E.forecastDrivers(v,v.me,plan,0).projects.value,row=rows.find(r=>r.key===branchKey&&r.staged);
 assert(row&&row.change,JSON.stringify(rows));
 assert(row.change.depositGrowth>0,'A branch raises what the bank can gather');
 assert(row.change.expense>0&&row.change.profit<0,'Upkeep arrives with the office, before its deposits earn');
 assert.equal(row.target,plan.focus,'Without an explicit destination the project goes to the focus market');
});

test('research and operating models are credited; unfunded levels show nothing',()=>{
 const g=core(),P=g.players[0],tiers=E.publicState(g,0).capabilityTiers;
 P.capability={...P.capability,commercial:tiers.commercial[1],network:1};P.specializations={...(P.specializations||{}),commercial:'treasury'};
 const v=E.publicState(g,0),rows=E.forecastDrivers(v,v.me,E.chooseBot(g,0),0).research.value;
 const model=rows.find(r=>r.kind==='model'&&r.branch==='commercial'),level=rows.find(r=>r.kind==='research'&&r.branch==='commercial');
 assert(model.change.commercialIncome>0,'Treasury & Payments earns fee income');
 assert(level&&level.level===2);
 const network=rows.find(r=>r.kind==='research'&&r.branch==='network');
 assert.equal(network.level,0);assert(Object.values(network.change).every(n=>n===0));
});

test('a project that cannot be completed privately says so; the rest still reports',()=>{
 const g=core(),v=E.publicState(g,0),plan=E.chooseBot(g,0);plan.newProjects=[branchKey];plan.newProject=null;
 const d=E.forecastDrivers(v,v.me,plan,2),row=d.projects.value.find(r=>r.key===branchKey);
 assert.equal(row.change,null);assert.match(row.reason,/Not estimated here: Unknown seat/);
 assert(d.limits.value&&d.research.value);
});

test('Forecast & books shows Growth & limits with every section and no broken figures',()=>{
 const {harness}=require('./github_resilience.test');const h=harness();
 h.c.opts={...E.previewCampaignEdition({},'core',CORE).options,mode:'hotseat',seed:'drivers-ui',created:1};h.c.branchKey=branchKey;
 h.run("game=E.createGame(opts);seat=0;gh.active=false;p2pRole='';renderBankRecovery=()=>{};newDraft(currentView());draft.newProjects=[branchKey];operatingForecastView={owner:currentView().me.id,desk:'drivers'};renderOperatingPreview(currentView());");
 const text=h.elements.get('#operatingPreview').innerHTML;
 for(const heading of ['WHAT LIMITS GROWTH THIS MONTH','PROJECTS · MONTHLY EFFECT ONCE COMPLETE','RESEARCH &amp; OPERATING MODELS'])assert(text.includes(heading),heading);
 assert(text.includes('Limiting'));assert.doesNotMatch(text,/NaN|undefined|Infinity/);
 assert(text.includes('data-forecast-view="drivers"'));
});

test('staged hires leave current operations alone, but staffing comparison shows their next run rate',()=>{
 const g=core('hiring-impact',0),v=E.publicState(g,0),plan=E.chooseBot(g,0),frozen=JSON.stringify({g,v,plan});
 const current=E.operatingPreview(v.me,plan,v.economy,v),hired={...plan,hires:2};
 assert.equal(E.operatingPreview(v.me,hired,v.economy,v).depositGrowth,current.depositGrowth);
 const result=E.forecastHiringImpact(v,v.me,hired);
 assert.equal(result.staged,2);assert.equal(result.count,2);
 const service=result.rows.find(x=>x.role==='service'),business=result.rows.find(x=>x.role==='business');
 assert(service.change.depositGrowth>business.change.depositGrowth,'Core service hires increase deposits at this opening');
 assert(service.forecast.expense>current.expense,'Recurring payroll belongs in the illustrated run rate');
 assert.equal(JSON.stringify({g,v,plan}),frozen,'No what-if may alter a stored game, public view or draft');
});

test('Expanded lending hires show a funded growth change and no recruits remain illustrative',()=>{
 const g=E.createGame({...E.previewCampaignEdition({},'expanded',CORE).options,mode:'hotseat',seed:'hiring-impact',created:1}),
  v=E.publicState(g,0),plan=E.chooseBot(g,0),r=E.forecastHiringImpact(v,v.me,plan);
 assert.equal(r.staged,0);assert.equal(r.count,1);
 assert(r.rows.find(x=>x.role==='lending').change.loanGrowth>0);
 assert(r.rows.every(x=>!x.error),JSON.stringify(r.rows));
 const specialist={...plan,specialistHires:{...E.emptySpecialistOrders(),lending:1}},snapshot=JSON.stringify({g,v,specialist});
 const trained=E.forecastHiringImpact(v,v.me,specialist);
 assert.equal(trained.staged,1);
 assert(trained.rows.find(x=>x.role==='lending').change.loanGrowth>r.rows.find(x=>x.role==='lending').change.loanGrowth,
  'Qualified lending recruit improves the next run rate more than an untrained generalist');
 assert.equal(JSON.stringify({g,v,specialist}),snapshot);
});

test('Forecast & books renders the same hiring view in Core and Expanded',()=>{
 const {harness}=require('./github_resilience.test');
 for(const edition of ['core','expanded']){
  const h=harness();h.c.opts={...E.previewCampaignEdition({},edition,CORE).options,mode:'hotseat',seed:'hiring-ui',created:1};
  h.run("game=E.createGame(opts);seat=0;gh.active=false;p2pRole='';renderBankRecovery=()=>{};newDraft(currentView());draft.hires=2;operatingForecastView={owner:currentView().me.id,desk:'hiring'};renderOperatingPreview(currentView());");
  const markup=h.elements.get('#operatingPreview').innerHTML;
  assert.match(markup,/EXPECTED HIRING IMPACT/);assert.match(markup,/2 staged recruits/);
  assert.match(markup,/Joining after this month/);assert.match(markup,/data-forecast-view="hiring"/);
  assert.doesNotMatch(markup,/NaN|undefined|Infinity|Unavailable:/,edition);
 }
});

console.log('Forecast drivers passed: '+checks+' checks on growth limits, project effects and research contributions.');
