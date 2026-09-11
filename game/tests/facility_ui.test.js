'use strict';
// Source UI contract gate. Synthetic fixtures supplement full campaign gates.
// The real pure domain/adapter run with current production metrics and pricing;
// final Group 4 shared-budget/settlement/save/transport integration is a separate gate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto'),root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=require('../tools/build_game.js').assemble().html;
assert.match(html,/id="facilityNetworkPanel" class="hidden"/,'Markets includes its initially hidden owner-only mount.');
let engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
engine=engine.replace('root.BWEngine={','root.BWEngine={FacilityNetwork,facilityContext,defaultFacilityPolicy,facilityOfficeMetrics,facilityInstructionQuote,');
const elements=new Map();
function element(selector){
  if(!elements.has(selector))elements.set(selector,{value:'',open:false,innerHTML:'',textContent:'',dataset:{},listeners:{},
    addEventListener(key,fn){this.listeners[key]=fn;},focus(){this.focused=true;},
    classList:{add(){},remove(){},toggle(){}}});
  return elements.get(selector);
}
const context={console,document:{querySelector:element,querySelectorAll:()=>[]},setTimeout:()=>1,clearTimeout(){}};
vm.createContext(context);vm.runInContext(engine,context);context.window={BWEngine:context.BWEngine};
const run=text=>vm.runInContext(text,context);
run(read('src/ui/state.js'));run(read('src/ui/draft.js'));run(read('src/ui/facility-network.js'));
run("const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:3}).options;"+
  "game=E.createGame({...options,mode:'hotseat',seed:'facility-ui',created:1});seat=0;E.FacilityNetwork.initialize(game,true);"+
  "currentView=()=>{const out=E.publicState(game,seat);E.FacilityNetwork.project(game,out,seat,true);return out;};"+
  "renderReady=()=>{};let lastToast='';toast=text=>lastToast=text;newDraft(currentView());draft.facilityPolicy=E.defaultFacilityPolicy();renderFacilityNetwork(currentView());");
const fingerprint=code=>createHash('sha256').update(run('JSON.stringify('+code+')')).digest('hex');
const state=fingerprint('game'),originalDraft=fingerprint('draft'),panel=elements.get('#facilityNetworkPanel');
assert.match(panel.innerHTML,/OFFICE NETWORK/);assert.match(panel.innerHTML,/Recurring office upkeep/);
assert.match(panel.innerHTML,/Before/);assert.match(panel.innerHTML,/During work/);assert.match(panel.innerHTML,/After activation/);
assert.match(panel.innerHTML,/does not disappear|do not disappear/);assert.match(panel.innerHTML,/not guaranteed customer growth/);
assert.match(panel.innerHTML,/execution capacity reserved/);assert.match(panel.innerHTML,/Next month after completed work/);
const id=run('game.players[0].facilityNetwork.offices[0].id');assert(panel.innerHTML.includes(id));
assert.equal(run('facilityNetworkSelection.owner'),run('game.players[0].id'));
assert.equal(fingerprint('game'),state);assert.equal(fingerprint('draft'),originalDraft);
elements.get('#facilityDestination').value='digital';elements.get('#facilityDestination').listeners.change();
assert.equal(run('facilityNetworkSelection.model'),'digital');assert.equal(fingerprint('draft'),originalDraft);
assert.equal(fingerprint('game'),state,'Changing a comparison cannot mutate offices, cash or obligations.');
const firstStage=elements.get('#stageFacilityConversion').listeners.click;firstStage();
assert.equal(run('draft.facilityPolicy.convert.model'),'digital');assert.equal(run('draft.facilityPolicy.convert.officeId'),id);
assert.equal(fingerprint('game'),state,'Stage cannot start, pay or progress a conversion.');
const staged=fingerprint('draft');firstStage();
assert.equal(fingerprint('draft'),staged);assert.match(run('lastToast'),/plan changed|comparison changed/);
assert.equal(run('stageFacilityPolicy(currentView(),{convert:{officeId:"not-owned",model:"digital"},cancel:null})'),false);
assert.equal(fingerprint('draft'),staged);
assert.equal(run('stageFacilityPolicy(currentView(),{convert:null,cancel:"not-owned"})'),false);
assert.equal(fingerprint('draft'),staged,'Bad cancellation cannot replace valid draft instructions.');
elements.get('#clearFacilityInstruction').listeners.click();assert.equal(run('draft.facilityPolicy.convert'),null);
assert.equal(fingerprint('game'),state,'Clearing an unsubmitted order changes no books.');
run('const priorRestriction=game.players[0].capitalRestriction;game.players[0].capitalRestriction=1;renderFacilityNetwork(currentView());');
assert.match(panel.innerHTML,/Restore capital standing/);assert.match(panel.innerHTML,/id="stageFacilityConversion" disabled/);
const restrictedDraft=fingerprint('draft');elements.get('#stageFacilityConversion').listeners.click();
assert.equal(fingerprint('draft'),restrictedDraft,'A visually disabled conversion also rejects programmatic clicks through the shared validator.');
run('game.players[0].capitalRestriction=priorRestriction;renderFacilityNetwork(currentView());');
// A real domain conversion fixture provides progress/disruption/cancellation UI.
// It is not a full Group 4 campaign or an integration acceptance claim.
run("const selectedOffice=game.players[0].facilityNetwork.offices[0];const conversionPlan=JSON.parse(JSON.stringify(draft));"+
  "conversionPlan.facilityPolicy={convert:{officeId:selectedOffice.id,model:'digital'},cancel:null};"+
  "const conversionContext=E.facilityContext(game,game.players[0],conversionPlan);"+
  "conversionContext.payCost=(p,cost)=>{p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.conversion',{cash:-cost,equity:-cost},-cost);p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;};"+
  "E.FacilityNetwork.prepare(game.players[0],conversionPlan,conversionContext);"+
  "E.FacilityNetwork.advance(game.players[0],{cycle:game.cycle,freeExecution:4,workRate:1});renderFacilityNetwork(currentView());");
