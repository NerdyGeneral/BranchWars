'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,ctx={console},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',
 'root.BWEngine={prepareOperatingForecast,departmentProspectiveOwner,departmentProductiveAllocation,advanceProjects,settleDepartmentExperience,validateDepartmentView,validateDepartmentSave,'),ctx);
const E=ctx.BWEngine,options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
let checks=0;
for(const paused of [false,true]){
 const g=E.createGame({...options,mode:'hotseat',seed:'department-execution',created:1});
 const p=g.players[0];p.workforce.departments.operations.count=2;p.workforce.departments.operations.skill=20;
 p.allocation={service:3,business:1,lending:1,operations:3};E.validatePilot(g);
 const plan=E.chooseBot(g,0);Object.assign(plan,{allocation:copy(p.allocation),investments:{},newProjects:[],newProject:null,hires:0,competitiveAction:'none',contractBid:null,opportunity:null});
 for(const role of Object.keys(plan.specialistHires))plan.specialistHires[role]=0;
 plan.facilityPolicy={convert:null,cancel:null};plan.leaderOrders.operations='mentor';plan.workforcePolicy.training.operations=20000;
 if(paused)plan.departmentPolicy.reserve=p.stats.cash-37000-1000;
 const q=E.departmentProspectiveOwner(E.prepareOperatingForecast(E.publicState(g,0).me,plan),plan);
 q._workforceReserved=Math.max(0,(q._workforceReserved||0)-37000);
 E.operate({economy:g.economy,cycle:0},q,true);
 assert.equal(q._workforceCosts,undefined);assert.equal(q._workforceReserved,undefined);
 assert.equal(q._departmentTraining.paused,paused);
 const capacity=E.executionCapacity(q),productive=E.departmentProductiveAllocation(q).operations;
 assert.equal(productive,paused?3:2);assert.equal(E.specialistBonus(q,'operations'),paused?.32:.16);checks++;
 // Pure test-side asset reallocation models a later liquidity movement without
 // minting cash, income, capital or changing the paid class decision.
 const move=paused?Math.min(1000000,q.accounting.accounts.securities):-q.accounting.accounts.cash;
 q.accounting=E.AccountingPrototype.post(q.accounting,'fixture.laterLiquidity',{cash:move,securities:-move});
 q.stats.cash=q.accounting.accounts.cash;
 assert.equal(E.executionCapacity(q),capacity);assert.equal(E.departmentProductiveAllocation(q).operations,productive);
 const wouldRecalculate=copy(q);delete wouldRecalculate._departmentTraining;
 assert.notEqual(E.departmentProductiveAllocation(wouldRecalculate).operations,productive);checks++;
 q.projects=[{key:'remediation',target:q.focus,progress:0,total:E.projectCycles(q,E.PROJECTS.remediation)}];
 E.advanceProjects({players:[q],cycle:1});
 assert.equal(q.projects[0].progress,1+productive*.08+(q.doctrine==='efficiency'?.1:0));checks++;
 assert.throws(()=>E.validateDepartmentView({financialGroupVersion:4,cycle:1,me:q,rival:{id:'other'}}));
 E.settleDepartmentExperience({cycle:1},q);
 assert.equal(q._departmentTraining,undefined);assert.equal(q._departmentTeaching,undefined);checks++;
}
for(const field of ['_departmentTeaching','_departmentTraining']){
 const g=E.createGame({...options,mode:'hotseat',seed:'department-transient',created:1});
 g.players[0][field]={};assert.throws(()=>E.validateDepartmentSave(g));
 const view=E.publicState(E.createGame({...options,mode:'hotseat',seed:'department-view',created:1}),0);
 view.rival[field]={};assert.throws(()=>E.validateDepartmentView(view));checks++;
}
console.log(JSON.stringify({suite:'department-execution',checks,source:'actual assembled engine',note:'Paid and paused operations teaching remains fixed through later liquidity changes.'}));
