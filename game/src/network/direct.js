function waitIce(peer,onProgress){return new Promise(resolve=>{if(peer.iceGatheringState==='complete')return resolve();let done=false,found=0,settle=null;
const finish=()=>{if(done)return;done=true;clearTimeout(ceiling);clearTimeout(settle);peer.removeEventListener('icegatheringstatechange',check);peer.removeEventListener('icecandidate',candidate);resolve()},
check=()=>{if(peer.iceGatheringState==='complete')finish()},
candidate=e=>{if(!e.candidate)return finish();found++;if(onProgress)onProgress(found);clearTimeout(settle);settle=setTimeout(finish,1200)};
peer.addEventListener('icegatheringstatechange',check);peer.addEventListener('icecandidate',candidate);
const ceiling=setTimeout(finish,20000)})}function validNetworkAddress(raw){if(/^[0-9.]+$/.test(raw)){const parts=raw.split('.');return parts.length===4&&parts.every(x=>/^\d{1,3}$/.test(x)&&Number(x)>=0&&Number(x)<=255)&&raw!=='0.0.0.0'}return /^[0-9a-fA-F:]{3,45}$/.test(raw)&&raw.includes(':')}
function rememberLanIp(){const raw=($('#lanIp')&&$('#lanIp').value||'').trim();if(raw&&!validNetworkAddress(raw))throw Error('Enter a valid IPv4 address, such as 10.20.30.40.');lanIp=raw;if(lanIp){try{localStorage.setItem('branchWarsLanIp',lanIp)}catch{}}return lanIp}
function loadLanIp(){let v='';const hash=String(location.hash||'');const m=hash.match(/lanip=([^&]+)/i);if(m)v=decodeURIComponent(m[1]).trim();if(!v){try{v=localStorage.getItem('branchWarsLanIp')||''}catch{}}if(v&&validNetworkAddress(v)&&$('#lanIp')){$('#lanIp').value=v;lanIp=v}}
// Browsers replace local addresses with .local mDNS names, which cannot be resolved
// from another subnet. Every other field of the candidate stays in the clear, so
// adding a copy that names our own address gives the rival something reachable to try.
function withLocalAddress(desc){
 if(!lanIp||!desc||!desc.sdp)return desc;
 const lines=desc.sdp.split(/\r?\n/).filter(l=>l.length),extra=[];
 for(const line of lines){
  if(!line.startsWith('a=candidate:')||!/ typ host/.test(line))continue;
  const parts=line.split(' ');
  if(parts.length<6||parts[4]===lanIp||!/\.local$/i.test(parts[4]))continue;
  parts[4]=lanIp;const rewritten=parts.join(' ');
  if(!extra.includes(rewritten)&&!lines.includes(rewritten))extra.push(rewritten);
 }
 if(!extra.length)return desc;
 const at=lines.findIndex(l=>l.startsWith('a=candidate:'));
 const merged=at<0?lines.concat(extra):lines.slice(0,at).concat(extra,lines.slice(at));
 return{type:desc.type,sdp:merged.join('\r\n')+'\r\n'};
}
function linkDetail(){if(gh.active)return `${gh.repo}`;if(lan.active)return '';if(!pc)return '';return `PEER ${String(pc.connectionState||'new').toUpperCase()} / CHANNEL ${dc?String(dc.readyState).toUpperCase():'NONE'}`}
function paintLink(){const detail=linkDetail(),full=linkText+(detail?` // ${detail}`:'');if($('#connectionStatus')){$('#connectionStatus').textContent=full;$('#connectionStatus').className='notice '+linkCls}if($('#lobbyConnection')){$('#lobbyConnection').textContent=full;$('#lobbyConnection').className='connection '+linkCls}if($('#linkState')){$('#linkState').textContent=full;$('#linkState').className='connection '+linkCls}}
function setConnection(text,cls='warn'){linkText=text;linkCls=cls;paintLink()}
let connectionAttempt=0;
function resetLink(){connectionAttempt++;ghCheckpoint();lan.active=false;clearTimeout(lan.retryTimer);lan=emptyLan();resetFeaturePeer();$('#connectHint').textContent='';lobby=null;lobbyPending=null;lobbyDirty=false;lobbySettingsDirty=false;linkReady=false;gh.active=false;ghPendingPlan=null;ghIncomingCommit=null;clearTimeout(gh.retryTimer);gh.retryTimer=null;stopHandshake();clearTimeout(linkWatch);linkWatch=null;clearTimeout(dropGrace);dropGrace=null;clearTimeout(planAckTimer);planAckTimer=null;linkText='';linkCls='warn';if(pc){try{pc.close()}catch{}}pc=null;dc=null}
function handshakeDone(){return linkReady}
function stopHandshake(){if(handshakeTimer){clearInterval(handshakeTimer);handshakeTimer=null}}
function startHandshake(){stopHandshake();handshakeTries=0;const beat=()=>{if(handshakeDone()||!dc||dc.readyState!=='open'){stopHandshake();return}if(handshakeTries++>=12){stopHandshake();setConnection('DIRECT LINK STALLED // The channel is open but the rival never completed the handshake. Exchange fresh codes.','bad');offerRelink();return}try{if(p2pRole==='guest')send(makeFeatureHello());else challengePeerFeatures()}catch(e){setConnection(`DIRECT LINK SEND FAILED // ${e.message}`,'bad')}};beat();handshakeTimer=setInterval(beat,1500)}
function armLinkWatch(){clearTimeout(linkWatch);linkWatch=setTimeout(()=>{if(!dc||dc.readyState!=='open'){setConnection('DIRECT LINK STALLED // The network connected but the game data channel never opened. This network is blocking direct browser traffic; try Intranet Room mode.','bad');offerRelink()}else if(!handshakeDone()){setConnection('DIRECT LINK STALLED // The channel is open but the rival has not answered. Exchange fresh codes.','bad');offerRelink()}},9000)}
function newPeer(){if(!window.RTCPeerConnection)throw Error('This browser has disabled direct WebRTC connections. Use AI or Pass & Play.');const p=new RTCPeerConnection({iceServers:[]});p.onconnectionstatechange=()=>{if(p!==pc)return;const s=p.connectionState||'connecting',open=!!dc&&dc.readyState==='open';
 if(s==='disconnected'){if(!dropGrace)dropGrace=setTimeout(()=>{dropGrace=null;if(pc===p&&(p.connectionState==='disconnected'||p.connectionState==='failed'))linkLost('The direct link dropped and did not recover.')},12000);setConnection('DIRECT LINK UNSTEADY // waiting for it to recover','warn');return}
 clearTimeout(dropGrace);dropGrace=null;
 if(s==='failed'){linkLost('The network refused or dropped the direct connection.');return}
 setConnection(open?'DIRECT LINK CONNECTED':s==='connected'?'NETWORK LINKED // OPENING GAME CHANNEL':`DIRECT LINK: ${s.toUpperCase()}`,open?'good':s==='closed'?'bad':'warn');if(s==='connected')armLinkWatch()};return p}
