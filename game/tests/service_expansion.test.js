'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const file=path.join(__dirname,'../BRANCH_WARS.html'),source=fs.readFileSync(file,'utf8'),ctx={console,Math,Date};
for(const m of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={resolveOpportunities:(g,plans)=>withRandom(g,\'state\',()=>resolveOpportunities(g,plans)),syncServiceBook,projectBarred,'),ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x)),create=seed=>E.createGame({campaignRulesVersion:1,mode:'hotseat',seed,created:1});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const quiet=(g,i)=>({...E.chooseBot(g,i),contractBid:null,contractExit:null,newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',capitalAction:false,opportunity:null,decision:'b'});
const policy=(p,extra={})=>({...copy(p.serviceDesk.policy),...extra});
const g=create('service-expansion'),p=g.players[0],q=g.players[1],pay=g.serviceAgreements[0],treasury=g.serviceAgreements[2];
assert.equal(g.serviceExpansionVersion,1);assert.deepEqual(copy(g.serviceAgreements.map(c=>c.kind)),['payroll','merchant','treasury','payroll','merchant','treasury']);
assert.equal(E.publicState(g,1).rival.serviceDesk,undefined,'rival department policies are private');
const noStaff={...quiet(g,0),servicePolicy:policy(p,{staff:9})};
assert.throws(()=>E.submit(g,0,noStaff),/Service desk/);assert.equal(p.submitted,null);
assert.throws(()=>E.submit(g,0,{...quiet(g,0),servicePolicy:policy(p,{outsourcing:5})}),/Service desk/);
assert.throws(()=>E.submit(g,0,{...quiet(g,0),servicePolicy:policy(p,{treasury:true})}),/Deploy/);
assert.throws(()=>E.submit(g,0,{...quiet(g,0),newProjects:['buildTreasuryDesk']}),/tier 1/);
assert.throws(()=>E.submit(g,0,{...quiet(g,0),newProjects:['buildTreasuryDesk'],investments:{commercial:250000,digital:250000}}),/tier 1/);

// Dedicated staff reduce ordinary commercial production; outsourcing is paid even when idle.
const base={...quiet(g,0),allocation:{service:2,business:4,lending:1,operations:1},servicePolicy:policy(p)};
const snapshot=JSON.stringify(g),normal=E.operatingPreview(E.publicState(g,0).me,base,g.economy);
const reserved=E.operatingPreview(E.publicState(g,0).me,{...base,servicePolicy:policy(p,{staff:2})},g.economy);
assert.equal(reserved.commercialSalesStaff,2);assert(reserved.commercialIncome<normal.commercialIncome);
assert.equal(reserved.expense,normal.expense,'reserving staff does not remove their payroll');
const outsourced=E.operatingPreview(E.publicState(g,0).me,{...base,servicePolicy:policy(p,{outsourcing:2})},g.economy);
assert.equal(outsourced.contractServicing,12000);assert.equal(normal.profit-outsourced.profit,12000);assert.equal(JSON.stringify(g),snapshot);

// Winning locks the quoted fee; old fee survives a later standing price change.
p.allocation={service:0,business:8,lending:0,operations:0};q.allocation={service:8,business:0,lending:0,operations:0};
p.serviceDesk.policy=policy(p,{staff:1});p.serviceDesk.policy.pricing.payroll='discount';
const balances=g.players.map(p=>[p.stats.deposits,p.stats.loans,p.stats.cash,p.stats.capital]);
E.resolveOpportunities(g,[{contractBid:pay.id},{}]);
assert.equal(pay.owner,p.id);assert.equal(pay.fee,14400);assert.equal(pay.due,7);
assert.deepEqual(g.players.map(p=>[p.stats.deposits,p.stats.loans,p.stats.cash,p.stats.capital]),balances,'awards create no balances');
p.serviceDesk.policy.pricing.payroll='premium';assert.equal(E.contractIncome(p).fees,14400);
const inc=E.contractIncome(p);assert.equal(inc.direct,3000);assert.equal(inc.capacity,2);

// Two service failures reopen an otherwise locked mandate, without waiting for map turnover.
p.serviceDesk.policy.staff=0;g.cycle=2;E.resolveOpportunities(g,[{},{}]);assert.equal(pay.misses,1);assert.equal(pay.due,7);
g.cycle=3;E.resolveOpportunities(g,[{},{}]);assert.equal(pay.misses,2);assert.equal(pay.due,4);
g.cycle=4;E.resolveOpportunities(g,[{},{}]);assert.equal(pay.owner,null);assert.equal(p.serviceDesk.contracts.length,0);

// Platform eligibility and whole-book capacity prevent unsupported bids.
assert.match(E.serviceBidStatus(p,treasury).reason,/Activate/);
p.serviceDesk.applications.treasury='partner';p.serviceDesk.policy.treasury=true;p.serviceDesk.policy.staff=1;
assert.equal(E.serviceLoad(p).platform,18000);assert.equal(E.serviceBidStatus(p,treasury).eligible,false);
p.serviceDesk.policy.outsourcing=1;assert.equal(E.serviceBidStatus(p,treasury).eligible,true);
p.serviceDesk.applications.treasury='build';assert.equal(E.serviceLoad(p).platform,6000);
p.serviceDesk.policy.treasury=false;assert.equal(E.serviceLoad(p).platform,0);

// Competing deployment routes cannot consume two slots to bypass prerequisites.
const deployment=create('service-deployment'),d=deployment.players[0];
for(const k of ['commercial','digital','network','operations'])d.capability[k]=E.CAPABILITY_TIERS[k][0];
const build={...quiet(deployment,0),allocation:{service:3,business:2,lending:1,operations:2},servicePolicy:policy(d),newProjects:['partnerTreasuryDesk','buildTreasuryDesk']};
assert.throws(()=>E.submit(deployment,0,build),/one deployment route|capacity/);
const start={...build,newProjects:['partnerTreasuryDesk']};
assert.equal(E.planBudget(d,start).projects,E.projectCost(d,E.PROJECTS.partnerTreasuryDesk));
E.submit(deployment,0,start);E.submit(deployment,1,quiet(deployment,1));
assert.equal(d.serviceDesk.applications.treasury,'partner');assert.equal(d.serviceDesk.policy.treasury,false);
assert.equal(d.operatingReport.servicePlatform,0,'completion is not same-turn activation');
E.AccountingPrototype.check(d.accounting);E.validatePilot(deployment);
assert.match(E.projectCatalog(d).partnerTreasuryDesk.barred,/Already deployed/);
assert.equal(E.projectCatalog(d).buildTreasuryDesk.barred,'','internal build may replace a partner');
const enable={...quiet(deployment,0),servicePolicy:policy(d,{treasury:true})};
const forecast=E.operatingPreview(E.publicState(deployment,0).me,enable,deployment.economy);
assert.equal(forecast.servicePlatform,18000);
E.submit(deployment,0,enable);E.submit(deployment,1,quiet(deployment,1));
assert.equal(d.operatingReport.servicePlatform,18000);E.AccountingPrototype.check(d.accounting);

// A player can decline only their own due contract; fees end after the old term.
const exit=create('service-exit'),ep=exit.players[0],ec=exit.serviceAgreements[0];
ec.owner=ep.id;E.syncServiceBook(exit);ep.serviceDesk.policy.staff=1;
assert.throws(()=>E.submit(exit,0,{...quiet(exit,0),contractExit:exit.serviceAgreements[1].id}),/own agreement/);
E.submit(exit,0,{...quiet(exit,0),servicePolicy:policy(ep,{staff:1}),contractExit:ec.id});E.submit(exit,1,quiet(exit,1));
assert.notEqual(ec.owner,ep.id);assert.equal(ep.operatingReport.contractFees,18000);assert.equal(ep.serviceDesk.contracts.length,0);

// Reject corrupt schemas and ensure old saves/rematches keep the prior service rules.
for(const mutate of [
 x=>delete x.serviceExpansionVersion,
 x=>x.serviceAgreements[0].fee=999999,
 x=>x.serviceAgreements[0].misses=3,
 x=>x.players[0].serviceDesk.contracts.push({id:'invented'}),
 x=>x.players[0].serviceDesk.policy.outsourcing=-1,
 x=>x.players[0].serviceDesk.applications.treasury=true
]){const bad=create('tamper');mutate(bad);assert.throws(()=>client.migrate(bad));}
const old=E.createGame({campaignRulesVersion:1,serviceExpansionVersion:0,mode:'hotseat',seed:'old'});
assert.equal(client.migrate(copy(old)).serviceExpansionVersion,undefined);assert.equal(E.projectCatalog(old.players[0]).buildTreasuryDesk,undefined);
old.gameOver=true;E.rematch(old,0);E.rematch(old,1);assert.equal(old.serviceExpansionVersion,undefined);
const fresh=create('fresh');fresh.gameOver=true;E.rematch(fresh,0);E.rematch(fresh,1);assert.equal(fresh.serviceExpansionVersion,1);
const peerCaps=E.campaignCapabilities(),peerRules=E.validateCampaignRules(fresh,'game');
assert.equal(peerCaps.pilotSupported,11);assert.equal(E.peerRulesIssue(peerRules,peerCaps),null);
for(const pilotSupported of [undefined,0,10,12])assert.equal(E.peerRulesIssue(peerRules,{...peerCaps,pilotSupported}).field,'campaignRulesVersion');
assert.match(source,/COMMERCIAL SERVICE DESK/);assert.match(source,/RESEARCH APPLICATIONS/);
// Exercise the real lobby/engine boundary instead of prescribing the old
// pre-lobby source spelling. Omitted and disabled previews must stay disabled.
const {harness}=require('./github_resilience.test.js');
const defaultSetup=harness();
assert.equal(defaultSetup.elements.get('#serviceExpansion').checked,false,'the rendered experimental feature is not selected by default');
assert.equal(defaultSetup.run('readSetupFeatureOptions().serviceExpansionVersion'),0,'new local and linked campaigns read the unchecked service default');
for(const transport of ['gh','lan','p2p'])for(const selected of [undefined,0,1]){
 const host=harness('host');
 host.c.settings={campaignRulesVersion:1,name:'Host',color:'#2878e0',scope:'national',scenario:'rate',...(selected===undefined?{}:{serviceExpansionVersion:selected})};
 host.run("p2pConfig=settings;sent=[];send=m=>sent.push(m);game=null;view=null;gh.active="+(transport==='gh')+";lan.active="+(transport==='lan'));
 host.run("handleMessage({type:'hello',...E.campaignCapabilities(),name:'Guest',color:'#e1505c'})");
 assert.equal(host.state().game,null,'the greeting must not bypass the lobby');
 assert.equal(host.state().lobby.settings.serviceExpansionVersion,selected||0);
 host.run('applyLobbyUpdate(0,{revision:lobby.revision,player:lobby.players[0],ready:true});applyLobbyUpdate(1,{id:"confirm",revision:lobby.revision,player:lobby.players[1],ready:true});startLobbyCampaign()');
 const started=host.state().game;
 assert(started,'confirmed host must create the campaign');
 assert.equal(started.serviceExpansionVersion,selected===1?1:undefined,'host must pass the selected service rules to the engine');
 assert.equal(started.mode,transport==='p2p'?'p2p':'lan');
 assert.equal(started.scenario,'rate');
 assert.equal(host.run('sent.filter(m=>m.type==="state").at(-1).state.serviceExpansionVersion'),started.serviceExpansionVersion,'guest must receive the same service rules');
}
assert.match(source,/const expanded=\$\('#servicePricing'\)\?\.open/,'pricing disclosure survives plan rerenders');

let turns=0,maxViewBytes=0,changes=0;const results=[];
const normalize=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
const turn=x=>{E.submit(x,0,E.chooseBot(x,0));E.submit(x,1,E.chooseBot(x,1))};
for(let seed=0;seed<4;seed++){
 const game=create('expanded-services-'+seed);
 for(let month=0;month<80&&!game.gameOver;month++){
  const before=game.serviceAgreements.map(c=>c.owner);turn(game);turns++;
  changes+=game.serviceAgreements.filter((c,i)=>c.owner!==before[i]).length;
  E.validatePilot(game);E.validateLedger(game);game.players.forEach(p=>E.AccountingPrototype.check(p.accounting));
  maxViewBytes=Math.max(maxViewBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxViewBytes<1048576);
  if(month===8&&!game.gameOver){const resumed=client.migrate(copy(game));turn(game);turn(resumed);turns++;assert.deepEqual(normalize(game),normalize(resumed));}
 }
 results.push({seed,cycle:game.cycle,ended:game.gameOver,applications:game.players.map(p=>p.serviceDesk.applications),contracts:game.players.map(p=>p.serviceDesk.contracts.length)});
}
assert(changes>6,'service awards must remain contestable');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');assert.equal(hash(source),hash(fs.readFileSync(file,'utf8')));
console.log(JSON.stringify({passed:true,sourceSha256:hash(source),turns,maxViewBytes,changes,results},null,2));
