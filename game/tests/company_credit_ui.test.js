'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
test('named-client financing assessment uses public company books without staging a fake loan',()=>{
 const h=harness();h.run('game=E.createGame({...E.previewCampaignEdition({},"expanded").options,mode:"hotseat",seed:"company-credit-ui",created:1});seat=0;gh.active=false;p2pRole="";newDraft(currentView());mount=document.querySelector("#creditAssessmentTest");mount.insertAdjacentHTML=(where,html)=>mount.innerHTML+=html;');
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