// WebRTC cannot restart ICE without a signalling path, and ours is a human with a chat window.
function linkLost(why){stopHandshake();resetFeaturePeer();linkReady=false;if($('#answerInput'))$('#answerInput').value='';setConnection(`${why} A new pair of codes is needed to reconnect: press NEW LINK CODE.`,'bad');offerRelink()}
function offerRelink(){if($('#rejoinBtn'))$('#rejoinBtn').classList.toggle('hidden',!(p2pRole==='guest'&&!lan.active));paintRelink();if((game||view)&&p2pRole==='guest'&&!linkReady)toast('The link dropped. Ask the host for a replacement invitation code.')}
function paintRelink(){const btn=$('#relinkBtn');if(!btn)return;const usable=!lan.active&&(game||view)&&(p2pRole==='host'||p2pRole==='guest');btn.classList.toggle('hidden',!usable);btn.textContent=gh.active?'[ RETRY REPOSITORY LINK ]':p2pRole==='host'?'[ NEW LINK CODE ]':'[ PASTE NEW HOST CODE ]'}
function startRejoin(){relinking=true;show('#startScreen');setMode('p2p');setStartMessage('Paste the replacement invitation from the host, then create a response. Your campaign is held in place.');$('#offerInput').value='';$('#offerInput').focus()}
function wireChannel(ch){dc=ch;const opened=()=>{if(ch!==dc)return;resetFeaturePeer();clearTimeout(dropGrace);dropGrace=null;linkReady=false;setConnection('DIRECT LINK CONNECTED','good');if($('#rejoinBtn'))$('#rejoinBtn').classList.add('hidden');startHandshake()};dc.onopen=opened;dc.onclose=()=>{if(ch!==dc)return;resetFeaturePeer();linkReady=false;stopHandshake();setConnection('DIRECT LINK CLOSED','bad')};dc.onerror=e=>{if(ch!==dc)return;const detail=e&&e.error&&e.error.message?` // ${e.error.message}`:'';setConnection(`DIRECT LINK ERROR${detail}`,'bad')};dc.onmessage=e=>{if(ch!==dc)return;try{handleMessage(JSON.parse(e.data))}catch(err){console.error('Branch Wars could not process a direct-link message',err);setConnection(`DIRECT LINK MESSAGE REJECTED // ${err.message||err}`,'bad');toast(`Direct-link message could not be processed: ${err.message||err}`)}};if(dc.readyState==='open')opened()}
function send(msg){if(gh.active){ghSend(msg);return}if(lan.active){lanSend(msg);return}if(!dc||dc.readyState!=='open')throw Error(`The direct link is not connected (channel ${dc?dc.readyState:'missing'}).`);dc.send(JSON.stringify(msg))}
async function createOffer(reconnect=false){let attempt=connectionAttempt;try{if(!reconnect&&!game&&featureSelectionPending())throw Error('Confirm or cancel the pending feature changes before opening a link.');setStartMessage('');rememberLanIp();const rejoin=reconnect||(p2pRole==='host'&&!!game&&game.mode==='p2p');resetLink();attempt=connectionAttempt;if(!rejoin){game=null;view=null}mode='p2p';p2pRole='host';
 if(!rejoin||!p2pConfig)p2pConfig={lobbyRequired:true,...readSetupFeatureOptions(),color:$('#bankColor1').value,name:validName('#hostName'),scope:$('#hostScope').value,scenario:$('#hostScenario').value,doctrine:'community'};
 linkSession=(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)).slice(0,12);
 const peer=pc=newPeer();wireChannel(peer.createDataChannel('branch-wars',{ordered:true}));const offer=await peer.createOffer();if(attempt!==connectionAttempt)return;await peer.setLocalDescription(offer);if(attempt!==connectionAttempt)return;
 show('#connectScreen');$('#rejoinBtn').classList.add('hidden');$('#outCode').value='';$('#answerInput').value='';$('#copyStatus').textContent='';setConnection('MAPPING NETWORK ROUTES','warn');
 await waitIce(peer,n=>{if(attempt===connectionAttempt)setConnection(`MAPPING NETWORK ROUTES // ${n} found`,'warn')});if(attempt!==connectionAttempt)return;
 $('#connectInstructions').innerHTML=rejoin?'<b>REPLACEMENT INVITATION READY.</b> Send this code to your rival. The campaign is held in place until they return a response.':'<b>HOST INVITATION READY.</b> Send this entire code to your rival. They paste it under Join and return a response.';
 $('#connectHint').textContent='Paste it whole. Chat clients may wrap it across lines -- that is fine, the game strips the breaks.';
 $('#outCodeLabel').textContent='HOST INVITATION';$('#outCode').classList.remove('room-code');$('#outCode').value=pack('BW7-OFFER-',{sdp:withLocalAddress(pc.localDescription),config:p2pConfig,session:linkSession});
 $('#answerArea').classList.remove('hidden');setConnection('WAITING FOR RIVAL RESPONSE','warn')}catch(e){if(attempt!==connectionAttempt)return;setStartMessage(e.message);show(game?'#gameScreen':'#startScreen')}}
