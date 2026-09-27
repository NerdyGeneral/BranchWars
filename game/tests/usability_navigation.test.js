'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,'src',file),'utf8');
const page=read('page.html'),navigation=read('ui/workspace-navigation.js'),draftSource=read('ui/draft.js');
const names=['overview','credit','group','markets','customers','products','operations','workforce','strategy','competition','intelligence'];
function node(dataset={}){
 const classes=new Set(),attributes={},events={};
 return {dataset,attributes,events,hidden:false,tabIndex:0,focuses:0,style:{},scrolls:[],offsetHeight:100,scrollIntoView(options){this.scrolls.push(options)},
  classList:{toggle(key,on){on?classes.add(key):classes.delete(key)},contains:key=>classes.has(key)},
  setAttribute(key,value){attributes[key]=value},addEventListener(key,fn){(events[key]||=[]).push(fn)},focus(){this.focuses++}};
}
function harness(features={}){
 const tabs=names.map(workspaceTab=>node({workspaceTab})),groups=['bank','customers','operate','grow'].map(workspaceGroup=>node({workspaceGroup})),panels=names.map(workspace=>node({workspace}));
 const mounts={'#workspaceGroups':node(),'#workspaceTabs':node(),'#gameScreen':node(),'.workspace-nav':node(),'.game-layout':node()};
 for(const panel of panels)mounts['[data-workspace="'+panel.dataset.workspace+'"].active']=panel;
 const plan=Object.freeze({decision:'a',hires:2}),v={me:{id:'owner',...features},cycle:4};
 const c={view:v,game:null,draft:plan,draftOwner:'owner',lastCycle:4,seat:0,workspaceTab:'overview',reconcileOperationsWorkspace(){},requestAnimationFrame(fn){fn()},window:{innerWidth:1265,matchMedia:()=>({matches:true})},
  renderMarketInspector(){},renderFacilityNetwork(){},renderProductPrograms(){},renderCollections(){},renderFinancialGroup(){},renderHouseholds(){},renderWorkforce(){},
  $:key=>mounts[key]||null,$$:key=>({'[data-workspace-tab]':tabs,'[data-workspace-group]':groups,'[data-workspace]':panels}[key]||[])};
 vm.createContext(c);vm.runInContext(draftSource+'\n'+navigation,c);
 const run=code=>vm.runInContext(code,c),go=tab=>run(`setWorkspaceTab(${JSON.stringify(tab)})`),select=id=>run(`selectWorkspaceGroup(${JSON.stringify(id)})`),refresh=()=>run('reconcileWorkspaceNavigation()');
 const shown=()=>tabs.filter(x=>!x.hidden).map(x=>x.dataset.workspaceTab);
 refresh();return {c,run,go,select,refresh,shown,tabs,groups,mounts,panels,plan};
}
// The retained Core/optional-feature navigation keeps one copy of its fallback
// mounts. Expanded's six-home router is tested separately below.
for(const tab of names)assert.equal((page.match(new RegExp('data-workspace-tab="'+tab+'"','g'))||[]).length,1);
const nav=page.slice(page.indexOf('<nav class="panel workspace-nav"'),page.indexOf('</nav>',page.indexOf('<nav class="panel workspace-nav"')));
assert(!nav.includes('id="planBudget"'));
assert.equal((page.match(/id="planBudget"/g)||[]).length,1);
// The contextual return bar owns its own markup; navigation must still leave
// every existing business form mounted rather than rebuilding those controls.
const returnBarRenderer=navigation.slice(navigation.indexOf('function renderBankingContext('),navigation.indexOf('function returnBankingContext('));
assert(returnBarRenderer.includes("const mount=$('#bankingContextBar')"),'return markup belongs only to its dedicated navigation mount');
assert(!navigation.replace(returnBarRenderer,'').includes('innerHTML'),'navigation retains every existing form mount');
for(const stylesheet of ['styles/collections.css','styles/product-programs.css'])assert(!/workspace-nav[^{}]*\{position:static/.test(read(stylesheet)),'optional-feature styles must not disable compact navigation');
const all={creditPerformance:{},financialGroup:{},householdBook:{},productPrograms:{},workforce:{}};
const h=harness(all),before=JSON.stringify(h.c.view);
assert.deepEqual(h.shown(),['overview','credit','group']);
for(const [group,expected]of Object.entries({customers:['markets','customers','products'],operate:['operations','workforce'],grow:['strategy','competition','intelligence']})){
 h.select(group);assert.deepEqual(h.shown(),expected);
 assert.equal(h.groups.filter(x=>x.attributes['aria-pressed']==='true').length,1);
 assert.equal(h.tabs.filter(x=>!x.hidden&&x.tabIndex===0).length,1);
 assert.equal(h.panels.filter(x=>x.classList.contains('active')).length,1);
}
h.go('workforce');h.select('customers');h.select('operate');assert.equal(h.c.workspaceTab,'workforce','return to last visited desk in group');
h.go('products');assert.equal(h.groups.find(x=>x.attributes['aria-pressed']==='true').dataset.workspaceGroup,'customers','contextual links select their parent group');
assert.equal(h.c.draft,h.plan);assert.equal(JSON.stringify(h.c.view),before,'navigation changes no public state');
 const perf=harness(all);perf.run('let navigationViewCalls=0;const actualCurrentView=currentView;currentView=function(){navigationViewCalls++;return actualCurrentView()};');
 for(const tab of names){perf.run('navigationViewCalls=0');perf.go(tab);assert.equal(perf.run('navigationViewCalls'),1,'one synchronous view per main-tab navigation, excluding business painters');}
 perf.run('navigationViewCalls=0');perf.select('grow');assert.equal(perf.run('navigationViewCalls'),1,'group selection and delayed scroll share one navigation view');
h.refresh();h.refresh();
 h.run('focusWorkspaceTarget($(\'.game-layout\'))');assert.equal(h.mounts['.game-layout'].style.scrollMarginTop,'116px');assert.equal(h.mounts['.game-layout'].scrolls.at(-1).block,'start','context headings clear sticky navigation');
for(const button of h.groups)assert.equal(button.events.click.length,1);
for(const button of [...h.tabs,...h.groups])assert.equal(button.events.keydown.length,1);
let prevented=0;
const key=(button,key)=>button.events.keydown[0]({key,preventDefault(){prevented++}});
key(h.tabs.find(x=>x.dataset.workspaceTab==='products'),'ArrowRight');assert.equal(h.c.workspaceTab,'markets');
key(h.tabs.find(x=>x.dataset.workspaceTab==='markets'),'End');assert.equal(h.c.workspaceTab,'products');
key(h.tabs.find(x=>x.dataset.workspaceTab==='products'),'Home');assert.equal(h.c.workspaceTab,'markets');
const current=h.c.workspaceTab;key(h.groups[0],'ArrowLeft');assert.equal(h.groups[3].focuses,1);assert.equal(h.c.workspaceTab,current,'group arrow movement focuses without activating');
h.groups[3].events.click[0]();assert.equal(h.c.workspaceTab,'strategy');assert.equal(prevented,4);
assert.equal(h.mounts['.game-layout'].scrolls.at(-1).behavior,'auto','reduced motion honored');
assert.equal(h.mounts['.game-layout'].style.scrollMarginTop,'120px','content clears sticky navigation');
const core=harness();assert(core.mounts['#workspaceGroups'].hidden);assert.deepEqual(core.shown(),['overview','markets','operations','strategy','competition','intelligence']);
const callbacks=[];h.c.requestAnimationFrame=fn=>callbacks.push(fn);h.select('operate');h.go('overview');
const operations=h.panels.find(x=>x.dataset.workspace==='operations'),scrollCount=operations.scrolls.length;
callbacks.forEach(fn=>fn());assert.equal(operations.scrolls.length,scrollCount,'delayed group scroll cannot drag a later selection back');
h.go('workforce');h.c.view={me:{id:'other',...all},cycle:4};h.go('overview');h.select('operate');assert.equal(h.c.workspaceTab,'operations','hotseat owner starts with first task instead of prior owner preference');
// Every optional-feature combination, including neither early nor late previews.
const optional=Object.keys(all);
for(let bits=0;bits<32;bits++){
 const features=Object.fromEntries(optional.filter((_,i)=>bits&(1<<i)).map(x=>[x,{}])),x=harness(features);
 for(const group of ['bank','customers','operate','grow']){
  x.select(group);assert(x.shown().length>=1&&x.shown().length<=(Object.keys(features).length===0?6:3));
  for(const [tab,feature]of Object.entries({credit:'creditPerformance',group:'financialGroup',customers:'householdBook',products:'productPrograms',workforce:'workforce'}))if(!features[feature])assert(!x.shown().includes(tab));
 }
 x.go('credit');assert.equal(x.c.workspaceTab,features.creditPerformance?'credit':'overview','unsupported deep link falls back safely');
}
// Load the actual new router into an isolated navigation-only fixture. Its
// renderer is replaced here because this fixture deliberately has no page DOM;
// new domain tests and the browser checks cover real renderers separately.
const expanded=harness(all),identity={};Object.assign(expanded.c,{presentationCampaignIdentity:()=>identity,connectionAttempt:0,featureConnectionGeneration:0,linkSession:'',gh:{},lan:{},document:{activeElement:null}});
vm.runInContext(read('ui/interface-shell.js'),expanded.c);expanded.run('renderExpandedInterface=function(v){interfaceIdentity(v)}');
assert.deepEqual(JSON.parse(expanded.run('JSON.stringify(INTERFACE_WORKSPACES.map(x=>x[0]))')),['month','markets','banking','people','strategy','group']);
const originalPlan=expanded.c.draft,originalView=JSON.stringify(expanded.c.view);
for(const [legacy,workspace]of [['overview','month'],['markets','markets'],['products','banking'],['credit','banking'],['customers','banking'],['workforce','people'],['strategy','strategy'],['group','group'],['intelligence','reports']]){expanded.go(legacy);assert.equal(expanded.run('interfaceCurrentRoute().workspace'),workspace);}
expanded.run("openInterfaceWorkspace('markets','staff',{office:'owner:office:1',market:'downtown'});interfaceNavigate({workspace:'people',view:'staff'})");assert.equal(expanded.run('interfaceState.trail.length'),1);assert(expanded.run('interfaceReturn()'));assert.equal(expanded.run('interfaceCurrentRoute().context.office'),'owner:office:1');
assert.equal(expanded.c.draft,originalPlan);assert.equal(JSON.stringify(expanded.c.view),originalView);
expanded.c.view={...expanded.c.view,me:{...all,id:'other'}};expanded.c.draftOwner='other';expanded.run('interfaceIdentity(currentView())');assert.equal(expanded.run('interfaceCurrentRoute().workspace'),'month');assert.equal(expanded.run('interfaceState.trail.length'),0);
console.log('Usability navigation passed: Core fallback keyboard/ARIA, 32 feature combinations and one projection; Expanded six canonical homes, legacy routes, private contextual Return and immutable draft/view. Browser layout acceptance remains separate.');
