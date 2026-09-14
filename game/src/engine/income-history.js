// Reporting-only saved records. No funds, inferred old income or forecast values.
const IncomeHistory=(()=>{
 const fields=['loanIncome','commercialIncome','depositIncome','otherIncome','fundingCost','expense','chargeoff','eventAdjustment','corporateInvoiceLoss','profit','loanGrowth','contractFees'];
 const copy=value=>JSON.parse(JSON.stringify(value));
 const fail=()=>{throw Error('Invalid private income history.');};
 function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join()!==[...keys].sort().join())fail();}
 function numbers(value,keys){if(keys.some(key=>!(key==='contractFees'&&value[key]===null)&&(typeof value[key]!=='number'||!Number.isFinite(value[key])||Math.abs(value[key])>Number.MAX_SAFE_INTEGER)))fail();}
 function stocks(value){for(const key of ['principal','business','merchant'])if(!Number.isSafeInteger(value[key])||value[key]<0)fail();}
 function validate(book,lastCycle){
  exact(book,['version','lastCycle','opening','records']);
  if(book.version!==1||book.lastCycle!==lastCycle||!Number.isSafeInteger(lastCycle)||lastCycle<0||!Array.isArray(book.records)||book.records.length!==Math.min(12,lastCycle))fail();
  exact(book.opening,['principal','business','merchant']);stocks(book.opening);
  for(const [index,row]of book.records.entries()){
   exact(row,['cycle',...fields,'principal','business','merchant']);
   if(row.cycle!==lastCycle-book.records.length+index+1)fail();
   numbers(row,fields);stocks(row);
  }
  return book;
 }
 function create(p){return {version:1,lastCycle:0,opening:{principal:p.stats.loans,business:p.stats.business,merchant:p.stats.merchant},records:[]};}
 function append(book,p,cycle){
  validate(book,cycle-1);
  const report=p.operatingReport;
  if(!report||report.cycle!==cycle)fail();
  const row={cycle,...Object.fromEntries(fields.map(key=>[key,report[key]===undefined?(key==='corporateInvoiceLoss'?0:key==='contractFees'?null:undefined):report[key]])),principal:p.stats.loans,business:p.stats.business,merchant:p.stats.merchant};
  const next={...book,lastCycle:cycle,records:[...book.records,row].slice(-12)};
  validate(next,cycle);return next;
 }
 return {create,append,validate,copy};
})();
function initializeIncomeHistory(g,o){
 if(o.incomeHistoryVersion!==1)return;
 g.incomeHistoryVersion=1;for(const p of g.players)p.incomeHistory=IncomeHistory.create(p);
}
function recordIncomeHistory(g){
 if(g.incomeHistoryVersion!==1)return;
 const cycle=g.gameOver?g.cycle:g.cycle-1;
 // Validate both results before replacing either book. Replays cannot append a
 // duplicate: normal submit calls this only for a new resolution identity.
 const next=g.players.map(p=>IncomeHistory.append(p.incomeHistory,p,cycle));
 g.players.forEach((p,i)=>p.incomeHistory=next[i]);
}
function validateIncomeHistoryCampaign(g){
 validateBankEconomicsCampaign(g);
 validateCreditWorkloadCampaign(g);
 validateCommercialServiceCampaign(g);
 if(g.incomeHistoryVersion===undefined){if(['8.16','9.29'].includes(g.version)||g.players.some(p=>p.incomeHistory!==undefined))throw Error('Unversioned income history.');return;}
 validateCampaignRules(g,'game');
 const cycle=g.gameOver?g.cycle:g.cycle-1;
 for(const p of g.players)IncomeHistory.validate(p.incomeHistory,cycle);
}
function projectIncomeHistory(g,out,index){
 projectBankEconomics(g,out);
 projectCreditWorkload(g,out);
 projectCommercialService(g,out);
 if(g.incomeHistoryVersion!==1)return;
 out.incomeHistoryVersion=1;out.me.incomeHistory=IncomeHistory.copy(g.players[index].incomeHistory);
}
function validateIncomeHistoryView(v){
 validateBankEconomicsView(v);
 validateCreditWorkloadView(v);
 validateCommercialServiceView(v);
 if(v.rival?.incomeHistory!==undefined)throw Error('Private rival income history exposed.');
 if(v.incomeHistoryVersion===undefined){if(['8.16','9.29'].includes(v.version)||v.me?.incomeHistory!==undefined)throw Error('Unversioned income history.');return;}
 validateCampaignRules(v,'view');IncomeHistory.validate(v.me?.incomeHistory,v.gameOver?v.cycle:v.cycle-1);
}
