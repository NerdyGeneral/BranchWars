'use strict';
// Private numerical experiments only. Never write alternate rules into the
// normal game or export a save that pretends they are supported campaign rules.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),months=Number(process.argv[2]),name=process.argv[3],flags=process.argv.slice(4),values={};
for(const flag of flags){const match=/^--(variants|seed|scenario)=(.+)$/.exec(flag);if(!match||Object.hasOwn(values,match[1]))throw Error('Unknown or repeated experiment option: '+flag);values[match[1]]=match[2];}
const selection=values.variants?.split(','),seed=values.seed||'business-balance:1',scenario=values.scenario||'balanced';
const catalog=[{id:'current',payroll:18000,bonuses:true},{id:'no-bonuses',payroll:18000,bonuses:false},{id:'service-payroll12',payroll:12000,bonuses:false},{id:'service-payroll9',payroll:9000,bonuses:false},
 {id:'provisional-current',bankEconomics:1,payroll:12000,bonuses:false},
 {id:'service-pricing',bankEconomics:1,payroll:6000,bonuses:false,businessFee:250,merchantFee:200},
 {id:'service-workload',bankEconomics:1,payroll:6000,bonuses:false,businessFee:250,merchantFee:200,businessPerQuarter:20,merchantPerQuarter:50}];
