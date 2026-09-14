// Reviewed control transactions. Pure domain operations accept actual books;
// they never endow a lender, inspect rival plans or change banking contracts.
// The campaign adapter must persist records and provide fresh public inputs.
const CompanyControl = (() => {
 const copy=x=>JSON.parse(JSON.stringify(x));
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const whole=n=>Number.isSafeInteger(n)&&n>=0;
 const check=(n,label)=>{if(!whole(n))throw Error('Invalid '+label+'.');return n;};
 const fee=n=>Math.ceil(check(n*25,'fee arithmetic')/10000);
 const RULES=Object.freeze({diligenceMin:5000,diligenceMax:50000,diligenceLife:3,premiumBp:1500,financeBp:4000,interestBp:75,term:36,coverageBp:15000,integrationWork:6,integrationBp:100,debtReserveMonths:3});
 function company(c){
  if(!exact(c,['id','issued','referenceCents','equity','profits','capitalRevision','suspended','distributableMonthly'])||typeof c.id!=='string'||!c.id||c.issued!==100000||!whole(c.referenceCents)||c.referenceCents>1000000||!Number.isSafeInteger(c.equity)||!whole(c.capitalRevision)||typeof c.suspended!=='boolean'||!whole(c.distributableMonthly)||!Array.isArray(c.profits)||c.profits.length>6||c.profits.some(n=>!Number.isSafeInteger(n)))throw Error('Invalid audited company inputs.');
 }
 function diligenceQuote(c,month){company(c);check(month,'diligence month');if(c.suspended||c.equity<=0||!c.referenceCents)throw Error('A closed or insolvent company cannot receive a control review.');
  return {issuer:c.id,commissionedMonth:month,readyMonth:month+1,expiresMonth:month+RULES.diligenceLife,capitalRevision:c.capitalRevision,fee:Math.max(RULES.diligenceMin,Math.min(RULES.diligenceMax,Math.ceil(c.equity/100)))};
 }
 function validateDiligence(d){if(!exact(d,['owner','issuer','commissionedMonth','readyMonth','expiresMonth','capitalRevision','fee'])||typeof d.owner!=='string'||!d.owner||typeof d.issuer!=='string'||!d.issuer||!whole(d.commissionedMonth)||d.readyMonth!==d.commissionedMonth+1||d.expiresMonth!==d.commissionedMonth+RULES.diligenceLife||!whole(d.capitalRevision)||!whole(d.fee)||d.fee<RULES.diligenceMin||d.fee>RULES.diligenceMax)throw Error('Invalid paid diligence record.');}
 function startDiligence(parent,provider,c,month,protectedCash=0){
  const record=diligenceQuote(c,month);check(protectedCash,'reserved parent cash');GroupAccounting.validate(parent);
  if(parent.accounts.cash<record.fee+protectedCash)throw Error('Diligence requires existing unreserved parent cash.');
  const paid=GroupAccounting.servicePayment(parent,provider,record.fee);return {parent:paid.payer,provider:paid.provider,record:{...record,owner:parent.entityId}};
 }
 function offerShape(o){
  if(!exact(o,['id','buyer','issuer','shares','priceCents','borrow','submittedMonth'])||typeof o.id!=='string'||!o.id||o.id.length>100||typeof o.buyer!=='string'||!o.buyer||o.buyer==='outside'||typeof o.issuer!=='string'||!whole(o.shares)||!o.shares||o.shares>100000||!whole(o.priceCents)||!o.priceCents||o.priceCents>1000000||!whole(o.borrow)||!whole(o.submittedMonth))throw Error('Invalid controlling offer.');
 }
 function review(ctx,o,d,{allowPendingConsent=false}={}){
  offerShape(o);company(ctx.company);validateDiligence(d);
  const c=ctx.company;check(ctx.month,'offer month');check(ctx.parentCash,'parent cash');check(ctx.protectedCash,'reserved parent cash');check(ctx.lenderCash,'outside lending cash');check(ctx.existingMonthlyCash,'existing distributable cash');check(ctx.existingDebtService,'existing debt service');
  if(o.issuer!==c.id||c.suspended||c.equity<=0||!c.referenceCents||ctx.month<o.submittedMonth)throw Error('Offer has no current solvent target.');
  if(d.owner!==ctx.buyerEntityId||d.issuer!==c.id||ctx.month<d.readyMonth||ctx.month>d.expiresMonth||d.capitalRevision!==c.capitalRevision)throw Error('Paid diligence is foreign, pending, expired or invalidated by a material capital event.');
  if(!Array.isArray(ctx.ownership)||ctx.ownership.length!==3||new Set(ctx.ownership.map(h=>h.id)).size!==3||ctx.ownership.some(h=>!exact(h,['id','shares'])||typeof h.id!=='string'||!h.id||!whole(h.shares))||ctx.ownership.reduce((n,h)=>n+h.shares,0)!==c.issued)throw Error('Offer ownership does not reconcile.');
  const owner=ctx.ownership.find(h=>h.id===o.buyer),outside=ctx.ownership.find(h=>h.id==='outside'),rival=ctx.ownership.find(h=>h.id!==o.buyer&&h.id!=='outside');
  if(!owner||!outside||!rival||owner.shares+o.shares<=c.issued/2||owner.shares+o.shares>c.issued)throw Error('The requested shares must reach controlling ownership.');
  const outsideQuantity=Math.min(o.shares,outside.shares),rivalQuantity=o.shares-outsideQuantity;
  if(outsideQuantity&&o.priceCents<Math.ceil(c.referenceCents*(10000+RULES.premiumBp)/10000))throw Error('Outside control tenders require at least a 15% premium to the current reference.');
  if(!Array.isArray(ctx.consents))throw Error('Explicit seller consents are required.');
  const consentIds=new Set();for(const consent of ctx.consents){
   if(!exact(consent,['offerId','seller','shares'])||consent.offerId!==o.id||consent.seller!==rival.id||!whole(consent.shares)||consent.shares>rival.shares||consentIds.has(consent.seller))throw Error('Invalid or stale shareholder consent.');consentIds.add(consent.seller);
  }
  const consentRequired=rivalQuantity&&!(ctx.consents.find(x=>x.seller===rival.id)?.shares>=rivalQuantity)?rivalQuantity:0;
  if(consentRequired&&!allowPendingConsent)throw Error('Rival-owned shares require explicit consent to this offer.');
  const purchase=Math.ceil(check(o.shares*o.priceCents,'purchase arithmetic')/100),buyerFee=fee(purchase),integrationCost=Math.ceil(purchase*RULES.integrationBp/10000);
  if(o.borrow>Math.floor(purchase*RULES.financeBp/10000)||o.borrow>ctx.lenderCash)throw Error('Acquisition financing exceeds the 40% limit or actual outside lending cash.');
  const initialService=Math.ceil(o.borrow/RULES.term)+Math.ceil(o.borrow*RULES.interestBp/10000);
  const targetCash=Math.floor(check(c.distributableMonthly*o.shares,'cash coverage arithmetic')/c.issued),totalService=initialService+ctx.existingDebtService;
  // Use cash that can reach the parent, not 100% of a target's paper profits.
  if(o.borrow&&(!c.profits.length||c.profits.reduce((n,p)=>n+p,0)<=0||check((ctx.existingMonthlyCash+targetCash)*10000,'coverage arithmetic')<check(totalService*RULES.coverageBp,'debt coverage arithmetic')))throw Error('Acquisition debt requires positive trailing earnings and 1.5x distributable cash coverage.');
  const debtReserve=initialService*RULES.debtReserveMonths,equityFunding=purchase-o.borrow,parentRequired=equityFunding+buyerFee+integrationCost+debtReserve;
  if(parentRequired+ctx.protectedCash>ctx.parentCash)throw Error('Offer exceeds existing parent cash after fees, integration, debt reserves and other commitments.');
  return {purchase,buyerFee,integrationCost,initialService,debtReserve,equityFunding,parentRequired,targetCash,consentRequired,sellers:[{id:'outside',shares:outsideQuantity},{id:rival.id,shares:rivalQuantity}].filter(s=>s.shares),ownershipAfter:owner.shares+o.shares};
 }
 function choose(eligible,month,issuerIndex){
  check(month,'competition month');check(issuerIndex,'issuer index');
  if(!Array.isArray(eligible)||eligible.length>2||new Set(eligible.map(x=>x.offer.buyer)).size!==eligible.length)throw Error('Invalid competing offers.');
  for(const x of eligible){offerShape(x.offer);check(x.quote.equityFunding,'committed equity');}
  if(new Set(eligible.map(x=>x.offer.issuer)).size>1||new Set(eligible.map(x=>x.offer.id)).size!==eligible.length)throw Error('Only distinct offers for the same issuer compete.');
  const ids=eligible.map(x=>x.offer.buyer).sort(),rotation=ids.length?(month+issuerIndex)%ids.length:0;
  const rank=id=>(ids.indexOf(id)-rotation+ids.length)%ids.length;
  return eligible.slice().sort((a,b)=>b.offer.priceCents-a.offer.priceCents||b.quote.equityFunding-a.quote.equityFunding||rank(a.offer.buyer)-rank(b.offer.buyer))[0]?.offer.id||null;
 }
 return {RULES,diligenceQuote,validateDiligence,validateOffer:offerShape,startDiligence,review,choose};
})();
