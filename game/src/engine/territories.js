function activeTerritories(g){return Object.entries(g.territories)}
function campaignAct(g){return CAMPAIGN_ACTS[Math.max(0,Math.min(CAMPAIGN_ACTS.length-1,Number(g.act)||0))]}
function unlocked(g,t){return t.unlock<=g.cycle}
function branchLevels(p){return Object.values(p.branches).reduce((a,b)=>a+b,0)}
function controlledCount(g,index){return activeTerritories(g).filter(([,t])=>unlocked(g,t)&&t.shares[index]>=55).length}
function marketValue(g,index){return Math.round(activeTerritories(g).filter(([,t])=>unlocked(g,t)).reduce((sum,[,t])=>sum+t.value*(t.shares[index]/100)+(t.shares[index]>=55?7:0),0)*10)/10}
// Idle cash scored 1 point per $135,000 = 7.41 points per $1M, against 5.6 for a
// performing loan. Converting cash into loans therefore destroyed 1.8 points per
// $1M before any yield or credit risk, which is why a lending-committed bank lost
// 12 of 12 measured campaigns. For current editions cash is scored at 1 per
// $250,000 (4.0 per $1M) so earning assets outscore an idle balance, and the
// hoarding line stops being the highest-scoring one. Core only; every earlier
// campaign keeps the original weight so recorded results stay comparable.
function coreCashWeight(p){return researchProgramRules(p)?250000:135000;}
// Core values durable research as franchise know-how. Its former 18 points per
// tier were lost in ordinary monthly deposit swings, despite the cash and
// capital consumed to build it. Historical campaigns retain their old weights.
function baseScore(g,index){const p=g.players[index],s=p.stats,u=p.upgrades,strategyValue=strategyTotal(p)*(researchProgramRules(p)?135:18)+(strategyCapstone(p)?researchProgramRules(p)?100:30:0);return Math.round(((s.deposits/1e6)*5.2+(s.loans/1e6)*5.6+s.customers*.02+s.business*.82+s.merchant*.72+s.wealth*1.15+s.reputation*1.65+s.digital*.55+s.morale*.62+s.staff*2.4+s.cash/coreCashWeight(p)+s.capital/120000+s.earnings/65000+s.influence*.68+s.momentum*.3+(u.technology+u.training+u.analytics+u.wealth+u.operations)*13+strategyValue-(p.boardConcessions||0)*35+branchLevels(p)*14+(p.achievements||[]).length*25-s.compliance-s.attention*.82-s.chargeoffs/100000+marketValue(g,index)*2.5)*10)/10}
// The people/digital mandates required upgrade levels from the five legacy-only
// projects, which no current campaign can start, so both were unreachable. Current
// Core reads the capability lanes instead; earlier saves keep the original test.
function currentMandateRules(g){return researchProgramRules(g);}
// Measured over 20 finished campaigns (4 scenarios x 5 seeds, 120 months):
//   deposits p50 $1,153M | earnings p50 $94.8M | business p50 350 | merchant p50 305
//   markets held p50 7/12 | morale p50 93 | staff p50 45 | charge-off ratio p50 3.2%
// Pre-programme campaigns keep the original thresholds so recorded results stand.
const MANDATE_TARGETS={deposits:1150000000,earnings:95000000,business:320,merchant:280,
 morale:90,staff:40,operations:3,digitalLevel:4,lossRatio:.03};
