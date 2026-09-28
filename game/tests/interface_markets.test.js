'use strict';
// Source engine and client with a small input/event DOM contract. Layout and
// browser focus acceptance are deliberately separate from these assertions.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test');
const {fresh}=require('./interface_markets_harness');
test('Expanded map reuses original city geography, roads and complete district art',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');
 h.run('mapView=currentView();mapMarkup=interfaceMarketsMap(mapView,draft.focus);');
 const markup=h.run('mapMarkup');
 assert.match(markup,/viewBox="0 0 1000 650"/);assert.match(markup,/class="city-water"/);assert.match(markup,/class="city-ground"/);
 assert.match(markup,/class="building-top"/);assert.match(markup,/class="park"/);assert.match(markup,/class="branch-pin /);
 assert(h.run('Object.entries(mapView.territories).every(([key,t])=>mapMarkup.includes(districtArt(key,t)))'),'Each original district is reused, including ownership and facility pins');
 assert.equal((markup.match(/class="city-road"/g)||[]).length,h.run('MAP_LINKS.filter(([a,b])=>mapView.territories[a]&&mapView.territories[b]).length'));
 for(const node of h.c.imMount.querySelectorAll('[data-im-market]').filter(x=>x.attributes.class.includes('im-map-point'))){
  h.c.mapKey=node.dataset.imMarket;const point=h.run('mapPosition(mapKey,mapView.territories[mapKey])');
  assert.equal(node.attributes.style,'--x:'+point[0]+'%;--y:'+Math.min(91,point[1]+7)+'%');
 }
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
test('Original-art map selects only the contextual inspector and rejects detached callbacks',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})'),target=h.run('Object.keys(currentView().territories).find(key=>key!==draft.focus)');
 const node=h.c.imMount.querySelectorAll('[data-im-market]').find(el=>el.dataset.imMarket===target&&el.attributes.class.includes('im-map-point')),oldClick=node.listeners.click;
 node.listeners.click();assert.equal(h.run('imRoute.context.market'),target);assert.equal(h.run('JSON.stringify({game,draft})'),before);
 assert.equal(h.c.imMount.querySelectorAll('[data-im-market]').find(el=>el.dataset.imMarket===target&&el.attributes.class.includes('im-map-point')).attributes['aria-pressed'],'true');
 h.run('connectionAttempt++;openInterfaceWorkspace("markets","overview",{market:draft.focus})');oldClick();
 assert.equal(h.run('imRoute.context.market'),h.run('draft.focus'));assert.equal(h.run('JSON.stringify({game,draft})'),before);
});

