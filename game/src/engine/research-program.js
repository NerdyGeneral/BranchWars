// Core research programme. The capability tree, its operating models and the
// product/platform gates they drive are the campaign's strategy layer; this
// module owns the rule marker and the accessors every branch-iterating site
// goes through. Adding content directly to STRATEGY_BRANCHES or
// STRATEGY_SPECIALIZATIONS is not an option: management.js compares the branch
// key set exactly, and session.js ships the specialization table into the owner
// view, so both would change shape for campaigns that never opted in.
function researchProgramRules(source){return source?.researchProgramVersion===1}
// Branch and model tables are merged only for campaigns carrying the marker.
// Every earlier campaign sees the original five branches and two models each.
function researchBranchTable(source){return researchProgramRules(source)?RESEARCH_PROGRAM_BRANCHES:STRATEGY_BRANCHES}
function researchModelTable(source){return researchProgramRules(source)?RESEARCH_PROGRAM_SPECIALIZATIONS:STRATEGY_SPECIALIZATIONS}
function researchBranches(source){return Object.keys(researchBranchTable(source))}

// --- one term per branch -------------------------------------------------
// Operations owned both expense/execution AND loss/compliance, which left the
// sixth branch nothing of its own. Under the programme the capability half of
// the loss and compliance terms moves to risk; the Operations *staff* term is
// untouched, so operations bankers still reduce losses exactly as before.
function riskCapability(p,operationsProgress){
 return researchProgramRules(p)?strategyProgress(p,'risk'):operationsProgress;
}
// --- tier grants ---------------------------------------------------------
// delta() clamps reputation/digital/morale/influence/momentum to 0-100. That
// only harms a grant pushing a stat UP: compliance and attention are pushed
// DOWN and their floor at 0 is the point. Measured, digital reached the 100
// ceiling by month 48, so every later tier paid nothing at all -- and digital
// and acquisition were the only branches whose entire grant was a ceiling-bound
// stat. Both gain an unbounded component; the others already had one.
function researchTierGrant(p,branch){
 const s=p.stats,grow=(key,rate,base)=>base+Math.max(0,Math.round((s[key]||0)*rate));
 switch(branch){
  case'network':delta(p,'reputation',3);delta(p,'customers',grow('customers',.02,40));return true;
  case'digital':delta(p,'digital',8);delta(p,'customers',grow('customers',.05,30));return true;
  case'commercial':delta(p,'business',grow('business',.03,4));delta(p,'merchant',grow('merchant',.03,4));return true;
  case'operations':delta(p,'compliance',-5);delta(p,'morale',2);return true;
  case'acquisition':delta(p,'influence',3);delta(p,'business',grow('business',.02,3));delta(p,'merchant',grow('merchant',.02,3));return true;
  case'risk':delta(p,'compliance',-6);delta(p,'attention',-3);return true;
 }
 return false;
}

