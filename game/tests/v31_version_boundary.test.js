'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
// Read the immutable published archive directly; no external checkout or
// regenerated golden file is needed. Its complete digest is pinned first.
const archive=fs.readFileSync(path.join(root,'../releases/branch-wars-v3.zip'));
assert.equal(hash(archive),'85dae43104c4c68f106b371b6ead8891a453bd08a4198162133a493e3a7ab28f');
function zipMember(bytes,name){
 let eocd=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(bytes.readUInt32LE(p)===0x06054b50){eocd=p;break;}
 assert(eocd>=0);let p=bytes.readUInt32LE(eocd+16);
 for(let i=0;i<bytes.readUInt16LE(eocd+10);i++){
  assert.equal(bytes.readUInt32LE(p),0x02014b50);
  const size=bytes.readUInt32LE(p+20),length=bytes.readUInt16LE(p+28),extra=bytes.readUInt16LE(p+30),comment=bytes.readUInt16LE(p+32),method=bytes.readUInt16LE(p+10),local=bytes.readUInt32LE(p+42);
  const entry=bytes.subarray(p+46,p+46+length).toString('utf8');
  if(entry===name){
   assert.equal(bytes.readUInt32LE(local),0x04034b50);
   const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28),data=bytes.subarray(start,start+size);
   assert([0,8].includes(method));return (method===8?zlib.inflateRawSync(data,{maxOutputLength:16*1024*1024}):data).toString('utf8');
  }p+=46+length+extra+comment;
 }throw Error('Missing published member: '+name);
}
const baseline=zipMember(archive,'Branch-Wars-V3-Release/BRANCH_WARS.html');assert.equal(hash(baseline),'4d616ad43145baac692d49aa6f864fefe96e0fffa7396cc81554107ee21cd107');
const candidate=require('../tools/build_game').assemble().html;
function engine(html){const c={console};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const B=engine(baseline),E=engine(candidate);
function create(api,version){return api.createGame({...B.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options,
 financialGroupVersion:version,mode:'hotseat',scenario:'balanced',seed:'v31-legacy-'+version,created:1});}
for(const version of [1,2,3,4,5,6]){
 const a=create(B,version),b=create(E,version);assert.deepEqual(copy(b),copy(a),'Exact legacy creation '+version);
 const pa=a.players.map((_,i)=>B.chooseBot(a,i)),pb=b.players.map((_,i)=>E.chooseBot(b,i));
 assert.deepEqual(copy(pb),copy(pa),'Exact legacy AI '+version);assert.deepEqual(copy(b),copy(a),'Exact legacy RNG '+version);
 B.submit(a,0,pa[0]);E.submit(b,0,pb[0]);
 assert.deepEqual(copy(E.migrateCampaign(copy(b))),copy(B.migrateCampaign(copy(a))),'Exact half-ready migration '+version);
 B.submit(a,1,pa[1]);E.submit(b,1,pb[1]);assert.deepEqual(copy(b),copy(a),'Exact legacy settlement '+version);
 E.validatePilot(b);E.validateLedger(b);
 for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(B.publicState(a,seat)),'Exact legacy private view '+version);
 console.log('PASS published V3 exact legacy Group'+version+' creation/AI/RNG/half-ready/settlement/views');
}
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:7}).options;
const g=E.createGame({...options,mode:'hotseat',seed:'v31-new',created:1});
assert.equal(g.financialGroupVersion,7);assert.equal(g.version,'9.6');E.validatePilot(g);E.validateLedger(g);
const rules=E.campaignRules(g,{context:'game'}),caps=E.campaignCapabilities();
assert.equal(caps.financialGroupSupported,7);assert.equal(E.peerRulesIssue(rules,caps),null);
assert(E.peerRulesIssue(rules,{...caps,financialGroupSupported:6}),'Published V3 peer must reject Group7');
assert(E.peerRulesIssue(rules,{...caps,departmentStaffingSupported:1}),'Frozen staffing evidence still required');
const malformed=copy(g);malformed.version='9.5';assert.throws(()=>E.validatePilot(malformed));
assert.throws(()=>E.createGame({...options,financialGroupVersion:8}));
const plan=g.players.map((_,i)=>E.chooseBot(g,i));E.submit(g,0,plan[0]);const restored=E.migrateCampaign(copy(g));
E.submit(g,1,plan[1]);E.submit(restored,1,copy(plan[1]));
assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(E.migrateCampaign(copy(restored))));
E.validatePilot(g);E.validateLedger(g);
assert.equal(E.publicState(g,1).financialGroupVersion,7);
// Terminal flag is a unit-test entry condition, not a claimed earned victory.
const rematch=copy(g);rematch.gameOver=true;rematch.rematchVotes=[];E.rematch(rematch,0);E.rematch(rematch,1);
assert.equal(rematch.financialGroupVersion,7);assert.equal(rematch.version,'9.6');E.validatePilot(rematch);
console.log('PASS Group7/save9.6 creation, peer refusal, mismatched marker refusal, replay and rematch');
console.log(JSON.stringify({baselineSha256:hash(baseline),candidateSha256:hash(candidate),scope:'One-month six-version exact comparison and Group7 boundary smoke; not full compatibility or release acceptance.'}));
