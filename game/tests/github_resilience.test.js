'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto,createHash}=require('node:crypto');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8');
for(const s of html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const client=html.slice(html.indexOf('const E=window.BWEngine'),html.lastIndexOf("$$('[data-workspace-tab]').forEach"));
const copy=x=>JSON.parse(JSON.stringify(x));
function response(status,body,headers={}){return {status,ok:status>=200&&status<300,headers:{get:k=>headers[k.toLowerCase()]??null},json:async()=>body}}
function harness(side='host'){
 const storage=new Map(),elements=new Map(),timers=new Map();let timerId=0;
 const c={console,URL,TextEncoder,AbortController,crypto:webcrypto,queueMicrotask,btoa:x=>Buffer.from(x,'binary').toString('base64'),atob:x=>Buffer.from(x,'base64').toString('binary'),
  setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),clearInterval:()=>{},
  localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null},
  sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)},
  document:{querySelector:s=>{if(!elements.has(s))elements.set(s,{value:'',textContent:'',checked:false,listeners:{},addEventListener(event,listener){const previous=this.listeners[event];this.listeners[event]=previous?function(...args){previous.apply(this,args);listener.apply(this,args)}:listener},classList:{add(){},remove(){},toggle(){},contains(){return false}}});return elements.get(s)},querySelectorAll:()=>[]},
 };
 vm.createContext(c);vm.runInContext(engine,c);c.window={BWEngine:c.BWEngine};
 vm.runInContext(client,c);
 vm.runInContext("render=()=>{};enterGame=()=>{};saveLocal=()=>{};toast=()=>{};setMode=()=>{};gh={...emptyGh(),active:true,side:'"+side+"',api:'https://api.github.com',repo:'test/game',branch:'main',room:'ABCDEFGH',token:'PRIVATE_TEST_TOKEN'};p2pRole='"+side+"';p2pConfig={campaignRulesVersion:1,name:'Host',guestName:'Guest'};",c);
 return {c,storage,elements,timers,run:s=>vm.runInContext(s,c),state:()=>vm.runInContext('({gh,game,view,ghPendingPlan,ghIncomingCommit,lobby,lobbyPending,linkCls,linkText})',c)};
}
async function main(){
 const segmentDepositsVersion=process.argv.includes('--segment-deposits')?1:0;
 const creditPerformanceVersion=segmentDepositsVersion||process.argv.includes('--collections')?1:0;
 const customerOwnershipVersion=creditPerformanceVersion||process.argv.includes('--households')?1:0;
 const workforceVersion=customerOwnershipVersion||process.argv.includes('--workforce')?1:0;
 const customerDemandVersion=workforceVersion||process.argv.includes('--customer-relationships')?2:process.argv.includes('--customer-needs')?1:0;
 const managementVersion=customerDemandVersion||process.argv.includes('--relationships')?2:process.argv.includes('--management')?1:0;
 const incompatible=harness();incompatible.run("game=null;p2pConfig.managementVersion=1;sent=[];send=m=>sent.push(m);setConnection=()=>{}");
 await incompatible.run("handleMessage({type:'hello',pilotSupported:11,name:'Older guest'})");
 assert.equal(incompatible.state().game,null);assert(incompatible.run("sent.some(m=>m.type==='error'&&m.message.includes('Living institution'))"));
 const oldRelationshipPeer=harness();oldRelationshipPeer.run("game=null;p2pConfig.managementVersion=2;sent=[];send=m=>sent.push(m);setConnection=()=>{}");
 await oldRelationshipPeer.run("handleMessage({type:'hello',pilotSupported:11,managementSupported:1,name:'Previous institution guest'})");
 assert.equal(oldRelationshipPeer.state().game,null);assert(oldRelationshipPeer.run("sent.some(m=>m.type==='error'&&m.message.includes('Relationship operations'))"));
 const oldCustomerPeer=harness();oldCustomerPeer.run("game=null;p2pConfig.managementVersion=2;p2pConfig.customerDemandVersion=1;sent=[];send=m=>sent.push(m);setConnection=()=>{}");
 await oldCustomerPeer.run("handleMessage({type:'hello',pilotSupported:11,managementSupported:1,relationshipSupported:1,name:'Previous relationship guest'})");
 assert.equal(oldCustomerPeer.state().game,null);assert(oldCustomerPeer.run("sent.some(m=>m.type==='error'&&m.message.includes('Customer needs'))"));
 const oldGoodwillPeer=harness();oldGoodwillPeer.run("game=null;p2pConfig.managementVersion=2;p2pConfig.customerDemandVersion=2;sent=[];send=m=>sent.push(m);setConnection=()=>{}");
 await oldGoodwillPeer.run("handleMessage({type:'hello',pilotSupported:11,managementSupported:1,relationshipSupported:1,customerDemandSupported:1,name:'Previous demand guest'})");
 assert.equal(oldGoodwillPeer.state().game,null);assert(oldGoodwillPeer.run("sent.some(m=>m.type==='error'&&m.message.includes('Customer needs'))"));
 // Compact a long host trail: old framing exceeds inline Contents limit.
 const h=harness(),frames=Array.from({length:20},(_,i)=>({seq:i+1,msg:{type:'state',state:{cycle:i+1,padding:'x'.repeat(100000)}}}));
 // The new service preview requires, and explicitly enables, the regional pilot.
 const preview=h.elements.get('#serviceExpansion');
 assert(preview.listeners.change, 'service preview registers its change handler');
 assert.equal(h.c.document.querySelector('#rivalryPilot').checked,false);
 preview.checked=true;preview.listeners.change();
 assert.equal(h.elements.get('#rivalryPilot').checked,true);
 preview.checked=false;preview.listeners.change();
 assert.equal(h.elements.get('#rivalryPilot').checked,true,'disabling preview does not disable the existing pilot');
 h.c.frames=frames;
 assert(Buffer.byteLength(JSON.stringify(frames))>1000000);
 assert(h.run('ghCompact(frames)').length===1);
 assert(Buffer.byteLength(JSON.stringify(h.run('ghCompact(frames)')))<110000);
 // Actual Contents API behavior over 1 MB: encoding none, followed by raw JSON.
 let rawReads=0;
 h.c.fetch=async(_url,o)=>o.headers.Accept==='application/vnd.github.raw+json'?(rawReads++,response(200,{seq:20,messages:frames})):response(200,{sha:'blob',size:2000000,encoding:'none',content:''});
 const big=await h.run("ghRead('guest','')");assert.equal(big.data.seq,20);assert.equal(rawReads,1);assert.equal(big.etag,'');
 // Primary/secondary rate limits delay both reads and writes, and Retry cannot bypass.
 h.c.res=response(429,{message:'rate limit'},{'retry-after':'120'});
 h.run("ghFail(res,{message:'rate limit'})");assert(h.state().gh.cooldownUntil-Date.now()>119000);
 let calls=0;h.c.fetch=async()=>{calls++;return response(200,{})};
 await assert.rejects(h.run("ghRead('guest','')"),/cooldown/);assert.equal(calls,0);
 h.run('gh.cooldownUntil=0');
 h.c.res=response(401,{});h.run('ghFail(res,{})');assert.equal(h.state().gh.paused,true);
 // Timeout covers a hung fetch and frees the request.
 const hang=harness();hang.c.fetch=(_url,o)=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Error('aborted'))));
 const pending=hang.run("ghRead('guest','')");const timeout=[...hang.timers.values()].find(t=>t.ms===20000);timeout.fn();await assert.rejects(pending,/timed out/);
 // Late completions from a departed room cannot affect the next room.
 const stale=harness();let complete;stale.c.fetch=()=>new Promise(r=>complete=r);
 const old=stale.run("ghRead('guest','')");stale.run("gh={...emptyGh(),active:true,room:'NEWROOM2'}");complete(response(200,{sha:'x',content:Buffer.from('{"seq":0,"messages":[]}').toString('base64')}));
 await assert.rejects(old,/session changed/);
 // Don't reconcile another tab's command as if it were our lost response.
 const conflict=harness();conflict.run("gh.mine=1;gh.outbox=[{seq:1,msg:{type:'hello'}}]");
 conflict.c.remote={sha:'x',data:{seq:1,messages:[{seq:1,msg:{type:'recall'}}]}};
 assert.throws(()=>conflict.run('ghAccepted(remote)'),/Conflicting/);assert(conflict.state().gh.paused);
 // A lost response can refer to a state superseded locally while the write was in flight.
 const inflight=harness();inflight.run("gh.mine=2;gh.outbox=[{seq:2,msg:{type:'state',state:{cycle:2}}}];gh.inflight={messages:[{seq:1,msg:{type:'state',state:{cycle:1}}}]}");
 inflight.c.remote={sha:'accepted',data:{seq:1,messages:[{seq:1,msg:{type:'state',state:{cycle:1}}}]}};
 inflight.run('ghAccepted(remote)');assert.equal(inflight.state().gh.published,1);assert(!inflight.state().gh.paused);
 await assert.rejects(conflict.run("ghWrite('guest',{seq:1,messages:[]},'')"),/own repository seat/);
 // Sealed plan survives the exact 30-second acknowledgement timeout.
 const guest=harness('guest');
 guest.run("game=null;view=E.publicState(E.createGame({campaignRulesVersion:1,mode:'hotseat',seed:9}),1);draft=E.chooseBot(E.createGame({campaignRulesVersion:1,mode:'hotseat',seed:9}),1);planReady=()=>true;ghFlush=()=>{}");
 await guest.run('submitPlan()');
 const seal=copy(guest.state().ghPendingPlan);assert(seal);
 const ackTimer=[...guest.timers.values()].find(t=>t.ms===30000);assert(ackTimer);ackTimer.fn();
 assert.deepEqual(copy(guest.state().ghPendingPlan),seal);assert(guest.state().view.me.submitted);
 assert(guest.storage.has('branchWarsGhResume'));assert(!guest.storage.get('branchWarsGhResume').includes('PRIVATE_TEST_TOKEN'));
 // The engine host receives commit and reveal, using actual message handling.
 const host=harness();
 host.run("ghFlush=()=>{};game=E.createGame({campaignRulesVersion:1,mode:'lan',seed:9});game.players[0].submitted=E.chooseBot(game,0)");
 host.c.commit={type:'plan_commit',hash:seal.hash,cycle:seal.cycle};await host.run('handleMessage(commit)');
 assert(host.state().ghIncomingCommit);
 const stateFrame=host.state().gh.outbox.at(-1).msg;guest.c.frame=copy(stateFrame);await guest.run('handleMessage(frame)');
 assert(guest.state().ghPendingPlan.revealed);
 host.c.reveal=copy(guest.state().gh.outbox.find(e=>e.msg.type==='plan_reveal').msg);
 await host.run('handleMessage(reveal)');assert.equal(host.state().game.cycle,2);
 await host.run('handleMessage(reveal)');assert.equal(host.state().game.cycle,2,'duplicate reveal cannot resolve a second turn');
 guest.c.frame=copy(host.state().gh.outbox.at(-1).msg);await guest.run('handleMessage(frame)');
 assert.equal(guest.state().ghPendingPlan,null);
 // Host checkpoint survives migration; guest reload retains original nonce and plan.
 const saved=JSON.parse(guest.storage.get('branchWarsGhResume'));
 assert(saved.version===1);
 const reload=harness('guest');reload.storage.set('branchWarsGhResume',JSON.stringify({...saved,view:copy(stateFrame.state),ghPendingPlan:seal}));
 reload.elements.set('#ghToken',{value:'PRIVATE_TEST_TOKEN'});
 reload.run("gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true})");
 await reload.run('ghResume()');assert.deepEqual(copy(reload.state().ghPendingPlan),seal);assert(reload.state().view.me.submitted);
 // Poll doesn't advance its checkpoint until an asynchronous handler succeeds.
 const order=harness();let finish,handled=[];
 order.run('ghRead=async()=>({etag:"v1",data:{seq:2,messages:[{seq:1,msg:{type:"one"}},{seq:2,msg:{type:"two"}}]}})');
 order.c.handleMessage=async m=>{handled.push(m.type);if(m.type==='one')await new Promise(r=>finish=r);else order.run('gh.active=false')};
 const poll=order.run('ghPoll()');await new Promise(r=>setImmediate(r));assert.deepEqual(handled,['one']);assert.equal(order.state().gh.seen,0);finish();await poll;assert.deepEqual(handled,['one','two']);
 // Real send/read/flush functions across two engine clients with periodically lost PUT responses.
 const pair=[harness('host'),harness('guest')],files=new Map();let writes=0,lost=0;
 for(const peer of pair){
  peer.run('const pacedWrite=ghWrite;ghWrite=async(...args)=>{gh.lastWrite=0;return pacedWrite(...args)}');
  peer.c.fetch=async(url,opt={})=>{
   const side=url.includes('/host.json')?'host':'guest',file=files.get(side);
   if(opt.method!=='PUT')return file?response(200,{sha:file.sha,content:Buffer.from(JSON.stringify(file.data)).toString('base64')},{etag:file.sha}):response(404,{});
   const body=JSON.parse(opt.body);if(file&&file.sha!==body.sha)return response(409,{});
   const sha='write-'+(++writes),data=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));files.set(side,{sha,data});
   if(writes%7===0){lost++;throw Error('Lost accepted PUT response')}
   return response(200,{content:{sha}});
  };
 }
 async function flush(peer){
  for(let tries=0;tries<20;tries++){
   if(!peer.state().gh.busy)await peer.run('ghFlush()');
   await new Promise(r=>setImmediate(r));
   if(!peer.state().gh.busy&&peer.state().gh.published===peer.state().gh.mine)return;
  }
  assert.fail('simulated relay queue failed to drain');
 }
 async function deliver(from,to){
  await flush(from);to.c.packet=await to.run("ghRead('"+from.state().gh.side+"','')");
  await to.run('(async()=>{for(const e of packet.data.messages)if(e.seq>gh.seen){await handleMessage(e.msg);gh.seen=e.seq}gh.outbox=gh.outbox.filter(e=>e.msg.type==="state"||e.seq>Math.min(packet.data.ack||0,gh.published));ghCheckpoint()})()');
 }
 const [ph,pg]=pair;
 ph.run("p2pConfig={segmentDepositsVersion:"+segmentDepositsVersion+",creditPerformanceVersion:"+creditPerformanceVersion+",customerOwnershipVersion:"+customerOwnershipVersion+",workforceVersion:"+workforceVersion+",serviceExpansionVersion:"+ (managementVersion?1:0)+",campaignRulesVersion:1,customerDemandVersion:"+customerDemandVersion+",managementVersion:"+managementVersion+",name:'Host',color:'#2878e0',scope:'national',scenario:'balanced'};const seededCreate=E.createGame;E.createGame=o=>seededCreate({...o,seed:77})");
 pg.run("p2pConfig={lobbyRequired:true,guestName:'Guest',color:'#2878e0'}");
 await pg.run("handleMessage({type:'hello_request'})");await deliver(pg,ph);await deliver(ph,pg);
 assert.equal(ph.state().game,null,'real relay handshake pauses in the lobby');
 pg.run('editLobbyIdentity(true)');await deliver(pg,ph);await deliver(ph,pg);
 ph.run('editLobbyIdentity(true)');await deliver(ph,pg);
 ph.run('startLobbyCampaign()');
 await deliver(ph,pg);
 let rounds=0;
 for(;rounds<12&&!ph.state().game.gameOver;rounds++){
  pg.c.plan=ph.run('E.chooseBot(game,1)');await pg.run('ghCommitPlan(plan)');
  await deliver(pg,ph);
  ph.run('E.submit(game,0,E.chooseBot(game,0));syncPeers()');
  await deliver(ph,pg);await deliver(pg,ph);await deliver(ph,pg);
  assert.equal(pg.state().view.cycle,ph.state().game.cycle);assert.equal(pg.state().ghPendingPlan,null);
  if(managementVersion){assert.equal(pg.state().view.managementVersion,managementVersion);assert.deepEqual(copy(pg.state().view.me.management),copy(ph.state().game.players[1].management));assert(!pg.state().view.rival.management)}
  if(managementVersion===2)assert.deepEqual(copy(pg.state().view.relationshipRecords),copy(ph.state().game.relationshipRecords));
  if(customerDemandVersion){assert.equal(pg.state().view.customerDemandVersion,customerDemandVersion);assert.equal(pg.state().view.me.customerDemandVersion,customerDemandVersion);assert.equal(pg.state().view.me.operatingReport.customerAcquisitionCost,ph.state().game.players[1].operatingReport.customerAcquisitionCost)}
  if(customerDemandVersion===2){assert.deepEqual(copy(pg.state().view.me.customerRelationships),copy(ph.state().game.players[1].customerRelationships));assert.equal(pg.state().view.rival.customerRelationships,undefined)}
  if(customerOwnershipVersion){assert.equal(pg.state().view.customerOwnershipVersion,1);assert.deepEqual(copy(pg.state().view.me.householdBook),copy(ph.state().game.players[1].householdBook));assert.equal(pg.state().view.rival.householdBook,undefined);assert.equal(pg.state().view.lastPlans[ph.state().game.players[0].id].householdPolicy,undefined)}
  if(segmentDepositsVersion){assert.equal(pg.state().view.segmentDepositsVersion,1);assert.deepEqual(copy(pg.state().view.me.depositBook),copy(ph.state().game.players[1].depositBook));assert.equal(pg.state().view.rival.depositBook,undefined)}
  if(creditPerformanceVersion){assert.equal(pg.state().view.creditPerformanceVersion,1);assert.deepEqual(copy(pg.state().view.me.creditPerformance),copy(ph.state().game.players[1].creditPerformance));assert.equal(pg.state().view.rival.creditPerformance,undefined);assert.equal(pg.state().view.lastPlans[ph.state().game.players[0].id].collectionsPolicy,undefined)}
  if(workforceVersion){assert.equal(pg.state().view.workforceVersion,1);assert.deepEqual(copy(pg.state().view.me.workforce),copy(ph.state().game.players[1].workforce));assert.equal(pg.state().view.rival.workforce,undefined);assert.equal(pg.state().view.lastPlans[ph.state().game.players[0].id].workforcePolicy,undefined)}
  ph.run('E.validatePilot(game);E.validateLedger(game)');
 }
 assert.equal(rounds,12);assert(lost>0);
 console.log(JSON.stringify({passed:true,relayTurns:rounds,acceptedWrites:writes,lostResponses:lost,sourceSha256:createHash('sha256').update(html).digest('hex'),checks:['oversized rooms','snapshot compaction','rate cooldown','authentication pause','request timeout','stale sessions','conflicting writers','seat ownership','sealed timeout','live engine commit/reveal','duplicate reveal','reload checkpoint','ordered async polling']},null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={harness,response};
