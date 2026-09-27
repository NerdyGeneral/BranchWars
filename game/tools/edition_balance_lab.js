'use strict';
// Measured campaign economics for current editions: does the bank lend its
// deposits, which lending cap binds, how the loan book and income evolve, and
// what the AI does with its offices. Ordinary same-rule AI plays both seats; no
// resources are injected. A diagnostic for comparing rule variants on the same
// seeds, not a claim of optimal play or human balance.
//
//   node tools/edition_balance_lab.js NAME [--months=36] [--seeds=1,2,3]
//        [--scenarios=balanced,rate] [--variants=expanded,expanded-933,core]
//        [--jobs=N] [--tune=targetLoanToDeposit=.8,deploymentRate=.1]
//
// Variants are ordinary new-game setup: `expanded` and `core` are what the setup
// screen creates today, `expanded-933` is Expanded without balance-sheet lending.
// --tune replaces entries of BALANCE_SHEET_LENDING_RULES in the measured copy
// only; the report records it and the engine hash of what was measured.
//
// Writes output/edition-balance-NAME.json and refuses to replace an earlier
// report. Each campaign runs in its own process; Expanded AI planning takes
// several seconds a month, so a 36-month campaign takes minutes.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),
 {createHash}=require('node:crypto'),{fork}=require('node:child_process');
const root=path.resolve(__dirname,'..');

// Rule variants. Add a new variant here when a new rule boundary needs measuring
// against the unchanged one; every variant starts from ordinary edition setup.
const CURRENT={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true};
const VARIANTS={
 core:E=>E.previewCampaignEdition({},'core',CURRENT).options,
 expanded:E=>E.previewCampaignEdition({},'expanded',CURRENT).options,
 'expanded-934':E=>E.previewCampaignEdition({},'expanded',{...CURRENT,currentMonetaryPolicy:false}).options,
 'expanded-933':E=>E.previewCampaignEdition({},'expanded',{...CURRENT,currentLending:false}).options
};
const CHECKPOINTS=[1,3,6,12,24,36,48,60,84,120];

function engine(tune={}){
 const html=require('./build_game').assemble().html;let source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
 if(Object.keys(tune).length){
  const literal=source.match(/const BALANCE_SHEET_LENDING_RULES=Object\.freeze\((\{[^}]*\})\);/);
  if(!literal)throw Error('Tunable lending rules not found; update the lab.');
  const rules=Function('return '+literal[1])();
  for(const [key,value]of Object.entries(tune)){if(!Object.hasOwn(rules,key))throw Error('Unknown tuning key: '+key);rules[key]=value;}
  source=source.replace(literal[0],'const BALANCE_SHEET_LENDING_RULES=Object.freeze('+JSON.stringify(rules)+');');
 }
 // Read-only access to the lending caps the engine applies; no rule is replaced.
 const exposed=source.replace('root.BWEngine={','root.BWEngine={loanProductionCapacity,regionalOperations,creditSalesStaff,workforceAllocation,');
 if(exposed===source)throw Error('Engine export object not found; update the lab.');
 const c={console};vm.runInNewContext(exposed,c);
 return {E:c.BWEngine,portableSha256:createHash('sha256').update(html).digest('hex'),engineSha256:createHash('sha256').update(source).digest('hex')};
}

function lendingCaps(E,g,p){
 const parts={},capacity=E.loanProductionCapacity(g,p,parts),round=n=>Number.isFinite(n)?Math.round(n):null,
  binding=capacity>=parts.office-1?'office':capacity>=parts.funding-1?'funding':'staff';
 return {lendingStaff:Math.round(E.creditSalesStaff(p,E.workforceAllocation(p).lending)*10)/10,capacity:round(capacity),
  officeCapacity:round(parts.office),fundingRoom:round(parts.funding),centralCapacity:round(parts.central),binding};
}
function bankRow(E,g,p){
 const s=p.stats,r=p.operatingReport||{},income=(r.loanIncome||0)+(r.depositIncome||0)+(r.commercialIncome||0)+(r.otherIncome||0),
  offices={};for(const o of p.facilityNetwork?.offices||[])if(o.closedCycle===null)offices[o.model]=(offices[o.model]||0)+1;
 return {deposits:Math.round(s.deposits),loans:Math.round(s.loans),cash:Math.round(s.cash),
  loanToDeposit:Math.round(1000*s.loans/Math.max(1,s.deposits))/10,capitalRatio:Math.round(10*E.capitalRatio(p))/10,
  lastOperatingProfit:Math.round(s.lastProfit||0),loanIncomeShare:income>0?Math.round(1000*(r.loanIncome||0)/income)/10:null,
  offices,...lendingCaps(E,g,p)};
}

function runCampaign({variant,scenario,seed,months,tune,engineSha256}){
 // Each campaign assembles the engine itself; refuse to measure a source tree
 // that changed after the run started.
 const built=engine(tune);if(built.engineSha256!==engineSha256)return {variant,scenario,seed,version:null,completed:0,checkpoints:[],failure:'Engine source changed after the run started.'};
 const {E}=built,g=E.createGame({...VARIANTS[variant](E),mode:'hotseat',seed:'edition-balance:'+seed,scenario,created:1,startingWorkforce:'covered'});
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
if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(name||''))throw Error('Usage: node tools/edition_balance_lab.js NAME [--months=36] [--seeds=1,2,3] [--scenarios=balanced,rate] [--variants=expanded,expanded-933,core] [--jobs=N] [--tune=key=value,...]');
const tune=Object.fromEntries((option('tune','')||'').split(',').filter(Boolean).map(pair=>{const [key,value]=pair.split('=');
 if(!/^[A-Za-z]+$/.test(key||'')||!Number.isFinite(Number(value)))throw Error('Invalid --tune entry: '+pair);return [key,Number(value)];}));
const months=Number(option('months','36')),seeds=option('seeds','1,2,3').split(',').map(Number),scenarios=option('scenarios','balanced,rate').split(','),
 variants=option('variants','expanded,core').split(','),jobs=Math.max(1,Math.min(Number(option('jobs',String(os.cpus().length))),16));
if(!Number.isSafeInteger(months)||months<1||months>480||seeds.some(s=>!Number.isSafeInteger(s))||variants.some(v=>!VARIANTS[v])||
 scenarios.some(s=>!['balanced','rate','regulatory','growth'].includes(s)))throw Error('Invalid months, seeds, scenarios or variants.');
const file=path.join(root,'output','edition-balance-'+name+'.json');
if(fs.existsSync(file))throw Error('Preserve the existing report; choose a new name.');
const {portableSha256,engineSha256}=engine(tune),queue=[];
for(const variant of variants)for(const scenario of scenarios)for(const seed of seeds)queue.push({variant,scenario,seed,months,tune,engineSha256});
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
 const report={name,portableSha256,engineSha256,tune,months,seeds,scenarios,variants,elapsedSeconds:Math.round((Date.now()-started)/1000),
  scope:'Ordinary same-rule AI for both seats; no injected resources. Diagnostic, not optimal-play or human-balance evidence.',results};
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,1)+'\n',{flag:'wx'});
 console.log('Report: '+path.relative(root,file));
 if(results.some(r=>r.failure))process.exitCode=1;
});
