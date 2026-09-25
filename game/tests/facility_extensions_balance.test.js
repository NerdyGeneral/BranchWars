'use strict';
// Paired normal-opening control: same seed/policy, with versus without fit-out.
// Records losses and early endings; no injected cash, staff or company books.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx={};vm.runInNewContext(source,ctx);const E=ctx.BWEngine;
const report={engineSha256:createHash('sha256').update(source).digest('hex'),portableSha256:createHash('sha256').update(html).digest('hex'),scope:'Paired six-month normal openings, player starts one commercial suite versus no fit-out; ordinary AI after opening. No grants. Short integration/economics evidence, not long-campaign balance acceptance.',cases:[]};
const repair=process.argv.includes('--repaired');
const file=path.resolve(__dirname,'../output/master-checkpoint18-suite-controls'+(repair?'-repaired':'')+'.json');
for(const scenario of ['balanced','rate','regulatory','growth'])for(const build of [false,true]){
 const g=E.createGame({...E.previewFeatureSelection({},{field:'facilityExtensionsVersion',value:1}).options,mode:'hotseat',scenario,seed:'suite-controls',created:1}),result={scenario,build,months:0},start=performance.now();
 try{
  while(!g.gameOver&&result.months<6){
   const plans=g.players.map((p,i)=>E.chooseBot(g,i));
   if(!result.months){const p=g.players[0],q=plans[0];q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;q.specialistHires=E.emptySpecialistOrders();q.competitiveAction='none';q.opportunity=null;
    q.facilityPolicy=E.defaultFacilityPolicy();q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);q.facilityExtensionPolicy={start:build?p.facilityNetwork.offices[0].id:null,cancel:null};q.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,q).policy;
    if(build){const review=E.facilityExtensionQuote(g,p,q,p.facilityNetwork.offices[0].id);assert(review.eligible,review.reason);}}
   E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);result.months++;
  }
  result.gameOver=g.gameOver;result.reason=g.endReason;result.banks=g.players.map(p=>({cash:p.stats.cash,equity:p.stats.capital,earnings:p.stats.earnings,deposits:p.stats.deposits,loans:p.stats.loans,staff:p.stats.staff,suites:Object.keys(p.facilityExtensions.offices).length,operatingSuites:Object.keys(p.facilityExtensions.offices).filter(id=>E.facilityExtensionActive(p,id)).length}));
 }catch(error){result.failure={month:g.cycle,message:error.message};process.exitCode=1;}
 result.elapsedMs=Math.round(performance.now()-start);report.cases.push(result);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(result));if(result.failure)break;
}
console.log('Saved '+file);
