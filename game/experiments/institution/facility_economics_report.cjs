'use strict';
// Uncaptured report-only wrapper for the existing frozen balance runner. Its
// engine source, campaign creation, AI choices and submitted plans are unchanged.
// Example: node experiments/institution/facility_economics_report.cjs
//          --scenario=balanced --seed=facility-long --turns=120
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const hash=x=>createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const wrapperHash=hash(fs.readFileSync(__filename)),originalVm=vm.runInNewContext;
let E=null,game=null,engineHash=null,opening=null,lastCycle=0;
const observations=[];
function snapshot(g){
 const companies=g.companyEconomy.companies.map(c=>({id:c.id,market:c.market,baseFee:c.baseFee,
  active:!c.resolution,cash:c.book.accounts.cash,equity:c.book.accounts.equity,payables:c.book.accounts.payables,
  debt:c.book.accounts.debt,bankArrears:copy(c.bankArrears),resolution:copy(c.resolution),report:copy(c.report)}));
 const relationships=g.agencyEconomy.relationships;
 const active=companies.filter(c=>c.active);
 return {cycle:g.cycle,companyMonth:g.companyEconomy.month,activeCompanies:active.length,failedCompanies:companies.length-active.length,
  outsideCorporateCash:g.companyEconomy.outside.accounts.cash,companies,
  // An upper revenue bound, not a forecast: assumes every currently active
  // company can pay every listed premium, without competing agencies or limits.
  premiumAndCommissionCeiling:Object.fromEntries(Object.entries(E.AGENCY_PRODUCTS).map(([key,product])=>{
   const premiums=active.map(c=>Math.round(c.baseFee*product.premiumRate));
   return [key,{premium:premiums.reduce((a,b)=>a+b,0),commission:premiums.reduce((n,x)=>n+Math.floor(x*product.commissionRate),0),load:active.length*product.load}];
  })),
  agencyEconomy:{premiumPaid:g.agencyEconomy.premiumPaid,commissionPaid:g.agencyEconomy.commissionPaid,
   operatingPaid:g.agencyEconomy.operatingPaid,creditorLoss:g.agencyEconomy.creditorLoss,parentCashNet:g.agencyEconomy.parentCashNet},
  agencies:g.players.map(p=>({owner:p.id,status:p.agency.status,failures:p.agency.failures,staff:p.agency.staff,
   policy:copy(p.agency.policy),cash:p.agency.book.accounts.cash,equity:p.agency.book.accounts.equity,
   payables:p.agency.book.accounts.payables,investmentBasis:p.financialGroup.investmentBasis.agency,
   parentCash:p.financialGroup.parent.accounts.cash,report:copy(p.agency.report),
   covers:relationships.filter(r=>r.owner===p.id).map(r=>({companyId:r.companyId,product:r.product,remaining:r.remaining,quality:r.quality}))}))};
}
vm.runInNewContext=function(code,context,...rest){
 const value=originalVm.call(this,code,context,...rest);
 if(context?.BWEngine&&typeof code==='string'&&code.includes('root.BWEngine={')){
  assert.equal(E,null,'One engine load only in this report wrapper.');E=context.BWEngine;engineHash=hash(code);
  const create=E.createGame,submit=E.submit;
  E.createGame=function(...args){const result=create.apply(this,args);assert.equal(game,null,'One fresh campaign per diagnostic run.');
   game=result;opening=snapshot(game);lastCycle=game.cycle;return result;};
  E.submit=function(...args){
   const world=args[0],before=world.players.map(p=>({status:p.agency.status,failures:p.agency.failures,staff:p.agency.staff,cash:p.agency.book.accounts.cash}));
   const activeBefore=world.companyEconomy.companies.filter(c=>!c.resolution).length;
   const result=submit.apply(this,args);
   if(world.cycle!==lastCycle||world.gameOver){
    const changed=world.players.some((p,i)=>p.agency.status!==before[i].status||p.agency.failures!==before[i].failures)||
     world.companyEconomy.companies.filter(c=>!c.resolution).length!==activeBefore;
    if(changed||world.companyEconomy.month%24===0||world.gameOver)observations.push({previousAgencies:before,...snapshot(world)});
    lastCycle=world.cycle;
   }
   return result;
  };
 }
 return value;
};
console.log(JSON.stringify({diagnosticWrapper:__filename,wrapperHash,method:'Read-only observation around unchanged createGame/submit calls; same frozen runner and actual engine.'}));
try{
 require('../../tests/facility_lifecycle_balance.test.js');
 assert(game);console.log(JSON.stringify({suite:'facility-company-agency-economics',wrapperHash,engineHash,
  rules:copy(E.AGENCY_RULES),products:copy(E.AGENCY_PRODUCTS),opening,observations,final:snapshot(game),
  limits:'Exact observations and optimistic funded-customer revenue ceilings, not recommendations, equal-share targets or a guarantee that the agency is profitable.'}));
}finally{vm.runInNewContext=originalVm;}
