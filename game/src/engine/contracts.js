const CONTRACT_FEE=8000,CONTRACT_SERVICE=2000,CONTRACT_TERM=6;
PROJECTS.contractAdvertising={name:'Targeted Relationship Advertising',desc:'Four future turns of +3 bid strength for service agreements in the selected market. No guaranteed win, deposits, or broad market bonus.',cost:24000,cycles:1,capacity:1,target:true,kind:'contractAdvertising',contractOnly:true};
function contractIncome(p){
 const count=(p.serviceContracts||[]).length,served=Math.min(count,p.allocation.business);
 return {count,served,fees:served*CONTRACT_FEE,cost:count*CONTRACT_SERVICE};
}
function contractPower(g,p,c){
 const load=contractIncome(p),incumbent=c.owner===p.id;
 return p.allocation.business*2+p.allocation.operations*.5+Math.min(3,p.branches[c.market]||0)*1.5+strategyLevel(p,'commercial')+p.stats.reputation/40+(incumbent?(load.served===load.count?2:-3):0)+(p.contractAds&&p.contractAds.market===c.market&&p.contractAds.expires>=g.cycle?3:0);
}
function initializeServiceContracts(g,o){
 if(g.productDeploymentVersion!==1||o.contractRulesVersion===0)return g;
 g.contractRulesVersion=1;g.serviceAgreements=Object.keys(g.territories).map((market,i)=>({id:'service-'+market,market,owner:null,due:1+i}));
 for(const p of g.players){p.serviceContracts=[];p.contractAds=null}return g;
}
const contractReport=adjustDepositReport;
adjustDepositReport=function(p,g,r){
 contractReport(p,g,r);if(!p.serviceContracts)return;
 const c=contractIncome(p);r.contractFees=c.fees;r.contractServicing=c.cost;r.contractsServed=c.served;
 r.otherIncome+=c.fees;r.expense+=c.cost;r.profit+=c.fees-c.cost;
};
const contractCatalog=projectCatalog;
projectCatalog=function(p){const out=contractCatalog(p);if(!p.serviceContracts)delete out.contractAdvertising;return out};



const contractResolve=resolveOpportunities;
resolveOpportunities=function(g,plans){
 const L=contractResolve(g,plans);if(g.contractRulesVersion!==1)return L;
 for(const c of g.serviceAgreements){
  if(c.due!==g.cycle)continue;
  let winner=null,best=10+simulationRandom()*4;
  // Incumbents are evaluated automatically; a rival must explicitly pursue this agreement.
  for(let i=0;i<g.players.length;i++){
   const p=g.players[i];if(p.allocation.business<1||(c.owner!==p.id&&plans[i].contractBid!==c.id))continue;
   const score=contractPower(g,p,c)+simulationRandom()*4;
   if(score>best){best=score;winner=p.id}
  }
  const prior=c.owner;c.owner=winner;c.due=g.cycle+CONTRACT_TERM;
  const name=winner?g.players.find(p=>p.id===winner).name:'Outside providers';
  L.push(name+(prior===winner?' retained':' won')+' the renewable service agreement in '+g.territories[c.market].name+'. Next contest: cycle '+c.due+'.');
 }
 for(const p of g.players)p.serviceContracts=g.serviceAgreements.filter(c=>c.owner===p.id).map(c=>c.id);
 return L;
};

function planContractBid(g,index,plan){
 if(g.contractRulesVersion!==1)return plan;
 const p=g.players[index],due=g.serviceAgreements.filter(c=>c.due===g.cycle&&c.owner!==p.id);
 if(plan.allocation.business>0&&due.length){const candidate=due.sort((a,b)=>contractPower(g,p,b)-contractPower(g,p,a)||a.id.localeCompare(b.id))[0];if(contractPower(g,p,candidate)>=8){plan.contractBid=candidate.id;plan.opportunity=null}else plan.contractBid=null}
 else plan.contractBid=null;
 return plan;
}

function validateContractSave(g){
 if(g.contractRulesVersion===undefined){if(g.serviceAgreements||g.players.some(p=>p.serviceContracts||p.contractAds||(p.projects||[]).some(x=>x.key==='contractAdvertising')))throw Error('Unversioned service contracts');return g}
 if(g.contractRulesVersion!==1||g.productDeploymentVersion!==1||!Array.isArray(g.serviceAgreements)||g.serviceAgreements.length!==Object.keys(g.territories).length)throw Error('Invalid service contracts');
 const seen=new Set();
 for(const c of g.serviceAgreements){
  if(!c||!g.territories[c.market]||c.id!=='service-'+c.market||seen.has(c.id)||!Number.isSafeInteger(c.due)||c.due<g.cycle||c.due>g.cycle+CONTRACT_TERM||(c.owner!==null&&!g.players.some(p=>p.id===c.owner)))throw Error('Invalid service agreement');
  seen.add(c.id);
 }
 for(const p of g.players){
  const expected=g.serviceAgreements.filter(c=>c.owner===p.id).map(c=>c.id);
  if(!Array.isArray(p.serviceContracts)||JSON.stringify(p.serviceContracts)!==JSON.stringify(expected))throw Error('Service contract ownership mismatch');
  const ad=p.contractAds;
  if(ad!==null&&(!ad||!g.territories[ad.market]||!Number.isSafeInteger(ad.expires)||ad.expires<1||ad.expires>g.cycle+4))throw Error('Invalid targeted advertising');
  if(p.submitted&&p.submitted.contractBid!=null){const c=g.serviceAgreements.find(c=>c.id===p.submitted.contractBid);if(!c||c.due!==g.cycle||p.submitted.allocation.business<1||p.submitted.opportunity)throw Error('Invalid service contract bid')}
 }
 return g;
}
// Service expansion v1: dedicated capacity, cross-capability applications and priced renewals.
// Kept behind a new-game flag; existing contract-v1 campaigns retain their economics.
