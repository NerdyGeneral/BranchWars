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
// Unapplied host choices are local UI state, never campaign or checkpoint rules.
let lobbyFeatureDraft=null;
function lobbyDraftSettings(){
 return lobbyFeatureDraft&&lobbyFeatureDraft.owner===lobby&&lobbyFeatureDraft.revision===lobby.revision
  ?JSON.parse(JSON.stringify(lobbyFeatureDraft.settings)):JSON.parse(JSON.stringify(lobby.settings));
}
function lobbySettingsSignature(settings){
 return JSON.stringify([settings.scope,settings.scenario,E.validateCampaignRules(settings,'lobby').signature]);
}
function lobbyCompatibility(){
 if(!lobby)return {compatible:false,pending:true,reason:'Waiting for the shared campaign rules.'};
 try{
  validateIncomingFeatureRules(lobby.settings,'lobby');
  return p2pRole==='host'?peerFeatureStatus(lobby.settings):{compatible:true,pending:false,reason:''};
 }catch(e){return {compatible:false,pending:false,reason:e.message}}
}
function discardLobbySettings(){
 lobbyFeatureDraft=null;lobbySettingsDirty=false;renderLobby();
}
function stageLobbyFeatures(options,revision){
 if(!lobby||game||view||p2pRole!=='host'||revision!==lobby.revision)throw Error('Setup changed. Review the current lobby before applying these choices.');
 const settings={...options,scope:$('#lobbyScope').value,scenario:$('#lobbyScenario').value};
 E.validateCampaignRules(settings,'lobby');
 lobbyFeatureDraft={owner:lobby,revision,settings};
 lobbySettingsDirty=lobbySettingsSignature(settings)!==lobbySettingsSignature(lobby.settings);
 renderLobby();
 return true;
}
function lobbyOptions(){
 const c=p2pConfig;
 const settings={scope:['town','regional','state','national'].includes(c.scope)?c.scope:'national',
  scenario:['balanced','rate','regulatory','growth'].includes(c.scenario)?c.scenario:'balanced',
  campaignRulesVersion:c.campaignRulesVersion||0,serviceExpansionVersion:c.serviceExpansionVersion||0,
  managementVersion:c.managementVersion||0,customerDemandVersion:c.customerDemandVersion||0};
 // Keep the established lobby field-presence contract; underlying defaults are
 // resolved by the registry rather than serialized as another enabled map.
 for(const feature of E.CAMPAIGN_FEATURES)if(feature.visible&&!(feature.field in settings)&&c[feature.field])settings[feature.field]=c[feature.field];
 E.validateCampaignRules(settings,'lobby');
 return settings;
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
 if(message.ready===true){
  const compatibility=lobbyCompatibility();
  if(!compatibility.compatible)return reject(compatibility.reason||'Waiting for a compatible peer handshake.');
  if(index===0&&(lobbySettingsDirty||featureSelectionPending()))return reject('Apply or discard the pending campaign settings first.');
 }
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
  if(!lobby||game||p2pRole!=='host'||featureSelectionPending())return;
  const scope=$('#lobbyScope').value,scenario=$('#lobbyScenario').value;
  if(!['town','regional','state','national'].includes(scope)||!['balanced','rate','regulatory','growth'].includes(scenario))throw Error('Choose valid campaign settings.');
  if(lobbyFeatureDraft&&(lobbyFeatureDraft.owner!==lobby||lobbyFeatureDraft.revision!==lobby.revision))throw Error('Setup changed. Discard the old draft and review the current lobby.');
  const settings={...lobbyDraftSettings(),scope,scenario};
  E.validateCampaignRules(settings,'lobby');
  if(lobbySettingsSignature(settings)===lobbySettingsSignature(lobby.settings)){discardLobbySettings();return}
  lobbyFeatureDraft=null;lobbySettingsDirty=false;
  lobby.settings=JSON.parse(JSON.stringify(settings));lobby.revision++;lobby.players.forEach(p=>p.ready=false);
  // Clear old feature values as well as setting new ones, without replacing
  // connection identity, transport credentials or unrelated room configuration.
  for(const feature of E.CAMPAIGN_FEATURES)if(feature.visible)delete p2pConfig[feature.field];
  Object.assign(p2pConfig,settings);
  lobby.note='Campaign settings updated. Both players must confirm again.';lobby.error='';publishLobby();
  if(peerFeatureStatus(lobby.settings).pending)challengePeerFeatures();
 }catch(e){$('#lobbyError').textContent=e.message}
}
function receiveLobby(message){
 if(game||view)return; // Delayed lobby frames cannot rewind an active campaign.
 const next=message.lobby;
 if(!next||next.version!==1||!Number.isSafeInteger(next.revision)||next.revision<1||!Array.isArray(next.players)||next.players.length!==2)throw Error('Invalid lobby snapshot.');
 next.players.forEach(lobbyIdentity);
 if(!next.settings||!['town','regional','state','national'].includes(next.settings.scope)||!['balanced','rate','regulatory','growth'].includes(next.settings.scenario))throw Error('Invalid lobby settings.');
 validateIncomingFeatureRules(next.settings,'lobby');
 if(lobby&&next.revision<lobby.revision)return;
 if(lobbyPending&&(next.guestAck===lobbyPending.id||next.revision!==lobbyPending.revision)){lobbyPending=null;lobbyDirty=false}
 lobby=JSON.parse(JSON.stringify(next));linkReady=true;stopHandshake();ghCheckpoint();renderLobby();
}
function renderLobbyControls(){
 if(!lobby)return;
 const i=p2pRole==='host'?0:1,blocked=Boolean(lobbyPending),me=lobby.players[i],confirmation=featureSelectionPending(),compatibility=lobbyCompatibility();
 $('#lobbyReady').disabled=blocked||lobbyDirty||lobbySettingsDirty||confirmation||(!me.ready&&!compatibility.compatible);$('#lobbySave').disabled=blocked||me.ready;
 $('#lobbyName').disabled=blocked||me.ready;$('#lobbyColor').disabled=blocked||me.ready;
 $('#lobbyScope').disabled=i!==0||confirmation||lobbyDraftSettings().campaignRulesVersion===1;$('#lobbyScenario').disabled=i!==0||confirmation;
 $('#lobbySettings').disabled=i!==0||confirmation;
 $('#lobbyDiscardSettings').disabled=i!==0||confirmation||!lobbySettingsDirty;
 $('#lobbyReady').textContent=me.ready?'Not ready':'Confirm ready';
 $('#lobbyStart').disabled=i!==0||blocked||lobbyDirty||lobbySettingsDirty||confirmation||!compatibility.compatible||!lobby.players.every(p=>p.ready);
 $('#lobbyProgress').textContent=confirmation?'Confirm or cancel the proposed feature changes before starting.':!compatibility.compatible?compatibility.reason:lobbySettingsDirty?'Apply or discard the host draft before confirming.':lobbyDirty?'Save your identity changes before confirming.':lobbyPending?'Saving your confirmation through the link…':lobby.players.every(p=>p.ready)?(i===0?'Both players confirmed. You can start the campaign.':'Both players confirmed. Waiting for the host to start.'):'Waiting for both players to confirm this setup.';
}
function renderLobby(){
 if(!lobby||game||view)return;
 if(lobbyFeatureDraft&&(lobbyFeatureDraft.owner!==lobby||lobbyFeatureDraft.revision!==lobby.revision)){
  lobbyFeatureDraft=null;lobbySettingsDirty=false;
 }
 show('#lobbyScreen');const host=p2pRole==='host',i=host?0:1,settings=lobby.settings;
 $('#lobbyBanks').innerHTML=lobby.players.map((p,n)=>'<div class="lobby-bank" style="--identity-color:'+E.bankColor(p.color,n)+'"><span class="small muted">'+(n===0?'HOST · INSTITUTION 1':'GUEST · INSTITUTION 2')+(n===i?' · YOU':' · FRIEND')+'</span><h3><span class="bank-swatch"></span> '+esc(p.name)+'</h3><span class="'+(p.ready?'good':'muted')+'">'+(p.ready?'✓ Confirmed ready':'○ Reviewing setup')+'</span><span class="micro muted"> · '+esc(p.color)+'</span></div>').join('');
 if(!lobbyDirty){$('#lobbyName').value=(lobbyPending?lobbyPending.player:lobby.players[i]).name;$('#lobbyColor').value=(lobbyPending?lobbyPending.player:lobby.players[i]).color}
 if(!lobbySettingsDirty){$('#lobbyScope').value=settings.scope;$('#lobbyScenario').value=settings.scenario}
 $('#lobbyScope').disabled=!host||settings.campaignRulesVersion===1;$('#lobbyScenario').disabled=!host;
 $('#lobbySettings').classList.toggle('hidden',!host);$('#lobbyStart').classList.toggle('hidden',!host);
 $('#lobbyDiscardSettings').classList.toggle('hidden',!host);
 $('#lobbyRetry').classList.toggle('hidden',!gh.active);
 const rules=E.validateCampaignRules(settings,'lobby'),selected=rules.features.filter(f=>f.visible&&f.enabled).map(f=>f.label);
 $('#lobbyRules').textContent=(settings.campaignRulesVersion===1?'Regional Rivalry pilot · 2 regions / 6 markets (overrides size).':'Legacy campaign rules · open-ended.')+' '+(selected.length?selected.join(' · ')+'.':'No optional previews selected.');
 $('#lobbyFeatureSummary').textContent=lobbySettingsDirty?'Unapplied host draft — the shared rules above have not changed.':'Both players use these committed rules. Applied changes reset both confirmations.';
 $('#lobbyFeatureOptions').innerHTML=renderFeatureSelection(host?lobbyDraftSettings():settings,{prefix:'lobbyFeature-',disabled:!host});
 bindFeatureSelection($('#lobbyFeatureOptions'),{read:()=>lobbyDraftSettings(),commit:stageLobbyFeatures,getRevision:()=>lobby&&lobby.revision,
  canEdit:()=>!!lobby&&!game&&!view&&p2pRole==='host',onError:message=>{$('#lobbyError').textContent=message},onPendingChange:renderLobbyControls});
 $('#lobbyNote').textContent=lobby.note||'Each player controls their own identity. The host controls the shared campaign settings.';
 $('#lobbyError').textContent=lobby.error||'';
 renderLobbyControls();paintLink();
}
function startLobbyCampaign(){
 try{
  if(p2pRole!=='host'||!lobby||game||!lobby.players.every(p=>p.ready)||lobbyDirty||lobbySettingsDirty||featureSelectionPending())return;
  const compatibility=lobbyCompatibility();
  if(!compatibility.compatible)throw Error(compatibility.reason||'Waiting for a compatible peer handshake.');
  if(lobbyColorsClash(lobby.players[0].color,lobby.players[1].color))throw Error('Choose distinct bank colors before starting.');
  const [host,guest]=lobby.players,s=lobby.settings;
  E.validateCampaignRules(s,'lobby');
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
$('#lobbyDiscardSettings').addEventListener('click',discardLobbySettings);
$('#lobbyStart').addEventListener('click',startLobbyCampaign);
$('#lobbyRetry').addEventListener('click',ghRetry);
$('#lobbyLeave').addEventListener('click',leaveGame);
