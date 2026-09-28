'use strict';
// Expanded 9.40 bank-issued cards: the bank funds, owns and services its card
// book. Engine checks use the assembled source; the Cards panel uses the shared
// client harness. --portable runs the same checks on the built BRANCH_WARS.html.
// Research completion below is an explicit fixture.
if(!process.argv.includes('--portable')&&!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html,c={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={capitalRatio,riskAssets,'),c);
const E=c.BWEngine,C=E.PartnerCards,copy=x=>JSON.parse(JSON.stringify(x));
const FLAGS={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true,currentDigitalCommercial:true,currentPartnerCards:true,currentCardEconomics:true};
function create(bank=true,seed='bank-cards'){
 const g=E.createGame({...E.previewCampaignEdition({},'expanded',{...FLAGS,currentBankCards:bank}).options,mode:'hotseat',seed,scenario:'balanced',created:1,startingWorkforce:'covered'});
 for(const p of g.players)for(const key of ['digitalArchitecture','relationshipPlanning'])p.digitalCommercial.nodes[key]={funded:E.DigitalCommercial.NODES[key].cost,completed:1};
 return g;
}
// Seat 0 runs a card program on `route`; seat 1 keeps its cards locked.
function month(g,route,extra={}){
 const plans=g.players.map((_,i)=>E.chooseBot(g,i)),status=g.players[0].cardProgram.status;
 plans[0].cardPolicy=status==='unlaunched'?{action:'launch',intake:false,marketing:0,route}:{action:'none',intake:true,marketing:300,route};
 plans[1].cardPolicy={...C.defaults(g.players[1]),action:'none',intake:false,marketing:0};
 Object.assign(plans[0],extra);E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);
}
function valid(g){E.validatePilot(g);E.validateLedger(g);for(const i of [0,1])E.validateIncomeHistoryView(E.publicState(g,i));}
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}

test('9.40 is explicit, peer-gated and private to its owner',()=>{
 const g=create(),old=create(false);
 assert.equal(g.version,'9.40');assert.equal(old.version,'9.39');assert.equal(g.bankCardsVersion,1);assert.equal(old.bankCardsVersion,undefined);
 assert(g.players.every(p=>p.bankCardsVersion===1&&p.cardProgram.route===null&&p.cardProgram.totals.issuerIncome===0));
 assert(old.players.every(p=>p.bankCardsVersion===undefined&&!('route' in p.cardProgram)));
 for(const i of [0,1]){const v=E.publicState(g,i);assert.equal(v.bankCardsVersion,1);assert.equal(v.me.bankCardsVersion,1);assert.equal(v.rival.bankCardsVersion,undefined);assert.equal(v.rival.cardProgram,undefined);}
 assert.equal(E.campaignVersionSupported('9.40'),true);
 const caps=E.campaignCapabilities();assert.equal(caps.bankCardsSupported,1);
 assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps),null);
 const older={...caps};delete older.bankCardsSupported;assert(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),older));
 assert.equal(E.peerRulesIssue(E.campaignRules(old,{context:'game'}),older),null,'A 9.39 campaign still links to an older peer');
 assert.equal(E.previewCampaignEdition({},'expanded',{...FLAGS,currentCardEconomics:false,currentBankCards:true}).options.bankCardsVersion,undefined,'Bank cards need the 9.39 card economics');
});

