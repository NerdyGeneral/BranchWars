'use strict';
// Focused source/portable controller tests with the real engine. This minimal
// DOM checks control actions and authority; it is not visual/browser acceptance.
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');
let checks=0;
function test(name,fn){try{fn();checks++;}catch(e){throw Error(name+': '+e.stack);}}
function fresh(){
 const h=harness();
 h.run(`
 const originalFind=document.querySelector;
 const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 function decorate(selector){const el=originalFind(selector);if(el.decorated)return el;el.decorated=true;
  el.addEventListener=function(event,fn){this.listeners[event]=fn;};el.prepend=()=>{};
  el.querySelector=decorate;el.querySelectorAll=function(selector){
   const attr=selector.match(/^\\[([^=\\]]+)/)?.[1];if(!attr)return [];
   const html=this.innerHTML;const out=[];
   for(const match of html.matchAll(/<(input|button)\\b[^>]*>/g)){const tag=match[0];if(!tag.includes(attr+'='))continue;
    const attrs=Object.fromEntries([...tag.matchAll(/([\\w-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])]));
    const node=decorate(attrs.id?'#'+attrs.id:'#generated-'+attr+'-'+attrs[attr]+'-'+(attrs['data-ips-value']||''));
    node.dataset={};for(const [k,val] of Object.entries(attrs))if(k.startsWith('data-'))node.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=val;
    node.value=attrs.value||'';node.disabled=/\\sdisabled(?:\\s|>)/.test(tag);out.push(node);
   }return out;
  };return el;
 }
 document.querySelector=decorate;document.createElement=()=>decorate('#created-button');
 const opts=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:10}).options;
 game=E.createGame({...opts,mode:'hotseat',seed:'interface-people-strategy',created:1});seat=0;p2pRole='';gh.active=false;newDraft(currentView());draft.decision='b';
 interfaceSetLocation=labels=>lastLocation=labels;renderReady=()=>{};uiErrors=[];toast=x=>uiErrors.push(x);
 function showPS(workspace,view,context={}){renderInterfacePeopleStrategy(currentView(),{workspace,view,context},$('#ps'));}
 `);
 return h;
}
const bytes=h=>h.run('JSON.stringify({game,draft})');
const html=h=>h.elements.get('.ips-inspector').innerHTML;
function show(h,workspace,view,context={}){h.run(`showPS(${JSON.stringify(workspace)},${JSON.stringify(view)},${JSON.stringify(context)})`);}
function input(h,path,value){const el=h.elements.get('#ips-field-'+path.replace(/[^a-z0-9]/gi,'-'));assert(el,'Input '+path+' exists');el.value=String(value);el.listeners.input();}
function choose(h,path,value){const button=[...h.elements.values()].find(el=>el.dataset?.ipsChoice===path&&el.dataset.ipsValue===String(value));assert(button,'Choice '+path+'='+value+' exists');button.listeners.click();}
const add=h=>h.elements.get('#ipsAdd').listeners.click();

