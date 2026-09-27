// Expanded's presentation layer. The engine, save format and one monthly draft
// remain authoritative. Routes and unfinished forms never leave this owner.
const INTERFACE_WORKSPACES=[['month','This month','01'],['markets','Markets','02'],['banking','Banking','03'],['people','People','04'],['strategy','Strategy','05'],['group','Financial Group','06']];
let interfaceState={token:null,route:{workspace:'month',view:'summary',context:{}},trail:[],decision:null,message:'',rendering:false};
const interfacePanelHomes=new Map();
let interfaceHeaderObserver=null;
let interfaceTickerPaused=false;
function interfaceHeaderSpacing(){
 const header=$('#interfaceHeader'),measure=()=>{const height=header?.getBoundingClientRect?.().height;if(Number.isFinite(height))document.documentElement?.style?.setProperty('--interface-header-height',height+'px');};
 measure();if(!interfaceHeaderObserver&&typeof ResizeObserver==='function'&&header){interfaceHeaderObserver=new ResizeObserver(measure);interfaceHeaderObserver.observe(header);}
}
function expandedInterfaceEnabled(v){return !!(v?.me?.financialGroup||v?.financialGroupVersion);}
function interfaceToken(v=currentView()){
 return v?{campaign:presentationCampaignIdentity(v),owner:v.me.id,cycle:v.cycle,resolution:v.resolutionId,attempt:connectionAttempt,connection:featureConnectionGeneration,link:linkSession,repository:gh,lan,seat,frame:game||view}:null;
}
function interfaceCurrent(token,writable=true){
 const v=currentView();if(!v||!token)return false;
 const now=interfaceToken(v);
 return Object.keys(now).every(key=>key==='frame'&&!writable||now[key]===token[key])&&(!writable||(!v.me.submitted&&!v.gameOver&&!(gh.active&&gh.paused)))&&draftOwner===v.me.id&&lastCycle===v.cycle;
}
function interfaceIdentity(v){
 const token=interfaceToken(v);
 if(!interfaceState.token||Object.keys(token).some(key=>key!=='frame'&&token[key]!==interfaceState.token[key])){
  interfaceState={token,route:{workspace:'month',view:'summary',context:{}},trail:[],decision:null,message:'',rendering:false};
 }
 return interfaceState;
}
function interfaceCurrentRoute(){return interfaceState.route;}
function interfaceMountPanel(id,mountOrId){
 const key=String(id).replace(/^#/,''),panel=interfacePanelHomes.get(key)?.panel||$('#'+key);
 const mount=typeof mountOrId==='string'?$(mountOrId.startsWith('#')?mountOrId:'#'+mountOrId):mountOrId;
 if(!panel||!mount)return null;
 if(!interfacePanelHomes.has(key))interfacePanelHomes.set(key,{panel,parent:panel.parentElement,next:panel.nextSibling,hidden:panel.hidden});
 if(panel.parentElement!==mount)mount.appendChild(panel);
 panel.hidden=false;return panel;
}
function interfaceParkPanels(){
 for(const {panel,parent,next,hidden}of interfacePanelHomes.values()){
  if(parent&&panel.parentElement!==parent)parent.insertBefore(panel,next?.parentElement===parent?next:null);
  panel.hidden=hidden;
 }
}
function interfaceRestoreCore(){
 interfaceParkPanels();$('#gameScreen')?.classList.remove('interface-enabled');document.body?.classList.remove('game-interface-active');
 if($('#expandedInterface'))$('#expandedInterface').hidden=true;
}
function interfaceSetLocation(labels){
 const mount=$('#interfaceLocation');if(mount)mount.innerHTML=labels.map((label,index)=>'<span'+(index===labels.length-1?' aria-current="page"':'')+'>'+esc(label)+'</span>').join('<span class="interface-crumb-separator" aria-hidden="true">›</span>');
}
function interfaceLegacyRoute(tab,context={}){
 const t=context.target||'',c={...context};delete c.tab;delete c.target;
 if(context.workspace)return {workspace:context.workspace,view:context.view||'',context:context.context||c};
 if(['#lendingPolicies','#lendingPolicyPanel','#productPortfolio-credit','#creditPanel'].includes(t))return {workspace:'banking',view:'lending',context:c};
 if(t==='#pipeline')return {workspace:'banking',view:'services',context:c};
 if(['onboarding','relationships'].includes(context.productDesk)||['onboarding','relationships'].includes(context.customerDesk))return {workspace:'banking',view:'deposits',context:{...c,mode:context.productDesk||context.customerDesk,objectId:(context.productDesk||context.customerDesk)==='onboarding'?'applications':'offers'}};
 if(context.desk==='funding'&&!['#depositPolicies','#productPortfolio'].includes(t))return {workspace:'banking',view:'treasury',context:c};
 if(context.officeId||context.premisesOffice||/facility|sharedPremises|marketMap/.test(t)){
  const v=currentView(),office=context.officeId||context.premisesOffice||interfaceState.route.context?.office||v?.me.facilityNetwork?.offices.find(o=>o.closedCycle===null)?.id;
  return {workspace:'markets',view:t==='#sharedPremisesDesk'?'services':t==='#facilityLifecyclePanel'?'staff':t==='#facilityNetworkPanel'?'convert':context.officeId||context.premisesOffice?'office':'overview',context:{...c,office}};
 }
 if(context.serviceId||/servicePricing|commercialClient|businessAccount/.test(t))return {workspace:'banking',view:'services',context:{...c,agreementId:context.serviceId}};
 if(/companyLoan/.test(t))return {workspace:'banking',view:'lending',context:c};
 if(/staff|people|department|workforce/i.test(t)||context.peopleDesk)return {workspace:'people',view:({overview:'staff',development:'training',coverage:'coverage',leadership:'leadership',recruitment:'recruitment'})[context.peopleDesk]||(/department/.test(t)?'coverage':/workforce/.test(t)?'training':'staff'),context:c};
 if(t==='#decisionGrid')return {workspace:'month',view:'decision',context:{}};
 if(t==='#bankAnnouncements')return {workspace:'month',view:'announcements',context:{}};
 if(/monetary|capitalPolicies|bankRecovery|capitalAction/.test(t))return {workspace:'banking',view:'treasury',context:{...c,objectId:/monetary/.test(t)?'rates':/bankRecovery/.test(t)?'recovery':/capitalAction/.test(t)?'board':'liquidity'}};
 if(/operatingPreview|operatingReport|planBudget|bankFinancialOverview/.test(t))return {workspace:'reports',view:t==='#planBudget'?'commitments':'statements',context:c};
 if(t==='#activeProject')return {workspace:currentView()?.expandedBusinessVersion===1?'reports':'strategy',view:currentView()?.expandedBusinessVersion===1?'operations':'initiatives',context:c};
 if(context.productDesk==='advertising'||context.productSubject==='advertising')return {workspace:'strategy',view:'campaigns',context:c};
 if(context.productDesk==='reports'||context.productSubject==='reports')return {workspace:'reports',view:'portfolios',context:c};
 if(tab==='competition'||t==='#competitiveActions')return {workspace:'strategy',view:'campaigns',context:{campaignType:'competitive'}};
 const routes={overview:{workspace:'month',view:'summary'},markets:{workspace:'markets',view:'overview'},products:{workspace:'banking',view:'deposits'},customers:{workspace:'banking',view:context.customerDesk==='commercial'?'services':'deposits'},credit:{workspace:'banking',view:'lending'},group:{workspace:'group',view:context.groupDesk||'overview'},workforce:{workspace:'people',view:'staff'},strategy:{workspace:'strategy',view:'research'},competition:{workspace:'strategy',view:'campaigns'},intelligence:{workspace:'reports',view:'intelligence'},operations:{workspace:context.desk==='projects'?'markets':context.desk==='forecast'?'reports':'banking',view:context.desk==='projects'?'build':context.desk==='forecast'?'operations':'treasury'}};
 return {...(routes[tab]||routes.overview),context:c};
}
function openInterfaceWorkspace(workspace,viewKey,context={}){
 const v=currentView();if(!v||!expandedInterfaceEnabled(v)||!draft)return false;
 interfaceIdentity(v);
 const valid=[...INTERFACE_WORKSPACES.map(x=>x[0]),'reports','review','utilities'];
 if(!valid.includes(workspace))workspace='month';
 const defaults={month:'summary',markets:'overview',banking:'deposits',people:'staff',strategy:'research',group:'overview',reports:'statements',review:'plan',utilities:'save'};
 interfaceState.route={workspace,view:viewKey||defaults[workspace],context:{...context}};
 // Legacy names are retained only as a compatibility signal. Renderers use the
 // typed route directly; no hidden desk is opened to manufacture another view.
 workspaceTab={month:'overview',markets:'markets',banking:'products',people:'workforce',strategy:'strategy',group:'group',reports:'intelligence',review:'overview',utilities:'overview'}[workspace];
 renderExpandedInterface(v);
 const destination=$('#interface'+workspace[0].toUpperCase()+workspace.slice(1))?.querySelector?.('h1');
 destination?.setAttribute?.('tabindex','-1');destination?.focus?.({preventScroll:true});destination?.scrollIntoView?.({block:'start',behavior:'instant'});
 return true;
}
function interfaceNavigate(item,{remember=true}={}){
 const v=currentView();if(!v||!expandedInterfaceEnabled(v))return false;
 interfaceIdentity(v);
 if(remember){interfaceState.trail.push({route:JSON.parse(JSON.stringify(interfaceState.route)),token:interfaceToken(v),label:$('#interfaceLocation')?.textContent||'previous task',scrollY:window.scrollY,focusId:document.activeElement?.id||null});if(interfaceState.trail.length>12)interfaceState.trail.shift();}
 const next=interfaceLegacyRoute(item.tab||'overview',item);
 return openInterfaceWorkspace(next.workspace,next.view,next.context);
}
function interfaceReturn(){
 const frame=interfaceState.trail.at(-1);if(!frame||!interfaceCurrent(frame.token,false)){interfaceState.trail=[];renderExpandedInterface(currentView());return false;}
 interfaceState.trail.pop();openInterfaceWorkspace(frame.route.workspace,frame.route.view,frame.route.context);
 requestAnimationFrame(()=>{if(!interfaceCurrent(frame.token,false))return;if(frame.focusId)$('#'+frame.focusId)?.focus?.({preventScroll:true});window.scrollTo?.({top:frame.scrollY,behavior:'auto'});});return true;
}
function renderExpandedGame(v){
 if(v.gameOver){renderFinal(v);maybeResolution(v);return;}
 show('#gameScreen');ensureDraft(v);renderBankIdentity(v);
 if(!['p2p','lan'].includes(v.mode))$('#linkState').textContent=v.mode==='ai'?'Local game · AI rival':'Local game · pass and play';else paintLink();
 paintRelink();$('#exportBtn').disabled=p2pRole==='guest';renderReady(v);maybeResolution(v);
}
function renderExpandedInterface(v,review){
 if(!v||!expandedInterfaceEnabled(v)||!draft)return;
 interfaceIdentity(v);if(interfaceState.rendering)return;interfaceState.rendering=true;
 try{
  interfaceParkPanels();
  reconcileGameHelp();
  const root=$('#expandedInterface');if(!root)return;
  root.hidden=false;$('#gameScreen').classList.add('interface-enabled');document.body.classList.add('game-interface-active');
  review=review||monthlyPlanReview(v);review={...review,warnings:[...review.warnings,...interfacePendingEdits(v)]};const f=bankFinancialOverview(v,review),route=interfaceState.route,rows=interfacePlanRows(v),token=interfaceToken(v);
  const committed=f.quote?.total;
  $('#interfaceHeader').innerHTML='<div class="interface-bank"><div class="interface-bank-mark">'+bankIdentityMarkup(v.me,{size:'small',showName:false})+'</div><div><span class="interface-eyebrow">Your institution</span><strong>'+esc(v.me.name)+'</strong><span>Month '+v.cycle+' · '+esc(E.SCOPES[v.scope]?.name||v.scope)+'</span></div></div><div class="interface-money"><div class="interface-spend"><span>Available to spend</span><strong class="'+(f.room<0?'bad':'')+'">'+overviewDollars(f.room)+'</strong><button type="button" class="interface-text-button" data-interface-budget>How this is calculated</button></div><div><span>Planned commitments</span><strong>'+overviewDollars(committed)+'</strong><small>Bank instructions</small></div><div><span>Bank cash</span><strong>'+overviewDollars(f.cash)+'</strong><small>Current balance</small></div><div><span>Capital ratio</span><strong>'+ (Number.isFinite(v.me.capitalRatio)?v.me.capitalRatio.toFixed(1)+'%':'Unavailable')+'</strong><small>'+esc(v.me.capitalTier?.short||'')+'</small></div></div><button type="button" class="btn primary interface-review-button" data-interface-review>Review month <span>'+rows.length+'</span></button>';
  $('#interfaceSession').innerHTML='<div class="interface-session-bank">'+bankIdentityMarkup(v.rival,{seat:1,size:'small',showName:false})+'<span><b>'+esc(v.rival.name)+'</b><small>Rival · '+(v.rival.submitted?'Ready':'Planning')+'</small></span></div><span class="interface-owner-status">'+(v.me.submitted?'Your plan is ready':v.gameOver?'Campaign ended':'Your plan is editable')+'</span><div id="interfaceLinkMount"></div>';
  interfaceMountPanel('linkState','interfaceLinkMount');
  $('#interfaceNavigation').innerHTML=INTERFACE_WORKSPACES.map(([key,label,no])=>'<button type="button" data-interface-workspace="'+key+'" aria-current="'+(route.workspace===key?'page':'false')+'"><span>'+no+'</span>'+label+'</button>').join('')+'<div class="interface-nav-secondary"><button type="button" data-interface-workspace="reports" aria-current="'+(route.workspace==='reports'?'page':'false')+'">Reports</button><button type="button" data-interface-workspace="utilities" aria-current="'+(route.workspace==='utilities'?'page':'false')+'">Save &amp; help</button></div>';
  const frame=interfaceState.trail.at(-1);$('#interfaceReturnBar').innerHTML=frame&&interfaceCurrent(frame.token,false)?'<button type="button" class="interface-text-button" id="interfaceBack">← Return to '+esc(frame.label)+'</button>':'';
  const title=INTERFACE_WORKSPACES.find(x=>x[0]===route.workspace)?.[1]||({reports:'Reports',review:'Review month',utilities:'Save & help'})[route.workspace];interfaceSetLocation([title]);
  for(const key of ['month','markets','banking','people','strategy','group','reports','review','utilities']){
   const panel=$('#interface'+key[0].toUpperCase()+key.slice(1));panel.hidden=key!==route.workspace;
   // Working values live in owner-scoped forms. Retaining inactive markup
   // would duplicate editor IDs when Banking and Group use the same inspector.
   if(panel.hidden)panel.innerHTML='';
  }
  const mount=$('#interface'+route.workspace[0].toUpperCase()+route.workspace.slice(1));
  if(route.workspace==='month')renderInterfaceMonth(v,route,mount,review,f);
  else if(route.workspace==='markets')renderInterfaceMarkets(v,route,mount);
  else if(route.workspace==='banking')renderInterfaceBanking(v,route,mount);
  else if(route.workspace==='group')renderInterfaceGroup(v,route,mount);
  else if(route.workspace==='review'||route.workspace==='reports'&&route.view==='commitments')renderInterfaceReview(v,route,mount,review,f);
  else if(['people','strategy','reports'].includes(route.workspace))renderInterfacePeopleStrategy(v,route,mount);
  else renderInterfaceUtilities(v,mount);
  $('#interfaceHeader').onclick=event=>{if(!interfaceCurrent(token,false))return;if(event.target.closest('[data-interface-review]'))openInterfaceWorkspace('review');if(event.target.closest('[data-interface-budget]'))interfaceNavigate({workspace:'reports',view:'commitments'});};
  $('#interfaceNavigation').onclick=event=>{const button=event.target.closest('[data-interface-workspace]');if(button&&interfaceCurrent(token,false)){interfaceState.trail=[];openInterfaceWorkspace(button.dataset.interfaceWorkspace);$('#interfaceLocation')?.focus?.({preventScroll:true});}};
  $('#interfaceBack')?.addEventListener('click',interfaceReturn);
  interfaceHeaderSpacing();
 }finally{interfaceState.rendering=false;}
}
function interfaceDecisionForm(v){
 const stamp=JSON.stringify(draft.decision);
 if(!interfaceState.decision)interfaceState.decision={value:draft.decision,stamp,dirty:false};
 const state=interfaceState.decision;if(!state.dirty&&state.stamp!==stamp){state.value=draft.decision;state.stamp=stamp;}
 return state;
}
function interfaceDecisionMarkup(v){
 const state=interfaceDecisionForm(v),selected=state.value,locked=v.me.submitted||v.gameOver;
 let q=null,error='';try{if(selected)q=E.decisionQuote(v.me,v.event,selected);}catch(e){error=e.message;}
 const labels={staff:'Bankers',reputation:'Reputation',morale:'Morale',compliance:'Compliance risk',attention:'Corporate attention',influence:'Influence',momentum:'Momentum'};
 return '<section class="interface-card"><span class="interface-eyebrow">Required decision</span><h2>'+esc(v.event.name)+'</h2><p>'+esc(v.event.text)+'</p><div class="interface-options">'+['a','b'].map(key=>'<button type="button" class="interface-choice '+(selected===key?'selected':'')+'" data-interface-decision="'+key+'" aria-pressed="'+(selected===key)+'" '+(locked?'disabled':'')+'><strong>'+esc(v.event[key])+'</strong><span>'+esc(v.event[key+'d'])+'</span></button>').join('')+'</div>'+(q?'<div class="interface-quote"><h3>Consequences of this response</h3><dl><div><dt>Cash paid now</dt><dd>'+overviewDollars(q.paid)+'</dd></div><div><dt>Cash received</dt><dd>'+overviewDollars(q.received)+'</dd></div><div><dt>Cash balance change</dt><dd>'+overviewDollars(q.cashChange)+'</dd></div><div><dt>'+(q.accounting?'Equity':'Capital')+' change</dt><dd>'+overviewDollars(q.equityChange)+'</dd></div></dl><p>'+esc(Object.entries(labels).filter(([key])=>q.changes[key]).map(([key,label])=>label+' '+(q.changes[key]>0?'+':'')+q.changes[key]).join(' · '))+'</p>'+(q.securitiesSold||q.loansSold||q.borrowed?'<p class="warn">Funding: securities sold '+overviewDollars(q.securitiesSold)+' · loans sold '+overviewDollars(q.loansSold)+' · emergency debt '+overviewDollars(q.borrowed)+' · funding loss '+overviewDollars(q.fundingLoss)+'</p>':'')+'<p class="small">Immediate estimate before other monthly orders. This call is outside planned commitments; later operations and rival actions may change results.</p></div>':error?'<p class="bad">'+esc(error)+'</p>':'<p class="small">Choose a response to see its cash, capital and staffing consequences.</p>')+'<div class="interface-actions"><button type="button" class="btn primary" id="interfaceDecisionAdd" '+(locked||!q?'disabled':'')+'>'+(draft.decision?'Update planned action':'Add to monthly plan')+'</button><button type="button" class="btn" id="interfaceDecisionDiscard" '+(locked||!state.dirty?'disabled':'')+'>Discard edits</button><span class="small">'+(state.dirty?'Unstaged changes':draft.decision?'Response '+draft.decision.toUpperCase()+' is in your plan':'No response planned')+'</span></div></section>';
}
function bindInterfaceDecision(v){
 const token=interfaceToken(v),state=interfaceDecisionForm(v),route=interfaceState.route,fresh=()=>interfaceCurrent(token)&&interfaceState.route===route&&interfaceState.decision===state;
 $$('[data-interface-decision]').forEach(button=>button.onclick=()=>{if(!fresh())return;state.value=button.dataset.interfaceDecision;state.dirty=state.value!==draft.decision;renderExpandedInterface(currentView());$('[data-interface-decision="'+state.value+'"]')?.focus?.({preventScroll:true});});
 $('#interfaceDecisionAdd')?.addEventListener('click',()=>{if(!fresh()||!['a','b'].includes(state.value))return;draft.decision=state.value;state.dirty=false;state.stamp=JSON.stringify(draft.decision);renderReady(currentView());$('#interfaceDecisionAdd')?.focus?.({preventScroll:true});});
 $('#interfaceDecisionDiscard')?.addEventListener('click',()=>{if(!fresh())return;interfaceState.decision=null;renderExpandedInterface(currentView());$('#interfaceDecisionAdd')?.focus?.({preventScroll:true});});
}
function interfaceIssueList(items,kind){return items.length?'<ul class="interface-issue-list">'+items.map((item,index)=>'<li><div><b>'+esc(item.title)+'</b><p>'+esc(item.text)+'</p></div><button type="button" class="btn" data-interface-issue="'+kind+':'+index+'">Open</button></li>').join('')+'</ul>':'<p class="small">'+(kind==='blockers'?'Required decisions complete.':'No listed warnings.')+'</p>';}
// Cosmetic market quotes and chart coordinates use only the public score view.
// They never create a security, financial balance, history point or random draw.
function interfaceScoreHistory(v){
 const points=new Map();
 for(const point of v.trend||[])if(Number.isInteger(point.cycle)&&point.cycle>=0&&Number.isFinite(point.meScore)&&Number.isFinite(point.rivalScore))points.set(point.cycle,{cycle:point.cycle,meScore:point.meScore,rivalScore:point.rivalScore});
 return [...points.values()].sort((a,b)=>a.cycle-b.cycle);
}
function interfaceTickerQuote(v,key){
 const points=interfaceScoreHistory(v),last=points.at(-1),scoreKey=key==='me'?'meScore':'rivalScore';
 const score=last?last[scoreKey]:v[key]?.score,price=Number.isFinite(score)?Math.max(1,Math.round(score*10))/100:null;
 // Use completed closes, including later subsidiary settlements. A current
 // score can change at next-month unlock; scoreDelta is captured too early.
 const prior=points.at(-2);
 const previous=prior?Math.max(1,Math.round(prior[scoreKey]*10))/100:null;
 return {price,previous,change:price!==null&&previous!==null?Math.round((price-previous)*100)/100:null,cycle:last?.cycle??null,previousCycle:prior?.cycle??null};
}
function interfaceTickerMarkup(v){
 const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const items=['me','rival'].map((key,index)=>{
  const bank=v[key],q=interfaceTickerQuote(v,key),change=q.change,sign=change===null?'':change>0?'+':change<0?'−':'';
  const movement=change===null?(q.cycle===0?'Opening quote':'No previous close'):change===0?'— Unchanged':(change>0?'▲ ':'▼ ')+sign+'$'+Math.abs(change).toFixed(2)+' ('+sign+Math.abs(change/q.previous*100).toFixed(2)+'%)';
  return '<li class="interface-ticker-item">'+bankIdentityMarkup(bank,{seat:index,size:'small',showName:false})+'<span class="interface-ticker-name" title="'+esc(bank.name)+'">'+esc(bank.name)+'</span><strong data-ticker-price="'+key+'">'+(q.price===null?'Unavailable':'$'+q.price.toFixed(2))+'</strong><span class="'+(change>0?'good':change<0?'bad':'')+'" data-ticker-change="'+key+'">'+esc(q.price===null?'Score unavailable':movement)+'</span></li>';
 }).join('');
 const close=interfaceScoreHistory(v).at(-1);
 return '<section class="interface-ticker'+(interfaceTickerPaused?' is-paused':'')+'" aria-label="Illustrative bank share prices"><div class="interface-ticker-heading"><span><b>Bank ticker</b><small>Illustrative prices · '+(close?(close.cycle?'month '+close.cycle+' close':'opening scores'):'current scores')+'</small></span>'+(reduced?'<small>Motion off</small>':'<button type="button" class="interface-text-button" id="interfaceTickerPause" aria-pressed="'+interfaceTickerPaused+'">'+(interfaceTickerPaused?'Resume ticker':'Pause ticker')+'</button>')+'</div><div class="interface-ticker-window"><div class="interface-ticker-track"><ul class="interface-ticker-group">'+items+'</ul><ul class="interface-ticker-group" aria-hidden="true">'+items.replaceAll('data-ticker-price=','data-ticker-copy-price=').replaceAll('data-ticker-change=','data-ticker-copy-change=')+'</ul></div></div></section>';
}
function interfaceRankingsMarkup(v){
 const points=interfaceScoreHistory(v),a=v.me.score,b=v.rival.score,valid=Number.isFinite(a)&&Number.isFinite(b),gap=valid?a-b:null;
 const standing=gap===null?'Ranking unavailable':gap===0?'Banks are tied':(gap>0?'You lead by ':'Rival leads by ')+Math.abs(gap).toLocaleString(undefined,{maximumFractionDigits:1})+' points';
 const legend=['me','rival'].map((key,index)=>'<div class="interface-rank-bank">'+bankIdentityMarkup(v[key],{seat:index,size:'small',showName:false})+'<span class="interface-rank-name">'+esc(v[key].name)+'<small>'+(index?'Dashed line · rival':'Solid line · your bank')+'</small></span><span class="interface-rank-value"><b>'+(valid?(gap===0?'Joint #1':(key==='me'?gap>0:gap<0)?'#1':'#2'):'—')+'</b><span>'+ (Number.isFinite(v[key].score)?v[key].score.toLocaleString(undefined,{maximumFractionDigits:1})+' points':'Unavailable')+'</span></span></div>').join('');
 let chart='<p class="small">Recorded score history is unavailable in this save. Current rankings appear above.</p>';
 if(points.length){
  const W=820,H=220,L=64,R=18,T=18,B=34,values=points.flatMap(p=>[p.meScore,p.rivalScore]),min=Math.min(...values),max=Math.max(...values),padding=Math.max(5,(max-min)*.12),lo=Math.floor(min-padding),hi=Math.ceil(max+padding),first=points[0].cycle,last=points.at(-1).cycle;
  const x=cycle=>points.length===1?(L+W-R)/2:L+(cycle-first)*(W-L-R)/Math.max(1,last-first),y=score=>H-B-(score-lo)*(H-T-B)/(hi-lo),line=key=>points.map((p,i)=>(i?'L':'M')+x(p.cycle).toFixed(2)+','+y(p[key]).toFixed(2)).join(' ');
  const grid=[0,.25,.5,.75,1].map(n=>{const yy=T+n*(H-T-B),value=hi-n*(hi-lo);return '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" class="interface-rank-grid"/><text x="'+(L-10)+'" y="'+(yy+4)+'" text-anchor="end">'+Math.round(value).toLocaleString()+'</text>';}).join('');
  const cycles=[...new Set([first,points[Math.floor((points.length-1)/2)].cycle,last])];
  chart='<svg class="interface-rank-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="interfaceRankChartTitle interfaceRankChartDesc"><title id="interfaceRankChartTitle">Bank score comparison</title><desc id="interfaceRankChartDesc">Recorded enterprise scores. '+esc(v.me.name)+' uses a solid blue line; '+esc(v.rival.name)+' uses a dashed burgundy line. '+esc(standing)+'.</desc>'+grid+['meScore','rivalScore'].map((key,index)=>'<path class="interface-rank-line '+(index?'rival':'me')+'" d="'+line(key)+'"/>'+points.map(p=>'<circle class="interface-rank-point '+(index?'rival':'me')+'" cx="'+x(p.cycle).toFixed(2)+'" cy="'+y(p[key]).toFixed(2)+'" r="'+(points.length===1?'5':'3')+'"><title>'+esc((index?v.rival.name:v.me.name)+' · '+(p.cycle?'Month '+p.cycle:'Opening')+' · '+p[key].toFixed(1)+' points')+'</title></circle>').join('')).join('')+cycles.map(c=>'<text x="'+x(c)+'" y="'+(H-10)+'" text-anchor="middle">'+(c?'Month '+c:'Opening')+'</text>').join('')+'</svg><p class="small interface-rank-caption">'+(points.length===1?'Opening scores. The comparison grows after each resolved month.':'Actual recorded enterprise scores · opening through month '+last+'.')+' Illustrative ticker price = score ÷ 10, with a $0.01 minimum. No trading or economic effect.</p>';
 }
 return '<section class="interface-card interface-rankings"><div class="interface-section-heading"><h2>Bank rankings</h2><span class="interface-rank-standing">'+esc(standing)+'</span></div><div class="interface-rank-legend">'+legend+'</div>'+chart+'</section>';
}
function renderInterfaceMonth(v,route,mount,review,f){
 const views=[['summary','Summary'],['decision','Executive decision'],['announcements','Announcement'],['events','Events']],key=views.some(x=>x[0]===route.view)?route.view:'summary',rows=interfacePlanRows(v),token=interfaceToken(v);
 interfaceSetLocation(['This month',views.find(x=>x[0]===key)[1]]);
 mount.innerHTML=(key==='summary'?interfaceTickerMarkup(v):'')+'<header class="interface-workspace-heading"><div><span class="interface-eyebrow">Month '+v.cycle+'</span><h1>This month</h1><p>Understand the result. Choose your next moves.</p></div></header><nav class="interface-view-tabs" aria-label="This month views">'+views.map(([id,label])=>'<button type="button" class="btn" data-interface-month="'+id+'" aria-pressed="'+(key===id)+'">'+label+'</button>').join('')+'</nav><div id="interfaceMonthBody"></div>';
 const body=$('#interfaceMonthBody');
 if(key==='decision'){body.innerHTML=interfaceDecisionMarkup(v);bindInterfaceDecision(v);}
 else if(key==='announcements'){interfaceMountPanel('bankAnnouncements',body);renderBankAnnouncements(v);}
 else if(key==='events')body.innerHTML='<section class="interface-card"><h2>'+(v.resolutionId?'Latest month’s events':'Opening conditions')+'</h2><p class="small">Announcements appear first. These are recorded results, not forecasts.</p>'+(v.resolution?.length?'<ol class="interface-events">'+resolutionDisplayLines(v).map((text,i)=>'<li>'+interfaceEventMarkup(v,text,i)+'</li>').join(''):'<p>'+esc(v.economy.text)+'</p>')+'</section>';
 else{
  const attention=bankAttentionItems(v,review,f).filter(item=>!review.blockers.some(x=>x.id===item.id)).slice(0,8);
  body.innerHTML='<div class="interface-result-strip"><article><span>Operating profit'+(f.operating?' · month '+f.operating.cycle:'')+'</span><strong>'+overviewDollars(f.operating?.profit)+'</strong><small>'+ (f.operating?'Recorded operating result':'No completed month')+'</small></article><article><span>Deposits · now</span><strong>'+overviewDollars(v.me.stats.deposits)+'</strong><small>Customer funds, a bank liability</small></article><article><span>Loans · now</span><strong>'+overviewDollars(v.me.stats.loans)+'</strong><small>Outstanding bank assets</small></article><article><span>Planned actions</span><strong>'+rows.length+'</strong><button type="button" class="interface-text-button" data-month-review>Review your plan →</button></article></div><div class="interface-month-columns"><section class="interface-card"><div class="interface-section-heading"><h2>Required before Ready</h2><span class="interface-count">'+review.blockers.length+'</span></div>'+interfaceIssueList(review.blockers,'blockers')+'</section><section class="interface-card"><div class="interface-section-heading"><h2>Watch this month</h2><span class="interface-count">'+attention.length+'</span></div>'+interfaceIssueList(attention,'attention')+'<button type="button" class="interface-text-button" data-month-review>See all warnings and commitments →</button></section></div><section class="interface-card interface-month-news"><div><span class="interface-eyebrow">Economic conditions</span><h2>'+esc(v.economy.name)+'</h2><p>'+esc(v.economy.text)+'</p></div><div><span>Benchmark rate</span><strong>'+Number(v.economy.rate).toFixed(2)+'%</strong><button type="button" class="interface-text-button" data-month-treasury>Open Treasury →</button></div></section>';
  body.onclick=event=>{if(!interfaceCurrent(token,false))return;const button=event.target.closest('[data-interface-issue]');if(button){const [kind,index]=button.dataset.interfaceIssue.split(':');interfaceNavigate((kind==='blockers'?review.blockers:attention)[Number(index)]);}if(event.target.closest('[data-month-review]'))openInterfaceWorkspace('review');if(event.target.closest('[data-month-treasury]'))interfaceNavigate({workspace:'banking',view:'treasury'});};
  body.insertAdjacentHTML('afterbegin',interfaceRankingsMarkup(v));
  $('#interfaceTickerPause')?.addEventListener('click',event=>{if(!interfaceCurrent(token,false))return;interfaceTickerPaused=!interfaceTickerPaused;$('#interfaceMonth .interface-ticker')?.classList.toggle('is-paused',interfaceTickerPaused);event.currentTarget.setAttribute('aria-pressed',String(interfaceTickerPaused));event.currentTarget.textContent=interfaceTickerPaused?'Resume ticker':'Pause ticker';});
 }
 mount.querySelectorAll('[data-interface-month]').forEach(button=>button.onclick=()=>{if(interfaceCurrent(token,false))openInterfaceWorkspace('month',button.dataset.interfaceMonth);});
}
function interfaceEventMarkup(v,text,index){
 const bank=[v.me,v.rival].find(p=>(p.sponsorshipEvents||[]).some(e=>e.text===text));
 if(!bank)return announcementResolutionMarkup(v,text,index);
 const event=bank.sponsorshipEvents.find(e=>e.text===text);
 return '<div class="brand-sponsor-event">'+brandCampaignLogo(event.package)+'<div>'+bankIdentityMarkup(bank,{showName:true})+'<p>'+esc(text)+'</p></div></div>';
}
function interfaceChangeRoute(v,row){
 if(row.route)return row.route;
 const [key,id,field]=row.path,context={};
 if(key==='decision'||key==='announcement')return {workspace:'month',view:key==='decision'?'decision':'announcements',context};
 if(key==='focus')return {workspace:'markets',view:'overview',context:{market:draft.focus}};
 if(key==='newProjects'){
  const def=v.projects[id],market=draft.projectTargets?.[id]||draft.focus;
  if(def?.kind==='branch')return {workspace:'markets',view:'build',context:{market,project:id}};
  if(['branchService','branchAutomation','branchClose'].includes(id))return {workspace:'markets',view:'improve',context:{market,project:id}};
  if(def?.kind==='acquisition')return {workspace:'banking',view:'lending',context:{objectId:'acquisition',project:id,marketId:market}};
  if(id==='correctiveAction')return {workspace:'banking',view:'treasury',context:{objectId:'recovery',mode:'corrective'}};
   if(['buildDigitalPlatform','licenseDigitalPlatform'].includes(id))return {workspace:'banking',view:'services',context:{objectId:'digital-platform',projectId:id}};
   if(def?.serviceOnly)return {workspace:'banking',view:'services',context:{objectId:'platform:'+id,project:id,marketId:market}};
  if(def?.programOnly||def?.deploymentProduct)return {workspace:'banking',view:'deposits',context:{productId:E.PRODUCT_PROGRAM_PROJECTS?.[id]?.product||def.deploymentProduct,projectId:id,mode:'delivery',marketId:market}};
  return {workspace:'strategy',view:'initiatives',context:{project:id}};
 }
 if(key==='sharedPremisesPolicy'){
  const p=draft.sharedPremisesPolicy||{},room=row.objectId||p.cancel||p.remove||p.allocations?.[0]?.room,office=p.build?.office||v.me.sharedPremises?.book.rooms.find(r=>r.id===room)?.office;
  return {workspace:'markets',view:room||p.build?'room':'services',context:{office,room,kind:p.build?.kind}};
 }
 if(key==='facilityPolicy')return {workspace:'markets',view:'convert',context:{office:draft.facilityPolicy?.convert?.officeId||draft.facilityPolicy?.cancel||row.after?.officeId,model:draft.facilityPolicy?.convert?.model}};
 if(key==='facilityExtensionPolicy')return {workspace:'markets',view:'suite',context:{office:draft.facilityExtensionPolicy?.start||draft.facilityExtensionPolicy?.cancel||row.after}};
 if(key==='facilityLifecyclePolicy')return {workspace:'markets',view:id==='renovate'||id==='cancel'?'renovate':['maintenance','hubId'].includes(row.path[3])?'maintenance':'staff',context:{office:id==='offices'?row.path[2]:typeof row.after==='string'?row.after:row.objectId}};
 if(key==='departmentFunctionsPolicy')return {workspace:'people',view:'coverage',context:{functionId:field}};
 if(key==='workforcePolicy')return {workspace:'people',view:'training',context:{role:id==='training'?field:undefined}};
 if(key==='departmentPolicy')return {workspace:'people',view:'leadership',context:{role:field==='training'?row.path[3]:'limits'}};
 if(['allocation','hires','specialistHires','leaderOrders'].includes(key))return {workspace:'people',view:key==='allocation'?'staff':/Hires|hires/.test(key)?'recruitment':'leadership',context:{role:key==='hires'?'generalist':id}};
 if(key==='competitiveAction')return {workspace:'strategy',view:'campaigns',context:{campaignType:'competitive'}};
 if(key==='management')return {workspace:id==='delivery'?'people':'strategy',view:id==='delivery'?'coverage':'mandates',context:id==='delivery'?{functionId:'delivery'}:{}};
 if(key==='productProgramPolicy')return {workspace:'banking',view:'deposits',context:{productId:field,mode:id==='pricingBp'?'terms':'delivery'}};
 if(key==='investments'||key==='specializations'||key==='advertisingPolicy')return {workspace:'strategy',view:key==='investments'?'research':key==='specializations'?'models':key==='advertisingPolicy'?'campaigns':'initiatives',context:{branch:id}};
 if(key==='investmentPolicy'&&id==='inventorySale')return {workspace:'banking',view:'treasury',context:{objectId:'securities-offer'}};
 if(key==='investmentPolicy')return {workspace:'group',view:'investment',context:{objectId:id==='close'?'close':'development'}};
 if(key==='groupPolicy'||key==='agencyPolicy'||key==='companyShareOrders'||key==='companyControlPolicy')return {workspace:'group',view:key==='agencyPolicy'?'agency':key==='groupPolicy'?'parent':'companies',context:{field:id}};
 if(key==='treasuryPolicy'||key==='capitalAction'||key==='capitalPolicy')return {workspace:'banking',view:'treasury',context:{objectId:key==='treasuryPolicy'?'investments':key==='capitalAction'?'board':'liquidity'}};
 if(key==='collectionsPolicy'||key==='lendingPolicy'||key==='companyCreditOrders'||key==='products'&&id==='credit')return {workspace:'banking',view:'lending',context:{objectId:key==='collectionsPolicy'?'collections':key==='lendingPolicy'?'standards':'portfolio',segment:field||id}};
 if(key==='opportunity')return financeOpportunityRoute(v,row.after)||{workspace:'banking',view:'deposits',context:{}};
 if(key==='contractBid'||key==='contractExit')return {workspace:'banking',view:'services',context:{agreementId:typeof row.after==='string'?row.after:row.after?.id,mode:key==='contractExit'?'renewal':'bid'}};
 if(key==='servicePolicy')return {workspace:'banking',view:'services',context:{objectId:id==='pricing'?'pricing':'delivery'}};
 if(key==='commercialAccountPolicy'){
  const company=v.commercialAccountMarket?.rows.find(r=>r.id===draft.commercialAccountPolicy?.target),agreement=v.serviceAgreements?.find(r=>r.market===company?.market);
  return {workspace:'banking',view:'services',context:{agreementId:agreement?.id,mode:'account'}};
 }
 if(key==='depositPolicy'||key==='termPolicy'||key==='householdPolicy'||key==='relationshipOfferPolicy'||key==='onboardingPolicy')return {workspace:'banking',view:'deposits',context:{objectId:({depositPolicy:'base',termPolicy:'term',householdPolicy:'households',relationshipOfferPolicy:'offers',onboardingPolicy:'applications'})[key]}};
 return {workspace:'banking',view:'deposits',context:{productId:id,field}};
}
function interfaceChangeTitle(v,row){
 if(row.title)return row.title;
 const [key,id]=row.path;
 if(row.initiative)return (v.projects[id]?.name||id)+' · '+(v.territories[draft.projectTargets?.[id]||draft.focus]?.name||'Bank-wide');
 if(key==='investments')return 'Research · '+(v.strategyBranches?.[id]?.name||id);
 if(key==='allocation')return 'Bank staffing · '+(v.roles?.[id]?.name||id);
 if(key==='specialistHires')return 'Recruitment · '+id;
 return monthlyChangeName(row.path);
}
function renderInterfaceReview(v,route,mount,review,f){
 const rows=interfacePlanRows(v),token=interfaceToken(v),stamp=JSON.stringify(draft),locked=v.me.submitted||v.gameOver,q=f.quote;
 interfaceSetLocation([route.workspace==='reports'?'Reports':'Review month',route.workspace==='reports'?'Spending commitments':'Your monthly plan']);
 mount.innerHTML='<header class="interface-workspace-heading"><div><span class="interface-eyebrow">Month '+v.cycle+'</span><h1>'+ (route.workspace==='reports'?'Spending commitments':'Review month')+'</h1><p>One shared plan. Nothing executes until the month resolves.</p></div></header><section class="interface-card"><h2>Spending position</h2><div class="interface-result-strip"><article><span>Available to spend</span><strong>'+overviewDollars(f.room)+'</strong></article><article><span>Planned commitments</span><strong>'+overviewDollars(q?.total)+'</strong></article><article><span>Bank cash</span><strong>'+overviewDollars(f.cash)+'</strong></article></div><p class="small">Available to spend is the engine’s remaining discretionary cash or capital capacity, after the current plan and applicable protected reserves. It is not total cash, projected income, subsidiary money or client assets.</p>'+(!q||f.quoteError?'<p class="bad">Quote unavailable. '+esc(f.quoteError||'Resolve the quoted instruction errors below.')+'</p>':'<dl class="interface-budget-lines">'+[['Optional commitments',q.discretionaryCommitments],['Required recurring obligations',q.mandatoryObligations],['Capital-limited budget',q.capitalBudget],['Protected cash reserve',f.protection?.reserve],['Competitive action',q.action],['Research',q.research],['Recruiting',q.recruiting],['New initiatives',q.projects],['Office conversion',q.facilityConversion],['Office lifecycle work',q.facilityLifecycle],['Commercial suite construction',q.facilityExtensions],['Shared premises construction',q.sharedPremises],['Department leadership',q.departmentLeadership],['Department purchased work',q.departmentFunctions],['Training',q.training],['Advertising and sponsorship',q.advertising],['Digital platform vendor',q.digitalPlatform],['Relationship offers',q.relationshipOffers],['Application processing',q.onboarding],['Product retirement',q.productRetirement],['Execution capacity',q.capacity]].filter(([label,n])=>Number.isFinite(n)&&(n!==0||['Optional commitments','Capital-limited budget','Protected cash reserve','Execution capacity'].includes(label))).map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+(label==='Execution capacity'?value+' work units':overviewDollars(value))+'</dd></div>').join('')+'</dl>')+'</section><div class="interface-review-grid"><section class="interface-card"><h2>Planned actions <span class="interface-count">'+rows.length+'</span></h2><p class="small">Changes from the opening draft, including delegated defaults. Removing a change restores its opening value. Active commitments continue unless explicitly changed.</p>'+(rows.length?'<ol class="interface-plan-list">'+rows.map((row,index)=>'<li><div><b>'+esc(interfaceChangeTitle(v,row))+'</b><p>'+esc(row.description||(row.initiative?(row.after?'Start initiative':'Remove start instruction'):monthlyChangeValue(v,row.after,row.path)))+'</p><small>'+esc(monthlyChangeTiming(row.path))+'</small></div><div class="interface-row-actions"><button type="button" class="btn" data-interface-edit="'+index+'">Edit</button><button type="button" class="interface-text-button" data-interface-remove="'+index+'" '+(locked?'disabled':'')+'>Remove</button></div></li>').join('')+'</ol>':'<p>No changes to the opening draft.</p>')+'<p class="small" role="status">'+esc(interfaceState.message||'')+'</p></section><aside><section class="interface-card"><h2>Submission blockers</h2>'+interfaceIssueList(review.blockers,'blockers')+'</section><section class="interface-card"><h2>Warnings</h2>'+interfaceIssueList(review.warnings,'warnings')+'</section></aside></div><section class="interface-card"><h2>Ongoing commitments</h2>'+interfaceRecurringMarkup(v,q)+'<div class="interface-actions"><button type="button" class="btn" data-interface-recurring="operations">Operating forecast</button><button type="button" class="btn" data-interface-recurring="group">Group statements</button></div></section><section class="interface-card interface-submit-card"><div><h2>'+ (locked?'Your plan is locked':'Ready for the month?')+'</h2><p>Both institutions must be ready before resolution. Recall is available only while the other bank has not submitted.</p><div id="interfaceSubmitMessage"></div></div><div class="interface-actions" id="interfaceSubmitActions"></div></section>';
 if(route.workspace==='reports'){
  mount.querySelector('.interface-review-grid')?.remove();mount.querySelector('.interface-submit-card')?.remove();
  mount.insertAdjacentHTML('beforeend','<button type="button" class="btn" id="interfaceManagePlan">Manage monthly plan →</button>');
  $('#interfaceManagePlan').onclick=()=>{if(interfaceCurrent(token,false))interfaceNavigate({workspace:'review',view:'plan'});};
  mount.querySelectorAll('[data-interface-recurring]').forEach(button=>button.onclick=()=>{if(interfaceCurrent(token,false))interfaceNavigate({workspace:'reports',view:button.dataset.interfaceRecurring});});return;
 }
 interfaceMountPanel('submitMsg','interfaceSubmitMessage');interfaceMountPanel('readyBtn','interfaceSubmitActions');interfaceMountPanel('recallBtn','interfaceSubmitActions');
 $('#readyBtn').textContent='Ready for month '+v.cycle;$('#readyBtn').disabled=locked||review.blockers.length>0;$('#recallBtn').textContent='Recall plan';$('#recallBtn').classList.toggle('hidden',!v.me.submitted||v.rival.submitted||v.gameOver);
 mount.onclick=event=>{if(!interfaceCurrent(token,false))return;const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-interface-edit'))interfaceNavigate(interfaceChangeRoute(v,rows[Number(b.dataset.interfaceEdit)]));
  if(b.hasAttribute('data-interface-remove')&&interfaceCurrent(token)&&JSON.stringify(draft)===stamp){const now=currentView(),row=rows[Number(b.dataset.interfaceRemove)];if(row&&interfaceRestorePlanRow(now,row))renderReady(currentView());}
  if(b.hasAttribute('data-interface-issue')){const [kind,index]=b.dataset.interfaceIssue.split(':');interfaceNavigate(review[kind][Number(index)]);}
  if(b.hasAttribute('data-interface-recurring'))interfaceNavigate({workspace:'reports',view:b.dataset.interfaceRecurring});
 };
}
function renderInterfaceUtilities(v,mount){
 interfaceSetLocation(['Save & help']);
 mount.innerHTML='<header class="interface-workspace-heading"><div><h1>Save &amp; help</h1><p>Your campaign, connection and reference guide.</p></div></header><div class="interface-month-columns"><section class="interface-card"><h2>Campaign</h2><p>The existing local save and multiplayer rules apply. Export a backup before moving this campaign to another browser.</p><div class="interface-actions" id="interfaceSaveActions"></div></section><section class="interface-card"><h2>Player guide</h2><p>Markets manages places. Banking manages bank customers and money. People manages employees. Strategy manages direction. Financial Group manages separate businesses and company ownership.</p><p>Choose an item to work on it. Unstaged form entries stay with their editor. Add to monthly plan makes the instruction visible in Review month.</p><button type="button" class="btn" id="interfaceOpenHelp">Open reference guide</button></section></div>';
 for(const id of ['exportBtn','relinkBtn','exitBtn'])interfaceMountPanel(id,'interfaceSaveActions');
 $('#interfaceOpenHelp').onclick=()=>openGameHelp(null,$('#interfaceOpenHelp'));
}
