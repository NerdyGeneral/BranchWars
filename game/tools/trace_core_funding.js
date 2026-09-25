'use strict';
// Reproduce the failing Core staffing-matrix case without altering its policies,
// starting resources, RNG, resolution order or historical campaign rules.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const name=process.argv[2],rules=process.argv[3]||'economics';
if(!/^income-core-funding-[a-z0-9-]+$/.test(name||'')||process.argv.length>4||!['legacy','serviced','economics','balance-sheet'].includes(rules))throw Error('Usage: node tools/trace_core_funding.js income-core-funding-unique [legacy|serviced|economics|balance-sheet]');
const folder=path.join(__dirname,'../output',name);fs.mkdirSync(folder);
const html=require('./build_game').assemble().html,ctx={};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,hash=x=>createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const g=E.createGame({incomeHistoryVersion:1,...(rules!=='legacy'?{commercialServiceVersion:1}:{}),...(['economics','balance-sheet'].includes(rules)?{bankEconomicsVersion:rules==='balance-sheet'?2:1}:{}),mode:'hotseat',scenario:'rate',seed:'income-core:2',created:1});
const report={portableSha256:hash(html),saveVersion:g.version,rules,seed:'income-core:2',scenario:'rate',scope:'One Core balanced-staffing tilt against ordinary AI, matching income_strategy_lab. No resources or rule changes. Core earnings means accumulated operating profit, not retained equity.',history:[],running:true};
if(rules==='balance-sheet')report.scope='One Core8.19 balanced-staffing tilt against ordinary AI. No resources or rule overrides. Earnings means retained earnings, including strategic costs and funding losses; not older Core accumulated operating profit.';
fs.writeFileSync(path.join(folder,'engine.html'),html,{flag:'wx'});
fs.writeFileSync(path.join(folder,'opening.json'),JSON.stringify(g),{flag:'wx'});
try{
 while(!g.gameOver&&g.cycle<=120){
  const month=g.cycle,plans=g.players.map((_,i)=>E.chooseBot(g,i)),staff=g.players[0].stats.staff;
  const operations=Math.max(plans[0].allocation.operations,Math.floor(staff/8)),remaining=staff-operations;
  const a=[...[3,2,2].map(w=>Math.floor(w*remaining/7)),operations];
  for(let i=0,left=staff-a.reduce((n,x)=>n+x,0);left>0;i++,left--)a[i%3]++;
  plans[0].allocation=Object.fromEntries(['service','business','lending','operations'].map((role,i)=>[role,a[i]]));
  const opening=g.players.map(p=>copy(p.stats));
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validateLedger(g);
  const banks=g.players.map((p,i)=>{
   assert(E.IncomeReview.reconciliation(p.operatingReport).reconciled);
   const events=g.eventLedger.filter(e=>e.cycle===month&&e.target===p.id),start=events.find(e=>e.category==='resolution.start');
   assert(start,'Missing owner resolution cause');
   const movements=events.filter(e=>e.parentCause===start.id&&e.deltas).map(e=>({category:e.category,cause:e.cause,deltas:e.deltas}));
   return {id:p.id,opening:opening[i],closing:copy(p.stats),distress:p.distress,capitalRatio:E.capitalRatio(p),plan:plans[i],operatingReport:copy(p.operatingReport),movements};
  });
  report.history.push({month,economy:copy(g.economy),banks});
 }
 report.completedMonth=report.history.at(-1)?.month||0;report.gameOver=g.gameOver;report.endReason=g.endReason;report.failedId=g.failedId;
}catch(error){report.failure={month:g.cycle,message:error.stack};process.exitCode=1;}
report.running=false;
fs.writeFileSync(path.join(folder,'closing.json'),JSON.stringify(g),{flag:'wx'});
fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({folder,completed:report.completedMonth,endReason:report.endReason,failure:report.failure}));
