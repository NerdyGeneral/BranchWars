'use strict';
async function main(){
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),codec=fs.readFileSync(path.join(root,'src/persistence/storage-codec.js'),'utf8');
const c={btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};vm.runInNewContext(codec+';this.pack=packStorageValue;this.unpack=unpackStorageValue;',c);
const copy=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
let checks=0;function roundtrip(value){const before=JSON.stringify(value),packed=c.pack(value),restored=c.unpack(copy(packed));assert.equal(JSON.stringify(restored),before);assert.equal(JSON.stringify(value),before);checks++;return packed;}
roundtrip(null);roundtrip({version:'8.14',featureRulesVersion:1,advertisingVersion:0});
const rich={rows:Array.from({length:18000},(_,i)=>({id:i,bank:'Bank 🏦 — René',before:{deposits:i*100,cash:2000},after:{deposits:i*100+1,cash:2001},text:'Repeated history; never discard it.\u0000\ud800'}))};
const packed=roundtrip(rich);assert.equal(packed.branchWarsStorage,1);assert(JSON.stringify(packed).length<JSON.stringify(rich).length/2);checks++;
let state=1337;const noisy={text:Array.from({length:360000},()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return String.fromCharCode(32+state%95)}).join('')};roundtrip(noisy);
for(const change of [{branchWarsStorage:2},{codec:'unknown'},{length:packed.length+1},{checksum:'00000000'},{data:packed.data.slice(1)},{data:'AAA='},{length:100000000},{extra:true}]){assert.throws(()=>c.unpack({...packed,...change}));checks++;}
const cached=c.pack(rich,'game');assert.equal(c.pack(rich,'game'),cached);rich.rows[0].after.cash++;assert.notEqual(c.pack(rich,'game'),cached);roundtrip(rich);checks++;
const report={passed:true,codecChecks:checks,syntheticRawBytes:Buffer.byteLength(JSON.stringify(rich)),syntheticStoredBytes:Buffer.byteLength(JSON.stringify(c.pack(rich))),campaignMonths:0};
if(!process.argv.includes('--quick')){
 const bytes=fs.readFileSync(path.join(root,'BRANCH_WARS.html')),engine=bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};vm.runInNewContext(engine,context);const E=context.BWEngine;
 report.portableSha256=sha(bytes);report.engineSha256=sha(engine);
 const fixture=process.argv.includes('--fixture')?process.argv[process.argv.indexOf('--fixture')+1]:null;
 let g=fixture?JSON.parse(fs.readFileSync(fixture,'utf8')):E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:2}).options,mode:'hotseat',seed:'storage-capacity',created:1});
 for(let month=0;!fixture&&month<120&&!g.gameOver;month++){
  const plans=[0,1].map(s=>E.chooseBot(g,s));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);report.campaignMonths++;
 }
 if(fixture){report.reusedGeneratedCampaign=true;report.fixtureCycle=g.cycle}
 if(process.argv.includes('--snapshot')){const directory=process.argv[process.argv.indexOf('--snapshot')+1];assert(path.isAbsolute(directory));fs.writeFileSync(path.join(directory,'storage-campaign.json'),JSON.stringify(g),{flag:'wx'});}
 report.browserIntegration=await require('./storage_recovery')(copy(g));
 const raw=JSON.stringify(g),start=performance.now(),stored=JSON.stringify(c.pack(g));report.packMs=performance.now()-start;
 const tick=performance.now(),restored=c.unpack(JSON.parse(stored));report.unpackMs=performance.now()-tick;assert.equal(JSON.stringify(restored),raw,'Actual campaign history changed');
 E.validatePilot(restored);E.validateLedger(restored);E.validateCampaignRules(restored,'game');
 report.rawBytes=Buffer.byteLength(raw);report.storedBytes=Buffer.byteLength(stored);report.storageUtf16Bytes=stored.length*2;
 assert(raw.length*2>5*1024*1024,'Actual campaign must reproduce browser quota pressure');assert(stored.length*2<4*1024*1024,'Compressed autosave lacks browser quota headroom');
 const original=E.migrateCampaign(copy(g)),continued=E.migrateCampaign(restored),plans=[0,1].map(s=>E.chooseBot(original,s)),resumedPlans=[0,1].map(s=>E.chooseBot(continued,s));
 assert.deepEqual(copy(resumedPlans),copy(plans),'Compressed save changed AI proposals');
 E.submit(original,0,copy(plans[0]));E.submit(continued,0,copy(resumedPlans[0]));E.submit(original,1,copy(plans[1]));E.submit(continued,1,copy(resumedPlans[1]));assert.deepEqual(copy(continued),copy(original),'Compressed save continuation changed outcome');
 const view=E.publicState(g,1),connection={side:'host',repo:'example/fictional',room:'ABCD2345',mine:3,published:2,seen:2,outbox:[{seq:3,msg:{type:'state',state:view}}],inflight:{messages:[{seq:3,msg:{type:'state',state:view}}]}};
 const checkpoint={version:1,connection:c.pack(connection,'connection'),game:c.pack(g,'game'),view:null};
 const checkpointText=JSON.stringify(checkpoint);report.checkpointUtf16Bytes=checkpointText.length*2;assert(report.checkpointUtf16Bytes<4*1024*1024,'Full retry checkpoint lacks browser quota headroom');
 assert.equal(JSON.stringify(c.unpack(checkpoint.connection)),JSON.stringify(connection));assert.equal(JSON.stringify(c.unpack(checkpoint.game)),raw);
 if(process.argv.includes('--snapshot')){const directory=process.argv[process.argv.indexOf('--snapshot')+1];fs.writeFileSync(path.join(directory,'storage-checkpoint.json'),JSON.stringify({version:1,connection,game:g,view:null}),{flag:'wx'});}
 assert.equal(sha(fs.readFileSync(path.join(root,'BRANCH_WARS.html'))),report.portableSha256);
}
if(process.argv.includes('--report')){const directory=path.join(root,'reports/baselines');report.reportPath=path.join(directory,'storage-capacity-'+Date.now()+'.json');fs.writeFileSync(report.reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1});
