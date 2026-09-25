'use strict';
// Freeze the released V2 bytes, not an environment-specific checkpoint path.
// The stabilization release changed transport/storage only; its engine is V2.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const baselinePath=path.join(root,'../V2 release/BRANCH_WARS.html');
const baseline=fs.readFileSync(baselinePath,'utf8');
assert.equal(createHash('sha256').update(fs.readFileSync(baselinePath)).digest('hex'),
 'b041ed53394575872e32888f542232225e15b61deef73a07e7f20b020f25e1e4',
 'Preserved release changed; do not regenerate legacy expectations to accommodate drift.');
const candidate=process.argv.includes('--source')?require('../tools/build_game.js').assemble().html:
 fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
function load(html){
 const script=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
 const math=Object.create(Math);math.random=()=>.375;
 const context={console,Math:math,Date:class extends Date{static now(){return 123456;}}};
 vm.runInNewContext(script,context);return context.BWEngine;
}
const old=load(baseline),current=load(candidate),engines=[old,current];
let profiles=0,months=0,humanMonths=0;
for(const rules of [1,2])for(const scenario of ['balanced','rate','regulatory','growth'])for(const seed of [0,20]){
 const options=old.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options;
 const config={...options,scenario,seed:'agency-legacy:'+seed,created:1,mode:'hotseat'};
 const games=engines.map(E=>E.createGame(config)),label=`Group ${rules}/${scenario}/${seed}`;
 assert.deepEqual(copy(games[1]),copy(games[0]),label+' creation drift');
 assert.equal(games[1].version,rules===1?'9.0':'9.1');
 assert.equal(games[1].agencyEconomy,undefined);
 for(let month=0;month<3;month++){
  const plans=engines.map((E,i)=>[E.chooseBot(games[i],0),E.chooseBot(games[i],1)]);
  assert.deepEqual(copy(plans[1]),copy(plans[0]),label+' AI drift');
  if(month===1){
   // Identical explicit human instructions, not just two copies of the AI run.
   plans.forEach(pair=>pair.forEach((plan,seat)=>{
    plan.groupPolicy.creditAllocation=seat?{mortgage:25,middleMarket:25,consumer:50}:{mortgage:50,middleMarket:25,consumer:25};
    plan.productProgramPolicy.pricingBp.essential=seat?-25:25;
   }));humanMonths++;
  }
  for(const [i,E]of engines.entries()){
   E.submit(games[i],0,plans[i][0]);
   // Historical migration legitimately normalizes state (for example ledger
   // metadata). Compare each engine's same lifecycle, not raw versus migrated.
   const halfReady=copy(games[i]);games[i]=E.migrateCampaign(copy(halfReady));
   const migratedAgain=E.migrateCampaign(copy(games[i]));
   assert.deepEqual(copy(migratedAgain),copy(games[i]),label+' repeated migration is not stable');
  }
  assert.deepEqual(copy(games[1]),copy(games[0]),label+' half-ready drift');
  for(const [i,E]of engines.entries())E.submit(games[i],1,plans[i][1]);
  assert.deepEqual(copy(games[1]),copy(games[0]),label+' settlement/RNG/resume drift');
  for(const seat of [0,1]){
   assert.deepEqual(copy(current.publicState(games[1],seat)),copy(old.publicState(games[0],seat)),label+' owner view drift');
   assert.equal(games[1].players[seat].agency,undefined);
   assert.equal(games[1].lastPlans?.[games[1].players[seat].id]?.agencyPolicy,undefined);
  }
  months++;
 }
 for(const [i,E]of engines.entries()){
  games[i].gameOver=true;E.rematch(games[i],0);E.rematch(games[i],1);
 }
 assert.deepEqual(copy(games[1]),copy(games[0]),label+' rematch drift');
 assert.equal(games[1].financialGroupVersion,rules);assert.equal(games[1].agencyEconomy,undefined);profiles++;
}
console.log(JSON.stringify({passed:true,profiles,months,humanMonths,
 baseline:'V2 release/BRANCH_WARS.html',scope:'Exact retained Group 1/2 creation, AI/human resolution, RNG, owner views, half-ready resume and rematch; fixtures unchanged.'}));
