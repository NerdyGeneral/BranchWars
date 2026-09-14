'use strict';
// Matched ordinary human plans, not isolated awareness assertions or evidence
// that a campaign is profitable. New Expanded starts; no invented cash/staff.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test');
const {harness}=require('./github_resilience.test');
function path({budget=0,intake=25,segment='connected',months=12,pulse=false}={}){
 const h=harness();h.c.config={budget,intake,segment,months,pulse};
 h.run(`game=E.migrateCampaign(E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:9}).options,mode:'hotseat',seed:'integrated-advertising',created:1}));
 seat=0;gh.active=false;p2pRole='';rows=[];
 for(let step=0;step<config.months&&!game.gameOver;step++){
  const plans=[];for(let index=0;index<2;index++){
   seat=index;newDraft(currentView());draft.decision='b';draft.advertisingPolicy.budget=0;
   if(!index){draft.householdPolicy.retention=25;draft.onboardingPolicy.share=config.intake;
    draft.onboardingPolicy.segment=config.segment;draft.advertisingPolicy.segment=config.segment;
    draft.advertisingPolicy.budget=config.pulse&&step?0:config.budget;}
   plans.push(JSON.parse(JSON.stringify(draft)));
  }
  const before=JSON.stringify(game),view=E.publicState(game,0),forecast=E.departmentCustomerPreview(view.me,view,plans[0]);
  E.advertisingPreview(forecast.owner,view,plans[0].advertisingPolicy);
  if(JSON.stringify(game)!==before)throw Error('Advertising preparation mutated campaign');
  E.submit(game,0,plans[0]);const restored=step===1?E.migrateCampaign(JSON.parse(JSON.stringify(game))):null;
  E.submit(game,1,plans[1]);E.validatePilot(game);E.validateLedger(game);
  if(restored){E.submit(restored,1,plans[1]);if(JSON.stringify(restored)!==JSON.stringify(game))throw Error('Half-ready advertising replay diverged');}
  const p=game.players[0],a=p.advertising.report,o=p.onboarding.report;
  if(a.spent!==p.operatingReport.advertisingCost||o.workUsed>o.capacity)throw Error('Expense or finite staff disagrees');
  for(const i of [0,1])if(E.publicState(game,i).rival.advertising!==undefined)throw Error('Rival campaign leaked');
  rows.push({month:a.cycle,spent:a.spent,awareness:a.after,generated:o.totals.generated.count,activated:o.totals.activated.count,
   capacity:o.capacity,depositIntake:p.operatingReport.customerAcquiredDeposits,onboardingDeposits:o.totals.activated.principal,
   deposits:p.stats.deposits,customers:p.stats.customers,capital:p.stats.capital,profit:p.stats.lastProfit});
 }
 result={rows,gameOver:game.gameOver,cycle:game.cycle};`);
 return JSON.parse(h.run('JSON.stringify(result)'));
}
test('Opening Expanded advertising is genuinely connected to staffed applications and activation',()=>{
 const without=path(),paid=path({budget:15000}),pulse=path({budget:15000,pulse:true}),sum=(r,key)=>r.rows.reduce((n,x)=>n+x[key],0);
 for(const r of [without,paid,pulse]){assert.equal(r.rows.length,12);assert.equal(r.gameOver,false);}
 assert(sum(paid,'generated')>sum(without,'generated'),'Awareness must increase actual matching applications when work is available');
 assert(sum(paid,'activated')>sum(without,'activated'),'Additional applications must reach real activation, not just a counter');
 assert(sum(paid,'onboardingDeposits')>sum(without,'onboardingDeposits'));
 assert.equal(sum(pulse,'spent'),15000,'One pulse does not retain a hidden recurring charge');
 assert(pulse.rows[1].awareness>0&&pulse.rows[1].awareness<pulse.rows[0].awareness,'Paused awareness decays instead of vanishing');
 console.log(JSON.stringify({scope:'12-month matched normal-opening plans, not ROI or long-run balance',paths:[without,paid,pulse].map((r,i)=>({strategy:['no ads','15K recurring','one 15K pulse'][i],spent:sum(r,'spent'),applications:sum(r,'generated'),activated:sum(r,'activated'),onboardingDeposits:sum(r,'onboardingDeposits'),ending:r.rows.at(-1)}))}));
});
test('An inactive application desk cannot claim awareness as new applications or activation',()=>{
 const r=path({budget:40000,intake:0,months:3});assert.equal(r.rows.length,3);
 assert(r.rows.every(x=>x.spent===40000&&x.awareness>0&&x.generated===0&&x.activated===0));
});