assert.match(panel.innerHTML,/CONVERSION IN PROGRESS/);assert.match(panel.innerHTML,/cancellation refunds \$0/);
assert.match(panel.innerHTML,/1 \/ 2 work units/);assert.match(panel.innerHTML,/retains the current model/);
const conversionState=fingerprint('game');elements.get('#stageFacilityCancel').listeners.click();
assert.equal(run('draft.facilityPolicy.cancel'),id);assert.equal(fingerprint('game'),conversionState);
assert.match(elements.get('#facilityInstructionStatus').textContent,/will not be refunded/);
elements.get('#clearFacilityInstruction').listeners.click();assert.equal(run('draft.facilityPolicy.cancel'),null);
assert.equal(run('game.players[0].facilityNetwork.offices[0].conversion.work'),1,'Clearing cancellation must preserve actual project work.');
run('renderFacilityNetwork(currentView());');const staleStage=elements.get('#stageFacilityCancel').listeners.click;
run('draft.depositPolicy="growth";');const manual=fingerprint('draft');staleStage();assert.equal(fingerprint('draft'),manual);
run('renderFacilityNetwork(currentView());');const sealedStage=elements.get('#stageFacilityCancel').listeners.click;
run('game.players[0].submitted=JSON.parse(JSON.stringify(draft));renderFacilityNetwork(currentView());');
assert.match(panel.innerHTML,/id="stageFacilityCancel" disabled/);sealedStage();assert.equal(fingerprint('draft'),manual);
run('game.players[0].submitted=null;renderFacilityNetwork(currentView());');const ownerStage=elements.get('#stageFacilityCancel').listeners.click;
run('seat=1;newDraft(currentView());draft.facilityPolicy=E.defaultFacilityPolicy();renderFacilityNetwork(currentView());');
const ownerDraft=fingerprint('draft');ownerStage();assert.equal(fingerprint('draft'),ownerDraft);
assert.equal(run('facilityNetworkSelection.owner'),run('game.players[1].id'));assert.notEqual(run('facilityNetworkSelection.office'),id);
assert.equal(run('facilityNetworkSelection.open'),false,'Owner switches reset inspection without leaking prior office selection.');
run('seat=0;newDraft(currentView());draft.facilityPolicy=E.defaultFacilityPolicy();renderFacilityNetwork(currentView());');
const replacedStage=elements.get('#stageFacilityCancel').listeners.click;run('game=JSON.parse(JSON.stringify(game));');
const replacementDraft=fingerprint('draft');replacedStage();assert.equal(fingerprint('draft'),replacementDraft);
// Injection-sensitive display values are escaped, and only the owner book is rendered.
run("const escapedView=currentView();escapedView.territories[escapedView.me.facilityNetwork.offices[0].market].name='<script>bad</script>';renderFacilityNetwork(escapedView);");
assert.match(panel.innerHTML,/&lt;script&gt;bad&lt;\/script&gt;/);assert(!panel.innerHTML.includes('<script>bad</script>'));
assert.equal(run('currentView().rival.facilityNetwork'),undefined);
run('const emptyView=currentView();emptyView.me.facilityNetwork.offices=[];renderFacilityNetwork(emptyView);');
assert.match(panel.innerHTML,/No operating offices/);assert.doesNotMatch(panel.innerHTML,/id="stageFacilityConversion"/);
assert.equal(run('facilityNetworkSelection.office'),null);
run("const legacyView=currentView();delete legacyView.me.facilityNetwork;renderFacilityNetwork(legacyView);");
assert.equal(panel.innerHTML,'');assert.equal(run('facilityNetworkSelection.owner'),null);
// Actual Group 4 creation/public-view/default draft/render hook without injections.
if(!process.argv.includes('--source'))process.argv.push('--source');
const integrated=require('./github_resilience.test.js').harness();
integrated.run("const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;game=E.createGame({...options,mode:'hotseat',seed:'facility-integrated-ui',created:1});seat=0;newDraft(currentView());workspaceTab='markets';renderReady=()=>{};renderMarkets(currentView());");
assert.equal(integrated.run('game.version'),'9.3');
assert.equal(integrated.run('JSON.stringify(draft.facilityPolicy)'),'{"convert":null,"cancel":null}');
assert.match(integrated.elements.get('#facilityNetworkPanel').innerHTML,/OFFICE NETWORK/);
const integratedGame=integrated.run('JSON.stringify(game)');
assert(integrated.run("stageFacilityPolicy(currentView(),{convert:{officeId:currentView().me.facilityNetwork.offices[0].id,model:'digital'},cancel:null})"));
assert.equal(integrated.run('JSON.stringify(game)'),integratedGame);
assert.equal(integrated.run("E.CAMPAIGN_FEATURES.find(f=>f.field==='financialGroupVersion').setupVersion"),8,'The integrated opt-in setup selects Group 8; historical campaign versions are retained.');
integrated.run("const priorOptions=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options;const priorCampaign=E.createGame({...priorOptions,mode:'hotseat',seed:'facility-historical-five',created:1});const priorRestored=E.migrateCampaign(JSON.parse(JSON.stringify(priorCampaign)));");
assert.equal(integrated.run('priorRestored.financialGroupVersion'),5,'Continuing a historical Group 5 campaign must not upgrade its rules.');
assert.equal(integrated.run('priorRestored.version'),'9.4');
assert(integrated.run('priorRestored.players.every(p=>!p.departmentFunctions)'),'Historical Group 5 does not initialize Group 6 departments.');
integrated.run("const priorSixOptions=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:6}).options;const priorSix=E.createGame({...priorSixOptions,mode:'hotseat',seed:'facility-historical-six',created:1});const restoredSix=E.migrateCampaign(JSON.parse(JSON.stringify(priorSix)));");
assert.equal(integrated.run('restoredSix.financialGroupVersion'),6,'Historical Group 6 must not gain Group 7 rules.');
assert.equal(integrated.run('restoredSix.version'),'9.5');
assert.equal(integrated.run('restoredSix.departmentFunctionEconomy.version'),1,'Historical vendor accounting remains unchanged.');
console.log('Facility UI source PASS: real Group 4 creation/public-view/default draft/Markets hook, pure metrics/staging, no-refund cancellation, stale/sealed/replaced/owner guards and legacy hiding. Settlement, transport and browser acceptance remain separate.');
