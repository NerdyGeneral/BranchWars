'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const portable=path.resolve(__dirname,'../BRANCH_WARS.html');
let harness;
if(process.argv.includes('--source')){
 const assembled=require('../tools/build_game.js').assemble().html,read=fs.readFileSync;
 try{
  fs.readFileSync=function(file,...args){return path.resolve(String(file))===portable?assembled:read.call(this,file,...args)};
  ({harness}=require('./github_resilience.test.js'));
 }finally{fs.readFileSync=read}
}else ({harness}=require('./github_resilience.test.js'));
const copy=x=>JSON.parse(JSON.stringify(x));
const base={campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,
 workforceVersion:1,customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,productProgramsVersion:1};
function peers(transport,settings={},legacy=false){
 const host=harness('host'),guest=harness('guest'),queue=[],frames=[];
 for(const [i,p]of [host,guest].entries()){
  p.c.enqueue=m=>{frames.push([i,copy(m)]);queue.push([i,copy(m)])};
  p.run("game=null;view=null;lobby=null;send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'regional',scenario:'balanced'};resetFeaturePeer()");
  if(transport!=='gh')p.run('gh.active=false;lan={...emptyLan(),active:'+(transport==='lan')+'}');
 }
 host.c.settings=settings;host.run('Object.assign(p2pConfig,settings)');
 if(legacy)guest.run("const modernHello=makeFeatureHello;makeFeatureHello=()=>{const message=modernHello();delete message.featureRulesSupported;delete message.featureChallenge;delete message.turnEnvelopeSupported;return message}");
 const drain=async()=>{for(let n=0;queue.length;n++){assert(n<150,'Feature handshake did not converge');const[i,m]=queue.shift(),p=i?host:guest;p.c.frame=m;await p.run('handleMessage(frame)')}};
 return {host,guest,queue,frames,drain};
}
async function start(pair){
 const{host,guest}=pair;
 guest.run("handleMessage({type:'hello_request'})");await pair.drain();
 assert(host.state().lobby,'Handshake opens lobby');assert.equal(host.state().game,null);
 assert(host.run('peerFeatureStatus().compatible'));
 host.run('editLobbyIdentity(true)');await pair.drain();
 guest.run('editLobbyIdentity(true)');await pair.drain();
 assert(host.state().lobby.players.every(p=>p.ready));
 host.run('startLobbyCampaign()');await pair.drain();
 assert(host.state().game&&guest.state().view,'Confirmed lobby starts both seats');
}
function headerChecks(){
 const h=harness('guest'),E=h.c.window.BWEngine;
 const g=E.createGame({...base,mode:'hotseat',seed:77,created:1});
 const v=E.publicState(g,1);h.c.valid=v;
 h.run("gh.active=false;p2pConfig={};lobby=null;view=null;handleMessage({type:'state',state:valid})");
 const before=JSON.stringify(h.state().view);
 for(const alter of [s=>s.version='8.99',s=>s.productProgramsVersion=2,s=>s.featureRulesVersion=1,s=>s.segmentDepositsVersion=0]){
  const bad=copy(v);alter(bad);h.c.invalid=bad;
  assert.throws(()=>h.run("handleMessage({type:'state',state:invalid})"));
  assert.equal(JSON.stringify(h.state().view),before,'Bad rule header changed adopted guest view');
 }
 h.c.invalid={...v,advertisingVersion:1,version:'8.10'};
 assert.throws(()=>h.run("handleMessage({type:'state',state:invalid})"),/differ from the confirmed setup/);
 assert.equal(JSON.stringify(h.state().view),before,'A different valid ruleset rewrote an active campaign');
}
async function legacyPairs(){
 for(const transport of ['gh','lan','p2p']){
  const pair=peers(transport,base,true);await start(pair);
  assert.equal(pair.host.state().game.version,'8.9');assert.equal(pair.host.state().game.featureRulesVersion,undefined);
  assert(pair.frames.every(([,m])=>m.type!=='state'||m.state.version==='8.9'));
 }
}
function changeLobbyFeature(peer,field,checked){
 const control=peer.elements.get('#lobbyFeature-'+field);assert(control&&!control.disabled,'Host feature control is editable');
 control.checked=checked;peer.elements.get('#lobbyFeatureOptions').listeners.change({target:control});
}
async function editableLobbies(){
 for(const transport of ['gh','lan','p2p']){
  const pair=peers(transport,base,true),{host,guest}=pair;
  guest.run("handleMessage({type:'hello_request'})");await pair.drain();
  host.run('editLobbyIdentity(true)');await pair.drain();guest.run('editLobbyIdentity(true)');await pair.drain();
  const original=copy(host.state().lobby),revision=original.revision;
  changeLobbyFeature(host,'advertisingVersion',true);
  assert.equal(host.state().lobby.settings.advertisingVersion,undefined,'Draft is not shared before Apply');
  assert(host.run('lobbySettingsDirty'));assert(host.elements.get('#lobbyStart').disabled);
  host.run('applyLobbySettings()');await pair.drain();
  assert.equal(host.state().lobby.revision,revision+1);assert(host.state().lobby.players.every(p=>!p.ready));
  assert.equal(guest.state().lobby.settings.advertisingVersion,1);
  assert(host.run('peerFeatureStatus().compatible'),'Old peer still supports the edited legacy profile');
  host.c.stale={type:'lobby_update',id:'old-ready',revision,player:original.players[1],ready:true};
  host.run('handleMessage(stale)');await pair.drain();assert(!host.state().lobby.players[1].ready);
  // Disabling Product programmes would also remove Advertising: review, cancel,
  // then confirm the actual transitive removal before Apply changes shared rules.
  changeLobbyFeature(host,'productProgramsVersion',false);
  assert(host.run('featureSelectionPending()'));assert.match(host.elements.get('#featureSelectionAffected').innerHTML,/Advertising/);
  host.run('cancelFeatureSelectionConfirmation()');assert.equal(host.state().lobby.settings.productProgramsVersion,1);
  changeLobbyFeature(host,'productProgramsVersion',false);assert(host.confirmFeatures());
  assert.equal(host.state().lobby.settings.productProgramsVersion,1);
  host.run('applyLobbySettings()');await pair.drain();
  assert.equal(host.state().lobby.settings.productProgramsVersion||0,0);assert.equal(guest.state().lobby.settings.advertisingVersion||0,0);
  host.run('editLobbyIdentity(true)');await pair.drain();guest.run('editLobbyIdentity(true)');await pair.drain();
  host.run('startLobbyCampaign()');await pair.drain();assert.equal(host.state().game.version,'8.8');
 }
}
async function pilotPairs(){
 const probe=harness(),E=probe.c.window.BWEngine;
 if(E.campaignCapabilities().featureRulesSupported!==1)return false;
 for(const transport of ['gh','lan','p2p'])for(const advertisingVersion of [0,1])for(const regionalGrowthVersion of [0,1]){
  const rules={...base,featureRulesVersion:1,advertisingVersion,regionalGrowthVersion};
  const pair=peers(transport,rules);await start(pair);
  const g=pair.host.state().game,v=pair.guest.state().view;
  assert.equal(g.version,'8.14');assert.equal(v.featureRulesVersion,1);
  assert.equal(g.advertisingVersion||0,advertisingVersion);assert.equal(g.regionalGrowthVersion||0,regionalGrowthVersion);
  assert(pair.frames.some(([,m])=>m.type==='hello_request'&&m.featureChallenge));
  assert(pair.frames.some(([,m])=>m.type==='hello'&&m.featureChallenge));
  assert(pair.host.run('featurePeerFresh'),'Marked profile requires a current challenged reply');
  const old=peers(transport,rules,true);
  old.guest.run("handleMessage({type:'hello_request'})");await old.drain();
  assert.equal(old.host.state().lobby,null);assert.equal(old.host.state().game,null);
  assert(old.frames.some(([,m])=>m.type==='error'&&/Modular/i.test(m.message)));
  assert(old.frames.every(([,m])=>m.type!=='state'),'Old peer received marked campaign state');
 }
 // A late challenge cannot replace a new connection's capability acknowledgement.
 const pair=peers('gh',{...base,featureRulesVersion:1,advertisingVersion:0,regionalGrowthVersion:1});
 await start(pair);
 const oldHello=pair.frames.filter(([,m])=>m.type==='hello'&&m.featureChallenge).at(-1)[1];
 pair.host.run('resetFeaturePeer();challengePeerFeatures()');
 const before=JSON.stringify(pair.host.state().game);
 pair.host.c.oldHello=oldHello;pair.host.run('handleMessage(oldHello)');
 assert(pair.host.run('peerFeatureStatus().pending'));assert.equal(pair.host.run('featurePeerCapabilities'),null);
 pair.host.run('syncPeers()');assert(pair.queue.every(([,m])=>m.type!=='state'),'Pending challenge leaked a new state');
 await pair.drain();assert(pair.host.run('peerFeatureStatus().compatible'));
 assert.equal(JSON.stringify(pair.host.state().game),before,'Handshake changed simulation or sealed plans');
 // Editing into a marked profile after a legacy opening must initiate the new
 // challenge, not leave both seats permanently blocked in the lobby.
 const changed=peers('gh',base);
 // A released peer supports modular rules but predates turn-envelope negotiation.
 // Emulate both halves of the released transport. Merely stripping the outgoing
 // capability while retaining the new incoming nonce requirement manufactures
 // a peer that can never acknowledge a challenge (no released client did that).
 changed.guest.run("const legacyTransportHello=makeFeatureHello;makeFeatureHello=request=>{const legacyRequest=request&&{...request};if(legacyRequest){delete legacyRequest.turnEnvelopeSupported;delete legacyRequest.turnGuestChallenge;}const message=legacyTransportHello(legacyRequest);delete message.turnEnvelopeSupported;delete message.turnGuestChallenge;return message};handleMessage({type:'hello_request'})");await changed.drain();
 assert.equal(changed.host.run('featurePeerFresh'),false);
 changeLobbyFeature(changed.host,'featureRulesVersion',true);
 if(changed.host.run('featureSelectionPending()'))assert(changed.host.confirmFeatures());
 changed.host.run('applyLobbySettings()');await changed.drain();
 assert(changed.host.run('peerFeatureStatus().compatible'));assert(changed.host.run('featurePeerFresh'));
 const oldChanged=peers('gh',base,true);oldChanged.guest.run("handleMessage({type:'hello_request'})");await oldChanged.drain();
 changeLobbyFeature(oldChanged.host,'featureRulesVersion',true);
 if(oldChanged.host.run('featureSelectionPending()'))assert(oldChanged.host.confirmFeatures());
 oldChanged.host.run('applyLobbySettings()');await oldChanged.drain();
 assert(!oldChanged.host.run('peerFeatureStatus().compatible'));assert(!oldChanged.host.run('peerFeatureStatus().pending'));
 oldChanged.host.run('editLobbyIdentity(true)');assert(!oldChanged.host.state().lobby.players[0].ready);
 changeLobbyFeature(oldChanged.host,'featureRulesVersion',false);
 if(oldChanged.host.run('featureSelectionPending()'))assert(oldChanged.host.confirmFeatures());
 oldChanged.host.run('applyLobbySettings()');await oldChanged.drain();
 assert(oldChanged.host.run('peerFeatureStatus().compatible'),'Known legacy capabilities recover when host selects legacy rules');
 return true;
}
async function checkpointChecks(){
 const pair=peers('gh',base);await start(pair);pair.guest.run('ghCheckpoint()');
 const raw=pair.guest.storage.get('branchWarsGhResume'),saved=JSON.parse(raw);
 assert(!raw.includes('PRIVATE_TEST_TOKEN'));
 assert.equal(saved.featurePeerCapabilities,undefined);assert.equal(saved.featurePeerFresh,undefined);
 for(const badView of [{...saved.view,version:'8.99'},{...saved.view,featureRulesVersion:9}]){
  const reload=harness('guest');reload.storage.set('branchWarsGhResume',JSON.stringify({...saved,view:badView}));
  reload.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  reload.run('gh.active=false;ghCheckRepo=async()=>{throw Error("Unexpected network call")}');
  await reload.run('ghResume()');
  assert.equal(reload.state().view,null,'Bad saved guest header was adopted');
  assert.equal(reload.state().gh.active,false);assert(reload.elements.get('#startMsg').textContent);
 }
 const lobbyPair=peers('gh',base);lobbyPair.guest.run("handleMessage({type:'hello_request'})");await lobbyPair.drain();
 lobbyPair.host.run('ghCheckpoint()');const opening=lobbyPair.host.storage.get('branchWarsGhResume');
 const reload=harness('host');reload.storage.set('branchWarsGhResume',opening);reload.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
 reload.run("gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true});sent=[];send=m=>sent.push(m)");
 await reload.run('ghResume()');
 assert(reload.state().lobby);assert(reload.run('peerFeatureStatus().pending'));
 assert(reload.run("sent.some(m=>m.type==='hello_request'&&m.featureChallenge)"));
 reload.run('startLobbyCampaign()');assert.equal(reload.state().game,null,'Resume began campaign without peer validation');
}
async function markedCheckpointResume(overrides={}){
 const probe=harness();if(probe.c.window.BWEngine.campaignCapabilities().featureRulesSupported!==1)return;
 const settings={...base,featureRulesVersion:1,advertisingVersion:0,regionalGrowthVersion:1,...overrides};
 const original=peers('gh',settings);await start(original);
 const expectedVersion=original.host.state().game.version;
 if(settings.productProgramsVersion===2){
  original.host.run("const checkpointPlans=game.players.map((p,i)=>E.chooseBot(game,i));checkpointPlans[0].productProgramPolicy.pricingBp.essential=25;E.submit(game,0,checkpointPlans[0]);E.submit(game,1,checkpointPlans[1]);syncPeers()");
  await original.drain();
  original.guest.c.pendingPricing=original.host.run('E.chooseBot(game,1)');
  original.guest.c.pendingPricing.productProgramPolicy.pricingBp.essential=25;
  if(settings.financialGroupVersion===3)original.guest.c.pendingPricing.agencyPolicy={
   ...original.guest.c.pendingPricing.agencyPolicy,target:'benefits',outreach:2,supportCap:1000};
  await original.guest.run('ghCommitPlan(pendingPricing)');await original.drain();
  assert.equal(original.host.state().game.players[1].submitted,null);
 }
 const originalBooks=copy(original.host.state().game.players.map(p=>p.productPrograms));
 const originalAgencies=settings.financialGroupVersion===3?copy(original.host.state().game.players.map(p=>p.agency)):null;
 const restored=[harness('host'),harness('guest')],queue=[];
 for(const [index,source]of [original.host,original.guest].entries()){
  source.run('ghCheckpoint()');const raw=source.storage.get('branchWarsGhResume'),saved=source.run(`(()=>{const saved=JSON.parse(localStorage.getItem('branchWarsGhResume'));for(const key of ['connection','game','view'])saved[key]=unpackStorageValue(saved[key]);return saved;})()`);
  assert(!raw.includes('PRIVATE_TEST_TOKEN'));assert.equal((saved.game||saved.view).featureRulesVersion,settings.featureRulesVersion);
  assert.equal(saved.featurePeerFresh,undefined);assert.equal(saved.featurePeerCapabilities,undefined);
  if(settings.financialGroupVersion===3){
   assert.equal((saved.game||saved.view).version,'9.2');
   if(index===1){
    assert.equal(saved.view.agencyEconomy,undefined);assert.equal(saved.view.rival.agency,undefined);
    assert.equal(saved.ghPendingPlan.plan.agencyPolicy.target,'benefits');
   }
  }
  const peer=restored[index];peer.storage.set('branchWarsGhResume',raw);peer.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  peer.c.enqueue=m=>queue.push([index,copy(m)]);
  peer.run('gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true});send=m=>enqueue(m)');
  await peer.run('ghResume()');assert(peer.state().gh.active);
  assert.equal((peer.state().game||peer.state().view).version,expectedVersion);assert.equal((peer.state().game||peer.state().view).featureRulesVersion,settings.featureRulesVersion);
 }
 const[host,guest]=restored;assert(host.run('peerFeatureStatus().pending'),'Reload must not trust a saved capability acknowledgement');
 for(let n=0;queue.length;n++){
  assert(n<100,'Reload handshake did not converge');const[index,message]=queue.shift(),peer=restored[1-index];peer.c.frame=message;await peer.run('handleMessage(frame)');
 }
 assert(host.run('peerFeatureStatus().compatible'));assert(host.run('featurePeerFresh'));
 for(const field of ['regionalGrowthVersion','advertisingVersion','productProgramsVersion','onboardingVersion']){
  assert.equal(host.state().game[field],settings[field]||undefined);assert.equal(guest.state().view[field],settings[field]||undefined);
 }
 assert.deepEqual(copy(host.state().game.players.map(p=>p.productPrograms)),originalBooks,'Checkpoint reload changed canonical products, prices or billed history');
 if(originalAgencies){
  assert.deepEqual(copy(host.state().game.players.map(p=>p.agency)),originalAgencies,'Checkpoint reload changed canonical agency books or reports');
  assert.deepEqual(copy(guest.state().view.me.agency),originalAgencies[1],'Guest reload lost the owner agency');
  assert.equal(guest.state().view.rival.agency,undefined);
 }
 if(settings.productProgramsVersion===2){
  assert(guest.state().ghPendingPlan,'Reload preserves the sealed price intent');
  assert.equal(host.state().game.players[1].submitted,null,'Reload cannot reveal a sealed price plan early');
  host.run('E.submit(game,0,E.chooseBot(game,0));syncPeers()');
  for(let n=0;queue.length;n++){
   assert(n<100,'Restored price reveal did not converge');const[index,message]=queue.shift(),peer=restored[1-index];peer.c.frame=message;await peer.run('handleMessage(frame)');
  }
  assert.equal(host.state().game.cycle,3);assert.equal(guest.state().ghPendingPlan,null);
  assert.equal(host.state().game.players[1].productPrograms.pricingBp.essential,25);
  assert.equal(guest.state().view.me.productPrograms.review.cycle,2);
  if(originalAgencies){
   assert.equal(guest.state().view.me.agency.report.cycle,2);
   assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].agencyPolicy,undefined);
  }
 }
 const hostRules=host.run("E.campaignRules(game,{context:'game'}).signature"),guestRules=guest.run("E.campaignRules(view,{context:'view'}).signature");
 assert.equal(hostRules,guestRules,'Reloaded seats disagree on marked campaign rules');
}
async function pricingPairs(){
 const profiles=[{}, {advertisingVersion:1,regionalGrowthVersion:1,relationshipOffersVersion:1,onboardingVersion:1}];
 // Modular profiles removed with the retired pilot; the chain profiles remain.
 for(const transport of ['gh','lan','p2p'])for(const profile of profiles){
  const settings={...base,...profile,productProgramsVersion:2},pair=peers(transport,settings),{host,guest}=pair;
  await start(pair);assert.equal(host.state().game.version,'8.15');assert(host.run('featurePeerFresh'));
  const plans=host.run('game.players.map((p,i)=>E.chooseBot(game,i))');
  plans[0].productProgramPolicy.pricingBp.essential=25;
  plans[1].productProgramPolicy.pricingBp.essential=-25;
  host.c.pricedPlan=plans[0];guest.c.pricedPlan=plans[1];
  if(transport==='gh'){
   await guest.run('ghCommitPlan(pricedPlan)');await pair.drain();
   assert(host.state().ghIncomingCommit);assert.equal(host.state().game.players[1].submitted,null);
   assert.equal(host.state().game.players[1].productPrograms.pricingBp.essential,0,'Sealing must not apply guest prices early');
   guest.run('ghCheckpoint()');const saved=JSON.parse(guest.storage.get('branchWarsGhResume'));
   assert.equal(saved.ghPendingPlan.plan.productProgramPolicy.pricingBp.essential,-25);
   assert.equal(saved.featurePeerCapabilities,undefined);assert.equal(saved.featurePeerFresh,undefined);
   host.run('E.submit(game,0,pricedPlan);syncPeers()');await pair.drain();
   assert.equal(guest.state().ghPendingPlan,null);
   const reveal=pair.frames.filter(([i,m])=>i===1&&m.type==='plan_reveal').at(-1)[1];
   const settled=JSON.stringify(host.state().game);host.c.duplicatePricing=copy(reveal);
   await host.run('handleMessage(duplicatePricing)');await pair.drain();
   assert.equal(JSON.stringify(host.state().game),settled,'Repeated reveal changed prices or billed interest twice');
  }else{
   host.run('E.submit(game,0,pricedPlan);syncPeers()');await pair.drain();
   guest.run("send(typeof turnMessage==='function'?turnMessage('plan',{plan:pricedPlan}):{type:'plan',plan:pricedPlan})");await pair.drain();
  }
  assert.equal(host.state().game.cycle,2);
  assert.deepEqual(copy(host.state().game.players.map(p=>p.productPrograms.pricingBp.essential)),[25,-25]);
  assert.equal(guest.state().view.version,'8.15');
  assert.equal(guest.state().view.rival.productPrograms,undefined);
  assert.equal(guest.state().view.rival.productQuotes.cycle,1);
  assert.equal(guest.state().view.me.productPrograms.review.cycle,1);
  assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].productProgramPolicy,undefined);
  const accepted=JSON.stringify(guest.state().view),bad=copy(guest.state().view);
  bad.me.productPrograms.review.billed.interest++;guest.c.badPricing=bad;
  assert.throws(()=>guest.run("handleMessage({type:'state',state:badPricing})"));
  assert.equal(JSON.stringify(guest.state().view),accepted);
  const previousHello=pair.frames.filter(([,m])=>m.type==='hello'&&m.featureChallenge).at(-1)[1];
  host.run('resetFeaturePeer();challengePeerFeatures()');host.c.previousHello=previousHello;
  host.run('handleMessage(previousHello)');assert(host.run('peerFeatureStatus().pending'));
  await pair.drain();assert(host.run('featurePeerFresh'));
  const old=peers(transport,settings);
  old.guest.run("const priorPricingHello=makeFeatureHello;makeFeatureHello=request=>({...priorPricingHello(request),productProgramsSupported:1});handleMessage({type:'hello_request'})");
  await old.drain();assert.equal(old.host.state().game,null);assert.equal(old.host.state().lobby,null);
  assert(old.frames.some(([,m])=>m.type==='error'&&/Product programmes/.test(m.message)));
 }
 return profiles.length*3;
}
async function main(){
 await financialGroupPairs();
 await activeAgencyPairs();
 headerChecks();await legacyPairs();await editableLobbies();const modular=await pilotPairs();await checkpointChecks();await markedCheckpointResume();
 await markedCheckpointResume({productProgramsVersion:2});
 await markedCheckpointResume({productProgramsVersion:2,featureRulesVersion:undefined,advertisingVersion:1,relationshipOffersVersion:1,onboardingVersion:1});
 const pricing=await pricingPairs();console.log('Pricing network PASS: '+pricing+' simulated lobby and priced-plan workflows, GitHub commit/reveal and duplicate protection, fresh v2 challenge, old-product-peer refusal, private billed reports, malformed report refusal and reconnect fences. Physical two-computer acceptance remains separate.');
 console.log('Feature network PASS: legacy peer compatibility, all three simulated transports, rule-only state rejection before adoption, immutable active rules, private checkpoint validation and resume handshake'+(modular?', all four marked combinations, strict old-peer refusal and stale-challenge fences.':'; modular pilot is not activated yet.'));
}