test('every bank and strategy view is reachable without mutating game or plan',()=>{
 const h=fresh(),before=bytes(h);
 for(const [workspace,views]of Object.entries({people:['staff','recruitment','training','coverage','leadership'],strategy:['research','models','campaigns','initiatives','mandates']}))for(const view of views){show(h,workspace,view);assert(!html(h).includes('<h2>Unavailable</h2>'),workspace+'/'+view+': '+html(h));assert.equal(bytes(h),before);assert(!html(h).includes('<details'),'routine editor must be flat');}
 for(const context of [{functionId:'suggest'},{functionId:'delivery'}]){show(h,'people','coverage',context);assert(!html(h).includes('<h2>Unavailable</h2>'),html(h));assert.equal(bytes(h),before);}
});
test('recruitment edits quote locally then stage only the selected shared instruction',()=>{
 const h=fresh();show(h,'people','recruitment');const before=bytes(h),world=h.run('JSON.stringify(game)');input(h,'generalist',1);assert.equal(bytes(h),before);assert.equal(h.run('interfacePeopleStrategyState.forms["bank-recruitment"].review.next.hires'),1);assert.equal(h.elements.get('#ipsAdd').disabled,false);add(h);assert.equal(h.run('draft.hires'),1);assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('draft.decision'),'b');
});
test('raw invalid training fields survive navigation and reject staging',()=>{
 const h=fresh();show(h,'people','training');input(h,'reserve','');const before=bytes(h);assert.equal(h.elements.get('#ipsAdd').disabled,true);show(h,'strategy','research');show(h,'people','training',{role:'business'});assert.equal(h.run('interfacePeopleStrategyState.forms["bank-training"].value.reserve'),'');assert.equal(h.elements.get('#ipsAdd').disabled,true);add(h);assert.equal(bytes(h),before);assert.match(h.elements.get('#ipsQuote').innerHTML,/blank field is not zero/);
});
test('dirty paths rebase onto unrelated shared changes without losing either edit',()=>{
 const h=fresh();show(h,'people','recruitment');input(h,'generalist',1);h.run('draft.specialistHires.service=1;draft.investments.digital=1000');show(h,'people','recruitment',{role:'business'});assert.equal(h.run('interfacePeopleStrategyState.forms["bank-recruitment"].value.generalist'),'1');assert.equal(h.run('interfacePeopleStrategyState.forms["bank-recruitment"].value.service'),1);add(h);assert.equal(h.run('draft.hires'),1);assert.equal(h.run('draft.specialistHires.service'),1);assert.equal(h.run('draft.investments.digital'),1000);
});
test('stale owner, submitted state and connection callbacks cannot stage',()=>{
 for(const change of ['seat=1;newDraft(currentView())','game.players[0].submitted=true','featureConnectionGeneration++','gh={...gh}']){const h=fresh();show(h,'people','recruitment');input(h,'generalist',1);const click=h.elements.get('#ipsAdd').listeners.click;h.run(change);const before=bytes(h);click();assert.equal(bytes(h),before);}
});
test('same-month guest view refresh preserves working fields but invalidates old actions',()=>{
 const h=fresh();h.run('view=E.publicState(game,0);game=null;p2pRole="guest"');show(h,'people','training');input(h,'reserve','123000');const old=h.elements.get('#ipsAdd').listeners.click;h.run('view=JSON.parse(JSON.stringify(view));view.rival.submitted=true');const before=bytes(h);old();assert.equal(bytes(h),before);show(h,'people','training');assert.equal(h.run('interfacePeopleStrategyState.forms["bank-training"].value.reserve'),'123000');
});
test('finite staff time is exact quarters and never fractional employee headcount',()=>{
 const h=fresh();assert.equal(h.run('ipsTime(7)'),'1 full month + 75% of another');assert.equal(h.run('ipsTime(1)'),'25% of one employee’s month');show(h,'people','coverage',{functionId:'people'});input(h,'quotas.people.operations',0.5);assert.equal(h.elements.get('#ipsAdd').disabled,true);assert.match(h.elements.get('#ipsQuote').innerHTML,/steps of 1/);input(h,'quotas.people.operations',1);assert.match(h.elements.get('#ipsQuote').innerHTML,/25% of one employee/);const before=h.run('JSON.stringify(game)');add(h);assert.equal(h.run('draft.departmentFunctionsPolicy.quotas.people.operations'),1);assert.equal(h.run('JSON.stringify(game)'),before);
});
test('research contribution is inspected and quoted before its one explicit Add',()=>{
 const h=fresh();show(h,'strategy','research',{branch:'digital'});const before=bytes(h);input(h,'amount',1000);assert.equal(bytes(h),before);add(h);assert.equal(h.run('draft.investments.digital'),1000);assert.equal(h.run('draft.hires'),0);show(h,'strategy','research',{branch:'risk'});assert(!html(h).includes('<h2>Unavailable</h2>'));
});
test('existing research mandate keeps its exact supported target set',()=>{
 const h=fresh();show(h,'strategy','mandates',{mandate:'research'});assert(!html(h).includes('<h2>Unavailable</h2>'),html(h));assert.equal(h.elements.get('#ipsAdd').disabled,false,h.elements.get('#ipsQuote').innerHTML);const old=h.run('Object.keys(draft.management.research.targets).sort().join()');choose(h,'enabled','true');add(h);assert.equal(h.run('draft.management.research.enabled'),true);assert.equal(h.run('Object.keys(draft.management.research.targets).sort().join()'),old);assert.equal(h.run('JSON.stringify(draft.investments)'),'{}');
});
test('market campaign entry changes working target only and one campaign is staged',()=>{
 const h=fresh(),market=h.run('Object.keys(currentView().territories).find(k=>k!==draft.advertisingPolicy.market)'),before=bytes(h);show(h,'strategy','campaigns',{campaignType:'advertising',market});assert.equal(bytes(h),before);assert.equal(h.run('interfacePeopleStrategyState.forms.advertising.value.market'),market);assert.equal(h.elements.get('#ipsAdd').disabled,false,h.elements.get('#ipsQuote').innerHTML);add(h);assert.equal(h.run('draft.advertisingPolicy.market'),market);
});
test('advertising can be paused without silently repairing an unrelated invalid staffing order',()=>{
 const h=fresh();h.run('draft.advertisingPolicy.budget=E.ADVERTISING_BUDGETS.find(n=>n>0);draft.departmentFunctionsPolicy.quotas.risk.operations=400');show(h,'strategy','campaigns',{campaignType:'advertising'});const old=h.run('JSON.stringify(draft.departmentFunctionsPolicy)');choose(h,'budget',0);assert.equal(h.elements.get('#ipsAdd').disabled,false,h.elements.get('#ipsQuote').innerHTML);add(h);assert.equal(h.run('draft.advertisingPolicy.budget'),0);assert.equal(h.run('JSON.stringify(draft.departmentFunctionsPolicy)'),old);
});
test('reports remain read-only and distinguish missing history',()=>{
 const h=fresh(),before=bytes(h);for(const view of ['statements','forecasts','commitments','position','history','portfolios','depositStatements','lendingIncome','markets','operations','group','intelligence']){show(h,'reports',view);assert(!html(h).includes('<h2>Unavailable</h2>'),view+': '+html(h));assert.equal(bytes(h),before);assert(!html(h).includes('id="ipsAdd"'));}show(h,'reports','statements');assert.match(html(h),/unavailable|Unavailable/);
});
test('Review month receives one meaningful pending form with its exact route',()=>{
 const h=fresh();show(h,'people','recruitment',{role:'generalist'});input(h,'generalist',1);let rows=JSON.parse(h.run('JSON.stringify(pendingInterfacePeopleStrategyEdits(currentView()))'));assert.equal(rows.length,1);assert.equal(rows[0].workspace,'people');assert.equal(rows[0].view,'recruitment');input(h,'generalist',0);assert.equal(h.run('pendingInterfacePeopleStrategyEdits(currentView()).length'),0);
});
test('missing report amounts are unavailable, while real zero remains a real zero',()=>{
 const h=fresh();assert.equal(h.run('ipsMoney(undefined)'),'Unavailable');assert.equal(h.run('ipsMoney(null)'),'Unavailable');assert.equal(h.run('ipsMoney(NaN)'),'Unavailable');assert.equal(h.run('ipsMoney(0)'),'$0');
 h.run('E.depositSummary=()=>({rows:{essential:{principal:12345,interest:0,fees:0,service:0}}})');show(h,'reports','portfolios');assert.match(html(h),/Unavailable/);assert(html(h).includes('$12K')||html(h).includes('$12.3K')||html(h).includes('$12,345'));
});
test('strategic initiative uses authoritative candidate and adds only one instruction',()=>{
 const h=fresh();show(h,'strategy','initiatives',{project:'marketing'});const before=bytes(h);choose(h,'planned','yes');assert.equal(bytes(h),before);assert.equal(h.elements.get('#ipsAdd').disabled,false,h.elements.get('#ipsQuote').innerHTML);add(h);assert.equal(h.run('draft.newProjects.filter(k=>k==="marketing").length'),1);assert.equal(h.run('draft.newProject'),'marketing');assert.equal(h.run('draft.hires'),0);
});
test('operating model explicitly confirms replacement without charging another research fee',()=>{
 const h=fresh();h.run('game.players[0].capability.digital=currentView().capabilityTiers.digital[0];draft.newProjects=["roadmapDigital"];draft.newProject="roadmapDigital"');show(h,'strategy','models',{branch:'digital'});const key=h.run('Object.keys(currentView().strategySpecializations.digital)[0]'),before=bytes(h);choose(h,'model',key);add(h);assert.equal(bytes(h),before);h.elements.get('#ipsReplacement').checked=true;add(h);assert.equal(h.run('draft.specializations.digital'),key);assert.equal(h.run('draft.newProjects.includes("roadmapDigital")'),false);assert.equal(h.run('JSON.stringify(draft.investments)'),'{}');
});
test('legal exact-dollar reserves survive the new editor without UI rounding',()=>{
 const h=fresh();h.run('draft.workforcePolicy.reserve=12345');show(h,'people','training');assert.equal(h.elements.get('#ipsAdd').disabled,false,h.elements.get('#ipsQuote').innerHTML);add(h);assert.equal(h.run('draft.workforcePolicy.reserve'),12345);
});
test('leaving the route invalidates hidden actions without erasing working fields on return',()=>{
 const h=fresh();show(h,'people','recruitment');input(h,'generalist',1);const click=h.elements.get('#ipsAdd').listeners.click;h.run('interfaceState.route={workspace:"markets",view:"overview",context:{}}');const before=bytes(h);click();assert.equal(bytes(h),before);h.run('interfaceState.route={workspace:"people",view:"recruitment",context:{}}');show(h,'people','recruitment');assert.equal(h.run('interfacePeopleStrategyState.forms["bank-recruitment"].value.generalist'),'1');assert.equal(h.elements.get('#ipsAdd').disabled,false);add(h);assert.equal(h.run('draft.hires'),1);
});
test('research shortcuts stage from the custom total and repeat without double-counting existing funding',()=>{
 const h=fresh();h.run('draft.investments.digital=2000;draft.investments.operations=3000;draft.hires=1');show(h,'strategy','research',{branch:'digital'});
 const world=h.run('JSON.stringify(game)'),other=h.run('JSON.stringify({...draft,investments:undefined})');input(h,'amount',12345);
 assert.equal(h.elements.get('#ipsResearch50k').disabled,false);h.elements.get('#ipsResearch50k').listeners.click();assert.equal(h.run('draft.investments.digital'),62345);assert.equal(h.run('interfacePeopleStrategyState.forms["research-digital"].value.amount'),62345);assert.equal(h.run('interfacePeopleStrategyState.forms["research-digital"].dirty'),false);
 show(h,'strategy','research',{branch:'digital'});const expected=h.run('E.fundingStep(currentView().me,draft,"digital",50000,currentView())');h.elements.get('#ipsResearch50k').listeners.click();assert.equal(h.run('draft.investments.digital'),expected);assert.equal(h.run('draft.investments.operations'),3000);assert.equal(h.run('JSON.stringify({...draft,investments:undefined})'),other);assert.equal(h.run('JSON.stringify(game)'),world);
});
test('research Stage max uses the authoritative limit independently of malformed working text',()=>{
 const h=fresh();h.run('draft.investments.digital=12345;draft.investments.operations=5000;draft.hires=1');show(h,'strategy','research',{branch:'digital'});input(h,'amount','');
 assert.equal(h.elements.get('#ipsResearch50k').disabled,true);assert.equal(h.elements.get('#ipsAdd').disabled,true);assert.equal(h.elements.get('#ipsResearchMax').disabled,false);
 const expected=h.run('(()=>{const p=ipsCopy(draft);delete p.investments.digital;return E.fundingStep(currentView().me,p,"digital",currentView().capabilityCap,currentView());})()'),world=h.run('JSON.stringify(game)');h.elements.get('#ipsResearchMax').listeners.click();assert.equal(h.run('draft.investments.digital'),expected);assert.equal(h.run('interfacePeopleStrategyState.forms["research-digital"].value.amount'),expected);assert.equal(h.run('draft.investments.operations'),5000);assert.equal(h.run('draft.hires'),1);assert.equal(h.run('JSON.stringify(game)'),world);
});
test('research shortcuts clamp at the exact next milestone and never decrease an oversized custom amount implicitly',()=>{
 const h=fresh();h.run('game.players[0].capability.digital=currentView().capabilityTiers.digital[0]-12345');show(h,'strategy','research',{branch:'digital'});input(h,'amount',12000);assert.equal(h.elements.get('#ipsResearch50k').disabled,false);assert.match(h.elements.get('#ipsResearchShortcutsQuote').textContent,/current limit/);h.elements.get('#ipsResearch50k').listeners.click();assert.equal(h.run('draft.investments.digital'),12345);
 show(h,'strategy','research',{branch:'digital'});input(h,'amount',50000);assert.equal(h.elements.get('#ipsResearch50k').disabled,true);const before=bytes(h);h.elements.get('#ipsResearch50k').listeners.click();assert.equal(bytes(h),before);assert.equal(h.run('interfacePeopleStrategyState.forms["research-digital"].value.amount'),'50000');h.elements.get('#ipsResearchMax').listeners.click();assert.equal(h.run('draft.investments.digital'),12345);
});
test('research +50k rejects invalid raw amounts while the custom editor remains available',()=>{
 for(const raw of ['',-1,1.5,'NaN']){const h=fresh();show(h,'strategy','research',{branch:'digital'});input(h,'amount',raw);const before=bytes(h);assert.equal(h.elements.get('#ipsResearch50k').disabled,true);h.elements.get('#ipsResearch50k').listeners.click();assert.equal(bytes(h),before);assert.equal(h.run('interfacePeopleStrategyState.forms["research-digital"].value.amount'),String(raw));}
 const h=fresh();show(h,'strategy','research',{branch:'digital'});input(h,'amount',12345);add(h);assert.equal(h.run('draft.investments.digital'),12345,'custom exact-dollar Add still works');
});
test('research shortcuts respect protected-budget exhaustion and completed capability trees',()=>{
 for(const setup of ['game.players[0].stats.cash=0','game.players[0].capability.digital=currentView().capabilityTiers.digital.at(-1)','game.players[0].capability.digital=currentView().capabilityTiers.digital[0]-999']){const h=fresh();h.run(setup);show(h,'strategy','research',{branch:'digital'});const before=bytes(h);for(const id of ['#ipsResearch50k','#ipsResearchMax']){assert.equal(h.elements.get(id).disabled,true,id+' should have no legal funding');h.elements.get(id).listeners.click();assert.equal(bytes(h),before);}}
});
test('research shortcut callbacks retain owner, ready, month, session, route and shared-draft fences',()=>{
 for(const id of ['#ipsResearch50k','#ipsResearchMax'])for(const change of ['seat=1;newDraft(currentView())','game.players[0].submitted=true','game.gameOver=true','game.cycle++','featureConnectionGeneration++','gh={...gh}','gh.active=true;gh.paused=true','draft.hires=1','interfaceState.route={workspace:"markets",view:"overview",context:{}}']){const h=fresh();show(h,'strategy','research',{branch:'digital'});const click=h.elements.get(id).listeners.click;h.run(change);const before=bytes(h);click();assert.equal(bytes(h),before,id+' stale '+change);}
 const h=fresh();h.run('view=E.publicState(game,0);game=null;p2pRole="guest"');show(h,'strategy','research',{branch:'digital'});input(h,'amount',12345);const click=h.elements.get('#ipsResearch50k').listeners.click;h.run('view=JSON.parse(JSON.stringify(view));view.rival.submitted=true');const before=bytes(h);click();assert.equal(bytes(h),before);show(h,'strategy','research',{branch:'digital'});assert.equal(h.run('interfacePeopleStrategyState.forms["research-digital"].value.amount'),'12345');h.elements.get('#ipsResearch50k').listeners.click();assert.equal(h.run('draft.investments.digital'),62345);
});
test('operating models link to funding the same research branch without staging a model',()=>{
 const h=fresh(),before=bytes(h);show(h,'strategy','models',{branch:'digital'});assert.match(html(h),/>Fund operating-model research<\/button>/);assert.match(html(h),/&quot;legacyResearch&quot;:true/);assert.match(html(h),/workspace&quot;:&quot;strategy&quot;,&quot;view&quot;:&quot;research&quot;,&quot;context&quot;:\{&quot;branch&quot;:&quot;digital&quot;/);assert.equal(bytes(h),before);
});
test('blank specialist recruit count is retained and cannot silently become zero',()=>{
 const h=fresh();show(h,'people','recruitment',{role:'service'});input(h,'service','');const before=bytes(h);assert.equal(h.elements.get('#ipsAdd').disabled,true);show(h,'people','recruitment',{role:'operations'});assert.equal(h.run('interfacePeopleStrategyState.forms["bank-recruitment"].value.service'),'');add(h);assert.equal(bytes(h),before);assert.match(h.elements.get('#ipsQuote').innerHTML,/blank field is not zero/);
});
test('explicit directory navigation focuses its inspector and Back returns to the selected item only',()=>{
 const h=fresh();
 h.run(`
  const psMount=$('#interfacePeople'),psFind=psMount.querySelector;
  const psHeading=$('.ips-inspector h2'),psSelected=$('#selected-directory-item'),psRetained=$('#retained-focus');
  for(const node of [psHeading,psSelected,psRetained])node.focus=function(){document.activeElement=this;};
  psMount.querySelector=selector=>selector==='[data-ips-item][aria-pressed="true"]'?psSelected:psFind(selector);
  openInterfaceWorkspace=(workspace,view,context)=>{interfaceState.route={workspace,view,context};renderInterfacePeopleStrategy(currentView(),interfaceState.route,psMount);};
  openInterfaceWorkspace('people','leadership',{});
  psRetained.focus();
 `);
 const before=bytes(h);
 h.run("$('.ips-body').querySelectorAll('[data-ips-item]').find(button=>button.dataset.ipsItem==='limits').listeners.click()");
 assert.equal(h.run('interfaceCurrentRoute().context.role'),'limits');
 assert.equal(h.run('document.activeElement===psHeading'),true,'selection puts focus on the newly rendered subject');
 assert.equal(h.run('psHeading.getAttribute("tabindex")'),'-1');
 assert.equal(bytes(h),before,'navigation has no economic or draft effect');
 h.run('psRetained.focus();renderInterfacePeopleStrategy(currentView(),interfaceCurrentRoute(),psMount)');
 assert.equal(h.run('document.activeElement===psRetained'),true,'background rendering must not move keyboard focus');
 h.elements.get('#created-button').listeners.click();
 assert.equal(h.run('document.activeElement===psSelected'),true,'Back returns to the current selection, not the first record');
 assert.equal(bytes(h),before);
});
console.log(JSON.stringify({suite:'interface-people-strategy',checks,scope:'Focused controller and engine checks, shared draft and dirty-form continuity, finite staffing, actual research rules and read-only reports; not browser visual acceptance.'}));
