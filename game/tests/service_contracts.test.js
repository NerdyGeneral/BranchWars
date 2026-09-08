'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const file=path.join(__dirname,'../BRANCH_WARS.html'),source=fs.readFileSync(file,'utf8'),ctx={console,Math,Date};
for(const m of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={resolveOpportunities:(g,plans)=>withRandom(g,\'state\',()=>resolveOpportunities(g,plans)),'),ctx);
// Preserve the prior contract-v1 rules; service_expansion.test.js covers new pilots.
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x)),create=seed=>E.createGame({campaignRulesVersion:1,serviceExpansionVersion:0,mode:'hotseat',seed,created:1});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const clean=(g,i)=>({...E.chooseBot(g,i),contractBid:null,newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',capitalAction:false,opportunity:null,decision:'b'});
const g=create('contracts'),p=g.players[0],q=g.players[1],c=g.serviceAgreements[0];
assert.equal(g.contractRulesVersion,1);assert.equal(g.serviceAgreements.length,6);
const strong={service:0,business:8,lending:0,operations:0},weak={service:8,business:0,lending:0,operations:0};
p.allocation=strong;q.allocation=weak;
const balances=g.players.map(p=>[p.stats.deposits,p.stats.loans]);
E.resolveOpportunities(g,[{contractBid:c.id},{}]);
assert.equal(c.owner,p.id);assert.equal(c.due,7);assert.deepEqual(g.players.map(p=>[p.stats.deposits,p.stats.loans]),balances);
assert.deepEqual(copy(p.serviceContracts),[c.id]);
const previewPlan={...clean(g,0),allocation:strong},snap=JSON.stringify(g);
const preview=E.operatingPreview(E.publicState(g,0).me,previewPlan,g.economy);
assert.equal(JSON.stringify(g),snap);assert.equal(preview.contractFees,8000);assert.equal(preview.contractServicing,2000);
const without=copy(E.publicState(g,0).me);without.serviceContracts=[];
const base=E.operatingPreview(without,previewPlan,g.economy);
assert.equal(preview.profit-base.profit,6000);
p.allocation=weak;assert.equal(E.contractIncome(p).fees,0);assert.equal(E.contractIncome(p).cost,2000);
const score=E.contractPower(g,q,c);
E.finishProject(g,q,{key:'contractAdvertising',target:c.market});
assert.equal(q.contractAds.expires,5);assert.equal(E.contractPower(g,q,c)-score,3);
const other=g.serviceAgreements[1],otherScore=E.contractPower(g,q,other);
q.contractAds=null;assert.equal(E.contractPower(g,q,other),otherScore,'no cross-market advertising bonus');
E.finishProject(g,q,{key:'contractAdvertising',target:c.market});g.cycle=6;
const expired=E.contractPower(g,q,c);q.contractAds=null;assert.equal(E.contractPower(g,q,c),expired);
g.cycle=7;q.allocation=strong;
E.resolveOpportunities(g,[{}, {contractBid:c.id}]);assert.equal(c.owner,q.id);assert.equal(p.serviceContracts.length,0);assert(q.serviceContracts.includes(c.id));
const advertised=create('paid-ad'),adPlan={...clean(advertised,0),newProjects:['contractAdvertising']};
assert.equal(E.planBudget(advertised.players[0],adPlan).projects,24000);
E.submit(advertised,0,adPlan);E.submit(advertised,1,clean(advertised,1));
assert.equal(advertised.players[0].buildSpend,24000);
assert.equal(advertised.players[0].contractAds.market,adPlan.focus);
assert.equal(advertised.players[0].contractAds.expires,5);
E.AccountingPrototype.check(advertised.players[0].accounting);E.validatePilot(advertised);
const bad=create('bad');
assert.throws(()=>E.submit(bad,0,{...clean(bad,0),contractBid:bad.serviceAgreements[0].id,opportunity:bad.opportunities[0].id}),/one relationship pursuit/);
assert.throws(()=>E.submit(bad,0,{...clean(bad,0),contractBid:'unknown'}),/due this cycle/);
assert.throws(()=>E.submit(bad,0,{...clean(bad,0),contractBid:bad.serviceAgreements[0].id,allocation:weak}),/Business/);
assert.equal(bad.players[0].submitted,null);
const invalid=create('invalid');invalid.players[0].serviceContracts=['service-downtown'];assert.throws(()=>client.migrate(invalid),/ownership/);
const unversioned=create('unversioned');delete unversioned.contractRulesVersion;assert.throws(()=>client.migrate(unversioned),/Unversioned/);
const old=E.createGame({campaignRulesVersion:1,contractRulesVersion:0,seed:1});assert.equal(client.migrate(copy(old)).contractRulesVersion,undefined);assert.equal(E.projectCatalog(old.players[0]).contractAdvertising,undefined);
old.gameOver=true;E.rematch(old,0);E.rematch(old,1);assert.equal(old.contractRulesVersion,undefined);
const fresh=create('rematch');fresh.gameOver=true;E.rematch(fresh,0);E.rematch(fresh,1);assert.equal(fresh.contractRulesVersion,1);
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
function turn(game){E.submit(game,0,E.chooseBot(game,0));E.submit(game,1,E.chooseBot(game,1))}
let turns=0,maxBytes=0,changes=0;const results=[];
for(let seed=0;seed<4;seed++){
 const game=create('renewal-'+seed);
 for(let month=0;month<80&&!game.gameOver;month++){
  const prior=game.serviceAgreements.map(c=>c.owner);turn(game);turns++;
  changes+=game.serviceAgreements.filter((c,i)=>c.owner!==prior[i]).length;
  E.validatePilot(game);E.validateLedger(game);game.players.forEach(p=>E.AccountingPrototype.check(p.accounting));
  maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxBytes<1048576);
  if(month===5&&!game.gameOver){const resumed=client.migrate(copy(game));turn(game);turn(resumed);turns++;assert.deepEqual(normal(game),normal(resumed))}
 }
 results.push({seed,cycle:game.cycle,ended:game.gameOver,contracts:game.players.map(p=>p.serviceContracts.length)});
}
assert(changes>10,'recurring contests should change providers');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');assert.equal(hash(source),hash(fs.readFileSync(file,'utf8')));
console.log(JSON.stringify({passed:true,sourceSha256:hash(source),turns,maxBytes,changes,results},null,2));
