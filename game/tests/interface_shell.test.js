'use strict';
// Real source engine/client with a minimal DOM contract. These checks cover
// routing, projection, and draft ownership; browser layout is tested separately.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test');
const {harness}=require('./github_resilience.test');
function fresh(modern=false){
 const h=harness(),query=h.c.document.querySelector;
 h.c.document.querySelector=selector=>{
  const el=query(selector);if(el.shellFixture)return el;el.shellFixture=true;
  const classes=new Set();el.classList={add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){if(on===undefined)on=!classes.has(k);on?classes.add(k):classes.delete(k);}};
  el.querySelectorAll=()=>[];el.appendChild=child=>{child.parentElement=el;};el.insertBefore=child=>{child.parentElement=el;};el.remove=()=>{};el.insertAdjacentHTML=(_,html)=>{el.innerHTML+=html;};return el;
 };
 h.c.document.body={classList:{add(){},remove(){}}};h.c.requestAnimationFrame=fn=>fn();h.c.window.scrollTo=()=>{};h.c.window.scrollY=0;
 h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true}).options,startingWorkforce:'covered',mode:'hotseat',seed:'interface-shell',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());draft.decision='b';interfaceIdentity(currentView());renderReady=()=>{};reconcileGameHelp=()=>{};`);
 if(modern)h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true}).options,startingWorkforce:'covered',mode:'hotseat',seed:'interface-shell-current',created:1});newDraft(currentView());draft.decision='b';interfaceIdentity(currentView());`);
 return h;
}
const value=(h,s)=>JSON.parse(h.run('JSON.stringify('+s+')'));
function review(h){h.run(`shellReview=monthlyPlanReview(currentView());shellFacts=bankFinancialOverview(currentView(),shellReview);renderInterfaceReview(currentView(),{workspace:'review',view:'plan',context:{}},$('#interfaceReview'),shellReview,shellFacts);`);return h.elements.get('#interfaceReview');}
function event(attribute,index){return {target:{closest:()=>({hasAttribute:name=>name===attribute,dataset:{interfaceRemove:String(index),interfaceEdit:String(index)}})}};}

test('grouped agency funding removal restores only changed funding fields and preserves employee/business edits',()=>{
 const h=fresh(),before=h.run('JSON.stringify(game)');
 h.run(`draft.agencyPolicy.capital=10000;draft.agencyPolicy.supportCap=20000;draft.agencyPolicy.roles.agent=1;draft.agencyPolicy.outreach=2;draft.depositPolicy='growth';selectedRow=interfacePlanRows(currentView()).find(r=>r.title==='Insurance agency · funding and launch');`);
 assert(h.run('!!selectedRow'));assert(h.run('interfaceRestorePlanRow(currentView(),selectedRow)'));
 assert.equal(h.run('draft.agencyPolicy.capital'),h.run('monthlyChangesState.baseline.agencyPolicy.capital'));assert.equal(h.run('draft.agencyPolicy.supportCap'),h.run('monthlyChangesState.baseline.agencyPolicy.supportCap'));
 assert.equal(h.run('draft.agencyPolicy.roles.agent'),1);assert.equal(h.run('draft.agencyPolicy.outreach'),2);assert.equal(h.run('draft.depositPolicy'),'growth');assert.equal(h.run('JSON.stringify(game)'),before);
});

test('per-client array removal preserves all other current clients and unrelated command kinds',()=>{
 const h=fresh();h.run(`draft.investmentPolicy.funding=[{clientId:'client-a',amount:100},{clientId:'client-b',amount:200}];draft.investmentPolicy.trades=[{clientId:'client-a',amount:300}];selectedRow=interfacePlanRows(currentView()).find(r=>r.array?.path[1]==='funding'&&r.array.id==='client-a');draft.investmentPolicy.funding.push({clientId:'client-c',amount:400});`);
 assert(h.run('interfaceRestorePlanRow(currentView(),selectedRow)'));assert.deepEqual(value(h,'draft.investmentPolicy.funding'),[{clientId:'client-b',amount:200},{clientId:'client-c',amount:400}]);assert.deepEqual(value(h,'draft.investmentPolicy.trades'),[{clientId:'client-a',amount:300}]);
});

