// One reviewed queue for named-company advances. The explicit 9.28 coordinator
// uses it before spending, shared by the customer inspector and rival strategy.
const COMPANY_CREDIT_ORDER_FIELDS=Object.freeze(['companyId','principal','months','annualRateBp','appetite','product']);
function companyCreditOrders(input){
 if(!Array.isArray(input)||input.length>6)throw Error('Choose at most six existing company loan offers.');
 const seen=new Set();return input.map(o=>{
  if(!o||Object.keys(o).sort().join()!==COMPANY_CREDIT_ORDER_FIELDS.slice().sort().join()||!/^company:[0-5]$/.test(o.companyId)||seen.has(o.companyId))throw Error('Each company can receive one complete loan offer.');
  seen.add(o.companyId);return {...o};
 });
}
function prepareCompanyCreditOrders(v,p,draft,input=[]){
 const world=v.companyEconomy||p.companySnapshot?.world,orders=companyCreditOrders(input),quotes=[];
 if(!p.companyCredit||world?.version!==7)throw Error('Named-company lending is not enabled in this campaign.');
 if(v.gameOver||world.month!==v.cycle-1)throw Error('Review company loans in the current unsettled month.');
 CompanyCreditBank.validate(p,world);
 const {owner,plan}=departmentCustomerPreview(p,v,draft);normalizeGroupPlan(p,plan);
 const execution=departmentFunctionExecution(owner),
  capacity=Math.max(0,Math.floor(loanProductionCapacity(v,owner))),quarters=Math.max(0,Math.floor(execution?.remainingPools.lending||0)),
  budget=planBudget(p,plan,v),reserve=Math.max(plan.workforcePolicy?.reserve||0,plan.departmentPolicy?.reserve||0,Math.ceil(p.stats.deposits*({liquid:.1,balanced:.05,reinvest:.02}[plan.capitalPolicy]||.05))),
  dividend=plan.groupPolicy?.bankDividend||0,
  cash=Math.max(0,Math.floor(p.stats.cash-(p.accounting.accounts.payables||0)-budget.total-reserve-dividend)),
  capital=Math.max(0,Math.floor((p.stats.capital-budget.total-dividend)/.08-riskAssets(p)));
 let principal=0,work=0;
 for(const order of orders){
  const company=world.companies.find(c=>c.id===order.companyId),{companyId,...terms}=order,
   quote=CompanyCredit.quote(company,terms),contract=(v.serviceAgreements||[]).find(c=>c.clientIndex===company.clientIndex),
   account=Object.hasOwn(p.commercialAccounts?.accounts||{},companyId),
   service=contract?.owner===p.id&&serviceLoad(owner).rows.some(c=>c.id===contract.id&&c.served),
   prior=world.credit.notes.find(n=>n.companyId===companyId),required=capacity&&quarters?Math.max(1,Math.ceil(order.principal*quarters/capacity)):Infinity;
  let reason=quote.reason;
  if(!reason&&!account&&!service)reason='Develop an operating account or deliver this company’s banking agreement before offering credit.';
  if(!reason&&prior&&prior.status!=='repaid')reason='The company already has an outstanding or written-off facility.';
  if(!reason&&(tierRank(p)>=2||p.capitalRestriction>0||plan.capitalAction))reason='Restore capital standing before approving a new company loan.';
  if(!reason&&work+required>quarters)reason='The offer exceeds remaining underwriting time; release Lending capacity or reduce the loan queue.';
  if(!reason&&principal+order.principal>cash)reason='The loan queue exceeds cash available after existing commitments and the liquidity reserve.';
  if(!reason&&principal+order.principal>capital)reason='The loan queue would breach the protected 8% capital ratio.';
  quotes.push({companyId,...quote,qualified:account||service,qualification:account?'Operating account':service?'Serviced banking agreement':null,workQuarters:Number.isFinite(required)?required:null,eligible:!reason,reason});
  principal+=order.principal;work+=required;
 }
 const eligible=quotes.every(q=>q.eligible),reservedCapacity=eligible&&orders.length?Math.min(capacity,Math.ceil(work*capacity/quarters)):0;
 const review={eligible,reason:quotes.find(q=>!q.eligible)?.reason||'',orders,quotes,principal,capacity,availableQuarters:quarters,
  reservedQuarters:eligible?work:0,reservedCapacity,ordinaryCapacity:capacity-reservedCapacity,cashAvailable:cash,capitalAvailable:capital,liquidityReserve:reserve,existingCommitments:budget.total,bankDividend:dividend,
  assumptions:'Current economy, prepared staffing and existing relationships. Rival offers and later events can change approval or funding; no loan is created by this preview.'};
 // Underwriting uses the same production budget even if a small advance needs
 // less than one quarter's throughput. The unused slice is not sold twice.
 if(eligible)owner._companyCreditOrigination=reservedCapacity;
 return {owner,plan,review};
}
function companyCreditOrderReview(v,p,draft,orders=[]){
 try{return prepareCompanyCreditOrders(v,p,draft,orders).review;}
 catch(error){return {eligible:false,reason:error.message};}
}
// Owner-only conditional comparison: never manufacture a rival bank ledger or
// pretend hidden offers are known. Principal is cash exchanged for an asset,
// not an expense or a second subtraction from the shared spending budget.
function companyCreditPlanForecast(v,p,draft,orders=draft.companyCreditOrders||[]){
 const review=prepareCompanyCreditOrders(v,p,draft,orders).review;
 if(!review.eligible)throw Error(review.reason);
 const copy=x=>JSON.parse(JSON.stringify(x)),plan=copy(draft);plan.companyCreditOrders=[];
 const statement=p.companySnapshot||(v.companyEconomy?corporateStatement(v):null);
 if(!statement)throw Error('A public company statement is required for this forecast.');
 let world=copy(statement.world),owner=copy(p);owner.companySnapshot=copy(statement);
 const baseline=operatingPreview(owner,plan,v.economy,v,true);
 for(const order of [...orders].sort((a,b)=>a.companyId.localeCompare(b.companyId))){
  const {companyId,...terms}=order,result=CompanyFinance.forecastCreditAdvance(world,companyId,p.id,terms),e=result.posting;
  const book=AccountingPrototype.post(owner.accounting,e.source,e.changes,e.earnings);
  world=result.world;owner=CompanyCreditBank.apply(owner,world,book);
 }
 const located=refreshCompanyCreditOwnerDeposits(owner,world,v.marketEconomy||p.marketSnapshot);
 owner=located.owner;owner.companySnapshot={...copy(statement),world};
 if(located.marketEconomy)owner.marketSnapshot=located.marketEconomy;
 owner._companyCreditOrigination=review.reservedCapacity;owner._companyCreditFunded=review.principal;
 const funded=operatingPreview(owner,plan,v.economy,{...v,marketEconomy:located.marketEconomy},true);
 // The operating comparison opens before any advance, not at the temporary
 // post-funding snapshot used to calculate coupons and ordinary capacity.
 funded.commercial.companyLoanGrowth+=review.principal;funded.commercial.businessLoanGrowth+=review.principal;
 return {review,baseline,funded,assumptions:'Conditional: all your reviewed company offers fund; rival offers and executive events are excluded. Existing company operations and debt payments use the current economy. Losing offers reserve no underwriting at settlement. Principal is an asset purchase, not profit or an expense.'};
}
// Reviewed borrowers prefer more of their eligible liquidity need, then lower
// rates and a longer repayment term. Exact ties rotate across stable bank IDs;
// neither submission order nor engine iteration order awards the relationship.
function chooseCompanyCreditOffer(offers,month,companyIndex){
 const ids=offers.map(o=>o.bankId).sort(),rotation=ids.length?(month+companyIndex)%ids.length:0;
 return [...offers].sort((a,b)=>b.order.principal-a.order.principal||a.order.annualRateBp-b.order.annualRateBp||b.order.months-a.order.months||
  ((ids.indexOf(a.bankId)-rotation+ids.length)%ids.length)-((ids.indexOf(b.bankId)-rotation+ids.length)%ids.length))[0]||null;
}
// Pure authoritative funding stage for the unfinished campaign adapter. It
// returns paired real books, not hypothetical forecast balances. The caller
// must commit world + players together and account for these reservations in
// that same month's remaining operations. This is not a save migration API.
function fundCompanyCreditOrders(g,submissions){
 if(!Array.isArray(g.players)||g.players.length!==2||!Array.isArray(submissions)||submissions.length!==g.players.length||
  new Set(submissions.map(s=>s?.bankId)).size!==g.players.length||submissions.some(s=>!s||Object.keys(s).sort().join()!=='bankId,orders,plan'||!g.players.some(p=>p.id===s.bankId)))throw Error('Both existing banks must submit one company-credit queue.');
 if(g.players.some(p=>p._companyCreditOrigination!==undefined))throw Error('Company-credit funding already ran for this operating stage.');
 const prepared=g.players.map(p=>{
  const s=submissions.find(s=>s.bankId===p.id),review=prepareCompanyCreditOrders(g,p,s.plan,s.orders).review;
  if(!review.eligible)throw Error(p.name+': '+review.reason);
  return {bankId:p.id,review};
 });
 let world=JSON.parse(JSON.stringify(g.companyEconomy)),banks=g.players.map(p=>({id:p.id,book:JSON.parse(JSON.stringify(p.accounting))}));
 const report=[],accepted=new Map(g.players.map(p=>[p.id,[]]));
 for(const company of [...world.companies].sort((a,b)=>a.clientIndex-b.clientIndex)){
  const offers=prepared.flatMap(p=>p.review.orders.filter(o=>o.companyId===company.id).map(order=>({bankId:p.bankId,order}))),
   winner=chooseCompanyCreditOffer(offers,g.cycle,company.clientIndex);
  if(!winner)continue;
  const {companyId,...terms}=winner.order,result=CompanyFinance.originateCredit(world,banks,companyId,winner.bankId,terms);
  world=result.world;banks=result.banks;accepted.get(winner.bankId).push(companyId);
  report.push({companyId,bankId:winner.bankId,principal:terms.principal,annualRateBp:terms.annualRateBp,months:terms.months,
   declinedBankIds:offers.filter(o=>o.bankId!==winner.bankId).map(o=>o.bankId).sort()});
 }
 const reservations=prepared.map(p=>{
  const r=p.review,won=accepted.get(p.bankId),work=r.quotes.filter(q=>won.includes(q.companyId)).reduce((n,q)=>n+q.workQuarters,0),
   capacity=work?Math.min(r.capacity,Math.ceil(work*r.capacity/r.availableQuarters)):0;
  return {bankId:p.bankId,workQuarters:work,capacity,principal:report.filter(r=>r.bankId===p.bankId).reduce((n,r)=>n+r.principal,0)};
 });
 const players=g.players.map(p=>{
  const next=CompanyCreditBank.apply(p,world,banks.find(b=>b.id===p.id).book);
  next._companyCreditOrigination=reservations.find(r=>r.bankId===p.id).capacity;
  next._companyCreditFunded=reservations.find(r=>r.bankId===p.id).principal;
  return next;
 });
 const located=refreshCompanyCreditDeposits({...g,companyEconomy:world,players});
 return {world,players:located.players,marketEconomy:located.marketEconomy,commercialAccounts:located.commercialAccounts,
  _companyCreditAccountOpening:located._companyCreditAccountOpening,reservations,report};
}
