'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),test=require('node:test'),{harness}=require('./github_resilience.test');
function settled(edition){const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'${edition}',{currentReporting:true,currentEconomics:true}).options,mode:'hotseat',seed:'funding-ui-'+ '${edition}',created:1});seat=0;newDraft(currentView());initialFunding=fundingMovementView.render(currentView());const plans=game.players.map((_,i)=>E.chooseBot(game,i));E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);newDraft(currentView());v=currentView();before=JSON.stringify({game,draft});`);return h;}
test('Core and Expanded funding components come from actual owner reports without changing books or plans',()=>{
 for(const edition of ['core','expanded']){const h=settled(edition);
  assert.equal(h.run('initialFunding'),'');
  h.run(`review=fundingMovementView.review(v);actualCompetition=v.causalEvents.find(e=>e.cycle===1&&e.category==='competition.deposits');html=fundingMovementView.render(v);`);
  assert.equal(h.run('review.available'),true);assert.equal(h.run('review.organic'),h.run('v.me.operatingReport.depositGrowth'));
  assert.equal(h.run('review.competition'),h.run('actualCompetition?.deltas.deposits||0'));
  assert.match(h.run('html'),/completed month 1/);assert.match(h.run('html'),/not total deposit change/);assert.match(h.run('html'),/forecasts exclude competition/);
  assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
 }
});
test('prefix-pruned history retains recorded competition but missing coverage never invents zero',()=>{
 const h=settled('expanded');h.run(`partial=JSON.parse(JSON.stringify(v));partial.causalEvents=partial.causalEvents.filter(e=>e.category!=='resolution.start');partial.causalView.firstIncludedId=partial.causalEvents[0]?.id||null;known=fundingMovementView.review(partial);`);
 assert.equal(h.run('known.available'),true);
 assert.equal(h.run('known.competition'),h.run('v.causalEvents.find(e=>e.cycle===1&&e.category==="competition.deposits")?.deltas.deposits||0'));
 h.run(`partial.causalEvents=partial.causalEvents.filter(e=>e.category!=='competition.deposits');partial.causalView.firstIncludedId=partial.causalEvents[0]?.id||null;missing=fundingMovementView.review(partial);`);
 assert.equal(h.run('E.BankEarningsBridge.review(partial).available'),false);assert.equal(h.run('missing.competition'),null);
 assert.match(h.run('fundingMovementView.render(partial)'),/unavailable does not mean zero/);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
});
test('foreign owners, stale months, duplicate stages and malformed amounts fail closed',()=>{
 const h=settled('expanded');
 for(const edit of ["bad.causalEvents[0].target='foreign-bank'","bad.cycle++","bad.operatingEvents[0].target='foreign-bank'","bad.causalEvents.push({...bad.causalEvents.at(-1)})","bad.causalEvents.find(e=>e.category==='competition.deposits').deltas.deposits=Infinity"]){
  h.run('bad=JSON.parse(JSON.stringify(v));'+edit);
  assert.equal(h.run('fundingMovementView.review(bad).available'),false,edit);assert.match(h.run('fundingMovementView.render(bad)'),/unavailable/);
 }
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
});
