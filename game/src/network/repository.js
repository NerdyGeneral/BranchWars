const CODE_KINDS={'BW7-OFFER-':'a host invitation','BW7-ANSWER-':'a rival response','BW7-ROOM-':'a repository-room code'};
// base64url survives chat clients, mail quoting and URLs; + / and = do not.
// --- repository link -------------------------------------------------------
// Neither computer connects to the other. Each writes only its own file and reads
// only the other's, so two writers never touch one file and no merge can happen.
const GH_MAX_TRAIL=20;
function ghPath(side){return `branchwars/${gh.room}/${side}.json`}
function ghUrl(side){return `${gh.api}/repos/${gh.repo}/contents/${encodeURI(ghPath(side))}`}
function ghHeaders(extra){return Object.assign({Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10',Authorization:`Bearer ${gh.token}`},extra||{})}
function ghEncode(text){return btoa(unescape(encodeURIComponent(text)))}
function ghDecode(b64){return decodeURIComponent(escape(atob(String(b64||'').replace(/\s+/g,''))))}
function ghNonce(){const bytes=new Uint8Array(24);if(globalThis.crypto&&crypto.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);return[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function ghPlanHash(plan,nonce){if(!globalThis.crypto||!crypto.subtle)throw Error('This browser cannot seal repository plans. Use LAN or Direct P2P instead.');const payload=new TextEncoder().encode(`${nonce}\n${JSON.stringify(plan)}`),digest=await crypto.subtle.digest('SHA-256',payload);return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
let ghSealingPlan=null;
async function ghCommitPlan(plan){
 const session=gh,sourceView=view,cycle=view&&view.cycle;
 if(ghPendingPlan||ghSealingPlan&&ghSealingPlan.session===session)throw Error('A sealed plan is still pending. Retry the connection or wait for recall confirmation.');
 const attempt={session},current=()=>gh===session&&session.active&&view===sourceView&&view&&view.cycle===cycle&&p2pRole==='guest';
 ghSealingPlan=attempt;
 try{
  const sealedPlan=JSON.parse(JSON.stringify(plan)),nonce=ghNonce(),hash=await ghPlanHash(sealedPlan,nonce);
  if(!current())return false;
  const pending={plan:sealedPlan,nonce,hash,cycle,revealed:false},sequence=session.mine;ghPendingPlan=pending;
  try{send({type:'plan_commit',hash,cycle})}catch(error){if(session.mine===sequence&&ghPendingPlan===pending)ghPendingPlan=null;throw error}
  if(view.rival&&view.rival.submitted)ghRevealPlan();return true;
 }catch(error){if(!current())return false;throw error}
 finally{if(ghSealingPlan===attempt)ghSealingPlan=null}
}
function ghRevealPlan(){if(!ghPendingPlan||ghPendingPlan.revealed)return;send({type:'plan_reveal',plan:ghPendingPlan.plan,nonce:ghPendingPlan.nonce,hash:ghPendingPlan.hash,cycle:ghPendingPlan.cycle});ghPendingPlan.revealed=true;ghCheckpoint()}
function ghFail(response,body){
 const detail=body&&body.message?String(body.message).slice(0,250):'HTTP '+response.status;
 const rateLimited=response.status===429||(response.status===403&&(response.headers.get('x-ratelimit-remaining')==='0'||response.headers.get('retry-after')||/rate limit|abuse/i.test(detail)));
 if(rateLimited){
  const retry=Number(response.headers.get('retry-after'))||0,reset=Number(response.headers.get('x-ratelimit-reset'))||0;
  gh.cooldownUntil=Math.max(gh.cooldownUntil||0,Date.now()+Math.max(60000,retry*1000),response.headers.get('x-ratelimit-remaining')==='0'?reset*1000+1000:0);
  return Error('GitHub rate limit: retry after '+new Date(gh.cooldownUntil).toLocaleTimeString()+'. Your plan remains queued.');
 }
 if(response.status===401||response.status===403){gh.paused=true;return Error('GitHub access refused ('+response.status+'). Check token expiry and Contents read/write permission; use Resume with your own replacement token.')}
 if(response.status===404)return Error('Repository or room not found. Check the repository, branch and token access.');
 if(response.status===422){gh.paused=true;return Error('GitHub rejected this update (422). Check repository rules and close duplicate tabs before Retry.')}
 return Error('GitHub returned '+detail+'.');
}
function ghDelay(base){return Math.max(base,(gh.cooldownUntil||0)-Date.now())}
async function ghRequest(url,options={}){
 const session=gh,credential=session.token;if(session.paused)throw Error('Repository access paused. Check the token and retry.');
 if((session.cooldownUntil||0)>Date.now())throw Error('GitHub cooldown until '+new Date(session.cooldownUntil).toLocaleTimeString());
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(url,{...options,signal:controller.signal});
  // Consume the body under the same timeout; fetch can resolve before a stalled body.
  let body=null;try{body=await response.json()}catch(e){if(controller.signal.aborted)throw e}
  if(gh!==session||!session.active)throw Error('Repository session changed.');
  if(session.token!==credential)throw Error('Repository credentials changed. Retry with the current token.');
  return {response,body};
 }catch(e){if(controller.signal.aborted)throw Error('GitHub request timed out after 20 seconds; retrying safely.');throw e}
 finally{clearTimeout(timer)}
}
function ghNormalizeRepo(value){const repo=String(value||'').trim().replace(/^https?:\/\/[^/]+\//,'').replace(/\.git$/,'').replace(/^\/+|\/+$/g,'');if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('Enter the repository as owner/repository.');return repo}
function ghNormalizeApi(value){const raw=String(value||'').trim()||'https://api.github.com';let parsed;try{parsed=new URL(raw)}catch{throw Error('Enter a complete HTTPS API address.')}if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash)throw Error('The repository API address must be a plain HTTPS URL.');return `${parsed.origin}${parsed.pathname.replace(/\/+$/,'')}`}
async function ghCheckRepo(){
 const {response,body}=await ghRequest(`${gh.api}/repos/${gh.repo}`,{headers:ghHeaders(),cache:'no-store'});
 if(!response.ok)throw ghFail(response,body);
 if(body.archived)throw Error('That repository is archived and cannot accept game updates.');
 if(body.permissions&&body.permissions.push===false)throw Error('Your token needs Contents read and write permission.');
 gh.branch=String(body.default_branch||'main');gh.private=body.private!==false;return body;
}
async function ghRead(side,etag){
 const url=ghUrl(side)+'?ref='+encodeURIComponent(gh.branch);
 const {response,body}=await ghRequest(url,{headers:ghHeaders({Accept:'application/vnd.github.object+json',...(etag?{'If-None-Match':etag}:{})}),cache:'no-store'});
 if(response.status===304)return {unchanged:true};
 if(response.status===404)return {missing:true};
 if(!response.ok)throw ghFail(response,body);
 let data;
 if(body&&body.encoding==='none'){
  const raw=await ghRequest(url,{headers:ghHeaders({Accept:'application/vnd.github.raw+json'}),cache:'no-store'});
  if(!raw.response.ok)throw ghFail(raw.response,raw.body);
  data=raw.body; // Raw file itself is JSON. Never follow a credential-bearing download URL.
 }else{try{data=JSON.parse(ghDecode(body.content))}catch{throw Error('The repository room file is damaged or unreadable.')}}
 if(!data||!Number.isSafeInteger(data.seq)||data.seq<0||!Array.isArray(data.messages))throw Error('Invalid repository message envelope.');
 let last=0;for(const entry of data.messages){if(!entry||!Number.isSafeInteger(entry.seq)||entry.seq<=last||entry.seq>data.seq||!entry.msg||typeof entry.msg.type!=='string')throw Error('Invalid repository message order.');last=entry.seq}
 return {etag:body.encoding==='none'?'':response.headers.get('etag')||'',sha:body.sha,data};
}
async function ghWrite(side,payload,sha){
 if(side!==gh.side)throw Error('A player may only write their own repository seat.');
 const session=gh,wait=Math.max(0,1100-(Date.now()-(session.lastWrite||0)));
 if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
 if(gh!==session||!session.active)throw Error('Repository session changed.');
 session.lastWrite=Date.now();
 const {response,body}=await ghRequest(ghUrl(side),{method:'PUT',headers:ghHeaders({'Content-Type':'application/json'}),
  body:JSON.stringify({message:`branch wars ${gh.room} ${side} ${payload.seq}`,content:ghEncode(JSON.stringify(payload)),branch:gh.branch,...(sha?{sha}:{})})});
 if(response.status===409)return null;
 if(!response.ok)throw ghFail(response,body);
 const next=body&&body.content&&body.content.sha;if(!next)throw Error('GitHub accepted the update but did not return its version.');return next;
}
function ghCompact(messages){
 // Lobby and game states are replacement snapshots, not commands.
 const latest=new Map();for(const e of messages)if(['state','lobby'].includes(e.msg.type))latest.set(e.msg.type,e);
 return messages.filter(e=>!latest.has(e.msg.type)||e===latest.get(e.msg.type));
}
function ghAccepted(current){
 const n=Number(current.data&&current.data.seq)||0;
 if(n>gh.mine){gh.paused=true;throw Error('A newer writer is using this seat. Close duplicate tabs; do not overwrite its room file.')}
 if(n>gh.published){
  const remote=current.data.messages.find(e=>e.seq===n),local=gh.outbox.find(e=>e.seq===n)||(gh.inflight&&gh.inflight.messages.find(e=>e.seq===n));
  if(!remote||!local||JSON.stringify(remote.msg)!==JSON.stringify(local.msg)){gh.paused=true;throw Error('Conflicting room writer detected. This update was not ours.')}
  gh.published=n;
 }
 gh.sha=current.sha||'';
}
async function ghFlush(){
 const session=gh;if(session.busy||!session.active||session.paused||session.published>=session.mine)return;session.busy=true;
 try{
  while(gh===session&&session.active&&session.published<session.mine){
   if(session.sendFailures){const current=await ghRead(session.side,'');if(!current.missing)ghAccepted(current);if(session.published>=session.mine){session.sendFailures=0;session.inflight=null;ghCheckpoint();break}}
   const target=session.mine,payload={seq:target,ack:session.seen,messages:ghCompact(session.outbox)};session.inflight=payload;ghCheckpoint();let sha=null;
   for(let attempt=0;attempt<3&&!sha;attempt++){
    sha=await ghWrite(session.side,payload,session.sha);
    if(sha===null){const current=await ghRead(session.side,'');if(current.missing)session.sha='';else ghAccepted(current);if(session.published>=target)break}
   }
   if(gh!==session||!session.active)return;
   if(!sha&&session.published<target)throw Error('The room changed repeatedly. Close duplicate game tabs and retry.');
   if(sha){session.sha=sha;session.published=target}session.inflight=null;session.sendFailures=0;ghCheckpoint();
  }
  if(gh===session&&session.active)ghPaintHealth('UPDATE STORED · waiting for friend');
 }catch(e){if(gh===session&&session.active){
  session.sendFailures++;setConnection('REPOSITORY SEND INTERRUPTED // queued for retry // '+e.message,'bad');
  clearTimeout(session.retryTimer);if(!session.paused)session.retryTimer=setTimeout(()=>{session.retryTimer=null;if(gh===session)ghFlush()},ghDelay(Math.min(30000,1200*2**Math.min(session.sendFailures,5))));
 }}finally{session.busy=false;if(gh===session&&session.active&&!session.paused&&session.published<session.mine&&!session.retryTimer)queueMicrotask(ghFlush)}
}
function ghSend(msg){
 const next=ghCompact([...gh.outbox,{seq:gh.mine+1,msg:JSON.parse(JSON.stringify(msg))}]);
 if(next.length>100)throw Error('Repository command queue is full. Keep this tab open and reconnect before sending more commands.');
 gh.mine++;gh.outbox=next;ghCheckpoint();ghPaintHealth('SENDING UPDATE');ghFlush();
}
function ghPaintHealth(activity){
 // A quiet peer file is not a broken link; it also does not prove a live peer.
 if(gh.paused){setConnection('REPOSITORY ACCESS PAUSED // Check access and retry.','bad');return}
 if(gh.sendFailures||gh.pollFailures){setConnection('REPOSITORY LINK INTERRUPTED // queued updates retained; retrying','bad');return}
 if(gh.cooldownUntil>Date.now()){setConnection('REPOSITORY COOLDOWN // retry after '+new Date(gh.cooldownUntil).toLocaleTimeString(),'warn');return}
 const known=gh.peerFileSeen===true;
 const label=known?'REPOSITORY REACHABLE':'WAITING FOR PEER FILE';
 setConnection('REPOSITORY ROOM '+gh.room+' // '+label+' · '+activity+(gh.lastContact?' · last peer update '+new Date(gh.lastContact).toLocaleTimeString():''),known?'good':'warn');
}
async function ghPoll(){
 const session=gh;if(session.polling)return;session.polling=true;
 const other=session.side==='host'?'guest':'host';
 try{while(gh===session&&session.active){
  let delay=5000;
  try{
   if(session.paused){await new Promise(resolve=>setTimeout(resolve,5000));continue}
   const result=await ghRead(other,session.etag);
   if(gh!==session||!session.active)return;
   if(!result.unchanged&&!result.missing){
    // Await sealed-plan verification before processing subsequent commands.
    for(const entry of result.data.messages)if(entry.seq>session.seen){
     await handleMessage(entry.msg);
     if(gh!==session||!session.active)return;
     session.seen=entry.seq;ghCheckpoint();
    }
    session.etag=result.etag;session.lastContact=Date.now();
    const ack=Number(result.data.ack)||0;
    session.outbox=session.outbox.filter(e=>e.msg.type==='state'||e.seq>Math.min(ack,session.published));
   }
   session.peerFileSeen=!result.missing;session.lastPoll=Date.now();session.pollFailures=0;
   ghPaintHealth(result.missing?'waiting for friend to join':result.unchanged?'no new messages':'peer update received');
   ghCheckpoint();
  }catch(e){if(gh===session&&session.active){session.pollFailures++;delay=ghDelay(Math.min(30000,5000*2**Math.min(session.pollFailures,3)));setConnection('REPOSITORY LINK INTERRUPTED // retrying // '+e.message,'bad')}}
  await new Promise(resolve=>setTimeout(resolve,delay));
 }}finally{session.polling=false}
}
function ghCheckpoint(){
 if(!gh.active)return;
 try{
  const {token,busy,retryTimer,polling,...connection}=gh;
  const checkpoint={version:1,connection:packStorageValue(connection,'connection'),game:packStorageValue(p2pRole==='host'?game:null,'game'),view:packStorageValue(p2pRole==='guest'?view:null,'view'),p2pConfig,ghPendingPlan,ghIncomingCommit,lobby:game||view?null:lobby,lobbyPending};
  if(['connection','game','view'].some(key=>checkpoint[key]?.branchWarsStorage===1))checkpoint.version=2;
  sessionStorage.setItem('branchWarsGhResume',JSON.stringify(checkpoint));
 }catch{if(!gh.storageWarned){gh.storageWarned=true;toast('Repository reload recovery could not be saved. Keep this tab open; the host should EXPORT a backup.')}}
}
function ghRetry(){
 if(!gh.active)return;gh.paused=false;gh.etag='';clearTimeout(gh.retryTimer);gh.retryTimer=null;
 // Never discard a seal or invent a new plan on a slow connection.
 gh.sendFailures=gh.published<gh.mine?Math.max(1,gh.sendFailures):0;ghFlush();ghPoll();
 if(gh.cooldownUntil>Date.now())setConnection('REPOSITORY COOLDOWN // retry after '+new Date(gh.cooldownUntil).toLocaleTimeString(),'warn');
}
function ghResumeToken(side,fallback='',allowOtherField=false){
 const selector=side==='guest'?'#ghGuestToken':'#ghToken';
 const other=side==='guest'?'#ghToken':'#ghGuestToken';
 const token=String(($(selector)&&$(selector).value)||(allowOtherField&&$(other)&&$(other).value)||sessionStorage.getItem('branchWarsGhToken')||fallback||'').trim();
 if(!token)throw Error('Enter your own access token, then press Resume.');
 if(!/^[\x21-\x7e]+$/.test(token))throw Error('The access token contains spaces or invalid characters. Paste only the token, then press Resume.');
 return token;
}
async function ghResume(){
 let attempt=connectionAttempt;
 if(gh.active){
  try{const token=ghResumeToken(gh.side,gh.token);gh.token=token;ghRemember();ghRetry()}
  catch(error){setStartMessage(error.message);setConnection('REPOSITORY RESUME // '+error.message,'bad')}
  return;
 }
 try{
  const saved=JSON.parse(sessionStorage.getItem('branchWarsGhResume')||'null');
  if(saved){
   const packed=['connection','game','view'].some(key=>saved[key]?.branchWarsStorage!==undefined);
   if(![1,2].includes(saved.version)||(saved.version===2)!==packed)throw Error('Unsupported or inconsistent repository checkpoint storage version.');
   for(const key of ['connection','game','view'])saved[key]=unpackStorageValue(saved[key]);
  }
  if(!saved||!saved.connection||!['host','guest'].includes(saved.connection.side))throw Error('No repository session saved in this tab. The host can still export/import a campaign backup.');
  const c=saved.connection,token=ghResumeToken(c.side,'',true);
  const repo=ghNormalizeRepo(c.repo),api=ghNormalizeApi(c.api);
  if(!/^[A-Z2-9]{8}$/.test(c.room))throw Error('Invalid saved room.');
  const restored=saved.game?migrateGame(saved.game):null;
  if(saved.view)validateIncomingFeatureRules(saved.view,'view');
  if(saved.lobby)validateIncomingFeatureRules(saved.lobby.settings,'lobby');
  resetLink();attempt=connectionAttempt;gh={...emptyGh(),...c,repo,api,token,active:true,busy:false,polling:false,retryTimer:null,paused:false,etag:'',sendFailures:c.published<c.mine?1:0};
  mode='gh';p2pRole=c.side;seat=c.side==='host'?0:1;p2pConfig=saved.p2pConfig;game=restored;view=saved.view;
  ghPendingPlan=saved.ghPendingPlan;ghIncomingCommit=saved.ghIncomingCommit;lobby=saved.lobby||null;lobbyPending=saved.lobbyPending||null;draft=null;if(view&&ghPendingPlan)view.me.submitted=true;
  await ghCheckRepo();if(attempt!==connectionAttempt)return;gh.branch=c.branch||gh.branch;const own=await ghRead(c.side,'');if(attempt!==connectionAttempt)return;
  if(!own.missing)ghAccepted(own);
  ghRemember();if(game||view)enterGame(true);else if(lobby)renderLobby();else show('#connectScreen');
  ghPoll();ghFlush();if(p2pRole==='host')challengePeerFeatures();else send(makeFeatureHello());setConnection('REPOSITORY '+gh.room+' // RESUMING SAVED SESSION','warn');
 }catch(e){if(attempt!==connectionAttempt)return;gh.active=false;show('#startScreen');setMode('gh');setStartMessage(e.message)}
}
function ghConfig(tokenField){
 const repo=ghNormalizeRepo($('#ghRepo').value);
 const token=($(tokenField).value||'').trim();
 if(!token)throw Error('Enter your own access token. Never use your rival\u2019s.');
 const api=ghNormalizeApi($('#ghApi').value);
 return{repo,token,api}}
function ghRemember(){try{localStorage.setItem('branchWarsGh',JSON.stringify({repo:gh.repo,api:gh.api}));sessionStorage.setItem('branchWarsGhToken',gh.token)}catch{}}
function ghRestore(){try{const saved=JSON.parse(localStorage.getItem('branchWarsGh')||'null');if(!saved)return;
 if($('#ghRepo')&&!$('#ghRepo').value)$('#ghRepo').value=saved.repo||'';
 if($('#ghApi')&&!$('#ghApi').value&&saved.api&&saved.api!=='https://api.github.com')$('#ghApi').value=saved.api;
 if($('#ghGuestApi')&&!$('#ghGuestApi').value&&saved.api&&saved.api!=='https://api.github.com')$('#ghGuestApi').value=saved.api;
 const token=sessionStorage.getItem('branchWarsGhToken')||'';if($('#ghToken')&&!$('#ghToken').value)$('#ghToken').value=token;if($('#ghGuestToken')&&!$('#ghGuestToken').value)$('#ghGuestToken').value=token}catch{}}
function ghForget(){try{sessionStorage.removeItem('branchWarsGhToken')}catch{}['#ghToken','#ghGuestToken'].forEach(id=>{if($(id))$(id).value=''});setStartMessage('Session token removed from this browser.')}
function ghRoomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(8);if(globalThis.crypto&&crypto.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);return [...bytes].map(x=>alphabet[x%alphabet.length]).join('')}
async function ghCreateRoom(){
 let attempt=connectionAttempt;
 try{if(featureSelectionPending())throw Error('Confirm or cancel the pending feature changes before opening a room.');setStartMessage('');const cfg=ghConfig('#ghToken');const name=validName('#ghHostName');
  resetLink();attempt=connectionAttempt;game=null;view=null;mode='gh';p2pRole='host';
  p2pConfig={lobbyRequired:true,...readSetupFeatureOptions(),color:$('#bankColor1').value,name,scope:$('#ghScope').value,scenario:$('#ghScenario').value,doctrine:'community'};
  gh={...emptyGh(),active:true,...cfg,side:'host'};await ghCheckRepo();if(attempt!==connectionAttempt)return;ghRemember();
  for(let reservationTry=0;reservationTry<5&&!gh.sha;reservationTry++){gh.room=ghRoomCode();const existing=await ghRead('host','');if(attempt!==connectionAttempt)return;if(existing.missing){try{gh.sha=await ghWrite('host',{seq:0,messages:[]},'')||''}catch(e){if(attempt!==connectionAttempt)return;const accepted=await ghRead('host','');if(attempt!==connectionAttempt)return;if(!accepted.missing&&Number(accepted.data&&accepted.data.seq)===0)gh.sha=accepted.sha||'';else throw e}}}
  if(attempt!==connectionAttempt)return;if(!gh.sha)throw Error('Could not reserve a unique repository room. Try again.');
  show('#connectScreen');$('#rejoinBtn').classList.add('hidden');$('#answerArea').classList.add('hidden');
  $('#connectInstructions').innerHTML=`<b>ROOM OPEN.</b> Send this join code to your rival. They need their own access token; never send them yours.${gh.private?'':'<br><b class="bad">WARNING:</b> This repository is public, so the fictional campaign files will also be public.'}`;
  $('#outCodeLabel').textContent='JOIN CODE';$('#outCode').classList.remove('room-code');
  $('#outCode').value=pack('BW7-ROOM-',{repo:gh.repo,room:gh.room});
  setConnection(`REPOSITORY ROOM ${gh.room} // WAITING FOR RIVAL`,'warn');ghCheckpoint();ghPoll();
 }catch(e){if(attempt!==connectionAttempt)return;gh.active=false;show('#startScreen');setMode('gh');setStartMessage(e.message);setConnection(e.message,'bad')}}
async function ghJoinRoom(){
 let attempt=connectionAttempt;
 try{setStartMessage('');const invite=unpack($('#ghJoinCode').value,'BW7-ROOM-');const name=validName('#ghGuestName');
  const token=($('#ghGuestToken').value||'').trim();
  if(!token)throw Error('Enter your own access token. Never use your rival\u2019s.');
  const repo=ghNormalizeRepo(invite.repo),room=String(invite.room||'').trim().toUpperCase(),api=ghNormalizeApi($('#ghGuestApi').value);if(!/^[A-Z2-9]{8}$/.test(room))throw Error('That repository-room code is invalid or incomplete. Ask the host for a fresh code.');
  resetLink();attempt=connectionAttempt;game=null;view=null;mode='gh';p2pRole='guest';
  p2pConfig={lobbyRequired:true,...readSetupFeatureOptions(),color:$('#bankColor1').value,guestName:name,doctrine:'commercial'};
  gh={...emptyGh(),active:true,api,repo,room,token,side:'guest'};await ghCheckRepo();if(attempt!==connectionAttempt)return;const occupied=await ghRead('guest','');if(attempt!==connectionAttempt)return;if(!occupied.missing)throw Error('This room already has a guest file. Use Resume in the original tab; do not overwrite an occupied seat.');$('#ghRepo').value=gh.repo;ghRemember();
  show('#connectScreen');$('#rejoinBtn').classList.add('hidden');$('#answerArea').classList.add('hidden');
  $('#connectInstructions').innerHTML=`<b>ROOM JOINED.</b> Waiting for the host to open the campaign.${gh.private?'':'<br><b class="bad">WARNING:</b> This repository is public, so the fictional campaign files will also be public.'}`;
  $('#outCodeLabel').textContent='ROOM';$('#outCode').classList.add('room-code');$('#outCode').value=gh.room;
  setConnection(`REPOSITORY ROOM ${gh.room} // CONNECTING`,'warn');ghPoll();
  ghSend(makeFeatureHello());
 }catch(e){if(attempt!==connectionAttempt)return;gh.active=false;show('#startScreen');setMode('gh');setStartMessage(e.message);setConnection(e.message,'bad')}}