test('removing a selected initiative preserves other current initiatives and targets',()=>{
 const h=fresh();h.run(`draft.newProjects=['branch','digital'];draft.newProject='branch';draft.projectTargets={branch:'downtown',digital:'northside'};selectedRow=interfacePlanRows(currentView()).find(r=>r.initiative&&r.path[1]==='branch');draft.projectTargets.digital='harbor';draft.depositPolicy='growth';`);
 assert(h.run('interfaceRestorePlanRow(currentView(),selectedRow)'));assert.deepEqual(value(h,'draft.newProjects'),['digital']);assert.equal(h.run('draft.newProject'),'digital');assert.deepEqual(value(h,'draft.projectTargets'),{digital:'harbor'});assert.equal(h.run('draft.depositPolicy'),'growth');
});

test('object review rows use actual finance record IDs and client editor modes',()=>{
 const h=fresh();h.run(`draft.investmentPolicy.institution.capital=1000;draft.investmentPolicy.institution.advisory=true;draft.investmentPolicy.cashOrders=[{clientId:'client-a',amount:100}];draft.companyCreditOrders=[{companyId:'company-a',amount:100}];draft.companyShareOrders=[{issuer:'company-a',amount:100}];rows=interfacePlanRows(currentView());`);
 assert.equal(h.run(`rows.find(r=>r.title==='Investment services · funding and launch').route.context.objectId`),'funding');assert.equal(h.run(`rows.find(r=>r.title==='Investment services · business permissions and fees').route.context.objectId`),'operations');
 assert.equal(h.run(`rows.find(r=>r.array?.path[1]==='cashOrders').route.context.mode`),'cash');assert.equal(h.run(`rows.find(r=>r.array?.path[0]==='companyCreditOrders').route.context.objectId`),'company:company-a');assert.equal(h.run(`rows.find(r=>r.array?.path[0]==='companyShareOrders').route.context.mode`),'shares');
});

test('generic Review edits resolve exact finance and staff editors instead of default records',()=>{
 const h=fresh(),route=(path,after)=>{h.c.routeFixture={path,after};return value(h,'interfaceChangeRoute(currentView(),routeFixture)');};
 assert.equal(route(['treasuryPolicy']).context.objectId,'investments');assert.equal(route(['capitalAction']).context.objectId,'board');assert.equal(route(['capitalPolicy']).context.objectId,'liquidity');
 assert.equal(route(['collectionsPolicy']).context.objectId,'collections');assert.equal(route(['lendingPolicy']).context.objectId,'standards');
 assert.deepEqual(route(['departmentFunctionsPolicy','quotas','credit','risk']),{workspace:'people',view:'coverage',context:{functionId:'credit'}});
 assert.deepEqual(route(['workforcePolicy','training','risk']),{workspace:'people',view:'training',context:{role:'risk'}});
 assert.deepEqual(route(['facilityLifecyclePolicy','offices','office-a','hubId'],'office-b'),{workspace:'markets',view:'maintenance',context:{office:'office-a'}});
 assert.deepEqual(route(['investmentPolicy','market'],'downtown'),{workspace:'group',view:'investment',context:{objectId:'development'}});
 assert.deepEqual(route(['investmentPolicy','inventorySale'],1000),{workspace:'banking',view:'treasury',context:{objectId:'securities-offer'}});
 h.run(`draft.groupPolicy.creditAllocation.mortgage=(draft.groupPolicy.creditAllocation.mortgage||0)+1;`);
 assert.equal(h.run(`interfacePlanRows(currentView()).find(r=>r.path[0]==='groupPolicy'&&r.path[1]==='creditAllocation').route.context.objectId`),'portfolio');
});

test('Review returns extension, fit-out, mandate and renewal changes to their focused editors',()=>{
 const h=fresh(),route=(path,after)=>{h.c.routeFixture={path,after};return value(h,'interfaceChangeRoute(currentView(),routeFixture)');};
 h.run(`office=currentView().me.facilityNetwork.offices[0];draft.facilityExtensionPolicy={start:office.id,cancel:null};draft.sharedPremisesPolicy.build={office:office.id,kind:'visiting'};`);
 assert.deepEqual(route(['facilityExtensionPolicy','start'],h.run('office.id')),{workspace:'markets',view:'suite',context:{office:h.run('office.id')}});
 const room=route(['sharedPremisesPolicy','build'],h.run('draft.sharedPremisesPolicy.build'));assert.equal(room.view,'room');assert.equal(room.context.office,h.run('office.id'));assert.equal(room.context.kind,'visiting');
 assert.deepEqual(route(['management','delivery','mode'],'inhouse'),{workspace:'people',view:'coverage',context:{functionId:'delivery'}});
 assert.deepEqual(route(['management','research','budget'],1000),{workspace:'strategy',view:'mandates',context:{}});
 assert.deepEqual(route(['contractExit'],'agreement-a'),{workspace:'banking',view:'services',context:{agreementId:'agreement-a',mode:'renewal'}});
 const licensed=route(['newProjects','licenseRewards'],true);assert.equal(licensed.view,'deposits');assert.equal(licensed.context.productId,'rewards');assert.equal(licensed.context.projectId,'licenseRewards');assert.equal(licensed.context.mode,'delivery');
});

