'use strict';
// An explicit new Core ruleset. Historical two-bank campaigns never enter it.
function coreMultiplayer(g){return g?.coreMultiplayerVersion===1;}
function coreActiveSeats(g){return g.players.flatMap((p,i)=>p.eliminated?[]:[i]);}
function coreRivalIndex(g,index,market=g.players[index]?.focus,rivalId){
 const candidates=coreActiveSeats(g).filter(i=>i!==index);
 const requested=rivalId??g.players[index]?.rivalId;
 const selected=candidates.find(i=>g.players[i].id===requested);
 if(selected!==undefined)return selected;
 return candidates.sort((a,b)=>(g.territories[market]?.shares[b]||0)-(g.territories[market]?.shares[a]||0)||baseScore(g,b)-baseScore(g,a)||a-b)[0]??g.players.findIndex((_,i)=>i!==index);
}
function defaultCoreMultiplayerPlan(source,index=0){
 const owner=source.me||source.players[index],territories=source.territories;
 if(!owner)throw Error('Choose a valid bank.');
 const locked=source.me?owner.submittedPlan:owner.submitted;if(locked)return JSON.parse(JSON.stringify(locked));
 const ownerSlot=source.me?0:index;
 const focus=territories[owner.focus]&&!territories[owner.focus].exited?.[ownerSlot]?owner.focus:
  Object.keys(territories).find(key=>(source.me?territories[key].unlocked:unlocked(source,territories[key]))&&!territories[key].exited?.[ownerSlot])||Object.keys(territories)[0];
 const rival=source.me?(source.rivals||[]).find(p=>!p.eliminated):source.players[coreRivalIndex(source,index,focus)];
 return {focus,rivalId:rival?.id,allocation:{...owner.allocation},products:{...owner.products},specializations:{...owner.specializations},depositPolicy:owner.policies.deposit,lendingPolicy:owner.policies.lending,capitalPolicy:owner.policies.capital,decision:null,competitiveAction:'none',capitalAction:false,opportunity:null,newProject:null,newProjects:[],investments:{},hires:0};
}
function validateCoreMultiplayerPlan(g,index,plan){
 const p=g.players[index];
 if(!coreMultiplayer(g)||!p)throw Error('Choose a valid bank.');
 if(g.gameOver)throw Error('The campaign is complete.');
 if(p.eliminated)throw Error('This bank is out of the campaign.');
 if(!plan||typeof plan!=='object'||Array.isArray(plan))throw Error('Choose a valid monthly plan.');
 const fields=new Set(['focus','rivalId','allocation','products','specializations','depositPolicy','lendingPolicy','capitalPolicy','decision','competitiveAction','capitalAction','opportunity','newProject','newProjects','investments','hires','announcement']);
 if(Object.keys(plan).some(key=>!fields.has(key)))throw Error('Unknown Core monthly instruction.');
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 const own=(catalog,key)=>typeof key==='string'&&Object.hasOwn(catalog,key);
 if(!own(g.territories,plan.focus))throw Error('Choose an open focus market.');
 for(const [field,catalog]of [['depositPolicy',DEPOSIT_POLICIES],['lendingPolicy',LENDING_POLICIES],['capitalPolicy',CAPITAL_POLICIES]])if(!own(catalog,plan[field]))throw Error('Choose valid operating policies.');
 if(plan.competitiveAction!==undefined&&!own(COMPETITIVE_ACTIONS,plan.competitiveAction))throw Error('Choose a valid competitive action.');
 if(plan.capitalAction!==undefined&&typeof plan.capitalAction!=='boolean')throw Error('Choose a valid board assistance instruction.');
 if(plan.hires!==undefined&&(!Number.isSafeInteger(plan.hires)||plan.hires<0))throw Error('Choose a whole nonnegative number of recruits.');
 if(!object(plan.allocation)||Object.keys(plan.allocation).some(key=>!own(ROLES,key)))throw Error('Choose valid staff roles.');
 if(plan.products!==undefined){if(!object(plan.products))throw Error('Choose valid products.');for(const [line,key]of Object.entries(plan.products))if(!own(PRODUCT_PORTFOLIOS,line)||!own(PRODUCT_PORTFOLIOS[line].options,key))throw Error('Choose valid products.');}
 if(plan.specializations!==undefined){if(!object(plan.specializations))throw Error('Choose valid operating models.');const models=researchModelTable(p);for(const [branch,key]of Object.entries(plan.specializations))if(!own(models,branch)||(key!==null&&!own(models[branch],key)))throw Error('Choose a valid operating model.');}
 if(plan.investments!==undefined){if(!object(plan.investments))throw Error('Choose valid research investments.');for(const [key,amount]of Object.entries(plan.investments))if(!own(researchBranchTable(p),key)||!Number.isSafeInteger(amount)||amount<0)throw Error('Choose a valid research capability and whole nonnegative amount.');}
 if(plan.newProject!==undefined&&plan.newProject!==null&&!own(PROJECTS,plan.newProject))throw Error('Choose a valid project.');
 if(plan.newProjects!==undefined&&(!Array.isArray(plan.newProjects)||plan.newProjects.some(key=>!own(PROJECTS,key))))throw Error('Choose valid projects.');

 if(plan.rivalId!==undefined&&(!g.players.some(q=>q.id===plan.rivalId&&!q.eliminated&&q.id!==p.id)))throw Error('Choose an active opposing bank.');
 if(g.territories[plan.focus]?.exited?.[index])throw Error('Choose an operating market.');
 validatePortfolioPlan(p,plan,g);validatePlan(g,p,plan);
 return plan;
}
function recallCoreMultiplayer(g,index){
 const p=g.players[index];
 if(!coreMultiplayer(g)||!p||p.isBot||p.eliminated||g.gameOver)throw Error('This bank cannot recall a plan.');
 if(!p.submitted)throw Error('There is no locked plan to recall.');
 p.submitted=null;return g;
}
function submitCoreMultiplayer(g,index,input){
 const p=g.players[index];
 if(!p)throw Error('Choose a valid bank.');
 if(p.submitted)throw Error('Your plan is already locked.');
 // Keep caller-owned inputs and every bank untouched when validation fails.
 const plan=JSON.parse(JSON.stringify(input));validateCoreMultiplayerPlan(g,index,plan);
 p.submitted=plan;
 const humans=g.players.filter(q=>!q.eliminated&&!q.isBot);
 if(!humans.every(q=>q.submitted))return g;
 const beforeRng={...g.rng},prepared=[];
 try{
  for(const seat of coreActiveSeats(g)){
   const bot=g.players[seat];if(!bot.isBot||bot.submitted)continue;
   const order=chooseOpenBot(g,seat);validateCoreMultiplayerPlan(g,seat,order);prepared.push([bot,JSON.parse(JSON.stringify(order))]);
  }
 }catch(error){p.submitted=null;Object.assign(g.rng,beforeRng);throw error;}
 for(const [bot,order]of prepared)bot.submitted=order;
 if(coreActiveSeats(g).every(seat=>g.players[seat].submitted))resolveCycle(g);
 return g;
}
function chooseCoreMultiplayerBot(g,index){
 const p=g.players[index];if(!p||p.eliminated||g.gameOver)throw Error('This bank cannot plan a month.');
 let plan=chooseBaselinePlan(g,index);
 plan.rivalId=g.players[coreRivalIndex(g,index,plan.focus)]?.id;
 plan=planPilotReserve(g,index,plan);
 validateCoreMultiplayerPlan(g,index,plan);return plan;
}
function coreShareTransfer(t,from,to,amount){
 if(from===to||from<0||to<0)return 0;
 const units=Math.max(0,Math.min(Math.round((t.shares[from]||0)*10),Math.round(amount*10)));
 t.shares[from]=Math.round(t.shares[from]*10-units)/10;t.shares[to]=Math.round(t.shares[to]*10+units)/10;return units/10;
}
function coreGrantShare(g,t,index,amount,seller){
 const donors=seller!==undefined?[seller]:coreActiveSeats(g).filter(i=>i!==index&&!t.exited?.[i]).sort((a,b)=>t.shares[b]-t.shares[a]||a-b);
 let remaining=amount;for(const donor of donors){remaining-=coreShareTransfer(t,donor,index,remaining);if(remaining<=0)break;}
}
function coreRedistributeShare(g,t,index){
 const eligible=coreActiveSeats(g).filter(i=>i!==index&&!t.exited[i]);
 if(!eligible.length)return;
 const total=Math.round(t.shares[index]*10),weights=eligible.map(i=>t.shares[i]),sum=weights.reduce((n,x)=>n+x,0);
 const allocations=weights.map(w=>Math.floor(total*(sum?w/sum:1/eligible.length)));
 let remainder=total-allocations.reduce((n,x)=>n+x,0);for(let k=0;remainder;k=(k+1)%eligible.length,remainder--)allocations[k]++;
 for(const [k,seat]of eligible.entries())coreShareTransfer(t,index,seat,allocations[k]/10);
}
function coreResolveOpportunities(g,plans){
 const lines=[],pursuits=new Map();
 for(const seat of coreActiveSeats(g)){
  const opportunity=g.opportunities.find(o=>o.id===plans[seat].opportunity);if(!opportunity)continue;
  if(!pursuits.has(opportunity.id))pursuits.set(opportunity.id,[]);pursuits.get(opportunity.id).push(seat);
 }
 // Opportunity order, not lock order, owns the random stream.
 for(const opportunity of g.opportunities){
  const seats=pursuits.get(opportunity.id);if(!seats)continue;
  if(seats.length>1){
   const scores=seats.map(seat=>({seat,power:opportunityPower(g.players[seat],opportunity)+simulationRandom()*5})).sort((a,b)=>b.power-a.power||a.seat-b.seat);
   const winner=g.players[scores[0].seat];awardOpportunity(winner,opportunity);lines.push(winner.name+' won '+opportunity.name+' against '+(seats.length-1)+' competing bank'+(seats.length>2?'s':'')+'.');
  }else{
   const bank=g.players[seats[0]],won=simulationRandom()<clamp(.32+opportunityPower(bank,opportunity)/38,.42,.9);
   if(won)awardOpportunity(bank,opportunity);lines.push(bank.name+(won?' won ':' lost ')+opportunity.name+'.');
  }
 }
 return lines;
}
function coreDepositContest(g){
 const active=coreActiveSeats(g),opening=g.players.map(p=>p.stats.deposits),edges=[],lines=[],outflow=g.players.map(()=>0),scale=.6*Math.min(1,12/activeTerritories(g).length)/Math.max(1,active.length-1),act=campaignAct(g);
 for(let a=0;a<active.length;a++)for(let b=a+1;b<active.length;b++){
  const left=active[a],right=active[b];let net=0;
  for(const [key,t]of activeTerritories(g)){
   if(!unlocked(g,t)||t.exited[left]||t.exited[right])continue;
   const pull=(seat,other)=>{const p=g.players[seat],attack=p.focus===key&&(p.turnEffects.depositAttackTarget!==g.players[other].id)?p.turnEffects.depositAttack||0:0;return depositPull(p,key,t)-attack;};
   const edge=pull(left,right)-pull(right,left);if(Math.abs(edge)>=.5)net+=clamp(edge*.1,-1,1)*t.value*4200*act.pressure*scale;
  }
  if(Math.abs(net)>=10000)edges.push({winner:net>0?left:right,loser:net>0?right:left,requested:Math.round(Math.abs(net))});
 }
 // Price all outflows from opening books before applying any incoming deposits.
 const requested=g.players.map((_,seat)=>edges.filter(e=>e.loser===seat).reduce((n,e)=>n+e.requested,0));
 for(const e of edges){
  const cap=Math.floor(opening[e.loser]*act.depositCap),amount=Math.min(g.players[e.loser].stats.deposits,Math.floor(e.requested*Math.min(1,cap/Math.max(1,requested[e.loser]))));if(amount<1000)continue;
  const winner=g.players[e.winner],loser=g.players[e.loser],sensitive=Math.round(amount*Math.min(1,(loser.stats.rateSensitiveDeposits||0)/Math.max(1,opening[e.loser]))),hot=Math.round(amount*({margin:.08,balanced:.25,aggressive:.7}[winner.policies.deposit]));
  delta(loser,'rateSensitiveDeposits',-sensitive);delta(winner,'rateSensitiveDeposits',hot);delta(loser,'deposits',-amount);delta(winner,'deposits',amount);
  const customers=Math.min(loser.stats.customers,Math.round(amount/9000));delta(loser,'customers',-customers);delta(winner,'customers',customers);
  lines.push(winner.name+' won $'+amount.toLocaleString()+' of deposits from '+loser.name+'.');
 }
 for(const p of g.players)p.stats.rateSensitiveDeposits=Math.min(p.stats.rateSensitiveDeposits,p.stats.deposits);
 return {lines,outflow};
}
function coreSimulateMarkets(g){
 const lines=[],active=coreActiveSeats(g),pressure=campaignAct(g).pressure*.6*Math.min(1,12/activeTerritories(g).length);
 for(const [key,t]of activeTerritories(g)){
  if(!unlocked(g,t))continue;
  const seats=active.filter(i=>!t.exited[i]);if(!seats.length)continue;
  const strengths=seats.map(i=>{const p=g.players[i];return Math.max(1,((p.branches[key]||0)*(7.8+strategyLevel(p,'network')*.35)+(p.focus===key?6:0)+p.stats.reputation/16+specialtyPower(p,t)+(p.marketingTurns>0?4:0)+(p.upgrades.analytics||0)*.6-(tierRank(p)>=3?3:0))*(p.turnEffects.market||1)+(simulationRandom()*2-1));});
  const total=strengths.reduce((n,x)=>n+x,0),old=[...t.shares];
  const deltas=seats.map((seat,k)=>clamp((strengths[k]/total*100-old[seat])*.12*pressure,-7,7));
  const mean=deltas.reduce((n,x)=>n+x,0)/seats.length;
  const gains=seats.map((seat,k)=>({seat,units:Math.max(0,Math.round((deltas[k]-mean)*10))})),losses=seats.map((seat,k)=>({seat,units:Math.min(Math.round(t.shares[seat]*10),Math.max(0,-Math.round((deltas[k]-mean)*10)))}));
  let gi=0;for(const loss of losses)while(loss.units>0&&gi<gains.length){const gain=gains[gi],units=Math.min(loss.units,gain.units);if(units)coreShareTransfer(t,loss.seat,gain.seat,units/10);loss.units-=units;gain.units-=units;if(!gain.units)gi++;}
  for(const seat of seats){const gained=Math.round((t.shares[seat]-old[seat])*10)/10;if(gained>=2.5)lines.push(g.players[seat].name+' gained '+gained.toFixed(1)+' points of share in '+t.name+'.');}
 }
 return lines;
}
function coreResolveMarketExits(g){
 const lines=[],threshold=24/g.players.length;
 for(const [key,t]of activeTerritories(g)){
  if(!unlocked(g,t))continue;
  const operating=coreActiveSeats(g).filter(i=>!t.exited[i]);const strongest=[...operating].sort((a,b)=>t.shares[b]-t.shares[a]||a-b)[0];
  for(const seat of operating){
   t.exitStreak[seat]=t.shares[seat]<threshold?t.exitStreak[seat]+1:0;
   if(seat===strongest||t.exitStreak[seat]<3||t.reentryUntil[seat]>=g.cycle)continue;
   const p=g.players[seat];t.exited[seat]=true;coreRedistributeShare(g,t,seat);
   for(const model of p.facilityMarkets[key]||[])p.facilities[model]=Math.max(0,(p.facilities[model]||0)-1);
   p.facilityMarkets[key]=[];p.branches[key]=0;delta(p,'reputation',-7);lines.push(p.name+' withdrew from '+t.name+' after three months below '+threshold+'% share.');
  }
 }
 return lines;
}
function coreEvaluateStrategicEnd(g){
 const lines=[];
 for(const seat of coreActiveSeats(g)){
  const p=g.players[seat],failed=p.distress>=RECEIVERSHIP_CYCLES,closed=activeTerritories(g).every(([,t])=>unlocked(g,t)&&t.exited[seat]);
  if(!failed&&!closed)continue;
  p.eliminated=true;p.eliminatedCycle=g.cycle;p.eliminationReason=failed?'receivership':'market_exit';p.submitted=null;
  for(const [key,t]of activeTerritories(g)){t.exited[seat]=true;for(const type of p.facilityMarkets[key]||[])p.facilities[type]=Math.max(0,(p.facilities[type]||0)-1);p.facilityMarkets[key]=[];p.branches[key]=0;}
  lines.push(p.name+' is out of the campaign: '+(failed?'receivership':'no operating markets remain')+'. Its financial books remain separate.');
 }
 const remaining=coreActiveSeats(g);
 if(remaining.length)for(const [,t]of activeTerritories(g))for(const seat of g.players.keys())if(g.players[seat].eliminated)coreRedistributeShare(g,t,seat);
 g.buyoutPressure=g.players.map(()=>0);g.consolidationStalemate=0;
 if(remaining.length<=1){g.gameOver=true;g.endReason=remaining.length?'last_bank':'receivership';g.winnerId=remaining.length?g.players[remaining[0]].id:null;g.failedId=null;lines.push(remaining.length?g.players[remaining[0]].name+' is the last active bank.':'Every bank entered resolution; there is no winner.');}
 return lines.join(' ');
}
function coreResolveCompetitiveActions(g,plans){
 const lines=[],active=coreActiveSeats(g),chosen=plans.map(plan=>plan.competitiveAction||'none');
 for(const seat of active){
  const p=g.players[seat],key=chosen[seat],action=COMPETITIVE_ACTIONS[key];delta(p,'cash',-action.cost);p.lastCompetitiveAction=key;
  if(action.kind==='attack')delta(p,'attention',2);
  if(key==='liquidityDefense')p.turnEffects.depositDefense=2.4+strategyLevel(p,'operations')*.4+(p.doctrine==='community'?.6:0);
  if(key==='relationshipDefense')p.turnEffects.relationshipDefense=(p.doctrine==='community'?.18:.25)/(1+strategyLevel(p,'operations')*.08);
  if(key==='retentionDefense'){p.turnEffects.retentionDefense=30+strategyLevel(p,'operations')*4+(p.doctrine==='people'?10:0);delta(p,'morale',2);}
  if(key==='takeoverDefense'){delta(p,'influence',-4);delta(p,'attention',2);}
 }
 for(const seat of active){
  const attacker=g.players[seat],target=g.players[coreRivalIndex(g,seat,plans[seat].focus,plans[seat].rivalId)],key=chosen[seat];if(!target||target.eliminated)continue;
  const targetSeat=g.players.indexOf(target),counter=chosen[targetSeat];
  if(key==='depositRaid'){attacker.turnEffects.depositAttack=2.5+strategyLevel(attacker,'digital')*.35+strategyLevel(attacker,'acquisition')*.25+(attacker.doctrine==='community'?.6:0);attacker.turnEffects.depositAttackTarget=target.id;lines.push(attacker.name+' targeted '+target.name+' with a deposit campaign in '+g.territories[plans[seat].focus].name+'.');}
  if(key==='commercialRaid'){
   const factor=counter==='relationshipDefense'?target.turnEffects.relationshipDefense:1;
   for(const [stat,count]of [['business',Math.max(1,Math.round((4+strategyLevel(attacker,'commercial')*.8)*factor))],['merchant',Math.max(1,Math.round((4+strategyLevel(attacker,'commercial')*.6)*factor))],['customers',Math.max(10,Math.round((55+strategyLevel(attacker,'commercial')*12)*factor))]]){const transfer=Math.min(target.stats[stat],count);delta(target,stat,-transfer);delta(attacker,stat,transfer);}
   delta(target,'morale',factor<.5?0:-2);lines.push(attacker.name+' raided '+target.name+'\'s commercial relationships.');
  }
  if(key==='talentRaid'){
   const attack=30+attacker.stats.influence*.7+strategyLevel(attacker,'acquisition')*6+(attacker.doctrine==='people'?6:0),defense=target.stats.morale*.45+target.stats.influence*.4+target.upgrades.training*5+(target.turnEffects.retentionDefense||0);
   if(attack>defense&&target.stats.staff>6){delta(target,'staff',-1);delta(attacker,'staff',1);normalizeAllocation(target);normalizeAllocation(attacker);delta(target,'morale',-6);delta(attacker,'morale',3);delta(attacker,'attention',3);lines.push(attacker.name+' recruited a senior banker from '+target.name+'.');}
   else{delta(attacker,'influence',-2);delta(target,'morale',2);lines.push(target.name+' defeated '+attacker.name+'\'s talent raid.');}
  }
 }
 return lines;
}
function coreMultiplayerPublicState(g,index){
 const out=publicState(g,index),p=g.players[index],ri=coreRivalIndex(g,index),rival=g.players[ri],order=[index,ri,...g.players.map((_,i)=>i).filter(i=>i!==index&&i!==ri)];
 const summary=(bank,seat)=>({id:bank.id,name:bank.name,color:bank.color,isBot:!!bank.isBot,eliminated:!!bank.eliminated,...(bank.eliminated?{eliminatedCycle:bank.eliminatedCycle,eliminationReason:bank.eliminationReason}:{}),submitted:!!bank.submitted,capitalRatio:Math.round(capitalRatio(bank)*10)/10,capitalTier:{...capitalTier(bank)},score:baseScore(g,seat),controlled:controlledCount(g,seat),branches:{...bank.branches},stats:{deposits:bank.stats.deposits,loans:bank.stats.loans,customers:bank.stats.customers,business:bank.stats.business,merchant:bank.stats.merchant,wealth:bank.stats.wealth,reputation:bank.stats.reputation,digital:bank.stats.digital,staff:bank.stats.staff,earnings:bank.stats.earnings,lastProfit:bank.stats.lastProfit,capital:bank.stats.capital},...(bank.identity?{identity:bankIdentity(bank.identity,bank.name,seat)}:{})});
 out.coreMultiplayerVersion=1;out.coreMap=g.coreMap;out.bankIds=order.map(i=>g.players[i].id);out.seat=index;out.banks=order.map(i=>summary(g.players[i],i));out.rivals=out.banks.slice(1);out.rivalId=rival.id;
 Object.assign(out.me,{color:p.color,isBot:!!p.isBot,eliminated:!!p.eliminated,...(p.eliminated?{eliminatedCycle:p.eliminatedCycle,eliminationReason:p.eliminationReason}:{}),...(p.submitted?{submittedPlan:JSON.parse(JSON.stringify(p.submitted))}:{}),policies:{...p.policies},products:{...p.products},specializations:{...p.specializations},facilities:{...p.facilities},facilityMarkets:JSON.parse(JSON.stringify(p.facilityMarkets)),accounting:JSON.parse(JSON.stringify(p.accounting)),operatingReport:p.operatingReport?{...p.operatingReport}:null,lastCompetitiveAction:p.lastCompetitiveAction||'none',fundingRulesVersion:2,...(p.identity?{identity:bankIdentity(p.identity,p.name,index)}:{})});
 out.rival={...out.rival,...summary(rival,ri),products:{...rival.products},facilities:{...rival.facilities},specializations:{...rival.specializations},lastCompetitiveAction:rival.lastCompetitiveAction||'none'};
 for(const [key,t]of Object.entries(out.territories)){const original=g.territories[key];t.shares=order.map(i=>original.shares[i]);t.branches=order.map(i=>g.players[i].branches[key]||0);t.exited=order.map(i=>original.exited[i]);t.exitStreak=order.map(i=>original.exitStreak[i]);t.reentryUntil=order.map(i=>original.reentryUntil[i]);t.facilityModels=[...(p.facilityMarkets[key]||[])];}
 out.trend=out.trend.map(point=>{const safe={...point};delete safe.rivalCash;return safe;});
 out.fundingRulesVersion=2;out.act={...campaignAct(g)};out.buyoutPressure=order.map(i=>g.buyoutPressure[i]);out.competitiveActions=COMPETITIVE_ACTIONS;out.productPortfolios=PRODUCT_PORTFOLIOS;out.strategySpecializations=STRATEGY_SPECIALIZATIONS;
 out.competitiveForecast=[{severity:'stable',title:'MULTI-BANK RIVALRY',text:'Choose an opposing bank for targeted actions. Every active human locks a plan before the month resolves; AI banks commit together. Insolvent banks leave the contest with separate books.'}];
 // Reveal submitted readiness, never a rival's current plan or private funding.
 out.lastPlans=p.eliminated||!g.lastPlans[p.id]?{}:{[p.id]:JSON.parse(JSON.stringify(g.lastPlans[p.id]))};
 out.ready=coreActiveSeats(g).filter(i=>g.players[i].submitted).length;out.required=coreActiveSeats(g).length;out.humansReady=g.players.filter(q=>!q.isBot&&!q.eliminated&&q.submitted).length;out.humansRequired=g.players.filter(q=>!q.isBot&&!q.eliminated).length;
 if(g.gameOver)out.final=Object.fromEntries(g.players.map((bank,seat)=>[bank.id,{base:baseScore(g,seat),mandate:mandateStatus(g,seat),total:finalScore(g,seat),markets:controlledCount(g,seat),earnings:bank.stats.earnings,achievements:bank.achievements.length,eliminated:!!bank.eliminated}]));
 BankAnnouncements.project(g,out,index);return out;
}
const CoreMultiplayer=Object.freeze({enabled:coreMultiplayer,activeSeats:coreActiveSeats,rivalIndex:coreRivalIndex,defaultPlan:defaultCoreMultiplayerPlan,validatePlan:validateCoreMultiplayerPlan,recall:recallCoreMultiplayer,advance:advanceCoreMultiplayerBots});
function rematchCoreMultiplayer(g,index){
 if(!g.gameOver)throw Error('Campaign still active.');
 if(!g.players[index])throw Error('Choose a valid bank.');
 if(!g.rematchVotes.includes(g.players[index].id))g.rematchVotes.push(g.players[index].id);
 for(const p of g.players)if(p.isBot&&!g.rematchVotes.includes(p.id))g.rematchVotes.push(p.id);
 if(!g.players.every(p=>g.rematchVotes.includes(p.id)))return false;
 const fresh=createGame({coreMultiplayerVersion:1,coreMap:g.coreMap,players:g.players.map(p=>({name:p.name,isBot:!!p.isBot,color:p.color,...(p.identity?{identity:p.identity}:{})})),mode:g.mode,scope:g.scope,scenario:g.scenario,difficulty:g.difficulty,startingWorkforce:'covered',incomeHistoryVersion:g.incomeHistoryVersion,commercialServiceVersion:g.commercialServiceVersion,bankEconomicsVersion:g.bankEconomicsVersion,researchProgramVersion:g.researchProgramVersion});
 for(const key of Object.keys(g))delete g[key];Object.assign(g,fresh);return true;
}

function advanceCoreMultiplayerBots(g){
 if(!coreMultiplayer(g)||g.gameOver||g.players.some(p=>!p.eliminated&&!p.isBot))throw Error('Only an AI-only remainder can be advanced by a spectator.');
 const seat=coreActiveSeats(g)[0];if(seat===undefined)throw Error('There are no active banks.');
 return submit(g,seat,chooseOpenBot(g,seat));
}
