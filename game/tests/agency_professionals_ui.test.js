'use strict';
const assert=require('node:assert/strict'),{groupHarness}=require('./group_ui_harness');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fresh(){const h=groupHarness();h.run("game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:10}).options,mode:'hotseat',seed:'agency-role-ui',created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());draft.decision='b';errors=[];toast=s=>errors.push(s);renderFinancialGroup(currentView());setFinancialGroupDesk('agency');");return h;}
const click=(h,id)=>h.elements.get('#'+id).listeners.click(),html=h=>h.elements.get('#financialGroupPanel').innerHTML,bytes=h=>h.run('JSON.stringify({game,draft})');
test('three priced roles replace generic staffing without dropdowns or automatic changes',()=>{
 const h=fresh(),before=bytes(h);assert.match(html(h),/two-month registration/);click(h,'agency-section-operations');assert(!html(h).includes('<select'));assert(!html(h).includes('agency-choice-staff-'));
 for(const role of ['propertyProducer','benefitsProducer','servicing'])assert(html(h).includes('agency-role-'+role+'-more'));
 assert.match(html(h),/\$6,000/);assert.match(html(h),/\$6,500/);assert.match(html(h),/\$4,200/);assert.match(html(h),/Servicing only/);assert.equal(bytes(h),before);
});
test('role and maintenance edits survive section changes and cancellation restores all fields',()=>{
 const h=fresh(),before=bytes(h);click(h,'agency-section-operations');click(h,'agency-role-benefitsProducer-more');click(h,'agency-role-propertyProducer-less');h.elements.get('#agency-maintainCredentials').checked=false;h.elements.get('#agency-maintainCredentials').listeners.change();
 click(h,'agency-section-funding');click(h,'agency-section-operations');assert.equal(h.run('groupWorkspace.forms.agency.roles.benefitsProducer'),1);assert.equal(h.elements.get('#agency-maintainCredentials').checked,false);assert.equal(bytes(h),before);
 click(h,'discardAgencyForm');assert.equal(h.run('groupWorkspace.forms.agency.roles.propertyProducer'),1);assert.equal(h.run('groupWorkspace.forms.agency.roles.benefitsProducer'),0);assert.equal(h.elements.get('#agency-maintainCredentials').checked,true);assert.equal(bytes(h),before);
});
test('preview and stage include role salaries and permissions but never hire immediately',()=>{
 const h=fresh();click(h,'agency-section-operations');click(h,'agency-role-servicing-more');const before=bytes(h);click(h,'previewAgency');assert.match(h.elements.get('#agencyInstructionQuote').innerHTML,/\$11,700/);assert.match(h.elements.get('#agencyInstructionQuote').innerHTML,/Delivery unavailable/);assert.equal(bytes(h),before);
 click(h,'stageAgency');assert.equal(h.run('draft.agencyPolicy.staff'),2);assert.equal(h.run('draft.agencyPolicy.roles.servicing'),1);assert.equal(h.run('game.players[0].agency.staff'),0);assert.equal(h.run('groupWorkspace.dirty.agency'),false);assert.deepEqual(JSON.parse(h.run('JSON.stringify(errors)')),[]);
});
test('finite headcount guards and producer-only qualification cannot be bypassed by controls',()=>{
 const h=fresh();click(h,'agency-section-operations');for(let i=0;i<3;i++)click(h,'agency-role-servicing-more');assert.equal(h.run('groupWorkspace.forms.agency.staff'),'4');click(h,'agency-role-servicing-more');assert.equal(h.run('groupWorkspace.forms.agency.staff'),'4');click(h,'agency-role-propertyProducer-less');click(h,'previewAgency');assert.match(h.elements.get('#agencyInstructionQuote').innerHTML,/Delivery unavailable/);
});
test('old role and credential controls reject replacement owners, months, renders and connections',()=>{
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','draft.hires=1','featureConnectionGeneration++','connectionAttempt++','linkSession="replacement"','gh={...gh}','game.players[0].submitted=true','renderFinancialGroup(currentView())']){
  const h=fresh();click(h,'agency-section-operations');const add=h.elements.get('#agency-role-servicing-more').listeners.click,renew=h.elements.get('#agency-maintainCredentials').listeners.change;h.run(change);const before=bytes(h),forms=h.run('JSON.stringify(groupWorkspace.forms)');add();renew();assert.equal(bytes(h),before,change);assert.equal(h.run('JSON.stringify(groupWorkspace.forms)'),forms,change);
 }
});
test('results keep employed staff and settled credentials separate from the next plan',()=>{
 const h=fresh();click(h,'agency-section-operations');click(h,'agency-role-servicing-more');click(h,'agency-section-results');assert.match(html(h),/Current team & permissions · 0 employees/);assert.match(html(h),/No employed agency team/);assert(!html(h).includes('<select'));assert.equal(h.run('groupWorkspace.forms.agency.roles.servicing'),1);
});
test('monthly undo restores one coherent agency instruction without undoing unrelated bank work',()=>{
 const h=fresh();click(h,'agency-section-operations');click(h,'agency-role-servicing-more');click(h,'stageAgency');h.run('draft.hires=1');assert.equal(h.run('monthlyChangeRows(currentView()).filter(r=>r.path[0]==="agencyPolicy").length'),1);
 h.run('renderMonthlyChanges(currentView())');assert.match(h.elements.get('#monthlyChanges').innerHTML,/insurance servicing specialist/);assert(!h.elements.get('#monthlyChanges').innerHTML.includes('maintain Credentials'));
 h.run('proposeMonthlyUndo(currentView(),monthlyChangeRows(currentView()).findIndex(r=>r.path[0]==="agencyPolicy"));applyMonthlyUndo(currentView());');assert.equal(h.run('draft.agencyPolicy.staff'),1);assert.equal(h.run('draft.agencyPolicy.roles.servicing'),0);assert.equal(h.run('draft.hires'),1);h.run('E.normalizeAgencyPlan(currentView().me,draft)');
 h.run('draft.agencyPolicy.staff=4');assert(h.run('monthlyPlanReview(currentView()).blockers.some(x=>x.id==="agency-plan"&&x.groupDesk==="agency")'));
});
console.log(JSON.stringify({suite:'agency-professionals-ui',checks,scope:'No real browser or balance claim; role costs, pure forms, cancellation, finite counts and stale guards.'}));