test('product and company-control object rows retain precise subjects and array order identities',()=>{
 const h=fresh();h.run(`draft.productProgramPolicy.pricingBp.essential=(draft.productProgramPolicy.pricingBp.essential||0)+5;draft.productProgramPolicy.retire=['rewards'];draft.companyControlPolicy.diligence='company-a';draft.companyControlPolicy.consents=[{offerId:'offer-a',shares:1}];draft.companyControlPolicy.paused=['offer-b'];routeView=currentView();routeView.companyControlSnapshot={offers:[{offer:{id:'offer-a',issuer:'company-a'}},{offer:{id:'offer-b',issuer:'company-b'}}]};controlRows=interfacePlanRows(routeView);`);
 const rows=value(h,`controlRows.map(row=>({path:row.path,route:interfaceChangeRoute(routeView,row),array:row.array&&{id:row.array.id}}))`),find=path=>rows.find(r=>JSON.stringify(r.path)===JSON.stringify(path));
 assert.deepEqual(find(['productProgramPolicy','pricingBp','essential']).route,{workspace:'banking',view:'deposits',context:{productId:'essential',mode:'terms'}});
 assert.deepEqual(find(['productProgramPolicy','retire']).route,{workspace:'banking',view:'deposits',context:{productId:'rewards',mode:'delivery',projectId:'retire'}});
 assert.deepEqual(find(['companyControlPolicy','diligence']).route,{workspace:'group',view:'companies',context:{companyId:'company-a',mode:'control',controlMode:'diligence'}});
 assert.deepEqual(find(['companyControlPolicy','consents']).route,{workspace:'group',view:'companies',context:{companyId:'company-a',mode:'control',controlMode:'incoming:offer-a'}});assert.equal(find(['companyControlPolicy','consents']).array.id,'offer-a');
 assert.deepEqual(find(['companyControlPolicy','paused']).route,{workspace:'group',view:'companies',context:{companyId:'company-b',mode:'control',controlMode:'deal:offer-b'}});assert.equal(find(['companyControlPolicy','paused']).array.id,'offer-b');
});

