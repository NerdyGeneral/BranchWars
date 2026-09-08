'use strict';
// Offline recovery acceptance: use the real checkpoint, transport and engine
// functions with a deterministic in-memory Contents API. Never uses a token or
// room from the developer's browser, environment, or filesystem.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {harness,response}=require('./github_resilience.test.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const options={advertisingVersion:1,productProgramsVersion:1,segmentDepositsVersion:1,creditPerformanceVersion:1,customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,serviceExpansionVersion:1,campaignRulesVersion:1,mode:'lan',scope:'national',scenario:'balanced',seed:77,name:'Cedar Bank',rivalName:'Orchid Bank',color:'#16835f',rivalColor:'#8642bc'};

async function main(){
 const files=new Map();let writes=0,lost=0,reloads=0,loseResolvedWrite=true;
 function client(side){
  const peer=harness(side);
  peer.run("ghPoll=()=>{};const pacedWrite=ghWrite;ghWrite=async(...args)=>{gh.lastWrite=0;return pacedWrite(...args)};mode='gh'");
  peer.c.fetch=async(url,opt={})=>{
   if(!url.includes('/contents/'))return response(200,{private:true,default_branch:'main',permissions:{push:true}});
   const seat=url.includes('/host.json')?'host':'guest',file=files.get(seat);
   if(opt.method!=='PUT')return file?response(200,{sha:file.sha,content:Buffer.from(JSON.stringify(file.data)).toString('base64')},{etag:file.sha}):response(404,{});
   const body=JSON.parse(opt.body);
   if(file&&file.sha!==body.sha)return response(409,{});
   const sha='accepted-'+(++writes),data=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
   files.set(seat,{sha,data});
   if(loseResolvedWrite&&seat==='host'&&data.messages.some(entry=>entry.msg.type==='state'&&entry.msg.state.cycle===2)){
    loseResolvedWrite=false;lost++;throw Error('Accepted final state response lost before checkpoint acknowledgement');
   }
   return response(200,{content:{sha}});
  };
  return peer;
 }
 async function flush(peer){
  for(let attempts=0;attempts<30;attempts++){
   if(!peer.state().gh.busy)await peer.run('ghFlush()');
   await tick();
   if(!peer.state().gh.busy&&peer.state().gh.published===peer.state().gh.mine)return;
  }
  assert.fail('Recovery relay queue did not drain');
 }
 async function deliver(from,to){
  await flush(from);
  to.c.packet=await to.run("ghRead('"+from.state().gh.side+"','')");
  await to.run('(async()=>{for(const entry of packet.data.messages)if(entry.seq>gh.seen){await handleMessage(entry.msg);gh.seen=entry.seq;ghCheckpoint()}gh.outbox=gh.outbox.filter(entry=>entry.msg.type==="state"||entry.seq>Math.min(packet.data.ack||0,gh.published));ghCheckpoint()})()');
 }
 async function reconnect(host,guest){
  // Exercise the actual modern hello/challenge exchange over the stored relay.
  // A test-created or restored game is not itself a fresh peer handshake.
  guest.run('send(makeFeatureHello())');
  for(let n=0;n<4;n++){
   await deliver(guest,host);await deliver(host,guest);
   if(host.run('peerFeatureStatus(game).compatible')&&guest.run('Boolean(incomingTurnContext&&incomingTurnContext.session===incomingTurnChallenge)'))return;
  }
  assert.fail('Recovery peer handshake did not converge');
 }
 async function reload(peer){
  peer.run('ghCheckpoint()');
  const checkpoint=peer.storage.get('branchWarsGhResume');
  assert(checkpoint&&!checkpoint.includes('PRIVATE_TEST_TOKEN'),'recovery checkpoint must not contain token');
  const side=peer.state().gh.side,restored=client(side);
  peer.run('gh.active=false'); // Simulate the departed JS context: no late retry.
  restored.storage.set('branchWarsGhResume',checkpoint);
  restored.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  restored.run('gh.active=false');
  await restored.run('ghResume()');
  assert(restored.state().gh.active,'same-tab checkpoint must resume successfully');
  assert.equal(restored.state().gh.room,'ABCDEFGH');
  reloads++;return restored;
 }
 let host=client('host'),guest=client('guest');
 host.c.options=options;host.run('game=E.createGame(options);p2pConfig={...options,lobbyRequired:false};syncPeers()');
 guest.run('p2pConfig={lobbyRequired:false}');
 await reconnect(host,guest);
 const identity=copy(host.run('game.players.map(p=>({id:p.id,name:p.name,color:p.color}))'));
 function plan(seat){
  const result=host.run('E.chooseBot(game,'+seat+')');
  result.advertisingPolicy={market:host.state().game.players[seat].focus,segment:'everyday',product:'essential',budget:15000};
  return result;
 }
 guest.c.plan=plan(1);await guest.run('ghCommitPlan(plan)');await deliver(guest,host);await flush(host);
 const sealed=copy(guest.state().ghPendingPlan),incoming=copy(host.state().ghIncomingCommit);
 const firstTurn=copy(guest.run('incomingTurnContext'));
 assert(sealed&&!sealed.revealed);assert(incoming);
 assert.equal(host.state().game.players[0].submitted,null);
 // Both tabs reload after the guest locks but before the host submits/reveals.
 host=await reload(host);guest=await reload(guest);
 assert.deepEqual(copy(guest.state().ghPendingPlan),sealed,'reload preserves original nonce, hash and hidden policy');
 assert.deepEqual(copy(host.state().ghIncomingCommit),incoming,'host reload preserves its received commitment');
 assert.deepEqual(copy(host.run('game.players.map(p=>({id:p.id,name:p.name,color:p.color}))')),identity);
 assert(guest.state().view.me.submitted);assert.equal(guest.state().view.rival.advertising,undefined);
 await reconnect(host,guest);
 assert.notEqual(guest.run('incomingTurnContext.session'),firstTurn.session,'reload requires a fresh challenged connection');
 assert.notEqual(guest.run('incomingTurnContext.token'),firstTurn.token,'reload does not reuse turn authorization');
 assert.deepEqual(copy(guest.state().ghPendingPlan),sealed,'fresh authorization preserves the original sealed policy and nonce');
 assert.deepEqual(copy(host.state().ghIncomingCommit),incoming,'same-hash recommit preserves the original commitment');
 host.c.plan=plan(0);host.run('E.submit(game,0,plan);syncPeers()');await deliver(host,guest);
 assert(guest.state().ghPendingPlan.revealed);
 const reveal=copy(guest.state().gh.outbox.find(entry=>entry.msg.type==='plan_reveal').msg);
 await deliver(guest,host);
 for(let n=0;n<30&&host.state().gh.busy;n++)await tick();
 assert.equal(lost,1,'exercise an accepted write with a lost response, not only a failed write');
 assert.equal(host.state().game.cycle,2);assert.equal(guest.state().view.cycle,1);
 assert(host.state().gh.published<host.state().gh.mine,'host checkpoint still considers the accepted response unacknowledged');
 const resolved=copy(host.state().game);
 // A second host reload must reconcile the stored state, not replay resolution.
 host=await reload(host);await flush(host);await reconnect(host,guest);
 assert.deepEqual(copy(host.state().game),resolved,'host restore preserves the already resolved month');
 assert.equal(guest.state().view.cycle,2);assert.equal(guest.state().ghPendingPlan,null);
 host.c.reveal=reveal;await host.run('handleMessage(reveal)');await deliver(host,guest);
 assert.equal(host.state().game.cycle,2,'duplicate pre-reload reveal cannot resolve twice');
 for(let n=0;n<2;n++){
  guest.c.plan=plan(1);await guest.run('ghCommitPlan(plan)');await deliver(guest,host);
  host.c.plan=plan(0);host.run('E.submit(game,0,plan);syncPeers()');
  await deliver(host,guest);await deliver(guest,host);await deliver(host,guest);
 }
 assert.equal(host.state().game.cycle,4);assert.equal(guest.state().view.cycle,4);assert.equal(guest.state().ghPendingPlan,null);
 for(const player of host.state().game.players)assert.equal(player.advertising.report.spent,15000);
 assert.deepEqual(copy(guest.state().view.me.advertising),copy(host.state().game.players[1].advertising));
 assert.equal(guest.state().view.rival.advertising,undefined);
 assert.deepEqual(copy(host.run('game.players.map(p=>({id:p.id,name:p.name,color:p.color}))')),identity);
 host.run('E.validatePilot(game);E.validateLedger(game)');
 const html=process.argv.includes('--source')?Buffer.from(require('../tools/build_game.js').assemble().html):fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'));
 console.log(JSON.stringify({passed:true,simulatedOnly:true,execution:process.argv.includes('--source')?'assembled-source':'portable',resolvedTurns:3,reloads,acceptedWrites:writes,lostResponses:lost,sourceSha256:createHash('sha256').update(html).digest('hex'),checks:['actual modern relay handshake','fresh session and turn authorization after reload','both seats reload before reveal','host resumes unacknowledged accepted resolution','same nonce and commitment','no duplicate month or expense','identity preserved','private advertising report','continued sealed play']},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1});