test('a 9.40 instruction names its route, which is fixed once launched',()=>{
 const g=create(),p=g.players[0];
 assert.throws(()=>C.validatePlan(g,p,{cardPolicy:{action:'none',intake:false,marketing:0}}),/card instruction/);
 C.validatePlan(g,p,{cardPolicy:{action:'launch',intake:false,marketing:0,route:'bank'}});
 const weak=copy(g);weak.players[0].stats.capital=Math.floor(weak.players[0].stats.capital*.5);assert(E.capitalRatio(weak.players[0])<10);
 assert.throws(()=>C.validatePlan(weak,weak.players[0],{cardPolicy:{action:'launch',intake:false,marketing:0,route:'bank'}}),/capital ratio of at least 10%/);
 C.validatePlan(weak,weak.players[0],{cardPolicy:{action:'launch',intake:false,marketing:0,route:'partner'}});
 const locked=create();locked.players[0].digitalCommercial.nodes.digitalArchitecture={funded:0,completed:0};
 assert.throws(()=>C.validatePlan(locked,locked.players[0],{cardPolicy:{action:'launch',intake:false,marketing:0,route:'bank'}}),/before issuing your own cards/);
 month(g,'bank');assert.equal(g.players[0].cardProgram.route,'bank');assert.equal(g.players[0].cardProgram.totals.setup,C.BANK.setup);
 assert.throws(()=>C.validatePlan(g,g.players[0],{cardPolicy:{action:'none',intake:true,marketing:0,route:'partner'}}),/route is fixed/);
});

// One campaign serves the book, loss and privacy checks. One account's outside
// wallet is emptied each month by a balanced transfer to merchants, so the
// customer genuinely cannot pay; the card market's cash is conserved.
const g=create(),receivablesBefore=g.players[0].accounting.accounts.receivables;
let drained=null;
for(let m=1;m<=11;m++){
 month(g,'bank');
 const b=g.players[0].cardProgram,M=g.cardMarket;
 if(!drained&&b.accounts.length)drained=b.accounts[0].id;
 const a=b.accounts.find(x=>x.id===drained);
 if(a&&a.wallet.accounts.cash){const x=a.wallet.accounts.cash;a.wallet=E.GroupAccounting.post(a.wallet,'test.drain','cards:merchants',{cash:-x,equity:-x},-x);M.merchant=E.GroupAccounting.post(M.merchant,'test.drain',a.id,{cash:x,equity:x},x);}
}

test('the bank owns the book: receivables, cash and income reconcile and Cedar holds nothing',()=>{
 valid(g);const p=g.players[0],b=p.cardProgram,net=C.bankReceivables(p);
 assert(net>0,'The bank carries card balances');
 assert.equal(p.accounting.accounts.receivables-receivablesBefore,net,'Card balances are the bank’s receivables, net of allowance');
 assert.equal(C.claims(g),0,'Cedar owns no bank-issued balance');
 assert(E.riskAssets(p)>=p.stats.loans+net,'Card balances count toward capital');
 for(const r of b.history)assert.equal(r.issuerIncome,r.interestAccrued+r.interchange+r.recoveries-r.provision-r.disputeLoss);
 assert(b.history.some(r=>r.interestAccrued>0)&&b.history.some(r=>r.interchange>0));
 assert(b.history.every(r=>r.feesPaid===0),'No partner compensation on the bank route');
 const purchases=b.history.reduce((n,r)=>n+r.purchases,0),kept=b.history.reduce((n,r)=>n+r.interchange,0);
 assert(Math.abs(kept-purchases*C.BANK.issuerBp/10000)<=b.history.length*b.accounts.length,'The bank keeps 2.2% of purchases');
 assert.equal(b.totals.issuerIncome,b.history.reduce((n,r)=>n+r.issuerIncome,0));
});

test('a customer who cannot pay is provisioned and charged off against the bank',()=>{
 const b=g.players[0].cardProgram,a=b.accounts.find(x=>x.id===drained);
 assert(a.chargedOff>0||a.closed,'The drained account reaches charge-off');
 const chargeoffs=b.history.reduce((n,r)=>n+r.chargeoffs,0),provisions=b.history.reduce((n,r)=>n+r.provision,0);
 assert(chargeoffs>0);assert(provisions>=chargeoffs-b.history.reduce((n,r)=>n+r.recoveries,0)-C.bankReceivables(g.players[0]),'Charge-offs were provisioned through bank earnings');
 assert(!g.companyControlMarket.lender.journal?.some?.(e=>String(e.counterparty||e.entity||'').includes(drained)),'Cedar posts nothing for a bank-issued account');
});