if(![12,24].includes(months)||!/^income-economy-[a-z0-9-]+$/.test(name||'')||!/^business-balance:[12]$/.test(seed)||!['balanced','rate','regulatory','growth'].includes(scenario)||selection&&(new Set(selection).size!==selection.length||selection.some(id=>!catalog.some(v=>v.id===id))))throw Error('Usage: node tools/income_economy_experiment.js 12|24 income-economy-unique [--variants=current,no-bonuses,service-payroll12,service-payroll9] [--seed=business-balance:1|2] [--scenario=balanced|rate|regulatory|growth]');
const folder=path.join(root,'output',name);fs.mkdirSync(folder);
const html=require('./build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],hash=s=>createHash('sha256').update(s).digest('hex');
fs.writeFileSync(path.join(folder,'source.html'),html,{flag:'wx'});
const variants=catalog.filter(v=>selection?selection.includes(v.id):!v.bankEconomics);
const report={portableSha256:hash(html),sourceEngineSha256:hash(source),requestedMonths:months,seed,scenario,
 scope:'Selected private ordinary-AI numerical experiments. No new initial resources, altered coupons, fabricated customers, user-save upgrades or normal-build changes. The seed and opening are matched, but endogenous choices and RNG consumption can change subsequent economic paths. Not a same-shock counterfactual, released rule set, supported save, full strategy matrix or long-run acceptance.',runs:[]};
function patched(variant){
 let script=source;const replacements=[];
 function replace(find,replacement,count){assert.equal(script.split(find).length-1,count,'Unexpected source multiplicity for '+find);script=script.split(find).join(replacement);replacements.push({find,replacement,count});}
 if(!variant.bonuses&&!variant.bankEconomics)for(const term of ['(a.service+a.business+a.lending)*8000','s.wealth*1450','u.technology*13000','u.wealth*18000','digital*4000'])replace(term,'0',2);
 if(variant.businessFee)replace('(business*760+merchant*650)*coverage','(business*'+variant.businessFee+'+merchant*'+variant.merchantFee+')*coverage',1);
 if(variant.businessPerQuarter)replace('initial+business/80+merchant/150','initial+business/'+variant.businessPerQuarter+'+merchant/'+variant.merchantPerQuarter,1);
 if(variant.payroll!==(variant.bankEconomics?12000:18000)){
  if(script.includes('function bankBasePayroll(p)')){
   const predicate=script.includes('[1,2].includes(p.bankEconomicsVersion)?12000:18000')?'[1,2].includes(p.bankEconomicsVersion)':'p.bankEconomicsVersion===1';
   replace(predicate+'?12000:18000',predicate+(variant.bankEconomics?'?'+variant.payroll+':18000':'?12000:'+variant.payroll),1);
  }
  else {
  replace('s.staff*18000+facilityExpense','s.staff*'+variant.payroll+'+facilityExpense',1);
  replace('incomeSource_basePayroll:s.staff*18000','incomeSource_basePayroll:s.staff*'+variant.payroll,1);
  replace('next*18000','next*'+variant.payroll,1);
  replace('hires*18000','hires*'+variant.payroll,1);
  replace('p.stats.staff*18000+metrics.expense','p.stats.staff*'+variant.payroll+'+metrics.expense',1);
  }
 }
 return {script,replacements};
}
function save(){fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');}
// Validate every source replacement before starting any selected campaign.
let prepared;
try{prepared=variants.map(variant=>({variant,...patched(variant)}));}
catch(error){report.running=false;report.preflightFailure=error.stack;save();throw error;}
for(const {variant,script,replacements} of prepared){
 const ctx={};vm.runInNewContext(script,ctx);const E=ctx.BWEngine;
 const g=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true}).options,commercialServiceVersion:1,creditWorkloadVersion:1,...(variant.bankEconomics?{bankEconomicsVersion:1}:{}),mode:'hotseat',created:1,seed:report.seed,scenario:report.scenario});
 const run={...variant,saveVersion:g.version,engineSha256:hash(script),replacements,history:[],running:true};report.runs.push(run);save();const started=performance.now();
 try{
  while(!g.gameOver&&g.cycle<=months){
   const month=g.cycle,plans=g.players.map((_,i)=>E.chooseBot(g,i)),opening=g.players.map(p=>({...p.stats}));
   E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validateLedger(g);E.validatePilot(g);
   const banks=g.players.map((p,i)=>{
    const r=p.operatingReport,s=E.IncomeReview.statement(r);assert(s.available,s.reason);if(!variant.bonuses)assert.equal(s.abstract,0);
    const events=g.eventLedger.filter(e=>e.cycle===month&&e.target===p.id),starts=events.filter(e=>e.category==='resolution.start');assert.equal(starts.length,1);
    const moves=events.filter(e=>e.parentCause===starts[0].id&&e.deltas);
    for(const field of ['cash','loans','earnings'])assert.equal(moves.reduce((n,e)=>n+(e.deltas[field]||0),0),p.stats[field]-opening[i][field],field+' must reconcile');
    return {loans:p.stats.loans,deposits:p.stats.deposits,cash:p.stats.cash,capital:p.stats.capital,earnings:p.stats.earnings,debt:p.stats.emergencyDebt,
     staff:p.stats.staff,capitalRatio:E.capitalRatio(p),loanInterest:r.loanIncome,commercialFees:r.commercialIncome,abstract:s.abstract,
     netInterest:s.netInterest,operatingProfit:r.profit,expense:r.expense,creditLoss:r.chargeoff,
     payroll:r.incomeSource_basePayroll,facilities:r.incomeSource_facilityUpkeep,
     securities:p.accounting.accounts.securities,securitiesInterest:r.incomeSource_securitiesInterest,
     principalRepaid:r.principalRepaid,principalRecovered:r.creditRecovery,namedCredit:r.companyCredit,
     loanBook:E.creditSummary(p),business:p.stats.business,merchant:p.stats.merchant,
     fundedOrdinary:Math.max(0,r.loanGrowth+(r.principalRepaid||0)+(r.creditRecovery||0)+r.chargeoff+(r.companyCredit?.principalPaid||0)+(r.companyCredit?.recoveredPrincipal||0)-(r.companyCredit?.interestWrittenOff||0)-(r.companyCredit?.advanced||0)),
     allocation:plans[i].allocation,lendingPolicy:plans[i].lendingPolicy,creditAllocation:plans[i].groupPolicy.creditAllocation};
   });
   run.history.push({month,economy:g.economy.key,banks});if(month%6===0)console.log(variant.id+' month '+month+': retained '+banks.map(b=>b.earnings).join('/'));save();
  }
  run.completedMonth=run.history.at(-1)?.month||0;run.gameOver=g.gameOver;run.endReason=g.endReason||null;
 }catch(error){run.failure={month:g.cycle,message:error.stack};process.exitCode=1;console.error(variant.id+': '+error.stack);}
 run.running=false;run.elapsedMs=Math.round(performance.now()-started);save();
}
report.running=false;save();console.log(JSON.stringify({folder,runs:report.runs.map(r=>({id:r.id,completed:r.completedMonth,failure:r.failure?.message,endReason:r.endReason}))}));
