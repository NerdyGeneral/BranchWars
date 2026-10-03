'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Load the exact manifest-ordered engine without requiring a browser. The
// portable-build freshness gate separately verifies the assembled client.
const source=path.join(__dirname,'..','src'),manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8')),context={};
const engine=fs.readFileSync(path.join(source,manifest.engine.shell),'utf8').replace('/* @modules */',()=>manifest.engine.modules.map(file=>fs.readFileSync(path.join(source,file),'utf8')).join(''));
vm.runInNewContext(engine,context);
const E=context.BWEngine,copy=value=>JSON.parse(JSON.stringify(value));
function fresh(count=4,map='continental'){
 return E.createGame({coreMultiplayerVersion:1,coreMap:map,mode:'hotseat',seed:'multiplayer-save-'+count+'-'+map,created:1,
  players:Array.from({length:count},(_,index)=>({name:'Institution '+(index+1),isBot:false}))});
}
function plans(g){return g.players.map((p,index)=>p.eliminated?null:E.chooseBot(g,index));}
function complete(g,selected=plans(g)){
 if(g.gameOver)return;
 selected.forEach((plan,index)=>{if(plan&&!g.players[index].eliminated&&!g.players[index].submitted)E.submit(g,index,copy(plan));});
}
function restore(g){return E.migrateCampaign(JSON.parse(JSON.stringify(g)));}
function same(actual,expected,message){assert.deepEqual(copy(actual),copy(expected),message);}

