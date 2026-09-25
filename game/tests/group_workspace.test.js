'use strict';
const assert=require('node:assert/strict'),{groupHarness}=require('./group_ui_harness');let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){throw Error(name+': '+error.stack);}}
function fresh(version=9){const h=groupHarness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options,mode:'hotseat',seed:'group-workspace',created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());draft.decision='b';errors=[];toast=s=>errors.push(s);renderFinancialGroup(currentView());`);return h;}
const click=(h,id)=>h.elements.get('#'+id).listeners.click(),html=h=>h.elements.get('#financialGroupPanel').innerHTML,bytes=h=>h.run('JSON.stringify({game,draft})');
function input(h,id,value){const node=h.elements.get('#'+id);node.value=String(value);node.listeners.input();}
function funded(h){h.run('game.players[0].financialGroup.parent=E.GroupAccounting.post(game.players[0].financialGroup.parent,"ui.fixture","external",{cash:240000,equity:240000});newDraft(currentView());draft.decision="b";renderFinancialGroup(currentView());');}

test('each agency decision is reachable without dropdowns and without changing the plan',()=>{
 const h=fresh(),before=bytes(h);click(h,'groupTab-agency');
 for(const section of ['funding','operations','results']){click(h,'agency-section-'+section);assert(!html(h).includes('<select'));assert.equal((html(h).match(/id="agencyWorkspaceTitle"/g)||[]).length,1);
  if(section==='operations'){assert(html(h).includes('id="agency-choice-staff-4"'));assert(!html(h).includes('id="agency-capital"'));assert.match(html(h),/Each new hire costs \$7,000/);}
  if(section==='funding')assert(!html(h).includes('id="agency-choice-staff-4"'));
  if(section==='results')assert(html(h).includes('18 independent relationships'));
 }
 assert.equal(bytes(h),before);
});
test('unfinished agency fields survive views and ordinary workspace navigation; blank dollars do not become zero',()=>{
 const h=fresh();click(h,'groupTab-agency');input(h,'agency-capital','');const before=bytes(h);click(h,'agency-section-operations');click(h,'agency-choice-target-benefits');click(h,'agency-choice-outreach-2');click(h,'agency-section-funding');assert.equal(h.elements.get('#agency-capital').value,'');
 h.run('setWorkspaceTab("products");setWorkspaceTab("group")');assert.equal(h.elements.get('#agency-capital').value,'');click(h,'stageAgency');assert.equal(bytes(h),before);assert.match(h.elements.get('#agencyInstructionStatus').textContent,/whole dollar/);
 click(h,'discardAgencyForm');assert.equal(h.elements.get('#agency-capital').value,'0');assert.equal(h.run('groupWorkspace.forms.agency.target'),'property');assert.equal(bytes(h),before);
});
test('one agency instruction combines funding and visible operating choices at the engine quote',()=>{
 const h=fresh();funded(h);click(h,'groupTab-agency');h.elements.get('#agency-launch').checked=true;input(h,'agency-capital',120000);input(h,'agency-supportCap',10000);click(h,'agency-section-operations');click(h,'agency-choice-staff-2');click(h,'agency-choice-target-benefits');click(h,'agency-choice-outreach-2');
 const before=bytes(h);click(h,'previewAgency');assert.equal(bytes(h),before);assert.match(h.elements.get('#agencyInstructionQuote').innerHTML,/\$12,500/);assert.match(h.elements.get('#agencyInstructionQuote').innerHTML,/16 units/);
 click(h,'stageAgency');assert.equal(h.run('JSON.stringify(game)'),JSON.stringify(JSON.parse(before).game));assert.deepEqual(JSON.parse(h.run('JSON.stringify(draft.agencyPolicy)')),{launch:true,capital:120000,staff:2,target:'benefits',outreach:2,supportCap:10000,dividend:0});assert.equal(h.run('groupWorkspace.dirty.agency'),false);
});
test('parent commitments are validated together and previews do not invent funding',()=>{
 const h=fresh();funded(h);h.run('draft.groupPolicy.bankSupport=130000;renderFinancialGroup(currentView())');click(h,'groupTab-agency');h.elements.get('#agency-launch').checked=true;input(h,'agency-capital',120000);const before=bytes(h);click(h,'previewAgency');assert.match(h.elements.get('#agencyInstructionStatus').textContent,/parent cash/);click(h,'stageAgency');assert.equal(bytes(h),before);
});
test('capital forms preserve unfinished edits, stage explicitly and retain unrelated agency work',()=>{
 const h=fresh(3);funded(h);input(h,'groupBankSupport',60000);const before=bytes(h);click(h,'groupTab-agency');input(h,'agency-supportCap',5000);click(h,'agency-section-operations');click(h,'groupTab-capital');assert.equal(h.elements.get('#groupBankSupport').value,'60000');click(h,'previewGroupCapital');assert.equal(bytes(h),before);assert.match(h.elements.get('#groupCapitalStatus').textContent,/Preview only/);click(h,'stageGroupCapital');assert.equal(h.run('draft.groupPolicy.bankSupport'),60000);assert.equal(h.run('groupWorkspace.forms.agency.supportCap'),'5000');assert.equal(h.run('groupWorkspace.dirty.agency'),true);
 assert.deepEqual(JSON.parse(h.run('JSON.stringify(errors)')),[],'Successful capital staging must not leave a rendering failure');input(h,'groupBankSupport','');const staged=bytes(h);click(h,'stageGroupCapital');assert.equal(bytes(h),staged);click(h,'discardGroupCapital');assert.equal(h.elements.get('#groupBankSupport').value,'60000');
});
test('lending changes do not discard an unrelated raw capital form',()=>{
 const h=fresh(3);funded(h);input(h,'groupBankSupport',60000);h.run('stageGroupPolicy(currentView(),{...draft.groupPolicy,creditAllocation:{mortgage:50,middleMarket:25,consumer:25}})');assert.equal(h.elements.get('#groupBankSupport').value,'60000');assert.equal(h.run('draft.groupPolicy.bankSupport'),0);
});
test('old group and agency controls reject all stale campaign and transport contexts',()=>{
 for(const version of [1,9])for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','draft.hires=1','featureConnectionGeneration++','connectionAttempt++','linkSession="replacement"','gh={...gh}','lan={...lan}','gh.active=true;gh.paused=true','game.players[0].submitted=true','renderFinancialGroup(currentView())']){
  const h=fresh(version);const capital=h.elements.get('#stageGroupCapital').listeners.click,agency=version===9?h.elements.get('#stageAgency').listeners.click:null;h.run(change);const before=bytes(h);capital();if(agency)agency();assert.equal(bytes(h),before,version+': '+change);
 }
});
test('company inspection retains all six statements and opens the exact banking relationship',()=>{
 const h=fresh();click(h,'groupTab-companies');const before=bytes(h);
 for(let i=0;i<6;i++){click(h,'group-company-'+i);assert.equal((html(h).match(/id="groupCompanyTitle"/g)||[]).length,1);assert(html(h).includes('All company statements'));assert.equal(h.run('groupWorkspace.company'),'company:'+i);}
 click(h,'groupCompanyMandate');assert.equal(h.run('workspaceTab'),'markets');assert.equal(h.run('serviceWorkspace.id'),h.run('currentView().serviceAgreements.find(c=>c.clientIndex===5).id'));assert.equal(bytes(h),before);
});
test('forms and company selections isolate replacement campaigns and owners',()=>{
 const h=fresh();input(h,'groupBankSupport',45000);click(h,'group-company-4');h.run('seat=1;newDraft(currentView());renderFinancialGroup(currentView())');assert.equal(h.elements.get('#groupBankSupport').value,'0');assert.equal(h.run('groupWorkspace.company'),'company:0');assert.equal(h.run('financialGroupDesk'),'capital');
 h.run('game=JSON.parse(JSON.stringify(game));renderFinancialGroup(currentView())');assert.equal(h.run('groupWorkspace.dirty.capital'),undefined);
});
test('closed companies cannot route to a live agreement editor',()=>{
 const h=fresh();click(h,'groupTab-companies');h.run('currentView=(()=>{const original=currentView;return ()=>{const v=original();v.me.companySnapshot.world.companies[0].resolution={month:1};v.serviceAgreements.find(c=>c.clientIndex===0).companyClosed=true;return v;};})()');h.run('renderFinancialGroup(currentView())');
 assert.match(html(h),/id="groupCompanyMandate" disabled/);const before=bytes(h);click(h,'groupCompanyMandate');assert.equal(h.run('workspaceTab'),'group');assert.equal(bytes(h),before);
});
console.log(JSON.stringify({suite:'group-workspace',checks,scope:'Contextual agency and company UI, finite shared parent commitments, pure quoted forms, raw-edit preservation and stale-session guards. UI-funded fixtures are not balance evidence.'}));
