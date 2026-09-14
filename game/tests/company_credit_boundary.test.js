'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),load=html=>{const c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;};
const baseline=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_delivery55_afde61a6.html'),'utf8');
assert.equal(createHash('sha256').update(baseline).digest('hex'),'afde61a6409a0c176a8586f682431bf5817db8712eef1613beaab7e88562c001');
const E=load(require('../tools/build_game').assemble().html),old=load(baseline);
for(const edition of ['core','expanded'])test('historical '+edition+' rules preserve creation, AI, settlement, RNG, views and recovery exactly',()=>{
 const options={...old.previewCampaignEdition({},edition).options,mode:'hotseat',seed:'credit-boundary:'+edition,created:1},g=E.createGame(options),b=old.createGame(options);
 assert.deepEqual(copy(g),copy(b));
 for(let month=1;month<=2;month++){
  if(g.companyEconomy){const before=JSON.stringify(g);for(const c of g.companyEconomy.companies)E.CompanyCredit.assess(c);assert.equal(JSON.stringify(g),before);}
  const a=g.players.map((p,i)=>E.chooseBot(g,i)),prior=b.players.map((p,i)=>old.chooseBot(b,i));assert.deepEqual(copy(a),copy(prior));
  for(const i of [0,1]){E.submit(g,i,a[i]);old.submit(b,i,prior[i]);assert.deepEqual(copy(g),copy(b));}
  E.validatePilot(g);E.validateLedger(g);old.validatePilot(b);old.validateLedger(b);assert.deepEqual(copy(g),copy(b));assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(old.migrateCampaign(copy(b))));
  for(const i of [0,1])assert.deepEqual(copy(E.publicState(g,i)),copy(old.publicState(b,i)));
 }
});
