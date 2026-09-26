'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(html,internals=''){const c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={'+internals),c);return c.BWEngine;}
// The published rc4 package is the frozen 9.33 reference: 9.34 must not move it.
const release=fs.readFileSync(path.join(__dirname,'../../releases/v4-rc4/BRANCH_WARS.html'));
assert.equal(createHash('sha256').update(release).digest('hex'),'51ba02d13ad7bd8df9332b924e0be0beb20b3d972851ce7d32a0f0577b2e76d5');
const old=load(release.toString('utf8')),E=load(require('../tools/build_game').assemble().html,
 'balanceSheetDeploymentCapacity,balanceSheetKeepsFullService,balanceSheetDepositGrowthValue,loanProductionCapacity,');
const CURRENT={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true};
const options=(lending=true,scenario='balanced')=>({...E.previewCampaignEdition({},'expanded',{...CURRENT,currentLending:lending}).options,mode:'hotseat',seed:'balance-sheet-lending',scenario,created:1,startingWorkforce:'covered'});
const plain=g=>{delete g.balanceSheetLendingVersion;for(const p of g.players)delete p.balanceSheetLendingVersion;g.version='9.33';return g;};

test('9.33 creation, AI plans, settlement, saves and owner views still match the published rc4 build',()=>{
 for(const scenario of ['balanced','rate']){
  const o=options(false,scenario);assert.deepEqual(o,{...old.previewCampaignEdition({},'expanded',CURRENT).options,mode:'hotseat',seed:'balance-sheet-lending',scenario,created:1,startingWorkforce:'covered'});
  const a=old.createGame(o),b=E.createGame(o);assert.equal(b.version,'9.33');assert.deepEqual(copy(b),copy(a));
  const x=a.players.map((_,i)=>old.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(y),copy(x));
  for(const seat of [0,1]){old.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}
  assert.deepEqual(copy(b),copy(a));assert.deepEqual(copy(E.migrateCampaign(copy(b))),copy(old.migrateCampaign(copy(a))));
  for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(old.publicState(a,seat)));
 }
});

test('9.34 is explicit, complete, strictly validated and refused by older builds and peers',()=>{
 const g=E.createGame(options());assert.equal(g.version,'9.34');E.validatePilot(g);E.validateLedger(g);
 assert.deepEqual(copy(plain(copy(g))),copy(E.createGame(options(false))),'The marker is the only difference at creation');
 assert.equal(E.previewCampaignEdition({},'expanded',CURRENT).rules.version,'9.33');
 assert.equal(E.previewCampaignEdition({},'expanded',{...CURRENT,currentLending:true}).rules.version,'9.34');
 assert.equal(E.previewCampaignEdition({},'expanded',{...CURRENT,currentRivalry:false,currentLending:true}).rules.version,'9.32');
 const core=E.previewCampaignEdition(options(),'core',{...CURRENT,currentLending:true});assert.equal(core.rules.version,'8.20');assert.equal(core.options.balanceSheetLendingVersion,undefined);
 assert.equal(E.previewCampaignEdition(options(),'expanded',{...CURRENT}).options.balanceSheetLendingVersion,undefined,'Leaving the choice off removes a stale marker');
 for(const marker of [2,-1,'1',null])assert.throws(()=>E.createGame({...options(),balanceSheetLendingVersion:marker}),/balance-sheet lending/);
 assert.equal(E.createGame({...options(),balanceSheetLendingVersion:0}).version,'9.33');
 assert.throws(()=>E.createGame({...options(false),bankRivalryVersion:undefined,balanceSheetLendingVersion:1}),/requires/);
 assert.throws(()=>E.createGame({...core.options,balanceSheetLendingVersion:1}),/requires/);
 for(const mutate of [x=>delete x.balanceSheetLendingVersion,x=>x.balanceSheetLendingVersion=0,x=>x.version='9.33',x=>delete x.players[1].balanceSheetLendingVersion,x=>delete x.bankRivalryVersion]){
  const invalid=copy(g);mutate(invalid);assert.throws(()=>E.migrateCampaign(invalid));
 }
 assert.throws(()=>old.migrateCampaign(copy(g)),/version|format/);
 const caps=E.campaignCapabilities();delete caps.balanceSheetLendingSupported;
 assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'balanceSheetLendingVersion');
 assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),E.campaignCapabilities()),null);
 assert.equal(E.peerRulesIssue(E.campaignRules(E.createGame(options(false)),{context:'game'}),caps),null,'A 9.33 campaign still links to an older peer');
});

