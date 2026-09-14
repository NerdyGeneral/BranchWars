'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
test('servicing warning links Core and Expanded to their existing controls without changing orders',()=>{
 for(const edition of ['core','expanded']){
  const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'${edition}',{currentReporting:true,currentEconomics:true}).options,mode:'hotseat',seed:'service-navigation',created:1});seat=0;newDraft(currentView());
   serviceView=currentView();servicePlan=E.chooseBot(JSON.parse(JSON.stringify(game)),0);
   serviceForecast=E.operatingPreview(serviceView.me,servicePlan,serviceView.economy,serviceView);
   serviceForecast.commercialServiceCoverage=0;
   serviceHtml=renderIncomeReview(serviceView,serviceForecast,serviceForecast,'commercial');
   serviceNavigation=[];navigatePlanReview=item=>serviceNavigation.push(item);serviceSelected=[];serviceFocused=0;
   departmentFunctionsLive.controller={token:()=>({stamp:'review'}),select:(id,token)=>{serviceSelected.push({id,token});return true;}};
   renderDepartments=()=>{};focusWorkspaceTarget=()=>serviceFocused++;
   saved=JSON.stringify({game,draft,serviceView,serviceForecast});bindIncomeServicingAction(serviceView);`);
  assert.match(h.run('serviceHtml'),/recurring fees fall even if customer counts grow/);
  assert.match(h.run('serviceHtml'),edition==='core'?/Review Business staffing/:/Review relationship servicing/);
  h.elements.get('#incomeServicingAction').onclick();
  assert.equal(h.run('JSON.stringify({game,draft,serviceView,serviceForecast})'),h.run('saved'));
  assert.equal(h.run('serviceNavigation[0].tab'),edition==='core'?'operations':'workforce');
  assert.equal(h.run('serviceNavigation[0].target'),edition==='core'?'#staffGrid':'#departmentPanel');
  if(edition==='expanded'){assert.equal(h.run('serviceSelected[0].id'),'relationships');assert.equal(h.run('serviceFocused'),1);}
  else assert.equal(h.run('serviceSelected.length'),0);
  h.run('serviceNavigation=[];game=JSON.parse(JSON.stringify(game));');h.elements.get('#incomeServicingAction').onclick();
  assert.equal(h.run('serviceNavigation.length'),0,'Replaced campaign refuses stale navigation');
 }
});
test('servicing navigation preserves an unreviewed department form and respects owner and month',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true}).options,mode:'hotseat',seed:'service-stale',created:1});seat=0;newDraft(currentView());
  serviceView=currentView();serviceNavigation=[];navigatePlanReview=item=>serviceNavigation.push(item);serviceRedraw=0;
  departmentFunctionsLive.controller={token:()=>({}),select:()=>false};renderDepartments=()=>serviceRedraw++;focusWorkspaceTarget=()=>serviceRedraw++;
  saved=JSON.stringify({game,draft});bindIncomeServicingAction(serviceView);`);
 h.elements.get('#incomeServicingAction').onclick();assert.equal(h.run('serviceRedraw'),0,'Refused selection must not discard dirty form');
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));
 h.run('serviceNavigation=[];seat=1;');h.elements.get('#incomeServicingAction').onclick();assert.equal(h.run('serviceNavigation.length'),0);
 h.run('seat=0;game.cycle++;');h.elements.get('#incomeServicingAction').onclick();assert.equal(h.run('serviceNavigation.length'),0);
});
test('live commercial forecast opens the relationship editor with version-correct consequences',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true}).options,mode:'hotseat',seed:'service-live',created:1});seat=0;newDraft(currentView());
  const originalQuery=document.querySelector;document.querySelector=selector=>{const el=originalQuery(selector);el.remove=function(){this.innerHTML='';};el.insertAdjacentHTML=function(position,html){this.innerHTML+=html;};return el;};
  renderBankRecovery=()=>{};saved=JSON.stringify({game,draft});renderOperatingPreview(currentView());`);
 h.elements.get('#incomeServicingAction').onclick();
 assert.equal(h.run('workspaceTab'),'workforce');assert.equal(h.run('peopleWorkspaceState.desk'),'coverage');
 const html=h.elements.get('#departmentFunctionsMount').innerHTML;
 assert.match(html,/id="df-select-relationships"[^>]*aria-pressed="true"/);
 assert.match(html,/Recurring business and merchant fees, plus acquisition/);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));
});
test('Core and Expanded income reviews use authoritative reports, preserve drafts and render missing history honestly',()=>{
 for(const edition of ['core','expanded']){
  const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'${edition}').options,mode:'hotseat',seed:'income-ui',created:1});seat=0;newDraft(currentView());renderBankRecovery=()=>{};`);
  h.run('saved=JSON.stringify({game,draft});renderOperatingPreview(currentView())');assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));
  let html=h.elements.get('#operatingPreview').innerHTML;assert.match(html,/Loan income · actual & outlook/);assert.match(html,/Business & merchant fees · actual & outlook/);assert.match(html,/Not available/);assert.match(html,/not zero growth/);assert.doesNotMatch(html,/NaN|undefined/);
  h.run('E.submit(game,0,E.chooseBot(game,0));E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());saved=JSON.stringify({game,draft});renderOperatingPreview(currentView())');
  assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));html=h.elements.get('#operatingPreview').innerHTML;
  assert(html.includes(h.run('incomeAmount(currentView().me.operatingReport.loanIncome)')));assert.match(html,/Solid = actual/);assert.match(html,/Retained actual records/);assert.match(html,/Month 1/);
  const result=h.elements.get('#operatingReport').innerHTML;assert.match(result,/Operating expenses/);assert.match(result,/Other modeled income/);assert.doesNotMatch(result,/NaN|undefined/);
 }
});
test('history graphs break missing-month lines and expose negative, zero and forecast amounts in accessible content',()=>{
 const h=harness();h.run(`sample=incomeHistoryGraph([{cycle:1,loanIncome:-20},{cycle:2,loanIncome:null},{cycle:3,loanIncome:30}],'loanIncome',0,50)`);
 const html=h.run('sample');assert.match(html,/role="img"/);assert.match(html,/Month 1: −\$20/);assert.match(html,/Draft forecast: \$50/);assert.match(html,/Standing forecast: \$0/);assert.equal((html.match(/<line /g)||[]).length,1,'Only zero axis; no line across a missing month');
});
test('loan movement includes named borrower servicing without counting unpaid interest as principal',()=>{
 const h=harness();h.run(`namedMovement=creditFlowRows({loanGrowth:105,principalRepaid:20,creditRecovery:3,chargeoff:15,companyCredit:{advanced:50,principalPaid:10,recoveredPrincipal:2,principalWrittenOff:6,interestWrittenOff:5}})`);
 assert.deepEqual(JSON.parse(JSON.stringify(h.run('namedMovement'))),[150,-30,-5,-10,105]);
 assert.equal(h.run('creditFlowRows({loanGrowth:10,principalRepaid:20,chargeoff:0,companyCredit:{interestWrittenOff:1}})'),null,'Inconsistent losses must not invent principal');
});

