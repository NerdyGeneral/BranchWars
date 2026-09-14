'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={},copy=x=>JSON.parse(JSON.stringify(x));
const engine=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Test-only trigger at the real monthly ending stage: no campaign date rewinds,
// fabricated balances, altered validators or production end-rule overrides.
vm.runInNewContext(engine.replace('root.BWEngine={','const testEnding=evaluateStrategicEnd;evaluateStrategicEnd=function(g){if(root.testTerminalBefore)root.testTerminalBefore(g);const result=testEnding(g);if(root.testTerminalAfter)root.testTerminalAfter(g);return result;};root.BWEngine={'),context);
const E=context.BWEngine,source=fs.readFileSync(path.join(__dirname,'company_credit_campaign.test.js'),'utf8'),
 scripted=Function('E','copy','return '+source.slice(source.indexOf('function plan('),source.indexOf('function check(')))(E,copy);
const plan=(g,i,target=null)=>({...scripted(g,i,target),companyCreditOrders:[]});
const fresh=()=>E.createGame({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:1,mode:'hotseat',seed:'credit-queue',created:1});
function developed(){const g=fresh();for(let m=0;m<2;m++){E.submit(g,0,plan(g,0,'company:0'));E.submit(g,1,plan(g,1));}return g;}
function validate(g){E.validatePilot(g);E.validateLedger(g);assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));for(let i=0;i<2;i++)E.validateFinancialGroupView(E.publicState(g,i));}

test('the AI funds a profitable qualified relationship using only the public-owner review and existing resources',()=>{
 const g=developed(),v=E.publicState(g,0),draft=plan(g,0,'company:0');draft.lendingPolicy='balanced';
 const before=JSON.stringify({g,v,draft}),r=E.companyCreditStrategyReview(v,draft);
 assert.equal(r.offered.length,1);assert.equal(r.offered[0].companyId,'company:0');assert(r.offered[0].incrementalProfit>0);
 assert(E.companyCreditOrderReview(v,v.me,r.plan,r.plan.companyCreditOrders).eligible);
 assert.deepEqual(copy(r),copy(E.companyCreditStrategyReview(v,draft)));assert.equal(JSON.stringify({g,v,draft}),before);
 const blind=copy(v);blind.rival={id:v.rival.id,name:v.rival.name};assert.deepEqual(copy(r),copy(E.companyCreditStrategyReview(blind,draft)),'No rival financials or instructions are needed');
 const other=plan(g,1),half=copy(g);E.submit(g,0,r.plan);const resume=E.migrateCampaign(copy(g));E.submit(g,1,other);E.submit(resume,1,copy(other));
 assert.deepEqual(copy(g),copy(resume));validate(g);assert.equal(g.companyEconomy.credit.notes[0].original,r.offered[0].principal);
 assert.equal(g.players[0].operatingReport.companyCredit.advanced,r.offered[0].principal);assert.equal(half.companyEconomy.credit.notes.length,0);
 const repeated=E.companyCreditStrategyReview(E.publicState(g,0),plan(g,0,'company:0'));assert(!repeated.plan.companyCreditOrders.some(o=>o.companyId==='company:0'),'An existing note cannot be financed twice');
});

test('AI keeps unsuitable, unqualified, unstaffed and unaffordable offers out without repairing the player plan',()=>{
 const g=developed(),v=E.publicState(g,0),draft=plan(g,0,'company:0');
 const denied=E.companyCreditStrategyReview(E.publicState(g,1),plan(g,1));assert.equal(denied.offered.length,0);
 for(const edit of [x=>{x.allocation.lending=0;x.allocation.operations+=draft.allocation.lending;},x=>{x.groupPolicy.bankDividend=g.players[0].stats.cash;},x=>x.capitalAction=true]){
  const x=copy(draft);edit(x);const before=JSON.stringify(x),r=E.companyCreditStrategyReview(v,x);assert.equal(r.offered.length,0);assert.equal(JSON.stringify(x),before);
 }
 const ended=copy(v);ended.gameOver=true;assert.equal(E.companyCreditStrategyReview(ended,draft).offered.length,0);
 const locked=copy(v);locked.me.submitted=true;assert.equal(E.companyCreditStrategyReview(locked,draft).offered.length,0);
 for(const appetite of ['conservative','balanced','growth']){
  const x={...draft,lendingPolicy:appetite},r=E.companyCreditStrategyReview(v,x);
  assert(E.companyCreditOrderReview(v,v.me,r.plan,r.plan.companyCreditOrders).eligible);
  for(const o of r.offered){assert.equal(o.months,{conservative:24,balanced:36,growth:48}[appetite]);assert(o.incrementalProfit>0);}
 }
});

