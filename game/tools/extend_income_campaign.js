'use strict';
// Continue the preserved ordinary month108 campaign, rather than discarding
// its earlier elapsed simulation. Run published and candidate rules side by side.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),limit=Number(process.argv[2]||120),name=process.argv[3];
if(![120,480].includes(limit)||!/^income-extended-[a-z0-9-]+$/.test(name||''))throw Error('Usage: node tools/extend_income_campaign.js 120 income-extended-unique');
const directory=path.join(root,'output',name);fs.mkdirSync(directory);
const hash=x=>createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const html=require('./build_game').assemble().html,frozen=fs.readFileSync(path.join(root,'../releases/v4/BRANCH_WARS.html'),'utf8');
fs.writeFileSync(path.join(directory,'candidate.html'),html,{flag:'wx'});
const predecessor=JSON.parse(fs.readFileSync(path.join(root,'output/expanded65-balance/report.json')));
assert.equal(hash(frozen),predecessor.sha256);
const bytes=fs.readFileSync(path.join(root,'output/expanded65-balance/balanced-month-108.json.gz')),initial=JSON.parse(zlib.gunzipSync(bytes));
function runtime(source){const c={};vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=runtime(html),old=runtime(frozen),g=E.migrateCampaign(copy(initial)),control=old.migrateCampaign(copy(initial));
assert.equal(g.cycle,109);E.validatePilot(g);E.validateLedger(g);assert.deepEqual(copy(g),copy(control));
const report={candidateSha256:hash(html),publishedSha256:hash(frozen),openingSnapshotSha256:hash(bytes),fromCompletedMonth:108,targetCompletedMonth:limit,scenario:g.scenario,scope:'Continued ordinary Balanced campaign; exact published-rule control, no resource injection. Not new-game onboarding, Regulatory stress or a complete strategy matrix.',status:'running',rows:[]};
const save=()=>fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');save();
try{
 while(!g.gameOver&&g.cycle<=limit){
  const cycle=g.cycle,start=performance.now(),plans=g.players.map((_,i)=>E.chooseBot(g,i)),original=control.players.map((_,i)=>old.chooseBot(control,i));
  assert.deepEqual(copy(plans),copy(original));for(const i of [0,1]){E.submit(g,i,plans[i]);old.submit(control,i,original[i]);}
  E.validatePilot(g);E.validateLedger(g);assert.deepEqual(copy(g),copy(control),'Full campaign diverged from V4');
  const banks=g.players.map((p,i)=>{const v=E.publicState(g,i),before=JSON.stringify(g),history=E.IncomeReview.history(v),bridge=E.IncomeReview.reconciliation(p.operatingReport);assert(bridge.reconciled);assert.equal(JSON.stringify(g),before);return {loanInterest:p.operatingReport.loanIncome,commercialFees:p.operatingReport.commercialIncome,otherIncome:p.operatingReport.otherIncome,operatingProfit:p.operatingReport.profit,earnings:p.stats.earnings,loans:p.stats.loans,deposits:p.stats.deposits,cash:p.stats.cash,capital:p.stats.capital,capitalRatio:E.capitalRatio(p),debt:p.stats.emergencyDebt,historyAvailable:history.filter(r=>r.available).length,rounding:bridge.residual};});
  report.rows.push({cycle,banks,elapsedMs:Math.round(performance.now()-start)});save();console.log('Exact continued campaign: month '+cycle);
 }
 report.status='passed';report.completedMonth=report.rows.at(-1)?.cycle||108;report.gameOver=g.gameOver;report.endReason=g.endReason||null;
 fs.writeFileSync(path.join(directory,'closing.json.gz'),zlib.gzipSync(JSON.stringify(g)),{flag:'wx'});
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;console.error(error.stack);}
save();console.log(JSON.stringify({status:report.status,completedMonth:report.completedMonth,gameOver:report.gameOver}));
