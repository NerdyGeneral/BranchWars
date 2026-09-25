'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
if(!process.argv.includes('--source'))process.argv.push('--source');
const {harness}=require('./github_resilience.test.js');
const bytes=fs.readFileSync(path.join(__dirname,'fixtures/v31-group7-staffing120.json.gz'));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'63087e6e96a905c5bb0cfea5c699b174611dfed6d85b673a4e0781c93e208d23');
const h=harness();h.c.imported=JSON.parse(zlib.gunzipSync(bytes)).game;
h.run('game=imported;seat=0;newDraft(currentView());renderPlanBudget(currentView());');
const before=h.run('JSON.stringify(game)'),draft=h.run('JSON.stringify(draft)');
let text=h.elements.get('#planBudget').innerHTML;
assert.match(text,/after protected reserves/);assert.match(text,/−\$25K|-\$25K/);assert.match(text,/Protected cash reserve \$600K/);assert.match(text,/exceed that protected envelope by \$25K/);
assert(!text.includes('>$519K</b>'),'Cash before the common reserve is not spendable room');
assert.match(text,/Workforce: Bank-wide cash reserve/);assert.match(text,/Leadership &amp; budgets: Common discretionary cash reserve/);
assert.match(text,/class="budget-reserve-warning" role="status"/,'A protected-cash deficit uses the scoped high-contrast warning');
h.run('renderPlanBudget(currentView());');assert.equal(h.run('JSON.stringify(game)'),before);assert.equal(h.run('JSON.stringify(draft)'),draft);
assert.equal(h.run('E.lifecycleInstructionQuote(currentView(),currentView().me,draft).status.eligible'),false);
h.run('draft.workforcePolicy.reserve=100000;draft.departmentPolicy.reserve=100000;renderPlanBudget(currentView());');
text=h.elements.get('#planBudget').innerHTML;assert.match(text,/Protected cash reserve \$100K/);assert.match(text,/\$419K/);assert(!text.includes('exceed that protected envelope'));
assert.equal(h.run('E.lifecycleInstructionQuote(currentView(),currentView().me,draft).status.eligible'),true);
assert.equal(h.run('JSON.stringify(game)'),before,'Staging a reserve does not add money or settle anything');
// Exercise the real staging functions as well as the pure renderer. Only the
// unrelated DOM refresh hooks are replaced in this limited mock; browser
// field-change/blur behavior remains a separate acceptance check.
h.run('renderProjects=()=>{};refreshDepartmentWorkspace=()=>{};renderReady=v=>renderPlanBudget(v);');
assert.equal(h.run('stageWorkforcePolicy(currentView(),selectedWorkforceRole,0,600000)'),true);
assert.match(h.elements.get('#planBudget').innerHTML,/Protected cash reserve \$600K/);
assert.equal(h.run('stageWorkforcePolicy(currentView(),selectedWorkforceRole,0,100000)'),true);
assert.equal(h.run('stageDepartmentPlan(currentView(),{...draft.departmentPolicy,reserve:500000},draft.leaderOrders)'),true);
assert.match(h.elements.get('#planBudget').innerHTML,/Protected cash reserve \$500K/);
assert.equal(h.run('stageDepartmentPlan(currentView(),{...draft.departmentPolicy,reserve:100000},draft.leaderOrders)'),true);
assert.match(h.elements.get('#planBudget').innerHTML,/\$419K/);
assert.equal(h.run('JSON.stringify(game)'),before);
for(const version of [0,4]){
 const old=harness();old.run("const opts="+(version?"E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options":"{}")+";game=E.createGame({...opts,mode:'hotseat',seed:'budget-legacy',created:1});seat=0;newDraft(currentView());renderPlanBudget(currentView());");
 assert(!old.elements.get('#planBudget').innerHTML.includes('Protected cash reserve'),'No lifecycle rule added to older campaigns');
}
console.log('PASS actual mature protected-budget display, actionable reserve/shortfall, explicit draft correction, render/accounting purity and earlier-campaign presentation.');
