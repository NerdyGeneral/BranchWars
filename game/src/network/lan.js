async function lanRequest(path,options={}){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
 try{
  const response=await fetch(path,{headers:{'Content-Type':'application/json'},...options,signal:ctrl.signal});
  let data;try{data=await response.json()}catch(e){if(ctrl.signal.aborted)throw e;throw Error('LAN server returned invalid JSON. Your queued updates are retained.')}
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('LAN server returned an invalid response.');
  if(!response.ok)throw Error(data.error||`LAN server returned ${response.status}.`);return data;
 }catch(e){if(ctrl.signal.aborted||e&&e.name==='AbortError')throw Error('LAN server did not respond within 8 seconds.');throw e}
 finally{clearTimeout(timer)}
}
function messageId(){return globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}
async function createLanRoom(){let attempt=connectionAttempt;try{if(featureSelectionPending())throw Error('Confirm or cancel the pending feature changes before opening a room.');setStartMessage('');resetLink();attempt=connectionAttempt;mode='lan';p2pRole='host';p2pConfig={lobbyRequired:true,...readSetupFeatureOptions(),color:$('#bankColor1').value,name:validName('#lanHostName'),scope:$('#lanScope').value,scenario:$('#lanScenario').value};const data=await lanRequest('/api/create',{method:'POST',body:JSON.stringify({hostName:p2pConfig.name})});if(attempt!==connectionAttempt)return;lan={...emptyLan(),active:true,room:data.room,token:data.token};show('#connectScreen');$('#connectInstructions').innerHTML='<b>ROOM OPEN.</b> Give your friend the room code or the address shown in the LAN server window. Keep this browser and the server window open.';$('#outCodeLabel').textContent='ROOM CODE';$('#outCode').value=data.room;$('#outCode').classList.add('room-code');$('#answerArea').classList.add('hidden');setConnection(`ROOM ${data.room} // WAITING FOR RIVAL`,'warn');pollLan()}catch(e){if(attempt!==connectionAttempt)return;lan=emptyLan();setStartMessage(`${e.message} Start OPEN_LAN_GAME.bat to use room mode.`);show('#startScreen')}}
async function joinLanRoom(){let attempt=connectionAttempt;try{setStartMessage('');resetLink();attempt=connectionAttempt;mode='lan';p2pRole='guest';p2pConfig={lobbyRequired:true,...readSetupFeatureOptions(),color:$('#bankColor1').value,guestName:validName('#lanGuestName')};const room=$('#lanRoom').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(room))throw Error('Enter the six-character room code.');const data=await lanRequest('/api/join',{method:'POST',body:JSON.stringify({room,name:p2pConfig.guestName})});if(attempt!==connectionAttempt)return;lan={...emptyLan(),active:true,room:data.room,token:data.token};show('#connectScreen');$('#connectInstructions').innerHTML='<b>ROOM JOINED.</b> Waiting for the host to open the campaign.';$('#outCodeLabel').textContent='ROOM CODE';$('#outCode').value=data.room;$('#outCode').classList.add('room-code');$('#answerArea').classList.add('hidden');setConnection(`ROOM ${data.room} // CONNECTING`,'warn');pollLan();send(makeFeatureHello())}catch(e){if(attempt!==connectionAttempt)return;lan=emptyLan();setStartMessage(`${e.message} Confirm the room code and LAN server address.`);show('#startScreen')}}
async function pollLan(){
 const session=lan;if(session.polling)return;session.polling=true;
 try{while(lan===session&&session.active){
  let delay=700;
  try{
   const data=await lanRequest(`/api/poll?room=${encodeURIComponent(session.room)}&token=${encodeURIComponent(session.token)}&after=${session.after}`);
   if(lan!==session||!session.active)return;
   if(!Array.isArray(data.messages))throw Error('LAN server returned an invalid message list.');
   let previous=0;for(const item of data.messages){if(!item||!Number.isSafeInteger(item.seq)||item.seq<=previous||!item.message||typeof item.message.type!=='string')throw Error('LAN server returned invalid message ordering.');previous=item.seq}
   for(const item of data.messages)if(item.seq>session.after){
    await handleMessage(item.message);
    if(lan!==session||!session.active)return;
    session.after=item.seq;
   }
   session.failures=0;
   if(data.connected&&linkReady&&(p2pRole!=='host'||peerFeatureStatus().compatible))setConnection(`ROOM ${session.room} // CONNECTED`,'good');
  }catch(e){if(lan===session&&session.active){session.failures++;delay=Math.min(8000,700*(2**Math.min(session.failures,4)));setConnection(`LAN LINK INTERRUPTED // retrying // ${e.message}`,'bad')}}
  if(lan!==session||!session.active)return;
  await new Promise(resolve=>setTimeout(resolve,delay));
 }}finally{session.polling=false}
}
async function lanFlush(){if(lan.busy||!lan.active||!lan.outbox.length)return;const session=lan;lan.busy=true;try{while(lan===session&&session.active&&lan.outbox.length){const item=lan.outbox[0];const data=await lanRequest('/api/send',{method:'POST',body:JSON.stringify({room:lan.room,token:lan.token,clientId:item.id,message:item.msg})});if(lan!==session||!session.active)return;if(!data.ok)throw Error('The LAN server did not acknowledge the message.');lan.outbox.shift();lan.failures=0}}catch(e){if(lan===session&&session.active){lan.failures++;setConnection(`LAN SEND INTERRUPTED // queued for retry // ${e.message}`,'bad');clearTimeout(lan.retryTimer);lan.retryTimer=setTimeout(()=>{if(lan!==session||!session.active)return;lan.retryTimer=null;lanFlush()},Math.min(8000,800*(2**Math.min(lan.failures,4))))}}finally{session.busy=false;if(lan===session&&lan.active&&lan.outbox.length&&!lan.retryTimer)queueMicrotask(lanFlush)}}
function lanSend(msg){const snapshot=JSON.parse(JSON.stringify(msg));lan.outbox.push({id:messageId(),msg:snapshot});lanFlush()}
