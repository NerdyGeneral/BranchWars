const RETAIL_PLATFORM={essential:0,rewards:12000,highYield:10000};
function validateRetailMix(mix){
 const keys=Object.keys(RETAIL_PLATFORM);
 if(!mix||typeof mix!=='object'||Array.isArray(mix)||Object.keys(mix).length!==keys.length||keys.some(k=>!Number.isInteger(mix[k])||mix[k]<0||mix[k]>4)||keys.reduce((n,k)=>n+mix[k],0)===0)throw Error('Keep at least one retail offer open; sales emphasis must be 0 to 4.');
}
function applyRetailMix(p,mix){
 validateRetailMix(mix);p.retailLifecycle.mix={...mix};
 p.products.retail=Object.keys(RETAIL_PLATFORM).sort((a,b)=>mix[b]-mix[a])[0];
}
const retailOption=productOption;
productOption=function(p,line){
 if(line!=='retail'||!p.retailLifecycle)return retailOption(p,line);
 const mix=p.retailLifecycle.mix,total=Object.values(mix).reduce((n,v)=>n+v,0),out={name:'Retail offer mix'};
 for(const field of ['deposits','customers','funding','digital','sensitive','reputation']){
  out[field]=0;
  for(const [key,weight]of Object.entries(mix)){
   const option=retailOption({...p,products:{...p.products,retail:key}},line);
   out[field]+=weight*(option[field]===undefined?['sensitive','reputation'].includes(field)?0:1:option[field])/total;
  }
 }
 return out;
};
function initializeRetailOffers(g,o){
 if(g.termFundingVersion!==1||o.retailLifecycleVersion===0)return g;
 g.retailLifecycleVersion=1;for(const p of g.players)p.retailLifecycle={version:1,mix:{essential:4,rewards:0,highYield:0}};
 return g;
}

function planRetailMix(g,index,plan){
 const p=g.players[index];
 if(!p.retailLifecycle)return plan;
 const preferred=plan.products.retail;
 plan.retailMix={essential:preferred==='essential'?4:1,rewards:preferred==='rewards'?3:0,highYield:preferred==='highYield'?3:0};
 if(p.stats.lastProfit<0||fundingPosition(p).excess>0)plan.retailMix={essential:4,rewards:0,highYield:0};
 return plan;
}

function validateRetailSave(g){
 if(g.retailLifecycleVersion===undefined){if(g.players.some(p=>p.retailLifecycle))throw Error('Unversioned retail lifecycle');return g}
 if(g.retailLifecycleVersion!==1||g.termFundingVersion!==1)throw Error('Unsupported retail lifecycle save');
 for(const p of g.players){
  if(!p.retailLifecycle||p.retailLifecycle.version!==1)throw Error('Invalid retail lifecycle');
  validateRetailMix(p.retailLifecycle.mix);if(p.submitted)validateRetailMix(p.submitted.retailMix);
 }
 return g;
}
// Product deployment v1: research unlocks a staffed rollout, not immediate sales.
