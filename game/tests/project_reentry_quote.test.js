'use strict';
// Integration regression: planning must reserve the same rival-share premium
// that actual project execution quotes. Added before the quotation repair.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test');
const {harness}=require('./github_resilience.test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const engineCode=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
function isolated(){const context={console};vm.runInNewContext(engineCode.replace('root.BWEngine={','root.BWEngine={startProject,planFinalCashReserve,aiCashPlanningReview,withCorporateForecast,'),context);return context.BWEngine;}
function fresh(version=9,seat=0){
 const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options,financialGroupVersion:${version},mode:'hotseat',seed:'reentry-price',created:1});
  seat=${seat};gh.active=false;p2pRole='';newDraft(currentView());
  target=seat===0?'northside':'downtown';game.territories[target].exited[seat]=true;
  game.territories[target].shares[seat]=27;game.territories[target].shares[1-seat]=73;
  draft.focus=target;draft.newProjects=['branchDigital'];draft.newProject='branchDigital';draft.decision='b';`);
 return h;
}
test('Expanded re-entry planning reserves the execution price, not just base construction',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:9}).options,mode:'hotseat',seed:'reentry-price',created:1});
  seat=0;gh.active=false;p2pRole='';newDraft(currentView());
  game.territories.northside.exited[0]=true;game.territories.northside.shares=[27,73];
  draft.focus='northside';draft.newProjects=['branchDigital'];draft.newProject='branchDigital';
  priceOwner={...game.players[0],focus:draft.focus};
  execution=E.projectStartStatus(game,priceOwner,'branchDigital').terms.cost;
  planned=E.projectPlanStatus(priceOwner,draft,game).quote.projects;`);
 assert.equal(h.run('planned'),h.run('execution'),'A valid planning quote must reserve the premium already charged by execution');
});

test('Both owner views and department budgets use public ownership, with no mutation or price cache',()=>{
 for(const seat of [0,1]){
  const h=fresh(9,seat),before=h.run('JSON.stringify({game,draft})');
  h.run(`v=currentView();p=game.players[seat];
   direct=E.projectStartTerms(game,p,'branchDigital',target).cost;
   viaView=E.projectStartTerms(v,v.me,'branchDigital',target).cost;
   budget=E.planBudget(v.me,draft,v);functions=E.departmentFunctionsQuote(v,v.me,draft);
   catalog=E.projectCatalog({...v.me,focus:target},v);`);
  for(const expression of ['viaView','budget.projects','functions.budget.projects','catalog.branchDigital.cost'])assert.equal(h.run(expression),h.run('direct'),expression+' seat '+seat);
  assert.equal(h.run('functions.status.eligible'),true);
  assert.equal(h.run('JSON.stringify({game,draft})'),before);
  assert.equal(h.run('v.rival.projects'),undefined);
 }
});

test('New Expanded entry surcharge applies to construction, not unrelated bank-wide work',()=>{
 const h=fresh();h.run(`v=currentView();p=v.me;plain={...p,focus:target};`);
 for(const key of ['remediation','marketing','branchService','branchAutomation','branchClose']){
  assert.equal(h.run(`E.projectStartTerms(v,p,'${key}',target).cost`),h.run(`E.projectTerms(p,'${key}',target).cost`),key);
 }
 assert.equal(h.run("E.projectStartTerms(v,p,'branchDigital',target).cost"),813100);
 h.run('game.territories[target].exited[seat]=false;');
 assert.equal(h.run("E.projectStartTerms(game,p,'branchDigital',target).cost"),470000);
});

test('A premium shortfall blocks staging and authoritative submission, while removal stays possible',()=>{
 const h=fresh();h.run(`game.players[seat].stats.cash=600000;v=currentView();`);
 assert.equal(h.run('E.projectPlanStatus(v.me,draft,v).eligible'),false);
 assert.equal(h.run('E.projectPlanStatus(v.me,draft,v).code'),'cash');
 // This is a boundary fixture for planning, not an economically earned bank.
 assert.throws(()=>h.run('E.submit(game,seat,draft)'),/cash|fund|commits|reserve/i);
 assert.equal(h.run('game.players[seat].submitted'),null);
 assert.equal(h.run("projectChoiceStatus(v,'branchDigital').eligible"),true,'Player can decommit the expensive instruction');
 h.run("draft.newProjects=[];draft.newProject=null;");
 assert.equal(h.run("marketActionProposal(currentView(),target,'branchDigital').status.eligible"),false);
});

