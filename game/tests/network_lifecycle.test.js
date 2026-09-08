'use strict';
const assert=require('node:assert/strict');
const {harness,response}=require('./github_resilience.test.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function guest(){const h=harness('guest');h.run("view={cycle:1,me:{submitted:false},rival:{submitted:false}};sent=[];send=m=>sent.push(m);currentView=()=>view;planReady=()=>true;draft={cycle:1,privatePolicy:'owner only'};shown=[];show=s=>shown.push(s);messages=[];setStartMessage=s=>messages.push(s)");return h;}
async function sealing(){
 const h=guest();h.run('hashes=[];ghPlanHash=(plan,nonce)=>new Promise(resolve=>hashes.push({plan,nonce,resolve}))');
 const first=h.run('ghCommitPlan(draft)');
 await assert.rejects(h.run('ghCommitPlan(draft)'),/still pending/);
 h.run("draft.privatePolicy='changed during hashing';hashes[0].resolve('a'.repeat(64))");
 assert.equal(await first,true);assert.equal(h.run('sent.length'),1);
 assert.equal(h.run('ghPendingPlan.plan.privatePolicy'),'owner only');
 assert.equal(h.run('sent[0].plan'),undefined,'commit must not expose the private plan');
 h.run('ghRevealPlan();ghRevealPlan()');assert.equal(h.run('sent.length'),2,'one reveal only');
 assert.equal(h.run('sent[1].plan.privatePolicy'),'owner only');assert.equal(h.run('sent[1].hash'),h.run('sent[0].hash'));
 for(const change of ["resetLink();gh={...emptyGh(),active:true,room:'NEWROOM2'};view={cycle:99,me:{submitted:false},rival:{submitted:false}}",'view={cycle:1,me:{submitted:false},rival:{submitted:false}}','view.cycle=2']){
  const x=guest();x.run('ghPlanHash=()=>new Promise(resolve=>finishHash=resolve)');const job=x.run('submitPlan()');x.run(change);x.run("finishHash('b'.repeat(64))");await job;
  assert.equal(x.run('sent.length'),0);assert.equal(x.run('ghPendingPlan'),null);assert.equal(x.run('view.me.submitted'),false);assert.equal(x.run('planAckTimer'),null);
 }
 const rejected=guest();rejected.run("ghPlanHash=async()=>{throw Error('hash unavailable')}");await assert.rejects(rejected.run('ghCommitPlan(draft)'),/hash unavailable/);
 rejected.run("ghPlanHash=async()=> 'c'.repeat(64)");assert.equal(await rejected.run('ghCommitPlan(draft)'),true,'hash rejection releases the reservation');
 const full=guest();full.run("ghPlanHash=async()=> 'd'.repeat(64);send=()=>{throw Error('queue full')}");await assert.rejects(full.run('ghCommitPlan(draft)'),/queue full/);assert.equal(full.run('ghPendingPlan'),null);
 full.run('send=m=>sent.push(m)');assert.equal(await full.run('ghCommitPlan(draft)'),true,'unqueued seal can retry');
 const delayed=guest();delayed.run('ghPlanHash=()=>new Promise((resolve,reject)=>failHash=reject)');const obsolete=delayed.run('submitPlan()');delayed.run("resetLink();view=null;p2pRole='';document.querySelector('#submitMsg').textContent='New campaign'");delayed.run("failHash(Error('old hash failure'))");await obsolete;assert.equal(delayed.elements.get('#submitMsg').textContent,'New campaign');
}
function preparation(side='host'){
 const h=harness(side);h.run("shown=[];show=s=>shown.push(s);messages=[];setStartMessage=s=>messages.push(s);validName=()=> 'Test bank';ghConfig=()=>({api:'https://api.github.com',repo:'test/game',token:'TEST_ONLY'});pollLan=()=>{};ghPoll=()=>{};ghFlush=()=>{}");return h;
}
async function repositoryAttempts(){
 for(const name of ['ghCreateRoom','ghJoinRoom','ghResume'])for(const cross of [false,true]){
  const h=preparation();h.c.document.querySelector('#ghGuestToken').value='TEST_ONLY';h.run("unpack=()=>({repo:'test/game',room:'ABCDEFGH'});gh.active=false");
  h.storage.set('branchWarsGhResume',JSON.stringify({version:1,connection:{...h.state().gh,side:'host'},p2pConfig:{},game:null,view:null,lobby:null}));h.c.document.querySelector('#ghToken').value='TEST_ONLY';
  let finish;h.c.fetch=()=>new Promise(resolve=>finish=resolve);const job=h.run(name+'()');assert(finish,name+' reached a repository read');
  h.run(cross?"resetLink();mode='lan';lan={...emptyLan(),active:true,room:'NEWLAN'}":"resetLink();gh={...emptyGh(),active:true,room:'NEWROOM2'}");
  h.run('shown=[];messages=[]');finish(response(200,{default_branch:'main',private:true}));await job;
  assert.equal(h.run(cross?'lan.active':'gh.active'),true,name+' stale failure cannot stop replacement');
  assert.equal(h.run(cross?'lan.room':'gh.room'),cross?'NEWLAN':'NEWROOM2');assert.equal(h.run('shown.length'),0);assert.equal(h.run('messages.length'),0);
 }
}
function contents(data,sha='stored-version'){return response(200,{sha,encoding:'base64',content:Buffer.from(JSON.stringify(data)).toString('base64')});}
async function repositoryHappyPaths(){
 for(const variant of ['normal','collision','accepted-write-recovery']){
  const h=preparation();h.run("roomIndex=0;ghRoomCode=()=>['ABCDEFGH','JKLMNPQR'][roomIndex++];polls=0;ghPoll=()=>{polls++}");
  let writes=0,reads=0,stored=null;
  h.c.fetch=async(url,options)=>{
   if(!url.includes('/contents/'))return response(200,{default_branch:'main',private:true,permissions:{push:true}});
   if(options.method==='PUT'){
    writes++;const payload=JSON.parse(options.body);stored=JSON.parse(Buffer.from(payload.content,'base64').toString());
    if(variant==='accepted-write-recovery')throw Error('Accepted response lost');
    return response(201,{content:{sha:'created-version'}});
   }
   reads++;
   if(variant==='collision'&&url.includes('/ABCDEFGH/'))return contents({seq:4,messages:[]},'occupied-version');
   if(stored)return contents(stored,'recovered-version');
   return response(404,{});
  };
  await h.run('ghCreateRoom()');
  assert.equal(h.run('gh.active'),true,variant);assert.equal(h.run('gh.side'),'host');
  assert.equal(h.run('gh.room'),variant==='collision'?'JKLMNPQR':'ABCDEFGH');assert.equal(writes,1,variant+' must reserve exactly once');
  assert.equal(reads,variant==='normal'?1:2);assert.equal(h.run('gh.sha'),variant==='accepted-write-recovery'?'recovered-version':'created-version');
  assert.deepEqual(stored,{seq:0,messages:[]});assert.equal(h.run('polls'),1);assert.equal(h.run('shown.at(-1)'),'#connectScreen');
  assert(h.elements.get('#outCode').value.startsWith('BW7-ROOM-'));assert(!h.elements.get('#outCode').value.includes('TEST_ONLY'));
  const checkpoint=JSON.parse(h.storage.get('branchWarsGhResume'));assert.equal(checkpoint.connection.room,h.run('gh.room'));assert.equal(checkpoint.connection.token,undefined);
 }
 const join=preparation('guest');join.c.document.querySelector('#ghGuestToken').value='TEST_ONLY';join.run("unpack=()=>({repo:'test/game',room:'ABCDEFGH'});polls=0;ghPoll=()=>{polls++}");
 join.c.fetch=async url=>url.includes('/contents/')?response(404,{}):response(200,{default_branch:'main',private:true});
 await join.run('ghJoinRoom()');assert.equal(join.run('gh.active'),true);assert.equal(join.run('gh.side'),'guest');assert.equal(join.run('gh.room'),'ABCDEFGH');
 assert.equal(join.run('gh.outbox[0].msg.type'),'hello');assert.equal(join.run('gh.outbox[0].msg.featureRulesSupported'),1);assert.equal(join.run('polls'),1);assert.equal(join.run('shown.at(-1)'),'#connectScreen');
 for(const side of ['host','guest']){
  const resumed=preparation(side);resumed.run("savedCampaign=E.createGame({mode:'p2p',seed:'resume-happy',created:1});savedView=E.publicState(savedCampaign,1)");
  const connection={...resumed.state().gh,active:false,seen:0,mine:0,published:0,outbox:[]};
  resumed.storage.set('branchWarsGhResume',JSON.stringify({version:1,connection,p2pConfig:{},game:side==='host'?resumed.run('savedCampaign'):null,view:side==='guest'?resumed.run('savedView'):null,lobby:null,ghPendingPlan:null,ghIncomingCommit:null}));
  resumed.run("gh.active=false;entered=0;enterGame=()=>{entered++};polls=0;ghPoll=()=>{polls++}");resumed.c.document.querySelector(side==='host'?'#ghToken':'#ghGuestToken').value='TEST_ONLY';
  resumed.c.fetch=async url=>url.includes('/contents/')?contents({seq:0,messages:[]}):response(200,{default_branch:'main',private:true});
  await resumed.run('ghResume()');assert.equal(resumed.run('gh.active'),true,side+' resume');assert.equal(resumed.run('gh.room'),'ABCDEFGH');assert.equal(resumed.run('gh.side'),side);assert.equal(resumed.run('entered'),1);assert.equal(resumed.run('polls'),1);
  assert.equal(resumed.run('gh.outbox.at(-1).msg.type'),side==='host'?'hello_request':'hello');assert.equal(resumed.run(side==='host'?'game.cycle':'view.cycle'),1);
 }
}
async function lanAttempts(){
 for(const name of ['createLanRoom','joinLanRoom'])for(const failed of [false,true])for(const cross of [false,true]){
  const h=preparation();h.c.document.querySelector('#lanRoom').value='ABCDEF';h.run('lanRequest=()=>new Promise((resolve,reject)=>{finishLan=resolve;failLan=reject})');const job=h.run(name+'()');
  h.run(cross?"resetLink();gh={...emptyGh(),active:true,room:'NEWROOM2'}":"resetLink();lan={...emptyLan(),active:true,room:'NEWLAN'}");
  h.run('shown=[];messages=[]');h.run(failed?"failLan(Error('old request failed'))":"finishLan({room:'OLDLAN',token:'TEST_ONLY'})");await job;
  assert.equal(h.run(cross?'gh.room':'lan.room'),cross?'NEWROOM2':'NEWLAN');assert.equal(h.run(cross?'gh.active':'lan.active'),true);assert.equal(h.run('shown.length'),0);assert.equal(h.run('messages.length'),0);
 }
 for(const name of ['createLanRoom','joinLanRoom']){
  const h=preparation();h.c.document.querySelector('#lanRoom').value='ABCDEF';h.run("lanRequest=async()=>({room:'ABCDEF',token:'TEST_ONLY'});lanFlush=()=>{};polls=0;pollLan=()=>{polls++}");await h.run(name+'()');
  assert.equal(h.run('lan.active'),true);assert.equal(h.run('gh.active'),false);assert.equal(h.run('lan.room'),'ABCDEF');assert.equal(h.run('polls'),1);assert.equal(h.run('shown.at(-1)'),'#connectScreen');
  if(name==='joinLanRoom')assert.equal(h.run('lan.outbox[0].msg.type'),'hello');
 }
}
async function directAttempts(){
 for(const name of ['createOffer','createAnswer']){
  const h=preparation();h.run("rememberLanIp=()=>{};unpack=()=>({config:{},sdp:{type:'offer',sdp:'test'},session:'one'});channel={readyState:'connecting'};peer={createDataChannel:()=>channel,createOffer:()=>new Promise(resolve=>finishSdp=resolve),setRemoteDescription:()=>new Promise(resolve=>finishSdp=resolve),setLocalDescription:()=>{throw Error('obsolete local description')},close(){}};newPeer=()=>peer");
  const job=h.run(name+'()');h.run("oldPeer=peer;resetLink();lan={...emptyLan(),active:true,room:'NEWLAN'}");h.run('shown=[];messages=[]');h.run("finishSdp({type:'offer',sdp:'test'})");await job;
  if(name==='createAnswer')h.run("oldPeer.ondatachannel({channel:{readyState:'connecting'}})");
  assert.equal(h.run('dc'),null,'old peer cannot adopt channel');assert.equal(h.run('lan.room'),'NEWLAN');assert.equal(h.run('shown.length'),0);assert.equal(h.run('messages.length'),0);
 }
 const h=preparation();h.run("rememberLanIp=()=>{};channel={readyState:'connecting'};peer={localDescription:{type:'offer',sdp:'old'},createDataChannel:()=>channel,createOffer:async()=>({type:'offer',sdp:'old'}),setLocalDescription:async()=>{},close(){}};newPeer=()=>peer;waitIce=()=>new Promise(resolve=>finishIce=resolve)");
 const job=h.run('createOffer()');await tick();h.run("resetLink();gh={...emptyGh(),active:true,room:'NEWROOM2'};shown=[];messages=[];document.querySelector('#outCode').value='NEW CODE';finishIce()");await job;
 assert.equal(h.elements.get('#outCode').value,'NEW CODE');assert.equal(h.run('shown.length'),0);assert.equal(h.run('messages.length'),0);
 for(const name of ['createOffer','createAnswer']){
  const good=preparation();good.run("rememberLanIp=()=>{};unpack=()=>({config:{},sdp:{type:'offer',sdp:'test offer'},session:'current'});channel={readyState:'connecting'};peer={createDataChannel:()=>channel,createOffer:async()=>({type:'offer',sdp:'test offer'}),createAnswer:async()=>({type:'answer',sdp:'test answer'}),setRemoteDescription:async value=>{peer.remoteDescription=value},setLocalDescription:async value=>{peer.localDescription=value},close(){}};newPeer=()=>peer;waitIce=async()=>{}");
  await good.run(name+'()');assert.equal(good.run('shown.at(-1)'),'#connectScreen');assert.equal(good.run('pc===peer'),true);
  assert(good.elements.get('#outCode').value.startsWith(name==='createOffer'?'BW7-OFFER-':'BW7-ANSWER-'));assert.equal(good.run('messages.filter(Boolean).length'),0);
  if(name==='createOffer'){
   good.run("peer.signalingState='have-local-offer';unpack=()=>({session:linkSession,sdp:{type:'answer',sdp:'accepted answer'}})");await good.run('applyAnswer()');assert.equal(good.run('peer.remoteDescription.sdp'),'accepted answer');
  }else{good.run('peer.ondatachannel({channel})');assert.equal(good.run('dc===channel'),true)}
 }
}
async function replacementCredentials(){
 for(const side of ['host','guest']){
  const h=preparation(side);h.run("originalSession=gh;gh.paused=true;gh.token='OLD_TEST_TOKEN';gh.mine=2;gh.published=1;gh.outbox=[{seq:2,msg:{type:'plan_commit',hash:'sealed'}}];ghPendingPlan={plan:{privatePolicy:'owner only'},nonce:'private nonce',hash:'sealed',cycle:1};flushes=0;ghFlush=()=>{flushes++}");
  h.storage.set('branchWarsGhResume','malformed old checkpoint');
  h.c.document.querySelector(side==='host'?'#ghToken':'#ghGuestToken').value='NEW_TEST_TOKEN';
  h.c.document.querySelector(side==='host'?'#ghGuestToken':'#ghToken').value='OTHER_SEAT_OLD_TOKEN';
  await h.run('ghResume()');assert.equal(h.run('gh===originalSession'),true,'credential replacement keeps the current room object');
  assert.equal(h.run('gh.token'),'NEW_TEST_TOKEN');assert.equal(h.run('gh.paused'),false);assert.equal(h.run('flushes'),1);
  assert.equal(h.run('gh.room'),'ABCDEFGH');assert.equal(h.run('gh.repo'),'test/game');assert.equal(h.run('gh.api'),'https://api.github.com');
  assert.equal(h.run('ghPendingPlan.hash'),'sealed');assert.equal(h.run('gh.outbox[0].msg.hash'),'sealed');
  assert.equal(h.storage.get('branchWarsGhToken'),'NEW_TEST_TOKEN');assert(!h.storage.get('branchWarsGh').includes('NEW_TEST_TOKEN'),'no persistent credential leak');
  h.run('gh.paused=true');h.c.document.querySelector(side==='host'?'#ghToken':'#ghGuestToken').value='bad token';await h.run('ghResume()');
  assert.equal(h.run('gh.token'),'NEW_TEST_TOKEN');assert.equal(h.run('gh.active'),true);assert.equal(h.run('gh.paused'),true);assert.equal(h.run('flushes'),1);assert.equal(h.run('shown.length'),0);
  assert(!h.run('messages.join(" ")').includes('bad token'),'invalid input is not echoed');
 }
 const missing=preparation();missing.run("gh.token='';sessionStorage.removeItem('branchWarsGhToken');gh.paused=true");await missing.run('ghResume()');assert.equal(missing.run('gh.active'),true);assert.equal(missing.run('gh.paused'),true);
 const late=preparation();late.run("gh.token='OLD_TEST_TOKEN'");let finish;late.c.fetch=()=>new Promise(resolve=>finish=resolve);const pending=late.run("ghRead('guest','')");
 late.c.document.querySelector('#ghToken').value='NEW_TEST_TOKEN';await late.run('ghResume()');finish(response(401,{message:'Bad credentials'}));await assert.rejects(pending,/credentials changed/);assert.equal(late.run('gh.paused'),false,'late old-token response cannot pause fresh credentials');
}
async function transportHardening(){
 const malformed=preparation();malformed.c.fetch=async()=>({ok:true,status:200,json:async()=>{throw SyntaxError('bad JSON')}});
 await assert.rejects(malformed.run("lanRequest('/api/poll')"),/invalid JSON/i);
 const stalled=preparation();stalled.c.fetch=async(_url,options)=>({ok:true,status:200,json:()=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(Error('body aborted'),{name:'AbortError'}))))});
 const request=stalled.run("lanRequest('/api/poll')");await tick();[...stalled.timers.values()].find(t=>t.ms===8000).fn();
 await assert.rejects(request,/8 seconds/);
 for(const transport of ['lan','gh']){
  const h=preparation();h.run("payload={type:'plan',plan:{cycle:1,decision:'a'}}");
  h.run(transport==='lan'?"lan={...emptyLan(),active:true};lanFlush=()=>{};lanSend(payload)":"ghFlush=()=>{};ghSend(payload)");
  h.run("payload.plan.decision='b'");
  assert.equal(h.run(transport+".outbox[0].msg.plan.decision"),'a',transport+' queue must preserve the accepted message');
 }
 const poll=harness();poll.run("gh.active=false;lan={...emptyLan(),active:true,room:'ABCDEF'};reads=0;handled=[];lanRequest=async()=>{reads++;return {messages:[{seq:1,message:{type:'first'}},{seq:2,message:{type:'second'}}],connected:false}};handleMessage=async m=>{handled.push(m.type);if(m.type==='first')await new Promise(resolve=>finishFirst=resolve);else lan.active=false}");
 const polling=poll.run('pollLan()');await tick();await poll.run('pollLan()');
 assert.equal(poll.run('reads'),1,'only one LAN poll loop per session');
 assert.equal(poll.run('lan.after'),0,'do not acknowledge before asynchronous processing finishes');
 assert.equal(poll.run('handled.join()'),'first');poll.run('finishFirst()');await polling;
 assert.equal(poll.run('handled.join()'),'first,second');
 for(const malformedMessages of [null,[{seq:2,message:{type:'ok'}},{seq:1,message:{type:'old'}}],[{seq:1,message:null}]]){
  const h=harness();h.c.batch=malformedMessages;h.run("gh.active=false;lan={...emptyLan(),active:true};handled=0;lanRequest=async()=>({messages:batch});handleMessage=()=>{handled++}");
  const job=h.run('pollLan()');await tick();
  assert.equal(h.run('lan.after'),0);assert.equal(h.run('handled'),0);assert.equal(h.run('lan.failures'),1);
  h.run('lan.active=false');[...h.timers.values()].find(t=>t.ms===1400).fn();await job;
 }
 const replaced=harness();replaced.run("gh.active=false;lan={...emptyLan(),active:true};oldLan=lan;handled=0;lanRequest=async()=>({messages:[{seq:1,message:{type:'state'}},{seq:2,message:{type:'state'}}]});handleMessage=async()=>{handled++;await new Promise(resolve=>finishHandler=resolve)}");
 const oldPoll=replaced.run('pollLan()');await tick();replaced.run("lan={...emptyLan(),active:true,room:'NEWLAN'};finishHandler()");await oldPoll;
 assert.equal(replaced.run('lan.after'),0);assert.equal(replaced.run('oldLan.after'),0);assert.equal(replaced.run('handled'),1);
 const replay=harness();replay.run("gh.active=false;lan={...emptyLan(),active:true,after:7};handled=[];lanRequest=async()=>({messages:[{seq:7,message:{type:'duplicate'}},{seq:8,message:{type:'new'}}],connected:false});handleMessage=m=>{handled.push(m.type);lan.active=false}");
 await replay.run('pollLan()');assert.equal(replay.run('handled.join()'),'new','already processed LAN messages are not replayed');
 const failedRecall=guest();failedRecall.run("ghPendingPlan={cycle:1,hash:'locked',plan:{cycle:1}};send=()=>{throw Error('queue full')};recallPlan()");
 assert(!failedRecall.run('ghPendingPlan.recallRequested'),'failed enqueue cannot mark the commitment recalled');
 const stale=preparation();stale.run("game=E.createGame({mode:'p2p',created:1,seed:1});game.cycle=2;ghIncomingCommit={cycle:2,hash:'b'.repeat(64)};syncPeers=()=>{}");
 await stale.run("handleMessage({type:'recall',cycle:1})");assert.equal(stale.run('ghIncomingCommit.cycle'),2,'old recall cannot clear a new cycle commitment');
 await stale.run("handleMessage({type:'recall',cycle:2})");assert.equal(stale.run('ghIncomingCommit'),null);
 console.log('Additional transport hardening: malformed/stalled LAN bodies, immutable LAN/GitHub queues, single ordered LAN poller, failed recall enqueue and stale-cycle recall passed.');
}
async function main(){await transportHardening();await sealing();await repositoryAttempts();await repositoryHappyPaths();await lanAttempts();await directAttempts();await replacementCredentials();console.log('Network lifecycle: single immutable seal; stale hash/view/cycle; retry; 6 repository replacements; create/collision/accepted-write recovery/join/host+guest resume happy paths; 8 LAN replacements; direct SDP/ICE/channel fences; active credential replacement and stale authentication passed.');}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1});
