'use strict';
// Produce small, auditable release evidence without publishing full campaign books.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const args=process.argv.slice(2),output=args.shift();
if(!output||!args.length)throw Error('Usage: node tools/summarize_v3_balance.js NEW_OUTPUT INPUT...');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const keys=['cash','capital','capitalRatio','retainedEarnings','deposits','depositShare','loans','loansByProduct','loanCohorts','arrears','chargeoffs','emergencyDebt','funding','bankProfit','staff','allocation','leaders','leadershipArrears','departmentPaid','departmentVendorExpense','officeModels','minimumConditionBp','parentCash','agency','observed'];
const reports=args.map(file=>{
 const bytes=fs.readFileSync(file),r=JSON.parse(bytes);
 if(r.suite!=='department-balance')throw Error('Wrong report family: '+file);
 return {sourceFile:path.basename(file),sourceSha256:sha(bytes),sourceBytes:bytes.length,status:r.status,identity:r.identity,sourceUnchanged:r.sourceUnchanged,portableUnchanged:r.portableUnchanged,seconds:r.seconds,campaigns:r.campaigns,months:r.months,replayChecks:r.replayChecks,failure:r.failure,limits:r.limits,
  results:r.results.map(c=>({...c,players:c.players.map((p,seat)=>({seat,...Object.fromEntries(keys.filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]]))}))})),
  checkpoints:(r.finalCheckpoints||[]).map(c=>({spec:c.spec,rawCharacters:JSON.stringify(c.game).length,sha256:sha(JSON.stringify(c.game))}))};
});
const report={release:'V3',generatedAt:new Date().toISOString(),runtime:sha(fs.readFileSync(path.resolve(__dirname,'../BRANCH_WARS.html'))),scope:'Engine-only long-run characterization on frozen f9836bda, whose engine is byte-identical to final V3. Final transport/storage changes are verified by the separate final full gate. No campaign state is included.',reports};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,bytes:fs.statSync(output).size,reports:reports.map(r=>({file:r.sourceFile,status:r.status,months:r.months}))}));