async function createAnswer(reconnect=false){let attempt=connectionAttempt;try{setStartMessage('');rememberLanIp();const rejoin=reconnect||(p2pRole==='guest'&&!!view&&view.mode==='p2p');const invite=unpack($('#offerInput').value,'BW7-OFFER-');resetLink();attempt=connectionAttempt;if(!rejoin){game=null;view=null}mode='p2p';p2pRole='guest';
 p2pConfig={lobbyRequired:true,...invite.config,color:$('#bankColor1').value,guestName:rejoin&&p2pConfig&&p2pConfig.guestName?p2pConfig.guestName:validName('#guestName'),doctrine:'commercial'};validateIncomingFeatureRules(invite.config||{},'lobby');linkSession=invite.session||'';
 const peer=pc=newPeer();peer.ondatachannel=e=>{if(attempt===connectionAttempt&&peer===pc)wireChannel(e.channel)};await peer.setRemoteDescription(invite.sdp);if(attempt!==connectionAttempt)return;const answer=await peer.createAnswer();if(attempt!==connectionAttempt)return;await peer.setLocalDescription(answer);if(attempt!==connectionAttempt)return;
 show('#connectScreen');$('#rejoinBtn').classList.add('hidden');$('#outCode').value='';$('#answerInput').value='';$('#copyStatus').textContent='';setConnection('MAPPING NETWORK ROUTES','warn');
 await waitIce(peer,n=>{if(attempt===connectionAttempt)setConnection(`MAPPING NETWORK ROUTES // ${n} found`,'warn')});if(attempt!==connectionAttempt)return;
 $('#connectInstructions').innerHTML='<b>RIVAL RESPONSE READY.</b> Send this entire response to the host and keep this window open.';
 $('#connectHint').textContent='Paste it whole. Line breaks added by chat or mail are removed automatically.';
 $('#outCodeLabel').textContent='RIVAL RESPONSE';$('#outCode').classList.remove('room-code');$('#outCode').value=pack('BW7-ANSWER-',{sdp:withLocalAddress(pc.localDescription),session:linkSession});
 $('#answerArea').classList.add('hidden');setConnection('WAITING FOR HOST','warn')}catch(e){if(attempt!==connectionAttempt)return;setConnection(e.message,'bad');show('#startScreen');setMode('p2p');setStartMessage(e.message)}}
