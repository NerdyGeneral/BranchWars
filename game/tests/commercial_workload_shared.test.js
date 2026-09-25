'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),html=require('../tools/build_game').assemble().html;
function load(html,probe=false){const c={},script=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];vm.runInNewContext(probe?script.replace('root.BWEngine={','root.workProbe=commercialRelationshipWork;root.BWEngine={'):script,c);return c;}
const current=load(html,true),E=current.BWEngine;
test('shared servicing preserves left-associated fractional offer work and dispatch agrees with fee coverage',()=>{
 for(const b of [0,1,58,79,80,81,257,999])for(const m of [0,1,38,149,150,151,987])for(const offer of [0,1/3,.1,2.125,100/7]){
  assert.equal(current.workProbe(b,m,offer),offer+b/80+m/150);
  assert.equal(E.CommercialFeeEconomics.quote(b,m,5).workload,current.workProbe(b,m));
 }
 const g=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true}).options,commercialServiceVersion:1,creditWorkloadVersion:1,bankEconomicsVersion:1,seed:'workload-shared',created:1});
 const p=g.players[0],plan=E.chooseBot(copy(g),0),before=JSON.stringify({g,plan}),q=E.departmentFunctionsQuote(g,p,plan),fees=E.CommercialFeeEconomics.quote(p.stats.business,p.stats.merchant,100);
 assert(q.status.eligible,q.status.reason);assert.equal(q.taskWorkloads.commercialRelationships,fees.workload);
 assert.equal(q.rawWorkloads.relationships,current.workProbe(p.stats.business,p.stats.merchant,q.taskWorkloads.offerSales));
 assert.equal(JSON.stringify({g,plan}),before);
});
test('existing 8.18 and 9.32 campaigns keep exact creation, AI, RNG, settlement and private views',()=>{
 const prior=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_bank_economics_225d28be.html'),'utf8');assert.equal(createHash('sha256').update(prior).digest('hex'),'225d28bee6d9a1aa80e9c8f5e43941e35bc2c56466abc87b3f4cd545f3e5c94b');const old=load(prior).BWEngine;
 for(const edition of ['core','expanded']){
  const o={...old.previewCampaignEdition({},edition,{currentReporting:true}).options,commercialServiceVersion:1,bankEconomicsVersion:1,...(edition==='expanded'?{creditWorkloadVersion:1}:{}),seed:'workload-replay',created:1,mode:'hotseat'},a=old.createGame(o),b=E.createGame(o);
  assert.deepEqual(copy(b),copy(a));
  for(let m=0;m<2;m++){
   const x=a.players.map((_,i)=>old.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(y),copy(x));
   for(const seat of [0,1]){old.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}
   assert.deepEqual(copy(b),copy(a));for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(old.publicState(a,seat)));
  }
 }
});
