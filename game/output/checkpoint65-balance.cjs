'use strict';
// Exact-artifact ordinary AI campaigns. No resource grants or hidden policies.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');process.chdir(root);
const gate=JSON.parse(fs.readFileSync('output/master-checkpoint65-acceptance.json'));
if(gate.status!=='passed')throw Error('Complete the Expanded integration gate before this balance run.');
const html=fs.readFileSync(gate.artifact,'utf8'),hash=x=>createHash('sha256').update(x).digest('hex');
if(hash(html)!==gate.sha256)throw Error('Review artifact changed.');
const dir='output/expanded65-balance';if(fs.existsSync(dir))throw Error('Keep the earlier experiment; do not overwrite it.');fs.mkdirSync(dir);
const ctx={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine;
const copy=x=>JSON.parse(JSON.stringify(x)),report={created:new Date().toISOString(),artifact:gate.artifact,sha256:gate.sha256,scope:'Ordinary current AI, fixed seed, no resource injection, no balance tuning. Early endings retained; not human acceptance or complete strategy matrix.',status:'running',campaigns:[]};
const save=()=>fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
const snapshot=(name,g)=>fs.writeFileSync(dir+'/'+name+'.json.gz',zlib.gzipSync(JSON.stringify(g)));
save();
for(const [scenario,limit] of [['balanced',120],['regulatory',480]]){
 const g=E.createGame({...E.previewCampaignEdition({},'expanded').options,scenario,seed:'business-balance:1',created:1,mode:'hotseat'});
 const result={scenario,requestedMonths:limit,completed:0,offered:[0,0],advanced:[0,0],interest:[0,0],principalPaid:[0,0],principalWrittenOff:[0,0],firstLoan:[null,null],history:[],timingsMs:[]};report.campaigns.push(result);snapshot(scenario+'-opening',g);save();
 let plans=null;const started=performance.now();
 try{
  while(!g.gameOver&&result.completed<limit){
   const start=performance.now();plans=g.players.map((p,i)=>E.chooseBot(g,i));plans.forEach((p,i)=>result.offered[i]+=(p.companyCreditOrders||[]).length);
   E.submit(g,0,plans[0]);
   if((result.completed+1)%12===0){const restored=E.migrateCampaign(copy(g));if(JSON.stringify(restored)!==JSON.stringify(g))throw Error('Half-ready save changes campaign state.');}
   E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);result.completed++;
   for(const [i,p]of g.players.entries()){
    const r=p.operatingReport.companyCredit;
    if(r)for(const field of ['advanced','interest','principalPaid','principalWrittenOff'])result[field][i]+=r[field]||0;
    if(r?.advanced&&result.firstLoan[i]===null)result.firstLoan[i]=result.completed;
   }
   result.timingsMs.push(Math.round(performance.now()-start));
   if(result.completed%12===0||g.gameOver){
    for(const i of [0,1])E.validateFinancialGroupView(E.publicState(g,i));
    const totalDeposits=g.players.reduce((n,p)=>n+p.stats.deposits,0);
    result.history.push({month:result.completed,banks:g.players.map(p=>({name:p.name,doctrine:p.doctrine,cash:p.stats.cash,capital:p.stats.capital,deposits:p.stats.deposits,depositShare:totalDeposits?p.stats.deposits/totalDeposits:0,loans:p.stats.loans,earnings:p.stats.earnings,staff:p.stats.staff,commercialDeposits:E.commercialAccountBalance(p),commercialAccounts:Object.keys(p.commercialAccounts.accounts).length,companyCredit:p.companyCredit,operatingReport:p.operatingReport,agency:p.financialGroup.agency,investment:p.investmentBusiness,companyPositions:p.companyShares.positions,companyControl:p.companyControl,sharedPremises:p.sharedPremises.totals}))});
    snapshot(scenario+'-month-'+result.completed,g);save();console.log(JSON.stringify({scenario,months:result.completed,offers:result.offered,advanced:result.advanced,earnings:g.players.map(p=>p.stats.earnings)}));
   }
  }
  result.gameOver=g.gameOver;result.winnerId=g.winnerId;result.status=g.gameOver?'ended':'requested-months-complete';
 }catch(e){result.status='failed';result.failure={month:g.cycle,message:e.message,stack:e.stack};snapshot(scenario+'-failure',{game:g,plans});process.exitCode=1;}
 result.elapsedMs=Math.round(performance.now()-started);snapshot(scenario+'-closing',g);save();
 if(result.status==='failed')break;
}
report.status=report.campaigns.some(c=>c.status==='failed')?'failed':'completed';report.finished=new Date().toISOString();save();console.log(JSON.stringify({status:report.status,report:dir+'/report.json'}));
