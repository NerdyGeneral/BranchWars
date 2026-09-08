'use strict';
// Actual 480-month campaign; preserve history, prove old refusal and new recovery.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const fixture=fs.readFileSync(path.join(__dirname,'fixtures/department-regulatory480.json.gz'));
 assert.equal(hash(fixture),'126318f35b4bb048445ab6dae700a430a26db281c41efd22a56d1fd7f6d758b9');
 const raw=zlib.gunzipSync(fixture);assert.equal(hash(raw),'d7a4a3730d11ff830601835220b4e983a31949dd544dd5d6b8217aacba2e0e76');
 const data=JSON.parse(raw),text=JSON.stringify(data.game);
 assert.equal(text.length,52227013);assert.equal(hash(text),'11f8aaa2453ee0307449ddc8c62dcdfe95e8061816d18db57f16d0821d925c6a');
 const source=fs.readFileSync(path.join(__dirname,'../src/persistence/storage-codec.js'),'utf8');
 assert(source.includes('STORAGE_TEXT_LIMIT=64*1024*1024'),'Expected bounded 64MiB V3 ceiling');
 const api=';this.pack=packStorageValue;this.unpack=unpackStorageValue;',old={},current={};
 vm.runInNewContext(source.replace('STORAGE_TEXT_LIMIT=64*1024*1024','STORAGE_TEXT_LIMIT=32*1024*1024')+api,old);
 vm.runInNewContext(source+api,current);
 assert.throws(()=>old.pack(data.game),/browser-storage safety limit/,'The real state must reproduce the old limit');
 for(const branchWarsStorage of [1,2]){
  const envelope={branchWarsStorage,codec:branchWarsStorage===1?'lzw16':'jsondag-lzw16',length:64*1024*1024+1,checksum:'00000000',data:''};
  if(branchWarsStorage===2)envelope.encodedLength=0;
  assert.throws(()=>current.unpack(envelope),/Unsupported or invalid/,'Oversized declared text must fail before expansion');
 }
 const result=await require('./storage_recovery')(data.game);
 assert(result.localStorageBytes<2*1024*1024);assert(result.sessionStorageBytes<4*1024*1024);
 console.log(JSON.stringify({status:'PASS',fixtureRawCharacters:text.length,rawLimitCharacters:64*1024*1024,oldLimitRefusalReproduced:true,oversizedEnvelopesRejected:2,...result,scope:'Actual 480-month source checkpoint, quota adapters, exact save/retry recovery; not physical browser acceptance.'}));
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
