'use strict';
// Read-only profiling of a captured ordinary-AI campaign. The instrumented and
// uninstrumented engines must produce exactly the same plans and world/RNG.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),useCurrent=process.argv.includes('--current'),file=path.resolve(root,process.argv.slice(2).find(arg=>arg!=='--current')||'output/pricing188-reproduction/last-accepted.json.gz');
const bytes=fs.readFileSync(file),state=zlib.gunzipSync(bytes).toString('utf8'),g=JSON.parse(state);
const snapshotHash=createHash('sha256').update(bytes).digest('hex'),preserved=path.join(root,'output','pricing-snapshot-'+g.cycle+'-'+snapshotHash.slice(0,8)+'.json.gz');
if(fs.existsSync(preserved))assert.equal(createHash('sha256').update(fs.readFileSync(preserved)).digest('hex'),snapshotHash,'Never overwrite a different captured state');
else fs.writeFileSync(preserved,bytes,{flag:'wx'});
const html=useCurrent?require('./build_game').assemble().html:fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_business1_bb6ae726.html'),'utf8'),source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const names=['publicState','validatePilot','validateLedger','operatingPreview','prepareOperatingForecast','productPricingSchedule','productPricingQuote','segmentDepositSummary','lifecycleInstructionQuote','facilityLifecyclePlanningContext','departmentFunctionsQuote','facilityInvestmentReview','planFacilityInvestment','planProductPricing','planExecutionReserve','staffingRecoveryReview'];
const wrappers=names.map(name=>`{const original=${name};${name}=function(...args){const t=performance.now();try{return original.apply(this,args)}finally{const row=profile[${JSON.stringify(name)}]||(profile[${JSON.stringify(name)}]={calls:0,ms:0});row.calls++;row.ms+=performance.now()-t}}}`).join('\n');
function load(instrument){const c={console,performance,profile:{}};vm.runInNewContext(instrument?source.replace('root.BWEngine={',wrappers+'\nroot.BWEngine={'):source,c);return c;}
const timed=load(true),plain=load(false),a=JSON.parse(state),b=JSON.parse(state),start=performance.now();
const plans=a.players.map((_,i)=>timed.BWEngine.chooseBot(a,i));const elapsed=performance.now()-start;
const expected=b.players.map((_,i)=>plain.BWEngine.chooseBot(b,i));
assert.equal(JSON.stringify(plans),JSON.stringify(expected),'Profiling must not change the plans');assert.equal(JSON.stringify(a),JSON.stringify(b),'Profiling must not change the world or random stream');
const fields=Object.entries(g).map(([key,value])=>({key,bytes:Buffer.byteLength(JSON.stringify(value))})).sort((a,b)=>b.bytes-a.bytes);
const report={cycle:g.cycle,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),engineSha256:createHash('sha256').update(source).digest('hex'),jsonBytes:Buffer.byteLength(state),elapsedMs:Math.round(elapsed),scope:'Two ordinary AI plans from a real captured checkpoint; inclusive function times overlap. Instrumented and plain results/world/RNG compared exactly. No new campaign, fabricated balances or release acceptance.',largestFields:fields.slice(0,8),functions:Object.entries(timed.profile).map(([name,row])=>({name,calls:row.calls,ms:Math.round(row.ms)})).sort((a,b)=>b.ms-a.ms)};
const output=path.join(root,'output','pricing-snapshot-profile-'+g.cycle+(useCurrent?'-current':'')+'.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
