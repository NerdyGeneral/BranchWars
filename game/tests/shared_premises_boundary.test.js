'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),path=require('node:path');
const old=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_competition44_review.html'),'utf8');
assert.equal(createHash('sha256').update(old).digest('hex'),'5edab8933b03bd7d0b04cbb324062334a2bc1d67fcacfa0a08c73c23439c55eb','Preserved44 reference must remain immutable');
const load=html=>{const math=Object.create(Math);math.random=()=>.375;const c={Math:math,Date:class extends Date{static now(){return 123456;}}};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;};
const a=load(old),b=load(require('../tools/build_game').assemble().html),copy=x=>JSON.parse(JSON.stringify(x));
for(const scenario of Object.keys(a.SCENARIOS)){
 const options={...a.previewCampaignEdition({},'expanded').options,mode:'hotseat',scenario,seed:'premises-legacy44',created:1};
 const x=a.createGame(options),y=b.createGame(options);assert.deepEqual(copy(y),copy(x));assert.equal(y.sharedPremises,undefined);assert(y.players.every(p=>p.sharedPremises===undefined));
 // Both engines independently choose their plans; exact game comparisons include
 // RNG, ledger, version fields and private checkpoint books, not just summaries.
 const p=a.chooseBot(x,0),q=b.chooseBot(y,0);assert.deepEqual(copy(q),copy(p));a.submit(x,0,p);b.submit(y,0,q);
 assert.deepEqual(copy(b.migrateCampaign(copy(y))),copy(a.migrateCampaign(copy(x))));
 const r=a.chooseBot(x,1),s=b.chooseBot(y,1);assert.deepEqual(copy(s),copy(r));a.submit(x,1,r);b.submit(y,1,s);
 assert.deepEqual(copy(y),copy(x));for(const seat of [0,1])assert.deepEqual(copy(b.publicState(y,seat)),copy(a.publicState(x,seat)));
 x.gameOver=y.gameOver=true;x.rematchVotes=[];y.rematchVotes=[];a.rematch(x,0);a.rematch(x,1);b.rematch(y,0);b.rematch(y,1);assert.deepEqual(copy(y),copy(x));
 console.log('PASS preserved44 creation, independent AI, half-ready recovery, month resolution and rematch: '+scenario);
}
