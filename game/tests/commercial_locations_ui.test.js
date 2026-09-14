'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
const copy=x=>JSON.parse(JSON.stringify(x));
function fresh(version=10){const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options,mode:'hotseat',seed:'local-orders',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());draft.decision='b';errors=[];toast=x=>errors.push(x);renderProjects=()=>{};renderReady=()=>{};renderMarkets=()=>{};`);return h;}
test('Expanded edition confirmation explains the package, not its dependency graph',()=>{
 const h=harness();
 h.run(`const input=document.querySelector('#financialGroupPreview');input._editionRequest='expanded';input.checked=true;document.querySelector('#setupFeatureOptions').listeners.change({target:input});`);
 assert(h.run('featureSelectionPending()'));assert.equal(h.run('readSetupFeatureOptions().financialGroupVersion'),0);
 assert.equal(h.elements.get('#featureSelectionTitle').textContent,'Choose Expanded edition?');
 const markup=h.elements.get('#featureSelectionAffected').innerHTML;assert.equal((markup.match(/<li>/g)||[]).length,5);assert.doesNotMatch(markup,/required dependency|funding covenants/i);
 h.run('cancelFeatureSelectionConfirmation()');assert.equal(h.run('readSetupFeatureOptions().financialGroupVersion'),0);
 h.run(`const input2=document.querySelector('#financialGroupPreview');input2._editionRequest='expanded';input2.checked=true;document.querySelector('#setupFeatureOptions').listeners.change({target:input2});`);
 assert(h.confirmFeatures());assert.equal(h.run('readSetupFeatureOptions().financialGroupVersion'),10);
 assert.match(h.elements.get('#setupFeatureOptions').innerHTML,/Expanded edition/);
});
test('Separate-market staging preserves earlier targets and the shared whole-plan limits',()=>{
 const h=fresh();
 // A pure UI/budget fixture with extra cash and capital; not campaign income or
 // a claimed ordinary-starting-bank affordability result.
 h.run(`game.players[0].stats.cash=10000000;game.players[0].stats.capital=10000000;
  markets=Object.keys(game.territories);initialFocus=draft.focus;
  first=marketActionProposal(currentView(),markets[0],'branch');`);
 assert(h.run('first.status.eligible'),h.run('first.status.reason'));h.run('draft=first.candidate;second=marketActionProposal(currentView(),markets[1],"branchCommercial")');
 assert(h.run('second.status.eligible'),h.run('second.status.reason'));h.run('draft=second.candidate');
 assert.equal(h.run('draft.focus'),h.run('initialFocus'));
 assert.deepEqual(copy(h.run('draft.projectTargets')),copy(h.run('({branch:markets[0],branchCommercial:markets[1]})')));
 assert.equal(h.run('E.planBudget(currentView().me,draft,currentView()).projects'),h.run('E.projectStartTerms(currentView(),currentView().me,"branch",markets[0]).cost+E.projectStartTerms(currentView(),currentView().me,"branchCommercial",markets[1]).cost'));
 assert.equal(h.run('marketActionProposal(currentView(),markets[0],"branchDigital").status.eligible'),false,'One construction job per market');
 const before=h.run('JSON.stringify(draft)');h.run('game.players[0].stats.cash=0');assert.equal(h.run('marketActionProposal(currentView(),markets[2],"branchDigital").status.eligible'),false);assert.equal(h.run('JSON.stringify(draft)'),before);
 assert(h.run('requestMarketAction(currentView(),markets[0],"branch")'),'Removal must remain possible while cash is short');assert.equal(h.run('draft.projectTargets.branch'),undefined);assert.equal(h.run('draft.projectTargets.branchCommercial'),h.run('markets[1]'));
});
test('Local staging checks already-staged conversion and renovation before Ready',()=>{
 for(const work of ['conversion','renovation']){
  const h=fresh();h.run(`game.players[0].stats.cash=10000000;game.players[0].stats.capital=10000000;
   office=game.players[0].facilityNetwork.offices[0];other=Object.keys(game.territories).find(k=>k!==office.market);`);
  if(work==='conversion')h.run(`draft.facilityPolicy={convert:{officeId:office.id,model:'commercial'},cancel:null};`);
  else h.run(`game.players[0].facilityLifecycle.records[office.id].conditionBp=5000;draft.facilityLifecyclePolicy.renovate=office.id;`);
  const before=h.run('JSON.stringify({game,draft})');
  assert.equal(h.run('marketActionProposal(currentView(),office.market,"branchAtm").status.eligible'),false,work+' conflicts at its own market');
  assert.equal(h.run('projectChoiceStatus(currentView(),"branchAtm",draft,office.market).eligible'),false,'Catalogue shares the same guard');
  h.run('separate=marketActionProposal(currentView(),other,"branchAtm")');
  assert(h.run('separate.status.eligible'),work+': '+h.run('separate.status.reason'));
  assert.equal(h.run('JSON.stringify({game,draft})'),before,'Review cannot stage or charge');
 }
});

test('Malformed, unknown, legacy and closed-market locations are refused without adopting them',()=>{
 const h=fresh();h.run('candidate=JSON.parse(JSON.stringify(draft));candidate.newProjects=["branch"];');
 for(const targets of [null,[],{unknown:'downtown'},{branch:123},{branch:'missing'},{branch:'downtown',marketing:'northside'}]){h.c.targets=targets;assert(h.run('E.projectLocationsIssue(game,game.players[0],{...candidate,projectTargets:targets})'));}
 const old=fresh(9);assert(old.run('E.projectLocationsIssue(game,game.players[0],{...draft,projectTargets:{}})'));
 h.run('game.players[0].submitted={...candidate,projectTargets:{branch:"missing"}}');const before=h.run('JSON.stringify(game)');assert.throws(()=>h.run('E.migrateCampaign(game)'));assert.equal(h.run('JSON.stringify(game)'),before);
});
test('Undo restores an initiative together with its location and leaves other orders intact',()=>{
 const h=fresh();h.run(`draft.newProjects=['branch'];draft.newProject='branch';draft.projectTargets={branch:Object.keys(game.territories)[0]};resetMonthlyChanges(currentView());draft.projectTargets.branch=Object.keys(game.territories)[1];`);
 assert.equal(h.run('monthlyChangeRows(currentView()).length'),1,'A location-only change cannot disappear from review');
 h.run('proposeMonthlyUndo(currentView(),0)');assert(h.run('applyMonthlyUndo(currentView())'));assert.equal(h.run('draft.projectTargets.branch'),h.run('Object.keys(game.territories)[0]'));
 h.run(`draft.newProjects.push('branchCommercial');draft.projectTargets.branchCommercial=Object.keys(game.territories)[1];proposeMonthlyUndo(currentView(),0);`);
 assert(h.run('applyMonthlyUndo(currentView())'));assert.deepEqual(copy(h.run('draft.newProjects')),['branch']);assert.equal(h.run('draft.projectTargets.branchCommercial'),undefined);
});
test('Bank forecast makes business balances and treasury visible without opening another desk',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');
 h.run('renderBankRecovery=()=>{};renderOperatingPreview(currentView())');
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 const markup=h.elements.get('#operatingPreview').innerHTML;
 const bank=markup.split('data-forecast-panel="bank"')[1].split('data-forecast-panel="commercial"')[0];
 assert.match(bank,/Business banking at a glance/);assert.match(bank,/Business loans/);assert.match(bank,/Business deposits/);assert.match(bank,/Treasury services/);
 assert.match(bank,/data-forecast-view="commercial"/);assert.match(bank,/Not separately tracked/);
 h.run(`trackedSummary=renderCommercialSnapshot({me:{commercialAccounts:{report:{before:500000,after:650000,cycle:8}}}}, {businessLoans:1200000,businessLoanGrowth:-4000,businessDeposits:650000,treasuryAvailable:true,treasuryRunRate:50000,treasuryServed:1})`);
 const tracked=h.run('trackedSummary');assert.match(tracked,/actual change in month 8/);assert.match(tracked,/estimated net change/);assert.match(tracked,/1 existing mandates served/);assert.doesNotMatch(tracked,/Not separately tracked/);
});

test('Commercial forecast exposes tracked vintages and relationships without inventing business deposits',()=>{
 const h=fresh();const before=h.run('JSON.stringify({game,draft})');
 h.run('a=E.operatingPreview(currentView().me,draft,game.economy,currentView(),true);renderBankRecovery=()=>{};renderOperatingPreview(currentView())');
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 assert.equal(h.run('a.commercial.businessDeposits'),null);assert.equal(typeof h.run('a.commercial.businessLoanGrowth'),'number');
 const markup=h.elements.get('#operatingPreview').innerHTML;assert.match(markup,/Net business loan change/);assert.match(markup,/Business deposits:<\/b> not separately tracked/);assert.match(markup,/Treasury service run rate/);assert.match(markup,/already included/);
 h.run('legacy=E.createGame({seed:1,created:1});lp=legacy.players[0];lplan={allocation:lp.allocation,depositPolicy:lp.policies.deposit,lendingPolicy:lp.policies.lending,capitalPolicy:lp.policies.capital,products:lp.products};core=E.operatingPreview(lp,lplan,legacy.economy,legacy,true)');
 assert.equal(h.run('core.commercial.businessLoans'),null);assert.equal(h.run('core.commercial.treasuryAvailable'),false);assert.equal(h.run('core.commercial.businessDeposits'),null);
 h.run(`for(const c of game.players[0].creditBook.cohorts)c.product='middleMarket';
  commercialStock=E.operatingPreview(currentView().me,draft,game.economy,currentView(),true);
  legacyShape=E.operatingPreview(currentView().me,draft,game.economy,currentView());`);
 assert(h.run('commercialStock.commercial.businessLoans>0'));assert(h.run('commercialStock.commercial.businessLoanGrowth<0'),'Amortization must be shown, not just gross production');
 const detail=copy(h.run('commercialStock'));delete detail.commercial;assert.deepEqual(detail,copy(h.run('legacyShape')),'Detail must not change the original forecast calculation or shape');
 h.run(`serviceGame=E.createGame({...E.previewFeatureSelection({}, {field:'serviceExpansionVersion',value:1}).options,seed:4,created:1});
  serviceOwner=E.publicState(serviceGame,0).me;serviceOwner.serviceDesk.applications.treasury='build';serviceOwner.serviceDesk.contracts=[{id:'service-northside',kind:'treasury',fee:50000,due:3,misses:0}];
  servicePlan={allocation:serviceOwner.allocation,depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',products:serviceOwner.products,servicePolicy:{...serviceOwner.serviceDesk.policy,treasury:true,staff:2}};
  served=E.operatingPreview(serviceOwner,servicePlan,serviceGame.economy,serviceGame,true);
  unserved=E.operatingPreview(serviceOwner,{...servicePlan,servicePolicy:{...servicePlan.servicePolicy,staff:0}},serviceGame.economy,serviceGame,true);`);
 assert.equal(h.run('served.commercial.treasuryRunRate'),50000);assert.equal(h.run('unserved.commercial.treasuryRunRate'),0);assert.equal(h.run('served.commercial.treasuryServed'),1);
});
