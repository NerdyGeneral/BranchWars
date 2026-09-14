'use strict';
// Bounded reproduction of the checkpoint15 Regulatory month188 failure. The
// immutable engine and original seed are retained. Only the error path gains
// diagnostics; successful simulation behavior and random draws are untouched.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_business1_bb6ae726.html'),'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const hash=createHash('sha256').update(source).digest('hex');
if(hash!=='78bea163b87039813a235c29163f7301594427cf41962590866e51d5420a53f9')throw Error('Original failing engine changed.');
const original="const fail=()=>{throw Error('Invalid product pricing review or published quotes.')};";
if(!source.includes(original))throw Error('Pricing failure diagnostic boundary not found.');
const ctx={console};vm.runInNewContext(source.replace(original,"const fail=()=>{root.pricingFailure={cycle:g.cycle,owner:JSON.parse(JSON.stringify(p))};throw Error('Invalid product pricing review or published quotes.')};"),ctx);
const E=ctx.BWEngine,g=E.createGame({...E.previewFeatureSelection({},{field:'commercialAccountsVersion',value:1}).options,scenario:'regulatory',seed:'business-balance:1',created:1,mode:'hotseat'});
const out=path.join(root,'output','pricing188-reproduction');fs.mkdirSync(out,{recursive:true});
let completed=0,lastAccepted;
try{
 while(!g.gameOver&&completed<188){
  lastAccepted=JSON.stringify(g);
  const plans=g.players.map((p,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);completed++;
  if(completed%24===0){fs.writeFileSync(path.join(out,'last-accepted.json.gz'),zlib.gzipSync(JSON.stringify(g)));console.log('Original pricing reproduction: '+completed+' months completed');}
 }
 console.log(JSON.stringify({hash,completed,ended:g.gameOver,reproduced:false}));
}catch(error){
 fs.writeFileSync(path.join(out,'before-failure.json.gz'),zlib.gzipSync(lastAccepted));
 fs.writeFileSync(path.join(out,'failure-owner.json.gz'),zlib.gzipSync(JSON.stringify(ctx.pricingFailure||{})));
 const report={hash,completed,cycle:g.cycle,error:error.stack,scope:'Original failing build, original seed and ordinary AI; only the thrown error captures extra diagnostics. Not current-build release evidence.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;
}
