'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
function engine(h){const c={console};vm.runInNewContext(h.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine}
function client(h,E){const c={E,console};vm.runInNewContext(h.slice(h.indexOf('function repairGame'),h.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',c);return c}
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
const E=engine(source),C=client(source,E),prior=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_customer_2d7bbca.html'),'utf8'),Old=engine(prior),OC=client(prior,Old);
const opts={customerDemandVersion:2,managementVersion:2,campaignRulesVersion:1,mode:'hotseat',seed:'goodwill',created:1},fresh=()=>E.createGame(opts),g=fresh(),p=g.players[0];
assert.equal(g.version,'8.4');assert.equal(E.customerRelationshipPressure(p,'downtown'),0);
assert.throws(()=>OC.migrate(copy(g)),/supported/);
const before=JSON.stringify(p),good=E.customerRelationshipReview(p,'downtown',{service:5,business:1,lending:1,operations:1}),poor=E.customerRelationshipReview(p,'downtown',{service:0,business:6,lending:1,operations:1});
assert(good[0].change>0);assert(poor.every(r=>r.change<0));assert.equal(JSON.stringify(p),before);
const altered=copy(p);altered.retailLifecycle.mix={essential:0,rewards:0,highYield:4};assert.deepEqual(copy(E.customerRelationshipReview(altered,'downtown')),copy(E.customerRelationshipReview(p,'downtown')),'sales emphasis does not rewrite existing-book suitability');
for(const value of [0,100]){for(const row of Object.values(altered.customerRelationships.markets))for(const k of Object.keys(row))row[k]=value;assert.equal(E.customerRelationshipPressure(altered,'downtown'),value===0?-1.5:1.5)}
const pub=E.publicState(g,0),plan=E.chooseBot(g,0),saved=JSON.stringify(g),f=E.operatingPreview(pub.me,plan,g.economy);assert(Number.isFinite(f.relationshipPressure));assert.equal(JSON.stringify(g),saved);assert.equal(pub.rival.customerRelationships,undefined);pub.me.customerRelationships.markets.downtown.everyday=1;assert.equal(p.customerRelationships.markets.downtown.everyday,50);
let hidden=true;vm.runInNewContext(source.match(/^function updateContinue\(\).*$/m)[0]+';updateContinue()',{E,savedGame:()=>g,$:()=>({classList:{toggle:(_,v)=>hidden=v}})});assert.equal(hidden,false);
const a=Old.createGame({...opts,customerDemandVersion:1}),b=E.createGame({...opts,customerDemandVersion:1});
for(let t=0;t<12;t++){const x=[Old.chooseBot(a,0),Old.chooseBot(a,1)],y=[E.chooseBot(b,0),E.chooseBot(b,1)];assert.deepEqual(copy(x),copy(y));for(let i=0;i<2;i++){Old.submit(a,i,x[i]);E.submit(b,i,y[i])}assert.deepEqual(copy(a),copy(b))}
assert.equal(C.migrate(a).players[0].customerRelationships,undefined);
const sealed=fresh();E.submit(sealed,0,E.chooseBot(sealed,0));const next=E.chooseBot(sealed,1),loaded=C.migrate(sealed);E.submit(sealed,1,copy(next));E.submit(loaded,1,copy(next));
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};assert.deepEqual(normal(sealed),normal(loaded));
for(const damage of [x=>delete x.players[0].customerRelationships,x=>x.players[0].customerRelationships.markets.downtown.everyday=101,x=>x.players[0].customerRelationships.markets.downtown.extra=1,x=>delete x.players[0].customerRelationships.markets.downtown,x=>x.players[0].customerRelationships.lastCycle=99,x=>x.customerDemandVersion=1,x=>x.version='8.3']){const x=copy(sealed);damage(x);assert.throws(()=>E.validatePilot(x))}
const runs=[];for(const scenario of Object.keys(E.SCENARIOS)){
 const game=E.createGame({...opts,scenario,seed:'goodwill-'+scenario});let turns=0;
 for(;turns<120&&!game.gameOver;turns++){const plans=[E.chooseBot(game,0),E.chooseBot(game,1)];E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);E.validatePilot(game);E.validateLedger(game);
  for(const bank of game.players){E.AccountingPrototype.check(bank.accounting);assert.equal(bank.stats.capital,bank.accounting.accounts.equity);assert.equal(bank.customerRelationships.lastCycle,game.cycle-1);for(const key of Object.keys(game.territories))assert(Math.abs(E.customerRelationshipPressure(bank,key))<=1.5)}
  assert(Buffer.byteLength(JSON.stringify(E.publicState(game,0)))<1048576);
 }
 runs.push({scenario,turns,ended:game.gameOver});
}
const rem=fresh();rem.gameOver=true;E.rematch(rem,0);E.rematch(rem,1);assert.equal(rem.version,'8.4');assert.equal(rem.players[0].customerRelationships.lastCycle,0);
console.log(JSON.stringify({passed:true,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),runs,checks:['service improvement and neglect','existing book not sales mix','bounded competition effect','non-mutating preview','rival privacy','old campaign exact continuation','half-sealed save','version refusal','Continue','corrupt relationship rejection','rematch','120-turn accounting and payload']},null,2));
