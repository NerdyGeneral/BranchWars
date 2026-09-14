'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{groupHarness}=require('./group_ui_harness');

test('term notes stay in the selected account, explain lockup and stage or cancel without changing money',()=>{
 const h=groupHarness();h.run(`const noteOptions=E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options;for(const f of ['Services','Assets','Cash','Sweep','Choice','Income','Suitability','Trading','Notes'])noteOptions['investment'+f+'Version']=1;game=E.createGame({...noteOptions,mode:'hotseat',seed:1,created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());renderReady=()=>{};
  fixtureView=currentView();source=fixtureView.me.investmentSnapshot.funding[0];
  customer={id:source.clientId,market:source.market,service:'advice',owner:fixtureView.me.id,custodian:'atlas',cash:2000,units:0,acquired:0,missed:0};
  // Presentation-only account fixture, never imported or settled as real funds.
  fixtureView.me.investmentSnapshot.clients=[customer];fixtureView.me.investmentSnapshot.cashPositions=[{clientId:customer.id,deposit:0,value:0,shares:0,mode:'hold',buffer:1000,lastResult:null}];fixtureView.me.investmentSnapshot.income.accounts=[{clientId:customer.id,totalPaid:0,lastPaid:0,lastDue:0,fundIncome:0}];
  currentView=()=>fixtureView;renderFinancialGroup(currentView());document.querySelector('#investment-desk-clients').listeners.click();before=JSON.stringify({game,fixtureView});document.querySelector('#investment-note-short').listeners.click();document.querySelector('#investmentPreview').listeners.click();`);
 assert.equal(h.run('draft.investmentPolicy.notes.length'),0);assert.equal(h.elements.get('#investmentStage').disabled,false);assert.match(h.elements.get('#investmentQuote').textContent,/No early redemption/);
 h.run(`document.querySelector('#investmentStage').listeners.click();markup=investmentNotePanel(currentView(),customer,investmentForm(currentView()),'');`);
 assert.equal(h.run('draft.investmentPolicy.notes[0].product'),'short');assert.match(h.run('markup'),/Staged for this month/);assert.match(h.run('markup'),/not insured bank deposits/);assert.doesNotMatch(h.run('markup'),/<select/);
 h.run(`document.querySelector('#investment-note-amount').value='invalid';document.querySelector('#investment-note-remove').listeners.click();`);assert.equal(h.run('investmentForm(currentView()).notes.length'),0);assert.equal(h.run('draft.investmentPolicy.notes.length'),1);
 h.run(`document.querySelector('#investmentPreview').listeners.click();document.querySelector('#investmentStage').listeners.click();`);assert.equal(h.run('draft.investmentPolicy.notes.length'),0);assert.equal(h.run('JSON.stringify({game,fixtureView})'),h.run('before'));
 assert.equal(h.run('investmentNotePanel({...fixtureView,investmentNotesVersion:undefined},customer,investmentForm(currentView()),"")'),'');
});

