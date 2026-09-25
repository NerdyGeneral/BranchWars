function repairGame(g){return E.repairSavedCampaign(g)}
function repairOpenEnded(g){return E.repairSavedRivalry(g)}
function migrateGame(g){return E.migrateCampaign(g)}
function saveLocal(){try{if(game&&(['ai','hotseat'].includes(game.mode)||(game.mode==='lan'&&p2pRole==='host')))localStorage.setItem('branchWarsV7Save',JSON.stringify(packStorageValue(game)))}catch(e){if(!storageWarned){storageWarned=true;toast('The campaign could not autosave: browser storage is full, blocked, or the save is too large. Use EXPORT to keep a current copy.')}}updateContinue()}
function savedGame(){try{return unpackStorageValue(JSON.parse(localStorage.getItem('branchWarsV7Save')||localStorage.getItem('branchWarsV6Save')||'null'))}catch{return null}}
function updateContinue(){let ok=false;try{const g=savedGame();ok=g&&E.campaignVersionSupported(g.version)&&!g.gameOver}catch{}$('#continueBtn').classList.toggle('hidden',!ok)}
