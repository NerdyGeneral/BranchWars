// Fictional customer investment mandates. Existing identity fixes the mandate;
// neither advisory ownership nor a reload may reroll it. No legal advice, new
// assets, extra customers, random draws or hidden institutional funds.
const InvestmentSuitability=(()=>{
 const whole=n=>Number.isSafeInteger(n)&&n>=0;
 const mandates=Object.freeze([
  Object.freeze({key:'liquidity',label:'Near-term liquidity',horizon:'Under 2 years',maximumBp:2000,description:'Most funds must remain in cash or bank deposits; only a small investment allocation is acceptable.'}),
  Object.freeze({key:'balanced',label:'Balanced reserves',horizon:'2–5 years',maximumBp:5500,description:'Accepts a mixed portfolio while retaining substantial liquid reserves.'}),
  Object.freeze({key:'longTerm',label:'Long-term investing',horizon:'Over 5 years',maximumBp:8500,description:'Accepts a larger investment allocation, but still requires cash or deposit reserves.'})
 ]);
 function investmentSuitabilityMandate(client){
  if(!client||typeof client.id!=='string'||!client.id||client.id.length>80)throw Error('Suitability requires an existing customer identity.');
  let hash=2166136261;const identity='mandate:'+client.id;
  for(let i=0;i<identity.length;i++)hash=Math.imul(hash^identity.charCodeAt(i),16777619)>>>0;
  return mandates[hash%mandates.length];
 }
 // Fund NAV is counted in full: its cash reserve may be invested later and
 // fund redemption depends on provider liquidity. It is not a bank deposit.
 function investmentSuitabilityAssessment(client,price,position={deposit:0,value:0}){
  const mandate=investmentSuitabilityMandate(client);
  if(!whole(price)||price<10||price>10000||!whole(client.cash)||!whole(client.units)||!whole(position.deposit)||!whole(position.value)||position.value<position.deposit)throw Error('Invalid investment suitability holdings.');
  const direct=client.units*price,fund=position.value-position.deposit,total=client.cash+direct+position.value,exposure=direct+fund;
  if(!whole(total)||!whole(exposure))throw Error('Investment suitability exceeds safe precision.');
  const ceiling=Number(BigInt(total)*BigInt(mandate.maximumBp)/10000n),headroom=Math.max(0,ceiling-exposure);
  const additional=Math.max(0,Number((BigInt(total)*BigInt(mandate.maximumBp)-BigInt(exposure)*10000n)/BigInt(10000-mandate.maximumBp)));
  return {key:mandate.key,label:mandate.label,horizon:mandate.horizon,maximumBp:mandate.maximumBp,total,exposure,ceiling,headroom,
   excess:Math.max(0,exposure-ceiling),purchaseLimit:Math.floor(additional/price)*price,
   // Cash needed to preserve the maximum allocation if the rest is in funds.
   fundCashFloor:Math.max(0,total-ceiling-position.deposit)};
 }
 function investmentSuitabilityPosition(world,client){
  const route=world.cashRoutes.accounts.find(a=>a.clientId===client.id);
  if(!route)throw Error('Suitability requires the customer’s funded cash position.');
  return {deposit:route.deposit,value:InvestmentCashRoutes.value(world.cashRoutes,client.id,world.price)+(world.notes?InvestmentNotes.claims(world.notes,client.id):0)};
 }
 function investmentSuitabilityPurchase(world,client,amount){
  if(!whole(amount)||amount%world.price)throw Error('Invalid suitability purchase amount.');
  const q=investmentSuitabilityAssessment(client,world.price,investmentSuitabilityPosition(world,client));
  if(amount>q.purchaseLimit)throw Error('Purchase exceeds this customer’s '+(q.maximumBp/100)+'% investment limit. Add account cash or retain bank deposits before buying more securities.');
  return q;
 }
 return Object.freeze({mandates,mandate:investmentSuitabilityMandate,assess:investmentSuitabilityAssessment,position:investmentSuitabilityPosition,purchase:investmentSuitabilityPurchase});
})();
