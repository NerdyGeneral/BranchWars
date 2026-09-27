'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html,c={};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,M=E.MonetaryPolicy,copy=x=>JSON.parse(JSON.stringify(x)),flags={currentEconomics:true,currentRivalry:true,currentLending:true,currentMonetaryPolicy:true};
const create=(seed='fed-unit',scenario='balanced')=>E.createGame({...E.previewCampaignEdition({},'expanded',flags).options,mode:'hotseat',seed,scenario,created:1});
const sync=p=>Object.assign(p.stats,{cash:p.accounting.accounts.cash,loans:p.accounting.accounts.loans,deposits:p.accounting.accounts.deposits,capital:p.accounting.accounts.equity,emergencyDebt:p.accounting.accounts.emergencyDebt,earnings:p.accounting.retainedEarnings});
test('new Expanded boundary is explicit, Core and historical defaults retain their rules',()=>{
 const old=E.createGame({...E.previewCampaignEdition({},'expanded',{...flags,currentMonetaryPolicy:false}).options,mode:'hotseat',seed:1,created:1});
 assert.equal(old.version,'9.34');assert.equal(old.monetaryPolicy,undefined);
 const core=E.createGame({...E.previewCampaignEdition({},'core',{...flags,currentResearch:true}).options,mode:'hotseat',seed:1,created:1});
 assert.equal(core.version,'8.20');assert.equal(core.monetaryPolicy,undefined);
 const g=create();assert.equal(g.version,'9.35');assert.deepEqual(copy(E.migrateCampaign(g)),copy(g));
 assert.throws(()=>E.createGame({monetaryPolicyVersion:1,seed:1}),/requires/);
 const caps=copy(E.campaignCapabilities());delete caps.monetaryPolicySupported;
 assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'monetaryPolicyVersion');
});
test('fixed coupons stay fixed, liquid income reprices, and duration drives opposite sale values',()=>{
 const g=create(),p=g.players[0],anchor=p.treasury.anchorBp,before=JSON.stringify(g);
 const q=M.quote(p,g,50);assert.equal(q.difference.loanInterest,0);
 const v=E.publicState(g,0);assert.deepEqual(copy(M.quote(v.me,v,50)),copy(q),'Private owner view and authoritative bank must quote identical rates');
 const expected=Math.round(p.treasury.liquid*(anchor+50)/120000+p.treasury.holdings.reduce((n,h)=>n+h.principal*h.couponBp/120000,0));
 assert.equal(q.scenario.securitiesInterest,expected);assert(q.difference.securitiesValue<0);
 assert(M.quote(p,g,-50).difference.securitiesValue>0);assert.equal(JSON.stringify(g),before,'Scenario mutates neither books nor RNG');
 const h={principal:1e6,couponBp:450,term:24,remaining:24};
 const manual=Array.from({length:24},(_,i)=>3750/Math.pow(1+550/120000,i+1)).reduce((a,b)=>a+b,0)+1e6/Math.pow(1+550/120000,24);
 assert(Math.abs(M.holdingValue(h,475)-manual)<1e-7);
 assert(1e6-M.holdingValue(h,475)>1e6-M.holdingValue({...h,remaining:6},475));
});
test('the same hike helps a liquid bank and hurts a fixed-asset bank with variable deposits',()=>{
 const g=create(),p=g.players[0],face=p.accounting.accounts.securities,up=g.monetaryPolicy.upperBp;
 const liquid=copy(p),fixed=copy(p);liquid.treasury.liquid=face;liquid.treasury.holdings=[];
 fixed.treasury.liquid=0;fixed.treasury.holdings=[{principal:face,couponBp:up+75,term:24,remaining:24}];
 assert(M.quote(liquid,g,50).difference.netInterest>0);assert(M.quote(fixed,g,50).difference.netInterest<0);
 assert(M.quote(liquid,g,-50).difference.netInterest<0);assert(M.quote(fixed,g,-50).difference.netInterest>0);
});
test('early sales settle at market value, preserve cost and reconcile realized gains or losses',()=>{
 for(const delta of [-100,100]){
  const p=create().players[0],face=p.accounting.accounts.securities,anchor=p.treasury.anchorBp;
  p.treasury.liquid=0;p.treasury.holdings=[{principal:face,couponBp:anchor+75,term:24,remaining:24}];p.treasury.anchorBp+=delta;
  const expected=Math.round(M.holdingValue(p.treasury.holdings[0],p.treasury.anchorBp)),cash=p.stats.cash,equity=p.stats.capital,earnings=p.stats.earnings;
  M.sellForCash(p,expected+100);assert.equal(p.stats.cash,cash+expected);assert.equal(p.accounting.accounts.securities,0);
  assert.equal(p.stats.capital,equity+expected-face);assert.equal(p.stats.earnings,earnings+expected-face);assert.equal(E.AccountingPrototype.check(p.accounting).residual,0);
  assert.equal(p.treasury.holdings.length,0);assert(delta>0?expected<face:expected>face);
 }
 const p=create().players[0],floating=p.treasury.liquid,fixed=JSON.stringify(p.treasury.holdings),earnings=p.stats.earnings;
 M.sellForCash(p,12345);assert.equal(p.treasury.liquid,floating-12345);assert.equal(JSON.stringify(p.treasury.holdings),fixed);assert.equal(p.stats.earnings,earnings);
});
test('maturity returns principal at par; reinvestment is funded and pays next month',()=>{
 const g=create(),p=g.players[0],face=p.accounting.accounts.securities;
 p.treasury.liquid=0;p.treasury.holdings=[{principal:face,couponBp:p.treasury.anchorBp+25,term:6,remaining:1}];p.treasury.policy='liquid';
 const net=p.stats.cash+face,earnings=p.stats.earnings,equity=p.stats.capital;
 M.finish(g,p);assert.equal(p.treasury.holdings.length,0);assert.equal(p.stats.cash+p.accounting.accounts.securities,net);
 assert.equal(p.stats.capital,equity);assert.equal(p.stats.earnings,earnings);assert.equal(p.treasury.asOfCycle,1);
 assert.equal(p.stats.cash,Math.ceil(p.stats.deposits*.15)+(p.accounting.accounts.payables||0));
 assert.equal(p.accounting.journal.find(e=>e.source==='treasury.maturity').earnings,0);
 assert.throws(()=>M.finish(g,p),/already settled/);
 const debt=create(),bank=debt.players[0];bank.accounting=E.AccountingPrototype.transact(bank.accounting,'borrow',1e6);sync(bank);
 const seq=bank.accounting.sequence;M.finish(debt,bank);assert(!bank.accounting.journal.some(e=>e.id>seq&&e.source==='buySecurities'));
});
test('emergency interest uses opening debt and anchor plus 825bp, without charging new debt twice',()=>{
 const g=create(),p=g.players[0];p.treasury.anchorBp=375;p.treasury.openingDebt=1e6;
 assert.equal(M.debtInterest(p),10000);assert(Math.abs(M.debtInterest(p,475)-M.debtInterest(p,375)-1e6/1200)<1e-8);
 p.accounting=E.AccountingPrototype.transact(p.accounting,'borrow',2e6);sync(p);assert.equal(M.debtInterest(p),10000);
 g.cycle=2;M.advance(g);assert.equal(p.treasury.openingDebt,2e6);
});
test('Fed decisions use their own stream, retain holds, obey calendar and bounds',()=>{
 const g=create(),baseline=JSON.stringify(g.rng),rate=g.economy.rate;
 g.cycle=2;assert.equal(M.advance(g),null);assert.equal(g.economy.rate,rate);
 for(let cycle=3;cycle<=39;cycle++){
  g.cycle=cycle;g.economy.key=cycle<20?'tight':'downturn';const before=g.economy.rate,row=M.advance(g);
  if(cycle%2)assert.match(row,/FEDERAL FUNDS/);else assert.equal(g.economy.rate,before);
  assert(g.economy.rate>=.25&&g.economy.rate<=10);assert.equal(g.economy.rate*100,g.monetaryPolicy.upperBp);
 }
 assert.equal(g.monetaryPolicy.history.length,12);assert.equal(g.monetaryPolicy.nextDecision,41);assert.equal(JSON.stringify(g.rng),baseline);
 // Calling twice cannot publish twice or consume another draw.
 const state=JSON.stringify(g.monetaryPolicy);assert.equal(M.advance(g),null);assert.equal(JSON.stringify(g.monetaryPolicy),state);
});
test('invalid saved books, schedules, RNG, forged policy and rival secrets fail closed',()=>{
 const g=create();
 for(const change of [x=>delete x.monetaryPolicyVersion,x=>x.monetaryPolicy.rngState=-1,x=>x.monetaryPolicy.nextDecision=2,x=>x.economy.rate+=.25,x=>x.players[0].treasury.liquid++,x=>x.players[0].treasury.holdings[0].remaining=99,x=>x.players[0].treasury.policy='free money',x=>x.players[0].treasury.extra=true]){
  const bad=copy(g);change(bad);const before=JSON.stringify(bad);assert.throws(()=>E.migrateCampaign(bad));assert.equal(JSON.stringify(bad),before);
 }
 const v=E.publicState(g,0);M.validate(v,'view');assert.equal(v.monetaryPolicy.rngState,undefined);assert.equal(v.rival.treasury,undefined);
 for(const change of [x=>x.rival.treasury=copy(g.players[1].treasury),x=>x.monetaryPolicy.rngState=123,x=>x.me.pendingTreasuryPolicy='fixed']){const bad=copy(v);change(bad);assert.throws(()=>M.validate(bad,'view'));}
 assert.throws(()=>M.validatePlan(g.players[0],{treasuryPolicy:'invalid'}));assert.throws(()=>M.validatePlan({},{treasuryPolicy:'liquid'}));
});
test('actual turns preserve half-ready recovery, announcements, private policies, and rematch rules',()=>{
 const g=create('fed-turns');
 for(let month=1;month<=3;month++){
  const plans=g.players.map((p,i)=>E.chooseBot(g,i));plans[0].treasuryPolicy='fixed';plans[0].announcement={audience:'shareholders',text:'We fixed the coupons, not the election.'};
  const rng=JSON.stringify(g.monetaryPolicy);E.submit(g,0,plans[0]);assert.equal(JSON.stringify(g.monetaryPolicy),rng);
  const own=E.publicState(g,0),other=E.publicState(g,1);assert.equal(own.me.pendingTreasuryPolicy,'fixed');assert.equal(other.rival.pendingTreasuryPolicy,undefined);M.validate(own,'view');M.validate(other,'view');
  const restored=E.migrateCampaign(g);E.submit(g,1,plans[1]);E.submit(restored,1,copy(plans[1]));assert.deepEqual(copy(g),copy(restored));
  assert.match(g.resolution[0],/We fixed the coupons/);assert.equal(g.resolution.filter(s=>s.startsWith('FEDERAL FUNDS')).length,month===2?1:0);
  if(month===2)assert.match(g.resolution[1],/Month 3/);
  assert.deepEqual(copy(E.migrateCampaign(g)),copy(g));for(const seat of [0,1]){const v=E.publicState(g,seat);E.validateIncomeHistoryView(v);assert.equal(v.lastPlans[v.rival.id].treasuryPolicy,undefined);}
 }
 g.gameOver=true;assert.equal(E.rematch(g,0),false);assert.equal(E.rematch(g,1),true);assert.equal(g.version,'9.35');assert.equal(g.monetaryPolicy.history.length,0);assert.equal(g.cycle,1);M.validate(g,'game');
});
test('operating forecast and actual report bill opening emergency debt at the same rate',()=>{
 const g=create('fed-borrowing'),p=g.players[0];p.accounting=E.AccountingPrototype.transact(p.accounting,'borrow',1e6);sync(p);p.treasury.openingDebt=1e6;
 const plans=g.players.map((owner,seat)=>E.chooseBot(g,seat)),expected=1e6*(g.monetaryPolicy.upperBp+825)/120000;
 const view=E.publicState(g,0),forecast=E.operatingPreview(view.me,plans[0],view.economy,view);
 assert(Math.abs(forecast.fundingCost-forecast.depositInterest-expected)<1e-7);
 E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);const actual=g.players[0].operatingReport;
 assert(Math.abs(actual.fundingCost-actual.depositInterest-expected)<1e-7);assert.equal(g.players[0].treasury.openingDebt,g.players[0].stats.emergencyDebt);
 assert.deepEqual(copy(E.migrateCampaign(g)),copy(g));
});
test('client dealer inventory cannot sell a fixed bank holding at par',()=>{
 const g=create('fed-dealer'),plans=g.players.map((p,i)=>E.chooseBot(g,i)),p=g.players[0],bad=copy(plans[0]);
 bad.investmentPolicy.inventorySale=p.treasury.liquid+100;const before=JSON.stringify(g);
 assert.throws(()=>E.submit(g,0,bad),/exceeds liquid bank securities/);assert.equal(JSON.stringify(g),before);
 plans[0].treasuryPolicy='liquid';plans[0].investmentPolicy.inventorySale=10000;
 const fixed=copy(p.treasury.holdings).filter(h=>h.remaining>1).map(h=>({...h,remaining:h.remaining-1}));
 E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);const settled=g.players[0];assert.equal(settled.investmentAssetReport.paid,10000);
 assert.deepEqual(copy(settled.treasury.holdings),fixed);M.validate(g,'game');assert.deepEqual(copy(E.migrateCampaign(g)),copy(g));
});
