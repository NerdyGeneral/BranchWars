'use strict';
// Read-only engine diagnostics. Optional reports are written under reports/baselines.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const args=process.argv.slice(2),arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1]},root=path.resolve(__dirname,'..');
const file=path.resolve(root,arg('--source','BRANCH_WARS.html')),source=fs.readFileSync(file,'utf8'),ctx={console,Math,Date};
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine;
const scenario=arg('--scenario','balanced'),seed=Number(arg('--seed','1')),limit=Number(arg('--turns','120'));
const g=E.createGame({campaignRulesVersion:1,serviceExpansionVersion:1,mode:'hotseat',scenario,seed:'release-'+scenario+'-'+seed,created:1}),rows=[];
for(let turn=0;turn<limit&&!g.gameOver;turn++){
 const plans=[E.chooseBot(g,0),E.chooseBot(g,1)],before=g.players.map((p,i)=>({equity:p.stats.capital,ratio:E.capitalRatio(p),cash:p.stats.cash,loans:p.stats.loans,spend:E.planBudget(p,plans[i]).total,allocation:plans[i].allocation,policy:plans[i].servicePolicy,projects:E.planInitiatives(plans[i]),forecast:E.operatingPreview(E.publicState(g,i).me,plans[i],g.economy).profit})),cycle=g.cycle;
 E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);
 g.players.forEach((p,i)=>{E.AccountingPrototype.check(p.accounting);assert.equal(p.stats.capital,p.accounting.accounts.equity);rows.push({cycle,seat:i,...before[i],closingEquity:p.stats.capital,closingRatio:E.capitalRatio(p),profit:p.stats.lastProfit,contracts:p.serviceDesk.contracts.length,service:E.contractIncome(p),report:p.operatingReport,distress:p.distress,policies:p.policies,loanProduct:p.products.credit,creditMix:p.creditBook?.cohorts.reduce((s,c)=>(s[c.product]=(s[c.product]||0)+c.principal,s),{})})});
}
const result={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),scenario,seed,cycle:g.cycle,ended:g.gameOver,reason:g.endReason,rows};
if(args.includes('--report')){const dir=path.join(root,'reports/baselines');fs.mkdirSync(dir,{recursive:true});const out=path.join(dir,'service-diagnostic-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(out)}
console.log(JSON.stringify({scenario,seed,cycle:g.cycle,ended:g.gameOver,reason:g.endReason,rows:rows.filter(r=>r.cycle>g.cycle-8).map(r=>({cycle:r.cycle,seat:r.seat,equity:r.equity,closingEquity:r.closingEquity,ratio:r.closingRatio,spend:r.spend,forecast:r.forecast,profit:r.profit,allocation:r.allocation,projects:r.projects,serviceNet:r.service.fees-r.service.cost,report:r.report}))},null,2));
