// Expanded 9.34 lending rules, for new campaigns only. Every 9.33 and earlier
// campaign keeps its loan capacity and AI office valuation exactly: each
// accessor below returns the old value (0 or true) without the marker.
//
// Measured on 9.33 with tools/edition_balance_lab.js: local office capacity
// bound loan production in almost every month, so a bank holding $30M of
// deposits kept a $6M loan book and $14M of idle cash. The AI also converted its
// only retail branch into an ATM, because its valuation counted the upkeep saved
// but not the deposit growth, service and loan capacity given up.
const BALANCE_SHEET_LENDING_RULES=Object.freeze({targetLoanToDeposit:.8,deploymentRate:.1,deploymentDesk:4,liquidityFloor:.08});
function balanceSheetLendingRules(source){return source?.balanceSheetLendingVersion===1}
function initializeBalanceSheetLending(g,o){
 if(o.balanceSheetLendingVersion!==1)return;
 g.balanceSheetLendingVersion=1;for(const p of g.players)p.balanceSheetLendingVersion=1;
}
function validateBalanceSheetLending(source,context){
 const enabled=source.balanceSheetLendingVersion===1;
 if(source.version==='9.34'&&!enabled)throw Error('Missing balance-sheet lending rules.');
 if(source.balanceSheetLendingVersion!==undefined&&!enabled)throw Error('Unsupported balance-sheet lending rules.');
 if(enabled)validateCampaignRules(source,context);
 const owners=context==='game'?source.players:[source.me];
 if(owners.some(p=>p.balanceSheetLendingVersion!==(enabled?1:undefined))||source.rival?.balanceSheetLendingVersion!==undefined)
  throw Error('Invalid balance-sheet lending owner rules.');
}
function projectBalanceSheetLending(g,out){
 if(g.balanceSheetLendingVersion!==1)return;
 out.balanceSheetLendingVersion=1;out.me.balanceSheetLendingVersion=1;
}

// Central deployment, before the lending multipliers: the assigned Lending
// bankers can lend part of the funded deposit gap without a local office. It
// falls to nothing as the loan book approaches the target. Administering the
// book is not counted twice: loanProductionCapacity scales this by credit
// administration coverage, so a book the staff cannot administer stops growing.
function balanceSheetDeploymentCapacity(p,lendingStaff){
 if(!balanceSheetLendingRules(p))return 0;
 const R=BALANCE_SHEET_LENDING_RULES,gap=Math.max(0,p.stats.deposits*R.targetLoanToDeposit-p.stats.loans);
 return gap*R.deploymentRate*Math.min(1,Math.max(0,lendingStaff)/R.deploymentDesk);
}
// The cash central deployment may lend: only what is above a fixed share of
// deposits, whatever the capital policy. Local office lending keeps the policy
// reserve. Measured without this floor: under the Reinvest policy (a 2% reserve)
// two of six Balanced banks lent their cash to about $0.1-0.3M by month 12, then
// paid every deposit withdrawal by running off loans, and their books fell by
// nearly half by month 24.
function balanceSheetDeploymentCash(p){
 if(!balanceSheetLendingRules(p))return 0;
 return Math.max(0,p.stats.cash-p.stats.deposits*BALANCE_SHEET_LENDING_RULES.liquidityFloor);
}

// An office that both gathers deposits and originates loans. The catalog owns
// the capacities; an ATM and a wealth office do neither of these fully.
function balanceSheetFullServiceModel(model){
 const d=FacilityLifecycle.CATALOG[model];
 return !!d&&d.capacity.depositCapacity>0&&d.capacity.loanCapacity>0;
}
// AI only: never convert away the bank's last full-service office. A player may
// still choose to; the conversion quote shows what the office gives up.
function balanceSheetKeepsFullService(p,officeId,model){
 if(!balanceSheetLendingRules(p)||balanceSheetFullServiceModel(model))return true;
 const office=p.facilityNetwork.offices.find(o=>o.id===officeId);
 if(!office||!balanceSheetFullServiceModel(office.model))return true;
 return p.facilityNetwork.offices.some(o=>o.id!==officeId&&o.closedCycle===null&&balanceSheetFullServiceModel(o.conversion?.model??o.model));
}
// AI only: the deposit growth an office conversion adds or gives up, from the
// same one-month forecasts the conversion review already makes (office deposit
// capacity and branch service both feed deposit growth). Each month's change
// persists for the rest of the horizon and is valued as funding lent at the
// target loan-to-deposit ratio, net of what the bank pays for deposits. Frozen
// like the review's loan stream: no market growth, runoff change or hiring.
function balanceSheetDepositGrowthValue(p,before,monthReport,coupon,horizon){
 if(!balanceSheetLendingRules(p))return 0;
 const depositRate=Math.max(0,before.depositInterest||0)/Math.max(1,p.stats.deposits),
  margin=Math.max(0,coupon*BALANCE_SHEET_LENDING_RULES.targetLoanToDeposit-depositRate);
 let value=0;
 for(let month=1;month<=horizon;month++)value+=((monthReport(month).depositGrowth||0)-(before.depositGrowth||0))*margin*(horizon-month+1);
 return value;
}
