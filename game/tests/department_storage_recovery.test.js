'use strict';
// Actual autosave and repository checkpoint code under a bounded quota adapter.
// This is not a physical browser/two-computer acceptance test.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
async function verifyEnvelopeVersions(campaign){
 const {harness}=require('./github_resilience.test.js'),host=harness('host');
 host.c.snapshot=copy(campaign);
 // A settled host with no queued retry state has a small raw connection. The
 // actual large campaign still uses DAG storage: no legacy LZW field can mask
 // an incorrectly stamped outer checkpoint version.
 host.run("game=snapshot;game.mode='p2p';view=null;gh.outbox=[];gh.inflight=null;gh.mine=0;gh.published=0;gh.seen=0;ghCheckpoint()");
 const checkpoint=JSON.parse(host.storage.get('branchWarsGhResume'));
 assert.equal(checkpoint.game.branchWarsStorage,2);assert.equal(checkpoint.connection.branchWarsStorage,undefined);
 assert.equal(checkpoint.version,2,'A DAG-only checkpoint must use the compressed outer version');
 const expected=copy(host.run('E.migrateCampaign(JSON.parse(JSON.stringify(game)))'));
 async function resume(saved,label){
  const peer=harness('host');peer.storage.set('branchWarsGhResume',JSON.stringify(saved));
  peer.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  peer.run('gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true});sent=[];send=m=>sent.push(m)');
  await peer.run('ghResume()');assert(peer.state().gh.active,label+' did not resume');
  assert.deepEqual(copy(peer.state().game),expected,label+' changed the campaign');
  assert(peer.run('peerFeatureStatus().pending'),label+' reused stale authentication');
  assert.equal(peer.state().gh.outbox.length,0,label+' invented a queued instruction');
 }
 await resume(checkpoint,'DAG game / raw connection');
 // Explicit storage-format fixtures exercise supported envelopes independently
 // of the writer's size heuristic. Their underlying connection remains the same
 // real finite object; no campaign metadata, balances or queue entries are added.
 host.c.connectionFixture=copy(checkpoint.connection);
 const formats=host.run(`(()=>{const text=JSON.stringify(connectionFixture),encoded=storageDeduplicate(text);
  return {legacy:{branchWarsStorage:1,codec:'lzw16',length:text.length,checksum:storageChecksum(text),data:storageCompress(text)},
   dag:{branchWarsStorage:2,codec:'jsondag-lzw16',length:text.length,encodedLength:encoded.length,checksum:storageChecksum(text),data:storageCompress(encoded)}};})()`);
 await resume({...checkpoint,connection:copy(formats.legacy)},'DAG game / LZW connection');
 await resume({...checkpoint,connection:copy(formats.dag)},'All packed fields DAG');
 const malformed={...checkpoint,version:1},refused=harness('host');
 refused.storage.set('branchWarsGhResume',JSON.stringify(malformed));refused.run('gh.active=false');await refused.run('ghResume()');
 assert.equal(refused.state().gh.active,false);assert.equal(refused.state().game,null,'Inconsistent outer version adopted a campaign');
 return {checks:4,rawConnectionCheckpointBytes:JSON.stringify(checkpoint).length*2,formats:['DAG/raw','DAG/LZW','DAG/DAG','inconsistent outer version refused']};
}
async function main(){
 const raw=zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'fixtures/department-captured-regressions.json.gz')));
 assert.equal(hash(raw),'f7fb95d40d6206e44270afe26be42941bd8b9ebd7dc314558e0ac940e337e79f');
 const cases=JSON.parse(raw).cases,results=[];
 for(const c of cases){
  const result=await require('./storage_recovery')(c.openingGame);
  assert(result.localStorageBytes<2*1024*1024);assert(result.sessionStorageBytes<4*1024*1024);
  results.push({case:c.id,...result});
 }
 const envelopeVersions=await verifyEnvelopeVersions(cases.find(c=>c.id==='doctrine-resume-month264').openingGame);
 console.log(JSON.stringify({status:'PASS',cases:results,envelopeVersions,scope:'Actual host autosave/retry/reload, fresh-handshake refusal and failed-write preservation under a 5MiB quota adapter; no physical-browser or two-PC claim.'}));
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
