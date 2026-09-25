'use strict';
// Two actual long-campaign failures, preserved without regenerated expectations.
// Test a cold-engine half-ready resume, owner privacy and validation purity.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const bytes=fs.readFileSync(path.join(__dirname,'fixtures/department-captured-regressions.json.gz'));
assert.equal(hash(bytes),'40d2eca04a37db2cd16f1102ba2b6ec2c8ebff7250a1a388bde080f8d318896b');
const raw=zlib.gunzipSync(bytes);assert.equal(hash(raw),'f7fb95d40d6206e44270afe26be42941bd8b9ebd7dc314558e0ac940e337e79f');
const fixture=JSON.parse(raw);assert.equal(fixture.schemaVersion,1);assert.equal(fixture.cases.length,2);
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
function engine(){const context={console};vm.runInNewContext(code,context);return context.BWEngine;}
const digest=x=>hash(JSON.stringify(x));let months=0,views=0;
function validate(E,g){
 const before=digest(g);E.validatePilot(g);E.validateLedger(g);
 for(const seat of [0,1]){
  const v=E.publicState(g,seat);E.validateFinancialGroupView(v);E.validateAgencyView(v);E.validateCorporateView(v);
  assert.equal(v.rival.departmentFunctionDelivery,undefined);assert.equal(v.rival.departmentFunctions,undefined);
  assert.equal(v.departmentFunctionEconomy,undefined);assert.equal(digest(v.me.departmentFunctionDelivery),digest(g.players[seat].departmentFunctionDelivery));views++;
 }
 assert.equal(digest(g),before,'Validation and public projection must not mutate the source.');
}
for(const c of fixture.cases){
 const E=engine(),R=engine(),g=copy(c.openingGame),opening=digest(g);
 validate(E,g);
 const imported=R.migrateCampaign(copy(g));
 assert.deepEqual(copy(imported.players.map(p=>p.doctrine)),copy(g.players.map(p=>p.doctrine)),'Import must not advance strategic identity.');
 assert.equal(digest(g),opening);
 // Re-run planning to retain its serialized AI RNG effects. Instructions from
 // the captured old build remain the submitted human/AI commitments below.
 g.players.forEach((_p,seat)=>E.chooseBot(g,seat));
 E.submit(g,0,copy(c.pending[0]));
 const resumed=R.migrateCampaign(copy(g));validate(R,resumed);
 assert.equal(digest(R.migrateCampaign(copy(resumed))),digest(resumed),'Repeated half-ready import is stable.');
 E.submit(g,1,copy(c.pending[1]));R.submit(resumed,1,copy(c.pending[1]));months++;
 validate(E,g);validate(R,resumed);
 assert.equal(digest(E.migrateCampaign(copy(g))),digest(R.migrateCampaign(copy(resumed))),'Captured month must resume exactly in a cold engine: '+c.id);
 assert.equal(g.cycle,c.openingGame.cycle+1);
 assert.equal(digest(c.openingGame),opening,'Immutable fixture input changed.');
 console.log(JSON.stringify({case:c.id,status:'PASS',openingCycle:c.openingGame.cycle,closingCycle:g.cycle,closingSha256:digest(g),sourceReportSha256:c.sourceReportSha256}));
}
console.log(JSON.stringify({status:'PASS',cases:fixture.cases.length,months,ownerViews:views,engineSha256:hash(code),assembledSha256:hash(html),scope:'Captured month37 and month264 exact cold-engine half-ready replay; not complete 120/480-month balance acceptance.'}));
