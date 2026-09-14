'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x));
const html=process.argv.includes('--portable')?require('node:fs').readFileSync(require('node:path').join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const context={console};vm.runInNewContext(source.replace('root.BWEngine={','root.BWEngine={withMarket,awardOpportunity,validateCreditSave,'),context);
const E=context.BWEngine;
function fixture(version=9){
 const g=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options,mode:'hotseat',seed:'commercial-credit-purpose',created:1});
 const p=g.players[0],o={...E.OPPORTUNITY_TYPES.loan,id:'regression-loan',type:'loan',market:p.focus,value:250000};
 // Isolated, already-won authorization fixture: not a simulated player victory.
 p.departmentFunctionDelivery={opportunity:{cycle:g.cycle,terms:{id:o.id,type:o.type,market:o.market,value:o.value,dept:o.dept},result:'won',awarded:false}};
 return {g,p,o};
}
function productTotals(p){return Object.fromEntries(Object.keys(E.CREDIT_TERMS).map(k=>[k,p.creditBook.cohorts.filter(c=>c.product===k).reduce((n,c)=>n+c.principal,0)]));}
test('Expanded commercial loan mandates create commercial vintages, not the ordinary portfolio mix',()=>{
 const {g,p,o}=fixture(),before=productTotals(p),allocation=copy(p.creditPortfolio.allocation),stats=copy(p.stats);
 E.withMarket(g,()=>E.awardOpportunity(p,o));const after=productTotals(p);
 assert.equal(after.middleMarket-before.middleMarket,o.value);
 assert.equal(after.mortgage-before.mortgage,0);assert.equal(after.consumer-before.consumer,0);
 assert.deepEqual(copy(p.creditPortfolio.allocation),allocation,'A single mandate must not rewrite the ordinary lending strategy');
 assert.equal(p.stats.loans-stats.loans,o.value);assert.equal(p.stats.deposits,stats.deposits);
 const fee=Math.round(o.value*.018);assert.equal(p.stats.cash-stats.cash,-o.value+fee);assert.equal(p.stats.capital-stats.capital,fee);
 E.validateCreditSave(g);
});
test('Commercial quotation is pure and agrees with the exact originated terms and withheld fee',()=>{
 const {g,p,o}=fixture(),before=JSON.stringify(g),q=E.opportunityCreditReview(p,o,g);
 assert.equal(JSON.stringify(g),before);assert(q.dedicated);assert.equal(q.parts.length,1);
 assert.equal(q.parts[0].product,'middleMarket');assert.equal(q.parts[0].months,48);
 assert.equal(q.netAdvance+q.fee,q.principal);assert.equal(q.fundingRequired,q.netAdvance);
 E.withMarket(g,()=>E.awardOpportunity(p,o));
 const c=p.creditBook.cohorts.find(c=>c.market===o.market&&c.product==='middleMarket'&&c.remaining===48);
 assert.equal(c.rate,q.parts[0].rate);assert.equal(c.risk,q.parts[0].risk);assert.equal(c.seasoning,2);
 const awarded=JSON.stringify(g);E.withMarket(g,()=>E.awardOpportunity(p,o));assert.equal(JSON.stringify(g),awarded,'Repeated award authorization cannot create another loan or fee');
});
test('Actual funding sales happen before the new commercial vintage, and reconcile without deposit creation',()=>{
 const {g,p,o}=fixture();o.value=4000000;p.departmentFunctionDelivery.opportunity.terms.value=o.value;
 const before=copy(p.accounting),deposits=p.stats.deposits,held=productTotals(p),q=E.opportunityCreditReview(p,o,g);assert(q.shortfall>0);
 E.withMarket(g,()=>E.awardOpportunity(p,o));E.validateCreditSave(g);
 assert.equal(productTotals(p).middleMarket-held.middleMarket,o.value);assert.equal(p.stats.deposits,deposits);
 const sales=p.accounting.journal.filter(e=>e.id>before.sequence&&e.source.startsWith('sell.'));
 assert(sales.length>0);assert(p.accounting.accounts.securities<before.accounts.securities);
 assert.equal(p.stats.capital-before.accounts.equity,q.fee+sales.reduce((n,e)=>n+e.earnings,0));
});
test('Historical Group7/8 awards retain the exact contributor implementation, including journal order',()=>{
 const cp=require('node:child_process'),path=require('node:path'),old=cp.execFileSync('git',['show','0159b9c:game/BRANCH_WARS.html'],{cwd:path.resolve(__dirname,'../..'),maxBuffer:32*1024*1024,windowsHide:true}).toString();
 const legacy={console};vm.runInNewContext(old.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={withMarket,awardOpportunity,'),legacy);
 for(const version of [7,8]){
  const {g,p,o}=fixture(version),other=copy(g),B=legacy.BWEngine;
  E.withMarket(g,()=>E.awardOpportunity(p,o));B.withMarket(other,()=>B.awardOpportunity(other.players[0],copy(o)));
  assert.deepEqual(copy(g),copy(other));assert.equal(E.opportunityCreditReview(p,o,g).dedicated,false);
 }
});
test('Ordinary two-bank pursuit resolves to one commercial book and survives half-ready recovery',()=>{
 if(!process.argv.includes('--portable'))process.argv.push('--source');
 const h=require('./github_resilience.test').harness();
 h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:9}).options,mode:'hotseat',seed:'commercial-mandate-0',created:1});
  gh.active=false;p2pRole='';target=game.opportunities.find(o=>o.type==='loan');if(!target)throw Error('The fixed ordinary opening no longer contains the loan mandate');
  plans=[];for(seat=0;seat<2;seat++){newDraft(currentView());draft=opportunityProposal(currentView(),draft,target.id,'vendor').candidate;draft.decision='b';plans.push(JSON.parse(JSON.stringify(draft)));}
  seat=0;newDraft(currentView());draft=plans[0];shown=renderOpportunityInspector(currentView(),target);
  E.submit(game,0,plans[0]);resumed=E.migrateCampaign(JSON.parse(JSON.stringify(game)));E.submit(game,1,plans[1]);E.submit(resumed,1,plans[1]);E.validatePilot(game);E.validateLedger(game);`);
 assert(h.run('shown.includes("Commercial loan mandate")&&shown.includes("48 months")&&shown.includes("withheld")'));
 // Migration removes the historical derived `strategy` compatibility cache.
 // Compare complete canonical saves, as the existing exact replay gates do.
 assert.deepEqual(copy(h.run('E.migrateCampaign(JSON.parse(JSON.stringify(game)))')),copy(h.run('E.migrateCampaign(JSON.parse(JSON.stringify(resumed)))')));
 assert.equal(h.run('game.players.filter(p=>p.departmentFunctionDelivery.opportunity?.result==="won").length'),1);
 assert.equal(h.run('game.players.flatMap(p=>p.creditBook.cohorts).filter(c=>c.product==="middleMarket").reduce((n,c)=>n+c.principal,0)'),h.run('target.value'));
 assert(h.run('E.publicState(game,1).rival.creditBook===undefined&&E.publicState(game,0).rival.departmentFunctionDelivery===undefined'));
 h.run(`winner=game.players.findIndex(p=>p.departmentFunctionDelivery.opportunity?.result==='won');originalPrincipal=target.value;
  plans=[];for(seat=0;seat<2;seat++){newDraft(currentView());draft.decision='b';plans.push(JSON.parse(JSON.stringify(draft)));}
  E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);E.validatePilot(game);E.validateLedger(game);`);
 assert(h.run('game.players[winner].creditBook.cohorts.filter(c=>c.product==="middleMarket").reduce((n,c)=>n+c.principal,0)<originalPrincipal'),'The won loan must enter ordinary amortization, not remain an isolated counter');
});
