function validName(id){const n=$(id).value.trim();if(!n)throw Error('Enter an institution name.');return n}
function lobbyIdentity(player,index){
 const name=String(player&&player.name||'').trim().slice(0,36);
 if(!name)throw Error('Enter an institution name.');
 if(!/^#[0-9a-f]{6}$/i.test(String(player.color)))throw Error('Choose a valid bank color.');
 return {name,color:E.bankColor(player.color,index),...(player.identity!==undefined?{identity:E.bankIdentity(E.validateBankIdentity(player.identity),name,index)}:{}),ready:false};
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
  const rules=lobby.resume?.rules||lobby.settings;
  validateIncomingFeatureRules(rules,'lobby');
  return p2pRole==='host'?peerFeatureStatus(rules):departmentPeerStatus(rules);
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
 for(const feature of E.CAMPAIGN_FEATURES)if((feature.visible||(!feature.implicit&&feature.peers.length))&&!(feature.field in settings)&&c[feature.field])settings[feature.field]=c[feature.field];
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
  const host=lobbyIdentity({name:p2pConfig.name,color:E.bankColor(p2pConfig.color),...(p2pConfig.identity?{identity:p2pConfig.identity}:{})},0);
  const guest=lobbyIdentity({name:peer.name,color:E.bankColor(peer.color,1),...(peer.identity!==undefined?{identity:peer.identity}:{})},1);
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
 const before=lobby.players[index],changed=player.name!==before.name||player.color!==before.color||JSON.stringify(E.bankIdentity(player.identity,player.name,index))!==JSON.stringify(E.bankIdentity(before.identity,before.name,index));
 if(changed){lobby.players[index]=player;lobby.revision++;lobby.players.forEach(p=>p.ready=false)}
 else lobby.players[index].ready=message.ready===true;
 if(index===1)lobby.guestAck=String(message.id||'');
 lobby.error='';if(index===0)lobbyDirty=false;
 lobby.note=changed?'Identity updated. Both players must confirm this setup.':lobby.note;
 publishLobby();
}
function editLobbyIdentity(ready=false){
 try{
  if(!lobby||game||view||lobbyPending||bankLogoDrafts.lobby.busy)return;
  if(ready&&!lobbyCompatibility().compatible)throw Error(lobbyCompatibility().reason);
  const i=p2pRole==='host'?0:1;
  const player=lobbyIdentity({name:$('#lobbyName').value,color:$('#lobbyColor').value,identity:readBankIdentityFields('#lobbyCrest','#lobbyMonogram',$('#lobbyName').value,i)},i);
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
  for(const feature of E.CAMPAIGN_FEATURES)if(feature.visible||(!feature.implicit&&feature.peers.length))delete p2pConfig[feature.field];
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
 if(next.resume!==undefined&&!validLobbyResume(next.resume))throw Error('Invalid lobby snapshot.');
 if(!receiveDepartmentPeer(next.settings))return;
 if(lobby&&next.revision<lobby.revision)return;
 if(lobbyPending&&(next.guestAck===lobbyPending.id||next.revision!==lobbyPending.revision)){lobbyPending=null;lobbyDirty=false}
 lobby=JSON.parse(JSON.stringify(next));linkReady=true;stopHandshake();ghCheckpoint();renderLobby();
 if([6,7,8,9,10].includes(next.settings.financialGroupVersion))setConnection('CAMPAIGN RULES CONFIRMED // DEPARTMENT STAFFING READY','good');
}
function renderLobbyControls(){
 if(!lobby)return;
 const i=p2pRole==='host'?0:1,blocked=Boolean(lobbyPending)||bankLogoDrafts.lobby.busy,me=lobby.players[i],confirmation=featureSelectionPending(),compatibility=lobbyCompatibility();
 $('#lobbyReady').disabled=blocked||lobbyDirty||lobbySettingsDirty||confirmation||(!me.ready&&!compatibility.compatible);$('#lobbySave').disabled=blocked||me.ready;
 $('#lobbyName').disabled=blocked||me.ready;$('#lobbyColor').disabled=blocked||me.ready;$('#lobbyCrest').disabled=blocked||me.ready;$('#lobbyMonogram').disabled=blocked||me.ready;
 renderBankLogoControls('lobby');
 $('#lobbyScope').disabled=i!==0||confirmation||lobbyDraftSettings().campaignRulesVersion===1;$('#lobbyScenario').disabled=i!==0||confirmation;
 $('#lobbySettings').disabled=i!==0||confirmation;
 $('#lobbyDiscardSettings').disabled=i!==0||confirmation||!lobbySettingsDirty;
 $('#lobbyReady').textContent=me.ready?'Not ready':'Confirm ready';
 $('#lobbyResumeLabel').classList.toggle('hidden',i!==0);$('#lobbyResumeLabel').textContent=lobby.resume?'Choose a different save':'Resume from save';
 $('#lobbyResumeClear').classList.toggle('hidden',i!==0||!lobby.resume);$('#lobbyResumeClear').disabled=blocked;
 $('#lobbyStart').disabled=i!==0||blocked||lobbyDirty||lobbySettingsDirty||confirmation||!compatibility.compatible||!lobby.players.every(p=>p.ready);
 $('#lobbyProgress').textContent=confirmation?'Confirm or cancel the proposed feature changes before starting.':!compatibility.compatible?compatibility.reason:lobbySettingsDirty?'Apply or discard the host draft before confirming.':lobbyDirty?'Save your identity changes before confirming.':lobbyPending?'Saving your confirmation through the link…':lobby.players.every(p=>p.ready)?(i===0?'Both players confirmed. You can start the campaign.':'Both players confirmed. Waiting for the host to start.'):'Waiting for both players to confirm this setup.';
}
function renderLobby(){
 if(!lobby||game||view)return;
 if(lobbyFeatureDraft&&(lobbyFeatureDraft.owner!==lobby||lobbyFeatureDraft.revision!==lobby.revision)){
  lobbyFeatureDraft=null;lobbySettingsDirty=false;
 }
 show('#lobbyScreen');const host=p2pRole==='host',i=host?0:1,settings=lobby.settings;
 $('#lobbyBanks').innerHTML=lobby.players.map((p,n)=>'<div class="lobby-bank" style="--identity-color:'+E.bankColor(p.color,n)+'"><span class="small muted">'+(n===0?'HOST · INSTITUTION 1':'GUEST · INSTITUTION 2')+(n===i?' · YOU':' · FRIEND')+'</span><h3>'+bankIdentityMarkup(p,{seat:n,size:'large',showName:true})+'</h3>'+(lobby.resume?'<span class="small">Plays saved bank '+(lobby.resume.identities?bankIdentityMarkup(lobby.resume.identities[n],{seat:n,showName:true}):'<strong>'+esc(lobby.resume.banks[n])+'</strong>')+'</span> ':'')+'<span class="'+(p.ready?'good':'muted')+'">'+(p.ready?'✓ Confirmed ready':'○ Reviewing setup')+'</span><span class="micro muted"> · '+esc(p.color)+'</span></div>').join('');
 if(!lobbyDirty){$('#lobbyName').value=(lobbyPending?lobbyPending.player:lobby.players[i]).name;$('#lobbyColor').value=(lobbyPending?lobbyPending.player:lobby.players[i]).color;const mark=E.bankIdentity((lobbyPending?lobbyPending.player:lobby.players[i]).identity,$('#lobbyName').value,i);$('#lobbyCrest').value=mark.crest;$('#lobbyMonogram').value=mark.monogram;bankLogoDrafts.lobby.jpeg=mark.jpeg||'';}renderLobbyIdentityPreview();
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
 $('#lobbyNote').textContent=lobby.resume?lobbyResumeNote(lobby):lobby.note||'Each player controls their own identity. The host controls the shared campaign settings.';
 $('#lobbyError').textContent=lobby.error||'';
 renderLobbyControls();paintLink();
}
// Resuming a multiplayer campaign. Exporting one has always worked, but every
// route back ran through resumeLocalCampaign, which coerces lan/p2p to hotseat --
// so a Repository Link or LAN game could only ever come back single-player, and
// the lobby had no load control at all. The host now stages a save here and the
// campaign starts from it instead of from createGame; the guest receives it
// through the same syncPeers path a fresh campaign uses.
// A staged save changes what both players are agreeing to, so it is published in
// the lobby: the guest sees which saved bank each seat plays, and both players
// must confirm again. Only this summary is shared before the start; the campaign
// itself still travels through syncPeers. The host always holds seat 0, so the
// saved banks keep their names and seats rather than being relabelled after
// whoever hosts today; the note warns when that would hand a player the other bank.
let lobbyResumeCampaign=null;
function validLobbyResume(r){
 if(r?.rules!==undefined){try{E.validateCampaignRules(r.rules,'lobby');}catch{return false;}}
 return !!r&&typeof r==='object'&&Number.isSafeInteger(r.cycle)&&r.cycle>=1&&typeof r.version==='string'&&r.version.length<=16&&
  Array.isArray(r.banks)&&r.banks.length===2&&r.banks.every(name=>typeof name==='string'&&name.length<=80)&&
  (r.identities===undefined||Array.isArray(r.identities)&&r.identities.length===2&&r.identities.every((bank,i)=>bank&&bank.name===r.banks[i]&&/^#[0-9a-f]{6}$/.test(bank.color)&&E.validBankIdentity(bank.identity))); 
}
function lobbyResumeSummary(g){return {cycle:g.cycle,version:String(g.version||''),rules:E.campaignRules(g,{context:'game'}).options,banks:g.players.map(p=>String(p.name||'')),...(g.players.some(p=>p.identity!==undefined)?{identities:g.players.map((p,i)=>({name:String(p.name||''),color:E.bankColor(p.color,i),identity:E.bankIdentity(p.identity,p.name,i)}))}:{})}}
function lobbyResumeNote(l){
 const r=l.resume,[host,guest]=l.players;
 let note='Resuming a saved '+r.version+' campaign at month '+r.cycle+'. '+host.name+' (host) plays '+r.banks[0]+'; '+guest.name+' plays '+r.banks[1]+'. The save keeps its own rules; the settings below apply only to a new campaign.';
 if(host.name===r.banks[1]||guest.name===r.banks[0])note+=' The banks look swapped: the host always plays the first saved bank. To keep your own bank, let its original host host this lobby.';
 return note;
}
function publishLobbyResume(summary){
 if(summary)lobby.resume=summary;else delete lobby.resume;
 lobby.revision++;lobby.players.forEach(p=>p.ready=false);lobby.error='';
 publishLobby();
 if(peerFeatureStatus(lobby.resume?.rules||lobby.settings).pending)challengePeerFeatures();
}
function clearLobbyResume(message){
 lobbyResumeCampaign=null;
 const input=$('#lobbyResumeFile');if(input)input.value='';
 if(lobby&&lobby.resume&&p2pRole==='host'&&!game)publishLobbyResume(null);
 if(message)$('#lobbyError').textContent=message;
 renderLobbyControls();
}
function stageLobbyResume(file){
 if(!file)return;
 if(p2pRole!=='host'){clearLobbyResume('Only the host can resume a campaign from a save.');return}
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const restored=migrateGame(JSON.parse(reader.result));
   if(!restored||!Array.isArray(restored.players)||restored.players.length!==2)throw Error('That file is not a two-bank campaign save.');
   if(restored.gameOver)throw Error('That campaign is already complete. Start a new one.');
   // The save carries its own campaign rules; the peer must support them.
   E.validateCampaignRules(restored,'game');
   lobbyResumeCampaign=restored;
   $('#lobbyError').textContent='';
   publishLobbyResume(lobbyResumeSummary(restored));
  }catch(e){clearLobbyResume('That save could not be loaded: '+e.message)}
 };
 reader.onerror=()=>clearLobbyResume('That save file could not be read.');
 reader.readAsText(file);
}
function startLobbyCampaign(){
 try{
  if(p2pRole!=='host'||!lobby||game||bankLogoDrafts.lobby.busy||!lobby.players.every(p=>p.ready)||lobbyDirty||lobbySettingsDirty||featureSelectionPending())return;
  const compatibility=lobbyCompatibility();
  if(!compatibility.compatible)throw Error(compatibility.reason||'Waiting for a compatible peer handshake.');
  if(lobbyColorsClash(lobby.players[0].color,lobby.players[1].color))throw Error('Choose distinct bank colors before starting.');
  const [host,guest]=lobby.players,s=lobby.settings;
  E.validateCampaignRules(s,'lobby');
  // Both players confirmed the lobby as published. If the host no longer holds the
  // save it announced (a reload, say), refuse rather than start something else.
  if(!!lobby.resume!==!!lobbyResumeCampaign){clearLobbyResume('The announced save is no longer loaded here. Choose it again with Resume from save.');return}
  const transport=(lan.active||gh.active)?'lan':'p2p';
  let created;
  if(lobbyResumeCampaign){
   // Keep the campaign exactly as saved, bank names and colors included; only its
   // transport follows the current lobby.
   created=migrateGame(JSON.parse(JSON.stringify(lobbyResumeCampaign)));
   created.mode=transport;
  }else{
  created=E.createGame({...s,startingWorkforce:'covered',campaignRulesVersion:s.campaignRulesVersion||undefined,mode:transport,name1:host.name,name2:guest.name,color1:host.color,color2:guest.color,...(host.identity?{identity1:host.identity}:{}),...(guest.identity?{identity2:guest.identity}:{}),difficulty:'vp',doctrine1:p2pConfig.doctrine});
  }
  p2pConfig={...p2pConfig,...s,name:host.name,color:host.color,...(host.identity?{identity:host.identity}:{})};
  game=created;seat=0;draft=null;lastResolutionId=0;linkReady=true;syncPeers();
 }catch(e){$('#lobbyError').textContent=e.message}
}
function markLobbyDirty(){lobbyDirty=true;renderLobbyIdentityPreview();renderLobbyControls()}
$('#lobbyName').addEventListener('input',markLobbyDirty);
$('#lobbyColor').addEventListener('input',markLobbyDirty);
$('#lobbyCrest').addEventListener('change',markLobbyDirty);
$('#lobbyMonogram').addEventListener('input',markLobbyDirty);
$('#lobbyScope').addEventListener('change',()=>{lobbySettingsDirty=true;renderLobbyControls()});
$('#lobbyScenario').addEventListener('change',()=>{lobbySettingsDirty=true;renderLobbyControls()});
$('#lobbySave').addEventListener('click',()=>editLobbyIdentity(false));
$('#lobbyResumeFile')?.addEventListener('change',e=>{stageLobbyResume(e.target.files&&e.target.files[0])});
$('#lobbyResumeClear')?.addEventListener('click',()=>clearLobbyResume(''));
$('#lobbyReady').addEventListener('click',()=>{if(lobby)editLobbyIdentity(!lobby.players[p2pRole==='host'?0:1].ready)});
$('#lobbySettings').addEventListener('click',applyLobbySettings);
$('#lobbyDiscardSettings').addEventListener('click',discardLobbySettings);
$('#lobbyStart').addEventListener('click',startLobbyCampaign);
$('#lobbyRetry').addEventListener('click',ghRetry);
$('#lobbyLeave').addEventListener('click',leaveGame);
