'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const baselinePath=path.resolve(__dirname,'../reports/reference-builds/BRANCH_WARS_group9_1bb3e687.html');
const bytes=fs.readFileSync(baselinePath);assert.equal(createHash('sha256').update(bytes).digest('hex'),'1bb3e6879b4b11abfc43b344a062429c14e5d5eff95fb49620573663f4dea273','Do not replace the preserved Group9 build to hide drift.');
function load(html){const math=Object.create(Math);math.random=()=>.375;const c={console,Math:math,Date:class extends Date{static now(){return 123456;}}};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const old=load(bytes.toString()),now=load(require('../tools/build_game').assemble().html),engines=[old,now],copy=x=>JSON.parse(JSON.stringify(x));let profiles=0,months=0;
for(let group=0;group<=9;group++)for(const scenario of ['balanced','rate','regulatory','growth']){
 const options=old.previewFeatureSelection({}, {field:'financialGroupVersion',value:group}).options,config={...options,scenario,seed:'qualified-legacy:'+group,created:1,mode:'hotseat'};
 const games=engines.map(E=>E.createGame(config)),label=`Group${group}/${scenario}`;
 assert.deepEqual(copy(games[1]),copy(games[0]),label+' creation');
 for(let month=0;month<3;month++){
  const plans=engines.map((E,i)=>games[i].players.map((p,seat)=>E.chooseBot(games[i],seat)));
  assert.deepEqual(copy(plans[1]),copy(plans[0]),label+' AI');
  if(month===1)plans.forEach(pair=>pair.forEach((p,seat)=>{p.decision=seat?'a':'b';if(p.agencyPolicy){p.agencyPolicy.target=seat?'benefits':'liability';p.agencyPolicy.outreach=1;}}));
  for(const [i,E]of engines.entries()){E.submit(games[i],0,plans[i][0]);games[i]=E.migrateCampaign(copy(games[i]));}
  assert.deepEqual(copy(games[1]),copy(games[0]),label+' half-ready');
  for(const [i,E]of engines.entries())E.submit(games[i],1,plans[i][1]);
  assert.deepEqual(copy(games[1]),copy(games[0]),label+' settlement/RNG');
  for(const seat of [0,1])assert.deepEqual(copy(now.publicState(games[1],seat)),copy(old.publicState(games[0],seat)),label+' private view');
  months++;
 }
 for(const [i,E]of engines.entries()){games[i].gameOver=true;E.rematch(games[i],0);E.rematch(games[i],1);}
 assert.deepEqual(copy(games[1]),copy(games[0]),label+' rematch');profiles++;
 console.log('PASS '+label);
}
console.log(JSON.stringify({suite:'agency-professionals-legacy',profiles,months,scope:'Exact frozen Group0-9 creation, human/AI, RNG, half-ready resume, private views and rematch. No golden regenerated.'}));
