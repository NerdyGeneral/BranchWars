'use strict';
// Exercise actual autosave/repository recovery against a completed long campaign.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [input,output]=process.argv.slice(2),root=path.resolve(__dirname,'..');
if(!input||!output)throw Error('Usage: node tools/verify_v3_long_save.js CAMPAIGN_REPORT NEW_OUTPUT');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const raw=fs.readFileSync(input),r=JSON.parse(raw),portable=sha(fs.readFileSync(path.join(root,'BRANCH_WARS.html')));
 if(r.status!=='PASS'||!r.sourceUnchanged||!r.portableUnchanged)throw Error('Campaign report is not a completed immutable pass');
 const cases=[];
 for(const c of r.finalCheckpoints){
  const start=Date.now(),result={spec:c.spec,rawCharacters:JSON.stringify(c.game).length};
  try{Object.assign(result,await require('../tests/storage_recovery')(c.game));result.status='PASS';}
  catch(e){result.status='FAIL';result.error=e.stack||e.message;}
  result.elapsedMs=Date.now()-start;cases.push(result);
 }
 const sourceUnchanged=portable===sha(fs.readFileSync(path.join(root,'BRANCH_WARS.html')));
 const report={release:'V3',createdAt:new Date().toISOString(),portableSha256:portable,campaignEngineSha256:r.identity.engineSha256,inputFile:path.basename(input),inputSha256:sha(raw),sourceUnchanged,cases,passed:sourceUnchanged&&cases.every(c=>c.status==='PASS'),scope:'Final V3 actual local save and repository checkpoint/retry recovery with completed frozen same-engine campaign, under 5MiB quota adapters. Not a real browser or physical two-computer test.'};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
