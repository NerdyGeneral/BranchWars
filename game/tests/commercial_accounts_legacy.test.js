'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const accounts=process.argv.includes('--accounts'),currentAccounts=process.argv.includes('--current-accounts'),baselinePath=path.resolve(__dirname,'../reports/reference-builds/'+(currentAccounts?'BRANCH_WARS_business2_6de2fe68.html':accounts?'BRANCH_WARS_business1_bb6ae726.html':'BRANCH_WARS_group10_2af5dba7.html'));
const bytes=fs.readFileSync(baselinePath);assert.equal(createHash('sha256').update(bytes).digest('hex'),currentAccounts?'6de2fe682b421504e6688a0103c5f9757b213361177eeda3366c6e202cfe614c':accounts?'bb6ae726ed5db903681ce340bd9d60efc7baf1d28e5964004e032a3e3f5da514':'2af5dba756fc9f7d175f32d8065893b86cde01fac85a22baff1314120dbd0bfe','Do not replace the preserved build to hide drift.');
function load(html){const math=Object.create(Math);math.random=()=>.375;const c={console,Math:math,Date:class extends Date{static now(){return 123456;}}};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const old=load(bytes.toString()),now=load(require('../tools/build_game').assemble().html),engines=[old,now],copy=x=>JSON.parse(JSON.stringify(x));let profiles=0,months=0;
for(let group=10;group<=10;group++)for(const scenario of ['balanced','rate','regulatory','growth']){
 const options=old.previewFeatureSelection({}, accounts||currentAccounts?{field:'commercialAccountsVersion',value:1}:{field:'financialGroupVersion',value:group}).options,config={...options,scenario,seed:'qualified-legacy:'+group,created:1,mode:'hotseat'};
 const games=engines.map(E=>E.createGame(config)),label=`Group${group}/${scenario}`;
 assert.deepEqual(copy(games[1]),copy(games[0]),label+' creation');
 for(let month=0;month<3;month++){
  const plans=engines.map((E,i)=>games[i].players.map((p,seat)=>E.chooseBot(games[i],seat)));
  // Checkpoint17 deliberately fixes active-account staffing in this unreleased
  // candidate. Keep the immutable reference; compare the unaffected no-account-
  // work path exactly. commercial_accounts.test retains the failing-before
  // full-team fixture and checks repaired physical accounting independently.
  if(accounts)plans.forEach(pair=>pair.forEach(p=>{p.commercialAccountPolicy={target:null,staffQuarters:0};}));
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
console.log(JSON.stringify({suite:currentAccounts?'commercial-accounts-business2-active-legacy':accounts?'commercial-accounts-business1-inactive-legacy':'commercial-accounts-group10-legacy',profiles,months,scope:'Exact frozen creation, human/AI, RNG, half-ready resume, private views and rematch.'+(accounts?' Account work explicitly disabled: active-account bug repair tested separately.':'')+' No golden regenerated.'}));
