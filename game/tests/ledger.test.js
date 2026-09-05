'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8');
const ctx={console,Math,Date};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const categories=new Set();let turns=0;
for(const scenario of ['balanced','growth','rate','regulatory']){
 const g=E.createGame({seed:'ledger-'+scenario,created:1,mode:'hotseat',scope:'national',scenario,difficulty:'vp',name1:'One',name2:'Two'});
 for(let turn=0;turn<80&&!g.gameOver;turn++){
  const plans=[E.chooseBot(g,0),E.chooseBot(g,1)],before=g.players.map(p=>copy(p.stats)),sequence=g.ledgerSequence||0,cycle=g.cycle;
  E.submit(g,0,plans[0]);assert.equal(g.ledgerSequence||0,sequence,'sealed first plan emits no outcome');
  E.submit(g,1,plans[1]);turns++;
  const events=g.eventLedger.filter(e=>e.id>sequence&&e.deltas);
  assert(events.length>0);assert.equal(new Set(g.eventLedger.map(e=>e.id)).size,g.eventLedger.length);
  for(const e of events){assert.equal(e.cycle,cycle);const parent=g.eventLedger.find(x=>x.id===e.parentCause);assert(parent&&parent.category==='resolution.start'&&parent.target===e.target);assert(e.source);assert.equal(e.visibility,'owner');categories.add(e.category)}
  for(let i=0;i<2;i++){
   const p=g.players[i],own=events.filter(e=>e.target===p.id);
   for(const key of Object.keys(p.stats)){
    const sum=own.reduce((n,e)=>n+(e.deltas[key]||0),0);
    assert(Math.abs(sum-(p.stats[key]-before[i][key]))<1e-7,`${scenario} cycle ${cycle} ${key} must reconcile to attributed stages`);
   }
   const view=E.publicState(g,i);assert(view.causalEvents.every(e=>e.target===p.id));
   if(view.causalEvents.some(e=>e.deltas)){const item=view.causalEvents.find(e=>e.deltas),original=JSON.stringify(g.eventLedger.find(e=>e.id===item.id));item.deltas.cash=123456;assert.equal(JSON.stringify(g.eventLedger.find(e=>e.id===item.id)),original,'projection is a deep copy')}
  }
  assert(g.eventLedger.length<=2000);
 }
}
for(const category of ['decision','competition.actions','project.start','operations','competition.deposits','funding.settlement','relationships','markets.competition','project.advance','research.investment','staff.hiring','milestones'])assert(categories.has(category),'exercised '+category);
const invalid=E.createGame({seed:0,created:0,mode:'hotseat',scope:'town'});
assert.throws(()=>E.submit(invalid,0,{focus:'bad'}));assert.equal(invalid.eventLedger,undefined);
console.log(`Ledger tests passed: ${turns} resolved turns; stat reconciliation, phase attribution, sealed-plan silence, owner privacy, deep copies and bounded history. Categories: ${[...categories].sort().join(', ')}`);
