'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');
let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){throw Error(name+': '+error.stack);}}
function fresh(version=7){const h=harness();h.run(`const opts=${version?`E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options`:'{}'};
 game=E.createGame({...opts,mode:'hotseat',seed:'bank-overview',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());
 function overviewFixture(){const v=currentView(),r=monthlyPlanReview(v);return {v,r,f:bankFinancialOverview(v,r)};}
 function overviewItems(){const {v,r,f}=overviewFixture();return bankAttentionItems(v,r,f);}
 `);return h;}
const bytes=h=>h.run('JSON.stringify({game,draft})'),render=h=>h.run('renderBankOverview(currentView(),monthlyPlanReview(currentView()));');
test('supported versions render actual money without writing books or constructing missing systems',()=>{
 for(const version of [0,1,2,3,4,5,6,7]){
  const h=fresh(version),before=bytes(h);render(h);assert.equal(bytes(h),before);
  assert.match(h.elements.get('#bankFinancialOverview').innerHTML,/WHAT THE NUMBERS MEAN/);
  assert.match(h.elements.get('#bankFinancialOverview').innerHTML,/Unavailable/,'opening operating result is not a fictitious zero');
  assert.equal(h.run('overviewFixture().f.cash'),h.run('currentView().me.stats.cash'));
  assert(h.run('overviewItems().some(x=>x.id===\'decision\')'));
  if(!version)assert(!h.run('overviewItems().some(x=>/applications|condition-|task-coverage/.test(x.id))'));
 }
});
test('spendable funds use the existing protected quote, never cash or future income',()=>{
 const h=fresh();h.run('draft.workforcePolicy.reserve=1000000;');
 const before=bytes(h);assert.equal(h.run('overviewFixture().f.room'),h.run('E.facilityLifecycleProtectedBudget(currentView().me,draft,E.planBudget(currentView().me,draft)).remaining'));
 assert.notEqual(h.run('overviewFixture().f.cash'),h.run('overviewFixture().f.room'));render(h);assert.equal(bytes(h),before);
 assert.match(h.elements.get('#bankFinancialOverview').innerHTML,/higher Workforce or department reserve/);
});
test('task alerts use individual dispatch shortfalls rather than allocation totals',()=>{
 const h=fresh(),expected=h.run('monthlyPlanReview(currentView()).functions.delivery.rows.filter(x=>x.planned.shortfall>0).length');
 assert(expected>0);assert.equal(h.run('monthlyPlanReview(currentView()).unallocated'),0);
 assert(h.run('overviewItems().some(x=>x.id===\'coverage\')'));assert(!h.run('overviewItems().some(x=>x.id===\'task-coverage\')'),'shared coverage warning is not duplicated');render(h);assert.match(h.elements.get('#attentionInbox').innerHTML,/quarter-work units uncovered/);
});
test('renewals are owner-only and application requests are not counted as owned deposits',()=>{
 const h=fresh();h.run(`const {v:alertView,r:alertReview,f:alertFinance}=overviewFixture();
 alertView.serviceAgreements=[{id:'own',owner:alertView.me.id,kind:'payroll',market:'downtown',due:alertView.cycle,misses:1},{id:'rival-secret',owner:'not-me',kind:'payroll',market:'downtown',due:alertView.cycle,misses:1},{id:'closed',owner:alertView.me.id,kind:'payroll',market:'downtown',due:alertView.cycle,misses:1,companyClosed:true}];
 alertView.me.onboarding={pending:[{count:3,expiresCycle:alertView.cycle+1},{count:99,expiresCycle:alertView.cycle+4}]};
 `);
 const rows=h.run('bankAttentionItems(alertView,alertReview,alertFinance)');
 assert(rows.some(x=>x.id==='renewal-own'));assert(rows.some(x=>x.id==='service-missed-own'));
 assert(!rows.some(x=>x.id.includes('rival-secret')||x.id.includes('closed')));
 assert.match(rows.find(x=>x.id==='applications').title,/^3 pending/);assert.match(rows.find(x=>x.id==='applications').text,/not owned deposits/);
});
test('financial losses are labeled by actual stage and missing deposit history is never fabricated',()=>{
 const h=fresh();h.run(`const {v:lossView,r:lossReview,f:lossFinance}=overviewFixture();
 lossFinance.operating={cycle:7,profit:25};lossFinance.bridge={available:true,cycle:7,change:-80,operatingProfit:25};
 lossView.cycle=8;lossView.trend=[{cycle:5,meDeposits:900},{cycle:7,meDeposits:800}];
 `);
 let rows=h.run('bankAttentionItems(lossView,lossReview,lossFinance)');assert(rows.some(x=>x.id==='earnings-loss'));assert(!rows.some(x=>x.id==='operating-loss'||x.id==='deposits-fell'));
 h.run('lossView.trend[0].cycle=6;');rows=h.run('bankAttentionItems(lossView,lossReview,lossFinance)');assert.match(rows.find(x=>x.id==='deposits-fell').text,/\$100 lower/);
});
test('physical critical condition uses the authored threshold and ignores closed sites',()=>{
 const h=fresh();h.run(`const {v:officeView,r:officeReview,f:officeFinance}=overviewFixture();const office=officeView.me.facilityNetwork.offices.find(x=>x.closedCycle===null);officeView.me.facilityLifecycle.records[office.id].conditionBp=E.FacilityLifecycle.RULES.criticalCondition;`);
 assert(h.run('bankAttentionItems(officeView,officeReview,officeFinance).some(x=>x.id===\'condition-\'+office.id)'));
 h.run('office.closedCycle=officeView.cycle;');assert(!h.run('bankAttentionItems(officeView,officeReview,officeFinance).some(x=>x.id===\'condition-\'+office.id)'));
});
test('filters and pagination retain every alert without rebuilding a business form',()=>{
 const h=fresh();h.run(`const {v:manyView,r:manyReview,f:manyFinance}=overviewFixture();manyReview.blockers=Array.from({length:26},(_,i)=>({id:'need-'+i,title:'Required '+i,text:'Review only',tab:'operations',target:'#staffGrid'}));
 bankOverviewState={owner:manyView.me.id,campaign:game,filter:'required',page:0};renderBankOverview(manyView,manyReview);`);
 assert.equal((h.elements.get('#attentionInbox').innerHTML.match(/data-attention-open=/g)||[]).length,10);assert.match(h.elements.get('#attentionInbox').innerHTML,/of 26/);
 h.run('bankOverviewState.page=2;renderBankOverview(manyView,manyReview);');assert.equal((h.elements.get('#attentionInbox').innerHTML.match(/data-attention-open=/g)||[]).length,6);
 h.run('manyView.me.id=\'different-owner\';renderBankOverview(manyView,manyReview);');assert.equal(h.run('bankOverviewState.filter'),'all');assert.equal(h.run('bankOverviewState.page'),0);
});
test('completed actuals and bank/group positions reconcile after real resolution',()=>{
 const h=fresh();h.run('const plans=game.players.map((p,i)=>E.chooseBot(game,i));E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);newDraft(currentView());');
 const before=bytes(h);render(h);assert.equal(bytes(h),before);
 assert.equal(h.run('overviewFixture().f.operating.profit'),h.run('currentView().me.operatingReport.profit'));
 assert.equal(h.run('overviewFixture().f.equity'),h.run('E.AccountingPrototype.check(currentView().me.accounting).equity'));
 assert.equal(h.run('overviewFixture().f.group.equity'),h.run('currentView().me.groupSummary.equity'));
 assert.match(h.elements.get('#bankFinancialOverview').innerHTML,/not this month’s group profit/);
});
test('rendered text is escaped, and overview models cannot inspect the rival',()=>{
 const h=fresh();h.run(`const {v:privateView,r:privateReview,f:privateFinance}=overviewFixture();
 Object.defineProperty(privateView,'rival',{get(){throw Error('Rival access forbidden here');}});
 privateView.me.capitalTier={key:'watch',name:'<img src=x onerror=bad>',text:'<private>'};
 bankAttentionItems(privateView,privateReview,privateFinance);renderBankOverview(privateView,privateReview);`);
 const html=h.elements.get('#attentionInbox').innerHTML;assert(!html.includes('<img'));assert.match(html,/&lt;img/);
});
test('real filter/review callbacks navigate without staging and reject stale owners',()=>{
 const h=fresh(),sets=new Map();
 h.c.document.querySelectorAll=selector=>{
  const attr={'[data-attention-filter]':['data-attention-filter','attentionFilter'],'[data-attention-open]':['data-attention-open','attentionOpen'],'[data-attention-page]':['data-attention-page','attentionPage']}[selector];
  if(!attr)return [];
  const html=h.elements.get('#attentionInbox')?.innerHTML||'';
  const buttons=[...html.matchAll(new RegExp(attr[0]+'="([^"]+)"','g'))].map(match=>({dataset:{[attr[1]]:match[1]},listeners:{},addEventListener(event,fn){this.listeners[event]=fn}}));
  sets.set(selector,buttons);return buttons;
 };
 const before=bytes(h);render(h);
 sets.get('[data-attention-filter]').find(x=>x.dataset.attentionFilter==='watch').listeners.click();assert.equal(h.run('bankOverviewState.filter'),'watch');assert.equal(bytes(h),before);
 sets.get('[data-attention-filter]').find(x=>x.dataset.attentionFilter==='required').listeners.click();
 const stale=sets.get('[data-attention-open]')[0];stale.listeners.click();assert.equal(h.run('workspaceTab'),'operations');assert.equal(bytes(h),before,'reviewing a reminder stages no orders');
 h.run('workspaceTab=\'overview\';seat=1;newDraft(currentView());');const other=bytes(h);stale.listeners.click();assert.equal(h.run('workspaceTab'),'overview');assert.equal(bytes(h),other);
});
console.log(JSON.stringify({suite:'usability-bank-overview',checks,scope:'Production owner-only attention and financial models; version omissions, quote/accounting purity, finite money, stage labels, recorded history, dispatch, renewals, applications, facility thresholds, pagination and escaping. Final browser/release acceptance remains separate.'}));
