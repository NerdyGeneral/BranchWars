'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,'src',file),'utf8'),source=read('ui/game-help.js'),page=read('page.html');
function harness(features={}){
 const elements=new Map(),routes=[],groups=[];let views=0;
 function $(id){if(!elements.has(id))elements.set(id,{id,events:{},value:'',innerHTML:'',textContent:'',open:false,isConnected:true,focuses:0,selects:0,scrollTop:3,
  addEventListener(key,fn){(this.events[key]||=[]).push(fn)},focus(){this.focuses++;c.document.activeElement=this},getClientRects(){return [{}]},select(){this.selects++},showModal(){this.open=true},close(){this.open=false;this.events.close?.forEach(fn=>fn())}});return elements.get(id);}
 const view={cycle:7,me:{id:'owner',...features}};
 Object.defineProperty(view,'rival',{get(){throw Error('Help must not read rival information')}});
 const c={game:null,view,seat:0,draftOwner:'owner',lastCycle:7,featureConnectionGeneration:4,workspaceTab:'overview',productDeskView:'development',document:{activeElement:$('#gameHelpOpen')},$,currentView(){views++;return c.view},esc:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),navigateBankOverview(topic){routes.push(topic.id)},setFinancialGroupDesk(id){groups.push(id)}};
 vm.createContext(c);vm.runInContext(source,c);const run=code=>vm.runInContext(code,c),event=(id,type,data={})=>$(id).events[type].forEach(fn=>fn(data));
 run('reconcileGameHelp()');return {c,run,$,routes,groups,event,views:()=>views};
}
const all={workforce:{},departmentFunctions:{},departmentOffice:{},productPrograms:{version:2},advertising:{},relationshipOffers:{},onboarding:{},householdBook:{},creditPerformance:{},facilityNetwork:{},facilityLifecycle:{},serviceDesk:{},financialGroup:{},agency:{}};
let checks=0;const test=(name,fn)=>{try{fn();checks++;}catch(error){throw Error(name+': '+error.stack)}};
test('catalog, markup and canonical feature filtering',()=>{
 const h=harness(all),n=h.run('GAME_HELP_TOPICS.length');assert(n>=30);
 assert.equal(h.run('new Set(GAME_HELP_TOPICS.map(x=>x.id)).size'),n);
 assert(h.run('GAME_HELP_TOPICS.every(x=>gameHelpAvailable(x,gameHelpProfile(view)))'));
 assert(h.run('GAME_HELP_TOPICS.every(x=>searchGameHelp(x.id,gameHelpProfile(view),\'overview\').some(result=>result.topic.id===x.id))'),'system identifiers must be searchable even when the explanatory title uses plain language');
 for(const id of ['gameHelp','gameHelpOpen','gameHelpClose','gameHelpSearch','gameHelpCount','gameHelpResults'])assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert.match(page,/<dialog id="gameHelp"[^>]*aria-labelledby="gameHelpTitle"/);
 assert.match(page,/id="gameHelpSearch"[^>]*maxlength="200"/);
 for(const topic of h.run('GAME_HELP_TOPICS')){
  if(!topic.requires?.length)continue;
  for(const key of topic.requires){
   const x=harness({...all,[key]:undefined});assert.equal(x.run(`gameHelpAvailable(GAME_HELP_TOPICS.find(x=>x.id===${JSON.stringify(topic.id)}),gameHelpProfile(view))`),false);
  }
 }
 for(const version of [undefined,0,1,3]){const x=harness({...all,productPrograms:{version}});assert.equal(x.run("gameHelpAvailable(GAME_HELP_TOPICS.find(x=>x.id==='pricing'),gameHelpProfile(view))"),false)}
});
test('search is bounded, multiword, case insensitive and contextual',()=>{
 const h=harness(all);h.run('openGameHelp()');
 h.$('#gameHelpSearch').value='  STAFF  capacity ';h.event('#gameHelpSearch','input');assert.match(h.$('#gameHelpResults').innerHTML,/People: employees/);
 h.$('#gameHelpSearch').value='<img onerror=attack>';h.event('#gameHelpSearch','input');assert(!h.$('#gameHelpResults').innerHTML.includes('<img'));assert.match(h.$('#gameHelpResults').innerHTML,/No matching topics/);
 assert.equal(h.run("searchGameHelp('',gameHelpProfile(view),'workforce')[0].topic.tab"),'workforce');
 assert.equal(h.run("searchGameHelp('z'.repeat(200)+' staff',gameHelpProfile(view),'overview').length"),0);
});
test('search does not rebuild or retain public books or quote plans',()=>{
 const h=harness(all);h.run('openGameHelp()');assert.equal(h.views(),1);
 h.c.currentView=()=>{throw Error('Per-keystroke publicState is forbidden')};
 const started=performance.now();for(let i=0;i<1000;i++){h.$('#gameHelpSearch').value=i%2?'staff':'funding';h.event('#gameHelpSearch','input')}
 const elapsed=performance.now()-started;assert.equal(h.views(),1);
 assert.deepEqual(Array.from(h.run('Object.keys(gameHelpSession.profile).sort()')),['features','productPricingVersion']);
 assert(h.run('Object.values(gameHelpSession.profile.features).every(x=>typeof x===\'boolean\')'));
 console.log('Help search microbenchmark: '+elapsed.toFixed(1)+' ms / 1000 static searches and HTML renders; not browser/campaign frame timing.');
});
test('disabled previews never navigate or create dummy state',()=>{
 const h=harness(),before=JSON.stringify(h.c.view);h.run("openGameHelp('onboarding')");
 assert.match(h.$('#gameHelpResults').innerHTML,/Not enabled in this campaign version/);
 assert.match(h.$('#gameHelpResults').innerHTML,/data-help-open="onboarding" disabled/);
 assert.equal(h.run("navigateGameHelp('onboarding')"),false);assert.equal(h.routes.length,0);assert.equal(JSON.stringify(h.c.view),before);
});
test('native close and Escape restore focus, bindings do not multiply',()=>{
 const h=harness(all);for(let i=0;i<6;i++)h.run('reconcileGameHelp()');
 for(const [id,event]of [['#gameHelpOpen','click'],['#gameHelpSearch','input'],['#gameHelpResults','click'],['#gameScreen','click']])assert.equal(h.$(id).events[event].length,1);
 h.event('#gameHelpOpen','click',{currentTarget:h.$('#gameHelpOpen')});assert(h.$('#gameHelp').open);assert.equal(h.$('#gameHelpSearch').selects,1);
 let prevented=false;h.event('#gameHelp','cancel',{preventDefault(){prevented=true}});assert(prevented);assert(!h.$('#gameHelp').open);assert.equal(h.$('#gameHelpOpen').focuses,1);
 h.run('openGameHelp()');h.event('#gameHelpClose','click');assert.equal(h.run('gameHelpSession'),null);assert.equal(h.$('#gameHelpOpen').focuses,2);
 h.run("openGameHelp('coverage')");let stopped=false;h.event('#gameHelp','keydown',{key:'Escape',preventDefault(){prevented=true},stopPropagation(){stopped=true}});assert(stopped);assert(!h.$('#gameHelp').open);assert.equal(h.$('#gameHelpOpen').focuses,3);
 h.run("openGameHelp('coverage')");const first=h.$('#gameHelpClose'),last=h.$('#mock-last-topic');h.$('#gameHelp').querySelectorAll=()=>[first,h.$('#gameHelpSearch'),last];
 first.focus();h.event('#gameHelp','keydown',{key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(h.c.document.activeElement,last);
 h.event('#gameHelp','keydown',{key:'Tab',shiftKey:false,preventDefault(){}});assert.equal(h.c.document.activeElement,first);
});
test('navigation routes existing product and group desks without staging',()=>{
 const h=harness(all),before=JSON.stringify(h.c.view);
 h.run("openGameHelp('onboarding');navigateGameHelp('onboarding')");assert.equal(h.c.productDeskView,'onboarding');assert.deepEqual(h.routes,['onboarding']);assert(!h.$('#gameHelp').open);
 h.run("openGameHelp('agency');navigateGameHelp('agency')");assert.deepEqual(h.groups,['agency']);assert.equal(JSON.stringify(h.c.view),before);
 const button={dataset:{helpTopic:'coverage'}};h.event('#gameScreen','click',{target:{closest:()=>button}});assert.equal(h.$('#gameHelpSearch').value,'People: employees versus work coverage');
 h.event('#gameHelpResults','click',{target:{closest:()=>({dataset:{helpOpen:'coverage'},disabled:false})}});assert.equal(h.routes.at(-1),'coverage');
});
test('stale owners, months, connections and snapshots cannot navigate or restore stale focus',()=>{
 for(const change of ["draftOwner='other'","lastCycle++","seat=1","featureConnectionGeneration++","view={...view}"]){
  const h=harness(all);h.run('openGameHelp()');h.run(change);assert.equal(h.run("navigateGameHelp('funds')"),false);assert(!h.$('#gameHelp').open);assert.equal(h.routes.length,0);assert.equal(h.$('#gameHelpOpen').focuses,0);
 }
 const h=harness(all);h.run('openGameHelp();lastCycle++;reconcileGameHelp()');assert(!h.$('#gameHelp').open);
 assert.match(read('ui/state.js'),/id!=='#gameScreen'&&typeof closeGameHelp/);
 assert.match(read('ui/results.js'),/function openGameOverlay\(id,buttonId\)\s*\{\s*if\(typeof closeGameHelp==='function'\)closeGameHelp\(false\)/);
});
test('actual supported campaign profiles and navigation preserve drafts and books',()=>{
 if(!process.argv.includes('--source'))process.argv.push('--source');
 const {harness:full}=require('./github_resilience.test.js');
 for(const version of [0,1,2,3,4,5,6,7]){
  const h=full();h.run(`game=E.createGame({...${version?`E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options`:'{}'},mode:'hotseat',seed:'help',created:1});seat=0;newDraft(currentView());`);
  const before=h.run('JSON.stringify({game,draft})');
  h.run('const helpProfile=gameHelpProfile(currentView());');
  assert(h.run("gameHelpAvailable(GAME_HELP_TOPICS.find(x=>x.id==='planning'),helpProfile)"));
  // Use actual production navigation and painters, not fake economic actions.
  h.run("productDeskView='onboarding';for(const topic of GAME_HELP_TOPICS.filter(x=>['coverage','training','recruitment','advertising','onboarding','products'].includes(x.id)&&gameHelpAvailable(x,helpProfile))){if(topic.productDesk)productDeskView=topic.productDesk;navigateBankOverview(topic);}");
  assert.equal(h.run('JSON.stringify({game,draft})'),before,'help destinations may not write engine state or orders');
 }
});
console.log('Usability help passed: '+checks+' groups; canonical availability, search purity, context routing, keyboard close/focus, disabled previews, stale callbacks and owner privacy.');
