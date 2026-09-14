'use strict';
// Ordinary-start diagnostic, not a balance policy. Preserve exact campaign
// snapshots and reconcile top-level causal movements before interpreting them.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),months=Number(process.argv[2]||24),name=process.argv[3];
if(!Number.isInteger(months)||months<1||months>120||!name||!/^economics-[a-z0-9-]+$/.test(name))throw Error('Usage: node tools/trace_campaign_economics.js 24 economics-unique-name');
const folder=path.join(root,'output',name);fs.mkdirSync(folder); // Never replace earlier evidence.
const html=require('./build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx={};vm.runInNewContext(source,ctx);const E=ctx.BWEngine;
const hash=s=>createHash('sha256').update(s).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const report={engineSha256:hash(source),portableSha256:hash(html),seed:'business-balance:1',scenario:'balanced',requestedMonths:months,
 scope:'Unmodified ordinary AI, ordinary Expanded start, no injected resources. Root-level ledger attribution reconciles with observed bank balances. Forecasts exclude rival decisions and are not actual production. No full release or human acceptance claim.',history:[],totals:[{},{}]};
fs.writeFileSync(path.join(folder,'engine.html'),html,{flag:'wx'});
const g=E.createGame({...E.previewCampaignEdition({},'expanded').options,scenario:report.scenario,seed:report.seed,created:1,mode:'hotseat'});
function snapshot(label){const bytes=zlib.gzipSync(JSON.stringify(g));fs.writeFileSync(path.join(folder,label+'.json.gz'),bytes,{flag:'wx'});return hash(bytes);}
report.openingSnapshotSha256=snapshot('opening');const start=performance.now();
try{
 while(!g.gameOver&&report.history.length<months){
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
    departments:copy(p.departmentFunctions||null),facilityPolicy:copy(p.facilityLifecycle?.policy||null),credit:E.creditSummary(p)};
  });
  report.history.push({month,economy:copy(g.economy),banks});
  if(report.history.length%6===0||g.gameOver){snapshot('month-'+report.history.length);console.log('Completed '+report.history.length+' months; loans '+banks.map(b=>b.closing.loans).join('/'));}
  fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify({...report,running:true},null,2)+'\n');
 }
 report.gameOver=g.gameOver;report.closingSnapshotSha256=snapshot('closing');
}catch(error){report.failure={month:g.cycle,message:error.stack};process.exitCode=1;console.error(error.stack);}
report.elapsedMs=Math.round(performance.now()-start);report.running=false;
fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({completed:report.history.length,failure:report.failure,totals:report.totals,folder}));