// --- operating model economics -------------------------------------------
// Every accessor below returns exactly 1 (or 0) for a campaign without the
// marker, so no earlier rule set moves. Magnitudes live here and nowhere else:
// tuning this system means editing this block, not hunting through operate().
//
// The two-model version failed because both options were small one-directional
// bonuses -- measured at +493/+338/-91/-48/+0 against campaign scores in the
// thousands. Each model here therefore carries a COST as well as a benefit, and
// acts on compounding terms (growth rates, expense ratios, loss rates) rather
// than one-off stat grants, which is what saturates.
function researchDigitalLevel(p){return researchProgramRules(p)?strategyProgress(p,'digital'):0}
function modelIs(p,branch,key){return researchProgramRules(p)&&p.specializations&&p.specializations[branch]===key}
// Deposit and customer capacity per unit of service.
function researchServiceMultiplier(p){
 return (modelIs(p,'network','retailDensity')?1.32:1)
  *(modelIs(p,'network','franchisePartners')?1.15:1)
  *(modelIs(p,'digital','customerExperience')?1.18:1)
  *(modelIs(p,'commercial','relationshipBanking')?.98:1);
}
// Deposit conversion rate.
function researchDepositMultiplier(p){
 return (modelIs(p,'network','regionalHub')?1.26:1)
  *(modelIs(p,'digital','customerExperience')?1.12:1)
  *(modelIs(p,'commercial','relationshipBanking')?1.38:1)
  *(modelIs(p,'risk','provisioning')?.94:1);
}
// Recurring operating expense.
function researchExpenseMultiplier(p){
 return (1-researchDigitalLevel(p)*.045)
  *(modelIs(p,'network','retailDensity')?1.04:1)
  *(modelIs(p,'network','franchisePartners')?.70:1)
  *(modelIs(p,'digital','automation')?.82:1)
  *(modelIs(p,'operations','lean')?.80:1)
  *(modelIs(p,'operations','processRedesign')?.86:1)
  *(modelIs(p,'risk','standing')?1.02:1);
}
// Work each service/lending banker gets through.
function researchThroughputMultiplier(p){
 return (researchCombination(p,'straightThrough')?1.18:1)
  *(1+researchDigitalLevel(p)*.055)
  *(modelIs(p,'digital','automation')?1.24:1)
  *(modelIs(p,'operations','processRedesign')?1.34:1)
  *(modelIs(p,'commercial','treasury')?.93:1);
}
// Gross loan origination capacity.
function researchLoanMultiplier(p){
 return (modelIs(p,'commercial','specializedCredit')?1.02:1)
  *(modelIs(p,'risk','provisioning')?.93:1)
  *(modelIs(p,'risk','capitalEfficiency')?1.26:1)
  *(modelIs(p,'digital','dataLedCredit')?1.14:1);
}
// Monthly charge-off rate.
function researchCreditRiskMultiplier(p){
 return (modelIs(p,'commercial','specializedCredit')?1.14:1)
  *(modelIs(p,'risk','provisioning')?.68:1)
  *(modelIs(p,'risk','capitalEfficiency')?1.05:1)
  *(modelIs(p,'digital','dataLedCredit')?.78:1)
  *(modelIs(p,'operations','resilience')?.78:1)
  *(researchCombination(p,'structuredCredit')?.88:1);
}
// Interest earned per dollar of book. specializedCredit bought +22% ORIGINATION,
// which stopped being the constraint once capacity scaled with the balance sheet --
// so it paid a real risk cost for a benefit worth nothing. It now earns a wider
// spread instead, which is what 'specialized credit' should mean.
function researchLoanYieldMultiplier(p){
 return (researchCombination(p,'structuredCredit')?1.15:1)
  *(modelIs(p,'commercial','specializedCredit')?1.30:1)
  *(modelIs(p,'digital','dataLedCredit')?1.12:1)
  *(modelIs(p,'risk','provisioning')?.95:1);
}
// Cost of funding the book. Regulatory standing is what a bank actually gets paid
// for: cheaper money. Its old benefit was two capped stats worth <=182 points
// against a permanent +7% expense, which compounds every month for ten years.
function researchFundingCostMultiplier(p){
 return (researchCombination(p,'depositFranchise')?.90:1)
  *(modelIs(p,'risk','standing')?.82:1)
  *(modelIs(p,'risk','capitalEfficiency')?1.03:1)
  *(modelIs(p,'network','franchisePartners')?1.08:1);
}
// Commercial fee income.
function researchFeeMultiplier(p){
 return (researchCombination(p,'digitalTreasury')?1.22:1)
  *(modelIs(p,'commercial','treasury')?1.28:1)
  *(modelIs(p,'commercial','relationshipBanking')?1.10:1)
  *(modelIs(p,'network','franchisePartners')?.86:1);
}
// Business and merchant relationship acquisition.
function researchRelationshipMultiplier(p){
 return (modelIs(p,'commercial','relationshipBanking')?1.0:1)
  *(modelIs(p,'commercial','treasury')?1.12:1)
  *(modelIs(p,'acquisition','consolidator')?1.14:1);
}
// Rate-sensitive deposit runoff.
function researchRunoffMultiplier(p){
 return (researchCombination(p,'depositFranchise')?.72:1)
  *(modelIs(p,'network','franchisePartners')?1.60:1)
  *(modelIs(p,'digital','customerExperience')?1.08:1)
  *(modelIs(p,'commercial','relationshipBanking')?.70:1)
  *(modelIs(p,'risk','provisioning')?.88:1);
}
// Liquidity reserve held back from origination; capitalEfficiency runs thinner.
function researchReserveMultiplier(p){
 return (modelIs(p,'risk','capitalEfficiency')?.78:1)*(modelIs(p,'risk','provisioning')?1.35:1);
}
// Per-cycle additions to the two penalty stats. Down is good; their floor at 0
// is deliberate, unlike the ceiling that made the digital tier grant worthless.
function researchComplianceDelta(p){
 return (modelIs(p,'risk','standing')?-2.2:0)+(modelIs(p,'commercial','specializedCredit')?1.1:0)
  +(modelIs(p,'risk','capitalEfficiency')?1.3:0);
}
function researchAttentionDelta(p){
 return (modelIs(p,'risk','standing')?-1.4:0)+(modelIs(p,'digital','dataLedCredit')?.7:0)
  +(modelIs(p,'acquisition','consolidator')?.8:0);
}

