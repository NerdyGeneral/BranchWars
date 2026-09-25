'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=require('../tools/build_game').assemble().html,c={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);const E=c.BWEngine;
const copy=x=>JSON.parse(JSON.stringify(x));
const frozenContext={console};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_group10_2af5dba7.html'),'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1],frozenContext);const old=frozenContext.BWEngine;
function current(version='current'){return E.migrateCampaign(E.createGame({...E.previewFeatureSelection({}, version==='current'?{field:'commercialAccountsVersion',value:1}:{field:'financialGroupVersion',value:version}).options,seed:'terminal-books',created:1,mode:'hotseat'}));}
function withdraw(g){
 for(const t of Object.values(g.territories)){t.shares=[95,5];t.exitStreak[1]=5;}
 E.resolveMarketExits(g);
 // Terminal-control fixture: only territory status is arranged. No balance,
 // employee, loan or customer is injected; the saved-game validator must accept it.
 for(const t of Object.values(g.territories))t.exited[1]=true;
 E.validatePilot(g);
 assert(Object.values(g.territories).every(t=>t.exited[1]));
}
test('Control victory does not conjure deposits, loans or customers into detailed books',()=>{
 const g=current();withdraw(g);
 const before=copy(g.players.map(p=>({accounting:p.accounting,stats:p.stats,marketBook:p.marketBook,depositBook:p.depositBook,creditBook:p.creditBook,facilityLifecycle:p.facilityLifecycle,branches:p.branches})));
 const message=E.evaluateStrategicEnd(g);
 assert.equal(g.gameOver,true);assert.equal(g.endReason,'domination');assert.equal(g.winnerId,g.players[0].id);
 assert.deepEqual(copy(g.players.map(p=>({accounting:p.accounting,stats:p.stats,marketBook:p.marketBook,depositBook:p.depositBook,creditBook:p.creditBook,facilityLifecycle:p.facilityLifecycle,branches:p.branches}))),before,'A victory result is not a funded asset purchase or permission to duplicate the losing bank books');
 assert.match(message,/separate final books/);
});
for(const version of [8,9,10,'current'])test('Detailed Group '+version+' control ending completes a real turn and can be exported, viewed and rematched',()=>{
 const g=current(version);withdraw(g);
 if(version!=='current')assert.throws(()=>old.evaluateStrategicEnd(copy(g)),/Missing market transaction context/,'Preserved pre-repair code must reproduce the original defect');
 const plan=p=>({focus:p.focus,allocation:{...p.allocation},decision:'b',depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',products:{...p.products},newProjects:[],investments:{},hires:0,competitiveAction:'none',opportunity:null});
 E.submit(g,0,plan(g.players[0]));const half=E.migrateCampaign(copy(g));
 E.submit(g,1,plan(g.players[1]));E.submit(half,1,plan(half.players[1]));
 assert.equal(g.gameOver,true);assert.equal(g.endReason,'domination');assert.deepEqual(copy(half),copy(g));
 E.validatePilot(g);E.validateLedger(g);
 const restored=E.migrateCampaign(copy(g));assert.deepEqual(copy(restored),copy(g));
 for(const seat of [0,1])E.validateFinancialGroupView(E.publicState(restored,seat));
 E.rematch(restored,0);E.rematch(restored,1);assert.equal(restored.gameOver,false);assert.equal(restored.cycle,1);E.validatePilot(restored);
 assert.equal(restored.commercialAccountsVersion,version==='current'?1:undefined);
});
test('A sustained buyout preserves separate books and original Core endings remain exact',()=>{
 const g=current();g.act=2;g.consolidationStalemate=7;
 for(const [key,t]of Object.entries(g.territories)){t.exited=key==='northside'?[true,false]:[false,true];t.shares=key==='northside'?[5,95]:[95,5];}
 E.validatePilot(g);const before=JSON.stringify(g.players.map(p=>({stats:p.stats,accounting:p.accounting,depositBook:p.depositBook,creditBook:p.creditBook})));
 assert.equal(E.evaluateStrategicEnd(g),'');assert.equal(g.gameOver,false);assert.equal(g.buyoutPressure[0],1);
 assert.match(E.evaluateStrategicEnd(g),/separate final books/);assert.equal(g.endReason,'buyout');
 assert.equal(JSON.stringify(g.players.map(p=>({stats:p.stats,accounting:p.accounting,depositBook:p.depositBook,creditBook:p.creditBook}))),before);
 const options={scope:'town',seed:1,created:1,mode:'hotseat'},a=E.createGame(options),b=old.createGame(options);
 for(const world of [a,b])for(const t of Object.values(world.territories)){t.exited=[false,true];t.shares=[100,0];}
 assert.equal(E.evaluateStrategicEnd(a),old.evaluateStrategicEnd(b));assert.deepEqual(copy(a),copy(b));
});
test('Final UI explains control separately from a funded merger',()=>{
 if(!process.argv.includes('--source'))process.argv.push('--source');
 const h=require('./github_resilience.test').harness(),g=current();withdraw(g);
 const plan=p=>({focus:p.focus,allocation:{...p.allocation},decision:'b',depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',products:{...p.products},newProjects:[],investments:{},hires:0,competitiveAction:'none',opportunity:null});
 E.submit(g,0,plan(g.players[0]));E.submit(g,1,plan(g.players[1]));
 h.c.finalView=copy(E.publicState(g,0));h.run('renderFinal(finalView)');
 assert.match(h.elements.get('#endingNote').textContent,/separate final books/);
 h.c.finalView.endReason='buyout';h.run('renderFinal(finalView)');
 assert.match(h.elements.get('#winnerText').textContent,/WON THE BANK CONTROL CONTEST/);
 assert.doesNotMatch(h.elements.get('#winnerText').textContent,/ABSORBED/);
});
