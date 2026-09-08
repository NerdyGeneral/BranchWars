function startLocal(which) {
  if (featureSelectionPending()) { setStartMessage('Confirm or cancel the optional-system changes before starting.'); return; }
  try {
    const options = { ...readSetupFeatureOptions(), color1: $('#bankColor1').value, color2: $('#bankColor2').value };
    const created = which === 'ai' ? E.createGame({ ...options, mode: 'ai', name1: validName('#aiName'), name2: 'Synergy Holdings AI',
      scope: $('#aiScope').value, scenario: $('#aiScenario').value, difficulty: $('#aiDifficulty').value }) :
      E.createGame({ ...options, mode: 'hotseat', name1: validName('#hotName1'), name2: validName('#hotName2'),
        scope: $('#hotScope').value, scenario: $('#hotScenario').value, difficulty: 'vp' });
    resetLink(); view = null; p2pRole = ''; game = created;
    mode = which; seat = 0; draft = null; draftOwner = ''; lastCycle = 0; lastResolutionId = 0; saveLocal(); enterGame(true);
  } catch (error) { setStartMessage(error.message); }
}
function resumeLocalCampaign(restored) {
  if (['lan', 'p2p'].includes(restored.mode)) restored.mode = 'hotseat';
  resetLink(); view = null; p2pRole = '';
  game = restored; mode = game.mode; seat = 0; draft = null; draftOwner = ''; lastCycle = 0; lastResolutionId = game.resolutionId || 0;
  saveLocal();
  if (game.mode === 'hotseat' && game.players[0].submitted && !game.players[1].submitted) {
    show('#gameScreen');
    showPrivacy(1, `PASS COMPUTER TO ${game.players[1].name}`, `${game.players[0].name}'s saved plan is sealed.`);
  } else enterGame(true);
}
function continueSave(){try{resumeLocalCampaign(migrateGame(savedGame()))}catch(e){setStartMessage(e.message)}}
let localImportRequest = 0;
function importSave(file) {
  const request = ++localImportRequest, generation = connectionAttempt;
  const reader = new FileReader();
  const current = () => request === localImportRequest && generation === connectionAttempt;
  reader.onload = () => {
    if (!current()) return;
    try { resumeLocalCampaign(migrateGame(JSON.parse(reader.result))); toast('Campaign imported.'); }
    catch (error) { setStartMessage(error.message); }
  };
  reader.onerror = () => { if (current()) setStartMessage('The save file could not be read. Your current campaign is unchanged.'); };
  reader.readAsText(file);
}
function exportSave(){if(p2pRole==='guest'){toast('Only the multiplayer host can export the authoritative save.');return}if(!game)return;const blob=new Blob([JSON.stringify(game,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Branch_Wars_Cycle_${game.cycle}_Save.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function enterGame(suppressReplay=false){show('#gameScreen');const v=currentView();if(suppressReplay&&v)lastResolutionId=v.resolutionId||0;render()}
function leaveGame(){resetLink();clearTimeout(gh.retryTimer);gh=emptyGh();lan.active=false;clearTimeout(lan.retryTimer);lan=emptyLan();game=null;view=null;p2pRole='';draft=null;draftOwner='';lastCycle=0;lastResolutionId=0;show('#startScreen');updateContinue()}
