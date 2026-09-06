function depositLedgerSummary(p,g){
 const d=depositSummary(p,g);return d?{...(p.segmentDeposits?{segments:Object.fromEntries(Object.entries(d.markets).map(([key,rows])=>[key,Object.fromEntries(Object.entries(rows).map(([s,r])=>[s,{principal:r.principal,locked:r.locked,exiting:r.exiting}]))]))}:{}),...(p.management?{management:JSON.parse(JSON.stringify(p.management))}:{}),serviceDesk:p.serviceDesk?JSON.parse(JSON.stringify(p.serviceDesk)):null,agreements:p.serviceContracts?[...p.serviceContracts]:null,advertising:p.contractAds?{...p.contractAds}:null,deployment:p.productDeployment?{...p.productDeployment.ready}:null,mix:p.retailLifecycle?{...p.retailLifecycle.mix}:null,term:termSummary(p),interest:d.interest,fees:d.fees,service:d.service,guaranteed:Object.values(d.rows).reduce((n,r)=>n+r.guaranteed,0),renewing:Object.values(d.rows).reduce((n,r)=>n+r.renewing,0)}:null;
}
let ledgerContext=null;
const ledgerCopy=x=>JSON.parse(JSON.stringify(x));
// Validate imported history once at the migration boundary, not on every RNG call.
function validateLedger(g){
 const fail=()=>{throw Error('Invalid saved event ledger. Restore an earlier export; this save was not loaded.')};
 if(g.ledgerVersion!==undefined&&g.ledgerVersion!==1)throw Error('Unsupported event ledger version.');
 const events=g.eventLedger===undefined?[]:g.eventLedger;
 if(!Array.isArray(events)||events.length>2000)fail();
 const uint=n=>Number.isSafeInteger(n)&&n>=0;
 const pruned=g.ledgerPrunedThrough===undefined?0:g.ledgerPrunedThrough;
 if(!uint(pruned))fail();
 const sources={'customers.offers':'applyRelationshipOfferPolicy','economy.external':'settleRegionalGrowth','advertising.policy':'applyAdvertisingPolicy','products.policy':'applyProductProgramPolicy','resolution.start':'resolveCycle','operations.result':'operate',decision:'applyDecision','capital.assistance':'applyCapitalRequest','competition.actions':'resolveCompetitiveActions','project.start':'startProject',operations:'operate','funding.deleverage':'deleverage','competition.deposits':'depositContest','funding.settlement':'settleFunding',relationships:'resolveOpportunities','markets.competition':'simulateMarkets','markets.exit':'resolveMarketExits','markets.dividend':'franchiseDividends','project.advance':'advanceProjects','risk.consequences':'consequences','research.investment':'applyInvestments','staff.hiring':'applyHiring','staff.training':'settleWorkforceTraining',milestones:'awardMilestones','campaign.ending':'evaluateStrategicEnd'};
 const fields=new Set(['relationshipOffers','regionalFlow','advertising','productPrograms','householdBook','workforce','customerRelationships','depositProducts','fundingCovenant','creditSummary','marketBook','regionalOperations','projects','branches','facilities','facilityMarkets','capability','specializations','allocation','achievements','marketingTurns','fundingGap','distress','capitalRequests','boardConcessions','capitalRestriction','hiresTotal','turnEffects','markets','ending']);
 function tree(x,depth=0){if(depth>12)fail();if(x===null||typeof x==='boolean')return;if(typeof x==='number'){if(!Number.isFinite(x))fail();return}if(typeof x==='string'){if(x.length>500)fail();return}if(!x||typeof x!=='object')fail();for(const[k,v]of Object.entries(x)){if(['__proto__','constructor','prototype'].includes(k))fail();tree(v,depth+1)}}
 let previous=pruned;const byId=new Map();
 for(const e of events){
  if(!e||!uint(e.id)||e.id<=previous||!Number.isInteger(e.cycle)||e.cycle<1||e.cycle>g.cycle||e.visibility!=='owner'||!g.players.some(p=>p.id===e.target)||!Object.prototype.hasOwnProperty.call(sources,e.category)||e.source!==sources[e.category])fail();
  if(Object.keys(e).some(k=>!['id','cycle','category','source','target','visibility','resolutionId','parentCause','report','deltas','changes'].includes(k)))fail();
  if(e.category==='resolution.start'){if(!uint(e.resolutionId)||e.resolutionId<1)fail()}
  else if(e.category==='operations.result'){if(!e.report||typeof e.report!=='object'||!Object.values(e.report).every(Number.isFinite)||e.report.cycle!==e.cycle)fail()}
  else{
   if(!uint(e.parentCause)||e.parentCause>=e.id||!e.deltas||Array.isArray(e.deltas)||!e.changes||Array.isArray(e.changes))fail();
   const parent=byId.get(e.parentCause);if(e.parentCause>pruned&&(!parent||parent.category!=='resolution.start'||parent.target!==e.target||parent.cycle!==e.cycle))fail();
   for(const[k,n]of Object.entries(e.deltas))if(!Object.prototype.hasOwnProperty.call(OPENING_STATS,k)||!Number.isFinite(n))fail();
   for(const[k,v]of Object.entries(e.changes))if(!fields.has(k)||!v||!Object.prototype.hasOwnProperty.call(v,'before')||!Object.prototype.hasOwnProperty.call(v,'after'))fail();
  }
  tree(e);previous=e.id;byId.set(e.id,e);
 }
 const sequence=g.ledgerSequence===undefined?previous:g.ledgerSequence;
 if(!uint(sequence)||sequence!==previous)fail();
 // Assign only after the full record validates, so a rejected import is not partly repaired.
 g.ledgerVersion=1;if(g.eventLedger!==undefined){g.ledgerSequence=sequence}
 return g
}
function appendLedger(g,event){g.eventLedger=g.eventLedger||[];g.ledgerSequence=g.ledgerSequence||0;g.eventLedger.push({id:++g.ledgerSequence,...event});if(g.eventLedger.length>2000){const dropped=g.eventLedger.splice(0,g.eventLedger.length-2000);g.ledgerPrunedThrough=dropped[dropped.length-1].id}return g.ledgerSequence}
function ledgerPosition(g,p,index){return ledgerCopy({...(p.relationshipOffers?{relationshipOffers:p.relationshipOffers}:{}),...(p.advertising?{advertising:{policy:p.advertising.policy,lastCycle:p.advertising.lastCycle,report:p.advertising.report?{spent:p.advertising.report.spent,depositIntake:p.advertising.report.depositIntake,householdIntake:p.advertising.report.householdIntake,assistedDeposits:p.advertising.report.assistedDeposits,assistedHouseholds:p.advertising.report.assistedHouseholds}:null}}:{}),...(p.productPrograms?{productPrograms:p.productPrograms}:{}),...(p.householdBook?{householdBook:p.householdBook}:{}),...(p.workforce?{workforce:p.workforce}:{}),...(p.customerRelationships?{customerRelationships:p.customerRelationships}:{}),depositProducts:depositLedgerSummary(p,g),fundingCovenant:p.fundingCovenant||null,creditSummary:creditSummary(p),marketBook:p.marketBook||null,regionalOperations:p.regionalOperations||null,stats:p.stats,projects:p.projects,branches:p.branches,facilities:p.facilities,facilityMarkets:p.facilityMarkets,capability:p.capability,specializations:p.specializations,allocation:p.allocation,achievements:p.achievements,marketingTurns:p.marketingTurns,fundingGap:p.fundingGap,distress:p.distress,capitalRequests:p.capitalRequests,boardConcessions:p.boardConcessions,capitalRestriction:p.capitalRestriction,hiresTotal:p.hiresTotal,turnEffects:p.turnEffects,markets:Object.fromEntries(Object.entries(g.territories).map(([key,t])=>[key,{share:t.shares[index],exited:!!(t.exited&&t.exited[index]),exitStreak:t.exitStreak&&t.exitStreak[index]||0}])),ending:{gameOver:g.gameOver,winnerId:g.winnerId,endReason:g.endReason||null}})}
function recordLedgerStage(g,source,category,run){if(!ledgerContext||ledgerContext.g!==g)return run();const before=g.players.map((p,i)=>ledgerPosition(g,p,i)),result=run();g.players.forEach((p,i)=>{const after=ledgerPosition(g,p,i),deltas={},changes={};for(const k of Object.keys(after.stats)){const n=after.stats[k]-before[i].stats[k];if(n)deltas[k]=n}for(const k of Object.keys(after)){if(k!=='stats'&&JSON.stringify(before[i][k])!==JSON.stringify(after[k]))changes[k]={before:before[i][k],after:after[k]}}if(Object.keys(deltas).length||Object.keys(changes).length)appendLedger(g,{cycle:ledgerContext.cycle,parentCause:ledgerContext.parents[i],category,source,target:p.id,visibility:'owner',deltas,changes})});return result}
function ledgerStage(source,category,fn){return (g,...args)=>recordLedgerStage(g,source,category,()=>fn(g,...args))}

