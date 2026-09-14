'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),html=require('../tools/build_game').assemble().html;
function engine(text){const c={};vm.runInNewContext(text.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=engine(html),options=()=>({...E.previewCampaignEdition({},'expanded',{currentReporting:true}).options,commercialServiceVersion:1,creditWorkloadVersion:1,mode:'hotseat',seed:'credit-workload',created:1});

test('credit workload follows exposure and product-location portfolios, independently of internal vintage fragmentation',()=>{
 const p={creditBook:{cohorts:[{market:'a',product:'mortgage',principal:2000000}]},companyCredit:{claims:[{principal:100000}]}},a=E.CreditWorkload.quote(p),split=copy(p);
 split.creditBook.cohorts=Array.from({length:1000},()=>({market:'a',product:'mortgage',principal:2000}));const before=JSON.stringify(split),b=E.CreditWorkload.quote(split);
 assert.equal(a.workload,b.workload);assert.equal(a.principal,b.principal);assert.equal(b.cohortRows,1000);assert.equal(b.administrationGroups,2);assert.equal(JSON.stringify(split),before);
 split.creditBook.cohorts[0].product='consumer';assert.equal(E.CreditWorkload.quote(split).administrationGroups,3);
 split.creditBook.cohorts[1].market='b';assert.equal(E.CreditWorkload.quote(split).administrationGroups,4);
 split.companyCredit.claims.push({principal:0});assert.equal(E.CreditWorkload.quote(split).administrationGroups,5,'An interest-only named obligation still needs service');
 assert.equal(E.CreditWorkload.quote({}).workload,0);split.creditBook.cohorts[0].principal=-1;assert.throws(()=>E.CreditWorkload.quote(split),/exposure/);
});

test('authorized department workload uses the same finite staffing without rewriting the actual credit book',()=>{
 const g=E.createGame(options()),p=g.players[0],plan=E.chooseBot(copy(g),0),a=E.departmentFunctionsQuote(g,p,plan);
 assert(a.status.eligible,a.status.reason);assert.equal(a.taskWorkloads.creditAdministration,E.CreditWorkload.quote(p).workload);
 const split=copy(p),first=split.creditBook.cohorts.shift(),n=Math.floor(first.principal/2);
 split.creditBook.cohorts.push({...first,principal:n},{...first,principal:first.principal-n});
 const before=JSON.stringify({g,split,plan}),b=E.departmentFunctionsQuote(g,split,plan);
 assert(b.status.eligible,b.status.reason);assert.equal(a.taskWorkloads.creditAdministration,b.taskWorkloads.creditAdministration);
 assert.deepEqual(copy(a.attribution),copy(b.attribution));assert.deepEqual(copy(a.delivery),copy(b.delivery));assert.equal(JSON.stringify({g,split,plan}),before);
 const v=E.publicState(g,0),r=E.operatingPreview(v.me,plan,v.economy,v,true);assert(E.IncomeReview.reconciliation(r).reconciled);assert.equal(JSON.stringify({g,split,plan}),before);
});

test('explicit workload rules settle and restore identically; malformed, missing and incompatible markers reject',()=>{
 const g=E.createGame(options());assert.equal(g.version,'9.31');
 for(let m=0;m<3;m++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);const restored=E.migrateCampaign(copy(g));
  E.submit(g,1,plans[1]);E.submit(restored,1,copy(plans[1]));assert.deepEqual(copy(g),copy(restored));E.validateLedger(g);E.validatePilot(g);
  for(const seat of [0,1]){const v=E.publicState(g,seat);E.validateIncomeHistoryView(v);assert.equal(v.me.creditWorkloadVersion,1);assert.equal(v.rival.creditWorkloadVersion,undefined);assert(E.IncomeReview.reconciliation(v.me.operatingReport).reconciled);}
 }
 const caps=E.campaignCapabilities();delete caps.creditWorkloadSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'creditWorkloadVersion');
 const bad=copy(g);delete bad.creditWorkloadVersion;for(const p of bad.players)delete p.creditWorkloadVersion;assert.throws(()=>E.migrateCampaign(bad),/Missing credit workload/);
 const mirror=copy(g);delete mirror.players[0].creditWorkloadVersion;assert.throws(()=>E.migrateCampaign(mirror),/Credit workload owner/);
 const v=E.publicState(g,0);v.rival.creditWorkloadVersion=1;assert.throws(()=>E.validateIncomeHistoryView(v),/credit workload owner/);
 const missing=options();delete missing.commercialServiceVersion;assert.throws(()=>E.createGame(missing),/requires/);
 assert.throws(()=>E.createGame({...options(),creditWorkloadVersion:2}),/credit workload version/);
 assert.throws(()=>E.createGame({incomeHistoryVersion:1,commercialServiceVersion:1,creditWorkloadVersion:1}),/requires/);
 const legacy=E.createGame({...options(),creditWorkloadVersion:0});assert.equal(legacy.creditWorkloadVersion,undefined);assert.equal(legacy.version,'9.30');
 g.gameOver=true;g.cycle--;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.31');assert.equal(g.creditWorkloadVersion,1);E.validatePilot(g);
});

test('the preserved servicing candidate keeps exact old-rule creation, AI, RNG, settlement and owner views',()=>{
 const prior=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_servicing_0033ac47.html'),'utf8');
 assert.equal(createHash('sha256').update(prior).digest('hex'),'0033ac47f7c0c7571612916bdd05e2a22722cd965c4240710ac9ccf356372a17');const old=engine(prior);
 for(const edition of ['core','expanded']){
  const o={...old.previewCampaignEdition({},edition,{currentReporting:true}).options,commercialServiceVersion:1,mode:'hotseat',seed:'credit-legacy',created:1},a=old.createGame(o),b=E.createGame(o);assert.deepEqual(copy(b),copy(a));
  for(let month=0;month<2;month++){
   const x=a.players.map((_,i)=>old.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(x),copy(y));
   for(const seat of [0,1]){old.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}assert.deepEqual(copy(b),copy(a));
   for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(old.publicState(a,seat)));
  }
 }
});
