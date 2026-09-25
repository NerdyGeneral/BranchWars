'use strict';
// Preserve exact pre-failure campaigns/plans, not regenerated expectations.
// Large diagnostic errors and duplicate closing states are intentionally omitted.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const base='C:/Users/xande/Downloads/Branch_Wars_Release_Checkpoints';
const sources=[
 {id:'doctrine-resume-month264',dir:'20260908-ee80e569-balance-source',file:'department-group6-ee80e569-regulatory480.json',sha:'52050f609671a6941c49034e8f68d23b71a56e7709393c186bfdb24259ff469c',cycle:264},
 {id:'onboarding-delivery-month37',dir:'20260908-00668d05-balance-source',file:'department-group6-00668d05-balanced120.json',sha:'28bcefd83b2da2f416773f761a564f5d23b16bf174adbff203d5897d77b67397',cycle:37}
];
if(process.argv.length!==2)throw Error('Usage: node tools/package_department_regressions.js');
const cases=sources.map(spec=>{
 const raw=fs.readFileSync(path.join(base,spec.dir,'reports/qa',spec.file));
 if(hash(raw)!==spec.sha)throw Error('Preserved '+spec.id+' evidence changed.');
 if(/"(?:authorization|password|githubToken|accessToken|refreshToken|localStorage|sessionStorage)"\s*:/i.test(raw.toString('utf8')))throw Error('Unexpected credential/storage field.');
 const data=JSON.parse(raw),c=data.failureCheckpoint;
 if(data.status!=='FAIL'||!data.sourceUnchanged||!data.portableUnchanged||!c||c.openingGame.cycle!==spec.cycle||c.pending.length!==2)throw Error('Unexpected failure provenance.');
 return {id:spec.id,sourceReportSha256:spec.sha,engineSha256:data.identity.engineSha256,portableSha256:data.identity.portableSha256,
   // This hash records what the original run produced, not a new-build golden.
   originalClosingSha256:hash(JSON.stringify(c.game)),openingGame:c.openingGame,pending:c.pending};
});
const raw=Buffer.from(JSON.stringify({schemaVersion:1,cases})+'\n'),compressed=zlib.gzipSync(raw,{level:9});
if(!zlib.gunzipSync(compressed).equals(raw))throw Error('Lossless fixture packaging failed.');
const target=path.join(root,'tests/fixtures/department-captured-regressions.json.gz');
if(fs.existsSync(target)){
 if(!fs.readFileSync(target).equals(compressed))throw Error('Existing fixture differs; refusing to overwrite.');
}else fs.writeFileSync(target,compressed,{flag:'wx'});
console.log(JSON.stringify({target,cases:cases.map(c=>c.id),rawBytes:raw.length,compressedBytes:compressed.length,rawSha256:hash(raw),compressedSha256:hash(compressed)}));
