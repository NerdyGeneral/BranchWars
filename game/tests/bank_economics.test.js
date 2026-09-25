'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),html=require('../tools/build_game').assemble().html;
const prior=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_income_sources_dd9c768a.html'),'utf8');
assert.equal(createHash('sha256').update(prior).digest('hex'),'dd9c768abbcb299f09458a6f44dc3fe99d945600fbba3679712c62c435b7687a');
function engine(text){const c={};vm.runInNewContext(text.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=engine(html),old=engine(prior);
const options=(edition,newRules=true)=>({...old.previewCampaignEdition({},edition,{currentReporting:true}).options,commercialServiceVersion:1,...(edition==='expanded'?{creditWorkloadVersion:1}:{}),...(newRules?{bankEconomicsVersion:1}:{}),mode:'hotseat',seed:'bank-economics',created:1});
function stripBoundary(value){return JSON.parse(JSON.stringify(value,(key,v)=>key==='bankEconomicsVersion'?undefined:key==='version'&&v==='8.18'?'8.17':key==='version'&&v==='9.32'?'9.31':v));}

test('new rules exactly implement the captured income/payroll experiment, preserving other behavior',()=>{
 let experimental=prior.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
 const replace=(a,b,n)=>{assert.equal(experimental.split(a).length-1,n);experimental=experimental.split(a).join(b);};
 for(const term of ['(a.service+a.business+a.lending)*8000','s.wealth*1450','u.technology*13000','u.wealth*18000','digital*4000'])replace(term,'0',2);
 for(const [a,b]of [['s.staff*18000+facilityExpense','s.staff*12000+facilityExpense'],['incomeSource_basePayroll:s.staff*18000','incomeSource_basePayroll:s.staff*12000'],['next*18000','next*12000'],['hires*18000','hires*12000'],['p.stats.staff*18000+metrics.expense','p.stats.staff*12000+metrics.expense']])replace(a,b,1);
 const reference=engine('<script id="engine">'+experimental+'</script>');
 for(const edition of ['core','expanded']){
  const a=reference.createGame(options(edition,false)),b=E.createGame(options(edition));
  assert.deepEqual(stripBoundary(b),copy(a));
  for(let month=0;month<3;month++){
   const x=a.players.map((_,i)=>reference.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(y),copy(x));
   const original=JSON.stringify(b);
   for(const seat of [0,1]){const v=E.publicState(b,seat),forecast=E.operatingPreview(v.me,y[seat],v.economy,v,true);assert(E.IncomeReview.reconciliation(forecast).reconciled);if(edition==='expanded')assert.equal(E.IncomeReview.statement(forecast).abstract,0);}
   assert.equal(JSON.stringify(b),original,'Forecast mutated the campaign');
   for(const seat of [0,1]){reference.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}
   assert.deepEqual(stripBoundary(b),copy(a));reference.validateLedger(a);E.validateLedger(b);E.validatePilot(b);
   for(const p of b.players)if(edition==='expanded'){const statement=E.IncomeReview.statement(p.operatingReport);assert(statement.available,statement.reason);assert.equal(statement.abstract,0);}
  }
 }
});

test('old-rule creation, plans, RNG, settlement and private views replay exactly',()=>{
 for(const edition of ['core','expanded']){
  const o=options(edition,false),a=old.createGame(o),b=E.createGame(o);assert.deepEqual(copy(b),copy(a));
  for(let month=0;month<2;month++){
   const x=a.players.map((_,i)=>old.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(y),copy(x));
   for(const seat of [0,1]){old.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}
   assert.deepEqual(copy(b),copy(a));for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(old.publicState(a,seat)));
  }
 }
});

test('economics boundary preserves half-ready recovery, rematch, privacy and strict compatibility',()=>{
 for(const edition of ['core','expanded']){
  const g=E.createGame(options(edition));assert.equal(g.version,edition==='core'?'8.18':'9.32');E.validateLedger(g);
  const plans=g.players.map((_,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);const recovered=E.migrateCampaign(copy(g));
  E.submit(g,1,plans[1]);E.submit(recovered,1,copy(plans[1]));
  // Core's established importer removes the obsolete strategy mirror when
  // capabilities exist. Compare canonical saves, not incidental pre-import
  // metadata. All books, orders, RNG and resolved reports remain in this check.
  assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(E.migrateCampaign(copy(recovered))));
  const v=E.publicState(g,0);E.validateIncomeHistoryView(v);assert.equal(v.bankEconomicsVersion,1);assert.equal(v.me.bankEconomicsVersion,1);assert.equal(v.rival.bankEconomicsVersion,undefined);
  const missing=copy(g);delete missing.bankEconomicsVersion;assert.throws(()=>E.migrateCampaign(missing),/bank economics/i);
  const owner=copy(g);delete owner.players[0].bankEconomicsVersion;assert.throws(()=>E.migrateCampaign(owner),/bank economics owner/i);
  const mismatch=copy(g);mismatch.version=edition==='core'?'8.17':'9.31';assert.throws(()=>E.migrateCampaign(mismatch),/version does not match/i);
  v.rival.bankEconomicsVersion=1;assert.throws(()=>E.validateIncomeHistoryView(v),/bank economics owner/i);
  const caps=E.campaignCapabilities();delete caps.bankEconomicsSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'bankEconomicsVersion');
  assert.throws(()=>old.migrateCampaign(copy(g)),/version|format/i);
  g.gameOver=true;g.cycle--;E.rematch(g,0);E.rematch(g,1);assert.equal(g.bankEconomicsVersion,1);assert.equal(g.version,edition==='core'?'8.18':'9.32');E.validatePilot(g);
 }
 assert.throws(()=>E.createGame({...options('expanded'),creditWorkloadVersion:0}),/requires Portfolio/);
 assert.throws(()=>E.createGame({...options('core'),commercialServiceVersion:0}),/requires/);
 assert.throws(()=>E.createGame({...options('core'),bankEconomicsVersion:3}),/bank economics version/);
 const off=E.createGame({...options('core'),bankEconomicsVersion:0});assert.equal(off.version,'8.17');assert.equal(off.bankEconomicsVersion,undefined);
 for(const edition of ['core','expanded'])assert.notEqual(E.previewCampaignEdition({},edition,{currentReporting:true}).options.bankEconomicsVersion,1,'Normal setup must not opt in');
});
