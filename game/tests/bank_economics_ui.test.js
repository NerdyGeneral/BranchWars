'use strict';
process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./github_resilience.test');
test('recruitment, specialist pay and staged payroll use the campaign salary without changing the plan',()=>{
 for(const edition of ['core','expanded'])for(const enabled of [false,true]){
  const h=harness();
  h.run(`const original=document.querySelector;document.querySelector=selector=>{const el=original(selector);el.querySelector=s=>document.querySelector(s);el.addEventListener=function(event,fn){this.listeners[event]=fn};el.remove=()=>{el.innerHTML=''};el.insertAdjacentHTML=(position,html)=>{el.innerHTML+=html};return el};`);
  h.run(`game=E.createGame({...E.previewCampaignEdition({},'${edition}',{currentReporting:true}).options,commercialServiceVersion:1,...('${edition}'==='expanded'?{creditWorkloadVersion:1}:{}),...(${enabled}?{bankEconomicsVersion:1}:{}),mode:'hotseat',seed:'salary-ui',created:1});seat=0;p2pRole='';gh.active=false;newDraft(currentView());draft.hires=1;`);
  const payroll=enabled?12000:18000;assert.equal(h.run('E.bankBasePayroll(currentView().me)'),payroll);
  assert.equal(h.run('E.planBudget(currentView().me,draft,currentView()).basePayrollAdded'),payroll);
  h.run('saved=JSON.stringify({game,draft});renderProjects(currentView())');
  assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));
  const html=[...h.elements.values()].map(el=>el.innerHTML||'').join('\n');
  if(edition==='core')assert(html.includes(h.run('"generalist payroll +"+money(E.bankBasePayroll(currentView().me))')),'Core staged generalist cost');
  if(edition==='expanded'){
   h.run('workspaceTab="workforce";renderPeopleRecruitment(currentView());renderWorkforce(currentView())');
   assert.match(h.elements.get('#peopleRecruitment').innerHTML,new RegExp('base pay \\$'+payroll.toLocaleString('en-US')+'/month'));
   assert(h.elements.get('#workforcePanel').innerHTML.includes(h.run('"Ongoing pay: "+money(E.bankBasePayroll(currentView().me))+" base"')));
   assert.equal(h.run('JSON.stringify({game,draft})'),h.run('saved'));
  }
 }
});
