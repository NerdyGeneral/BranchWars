'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,context={};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
const E=context.BWEngine,A=E.BankAnnouncements,copy=x=>JSON.parse(JSON.stringify(x));
const CURRENT={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true};
const options=edition=>({...edition?E.previewCampaignEdition({},edition,CURRENT).options:{},mode:'hotseat',seed:'cosmetic-announcements',created:1,name1:'Penny Bank',name2:'Cents Bank',startingWorkforce:'covered'});
const message=(audience='public',text='Our interest in you is compounded. 🪙')=>({audience,text});
function withoutAnnouncements(g){
 const next=copy(g),rows=next.announcements||[],lines=rows.map(row=>A.format(next.players.find(p=>p.id===row.bankId),{audience:row.audience,text:row.text}));
 delete next.announcements;
 for(const p of next.players)if(p.submitted)delete p.submitted.announcement;
 for(const plan of Object.values(next.lastPlans||{}))delete plan.announcement;
 next.resolution=next.resolution.slice(lines.length);
 for(const log of next.log)if(log.kind==='RESOLUTION'&&log.cycle===rows[0]?.cycle){const prefix='CYCLE '+log.cycle+' // ';assert(log.text.startsWith(prefix+lines.join(' ')+' '));log.text=prefix+log.text.slice((prefix+lines.join(' ')+' ').length);}
 return next;
}

test('plain text is exact, Unicode bounds agree, and malformed messages are refused',()=>{
 const raw=message('shareholders','  "A <bank> & a joke" 🏦\nNo dividends of laughter withheld.  ');
 assert.deepEqual(copy(A.validate(raw)),raw);assert.equal(A.length('🏦'.repeat(240)),240);assert.equal(A.validate(message('public','🏦'.repeat(240))).text.length,480);
 for(const bad of [null,{},'hello',message('rival'),message('public',''),message('public','   '),message('public','🏦'.repeat(241)),message('public','bad\0text'),message('public','bad\u202Etext'),message('public','\ud800'),{...message(),bankId:'spoof'}])assert.throws(()=>A.validate(bad));
 assert.equal(A.validate(undefined),null);
});

for(const edition of ['core','expanded',null])test((edition||'legacy')+': actual resolution keeps economics/RNG exact, private drafts restore, and publication is once',()=>{
 const original=E.migrateCampaign(copy(E.createGame(options(edition))));assert.equal(original.announcements,undefined);
 const plans=original.players.map((_,i)=>E.chooseBot(original,i)),plain=copy(original),announced=copy(original);
 const annotated=copy(plans);annotated[0].announcement=message();annotated[1].announcement=message('shareholders','We remain outstanding in our field. Of paperwork.');
 const before=JSON.stringify(announced);A.validate(annotated[0].announcement);assert.equal(JSON.stringify(announced),before);
 E.submit(announced,1,annotated[1]);
 const first=E.publicState(announced,0),second=E.publicState(announced,1);
 assert.equal(JSON.stringify(first).includes(annotated[1].announcement.text),false,'The rival must not receive sealed text');
 assert.deepEqual(copy(second.me.pendingAnnouncement),annotated[1].announcement);assert.equal(second.rival.pendingAnnouncement,undefined);A.validateView(second);
 const restored=E.migrateCampaign(copy(announced));assert.deepEqual(copy(restored),copy(announced));
 const locked=JSON.stringify(announced);assert.throws(()=>E.submit(announced,1,copy(annotated[1])),/already locked/);assert.equal(JSON.stringify(announced),locked);
 E.submit(announced,0,annotated[0]);E.submit(restored,0,copy(annotated[0]));assert.deepEqual(copy(restored),copy(announced));
 E.submit(plain,1,copy(plans[1]));E.submit(plain,0,copy(plans[0]));
 assert.deepEqual(withoutAnnouncements(announced),copy(plain),'Only announcement text/metadata may differ, including exact RNG and event ledger');
 assert.deepEqual(copy(announced.announcements.map(r=>r.bankId)),copy(announced.players.map(p=>p.id)));
 assert.equal(announced.resolution[0],A.format(announced.players[0],annotated[0].announcement));assert.equal(announced.resolution[1],A.format(announced.players[1],annotated[1].announcement));
 assert.equal(announced.resolution.filter(line=>line.includes(annotated[0].announcement.text)).length,1);
 const published=JSON.stringify(announced);
 for(let reconnect=0;reconnect<3;reconnect++){const view=E.publicState(announced,reconnect%2);A.validateView(view);assert.equal(view.announcements.length,2);E.migrateCampaign(copy(announced));}
 assert.equal(JSON.stringify(announced),published,'Views and repeated restore do not republish or mutate');
 E.validatePilot(announced);E.validateLedger(announced);
 const nextPlans=announced.players.map((_,i)=>E.chooseBot(announced,i));for(let seat=0;seat<2;seat++)E.submit(announced,seat,nextPlans[seat]);
 assert.equal(announced.announcements,undefined);assert(!announced.resolution.some(line=>line.includes(annotated[0].announcement.text)),'A new month never carries a one-shot announcement');
 assert.equal(announced.log.filter(row=>row.kind==='RESOLUTION'&&row.text.includes(annotated[0].announcement.text)).length,1);
});

test('save/view validation rejects malformed, duplicated, misplaced and leaked announcement records',()=>{
 const g=E.createGame(options(null)),plans=g.players.map((_,i)=>E.chooseBot(g,i));plans[0].announcement=message();
 E.submit(g,0,plans[0]);const half=copy(g);half.players[0].submitted.announcement.text='';assert.throws(()=>E.migrateCampaign(half),/announcement/i);
 E.submit(g,1,plans[1]);
 for(const mutate of [x=>x.announcements.push(copy(x.announcements[0])),x=>x.announcements[0].cycle++,x=>x.announcements[0].bankId='unknown',x=>x.resolution.reverse(),x=>x.announcements[0].text='changed']){const invalid=copy(g);mutate(invalid);assert.throws(()=>E.migrateCampaign(invalid),/announcement/i);}
 const view=E.publicState(g,0);view.rival.pendingAnnouncement=message();assert.throws(()=>A.validateView(view),/Private rival/);
});