async function applyAnswer(){const attempt=connectionAttempt,peer=pc;try{if(!pc)throw Error('Create the invitation first, then paste the rival response.');const answer=unpack($('#answerInput').value,'BW7-ANSWER-');
 if(answer.session&&linkSession&&answer.session!==linkSession)throw Error('That response answers an older invitation. Send your rival the invitation currently shown above, or generate a new one.');
 if(pc.signalingState!=='have-local-offer'){if(dc&&dc.readyState==='open')throw Error('This link is already connected. Close this desk and keep playing.');throw Error('This invitation has already been used. Press NEW LINK CODE, send your rival the fresh invitation, and paste the response they send back.')}
 await peer.setRemoteDescription(answer.sdp);if(attempt!==connectionAttempt||peer!==pc)return;if(!dc||dc.readyState!=='open')setConnection('CONNECTING DIRECTLY','warn')}catch(e){if(attempt!==connectionAttempt)return;setConnection(e.message,'bad')}}

function copyCode(){const t=$('#outCode');t.select();t.setSelectionRange(0,t.value.length);const fallback=()=>{try{document.execCommand('copy');$('#copyStatus').textContent='COPIED.'}catch{$('#copyStatus').textContent='Select the code and press Ctrl+C.'}};if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t.value).then(()=>$('#copyStatus').textContent='COPIED.').catch(fallback);else fallback()}