// --- deploying the balance sheet ----------------------------------------
// Measured at 120 months, Core ran a loan-to-deposit ratio of 8.4% and held
// cash equal to 86% of deposits: $856M gathered, $784M sat idle, $33M lent.
// A real bank runs 60-80% L/D. The cause is that origination capacity was
// LINEAR IN HEADCOUNT (lending * $185,000) while deposits compound, so five
// lending bankers cap the book at ~$925K/month however large the bank grows.
// That is also why every lending-flavoured decision lost: loans were 1.2% of
// final score because the book could never become a material asset.
//
// Bankers still set the pace -- a bank with no lending staff deploys nothing --
// but the balance sheet now sets the ceiling. The gap to target closes
// gradually, so this funds growth rather than teleporting a loan book.
// Swept over 8 (target, rate) pairs x 12 campaigns. These land the loan book at a
// 72% loan-to-deposit ratio -- inside the 60-80% a real bank runs -- with lending at
// 24.5% of final score, the share the owner asked for, and cash down from 86% of
// deposits to 33%. The target is an aspiration the gap closes toward, not an outcome:
// scheduled repayment and the liquidity reserve settle the book below it.
const RESEARCH_TARGET_LOAN_TO_DEPOSIT=.95,RESEARCH_DEPLOYMENT_RATE=.25,RESEARCH_DEPLOYMENT_DESK=4;
function researchDeploymentCapacity(p,lendingStaff){
 if(!researchProgramRules(p))return 0;
 const gap=Math.max(0,p.stats.deposits*RESEARCH_TARGET_LOAN_TO_DEPOSIT-p.stats.loans);
 return gap*RESEARCH_DEPLOYMENT_RATE*Math.min(1,Math.max(0,lendingStaff)/RESEARCH_DEPLOYMENT_DESK);
}

// --- a supply side for Core ---------------------------------------------
// Core has no marketBook and no marketSupply, so delta() bypasses market
// conservation entirely: relationships, customers and deposits come from an
// infinite pool. Measured, a business-tilted bank accumulated ~6,300 business
// and ~4,600 merchant relationships paying $760/$650 each per month -- fee
// income of $15.5M/month against a balanced bank's $529K, and a 40,676 score
// against 14,427. It was not out-playing anything; it was mining.
//
// The engine already knows how much servicing a relationship costs
// (commercialRelationshipWork: business/80 + merchant/150 quarter-FTE-months,
// against business staff x 4). Acquisition now respects it: a bank cannot keep
// winning relationships it has no capacity to serve. Fee COVERAGE already
// scaled down past capacity; what was missing is that ACQUISITION did not.
// Relationships need somewhere to be served from. Measured at 120 months, a
// business-tilted bank held 11,413 business + 7,424 merchant relationships across
// 36 branch levels -- 523 per branch, against a balanced bank's 25 -- paying
// $23.8M/month in fees and beating base by +18,806 (12/12 campaigns). An earlier
// version of this cap keyed off BUSINESS STAFF, which scale with the very tilt
// being capped, so it never bound. Branch levels are Core's only measure of
// physical presence, so they are the anchor.
//
// Below capacity this returns exactly 1: a balanced bank (593 relationships
// against a 2,980 ceiling) is untouched. Past it, acquisition decays sharply.
function researchRelationshipCapacity(p){return 100+branchLevels(p)*120}
function researchRelationshipSaturation(p){
 if(!researchProgramRules(p))return 1;
 const held=(p.stats.business||0)+(p.stats.merchant||0),cap=researchRelationshipCapacity(p);
 if(held<=cap)return 1;
 const ratio=cap/held;
 return Math.max(.02,ratio*ratio);
}

