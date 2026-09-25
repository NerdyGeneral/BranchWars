// Prospective ending rules, not a migration or an economic subsidy. Keep all
// market competition and priced company control; remove automatic bank awards.
function initializeBankRivalry(g,o){
 if(o.bankRivalryVersion!==1)return;
 g.bankRivalryVersion=1;for(const p of g.players)p.bankRivalryVersion=1;
}
function validateBankRivalry(source,context){
 const enabled=source.bankRivalryVersion===1;
 if(source.version==='9.33'&&!enabled)throw Error('Missing bank rivalry rules.');
 if(source.bankRivalryVersion!==undefined&&!enabled)throw Error('Unsupported bank rivalry rules.');
 if(enabled)validateCampaignRules(source,context);
 const owners=context==='game'?source.players:[source.me];
 if(owners.some(p=>p.bankRivalryVersion!==(enabled?1:undefined))||source.rival?.bankRivalryVersion!==undefined)
  throw Error('Invalid bank rivalry owner rules.');
 if(enabled&&source.gameOver&&!['receivership','funding_resolution'].includes(source.endReason))throw Error('Persistent rivalry cannot end through automatic bank control.');
}
function projectBankRivalry(g,out){
 if(g.bankRivalryVersion!==1)return;
 out.bankRivalryVersion=1;out.me.bankRivalryVersion=1;
 out.competitiveForecast=out.competitiveForecast.map(item=>item.title==='PERSISTENT RIVALRY'?{
  ...item,text:'Market dominance and score advantages do not end this campaign. Paid market re-entry remains possible. Institutional failure still ends play; buying company shares is a separate, funded decision.'
 }:item);
}