async function activeAgencyPairs(){
 const E=harness().c.window.BWEngine;
 const settings=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:3}).options;
 for(const transport of ['gh','lan','p2p']){
  const pair=peers(transport,settings),{host,guest}=pair;await start(pair);
  // This is a funded NETWORK fixture, not a banking strategy benchmark. A
  // simulated prior capital return moves existing bank cash/capital into the
  // parent and reduces its bank-investment basis. It creates no resources and
  // is not an implemented player action. agency.test.js separately proves a
  // normal AI campaign can earn bank profits, legally pay dividends and launch.
  // Requiring BOTH banks to achieve that within 18 arbitrary months incorrectly
  // made transport tests depend on macro/AI profitability and funding luck.
  host.run(`(()=>{
   for(const p of game.players){
    const before=E.GroupAccounting.consolidate(p.financialGroup.parent,[],p.accounting);
    p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.priorCapitalReturn',
     {cash:-120000,equity:-120000});
    p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;
    p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,
     'fixture.priorCapitalReturn',p.id,{cash:120000,investments:-120000});
    p.financialGroup.investmentBasis.bank-=120000;
    const after=E.GroupAccounting.consolidate(p.financialGroup.parent,[],p.accounting);
    for(const key of ['assets','liabilities','equity','retainedEarnings','custodyAssets'])
     if(before[key]!==after[key])throw Error('Network funding fixture created resources: '+key);
   }
   E.validatePilot(game);E.validateLedger(game);syncPeers();
  })()`);await pair.drain();
  assert(host.run('game.players.every(p=>p.financialGroup.parent.accounts.cash>=120000)'),
   'Conserved fixture capital must fund both simultaneous launches');
  const cycle=host.state().game.cycle,parent=host.state().game.players.map(p=>p.financialGroup.parent.accounts.cash);
  const plans=host.run('game.players.map((p,i)=>E.chooseBot(game,i))');
  for(const [i,q]of plans.entries()){
   q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;
   q.agencyPolicy={launch:true,capital:120000,staff:1,target:i?'liability':'property',outreach:2,supportCap:0,dividend:0};
  }
  host.c.activeAgencyPlan=plans[0];guest.c.activeAgencyPlan=plans[1];
  const beforeSeal=JSON.stringify(host.state().game.players.map(p=>p.agency));
  if(transport==='gh'){
   await guest.run('ghCommitPlan(activeAgencyPlan)');await pair.drain();
   assert.equal(JSON.stringify(host.state().game.players.map(p=>p.agency)),beforeSeal,'Sealing launched an agency early');
   assert.equal(host.state().game.players[1].submitted,null);
   guest.run('ghCheckpoint()');const sealed=JSON.parse(guest.storage.get('branchWarsGhResume'));
   assert.deepEqual(copy(sealed.ghPendingPlan.plan.agencyPolicy),copy(plans[1].agencyPolicy));
   host.run('E.submit(game,0,activeAgencyPlan);syncPeers()');await pair.drain();
   const reveal=copy(pair.frames.filter(([i,m])=>i===1&&m.type==='plan_reveal').at(-1)[1]);
   const settled=JSON.stringify(host.state().game);host.c.repeatedAgencyLaunch=reveal;
   await host.run('handleMessage(repeatedAgencyLaunch)');await pair.drain();
   assert.equal(JSON.stringify(host.state().game),settled,'Duplicate reveal repeated launch/cost/commission');
  }else{
   host.run('E.submit(game,0,activeAgencyPlan);syncPeers()');await pair.drain();
   guest.run("send(typeof turnMessage==='function'?turnMessage('plan',{plan:activeAgencyPlan}):{type:'plan',plan:activeAgencyPlan})");await pair.drain();
  }
  assert.equal(host.state().game.cycle,cycle+1);
  for(const [i,p]of host.state().game.players.entries()){
   assert.equal(p.agency.status,'active');assert.equal(p.agency.report.capital,120000);
   assert.equal(p.agency.report.setup,30000);assert(p.agency.report.expense>0);assert(p.agency.report.commission>0);
   assert.equal(p.financialGroup.parent.accounts.cash,parent[i]-120000);
  }
  const owner=guest.state().view.me.agency;
  assert.deepEqual(copy(owner),copy(host.state().game.players[1].agency));
  assert(owner.book.accounts.cash>0&&owner.report.commission>0,'Owner projection must expose actual nonzero financial results');
  assert.equal(guest.state().view.rival.agency,undefined);assert.equal(guest.state().view.agencyEconomy,undefined);
  assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].agencyPolicy,undefined);
  if(transport==='gh'){
   for(const peer of [host,guest])peer.run('ghCheckpoint()');
   const readCheckpoint=peer=>peer.run(`(()=>{const saved=JSON.parse(sessionStorage.getItem('branchWarsGhResume'));
    for(const key of ['connection','game','view'])saved[key]=unpackStorageValue(saved[key]);return saved;})()`);
   const hostSaved=readCheckpoint(host),guestSaved=readCheckpoint(guest);
   assert.deepEqual(copy(hostSaved.game.players[1].agency),copy(owner));
   assert.deepEqual(copy(guestSaved.view.me.agency),copy(owner));
   assert.equal(guestSaved.view.rival.agency,undefined);assert.equal(guestSaved.view.agencyEconomy,undefined);
   assert.equal(hostSaved.featurePeerCapabilities,undefined);assert.equal(guestSaved.featurePeerCapabilities,undefined);
  }
 }
 console.log('Active agency network PASS: conserved prior-funded fixture, paid simultaneous launches and nonzero owner reports across three transports; sealed launch and duplicate charging protection, private checkpoints. Normal-play earned funding is verified separately by agency.test.js.');
}
main().catch(error=>{console.error(error);process.exitCode=1});

