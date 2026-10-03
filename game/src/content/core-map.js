// New Core multiplayer geography is opt-in. Historical campaigns continue to
// use TERRITORIES and their original unlock schedule without any map migration.
const CORE_NATIONAL_POSITIONS={
 downtown:[24,29],northside:[43,14],industrial:[13,53],suburbs:[42,48],
 county_seat:[61,31],university:[64,13],metro_core:[64,59],state_capital:[83,29],
 agricultural:[29,75],innovation:[84,53],logistics:[58,82],resort:[84,80]
};
const CORE_NATIONAL_LINKS=[
 ['downtown','northside'],['downtown','industrial'],['downtown','suburbs'],
 ['northside','university'],['suburbs','county_seat'],['industrial','agricultural'],
 ['county_seat','state_capital'],['county_seat','metro_core'],['university','innovation'],
 ['metro_core','innovation'],['metro_core','logistics'],['agricultural','logistics'],
 ['logistics','resort'],['innovation','resort'],['state_capital','innovation']
];
const CORE_CONTINENTAL_GRID=[
 ['north_haven','northside','university','innovation','highland','east_haven'],
 ['industrial','downtown','county_seat','state_capital','foundry','rivergate'],
 ['agricultural','suburbs','metro_core','logistics','midland','lakeview'],
 ['west_haven','orchard','cedar','resort','harbor','south_haven']
];
const CORE_CONTINENTAL_ADDITIONS={
 north_haven:{name:'North Haven',tier:0,unlock:1,value:15,specialties:['service','business'],note:'Balanced founding hub'},
 east_haven:{name:'East Haven',tier:0,unlock:1,value:15,specialties:['service','business'],note:'Balanced founding hub'},
 south_haven:{name:'South Haven',tier:0,unlock:1,value:15,specialties:['service','business'],note:'Balanced founding hub'},
 west_haven:{name:'West Haven',tier:0,unlock:1,value:15,specialties:['service','business'],note:'Balanced founding hub'},
 highland:{name:'Highland Technology Park',tier:1,unlock:1,value:18,specialties:['digital','people'],note:'Technology firms + skilled households'},
 foundry:{name:'Foundry Business District',tier:1,unlock:1,value:18,specialties:['business','operations'],note:'Operating companies + trade services'},
 rivergate:{name:'Rivergate',tier:1,unlock:1,value:20,specialties:['service','lending'],note:'Household deposits + home finance'},
 midland:{name:'Midland Exchange',tier:2,unlock:1,value:24,specialties:['corporate','lending'],note:'Corporate visibility + diversified credit'},
 lakeview:{name:'Lakeview',tier:1,unlock:1,value:20,specialties:['service','people'],note:'Household loyalty + community banking'},
 orchard:{name:'Orchard Valley',tier:1,unlock:1,value:18,specialties:['lending','people'],note:'Local enterprise + seasonal lending'},
 cedar:{name:'Cedar Junction',tier:1,unlock:1,value:20,specialties:['service','business'],note:'Households + independent businesses'},
 harbor:{name:'Harbor Point',tier:2,unlock:1,value:24,specialties:['business','operations'],note:'Trade finance + operating deposits'}
};
const CORE_CONTINENTAL_POSITIONS={},CORE_CONTINENTAL_LINKS=[];
for(let row=0;row<CORE_CONTINENTAL_GRID.length;row++){
 for(let column=0;column<CORE_CONTINENTAL_GRID[row].length;column++){
  const key=CORE_CONTINENTAL_GRID[row][column];
  CORE_CONTINENTAL_POSITIONS[key]=[[9,25,41,59,75,91][column],[12,35,58,81][row]];
  if(column)CORE_CONTINENTAL_LINKS.push([CORE_CONTINENTAL_GRID[row][column-1],key]);
  if(row)CORE_CONTINENTAL_LINKS.push([CORE_CONTINENTAL_GRID[row-1][column],key]);
 }
}
const CORE_MAPS={
 national:{id:'national',name:'National Core',count:12,starts:['downtown','northside','suburbs','industrial'],positions:CORE_NATIONAL_POSITIONS,links:CORE_NATIONAL_LINKS},
 continental:{id:'continental',name:'Continental Core',count:24,starts:['north_haven','south_haven','east_haven','west_haven'],positions:CORE_CONTINENTAL_POSITIONS,links:CORE_CONTINENTAL_LINKS}
};
function coreMapDefinition(mapId){
 if(typeof mapId!=='string'||!Object.hasOwn(CORE_MAPS,mapId))throw Error('Choose the National or Continental Core map.');
 return CORE_MAPS[mapId];
}
function coreMapTerritories(mapId){
 const definition=coreMapDefinition(mapId),source=mapId==='continental'?{...TERRITORIES,...CORE_CONTINENTAL_ADDITIONS}:TERRITORIES;
 return Object.fromEntries(Object.keys(definition.positions).map(key=>{
  const position=definition.positions[key];
  return [key,{...source[key],specialties:[...source[key].specialties],
   ...(mapId==='continental'?{unlock:1}:{}),mapPosition:[...position],
   mapRegion:mapId==='continental'?(position[0]<33?'Western Reach':position[0]>67?'Eastern Reach':'Central Reach'):'National Network'}];
 }));
}
function coreMapStarts(mapId,count){
 const definition=coreMapDefinition(mapId);
 if(!Number.isInteger(count)||count<2||count>4)throw Error('Core multiplayer supports two to four banks.');
 // Two-player Continental games start on opposite corners. Additional banks
 // receive the other corners; every founding hub has identical economic terms.
 return definition.starts.slice(0,count);
}
function coreMapShares(count,owner){
 if(!Number.isInteger(count)||count<2||count>4)throw Error('Core multiplayer supports two to four banks.');
 if(owner!==undefined&&(!Number.isInteger(owner)||owner<0||owner>=count))throw Error('Invalid founding bank.');
 // Shares use the engine's integer tenths of a percentage point. Keeping the
 // opening on that same grid prevents three-bank transfers losing fractions.
 const units=1000,shares=Array(count).fill(Math.floor(units/count));
 for(let i=0;i<units%count;i++)shares[i]++;
 if(owner!==undefined){
  const gain=60,other=count-1;
  shares[owner]+=gain;
  let remainder=gain%other;
  for(let i=0;i<count;i++)if(i!==owner){shares[i]-=Math.floor(gain/other)+(remainder>0?1:0);if(remainder>0)remainder--;}
 }
 return shares.map(value=>value/10);
}
function initializeCoreMap(g,options){
 if(options.coreMultiplayerVersion!==1)return;
 const mapId=options.coreMap===undefined?'continental':options.coreMap,count=g.players.length,starts=coreMapStarts(mapId,count);
 g.coreMultiplayerVersion=1;g.coreMap=mapId;g.scope='national';
 g.territories=Object.fromEntries(Object.entries(coreMapTerritories(mapId)).map(([key,definition])=>[key,{...definition,
  shares:coreMapShares(count,starts.includes(key)?starts.indexOf(key):undefined),
  exitStreak:Array(count).fill(0),exited:Array(count).fill(false),reentryUntil:Array(count).fill(0)}]));
 for(const [index,p]of g.players.entries()){
  p.focus=starts[index];
  p.branches=Object.fromEntries(Object.keys(g.territories).map(key=>[key,key===p.focus?1:0]));
  p.facilityMarkets=Object.fromEntries(Object.keys(g.territories).map(key=>[key,key===p.focus?['retail']:[]]));
  p.facilities={retail:1,commercial:0,digital:0};
 }
}
function validateCoreMap(g){
 if(g.coreMultiplayerVersion!==1)return;
 const authored=coreMapTerritories(g.coreMap),count=g.players?.length;
 coreMapStarts(g.coreMap,count);
 if(!g.territories||Object.keys(g.territories).sort().join(',')!==Object.keys(authored).sort().join(','))throw Error('Core map markets do not match the selected map.');
 for(const [key,definition]of Object.entries(authored)){
  const territory=g.territories[key];
  for(const field of ['name','tier','unlock','value','note','mapRegion'])if(territory[field]!==definition[field])throw Error('Invalid Core map definition for '+key+'.');
  if(JSON.stringify(territory.specialties)!==JSON.stringify(definition.specialties)||JSON.stringify(territory.mapPosition)!==JSON.stringify(definition.mapPosition))throw Error('Invalid Core map geography for '+key+'.');
  if(!Array.isArray(territory.shares)||territory.shares.length!==count||territory.shares.some(n=>!Number.isFinite(n)||n<0||n>100)||Math.abs(territory.shares.reduce((sum,n)=>sum+n,0)-100)>0.000001)throw Error('Invalid Core map market shares.');
  if(!Array.isArray(territory.exitStreak)||territory.exitStreak.length!==count||territory.exitStreak.some(n=>!Number.isInteger(n)||n<0))throw Error('Invalid Core map exit history.');
  if(!Array.isArray(territory.exited)||territory.exited.length!==count||territory.exited.some(n=>typeof n!=='boolean'))throw Error('Invalid Core map exits.');
  if(!Array.isArray(territory.reentryUntil)||territory.reentryUntil.length!==count||territory.reentryUntil.some(n=>!Number.isInteger(n)||n<0))throw Error('Invalid Core map re-entry history.');
 }
}