test('Retained map inspector, project cards and shared review show the same executable entry cost',()=>{
 // These markup assertions exercise the retained components directly. The
 // canonical Expanded inspector is covered separately below.
 const h=fresh();h.run(`expandedInterfaceEnabled=()=>false;v=currentView();openMarketConstruction(v,target);serviceProjectsUI(v);projectWorkspace.selected='branchDigital';serviceProjectsUI(v);review=monthlyPlanReview(v);`);
 assert.match(h.elements.get('#marketInspector').innerHTML,/\$813K/);
 assert.match(h.elements.get('#marketInspector').innerHTML,/\$470,000 base \+ \$343,100 rival-held entry premium = \$813,100/);
 assert.match(h.elements.get('#projectGrid').innerHTML,/\$813K/);
 assert.match(h.elements.get('#projectGrid').innerHTML,/\$343,100 rival-held entry premium/);
 const proposal=h.run("marketActionProposal(v,target,'branchDigital',{...draft,focus:'downtown',newProjects:[],newProject:null})");
 assert(proposal.effects.some(text=>text.includes('$813,100 one time')));
 assert(proposal.effects.some(text=>text.startsWith('Resulting whole-plan commitments:')));
 assert.equal(h.run('E.planBudget(v.me,draft,v).projects'),813100);
 const cheapest=h.run('marketReentryCost(v,target)');
 assert.equal(cheapest,h.run("Math.min(...Object.entries(E.projectCatalog(v.me,v)).filter(([,d])=>d.kind==='branch'&&!d.legacy).map(([k])=>E.projectStartTerms(v,v.me,k,target).cost))"));
});

test('Canonical Expanded build inspector quotes the same premium without changing the plan',()=>{
 const h=require('./interface_markets_harness').fresh({version:9});
 h.run(`game.territories.northside.exited[0]=true;game.territories.northside.shares=[27,73];
  draft.focus='northside';draft.newProjects=['branchDigital'];draft.newProject='branchDigital';
  quotedPlan=JSON.stringify(draft);quotedWorld=JSON.stringify(game);
  openInterfaceWorkspace('markets','build',{market:'northside',project:'branchDigital'});`);
 assert.match(h.c.imMount.innerHTML,/\$470,000 base \+ \$343,100 rival-held entry premium = \$813,100/);
 assert.equal(h.run("E.projectStartTerms(currentView(),currentView().me,'branchDigital','northside').cost"),813100);
 assert.equal(h.run('E.planBudget(currentView().me,draft,currentView()).projects'),813100);
 assert.equal(h.run('JSON.stringify(draft)'),h.run('quotedPlan'));
 assert.equal(h.run('JSON.stringify(game)'),h.run('quotedWorld'));
});

test('Actual project start charges exactly once and final AI reserve includes the premium',()=>{
 const E=isolated(),h=fresh(),g=JSON.parse(h.run('JSON.stringify(game)')),plan=JSON.parse(h.run('JSON.stringify(draft)')),p=g.players[0];
 p.focus=plan.focus;const cost=E.planBudget(p,plan,g).projects,cash=p.stats.cash,spent=p.buildSpend||0;
 const text=E.startProject(g,p,'branchDigital');assert.match(text,/began/);
 assert.equal(cash-p.stats.cash,cost);assert.equal(p.buildSpend-spent,cost);
 const held=p.stats.cash;E.startProject(g,p,'branchDigital');assert.equal(p.stats.cash,held,'Already-started work is not charged again');
 const g2=JSON.parse(h.run('JSON.stringify(game)')),candidate=JSON.parse(JSON.stringify(plan));candidate.hires=1;
 const chosen=E.withCorporateForecast(g2,()=>E.planFinalCashReserve(g2,0,candidate)),budget=E.planBudget(g2.players[0],chosen,g2),reserve=E.withCorporateForecast(g2,()=>E.aiCashPlanningReview(g2,0,chosen));
 assert(budget.total<=reserve.limit);if(chosen.newProjects.includes('branchDigital'))assert.equal(budget.projects,813100);
});

test('A paid re-entry plan survives half-ready save/resume and deterministic settlement',()=>{
 const h=fresh();h.run(`E.submit(game,seat,draft);resumed=E.migrateCampaign(JSON.parse(JSON.stringify(game)));
  other=E.chooseBot(game,1);otherCopy=E.chooseBot(resumed,1);
  E.submit(game,1,other);E.submit(resumed,1,otherCopy);E.validatePilot(game);E.validateLedger(game);`);
 const differences=[];
 function compare(a,b,path='game'){if(Object.is(a,b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[key],b[key],path+'.'+key);}else if(differences.length<12)differences.push({path,a,b});}
 // Migration intentionally retires the old unused strategy cache. Compare the
 // canonical export boundary on BOTH paths, as campaign recovery tests do.
 compare(JSON.parse(h.run('JSON.stringify(E.migrateCampaign(game))')),JSON.parse(h.run('JSON.stringify(E.migrateCampaign(resumed))')));assert.deepEqual(differences,[]);
 assert.equal(h.run('game.cycle'),2);
 assert(h.run("game.players[0].projects.some(p=>p.key==='branchDigital')"));
});

test('Historical Group8 quotes and its nonlocal execution surcharge remain unchanged',()=>{
 const h=fresh(8);h.run('v=currentView();');
 assert.equal(h.run('E.planBudget(v.me,draft,v).projects'),470000);
 assert.equal(h.run("E.projectStartTerms(v,v.me,'branchDigital',target).cost"),813100);
 assert.equal(h.run("E.projectStartTerms(v,v.me,'remediation',target).cost"),h.run("Math.round(E.projectTerms(v.me,'remediation',target).cost*1.73)"));
 assert.equal(h.run('game.version'),'9.7');
});
