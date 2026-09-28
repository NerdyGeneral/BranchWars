// Expanded 9.41 Strategy → Research. One page per research family draws its six
// nodes as a tree beside the selected node's funding, so choosing a node never
// leaves the page. Combined research and the stacked-effects summary are their
// own pages in the same list. Presentation only: funding stages
// draft.nodeFunding through the engine's own validation and quote.
const RT_SLOT_LABEL={F:'Foundation',A1:'Path A · first',A2:'Path A · second',B1:'Path B · first',B2:'Path B · second',X:'Capstone'};
function researchTreeActive(v){return v?.researchTreeVersion===1&&!!v.researchTreeRules&&!!v.me?.researchTree;}
function rtStaged(v,family){const nodes=v.researchTreeRules.nodes;return Object.keys(draft?.nodeFunding||{}).find(k=>nodes[k]?.family===family)||null;}
function rtNodeState(v,key){
 const T=E.ResearchTree,d=v.researchTreeRules.nodes[key],row=v.me.researchTree.nodes[key],staged=draft?.nodeFunding?.[key]||0;
 if(row.completed)return {state:'learned',label:'Learned month '+row.completed};
 const why=T.issue(v.me,key);
 if(why)return {state:'locked',label:'Locked',why};
 if(staged)return {state:'staged',label:ipsMoney(staged)+' staged'+(row.funded?' · '+ipsMoney(row.funded)+' paid':'')};
 if(row.funded)return {state:'progress',label:ipsMoney(row.funded)+' of '+ipsMoney(d.cost)+' paid'};
 return {state:'open',label:ipsMoney(d.cost)+' · ready'};
}
function rtRequires(v,key){
 const rules=v.researchTreeRules,r=rules.nodes[key].requires,name=k=>rules.nodes[k].name+(E.ResearchTree.has(v.me,k)?' ✓':'');
 if(!r.all.length&&!r.any.length)return 'None · this is the family’s foundation';
 return [r.all.map(name).join(' and '),r.any.length?'either '+r.any.map(name).join(' or '):''].filter(Boolean).join(', and ');
}
function researchTreeItems(v){
 const T=E.ResearchTree,rules=v.researchTreeRules,items=[{heading:'Research families'}];
 for(const [family,d] of Object.entries(rules.families)){
  const staged=rtStaged(v,family);
  items.push({key:'family:'+family,name:d.name,detail:'Level '+T.level(v.me,family)+' of 4 · '+T.learned(v.me,family)+' of 6 learned'+(staged?' · '+ipsMoney(draft.nodeFunding[staged])+' staged':'')});
 }
 items.push({heading:'Across families'},
  {key:'view:combinations',name:'Combined research',detail:T.combinations(v.me).length+' of '+Object.keys(rules.combinations).length+' active'},
  {key:'view:effects',name:'Stacked effects',detail:T.sources(v.me).length+' active sources'});
 return items;
}
// Links may name a family ({branch}), a node ({node}) or an item ({research});
// the 9.40 list keys (branch:x, node:x) still resolve for saved routes.
function researchTreeSelection(v,context={}){
 const rules=v.researchTreeRules,items=researchTreeItems(v),keys=items.filter(x=>x.key).map(x=>x.key);
 let wanted=context.research||null,node=rules.nodes[context.node]?context.node:null;
 if(wanted?.startsWith('node:')&&rules.nodes[wanted.slice(5)]){node=wanted.slice(5);wanted=null;}
 if(wanted==='branch:combinations')wanted='view:combinations';else if(wanted?.startsWith('branch:'))wanted='family:'+wanted.slice(7);
 wanted=wanted||(node?'family:'+rules.nodes[node].family:context.branch?'family:'+context.branch:null);
 return {items,selected:keys.includes(wanted)?wanted:keys[0],node};
}
function renderResearchTree(v,route,mount){
 const {items,selected,node}=researchTreeSelection(v,route.context),[kind,key]=selected.split(':');
 // A link that names an item opens it directly, on phones too.
 const named=route.context?.research||route.context?.branch||route.context?.node;
 ipsSplit(v,{...route,context:{...route.context,research:named?selected:undefined}},mount,items,selected,'research');
 if(kind==='view'&&key==='combinations')return researchTreeCombinations(v,mount);
 if(kind==='view')return researchTreeEffects(v,mount);
 return researchTreeFamily(v,route,mount,key,node);
}
function researchTreeFamily(v,route,mount,family,wanted){
 const T=E.ResearchTree,rules=v.researchTreeRules,f=rules.families[family],keys=T.SLOTS.map(s=>T.bySlot(family,s)),token=ipsToken(v);
 const node=keys.includes(wanted)?wanted:rtStaged(v,family)||keys.find(k=>!T.has(v.me,k)&&!T.issue(v.me,k))||keys.find(k=>!T.has(v.me,k))||keys[0];
 const d=rules.nodes[node],q=T.quote(v,v.me,draft,node),level=T.level(v.me,family),learned=T.learned(v.me,family),staged=rtStaged(v,family);
 const button=key=>{const n=rules.nodes[key],s=rtNodeState(v,key);return '<button type="button" class="rt-node rt-'+s.state+(key===node?' selected':'')+'" data-rt-node="'+esc(key)+'" aria-pressed="'+(key===node)+'"'+(s.why?' title="'+esc(s.why)+'"':'')+'><small>'+esc(RT_SLOT_LABEL[n.slot])+'</small><b>'+esc(n.name)+'</b><span>'+esc(n.text)+'</span><em>'+esc(s.label)+'</em></button>';};
 const path=(p,a,b)=>'<div class="rt-path"><h4>Path '+p+' · '+esc(f.paths[p])+'</h4>'+button(T.bySlot(family,a))+'<span class="rt-link" aria-hidden="true"></span>'+button(T.bySlot(family,b))+'</div>';
 const tree='<div class="rt-tree" role="group" aria-label="'+esc(f.name)+' research tree">'+button(keys[0])+'<span class="rt-link" aria-hidden="true"></span><div class="rt-paths">'+path('A','A1','A2')+path('B','B1','B2')+'</div><span class="rt-link" aria-hidden="true"></span>'+button(T.bySlot(family,'X'))+'<p class="micro">The capstone needs the second node of either path.</p></div>';
 const nextLevel=q.completed?level:d.slot==='X'?4:Math.min(3,learned+1),combos=Object.values(rules.combinations).filter(c=>c.requires.includes(node));
 const model=v.me.specializations?.[family],planned=draft.specializations?.[family],models=rules.models[family];
 const status=q.completed?'<p class="notice">Learned at the end of month '+q.completed+'. Its effect has applied since month '+(q.completed+1)+'.</p>':q.reason?'<p class="notice warn">'+esc(q.reason)+'</p>':'';
 const learnedNode=!!q.completed,locked=!learnedNode&&!!T.issue(v.me,node);
 const form=ipsForm(v,'tree-'+node,{amount:draft.nodeFunding?.[node]||0});
 const detail='<section class="rt-detail" aria-label="Selected research"><span class="interface-eyebrow">'+esc(RT_SLOT_LABEL[d.slot])+'</span><h3>'+esc(d.name)+'</h3><p>'+esc(d.text)+'</p>'+
  '<dl class="rt-facts">'+[['Cost',ipsMoney(d.cost)],['Paid',ipsMoney(q.funded)],['Remaining',ipsMoney(d.cost-q.funded)],['Months at the cap',learnedNode?'Done':String(q.minimumMonths)]].map(([k,x])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(x)+'</dd></div>').join('')+'</dl>'+
  '<p><b>Needs:</b> '+esc(rtRequires(v,node))+'.</p>'+(learnedNode?'':'<p>Learning it '+(nextLevel>level?'raises '+esc(f.name)+' to level '+nextLevel+'.':'keeps '+esc(f.name)+' at level '+level+' (level 3 is the most without the capstone).')+'</p>')+
  (combos.length?'<p><b>Part of:</b> '+combos.map(c=>esc(c.name)).join(', ')+'.</p>':'')+status+
  (learnedNode||locked?'':ipsField(form,'amount','Funding this month ($)',{max:rules.cap,help:'At most '+ipsMoney(rules.cap)+' a month, at least $1,000 (or the final remainder). Zero removes it. One node per family each month.'})+'<div class="ips-actions"><button type="button" class="btn" id="rtStageMax">Stage '+ipsMoney(q.maximum)+'</button></div>')+'</section>';
 const body='<span class="interface-eyebrow">Research family</span><h2>'+esc(f.name)+'</h2><p>'+esc(f.promise)+'</p>'+
  ipsFacts([['Family level',level+' of 4'],['Nodes learned',learned+' of 6'],['Paid research',ipsMoney(T.spent(v.me,family))],['Staged this month',staged?ipsMoney(draft.nodeFunding[staged]):'None']])+
  '<div class="rt-layout">'+tree+detail+'</div>'+
  '<h3>What each level gives</h3><p>'+esc(rules.levels[family])+'</p>'+
  '<h3>Operating model</h3><p>'+(model?'Adopted: <b>'+esc(models[model]?.name||model)+'</b>. Models are permanent.':planned?'Planned: <b>'+esc(models[planned]?.name||planned)+'</b>. It becomes permanent when the month resolves'+(level<1?', once the foundation is learned':'')+'.':'Not chosen. Choose one of three once the foundation is learned.')+'</p>'+ipsRouteButton(model?'View operating models':'Compare operating models','strategy','models',{branch:family})+
  '<p class="micro">Research is paid when the month resolves and applies from the following month. Effects of the same kind multiply, so everything learned stacks.</p>';
 const candidate=(now,amount)=>{const next=ipsCopy(draft);next.nodeFunding={...(next.nodeFunding||{})};if(amount)next.nodeFunding[node]=amount;else delete next.nodeFunding[node];E.ResearchTree.validatePlan(now.me,next);const live=E.ResearchTree.quote(now,now.me,next,node);if(amount>live.maximum)throw Error('Protected cash, the monthly cap and the remaining cost allow at most '+ipsMoney(live.maximum)+'.');return next;};
 let inspector;
 if(learnedNode||locked){inspector=mount.querySelector?.('.ips-inspector')||mount;inspector.innerHTML=body;}
 else inspector=ipsEditor(v,route,mount,'tree-'+node,form,body,(now,values)=>candidate(now,ipsNumber(values.amount,'Research funding',{max:rules.cap})),(now,next)=>'<p>'+ipsMoney(next.nodeFunding?.[node]||0)+' for '+esc(d.name)+' is paid when the month resolves. No benefit until the node is fully paid.</p>');
 for(const b of inspector.querySelectorAll?.('[data-rt-node]')||[])b.addEventListener('click',()=>{if(!ipsCurrent(token,false))return;const key=b.dataset.rtNode;openInterfaceWorkspace('strategy','research',{...route.context,research:'family:'+family,node:key});$('[data-rt-node="'+key+'"]')?.focus?.({preventScroll:true});});
 const max=inspector.querySelector?.('#rtStageMax');
 if(max){max.disabled=q.maximum<=0||!ipsCurrent(token);max.title=q.reason||'Stage the most that fits this month';
  max.addEventListener('click',()=>{if(!ipsCurrent(token))return;try{const now=currentView(),live=E.ResearchTree.quote(now,now.me,draft,node);if(live.maximum<=0)throw Error(live.reason||'No funding fits the current protected budget.');draft=candidate(now,live.maximum);ipsQuoteBudget(now,draft);delete ipsScope(now).forms['tree-'+node];renderReady(now);$('#rtStageMax')?.focus?.({preventScroll:true});}catch(e){form.notice=e.message;const n=$('#ipsNotice');if(n)n.textContent=e.message;}});}
}
function researchTreeCombinations(v,mount){
 const T=E.ResearchTree,rules=v.researchTreeRules,node=k=>rules.nodes[k].name+' ('+rules.families[rules.nodes[k].family].name+')'+(T.has(v.me,k)?' ✓':'');
 ipsRead(mount,'Combined research','<p>Each combination turns on by itself once both of its nodes are learned, in addition to what those nodes give. There is nothing extra to buy.</p>'+
  Object.entries(rules.combinations).map(([key,c])=>'<article class="ips-profile-list rt-combo'+(T.combination(v.me,key)?' active':'')+'"><h3>'+esc(c.name)+' · '+(T.combination(v.me,key)?'Active':'Not active')+'</h3><p>'+esc(c.text)+'</p><p class="micro">Needs '+c.requires.map(k=>esc(node(k))).join(' + ')+'</p></article>').join(''));
}
// Every active source, grouped by what it changes, with the combined result.
function researchTreeEffects(v,mount){
 const T=E.ResearchTree,rules=v.researchTreeRules,sources=T.sources(v.me),terms=Object.keys(rules.terms).filter(t=>sources.some(s=>s.effects[t]!==undefined));
 const total=t=>{const x=T.effect(v.me,t);if(rules.additive.includes(t))return (x>0?'+':'')+(Math.round(x*10)/10)+(t==='execution'||t==='acquisitionWork'?'':'/month');const pct=Math.round((x-1)*1000)/10;return (pct>0?'+':'')+pct+'%';};
 const one=(t,x)=>rules.additive.includes(t)?(x>0?'+':'')+x:((x>1?'+':'')+Math.round((x-1)*1000)/10+'%');
 const levels=Object.entries(rules.families).map(([k,f])=>[f.name,T.level(v.me,k)+' of 4',rules.levels[k]]);
 ipsRead(mount,'Stacked effects','<p>Each row is one thing research changes. Every source on a row applies: percentages multiply and monthly drifts add, so nothing learned is wasted.</p>'+
  (terms.length?ipsTable(['Effect','Combined','Sources'],terms.map(t=>[rules.terms[t],total(t),sources.filter(s=>s.effects[t]!==undefined).map(s=>s.name+' '+one(t,s.effects[t])).join(' · ')])):'<p class="notice">No node, combination or model effects yet. Learn a foundation to start.</p>')+
  '<h3>Family levels</h3><p>Levels also drive the long-standing capability effects below, in addition to the rows above.</p>'+ipsTable(['Family','Level','Each level gives'],levels));
}
