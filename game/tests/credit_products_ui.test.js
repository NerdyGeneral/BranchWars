'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
test('expanded portfolio exposes five compact numeric allocations, useful terms and pure staged changes',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:12,created:1});seat=0;workspaceTab='credit';newDraft(currentView());renderReady=()=>{};renderProducts=()=>{};`);
 const original=h.run('JSON.stringify(game)'),html=h.run('groupCreditControls(currentView())');
 assert.equal((html.match(/data-credit-allocation=/g)||[]).length,5);assert.doesNotMatch(html,/<select/);assert.match(html,/Commercial real estate/);assert.match(html,/Small-business term lending/);assert.match(html,/Loan terms, existing exposure/);assert.match(html,/40%/);assert.match(html,/36 months/);
 const book=h.run('renderCreditBook(currentView())');assert.match(book,/Small-business term lending/);assert.doesNotMatch(book,/undefined/);
 h.run(`document.querySelector('#creditPanel').insertAdjacentHTML=function(where,html){this.innerHTML=html+this.innerHTML;};renderCollections(currentView());`);assert.match(h.elements.get('#creditPanel').innerHTML,/Commercial real estate/);
 h.run(`creditInputs=Object.entries(draft.groupPolicy.creditAllocation).map(([key,n])=>{const input=document.querySelector('#creditAllocation-'+key);input.dataset.creditAllocation=key;input.value=String(n);return input;});document.querySelectorAll=selector=>selector==='[data-credit-allocation]'?creditInputs:[];bindGroupCreditControls(currentView());`);
 const assign=(mortgage,smallBusiness,commercialProperty)=>{h.c.values={mortgage,smallBusiness,commercialProperty};h.run(`for(const input of creditInputs)if(values[input.dataset.creditAllocation]!==undefined)input.value=String(values[input.dataset.creditAllocation]);creditInputs[0].listeners.input();`);};
 assign(40,30,30);assert(h.elements.get('#applyCreditAllocation').disabled,'100% with invalid increments is still blocked');
 assign(0,50,50);assert(!h.elements.get('#applyCreditAllocation').disabled);h.elements.get('#applyCreditAllocation').listeners.click();assert.equal(h.run('draft.groupPolicy.creditAllocation.smallBusiness'),50);assert.equal(h.run('JSON.stringify(game)'),original);
 h.run('creditStale=document.querySelector("#applyCreditAllocation").listeners.click;seat=1;newDraft(currentView());creditStale();');assert.equal(h.run('draft.groupPolicy.creditAllocation.mortgage'),100,'Stale prior-owner controls cannot edit the next bank');
});
