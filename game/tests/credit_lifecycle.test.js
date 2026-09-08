'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
for(const script of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={repayCredit,operate,syncAccounts,'),ctx);
const E=ctx.BWEngine,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x)),create=seed=>E.createGame({campaignRulesVersion:1,fundingCovenantVersion:0,seed,created:1,mode:'hotseat',scenario:'balanced'});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const turn=g=>{E.submit(g,0,E.chooseBot(g,0));E.submit(g,1,E.chooseBot(g,1))};
const g=create('credit-opening');E.validatePilot(g);assert.equal(g.creditLifecycleVersion,1);
const p=g.players[0],before=copy(p.accounting),due=E.creditSummary(p).nextPrincipal;
assert.equal(E.repayCredit(p),due);A.check(p.accounting);E.validatePilot(g);
assert.equal(p.stats.cash-before.accounts.cash,due);assert.equal(before.accounts.loans-p.stats.loans,due);
assert.equal(p.accounting.retainedEarnings,before.retainedEarnings);assert.equal(p.accounting.accounts.equity,before.accounts.equity);
for(let i=1;i<48;i++)E.repayCredit(p);
assert.equal(p.stats.loans,0);assert.equal(p.creditBook.cohorts.length,0);assert.equal(p.stats.cash,before.accounts.cash+before.accounts.loans);E.validatePilot(g);
// Existing loans cannot be repriced or de-risked by changing next month's product/underwriting.
const fixed=create('fixed'),view=E.publicState(fixed,0),plan={allocation:{service:3,business:2,lending:0,operations:3},products:{...view.me.products},depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced'};
const snapshot=JSON.stringify(fixed),f1=E.operatingPreview(view.me,plan,fixed.economy),f2=E.operatingPreview(view.me,{...plan,products:{...plan.products,credit:'consumer'},lendingPolicy:'growth'},fixed.economy);
assert.equal(f1.loanIncome,f2.loanIncome);assert.equal(f1.chargeoff,f2.chargeoff);assert.equal(f1.principalRepaid,f2.principalRepaid);assert.equal(JSON.stringify(fixed),snapshot);assert.equal(view.rival.creditBook,undefined);
// New loans do use the chosen term, rate and risk; local and aggregate principal agree.
const newLoans=create('new credit'),np=newLoans.players[0];np.products.credit='consumer';np.policies.lending='growth';
E.operate(newLoans,np,false);delete np.marketSupply;E.validatePilot(newLoans);assert(np.creditBook.cohorts.some(c=>c.product==='consumer'&&c.remaining===24&&c.risk===18415));
assert(np.operatingReport.principalRepaid>0);assert.equal(np.operatingReport.loanGrowth,np.stats.loans-9500000);
// Acquiring loans preserves contractual attributes rather than restarting the clock.
const deal=create('credit deal'),seller=deal.players[1],buyer=deal.players[0],target='northside';
for(const c of seller.creditBook.cohorts){c.remaining=7;c.rate=3210;c.risk=12345}
const terms=E.acquisitionTerms(deal,buyer,target);
E.finishProject(deal,buyer,{key:'acquisition',target});E.validatePilot(deal);
assert.equal(buyer.creditBook.cohorts.filter(c=>c.market===target&&c.remaining===7&&c.rate===3210&&c.risk===12345).reduce((n,c)=>n+c.principal,0),terms.loanTake);
// Forced loan sales shrink cohorts without resetting survivors.
const sale=create('credit sale'),sp=sale.players[0];
sp.accounting=A.sell(sp.accounting,'loans',1000000,600);E.syncAccounts(sp);E.validatePilot(sale);
assert.equal(E.creditSummary(sp).principal,8500000);assert(sp.creditBook.cohorts.every(c=>[12,24,36,48].includes(c.remaining)));
// A liquidity-stressed seller must preserve promised loans while selling other assets.
const stressed=create('credit stressed deal'),ss=stressed.players[1],spent=ss.stats.cash+ss.accounting.accounts.securities;
ss.accounting=A.post(ss.accounting,'test.expense',{cash:-ss.stats.cash,securities:-ss.accounting.accounts.securities,equity:-spent},-spent);E.syncAccounts(ss);
E.finishProject(stressed,stressed.players[0],{key:'acquisition',target:'northside'});E.validatePilot(stressed);assert(ss.accounting.journal.some(e=>e.source==='sell.loans'));

for(const mutate of [
 x=>{x.creditLifecycleVersion=2},x=>{delete x.creditLifecycleVersion},
 x=>{x.players[0].creditBook.cohorts[0].principal++},
 x=>{x.players[0].creditBook.cohorts[0].remaining=0},
 x=>{x.players[0].creditBook.cohorts[0].rate=NaN}
]){const x=copy(fixed);mutate(x);assert.throws(()=>client.migrate(x),/credit|Credit/)}
const old=E.createGame({campaignRulesVersion:1,creditLifecycleVersion:0,seed:1});
assert.equal(client.migrate(copy(old)).creditLifecycleVersion,undefined);old.gameOver=true;E.rematch(old,0);E.rematch(old,1);assert.equal(old.creditLifecycleVersion,undefined);
const fresh=create('credit rematch');fresh.gameOver=true;E.rematch(fresh,0);E.rematch(fresh,1);assert.equal(fresh.creditLifecycleVersion,1);E.validatePilot(fresh);
const normalized=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
let turns=0,maxBytes=0,maxCohorts=0;const results=[];
for(let seed=0;seed<4;seed++){
 const game=create('credit-audit-'+seed);let repayments=0;
 for(let i=0;i<120&&!game.gameOver;i++){
  turn(game);turns++;E.validatePilot(game);E.validateLedger(game);
  for(const p of game.players){A.check(p.accounting);repayments+=p.operatingReport.principalRepaid;maxCohorts=Math.max(maxCohorts,p.creditBook.cohorts.length);assert.equal(Object.values(p.marketReport.rows).reduce((n,r)=>n+r.contribution,0)+p.marketReport.central,p.operatingReport.profit)}
  maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxBytes<1048576);
  if(i===12){const resumed=client.migrate(copy(game));turn(game);turn(resumed);turns++;assert.deepEqual(normalized(game),normalized(resumed))}
 }
 results.push({seed,cycle:game.cycle,ended:game.gameOver,repayments,loans:game.players.map(p=>p.stats.loans),deposits:game.players.map(p=>p.stats.deposits)});
}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),sourceSha256=hash(source);assert.equal(sourceSha256,hash(fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8')));
const result={passed:true,sourceSha256,turns,maxBytes,maxCohorts,results};
if(process.argv.includes('--report')){const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'credit-lifecycle-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(result,null,2),{flag:'wx'})}
console.log(JSON.stringify(result,null,2));
