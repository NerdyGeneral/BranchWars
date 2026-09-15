'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {runtime}=require('../tools/income_banking_trial'),{conventionalProposal}=require('../tools/stabilization_banking_trial');
const {E}=runtime(require('../tools/build_game').assemble().html),copy=x=>JSON.parse(JSON.stringify(x));
for(const expand of [false,true])test('Conventional trial '+(expand?'paid expansion':'existing network')+' is finite, pure and fully validated',()=>{
 const g=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true}).options,startingWorkforce:'covered',mode:'hotseat',seed:'business-balance:1',created:1});
 const base=E.chooseBot(copy(g),0),before=JSON.stringify({g,base}),result=conventionalProposal(E,g,0,base,expand);
 assert(result.accepted,result.reason);assert.equal(JSON.stringify({g,base}),before);
 assert.equal(Object.values(result.plan.allocation).reduce((a,b)=>a+b,0),8);assert.equal(result.plan.allocation.operations,2);
 assert(result.plan.allocation.lending>result.plan.allocation.business);
 E.validatePortfolioPlan(g.players[0],result.plan,g);E.validatePlan(g,g.players[0],result.plan);
 if(!expand){assert.equal(result.plan.hires,0);assert.equal(result.plan.newProjects.length,0);}
 else{const budget=E.planBudget(g.players[0],result.plan,g);assert(budget.discretionaryRemaining>=0);assert(budget.discretionaryCashAvailable-budget.discretionaryCommitments>=600000);}
});
