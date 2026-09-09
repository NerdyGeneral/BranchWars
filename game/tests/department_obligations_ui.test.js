'use strict';
// --candidate-patch evaluates exact quarantined patches in memory. Default mode
// tests production source after integration. Neither mode writes game artifacts.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const source=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],candidate=process.argv.includes('--candidate-patch');
// The parent integrated the engine repair before the UI patch. Test that actual
// assembled engine rather than reapplying or simulating its budgeting rules.
const engine=source;
function uiPatch(source,reverse=false){
 for(const part of read('experiments/institution/department-obligations-ui.patch').split('\n@@\n').slice(1)){
  const lines=part.split('\n').filter(l=>/^[ +\-]/.test(l)),before=lines.filter(l=>l[0]!=='+').map(l=>l.slice(1)).join('\n'),after=lines.filter(l=>l[0]!=='-').map(l=>l.slice(1)).join('\n');
  const from=reverse?after:before,to=reverse?before:after;assert.equal(source.split(from).length,2,'Exact UI patch context');source=source.replace(from,()=>to);
 }return source;
}
function historicalUi(source){
 // Compare legacy output with the actual pre-repair functions preserved in the
 // reviewed patch. Do not require newer feature-only itemization to match an
 // obsolete entire after-hunk just to recover that historical reference.
 for(const part of read('experiments/institution/department-obligations-ui.patch').split('\n@@\n').slice(1)){
  const original=part.split('\n').filter(l=>l[0]==='-').map(l=>l.slice(1)).join('\n').trimEnd(),name=original.match(/^function (\w+)\(/)?.[1];
  assert(name,'Preserved UI reference must be one named function');const marker='function '+name+'(',start=source.indexOf(marker);
  assert(start>=0&&source.indexOf(marker,start+marker.length)<0,'Current UI reference function must be unique');
  const end=source.indexOf('\nfunction ',start+marker.length);source=source.slice(0,start)+original+source.slice(end<0?source.length:end);
 }return source;
}
const actualUi=read('src/ui/dashboard.js')+'\n'+read('src/ui/plan-review.js')+'\n'+read('src/ui/projects.js'),ui=candidate?uiPatch(actualUi):actualUi,legacyUi=candidate?actualUi:historicalUi(actualUi);
const engineContext={console};vm.runInNewContext(engine,engineContext);const E=engineContext.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));let checks=0;
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options,g=E.createGame({...options,mode:'hotseat',seed:'obligations-ui',created:1});
function quiet(world){world.event=copy(E.EVENTS.find(e=>e.key==='quiet'));}
function plan(world,i){const q=E.chooseBot(world,i);Object.assign(q,{newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',opportunity:null,contractBid:null,contractExit:null,capitalAction:false,decision:'b'});
 for(const key of Object.keys(q.specialistHires))q.specialistHires[key]=0;for(const key of Object.keys(q.workforcePolicy.training))q.workforcePolicy.training[key]=0;
 q.facilityPolicy={convert:null,cancel:null};q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;q.agencyPolicy=E.defaultAgencyPlan(world.players[i]);q.advertisingPolicy.budget=0;q.relationshipOfferPolicy.share=0;q.onboardingPolicy.share=0;q.productProgramPolicy.retire=[];return q;}
function cashAt(p,cash){const move=p.accounting.accounts.cash-cash;p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.liquidityAllocation',{cash:-move,securities:move});Object.assign(p.stats,{cash:p.accounting.accounts.cash,capital:p.accounting.accounts.equity,earnings:p.accounting.retainedEarnings});}
// Existing specialist fixture is within the original eight-person workforce;
// the three leader appointments themselves are fully funded submitted orders.
for(const role of ['service','business','operations']){g.players[0].workforce.departments[role].count=1;g.players[0].workforce.departments[role].skill=20;}
E.validatePilot(g);quiet(g);const opening=[plan(g,0),plan(g,1)];opening[0].departmentPolicy.envelopes.leadership=100000;
Object.assign(opening[0].leaderOrders,{service:'delivery',business:'delivery',operations:'controls'});E.submit(g,0,opening[0]);E.submit(g,1,opening[1]);E.validatePilot(g);E.validateLedger(g);
assert.equal(g.players[0].departmentOffice.report.paid,81500);const ordinary=plan(g,0);checks++;
function harness(world,plan,code=ui){
 const nodes=new Map();let buttons=[];
 const node=id=>{if(nodes.has(id))return nodes.get(id);let markup='';const el={disabled:false,textContent:'',className:'',dataset:{},listeners:{},classList:{toggle(){}},addEventListener(k,fn){this.listeners[k]=fn;}};
  Object.defineProperty(el,'innerHTML',{get:()=>markup,set:html=>{markup=String(html);if(id==='#competitiveActions')buttons=[...markup.matchAll(/<button\b[^>]*data-competitive-action="([^"]+)"[^>]*>/g)].map(m=>{const b=node('action:'+m[1]);b.dataset.competitiveAction=m[1];b.disabled=/\sdisabled(?:\s|>)/.test(m[0]);return b;});}});nodes.set(id,el);return el;};
 const ctx={console,E,game:copy(world),view:null,seat:0,draft:copy(plan),$:node,$$:s=>s==='[data-competitive-action]'?buttons:[],money:n=>'$'+Math.round(n).toLocaleString('en-US'),esc:x=>String(x)};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 vm.runInContext("currentView=()=>E.publicState(game,seat);renderProjects=()=>{};renderPipeline=()=>{};renderOperatingPreview=()=>{};renderWorkforce=()=>{};renderProductPrograms=()=>{};",ctx);
 return {ctx,nodes,run:js=>vm.runInContext(js,ctx),draw:()=>vm.runInContext('renderReady(currentView())',ctx),action:key=>node('action:'+key)};
}
const broke=copy(g);cashAt(broke.players[0],0);E.validatePilot(broke);const h=harness(broke,ordinary),state=JSON.stringify(h.ctx.game);h.draw();
assert.equal(h.nodes.get('#readyBtn').disabled,false,'Existing unpaid compensation may accrue without freezing a complete no-spend plan.');
assert.equal(E.planBudget(broke.players[0],ordinary).total,12500);assert.equal(E.planBudget(broke.players[0],ordinary).remaining,-12500);
assert.match(h.nodes.get('#planBudget').innerHTML,/Committed · full plan <b>\$12,500/);assert.match(h.nodes.get('#planBudget').innerHTML,/Optional spending room after this plan <b class="">\$0/);
assert.match(h.nodes.get('#planBudget').innerHTML,/unfunded from current cash \$12,500/);assert.match(h.nodes.get('#planBudget').innerHTML,/not forgiven/);assert.equal(JSON.stringify(h.ctx.game),state);checks++;
const paidKey=Object.keys(E.COMPETITIVE_ACTIONS).find(k=>E.COMPETITIVE_ACTIONS[k].cost>0&&!E.COMPETITIVE_ACTIONS[k].minInfluence);
assert.equal(h.action('none').disabled,false);assert.equal(h.action(paidKey).disabled,true);h.action(paidKey).listeners.click();assert.equal(h.ctx.draft.competitiveAction,'none');checks++;
// An already-selected expensive action remains inspectable; Hold removes its
// cost even when the old selected draft is overcommitted.
h.ctx.draft.competitiveAction=paidKey;h.draw();assert.equal(h.action(paidKey).disabled,false);assert.equal(h.action('none').disabled,false);assert.equal(h.nodes.get('#readyBtn').disabled,true);
h.action('none').listeners.click();assert.equal(h.ctx.draft.competitiveAction,'none');assert.equal(h.nodes.get('#readyBtn').disabled,false);checks++;
h.ctx.draft.decision=null;h.draw();assert.equal(h.nodes.get('#readyBtn').disabled,true);h.ctx.draft.decision='b';
h.ctx.draft.allocation.service--;h.draw();assert.equal(h.nodes.get('#readyBtn').disabled,true);h.ctx.draft.allocation.service++;
h.ctx.draft.newProjects=['not-a-project'];h.draw();assert.equal(h.nodes.get('#readyBtn').disabled,true,'Strict project status is retained despite zero optional costs.');h.ctx.draft.newProjects=[];
const malformed=copy(ordinary);malformed.leaderOrders.service='unrecognized';assert.throws(()=>E.submit(copy(broke),0,malformed));checks++;
// A real accrual remains visible and optional spending must reserve old invoices.
const arrears=copy(broke);quiet(arrears);E.submit(arrears,0,copy(ordinary));E.submit(arrears,1,plan(arrears,1));E.validatePilot(arrears);E.validateLedger(arrears);
assert.equal(arrears.players[0].accounting.accounts.payables,12500);const ah=harness(arrears,plan(arrears,0));ah.draw();assert.match(ah.nodes.get('#planBudget').innerHTML,/Already accrued payables <b>\$12,500/);checks++;
const positive=copy(g);cashAt(positive.players[0],E.COMPETITIVE_ACTIONS[paidKey].cost+12500);const ph=harness(positive,ordinary);ph.draw();assert.equal(ph.action(paidKey).disabled,false);
ph.action(paidKey).listeners.click();assert.equal(ph.ctx.draft.competitiveAction,paidKey);assert.equal(E.planBudget(ph.ctx.game.players[0],ph.ctx.draft).discretionaryRemaining,0);checks++;
// Sealed, terminal, replaced and edited drafts cannot accept detached controls.
ph.draw();const stale=ph.action('none').listeners.click;ph.ctx.draft.investments={network:1};stale();assert.equal(ph.ctx.draft.competitiveAction,paidKey);
ph.ctx.draft=copy(ordinary);ph.draw();const sealed=ph.action(paidKey).listeners.click;ph.ctx.game.players[0].submitted=copy(ordinary);sealed();assert.equal(ph.ctx.draft.competitiveAction,'none');ph.draw();assert.equal(ph.nodes.get('#readyBtn').disabled,true);assert.equal(ph.action('none').disabled,true);
ph.ctx.game.players[0].submitted=null;ph.ctx.game.gameOver={reason:'test-terminal'};ph.draw();assert.equal(ph.nodes.get('#readyBtn').disabled,true);assert.equal(ph.action('none').disabled,true);checks++;
const detached=harness(positive,ordinary);detached.draw();const replacedAction=detached.action(paidKey).listeners.click;detached.ctx.game=copy(detached.ctx.game);replacedAction();assert.equal(detached.ctx.draft.competitiveAction,'none');
detached.draw();const wrongOwner=detached.action(paidKey).listeners.click;detached.ctx.seat=1;wrongOwner();assert.equal(detached.ctx.draft.competitiveAction,'none');checks++;
// Legacy budgets/actions and readiness retain their accounting semantics.
// Submission guidance is intentionally rewritten by the V3 usability goal;
// its new content is covered by usability_plan_review, not this old copy golden.
for(const version of [1,2,3]){const settings=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;
 const legacy=E.createGame({...settings,mode:'hotseat',seed:'legacy-obligation-ui:'+version,created:1}),q=E.chooseBot(legacy,0),a=harness(legacy,q),b=harness(legacy,q,legacyUi);a.draw();b.draw();
 for(const id of ['#planBudget','#competitiveBrief','#competitiveActions'])assert.equal(a.nodes.get(id).innerHTML,b.nodes.get(id).innerHTML);
 assert.equal(a.nodes.get('#readyBtn').disabled,b.nodes.get('#readyBtn').disabled);
 a.ctx.legacyView=E.publicState(legacy,0);delete a.ctx.game;delete a.ctx.view;delete a.ctx.currentView;a.run('renderCompetitiveActions(legacyView)');checks++;}
console.log(JSON.stringify({suite:'department-obligations-ui',checks,sourceEngineHash:createHash('sha256').update(source).digest('hex'),candidateEngineHash:createHash('sha256').update(engine).digest('hex'),scope:'Actual engine and actual budget/competition/readiness renderers; paid appointments, preserved zero-cash balance sheet, real payable accrual, optional-room controls, locked/undecided/invalid protection and legacy markup. Browser acceptance separate.'}));
