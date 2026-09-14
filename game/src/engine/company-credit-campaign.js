// Explicit new-campaign boundary. Setup keeps the current Expanded default
// until customer controls, AI and release integration have passed their gates.
function initializeCompanyCredit(g,o){
 if(o.companyCreditVersion!==1)return;
 if(g.sharedPremisesVersion!==1)throw Error('Named-company credit requires the integrated premises foundation.');
 const world=CompanyFinance.withCredit(g.companyEconomy),players=g.players.map(p=>CompanyCreditBank.apply(p,world,p.accounting));
 g.companyEconomy=world;g.players=players;g.companyCreditVersion=1;
}
// Pure domain results must not replace live owner identities: pricing traces
// and other turn-scoped WeakMaps are attached before these financial stages.
function commitCompanyCreditState(g,result){
 if(result.players.length!==g.players.length||g.players.some((p,i)=>p.id!==result.players[i].id))throw Error('Company-credit owners changed during settlement.');
 for(const [i,p]of g.players.entries()){
  const next=result.players[i];for(const k of Object.keys(p))if(!Object.hasOwn(next,k))delete p[k];Object.assign(p,next);
 }
 for(const k of ['companyEconomy','marketEconomy','commercialAccounts','_companyCreditAccountOpening'])g[k]=result[k];
}
function normalizeCompanyCreditPlan(g,p,plan){
 if(!p.companyCredit){if(plan.companyCreditOrders!==undefined)throw Error('Named-company lending is not enabled in this campaign.');return;}
 const orders=companyCreditOrders(plan.companyCreditOrders===undefined?[]:plan.companyCreditOrders);
 if(orders.length){const review=companyCreditOrderReview(g,p,plan,orders);if(!review.eligible)throw Error(review.reason);}
 plan.companyCreditOrders=orders;
}
function validateCompanyCreditHistory(plan){
 if(plan?.companyCreditOrders===undefined)return;
 for(const {companyId,...terms}of companyCreditOrders(plan.companyCreditOrders))CompanyCredit.checkTerms(terms);
}
function companyCreditLedgerReport(report){
 const {companyCredit,...flat}=report;
 if(!companyCredit||Object.keys(companyCredit).sort().join()!=='advanced,interest,interestPaid,interestWrittenOff,principalPaid,principalWrittenOff,recoveredInterest,recoveredPrincipal'||Object.values(companyCredit).some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Invalid company-credit operating result.');
 for(const [key,value]of Object.entries(companyCredit))flat['companyCredit'+key[0].toUpperCase()+key.slice(1)]=value;
 return flat;
}
function validateCompanyCreditCampaign(g){
 if(g._companyCreditAccountOpening!==undefined||g.players.some(p=>Object.keys(p).some(k=>k.startsWith('_companyCredit')||k==='_corporateCreditPreview')))throw Error('Unfinished company-credit settlement cannot be saved.');
 const plans=[...g.players.map(p=>p.submitted),...Object.values(g.lastPlans||{})];
 if(g.companyCreditVersion===undefined){
  if(g.players.some(p=>p.companyCredit!==undefined)||plans.some(p=>p?.companyCreditOrders!==undefined)||g._companyCreditAccountOpening!==undefined)throw Error('Unversioned named-company credit.');return;
 }
 if(g.companyCreditVersion!==1||g.sharedPremisesVersion!==1||g.version!==campaignVersion(g)||g.companyEconomy?.version!==7)throw Error('Company credit rules do not match the campaign.');
 const ids=g.players.map(p=>p.id);
 if(g.companyEconomy.credit.notes.some(n=>!ids.includes(n.bankId)))throw Error('Company loan has an unknown lender.');
 for(const p of g.players){CompanyCreditBank.validate(p,g.companyEconomy);if(p.submitted)normalizeCompanyCreditPlan(g,p,JSON.parse(JSON.stringify(p.submitted)));}
 for(const plan of Object.values(g.lastPlans||{}))validateCompanyCreditHistory(plan);
}
function projectCompanyCredit(g,out,index){
 const rival=g.players[1-index];
 if(g.companyCreditVersion===1){out.companyCreditVersion=1;out.me.companyCredit=JSON.parse(JSON.stringify(g.players[index].companyCredit));}
 delete out.rival.companyCredit;
 if(out.lastPlans?.[rival.id])delete out.lastPlans[rival.id].companyCreditOrders;
}
function validateCompanyCreditView(v){
 if(v._companyCreditAccountOpening!==undefined||Object.keys(v.me||{}).some(k=>k.startsWith('_companyCredit')||k==='_corporateCreditPreview'))throw Error('Unfinished company-credit view.');
 if(v.rival?.companyCredit!==undefined||v.rival?.submitted?.companyCreditOrders!==undefined||v.lastPlans?.[v.rival?.id]?.companyCreditOrders!==undefined)throw Error('Private rival company-credit plan exposed.');
 if(v.companyCreditVersion===undefined){if(v.me?.companyCredit!==undefined||v.me?.submitted?.companyCreditOrders!==undefined||Object.values(v.lastPlans||{}).some(p=>p?.companyCreditOrders!==undefined))throw Error('Unversioned company-credit view.');return;}
 if(v.companyCreditVersion!==1||v.sharedPremisesVersion!==1||v.version!==campaignVersion(v)||v.me.companySnapshot?.world.version!==7)throw Error('Company credit view rules do not match.');
 if(v.me.companySnapshot.world.credit.notes.some(n=>![v.me.id,v.rival.id].includes(n.bankId)))throw Error('Company loan has an unknown lender.');
 CompanyCreditBank.validate(v.me,v.me.companySnapshot.world);
 if(v.me.submitted&&typeof v.me.submitted==='object')normalizeCompanyCreditPlan(v,v.me,JSON.parse(JSON.stringify(v.me.submitted)));
 for(const plan of Object.values(v.lastPlans||{}))validateCompanyCreditHistory(plan);
}
function settleCompanyCreditOrders(g,plans){
 if(g.companyCreditVersion!==1)return [];
 const result=fundCompanyCreditOrders(g,g.players.map((p,i)=>({bankId:p.id,plan:plans[i],orders:plans[i].companyCreditOrders||[]})));
 commitCompanyCreditState(g,{...result,companyEconomy:result.world});
 return result.report.map(r=>g.players.find(p=>p.id===r.bankId).name+' funded $'+r.principal.toLocaleString()+' of company credit for '+ANCHOR_CLIENTS[g.companyEconomy.companies.find(c=>c.id===r.companyId).clientIndex].name+'.');
}
