'use strict';
// Source UI gate using the actual assembled accounting/department engine.
// The domain fixture does not claim complete Group 4 campaign acceptance.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
const fields='initializeDepartments,defaultDepartmentPlan,normalizeDepartmentPlan,departmentLeadershipQuote,departmentBudgetQuote,departmentDraft,departmentProspectiveOwner,DEPARTMENT_LEADERS,DEPARTMENT_POLICY_LIMITS,settleDepartmentLeadership,settleDepartmentExperience,';
let engine=require('../tools/build_game.js').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Expose existing helpers for the domain fixture, never replace function bodies.
engine=engine.replace('root.BWEngine={','root.BWEngine={'+fields);
const elements=new Map();
function element(selector){if(!elements.has(selector))elements.set(selector,{value:'',innerHTML:'',textContent:'',open:false,listeners:{},dataset:{},
  addEventListener(key,callback){this.listeners[key]=callback;},classList:{add(){},remove(){},toggle(){}},focus(){}});return elements.get(selector);}
const context={console,document:{querySelector:element,querySelectorAll:()=>[]},setTimeout:()=>1,clearTimeout(){}};
vm.createContext(context);vm.runInContext('(function(root){'+engine+'})(globalThis);',context);context.window={BWEngine:context.BWEngine};
const run=text=>vm.runInContext(text,context),fingerprint=code=>createHash('sha256').update(run('JSON.stringify('+code+')')).digest('hex');
run(read('src/ui/state.js'));run(read('src/ui/departments.js'));
run("const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:3}).options;"+
  "game=E.createGame({...options,mode:'hotseat',seed:'department-ui',created:1});game.financialGroupVersion=4;game.version='9.3';E.initializeDepartments(game);seat=0;"+
  "const copy=x=>JSON.parse(JSON.stringify(x));"+
  "currentView=()=>({me:copy(game.players[seat]),rival:{id:game.players[1-seat].id},cycle:game.cycle,gameOver:game.gameOver,economy:game.economy,financialGroupVersion:4});"+
  "function resetDraft(){const p=game.players[seat];draft={...E.defaultDepartmentPlan(p),allocation:{...p.allocation},workforcePolicy:copy(p.workforce.policy),management:copy(p.management),servicePolicy:copy(p.serviceDesk.policy),investments:{},contractBid:null,contractExit:null,newProjects:[],newProject:null,hires:0,capitalAction:false,competitiveAction:'none',products:copy(p.products),facilityPolicy:{convert:null,cancel:null}};draftOwner=p.id;lastCycle=game.cycle;}"+
  "renderReady=()=>{};let lastToast='';toast=text=>lastToast=text;resetDraft();renderDepartments(currentView());");
