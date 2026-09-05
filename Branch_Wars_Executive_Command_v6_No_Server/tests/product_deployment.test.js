'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const file=path.join(__dirname,'../BRANCH_WARS.html'),source=fs.readFileSync(file,'utf8'),ctx={console,Math,Date};
for(const m of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={projectBarred,applyRetailMix,'),ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x)),create=seed=>E.createGame({campaignRulesVersion:1,contractRulesVersion:0,mode:'hotseat',seed,created:1});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const clean=(g,i)=>({...E.chooseBot(g,i),newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',capitalAction:false,opportunity:null,decision:'b',retailMix:{essential:4,rewards:0,highYield:0}});
const g=create('rollout'),p=g.players[0];
assert.equal(g.productDeploymentVersion,1);
assert.equal(E.publicState(g,0).rival.productDeployment,undefined);
assert.equal(E.publicState(g,0).me.productDeployment.ready.rewards,false);
assert.match(E.projectCatalog(p).deployRewards.barred,/tier 1/);
assert.throws(()=>E.submit(g,0,{...clean(g,0),retailMix:{essential:1,rewards:1,highYield:0}}),/Deploy/);
assert.equal(p.submitted,null);
p.capability.network=E.CAPABILITY_TIERS.network[0]-50000;
assert.throws(()=>E.submit(g,0,{...clean(g,0),newProjects:['deployRewards'],investments:{network:50000}}),/tier 1/);
assert.equal(p.submitted,null);
p.capability.network=E.CAPABILITY_TIERS.network[0];
const zeroOps={service:p.stats.staff,business:0,lending:0,operations:0};
assert.throws(()=>E.submit(g,0,{...clean(g,0),allocation:zeroOps,newProjects:['deployRewards']}),/capacity/);
const plan={...clean(g,0),newProjects:['deployRewards'],allocation:{service:p.stats.staff-1,business:0,lending:0,operations:1}};
const quote=E.planBudget(p,plan);assert.equal(quote.projects,180000);assert.equal(quote.load,2);
const snap=JSON.stringify(g);E.operatingPreview(E.publicState(g,0).me,plan,g.economy);assert.equal(JSON.stringify(g),snap);
E.submit(g,0,plan);E.submit(g,1,clean(g,1));E.AccountingPrototype.check(p.accounting);
assert.equal(p.projects[0].key,'deployRewards');assert.equal(p.productDeployment.ready.rewards,false);
const progress=p.projects[0].progress;
E.submit(g,0,{...clean(g,0),allocation:zeroOps});E.submit(g,1,clean(g,1));
assert.equal(p.projects[0].progress,progress,'unfunded execution capacity must stall');
assert(g.resolution.some(x=>x.includes('stalled')));
let resumed=client.migrate(copy(g));
function advance(game){E.submit(game,0,{...clean(game,0),allocation:{service:game.players[0].stats.staff-1,business:0,lending:0,operations:1}});E.submit(game,1,clean(game,1))}
for(let i=0;i<3&&!p.productDeployment.ready.rewards;i++){advance(g);advance(resumed)}
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
assert.deepEqual(normal(g),normal(resumed));
assert.equal(p.productDeployment.ready.rewards,true);assert.equal(p.retailLifecycle.mix.rewards,0);
assert.equal(E.depositSummary(p,g).rows.rewards.platform,0,'deployment alone does not open sales');
assert.match(E.projectCatalog(p).deployRewards.barred,/Already deployed/);
assert.throws(()=>E.submit(g,0,{...clean(g,0),newProjects:['deployRewards']}),/Already deployed/);
E.submit(g,0,{...clean(g,0),retailMix:{essential:2,rewards:2,highYield:0}});E.submit(g,1,clean(g,1));
assert.equal(p.operatingReport.retailPlatformCost,12000);E.validatePilot(g);E.validateLedger(g);
assert(E.depositSummary(p,g).rows.essential.principal>0);
const bad=create('tamper');delete bad.productDeploymentVersion;assert.throws(()=>client.migrate(bad),/deployment/);
const invalid=create('ready');invalid.players[0].productDeployment.ready.rewards=1;assert.throws(()=>client.migrate(invalid),/deployment/);
const old=E.createGame({campaignRulesVersion:1,productDeploymentVersion:0,seed:1});
assert.equal(client.migrate(copy(old)).productDeploymentVersion,undefined);assert.equal(E.projectCatalog(old.players[0]).deployRewards,undefined);
E.applyRetailMix(old.players[0],{essential:1,rewards:1,highYield:1});
old.gameOver=true;E.rematch(old,0);E.rematch(old,1);assert.equal(old.productDeploymentVersion,undefined);
const fresh=create('rematch');fresh.gameOver=true;E.rematch(fresh,0);E.rematch(fresh,1);assert.equal(fresh.productDeploymentVersion,1);
let turns=0,maxBytes=0;const results=[];
for(let seed=0;seed<4;seed++){
 const game=create('deployment-'+seed);
 for(let month=0;month<80&&!game.gameOver;month++){
  E.submit(game,0,E.chooseBot(game,0));E.submit(game,1,E.chooseBot(game,1));turns++;
  E.validatePilot(game);E.validateLedger(game);game.players.forEach(p=>E.AccountingPrototype.check(p.accounting));
  maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxBytes<1048576);
 }
 results.push({seed,cycle:game.cycle,ending:game.endReason,ready:game.players.map(p=>p.productDeployment.ready)});
}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');assert.equal(hash(source),hash(fs.readFileSync(file,'utf8')));
console.log(JSON.stringify({passed:true,sourceSha256:hash(source),turns,maxBytes,results},null,2));