test('income panel separates paid customer cash, issuer shortfalls and fund value without changing books',()=>{
 const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,investmentChoiceVersion:1,investmentIncomeVersion:1,seed:1,created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());v=currentView();
  client=game.investmentEconomy.world.clients[0];before=JSON.stringify({game,draft});
  // Presentation-only shortfall; never submitted or imported as authoritative data.
  v.me.investmentSnapshot.income={month:6,annualBp:625,accounts:[{clientId:client.id,totalPaid:10,lastPaid:3,lastDue:5,fundIncome:6}]};markup=investmentIncomePanel(v,client);`);
 assert.match(h.run('markup'),/\$3 paid to this account from \$5 calculated/);assert.match(h.run('markup'),/Issuer cash shortage: \$2/);assert.match(h.run('markup'),/6.25%/);assert.match(h.run('markup'),/not bank profit/);assert.match(h.run('markup'),/New funding first earns next month/);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));h.run('delete v.investmentIncomeVersion');assert.equal(h.run('investmentIncomePanel(v,client)'),'');
});

test('customer preference inspector explains the working fee without mutating or revealing rival offers',()=>{
 const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,investmentChoiceVersion:1,mode:'hotseat',seed:1,created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());
  v=currentView();client={...game.investmentEconomy.world.clients[0],owner:v.me.id,acquired:0};form=E.defaultInvestmentPlan(v.me);before=JSON.stringify({game,draft});current=investmentCustomerChoicePanel(v,client,form);form.institution.feeBp=120;working=investmentCustomerChoicePanel(v,client,form);`);
 assert.match(h.run('current'),/customer<\/h4>/);assert.match(h.run('working'),/Next-month working offer/);assert.match(h.run('working'),/does not reveal rival offers or guarantee retention/);
 assert.notEqual(h.run('working'),h.run('current'));assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
 h.run('delete v.investmentChoiceVersion');assert.equal(h.run('investmentCustomerChoicePanel(v,client,form)'),'');
});
test('standing cash editor stages reviewed account choices without changing books or adding dropdowns',()=>{
 const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,mode:'hotseat',seed:1,created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());renderReady=()=>{};
  fixtureView=currentView();const sources=fixtureView.me.investmentSnapshot.funding.slice(0,2);
  // Presentation fixture only; the actual funded month path is tested separately.
  fixtureView.me.investmentSnapshot.clients=sources.map(a=>({id:a.clientId,market:a.market,service:'advice',owner:fixtureView.me.id,custodian:'atlas',cash:2000,units:0}));
  fixtureView.me.investmentSnapshot.cashPositions=sources.map(a=>({clientId:a.clientId,mode:'hold',buffer:1000,affiliate:null,bankId:null,deposit:0,shares:0,value:0}));
  currentView=()=>seat===0?fixtureView:E.publicState(game,seat);renderFinancialGroup(currentView());before=JSON.stringify(game);`);
 const markup=h.run('investmentPanel(currentView())');assert.doesNotMatch(markup,/<select/);assert.equal((markup.match(/id="investment-cash-buffer"/g)||[]).length,1);assert.equal((markup.match(/id="investment-transfer-\d+"/g)||[]).length,1,'Only the selected account has funding controls');
 h.run(`document.querySelector('#investment-desk-clients').listeners.click();document.querySelector('#investment-transfer-0').value='300';document.querySelector('#investment-cash-mode-external').listeners.click();document.querySelector('#investment-cash-buffer').value='250';document.querySelector('#investment-cash-buffer').listeners.input();document.querySelector('#investment-cash-client-1').listeners.click();document.querySelector('#investment-transfer-1').value='200';document.querySelector('#investment-cash-mode-moneyMarket').listeners.click();selectedAccount=investmentWorkspace.cashClientId;`);
 assert.equal(h.run('investmentWorkspace.form.cashOrders[0].buffer'),250);assert.equal(h.run('draft.investmentPolicy.cashOrders.length'),0);
 h.run(`document.querySelector('#investmentPreview').listeners.click();`);assert.equal(h.run('document.querySelector("#investmentStage").disabled'),false);
 assert.match(h.elements.get('#investmentQuote').textContent,/Standing cash changes: 2/);
 h.run(`document.querySelector('#investmentStage').listeners.click();`);assert.equal(h.run('draft.investmentPolicy.cashOrders.length'),2);assert.equal(h.run('JSON.stringify(game)'),h.run('before'));
 assert.equal(h.run('draft.investmentPolicy.funding.reduce((n,f)=>n+f.amount,0)'),500,'Switching inspected accounts preserves other funding orders');
 assert.equal(h.run('investmentWorkspace.desk'),'clients');assert.equal(h.run('investmentWorkspace.cashClientId'),h.run('selectedAccount'));
 assert.match(h.run('investmentPanel(currentView())'),/Change staged for month-end; not executed/);
 h.run(`document.querySelector('#investment-cash-undo').listeners.click()`);
 assert.match(h.run('investmentPanel(currentView())'),/Working cancellation/);
 h.run(`document.querySelector('#investmentDiscard').listeners.click()`);
 h.run(`document.querySelector('#investment-cash-mode-affiliated').listeners.click();document.querySelector('#investmentDiscard').listeners.click();`);assert.equal(h.run('investmentWorkspace.form.cashOrders[0].mode'),'external');
 assert.equal(h.run('investmentWorkspace.desk'),'clients');assert.equal(h.run('investmentWorkspace.cashClientId'),h.run('selectedAccount'));assert.equal(h.run('investmentWorkspace.form.cashOrders[1].mode'),'moneyMarket');
 h.run(`staleCash=document.querySelector('#investment-cash-mode-affiliated').listeners.click;seat=1;staleCash();seat=0;`);assert.equal(h.run('investmentWorkspace.form.cashOrders[0].mode'),'external');
});
function fresh(enabled=true){
 const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,${enabled?'investmentServicesVersion:1,':''}mode:'hotseat',seed:'investment-ui',created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());renderReady=()=>{};errors=[];toast=x=>errors.push(x);renderFinancialGroup(currentView());`);return h;
}

