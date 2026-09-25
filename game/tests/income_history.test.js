'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const c={};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
function options(edition){return {...E.previewCampaignEdition({},edition).options,mode:'hotseat',seed:'income-history',created:1};}
function withoutHistory(g,version){const value=copy(g);delete value.incomeHistoryVersion;value.version=version;for(const p of value.players)delete p.incomeHistory;return value;}
test('explicit Core history preserves exact economics and RNG for fourteen months, including half-ready resume',()=>{
 const plain=E.createGame(options('core')),g=E.createGame({...options('core'),incomeHistoryVersion:1});
 assert.equal(g.version,'8.16');assert.deepEqual(withoutHistory(g,plain.version),copy(plain));
 for(let month=1;month<=14;month++){
  const a=plain.players.map((_,i)=>E.chooseBot(plain,i)),b=g.players.map((_,i)=>E.chooseBot(g,i));assert.deepEqual(copy(a),copy(b));
  E.submit(plain,0,a[0]);E.submit(g,0,b[0]);const resumed=E.migrateCampaign(copy(g));
  E.submit(plain,1,a[1]);E.submit(g,1,b[1]);E.submit(resumed,1,copy(b[1]));
  assert.deepEqual(copy(E.migrateCampaign(resumed)),copy(E.migrateCampaign(g)));assert.deepEqual(withoutHistory(g,plain.version),copy(plain));E.validatePilot(g);
 }
 assert.equal(g.players[0].incomeHistory.records.length,12);assert.equal(g.players[0].incomeHistory.records[0].cycle,3);
 const v=E.publicState(g,0);assert.equal(v.incomeHistoryVersion,1);assert.equal(v.rival.incomeHistory,undefined);E.validateIncomeHistoryView(v);
 assert.equal(v.me.incomeHistory.records.at(-1).contractFees,null,'Core must not invent a service-contract book');
 const history=copy(E.IncomeReview.history(v)),principal=copy(E.IncomeReview.principalHistory(v));
 v.operatingEvents=[];v.causalEvents=[];v.trend=[];v.me.operatingReport=null;
 assert.deepEqual(copy(E.IncomeReview.history(v)),history);assert.deepEqual(copy(E.IncomeReview.principalHistory(v)),principal);
 v.me.incomeHistory.records[0].loanIncome=-1;assert.notEqual(g.players[0].incomeHistory.records[0].loanIncome,-1,'Owner view must not alias saved records');
 const exported=JSON.stringify(g),restored=E.migrateCampaign(JSON.parse(exported));assert.deepEqual(copy(restored),copy(E.migrateCampaign(g)));
 g.gameOver=true;g.cycle--; // Explicit terminal fixture; no extra month invented.
 E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'8.16');assert.equal(g.incomeHistoryVersion,1);assert.equal(g.players[0].incomeHistory.records.length,0);E.validatePilot(g);
});
test('Expanded history records real reports without changing funded balances, drafts or settlement',()=>{
 const plain=E.createGame(options('expanded')),g=E.createGame({...options('expanded'),incomeHistoryVersion:1});assert.equal(g.version,'9.29');
 for(let month=0;month<3;month++){
  const plans=plain.players.map((_,i)=>E.chooseBot(plain,i)),current=g.players.map((_,i)=>E.chooseBot(g,i));assert.deepEqual(copy(current),copy(plans));
  for(const seat of [0,1]){E.submit(plain,seat,plans[seat]);E.submit(g,seat,current[seat]);}
  assert.deepEqual(withoutHistory(g,plain.version),copy(plain));E.validatePilot(g);
  for(const seat of [0,1]){const v=E.publicState(g,seat);E.validateIncomeHistoryView(v);E.validateFinancialGroupView(v);assert.equal(v.me.incomeHistory.records.at(-1).loanIncome,v.me.operatingReport.loanIncome);}
 }
 assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(E.migrateCampaign(g)));
 g.gameOver=true;g.cycle--;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.29');assert.equal(g.incomeHistoryVersion,1);assert(g.players.every(p=>p.incomeHistory.records.length===0));E.validatePilot(g);
});
test('history is strict, versioned, non-upgrading and private; unsupported peers are refused',()=>{
 assert.throws(()=>E.createGame({...options('core'),incomeHistoryVersion:2}),/income history version/);
 assert.throws(()=>E.createGame({...E.previewFeatureSelection({}, {field:'campaignRulesVersion',value:1}).options,incomeHistoryVersion:1}),/requires Core/);
 const g=E.createGame({...options('core'),incomeHistoryVersion:1});
 for(const change of [x=>delete x.incomeHistoryVersion,x=>delete x.players[0].incomeHistory,x=>x.players[0].incomeHistory.lastCycle=1,x=>x.players[0].incomeHistory.extra=1,x=>x.version='8.1']){
  const bad=copy(g);change(bad);assert.throws(()=>E.migrateCampaign(bad));
 }
 const old=E.createGame(options('core'));assert.equal(E.migrateCampaign(copy(old)).incomeHistoryVersion,undefined);
 const fake=copy(old);fake.players[0].incomeHistory=copy(g.players[0].incomeHistory);assert.throws(()=>E.migrateCampaign(fake),/Unversioned/);
 const view=E.publicState(g,0);view.rival.incomeHistory=copy(view.me.incomeHistory);assert.throws(()=>E.validateIncomeHistoryView(view),/rival/);
 const rules=E.campaignRules(g,{context:'game'}),caps=E.campaignCapabilities();assert.equal(E.peerRulesIssue(rules,caps),null);
 delete caps.incomeHistorySupported;assert.equal(E.peerRulesIssue(rules,caps).field,'incomeHistoryVersion');assert(E.campaignNeedsFreshHandshake(g));
 const p={stats:{loans:100,business:2,merchant:3},operatingReport:{cycle:1,loanIncome:5,commercialIncome:2,depositIncome:0,otherIncome:0,fundingCost:1,expense:2,chargeoff:0,eventAdjustment:0,profit:4,loanGrowth:0}};
 const book=E.IncomeHistory.append(E.IncomeHistory.create(p),p,1);assert.throws(()=>E.IncomeHistory.append(book,p,1));
 for(const mutate of [x=>x.records.push(copy(x.records[0])),x=>x.records[0].cycle=2,x=>x.records[0].loanIncome=NaN,x=>delete x.records[0].profit]){const bad=copy(book);mutate(bad);assert.throws(()=>E.IncomeHistory.validate(bad,1));}
});
test('the compact record domain stays bounded for 480 appends, without claiming a 480-month game simulation',()=>{
 const p={stats:{loans:100,business:2,merchant:3},operatingReport:{cycle:0,loanIncome:5,commercialIncome:2,depositIncome:0,otherIncome:0,fundingCost:1,expense:2,chargeoff:0,eventAdjustment:0,profit:4,loanGrowth:0}};
 let book=E.IncomeHistory.create(p);
 for(let cycle=1;cycle<=480;cycle++){p.operatingReport.cycle=cycle;book=E.IncomeHistory.append(book,p,cycle);}
 assert.equal(book.records.length,12);assert.equal(book.records[0].cycle,469);assert.equal(book.records.at(-1).cycle,480);assert(JSON.stringify(book).length<6500);
});

test('ordinary Core endings retain the terminal month once and rematch starts an empty current-rules book',()=>{
 for(const seed of [1,2]){
  const g=E.createGame({...E.previewCampaignEdition({},'core',{currentReporting:true}).options,mode:'hotseat',seed,created:1});
  for(let month=0;month<120&&!g.gameOver;month++){
   const plans=g.players.map((_,i)=>E.chooseBot(g,i));
   E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);
   for(const seat of [0,1])E.validateIncomeHistoryView(E.publicState(g,seat));
  }
  assert(g.gameOver,'The selected unmodified Core seed must reach a natural campaign ending');
  assert.equal(g.players[0].incomeHistory.lastCycle,g.cycle);
  assert.equal(g.players[0].incomeHistory.records.at(-1).cycle,g.cycle);
  const terminal=JSON.stringify(g);assert.throws(()=>E.submit(g,0,{}),/complete/);assert.equal(JSON.stringify(g),terminal);
  const restored=E.migrateCampaign(copy(g));E.validatePilot(restored);
  E.rematch(restored,0);E.rematch(restored,1);E.validatePilot(restored);
  assert.equal(restored.version,'8.16');assert(restored.players.every(p=>p.incomeHistory.records.length===0));
 }
});
