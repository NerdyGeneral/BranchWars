'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=require('../tools/build_game').assemble().html,code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const guard='if(!p.facilityNetwork||(!plan.facilityPolicy?.cancel&&!plan.facilityPolicy?.convert))return p;';
assert.equal(code.split(guard).length,2);
function load(s){const context={console};vm.runInNewContext(s.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,facilityProspectiveOwner,'),context);return context.BWEngine;}
const E=load(code),B=load(code.replace(guard,'if(!p.facilityNetwork)return p;'));
// B disables ONLY the redundant-copy optimization, not any candidate rule.
const bytes=fs.readFileSync(path.join(__dirname,'fixtures/v31-group7-staffing120.json.gz'));
assert.equal(hash(bytes),'63087e6e96a905c5bb0cfea5c699b174611dfed6d85b673a4e0781c93e208d23');
const original=JSON.parse(zlib.gunzipSync(bytes)).game,Egame=copy(original),Bgame=copy(original),plans=[],times=[];
for(const bank of [0,1]){
 let started=performance.now();const old=B.chooseBot(Bgame,bank),beforeMs=performance.now()-started;
 started=performance.now();const next=E.chooseBot(Egame,bank),afterMs=performance.now()-started;
 assert.deepEqual(copy(next),copy(old));assert.deepEqual(copy(Egame.rng),copy(Bgame.rng));plans.push(next);
 const g=copy(original),p=g.players[bank],plan=copy(next),snapshot=JSON.stringify({g,plan});
 const forecast=engine=>engine.withCorporateForecast(g,()=>engine.operatingPreview({...p,focus:plan.focus,marketSnapshot:g.marketEconomy},plan,g.economy));
 const departments=engine=>engine.withCorporateForecast(g,()=>engine.departmentBudgetQuote(p,plan));
 assert.deepEqual(copy(forecast(E)),copy(forecast(B)));
 assert.deepEqual(copy(departments(E)),copy(departments(B)));
 assert.equal(JSON.stringify({g,plan}),snapshot,'Read-only quote chain must not alias and mutate its owner');
 const none={facilityPolicy:{convert:null,cancel:null}};assert.equal(E.facilityProspectiveOwner(p,none),p);
 assert.deepEqual(copy(E.facilityProspectiveOwner(p,none)),copy(B.facilityProspectiveOwner(p,none)));
 const office=p.facilityNetwork.offices.find(o=>o.closedCycle===null&&!o.conversion);
 if(office){const active={facilityPolicy:{convert:{officeId:office.id,model:office.model==='atm'?'retail':'atm'},cancel:null}},
  isolated=E.facilityProspectiveOwner(p,active);assert.notEqual(isolated,p);assert.deepEqual(copy(isolated),copy(B.facilityProspectiveOwner(p,active)));}
 assert.equal(JSON.stringify({g,plan}),snapshot);times.push({bank,beforeMs,afterMs});
}
for(const bank of [0,1]){E.submit(Egame,bank,copy(plans[bank]));B.submit(Bgame,bank,copy(plans[bank]));}
E.validatePilot(Egame);E.validateLedger(Egame);assert.deepEqual(copy(E.migrateCampaign(Egame)),copy(B.migrateCampaign(Bgame)));
console.log(JSON.stringify({suite:'v31-forecast-copy',status:'PASS',engineSha256:hash(code),times,
 scope:'Exact mature Group7 AI/RNG/forecasts/department quotes/full month121 settlement and owner purity, versus identical engine with optimization disabled. One timing sample, not browser performance acceptance.'}));