test('delivery inspector explains paid implementation, transfer backlog and provider costs without changing a plan',()=>{
 const h=fresh();h.run('v=currentView();before=JSON.stringify({game,draft});');
 assert.match(h.run('investmentPanel(v)'),/0.12% annual serviced assets/);
 assert.match(h.run('investmentPanel(v)'),/\$1,500\/month/);
 assert.match(h.run('investmentPanel(v)'),/0.20% annual serviced assets/);
 assert.match(h.run('investmentPanel(v)'),/No account transfer backlog/);
 // Presentation-only migration, never imported or submitted as a campaign.
 h.run(`v.me.investmentBusiness.migration={to:{custody:'external',provider:'harbor'},work:1,required:3};v.me.investmentSnapshot.clients=[{custodian:'atlas'},{custodian:'harbor'}];`);
 const markup=h.run('investmentDeliveryStatus(v)');
 assert.match(markup,/Current delivery: Atlas/);assert.match(markup,/toward Harbor/);assert.match(markup,/1 \/ 3 work months/);assert.match(markup,/1 account\(s\) will need transfer work/);assert.match(markup,/cash buffer can avoid selling securities/);
 h.run(`v.me.investmentBusiness.migration=null;v.me.investmentBusiness.policy.provider='harbor';`);
 assert.match(h.run('investmentDeliveryStatus(v)'),/1 existing account\(s\) still await transfer/);
 h.run(`v.me.investmentBusiness.report={cycle:5,permitted:{advice:true,brokerage:false,custody:false}}`);
 assert.match(h.run('investmentDeliveryStatus(v)'),/Last settled readiness · month 5/);
 assert.match(h.run('investmentDeliveryStatus(v)'),/Owned carrying: unavailable/);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
});

