'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
test('company loan inspector reviews, cancels and stages a validated owner-only queue with stale-event protection',()=>{
 const h=harness();
 h.run('game=E.createGame({...E.previewCampaignEdition({},"expanded").options,companyCreditVersion:1,mode:"hotseat",seed:"credit-queue",created:1});seat=0;gh.active=false;p2pRole="";');
 // Reuse the real paid-development plan, not a fabricated qualification/book.
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'company_credit_campaign.test.js'),'utf8');
 h.run('const copy=x=>JSON.parse(JSON.stringify(x));'+source.slice(source.indexOf('function plan('),source.indexOf('function check(')));
 h.run('for(let m=0;m<2;m++){E.submit(game,0,plan(game,0,"company:0"));E.submit(game,1,plan(game,1));}newDraft(currentView());draft=plan(game,0,"company:0");draft.companyCreditOrders=[];');
 h.run('mount=document.querySelector("#loanInspectorTest");mount.insertAdjacentHTML=(where,html)=>mount.innerHTML+=html;renderReady=()=>{mount.innerHTML="";renderCompanyCreditPanel(currentView(),currentView().me.companySnapshot.world.companies[0],mount);};renderReady();');
 const gameBefore=h.run('JSON.stringify(game)'),draftBefore=h.run('JSON.stringify(draft)');
 assert.match(h.elements.get('#loanInspectorTest').innerHTML,/Company working-capital loan/);
 assert(!/assessment only|<select/.test(h.elements.get('#loanInspectorTest').innerHTML));
 const click=id=>h.elements.get(id).listeners.click(),input=(id,value)=>{h.elements.get(id).value=value;h.elements.get(id).listeners.input();};
 input('#companyLoanAmount','-1');click('#companyLoanReview');assert.match(h.elements.get('#companyLoanStatus').textContent,/whole dollars/);assert(h.elements.get('#companyLoanStage').disabled);
 input('#companyLoanAmount','10000');input('#companyLoanRate','8.00');click('#companyLoanReview');
 assert.match(h.elements.get('#companyLoanReviewResult').innerHTML,/If all fund/);assert.match(h.elements.get('#companyLoanReviewResult').innerHTML,/cash to assets/);
 assert.equal(h.run('JSON.stringify(draft)'),draftBefore,'Review is not staging');assert.equal(h.run('JSON.stringify(game)'),gameBefore);
 click('#companyLoanCancel');assert.equal(h.run('JSON.stringify(draft)'),draftBefore,'Cancel leaves the plan unchanged');
 click('#companyLoanReview');click('#companyLoanStage');assert.equal(h.run('draft.companyCreditOrders.length'),1);
 assert.equal(h.run('draft.companyCreditOrders[0].principal'),10000);assert.equal(h.run('JSON.stringify(game)'),gameBefore);
 const staged=h.run('JSON.stringify(draft)');input('#companyLoanRate','9.00');click('#companyLoanCancel');assert.equal(h.run('JSON.stringify(draft)'),staged,'Cancel retains an already staged offer');
 const stale=h.elements.get('#companyLoanRemove').listeners.click;
 h.run('featureConnectionGeneration++');stale();assert.equal(h.run('JSON.stringify(draft)'),staged,'Reconnect invalidates old handlers');
 h.run('renderReady()');click('#companyLoanRemove');assert.equal(h.run('draft.companyCreditOrders.length'),0);
 h.run('renderReady()');click('#companyLoanReview');const stage=h.elements.get('#companyLoanStage').listeners.click;
 h.run('draft.hires=1');const changed=h.run('JSON.stringify(draft)');stage();assert.equal(h.run('JSON.stringify(draft)'),changed,'Review cannot stage over another plan change');
 h.run('draft.hires=0;renderReady()');click('#companyLoanReview');const locked=h.elements.get('#companyLoanStage').listeners.click;
 h.run('game.players[0].submitted=JSON.parse(JSON.stringify(draft))');const lockedGame=h.run('JSON.stringify(game)'),lockedDraft=h.run('JSON.stringify(draft)');locked();assert.equal(h.run('JSON.stringify(game)'),lockedGame);assert.equal(h.run('JSON.stringify(draft)'),lockedDraft);
 h.run('game.players[0].submitted=null;renderReady()');click('#companyLoanReview');click('#companyLoanStage');
 assert(!h.run('monthlyPlanReview(currentView()).blockers.some(b=>b.id==="company-credit")'));
 h.run('draft.companyCreditOrders[0].principal=999999999');assert(h.run('monthlyPlanReview(currentView()).blockers.some(b=>b.id==="company-credit"&&b.serviceId)'));
 h.run('draft.companyCreditOrders=[];renderReady()');click('#companyLoanReview');const oldSeat=h.elements.get('#companyLoanStage').listeners.click;
 const ownerDraft=h.run('JSON.stringify(draft)');h.run('seat=1');oldSeat();assert.equal(h.run('JSON.stringify(draft)'),ownerDraft,'A hotseat handoff cannot stage the previous owner loan');
 h.run('newDraft(currentView())');assert.equal(h.run('draft.companyCreditOrders.length'),0);
 assert.equal(h.run('monthlyChangeName(["companyCreditOrders"])'),'Company loan offers');
});
test('named-client financing assessment uses public company books without staging a fake loan',()=>{
 const h=harness();h.run('game=E.createGame({...E.previewCampaignEdition({},"expanded").options,companyCreditVersion:0,mode:"hotseat",seed:"company-credit-ui",created:1});seat=0;gh.active=false;p2pRole="";newDraft(currentView());mount=document.querySelector("#creditAssessmentTest");mount.insertAdjacentHTML=(where,html)=>mount.innerHTML+=html;');
 const before=h.run('JSON.stringify({game,draft})');
 for(let i=0;i<6;i++){
  h.c.companyIndex=i;h.run('mount.innerHTML="";renderCommercialAccountPanel(currentView(),currentView().serviceAgreements[companyIndex],mount);');
  const html=h.elements.get('#creditAssessmentTest').innerHTML;
  assert.match(html,/Company financing needs · assessment only/);assert.match(html,/not an application, approved loan or guaranteed demand/);assert.match(html,/Named-company loan funding is not available/);
  assert.match(html,/Existing company debt/);assert(!/data-company-loan|id="companyLoan/.test(html));
  const expected=h.run('E.CompanyCredit.assess(currentView().me.companySnapshot.world.companies[companyIndex])');
  h.c.needAmount=expected.requested;assert(html.includes(h.run('money(needAmount)')));
 }
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 h.run('company=JSON.parse(JSON.stringify(currentView().me.companySnapshot.world.companies[0]));company.resolution={month:1};closedHtml=companyCreditNeedContent(company)');
 assert.match(h.run('closedHtml'),/company has stopped trading/);
});
