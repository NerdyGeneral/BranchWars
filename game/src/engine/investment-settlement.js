// One pure ordered boundary for funded operations, client service and closure.
// Campaign wiring still owns bank/agency reservations, orders and source books.
const InvestmentSettlement=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x));
 function investmentSettlementPrepareClosure(entity,policy,closing){
  const s=InvestmentInstitution.normalize(entity,policy),standing=InvestmentInstitution.defaults(entity);
  if(closing&&(entity.status!=='active'||s.launch||s.capital||s.dividend||
   Object.keys(InvestmentInstitution.ROLES).some(role=>s.roles[role]!==standing.roles[role])||
   s.provider!==standing.provider||s.custody!==standing.custody||s.advice!==standing.advice||s.brokerage!==standing.brokerage))throw Error('Do not combine closure with new investment commitments.');
  if(closing)s.supportCap=0;
  return s;
 }
 function investmentSettlementAdvance(input,plans,offers,price,options={reservedParentCash:[0,0],close:[false,false]},premises){
  return investmentSettlementFinish(investmentSettlementPrepare(input,plans,offers,options),offers,price,options,premises);
 }
 function investmentSettlementPrepare(input,plans,offers,options={reservedParentCash:[0,0],close:[false,false]}){
  if(!input||!Array.isArray(input.parents)||!Array.isArray(input.entities)||input.parents.length!==2||input.entities.length!==2||
   !Array.isArray(plans)||plans.length!==2||!Array.isArray(offers)||offers.length!==2||!options||Object.keys(options).sort().join()!==(input.world?.version===3?'cashOrders,close'+(input.world.notes?',noteAnnualBp,noteOrders':'')+',reservedParentCash'+(input.world.trading?',trades':''):'close,reservedParentCash')||
   !Array.isArray(options.close)||options.close.length!==2||options.close.some(x=>typeof x!=='boolean')||
   !Array.isArray(options.reservedParentCash)||options.reservedParentCash.length!==2)throw Error('Invalid investment settlement instructions.');
  InvestmentClients.validate(input.world,input.entities);
  const w=copy(input),cycle=w.world.month+1;
  delete w.localDelivery; // Derived previous-month routing is never standing authority.
  for(const i of [0,1]){
   const e=w.entities[i],s=investmentSettlementPrepareClosure(e,plans[i],options.close[i]);
   // A closure instruction ends a standing support mandate. Existing migration
   // work may finish its final service month; it must not prevent winding down.
   if(options.close[i])s.supportCap=0;
   const r=InvestmentInstitution.step(w.parents[i],e,w.supplier,s,cycle,options.reservedParentCash[i]);
   w.parents[i]=r.parent;w.entities[i]=r.entity;w.supplier=r.supplier;
  }
  return w;
 }
 function investmentSettlementFinish(input,offers,price,options={reservedParentCash:[0,0],close:[false,false]},premises,distress=[false,false]){
  if(!input||!Array.isArray(input.entities)||input.entities.length!==2||input.entities.some(e=>e.month!==input.world?.month+1)||!Array.isArray(distress)||distress.length!==2||distress.some(x=>typeof x!=='boolean')||!options||!Array.isArray(options.close)||options.close.length!==2||options.close.some(x=>typeof x!=='boolean'))throw Error('Prepare investment operating costs once before service.');
  const w=copy(input);InvestmentClients.validate(w.world,w.entities,true);
  const defaults=w.entities.map((e,i)=>{
   if(!distress[i])return null;
   const j=e.book.journal.at(-1);
   if(!j||j.source!=='premises.creditorRelease'||j.counterparty!=='bank'||!(j.changes.payables<0)||j.changes.equity!==-j.changes.payables||j.earnings!==j.changes.equity)throw Error('Mandatory occupancy wind-down requires the current unpaid-creditor release.');
   return j.id;
  });
  // A paired internal-creditor release can extinguish the invoice that caused
  // wind-down. It must not restore selling/service permission for that month.
  // This explicit coordinator flag never changes ordinary campaign settlement.
  for(const [i,e]of w.entities.entries())if(distress[i]&&e.report)e.report.permitted=InvestmentInstitution.permissionState(e,e.month,Object.fromEntries(Object.keys(InvestmentInstitution.ROLES).map(k=>[k,0])));
  const selection=offers.map((o,i)=>({...o,pursue:options.close[i]||distress[i]?false:o.pursue}));
  const serviced=InvestmentClients.step(w.world,w.entities,w.supplier,selection,price,w.world.version===3?{banks:w.banks,orders:options.cashOrders,...(w.world.trading?{trades:options.trades}:{}),...(w.world.notes?{noteOrders:options.noteOrders,noteAnnualBp:options.noteAnnualBp}:{})}:undefined,premises);
  w.world=serviced.world;w.entities=serviced.entities;w.supplier=serviced.supplier;
  if(w.world.version===3)w.banks=serviced.banks;
  for(const i of [0,1])if(w.entities[i].status==='active'&&(options.close[i]||distress[i]||w.entities[i].book.accounts.payables||w.entities[i].book.accounts.equity<0)){
   const released=InvestmentClients.releaseOwner(w.world,w.entities,w.entities[i].owner);w.world=released.world;w.entities=released.entities;
   const closed=InvestmentInstitution.close(w.parents[i],w.entities[i],w.supplier,options.close[i]?'voluntary':'insolvent',defaults[i]);
   w.parents[i]=closed.parent;w.entities[i]=closed.entity;w.supplier=closed.supplier;
  }
  InvestmentClients.validate(w.world,w.entities);return {...w,...(serviced.localDelivery?{localDelivery:serviced.localDelivery}:{})};
 }
 return Object.freeze({advance:investmentSettlementAdvance,prepare:investmentSettlementPrepare,finish:investmentSettlementFinish,prepareClosure:investmentSettlementPrepareClosure});
})();