test('explicit persistent-reporting campaigns show saved relationship movements and survive pruned diagnostic views',()=>{
 for(const edition of ['core','expanded']){
  const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'${edition}').options,incomeHistoryVersion:1,mode:'hotseat',seed:'income-ui',created:1});seat=0;E.submit(game,0,E.chooseBot(game,0));E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());`);
  h.run('reportView=currentView();reportView.operatingEvents=[];reportView.trend=[];saved=JSON.stringify({game,draft});rendered=renderIncomeReview(reportView,{}, {},"commercial")');
  assert.match(h.run('rendered'),/Net relationship change in month 1/);assert.match(h.run('rendered'),/independently of diagnostic-log pruning/);assert.doesNotMatch(h.run('rendered'),/NaN|undefined/);
  assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));
  h.run('principal=renderPrincipalHistory(reportView)');assert.match(h.run('principal'),/Actual loan balances/);
 }
});
test('portfolio-based administration is explained beside lending without changing the actual book or draft',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true}).options,commercialServiceVersion:1,creditWorkloadVersion:1,mode:'hotseat',seed:'credit-ui',created:1});seat=0;newDraft(currentView());saved=JSON.stringify({game,draft});creditHtml=renderIncomeReview(currentView(),{}, {},'loan');`);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));assert.match(h.run('creditHtml'),/active product portfolios by location/);assert.match(h.run('creditHtml'),/Collections still require separate capacity/);assert.doesNotMatch(h.run('creditHtml'),/NaN|undefined/);
});

