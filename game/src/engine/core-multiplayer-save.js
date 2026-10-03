// Version 10.1 is an explicit Core campaign boundary. Loading it validates the
// saved state without repairing, advancing, or converting historical campaigns.
function prepareCoreMultiplayerOptions(options){
 if(options.coreMultiplayerVersion!==1)throw Error('Unsupported Core multiplayer rules.');
 if(!Array.isArray(options.players)||options.players.length<2||options.players.length>4)throw Error('Core multiplayer requires two to four banks.');
 const players=options.players.map((p,index)=>{
  if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>36||typeof p.isBot!=='boolean')throw Error('Each bank needs a name of up to 36 characters and a human or AI controller.');
  if(p.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(p.color))throw Error('Choose a valid bank color.');
  if(p.identity!==undefined)validateBankIdentity(p.identity);
  return {...p,name:p.name.trim().replace(/\s+/g,' '),color:p.color||['#246dcc','#dc4d65','#16835f','#8b5bbd'][index]};
 });
 if(new Set(players.map(p=>p.name.toLowerCase())).size!==players.length)throw Error('Give every bank a different name.');
 const coreMap=options.coreMap===undefined?'continental':options.coreMap;
 if(!Object.hasOwn(CORE_MAPS,coreMap))throw Error('Choose a supported Core multiplayer map.');
 if(options.mode!==undefined&&!['ai','hotseat','lan','p2p'].includes(options.mode))throw Error('Unsupported Core multiplayer mode.');
 const defaults=previewCampaignEdition({},'core',{currentReporting:true,currentEconomics:true,currentResearch:true}).options;
 const result={...defaults,...options,players,coreMap,scope:'national',mode:options.mode||'hotseat'};
 validateCampaignRules(result,'creation');
 return result;
}
function validateCoreSavedData(value,depth=0){
 if(depth>80)throw Error('The saved campaign is nested too deeply.');
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Invalid number in saved campaign.');return;}
 if(typeof value!=='object')throw Error('Invalid saved campaign data.');
 for(const [key,item]of Object.entries(value)){
  if(['__proto__','prototype','constructor'].includes(key))throw Error('Invalid saved campaign property.');
  validateCoreSavedData(item,depth+1);
 }
}
function coreSavedRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function coreSavedMatches(value,expected){
 if(value===expected)return true;
 if(!value||!expected||typeof value!=='object'||typeof expected!=='object'||Array.isArray(value)!==Array.isArray(expected))return false;
 const keys=Object.keys(expected);
 return Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)&&coreSavedMatches(value[key],expected[key]));
}
function validateCoreSavedBankProgress(g,p,index){
 const whole=value=>Number.isSafeInteger(value)&&value>=0;
 const percentages=['reputation','digital','morale','compliance','attention','influence','momentum'];
 for(const key of Object.keys(OPENING_STATS)){
  if(!Number.isSafeInteger(p.stats[key])||(!['capital','earnings','lastProfit'].includes(key)&&p.stats[key]<0)||percentages.includes(key)&&p.stats[key]>100)throw Error('Invalid saved bank statistics.');
 }
 if(p.stats.rateSensitiveDeposits>p.stats.deposits)throw Error('Invalid saved rate-sensitive funding.');
 for(const key of ['distress','capitalRequests','capitalRestriction','boardConcessions','hiresTotal','payrollSpend','buildSpend','marketingTurns'])if(!whole(p[key]))throw Error('Invalid saved bank operating progress.');
 if(p.capitalRestriction>3||p.marketingTurns>4||!Number.isFinite(p.fundingGap)||p.fundingGap<0||!Object.hasOwn(COMPETITIVE_ACTIONS,p.lastCompetitiveAction))throw Error('Invalid saved bank operating progress.');
 if(p.submitted!==null&&!coreSavedRecord(p.submitted))throw Error('Invalid saved monthly plan.');
 if(p.primaryStrategy!==null&&!researchBranches(p).includes(p.primaryStrategy))throw Error('Invalid saved primary capability.');
 if(new Set(p.achievements).size!==p.achievements.length||p.achievements.some(key=>!Object.hasOwn(MILESTONES,key)))throw Error('Invalid saved bank achievements.');
 if(p.rivalId!==undefined&&(!g.players.some(rival=>rival.id===p.rivalId)||p.rivalId===p.id))throw Error('Invalid saved opposing bank.');
 const lastCompleted=g.gameOver?g.cycle:g.cycle-1;
 if(p.eliminated){
  if(p.eliminatedCycle>lastCompleted||p.eliminationReason==='receivership'&&p.distress<RECEIVERSHIP_CYCLES)throw Error('Invalid eliminated bank progress.');
  if(Object.values(p.branches).some(count=>count!==0)||Object.values(p.facilities).some(count=>count!==0)||Object.values(p.facilityMarkets).some(models=>models.length!==0)||Object.values(g.territories).some(t=>!t.exited[index]))throw Error('An eliminated bank still has operating offices or markets.');
  // If every bank withdrew from a district, its final historical shares remain
  // recorded. Otherwise liquidation transfers the retired bank's entire share
  // to the surviving institutions that still operate in that district.
  for(const t of Object.values(g.territories))if(t.shares[index]!==0&&g.players.some((bank,seat)=>!bank.eliminated&&!t.exited[seat]))throw Error('An eliminated bank retains share in an operating market.');
 }else{
  if(p.distress>=RECEIVERSHIP_CYCLES||Object.values(g.territories).every(t=>t.exited[index]))throw Error('An active bank has already left the campaign.');
  for(const [key,t]of Object.entries(g.territories))if(t.exited[index]&&p.branches[key]!==0)throw Error('A withdrawn bank still has an office in that market.');
 }
}
function validateCoreSavedOutcome(g){
 const active=g.players.filter(p=>!p.eliminated);
 if(!g.gameOver){
  if(active.length<2||g.winnerId!==null||g.endReason!=null||g.failedId!=null||g.rematchVotes.length)throw Error('Invalid active multiplayer campaign result.');
 }else{
  if(active.length>1||g.failedId!==null||g.players.some(p=>p.submitted))throw Error('Invalid finished multiplayer campaign.');
  if(active.length===1&&(g.endReason!=='last_bank'||g.winnerId!==active[0].id))throw Error('Invalid last-bank victory.');
  if(active.length===0&&(g.endReason!=='receivership'||g.winnerId!==null))throw Error('Invalid collective receivership result.');
 }
}
function migrateCoreMultiplayerCampaign(source){
 validateCoreSavedData(source);
 const g=JSON.parse(JSON.stringify(source));
 if(!g||g.version!=='10.1'||g.coreMultiplayerVersion!==1||!Array.isArray(g.players)||g.players.length<2||g.players.length>4)throw Error('Invalid Core multiplayer campaign.');
 validateCampaignRules(g,'game');
 const n=g.players.length,ids=g.players.map(p=>p?.id),whole=x=>Number.isSafeInteger(x)&&x>=0;
 if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==n)throw Error('Invalid saved bank identities.');
 if(!['ai','hotseat','lan','p2p'].includes(g.mode)||g.scope!=='national'||!Object.hasOwn(SCENARIOS,g.scenario)||!['analyst','vp','chairman'].includes(g.difficulty))throw Error('Invalid Core multiplayer campaign settings.');
 if(!whole(g.cycle)||g.cycle<1||!whole(g.resolutionId)||!whole(g.created)||g.simulationVersion!==1||!g.rng||g.maxCycles!==null||!whole(g.act)||g.act>2||!whole(g.consolidationStalemate))throw Error('Invalid saved campaign clock.');
 ensureSimulation(g);
 validateCoreMap(g);
 if(!Array.isArray(g.buyoutPressure)||g.buyoutPressure.length!==n||g.buyoutPressure.some(x=>!whole(x))||!Array.isArray(g.rematchVotes)||g.rematchVotes.some(id=>!ids.includes(id))||new Set(g.rematchVotes).size!==g.rematchVotes.length)throw Error('Invalid saved multiplayer progress.');
 if(typeof g.gameOver!=='boolean'||(g.winnerId!==null&&!ids.includes(g.winnerId)))throw Error('Invalid saved campaign result.');
 if(g.resolutionId!==(g.gameOver?g.cycle:g.cycle-1))throw Error('The saved month and resolution history disagree.');
 const event=EVENTS.find(event=>event.key===g.event?.key),economy=MACRO_REGIMES[g.economy?.key];
 if(!event||!coreSavedMatches(g.event,event)||!economy||!coreSavedMatches(g.economy,{key:g.economy.key,...economy}))throw Error('Invalid saved event or economy.');
 if(!Array.isArray(g.trend)||!Array.isArray(g.log)||!Array.isArray(g.resolution)||!g.resolution.every(x=>typeof x==='string')||!Array.isArray(g.opportunities)||!coreSavedRecord(g.lastPlans)||!coreSavedRecord(g.scoreDelta))throw Error('Invalid saved campaign reports.');
 if(Object.entries(g.lastPlans).some(([id,plan])=>!ids.includes(id)||!coreSavedRecord(plan))||Object.entries(g.scoreDelta).some(([id,score])=>!ids.includes(id)||!Number.isFinite(score)))throw Error('Invalid saved bank reports.');
 for(const row of g.log)if(!coreSavedRecord(row)||!whole(row.cycle)||typeof row.text!=='string'||typeof row.kind!=='string'||!Number.isFinite(row.ts))throw Error('Invalid saved campaign log.');
 for(const opportunity of g.opportunities)if(!coreSavedRecord(opportunity)||typeof opportunity.id!=='string'||!Object.hasOwn(OPPORTUNITY_TYPES,opportunity.type)||!g.territories[opportunity.market]||!Object.hasOwn(ROLES,opportunity.dept)||!whole(opportunity.value))throw Error('Invalid saved opportunity.');
 for(const point of g.trend)for(const key of ['scores','deposits','loans','cash','profits','markets'])if(!Array.isArray(point[key])||point[key].length!==n||!point[key].every(Number.isFinite))throw Error('Invalid saved multiplayer history.');
 for(const [index,p]of g.players.entries()){
  if(typeof p.name!=='string'||!p.name.trim()||p.name.length>36||p.name!==p.name.trim().replace(/\s+/g,' ')||typeof p.isBot!=='boolean'||typeof p.eliminated!=='boolean'||!/^#[0-9a-f]{6}$/i.test(p.color))throw Error('Invalid saved bank.');
  if(p.eliminated&&(!whole(p.eliminatedCycle)||p.eliminatedCycle<1||p.eliminatedCycle>g.cycle||!['receivership','market_exit'].includes(p.eliminationReason)||p.submitted))throw Error('Invalid eliminated bank.');
  if(!p.eliminated&&(p.eliminatedCycle!==undefined||p.eliminationReason!==undefined))throw Error('An active bank cannot have an elimination record.');
  if(!coreSavedRecord(p.stats)||Object.keys(OPENING_STATS).some(key=>!Number.isFinite(p.stats[key]))||!coreSavedRecord(p.allocation)||Object.keys(p.allocation).length!==Object.keys(ROLES).length||Object.keys(ROLES).some(key=>!whole(p.allocation[key]))||Object.values(p.allocation).reduce((sum,x)=>sum+x,0)!==p.stats.staff)throw Error('Invalid saved bank staff or statistics.');
  if(!g.territories[p.focus]||!Object.hasOwn(DOCTRINES,p.doctrine)||!Object.hasOwn(MANDATES,p.mandate))throw Error('Invalid saved bank strategy.');
  if(!coreSavedRecord(p.policies)||!Object.hasOwn(DEPOSIT_POLICIES,p.policies.deposit)||!Object.hasOwn(LENDING_POLICIES,p.policies.lending)||!Object.hasOwn(CAPITAL_POLICIES,p.policies.capital))throw Error('Invalid saved bank policies.');
  if(!coreSavedRecord(p.products)||Object.entries(PRODUCT_PORTFOLIOS).some(([key,group])=>!Object.hasOwn(group.options,p.products[key]))||!coreSavedRecord(p.upgrades)||['technology','training','analytics','wealth','operations'].some(key=>!whole(p.upgrades[key]))||!Array.isArray(p.achievements)||!p.achievements.every(key=>typeof key==='string'))throw Error('Invalid saved products or capabilities.');
  if(!coreSavedRecord(p.turnEffects)||!coreSavedRecord(p.specializations)||!coreSavedRecord(p.capability)||researchBranches(p).some(key=>!whole(p.capability[key])))throw Error('Invalid saved research or operating effects.');
  if(!coreSavedRecord(p.branches)||Object.keys(p.branches).length!==Object.keys(g.territories).length||!coreSavedRecord(p.facilityMarkets)||!coreSavedRecord(p.facilities)||Object.keys(p.facilities).length!==3||!Array.isArray(p.projects))throw Error('Invalid saved bank offices.');
  const facilities={retail:0,commercial:0,digital:0};
  for(const key of Object.keys(g.territories)){
   const count=p.branches[key],models=p.facilityMarkets[key]||[];
   if(!whole(count)||!Array.isArray(models)||models.length!==count||models.some(model=>!Object.hasOwn(facilities,model)))throw Error('Invalid saved office model or count.');
   for(const model of models)facilities[model]++;
  }
  if(Object.keys(p.facilityMarkets).some(key=>!g.territories[key])||Object.entries(facilities).some(([key,count])=>p.facilities?.[key]!==count))throw Error('Saved office totals do not reconcile.');
  for(const project of p.projects){
   if(!coreSavedRecord(project)||!Object.hasOwn(PROJECTS,project.key)||!Number.isFinite(project.progress)||project.progress<0||!Number.isFinite(project.total)||project.total<=0||(project.target!=null&&!g.territories[project.target])||(PROJECTS[project.key].target&&!g.territories[project.target]))throw Error('Invalid saved bank project.');
   if(project.rivalId!==undefined&&(!ids.includes(project.rivalId)||project.rivalId===p.id))throw Error('Invalid saved project opponent.');
  }
  validateCoreSavedBankProgress(g,p,index);
 }
 if(new Set(g.players.map(p=>p.name.toLowerCase())).size!==n)throw Error('Saved banks must have different names.');
 validateCoreSavedOutcome(g);
 validateBankIdentities(g);
 validateLedger(g);
 validatePilot(g);
 for(let index=0;index<n;index++)if(g.players[index].submitted){
  const check=JSON.parse(JSON.stringify(g)),plan=check.players[index].submitted;check.players[index].submitted=null;
  validateCoreMultiplayerPlan(check,index,plan);
 }
 return g;
}