test('central deployment follows the funded deposit gap and still needs credit staff and spare cash',()=>{
 const g=E.createGame(options()),p=g.players[0],R=E.BALANCE_SHEET_LENDING_RULES,s=p.stats;
 const gap=s.deposits*R.targetLoanToDeposit-s.loans;assert(gap>0,'The opening bank has an unlent deposit base');
 assert.equal(E.balanceSheetDeploymentCapacity(p,R.deploymentDesk),gap*R.deploymentRate);
 assert.equal(E.balanceSheetDeploymentCapacity(p,R.deploymentDesk*2),gap*R.deploymentRate,'Extra staff do not enlarge the gap');
 assert.equal(E.balanceSheetDeploymentCapacity(p,R.deploymentDesk/2),gap*R.deploymentRate/2);
 assert.equal(E.balanceSheetDeploymentCapacity(p,0),0);
 const legacy=plain(copy(g)),before=E.loanProductionCapacity(legacy,legacy.players[0]),central=E.loanProductionCentralCapacity(g,p);
 assert.equal(E.loanProductionCentralCapacity(legacy,legacy.players[0]),0);assert.equal(E.balanceSheetDeploymentCapacity(legacy.players[0],R.deploymentDesk),0);
 assert(central>0);assert(Math.abs(E.loanProductionCapacity(g,p)-(before+central))<1e-6,'Deployment adds to both staff and office capacity');
 const lent=copy(g);lent.players[0].stats.loans=lent.players[0].stats.deposits*R.targetLoanToDeposit;
 assert.equal(E.loanProductionCentralCapacity(lent,lent.players[0]),0,'Nothing is deployed once the book reaches the target');
 const dry=copy(g),q=dry.players[0];q.stats.cash=Math.round(q.stats.deposits*.05)-1;
 assert.equal(E.loanProductionCapacity(dry,q),0,'Lending stops at the liquidity reserve');
 const dryLegacy=plain(copy(dry));assert.equal(E.loanProductionCapacity(dryLegacy,dryLegacy.players[0]),before,'9.33 keeps its office-bound capacity');
});

test('the AI keeps its last full-service office and prices deposit growth, only under 9.34',()=>{
 const g=E.createGame(options()),p=g.players[0],open=p.facilityNetwork.offices.filter(o=>o.closedCycle===null),
  retail=open.find(o=>o.model==='retail');assert(retail);assert.equal(open.length,1,'The opening bank has one office');
 assert.equal(E.balanceSheetKeepsFullService(p,retail.id,'atm'),false);
 assert.equal(E.balanceSheetKeepsFullService(p,retail.id,'wealth'),false);
 for(const model of ['commercial','digital','financialCenter','regionalHub'])assert.equal(E.balanceSheetKeepsFullService(p,retail.id,model),true);
 const legacy=plain(copy(g)).players[0];assert.equal(E.balanceSheetKeepsFullService(legacy,retail.id,'atm'),true);
 const two=copy(p);two.facilityNetwork.offices.push({...copy(retail),id:retail.id+'-second',model:'digital'});
 assert.equal(E.balanceSheetKeepsFullService(two,retail.id,'atm'),true);
 two.facilityNetwork.offices.at(-1).conversion={model:'atm'};assert.equal(E.balanceSheetKeepsFullService(two,retail.id,'atm'),false,'A pending conversion counts as its destination');
 two.facilityNetwork.offices.at(-1).conversion=null;two.facilityNetwork.offices.at(-1).closedCycle=0;assert.equal(E.balanceSheetKeepsFullService(two,retail.id,'atm'),false);
 const before={depositGrowth:500000,depositInterest:Math.round(p.stats.deposits*.001)},during={depositGrowth:350000},after={depositGrowth:200000},coupon=.006,horizon=60;
 const margin=coupon*E.BALANCE_SHEET_LENDING_RULES.targetLoanToDeposit-.001;
 let expected=0;for(let m=1;m<=horizon;m++)expected+=((m<=2?during:after).depositGrowth-before.depositGrowth)*margin*(horizon-m+1);
 const value=E.balanceSheetDepositGrowthValue(p,before,m=>m<=2?during:after,coupon,horizon);
 assert(Math.abs(value-expected)<1e-3*Math.abs(expected));assert(value<-(22000-4500)*horizon,'The deposit growth given up outweighs five years of retail-to-ATM upkeep saved');
 assert.equal(E.balanceSheetDepositGrowthValue(p,before,()=>before,coupon,horizon),0);
 assert.equal(E.balanceSheetDepositGrowthValue(legacy,before,()=>after,coupon,horizon),0);
});

