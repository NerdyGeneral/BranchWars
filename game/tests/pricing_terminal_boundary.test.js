'use strict';
// A complete monthly control ending, unlike calling the ending outside its
// transaction context. Territory conditions are synthetic; money is not granted.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const html=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_business1_bb6ae726.html'),'utf8');
assert.equal(createHash('sha256').update(html).digest('hex'),'bb6ae726ed5db903681ce340bd9d60efc7baf1d28e5964004e032a3e3f5da514');
function engine(html){const c={console};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const old=engine(html),current=engine(require('../tools/build_game').assemble().html),copy=x=>JSON.parse(JSON.stringify(x));
function run(E){
 const g=E.createGame({...E.previewFeatureSelection({}, {field:'commercialAccountsVersion',value:1}).options,seed:'pricing-terminal',created:1,mode:'hotseat'});
 for(const t of Object.values(g.territories)){t.shares=[95,5];t.exited[1]=true;t.exitStreak[1]=5;}
 E.validatePilot(g);
 const plan=p=>({focus:p.focus,allocation:{...p.allocation},decision:'b',depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',products:{...p.products},newProjects:[],investments:{},hires:0,competitiveAction:'none',opportunity:null});
 E.submit(g,0,plan(g.players[0]));const half=copy(g);
 E.submit(g,1,plan(g.players[1]));
 return {g,half,plan};
}
let failure;
try{const {g}=run(old);old.validatePilot(g);}catch(error){failure=error;}
assert(failure,'The immutable pre-repair ending must fail its completed state');
assert.match(failure.message,/Invalid product pricing review or published quotes/);
const {g,half,plan}=run(current);assert.equal(g.gameOver,true);assert.equal(g.endReason,'domination');current.validatePilot(g);current.validateLedger(g);
const restored=current.migrateCampaign(half);current.submit(restored,1,plan(restored.players[1]));
assert.deepEqual(copy(current.migrateCampaign(restored)),copy(current.migrateCampaign(g)));
for(const seat of [0,1])current.validateProductPricingView(current.publicState(g,seat));
console.log('PASS synthetic full-turn domination reproduces old pricing-review failure; current separate-book ending, private pricing views and half-ready replay pass. This does not identify the independent ordinary-AI month188 failure.');
