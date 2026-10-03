'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Exercise the authored map in isolation while the engine integration is built.
// The real legacy catalog is loaded, rather than a second copy of its districts.
const sourceRoot=path.join(__dirname,'..','src'),catalog=fs.readFileSync(path.join(sourceRoot,'content/catalog.js'),'utf8');
const legacy=catalog.match(/const TERRITORIES=([\s\S]*?);\nconst STRATEGY_BRANCHES/);
assert(legacy,'Legacy territory catalog was not found.');
const context={};
vm.runInNewContext('const TERRITORIES='+legacy[1]+';\n'+fs.readFileSync(path.join(sourceRoot,'content/core-map.js'),'utf8')+'\nglobalThis.maps={TERRITORIES,CORE_MAPS,coreMapTerritories,coreMapStarts,coreMapShares,initializeCoreMap,validateCoreMap};',context);
const M=context.maps,copy=value=>JSON.parse(JSON.stringify(value));
function opening(count){
 return {scope:'town',players:Array.from({length:count},(_,i)=>({id:'bank-'+i,name:'Bank '+i,
  stats:{cash:2700000,capital:4300000,deposits:12000000,loans:8500000},focus:'downtown',
  branches:{downtown:1},facilityMarkets:{downtown:['retail']},facilities:{retail:1,commercial:0,digital:0}})),
  territories:{downtown:copy(M.TERRITORIES.downtown)}};
}
test('Continental Core supplies 24 distinct selectable markets and a connected geography',()=>{
 const territories=M.coreMapTerritories('continental'),definition=M.CORE_MAPS.continental;
 assert.equal(Object.keys(territories).length,24);
 assert.equal(new Set(Object.values(territories).map(t=>t.name)).size,24);
 assert.equal(new Set(Object.values(territories).map(t=>t.mapPosition.join(','))).size,24);
 for(const t of Object.values(territories)){
  assert.equal(t.unlock,1);assert(t.value>0);assert(t.mapRegion);
  assert.equal(t.mapPosition.length,2);assert(t.mapPosition.every(n=>n>0&&n<100));
 }
 const reached=new Set([definition.starts[0]]);
 let previous=0;
 while(reached.size!==previous){previous=reached.size;for(const [a,b]of definition.links){assert(territories[a]&&territories[b]);if(reached.has(a))reached.add(b);if(reached.has(b))reached.add(a);}}
 assert.equal(reached.size,24);
});
test('Four Continental founding hubs have the same economic terms; two banks start opposite',()=>{
 const territories=M.coreMapTerritories('continental'),starts=copy(M.coreMapStarts('continental',4));
 assert.equal(new Set(starts).size,4);
 assert.deepEqual(starts.slice(0,2),['north_haven','south_haven']);
 const economic=t=>({value:t.value,unlock:t.unlock,tier:t.tier,specialties:t.specialties});
 for(const key of starts)assert.deepEqual(copy(economic(territories[key])),copy(economic(territories[starts[0]])));
 const [first,opposite]=starts.map(key=>territories[key].mapPosition);
 assert.equal(first[0]+opposite[0],100);assert.equal(first[1]+opposite[1],93);
});
test('National map retains the original 12 definitions and delayed market openings',()=>{
 const national=M.coreMapTerritories('national');
 assert.deepEqual(Object.keys(national).sort(),Object.keys(M.TERRITORIES).sort());
 for(const [key,original]of Object.entries(M.TERRITORIES)){
  const actual=copy(national[key]);delete actual.mapPosition;delete actual.mapRegion;
  assert.deepEqual(actual,copy(original));
 }
 assert.equal(national.resort.unlock,30);
});
test('Map creation covers every bank and preserves each bank balance sheet',()=>{
 for(const count of [2,3,4])for(const mapId of ['national','continental']){
  const g=opening(count),before=g.players.map(p=>copy(p.stats));
  M.initializeCoreMap(g,{coreMultiplayerVersion:1,coreMap:mapId});M.validateCoreMap(g);
  assert.equal(g.coreMap,mapId);assert.equal(g.scope,'national');
  assert.equal(new Set(g.players.map(p=>p.focus)).size,count);
  g.players.forEach((p,i)=>{
   assert.deepEqual(p.stats,before[i]);assert.equal(p.branches[p.focus],1);
   assert.equal(Object.values(p.branches).reduce((sum,n)=>sum+n,0),1);
   assert.deepEqual(copy(p.facilities),{retail:1,commercial:0,digital:0});
   assert.equal(Object.keys(p.facilityMarkets).length,Object.keys(g.territories).length);
   assert(g.territories[p.focus].unlock<=1);
   assert.equal(g.territories[p.focus].shares[i],Math.max(...g.territories[p.focus].shares));
  });
  for(const territory of Object.values(g.territories)){
   assert.equal(territory.shares.length,count);assert(Math.abs(territory.shares.reduce((sum,n)=>sum+n,0)-100)<1e-8);
   assert.equal(territory.exitStreak.length,count);assert.equal(territory.exited.length,count);assert.equal(territory.reentryUntil.length,count);
  }
 }
});
test('Map setup is opt-in and fresh definitions cannot mutate the legacy catalog',()=>{
 const g=opening(2),original=JSON.stringify(g),legacyBefore=JSON.stringify(M.TERRITORIES);
 M.initializeCoreMap(g,{});assert.equal(JSON.stringify(g),original);
 const first=M.coreMapTerritories('continental');first.downtown.specialties.push('extra');first.downtown.mapPosition[0]=0;
 assert.equal(JSON.stringify(M.TERRITORIES),legacyBefore);
 const second=M.coreMapTerritories('continental');assert(!second.downtown.specialties.includes('extra'));assert(second.downtown.mapPosition[0]>0);
 const starts=M.coreMapStarts('continental',4);starts[0]='tampered';assert.equal(M.coreMapStarts('continental',4)[0],'north_haven');
});
test('Unknown maps, unsupported bank counts, and damaged campaign geography are rejected',()=>{
 for(const value of ['missing','__proto__',null])assert.throws(()=>M.coreMapTerritories(value),/Core map/);
 for(const count of [1,5,2.5,undefined])assert.throws(()=>M.coreMapStarts('continental',count),/two to four/);
 assert.throws(()=>M.coreMapShares(4,4),/founding bank/);
 const g=opening(4);M.initializeCoreMap(g,{coreMultiplayerVersion:1});assert.equal(g.coreMap,'continental');
 const invalid=[
  bad=>delete bad.territories.harbor,
  bad=>bad.territories.harbor.value++,
  bad=>bad.territories.harbor.mapPosition[0]=50,
  bad=>bad.territories.harbor.shares.pop(),
  bad=>bad.territories.harbor.shares[0]++,
  bad=>bad.territories.harbor.exited[0]=1,
  bad=>bad.territories.harbor.exitStreak[0]=-1,
  bad=>bad.territories.harbor.reentryUntil=[]
 ];
 for(const damage of invalid){const bad=copy(g);damage(bad);assert.throws(()=>M.validateCoreMap(bad),/Core map/);}
});