test('same-month guest snapshots preserve route, return trail, and working decision but invalidate old write callbacks',()=>{
 const h=fresh();h.run(`view=E.publicState(game,0);game=null;p2pRole='guest';newDraft(currentView());draft.decision='b';interfaceIdentity(currentView());renderExpandedInterface=()=>{interfaceIdentity(currentView());};openInterfaceWorkspace('markets','maintenance',{office:'office-a',market:'downtown'});interfaceDecisionForm(currentView()).value='a';interfaceState.decision.dirty=true;interfaceNavigate({workspace:'banking',view:'treasury',context:{objectId:'liquidity'}});oldToken=interfaceToken(currentView());`);
 // The shared network harness stubs render. Restore the actual production
 // redraw wrapper, including its Core tail, so this catches navigation resets.
 const html=process.argv.includes('--portable')?require('node:fs').readFileSync(require('node:path').join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
 h.run('renderBankIdentity=()=>{};'+html.match(/const renderBase=render;(render=function\(\)[^\r\n]+)/)[1]);
 const plan=h.run('JSON.stringify(draft)');h.run(`view=JSON.parse(JSON.stringify(view));view.rival.submitted=true;render();`);
 assert.deepEqual(value(h,'interfaceCurrentRoute()'),{workspace:'banking',view:'treasury',context:{objectId:'liquidity'}},'The full redraw after a rival update must retain the selected inspector');
 assert.equal(h.run('interfaceCurrent(oldToken)'),false);assert.equal(h.run('interfaceCurrent(oldToken,false)'),true);assert.equal(h.run('interfaceState.decision.value'),'a');assert.equal(h.run('interfaceState.decision.dirty'),true);assert(h.run('interfaceReturn()'));assert.deepEqual(value(h,'interfaceCurrentRoute()'),{workspace:'markets',view:'maintenance',context:{office:'office-a',market:'downtown'}});assert.equal(h.run('JSON.stringify(draft)'),plan);
 h.run('connectionAttempt++;interfaceIdentity(currentView());');assert.equal(h.run('interfaceState.trail.length'),0);assert.equal(h.run('interfaceState.decision'),null);
});

test('Review rejects removal from an old snapshot or an obsolete draft rendering',()=>{
 const h=fresh();h.run(`view=E.publicState(game,0);game=null;p2pRole='guest';newDraft(currentView());draft.decision='b';interfaceIdentity(currentView());draft.depositPolicy='growth';`);let box=review(h),stale=box.onclick,index=h.run(`interfacePlanRows(currentView()).findIndex(r=>r.path[0]==='depositPolicy')`);assert(index>=0);
 h.run('view=JSON.parse(JSON.stringify(view));view.rival.submitted=true;');let plan=h.run('JSON.stringify(draft)');stale(event('data-interface-remove',index));assert.equal(h.run('JSON.stringify(draft)'),plan);
 box=review(h);stale=box.onclick;h.run('draft.hires=1');plan=h.run('JSON.stringify(draft)');stale(event('data-interface-remove',index));assert.equal(h.run('JSON.stringify(draft)'),plan);
 box=review(h);index=h.run(`interfacePlanRows(currentView()).findIndex(r=>r.path[0]==='depositPolicy')`);box.onclick(event('data-interface-remove',index));assert.equal(h.run('draft.depositPolicy'),h.run('monthlyChangesState.baseline.depositPolicy'));assert.equal(h.run('draft.hires'),1);
});

test('unavailable authoritative quote is explicit in the header and Review without false zero commitments',()=>{
 const h=fresh(),plan=h.run('JSON.stringify(draft)'),world=h.run('JSON.stringify(game)');h.run(`interfaceState.route={workspace:'review',view:'plan',context:{}};failedReview={quote:null,blockers:[{id:'quote',title:'Quote unavailable',text:'Fixture quote is unavailable.'}],warnings:[]};renderExpandedInterface(currentView(),failedReview);`);
 const header=h.elements.get('#interfaceHeader').innerHTML,html=h.elements.get('#interfaceReview').innerHTML;assert.match(header,/Available to spend<\/span><strong[^>]*>Unavailable/);assert.match(header,/Planned commitments<\/span><strong>Unavailable/);assert.match(html,/Quote unavailable/);assert.match(html,/Fixture quote is unavailable/);assert(h.elements.get('#readyBtn').disabled);assert.equal(h.run('JSON.stringify(draft)'),plan);assert.equal(h.run('JSON.stringify(game)'),world);
});

test('recurring rows match authoritative engine values, keep future additions separate, and are pure',()=>{
 const h=fresh();h.run(`draft.hires=1;draft.specialistHires.operations=1;draft.newProjects=['branchAtm'];draft.newProject='branchAtm';draft.projectTargets={branchAtm:draft.focus};recurringBudget=E.planBudget(currentView().me,draft,currentView());recurringExpected=E.operatingPreview(currentView().me,draft,currentView().economy,currentView(),true);`);
 const world=h.run('JSON.stringify(game)'),plan=h.run('JSON.stringify(draft)');h.run(`recurringRows=interfaceRecurringCommitments(currentView(),recurringBudget);`);
 for(const [label,key]of [['Bank employee base payroll','incomeSource_basePayroll'],['Bank specialist premiums','specialistPayroll'],['Bank office upkeep','incomeSource_facilityUpkeep'],['Bank office maintenance','facilityMaintenance'],['Bank deposit / debt funding expense','fundingCost']]){h.c.recurringLabel=label;h.c.recurringKey=key;assert.equal(h.run('recurringRows.find(r=>r.title===recurringLabel).value'),h.run('recurringExpected[recurringKey]'),label);}
 assert.equal(h.run(`recurringRows.find(r=>r.title==='New bank employees · base payroll').value`),h.run('recurringBudget.basePayrollAdded'));
 assert.equal(h.run(`recurringRows.find(r=>r.title==='New bank specialists · payroll premiums').value`),h.run('recurringBudget.specialistPayrollAdded'));
 assert.equal(h.run(`recurringRows.find(r=>r.title.startsWith(currentView().projects.branchAtm.name+' · ')).value`),h.run(`E.regionalProjectPreview(currentView().me,'branchAtm',draft.focus).expense`));
 assert.match(h.run('interfaceRecurringMarkup(currentView(),recurringBudget)'),/different timing and payers/);assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('JSON.stringify(draft)'),plan);
});