test('ordinary AI plans remain valid through eight real months with company credit enabled',()=>{
 const g=fresh();let offers=0;
 for(let month=0;month<8&&!g.gameOver;month++){
  const plans=g.players.map((p,i)=>E.chooseBot(g,i));
  for(let i=0;i<2;i++){const q=E.companyCreditOrderReview(g,g.players[i],plans[i],plans[i].companyCreditOrders);assert(q.eligible,q.reason);offers+=plans[i].companyCreditOrders.length;}
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);validate(g);
 }
 console.log(JSON.stringify({scope:'Eight-month ordinary AI integration, not long-run balance',closingCycle:g.cycle,offers,notes:g.companyEconomy.credit.notes.length,gameOver:g.gameOver}));
 assert.equal(g.cycle,9);
});

test('receivership and control endings retain actual company claims and separate bank books through export and rematch',()=>{
 const base=developed(),draft=plan(base,0,'company:0');draft.companyCreditOrders=[{companyId:'company:0',principal:10000,months:48,annualRateBp:800,appetite:'balanced',product:'middleMarket'}];
 E.submit(base,0,draft);E.submit(base,1,plan(base,1));validate(base);
 for(const ending of ['lender','other','both','domination','buyout']){
  const g=copy(base);
  let before,after;
  const snapshot=g=>copy({players:g.players,company:g.companyEconomy,market:g.marketEconomy,accounts:g.commercialAccounts});
  context.testTerminalBefore=g=>{
   // Arrange only eligibility/pressure at the real end-of-month stage. This is
   // an ownership boundary fixture, not a naturally failing strategy benchmark.
   if(ending==='lender'||ending==='both')g.players[0].distress=3;
   if(ending==='other'||ending==='both')g.players[1].distress=3;
   if(ending==='domination')for(const t of Object.values(g.territories)){t.exited=[false,true];t.shares=[95,5];}
   if(ending==='buyout'){g.act=2;g.consolidationStalemate=7;g.buyoutPressure=[1,0];for(const [key,t]of Object.entries(g.territories)){t.exited=key==='northside'?[true,false]:[false,true];t.shares=key==='northside'?[5,95]:[95,5];}}
   before=snapshot(g);for(const p of before.players)p.fundingCovenant.lastCycle=g.cycle;
  };
  context.testTerminalAfter=g=>after=snapshot(g);
  const a=plan(g,0,'company:0'),b=plan(g,1);
  try{E.submit(g,0,a);E.submit(g,1,b);}finally{delete context.testTerminalBefore;delete context.testTerminalAfter;}
  assert(g.gameOver,ending);
  const differences=[],walk=(a,b,key='')=>{if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],key+'.'+k);}else differences.push({key,before:a,after:b});};
  walk(before,after);assert.deepEqual(differences,[],'No unpriced transfer, forgiveness or duplicated claim at '+ending);
  validate(g);assert.equal(g.companyEconomy.credit.notes[0].bankId,base.players[0].id);
  const settled=JSON.stringify(g);assert.throws(()=>E.submit(g,0,draft));assert.equal(JSON.stringify(g),settled);
  E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.28');assert.equal(g.companyEconomy.credit.notes.length,0);assert(g.players.every(p=>p.companyCredit.claims.length===0));validate(g);
 }
});
