// Group7 AI proposal, not a new morale rule or a saved staffing mandate.
// Move at most one already-employed banker; compare the fully funded plan and
// reject a superficially better morale number that abandons existing work.
function staffingRecoveryPriority(p){return p.stats.staff<8||p.stats.morale<45;}
function staffingProtectedDefense(g,index,key){
 const p=g.players[index],rival=g.players[1-index];
 return key==='takeoverDefense'||key==='liquidityDefense'&&
  (p.stats.cash/Math.max(1,p.stats.deposits)<.025||rival.lastCompetitiveAction==='depositRaid');
}
function staffingActionAffordable(g,index,key){
 const p=g.players[index];
 if(![7,8].includes(g.financialGroupVersion)||!staffingRecoveryPriority(p)||staffingProtectedDefense(g,index,key))return true;
 const hires=planHiring(g,p,0);
 return !hires||pilotSpendingLimit(p,.10,200000)-COMPETITIVE_ACTIONS[key].cost>=hireCost(p,hires);
}
function staffingRecoveryMorale(p,quote){
 const physical=quote.attribution.rawAfterTeachingQuarters,teachers=quote.attribution.paidTeacherQuarters;
 const expertise=departmentFunctionExpertise(p,physical,teachers);
 const effective=Object.fromEntries(DepartmentFunctions.ROLES.map(role=>[role,
  physical[role]/4+departmentFunctionExpertBonus(expertise,physical,role)]));
 return operatingWorkloadMorale(p,effective);
}
function staffingRecoveryInstructions(plan){
 const copy=departmentFunctionCopy(plan);delete copy.allocation;delete copy.departmentFunctionsPolicy;
 for(const row of Object.values(copy.facilityLifecyclePolicy?.offices||{}))delete row.staffQuarters;
 return JSON.stringify(copy);
}
function staffingRecoveryReview(g,index,input){
 const p=g.players[index],copy=departmentFunctionCopy,base=copy(input),reasons=[];
 const unchanged=()=>({accepted:false,plan:input,reasons});
 if(!p.departmentFunctions||p.stats.morale>=55||tierRank(p)>=2)return unchanged();
 const before=departmentFunctionsQuote(g,p,base);
 if(!before.status.eligible){reasons.push(before.status.reason);return unchanged();}
 const morale=staffingRecoveryMorale(p,before);
 if(morale.change>=1)return unchanged();
 const signature=staffingRecoveryInstructions(base),moves=[];
 for(const target of ['service','operations'])for(const donor of DepartmentFunctions.ROLES){
  if(donor===target||base.allocation[donor]<=1)continue;
  const allocation={...base.allocation,[donor]:base.allocation[donor]-1,[target]:base.allocation[target]+1};
  const raw=operatingWorkloadMorale(p,allocation).change-operatingWorkloadMorale(p,base.allocation).change;
  if(raw>0)moves.push({target,donor,allocation,raw});
 }
 // At most four meaningful one-person alternatives; stable ordering, no RNG.
 moves.sort((a,b)=>b.raw-a.raw||a.target.localeCompare(b.target)||base.allocation[b.donor]-base.allocation[a.donor]||a.donor.localeCompare(b.donor));
 let best=null,oldForecast=null,oldOffices=null;
 for(const move of moves.slice(0,4))try{
  let candidate=copy(base);candidate.allocation=move.allocation;
  candidate.departmentFunctionsPolicy={quotas:Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,Object.fromEntries(DepartmentFunctions.ROLES.map(role=>[role,0]))])),vendors:Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,0]))};
  candidate.facilityLifecyclePolicy=facilityLifecycleStaffProposal(g,p,candidate).policy;
  candidate=planFinalCashReserve(g,index,planDepartmentFunctions(g,index,candidate));
  if(staffingRecoveryInstructions(candidate)!==signature)throw Error('Other commitments changed.');
  const after=departmentFunctionsQuote(g,p,candidate);
  if(!after.status.eligible)throw Error(after.status.reason);
  const nextMorale=staffingRecoveryMorale(p,after);
  if(nextMorale.change<=morale.change+1e-8)throw Error('No productive-workload improvement.');
  if(JSON.stringify(before.attribution.paidTeacherQuarters)!==JSON.stringify(after.attribution.paidTeacherQuarters))throw Error('Existing paid teaching changed.');
  for(const row of before.delivery.rows){
   const next=after.delivery.rows.find(r=>r.id===row.id);
   if(Math.abs(next.workload-row.workload)>1e-8||next.delivered.served+1e-8<row.delivered.served)throw Error('Existing '+row.id+' work changed: '+row.workload+'/'+row.delivered.served+' -> '+next.workload+'/'+next.delivered.served+'.');
  }
  if(before.opportunity?.eligible&&!after.opportunity?.eligible)throw Error('Funded pursuit lost its reserved work.');
  const budget=planBudget(p,candidate),offices=lifecycleInstructionQuote(g,p,candidate);
  if(budget.remaining<0||budget.freeCapacity<0||!projectPlanStatus(p,candidate).eligible||
   facilityLifecycleProtectedBudget(p,candidate,budget).remaining<0||!offices.status.eligible)throw Error('Shared budget or execution is not feasible.');
  oldOffices=oldOffices||lifecycleInstructionQuote(g,p,base);
  if(!oldOffices.status.eligible)throw Error('Baseline office quote is not feasible.');
  for(const row of oldOffices.quote.metrics.rows){
   const next=offices.quote.metrics.rows.find(r=>r.officeId===row.officeId);
   if(!next||Object.keys(row.capacity).some(k=>next.capacity[k]+1e-8<row.capacity[k]))throw Error('Existing office output reduced.');
  }
  const forecast=plan=>operatingPreview({...p,focus:plan.focus,marketSnapshot:g.marketEconomy},plan,g.economy);
  oldForecast=oldForecast||forecast(base);const nextForecast=forecast(candidate);
  const gross=r=>Math.round((r.loanGrowth||0)+(r.principalRepaid||0)+(r.creditRecovery||0)+(r.chargeoff||0));
  if(gross(nextForecast)<gross(oldForecast))throw Error('Funded lending reduced.');
  if((nextForecast.fundingLoss||0)>(oldForecast.fundingLoss||0)||
   (nextForecast.emergencyDebt||0)>(oldForecast.emergencyDebt||0)||nextForecast.capitalRatio<10)throw Error('Funding or capital protection worsened.');
  const oldProfit=oldForecast.profit-(oldForecast.fundingLoss||0),profit=nextForecast.profit-(nextForecast.fundingLoss||0);
  if(profit<Math.max(0,oldProfit-Math.min(20000,Math.max(0,oldProfit)*.1)))throw Error('Recovery expense exceeds bounded operating headroom.');
  if(!best||nextMorale.change>best.afterMorale.change||nextMorale.change===best.afterMorale.change&&profit>best.profit)
   best={accepted:true,plan:candidate,move:{from:move.donor,to:move.target,count:1},beforeMorale:morale,afterMorale:nextMorale,profit,beforeProfit:oldProfit,
    beforeGross:gross(oldForecast),afterGross:gross(nextForecast),vendorChange:after.vendorExpense-before.vendorExpense};
 }catch(error){reasons.push(move.donor+' -> '+move.target+': '+error.message);}
 return best?{...best,reasons}:unchanged();
}