const {harness}=require('./github_resilience.test.js');
function fresh(){const h=harness();h.run("game=E.createGame({mode:'hotseat',seed:'announcement-ui',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());render=()=>renderBankAnnouncements(currentView());render();");return h;}
const click=(h,id)=>h.elements.get('#'+id).listeners.click();
function enter(h,text,audience='public'){h.elements.get('#announcementText').value=text;h.elements.get('#announcementAudience').value=audience;h.elements.get('#announcementText').listeners.input();}

test('Overview safely previews exact text, stages/edits/removes one whole instruction, and preserves other draft work',()=>{
 const h=fresh(),original=h.run('JSON.stringify({game,draft})'),text='"<img src=x onerror=alert(1)>" & 🏦';
 enter(h,text,'shareholders');click(h,'announcementPreview');assert.equal(h.run('JSON.stringify({game,draft})'),original);
 assert.equal(h.elements.get('#announcementExactPreview').textContent,h.run('E.BankAnnouncements.format(currentView().me,{audience:"shareholders",text:'+JSON.stringify(text)+'})'));
 assert(!h.elements.get('#bankAnnouncements').innerHTML.includes(text));assert.equal(h.elements.get('#announcementStage').disabled,false);
 click(h,'announcementStage');assert.deepEqual(copy(h.run('draft.announcement')),message('shareholders',text));
 assert.equal(h.run('monthlyChangeRows(currentView()).filter(r=>r.path[0]==="announcement").length'),1);
 h.run("draft.focus='downtown'");enter(h,'Changed');click(h,'announcementPreview');enter(h,'Changed again');click(h,'announcementStage');assert.equal(h.run('draft.announcement.text'),text,'Editing invalidates the prior exact preview');
 click(h,'announcementPreview');click(h,'announcementStage');assert.equal(h.run('draft.announcement.text'),'Changed again');
 click(h,'announcementEdit');enter(h,'Discard me');click(h,'announcementDiscard');assert.equal(h.elements.get('#announcementText').value,'Changed again');
 click(h,'announcementRemove');assert.equal(h.run('draft.announcement'),undefined);assert.equal(h.run('draft.focus'),'downtown');
});

test('locked and stale controls cannot edit, owner-only half-ready drafts restore, and results stay escaped',()=>{
 const h=fresh();enter(h,'<script>"safe"</script> 🏦');click(h,'announcementPreview');const oldStage=h.elements.get('#announcementStage').listeners.click;
 h.run('seat=1;newDraft(currentView());render()');oldStage();assert.equal(h.run('draft.announcement'),undefined);
 h.run('seat=0;newDraft(currentView());render()');enter(h,'<script>"safe"</script> 🏦');click(h,'announcementPreview');click(h,'announcementStage');
 h.run("draft.decision='a';E.submit(game,0,draft);newDraft(currentView());render()");assert.equal(h.run('draft.announcement.text'),'<script>"safe"</script> 🏦');
 const before=h.run('JSON.stringify({game,draft})');click(h,'announcementRemove');assert.equal(h.run('JSON.stringify({game,draft})'),before);assert.match(h.elements.get('#bankAnnouncements').innerHTML,/<textarea[^>]* disabled/);
 h.run('E.submit(game,1,E.chooseBot(game,1));renderHistory(currentView())');
 const markup=h.elements.get('#lastResolution').innerHTML;assert.match(markup,/&lt;script&gt;/);assert.doesNotMatch(markup,/<script>/);assert.match(markup,/bank-announcement-result/);
 const published=h.run('JSON.stringify(game)');h.run('renderHistory(currentView());renderHistory(currentView())');assert.equal(h.run('JSON.stringify(game)'),published);
});

test('guest same-month state refresh preserves private edits while new sessions and drafts reject old callbacks',()=>{
 const h=fresh();h.run('view=E.publicState(game,1);game=null;newDraft(currentView());render()');
 enter(h,'Unstaged guest announcement 🏦','shareholders');click(h,'announcementPreview');
 const unchanged=h.run('JSON.stringify(draft)'),oldStage=h.elements.get('#announcementStage').listeners.click;
 h.run('view=JSON.parse(JSON.stringify(view));view.rival.submitted=true;render()');
 assert.equal(h.elements.get('#announcementText').value,'Unstaged guest announcement 🏦');assert(h.run('pendingAnnouncementEdits(currentView())'));assert.equal(h.run('JSON.stringify(draft)'),unchanged);
 oldStage();assert.equal(h.run('draft.announcement'),undefined,'Detached pre-refresh callback cannot stage');
 click(h,'announcementPreview');click(h,'announcementStage');assert.equal(h.run('draft.announcement.text'),'Unstaged guest announcement 🏦');
 enter(h,'Another private edit');click(h,'announcementPreview');const priorConnectionStage=h.elements.get('#announcementStage').listeners.click;
 h.run('featureConnectionGeneration++');priorConnectionStage();assert.equal(h.run('draft.announcement.text'),'Unstaged guest announcement 🏦');
 h.run('render()');assert.equal(h.elements.get('#announcementText').value,'Unstaged guest announcement 🏦','New connection restores only the explicitly staged text');
 enter(h,'Old campaign text');h.run('newDraft(currentView());render()');assert.equal(h.elements.get('#announcementText').value,'','New draft cannot inherit a previous campaign editor');
});
