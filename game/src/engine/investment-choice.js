// Deterministic customer preferences, not extra people, assets or permissions.
// Enabled only by investmentChoiceVersion 1. Account identity fixes preferences
// across ownership changes, reloads and provider migrations without consuming RNG.
const InvestmentCustomerChoice=(()=>{
 const profiles=Object.freeze([
  Object.freeze({key:'price',label:'Price-conscious',feeWeight:60,qualityWeight:30,loyalty:3,description:'Fees matter most. A cheaper qualified provider can outweigh an established relationship.'}),
  Object.freeze({key:'service',label:'Service-focused',feeWeight:25,qualityWeight:100,loyalty:10,description:'Reliable delivery and provider service matter. Will accept a higher fee for better service.'}),
  Object.freeze({key:'continuity',label:'Relationship-focused',feeWeight:35,qualityWeight:60,loyalty:18,description:'Values an established relationship, but missed service erodes that preference.'})
 ]);
 function investmentChoiceProfile(client){
  if(!client||typeof client.id!=='string'||!client.id||client.id.length>80)throw Error('Customer preferences require a stable account identity.');
  let hash=2166136261;for(let i=0;i<client.id.length;i++)hash=Math.imul(hash^client.id.charCodeAt(i),16777619)>>>0;
  return profiles[hash%profiles.length];
 }
 function investmentChoiceAssessment(client,entity,reputation,month){
  if(!entity?.policy||![60,90,120].includes(entity.policy.feeBp)||!Number.isFinite(reputation)||reputation<0||reputation>100||!Number.isSafeInteger(month)||month<client.acquired)throw Error('Invalid customer-choice assessment.');
  const p=investmentChoiceProfile(client),incumbent=client.owner===entity.owner;
  // Existing customers judge actual delivery, not a provider migration promise.
  const provider=incumbent?client.custodian:entity.policy.custody==='owned'?entity.owner:entity.policy.provider;
  const quality=provider===entity.owner?1:InvestmentInstitution.PROVIDERS[provider]?.service;
  if(!Number.isFinite(quality))throw Error('Unknown customer delivery provider.');
  const fee=-entity.policy.feeBp*p.feeWeight/100,service=(quality-1)*p.qualityWeight;
  const history=incumbent?Math.min(p.loyalty,Math.max(0,month-client.acquired)*p.loyalty/12):0;
  const interruption=incumbent?-client.missed*15:0;
  const reputationEffect=reputation/10,score=Math.round((100+fee+service+history+interruption+reputationEffect)*100)/100;
  return {profile:p.key,label:p.label,score,acceptable:score>=55,fee,service,history,interruption,reputation:reputationEffect};
 }
 return Object.freeze({profiles,profile:investmentChoiceProfile,assess:investmentChoiceAssessment});
})();