test('Two, three and four bank saves roundtrip on both maps without changing state or RNG',()=>{
 for(const count of [2,3,4])for(const map of ['national','continental']){
  const g=fresh(count,map);
  assert.equal(g.version,'10.1');assert.equal(g.players.length,count);
  const initial=JSON.stringify(g),loaded=restore(g);
  assert.equal(JSON.stringify(g),initial,'Loading must not mutate its source');
  same(loaded,g,'A valid new campaign needs no repairs');
  same(E.migrateCampaign(g),g,'Direct in-memory imports preserve the same valid state');
  for(let month=0;month<4&&!g.gameOver;month++){
   complete(g);complete(loaded);same(loaded,g,'Saved and unsaved simulation must agree');
   const next=restore(g);same(next,g,'Month-end imports preserve every private book and random stream');
   E.validateCoreMap(next);E.validateLedger(next);
  }
 }
});
test('A partly locked turn survives import and resolves once with the original hidden plans',()=>{
 for(const count of [2,3,4]){
  const g=fresh(count),selected=plans(g);
  for(let index=0;index<count-1;index++)E.submit(g,index,copy(selected[index]));
  assert.equal(g.cycle,1);assert.equal(g.players.filter(p=>p.submitted).length,count-1);
  const before=JSON.stringify(g),loaded=restore(g);
  assert.equal(JSON.stringify(g),before);same(loaded,g);
  complete(g,selected);complete(loaded,selected);
  assert.equal(g.cycle,2);assert.equal(g.resolutionId,1);same(loaded,g);
  assert(g.players.every(p=>!p.submitted));
 }
});
test('Eliminated-bank records survive subsequent months and cannot receive another turn',()=>{
 const g=fresh(4);complete(g);
 const retired=g.players[2];retired.distress=E.RECEIVERSHIP_CYCLES;
 // Campaign ending runs before the completed month's clock advances. Recreate
 // that end-stage clock for a receiver fixture without altering its accounts.
 const nextCycle=g.cycle;g.cycle--;
 E.evaluateStrategicEnd(g);
 g.cycle=nextCycle;
 assert.equal(retired.eliminated,true);assert.equal(g.gameOver,false);
 const frozen=copy(retired),loaded=restore(g);same(loaded,g);
 for(let month=0;month<3&&!g.gameOver;month++){
  complete(g);complete(loaded);same(loaded,g);
  same(restore(g),g,'Retired books remain loadable while surviving banks continue');
  same(retired.stats,frozen.stats,'Eliminated banks do not earn further income');
  assert.equal(retired.submitted,null);
 }
 assert.equal(retired.eliminationReason,'receivership');
 assert.throws(()=>E.submit(g,2,{}),/eliminated|retired|active|operating|out of.*campaign/i);
});
test('Finished campaigns preserve the last-bank result or collective receivership on import',()=>{
 for(const count of [2,3,4])for(const allFailed of [false,true]){
  const g=fresh(count);complete(g);
  // Re-enter the last completed month's ending stage, as in the retired fixture.
  g.cycle--;
  g.players.forEach((p,index)=>{if(allFailed||index!==0)p.distress=E.RECEIVERSHIP_CYCLES;});
  E.evaluateStrategicEnd(g);
  assert.equal(g.gameOver,true);assert.equal(g.winnerId,allFailed?null:g.players[0].id);
  assert.equal(g.endReason,allFailed?'receivership':'last_bank');
  same(restore(g),g,'Terminal imports preserve every final bank book');
  assert.throws(()=>E.submit(g,0,{}),/complete|out of.*campaign/i);
 }
});
test('Contradictory elimination, campaign outcomes and malformed operating records cannot be loaded',()=>{
 const active=fresh(4);complete(active);
 const retired=copy(active);retired.cycle--;retired.players[2].distress=E.RECEIVERSHIP_CYCLES;E.evaluateStrategicEnd(retired);retired.cycle++;
 same(restore(retired),retired,'The canonical retired fixture loads before any damage');
 const terminal=copy(active);terminal.cycle--;terminal.players.slice(1).forEach(p=>p.distress=E.RECEIVERSHIP_CYCLES);E.evaluateStrategicEnd(terminal);
 same(restore(terminal),terminal,'The canonical winning fixture loads before any damage');
 const cases=[
  ['duplicate bank name',active,g=>g.players[1].name=g.players[0].name.toUpperCase()],
  ['negative distress',active,g=>g.players[0].distress=-1],
  ['fractional distress',active,g=>g.players[0].distress=.5],
  ['receiver still marked active',active,g=>g.players[0].distress=E.RECEIVERSHIP_CYCLES],
  ['negative sentiment',active,g=>g.players[0].stats.morale=-1],
  ['sentiment outside its range',active,g=>g.players[0].stats.reputation=101],
  ['fractional customers',active,g=>g.players[0].stats.customers=.5],
  ['malformed recruiting counter',active,g=>g.players[0].hiresTotal='1'],
  ['negative funding gap',active,g=>g.players[0].fundingGap=-1],
  ['unknown last action',active,g=>g.players[0].lastCompetitiveAction='unknown'],
  ['false submitted-plan record',active,g=>g.players[0].submitted=false],
  ['duplicate achievement',active,g=>g.players[0].achievements=['scale','scale']],
  ['unknown primary capability',active,g=>g.players[0].primaryStrategy='unknown'],
  ['unknown selected rival',active,g=>g.players[0].rivalId='unknown'],
  ['active campaign with winner',active,g=>g.winnerId=g.players[0].id],
  ['active campaign with ending',active,g=>g.endReason='last_bank'],
  ['active campaign with rematch vote',active,g=>g.rematchVotes=[g.players[0].id]],
  ['unreconciled resolution clock',active,g=>g.resolutionId++],
  ['reopened eliminated office',retired,g=>{const p=g.players[2];p.branches[p.focus]=1;p.facilityMarkets[p.focus]=['retail'];p.facilities.retail=1;}],
  ['reopened eliminated market',retired,g=>g.territories.harbor.exited[2]=false],
  ['retired bank retaining operating-market shares',retired,g=>{g.territories.harbor.shares[2]=1;g.territories.harbor.shares[0]-=1;}],
  ['elimination in an unresolved month',retired,g=>g.players[2].eliminatedCycle=g.cycle],
  ['receivership without distress',retired,g=>g.players[2].distress=0],
  ['unsupported bank takeover ending',retired,g=>g.players[2].eliminationReason='takeover'],
  ['terminal winner is eliminated',terminal,g=>g.winnerId=g.players[1].id],
  ['terminal last bank without winner',terminal,g=>g.winnerId=null],
  ['terminal wrong ending',terminal,g=>g.endReason='receivership'],
  ['missing geographic project target',active,g=>g.players[0].projects.push({key:'branch',target:null,progress:0,total:3})]
 ];
 for(const [label,source,damage]of cases){
  const bad=copy(source);damage(bad);const before=JSON.stringify(bad);
  assert.throws(()=>restore(bad),undefined,label);assert.equal(JSON.stringify(bad),before,label+' preserves its rejected input');
 }
 const none=copy(active);none.cycle--;none.players.forEach(p=>p.distress=E.RECEIVERSHIP_CYCLES);E.evaluateStrategicEnd(none);
 none.gameOver=false;none.winnerId=null;delete none.endReason;none.cycle++;
 assert.throws(()=>restore(none),/active multiplayer|left the campaign|result/i,'An all-retired campaign cannot keep waiting for plans');
 const several=copy(active);several.gameOver=true;several.cycle--;several.endReason='last_bank';several.winnerId=several.players[0].id;several.failedId=null;
 assert.throws(()=>restore(several),/finished multiplayer/,'A finished campaign cannot have multiple active banks');
 const closed=copy(active),closedBank=closed.players[0];
 for(const [key,t]of Object.entries(closed.territories)){t.exited[0]=true;closedBank.branches[key]=0;closedBank.facilityMarkets[key]=[];}
 closedBank.facilities={retail:0,commercial:0,digital:0};
 assert.throws(()=>restore(closed),/active bank.*left/i,'An active bank needs an operating market');
 assert.throws(()=>E.createGame({coreMultiplayerVersion:1,players:[{name:'Duplicate Bank',isBot:false},{name:'Duplicate  Bank',isBot:false}]}),/different name/i,'Creation compares the same normalized names used by the engine');
});
test('Core multiplayer rejects damaged map, clocks, progress, identities and private accounting without repair',()=>{
 const original=fresh(4);complete(original);
 const corruptions=[
  ['bank count',g=>g.players.pop()],
  ['duplicate bank identity',g=>g.players[1].id=g.players[0].id],
  ['unknown map',g=>g.coreMap='unknown'],
  ['lost district',g=>delete g.territories.harbor],
  ['changed market value',g=>g.territories.harbor.value++],
  ['changed map coordinates',g=>g.territories.harbor.mapPosition[0]++],
  ['missing market share',g=>g.territories.harbor.shares.pop()],
  ['unconserved market shares',g=>g.territories.harbor.shares[0]++],
  ['negative market share',g=>g.territories.harbor.shares[0]=-1],
  ['short exit history',g=>g.territories.harbor.exitStreak.pop()],
  ['invalid exit marker',g=>g.territories.harbor.exited[0]=1],
  ['invalid reentry clock',g=>g.territories.harbor.reentryUntil[0]=-1],
  ['missing RNG',g=>delete g.rng],
  ['unsupported RNG',g=>g.rng.algorithm='unverified'],
  ['negative random state',g=>g.rng.state=-1],
  ['fractional random state',g=>g.rng.aiState=.5],
  ['numeric string clock',g=>g.cycle='2'],
  ['negative creation clock',g=>g.created=-1],
  ['short takeover progress',g=>g.buyoutPressure.pop()],
  ['unknown rematch vote',g=>g.rematchVotes=['unknown-bank']],
  ['duplicate rematch vote',g=>g.rematchVotes=[g.players[0].id,g.players[0].id]],
  ['wrong history bank count',g=>g.trend[0].scores.pop()],
  ['malformed bank color',g=>g.players[2].color='red'],
  ['fractional office count',g=>g.players[2].branches[g.players[2].focus]=1.5],
  ['unreconciled office total',g=>g.players[2].facilities.retail++],
  ['invalid office model',g=>g.players[2].facilityMarkets[g.players[2].focus]=['unknown']],
  ['unallocated staff',g=>g.players[2].allocation.service++],
  ['missing Core accounts',g=>delete g.players[2].accounting],
  ['accounts disagree with statistics',g=>g.players[2].stats.cash++],
  ['unbalanced accounts',g=>g.players[2].accounting.accounts.equity++],
  ['wrong economics marker',g=>g.bankEconomicsVersion=1],
  ['unsupported Core marker',g=>g.coreMultiplayerVersion=2],
  ['numeric string marker',g=>g.coreMultiplayerVersion='1'],
  ['unsupported feature combination',g=>g.productProgramsVersion=2],
  ['unknown winner',g=>g.winnerId='unknown-bank'],
  ['active bank with elimination record',g=>g.players[2].eliminatedCycle=g.cycle],
  ['wrong campaign mode',g=>g.mode='online-new-mode'],
  ['wrong scenario',g=>g.scenario='unknown'],
  ['wrong difficulty',g=>g.difficulty='unknown'],
  ['missing economic regime',g=>g.economy=null],
  ['altered economic rate',g=>g.economy.rate++],
  ['missing executive call',g=>g.event=null],
  ['altered executive call',g=>g.event.text='Unverified instruction'],
  ['malformed resolved plans',g=>g.lastPlans='bad'],
  ['malformed score deltas',g=>g.scoreDelta=[]],
  ['unknown bank report',g=>g.scoreDelta.unknown=1],
  ['nontext resolution',g=>g.resolution=[1]],
  ['invalid opportunity location',g=>g.opportunities[0].market='unknown'],
  ['replaced staffing role',g=>g.players[2].allocation={invented:g.players[2].stats.staff}],
  ['missing bank policies',g=>g.players[2].policies=null],
  ['unrecognized deposit policy',g=>g.players[2].policies.deposit='unknown'],
  ['missing product book',g=>g.players[2].products=null],
  ['unrecognized product',g=>g.players[2].products.retail='unknown'],
  ['negative upgrade',g=>g.players[2].upgrades.technology=-1],
  ['negative research funding',g=>g.players[2].capability.network=-1]
 ];
 for(const [label,damage]of corruptions){
  const bad=copy(original);damage(bad);const encoded=JSON.stringify(bad);
  assert.throws(()=>E.migrateCampaign(bad),undefined,label);
  assert.equal(JSON.stringify(bad),encoded,label+' rejection must not change the caller-owned save');
 }
 for(const numeric of [NaN,Infinity,-Infinity]){
  const bad=copy(original);bad.players[2].stats.cash=numeric;
  assert.throws(()=>E.migrateCampaign(bad),/number|statistics|accounts/i);
 }
});
test('Corrupt rule boundaries cannot disguise a new multiplayer save as old Core',()=>{
 const marked=fresh(2,'national');
 const unmarked=copy(marked);delete unmarked.coreMultiplayerVersion;assert.throws(()=>restore(unmarked),/multiplayer|version|map|rules/i);
 const oldVersion=copy(marked);oldVersion.version='8.20';assert.throws(()=>restore(oldVersion),/multiplayer|version|rules/i);
 for(const unsupported of [0,2,-1,1.5,'1',null])assert.throws(()=>E.createGame({coreMultiplayerVersion:unsupported,players:[{name:'A',isBot:false},{name:'B',isBot:false}]}),/Core multiplayer/);
});
test('Historical Core 8.20 remains a two-bank campaign and resumes with its original rules and geography',()=>{
 const options=E.previewCampaignEdition({},'core',{currentReporting:true,currentEconomics:true,currentResearch:true}).options;
 const g=E.createGame({...options,mode:'hotseat',seed:'historical-core-map',created:1});
 assert.equal(g.version,'8.20');assert.equal(g.coreMultiplayerVersion,undefined);assert.equal(g.coreMap,undefined);
 const serialized=JSON.stringify(g),loaded=restore(g);assert.equal(JSON.stringify(g),serialized);
 const normalized=value=>{const out=copy(value);delete out.ledgerVersion;out.players.forEach(p=>delete p.strategy);return out;};
 same(normalized(loaded),normalized(g));
 for(let month=0;month<4&&!g.gameOver;month++){
  complete(g);complete(loaded);same(normalized(loaded),normalized(g));
  assert.equal(loaded.version,'8.20');assert.equal(loaded.players.length,2);
  assert.equal(Object.keys(loaded.territories).length,12);assert.equal(loaded.territories.resort.unlock,30);
  assert.equal(loaded.coreMap,undefined);assert.equal(loaded.coreMultiplayerVersion,undefined);
 }
});
