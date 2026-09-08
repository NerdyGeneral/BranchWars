'use strict';
// Actual assembled rules and budgets; no synthetic feature-book initialization.
const assert=require('node:assert/strict'),vm=require('node:vm'),{createHash}=require('node:crypto');
const source=require('../tools/build_game').assemble().html,ctx={console};
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));let checks=0;
function test(name,fn){try{fn();checks++;console.log('PASS '+name);}catch(error){error.message=name+': '+error.message;throw error;}}
function create(version=6){return E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options,mode:'hotseat',seed:'department-planning-contract',created:1});}
const game=create(),p=game.players[0],draft=E.chooseBot(game,0);
draft.departmentFunctionsPolicy=E.defaultDepartmentFunctionsPolicy(p);
// No additional department vendor orders in the comparison base. All existing
// draft obligations remain; the experiment changes only the stated vendor slot.
test('owner-only function quote matches full campaign and leaves all state untouched',()=>{
 const before=JSON.stringify({game,draft}),view=E.publicState(game,0);
 const full=E.departmentFunctionsQuote(game,p,draft),publicQuote=E.departmentFunctionsQuote(view,view.me,draft);
 assert(full.eligible,full.reason);assert.deepEqual(copy(publicQuote),copy(full));
 assert.equal(JSON.stringify({game,draft}),before);
});
test('one vendor order appears exactly once in the shared draft commitment',()=>{
 const next=copy(draft);next.departmentFunctionsPolicy.vendors.people=1;
 const before=E.planBudget(p,draft),after=E.planBudget(p,next),rate=E.DepartmentFunctions.FUNCTIONS.people.vendorRate;
 assert.equal(before.departmentFunctions,0);assert.equal(after.departmentFunctions,rate);
 assert.equal(after.total-before.total,rate);assert.equal(after.departmentFunctionsPaid,0);
 assert.equal(E.departmentFunctionsQuote(game,p,next).vendorExpense,rate);
 assert.equal(after.remaining,before.remaining-rate);
});
test('unsupported version and marker mismatch cannot silently downgrade',()=>{
 for(const change of [{financialGroupVersion:7},{version:'9.4'},{financialGroupVersion:5}]){
  const bad={...copy(game),...change},before=JSON.stringify(bad);assert.throws(()=>E.validatePilot(bad));
  assert.equal(JSON.stringify(bad),before,'Rejected rules must not repair the campaign');
 }
});
test('all new books are mandatory only in the new version',()=>{
 for(const key of ['departmentFunctions','departmentFunctionDelivery']){const bad=copy(game);delete bad.players[0][key];assert.throws(()=>E.validatePilot(bad));}
 const noProvider=copy(game);delete noProvider.departmentFunctionEconomy;assert.throws(()=>E.validatePilot(noProvider));
 const legacy=create(5);assert.equal(legacy.departmentFunctionEconomy,undefined);
 for(const key of ['departmentFunctions','departmentFunctionDelivery']){const bad=copy(legacy);bad.players[0][key]=copy(p[key]);assert.throws(()=>E.validatePilot(bad));}
});
test('disabled rules reject injected submitted department instructions',()=>{
 const legacy=create(5),plan=E.chooseBot(legacy,0);plan.departmentFunctionsPolicy=copy(draft.departmentFunctionsPolicy);
 legacy.players[0].submitted=plan;assert.throws(()=>E.validatePilot(legacy),/department function/i);
});
test('overcommitted functions are blocked without changing the manual policy',()=>{
 const next=copy(draft);next.departmentFunctionsPolicy.quotas.people.operations=400;
 const before=JSON.stringify(next),quote=E.departmentFunctionsQuote(game,p,next);
 assert.equal(quote.eligible,false);assert.match(quote.reason,/staff|capacity|function/i);assert.equal(JSON.stringify(next),before);
});
console.log(JSON.stringify({suite:'department-planning-contract',checks,sourceSha256:createHash('sha256').update(source).digest('hex'),scope:'Versioned creation, owner-only pure quote, shared cost, strict off-state rejection; not full runtime or balance acceptance.'}));
