'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(html){const c={Math:Object.assign(Object.create(Math),{random:()=>.375}),Date:class extends Date{static now(){return 123456;}}};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=load(require('../tools/build_game').assemble().html);
function fresh(funded=false){const options={...E.previewCampaignEdition({},'expanded').options};
 // This fixture targets historical 9.22, not whichever edition is newest.
 // Hidden scalar rules cannot be selected with the checkbox-proposal API.
 for(const field of ['companySharesVersion','companyControlVersion','companyConsolidationVersion','companyControlStrategyVersion','sharedPremisesVersion'])delete options[field];
 const g=E.createGame({...options,seed:'investment-strategy',mode:'hotseat',created:1});
 // Explicit external shareholder fixture, not ordinary AI balance evidence.
 if(funded)for(const p of g.players)p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1500000,equity:1500000});return g;
}
function step(g,plans){let n=copy(g);E.submit(n,0,copy(plans[0]));n=E.migrateCampaign(n);E.submit(n,1,copy(plans[1]));E.validatePilot(n);E.validateLedger(n);for(const i of [0,1])E.validateFinancialGroupView(E.publicState(n,i));return n;}

test('strategy version is explicit, peer-gated and preserved through rematch; marker drift is rejected',()=>{
 const g=fresh();assert.equal(g.version,'9.22');
 for(const change of [x=>delete x.investmentStrategyVersion,x=>x.investmentStrategyVersion=2,x=>x.version='9.21',x=>delete x.creditProductsVersion]){const n=copy(g);change(n);assert.throws(()=>E.migrateCampaign(n));}
 const caps=E.campaignCapabilities();delete caps.investmentStrategySupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'investmentStrategyVersion');
 const v=E.publicState(g,0);delete v.investmentStrategyVersion;assert.throws(()=>E.validateFinancialGroupView(v));
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.22');E.validatePilot(g);
});

test('pure review distinguishes advice/brokerage, ignores private rivals and cannot fund launch from staged dividends',()=>{
 const g=fresh(true),plan=E.chooseBot(g,0),v=E.publicState(g,0);v.me.doctrine='digital';plan.agencyPolicy.capital=0;plan.agencyPolicy.launch=false;
 const base=JSON.stringify({v,plan}),q=E.investmentStrategyReview(v,plan);assert(q.plan.investmentPolicy.institution.launch);assert(q.plan.investmentPolicy.institution.advice);assert.equal(q.plan.investmentPolicy.institution.provider,'harbor');assert(q.plan.investmentPolicy.institution.capital<=v.me.financialGroup.parent.accounts.cash);
 assert.equal(JSON.stringify({v,plan}),base);
 const changed=copy(v);changed.rival={id:'unavailable',secretAssets:999999999};assert.deepEqual(copy(E.investmentStrategyReview(changed,plan)),copy(q));
 changed.me.doctrine='commercial';const commercial=E.investmentStrategyReview(changed,plan);assert(commercial.plan.investmentPolicy.institution.brokerage);assert.equal(commercial.plan.investmentPolicy.institution.roles.principal,1);assert.equal(commercial.plan.investmentPolicy.institution.custody,'external');
 changed.me.financialGroup.parent.accounts.cash=0;plan.groupPolicy.bankDividend=1000000;const unfunded=E.investmentStrategyReview(changed,plan);assert.equal(unfunded.plan.investmentPolicy.institution.launch,false);assert.equal(unfunded.plan.investmentPolicy.institution.capital,0);
});

test('funded whole campaigns exercise ordinary AI launch, credentials, client acquisition, cash funding and portfolio work',()=>{
 let g=fresh(true),launched=false,won=false,funded=false,traded=false,liquidityNotEquity=false;
 for(let month=0;month<16;month++){
  const plans=g.players.map((p,i)=>E.chooseBot(g,i));
  for(const [i,p]of g.players.entries())if(plans[i].investmentPolicy.funding.length){const v=E.publicState(g,i),budget=E.planBudget(v.me,plans[i],v);if(budget.remaining<p.stats.deposits*.1)liquidityNotEquity=true;}
  g=step(g,plans);launched ||=g.players.some(p=>p.investmentBusiness.status==='active');won ||=g.investmentEconomy.world.clients.some(c=>c.owner);funded ||=g.investmentEconomy.links.transfers.some(t=>t.destination==='cash');traded ||=g.investmentEconomy.world.trading.receipts.some(t=>t.units>0);
  if(g.gameOver)break;
 }
 assert(launched,'Ordinary AI must actually form a funded business');assert(won,'Live permissions must reach acquisition');assert(funded,'Owned customers must receive real existing bank savings');assert(traded,'Qualified portfolio work must reach a paid fill');assert(liquidityNotEquity,'Deposit withdrawals cannot be disabled by discretionary equity headroom');
});

test('immutable checkpoint36 9.21 AI, human turns, RNG, saves, views and rematch are unchanged',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_lending1_36_9d4aa4d5.html'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'9d4aa4d5d969ea95864f5f76a53b6adc6623a171aa72968a3d6f9ed3a3a69b35');const O=load(bytes.toString());
 for(const scenario of ['balanced','rate','regulatory','growth']){
  const config={...O.previewCampaignEdition({},'expanded').options,scenario,seed:67,created:1,mode:'hotseat'};let a=O.createGame(config),b=E.createGame(config);assert.deepEqual(copy(a),copy(b));
  for(let month=0;month<3;month++){
   const pa=a.players.map((p,i)=>O.chooseBot(a,i)),pb=b.players.map((p,i)=>E.chooseBot(b,i));assert.deepEqual(copy(pa),copy(pb));
   if(month===1){pa[0].groupPolicy.creditAllocation={mortgage:0,middleMarket:0,consumer:0,smallBusiness:50,commercialProperty:50};pb[0].groupPolicy.creditAllocation=copy(pa[0].groupPolicy.creditAllocation);}
   O.submit(a,0,pa[0]);E.submit(b,0,pb[0]);a=O.migrateCampaign(copy(a));b=E.migrateCampaign(copy(b));assert.deepEqual(copy(a),copy(b));O.submit(a,1,pa[1]);E.submit(b,1,pb[1]);assert.deepEqual(copy(a),copy(b));
   for(const i of [0,1])assert.deepEqual(copy(O.publicState(a,i)),copy(E.publicState(b,i)));
  }
  for(const [engine,g]of [[O,a],[E,b]]){g.gameOver=true;engine.rematch(g,0);engine.rematch(g,1);}assert.deepEqual(copy(a),copy(b));
 }
});
