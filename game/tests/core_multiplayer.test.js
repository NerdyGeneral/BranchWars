'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../src'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
const source=fs.readFileSync(path.join(root,manifest.engine.shell),'utf8').replace('/* @modules */',()=>manifest.engine.modules.map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n'));
const context={console};vm.runInNewContext(source,context);const E=context.BWEngine;
const copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b,label)=>assert.deepEqual(copy(a),copy(b),label);
const colors=['#2878e0','#e1505c','#27a885','#a56bd7'];
const create=(count,isBot=()=>false,map='continental')=>E.createGame({coreMultiplayerVersion:1,coreMap:map,mode:'hotseat',seed:'core-n-'+count+'-'+map,created:1,players:Array.from({length:count},(_,i)=>({name:'Bank '+i,isBot:isBot(i),color:colors[i]}))});
const standing=(g,i)=>({...E.defaultCoreMultiplayerPlan(g,i),decision:'b'});
let months=0,replays=0,forecasts=0,privacyViews=0;
function check(g){
 E.validateLedger(g);E.validatePilot(g);for(const p of g.players)E.AccountingPrototype.check(p.accounting);
 for(const t of Object.values(g.territories)){assert.equal(t.shares.length,g.players.length);assert(Math.abs(t.shares.reduce((n,x)=>n+x,0)-100)<1e-8);assert(t.shares.every(x=>Number.isFinite(x)&&x>=0&&x<=100));}
 for(let seat=0;seat<g.players.length;seat++){
  const v=E.publicState(g,seat),before=JSON.stringify(g);assert.equal(v.me.id,g.players[seat].id);assert.equal(v.bankIds[0],v.me.id);assert.equal(v.rivals.length,g.players.length-1);assert.equal(v.banks.length,g.players.length);E.validateIncomeHistoryView(v);
  for(const rival of v.rivals)for(const key of ['accounting','allocation','policies','projects','capability','incomeHistory','submittedPlan','pendingAnnouncement'])assert.equal(rival[key],undefined,key+' is private');
  for(const rival of v.rivals)for(const key of ['cash','emergencyDebt'])assert.equal(rival.stats[key],undefined,key+' is private');
  assert(v.trend.every(point=>point.rivalCash===undefined));
  for(const t of Object.values(v.territories))assert.equal(t.shares.length,g.players.length);
  assert.equal(JSON.stringify(g),before,'Projection mutated game');privacyViews++;
 }
 const resumed=E.migrateCampaign(copy(g));same(resumed,g,'Strict save import changed modern state');
}
// Diverse participant counts, maps and human/AI mixtures use identical settlement
// when human lock order changes, including exact half-ready save continuation.
for(const count of [2,3,4])for(const map of ['national','continental'])for(const bots of [false,true]){
 const g=create(count,i=>bots&&i%2===1,map);check(g);
 for(let month=0;month<10&&!g.gameOver;month++){
  const humans=g.players.map((p,i)=>!p.isBot&&!p.eliminated?i:null).filter(i=>i!==null),plans=humans.map(i=>({seat:i,plan:E.chooseBot(g,i)}));
  const twin=copy(g),before=JSON.stringify(g);
  for(const {seat,plan}of plans){const v=E.publicState(g,seat);E.operatingPreview(v.me,plan,v.economy,v);forecasts++;}
  assert.equal(JSON.stringify(g),before,'Preview consumed state or randomness');
  for(const {seat,plan}of plans)E.submit(g,seat,copy(plan));
  for(const {seat,plan}of [...plans].reverse())E.submit(twin,seat,copy(plan));
  same(g,twin,'Human submit order changed bots, RNG or settlement');months++;check(g);
  if(month===2&&humans.length>1){const half=copy(g),plan=E.chooseBot(half,humans[0]);E.submit(half,humans[0],plan);const imported=E.migrateCampaign(copy(half));
   for(const seat of humans.slice(1)){const next=E.chooseBot(half,seat),replay=E.chooseBot(imported,seat);same(next,replay,'Half-ready bot planning changed');E.submit(half,seat,next);E.submit(imported,seat,replay);}
   same(half,imported,'Half-ready continuation changed');replays++;
  }
 }
}
// A recalled plan releases only its owner lock. Its submitted private choices
// survive reload and seat projection without appearing in any other seat.
{
 const g=create(4),q=standing(g,2);q.announcement={audience:'shareholders',text:'Prepared for Bank 2'};E.submit(g,2,q);
 const own=E.publicState(g,2);same(own.me.submittedPlan,g.players[2].submitted);same(E.defaultCoreMultiplayerPlan(own),q);assert.equal(E.publicState(g,0).rivals.find(p=>p.id===g.players[2].id).submittedPlan,undefined);
 const before=JSON.stringify(g.players[0]);E.recallCoreMultiplayer(g,2);assert.equal(g.players[2].submitted,null);assert.equal(JSON.stringify(g.players[0]),before);assert.equal(g.cycle,1);
}
// Inherited Object prototype names are strings, never legitimate catalog entries.
for(const field of ['depositPolicy','lendingPolicy','capitalPolicy','competitiveAction','focus'])for(const value of ['constructor','toString','__proto__']){
 const g=create(4),q=standing(g,0),before=JSON.stringify(g);q[field]=value;assert.throws(()=>E.submit(g,0,q));assert.equal(JSON.stringify(g),before,'Invalid enum partly locked or mutated a bank');
}
for(const damage of [q=>q.products.retail='constructor',q=>q.newProjects=['toString'],q=>q.specializations={risk:'constructor'},q=>q.investments={constructor:1000},q=>q.hires=-1,q=>q.hires=.5,q=>q.rivalId='missing']){
 const g=create(4),q=standing(g,0),before=JSON.stringify(g);damage(q);assert.throws(()=>E.submit(g,0,q));assert.equal(JSON.stringify(g),before);
}
// Targeted financial transfers conserve balances and do not choose binary seats.
{
 const g=create(4),p=g.players[3],seller=g.players[2],target=Object.keys(g.territories)[0],before=g.players.map(p=>copy(p.stats));
 E.finishProject(g,p,{key:'acquisition',target,rivalId:seller.id});
 for(const key of ['deposits','loans','customers'])assert.equal(g.players.reduce((n,p)=>n+p.stats[key],0),before.reduce((n,s)=>n+s[key],0),key+' was manufactured');
 assert(p.stats.deposits>before[3].deposits);assert(seller.stats.deposits<before[2].deposits);same(g.players[0].stats,before[0]);same(g.players[1].stats,before[1]);
 for(const bank of g.players)E.AccountingPrototype.check(bank.accounting);
}
// A conserved adverse financial transaction earns real distress through normal
// monthly operations; retired banks freeze while an AI-only remainder continues.
{
 const g=create(3,i=>i>0),p=g.players[0];p.accounting=E.AccountingPrototype.transact(p.accounting,'expense',p.stats.cash);
 Object.assign(p.stats,{cash:p.accounting.accounts.cash,capital:p.accounting.accounts.equity,earnings:p.accounting.retainedEarnings});
 for(let n=0;n<8&&!p.eliminated;n++){E.submit(g,0,standing(g,0));check(g);}
 assert(p.eliminated,'Critical bank should enter receivership');assert.equal(g.gameOver,false);assert.equal(p.eliminationReason,'receivership');
 const frozen=JSON.stringify({stats:p.stats,projects:p.projects,accounting:p.accounting,incomeHistory:p.incomeHistory}),cycle=g.cycle;
 assert.throws(()=>E.submit(g,0,standing(g,0)),/out of the campaign/);
 for(let n=0;n<3&&!g.gameOver;n++){E.advanceCoreMultiplayerBots(g);check(g);assert.equal(JSON.stringify({stats:p.stats,projects:p.projects,accounting:p.accounting,incomeHistory:p.incomeHistory}),frozen);}
 assert(g.cycle>cycle,'AI-only remainder deadlocked');
}
// The terminal scoreboard and rematch remain reachable from every stable seat.
{
 const g=create(4,i=>i>0);g.gameOver=true;
 for(let seat=0;seat<4;seat++)assert.equal(Object.keys(E.publicState(g,seat).final).length,4);
 E.rematch(g,0,{startingWorkforce:'covered'});assert.equal(g.gameOver,false);assert.equal(g.players.length,4);assert.equal(g.coreMap,'continental');check(g);
}
console.log(JSON.stringify({passed:true,months,replays,forecasts,privacyViews,coverage:'2/3/4 banks; both maps; all-human/mixed AI; ordered deterministic settlement; strict save/replay; inherited enums; targeted acquisitions; eliminated books; AI spectator advancement; scoreboard/rematch'}));