// Kernel fixture, as in partner_card_economics: cards settle alone, so the
// department reserve fixes exactly how much protected cash is left. No other
// monthly step runs, so the card book and bank accounts are checked directly.
function settleOnly(h,reserve){
 for(const p of h.players)p._departmentFunctionExecution={rows:['technology','risk'].map(id=>({id,workload:4,delivered:{served:4}}))};
 C.settle(h,[{cardPolicy:{action:'none',intake:false,marketing:0,route:'bank'},departmentPolicy:{reserve}},{cardPolicy:{...C.defaults(h.players[1]),action:'none',intake:false,marketing:0}}]);
 h.cycle++;C.validate(h,'game');for(const p of h.players)E.AccountingPrototype.check(p.accounting);
 return h.players[0].cardProgram.history.at(-1);
}
const protectedCash=p=>p.stats.cash-Math.ceil(p.stats.deposits*.02)-p.accounting.accounts.payables;
test('bank-funded purchases stop at protected cash; with none the program pauses',()=>{
 const h=copy(g),p=h.players[0],live=p.cardProgram.accounts.filter(a=>!a.closed&&!a.chargedOff).length,running=C.BANK.monthly+live*C.BANK.perAccount;
 const reserve=protectedCash(p)-running-100,r=settleOnly(h,reserve),q=h.players[0];
 assert.equal(r.costs,running,'The program ran this month');assert(r.failedSettlement>0,'Purchases beyond protected cash were declined');
 assert.equal(r.purchases+r.reversed+r.failedSettlement,r.authorized);
 assert(protectedCash(q)-reserve>=0,'Funded purchases never dipped into the reserve');
 const x=copy(g),none=settleOnly(x,Math.max(0,protectedCash(x.players[0])));
 assert.equal(none.suspended,true);assert.equal(x.players[0].cardProgram.status,'paused');
 assert.equal(none.costs,0);assert.equal(none.purchases,0);assert.equal(none.acquired,0);
});

test('at scale the bank route out-earns the partner route; a small book does not repay its platform',()=>{
 // Card-only 36 months on the settle kernel. Faster growth advertises at the
 // maximum until 30 live accounts; cautious growth never advertises.
 const run=(route,faster)=>{
  const h=create(true,'card-kernel'),p=h.players[0];
  const step=cardPolicy=>{
   for(const q of h.players)q._departmentFunctionExecution={rows:['technology','risk'].map(id=>({id,workload:4,delivered:{served:4}}))};
   C.settle(h,[{cardPolicy},{cardPolicy:{...C.defaults(h.players[1]),action:'none',intake:false,marketing:0}}]);h.cycle++;C.validate(h,'game');
  };
  step({action:'launch',intake:false,marketing:0,route});
  for(let m=2;m<=36;m++){const live=p.cardProgram.accounts.filter(a=>!a.closed&&!a.chargedOff).length;step({action:'none',intake:true,marketing:faster&&live<30?1000:0,route});}
  const b=p.cardProgram,t=b.totals;
  return {cumulative:(route==='bank'?t.issuerIncome:t.feesPaid)-t.setup-t.costs-t.marketing,lastYear:b.history.reduce((n,r)=>n+r.contribution,0)};
 };
 const partner=run('partner',true),bank=run('bank',true),small=run('bank',false);
 assert(bank.lastYear>2*partner.lastYear,'A full bank-issued book earns well over twice the partner share: '+JSON.stringify({bank,partner}));
 assert(bank.cumulative>0,'Faster growth repays the bank platform within 36 months');
 assert(small.cumulative<0,'A cautious bank-issued book has not repaid its platform by month 36');
});

