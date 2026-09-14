'use strict';
// Controlled Core workforce tilts. Same-rule AI retains the other decisions;
// this is a diagnostic, not an optimal-policy or Expanded viability claim.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const months=Number(process.argv[2]),name=process.argv[3],balanceSheet=process.argv.includes('--balance-sheet'),bankEconomics=process.argv.includes('--bank-economics')||balanceSheet,serviced=process.argv.includes('--serviced')||bankEconomics;
if(![24,120,480].includes(months)||!/^income-core-[a-z0-9-]+\.json$/.test(name||'')||process.argv.slice(4).some(x=>!['--serviced','--bank-economics','--balance-sheet'].includes(x)))throw Error('Usage: node tools/income_strategy_lab.js 120 income-core-unique.json [--serviced | --bank-economics | --balance-sheet]');
const html=require('./build_game').assemble().html,c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);const E=c.BWEngine;
const weights={balanced:[3,2,2,1],lending:[2,1,4,1],commercial:[2,4,1,1]},roles=['service','business','lending','operations'];
const report={sha256:createHash('sha256').update(html).digest('hex'),requestedMonths:months,earningsDefinition:'Core stats.earnings accumulates operating profit, not a retained-equity ledger. Strategic cash/capital spending is not deducted from that field.',scope:'Core only; paired customer-facing workforce tilt versus ordinary same-rule AI, preserving the bot Operations reservation; two fixed seeds and four scenarios. No resources injected. Not optimal play, full release acceptance or Expanded balance.',runs:[]};
const started=performance.now();
report.commercialServiceVersion=serviced?1:0;
report.bankEconomicsVersion=balanceSheet?2:bankEconomics?1:0;
if(balanceSheet)report.earningsDefinition='Core8.19 records retained earnings in its reconciled accounting book, including strategic spending and funding-sale losses. Do not compare this field directly with older Core cumulative operating-profit totals.';
for(const scenario of ['balanced','rate','regulatory','growth'])for(const seed of [1,2])for(const [strategy,weight]of Object.entries(weights)){
 const g=E.createGame({...(serviced?{incomeHistoryVersion:1,commercialServiceVersion:1}:{}),...(bankEconomics?{bankEconomicsVersion:balanceSheet?2:1}:{}),mode:'hotseat',scenario,seed:'income-core:'+seed,created:1}),totals=[{},{}],checkpoints=[],start=performance.now();let completed=0,failure;
 try{
  while(!g.gameOver&&completed<months){
   const plans=g.players.map((_,i)=>E.chooseBot(g,i)),staff=g.players[0].stats.staff;
   // Never take execution staff away from the bot's existing commitments.
   const operations=Math.max(plans[0].allocation.operations,Math.floor(staff/8)),remaining=staff-operations;
   const a=[...weight.slice(0,3).map(w=>Math.floor(w*remaining/7)),operations];
   for(let i=0,left=staff-a.reduce((n,x)=>n+x,0);left>0;i++,left--)a[i%3]++;
   plans[0].allocation=Object.fromEntries(roles.map((role,i)=>[role,a[i]]));
   E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validateLedger(g);if(balanceSheet)E.validatePilot(g);
   for(const [i,p]of g.players.entries()){
    const r=p.operatingReport;assert(E.IncomeReview.reconciliation(r).reconciled);
    for(const k of ['loanIncome','depositIncome','commercialIncome','otherIncome','fundingCost','expense','chargeoff','profit'])totals[i][k]=(totals[i][k]||0)+r[k];
   }
   completed++;
   if([12,24,48,120,480].includes(completed))checkpoints.push({month:completed,banks:g.players.map((p,i)=>({totals:{...totals[i]},loans:p.stats.loans,deposits:p.stats.deposits,cash:p.stats.cash,capital:p.stats.capital,capitalRatio:E.capitalRatio(p),debt:p.stats.emergencyDebt,earnings:p.stats.earnings,staff:p.stats.staff}))});
  }
 }catch(error){failure=error.stack;process.exitCode=1;}
 const banks=g.players.map((p,i)=>({totals:totals[i],loans:p.stats.loans,deposits:p.stats.deposits,cash:p.stats.cash,capital:p.stats.capital,capitalRatio:E.capitalRatio(p),debt:p.stats.emergencyDebt,earnings:p.stats.earnings,staff:p.stats.staff,business:p.stats.business,merchant:p.stats.merchant}));
 report.runs.push({scenario,seed,strategy,completed,gameOver:g.gameOver,endReason:g.endReason||null,failedId:g.failedId||null,banks,checkpoints,elapsedMs:Math.round(performance.now()-start),...(failure?{failure}:{})});
 console.log(scenario+' seed '+seed+' '+strategy+': '+completed+' months, '+(balanceSheet?'retained earnings ':'cumulative operating earnings ')+banks[0].earnings+'/'+banks[1].earnings+(failure?' FAILED':''));
}
report.elapsedMs=Math.round(performance.now()-started);fs.writeFileSync(path.join(__dirname,'../output',name),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