async function financialGroupPairs(){for(const rules of [1,2,3]){
 const probe=harness(),E=probe.c.window.BWEngine;
 const settings=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options;
 for(const transport of ['gh','lan','p2p']){
  const pair=peers(transport,settings),{host,guest}=pair;await start(pair);
  assert.equal(host.state().game.version,({1:'9.0',2:'9.1',3:'9.2'})[rules]);assert.equal(guest.state().view.financialGroupVersion,rules);
  assert(host.run('featurePeerFresh'),'Group rules need a fresh connection-bound handshake');
  const plans=host.run('game.players.map((p,i)=>E.chooseBot(game,i))');
  plans[0].groupPolicy.creditAllocation={mortgage:50,middleMarket:25,consumer:25};
  plans[1].groupPolicy.creditAllocation={mortgage:25,middleMarket:25,consumer:50};
  if(rules===3){
   plans[0].agencyPolicy={...plans[0].agencyPolicy,target:'liability',outreach:1,supportCap:2000};
   plans[1].agencyPolicy={...plans[1].agencyPolicy,target:'benefits',outreach:2,supportCap:1000};
   // Every missing/extra policy key is invalid; omission of the entire policy
   // remains the engine's deliberate default-policy normalization contract.
   const owner=host.state().game.players[1],before=JSON.stringify(owner);
   for(const field of Object.keys(plans[1].agencyPolicy)){
    const bad=copy(plans[1]);delete bad.agencyPolicy[field];
    assert.throws(()=>E.normalizeAgencyPlan(owner,bad),/agency instructions/i,'Missing '+field+' accepted');
    assert.equal(JSON.stringify(owner),before,'Invalid agency plan mutated player');
   }
   const extra=copy(plans[1]);extra.agencyPolicy.privateExtra=1;
   assert.throws(()=>E.normalizeAgencyPlan(owner,extra),/agency instructions/i);
  }
  host.c.groupPlan=plans[0];guest.c.groupPlan=plans[1];
  if(transport==='gh'){
   await guest.run('ghCommitPlan(groupPlan)');await pair.drain();
   assert.equal(host.state().game.players[1].submitted,null);
   guest.run('ghCheckpoint()');const checkpoint=guest.run(`(()=>{const saved=JSON.parse(localStorage.getItem('branchWarsGhResume'));for(const key of ['connection','game','view'])saved[key]=unpackStorageValue(saved[key]);return saved;})()`);
   assert.deepEqual(copy(checkpoint.ghPendingPlan.plan.groupPolicy),copy(plans[1].groupPolicy));
   if(rules===3){
    assert.deepEqual(copy(checkpoint.ghPendingPlan.plan.agencyPolicy),copy(plans[1].agencyPolicy));
    assert.equal(checkpoint.view.rival.agency,undefined);assert.equal(checkpoint.view.agencyEconomy,undefined);
    assert.equal(checkpoint.featurePeerCapabilities,undefined);assert.equal(checkpoint.featurePeerFresh,undefined);
    assert(!JSON.stringify(checkpoint).includes('PRIVATE_TEST_TOKEN'));
   }
   host.run('E.submit(game,0,groupPlan);syncPeers()');await pair.drain();
   const reveal=pair.frames.filter(([i,m])=>i===1&&m.type==='plan_reveal').at(-1)[1];
   const settled=JSON.stringify(host.state().game);host.c.duplicateGroup=copy(reveal);
   await host.run('handleMessage(duplicateGroup)');await pair.drain();assert.equal(JSON.stringify(host.state().game),settled);
  }else{
   host.run('E.submit(game,0,groupPlan);syncPeers()');await pair.drain();
   guest.run("send(typeof turnMessage==='function'?turnMessage('plan',{plan:groupPlan}):{type:'plan',plan:groupPlan})");await pair.drain();
  }
  assert.equal(host.state().game.cycle,2);
  assert.deepEqual(copy(guest.state().view.me.creditPortfolio.allocation),copy(plans[1].groupPolicy.creditAllocation));
  assert.equal(guest.state().view.rival.financialGroup,undefined);
  assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].groupPolicy,undefined);
  if(rules===3){
   assert.deepEqual(copy(guest.state().view.me.agency),copy(host.state().game.players[1].agency));
   assert.equal(guest.state().view.me.agency.report.cycle,1);
   assert.equal(guest.state().view.rival.agency,undefined);assert.equal(guest.state().view.rival.agencySnapshot,undefined);
   assert.equal(guest.state().view.agencyEconomy,undefined);
   assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].agencyPolicy,undefined);
   assert(pair.frames.filter(([,m])=>m.type==='state').every(([,m])=>
    m.state.rival.agency===undefined&&m.state.rival.agencySnapshot===undefined&&m.state.agencyEconomy===undefined),
    'A transmitted owner view leaked private agency or global counterparty books');
  }
  const accepted=JSON.stringify(guest.state().view);
  for(const damage of [v=>v.me.financialGroup.parent.accounts.cash++,v=>delete v.financialGroupVersion,v=>v.rival.financialGroup=copy(v.me.financialGroup),...(rules>=2?[v=>v.me.companySnapshot.world.month++,v=>v.me.companySnapshot.services[0].provider=9,v=>v.rival.corporate=copy(v.me.corporate)]:[]),...(rules===3?[
   v=>delete v.me.agency,v=>delete v.me.agency.book,v=>delete v.me.agency.policy.supportCap,
   v=>delete v.me.agency.report.expense,v=>v.me.agency.report.cycle=99,
   v=>v.me.agency.book.accounts.cash++,v=>delete v.me.agencySnapshot,
   v=>v.me.agencySnapshot.month++,v=>v.me.agencySnapshot.relationships.pop(),
   v=>v.rival.agency=copy(v.me.agency),v=>v.rival.agencySnapshot=copy(v.me.agencySnapshot),
   v=>v.lastPlans[v.rival.id].agencyPolicy=copy(plans[0].agencyPolicy),
   v=>v.agencyEconomy=copy(host.state().game.agencyEconomy),v=>v.version='9.1'
  ]:[])]){
   const bad=copy(guest.state().view);damage(bad);guest.c.badGroup=bad;
   assert.throws(()=>guest.run("handleMessage({type:'state',state:badGroup})"));
   assert.equal(JSON.stringify(guest.state().view),accepted);
  }
  if(rules===3){
   const priorHello=copy(pair.frames.filter(([,m])=>m.type==='hello'&&m.featureChallenge).at(-1)[1]);
   const before=JSON.stringify(host.state().game);
   host.run('resetFeaturePeer();challengePeerFeatures()');host.c.staleAgencyHello=priorHello;
   host.run('handleMessage(staleAgencyHello)');
   assert(host.run('peerFeatureStatus().pending'));assert.equal(host.run('featurePeerCapabilities'),null);
   await pair.drain();assert(host.run('featurePeerFresh'));assert(host.run('peerFeatureStatus().compatible'));
   assert.equal(JSON.stringify(host.state().game),before,'Fresh agency handshake changed simulation');
  }
  const old=peers(transport,settings);
  old.guest.run("const oldGroupHello=makeFeatureHello;makeFeatureHello=request=>{const message=oldGroupHello(request);message.financialGroupSupported="+(rules-1)+";return message};handleMessage({type:'hello_request'})");
  await old.drain();assert.equal(old.host.state().lobby,null);assert.equal(old.host.state().game,null);
  assert(old.frames.some(([,m])=>m.type==='error'&&/Financial Group/.test(m.message)));
 }
 await markedCheckpointResume({...settings,featureRulesVersion:undefined});
 console.log('Financial Group network PASS: rules '+rules+', three simulated transports, portfolio'+(rules===3?'/agency':'')+' commitment/reveal, duplicate protection, private owner books/reports, malformed state refusal, old-peer refusal and two-peer GitHub checkpoint reload.');
 }
}