test('recurring failed and missing quotations remain Unavailable rather than plausible zeroes',()=>{
 const h=fresh();h.run(`draft.hires=1;E.operatingPreview=()=>{throw Error('Forecast unavailable for fixture');};E.departmentBudgetQuote=()=>{throw Error('Leadership quote unavailable for fixture');};missingRows=interfaceRecurringCommitments(currentView(),null);`);
 const rows=value(h,'missingRows');assert(rows.length>=6);assert(rows.every(r=>r.value===null));assert(rows.slice(0,5).every(r=>r.error==='Forecast unavailable for fixture'));
 const markup=h.run('interfaceRecurringMarkup(currentView(),null)');assert.match(markup,/Forecast unavailable for fixture/);assert.match(markup,/Unavailable/);assert.doesNotMatch(markup,/>\$0</);
});

test('Core restoration returns shared controls to their original parents and visibility',()=>{
 const h=fresh();h.run(`originalHome=$('#legacyReadyParent');originalSibling=$('#legacySibling');originalSibling.parentElement=originalHome;$('#readyBtn').parentElement=originalHome;$('#readyBtn').nextSibling=originalSibling;$('#readyBtn').hidden=true;interfaceMountPanel('readyBtn','interfaceSubmitActions');$('#gameScreen').classList.add('interface-enabled');interfaceRestoreCore();`);
 assert(h.run(`$('#readyBtn').parentElement===originalHome`));assert.equal(h.run(`$('#readyBtn').hidden`),true);assert.equal(h.run(`$('#expandedInterface').hidden`),true);assert.equal(h.run(`$('#gameScreen').classList.contains('interface-enabled')`),false);
});

test('score ticker uses final recorded closes, not early scoreDelta, current unlock changes or working plans',()=>{
 const h=fresh();h.run(`scoreView=currentView();scoreView.trend=[{cycle:0,meScore:100,rivalScore:200},{cycle:1,meScore:120,rivalScore:180}];scoreView.me.score=130;scoreView.rival.score=170;scoreView.scoreDelta={me:999,rival:-999};`);
 const before=h.run('JSON.stringify([game,draft,scoreView])');
 assert.deepEqual(value(h,`interfaceTickerQuote(scoreView,'me')`),{price:12,previous:10,change:2,cycle:1,previousCycle:0});
 assert.deepEqual(value(h,`interfaceTickerQuote(scoreView,'rival')`),{price:18,previous:20,change:-2,cycle:1,previousCycle:0});
 const html=h.run('interfaceTickerMarkup(scoreView)');assert.match(html,/month 1 close/);assert.match(html,/\+\$2.00/);assert.match(html,/−\$2.00/);assert.match(html,/aria-hidden="true"/);assert.match(html,/Pause ticker/);
 assert.equal(h.run('JSON.stringify([game,draft,scoreView])'),before);
});