function mandateTarget(g,key,legacyValue){return currentMandateRules(g)?MANDATE_TARGETS[key]:legacyValue}
function mandateStatus(g,index){const p=g.players[index],s=p.stats,m={...MANDATES[p.mandate]},total=activeTerritories(g).length;if(p.mandate==='network')m.desc=`Operate at least ${networkGoal(g)} total branch levels across the map.`;
 // A mandate must state the target it is actually judged against. Programme
 // thresholds differ from the historical ones, so describe them here rather than
 // editing MANDATES, which every earlier campaign still reads.
 if(currentMandateRules(g)){
  const money=v=>v>=1e9?'$'+(v/1e9).toFixed(2)+'B':'$'+Math.round(v/1e6)+'M';
  const t=MANDATE_TARGETS,say={
   deposits:`Finish with at least ${money(t.deposits)} in deposits.`,
   earnings:`Generate at least ${money(t.earnings)} in cumulative earnings.`,
   commercial:`Finish with ${t.business} business relationships and ${t.merchant} merchant clients.`,
   clean:`Finish with risk 18 or less, attention below 30, and lifetime credit losses under ${(t.lossRatio*100).toFixed(0)}% of the loan book.`,
   people:`Finish with morale ${t.morale}+, staff ${t.staff}+, and Operational Excellence tier ${t.operations}+.`,
   digital:`Finish with digital adoption 85+, Digital Platform tier ${t.digitalLevel}, and Straight-Through Processing running.`};
  if(say[p.mandate])m.desc=say[p.mandate];
 }let achieved=false,progress='';switch(p.mandate){case'map':achieved=controlledCount(g,index)>total/2;progress=`${controlledCount(g,index)} / ${Math.floor(total/2)+1} markets`;break;case'deposits':achieved=s.deposits>=mandateTarget(g,'deposits',40000000);progress=`$${(s.deposits/1e6).toFixed(1)}M / $40M`;break;case'commercial':achieved=s.business>=mandateTarget(g,'business',105)&&s.merchant>=mandateTarget(g,'merchant',80);progress=`${s.business}/105 business // ${s.merchant}/80 merchant`;break;case'earnings':achieved=s.earnings>=mandateTarget(g,'earnings',2200000);progress=`$${(s.earnings/1e6).toFixed(2)}M / $2.2M`;break;case'clean':achieved=s.compliance<=18&&s.attention<30&&(!currentMandateRules(g)||s.loans<=0||s.chargeoffs/s.loans<=mandateTarget(g,'lossRatio',1));progress=currentMandateRules(g)?`risk ${s.compliance}/18 // heat ${s.attention}/30 // losses ${(s.loans>0?s.chargeoffs/s.loans*100:0).toFixed(1)}%/${(MANDATE_TARGETS.lossRatio*100).toFixed(0)}%`:`risk ${s.compliance}/18 // heat ${s.attention}/30`;break;case'people':achieved=s.morale>=mandateTarget(g,'morale',82)&&s.staff>=mandateTarget(g,'staff',10)&&(currentMandateRules(g)?strategyLevel(p,'operations'):p.upgrades.training)>=mandateTarget(g,'operations',2);progress=currentMandateRules(g)?`morale ${s.morale}/${mandateTarget(g,'morale',82)} // staff ${s.staff}/${mandateTarget(g,'staff',10)} // operations capability ${strategyLevel(p,'operations')}/${mandateTarget(g,'operations',2)}`:`morale ${s.morale}/82 // staff ${s.staff}/10 // training ${p.upgrades.training}/2`;break;case'digital':achieved=s.digital>=85&&(currentMandateRules(g)?strategyLevel(p,'digital'):p.upgrades.technology)>=mandateTarget(g,'digitalLevel',2)&&(!currentMandateRules(g)||researchCombination(p,'straightThrough'));progress=currentMandateRules(g)?`digital ${s.digital}/85 // digital capability ${strategyLevel(p,'digital')}/${mandateTarget(g,'digitalLevel',2)}`:`digital ${s.digital}/85 // technology ${p.upgrades.technology}/2`;break;case'network':achieved=branchLevels(p)>=networkGoal(g);progress=`${branchLevels(p)} / ${networkGoal(g)} branch levels`}return{key:p.mandate,...m,achieved,progress}}
function finalScore(g,index){const m=mandateStatus(g,index);return Math.round((baseScore(g,index)+(m.achieved?m.bonus:0))*10)/10}
function captureTrend(g,cycle=0){g.trend=g.trend||[];const point={cycle,scores:g.players.map((_,i)=>baseScore(g,i)),deposits:g.players.map(p=>Math.round(p.stats.deposits)),loans:g.players.map(p=>Math.round(p.stats.loans)),cash:g.players.map(p=>Math.round(p.stats.cash)),profits:g.players.map(p=>Math.round(p.stats.lastProfit)),markets:g.players.map((_,i)=>controlledCount(g,i))};const prior=g.trend[g.trend.length-1];if(prior&&prior.cycle===cycle)g.trend[g.trend.length-1]=point;else g.trend.push(point);return point}
function normalizeAllocation(p){reconcileSpecialistHeadcount(p);for(const k of Object.keys(ROLES))p.allocation[k]=Math.max(0,Math.round(Number(p.allocation[k])||0));let sum=Object.values(p.allocation).reduce((a,b)=>a+b,0);while(sum>p.stats.staff){const k=Object.keys(p.allocation).sort((a,b)=>p.allocation[b]-p.allocation[a])[0];if(!p.allocation[k])break;p.allocation[k]--;sum--}while(sum<p.stats.staff){p.allocation.service++;sum++}}
function chooseEvent(g){let pool=EVENTS.filter(e=>!g.event||e.key!==g.event.key),fav={rate:['ratewar','downturn'],regulatory:['audit','fraud','cyber'],growth:['closure','viral','board']}[g.scenario]||[];pool=pool.concat(pool.filter(e=>fav.includes(e.key)),pool.filter(e=>fav.includes(e.key)));return pick(pool)}
function makeOpportunities(g){const open=activeTerritories(g).filter(([,t])=>unlocked(g,t)).map(([k])=>k),types=shuffled(Object.keys(OPPORTUNITY_TYPES)).slice(0,3);return types.map((type,i)=>{const t=OPPORTUNITY_TYPES[type],market=pick(open),value=Math.round(t.base*(.78+simulationRandom()*.55)/10000)*10000;return{id:`${g.cycle}-${i}-${rint(100,999)}`,type,market,value,name:t.name,dept:t.dept,desc:t.desc}})}
function chooseEconomy(g,initial=false){const pools={balanced:['steady','steady','expansion','tight','recovery','downturn'],rate:['tight','tight','tight','steady','downturn'],regulatory:['steady','tight','downturn','recovery'],growth:['expansion','expansion','expansion','steady','recovery']},prior=g.economy&&g.economy.key,next=initial?pick(pools[g.scenario]||pools.balanced):pick((pools[g.scenario]||pools.balanced).filter(x=>x!==prior));g.economy={key:next,...MACRO_REGIMES[next]};if(MonetaryPolicy.enabled(g))g.economy.rate=g.monetaryPolicy.upperBp/100;return g.economy}
