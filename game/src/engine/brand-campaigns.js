// Expanded business v1: one ordinary campaign and one fixed sponsorship.
// Advertising still redirects finite intake; all costs use operating accounting.
const BrandCampaigns=(()=>{
 const PACKAGES=Object.freeze({community:{name:'Community partnership',monthly:15000,months:1,cancelMonths:0,home:null},burs:{name:'Nan Santonio Burs',monthly:30000,months:6,cancelMonths:2,home:'downtown'}}),PRESETS=[0,15000,40000,80000],MAX_BUDGET=250000;
 const copy=x=>JSON.parse(JSON.stringify(x)),enabled=p=>p?.expandedBusinessVersion===1,uint=n=>Number.isSafeInteger(n)&&n>=0,bps=n=>uint(n)&&n<=10000;
 const keys=(x,want)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===want.split(',').sort().join();
 const matrix=p=>Object.fromEntries(Object.keys(p.marketBook.markets).map(m=>[m,Object.fromEntries(Object.keys(CUSTOMER_SEGMENTS).map(s=>[s,Object.fromEntries(Object.keys(DEPOSIT_SERVICE).map(k=>[k,0]))]))]));
 const regular=p=>({mode:'off',scope:'market',market:p.focus,segment:'everyday',product:'essential',budget:0});
 const instruction=p=>({action:'none',package:'community',scope:'market',market:p.focus});
 function initialize(g){if(!enabled(g))return g;for(const p of g.players){if(!enabled(p)||!p.advertising)throw Error('Brand campaigns need the current Expanded bank and advertising book.');p.brandCampaigns={version:1,lastCycle:0,regular:regular(p),contract:null,awareness:{regular:matrix(p),sponsorship:matrix(p)},report:null,events:[]};}return g;}
 function defaults(p){return {regular:copy(p.brandCampaigns?.regular||regular(p)),sponsorship:instruction(p)};}
 function served(p){return Object.keys(p.marketBook.markets).filter(m=>(p.branches[m]||0)>0).sort();}
 function coverage(p,spec,team=false){return team?['downtown']:spec.scope==='served'?served(p):[spec.market];}
 function validatePolicy(p,policy){
  if(!keys(policy,'regular,sponsorship'))throw Error('Invalid brand campaign instruction.');const r=policy.regular,s=policy.sponsorship;
  if(!keys(r,'mode,scope,market,segment,product,budget')||!['off','targeted','general'].includes(r.mode)||!['market','served'].includes(r.scope)||!Object.hasOwn(p.marketBook.markets,r.market)||!Object.hasOwn(CUSTOMER_SEGMENTS,r.segment)||!Object.hasOwn(DEPOSIT_SERVICE,r.product)||!uint(r.budget)||r.budget>MAX_BUDGET||r.mode==='off'&&r.budget!==0)throw Error('Choose a campaign type, valid coverage and whole-dollar monthly budget up to $250,000.');
  if(!keys(s,'action,package,scope,market')||!['none','start','cancel'].includes(s.action)||!Object.hasOwn(PACKAGES,s.package)||!['market','served'].includes(s.scope)||!Object.hasOwn(p.marketBook.markets,s.market))throw Error('Choose a known sponsorship and coverage.');
  return policy;
 }
 function normalize(p,plan){
  if(!enabled(p)){if(plan.brandCampaignPolicy!==undefined)throw Error('Brand campaigns require a new Expanded business campaign.');return;}
  const policy=copy(plan.brandCampaignPolicy||defaults(p));validatePolicy(p,policy);const r=policy.regular,s=policy.sponsorship,markets=served(p),targets=plan.productProgramPolicy?.markets||p.productPrograms.markets;
  if(r.budget&&(!coverage(p,r).length||coverage(p,r).some(m=>!markets.includes(m))))throw Error('Ordinary advertising must cover served markets.');
  if(r.mode==='targeted'&&r.budget&&!coverage(p,r).some(m=>targets[m]?.[r.segment]?.[r.product])){r.mode='off';r.budget=0;}
  if(s.action==='start'){
   if(p.brandCampaigns.contract)throw Error('Only one sponsorship can run at a time.');
   if(PACKAGES[s.package].home){s.scope='market';s.market=PACKAGES[s.package].home;}
   const selected=coverage(p,s,s.package==='burs');if(!selected.length||selected.some(m=>!markets.includes(m)))throw Error('A sponsorship needs an existing office in its coverage area. The Burs play in Downtown.');
  }
  if(s.action==='cancel'&&!p.brandCampaigns.contract)throw Error('There is no active sponsorship to cancel.');
  plan.brandCampaignPolicy=policy;return policy;
 }
 function cancellation(contract){const d=PACKAGES[contract.package];return Math.min(d.cancelMonths,Math.max(0,d.months-contract.paidMonths))*d.monthly;}
 function commitment(p,plan={}){
  if(!enabled(p))return 0;const policy=plan.brandCampaignPolicy||defaults(p),s=policy.sponsorship,c=p.brandCampaigns.contract;
  return (policy.regular.mode==='off'?0:policy.regular.budget)+(s.action==='cancel'&&c?cancellation(c):s.action==='start'?PACKAGES[s.package].monthly:c?PACKAGES[c.package].monthly:0);
 }
 function mandatory(p,plan={}){return enabled(p)&&p.brandCampaigns.contract&&(plan.brandCampaignPolicy?.sponsorship.action||'none')!=='cancel'?PACKAGES[p.brandCampaigns.contract.package].monthly:0;}
 function quote(g,p,plan={}){
  if(!enabled(p))throw Error('Brand campaigns are unavailable in this campaign.');const candidate=copy(plan),policy=normalize(p,candidate),r=policy.regular,s=policy.sponsorship,c=p.brandCampaigns.contract,d=s.action==='start'?PACKAGES[s.package]:c?PACKAGES[c.package]:null,cycle=g?.cycle||p.brandCampaigns.lastCycle+1;
  const sponsorDue=s.action==='cancel'?cancellation(c):d?d.monthly:0,remaining=s.action==='cancel'?0:s.action==='start'?d.months-1:c?Math.max(0,d.months-c.paidMonths-1):0;
  const targets=candidate.productProgramPolicy?.markets||p.productPrograms.markets,markets=coverage(p,r).filter(m=>r.mode!=='targeted'||targets[m]?.[r.segment]?.[r.product]);
  return {policy,regularRequested:r.budget,sponsorDue,total:r.budget+sponsorDue,markets,sponsorMarkets:s.action==='start'?coverage(p,s,s.package==='burs'):c?.markets||[],endMonth:s.action==='start'?cycle+d.months-1:c?.end||null,futurePayments:remaining*(d?.monthly||0),cancellationFee:c?cancellation(c):s.action==='start'?Math.min(d.cancelMonths,d.months-1)*d.monthly:0};
 }
 function apply(p,policy){if(!enabled(p))return;const plan={brandCampaignPolicy:policy||defaults(p)};normalize(p,plan);p.brandCampaigns.regular=copy(plan.brandCampaignPolicy.regular);p._brandCampaignPolicy=copy(plan.brandCampaignPolicy);}
 function plan(g,index,input){
  const p=g.players[index],next=copy(input);next.brandCampaignPolicy=defaults(p);next.brandCampaignPolicy.regular.mode='off';next.brandCampaignPolicy.regular.budget=0;
  if(g.cycle%3!==index||p.stats.lastProfit<75000||p.stats.cash<750000||fundingPosition(p).excess>0)return next;
  const shadow={...p,allocation:next.allocation,householdBook:{...p.householdBook,policy:next.householdPolicy||p.householdBook.policy},productPrograms:{...p.productPrograms,markets:next.productProgramPolicy?.markets||p.productPrograms.markets}};
  if(advertisingSalesStaff(shadow)<.5&&shadow.householdBook.policy.retention===100){const policy={...shadow.householdBook.policy,retention:75};if(householdServiceReview(shadow,shadow.allocation,policy).coverage>=1)shadow.householdBook.policy=policy;}
  if(advertisingSalesStaff(shadow)<.5)return next;
  let best=null,score=0;for(const market of served(shadow))for(const [segment,mix]of Object.entries(shadow.productPrograms.markets[market]))for(const [product,emphasis]of Object.entries(mix))if(emphasis){const policy={market,segment,product,budget:15000},q=advertisingPreview(shadow,g,policy),value=q.audience*marketReach(shadow,market)*q.fit*emphasis/Object.values(mix).reduce((a,b)=>a+b,0)*(1-q.before/10000);if(q.audience>=100&&!q.paused&&value>score){score=value;best={mode:'targeted',scope:'market',...policy};}}
  if(best){next.brandCampaignPolicy.regular=best;if(planBudget(p,next,g).remaining<300000){next.brandCampaignPolicy.regular.mode='off';next.brandCampaignPolicy.regular.budget=0;}else next.householdPolicy=copy(shadow.householdBook.policy);}return next;
 }
 function split(total,labels){const sorted=[...labels].sort();return Object.fromEntries(sorted.map((label,i)=>[label,Math.floor(total/sorted.length)+(i<total%sorted.length?1:0)]));}
 function cells(p,markets,target){const out=[];for(const m of markets)for(const s of Object.keys(CUSTOMER_SEGMENTS))for(const k of Object.keys(DEPOSIT_SERVICE))if((!target||s===target.segment&&k===target.product)&&productTargetMix(p,m,s)[k])out.push([m,s,k]);return out;}
 function expose(g,p,awareness,markets,budget,target){
  const world=g?.marketEconomy||marketContext?.marketEconomy||p.marketSnapshot,rows=[],portions=split(budget,markets);
  for(const m of markets){const selected=cells(p,[m],target),amounts=split(portions[m],selected.map(x=>x.join('|')));for(const [market,segment,product]of selected){const source=world?.markets?.[market];if(!source)throw Error('Campaign requires a public market supply snapshot.');const audience=source.households.community[segment]+source.households.union[segment],spend=amounts[[market,segment,product].join('|')],reached=Math.min(audience,Math.floor(spend/ADVERTISING_CONTACT_COST[segment])),before=awareness[market][segment][product],after=before+(audience?Math.floor((10000-before)*reached/audience):0);awareness[market][segment][product]=after;rows.push({market,segment,product,spend,audience,reached,before,after});}}
  return rows;
 }
 function available(p){return Math.max(0,Math.min(p.stats.cash-(p.workforce?.policy.reserve||0),pilotSpendingLimit(p))-(p._workforceReserved||0)-(p._relationshipOfferBudget||0)-(p._onboardingBudget||0));}
 function begin(g,p){
  const b=p.brandCampaigns,cycle=g.cycle||b.lastCycle+1;if(b.lastCycle>=cycle||p._advertisingCycle)throw Error('Brand campaigns already settled or in progress.');
  const q=quote(g,p,{brandCampaignPolicy:p._brandCampaignPolicy||defaults(p)}),s=q.policy.sponsorship,events=[],cash=available(p);let sponsorDue=q.sponsorDue,contract=b.contract,startFailed=false;
  if(s.action==='start'){
   if(cash<sponsorDue){startFailed=true;sponsorDue=0;events.push({cycle,type:'unfunded',package:s.package,text:'Sponsorship did not start: its first payment was not funded.'});}
   else{const d=PACKAGES[s.package];contract={package:s.package,scope:s.scope,market:s.market,markets:q.sponsorMarkets,start:cycle,end:cycle+d.months-1,paidMonths:0,status:'active'};events.push({cycle,type:'start',package:s.package,text:p.name+' sponsors '+d.name+' through month '+contract.end+'.'});}
  }
  const sponsorActive=!!contract&&s.action!=='cancel'&&cash>=sponsorDue,regularSpent=q.regularRequested<=Math.max(0,cash-sponsorDue)?q.regularRequested:0;
  for(const [channel,retention]of [['regular',.75],['sponsorship',.85]])for(const row of Object.values(b.awareness[channel]))for(const mix of Object.values(row))for(const key of Object.keys(mix))mix[key]=Math.floor(mix[key]*retention);
  const regularRows=regularSpent?expose(g,p,b.awareness.regular,q.markets,regularSpent,q.policy.regular.mode==='targeted'?q.policy.regular:null):[],sponsorRows=sponsorActive?expose(g,p,b.awareness.sponsorship,contract.markets,sponsorDue,null):[];
  for(const [m,row]of Object.entries(p.advertising.awareness))for(const [seg,mix]of Object.entries(row))for(const key of Object.keys(mix))mix[key]=Math.min(10000,10000-Math.floor((10000-b.awareness.regular[m][seg][key])*(10000-b.awareness.sponsorship[m][seg][key])/10000));
  if(contract){if(s.action==='cancel'){events.push({cycle,type:'cancel',package:contract.package,text:p.name+' ended its sponsorship; cancellation expense $'+sponsorDue.toLocaleString()+'.'});contract=null;}else{contract.paidMonths++;contract.status=sponsorActive?'active':'suspended';if(!sponsorActive)events.push({cycle,type:'suspended',package:contract.package,text:'Sponsorship exposure suspended; the contractual payment remains an operating expense.'});if(cycle>=contract.end){events.push({cycle,type:'end',package:contract.package,text:p.name+' completed its '+PACKAGES[contract.package].name+' sponsorship.'});contract=null;}}}
  b.contract=contract;
  const rows=[];for(const [market,row]of Object.entries(p.advertising.awareness))for(const [segment,mix]of Object.entries(row))for(const [product,awareness]of Object.entries(mix))if(awareness)rows.push({market,segment,product,awareness,boost:advertisingBoost(p,market,segment,product),deposits:0,households:0,assistedDeposits:0,assistedHouseholds:0});
  const anchor=q.policy.regular.market,aw=p.advertising.awareness[anchor].everyday.essential,spent=regularSpent+sponsorDue,policy={market:anchor,segment:'everyday',product:'essential',budget:q.regularRequested+q.sponsorDue};
  p._advertisingCycle={cycle,policy,audience:regularRows.reduce((n,r)=>n+r.audience,0)+sponsorRows.reduce((n,r)=>n+r.audience,0),before:aw,after:aw,reached:regularRows.reduce((n,r)=>n+r.reached,0)+sponsorRows.reduce((n,r)=>n+r.reached,0),requested:policy.budget,spent,paused:regularSpent<q.regularRequested||startFailed,staff:advertisingSalesStaff(p),fit:1,rows,charged:false};
  p._brandCampaignCycle={cycle,regularRequested:q.regularRequested,regularSpent,sponsorDue,sponsorActive,startFailed,regularRows,sponsorRows,events};
 }
 function finish(p){const x=p._brandCampaignCycle,b=p.brandCampaigns;if(!x||b.lastCycle>=x.cycle)throw Error('Brand campaign settlement must occur exactly once.');b.report=copy(x);b.events=copy(x.events);b.lastCycle=x.cycle;}
 function cleanup(p){delete p._brandCampaignCycle;delete p._brandCampaignPolicy;}
 function validateMatrix(p,m){if(!keys(m,Object.keys(p.marketBook.markets).join()))throw Error('Invalid brand awareness markets.');for(const row of Object.values(m)){if(!keys(row,Object.keys(CUSTOMER_SEGMENTS).join()))throw Error('Invalid brand audience.');for(const mix of Object.values(row))if(!keys(mix,Object.keys(DEPOSIT_SERVICE).join())||!Object.values(mix).every(bps))throw Error('Invalid brand awareness.');}}
 function validateReport(p){
  const b=p.brandCampaigns,r=b.report,a=p.advertising.report,unfunded=b.events.find(e=>e.type==='unfunded'),requested=r.regularRequested+r.sponsorDue+(unfunded?PACKAGES[unfunded.package].monthly:0);
  if(![0,15000,30000,60000].includes(r.sponsorDue)||r.startFailed!==!!unfunded||r.startFailed&&(r.sponsorDue!==0||r.sponsorActive)||r.sponsorActive&&!r.sponsorDue)throw Error('Invalid sponsorship payment.');
  for(const [name,rows,total]of [['regular',r.regularRows,r.regularSpent],['sponsorship',r.sponsorRows,r.sponsorActive?r.sponsorDue:0]]){
   const seen=new Set();let sum=0;for(const x of rows){const key=[x.market,x.segment,x.product].join('|');if(seen.has(key)||x.after!==x.before+(x.audience?Math.floor((10000-x.before)*x.reached/x.audience):0)||x.reached!==Math.min(x.audience,Math.floor(x.spend/ADVERTISING_CONTACT_COST[x.segment]))||b.awareness[name][x.market][x.segment][x.product]!==x.after)throw Error('Campaign exposure does not reconcile.');seen.add(key);sum+=x.spend;}if(sum!==total)throw Error('Campaign exposure must split one paid budget.');
  }
  if(!keys(a,'after,assistedDeposits,assistedHouseholds,audience,before,cycle,depositIntake,fit,householdIntake,paused,policy,reached,requested,rows,spent,staff')||a.requested!==requested||typeof a.paused!=='boolean'||a.paused!==(r.regularSpent<r.regularRequested||r.startFailed)||![a.audience,a.reached,a.depositIntake,a.householdIntake,a.assistedDeposits,a.assistedHouseholds].every(uint)||![a.before,a.after].every(bps)||a.reached>a.audience||!Number.isFinite(a.staff)||a.staff<0||a.fit!==1||!Array.isArray(a.rows)||a.rows.length>Object.keys(p.marketBook.markets).length*9)throw Error('Invalid combined campaign attribution.');
  validateAdvertisingPolicy(p,{...a.policy,budget:0});if(a.policy.budget!==requested)throw Error('Combined campaign expense disagrees with request.');
  const seen=new Set();for(const x of a.rows){const key=[x.market,x.segment,x.product].join('|');if(!keys(x,'assistedDeposits,assistedHouseholds,awareness,boost,deposits,households,market,product,segment')||!Object.hasOwn(p.marketBook.markets,x.market)||!Object.hasOwn(CUSTOMER_SEGMENTS,x.segment)||!Object.hasOwn(DEPOSIT_SERVICE,x.product)||seen.has(key)||!bps(x.awareness)||!x.awareness||p.advertising.awareness[x.market][x.segment][x.product]!==x.awareness||!Number.isFinite(x.boost)||x.boost<0||x.boost>.5||![x.deposits,x.households,x.assistedDeposits,x.assistedHouseholds].every(uint)||x.assistedDeposits!==Math.floor(x.deposits*(x.boost/(1+x.boost)))||x.assistedHouseholds!==Math.floor(x.households*(x.boost/(1+x.boost))))throw Error('Invalid campaign attribution row.');seen.add(key);}
  const aware=Object.values(p.advertising.awareness).flatMap(row=>Object.values(row)).flatMap(mix=>Object.values(mix)).filter(Boolean).length;
  if(seen.size!==aware||a.after!==p.advertising.awareness[a.policy.market][a.policy.segment][a.policy.product])throw Error('Campaign attribution omits awareness.');
  for(const [total,key]of Object.entries({depositIntake:'deposits',householdIntake:'households',assistedDeposits:'assistedDeposits',assistedHouseholds:'assistedHouseholds'}))if(a[total]!==a.rows.reduce((n,x)=>n+x[key],0))throw Error('Campaign attribution totals disagree.');
  if(a.depositIntake>p.operatingReport.customerAcquiredDeposits)throw Error('Campaign attribution exceeds ordinary acquisition.');
 }
 function validateOwner(g,p){
  const b=p.brandCampaigns;if(!enabled(p)||!keys(b,'version,lastCycle,regular,contract,awareness,report,events')||b.version!==1||b.lastCycle!==g.cycle-(g.gameOver?0:1)||p._brandCampaignCycle!==undefined||p._brandCampaignPolicy!==undefined||p._advertisingCycle!==undefined)throw Error('Invalid brand campaign state.');
  validatePolicy(p,{regular:b.regular,sponsorship:instruction(p)});if(!keys(b.awareness,'regular,sponsorship'))throw Error('Invalid campaign awareness channels.');validateMatrix(p,b.awareness.regular);validateMatrix(p,b.awareness.sponsorship);validateMatrix(p,p.advertising.awareness);
  for(const [m,row]of Object.entries(p.advertising.awareness))for(const [s,mix]of Object.entries(row))for(const k of Object.keys(mix))if(mix[k]!==10000-Math.floor((10000-b.awareness.regular[m][s][k])*(10000-b.awareness.sponsorship[m][s][k])/10000))throw Error('Combined campaign awareness does not reconcile.');
  if(b.contract){const c=b.contract,d=PACKAGES[c.package];if(!keys(c,'package,scope,market,markets,start,end,paidMonths,status')||!d||!['market','served'].includes(c.scope)||!Object.hasOwn(p.marketBook.markets,c.market)||!uint(c.start)||c.start<1||c.end!==c.start+d.months-1||!uint(c.paidMonths)||c.paidMonths!==b.lastCycle-c.start+1||c.paidMonths>=d.months||!['active','suspended'].includes(c.status)||!Array.isArray(c.markets)||!c.markets.length||new Set(c.markets).size!==c.markets.length||c.markets.some(m=>!Object.hasOwn(p.marketBook.markets,m))||c.package==='burs'&&(c.market!=='downtown'||c.scope!=='market'||c.markets.join()!=='downtown'))throw Error('Invalid sponsorship contract.');}
  if(!Array.isArray(b.events)||b.events.length>3||b.events.some(e=>!keys(e,'cycle,type,package,text')||e.cycle!==b.lastCycle||!['start','unfunded','cancel','end','suspended'].includes(e.type)||!Object.hasOwn(PACKAGES,e.package)||typeof e.text!=='string'||e.text.length>300))throw Error('Invalid sponsorship events.');
  if(!b.lastCycle){if(b.report!==null||b.events.length||p.advertising.report!==null)throw Error('Unexpected opening campaign report.');}
  else{const r=b.report,a=p.advertising.report;if(!keys(r,'cycle,regularRequested,regularSpent,sponsorDue,sponsorActive,startFailed,regularRows,sponsorRows,events')||r.cycle!==b.lastCycle||![r.regularRequested,r.regularSpent,r.sponsorDue].every(uint)||r.regularSpent>r.regularRequested||r.regularRequested>MAX_BUDGET||typeof r.sponsorActive!=='boolean'||typeof r.startFailed!=='boolean'||!Array.isArray(r.regularRows)||!Array.isArray(r.sponsorRows)||JSON.stringify(r.events)!==JSON.stringify(b.events)||!a||a.cycle!==b.lastCycle||a.spent!==r.regularSpent+r.sponsorDue||p.operatingReport?.advertisingCost!==a.spent)throw Error('Invalid brand campaign expense report.');for(const rows of [r.regularRows,r.sponsorRows])for(const row of rows)if(!keys(row,'market,segment,product,spend,audience,reached,before,after')||!Object.hasOwn(p.marketBook.markets,row.market)||!Object.hasOwn(CUSTOMER_SEGMENTS,row.segment)||!Object.hasOwn(DEPOSIT_SERVICE,row.product)||![row.spend,row.audience,row.reached].every(uint)||row.reached>row.audience||!bps(row.before)||!bps(row.after)||row.after<row.before)throw Error('Invalid campaign exposure report.');validateReport(p);}
  if(p.advertising.version!==1||p.advertising.lastCycle!==b.lastCycle||!keys(p.advertising,'version,lastCycle,policy,report,awareness')||p.advertising.policy.budget!==0)throw Error('Legacy advertising must remain an inactive carrier for brand campaigns.');validateAdvertisingPolicy(p,p.advertising.policy);
  if(p.submitted&&typeof p.submitted==='object')normalize(p,copy(p.submitted));return p;
 }
 function validateView(v){
  if(!enabled(v)){if(v.me?.brandCampaigns!==undefined||v.rival?.brandCampaigns!==undefined)throw Error('Unversioned brand campaign view.');return v;}
  validateOwner(v,v.me);if(v.rival.brandCampaigns!==undefined||v.rival.pendingBrandCampaignPolicy!==undefined||Object.entries(v.lastPlans||{}).some(([id,plan])=>id!==v.me.id&&plan.brandCampaignPolicy!==undefined))throw Error('Rival campaign budgets are private.');
  if(v.me.pendingBrandCampaignPolicy!==undefined){if(!v.me.submitted)throw Error('A pending campaign requires a locked plan.');normalize(v.me,{brandCampaignPolicy:copy(v.me.pendingBrandCampaignPolicy)});}
  for(const bank of [v.me,v.rival]){const s=bank.sponsorship;if(s!==null&&(!keys(s,'package,start,end,status,market')||!Object.hasOwn(PACKAGES,s.package)||!uint(s.start)||s.start<1||s.end!==s.start+PACKAGES[s.package].months-1||!['active','suspended'].includes(s.status)||!Object.hasOwn(v.territories,s.market)))throw Error('Invalid public sponsorship badge.');if(!Array.isArray(bank.sponsorshipEvents)||bank.sponsorshipEvents.length>3||bank.sponsorshipEvents.some(e=>!keys(e,'cycle,type,package,text')||!uint(e.cycle)||!['start','end','cancel'].includes(e.type)||!Object.hasOwn(PACKAGES,e.package)||typeof e.text!=='string'||e.text.length>300))throw Error('Invalid public sponsorship announcement.');}return v;
 }
 function validate(g,context){if(context==='view'||g.me)return validateView(g);for(const p of g.players){if(enabled(g)){validateOwner(g,p);}else if(p.brandCampaigns!==undefined||p.submitted?.brandCampaignPolicy!==undefined)throw Error('Unversioned brand campaigns.');}return g;}
 function project(g,out,index){if(!enabled(g))return out;const p=g.players[index];out.me.brandCampaigns=copy(p.brandCampaigns);if(p.submitted?.brandCampaignPolicy)out.me.pendingBrandCampaignPolicy=copy(p.submitted.brandCampaignPolicy);delete out.rival.brandCampaigns;delete out.rival.pendingBrandCampaignPolicy;out.lastPlans=copy(out.lastPlans||{});for(const [id,plan]of Object.entries(out.lastPlans))if(id!==p.id)delete plan.brandCampaignPolicy;for(const [seat,key]of [[index,'me'],[1-index,'rival']]){const b=g.players[seat].brandCampaigns;out[key].sponsorship=b.contract?{package:b.contract.package,start:b.contract.start,end:b.contract.end,status:b.contract.status,market:b.contract.market}:null;out[key].sponsorshipEvents=copy(b.events.filter(e=>['start','end','cancel'].includes(e.type)));}return out;}
 return {PACKAGES,PRESETS,MAX_BUDGET,enabled,initialize,defaults,normalize,apply,plan,commitment,mandatory,quote,served,begin,finish,cleanup,validate,validateOwner,validateView,project};
})();