test('save, restore and rematch keep the 9.40 book and rules',()=>{
 const restored=E.migrateCampaign(copy(g));assert.deepEqual(copy(restored.players.map(p=>p.cardProgram)),copy(g.players.map(p=>p.cardProgram)));
 const a=copy(g);month(a,'bank');month(restored,'bank');assert.equal(JSON.stringify(E.migrateCampaign(copy(a))),JSON.stringify(E.migrateCampaign(copy(restored))));
 const done=copy(g);done.gameOver=true;E.rematch(done,0);E.rematch(done,1);
 assert.equal(done.version,'9.40');assert(done.players.every(p=>p.bankCardsVersion===1&&p.cardProgram.route===null&&p.cardProgram.status==='unlaunched'));
});

test('the AI issues its own cards only when well capitalised with spare cash',()=>{
 const x=create();const p=x.players[1];
 const plan=C.bot(x,1,{});assert.equal(plan.cardPolicy.action,'launch');
 assert.equal(plan.cardPolicy.route,E.capitalRatio(p)>=14&&p.stats.cash>1200000?'bank':'partner');
 const thin=copy(x);thin.players[1].stats.cash=900000;assert.equal(C.bot(thin,1,{}).cardPolicy.route,'partner');
});

test('Banking → Cards compares the routes, then shows the bank’s own results',()=>{
 const {harness}=require('./github_resilience.test'),h=harness(),original=h.c.document.querySelector;
 h.c.document.querySelector=selector=>{const node=original(selector);if(node.financeReady)return node;node.financeReady=true;node.addEventListener=function(event,fn){this.listeners[event]=fn;};node.insertAdjacentHTML=function(where,html){this.adjacentHTML=(this.adjacentHTML||'')+html;};let content='';
  Object.defineProperty(node,'innerHTML',{configurable:true,get:()=>content,set:x=>{content=x;}});return node;};
 h.c.opts={...E.previewCampaignEdition({},'expanded',{...FLAGS,currentBankCards:true}).options,seed:9,created:1,mode:'hotseat',startingWorkforce:'covered'};
 h.run("game=E.createGame(opts);seat=0;gh.active=false;p2pRole='';for(const p of game.players)for(const key of ['digitalArchitecture','relationshipPlanning'])p.digitalCommercial.nodes[key]={funded:E.DigitalCommercial.NODES[key].cost,completed:1};newDraft(currentView());draft.decision='b';errors=[];toast=x=>errors.push(x);interfaceSetLocation=()=>{};renderReady=()=>{};");
 const render=objectId=>{h.run(`interfaceState.route=${JSON.stringify({workspace:'banking',view:'cards',context:{objectId}})};renderInterfaceBanking(currentView(),interfaceState.route,$('#testMount'));`);return (h.elements.get('#financeDetail').adjacentHTML||'')+(h.elements.get('#financeDetail').innerHTML||'')+(h.elements.get('#financeEditorMount').innerHTML||'')+(h.elements.get('#financeEditorMount').adjacentHTML||'');};
 const before=render('program');
 assert.match(before,/Partner-issued \(Cedar Reserve\)/);assert.match(before,/Bank-issued \(your bank\)/);assert.match(before,/count toward your capital ratio/);assert.match(before,/Who issues the cards/);
 h.run("{const plans=game.players.map((_,i)=>E.chooseBot(game,i));plans[0].cardPolicy={action:'launch',intake:false,marketing:0,route:'bank'};plans[1].cardPolicy={...E.PartnerCards.defaults(game.players[1]),action:'none',intake:false,marketing:0};E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);newDraft(currentView());}");
 const program=render('program'),results=render('results');
 assert.match(program,/Your bank’s card program/);assert.doesNotMatch(program,/Who issues the cards/);
 assert.match(results,/Card income after losses/);assert.match(results,/Interchange kept/);
 for(const text of [before,program,results])assert.doesNotMatch(text,/NaN|undefined/);
});

console.log('Bank-issued cards passed: '+checks+' checks on the 9.40 boundary, the bank-owned book, losses, protected cash, calibration, persistence, AI and presentation.');