const panel=elements.get('#departmentPanel'),before=fingerprint('game'),draftBefore=fingerprint('draft');
assert.match(panel.innerHTML,/DEPARTMENTS &amp; LEADERSHIP/);assert.match(panel.innerHTML,/four operating roles/);
assert.match(panel.innerHTML,/No department leader appointed/);assert.match(panel.innerHTML,/common reserve/i);
assert.match(panel.innerHTML,/Shared vendor ceiling/);assert.match(panel.innerHTML,/not prepaid funds/);
assert.match(panel.innerHTML,/Retail &amp; Service/);assert.match(panel.innerHTML,/max="24000"/);
assert.match(panel.innerHTML,/One assigned banker reserved|Teaching needs an existing leader/);
for(const profile of run('Object.values(E.DEPARTMENT_LEADERS)'))assert(panel.innerHTML.includes(profile.name));
assert.equal(fingerprint('game'),before);assert.equal(fingerprint('draft'),draftBefore);
// The form binding uses the same staged policies and throws rather than clipping invalid envelopes.
run("function fillForm(){const p=draft.departmentPolicy,m=p.mandate;for(const k of ['reserve'])$('#department-'+k).value=String(p[k]);for(const k of ['vendors','research','leadership'])$('#department-'+k).value=String(p.envelopes[k]);for(const role of Object.keys(E.SPECIALIST_ROLES)){$('#department-training-'+role).value=String(p.envelopes.training[role]);$('#departmentLeader-'+role).value=draft.leaderOrders[role]===null?'retain':draft.leaderOrders[role];}for(const k of ['staffLimit','vendorLimit','salesFloor','trainingTarget'])$('#department-'+k).value=String(m[k]);$('#department-mode').value=m.mode;$('#department-training').value=m.training?'on':'off';}fillForm();");
elements.get('#previewDepartments').listeners.click();assert.match(elements.get('#departmentInstructionStatus').textContent,/Preview only/);
assert.equal(fingerprint('game'),before);assert.equal(fingerprint('draft'),draftBefore);
elements.get('#department-reserve').value='600000';elements.get('#department-reserve').listeners.change();
assert.match(elements.get('#departmentQuote').innerHTML,/Form changed/);assert.equal(fingerprint('draft'),draftBefore);
elements.get('#stageDepartments').listeners.click();assert.equal(run('draft.departmentPolicy.reserve'),600000);assert.equal(fingerprint('game'),before);
const staged=fingerprint('draft');
assert.equal(run('stageDepartmentPlan(currentView(),{...draft.departmentPolicy,reserve:-1},draft.leaderOrders)'),false);
assert.equal(fingerprint('draft'),staged);
assert.equal(run("stageDepartmentPlan(currentView(),draft.departmentPolicy,{...draft.leaderOrders,business:'delivery'})"),false);
assert.match(run('lastToast'),/existing qualified/);assert.equal(fingerprint('draft'),staged);
// Qualified pre-existing employee fixture, not a UI appointment creating a hire.
run("game.players[0].workforce.departments.business.count=3;game.players[0].workforce.departments.business.skill=20;game.players[0].allocation={service:3,business:3,lending:1,operations:1};resetDraft();draft.workforcePolicy.training.business=20000;renderDepartments(currentView());");
const qualified=fingerprint('game');
assert(run("stageDepartmentPlan(currentView(),draft.departmentPolicy,{...draft.leaderOrders,business:'delivery'})"));
assert.equal(fingerprint('game'),qualified);assert.equal(run('game.players[0].departmentOffice.leaders.business'),null);
assert.match(panel.innerHTML,/\$26,000/);assert.match(panel.innerHTML,/One assigned banker reserved for teaching/);
// Actual domain settlement supplies a persistent identity and paid compensation.
run("E.settleDepartmentLeadership(game,[copy(draft),{...copy(draft),...E.defaultDepartmentPlan(game.players[1]),allocation:copy(game.players[1].allocation),workforcePolicy:copy(game.players[1].workforce.policy)}]);for(const p of game.players){p.operatingReport={};E.settleDepartmentExperience(game,p);}game.cycle++;resetDraft();renderDepartments(currentView());");
assert.match(panel.innerHTML,/:leader:1/);assert.match(panel.innerHTML,/appointed month 1/);assert.match(panel.innerHTML,/Last settled month 1/);
const settled=fingerprint('game');assert(run("stageDepartmentPlan(currentView(),draft.departmentPolicy,{...draft.leaderOrders,business:'none'})"));
assert.equal(fingerprint('game'),settled);assert.match(panel.innerHTML,/demotion\/replacement \$4,000/);
// Prepare delegation is read-only and applying a proposal preserves strategic choices.
run("resetDraft();draft.departmentPolicy.mandate.training=true;draft.departmentPolicy.mandate.trainingTarget=60;draft.contractBid={client:'preserve-explicit-bid'};draft.facilityPolicy={convert:{officeId:'manual-site',model:'digital'},cancel:null};renderDepartments(currentView());");
const proposalGame=fingerprint('game'),proposalDraft=fingerprint('draft');
assert(run('prepareDepartmentProposal(currentView())'));assert.equal(fingerprint('game'),proposalGame);assert.equal(fingerprint('draft'),proposalDraft);
assert.match(elements.get('#departmentProposal').innerHTML,/exact instruction changes/);
const preserved=run('JSON.stringify({contractBid:draft.contractBid,facilityPolicy:draft.facilityPolicy,leaderOrders:draft.leaderOrders,products:draft.products})');
const oldProposal=elements.get('#stageDepartmentProposal').listeners.click;
run('draft.hires=1;');const manual=fingerprint('draft');oldProposal();assert.equal(fingerprint('draft'),manual);
assert(run('prepareDepartmentProposal(currentView())'));assert(run('stageDepartmentProposal(currentView())'));
assert.equal(run('JSON.stringify({contractBid:draft.contractBid,facilityPolicy:draft.facilityPolicy,leaderOrders:draft.leaderOrders,products:draft.products})'),preserved);
assert.equal(run('draft.hires'),1);assert.equal(run('draft.workforcePolicy.training.business'),80000);
assert.equal(fingerprint('game'),proposalGame);
// A domain proposal accidentally expanding its remit is refused rather than applied.
run('const realPrepare=E.departmentDraft;E.departmentDraft=(p,plan,economy)=>{const result=realPrepare(p,plan,economy);result.plan.capitalAction=true;return result;};');
const protectedDraft=fingerprint('draft');assert.equal(run('prepareDepartmentProposal(currentView())'),false);
assert.match(run('lastToast'),/unauthorized strategic/);assert.equal(fingerprint('draft'),protectedDraft);run('E.departmentDraft=realPrepare;');
run('renderDepartments(currentView());');const sealedClick=elements.get('#stageDepartments').listeners.click;
run('game.players[0].submitted=copy(draft);renderDepartments(currentView());');assert.match(panel.innerHTML,/id="stageDepartments" disabled/);
sealedClick();assert.equal(fingerprint('draft'),protectedDraft);
run('game.players[0].submitted=null;renderDepartments(currentView());');const ownerClick=elements.get('#stageDepartments').listeners.click;
run('seat=1;resetDraft();renderDepartments(currentView());');const other=fingerprint('draft');ownerClick();assert.equal(fingerprint('draft'),other);
assert.equal(run('departmentUiState.owner'),run('game.players[1].id'));assert.equal(run('departmentUiState.open'),false);
run('seat=0;resetDraft();renderDepartments(currentView());');const replacedClick=elements.get('#stageDepartments').listeners.click;
run('game=copy(game);');const restored=fingerprint('draft');replacedClick();assert.equal(fingerprint('draft'),restored);
run("const overdue=currentView();overdue.me.departmentOffice.arrears.business=4000;renderDepartments(overdue);");
assert.match(panel.innerHTML,/Leadership teaching suspended/);assert.match(panel.innerHTML,/Unpaid compensation: \$4,000/);
run('const legacy=currentView();delete legacy.me.departmentOffice;renderDepartments(legacy);');assert.equal(panel.innerHTML,'');
assert.equal(run('departmentUiState.owner'),null);
// Production creation/default draft and Workforce renderer, not the domain fixture.
if(!process.argv.includes('--source'))process.argv.push('--source');
const integrated=require('./github_resilience.test.js').harness();
integrated.run("const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;game=E.createGame({...options,mode:'hotseat',seed:'department-integrated-ui',created:1});seat=0;newDraft(currentView());workspaceTab='workforce';renderReady=()=>{};renderWorkforce(currentView());");
assert.equal(integrated.run('game.version'),'9.3');
assert.equal(integrated.run('draft.departmentPolicy.reserve'),500000);
assert.equal(integrated.run('Object.values(draft.leaderOrders).every(order=>order===null)'),true);
assert.match(integrated.elements.get('#departmentPanel').innerHTML,/DEPARTMENTS &amp; LEADERSHIP/);
assert.match(integrated.elements.get('#workforcePanel').innerHTML,/paid qualified leaders can raise the cap/);
const integratedGame=integrated.run('JSON.stringify(game)');
assert(integrated.run('stageDepartmentPlan(currentView(),draft.departmentPolicy,draft.leaderOrders)'));
assert.equal(integrated.run('JSON.stringify(game)'),integratedGame,'Production workspace refresh preserves authoritative state.');
assert.match(integrated.elements.get('#departmentInstructionStatus').textContent,/staged/);
integrated.run("seat=1;newDraft(currentView());renderWorkforce(currentView());");
assert.equal(integrated.run('departmentUiState.owner'),integrated.run('game.players[1].id'));
console.log('Department UI source PASS: real Group 4 creation/default draft/Workforce hook, envelopes, qualified/costed leaders, pure previews, bounded reviewed proposals, strategic preservation and stale/sealed/owner/reload guards. Full settlement, multiplayer and browser acceptance remain separate.');
