'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');
let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){throw Error(name+': '+error.stack);}}
function fresh(version=7){const h=harness();h.run(`const opts=${version?`E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options`:'{}'};
game=E.createGame({...opts,mode:'hotseat',seed:'people-overview',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());`);return h;}
test('overview does not create disabled systems or mutate supported campaigns',()=>{
 for(const version of [0,4,5,6,7]){const h=fresh(version),before=h.run('JSON.stringify({game,draft})');h.run('renderPeopleOverview(currentView());');assert.equal(h.run('JSON.stringify({game,draft})'),before);
  if(version===0)assert.equal(h.elements.get('#peopleOverview').innerHTML,'');else{assert.match(h.elements.get('#peopleOverview').innerHTML,/PEOPLE &amp; OPERATIONS/);assert.match(h.elements.get('#peopleOverview').innerHTML,/Specialists are included/);}
 }
});
test('headcount completion does not conceal uncovered work or fabricate coverage',()=>{
 const h=fresh();assert.equal(h.run('peopleOverviewModel(currentView()).unallocated'),0);assert(h.run('peopleOverviewModel(currentView()).tasks.some(row=>row.shortfall>0)'));
 assert.equal(h.run('JSON.stringify(peopleOverviewModel(currentView()).tasks)'),h.run('JSON.stringify(E.departmentFunctionsQuote(currentView(),currentView().me,draft).delivery.rows.map(row=>({id:row.id,workload:row.workload,served:row.planned.served,shortfall:row.planned.shortfall})))'));
 h.run('renderPeopleOverview(currentView());');const html=h.elements.get('#peopleOverview').innerHTML;assert.match(html,/does not guarantee work coverage/);assert.match(html,/zero coverage pauses ordinary origination/);assert.match(html,/not idle staff/);
});
test('quote normalization never repairs a partial draft in place',()=>{
 const h=fresh();h.run('delete draft.specialistHires;delete draft.workforcePolicy;');const before=h.run('JSON.stringify(draft)');h.run('renderPeopleOverview(currentView());');assert.equal(h.run('JSON.stringify(draft)'),before);assert.match(h.elements.get('#peopleOverview').innerHTML,/PEOPLE &amp; OPERATIONS/);
});
test('every physical role reconciles time without adding expertise to the employee pool',()=>{
 const h=fresh();for(const row of h.run('peopleOverviewModel(currentView()).pools'))assert(Math.abs(row.assigned-row.teaching-row.retained-row.extra-row.rounding-row.remaining)<1e-8,row.role);
 h.run('draft.departmentFunctionsPolicy.quotas.people.operations=1;');for(const row of h.run('peopleOverviewModel(currentView()).pools'))assert(Math.abs(row.assigned-row.teaching-row.retained-row.extra-row.rounding-row.remaining)<1e-8,row.role);
});
test('new recruits share the real limit and never inflate current headcount',()=>{
 const h=fresh();h.run('draft.hires=1;draft.specialistHires.operations=1;renderPeopleOverview(currentView());');assert.equal(h.run('peopleOverviewModel(currentView()).hires'),2);assert.equal(h.run('peopleOverviewModel(currentView()).headcount'),8);assert.equal(h.run('peopleOverviewModel(currentView()).hireLimit'),h.run('E.hireLimit(currentView().me)'));assert.match(h.elements.get('#peopleOverview').innerHTML,/No new-hire production this month/);
});
test('navigation changes presentation only and rejects detached owner/session handlers',()=>{
 const h=fresh();h.run('navigatePlanReview=item=>{peopleDestination=item};renderPeopleOverview(currentView());');const mount=h.elements.get('#peopleOverview');mount.contains=()=>true;
 const click=mount.onclick,event={target:{closest:()=>({dataset:{peopleDesk:'allocation'}})}};
 const before=h.run('JSON.stringify({game,draft})');click(event);assert.equal(h.run('peopleDestination.target'),'#staffGrid');assert.equal(h.run('JSON.stringify({game,draft})'),before);
 h.run('peopleDestination=null;seat=1;');click(event);assert.equal(h.run('peopleDestination'),null);
});
test('overcommitments and invalid quotes stay visible without silent repair',()=>{
 const h=fresh();h.run('draft.departmentFunctionsPolicy.quotas.people.operations=400;renderPeopleOverview(currentView());');assert(h.run('peopleOverviewModel(currentView()).pools.some(row=>row.remaining<0)'));assert.equal(h.run('draft.departmentFunctionsPolicy.quotas.people.operations'),400);
 h.run('draft.workforcePolicy.reserve=-1;renderPeopleOverview(currentView());');assert.match(h.elements.get('#peopleOverview').innerHTML,/overview unavailable/);assert.equal(h.run('draft.workforcePolicy.reserve'),-1);
});
console.log(JSON.stringify({suite:'usability-people',checks,scope:'Production staff/task quotes, exact role-time reconciliation, independent headcount and coverage, shared recruitment, optional-off and owner-safe navigation. No human or whole-release acceptance claim.'}));
