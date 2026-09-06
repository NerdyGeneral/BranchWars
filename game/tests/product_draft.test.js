'use strict';

// Exercise the shipped browser handlers; reducing a draft is not a new order.
const assert = require('node:assert/strict');
const {harness} = require('./github_resilience.test.js');
const copy = value => JSON.parse(JSON.stringify(value));
const options = {
  productProgramsVersion: 1, segmentDepositsVersion: 1, creditPerformanceVersion: 1,
  customerOwnershipVersion: 1, workforceVersion: 1, customerDemandVersion: 2,
  managementVersion: 2, serviceExpansionVersion: 1, campaignRulesVersion: 1,
  mode: 'hotseat', seed: 42, created: 1
};
function setup() {
  const h = harness();
  h.c.options = options;
  h.run("game=E.createGame(options);seat=0;workspaceTab='products';newDraft(E.publicState(game,0));draft.decision='b';" +
    'renderProducts=()=>{};renderProjects=()=>{};renderProductPrograms=()=>{};' +
    'renderPlanBudget=()=>{};renderOperatingPreview=()=>{};renderCompetitiveActions=()=>{};' +
    'renderWorkforce=()=>{};renderPipeline=()=>{};');
  return h;
}
const h = setup();
h.run("draft.allocation={service:2,business:2,lending:2,operations:2};toggleInitiative('marketing',E.publicState(game,0))");
assert(h.run("toggleProductDevelopment(E.publicState(game,0),'licenseRewards')"));
assert(h.run("toggleProductDevelopment(E.publicState(game,0),'licenseHighYield')"));
assert(h.run('E.projectPlanStatus(game.players[0],draft).eligible'));
// The normal staff steppers allow reallocation after initiatives are selected.
h.run('draft.allocation={service:4,business:2,lending:2,operations:0};renderReady(E.publicState(game,0))');
assert.equal(h.run('E.projectPlanStatus(game.players[0],draft).code'), 'capacity');
assert(h.elements.get('#readyBtn').disabled);
assert(h.run("toggleProductDevelopment(E.publicState(game,0),'licenseRewards')"), 'first removal must work even when a second removal is still needed');
assert.deepEqual(copy(h.run('draft.newProjects')), ['marketing', 'licenseHighYield']);
assert(h.elements.get('#readyBtn').disabled, 'partial repair must not permit submission');
assert(h.run("toggleProductDevelopment(E.publicState(game,0),'licenseHighYield')"));
assert.deepEqual(copy(h.run('draft.newProjects')), ['marketing']);
assert.equal(h.elements.get('#readyBtn').disabled, false);
const valid = h.run('JSON.stringify(draft)');
assert.equal(h.run("toggleProductDevelopment(E.publicState(game,0),'licenseRewards')"), false, 'new capacity commitments remain validated');
assert.equal(h.run('JSON.stringify(draft)'), valid);
assert.equal(h.run("stageProductProgramme(E.publicState(game,0),next=>{next.productProgramPolicy.markets.downtown.everyday={essential:0,rewards:0,highYield:0}},{allowDecommit:true})"), false, 'decommit must not bypass product normalization');
assert.equal(h.run('JSON.stringify(draft)'), valid);

const r = setup();
r.run("E.finishProject(game,game.players[0],{key:'licenseRewards'});newDraft(E.publicState(game,0));draft.decision='b'");
assert(r.run("toggleProductRetirement(E.publicState(game,0),'rewards')"));
r.run('draft.hires=6;draft.investments={network:100000};renderReady(E.publicState(game,0))');
assert(!r.run('E.projectPlanStatus(game.players[0],draft).eligible'));
assert(r.run("toggleProductRetirement(E.publicState(game,0),'rewards')"), 'retirement cancellation is allowed while other spending still exceeds the budget');
assert.deepEqual(copy(r.run('draft.productProgramPolicy.retire')), []);
assert(r.elements.get('#readyBtn').disabled);
assert.equal(r.run("toggleProductRetirement(E.publicState(game,0),'rewards')"), false, 'new retirement costs remain validated');
assert.deepEqual(copy(r.run('draft.productProgramPolicy.retire')), []);
const before = r.run('JSON.stringify(draft)');
r.run('view=E.publicState(game,0);view.me.submitted=true');
assert.equal(r.run("toggleProductDevelopment(view,'licenseHighYield')"), false);
assert.equal(r.run('JSON.stringify(draft)'), before, 'locked plans cannot be altered');
console.log('Product draft checks passed: incremental capacity decommit, budget-safe retirement cancellation, addition/target validation, Ready gating and sealed-plan locks.');