// External population/savings flows are not bank earnings or balance-sheet deltas.
// Publish only the shared boundary totals, never the private conservation anchors.
function settleRegionalGrowthWithLedger(g){
 const summary=r=>r?ledgerCopy({cycle:r.cycle,regime:r.regime,totals:r.totals}):null;
 const before=summary(g.regionalGrowth?.report),last=g.regionalGrowth?.lastCycle;
 const lines=settleRegionalGrowth(g);
 if(g.regionalGrowthVersion===1&&g.regionalGrowth.lastCycle!==last&&ledgerContext?.g===g){
  const after=summary(g.regionalGrowth.report);
  g.players.forEach((p,i)=>appendLedger(g,{cycle:ledgerContext.cycle,parentCause:ledgerContext.parents[i],
   category:'economy.external',source:'settleRegionalGrowth',target:p.id,visibility:'owner',
   deltas:{},changes:{regionalFlow:{before,after}}}));
 }
 return lines;
}


applyDecision=ledgerStage('applyDecision','decision',applyDecision);
applyCapitalRequest=ledgerStage('applyCapitalRequest','capital.assistance',applyCapitalRequest);
resolveCompetitiveActions=ledgerStage('resolveCompetitiveActions','competition.actions',resolveCompetitiveActions);
startProject=ledgerStage('startProject','project.start',startProject);

