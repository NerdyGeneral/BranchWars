function repairGame(g){return E.repairSavedCampaign(g)}
function repairOpenEnded(g){return E.repairSavedRivalry(g)}
function migrateGame(g){return E.migrateCampaign(g)}
function saveLocal(){try{if(game&&(['ai','hotseat'].includes(game.mode)||(game.mode==='lan'&&p2pRole==='host')))localStorage.setItem('branchWarsV7Save',JSON.stringify(game))}catch(e){if(!storageWarned){storageWarned=true;toast('This browser blocks local storage, so the campaign cannot autosave. Use EXPORT to keep a copy.')}}updateContinue()}
function savedGame(){try{return JSON.parse(localStorage.getItem('branchWarsV7Save')||localStorage.getItem('branchWarsV6Save')||'null')}catch{return null}}
function updateContinue(){let ok=false;try{const g=savedGame();ok=g&&['6.0','7.0','7.1','8.0','8.1','8.2','8.3','8.4','8.5','8.6','8.7','8.8','8.9','8.10','8.11'].includes(g.version)&&!g.gameOver}catch{}$('#continueBtn').classList.toggle('hidden',!ok)}