test('map visibly compares operating offices and keeps a single contextual build action',()=>{
 const h=fresh(),markup=h.c.imMount.innerHTML;
 for(const counts of h.run('Object.values(currentView().territories).map(t=>t.branches)'))assert(markup.includes('Offices: You '+counts[0]+' · Rival '+counts[1]));assert.equal((markup.match(/>Build an office<\/button>/g)||[]).length,1,'One build action: the market tab');
 assert.match(markup,/Your offices under construction/);assert.match(markup,/Operating offices · you \/ rival/);
 const directory=markup.split('</aside>')[0];assert.doesNotMatch(directory,/>Build an office</);
 h.run(`const countsBefore=JSON.stringify(currentView().territories.downtown.branches);game.players[0].projects.push({key:'branchAtm',target:'downtown',progress:0,total:1});openInterfaceWorkspace('markets','overview',{market:'downtown'});`);
 assert.equal(h.run('JSON.stringify(currentView().territories.downtown.branches)'),h.run('countsBefore'),'Unfinished construction is not an operating location');
 assert.match(h.c.imMount.innerHTML,/Your offices under construction<\/dt><dd>1/);
});
test('Original-art map preserves inspected locked markets and seat-relative public ownership',()=>{
 const h=fresh();h.run('seat=1;newDraft(currentView());mapView=currentView();mapView.territories.downtown.unlocked=false;mapMarkup=interfaceMarketsMap(mapView,"downtown");');
 const markup=h.run('mapMarkup'),share=h.run('mapView.territories.downtown.shares[0]');
 assert.match(markup,new RegExp('your influence '+share.toFixed(1)+' percent'));
 assert.match(markup,/im-map-point [^"]*locked[^\"]*"[^>]*data-im-market="downtown"/);
 assert.doesNotMatch(markup,/<button[^>]*data-im-market="downtown"[^>]* disabled/,'Locked geography remains inspectable');
});
test('market inspection and seven-model build catalogue are pure and exclude customer-book acquisition',()=>{
 const h=fresh(),world=h.run('JSON.stringify(game)'),plan=h.run('JSON.stringify(draft)');h.go('build');
 assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('JSON.stringify(draft)'),plan);
 const choices=h.c.imMount.querySelectorAll('[data-im-context]').filter(el=>el.dataset.imView==='build'&&JSON.parse(el.dataset.imContext).project);
 assert.equal(choices.length,7);assert(!choices.some(el=>['acquisition','branchService','branchAutomation','branchClose'].includes(JSON.parse(el.dataset.imContext).project)));
 assert.match(h.c.imMount.innerHTML,/creates no employees/);assert.match(h.c.imMount.innerHTML,/not a guaranteed opening date/);
});
test('local staff time quote stages only dirty selected paths against the latest draft',()=>{
 const h=fresh();h.go('staff');const field=h.c.imMount.querySelectorAll('[data-im-field]')[0],path=JSON.parse(field.dataset.imField),prior=h.run('JSON.stringify(game)');
 field.value='0.25';field.listeners.input();h.run(`draft.depositPolicy='growth';draft.facilityLifecyclePolicy.offices[office.id].maintenance='basic';`);h.click('save');
 assert.equal(h.run('draft.facilityLifecyclePolicy.offices[office.id].staffQuarters.service'),1);assert.equal(h.run('draft.facilityLifecyclePolicy.offices[office.id].maintenance'),'basic');assert.equal(h.run('draft.depositPolicy'),'growth');assert.equal(h.run('JSON.stringify(game)'),prior);
 assert.match(h.c.imMount.innerHTML,/whole people/);assert.equal(path.at(-1),'service');
});
test('working inputs survive view changes and invalid inputs never become zero assignments',()=>{
 const h=fresh();h.go('staff');let field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='';field.listeners.input();
 const before=h.run('JSON.stringify(draft)');h.go('maintenance');h.go('staff');field=h.c.imMount.querySelectorAll('[data-im-field]')[0];assert.equal(field.value,'');assert.match(h.c.imMount.innerHTML,/non-negative staff time/);
 h.click('save');assert.equal(h.run('JSON.stringify(draft)'),before);h.click('discard');assert.notEqual(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'');
});
test('guest snapshot retains private editor but rejects stale callbacks; owner/cycle/session changes reset it',()=>{
 const h=fresh();h.run(`view=E.publicState(game,0);game=null;p2pRole='guest';newDraft(currentView());office=currentView().me.facilityNetwork.offices[0];`);h.go('staff');
 const field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='0.25';field.listeners.input();const stale=h.c.imMount.querySelector('[data-im-action="save"]').listeners.click,plan=h.run('JSON.stringify(draft)');
 h.run('view=JSON.parse(JSON.stringify(view));view.rival.submitted=true;renderExpandedInterface()');assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0.25');stale();assert.equal(h.run('JSON.stringify(draft)'),plan);
 h.run('connectionAttempt++;renderExpandedInterface()');assert.notEqual(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0.25');
});
test('all service-space designs stay inspectable and selected fit-out quotes do not auto-stage',()=>{
 const h=fresh(),plan=h.run('JSON.stringify(draft)'),world=h.run('JSON.stringify(game)');h.go('services');
 for(const kind of ['visiting','wealth','agency','advisoryWing','additionalPremises']){h.go('room',{kind});assert.doesNotMatch(h.c.imMount.innerHTML,/This selection is unavailable/);assert.match(h.c.imMount.innerHTML,/Fit-out/);}
 h.go('room',{kind:'visiting'});assert.match(h.c.imMount.innerHTML,/25% of a month/);assert.equal(h.run('JSON.stringify(draft)'),plan);h.click('save');assert.equal(h.run('draft.sharedPremisesPolicy.build.kind'),'visiting');assert.equal(h.run('JSON.stringify(game)'),world);
});
test('replacement suite and premises orders identify their existing destination before Add',()=>{
 const h=fresh();h.run(`second=E.FacilityNetwork.open(game.players[0],office.market,'digital',game.cycle);game.players[0].facilityLifecycle=E.FacilityLifecycle.register(game.players[0],second.id,game.cycle).facilityLifecycle;newDraft(currentView());draft.decision='b';draft.facilityExtensionPolicy={start:second.id,cancel:null};`);h.go('suite');
 assert.match(h.c.imMount.innerHTML,/Replace suite order/);assert.match(h.c.imMount.innerHTML,/existing suite construction/);
 h.run(`draft.facilityExtensionPolicy={start:null,cancel:null};draft.sharedPremisesPolicy.build={office:second.id,kind:'agency'};`);h.go('room',{kind:'visiting'});assert.match(h.c.imMount.innerHTML,/Replace premises order/);assert.match(h.c.imMount.innerHTML,/Insurance agency office/);
});
test('office forms are independent, maintain current unrelated allocations and lock after Ready',()=>{
 const h=fresh();h.run(`second=E.FacilityNetwork.open(game.players[0],office.market,'digital',game.cycle);game.players[0].facilityLifecycle=E.FacilityLifecycle.register(game.players[0],second.id,game.cycle).facilityLifecycle;newDraft(currentView());draft.decision='b';`);h.go('staff');let field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='0.25';field.listeners.input();
 h.run(`openInterfaceWorkspace('markets','staff',{market:second.market,office:second.id});`);assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0');h.go('staff');assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0.25');
 h.run('E.submit(game,0,draft);renderExpandedInterface()');const prior=h.run('JSON.stringify(draft)');assert(h.c.imMount.querySelectorAll('[data-im-field]').every(x=>x.disabled));h.click('save');assert.equal(h.run('JSON.stringify(draft)'),prior);
});
test('settled professional room supports finite staffing, live quote, removal preview and standing reset',()=>{
 const h=fresh();h.run(`p=game.players[0];const amount=350000;p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.capitalReturn',{cash:-amount,equity:-amount});p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;p.stats.earnings=p.accounting.retainedEarnings;p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.capitalReturn',p.id,{cash:amount,investments:-amount});p.financialGroup.investmentBasis.bank-=amount;
 newDraft(currentView());draft.decision='b';Object.assign(draft.investmentPolicy.institution,{launch:true,capital:250000,roles:{adviser:1,broker:0,principal:0,operations:1}});draft.sharedPremisesPolicy.build={office:p.facilityNetwork.offices[0].id,kind:'visiting'};
 for(let n=0;n<2;n++){E.submit(game,0,draft);E.submit(game,1,E.chooseBot(game,1));E.validatePilot(game);newDraft(currentView());draft.decision='b';}office=currentView().me.facilityNetwork.offices[0];`);
 h.go('room',{room:1});assert.match(h.c.imMount.innerHTML,/Assign professional staff time/);
 let input=h.c.imMount.querySelector('[data-im-room-role="adviser"]');input.value='0.5';input.listeners.input();h.click('save');assert.equal(h.run('draft.sharedPremisesPolicy.allocations.length'),0,'Physical room limit is authoritative');
 input.value='0.25';input.listeners.input();const before=h.run('JSON.stringify(game)');h.click('save');assert.equal(h.run('draft.sharedPremisesPolicy.allocations[0].quarters'),1);assert.equal(h.run('JSON.stringify(game)'),before);
 h.click('prepare-remove');assert.equal(h.run('draft.sharedPremisesPolicy.remove'),null);assert.match(h.c.imMount.innerHTML,/No refund or sale proceeds/);h.click('save');assert.equal(h.run('draft.sharedPremisesPolicy.remove'),1);assert.equal(h.run('draft.sharedPremisesPolicy.allocations.length'),0);
 h.go('premises');h.click('prepare-premises-reset');assert.equal(h.run('draft.sharedPremisesPolicy.remove'),1);h.click('save');assert.equal(h.run('draft.sharedPremisesPolicy.remove'),null);
});
test('all focused office actions render through real engine quotations without touching simulation state',()=>{
 const h=fresh(),before=h.run('JSON.stringify(game)');
 for(const view of ['office','staff','maintenance','renovate','convert','suite','services','compare','improve','premises']){
  h.go(view);assert.doesNotMatch(h.c.imMount.innerHTML,/This selection is unavailable/,view);assert.equal(h.run('JSON.stringify(game)'),before,view+' mutated simulation');
 }
});