deleverage=ledgerStage('deleverage','funding.deleverage',deleverage);
depositContest=ledgerStage('depositContest','competition.deposits',depositContest);
settleFunding=ledgerStage('settleFunding','funding.settlement',settleFunding);
resolveOpportunities=ledgerStage('resolveOpportunities','relationships',resolveOpportunities);
simulateMarkets=ledgerStage('simulateMarkets','markets.competition',simulateMarkets);
resolveMarketExits=ledgerStage('resolveMarketExits','markets.exit',resolveMarketExits);
franchiseDividends=ledgerStage('franchiseDividends','markets.dividend',franchiseDividends);
advanceProjects=ledgerStage('advanceProjects','project.advance',advanceProjects);
consequences=ledgerStage('consequences','risk.consequences',consequences);
applyInvestments=ledgerStage('applyInvestments','research.investment',applyInvestments);
applyHiring=ledgerStage('applyHiring','staff.hiring',applyHiring);
awardMilestones=ledgerStage('awardMilestones','milestones',awardMilestones);
evaluateStrategicEnd=ledgerStage('evaluateStrategicEnd','campaign.ending',evaluateStrategicEnd);
// N-02b accounting prototype. Deliberately not authoritative for v1/v2 saves.
// All amounts are whole dollars. No runtime residual-balancing account exists.