test('serviced-income campaigns explain current capacity and activation timing without duplicating expenses or changing plans',()=>{
 for(const edition of ['core','expanded']){
  const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'${edition}',{currentReporting:true}).options,commercialServiceVersion:1,mode:'hotseat',seed:'fee-ui',created:1});seat=0;newDraft(currentView());feeView=currentView();feePlan=E.chooseBot(JSON.parse(JSON.stringify(game)),0);feeQuote=E.operatingPreview(feeView.me,feePlan,feeView.economy,feeView,true);saved=JSON.stringify({game,draft,feeView,feePlan});feeHtml=renderIncomeReview(feeView,feeQuote,feeQuote,'commercial');`);
  assert.equal(h.run('JSON.stringify({game,draft,feeView,feePlan})'),h.run('saved'));
  assert.match(h.run('feeHtml'),/Relationship servicing: standing/);assert.match(h.run('feeHtml'),/start earning next month/);assert.doesNotMatch(h.run('feeHtml'),/NaN|undefined/);
  assert.match(h.run('feeHtml'),edition==='core'?/No additional servicing fee/:/Payroll and vendor costs remain included/);
 }
});

test('Core deposit contribution is not mislabeled as Expanded account fees',()=>{
 for(const edition of ['core','expanded']){
  const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'${edition}',{currentEconomics:true}).options,mode:'hotseat',seed:'deposit-income-label',created:1});seat=0;newDraft(currentView());
   statementView=currentView();statementPlan=E.chooseBot(JSON.parse(JSON.stringify(game)),0);statementForecast=E.operatingPreview(statementView.me,statementPlan,statementView.economy,statementView);saved=JSON.stringify({game,draft,statementView,statementForecast});statementHtml=renderBankIncomeStatement(statementView,statementForecast,statementForecast);`);
  const html=h.run('statementHtml');
  if(edition==='core'){
   assert.match(html,/Core deposit-linked contribution \(modeled\)/);
   assert.match(html,/does not model billed account fees/);
   assert.doesNotMatch(html,/>Deposit account fees</);
  }else{
   assert.match(html,/>Deposit account fees</);
   assert.doesNotMatch(html,/Core deposit-linked contribution/);
  }
  assert(html.includes(h.run('incomeAmount(statementForecast.depositIncome)')),'The label uses the existing authoritative amount');
  assert.equal(h.run('JSON.stringify({game,draft,statementView,statementForecast})'),h.run('saved'));
 }
});

test('bank statement shows classified actual and forecast amounts without exposing rival books or adding charges',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true}).options,commercialServiceVersion:1,creditWorkloadVersion:1,mode:'hotseat',seed:'statement-ui',created:1});seat=0;newDraft(currentView());
 statementPlan=E.chooseBot(JSON.parse(JSON.stringify(game)),0);statementView=currentView();statementForecast=E.operatingPreview(statementView.me,statementPlan,statementView.economy,statementView);saved=JSON.stringify({game,draft,statementPlan,statementView});statementHtml=renderBankIncomeStatement(statementView,statementForecast,statementForecast);`);
 assert.equal(h.run('JSON.stringify({game,draft,statementPlan,statementView})'),h.run('saved'));
 assert.match(h.run('statementHtml'),/Detailed income sources were not recorded/);assert.match(h.run('statementHtml'),/Net interest income/);
 h.run(`E.submit(game,0,E.chooseBot(game,0));E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());statementView=currentView();saved=JSON.stringify({game,draft,statementView});statementHtml=renderBankIncomeStatement(statementView,statementForecast,statementForecast);`);
 const html=h.run('statementHtml');assert.match(html,/Securities interest/);assert.match(html,/Legacy modeled bonuses/);assert.match(html,/Where operating costs go/);assert.match(html,/not consolidated group earnings/);assert.doesNotMatch(html,/NaN|undefined/);
 assert(html.includes(h.run('incomeAmount(statementView.me.operatingReport.incomeSource_securitiesInterest)')));
 assert.equal(h.run('JSON.stringify({game,draft,statementView})'),h.run('saved'));
 h.run(`statementView.rival.operatingReport={incomeSource_securitiesInterest:999999999};privateSafe=renderBankIncomeStatement(statementView,statementForecast,statementForecast);`);assert.equal(h.run('privateSafe'),html);
 h.run(`statementView.me.operatingReport.incomeSource_version=99;malformed=renderBankIncomeStatement(statementView,null,null);`);assert.match(h.run('malformed'),/Detailed income statement unavailable/);
 assert.equal(h.run('renderBankIncomeStatement({cycle:2,me:{operatingReport:{cycle:1}}},{},{})'),'','Legacy sources must not be reconstructed');
});
