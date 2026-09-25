'use strict';
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js'),copy=x=>JSON.parse(JSON.stringify(x));
async function main(){
 const guest=harness('guest');guest.run("source=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:2}).options,mode:'hotseat',created:1,seed:'storage-guest'});send=()=>{};ghFlush=()=>{}");
 for(let i=0;i<24;i++)guest.run('plans=[0,1].map(s=>E.chooseBot(source,s));E.submit(source,0,plans[0]);E.submit(source,1,plans[1])');
 guest.run("game=null;view=E.publicState(source,1);nextPlan=E.chooseBot(source,1)");await guest.run('ghCommitPlan(nextPlan)');guest.run('view.me.submitted=true;ghCheckpoint()');
 const raw=guest.storage.get('branchWarsGhResume'),saved=JSON.parse(raw);assert.equal(saved.version,2);assert.equal(saved.view.branchWarsStorage,1);assert.equal(saved.game,null);assert(!raw.includes('PRIVATE_TEST_TOKEN'));
 const expected=copy(guest.state().view),seal=copy(guest.state().ghPendingPlan);
 function reload(text){const h=harness('guest');h.storage.set('branchWarsGhResume',text);h.c.document.querySelector('#ghGuestToken').value='PRIVATE_TEST_TOKEN';h.run('gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true});send=()=>{}');return h;}
 const resumed=reload(raw);await resumed.run('ghResume()');assert(resumed.state().gh.active);assert.deepEqual(copy(resumed.state().view),expected);assert.deepEqual(copy(resumed.state().ghPendingPlan),seal);assert.equal(resumed.state().game,null);assert.equal(resumed.state().view.rival.corporate,undefined);
 for(const mutation of [v=>v.version=1,v=>v.version=3,v=>v.view.branchWarsStorage=2,v=>v.view.checksum='00000000',v=>v.view.extra=true]){const invalid=copy(saved);mutation(invalid);const rejected=reload(JSON.stringify(invalid));await rejected.run('ghResume()');assert.equal(rejected.state().view,null);assert.equal(rejected.state().gh.active,false);assert.equal(rejected.storage.get('branchWarsGhResume'),JSON.stringify(invalid),'Rejected record must remain recoverable');}
 const uncompressed=copy(saved);uncompressed.version=1;uncompressed.view=expected;const old=reload(JSON.stringify(uncompressed));await old.run('ghResume()');assert(old.state().gh.active);assert.deepEqual(copy(old.state().view),expected);
 console.log(JSON.stringify({passed:true,months:24,checkpointStorageBytes:raw.length*2,checks:['compressed guest view and sealed plan resume','no host game/private rival records','checkpoint version/marker mismatch refusal','damaged codec refusal before adoption','old raw v1 checkpoint remains readable']}));
}
main().catch(error=>{console.error(error);process.exitCode=1});
