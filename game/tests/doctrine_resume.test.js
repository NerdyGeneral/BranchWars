'use strict';
// Real paid hiring crosses doctrine hysteresis after the normal sync stage.
// No reconstructed financial state, ignored stress report or new golden needed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const old=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_departments_group6_57cc519e.html'),'utf8');
assert.equal(hash(old),'57cc519e39eb78be7c17c9792cb80bf754571eac452e155ee04001d98eef97e0');
function load(text){const c={console};vm.runInNewContext(text.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=load(html),baseline=load(old),same=(a,b)=>assert.deepEqual(copy(a),copy(b));let profiles=0,months=0,oldFailures=0;
function plans(g,engine=E){return g.players.map((_p,seat)=>{const q=engine.chooseBot(g,seat);q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;q.capitalAction=false;q.competitiveAction='none';return q;});}
for(const rules of [0,1,5,6]){
 const options=rules?E.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options:{};
 const g=E.createGame({...options,mode:'hotseat',seed:'doctrine-paid-hiring',created:1}),first=plans(g),openingStaff=g.players[0].stats.staff,openingPay=g.players[0].payrollSpend;
 first[0].hires=2;E.submit(g,0,first[0]);E.submit(g,1,first[1]);months++;E.validatePilot(g);E.validateLedger(g);
 const p=g.players[0];assert.equal(p.stats.staff,openingStaff+2);assert(p.payrollSpend>openingPay,'Actual hired bankers must be paid.');
 assert.equal(p.doctrine,'community');assert.equal(E.syncDoctrine(copy(p)),'people','Paid hiring must actually cross the hysteresis threshold.');
 const resumedClosing=E.migrateCampaign(copy(g));assert.equal(resumedClosing.players[0].doctrine,p.doctrine);
 same(resumedClosing.players[0].stats,p.stats);same(E.campaignRules(resumedClosing),E.campaignRules(g));same(E.migrateCampaign(copy(resumedClosing)),resumedClosing);
 const following=plans(g);E.submit(g,0,following[0]);const half=copy(g),resumed=E.migrateCampaign(copy(half));
 assert.equal(resumed.players[0].doctrine,half.players[0].doctrine);same(E.campaignRules(resumed),E.campaignRules(half));same(E.migrateCampaign(copy(resumed)),resumed);
 // Reproduce the old bug on an actual old-engine campaign. Modern Group6
 // staffing evidence is deliberately unsupported by that frozen reader; never
 // strip its fields to make the historical engine accept a newer save.
 const oldOptions=rules?baseline.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options:{};
 const oldGame=baseline.createGame({...oldOptions,mode:'hotseat',seed:'doctrine-paid-hiring',created:1});
 const oldFirst=plans(oldGame,baseline);oldFirst[0].hires=2;
 baseline.submit(oldGame,0,oldFirst[0]);baseline.submit(oldGame,1,oldFirst[1]);
 const oldFollowing=plans(oldGame,baseline);baseline.submit(oldGame,0,oldFollowing[0]);
 assert.equal(oldGame.players[0].doctrine,'community');
 const oldImport=baseline.migrateCampaign(copy(oldGame));assert.equal(oldImport.players[0].doctrine,'people');assert.notEqual(oldImport.players[0].doctrine,oldGame.players[0].doctrine);oldFailures++;
 if(rules===6)assert.throws(()=>baseline.migrateCampaign(copy(half)),/relationship offer report shape/,'Historical engine must refuse modern staffing reports.');
 E.submit(g,1,following[1]);E.submit(resumed,1,copy(following[1]));months++;
 E.validatePilot(g);E.validatePilot(resumed);E.validateLedger(g);E.validateLedger(resumed);same(E.migrateCampaign(copy(g)),E.migrateCampaign(copy(resumed)));
 for(const invalid of [undefined,'not-a-doctrine',null]){
  const damaged=copy(half);if(invalid===undefined)delete damaged.players[0].doctrine;else damaged.players[0].doctrine=invalid;
  const repaired=E.migrateCampaign(copy(damaged));
  const historicalDoctrine=baseline.syncDoctrine(copy(damaged.players[0]));
  assert.equal(repaired.players[0].doctrine,historicalDoctrine,'Missing/invalid doctrine retains the historical reconstruction function on the same bank.');
 }
 profiles++;console.log('PASS '+(rules?'Group'+rules:'original rules')+' paid hiring, closing and half-ready exact replay, repeated import and missing/invalid fallback');
}
// Original v6 migration historically supplied a fallback before player repair.
// Preserve that reconstruction, not an accidentally preserved fallback value.
for(const invalid of [undefined,'invalid',null]){
 const legacy=E.createGame({mode:'hotseat',seed:'doctrine-v6-fallback',created:1});legacy.version='6.0';
 if(invalid===undefined)delete legacy.players[0].doctrine;else legacy.players[0].doctrine=invalid;
 const a=E.migrateCampaign(copy(legacy)),b=baseline.migrateCampaign(copy(legacy));assert.equal(a.players[0].doctrine,b.players[0].doctrine);same(a.players[0].achievements,b.players[0].achievements);
}
console.log(JSON.stringify({status:'PASS',profiles,months,oldFailures,v6Fallbacks:3,assembledSha256:hash(html),scope:'Natural paid-hiring reproduction across original/Group1/Group5/Group6; no settlement timing or campaign-rule changes.'}));