test('real resolution, half-ready restore, owner privacy and rematch keep the 9.34 boundary',()=>{
 const g=E.createGame(options()),plans=g.players.map((_,i)=>E.chooseBot(g,i)),before=JSON.stringify(g);
 for(const seat of [0,1]){const v=E.publicState(g,seat);E.validateIncomeHistoryView(v);assert.equal(v.balanceSheetLendingVersion,1);assert.equal(v.me.balanceSheetLendingVersion,1);assert.equal(v.rival.balanceSheetLendingVersion,undefined);E.operatingPreview(v.me,plans[seat],v.economy,v,true);}
 assert.equal(JSON.stringify(g),before,'Views and forecasts do not mutate the campaign');
 E.submit(g,0,plans[0]);const resumed=E.migrateCampaign(copy(g));E.submit(g,1,plans[1]);E.submit(resumed,1,copy(plans[1]));assert.deepEqual(copy(resumed),copy(g));E.validatePilot(g);E.validateLedger(g);
 const bad=copy(E.publicState(g,1));delete bad.me.balanceSheetLendingVersion;assert.throws(()=>E.validateIncomeHistoryView(bad),/balance-sheet lending/);
 const leaked=copy(E.publicState(g,1));leaked.rival.balanceSheetLendingVersion=1;assert.throws(()=>E.validateIncomeHistoryView(leaked),/balance-sheet lending/);
 g.gameOver=true;g.endReason='receivership';g.cycle--;E.rematch(g,0);E.rematch(g,1);
 assert.equal(g.version,'9.34');assert.equal(g.balanceSheetLendingVersion,1);assert(g.players.every(p=>p.balanceSheetLendingVersion===1));E.validatePilot(g);
});

test('the Credit panel and help explain central deployment only in 9.34 campaigns',()=>{
 const {harness}=require('./github_resilience.test');
 for(const lending of [true,false]){
  const h=harness();h.c.lendingOptions=options(lending);
  h.run(`game=E.createGame(lendingOptions);seat=0;workspaceTab='credit';newDraft(currentView());renderReady=()=>renderCollections(currentView());document.querySelector('#creditPanel').insertAdjacentHTML=function(where,html){this.innerHTML=html+this.innerHTML;};renderCollections(currentView());`);
  const html=h.elements.get('#creditPanel').innerHTML;assert.match(html,/Base lending capacity/);assert.doesNotMatch(html,/NaN|undefined/);
  if(lending)assert.match(html,new RegExp('Balance-sheet deployment adds \\$[0-9.,]+[KM]? while loans stay below '+Math.round(E.BALANCE_SHEET_LENDING_RULES.targetLoanToDeposit*100)+'% of deposits'));else assert.doesNotMatch(html,/Balance-sheet deployment/);
  assert.equal(h.run(`gameHelpAvailable(GAME_HELP_TOPICS.find(topic=>topic.id==='balance-sheet-lending'),gameHelpProfile(currentView()))`),lending);
 }
});
