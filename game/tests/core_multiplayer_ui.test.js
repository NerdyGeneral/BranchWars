'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test');
const {harness}=require('./github_resilience.test');
function fresh(count=4){
 const h=harness(),query=h.c.document.querySelector;h.c.document.querySelector=selector=>{const element=query(selector);element.querySelectorAll=()=>[];element.contains=()=>false;return element;};
 h.c.document.body={classList:{add(){},remove(){}}};h.c.document.activeElement=null;h.c.localStorage.removeItem=key=>h.storage.delete(key);const sessions=new Map();h.c.sessionStorage={setItem:(key,value)=>sessions.set(key,value),getItem:key=>sessions.get(key)||null,removeItem:key=>sessions.delete(key)};
 h.run(`game=E.createGame({...E.previewCampaignEdition({},'core',{currentReporting:true,currentEconomics:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true}).options,coreMultiplayerVersion:1,coreMap:'continental',mode:'hotseat',seed:'core-ui',created:1,players:Array.from({length:${count}},(_,i)=>({name:'Bank '+(i+1),isBot:i>1,color:CORE_MULTI_COLORS[i]}))});seat=0;gh.active=false;p2pRole='';renderCoreMultiplayer(currentView());render=()=>renderCoreMultiplayer(currentView());`);return h;
}
const bytes=h=>h.run('JSON.stringify([game,draft])');
test('2–4 bank setup and all six workspaces use actual Core source without changing simulation or plans',()=>{
 for(const count of [2,3,4]){const h=fresh(count),before=bytes(h);for(const tab of ['month','markets','bank','research','plan','saves']){h.c.tabFixture=tab;h.run('coreMultiUi.tab=tabFixture;renderCoreMultiplayer(currentView());');assert.equal(bytes(h),before,tab);assert(!h.elements.get('#coreMultiplayerGame').innerHTML.includes('NaN'));}assert.equal(h.run('coreMultiBanks(currentView()).length'),count);assert.equal(h.run('Object.keys(currentView().territories).length'),24);}
});
test('continental map renders all 24 markets with owner-relative shares and all bank names',()=>{
 const h=fresh();h.run('seat=3;draft=null;renderCoreMultiplayer(currentView());mapMarkup=coreMultiMarkets(currentView());');const markup=h.run('mapMarkup');assert.equal((markup.match(/data-cm-market=/g)||[]).length,24);for(const name of ['Bank 1','Bank 2','Bank 3','Bank 4'])assert(markup.includes(name));const share=h.run('currentView().territories[draft.focus].shares[0]');assert(markup.includes('your influence '+share.toFixed(1)+' percent'));
});
test('tied market leaders use a neutral map border while sole founding leaders keep their bank color',()=>{
 const h=fresh();h.run(`mapView=currentView();mapView.territories.downtown.shares=[25,25,25,25];tiedMap=coreMultiMarkets(mapView);`);const html=h.run('tiedMap');assert.match(html,/--bank-color:#6f7f8f" data-cm-market="downtown"/);assert(html.includes('shared lead'));assert(html.includes('id="cmMarketSelect"'));assert(html.includes('Swipe or scroll the map sideways'));
 const color=h.run('coreMultiColor(coreMultiBanks(mapView)[0].color)');assert(html.includes('--bank-color:'+color+'" data-cm-market="north_haven"'));
});
test('draft edits patch the one plan, quote actual costs, and do not spend or advance the campaign',()=>{
 const h=fresh(),world=h.run('JSON.stringify(game)');h.run(`token=coreMultiToken();coreMultiUpdate(token,next=>{next.decision='b';next.hires=1;next.investments.network=1000;});review=coreMultiReview(currentView());actual=E.planBudget(currentView().me,draft,currentView());`);assert.equal(h.run('review.errors.length'),0);assert.equal(h.run('review.budget.total'),h.run('actual.total'));assert.equal(h.run('review.budget.recruiting'),h.run('actual.recruiting'));assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('draft.hires'),1);
});
test('rejected edit leaves the entire draft untouched and explains the problem',()=>{
 const h=fresh(),before=bytes(h);h.run(`token=coreMultiToken();coreMultiUpdate(token,next=>{next.hires=5;throw Error('Fixture rejected instruction');});`);assert.equal(bytes(h),before);assert.match(h.run('coreMultiUi.error'),/rejected instruction/);
});
test('read-only polling permits local form edits while a mutating room request freezes the plan',()=>{
 const h=fresh();h.run('coreMultiOnline.busy=true;token=coreMultiToken();');assert.equal(h.run('coreMultiUpdate(token,next=>{next.hires=1;})'),true);assert.equal(h.run('draft.hires'),1);h.run('coreMultiOnline.writing=true;token=coreMultiToken();');const before=bytes(h);assert.equal(h.run('coreMultiUpdate(token,next=>{next.hires=2;})'),false);assert.equal(bytes(h),before);
});
test('old snapshot, old owner, old route-render and sealed callbacks cannot change the plan',()=>{
 for(const alteration of ['coreMultiUi.revision++;','seat=1;draft=null;renderCoreMultiplayer(currentView());','game.players[0].submitted={};','view=E.publicState(game,0);game=null;view=JSON.parse(JSON.stringify(view));']){const h=fresh();h.run('token=coreMultiToken();'+alteration);const before=bytes(h);assert.equal(h.run('coreMultiUpdate(token,next=>{next.hires=1;})'),false);assert.equal(bytes(h),before);}
});
test('covered local handoff preserves separate unsubmitted drafts without exposing another owner',()=>{
 const h=fresh();h.run(`coreMultiUpdate(coreMultiToken(),next=>{next.decision='b';next.hires=1;});coreMultiHandoff(1);privacyNext();`);assert.equal(h.run('seat'),1);assert.equal(h.run('draft.hires'),0);assert.equal(h.run('draft.decision'),null);h.run('coreMultiHandoff(0);privacyNext();');assert.equal(h.run('draft.hires'),1);assert.equal(h.run('draft.decision'),'b');
});
test('returning to a sealed human bank shows its actual owner-only locked plan',()=>{
 const h=fresh();h.run(`draft.decision='b';draft.hires=1;E.submit(game,0,draft);seat=1;draft=null;renderCoreMultiplayer(currentView());`);assert.equal(h.run('currentView().me.submittedPlan'),undefined);assert.equal(h.run('draft.hires'),0);h.run('seat=0;draft=null;renderCoreMultiplayer(currentView());');assert.equal(h.run('draft.decision'),'b');assert.equal(h.run('draft.hires'),1);assert.equal(h.run('currentView().rivals.some(bank=>bank.submittedPlan||bank.allocation||bank.policies)'),false);
});
test('required choices, impossible research and unfunded permanent models are honest blockers',()=>{
 const h=fresh();assert(h.run('coreMultiReview(currentView()).errors.some(x=>x.includes("executive"))'));h.run(`draft.decision='b';draft.allocation.service--;`);assert(h.run('coreMultiReview(currentView()).errors.some(x=>x.includes("Allocate"))'));h.run(`draft.allocation.service++;draft.investments.network=-1;`);assert(h.run('coreMultiReview(currentView()).errors.some(x=>x.includes("Research"))'));h.run(`draft.investments={};draft.specializations.network=Object.keys(E.researchModelTable(currentView().me).network)[0];`);assert(h.run('coreMultiReview(currentView()).errors.some(x=>x.includes("milestone"))'));
});
test('server addresses require HTTPS or actual local IPv4/loopback addresses',()=>{
 const h=fresh();for(const address of ['https://example.test','http://127.0.0.1:8765','http://192.168.1.10:8765','http://10.0.0.1','http://172.16.0.1']){h.c.address=address;assert(h.run('coreMultiServer(address)').startsWith('http'));}
 for(const address of ['http://10.attacker.example','http://192.168.attacker.example','http://172.16.attacker.example','http://example.test','https://user:password@example.test','https://example.test/?token=value']){h.c.address=address;assert.throws(()=>h.run('coreMultiServer(address)'));}
});
test('remembered private seat survives session storage loss while invitations and game remain token-free',()=>{
 const h=fresh();h.run(`coreMultiOnline={...coreMultiOnline,base:'https://example.test',room:'ROOM1234',seat:0,token:'private-test-seat'};coreMultiPersist();sessionStorage.removeItem('branchWarsCoreRoom');savedSeat=coreMultiSavedSeat();`);assert.equal(h.run('savedSeat.token'),'private-test-seat');assert.equal(h.run('JSON.stringify(game).includes("private-test-seat")'),false);assert.equal(h.run('coreMultiInvite().includes("private-test-seat")'),false);h.run('coreMultiRemember=false;coreMultiPersist();');assert.equal(h.storage.has('branchWarsCoreRoom'),false);
});
test('scenario setup options have real names and private key recovery controls are available',()=>{
 const h=fresh();h.run('renderCoreMultiplayerSetup();');const html=h.elements.get('#coreMultiplayerSetup').innerHTML;for(const name of Object.values(h.run('E.SCENARIOS')))assert(html.includes(name));for(const id of ['cmRememberSeat','cmReconnectKeyFile','cmRoomSaveFile'])assert(html.includes('id="'+id+'"'));
});
test('concurrent room creation is gated and superseded responses preserve a reconnect key without reopening play',async()=>{
 const h=fresh();let calls=0,respond;h.c.fetch=()=>{calls++;return new Promise(resolve=>{respond=()=>resolve({ok:true,json:async()=>({room:'ROOM1234',seat:0,token:'private-test-seat',lobby:{},state:null})});});};
 h.run(`coreMultiReadSetup=()=>coreMultiCopy(coreMultiSetup);$('#cmServerUrl').value='https://example.test';$('#cmRoomCode').value='';coreMultiDownload=()=>{recoveryDownloads=(typeof recoveryDownloads==='undefined'?0:recoveryDownloads)+1;};`);
 const first=h.run('coreMultiConnect("create")'),second=h.run('coreMultiConnect("create")');await second;assert.equal(calls,1);h.run('coreMultiplayerDisconnect();');respond();await first;assert.equal(h.run('coreMultiplayerOnlineActive()'),false);assert.equal(h.run('recoveryDownloads'),1);
});
