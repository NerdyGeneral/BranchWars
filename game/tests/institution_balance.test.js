'use strict';
// Same-rule AI campaign characterization, not a win-rate or enjoyment guarantee.
// Run --case=scenario:seed:months to reproduce one exact failed/interrupted case.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {loadEngine,createCampaign,validate,metrics}=require('../tools/institution_qa_fixture.js');
const {E,htmlHash,engineHash}=loadEngine(),started=Date.now(),results=[];
const scenarios=['balanced','rate','regulatory','growth'];
let cases=[...scenarios.flatMap(s=>['institution-A','institution-B'].map(seed=>({scenario:s,seed,months:24}))),
  ...scenarios.map(s=>({scenario:s,seed:'institution-long',months:120})),
  {scenario:'regulatory',seed:'institution-stress',months:480}];
const filter=process.argv.find(x=>x.startsWith('--case='));
if(filter){const [scenario,seed,length]=filter.slice(7).split(':');assert(scenarios.includes(scenario));assert(seed);const months=Number(length);assert(Number.isSafeInteger(months)&&months>0&&months<=480);cases=[{scenario,seed,months}];}
for(const spec of cases){
  const g=createCampaign(E,spec.scenario,spec.seed),caseStart=Date.now(),initialFlags=g.players.map(p=>p.isBot);
  const actions={conversions:0,cancellations:0,appointments:0,demotions:0,specialistHires:0,agencyLaunches:0};
  let resolved=0,maxShare=.5,minCapitalRatio=Infinity,maxArrears=0,pending=null,submittingSeat=null;
  validate(E,g,true);
  try{
    while(resolved<spec.months&&!g.gameOver){
      const plans=g.players.map((p,i)=>E.chooseBot(g,i));
      pending=plans;
      for(const plan of plans){
        actions.conversions+=Number(!!plan.facilityPolicy?.convert);actions.cancellations+=Number(!!plan.facilityPolicy?.cancel);
        for(const value of Object.values(plan.leaderOrders||{})){if(value==='none')actions.demotions++;else if(value!==null)actions.appointments++;}
        actions.specialistHires+=Object.values(plan.specialistHires||{}).reduce((n,x)=>n+x,0);actions.agencyLaunches+=Number(!!plan.agencyPolicy?.launch);
      }
      for(const seat of [0,1]){submittingSeat=seat;E.submit(g,seat,plans[seat]);}resolved++;submittingSeat=null;
      validate(E,g,resolved%24===0||resolved===spec.months||!!g.gameOver);
      const current=metrics(E,g);
      maxShare=Math.max(maxShare,...current.players.map(p=>p.depositShare));
      minCapitalRatio=Math.min(minCapitalRatio,...current.players.map(p=>p.capitalRatio));
      maxArrears=Math.max(maxArrears,...current.players.map(p=>p.leadershipArrears));
      if(resolved%24===0)console.log(JSON.stringify({progress:spec,resolved,cycle:g.cycle,elapsedSeconds:(Date.now()-caseStart)/1000}));
    }
    assert.deepEqual(g.players.map(p=>p.isBot),initialFlags);validate(E,g,true);
    const result={...spec,resolved,seconds:(Date.now()-caseStart)/1000,actions,maxDepositShare:maxShare,minCapitalRatio,maxLeadershipArrears:maxArrears,...metrics(E,g)};
    results.push(result);console.log(JSON.stringify({caseResult:result}));
  }catch(error){
    const directory=path.resolve(__dirname,'..','reports','qa');fs.mkdirSync(directory,{recursive:true});
    const file=path.join(directory,'institution-failure-'+engineHash.slice(0,12)+'-'+g.cycle+'.json');
    const data=JSON.stringify({spec,resolved,submittingSeat,htmlHash,engineHash,actions,error:error.stack,game:g,pending});
    // Engine-only diagnostic state contains no connection credentials. Keep a
    // previous capture rather than silently replacing it on a repeated failure.
    if(!fs.existsSync(file))fs.writeFileSync(file,data+'\n',{flag:'wx'});
    console.error(JSON.stringify({failedCase:spec,resolved,cycle:g.cycle,submittingSeat,actions,file,error:error.stack}));throw error;
  }
}
console.log(JSON.stringify({suite:'institution-actual-campaign-balance',htmlHash,engineHash,
  seconds:(Date.now()-started)/1000,campaigns:results.length,months:results.reduce((n,r)=>n+r.resolved,0),
  terminalCampaigns:results.filter(r=>r.terminal).length,results,
  limits:'No tuning or gifts. Stress is the authored Regulatory Siege scenario over up to 480 months, not an injected shock or forced survival. Early terminal outcomes are reported. Passing accounting/ledger/private-view checks is not proof of enjoyable balance or real two-computer multiplayer.'},null,2));
