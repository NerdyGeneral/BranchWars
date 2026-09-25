'use strict';
// Ordinary-start diagnostic, not a balance policy. Preserve exact campaign
// snapshots and reconcile top-level causal movements before interpreting them.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),months=Number(process.argv[2]||24),name=process.argv[3],bankEconomics=process.argv.includes('--bank-economics'),creditWorkload=process.argv.includes('--credit-workload')||bankEconomics,serviced=process.argv.includes('--serviced')||creditWorkload;
const resumes=process.argv.slice(4).filter(x=>x.startsWith('--resume=')),resume=resumes[0]?.slice(9);
const seeds=process.argv.slice(4).filter(x=>x.startsWith('--seed=')),scenarios=process.argv.slice(4).filter(x=>x.startsWith('--scenario=')),seed=seeds[0]?.slice(7)||'business-balance:1',scenario=scenarios[0]?.slice(11)||'balanced';
if(!Number.isInteger(months)||months<1||months>480||!name||!/^economics-[a-z0-9-]+$/.test(name)||resumes.length>1||seeds.length>1||scenarios.length>1||seeds.length&&!/^[a-z0-9:_.-]{1,100}$/i.test(seeds[0].slice(7))||!['balanced','rate','regulatory','growth'].includes(scenario)||scenarios.length&&!scenarios[0].slice(11)||resume&&(!/^economics-[a-z0-9-]+$/.test(resume)||serviced||seeds.length||scenarios.length)||process.argv.slice(4).some(x=>!['--serviced','--credit-workload','--bank-economics'].includes(x)&&!['--resume=','--seed=','--scenario='].some(prefix=>x.startsWith(prefix))))throw Error('Usage: node tools/trace_campaign_economics.js 120 economics-unique-name [--serviced] [--credit-workload] [--bank-economics] [--seed=business-balance:1] [--scenario=balanced|rate|regulatory|growth] [--resume=economics-prior-folder; no creation overrides]');
const folder=path.join(root,'output',name);fs.mkdirSync(folder); // Never replace earlier evidence.
const html=require('./build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx={};vm.runInNewContext(source,ctx);const E=ctx.BWEngine;
const hash=s=>createHash('sha256').update(s).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const report={engineSha256:hash(source),portableSha256:hash(html),seed,scenario,requestedMonths:months,
 scope:'Unmodified ordinary AI, ordinary Expanded start, no injected resources. Root-level ledger attribution reconciles with observed bank balances. Forecasts exclude rival decisions and are not actual production. No full release or human acceptance claim.',history:[],totals:[{},{}]};
fs.writeFileSync(path.join(folder,'engine.html'),html,{flag:'wx'});
let g;
if(resume){
 const priorFolder=path.join(root,'output',resume),prior=JSON.parse(fs.readFileSync(path.join(priorFolder,'report.json'))),bytes=fs.readFileSync(path.join(priorFolder,'closing.json.gz'));
 assert.equal(prior.running,false,'The predecessor must be terminal');assert(!prior.failure,'Do not resume a failed run as passing');
 assert.equal(hash(bytes),prior.closingSnapshotSha256);assert.equal(hash(fs.readFileSync(path.join(priorFolder,'engine.html'))),prior.portableSha256);
 g=E.migrateCampaign(JSON.parse(zlib.gunzipSync(bytes)));E.validatePilot(g);E.validateLedger(g);assert(!g.gameOver,'Keep ended campaigns ended');assert(g.cycle<=months,'Target must follow the saved month');
 report.seed=prior.seed;report.scenario=prior.scenario;report.predecessor={folder:resume,portableSha256:prior.portableSha256,closingSnapshotSha256:prior.closingSnapshotSha256};
}else g=E.createGame({...E.previewCampaignEdition({},'expanded').options,...(serviced?{incomeHistoryVersion:1,commercialServiceVersion:1}:{}),...(creditWorkload?{creditWorkloadVersion:1}:{}),...(bankEconomics?{bankEconomicsVersion:1}:{}),scenario:report.scenario,seed:report.seed,created:1,mode:'hotseat'});
report.fromCompletedMonth=g.cycle-1;report.commercialServiceVersion=g.commercialServiceVersion||0;report.creditWorkloadVersion=g.creditWorkloadVersion||0;report.saveVersion=g.version;report.bankEconomicsVersion=g.bankEconomicsVersion||0;
function snapshot(label){const bytes=zlib.gzipSync(JSON.stringify(g));fs.writeFileSync(path.join(folder,label+'.json.gz'),bytes,{flag:'wx'});return hash(bytes);}
report.openingSnapshotSha256=snapshot('opening');const start=performance.now();
try{
 while(!g.gameOver&&g.cycle<=months){
  const month=g.cycle,plans=g.players.map((_,i)=>E.chooseBot(g,i)),before=copy(g.players.map(p=>p.stats)),world=JSON.stringify(g);
  const previews=g.players.map((p,i)=>{const v=E.publicState(g,i);return {credit:E.creditSummary(p),facilities:E.regionalBranchMetrics(p),forecast:E.operatingPreview(v.me,plans[i],v.economy,v)};});
  assert.equal(JSON.stringify(g),world,'Read-only observations changed the campaign');
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);
  const banks=g.players.map((p,i)=>{
   const events=g.eventLedger.filter(e=>e.cycle===month&&e.target===p.id),roots=events.filter(e=>e.category==='resolution.start');assert.equal(roots.length,1);
   const movements=events.filter(e=>e.parentCause===roots[0].id&&e.deltas).map(e=>({source:e.source,category:e.category,earnings:e.deltas.earnings||0,loans:e.deltas.loans||0,cash:e.deltas.cash||0}));
   for(const field of ['earnings','loans','cash'])assert.equal(movements.reduce((n,e)=>n+e[field],0),p.stats[field]-before[i][field],field+' causal bridge, seat '+i+' month '+month);
   for(const m of movements){const t=report.totals[i][m.source]||(report.totals[i][m.source]={earnings:0,loans:0,cash:0});for(const k of ['earnings','loans','cash'])t[k]+=m[k];}
   return {opening:before[i],closing:copy(p.stats),plan:copy(plans[i]),preview:previews[i],operatingReport:copy(p.operatingReport),movements,
    departments:copy(p.departmentFunctions||null),facilityPolicy:copy(p.facilityLifecycle?.policy||null),credit:E.creditSummary(p),creditWorkload:E.CreditWorkload.quote(p)};
  });
  report.history.push({month,economy:copy(g.economy),banks});
  if(month%6===0||g.gameOver){snapshot('month-'+month);console.log('Completed month '+month+'; loans '+banks.map(b=>b.closing.loans).join('/'));}
  fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify({...report,running:true},null,2)+'\n');
 }
 report.gameOver=g.gameOver;report.endReason=g.endReason||null;report.completedMonth=report.history.at(-1)?.month||report.fromCompletedMonth;report.closingSnapshotSha256=snapshot('closing');
}catch(error){report.failure={month:g.cycle,message:error.stack};process.exitCode=1;console.error(error.stack);}
report.elapsedMs=Math.round(performance.now()-start);report.running=false;
fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({completedMonth:report.completedMonth,fromCompletedMonth:report.fromCompletedMonth,monthsInThisRun:report.history.length,failure:report.failure,folder}));
