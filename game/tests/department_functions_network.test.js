'use strict';
// Actual complete clients over simulated transports. No GitHub/network I/O and
// no claim that this substitutes for a physical two-computer session.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(x).digest('hex');
const reference='reports/reference-builds/BRANCH_WARS_facility_group5_ba759abc.html',oldHtml=fs.readFileSync(path.join(root,reference),'utf8');
assert.equal(hash(oldHtml),'ba759abce19b84eb495307713a98db607746d85852fd63fe9199c8a6a931619c');
const portable=process.argv.includes('--portable'),html=portable?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const candidateSha256=hash(html),harnessFile=path.join(__dirname,'github_resilience.test.js'),harnessText=fs.readFileSync(harnessFile,'utf8');
function loadHarness(document){
 const text=harnessText.replace(/^const html=.*;\r?$/m,'const html=module.candidateDocument;');
 assert.notEqual(text,harnessText,'Harness must load selected actual client');
 const owner=new Module(harnessFile,module);owner.filename=harnessFile;owner.paths=module.paths;owner.candidateDocument=document;
 owner._compile(text,harnessFile);return owner.exports.harness;
}
const modern=loadHarness(html),legacy=loadHarness(oldHtml),E=modern().c.window.BWEngine;
const campaignVersion=process.argv.includes('--v31')?7:6,saveVersion=campaignVersion===7?'9.6':'9.5';
assert.equal(E.campaignCapabilities().financialGroupSupported,8);assert.equal(legacy().c.window.BWEngine.campaignCapabilities().financialGroupSupported,5);
console.log(JSON.stringify({suite:'department-functions-network',phase:'opening',candidateSha256,reference}));
const same=(a,b,label)=>assert.deepEqual(copy(a),copy(b),label);
function changedPath(a,b,path='game'){
 if(JSON.stringify(a)===JSON.stringify(b))return null;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return {path,before:a,after:b};
 for(const key of new Set([...Object.keys(a),...Object.keys(b)])){const found=changedPath(a[key],b[key],path+'.'+key);if(found)return found;}
 return {path,reason:'Object key ordering only'};
}
function peers(transport,rules=campaignVersion,oldSide=null){
 const host=(oldSide==='host'?legacy:modern)('host'),guest=(oldSide==='guest'?legacy:modern)('guest'),queue=[],frames=[];
 for(const [i,p]of [host,guest].entries()){
  p.c.enqueue=m=>{queue.push([i,copy(m)]);frames.push([i,copy(m)]);};
  p.run("game=null;view=null;lobby=null;diagnostics=[];toast=m=>diagnostics.push(m);send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'regional',scenario:'balanced'};resetFeaturePeer()");
  if(transport!=='gh')p.run('gh.active=false;lan={...emptyLan(),active:'+(transport==='lan')+'}');
 }
 host.c.settings=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options;host.run('Object.assign(p2pConfig,settings)');
 const drain=async()=>{for(let n=0;queue.length;n++){assert(n<150,'Message loop did not converge');const [i,m]=queue.shift(),p=i?host:guest;p.c.frame=m;await p.run('handleMessage(frame)');}};
 return {host,guest,queue,frames,drain};
}
async function open(pair){pair.guest.run('send(makeFeatureHello())');await pair.drain();assert(pair.host.state().lobby&&pair.guest.state().lobby);assert(pair.host.run('peerFeatureStatus().compatible'));}
async function start(pair){
 pair.host.run('editLobbyIdentity(true)');await pair.drain();pair.guest.run('editLobbyIdentity(true)');await pair.drain();
 assert(pair.host.state().lobby.players.every(p=>p.ready));pair.host.run('startLobbyCampaign()');await pair.drain();
 assert(pair.host.state().game&&pair.guest.state().view,'Lobby start failed: '+JSON.stringify(pair.frames.filter(([,m])=>m.type==='error')));
}
function privateState(pair){
 const g=pair.host.state().game,v=pair.guest.state().view;assert.equal(g.version,saveVersion);assert.equal(v.version,saveVersion);assert.equal(v.financialGroupVersion,campaignVersion);
 E.validatePilot(g);E.validateLedger(g);E.validateFinancialGroupView(v);pair.guest.run("validateIncomingFeatureRules(view,'view')");
 same(v.me.departmentFunctions,g.players[1].departmentFunctions,'Owner receives only its function book');
 same(v.me.departmentFunctionDelivery,g.players[1].departmentFunctionDelivery,'Owner receives its causal delivery');
 for(const key of ['departmentFunctions','departmentFunctionDelivery','departmentOffice','facilityNetwork','facilityLifecycle','agency','financialGroup'])assert.equal(v.rival[key],undefined,key+' leaked');
 for(const key of ['departmentFunctionEconomy','departmentEconomy','facilityEconomy','agencyEconomy'])assert.equal(v[key],undefined,key+' leaked');
 assert.equal(v.lastPlans?.[v.rival.id]?.departmentFunctionsPolicy,undefined);
}
function plans(pair){return pair.host.run(`game.players.map((p,i)=>{
 const q=E.chooseBot(game,i);q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;q.specialistHires=E.emptySpecialistOrders();
 q.competitiveAction='none';q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;q.agencyPolicy=E.defaultAgencyPlan(p);
 q.facilityPolicy=E.defaultFacilityPolicy(p);Object.assign(q,E.defaultDepartmentPlan(p));q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);
 q.departmentFunctionsPolicy=E.defaultDepartmentFunctionsPolicy(p);q.departmentFunctionsPolicy.vendors.credit=1+i;
 q.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(game,p,q).policy;return q;
})`);}
async function submit(pair,input,transport){
 pair.host.c.plan=copy(input[0]);pair.guest.c.plan=copy(input[1]);
 if(transport==='gh'){
  await guestSubmit(pair,input[1]);await pair.drain();assert.equal(pair.host.state().game.players[1].submitted,null);
  pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
 }else{
  pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();await guestSubmit(pair,input[1]);await pair.drain();
 }
}
async function guestSubmit(pair,plan){
 pair.guest.c.inputPlan=copy(plan);const before=pair.frames.length;
 await pair.guest.run('draft=JSON.parse(JSON.stringify(inputPlan));submitPlan()');
 const sent=pair.frames.slice(before).filter(([i,m])=>i===1&&['plan','plan_commit'].includes(m.type));
 assert.equal(sent.length,1,'Actual submitPlan must send exactly one intended packet; UI reason: '+pair.guest.elements.get('#submitMsg').textContent);
 return copy(sent[0][1]);
}
async function reload(pair){
 const restored=[modern('host'),modern('guest')],queue=[],frames=[];
 for(const [i,p]of [pair.host,pair.guest].entries()){
  p.run('ghCheckpoint()');const raw=p.storage.get('branchWarsGhResume');assert(!raw.includes('PRIVATE_TEST_TOKEN'));
  const saved=p.run("(()=>{const s=JSON.parse(sessionStorage.getItem('branchWarsGhResume'));for(const k of ['connection','game','view'])s[k]=unpackStorageValue(s[k]);return s;})()");
  assert.equal((saved.game||saved.view).version,saveVersion);assert.equal(saved.featurePeerCapabilities,undefined);assert.equal(saved.featurePeerFresh,undefined);
  if(i===1){assert.equal(saved.view.rival.departmentFunctions,undefined);assert.equal(saved.view.departmentFunctionEconomy,undefined);}
  const target=restored[i];target.storage.set('branchWarsGhResume',raw);target.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  target.c.enqueue=m=>{queue.push([i,copy(m)]);frames.push([i,copy(m)]);};
  target.run('gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true});send=m=>enqueue(m)');
  await target.run('ghResume()');assert(target.state().gh.active,'Valid Group6 checkpoint refused');
 }
 const [host,guest]=restored;assert(host.run('peerFeatureStatus().pending'));
 const drain=async()=>{for(let n=0;queue.length;n++){assert(n<150);const [i,m]=queue.shift(),p=restored[1-i];p.c.frame=m;await p.run('handleMessage(frame)');}};
 await drain();assert(host.run('featurePeerFresh'));assert(host.run('peerFeatureStatus().compatible'));return {host,guest,queue,frames,drain};
}
async function malformedCheckpoint(pair){
 for(const [side,p]of [['host',pair.host],['guest',pair.guest]]){
  p.run('ghCheckpoint()');const saved=p.run("(()=>{const s=JSON.parse(sessionStorage.getItem('branchWarsGhResume'));for(const k of ['connection','game','view'])s[k]=unpackStorageValue(s[k]);s.version=1;return s;})()");
  (side==='host'?saved.game.players[0]:saved.view.me).departmentFunctions.lastCycle++;
  const h=modern(side);h.c.saved=saved;h.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  h.run("game=null;view=null;gh.active=false;errors=[];setStartMessage=m=>errors.push(m);sessionStorage.setItem('branchWarsGhResume',JSON.stringify(saved));ghCheckRepo=async()=>{throw Error('Invalid checkpoint reached external lookup')}");
  await h.run('ghResume()');assert.equal(h.state().gh.active,false);assert.equal(h.state().game,null);assert.equal(h.state().view,null);
  assert(h.run('errors.length>0'));assert(h.run("errors.every(m=>!m.includes('external lookup'))"));
 }
}
async function boundaries(){
 let mixed=0;
 for(const transport of ['gh','lan','p2p']){
  const refused=peers(transport,campaignVersion,'guest');refused.guest.run('send(makeFeatureHello())');await refused.drain();
  assert.equal(refused.host.state().game,null);assert.equal(refused.host.state().lobby,null);assert.equal(refused.guest.state().view,null);
  assert(refused.frames.some(([,m])=>m.type==='error'&&/Financial Group/i.test(m.message)));
  assert(refused.frames.every(([,m])=>m.type!=='state'),'Old Group5 client received unsupported Group6 state');
  for(const side of ['host','guest']){const p=peers(transport,5,side);await open(p);await start(p);assert.equal(p.host.state().game.version,'9.4');assert.equal(p.guest.state().view.me.departmentFunctions,undefined);mixed++;}
  const p=peers(transport,5);await open(p);p.host.run('editLobbyIdentity(true)');await p.drain();p.guest.run('editLobbyIdentity(true)');await p.drain();const revision=p.host.state().lobby.revision;
  p.host.run("stageLobbyFeatures(E.previewFeatureSelection(lobby.settings,{field:'financialGroupVersion',value:"+campaignVersion+"}).options,lobby.revision);applyLobbySettings()");await p.drain();
  assert.equal(p.host.state().lobby.revision,revision+1);assert(p.host.state().lobby.players.every(x=>!x.ready));assert.equal(p.guest.state().lobby.settings.financialGroupVersion,campaignVersion);await start(p);privateState(p);
 }
 return mixed;
}
async function turnEnvelopeCases(transport){
 const p=peers(transport);await open(p);await start(p);
 const input=plans(p),originalGame=JSON.stringify(p.host.state().game),packet=await guestSubmit(p,input[1]);
 assert.equal(packet.type,'plan');assert(packet.turnContext&&packet.turnContext.version===1,'Actual modern UI must echo a challenged turn token');
 assert.equal(packet.cycle,p.host.state().game.cycle);assert.equal(packet.resolutionId,p.host.state().game.resolutionId);
 // Delay this genuine UI frame while exercising malformed copies. This models
 // transport delay only; no authoritative campaign or plan state is modified.
 const queued=p.queue.findIndex(([i,m])=>i===1&&m.type==='plan');assert(queued>=0);p.queue.splice(queued,1);
 for(const mutate of [m=>{delete m.turnContext;},m=>{delete m.cycle;},m=>{m.cycle++;m.turnContext.cycle++;},
  m=>{m.resolutionId++;m.turnContext.resolutionId++;},m=>{m.turnContext.token+='wrong';},m=>{m.turnContext.version=2;}]){
  const bad=copy(packet);mutate(bad);p.host.c.bad=bad;await p.host.run('handleMessage(bad)');await p.drain();
  assert.equal(hash(JSON.stringify(p.host.state().game)),hash(originalGame),'Malformed envelope adopted a plan: '+JSON.stringify(changedPath(JSON.parse(originalGame),p.host.state().game)));
 }
 p.host.c.packet=packet;await p.host.run('handleMessage(packet)');await p.drain();
 assert(p.host.state().game.players[1].submitted);assert.equal(p.host.state().game.cycle,1);
 const sealed=JSON.stringify(p.host.state().game);
 await p.host.run('handleMessage(packet)');await p.drain();assert.equal(hash(JSON.stringify(p.host.state().game)),hash(sealed),'Same-month duplicate changed the sealed plan');
 const recall={...copy(packet),type:'recall'};delete recall.plan;
 for(const bad of [{...recall,turnContext:undefined},{...recall,cycle:recall.cycle+1},{...recall,turnContext:{...recall.turnContext,token:'wrong-token'}}]){
  p.host.c.bad=bad;await p.host.run('handleMessage(bad)');await p.drain();assert.equal(hash(JSON.stringify(p.host.state().game)),hash(sealed),'Invalid recall changed the sealed plan');
 }
 p.guest.run('recallPlan()');await p.drain();assert.equal(p.host.state().game.players[1].submitted,null);
 const recalled=JSON.stringify(p.host.state().game);assert.equal(hash(recalled),hash(originalGame),'Recall must not pay or settle');
 p.host.run('resetFeaturePeer();challengePeerFeatures()');p.guest.run('resetFeaturePeer()');await p.drain();
 assert(p.host.run('peerFeatureStatus().compatible'));p.host.run('syncPeers()');await p.drain();
 assert.notEqual(p.guest.run('incomingTurnContext.token'),packet.turnContext.token,'Reconnect must mint a distinct turn token');
 p.host.c.packet=packet;await p.host.run('handleMessage(packet)');await p.drain();
 assert.equal(hash(JSON.stringify(p.host.state().game)),hash(recalled),'Previous-connection plan was adopted after reconnect');
 await guestSubmit(p,input[1]);await p.drain();assert(p.host.state().game.players[1].submitted,'Fresh same-month packet must remain usable');
 p.guest.run('recallPlan()');await p.drain();assert.equal(hash(JSON.stringify(p.host.state().game)),hash(originalGame));
 console.log('PASS '+transport+' actual UI plan/recall envelope, missing/future/wrong-token, duplicates and reconnect fencing');
}
async function stateOrderingCases(transport){
 const p=peers(transport);await open(p);await start(p);const input=plans(p);
 const openingState=copy(p.frames.findLast(([i,m])=>i===0&&m.type==='state')[1]);
 const oldChallenge=copy(p.frames.find(([i,m])=>i===0&&m.type==='hello_request'&&m.featureChallenge)[1]);
 await guestSubmit(p,input[1]);await p.drain();
 const sealedState=copy(p.frames.findLast(([i,m])=>i===0&&m.type==='state')[1]);
 assert(sealedState.turnContext.revision>openingState.turnContext.revision);assert(p.guest.state().view.me.submitted);
 p.guest.c.stale=openingState;const readyView=JSON.stringify(p.guest.state().view);await p.guest.run('handleMessage(stale)');
 assert.equal(JSON.stringify(p.guest.state().view),readyView,'Older same-month state cleared readiness');
 p.guest.run('recallPlan()');await p.drain();assert(!p.guest.state().view.me.submitted);
 const recalled=JSON.stringify(p.guest.state().view),currentToken=p.guest.run('incomingTurnContext.token');
 assert.notEqual(currentToken,sealedState.turnContext.token,'Accepted recall rotates authorization');
 p.guest.c.stale=sealedState;await p.guest.run('handleMessage(stale)');assert.equal(JSON.stringify(p.guest.state().view),recalled,'Stale sealed state restored a recalled plan');
 await guestSubmit(p,input[1]);await p.drain();const newReady=JSON.stringify(p.guest.state().view),pending=p.guest.run('JSON.stringify(ghPendingPlan)');
 p.guest.c.staleError={type:'error',code:'plan_rejected',message:'delayed rejection',cycle:sealedState.state.cycle,resolutionId:sealedState.state.resolutionId,turnContext:sealedState.turnContext};
 await p.guest.run('handleMessage(staleError)');assert.equal(JSON.stringify(p.guest.state().view),newReady,'Correlated old rejection cleared newer readiness');
 assert.equal(p.guest.run('JSON.stringify(ghPendingPlan)'),pending,'Correlated old rejection erased a newer seal');
 p.host.run('resetFeaturePeer();challengePeerFeatures()');p.guest.run('resetFeaturePeer()');await p.drain();p.host.run('syncPeers()');await p.drain();
 const reconnected=JSON.stringify(p.guest.state().view),newSession=p.guest.run('incomingTurnChallenge');
 assert.notEqual(newSession,sealedState.turnContext.session);
 p.guest.c.stale=sealedState;await p.guest.run('handleMessage(stale)');assert.equal(JSON.stringify(p.guest.state().view),reconnected,'Previous connection state rolled back the bank');
 // Replaying an already-seen old hello_request cannot restore its state session.
 p.guest.c.oldChallenge=oldChallenge;await p.guest.run('handleMessage(oldChallenge)');await p.drain();
 assert.equal(p.guest.run('incomingTurnChallenge'),newSession);
 console.log('PASS '+transport+' state revision/session ordering, recall and stale-error correlation');
}
async function pendingCheckpointCase(){
 let p=peers('gh');await open(p);await start(p);const input=plans(p);
 const oldCommit=await guestSubmit(p,input[1]);await p.drain();
 const savedSeal=copy(p.guest.state().ghPendingPlan),before=copy(p.host.state().game);
 assert.equal(before.players[1].submitted,null);assert(savedSeal&&!savedSeal.revealed);
 p=await reload(p);const rebound=p.guest.state().ghPendingPlan;
 same([rebound.plan,rebound.nonce,rebound.hash,rebound.cycle],[savedSeal.plan,savedSeal.nonce,savedSeal.hash,savedSeal.cycle],'Reconnect must retain the exact sealed order and nonce');
 const freshCommit=copy(p.frames.findLast(([i,m])=>i===1&&m.type==='plan_commit')[1]);
 assert.notEqual(freshCommit.turnContext.token,oldCommit.turnContext.token);assert.notEqual(freshCommit.turnContext.session,oldCommit.turnContext.session);
 const priorCommit=p.host.run('JSON.stringify(ghIncomingCommit)');p.host.c.oldCommit=oldCommit;await p.host.run('handleMessage(oldCommit)');await p.drain();
 assert.equal(p.host.run('JSON.stringify(ghIncomingCommit)'),priorCommit,'Old connection commit replaced the refreshed seal');
 assert.equal(p.guest.state().ghPendingPlan.hash,savedSeal.hash);assert.equal(p.host.state().game.cycle,1);
 same(p.host.state().game.players.map(x=>x.departmentFunctions),before.players.map(x=>x.departmentFunctions),'Sealing/resume must not pay vendors');
 p.host.c.plan=copy(input[0]);p.host.run('E.submit(game,0,plan);syncPeers()');await p.drain();
 assert.equal(p.host.state().game.cycle,2);privateState(p);assert.equal(p.guest.state().ghPendingPlan,null);
 const reveal=p.frames.findLast(([i,m])=>i===1&&m.type==='plan_reveal')[1];
 assert.equal(reveal.turnContext.session,freshCommit.turnContext.session);assert.equal(reveal.turnContext.token,freshCommit.turnContext.token);
 assert.equal(p.host.state().game.departmentFunctionEconomy.paid,3*E.DepartmentFunctions.FUNCTIONS.credit.vendorRate);
 console.log('PASS GitHub pending sealed checkpoint preserves nonce/plan and refreshes transport authorization exactly once');
}
async function deferredRevealCase(rejectHash){
 const p=peers('gh');await open(p);await start(p);const input=plans(p);
 await guestSubmit(p,input[1]);await p.drain();
 p.host.c.plan=copy(input[0]);p.host.run('E.submit(game,0,plan);syncPeers()');
 // Deliver real state updates until the actual guest emits its reveal. Hold only
 // crypto completion, not a fabricated campaign/commitment/accounting fixture.
 let reveal=null;
 for(let n=0;p.queue.length;n++){
  assert(n<150);const [i,m]=p.queue.shift();if(i===1&&m.type==='plan_reveal'){reveal=copy(m);break;}
  const target=i?p.host:p.guest;target.c.frame=m;await target.run('handleMessage(frame)');
 }
 assert(reveal&&reveal.turnContext);let resolveDigest,rejectDigest;
 p.host.c.holdDigest=(resolve,reject)=>{resolveDigest=resolve;rejectDigest=reject;};
 p.host.run('const unpausedHash=ghPlanHash;ghPlanHash=()=>new Promise((resolve,reject)=>holdDigest(resolve,reject))');
 p.host.c.reveal=reveal;const pending=p.host.run('handleMessage(reveal)');assert(resolveDigest&&rejectDigest);
 // Host recalls its own unopposed plan while the guest hash is in flight; then
 // the guest can legitimately recall the old seal and create a new commitment.
 p.host.run('recallPlan()');await p.drain();assert.equal(p.host.state().game.players[0].submitted,null);
 p.guest.run('recallPlan()');await p.drain();assert.equal(p.host.run('ghIncomingCommit'),null);assert.equal(p.guest.state().ghPendingPlan,null);
 await guestSubmit(p,input[1]);await p.drain();const newer=p.host.run('JSON.stringify(ghIncomingCommit)'),newSeal=copy(p.guest.state().ghPendingPlan),gameBefore=JSON.stringify(p.host.state().game);
 assert(newer&&newSeal.hash!==reveal.hash);
 if(rejectHash)rejectDigest(Error('Delayed old digest rejected'));else resolveDigest('0'.repeat(64));
 await pending;await p.drain();p.host.run('ghPlanHash=unpausedHash');
 assert.equal(p.host.run('JSON.stringify(ghIncomingCommit)'),newer,'Obsolete async hash cleared/replaced newer commitment');
 assert.equal(p.guest.state().ghPendingPlan.hash,newSeal.hash,'Obsolete async rejection cleared newer guest seal');
 assert.equal(hash(JSON.stringify(p.host.state().game)),hash(gameBefore),'Obsolete async reveal changed bank state');
 p.host.c.plan=copy(input[0]);p.host.run('E.submit(game,0,plan);syncPeers()');await p.drain();
 assert.equal(p.host.state().game.cycle,2);privateState(p);
 console.log('PASS GitHub deferred '+(rejectHash?'rejected':'mismatched')+' old hash cannot erase recalled/replaced commitment');
}
async function duplicateCommitDuringReveal(){
 const p=peers('gh');await open(p);await start(p);const input=plans(p),commit=await guestSubmit(p,input[1]);await p.drain();
 p.host.c.plan=copy(input[0]);p.host.run('E.submit(game,0,plan);syncPeers()');let reveal;
 for(let n=0;p.queue.length;n++){assert(n<150);const [i,m]=p.queue.shift();if(i===1&&m.type==='plan_reveal'){reveal=copy(m);break;}const peer=i?p.host:p.guest;peer.c.frame=m;await peer.run('handleMessage(frame)');}
 assert(reveal);p.host.c.reveal=reveal;const actualDigest=await p.host.run('ghPlanHash(reveal.plan,reveal.nonce)');let release;
 p.host.c.holdDigest=resolve=>{release=resolve;};p.host.run('const originalHash=ghPlanHash,originalCommitReference=ghIncomingCommit;ghPlanHash=()=>new Promise(resolve=>holdDigest(resolve))');
 const pending=p.host.run('handleMessage(reveal)');assert(release);
 p.host.c.commit=commit;await p.host.run('handleMessage(commit)');await p.drain();
 assert(p.host.run('ghIncomingCommit===originalCommitReference'),'Identical duplicate commit replaced in-flight verification identity');
 release(actualDigest);await pending;await p.drain();p.host.run('ghPlanHash=originalHash');
 assert.equal(p.host.state().game.cycle,2,'Duplicate commitment dropped a valid verified reveal');privateState(p);
 assert.equal(p.host.state().game.departmentFunctionEconomy.paid,3*E.DepartmentFunctions.FUNCTIONS.credit.vendorRate);
 console.log('PASS GitHub identical commit during deferred digest preserves valid reveal and charges once');
}
async function recallAfterHostReady(){
 const p=peers('gh');await open(p);await start(p);const input=plans(p);await guestSubmit(p,input[1]);await p.drain();
 const pending=copy(p.guest.state().ghPendingPlan),token=p.guest.run('({...incomingTurnContext})');
 p.guest.c.wrongHash={type:'error',code:'plan_rejected',instruction:'plan_reveal',hash:'0'.repeat(64),message:'old hash rejection',cycle:token.cycle,resolutionId:token.resolutionId,turnContext:token};
 await p.guest.run('handleMessage(wrongHash)');same(p.guest.state().ghPendingPlan,pending,'Wrong-hash rejection erased current seal');assert(p.guest.state().view.me.submitted);
 p.host.c.invalidRecall={type:'recall',cycle:token.cycle,resolutionId:token.resolutionId};await p.host.run('handleMessage(invalidRecall)');await p.drain();
 same(p.guest.state().ghPendingPlan,pending,'Invalid recall rejection discarded the sealed plan');assert(p.guest.state().view.me.submitted);
 p.host.c.plan=copy(input[0]);p.host.run('E.submit(game,0,plan);syncPeers()');
 // Host is now ready, but its ready-state packet has not reached the guest.
 p.guest.run('recallPlan()');const index=p.queue.findIndex(([i,m])=>i===1&&m.type==='recall');assert(index>=0);
 const [,recall]=p.queue.splice(index,1)[0];p.host.c.recall=recall;await p.host.run('handleMessage(recall)');await p.drain();
 assert.equal(p.host.state().game.cycle,2,'Late recall deadlocked the authoritative ready/commit pair');
 assert.equal(p.guest.state().ghPendingPlan,null);privateState(p);
 assert.equal(p.host.state().game.departmentFunctionEconomy.paid,3*E.DepartmentFunctions.FUNCTIONS.credit.vendorRate);
 console.log('PASS GitHub wrong-hash/invalid-recall preserve seal; late recall resumes authoritative reveal');
}
function missingStoredPolicyChecks(pair,input){
 const opening=copy(pair.host.state().game);E.submit(opening,0,copy(input[0]));
 const missing=copy(opening);delete missing.players[0].submitted.departmentFunctionsPolicy;
 assert.throws(()=>E.validatePilot(missing),'Saved half-ready order cannot silently default its missing function instructions');
 assert.throws(()=>E.migrateCampaign(copy(missing)),'Import cannot silently remove a sealed department instruction');
}
async function activePairs(){
 let months=0;
 for(const transport of ['gh','lan','p2p']){
  let p=peers(transport);await open(p);await start(p);privateState(p);
  const hello=copy(p.frames.find(([i,m])=>i===1&&m.type==='hello'&&m.featureChallenge)[1]);assert.equal(hello.financialGroupSupported,8);
  const input=plans(p);
  missingStoredPolicyChecks(p,input);
  for(const mutate of [q=>{q.departmentFunctionsPolicy.vendors.credit=17;},q=>{q.departmentFunctionsPolicy.quotas.credit.service=1;},q=>{delete q.departmentFunctionsPolicy.vendors;}]){
   const bad=copy(input[1]);mutate(bad);p.host.c.bad=bad;const before=JSON.stringify(p.host.state().game);
   assert.throws(()=>p.host.run('E.submit(E.migrateCampaign(JSON.parse(JSON.stringify(game))),1,bad)'));assert.equal(JSON.stringify(p.host.state().game),before);
  }
  await submit(p,input,transport);months++;assert.equal(p.host.state().game.cycle,2);privateState(p);
  for(const [i,owner]of p.host.state().game.players.entries()){
   assert.equal(owner.departmentFunctions.report.vendorExpense,(i+1)*E.DepartmentFunctions.FUNCTIONS.credit.vendorRate);
   assert(owner.departmentFunctionDelivery);assert(owner.departmentFunctions.paid>0);
  }
  const before=JSON.stringify(p.host.state().game);
  for(const [i,m]of p.frames.filter(([i,m])=>i===1&&['plan_commit','plan_reveal','plan'].includes(m.type))){p.host.c.duplicate=copy(m);await p.host.run('handleMessage(duplicate)');await p.drain();}
  assert.equal(hash(JSON.stringify(p.host.state().game)),hash(before),'Duplicate instructions changed state: '+JSON.stringify(changedPath(JSON.parse(before),p.host.state().game)));
  for(const mutate of [v=>{v.financialGroupVersion=5;},v=>{v.version='9.4';},v=>{delete v.me.departmentFunctions;},v=>{v.me.departmentFunctions.lastCycle++;},
   v=>{delete v.lastPlans[v.me.id].departmentFunctionsPolicy;},
   v=>{v.rival.departmentFunctions=copy(v.me.departmentFunctions);},v=>{v.rival.departmentFunctionDelivery=copy(v.me.departmentFunctionDelivery);},
   v=>{v.departmentFunctionEconomy=copy(p.host.state().game.departmentFunctionEconomy);},v=>{v.lastPlans[v.rival.id].departmentFunctionsPolicy=copy(input[0].departmentFunctionsPolicy); }]){
   const bad=copy(p.guest.state().view);mutate(bad);p.guest.c.bad=bad;const displayed=JSON.stringify(p.guest.state().view);
   assert.throws(()=>p.guest.run("validateIncomingFeatureRules(bad,'view')"));assert.throws(()=>p.guest.run("handleMessage({type:'state',state:bad})"));
   assert.equal(JSON.stringify(p.guest.state().view),displayed,'Malformed private metadata replaced displayed state');
  }
  p.host.run('resetFeaturePeer();challengePeerFeatures()');p.host.c.oldHello=hello;await p.host.run('handleMessage(oldHello)');assert(p.host.run('peerFeatureStatus().pending'));
  await p.drain();assert(p.host.run('featurePeerFresh'));assert.equal(JSON.stringify(p.host.state().game),before);
  if(transport==='gh'){
   const expected=E.migrateCampaign(JSON.parse(before));
   await malformedCheckpoint(p);p=await reload(p);privateState(p);
   // Historical migration removes the obsolete strategy map. Compare the
   // identical normalization path, plus exact new live books before/after.
   same(p.host.state().game.players.map(x=>[x.departmentFunctions,x.departmentFunctionDelivery]),JSON.parse(before).players.map(x=>[x.departmentFunctions,x.departmentFunctionDelivery]),'Function books changed on reload');
   assert.equal(hash(JSON.stringify(p.host.state().game)),hash(JSON.stringify(expected)),'Checkpoint drift: '+JSON.stringify(changedPath(expected,p.host.state().game)));
  }
  console.log('PASS Group'+campaignVersion+' '+transport+' paid functions, old-peer refusal, privacy, malformed metadata and reconnect');
 }
 return months;
}
(async()=>{
 const asyncOnly=process.argv.includes('--async-only');let mixedGroup5Cases=0;
 if(!asyncOnly){mixedGroup5Cases=await boundaries();for(const transport of ['lan','p2p'])await turnEnvelopeCases(transport);
  for(const transport of ['gh','lan','p2p'])await stateOrderingCases(transport);}
 await pendingCheckpointCase();await deferredRevealCase(false);await deferredRevealCase(true);
 await duplicateCommitDuringReveal();await recallAfterHostReady();
 const months=5+(asyncOnly?0:await activePairs());
 const end=portable?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
 console.log(JSON.stringify({suite:'department-functions-network',phase:'closing',candidateSha256,endCandidateSha256:hash(end)}));
 console.log(JSON.stringify({status:'PASS',campaignVersion,focus:asyncOnly?'GitHub asynchronous and checkpoint only':'full',transports:asyncOnly?1:3,mixedGroup5Cases,months,candidateSha256,endCandidateSha256:hash(end),sourceUnchanged:end===html,reference,scope:'Actual assembled current clients and frozen Group5 clients; simulated transports, not physical multiplayer acceptance. Source drift is reported separately and requires a final-build rerun.'}));
})().catch(error=>{console.error(error);process.exitCode=1});
