function turnRejection(message,error){
 const reply={type:'error',code:'plan_rejected',message:error.message,instruction:message.type,hash:message.hash,cycle:message.cycle,resolutionId:message.resolutionId};
 if(message.turnContext)reply.turnContext=message.turnContext;
 try{send(reply)}catch{}
}
async function acceptGhReveal(m){
 const session=gh,activeGame=game,generation=featureConnectionGeneration,commit=ghIncomingCommit;
 try{
  validateTurnMessage(m);
  if(m.cycle<game.cycle||game.players[1].submitted){syncPeers();return}
  if(!commit)throw Error('The rival revealed a plan without first locking a commitment.');
  if(m.cycle!==game.cycle||m.cycle!==commit.cycle)throw Error('The rival revealed a plan for the wrong cycle.');
  if(typeof m.nonce!=='string'||!/^[0-9a-f]{48}$/.test(m.nonce))throw Error('The rival plan seal is malformed.');
  const hash=await ghPlanHash(m.plan,m.nonce);
  if(gh!==session||!session.active||game!==activeGame||generation!==featureConnectionGeneration||ghIncomingCommit!==commit)return;
  validateTurnMessage(m);
  requireDepartmentPeer(game);
  if(hash!==commit.hash||hash!==m.hash)throw Error('The rival plan changed after it was marked ready.');
  E.submit(game,1,m.plan);ghIncomingCommit=null;syncPeers();
 }catch(e){
  if(gh!==session||!session.active||game!==activeGame||generation!==featureConnectionGeneration||ghIncomingCommit!==commit)return;
  // An obsolete envelope must not clear a different, current commitment.
  try{validateTurnMessage(m)}catch{turnRejection(m,e);syncPeers();return}
  ghIncomingCommit=null;turnRejection(m,e);toast(`The rival plan was rejected: ${e.message}`);syncPeers();
 }
}
function handleMessage(m){
 if(!m||typeof m!=='object')return;
 if(p2pRole==='host'){
  if(m.type==='hello'){
   const status=capturePeerFeatures(m);if(status.ignored)return;
   if(!status.compatible){
    if(status.pending){challengePeerFeatures();setConnection(status.reason,'warn')}
    else{send({type:'error',code:'feature_rules_unsupported',message:status.reason});setConnection(status.status||status.reason,'bad')}
    if(lobby){renderLobby();if(p2pRole==='host')publishLobby()}return
   }
   if([6,7,8].includes(currentFeatureSource().financialGroupVersion))setConnection('CAMPAIGN RULES CONFIRMED // DEPARTMENT STAFFING READY','good');
   if(!game){try{openLobby(m)}catch(e){setConnection('LOBBY REFUSED // '+e.message,'bad');send({type:'error',code:'lobby_required',message:e.message})}return}
   linkReady=true;stopHandshake();syncPeers();return
  }
  if(m.type==='lobby_update'&&!game){applyLobbyUpdate(1,m);return}
  if(!game){try{send({type:'hello_request'})}catch{}return}
  if(E.campaignNeedsFreshHandshake(game)&&!peerFeatureStatus(game).compatible){const status=peerFeatureStatus(game);if(status.pending)challengePeerFeatures();else send({type:'error',code:'feature_rules_unsupported',message:status.reason});return}
  if(['plan','plan_commit','plan_reveal','recall','rematch'].includes(m.type)&&(!featurePeerCapabilities||featurePeerGeneration!==featureConnectionGeneration)){challengePeerFeatures();return}
  if(m.type==='plan_commit'&&gh.active){try{validateTurnMessage(m);if(m.cycle<game.cycle||game.players[1].submitted){syncPeers();return}if(!/^[0-9a-f]{64}$/.test(String(m.hash||''))||m.cycle!==game.cycle)throw Error('The rival sent an invalid plan commitment.');if(ghIncomingCommit&&ghIncomingCommit.hash!==m.hash)throw Error('The rival tried to replace a locked plan commitment.');if(!ghIncomingCommit)ghIncomingCommit={hash:m.hash,cycle:m.cycle};syncPeers()}catch(e){turnRejection(m,e);toast(`The rival commitment was rejected: ${e.message}`);syncPeers()}return}
  if(m.type==='plan_reveal'&&gh.active)return acceptGhReveal(m);
  if(m.type==='plan'){if(gh.active){try{send({type:'error',message:'This Repository Link client is outdated and did not seal its plan. Both players must use the current game file.'})}catch{}return}try{validateTurnMessage(m);if(game.players[1].submitted){syncPeers();return}E.submit(game,1,m.plan);syncPeers()}catch(e){turnRejection(m,e);toast(`The rival plan was rejected: ${e.message}`);syncPeers()}return}
  if(m.type==='recall'){try{validateTurnMessage(m);if(m.cycle!==undefined&&m.cycle!==game.cycle){syncPeers();return}if(gh.active&&ghIncomingCommit&&!game.players[0].submitted){ghIncomingCommit=null;outgoingTurnContext=null;}if(game.players[1].submitted&&!game.players[0].submitted){game.players[1].submitted=null;outgoingTurnContext=null;}syncPeers()}catch(e){turnRejection(m,e);syncPeers()}return}
  if(m.type==='rematch'){try{validateTurnMessage(m);E.rematch(game,1);syncPeers()}catch(e){turnRejection(m,e);syncPeers()}return}
  return
 }
 if(m.type==='hello_request'){try{send(makeFeatureHello(m))}catch(e){setConnection(`DIRECT LINK SEND FAILED // ${e.message}`,'bad')}return}
 if(m.type==='lobby'){receiveLobby(m);return}
 if(m.type==='state'){if(!view&&p2pConfig&&p2pConfig.lobbyRequired&&!lobby){$('#connectHint').textContent='The host skipped the lobby. Both players need this updated game file.';setConnection('LOBBY REQUIRED // Update the host game before starting.','bad');toast('The host skipped the lobby. Both players need this updated build.');return}const incoming=validateIncomingFeatureRules(m.state,'view'),expected=view?E.campaignRules(view,{context:'view'}):lobby?E.campaignRules(lobby.settings,{context:'lobby'}):null;if(expected&&incoming.signature!==expected.signature)throw Error('The received campaign rules differ from the confirmed setup. Reconnect with matching game files.');if(!receiveDepartmentPeer(m.state)||!receiveTurnContext(m))return;linkReady=true;stopHandshake();clearTimeout(planAckTimer);planAckTimer=null;view=m.state;if(ghPendingPlan&&(view.gameOver||view.cycle!==ghPendingPlan.cycle))ghPendingPlan=null;if(ghPendingPlan&&ghPendingPlan.recallRequested&&!view.me.submitted&&!view.rival.submitted)ghPendingPlan=null;if(ghPendingPlan&&ghPendingPlan.recallRequested&&view.rival.submitted)ghPendingPlan.recallRequested=false;if(gh.active&&ghPendingPlan){ghRefreshPendingTurn();if(view.rival.submitted)ghRevealPlan();}if(ghPendingPlan)view.me.submitted=true;if(!lan.active&&!gh.active)mode='p2p';setConnection(gh.active?`REPOSITORY ROOM ${gh.room} // LINKED`:lan.active?`ROOM ${lan.room} // CONNECTED`:'DIRECT LINK CONNECTED','good');if($('#gameScreen').classList.contains('hidden')&&$('#gameOver').classList.contains('hidden'))enterGame(true);else render();return}
 if(m.type==='error'){if(ghPendingPlan&&m.hash!==undefined&&m.hash!==ghPendingPlan.hash)return;if(view&&incomingTurnContext&&!m.turnContext){toast(m.message);return}if(view&&incomingTurnContext&&((m.turnContext&&(m.turnContext.token!==incomingTurnContext.token||m.turnContext.session!==incomingTurnContext.session))||(m.cycle!==undefined&&m.cycle!==view.cycle)||(m.resolutionId!==undefined&&m.resolutionId!==view.resolutionId)))return;if(!game&&!view){$('#connectHint').textContent=m.message;setConnection(m.message,'bad');if($('#lobbyError'))$('#lobbyError').textContent=m.message;toast(m.message);return}if(gh.active&&m.code==='plan_rejected'&&(!incomingTurnContext||(['plan_commit','plan_reveal'].includes(m.instruction)&&m.hash===ghPendingPlan?.hash)))ghPendingPlan=null;clearTimeout(planAckTimer);planAckTimer=null;if(view&&view.me&&view.me.submitted){view.me.submitted=false;render()}if($('#submitMsg'))$('#submitMsg').textContent=`THE HOST REJECTED THAT PLAN // ${m.message}`;toast(m.message);return}
}

function syncPeers(){if(game&&game.mode==='lan')saveLocal();const mine=E.publicState(game,0),theirs=E.publicState(game,1);if(gh.active&&ghIncomingCommit){mine.rival.submitted=true;theirs.me.submitted=true}let sendErr=null;try{const compatibility=peerFeatureStatus(game);if(!E.campaignNeedsFreshHandshake(game)||compatibility.compatible)send({type:'state',state:theirs,turnContext:{...getTurnContext(),revision:++turnStateRevision}});else if(compatibility.pending)challengePeerFeatures();else setConnection(compatibility.reason,'bad')}catch(e){sendErr=e}view=mine;try{render()}catch(e){console.error('Branch Wars failed to redraw the host view',e);toast(`Display error: ${e.message}`)}if(sendErr){setConnection(`LINK SEND FAILED // ${sendErr.message}`,'bad');toast(`The rival did not receive the update: ${sendErr.message}`)}}