// --- cross-branch combinations ------------------------------------------
// Research reaching other systems. Each of these needs TWO branches and grants
// something neither gives alone, so two banks that bought the same tree in a
// different order run measurably different economics. Core has none of the
// extended subsystems (no service desk, retail lifecycle, product programmes or
// department functions), so these hang off the capability levels directly.
const RESEARCH_COMBINATIONS=Object.freeze({
 digitalTreasury:{name:'Digital Treasury',requires:{digital:2,commercial:2},
  desc:'Business customers self-serve: treasury fees without the servicing headcount.'},
 branchIntegration:{name:'Branch Integration',requires:{network:2,acquisition:2},
  desc:'Acquired and new sites convert to your operating model at lower cost.'},
 straightThrough:{name:'Straight-Through Processing',requires:{operations:3,digital:2},
  desc:'Work clears without handling; every banker covers materially more.'},
 structuredCredit:{name:'Structured Credit',requires:{risk:2,commercial:2},
  desc:'Priced and tranched lending: wider spread at lower loss.'},
 depositFranchise:{name:'Deposit Franchise',requires:{network:3,risk:2},
  desc:'Relationships stay through a rate cycle, and funding costs less.'}
});
function researchCombination(p,key){
 if(!researchProgramRules(p))return false;
 const def=RESEARCH_COMBINATIONS[key];
 if(!def)return false;
 for(const [branch,level] of Object.entries(def.requires))if(strategyLevel(p,branch)<level)return false;
 return true;
}
function researchCombinations(p){return Object.keys(RESEARCH_COMBINATIONS).filter(k=>researchCombination(p,k))}
// --- product gating -----------------------------------------------------
// Hard gate plus improve. The first option of every line is always available, so
// no bank is ever left without a product; the stronger options must be earned,
// and two of them require a combination rather than a single branch.
const RESEARCH_PRODUCT_GATES=Object.freeze({
 retail:{rewards:{network:1},highYield:{digital:1}},
 business:{treasury:{commercial:1},entrepreneur:{digital:1,commercial:1}},
 credit:{middleMarket:{commercial:1},consumer:{risk:1}}
});
function researchProductBarred(p,line,key){
 if(!researchProgramRules(p))return '';
 const gate=RESEARCH_PRODUCT_GATES[line]&&RESEARCH_PRODUCT_GATES[line][key];
 if(!gate)return '';
 const missing=Object.entries(gate).filter(([branch,level])=>strategyLevel(p,branch)<level);
 if(!missing.length)return '';
 return missing.map(([branch,level])=>researchBranchTable(p)[branch].name+' tier '+level).join(' and ');
}
function initializeResearchProgram(g,o){
 if(o.researchProgramVersion!==1)return;
 g.researchProgramVersion=1;
 for(const p of g.players){
  p.researchProgramVersion=1;
  for(const key of Object.keys(RESEARCH_PROGRAM_BRANCHES))if(p.capability[key]===undefined)p.capability[key]=0;
 }
}
function validateResearchProgram(source,context){
 const enabled=source.researchProgramVersion===1;
 if(source.version==='8.20'&&!enabled)throw Error('Missing research programme rules.');
 if(source.researchProgramVersion!==undefined&&!enabled)throw Error('Unsupported research programme rules.');
 if(enabled)validateCampaignRules(source,context);
 const owners=context==='game'?source.players:[source.me];
 if(owners.some(p=>p.researchProgramVersion!==(enabled?1:undefined))||source.rival?.researchProgramVersion!==undefined)
  throw Error('Invalid research programme owner rules.');
 if(!enabled)return;
 for(const p of owners){
  const allowed=researchBranches(p);
  for(const key of Object.keys(p.capability||{}))
   if(!allowed.includes(key))throw Error('Unknown research branch in the capability book.');
  for(const key of Object.keys(p.specializations||{}))
   if(!researchModelTable(p)[key]||!researchModelTable(p)[key][p.specializations[key]])
    throw Error('Unknown operating model in the research programme.');
 }
}
function projectResearchProgram(g,out){
 if(g.researchProgramVersion!==1)return;
 out.researchProgramVersion=1;out.me.researchProgramVersion=1;
 out.strategyBranches=JSON.parse(JSON.stringify(RESEARCH_PROGRAM_BRANCHES));
 out.strategySpecializations=JSON.parse(JSON.stringify(RESEARCH_PROGRAM_SPECIALIZATIONS));
 out.capabilityTiers=Object.fromEntries(researchBranches(g).map(k=>[k,[...CAPABILITY_TIERS[k]]]));
 out.researchCombinations=JSON.parse(JSON.stringify(RESEARCH_COMBINATIONS));
 out.me.researchCombinations=researchCombinations(g.players.find(p=>p.id===out.me.id));
 out.me.researchProductGates=Object.fromEntries(Object.entries(RESEARCH_PRODUCT_GATES).map(([line,gates])=>
  [line,Object.fromEntries(Object.keys(gates).map(k=>[k,researchProductBarred(g.players.find(p=>p.id===out.me.id),line,k)]))]));
}

// The bot picks products by doctrine and rate environment (ai.js), including the
// gated ones. Downgrade rather than let it submit an illegal plan; the first
// option of each line is always available, so this can never leave it productless.
const researchPriorChooseBot=chooseBot;
chooseBot=function(g,index){
 const plan=researchPriorChooseBot(g,index),p=g.players[index];
 if(plan&&plan.products&&researchProgramRules(p))
  for(const [line,key] of Object.entries(plan.products))
   if(researchProductBarred(p,line,key))plan.products[line]=Object.keys(PRODUCT_PORTFOLIOS[line].options)[0];
 return plan;
};
