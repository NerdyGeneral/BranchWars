'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
function load(name){
 const script=fs.readFileSync(path.join(root,name),'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
 const math=Object.create(Math);math.random=()=>.375;
 const context={console,Math:math,Date:class extends Date{static now(){return 123456;}}};
 vm.runInNewContext(script,context);return context.BWEngine;
}
const old=load('reports/reference-builds/BRANCH_WARS_group_822b386.html'),current=load('BRANCH_WARS.html');
const options=old.previewFeatureSelection({}, {field:'financialGroupVersion',value:1}).options;
let months=0;
for(const scenario of ['balanced','rate','regulatory','growth'])for(const seed of [0,1]){
 const config={...options,scenario,seed:'group-retained:'+seed,created:1,mode:'hotseat'};
 const games=[old.createGame(config),current.createGame(config)],engines=[old,current];
 assert.deepEqual(copy(games[1]),copy(games[0]),'Group foundation creation drift.');
 for(let month=0;month<3;month++){
  const plans=engines.map((E,i)=>[E.chooseBot(games[i],0),E.chooseBot(games[i],1)]);
  assert.deepEqual(copy(plans[1]),copy(plans[0]),'Group foundation AI drift.');
  if(month===1)plans.forEach(pair=>pair[0].groupPolicy.creditAllocation={mortgage:50,middleMarket:25,consumer:25});
  for(const [i,E]of engines.entries()){
   E.submit(games[i],0,plans[i][0]);games[i]=E.migrateCampaign(copy(games[i]));E.submit(games[i],1,plans[i][1]);
  }
  assert.deepEqual(copy(games[1]),copy(games[0]),'Group foundation settlement/RNG/Continue drift.');months++;
 }
 for(const [i,E]of engines.entries()){
  games[i].gameOver=true;E.rematch(games[i],0);E.rematch(games[i],1);
 }
 assert.deepEqual(copy(games[1]),copy(games[0]),'Group foundation rematch drift.');
}
console.log(JSON.stringify({passed:true,profiles:8,months,scope:'Exact preserved group v1 creation, AI/human, RNG, half-ready resume and rematch.'}));