test('owned carrying review exposes protected capital without treating client assets as funding',()=>{
 const h=fresh();h.run(`game.players[0].financialGroup.parent=E.GroupAccounting.post(game.players[0].financialGroup.parent,'fixture.ownerContribution','shareholder',{cash:1000000,equity:1000000});renderFinancialGroup(currentView());before=JSON.stringify(game);`);
 h.run(`document.querySelector('#investment-launch').listeners.click();document.querySelector('#investment-brokerage').listeners.click();document.querySelector('#investment-custody').listeners.click();document.querySelector('#investment-more-adviser').listeners.click();document.querySelector('#investment-more-broker').listeners.click();document.querySelector('#investment-more-principal').listeners.click();document.querySelector('#investment-more-operations').listeners.click();document.querySelector('#investment-capital').value='900000';document.querySelector('#investmentPreview').listeners.click();`);
 assert.match(h.elements.get('#investmentQuote').textContent,/Protected subsidiary capital \$500K/);
 assert.match(h.elements.get('#investmentQuote').textContent,/Customer assets cannot satisfy either requirement/);
 assert.equal(h.run('document.querySelector("#investmentStage").disabled'),false);
 assert.equal(h.run('JSON.stringify(game)'),h.run('before'));
 h.run(`document.querySelector('#investmentDiscard').listeners.click()`);assert.equal(h.run('draft.investmentPolicy.institution.custody'),'external');
});
test('investment controls follow the explicit campaign marker, not the presence of a parent',()=>{
 const old=fresh(false);assert.doesNotMatch(old.elements.get('#financialGroupPanel').innerHTML,/id="groupTab-investments"/);
 const h=fresh();assert.match(h.elements.get('#financialGroupPanel').innerHTML,/id="groupTab-investments"/);assert(h.run('draft.investmentPolicy'));
 assert.doesNotMatch(h.run('investmentPanel(currentView())'),/<select/);
 assert.match(h.run('investmentPanel(currentView())'),/Client assets cannot pay salaries/);
});
test('formation review shows funding, preserves books and stages one complete instruction',()=>{
 const h=fresh();h.run(`game.players[0].financialGroup.parent=E.GroupAccounting.post(game.players[0].financialGroup.parent,'fixture.ownerContribution','shareholder',{cash:1000000,equity:1000000});renderFinancialGroup(currentView());before=JSON.stringify(game);originalDraft=JSON.stringify(draft);`);
 h.run(`document.querySelector('#investment-launch').listeners.click();document.querySelector('#investment-more-adviser').listeners.click();document.querySelector('#investment-more-operations').listeners.click();document.querySelector('#investment-capital').value='700000';document.querySelector('#investment-capital').listeners.input();document.querySelector('#investmentPreview').listeners.click();`);
 assert.equal(h.run('document.querySelector("#investmentStage").disabled'),false);
 assert.match(h.elements.get('#investmentQuote').textContent,/operating bills/);
 assert.match(h.elements.get('#investmentQuote').textContent,/Protected subsidiary capital \$120K/);
 assert.match(h.elements.get('#investmentQuote').textContent,/operating cash reserve/);
 assert.match(h.elements.get('#investmentQuote').textContent,/not extra fees/);
 assert.equal(h.run('JSON.stringify(game)'),h.run('before'));assert.equal(h.run('JSON.stringify(draft)'),h.run('originalDraft'));
 h.run(`document.querySelector('#investmentStage').listeners.click()`);
 assert.equal(h.run('draft.investmentPolicy.institution.capital'),700000);assert.equal(h.run('draft.investmentPolicy.institution.roles.adviser'),1);
 assert.equal(h.run('JSON.stringify(game)'),h.run('before'));assert.equal(h.run('monthlyChangeRows(currentView()).filter(r=>r.path[0]==="investmentPolicy").length'),1);
 assert.match(h.elements.get('#investmentQuote').textContent,/staged, not executed/);
});
test('unfunded launch, changed review, discard and stale seat callbacks do not stage orders',()=>{
 const h=fresh();h.run('before=JSON.stringify({game,draft});');
 h.run(`document.querySelector('#investment-launch').listeners.click();document.querySelector('#investmentPreview').listeners.click();`);
 assert.equal(h.run('document.querySelector("#investmentStage").disabled'),true);
 assert.match(h.elements.get('#investmentQuote').textContent,/funded operating/);
 h.run(`document.querySelector('#investmentDiscard').listeners.click();document.querySelector('#investmentPreview').listeners.click();stale=document.querySelector('#investmentStage').listeners.click;document.querySelector('#investment-capital').value='1';document.querySelector('#investment-capital').listeners.input();`);
 assert.equal(h.run('document.querySelector("#investmentStage").disabled'),true);h.run('stale()');
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
 h.run(`document.querySelector('#investmentDiscard').listeners.click();document.querySelector('#investmentPreview').listeners.click();stale=document.querySelector('#investmentStage').listeners.click;seat=1;stale();seat=0;`);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
});
test('owner snapshots reject malformed funding, foreign information and invented current performance',()=>{
 const h=fresh();h.run('valid=E.publicState(game,0);E.validateFinancialGroupView(valid)');
 for(const mutation of [
  `bad.me.investmentSnapshot.funding.push({...bad.me.investmentSnapshot.funding[0]})`,
  `bad.me.investmentSnapshot.funding[0].bankId=bad.rival.id`,
  `bad.me.investmentSnapshot.funding[0].limit=-1`,
  `bad.me.investmentSnapshot.price=NaN`,
  `bad.me.investmentSnapshot.performance={aum:1000000}`,
  `bad.rival.investmentReport={cycle:0,transfers:[]}`,
  `bad.me.investmentSnapshot.clients=[{owner:bad.me.id,cash:1000000}]`
 ]){h.run('bad=JSON.parse(JSON.stringify(valid));'+mutation);assert.throws(()=>h.run('E.validateFinancialGroupView(bad)'));}
});

