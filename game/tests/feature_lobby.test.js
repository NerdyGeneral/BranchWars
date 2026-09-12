'use strict';
const assert=require('node:assert/strict');
const {harness}=require('./github_resilience.test.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function paired(transport){
 const host=harness('host'),guest=harness('guest'),queue=[];
 for(const [i,p] of [host,guest].entries()){
  p.c.enqueue=m=>queue.push([i,copy(m)]);
  p.run("game=null;view=null;lobby=null;ghFlush=()=>{};send=m=>enqueue(m);p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'national',scenario:'balanced'};resetFeaturePeer()");
  if(transport!=='gh')p.run('gh.active=false;lan={...emptyLan(),active:'+(transport==='lan')+'}');
 }
 return {host,guest,queue,async drain(){for(let n=0;queue.length;n++){
  assert(n<150,'Handshake loop');const [i,m]=queue.shift(),p=i?host:guest;p.c.frame=m;await p.run('handleMessage(frame)');
 }}};
}
function select(p,field,value){
 const control=p.c.document.querySelector('#lobbyFeature-'+field);control.checked=value;
 p.elements.get('#lobbyFeatureOptions').listeners.change({target:control});
}
function pending(p){return p.run('featureSelectionPending()')}
function confirm(p){return p.run('confirmFeatureSelection()')}
async function ready(pair){
 pair.host.run('editLobbyIdentity(true)');await pair.drain();pair.guest.run('editLobbyIdentity(true)');await pair.drain();
 assert(pair.host.state().lobby.players.every(p=>p.ready));
}
async function main(){
 for(const transport of ['gh','lan','p2p']){
  const pair=paired(transport),{host,guest}=pair;
  guest.run("handleMessage({type:'hello_request'})");await pair.drain();await ready(pair);
  const original=copy(host.state().lobby);
  assert(guest.elements.get('#lobbyFeature-onboardingVersion').disabled,'Guest selection is read-only');
  select(guest,'onboardingVersion',true);guest.run('applyLobbySettings()');
  assert.equal(pending(guest),false);assert.deepEqual(copy(guest.state().lobby),original,'Guest altered rules');
  select(host,'onboardingVersion',true);
  assert(pending(host));assert(host.elements.get('#lobbyStart').disabled,'Open cascade blocks starting');
  assert.equal(host.elements.get('#lobbyProgress').textContent,'Confirm or cancel the proposed feature changes before starting.','Status must explain the disabled start during confirmation');
  assert(host.elements.get('#featureSelectionAffected').innerHTML.includes('Regional Rivalry'));
  assert.equal(host.elements.get('#lobbyFeature-onboardingVersion').checked,false,'Unconfirmed checkbox is restored');
  host.run('startLobbyCampaign()');assert.equal(host.state().game,null);
  host.run('cancelFeatureSelectionConfirmation()');
  assert.deepEqual(copy(host.state().lobby),original,'Cancel mutated committed settings/readiness');
  assert.equal(host.elements.get('#lobbyProgress').textContent,'Both players confirmed. You can start the campaign.','Cancelling restores truthful ready status');
  assert.equal(host.run('lobbySettingsDirty'),false);
  select(host,'onboardingVersion',true);assert(confirm(host));
  assert(host.run('lobbySettingsDirty'));assert.deepEqual(copy(host.state().lobby),original,'Draft was prematurely published');
  assert(host.elements.get('#lobbyStart').disabled);
  assert.equal(guest.elements.get('#lobbyFeature-onboardingVersion').checked,false);
  host.run('applyLobbySettings()');await pair.drain();
  let committed=copy(host.state().lobby);
  assert.equal(committed.revision,original.revision+1);assert(committed.players.every(p=>!p.ready));
  assert.equal(committed.settings.onboardingVersion,1);assert.equal(committed.settings.productProgramsVersion,2);
  assert.deepEqual(copy(guest.state().lobby),committed);
  assert(host.elements.get('#lobbyRules').textContent.includes('6 markets'));
  // A ready message prepared against the old settings cannot approve new rules.
  host.c.stale={type:'lobby_update',id:'old-ready',revision:original.revision,player:original.players[1],ready:true};
  host.run('handleMessage(stale)');await pair.drain();assert(!host.state().lobby.players[1].ready);
  committed=copy(host.state().lobby);
  select(host,'workforceVersion',false);assert(pending(host));assert(confirm(host));
  const draft=copy(host.run('lobbyDraftSettings()'));
  for(const field of ['customerOwnershipVersion','creditPerformanceVersion','segmentDepositsVersion','productProgramsVersion','advertisingVersion','regionalGrowthVersion','relationshipOffersVersion','onboardingVersion'])assert.equal(draft[field],0,field+' is removed transitively');
  assert.deepEqual(copy(host.state().lobby),committed);host.run('discardLobbySettings()');
  assert.equal(host.run('lobbyDraftSettings().onboardingVersion'),1);assert.equal(host.run('lobbySettingsDirty'),false);
  // Incoming malformed snapshots cannot replace even the first valid lobby.
  for(const badSettings of [{...committed.settings,workforceVersion:0},{...committed.settings,onboardingVersion:8},{...committed.settings,featureRulesVersion:1}]){
   const before=JSON.stringify(guest.state().lobby);guest.c.bad={type:'lobby',lobby:{...committed,revision:committed.revision+1,settings:badSettings}};
   assert.throws(()=>guest.run('handleMessage(bad)'));assert.equal(JSON.stringify(guest.state().lobby),before);
  }
  // A stale cascade is never applied after another seat revises the lobby.
  select(host,'serviceExpansionVersion',false);assert(pending(host));
  host.c.identity={type:'lobby_update',id:'rename',revision:host.state().lobby.revision,player:{...committed.players[1],name:'Harbor renamed'},ready:false};
  host.run('handleMessage(identity)');await pair.drain();
  const revised=copy(host.state().lobby);confirm(host);
  assert.deepEqual(copy(host.state().lobby),revised);assert.equal(host.run('lobbySettingsDirty'),false,'Stale cascade changed the draft');
  if(pending(host))host.run('cancelFeatureSelectionConfirmation()');
  select(host,'serviceExpansionVersion',false);assert(confirm(host));
  assert.equal(host.run('lobbyDraftSettings().onboardingVersion'),0,'Freshly reviewed cascade uses the new revision');
  host.run('discardLobbySettings()');
  // The modular pilot is retired, so entering and leaving modular mode, and the
  // independent Advertising/Growth selection inside it, no longer exist. The
  // cascade and compatibility checks either side of this remain covered.
  host.run('discardLobbySettings()');
  // Compatibility is based on committed settings, never stale room configuration.
  host.run('p2pConfig.onboardingVersion=1');assert(host.run('lobbyCompatibility().compatible'));
  await ready(pair);host.run('startLobbyCampaign()');await pair.drain();
  // The modular stamp is gone with the pilot; the campaign version itself still
  // has to agree between host and guest.
  assert.equal(host.state().game.version,guest.state().view.version);
  const started=JSON.stringify(host.state().game);
  // Any field serves here: the subject is that a post-start selection cannot
  // mutate a running campaign.
  select(host,'advertisingVersion',false);host.run('applyLobbySettings()');
  assert.equal(JSON.stringify(host.state().game),started,'UI mutated rules after campaign start');
 }
 // A known older peer stays visibly blocked when the host chooses unsupported
 // systems; it can still play after an explicit host reversal, not a downgrade.
 const old=paired('gh');old.guest.run("const helloBefore=makeFeatureHello;makeFeatureHello=request=>{const m=helloBefore(request);delete m.onboardingSupported;return m}");
 old.guest.run("handleMessage({type:'hello_request'})");await old.drain();
 select(old.host,'onboardingVersion',true);assert(confirm(old.host));old.host.run('applyLobbySettings()');await old.drain();
 assert.equal(old.host.state().lobby.settings.onboardingVersion,1);
 assert(!old.host.run('lobbyCompatibility().compatible'));assert(old.host.elements.get('#lobbyReady').disabled);
 old.host.run('editLobbyIdentity(true);startLobbyCampaign()');assert.equal(old.host.state().game,null);
 select(old.host,'onboardingVersion',false);assert.equal(pending(old.host),false);old.host.run('applyLobbySettings()');await old.drain();
 assert(old.host.run('lobbyCompatibility().compatible'));
 console.log('Feature lobby PASS: all three transports, confirmation/cancel, private host drafts, atomic apply/revision/readiness reset, transitive removal, stale confirmation/ready, guest authority, malformed rules, mode transitions and visible peer refusal.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
