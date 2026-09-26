'use strict';
// Measured campaign economics for current editions: does the bank lend its
// deposits, which lending cap binds, how the loan book and income evolve, and
// what the AI does with its offices. Ordinary same-rule AI plays both seats; no
// resources are injected. A diagnostic for comparing rule variants on the same
// seeds, not a claim of optimal play or human balance.
//
//   node tools/edition_balance_lab.js NAME [--months=36] [--seeds=1,2,3]
//        [--scenarios=balanced,rate] [--variants=expanded,core] [--jobs=N]
//
// Writes output/edition-balance-NAME.json and refuses to replace an earlier
// report. Each campaign runs in its own process; Expanded AI planning takes
// several seconds a month, so a 36-month campaign takes minutes.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),
 {createHash}=require('node:crypto'),{fork}=require('node:child_process');
const root=path.resolve(__dirname,'..');

// Rule variants. Add a new variant here when a new rule boundary needs measuring
// against the unchanged one; every variant starts from ordinary edition setup.
const CURRENT={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true};
const VARIANTS={
 core:E=>E.previewCampaignEdition({},'core',CURRENT).options,
 expanded:E=>E.previewCampaignEdition({},'expanded',CURRENT).options
};
const CHECKPOINTS=[1,3,6,12,24,36,48,60,84,120];

function engine(){
 const html=require('./build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
 // Read-only access to the lending caps the engine applies; nothing is replaced.
 const exposed=source.replace('root.BWEngine={','root.BWEngine={loanProductionCapacity,regionalOperations,creditSalesStaff,workforceAllocation,departmentFunctionCoverage,');
 if(exposed===source)throw Error('Engine export object not found; update the lab.');
 const c={console};vm.runInNewContext(exposed,c);
 return {E:c.BWEngine,portableSha256:createHash('sha256').update(html).digest('hex'),engineSha256:createHash('sha256').update(source).digest('hex')};
}

function lendingCaps(E,g,p){
 const staff=E.creditSalesStaff(p,E.workforceAllocation(p).lending),regional=E.regionalOperations(p)?E.regionalBranchMetrics(p).loanCapacity:null,
  capacity=E.loanProductionCapacity(g,p);
 return {lendingStaff:Math.round(staff*10)/10,capacity:Math.round(capacity),regional,binding:regional!==null&&capacity>=regional-1?'regional':'staff/funding'};
}
function bankRow(E,g,p){
 const s=p.stats,r=p.operatingReport||{},income=(r.loanIncome||0)+(r.depositIncome||0)+(r.commercialIncome||0)+(r.otherIncome||0),
  offices={};for(const o of p.facilityNetwork?.offices||[])if(o.closedCycle===null)offices[o.model]=(offices[o.model]||0)+1;
 return {deposits:Math.round(s.deposits),loans:Math.round(s.loans),cash:Math.round(s.cash),
  loanToDeposit:Math.round(1000*s.loans/Math.max(1,s.deposits))/10,capitalRatio:Math.round(10*E.capitalRatio(p))/10,
  lastOperatingProfit:Math.round(s.lastProfit||0),loanIncomeShare:income>0?Math.round(1000*(r.loanIncome||0)/income)/10:null,
  offices,...lendingCaps(E,g,p)};
}

function runCampaign({variant,scenario,seed,months}){
 const {E}=engine(),g=E.createGame({...VARIANTS[variant](E),mode:'hotseat',seed:'edition-balance:'+seed,scenario,created:1,startingWorkforce:'covered'});
 const result={variant,scenario,seed,version:g.version,requestedMonths:months,completed:0,checkpoints:[],cumulativeOperatingProfit:[0,0],bindingMonths:[{},{}]};
 const started=performance.now();
 try{
  while(!g.gameOver&&result.completed<months){
   for(const [i,p]of g.players.entries()){const b=lendingCaps(E,g,p).binding;result.bindingMonths[i][b]=(result.bindingMonths[i][b]||0)+1;}
   const plans=g.players.map((_,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);
   E.validateLedger(g);result.completed++;
   g.players.forEach((p,i)=>{result.cumulativeOperatingProfit[i]+=Math.round(p.stats.lastProfit||0)});
   if(CHECKPOINTS.includes(result.completed)||g.gameOver)result.checkpoints.push({month:result.completed,banks:g.players.map(p=>bankRow(E,g,p))});
  }
 }catch(error){result.failure=String(error.stack||error).split('\n').slice(0,4).join('\n');}
 result.gameOver=!!g.gameOver;result.endReason=g.endReason||null;result.elapsedSeconds=Math.round((performance.now()-started)/1000);
 return result;
}

if(process.argv[2]==='--campaign'){ // child process: one campaign
 process.on('message',job=>{process.send(runCampaign(job));process.exit(0);});
 return;
}

const args=process.argv.slice(2),name=args[0],option=(key,fallback)=>{const a=args.find(x=>x.startsWith('--'+key+'='));return a?a.slice(key.length+3):fallback;};
if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(name||''))throw Error('Usage: node tools/edition_balance_lab.js NAME [--months=36] [--seeds=1,2,3] [--scenarios=balanced,rate] [--variants=expanded,core] [--jobs=N]');
const months=Number(option('months','36')),seeds=option('seeds','1,2,3').split(',').map(Number),scenarios=option('scenarios','balanced,rate').split(','),
 variants=option('variants','expanded,core').split(','),jobs=Math.max(1,Math.min(Number(option('jobs',String(os.cpus().length))),16));
if(!Number.isSafeInteger(months)||months<1||months>480||seeds.some(s=>!Number.isSafeInteger(s))||variants.some(v=>!VARIANTS[v])||
 scenarios.some(s=>!['balanced','rate','regulatory','growth'].includes(s)))throw Error('Invalid months, seeds, scenarios or variants.');
const file=path.join(root,'output','edition-balance-'+name+'.json');
if(fs.existsSync(file))throw Error('Preserve the existing report; choose a new name.');
const {portableSha256,engineSha256}=engine(),queue=[];
for(const variant of variants)for(const scenario of scenarios)for(const seed of seeds)queue.push({variant,scenario,seed,months});
const results=[],started=Date.now();
function next(){
 const job=queue.shift();if(!job)return Promise.resolve();
 return new Promise(resolve=>{
  const child=fork(__filename,['--campaign']);child.send(job);
  child.on('message',result=>{results.push(result);const last=result.checkpoints.at(-1)?.banks[0];
   console.log(`${result.variant} ${result.version} ${result.scenario} seed ${result.seed}: ${result.completed}/${months} months in ${result.elapsedSeconds}s`+
    (last?`, loans/deposits ${last.loanToDeposit}%, loans $${(last.loans/1e6).toFixed(1)}M`:'')+(result.failure?' FAILED':'')+(result.gameOver?' ended '+result.endReason:''));});
  child.on('exit',()=>resolve(next()));
 });
}
Promise.all(Array.from({length:Math.min(jobs,queue.length)},next)).then(()=>{
 results.sort((a,b)=>a.variant.localeCompare(b.variant)||a.scenario.localeCompare(b.scenario)||a.seed-b.seed);
 const report={name,portableSha256,engineSha256,months,seeds,scenarios,variants,elapsedSeconds:Math.round((Date.now()-started)/1000),
  scope:'Ordinary same-rule AI for both seats; no injected resources. Diagnostic, not optimal-play or human-balance evidence.',results};
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,1)+'\n',{flag:'wx'});
 console.log('Report: '+path.relative(root,file));
 if(results.some(r=>r.failure))process.exitCode=1;
});
