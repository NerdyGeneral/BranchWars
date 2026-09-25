'use strict';
// Replays a preserved ordinary campaign. This proves unchanged behavior, not
// strategy balance. Owner snapshots stay local; the summary has no raw saves.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),name=process.argv[2],out=process.argv[3];
if(!/^economics-[a-z0-9-]+$/.test(name||'')||!/^income-[a-z0-9-]+\.json$/.test(out||''))throw Error('Usage: node tools/verify_income_baseline.js economics-baseline income-unique.json');
const directory=path.join(root,'output',name),baseline=JSON.parse(fs.readFileSync(path.join(directory,'report.json'))),html=require('./build_game').assemble().html,c={};
const hash=s=>createHash('sha256').update(s).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
assert.equal(hash(fs.readFileSync(path.join(directory,'engine.html'))),baseline.portableSha256);
assert(!baseline.running&&!baseline.failure&&baseline.history.length===baseline.requestedMonths,'Baseline must have completed');
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);const E=c.BWEngine;
const g=E.createGame({...E.previewCampaignEdition({},'expanded').options,scenario:baseline.scenario,seed:baseline.seed,created:1,mode:'hotseat'});
const report={candidateSha256:hash(html),baselineSha256:baseline.portableSha256,seed:baseline.seed,scenario:baseline.scenario,requested:baseline.history.length,completed:0,rows:[],scope:'Exact ordinary Expanded replay; not a strategy tournament, full release gate or human acceptance.'};
const start=performance.now();
try{
 for(const entry of baseline.history){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i));assert.deepEqual(copy(plans),entry.banks.map(b=>b.plan),'AI plans changed');
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);
  const banks=g.players.map((p,i)=>{
   assert.deepEqual(copy(p.stats),entry.banks[i].closing,'Balance changed');assert.deepEqual(copy(p.operatingReport),entry.banks[i].operatingReport,'Income report changed');
   const bytes=JSON.stringify(g),v=E.publicState(g,i),h=E.IncomeReview.history(v),bridge=E.IncomeReview.reconciliation(p.operatingReport);
   assert.equal(JSON.stringify(g),bytes);assert(bridge.reconciled,'Income equation did not reconcile');
   assert.equal(h.at(-1).cycle,entry.month);assert.equal(h.at(-1).loanIncome,p.operatingReport.loanIncome);assert(h.length<=12);
   const resumed=E.migrateCampaign(copy(g));assert.deepEqual(copy(E.IncomeReview.history(E.publicState(resumed,i))),copy(h));
   assert(v.operatingEvents.every(e=>e.target===p.id&&e.visibility==='owner'));
   return {loanInterest:p.operatingReport.loanIncome,commercialFees:p.operatingReport.commercialIncome,otherIncome:p.operatingReport.otherIncome,
    operatingProfit:p.operatingReport.profit,retainedEarnings:p.stats.earnings,loans:p.stats.loans,deposits:p.stats.deposits,cash:p.stats.cash,capital:p.stats.capital,capitalRatio:E.capitalRatio(p),rounding:bridge.residual,historyMonths:h.length};
  });
  report.rows.push({month:entry.month,banks});report.completed++;
  if(report.completed%6===0)console.log('Exact replay: '+report.completed+' months');
 }
 const closing=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(directory,'closing.json.gz'))));assert.deepEqual(copy(g),closing,'Full closing campaign changed');
 report.exactClosingState=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error.stack);}
report.elapsedMs=Math.round(performance.now()-start);
fs.writeFileSync(path.join(root,'output',out),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({completed:report.completed,exactClosingState:report.exactClosingState,failure:report.failure,elapsedMs:report.elapsedMs}));
