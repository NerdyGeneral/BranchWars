'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine;
const client={E,console};vm.runInNewContext(html.slice(html.indexOf('function repairGame'),html.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const g=E.createGame({seed:'colors',created:1,mode:'hotseat',scope:'national',color1:'#238050',color2:'#853AC4'});
assert.equal(g.players[0].color,'#238050');assert.equal(g.players[1].color,'#853ac4');
for(const seat of [0,1]){
 const view=E.publicState(g,seat);assert.equal(view.me.color,g.players[seat].color);assert.equal(view.rival.color,g.players[1-seat].color);
}
const migrated=client.migrate(JSON.parse(JSON.stringify(g)));assert.equal(migrated.players[0].color,g.players[0].color);assert.equal(migrated.players[1].color,g.players[1].color);
const old=JSON.parse(JSON.stringify(g));old.players.forEach(p=>delete p.color);
assert.equal(E.publicState(old,1).me.color,'#e1505c');assert.equal(E.publicState(old,1).rival.color,'#2878e0');
for(const bad of [null,{},'#abc','red','url(https://bad.invalid)', '#000000;display:none'])assert.equal(E.bankColor(bad,1),'#e1505c');
const same=E.createGame({seed:1,created:1,mode:'ai',color1:'#ffffff',color2:'#ffffff'});assert.equal(same.players[0].color,same.players[1].color);
g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.players[0].color,'#238050');assert.equal(g.players[1].color,'#853ac4');
// No color-dependent simulation or RNG drift.
const a=E.createGame({seed:'neutral',created:1,mode:'hotseat',scope:'town',color1:'#000000',color2:'#ffffff'}),b=E.createGame({seed:'neutral',created:1,mode:'hotseat',scope:'town'});
const normalized=x=>{const out=JSON.parse(JSON.stringify(x));out.players.forEach(p=>delete p.color);return out};
for(let i=0;i<8&&!a.gameOver;i++){for(const seat of [0,1]){E.submit(a,seat,E.chooseBot(a,seat));E.submit(b,seat,E.chooseBot(b,seat))}assert.deepEqual(normalized(a),normalized(b))}
assert(html.includes("color1:host.color,color2:guest.color"),'campaign adopts both confirmed lobby colors');
const {harness}=require('./github_resilience.test.js'),linked=harness('guest');
linked.run("p2pConfig={color:'#853ac4',guestName:'Purple Bank'};sent=[];send=m=>sent.push(m);handleMessage({type:'hello_request'})");
assert.equal(linked.run('sent[0].color'),'#853ac4');assert.equal(linked.run('sent[0].name'),'Purple Bank');
for(const handler of ['startHandshake','joinLanRoom','ghJoinRoom','handleMessage'])
 assert(linked.run(handler+'.toString()').includes('makeFeatureHello('),handler+' must use the tested identity-preserving hello factory');
assert(html.includes('stroke-dasharray:7 4'));assert(html.includes('aria-label="Bank identities"'));
console.log('Bank identity tests passed: picker wiring, seat perspectives, save migration, rematches, legacy defaults, unsafe values, matching colors, handshake contracts and simulation neutrality.');
