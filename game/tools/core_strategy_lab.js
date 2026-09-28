'use strict';
// Paired Core 8.20 campaigns. The opponent always follows the ordinary AI.
// A strategy changes one policy family at a time, including a no-research control.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=require('./build_game').assemble().html,c={};
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,months=Number(process.argv[2]||120),seeds=Number(process.argv[3]||4),
 output=process.argv[4],only=process.argv[5]?.split(','),CORE={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true},
 branches=['network','digital','commercial','operations','acquisition','risk'];
if(!Number.isInteger(months)||months<1||months>480||!Number.isInteger(seeds)||seeds<1||seeds>30)throw Error('Usage: node tools/core_strategy_lab.js [months=120] [seeds=4] [output.json] [names]');
const strategies={
 ai:{},noResearch:{research:'none'},
 network:{research:'network'},digital:{research:'digital'},commercial:{research:'commercial'},
 operations:{research:'operations'},acquisition:{research:'acquisition'},risk:{research:'risk'},
 lending:{allocation:[2,1,4,1],lendingPolicy:'growth'},lendingBalanced:{allocation:[2,1,4,1],lendingPolicy:'balanced'},
 lendingPrudent:{allocation:[3,2,3,1],lendingPolicy:'balanced',research:'commercial'},
 lendingNetwork:{allocation:[3,2,3,1],lendingPolicy:'balanced',research:'network'},business:{allocation:[2,4,1,1]},
 lendingCoverage:{allocation:[4,3,3,2],lendingPolicy:'balanced',research:'network'},
 service:{allocation:[4,1,2,1]},margin:{depositPolicy:'margin'},aggressive:{depositPolicy:'aggressive'},
 creditGrowth:{lendingPolicy:'growth'},conservative:{lendingPolicy:'conservative'}
};
const role=['service','business','lending','operations'];
if(only&&only.some(name=>!strategies[name]))throw Error('Unknown strategy name.');
function configure(g,seat,plan,choice){
 const p=g.players[seat];
 if(choice.allocation){const staff=p.stats.staff,ops=Math.max(plan.allocation.operations,Math.floor(staff/8)),left=staff-ops;
  const weights=choice.allocation.slice(0,3),sum=weights.reduce((a,b)=>a+b,0),a=weights.map(w=>Math.floor(left*w/sum));
  for(let i=0,remain=left-a.reduce((x,y)=>x+y,0);i<remain;i++)a[i%3]++;
  plan.allocation=Object.fromEntries(role.map((key,i)=>[key,i===3?ops:a[i]]));}
 for(const key of ['depositPolicy','lendingPolicy'])if(choice[key])plan[key]=choice[key];
 if(choice.research){const key=choice.research,room=key==='none'?0:E.capabilityNextCost(p,key),
  budget=Object.values(plan.investments).reduce((a,b)=>a+b,0);
  // Once the chosen branch is complete, let the ordinary planner diversify.
  // Otherwise a long campaign silently becomes a no-research strategy.
  if(key==='none')plan.investments={};
  else if(room>0){plan.investments={};const amount=Math.min(E.CAPABILITY_CAP_PER_CYCLE,room,budget);
   if(amount>=1000)plan.investments[key]=amount;
   if(E.strategyLevel(p,key)>=1||E.capabilitySpend(p,key)+amount>=E.CAPABILITY_TIERS[key][0]){
    plan.specializations[key]=({network:'regionalHub',digital:'dataLedCredit',commercial:'specializedCredit',operations:'processRedesign',acquisition:'integrator',risk:'capitalEfficiency'})[key];
   }
  }
 }
 return plan;
}
const results=[];
for(const [name,choice] of Object.entries(strategies).filter(([name])=>!only||only.includes(name)))for(let seed=1;seed<=seeds;seed++)for(let seat=0;seat<2;seat++){
 const g=E.createGame({...E.previewCampaignEdition({},'core',CORE).options,mode:'hotseat',seed:'core-strategy:'+seed,scenario:seed%2?'balanced':'rate',created:1,startingWorkforce:'covered'});
 let completed=0,error=null;const checkpoints=[];
 try{while(!g.gameOver&&completed<months){const plans=g.players.map((_,i)=>E.chooseBot(g,i));configure(g,seat,plans[seat],choice);
   E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validateLedger(g);E.validatePilot(g);completed++;
   if([12,24,48,72,96,120].includes(completed))checkpoints.push({month:completed,scores:g.players.map((_,i)=>E.baseScore(g,i)),loans:g.players.map(p=>p.stats.loans),deposits:g.players.map(p=>p.stats.deposits),cash:g.players.map(p=>p.stats.cash),research:g.players.map(p=>branches.reduce((n,key)=>n+E.strategyLevel(p,key),0))});}}
 catch(e){error=String(e.stack||e);process.exitCode=1;}
 const banks=g.players.map((p,i)=>({score:E.baseScore(g,i),cash:p.stats.cash,loans:p.stats.loans,deposits:p.stats.deposits,
  business:p.stats.business,merchant:p.stats.merchant,staff:p.stats.staff,earnings:p.stats.earnings,
  research:branches.reduce((n,key)=>n+E.strategyLevel(p,key),0),profit:p.stats.lastProfit}));
 results.push({name,seed,seat,completed,gameOver:g.gameOver,endReason:g.endReason||null,error,banks,checkpoints,margin:banks[seat].score-banks[1-seat].score});
 console.log(name,seed,seat,completed,results.at(-1).margin,error?'FAIL '+error.split('\n')[0]:'');
}
const report={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),months,seeds,strategies,only,results};
if(output){fs.writeFileSync(path.resolve(output),JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
const summary=Object.keys(strategies).filter(name=>!only||only.includes(name)).map(name=>{const rows=results.filter(r=>r.name===name),avg=k=>Math.round(rows.reduce((n,r)=>n+k(r),0)/rows.length);return {name,scoreMargin:avg(r=>r.margin),loans:avg(r=>r.banks[r.seat].loans),deposits:avg(r=>r.banks[r.seat].deposits),cash:avg(r=>r.banks[r.seat].cash),research:avg(r=>r.banks[r.seat].research),completed:Math.min(...rows.map(r=>r.completed))};});
console.table(summary);
