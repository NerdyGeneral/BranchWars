'use strict';
// Bounded whole-engine experiments, no cash, employees, firms or assets injected.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx={};vm.runInNewContext(source,ctx);const E=ctx.BWEngine;
const long=process.argv.includes('--long'),baseline=process.argv.includes('--baseline'),expanded=process.argv.includes('--expanded'),matrix=expanded&&!long?[['balanced',120]]:baseline?[['balanced',24]]:long?[['balanced',120],['regulatory',480]]:['balanced','rate','regulatory','growth'].map(s=>[s,24]);
if(expanded&&baseline)throw Error('Expanded edition and historical baseline are separate experiments.');
const report={engineSha256:createHash('sha256').update(source).digest('hex'),portableSha256:createHash('sha256').update(html).digest('hex'),
 scope:'Ordinary current AI for both seats; no injected resources. Early failures are retained. Not human or two-computer acceptance. Investment businesses are recorded even when the ordinary AI leaves them unopened.',baseline,expanded,campaigns:[]};
const checkpointArg=process.argv.find(arg=>arg.startsWith('--checkpoint=')),checkpoint=checkpointArg?checkpointArg.slice('--checkpoint='.length):'15';
if(!/^[1-9][0-9]*$/.test(checkpoint))throw Error('Checkpoint must be a positive integer; preserve earlier build reports.');
const file=path.resolve(__dirname,'../output/master-checkpoint'+checkpoint+'-commercial-'+(expanded?'expanded-':'')+(baseline?'baseline':long?'long':expanded?'120':'matrix')+'.json');fs.mkdirSync(path.dirname(file),{recursive:true});
if(fs.existsSync(file))throw Error('Preserve the existing checkpoint report; select a new checkpoint.');
for(const [scenario,limit]of matrix){
 const options=expanded?E.previewCampaignEdition({},'expanded').options:E.previewFeatureSelection({}, baseline?{field:'financialGroupVersion',value:10}:{field:'commercialAccountsVersion',value:1}).options;
 const g=E.createGame({...options,scenario,seed:'business-balance:1',created:1,mode:'hotseat'}),start=performance.now();
 const result={scenario,requestedMonths:limit,completed:0,firstAccount:[null,null],firstInvestment:[null,null],firstCompanyShares:[null,null],firstCompanyControl:[null,null],history:[]};
 try{
  while(!g.gameOver&&result.completed<limit){
   const plans=g.players.map((p,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);result.completed++;
   g.players.forEach((p,i)=>{if(Object.keys(p.commercialAccounts?.accounts||{}).length&&result.firstAccount[i]===null)result.firstAccount[i]=result.completed;if(p.investmentBusiness?.status==='active'&&result.firstInvestment[i]===null)result.firstInvestment[i]=result.completed;if(Object.values(p.companyShares?.positions||{}).some(x=>x.shares>0)&&result.firstCompanyShares[i]===null)result.firstCompanyShares[i]=result.completed;});
   g.players.forEach((p,i)=>{if(Object.values(p.companyShares?.positions||{}).some(x=>x.shares>50000)&&result.firstCompanyControl[i]===null)result.firstCompanyControl[i]=result.completed;});
   if(result.completed%24===0||g.gameOver)result.history.push({month:result.completed,banks:g.players.map(p=>({cash:p.stats.cash,equity:p.stats.capital,deposits:p.stats.deposits,loans:p.stats.loans,earnings:p.stats.earnings,
    doctrine:p.doctrine,operatingReport:p.operatingReport||null,parentCash:p.financialGroup?.parent?.accounts?.cash??null,parentDebt:p.financialGroup?.parent?.accounts?.debt??null,controlDeals:p.companyControl?.deals||null,staff:p.stats.staff,activeProjects:p.projects.map(project=>({key:project.key,target:project.target})),
    companyPositions:p.companyShares?.positions||null,premises:p.sharedPremises?{rooms:p.sharedPremises.book.rooms.length,allocations:p.sharedPremises.policy.allocations.length,totals:p.sharedPremises.totals,unavailable:p.sharedPremises.unavailable}:null,executiveEquityChange:g.eventLedger.filter(e=>e.cycle===result.completed&&e.target===p.id&&e.source==='applyDecision').reduce((n,e)=>n+(e.deltas?.capital||0),0),
    businessDeposits:E.commercialAccountBalance(p),accounts:Object.keys(p.commercialAccounts?.accounts||{}).length,work:p.commercialAccounts?.report?.quarters||0,chargeoffs:p.stats.chargeoffs,...(expanded?{investmentStatus:p.investmentBusiness.status,investmentCash:p.investmentBusiness.book.accounts.cash,investmentEarnings:p.investmentBusiness.book.retainedEarnings,clientAssets:g.investmentEconomy.world.clients.filter(c=>c.owner===p.id).reduce((n,c)=>n+E.InvestmentClients.value(g.investmentEconomy.world,c),0)}:{} )}))});
   if(result.completed%24===0){console.log(scenario,result.completed,'months; business deposits',g.players.map(p=>E.commercialAccountBalance(p)));fs.writeFileSync(file,JSON.stringify({...report,running:true,campaigns:[...report.campaigns,result]},null,2)+'\n');}
  }
  result.gameOver=g.gameOver;result.winner=g.winnerId;result.companyClosures=g.companyEconomy.companies.filter(c=>c.resolution).length;
 }catch(error){result.failure={month:g.cycle,message:error.message};process.exitCode=1;}
 result.elapsedMs=Math.round(performance.now()-start);result.msPerMonth=Math.round(result.elapsedMs/Math.max(1,result.completed));report.campaigns.push(result);
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(result));
 if(result.failure)break;
}
console.log('Saved '+file);
