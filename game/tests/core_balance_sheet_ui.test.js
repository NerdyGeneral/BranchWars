'use strict';
process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./github_resilience.test');
test('Core balance sheet, earnings sources and payroll are visible without changing the draft',()=>{
 const h=harness();
 h.run("game=E.createGame({incomeHistoryVersion:1,commercialServiceVersion:1,bankEconomicsVersion:2,mode:'hotseat',seed:'core-books-ui',created:1});seat=0;newDraft(currentView());renderBankRecovery=()=>{};E.submit(game,0,E.chooseBot(game,0));E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());saved=JSON.stringify({game,draft});renderOperatingPreview(currentView());");
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));
 const html=h.elements.get('#operatingPreview').innerHTML;
 assert.match(html,/RECONCILED BANK ACCOUNTS/);assert.match(html,/Securities/);assert.match(html,/Retained earnings/);
 assert.match(html,/Exposure = loans \+ 20% of securities/);assert.doesNotMatch(html,/NaN|undefined/);
 assert.equal(h.run('E.bankBasePayroll(currentView().me)'),12000);
 assert.equal(h.run('E.IncomeReview.statement(currentView().me.operatingReport).abstract'),0);
});
