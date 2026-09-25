'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
function fresh(){
 const h=harness();
 h.run(`game=E.createGame({mode:'hotseat',seed:'core-loan-income',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());renderBankRecovery=()=>{};`);
 return h;
}
test('Core shows real loan interest in its main forecast without hiding net production',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');
 h.run('forecast=E.operatingPreview(currentView().me,draft,game.economy,currentView(),true);renderOperatingPreview(currentView())');
 assert.equal(h.run('JSON.stringify({game,draft})'),before,'Rendering must not mutate money, RNG or orders');
 const markup=h.elements.get('#operatingPreview').innerHTML;
 const bank=markup.split('<div data-forecast-panel="bank"')[1].split('<div data-forecast-panel="commercial"')[0];
 const summary=bank.split('<details')[0];
 assert.match(summary,/<td>Loan interest income<\/td>/);
 assert(summary.includes(h.run('money(forecast.loanIncome)')));
 assert.match(summary,/Net loan production/);
 assert.match(bank,/Existing loan principal:/);
 assert.match(bank,/not net lending profit/);
 assert.match(bank,/does not track separate loan-type balances or scheduled principal repayments/);
 assert.doesNotMatch(bank,/NaN|undefined/);
});
test('Core draft lending changes update actual income and the loss comparison',()=>{
 const h=fresh();
 h.run(`base=E.operatingPreview(currentView().me,draft,game.economy,currentView(),true);draft.products.credit='consumer';draft.lendingPolicy='growth';
  proposed=E.operatingPreview(currentView().me,draft,game.economy,currentView(),true);saved=JSON.stringify({game,draft});renderOperatingPreview(currentView());`);
 assert(h.run('proposed.loanIncome>base.loanIncome'));
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));
 const markup=h.elements.get('#operatingPreview').innerHTML;
 assert(markup.includes(h.run('money(proposed.loanIncome)')));
 assert(markup.includes(h.run('money(Math.abs(proposed.loanIncome-proposed.chargeoff))')));
 assert(markup.includes(h.run('money(Math.abs(base.loanIncome-base.chargeoff))')));
});
test('Loan explanation preserves negative contributions and distinguishes principal from earnings',()=>{
 const h=fresh();h.run(`sampleBefore={loanIncome:50000,chargeoff:70000};sampleAfter={loanIncome:80000,chargeoff:10000};
  explanation=renderCoreLoanIncome(currentView(),sampleBefore,sampleAfter);`);
 const markup=h.run('explanation');
 assert(markup.includes(h.run("'−'+money(20000)")));
 assert(markup.includes(h.run("'+'+money(70000)")));
 assert(markup.includes(h.run("'+'+money(90000)")));
 assert.match(markup,/Net loan production changes principal; it is not income/);
 assert.match(markup,/already included in operating profit/);
});
test('Expanded keeps its detailed loan book and does not receive the Core-only explanation',()=>{
 const h=fresh();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:10}).options,mode:'hotseat',seed:'expanded-loans',created:1});newDraft(currentView());renderOperatingPreview(currentView());`);
 const markup=h.elements.get('#operatingPreview').innerHTML;
 assert.doesNotMatch(markup,/data-core-loan-income/);
 assert.match(markup,/Scheduled principal returned/);
 assert.match(markup,/Cash after operations/);
 assert.match(markup,/Deposit account fees/);
});
