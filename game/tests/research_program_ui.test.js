'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./github_resilience.test');
function fresh(research=true){
 const h=harness();h.c.research=research;
 h.run(`game=E.createGame({...E.previewCampaignEdition({},'core',{currentReporting:true,currentEconomics:true,currentResearch:research}).options,mode:'hotseat',seed:'research-copy',created:1});seat=0;gh.active=false;newDraft(currentView());
  $('#strategyTree').insertAdjacentHTML=function(where,html){this.innerHTML+=html};`);
 return h;
}
test('Automation selection and permanence review describe the actual current-Core expense ratio',()=>{
 const h=fresh();
 h.run(`game.players[0].capability.digital=E.CAPABILITY_TIERS.digital[0];newDraft(currentView());
  base=JSON.parse(JSON.stringify(game.players[0]));automated=JSON.parse(JSON.stringify(base));automated.specializations.digital='automation';
  plan=E.chooseBot(game,0);before=E.operatingPreview(base,plan,game.economy,game);after=E.operatingPreview(automated,plan,game.economy,game);
  description=strategyModelDescription(currentView(),'digital','automation');snapshot=JSON.stringify({game,draft});
  strategySelection(currentView());strategyWorkspace.branch='digital';strategyWorkspace.desk='model';`);
 const savings=h.run('(100*(1-after.expense/before.expense)).toFixed(2)');
 assert.equal(savings,'24.56');assert.match(h.run('description'),new RegExp(savings+'%'));
 h.run('renderStrategy(currentView());');
 assert.ok(h.elements.get('#strategyTree').innerHTML.includes(h.run('esc(description)')));
 assert.equal(h.run('proposeStrategyModel(currentView(),"digital","automation")'),true);
 h.run('renderStrategy(currentView());');
 const markup=h.elements.get('#strategyTree').innerHTML;
 assert.match(markup,/This becomes permanent/);
 assert.equal(markup.split(h.run('esc(description)')).length-1,2,'choice and confirmation share the same economic description');
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('snapshot'),'inspection and review never alter the campaign or plan');
});
test('Digital tier description agrees with its independent expense effect',()=>{
 const h=fresh();
 h.run(`base=JSON.parse(JSON.stringify(game.players[0]));digital=JSON.parse(JSON.stringify(base));digital.capability.digital=E.CAPABILITY_TIERS.digital[1];
  plan=E.chooseBot(game,0);before=E.operatingPreview(base,plan,game.economy,game);after=E.operatingPreview(digital,plan,game.economy,game);`);
 assert.equal(h.run('(100*(1-after.expense/before.expense)).toFixed(0)'),'9');
 assert.match(h.run('strategyMilestoneDescription(currentView(),"digital",1)'),/9%/);
 assert.doesNotMatch(h.run('strategyMilestoneDescription(currentView(),"digital",1)'),/alone does not reduce/);
});
test('legacy Core keeps its original model and milestone descriptions',()=>{
 const h=fresh(false);
 assert.match(h.run('strategyModelDescription(currentView(),"digital","automation")'),/by 8%/);
 assert.match(h.run('strategyMilestoneDescription(currentView(),"digital",1)'),/tier alone does not reduce expense/);
 assert.match(h.run('strategyModelDescription(currentView(),"operations","resilience")'),/by 18%/);
});


test('Regulatory Standing discounts deposit funding while emergency debt keeps its interest charge',()=>{
 const h=fresh();
 h.run(`p=game.players[0];p.accounting=E.AccountingPrototype.transact(p.accounting,'borrow',1000000);
  a=p.accounting.accounts;Object.assign(p.stats,{cash:a.cash,loans:a.loans,deposits:a.deposits,emergencyDebt:a.emergencyDebt,capital:a.equity,earnings:p.accounting.retainedEarnings});
  p.capability.risk=E.CAPABILITY_TIERS.risk[0];E.validatePilot(game);E.validateLedger(game);
  standing=JSON.parse(JSON.stringify(p));standing.specializations.risk='standing';plan=E.chooseBot(game,0);
  before=E.operatingPreview(p,plan,game.economy,game);after=E.operatingPreview(standing,plan,game.economy,game);`);
 assert(h.run('Math.abs((before.fundingCost-10000)*.82-(after.fundingCost-10000))<1e-8'));
 assert(h.run('100*(1-after.fundingCost/before.fundingCost)<18'),'The full funding-cost line also includes unchanged emergency-debt interest');
 assert.match(h.run('strategyModelDescription(currentView(),"risk","standing")'),/deposit funding cost by 18%/);
});

test('Research capability counts and help availability follow the current campaign rules',()=>{
 for(const edition of ['research','legacy','expanded']){
  const h=fresh(edition==='research');
  if(edition==='expanded')h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true,currentRivalry:true}).options,mode:'hotseat',seed:'research-help',created:1});newDraft(currentView());`);
  h.run('snapshot=JSON.stringify({game,draft});profile=gameHelpProfile(currentView());renderStrategy(currentView());');
  const expected=edition==='research'?'six':'five';
  assert.match(h.elements.get('#strategyTree').innerHTML,new RegExp('All '+expected+' capabilities remain open'));
  const help=h.run('searchGameHelp("research",profile,"strategy").find(row=>row.topic.id==="research").topic.text');
  // Expanded help describes the new canonical inspector, while the retained
  // Core renderer above continues to prove saved-rule capability counts.
  assert.match(help,edition==='expanded'?/Strategy → Research.*Add to monthly plan/:new RegExp('All '+expected+' capabilities'));
  for(const id of ['deployment','relationships','combinations']){
   h.c.topicId=id;
   assert.equal(h.run('gameHelpAvailable(GAME_HELP_TOPICS.find(topic=>topic.id===topicId),profile)'),edition==='research',edition+' '+id);
  }
  assert.equal(h.run('JSON.stringify({game,draft})'),h.run('snapshot'),'Reading current or historical help cannot change rules, books or plans');
 }
});

test('Combined-capability copy names the actual project and staffing effects',()=>{
 const h=fresh();
 h.run(`p=game.players[0];p.capability.network=E.CAPABILITY_TIERS.network[1];p.capability.acquisition=E.CAPABILITY_TIERS.acquisition[0];
  before=E.projectCost(p,E.PROJECTS.branch);p.capability.acquisition=E.CAPABILITY_TIERS.acquisition[1];after=E.projectCost(p,E.PROJECTS.branch);
  newDraft(currentView());snapshot=JSON.stringify({game,draft});renderStrategy(currentView());`);
 assert.equal(h.run('(100*(1-after/before)).toFixed(0)'),'22');
 const markup=h.elements.get('#strategyTree').innerHTML;
 assert.match(markup,/Reduces new branch project costs by another 22%/);
 assert.match(markup,/Acquisition project costs are unchanged/);
 assert.match(markup,/Existing servicing capacity still limits/);
 assert.match(markup,/Retail &amp; Service and Lending banker throughput by 18%/);
 assert.doesNotMatch(markup,/Acquired and new sites|without the servicing headcount|every banker covers/);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('snapshot'));
});
