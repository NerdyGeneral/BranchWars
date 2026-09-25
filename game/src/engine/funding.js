function fundingPosition(p){
 if(!p.fundingCovenant)return null;
 const limit=Math.max(250000,Math.floor(p.stats.deposits*.05+Math.max(0,p.stats.capital)*.5)),debt=p.stats.emergencyDebt||0;
 return {limit,debt,excess:Math.max(0,debt-limit),headroom:Math.max(0,limit-debt),streak:p.fundingCovenant.streak};
}
function initializeFundingCovenants(g,o){
 if(g.creditLifecycleVersion!==1||o.fundingCovenantVersion===0)return g;
 g.fundingCovenantVersion=1;for(const p of g.players)p.fundingCovenant={version:1,streak:0,lastCycle:0};return g;
}
const covenantLimit=pilotSpendingLimit;
pilotSpendingLimit=function(p,...args){return p.fundingCovenant&&fundingPosition(p).excess>0?0:covenantLimit(p,...args)};
const covenantPull=depositPull;
depositPull=function(p,...args){const f=fundingPosition(p);return covenantPull(p,...args)-(f&&f.excess>0?Math.min(3,1+f.excess/Math.max(1,f.limit)):0)};
const covenantSettle=settleFunding;
settleFunding=function(g,p,outflow){
 if(!p.fundingCovenant)return covenantSettle(g,p,outflow);
 if(outflow)throw Error('Covenant outflows must settle at transfer');
 // A liquidity policy prioritizes debt reduction over expanding the cash reserve.
 const reserve=Math.round(p.stats.deposits*(p.policies.capital==='liquid'?.02:p.policies.capital==='reinvest'?.08:.05));
 const amount=Math.min(p.stats.emergencyDebt,Math.max(0,p.stats.cash-reserve));
 if(amount){bookPost(p,'repayDebt',amount);return[p.name+' repaid $'+amount.toLocaleString()+' of emergency debt under its treasury policy.']}return [];
};



function planFundingRecovery(g,index,plan){
 const p=g.players[index],f=fundingPosition(p);
 if(f&&f.excess>0){
  plan.capitalPolicy='liquid';plan.lendingPolicy='conservative';
  const released=plan.allocation.lending;plan.allocation.lending=0;plan.allocation.service+=released;
  // Existing commitments continue, but a recovery plan does not chase a new loan book.
  if(plan.opportunity&&g.opportunities.some(o=>o.id===plan.opportunity&&o.type==='loan'))plan.opportunity=null;
 }
 return plan;
}
const covenantEnd=evaluateStrategicEnd;
evaluateStrategicEnd=function(g){
 if(!g.fundingCovenantVersion)return covenantEnd(g);
 const lines=[];
 for(const p of g.players){
  const f=fundingPosition(p),c=p.fundingCovenant;
  if(c.lastCycle===g.cycle)continue;
  c.lastCycle=g.cycle;
  if(f.excess>0){c.streak=Math.min(3,c.streak+1);lines.push(p.name+' exceeds its $'+f.limit.toLocaleString()+' emergency funding covenant by $'+f.excess.toLocaleString()+' ('+c.streak+'/3 consecutive months). New discretionary spending is blocked; reduce debt or restore equity.')}
  else {if(c.streak)lines.push(p.name+' cured its emergency funding breach.');c.streak=0}
 }
 const failed=g.players.filter(p=>p.fundingCovenant.streak>=3||(p.distress||0)>=RECEIVERSHIP_CYCLES);
 if(failed.length){
  g.gameOver=true;g.endReason=failed.some(p=>p.fundingCovenant.streak>=3)?'funding_resolution':'receivership';
  g.winnerId=failed.length===2?null:g.players.find(p=>p!==failed[0]).id;g.failedId=failed.length===1?failed[0].id:null;
  lines.push('BANK RESOLUTION // '+failed.map(p=>p.name).join(' and ')+' failed to restore funding or capital. No free assets are awarded.');
 }else{const end=covenantEnd(g);if(end)lines.push(end)}
 return lines.join(' ');
};

function validateFundingSave(g){
 if(g.fundingCovenantVersion===undefined){if(g.players.some(p=>p.fundingCovenant))throw Error('Unversioned funding covenant');return g}
 if(g.fundingCovenantVersion!==1||g.creditLifecycleVersion!==1)throw Error('Unsupported funding covenant save');
 for(const p of g.players){const c=p.fundingCovenant;if(!c||c.version!==1||!Number.isInteger(c.streak)||c.streak<0||c.streak>3||!Number.isInteger(c.lastCycle)||c.lastCycle<0||c.lastCycle>g.cycle)throw Error('Invalid funding covenant state')}
 return g;
}

// Deposit products v1: withdrawable savings with six-month promotional rate guarantees.
