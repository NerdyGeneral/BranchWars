// Additional funded lending families use the existing local loan/cohort book.
// Ratios describe collateral recovery, not extra bank assets or customer cash.
const EXPANDED_CREDIT = Object.freeze({
 smallBusiness:Object.freeze({name:'Small-business term lending',desc:'Equipment and working-capital loans: shorter terms, higher yield and borrower risk.',loans:.92,credit:1.22,spread:1.13,months:36,collateralBp:3500}),
 commercialProperty:Object.freeze({name:'Commercial real estate',desc:'Long-lived property finance: slower production, collateral recovery and greater cyclical exposure.',loans:.85,credit:1.12,spread:1.08,months:120,collateralBp:6500})
});
function creditProductOptions(p){return p.creditProductsVersion===1?{...PRODUCT_PORTFOLIOS.credit.options,...EXPANDED_CREDIT}:PRODUCT_PORTFOLIOS.credit.options;}
function creditProductKeys(p){return Object.keys(creditProductOptions(p));}
function initializeCreditProducts(g,o){
 if(o.creditProductsVersion!==1)return;
 g.creditProductsVersion=1;
 for(const p of g.players){p.creditProductsVersion=1;p.creditPortfolio.version=2;
  p.creditPortfolio.allocation={...p.creditPortfolio.allocation,smallBusiness:0,commercialProperty:0};
 }
}
function creditProductExposures(p){
 const totals={total:0};for(const c of p.creditBook.cohorts){totals.total+=c.principal;totals[c.product]=(totals[c.product]||0)+c.principal;}return totals;
}
function creditProductRisk(p,c,economy,exposures=creditProductExposures(p)){
 if(p.creditProductsVersion!==1)return {incidence:1,severity:1};
 const total=exposures.total,held=exposures[c.product]||0;
 // Concentration raises the same book's future distress; it is not a hard cap.
 const concentration=1+Math.max(0,(total?held/total:0)-.4)*.8;
 const cycle=c.product==='commercialProperty'?1+Math.max(0,(economy?.credit||1)-1)*.75:1;
 const collateral=c.collateralBp||0,realizable=Math.max(.35,1-Math.max(0,(economy?.credit||1)-1)*.4);
 return {incidence:concentration*cycle,severity:1-collateral/10000*realizable};
}
function creditProductReview(p,g){
 return creditProductKeys(p).map(product=>{const terms=creditTerms(p,g,product),rows=p.creditBook.cohorts.filter(c=>c.product===product),principal=rows.reduce((n,c)=>n+c.principal,0);
  return {product,name:creditProductOptions(p)[product].name,months:terms.remaining,annualRateBp:terms.rate*12/100,
   collateralBp:terms.collateralBp||0,principal,share:p.stats.loans?principal/p.stats.loans:0,
   arrears:rows.reduce((n,c)=>n+(c.late||[]).reduce((a,b)=>a+b,0),0)};
 });
}
function validateCreditProducts(g){
 if(g.creditProductsVersion!==1){
  if(g.creditProductsVersion!==undefined||g.players.some(p=>p.creditProductsVersion!==undefined||p.creditPortfolio?.version===2||p.creditBook?.cohorts.some(c=>c.collateralBp!==undefined||Object.hasOwn(EXPANDED_CREDIT,c.product))))throw Error('Unversioned expanded lending products.');
  return;
 }
 if(g.investmentNotesVersion!==1)throw Error('Expanded lending requires the integrated campaign foundation.');
 for(const p of g.players){
  if(p.creditProductsVersion!==1||p.creditPortfolio?.version!==2)throw Error('Lending product rules do not match the campaign.');
  validateCreditAllocation(p.creditPortfolio.allocation,p);
  for(const c of p.creditBook.cohorts){
   const option=EXPANDED_CREDIT[c.product];
   if(option?c.collateralBp!==option.collateralBp:c.collateralBp!==undefined)throw Error('Invalid retained loan collateral terms.');
  }
 }
}
function projectCreditProducts(g,out,index){
 if(g.creditProductsVersion!==1)return;
 out.creditProductsVersion=1;out.me.creditProductsVersion=1;
 out.productPortfolios={...out.productPortfolios,credit:{...out.productPortfolios.credit,options:creditProductOptions(g.players[index])}};
}
function validateCreditProductsView(v){
 if(v.rival?.creditProductsVersion!==undefined)throw Error('Private rival lending rules exposed.');
 validateCreditProducts({...v,players:[v.me]});
}
