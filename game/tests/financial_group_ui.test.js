'use strict';
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');
const h=harness();
h.run("const setup=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:1}).options;"+
  "game=E.createGame({...setup,mode:'hotseat',seed:32,created:1});seat=0;workspaceTab='group';newDraft(currentView());"+
  "renderReady=()=>{};renderFinancialGroup(currentView());");
assert.match(h.elements.get('#financialGroupPanel').innerHTML,/GROUP CAPITAL/);
assert.match(h.elements.get('#financialGroupPanel').innerHTML,/not automatic recurring dividends/);
assert.match(h.elements.get('#financialGroupPanel').innerHTML,/Parent operating cash/);
assert(h.elements.get('#stageGroupCapital').listeners.click);
const before=h.run('JSON.stringify(game)');
assert(h.run("stageGroupPolicy(currentView(),{bankDividend:0,bankSupport:0,creditAllocation:{mortgage:50,middleMarket:25,consumer:25}})"));
assert.equal(h.run('JSON.stringify(game)'),before);
assert.equal(h.run("stageGroupPolicy(currentView(),{bankDividend:1,bankSupport:0,creditAllocation:{mortgage:50,middleMarket:25,consumer:25}})"),false);
assert.equal(h.run('draft.groupPolicy.bankDividend'),0);
const content=h.run("groupCreditControls(currentView())");
assert.match(content,/NEW LENDING PORTFOLIO/);assert.match(content,/mortgage/);assert.match(content,/middleMarket/);assert.match(content,/consumer/);
h.run("document.querySelector('#productPortfolio').insertAdjacentHTML=function(position,html){if(position!=='beforeend')throw Error('Unexpected insertion');this.innerHTML+=html;};"+
 "document.querySelector('#qaGroupMix').dataset.groupMix='1';"+
 "document.querySelectorAll=selector=>selector==='[data-group-mix]'?[document.querySelector('#qaGroupMix')]:[];"+
 "bindGroupCreditControls(currentView());");
h.elements.get('#compareGroupLending').listeners.click();
assert.match(h.elements.get('#groupLendingComparison').innerHTML,/24-month credit scenario/);
assert.match(h.elements.get('#groupLendingComparison').innerHTML,/Principal repayment is not profit/);
assert.equal(h.run('JSON.stringify(game)'),before,'Comparison must not change the bank or world.');
h.run("draft.capitalPolicy='liquid'");
const revised=h.run('JSON.stringify(draft)');
h.elements.get('#qaGroupMix').listeners.click();
assert.equal(h.run('JSON.stringify(draft)'),revised,'Stale comparison cannot replace manual edits.');
h.elements.get('#compareGroupLending').listeners.click();
h.elements.get('#qaGroupMix').listeners.click();
assert.equal(h.run('draft.groupPolicy.creditAllocation.mortgage'),100,'Fresh comparison stages the chosen mix.');
h.run("stageGroupPolicy(currentView(),{bankDividend:0,bankSupport:0,creditAllocation:{mortgage:50,middleMarket:25,consumer:25}})");
h.run("draft.decision='b';E.submit(game,0,draft);renderFinancialGroup(currentView());");
assert.match(h.elements.get('#financialGroupPanel').innerHTML,/id="stageGroupCapital"[^>]*disabled/);
assert.equal(h.run("stageGroupPolicy(currentView(),E.defaultGroupPlan(game.players[0]))"),false);
h.run("E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());renderFinancialGroup(currentView());");
assert.match(h.elements.get('#financialGroupPanel').innerHTML,/Last settled month 1/);
assert.equal(h.run('draft.groupPolicy.bankDividend'),0);
assert.equal(h.run('draft.groupPolicy.creditAllocation.mortgage'),50);
h.run("seat=1;newDraft(currentView());renderFinancialGroup(currentView());");
assert.equal(h.run('draft.groupPolicy.creditAllocation.mortgage'),h.run('game.players[1].creditPortfolio.allocation.mortgage'));
assert.equal(h.run('draftOwner'),h.run('game.players[1].id'));
const legacy=harness();
legacy.run("game=E.createGame({mode:'hotseat',seed:1,created:1});seat=0;workspaceTab='group';newDraft(currentView());renderFinancialGroup(currentView());");
assert.equal(legacy.elements.get('#financialGroupPanel').innerHTML,'');
assert.equal(legacy.run('workspaceTab'),'overview');
assert.equal(legacy.run('draft.groupPolicy'),undefined);
const companies=harness();
companies.run("const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:2}).options;"+
 "game=E.createGame({...options,mode:'hotseat',seed:32,created:1});seat=0;workspaceTab='group';newDraft(currentView());renderReady=()=>{};renderFinancialGroup(currentView());");
const statement=companies.elements.get('#financialGroupPanel').innerHTML;
assert.match(statement,/CORPORATE CLIENTS/);assert.match(statement,/not spendable cash/);
assert.match(statement,/not buy ownership/);assert.match(statement,/Cash, credit risk and forecasts/);
for(const profile of companies.run('E.ANCHOR_CLIENTS'))assert(statement.includes(profile.name));
const companyBefore=companies.run('JSON.stringify(game)');
companies.run('renderFinancialGroup(currentView());groupCreditControls(currentView());');
assert.equal(companies.run('JSON.stringify(game)'),companyBefore);
companies.run('const pair=game.players.map((p,i)=>E.chooseBot(game,i));E.submit(game,0,pair[0]);E.submit(game,1,pair[1]);newDraft(currentView());renderFinancialGroup(currentView());');
assert.equal(companies.run('game.companyEconomy.month'),1);
assert.equal(companies.run('currentView().me.companySnapshot.world.month'),1);
console.log('Financial Group UI harness PASS: capital safeguards, staged lending, sealed controls, corporate statements, settled results, owner switch and legacy hiding. Real browser acceptance remains separate.');