test('score chart preserves real sparse months, escapes names, and explicitly handles ties and absent history',()=>{
 const h=fresh();h.run(`scoreView=currentView();scoreView.me.name='<img src=x onerror=bad>';scoreView.me.score=100;scoreView.rival.score=100;scoreView.trend=[{cycle:0,meScore:90,rivalScore:110},{cycle:2,meScore:100,rivalScore:100}];`);
 let html=h.run('interfaceRankingsMarkup(scoreView)');assert.match(html,/Banks are tied/);assert.equal((html.match(/Joint #1/g)||[]).length,2);assert.match(html,/&lt;img src=x onerror=bad&gt;/);assert.doesNotMatch(html,/<img src=x/);assert.match(html,/Month 2/);assert.doesNotMatch(html,/Month 1/);assert.match(html,/Solid line/);assert.match(html,/Dashed line/);
 h.run('scoreView.trend=[]');html=h.run('interfaceRankingsMarkup(scoreView)');assert.match(html,/history is unavailable/);assert.doesNotMatch(html,/<svg class="interface-rank-chart"/);
 assert.deepEqual(value(h,`interfaceTickerQuote(scoreView,'me')`),{price:10,previous:null,change:null,cycle:null,previousCycle:null});
});

test('score history and ticker remain deterministic for owner swaps, negative values and malformed points',()=>{
 const h=fresh(),before=h.run('JSON.stringify([game,draft])');h.run(`a=E.publicState(game,0);b=E.publicState(game,1);`);
 assert.deepEqual(value(h,`interfaceTickerQuote(a,'me')`),value(h,`interfaceTickerQuote(b,'rival')`));assert.deepEqual(value(h,`interfaceTickerQuote(a,'rival')`),value(h,`interfaceTickerQuote(b,'me')`));
 h.run(`a.trend=[{cycle:3,meScore:-20,rivalScore:0},{cycle:2,meScore:NaN,rivalScore:1},{cycle:0,meScore:0,rivalScore:5}];`);
 assert.deepEqual(value(h,'interfaceScoreHistory(a).map(x=>x.cycle)'),[0,3]);assert.equal(h.run(`interfaceTickerQuote(a,'me').price`),.01);assert.equal(h.run(`interfaceTickerQuote(a,'rival').price`),.01);
 assert.doesNotMatch(h.run('interfaceRankingsMarkup(a)'),/NaN|Infinity/);assert.equal(h.run('JSON.stringify([game,draft])'),before);
});

test('ticker reduced motion and unavailable scores remain explicit without fabricated change',()=>{
 const h=fresh();h.c.window.matchMedia=()=>({matches:true});h.run(`scoreView=currentView();scoreView.trend=[];scoreView.me.score=null;`);
 const html=h.run('interfaceTickerMarkup(scoreView)');assert.match(html,/Motion off/);assert.doesNotMatch(html,/id="interfaceTickerPause"/);assert.match(html,/Score unavailable/);assert.match(html,/Unavailable/);assert.equal(h.run(`interfaceTickerQuote(scoreView,'me').price`),null);
});

test('unopened agency expansion is one removable instruction including its dependent staffing',()=>{
 const h=fresh();h.run(`draft.agencyPolicy.launch=true;draft.agencyPolicy.capital=200000;draft.agencyPolicy.roles.propertyProducer=1;draft.agencyPolicy.outreach=1;draft.depositPolicy='growth';expansionRows=interfacePlanRows(currentView()).filter(r=>r.path[0]==='agencyPolicy');`);
 assert.equal(h.run('expansionRows.length'),1);assert.equal(h.run('expansionRows[0].route.context.objectId'),'funding');assert.match(h.run('expansionRows[0].title'),/expansion/);assert(h.run('interfaceRestorePlanRow(currentView(),expansionRows[0])'));
 assert.deepEqual(value(h,'draft.agencyPolicy'),value(h,'monthlyChangesState.baseline.agencyPolicy'));assert.equal(h.run('draft.depositPolicy'),'growth');
});

test('unopened brokerage expansion removal restores institution setup and retains unrelated orders',()=>{
 const h=fresh();h.run(`draft.investmentPolicy.institution.launch=true;draft.investmentPolicy.institution.capital=300000;draft.investmentPolicy.institution.brokerage=true;draft.investmentPolicy.institution.roles.broker=1;draft.investmentPolicy.institution.roles.principal=1;draft.hires=1;draft.investmentPolicy.inventorySale=1000;expansionRows=interfacePlanRows(currentView()).filter(r=>r.path[0]==='investmentPolicy'&&r.path[1]==='institution');`);
 assert.equal(h.run('expansionRows.length'),1);assert.equal(h.run('expansionRows[0].route.context.objectId'),'funding');assert(h.run('interfaceRestorePlanRow(currentView(),expansionRows[0])'));
 assert.deepEqual(value(h,'draft.investmentPolicy.institution'),value(h,'monthlyChangesState.baseline.investmentPolicy.institution'));assert.equal(h.run('draft.hires'),1);assert.equal(h.run('draft.investmentPolicy.inventorySale'),1000);
});

test('current campaigns group marketing and share instructions and remove only the selected object',()=>{
 const h=fresh(true);h.run(`draft.brandCampaignPolicy.regular={...draft.brandCampaignPolicy.regular,mode:'general',budget:15321};draft.brandCampaignPolicy.sponsorship={action:'start',package:'burs',scope:'market',market:'downtown'};draft.holdingCapitalOrders.capital={action:'issue',shares:1000,limitCents:1};draft.holdingCapitalOrders.rival={side:'buy',shares:1,limitCents:100};newRows=interfacePlanRows(currentView());`);
 assert.equal(h.run(`newRows.filter(r=>r.path[0]==='brandCampaignPolicy').length`),2);assert.equal(h.run(`newRows.filter(r=>r.path[0]==='holdingCapitalOrders').length`),2);
 assert.match(h.run(`newRows.find(r=>r.path[1]==='sponsorship').description`),/ends month 6/);
 assert.equal(h.run(`newRows.find(r=>r.path[1]==='rival').route.view`),'ownership');
 assert(h.run(`interfaceRestorePlanRow(currentView(),newRows.find(r=>r.path[1]==='regular'))`));assert.equal(h.run('draft.brandCampaignPolicy.regular.budget'),0);assert.equal(h.run('draft.brandCampaignPolicy.sponsorship.action'),'start');assert.equal(h.run('draft.holdingCapitalOrders.capital.shares'),1000);
 h.run(`newRows=interfacePlanRows(currentView());`);assert(h.run(`interfaceRestorePlanRow(currentView(),newRows.find(r=>r.path[0]==='holdingCapitalOrders'&&r.path[1]==='capital'))`));assert.equal(h.run('draft.holdingCapitalOrders.capital.action'),'none');assert.equal(h.run('draft.holdingCapitalOrders.rival.shares'),1);
});

test('current recurring marketing rows show the total budget and agreement term with separate parent reservations',()=>{
 const h=fresh(true);h.run(`draft.brandCampaignPolicy.regular={...draft.brandCampaignPolicy.regular,mode:'general',budget:15321};draft.brandCampaignPolicy.sponsorship={action:'start',package:'burs',scope:'market',market:'downtown'};newRecurring=interfaceRecurringCommitments(currentView(),E.planBudget(currentView().me,draft,currentView()));`);
 const rows=value(h,'newRecurring'),find=label=>rows.find(r=>r.title===label);
 assert.equal(find('Regular advertising').value,15321);assert.equal(find('Sponsorship payment / cancellation').value,30000);assert.match(find('Sponsorship payment / cancellation').timing,/ends month 6/);assert.match(find('Sponsorship payment / cancellation').timing,/150,000/);assert.equal(find('Combined marketing this month').value,45321);assert.equal(find('Holding-company share cash reserved').value,0);
});

test('invalid modern instructions become Ready blockers with a precise destination',()=>{
 const h=fresh(true);h.run(`draft.holdingCapitalOrders.rival={side:'sell',shares:10,limitCents:1};draft.brandCampaignPolicy.regular.budget=250001;currentReview=monthlyPlanReview(currentView());`);
 assert.equal(h.run(`currentReview.blockers.find(r=>r.id==='holding-capital').view`),'ownership');assert.equal(h.run(`currentReview.blockers.find(r=>r.id==='brand-campaigns').view`),'campaigns');
});

test('household pursuits, digital setup and recovery return to their proper homes',()=>{
 const h=fresh(true);h.run(`testView=currentView();testView.opportunities=[{id:'household',type:'deposit'},{id:'wealth',type:'wealth'},{id:'loan',type:'loan'},{id:'business',type:'payroll'}];`);
 for(const [id,expected]of [['household','deposits'],['wealth','deposits'],['loan','lending'],['business','services']]){h.c.testId=id;assert.equal(h.run(`interfaceChangeRoute(testView,{path:['opportunity'],after:testId}).view`),expected);}
 assert.deepEqual(value(h,`interfaceChangeRoute(testView,{path:['newProjects','licenseDigitalPlatform']}).context`),{objectId:'digital-platform',projectId:'licenseDigitalPlatform'});assert.equal(h.run(`interfaceChangeRoute(testView,{path:['newProjects','correctiveAction']}).context.objectId`),'recovery');
});

test('Spending and commitments retains the Reports directory',()=>{
 const h=fresh(),before=h.run('JSON.stringify([game,draft])');
 h.run('document.createElement=()=>$("#test-back");openInterfaceWorkspace("reports","commitments",{})');
 assert.match(h.elements.get('#interfaceReports').innerHTML,/ips-workspace/);
 assert.match(h.elements.get('.ips-body').innerHTML,/data-ips-item="statements"/);
 assert.match(h.elements.get('.ips-body').innerHTML,/data-ips-item="forecasts"/);
 assert.match(h.elements.get('.ips-inspector').innerHTML,/Total quoted commitments/);
 assert.equal(h.run('JSON.stringify([game,draft])'),before);
});
