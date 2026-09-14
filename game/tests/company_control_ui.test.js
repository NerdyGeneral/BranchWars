'use strict';
process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{groupHarness}=require('./group_ui_harness');
function fresh(){const h=groupHarness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded').options,companyControlVersion:1,seed:5,created:1,mode:'hotseat'});seat=0;gh.active=false;p2pRole='';workspaceTab='group';game.players[0].financialGroup.parent=E.GroupAccounting.post(game.players[0].financialGroup.parent,'ui.fixture','external-shareholder',{cash:3000000,equity:3000000});newDraft(currentView());draft.decision='b';errors=[];toast=x=>errors.push(x);renderReady=()=>{};renderFinancialGroup(currentView());`);return h;}
const click=(h,id)=>h.elements.get('#'+id).listeners.click();
test('company-local diligence stages and cancels without charging; stale controls cannot write',()=>{
 const h=fresh(),before=h.run('JSON.stringify(game)');assert.match(h.elements.get('#financialGroupPanel').innerHTML,/Plan a controlling offer/);assert.match(h.elements.get('#financialGroupPanel').innerHTML,/Commission diligence/);
 click(h,'controlDiligence');assert.equal(h.run('draft.companyControlPolicy.diligence'),'company:0');assert.equal(h.run('JSON.stringify(game)'),before);
 click(h,'controlDiligence');assert.equal(h.run('draft.companyControlPolicy.diligence'),null);
 const stale=h.elements.get('#controlDiligence').listeners.click;h.run('draft.decision="a"');stale();assert.equal(h.run('draft.companyControlPolicy.diligence'),null);assert(h.run('errors.length')>0);
});
test('paid company review enables an explicit funded offer and removable draft without immediate ownership',()=>{
 const h=fresh();click(h,'controlDiligence');h.run(`plans=game.players.map((p,i)=>E.chooseBot(game,i));plans[0].companyControlPolicy=JSON.parse(JSON.stringify(draft.companyControlPolicy));plans[0].companyShareOrders=[];E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);newDraft(currentView());draft.decision='b';renderFinancialGroup(currentView());`);
 const before=h.run('JSON.stringify(game)');click(h,'controlOffer');assert.equal(h.run('draft.companyControlPolicy.offer.shares'),50001);assert.equal(h.run('game.players[0].companyShares.positions["company:0"].shares'),0);assert.equal(h.run('JSON.stringify(game)'),before);
 click(h,'controlRemove');assert.equal(h.run('draft.companyControlPolicy.offer'),null);assert.equal(h.run('JSON.stringify(game)'),before);
 const unchanged=h.run('JSON.stringify(draft)'),borrow=h.elements.get('#controlBorrow');borrow.value='';borrow.listeners.input();click(h,'controlOffer');assert.equal(h.run('JSON.stringify(draft)'),unchanged);assert.match(h.elements.get('#controlStatus').textContent,/Acquisition borrowing/);
});
test('control inputs survive company navigation and unreviewed offers cannot alter a draft',()=>{
 const h=fresh(),input=h.elements.get('#controlBorrow');input.value='';input.listeners.input();click(h,'group-company-1');click(h,'group-company-0');assert.equal(h.elements.get('#controlBorrow').value,'');
 const before=h.run('JSON.stringify(draft)');click(h,'controlOffer');assert.equal(h.run('JSON.stringify(draft)'),before);assert.match(h.elements.get('#controlStatus').textContent,/diligence/);
});