test('backed securities offers live on their own desk and require reviewed staging',()=>{
 const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,mode:'hotseat',seed:1,created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());renderReady=()=>{};renderFinancialGroup(currentView());before=JSON.stringify(game);`);
 assert.match(h.run('investmentPanel(currentView())'),/Securities market/);
 h.run(`document.querySelector('#investment-desk-market').listeners.click();document.querySelector('#investment-inventory').value='200000';document.querySelector('#investment-inventory').listeners.input();document.querySelector('#investmentPreview').listeners.click();`);
 assert.equal(h.run('document.querySelector("#investmentStage").disabled'),false);
 assert.equal(h.run('draft.investmentPolicy.inventorySale'),0);
 h.run(`document.querySelector('#investmentStage').listeners.click()`);assert.equal(h.run('draft.investmentPolicy.inventorySale'),200000);
 assert.equal(h.run('JSON.stringify(game)'),h.run('before'));
 h.run(`renderFinancialGroup(currentView());document.querySelector('#investment-inventory').value='999999999999';document.querySelector('#investmentPreview').listeners.click();`);
 assert.equal(h.run('document.querySelector("#investmentStage").disabled'),true);assert.match(h.elements.get('#investmentQuote').textContent,/securities/);
});

test('cash withdrawal is a contextual client choice and stages no immediate bank movement',()=>{
 const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,mode:'hotseat',seed:1,created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());renderReady=()=>{};
  fixtureView=currentView();source=fixtureView.me.investmentSnapshot.funding[0];
  // Presentation-only account: the funded and qualified source/return path is
  // tested using normal monthly resolution in investment_cash.test.js.
  fixtureView.me.investmentSnapshot.clients=[{id:source.clientId,market:source.market,service:'advice',owner:fixtureView.me.id,custodian:'atlas',cash:500,units:0}];source.funded=500;
  currentView=()=>fixtureView;renderFinancialGroup(currentView());before=JSON.stringify(game);`);
 assert.match(h.run('investmentPanel(currentView())'),/Return cash to bank/);assert.doesNotMatch(h.run('investmentPanel(currentView())'),/<select/);
 h.run(`document.querySelector('#investment-destination-return-0').listeners.click();document.querySelector('#investment-transfer-0').value='300';document.querySelector('#investmentPreview').listeners.click();`);
 assert.equal(h.run('document.querySelector("#investmentStage").disabled'),false);assert.equal(h.run('draft.investmentPolicy.funding.length'),0);
 h.run(`document.querySelector('#investmentStage').listeners.click()`);assert.equal(h.run('draft.investmentPolicy.funding[0].destination'),'return');assert.equal(h.run('draft.investmentPolicy.funding[0].amount'),300);assert.equal(h.run('JSON.stringify(game)'),h.run('before'));
});
test('customer mandate explains product tradeoffs and prevents unsuitable reviewed staging without changing holdings',()=>{
 const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,investmentChoiceVersion:1,investmentIncomeVersion:1,investmentSuitabilityVersion:1,mode:'hotseat',seed:1,created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());
  fixtureView=currentView();source=fixtureView.me.investmentSnapshot.funding[0];
  customer={id:source.clientId,market:source.market,service:'advice',owner:fixtureView.me.id,custodian:'atlas',cash:0,units:0,acquired:0,missed:0};
  fixtureView.me.investmentSnapshot.clients=[customer];fixtureView.me.investmentSnapshot.cashPositions=[{clientId:customer.id,deposit:0,value:0,shares:0,mode:'hold',buffer:0,lastResult:null}];
  before=JSON.stringify({game,fixtureView});markup=investmentSuitabilityPanel(fixtureView,customer);
  order={...draft,investmentPolicy:E.defaultInvestmentPlan(fixtureView.me)};order.investmentPolicy.funding=[{clientId:customer.id,amount:1000,destination:'securities'}];`);
 assert.match(h.run('markup'),/Customer investment mandate/);assert.match(h.run('markup'),/Compare cash and investment choices/);assert.match(h.run('markup'),/full value counts/);assert.doesNotMatch(h.run('markup'),/<select/);
 assert.throws(()=>h.run('E.investmentPlanReview(fixtureView.me,order,fixtureView)'),/liquid reserves/);
 assert.equal(h.run('JSON.stringify({game,fixtureView})'),h.run('before'));
 h.run('order.investmentPolicy.funding[0].destination="cash"');assert.doesNotThrow(()=>h.run('E.investmentPlanReview(fixtureView.me,order,fixtureView)'));
 assert.equal(h.run('investmentSuitabilityPanel({...fixtureView,investmentSuitabilityVersion:undefined},customer)'), '');
});
test('portfolio editor keeps orders owner-local and stages reviewed cash-funded trades without touching holdings',()=>{
 const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,investmentChoiceVersion:1,investmentIncomeVersion:1,investmentSuitabilityVersion:1,investmentTradingVersion:1,mode:'hotseat',seed:1,created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());renderReady=()=>{};
  fixtureView=currentView();source=fixtureView.me.investmentSnapshot.funding[0];
  customer={id:source.clientId,market:source.market,service:'advice',owner:fixtureView.me.id,custodian:'atlas',cash:2000,units:1,acquired:0,missed:0};
  fixtureView.me.investmentSnapshot.clients=[customer];fixtureView.me.investmentSnapshot.cashPositions=[{clientId:customer.id,deposit:0,value:0,shares:0,mode:'hold',buffer:1000,lastResult:null}];
  fixtureView.me.investmentSnapshot.income.accounts=[{clientId:customer.id,totalPaid:0,lastPaid:0,lastDue:0,fundIncome:0}];
  currentView=()=>fixtureView;renderFinancialGroup(currentView());document.querySelector('#investment-desk-clients').listeners.click();before=JSON.stringify({game,fixtureView});
  document.querySelector('#investment-trade-buy').listeners.click();document.querySelector('#investmentPreview').listeners.click();`);
 assert.equal(h.run('draft.investmentPolicy.trades.length'),0);assert.equal(h.elements.get('#investmentStage').disabled,false);assert.match(h.elements.get('#investmentQuote').textContent,/execution fee/);
 h.run(`document.querySelector('#investmentStage').listeners.click()`);assert.equal(h.run('draft.investmentPolicy.trades[0].side'),'buy');assert.equal(h.run('draft.investmentPolicy.trades[0].amount'),100);
 assert.match(h.run('investmentTradePanel(currentView(),customer,investmentForm(currentView()),"")'),/Staged buy order/);
 assert.equal(h.run('JSON.stringify({game,fixtureView})'),h.run('before'));assert.doesNotMatch(h.run('investmentTradePanel(currentView(),customer,investmentForm(currentView()),"")'),/<select/);
 h.run(`document.querySelector('#investment-trade-sell').listeners.click();document.querySelector('#investmentDiscard').listeners.click();`);assert.equal(h.run('investmentForm(currentView()).trades[0].side'),'buy','Discard returns to staged instructions');
 h.run(`document.querySelector('#investment-trade-amount').value='invalid';document.querySelector('#investment-trade-remove').listeners.click();`);
 assert.equal(h.run('investmentForm(currentView()).trades.length'),0,'An invalid amount cannot prevent removing that working order');
 assert.equal(h.run('draft.investmentPolicy.trades.length'),1,'Working removal is not silently applied to the staged plan');
 assert.match(h.run('investmentTradePanel(currentView(),customer,investmentForm(currentView()),"")'),/Working removal/);
 h.run(`document.querySelector('#investmentPreview').listeners.click();document.querySelector('#investmentStage').listeners.click();`);
 assert.equal(h.run('draft.investmentPolicy.trades.length'),0);assert.equal(h.run('JSON.stringify({game,fixtureView})'),h.run('before'));
 assert.equal(h.run('investmentTradePanel({...fixtureView,investmentTradingVersion:undefined},customer,investmentForm(currentView()),"")'),'');
});
