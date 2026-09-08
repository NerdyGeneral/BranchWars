'use strict';

// Manual browser-QA fixture generator, not a gate or gameplay shortcut.
// Both seats use ordinary chooseBot/submit rules in a hotseat campaign. No cash,
// capital, company balance, rule, ownership, isBot flag or saved order is injected.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=value=>JSON.parse(JSON.stringify(value));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const html=require('./build_game.js').assemble().html;
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)?.[1];
assert(engine,'Current assembly must contain the actual engine.');
const context={console};vm.runInNewContext(engine,context,{filename:'agency-qa-engine.js'});
const E=context.BWEngine;
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:3}).options;
// Exactly agency.test.js fresh() with its omitted scenario argument.
const game=E.createGame({...options,mode:'hotseat',seed:'agency:undefined',scenario:'balanced',created:1});
assert.equal(game.version,'9.2');assert.equal(game.financialGroupVersion,3);
assert(game.players.every(p=>p.agency.status==='unopened'&&p.financialGroup.parent.accounts.cash===0));
const initialBotFlags=game.players.map(p=>p.isBot),launchMonths=[null,null];
const validate=()=>{
  E.validatePilot(game);E.validateLedger(game);
  for(const seat of [0,1]){
    const owner=E.publicState(game,seat);
    E.validateFinancialGroupView(owner);E.validateAgencyView(owner);
    assert.equal(owner.me.id,game.players[seat].id);
    assert.equal(owner.rival.agency,undefined,'Private rival subsidiary books must stay hidden.');
  }
};
validate();
let months=0;
while(months<60&&!game.gameOver&&game.players[0].agency.status!=='active'){
  const plans=game.players.map((p,seat)=>E.chooseBot(game,seat));
  E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);months++;validate();
  game.players.forEach((p,seat)=>{if(p.agency.openedCycle&&!launchMonths[seat])launchMonths[seat]=p.agency.openedCycle;});
}
assert.equal(game.players[0].agency.status,'active','This exact ordinary seed must naturally reach an active seat-zero agency; no substitute funding is permitted.');
assert(game.players.every(p=>!p.submitted),'Browser fixture must open at an unsealed planning boundary.');
assert.deepEqual(game.players.map(p=>p.isBot),initialBotFlags,'Do not alter participant flags to make the fixture usable.');
assert.equal(game.mode,'hotseat','Plain import selects seat zero without rewriting player flags.');
const player=game.players[0];
assert(player.financialGroup.parent.journal.some(entry=>entry.source==='dividend.bank'),
  'Agency funding must originate from an actually paid eligible bank dividend.');
assert(player.agency.openedCycle>1);
// Existing migration removes the obsolete ladder object once modern capability
// state exists (engine/migration.js). Permit only that documented key cleanup;
// do not conceal changed money, rules, portfolios, histories or participant flags.
const imported=copy(E.migrateCampaign(copy(game))),expectedImport=copy(game);
for(const p of expectedImport.players)delete p.strategy;
assert.equal(hash(JSON.stringify(imported)),hash(JSON.stringify(expectedImport)),
  'Plain import must preserve every field except established obsolete-strategy cleanup.');
for(const seat of [0,1]){const importedOwner=E.publicState(imported,seat);E.validateAgencyView(importedOwner);E.validateFinancialGroupView(importedOwner);}
const ownerBefore=JSON.stringify(game),owner=E.publicState(game,0);
E.validateAgencyView(owner);E.validateFinancialGroupView(owner);
assert.equal(JSON.stringify(game),ownerBefore,'Owner-view generation must be pure.');
assert.equal(owner.me.agency.status,'active');
assert.equal(owner.me.agencySnapshot.relationships.length,18);
function rejectCredentials(value){
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
    assert(!/^(authorization|password|githubToken|accessToken|refreshToken|sessionStorage|localStorage|gh|lan|p2pConfig)$/i.test(key),
      'Transport or credential field must not enter an engine-only QA export: '+key);
    rejectCredentials(child);
  }
}
rejectCredentials(game);
const directory=path.join(root,'reports','qa'),file=path.join(directory,'agency-earned-launch.json');
const bytes=Buffer.from(JSON.stringify(game,null,2)+'\n','utf8');
fs.mkdirSync(directory,{recursive:true});
if(fs.existsSync(file))assert(fs.readFileSync(file).equals(bytes),
  'A different QA export already exists. Preserve it elsewhere before regenerating this fixed path.');
else fs.writeFileSync(file,bytes,{flag:'wx'});
assert.equal(hash(fs.readFileSync(file)),hash(bytes));
console.log(JSON.stringify({file,sha256:hash(bytes),bytes:bytes.length,
  assembledPortableSha256:hash(html),engineSha256:hash(engine),
  mode:game.mode,version:game.version,financialGroupVersion:game.financialGroupVersion,
  cycle:game.cycle,monthsSimulated:months,launchMonths,owner:{seat:0,id:player.id,name:player.name,
    agencyStatus:player.agency.status,openedCycle:player.agency.openedCycle,staff:player.agency.staff,
    bankCash:player.stats.cash,bankCapital:player.stats.capital,parentCash:player.financialGroup.parent.accounts.cash,
    agencyCash:player.agency.book.accounts.cash,agencyEquity:player.agency.book.accounts.equity,
    agencyReport:player.agency.report},
  validation:'Normal same-rule play only; plain save migration (only established obsolete-strategy key cleanup), both owner views, privacy, unsealed hotseat import and credential absence checked. Export preserves ordinary raw campaign fields; no resources or participant flags altered.'},null,2));
