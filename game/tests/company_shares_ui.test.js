'use strict';
process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{groupHarness}=require('./group_ui_harness');
function fresh(){const h=groupHarness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded').options,seed:5,created:1,mode:'hotseat'});seat=0;gh.active=false;p2pRole='';workspaceTab='group';game.players[0].financialGroup.parent=E.GroupAccounting.post(game.players[0].financialGroup.parent,'ui.fixture','external-shareholder',{cash:200000,equity:200000});newDraft(currentView());draft.decision='b';errors=[];toast=x=>errors.push(x);renderReady=()=>{};renderFinancialGroup(currentView());`);return h;}
const click=(h,id)=>h.elements.get('#'+id).listeners.click();
test('company-local ticket stages, preserves other companies and cancels without touching accounts',()=>{
 const h=fresh(),original=h.run('JSON.stringify(game)');
 assert.match(h.elements.get('#financialGroupPanel').innerHTML,/Company share ownership/);assert.match(h.elements.get('#financialGroupPanel').innerHTML,/not cash/);
 click(h,'companyOrderBuy');assert.equal(h.run('draft.companyShareOrders.length'),1);assert.equal(h.run('draft.companyShareOrders[0].issuer'),'company:0');
 click(h,'group-company-1');click(h,'companyOrderBuy');assert.equal(h.run('draft.companyShareOrders.length'),2);
 click(h,'companyOrderRemove');assert.equal(h.run('draft.companyShareOrders.length'),1);assert.equal(h.run('draft.companyShareOrders[0].issuer'),'company:0');assert.equal(h.run('JSON.stringify(game)'),original);
});
test('bad tickets and stale controls cannot alter drafts; edits survive company navigation',()=>{
 const h=fresh();const input=h.elements.get('#companyOrderPrice');input.value='';input.listeners.input();
 click(h,'group-company-1');click(h,'group-company-0');assert.equal(h.elements.get('#companyOrderPrice').value,'');
 const before=h.run('JSON.stringify(draft)');click(h,'companyOrderBuy');assert.equal(h.run('JSON.stringify(draft)'),before);assert.match(h.elements.get('#companyOrderStatus').textContent,/Limit price/);
 const stale=h.elements.get('#companyOrderBuy').listeners.click;h.run('draft.decision="a"');stale();assert.equal(h.run('draft.companyShareOrders.length'),0);assert(h.run('errors.length')>0);
});
