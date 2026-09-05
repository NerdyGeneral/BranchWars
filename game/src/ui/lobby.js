function validName(id){const n=$(id).value.trim();if(!n)throw Error('Enter an institution name.');return n}
function lobbyIdentity(player,index){
 const name=String(player&&player.name||'').trim().slice(0,36);
 if(!name)throw Error('Enter an institution name.');
 if(!/^#[0-9a-f]{6}$/i.test(String(player.color)))throw Error('Choose a valid bank color.');
 return {name,color:E.bankColor(player.color,index),ready:false};
}
function lobbyColorsClash(a,b){
 const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
 const x=rgb(a),y=rgb(b);return Math.hypot(...x.map((n,i)=>n-y[i]))<100;
}
function lobbyAlternative(color){
 return ['#e1505c','#2878e0','#16835f','#8642bc','#a65d08','#163044'].find(c=>!lobbyColorsClash(color,c));
}
function lobbyOptions(){
 const c=p2pConfig;
 return {scope:['town','regional','state','national'].includes(c.scope)?c.scope:'national',
  scenario:['balanced','rate','regulatory','growth'].includes(c.scenario)?c.scenario:'balanced',
  campaignRulesVersion:c.campaignRulesVersion||0,serviceExpansionVersion:c.serviceExpansionVersion||0,
  managementVersion:c.managementVersion||0,customerDemandVersion:c.customerDemandVersion||0,...(c.workforceVersion?{workforceVersion:c.workforceVersion}:{})};
}
function publishLobby(){
 if(!lobby||game)return;
 ghCheckpoint();renderLobby();send({type:'lobby',lobby:JSON.parse(JSON.stringify(lobby))});
}
function openLobby(peer){
 if(peer.lobbySupported!==1){$('#connectHint').textContent='Update the game file on both computers to use the campaign lobby.';send({type:'error',code:'lobby_required',message:'The campaign lobby requires this updated game on both computers.'});setConnection('LOBBY REFUSED // Update both game files.','bad');return}
 if(!lobby){
  const host=lobbyIdentity({name:p2pConfig.name,color:E.bankColor(p2pConfig.color)},0);
  const guest=lobbyIdentity({name:peer.name,color:E.bankColor(peer.color,1)},1);
  const adjusted=lobbyColorsClash(host.color,guest.color);if(adjusted)guest.color=lobbyAlternative(host.color);
  lobby={version:1,revision:1,players:[host,guest],settings:lobbyOptions(),guestAck:'',
   note:adjusted?'The joining bank received a distinct starting color. Both players can change their own color before confirming.':''};
 }
 linkReady=true;stopHandshake();publishLobby();
}
function applyLobbyUpdate(index,message){
 if(!lobby||game)return;
 // Only the host invokes this for its own seat; remote messages always target seat 1.
 const reject=text=>{if(index===1){lobby.guestAck=String(message.id||'');lobby.error=text;publishLobby()}else throw Error(text)};
 if(message.revision!==lobby.revision)return reject('Setup changed. Review the current lobby and confirm again.');
 let player;try{player=lobbyIdentity(message.player,index)}catch(e){return reject(e.message)}
 if(lobbyColorsClash(player.color,lobby.players[1-index].color))return reject('Those colors are too similar. Choose a more distinct bank color.');
 const before=lobby.players[index],changed=player.name!==before.name||player.color!==before.color;
 if(changed){lobby.players[index]=player;lobby.revision++;lobby.players.forEach(p=>p.ready=false)}
 else lobby.players[index].ready=message.ready===true;
 if(index===1)lobby.guestAck=String(message.id||'');
 lobby.error='';if(index===0)lobbyDirty=false;
 lobby.note=changed?'Identity updated. Both players must confirm this setup.':lobby.note;
 publishLobby();
}
function editLobbyIdentity(ready=false){
 try{
  if(!lobby||game||view||lobbyPending)return;
  const i=p2pRole==='host'?0:1;
  const player=lobbyIdentity({name:$('#lobbyName').value,color:$('#lobbyColor').value},i);
  if(lobbyColorsClash(player.color,lobby.players[1-i].color))throw Error('Those colors are too similar. Choose a more distinct bank color.');
  const message={type:'lobby_update',id:messageId(),revision:lobby.revision,player,ready};
  $('#lobbyError').textContent='';
  if(i===0)applyLobbyUpdate(0,message);
  else{lobbyPending=message;lobbyDirty=false;send(message);ghCheckpoint();renderLobby()}
 }catch(e){lobbyPending=null;$('#lobbyError').textContent=e.message;renderLobbyControls()}
}
function applyLobbySettings(){
 try{
  if(!lobby||game||p2pRole!=='host')return;
  const scope=$('#lobbyScope').value,scenario=$('#lobbyScenario').value;
  if(!['town','regional','state','national'].includes(scope)||!['balanced','rate','regulatory','growth'].includes(scenario))throw Error('Choose valid campaign settings.');
  if(scope===lobby.settings.scope&&scenario===lobby.settings.scenario){lobbySettingsDirty=false;renderLobbyControls();return}
  lobbySettingsDirty=false;
  lobby.settings.scope=scope;lobby.settings.scenario=scenario;lobby.revision++;lobby.players.forEach(p=>p.ready=false);
  lobby.note='Campaign settings updated. Both players must confirm again.';lobby.error='';publishLobby();
 }catch(e){$('#lobbyError').textContent=e.message}
}
function receiveLobby(message){
 if(game||view)return; // Delayed lobby frames cannot rewind an active campaign.
 const next=message.lobby;
 if(!next||next.version!==1||!Number.isSafeInteger(next.revision)||next.revision<1||!Array.isArray(next.players)||next.players.length!==2)throw Error('Invalid lobby snapshot.');
 next.players.forEach(lobbyIdentity);
 if(!next.settings||!['town','regional','state','national'].includes(next.settings.scope)||!['balanced','rate','regulatory','growth'].includes(next.settings.scenario))throw Error('Invalid lobby settings.');
 if(lobby&&next.revision<lobby.revision)return;
 if(lobbyPending&&(next.guestAck===lobbyPending.id||next.revision!==lobbyPending.revision)){lobbyPending=null;lobbyDirty=false}
 lobby=JSON.parse(JSON.stringify(next));linkReady=true;stopHandshake();ghCheckpoint();renderLobby();
}
function renderLobbyControls(){
 if(!lobby)return;
 const i=p2pRole==='host'?0:1,blocked=Boolean(lobbyPending),me=lobby.players[i];
 $('#lobbyReady').disabled=blocked||lobbyDirty||lobbySettingsDirty;$('#lobbySave').disabled=blocked||me.ready;
 $('#lobbyName').disabled=blocked||me.ready;$('#lobbyColor').disabled=blocked||me.ready;
 $('#lobbyScope').disabled=i!==0||me.ready||lobby.settings.campaignRulesVersion===1;$('#lobbyScenario').disabled=i!==0||me.ready;
 $('#lobbySettings').disabled=me.ready;
 $('#lobbyReady').textContent=me.ready?'Not ready':'Confirm ready';
 $('#lobbyStart').disabled=blocked||lobbyDirty||lobbySettingsDirty||!lobby.players.every(p=>p.ready);
}
function renderLobby(){
 if(!lobby||game||view)return;
 show('#lobbyScreen');const host=p2pRole==='host',i=host?0:1,settings=lobby.settings;
 $('#lobbyBanks').innerHTML=lobby.players.map((p,n)=>'<div class="lobby-bank" style="--identity-color:'+E.bankColor(p.color,n)+'"><span class="small muted">'+(n===0?'HOST · INSTITUTION 1':'GUEST · INSTITUTION 2')+(n===i?' · YOU':' · FRIEND')+'</span><h3><span class="bank-swatch"></span> '+esc(p.name)+'</h3><span class="'+(p.ready?'good':'muted')+'">'+(p.ready?'✓ Confirmed ready':'○ Reviewing setup')+'</span><span class="micro muted"> · '+esc(p.color)+'</span></div>').join('');
 if(!lobbyDirty){$('#lobbyName').value=(lobbyPending?lobbyPending.player:lobby.players[i]).name;$('#lobbyColor').value=(lobbyPending?lobbyPending.player:lobby.players[i]).color}
 if(!lobbySettingsDirty){$('#lobbyScope').value=settings.scope;$('#lobbyScenario').value=settings.scenario}
 $('#lobbyScope').disabled=!host||settings.campaignRulesVersion===1;$('#lobbyScenario').disabled=!host;
 $('#lobbySettings').classList.toggle('hidden',!host);$('#lobbyStart').classList.toggle('hidden',!host);
 $('#lobbyRetry').classList.toggle('hidden',!gh.active);
 $('#lobbyRules').textContent=(settings.campaignRulesVersion===1?'Regional Rivalry pilot · 2 regions / 6 markets (overrides size).':'Legacy campaign rules · open-ended.')+
  (settings.serviceExpansionVersion?' Expanded services preview.':'')+(settings.managementVersion?' Living institution preview.':'')+(settings.customerDemandVersion?' Customer needs preview.':'')+(settings.workforceVersion?' Specialist workforce preview.':'')+' Preview choices were set by the host when opening the room.';
 $('#lobbyNote').textContent=lobby.note||'Each player controls their own identity. The host controls the shared campaign settings.';
 $('#lobbyError').textContent=lobby.error||'';
 $('#lobbyProgress').textContent=lobbyPending?'Saving your confirmation through the link…':lobby.players.every(p=>p.ready)?(host?'Both players confirmed. You can start the campaign.':'Both players confirmed. Waiting for the host to start.'):'Waiting for both players to confirm this setup.';
 renderLobbyControls();paintLink();
}
function startLobbyCampaign(){
 try{
  if(p2pRole!=='host'||!lobby||game||!lobby.players.every(p=>p.ready)||lobbyDirty||lobbySettingsDirty)return;
  if(lobbyColorsClash(lobby.players[0].color,lobby.players[1].color))throw Error('Choose distinct bank colors before starting.');
  const [host,guest]=lobby.players,s=lobby.settings;
  const created=E.createGame({...s,campaignRulesVersion:s.campaignRulesVersion||undefined,mode:(lan.active||gh.active)?'lan':'p2p',name1:host.name,name2:guest.name,color1:host.color,color2:guest.color,difficulty:'vp',doctrine1:p2pConfig.doctrine});
  p2pConfig={...p2pConfig,...s,name:host.name,color:host.color};
  game=created;seat=0;draft=null;lastResolutionId=0;linkReady=true;syncPeers();
 }catch(e){$('#lobbyError').textContent=e.message}
}
function markLobbyDirty(){lobbyDirty=true;renderLobbyControls()}
$('#lobbyName').addEventListener('input',markLobbyDirty);
$('#lobbyColor').addEventListener('input',markLobbyDirty);
$('#lobbyScope').addEventListener('change',()=>{lobbySettingsDirty=true;renderLobbyControls()});
$('#lobbyScenario').addEventListener('change',()=>{lobbySettingsDirty=true;renderLobbyControls()});
$('#lobbySave').addEventListener('click',()=>editLobbyIdentity(false));
$('#lobbyReady').addEventListener('click',()=>{if(lobby)editLobbyIdentity(!lobby.players[p2pRole==='host'?0:1].ready)});
$('#lobbySettings').addEventListener('click',applyLobbySettings);
$('#lobbyStart').addEventListener('click',startLobbyCampaign);
$('#lobbyRetry').addEventListener('click',ghRetry);
$('#lobbyLeave').addEventListener('click',leaveGame);
