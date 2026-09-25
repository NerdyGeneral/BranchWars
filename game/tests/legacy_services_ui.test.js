'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),test=require('node:test'),{groupHarness}=require('./group_ui_harness');
function setup(expanded=false){const h=groupHarness();h.run(`game=E.createGame({...${expanded?"E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true}).options":"{campaignRulesVersion:1}"},mode:'hotseat',seed:'legacy-service-review',created:1});seat=0;workspaceTab='markets';newDraft(currentView());resetMarketWorkspace(currentView());v=currentView();before=JSON.stringify({game,draft});document.querySelector('#pipeline').innerHTML='';renderExpandedServices(v);`);return h;}
test('legacy directory renders six real agreements without inventing company profiles',()=>{
 const h=setup(),html=h.elements.get('#pipeline').innerHTML;
 assert.equal((html.match(/data-service-inspect=/g)||[]).length,6);assert.match(html,/Downtown client/);
 assert.equal(h.run('v.serviceAgreements.every(c=>c.clientIndex===undefined)'),true);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
});
test('legacy inspection renders capacity choices and explains absent profiles',()=>{
 const h=setup();h.run(`serviceWorkspace.id=v.serviceAgreements[0].id;document.querySelector('#serviceInspectorMount').innerHTML='';renderServiceAgreementInspector(v,document.querySelector('#serviceInspectorMount'));`);
 const html=h.elements.get('#serviceInspectorMount').innerHTML;
 assert.match(html,/Downtown client/);assert.match(html,/without a named-company profile/);assert.match(html,/data-agreement-staff=/);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
});
test('legacy bid review uses a real affordable delivery option and remains reversible',()=>{
 const h=setup();h.run(`const id=v.serviceAgreements[0].id;const q=serviceAgreementOptions(v,draft,id);let proposal;for(const choice of q.options){try{proposal=buildServiceAgreementProposal(v,draft,q,choice);break;}catch(error){}}if(!proposal)throw Error('No valid legacy proposal');legacyProposal=proposal;`);
 assert.match(h.run('legacyProposal.effects.join(" ")'),/Downtown client/);
 assert.equal(h.run('legacyProposal.candidate.contractBid'),h.run('v.serviceAgreements[0].id'));
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
 h.run(`requestServiceAgreement(v,legacyProposal.agreement.id,{staff:legacyProposal.choice.staff,outsourcing:legacyProposal.choice.outsourcing});`);
 assert.equal(h.run('!!serviceWorkspace.pending'),true);
 h.run('cancelServiceAgreement();');assert.equal(h.run('serviceWorkspace.pending'),null);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
});
test('Expanded retains its authored profiles and invalid explicit indices are not disguised',()=>{
 const h=setup(true);assert.equal(h.run('v.serviceAgreements.every(c=>JSON.stringify(serviceClientPresentation(v,c))===JSON.stringify(E.clientProfile(c)))'),true);
 assert.equal(h.run('JSON.stringify({game,draft})'),h.run('before'));
 assert.throws(()=>h.run('serviceClientPresentation(v,{...v.serviceAgreements[0],clientIndex:999})'),/Invalid service client profile/);
});
