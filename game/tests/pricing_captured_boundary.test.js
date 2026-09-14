'use strict';
// Exact ordinary-AI failure replay; never regenerate or repair the captured save.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=path.join(root,'tests/fixtures/pricing188-before-210a3ec3.json.gz');
const bytes=fs.readFileSync(file),raw=zlib.gunzipSync(bytes).toString('utf8'),initial=JSON.parse(raw);
function engine(html){const c={console};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={productPrincipalGrid,'),c);return c.BWEngine;}
const oldHtml=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_business1_bb6ae726.html'),'utf8'),currentHtml=require('../tools/build_game').assemble().html;
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(hash(bytes),'210a3ec3f9871457d96893bbed69df221a26adf40e6b947d82f9a1879aa5765f');
assert.equal(hash(oldHtml),'bb6ae726ed5db903681ce340bd9d60efc7baf1d28e5964004e032a3e3f5da514');
const old=engine(oldHtml),current=engine(currentHtml),copy=x=>JSON.parse(JSON.stringify(x));
old.validatePilot(initial);assert.equal(initial.cycle,188);assert.equal(initial.gameOver,false);
const oldState=JSON.parse(raw),plans=oldState.players.map((_,i)=>old.chooseBot(oldState,i));
old.submit(oldState,0,plans[0]);old.submit(oldState,1,plans[1]);
assert.throws(()=>old.validatePilot(oldState),/Invalid product pricing review/);
const mismatch=oldState.players.flatMap(p=>Object.entries(old.productPrincipalGrid(p)).filter(([k,n])=>n!==p.productPrograms.review.closing[k]).map(([key,actual])=>({owner:p.id,key,review:p.productPrograms.review.closing[key],actual})));
assert(mismatch.length>0);console.log('Original captured failure reproduced: '+oldState.endReason+', '+mismatch.length+' stale pricing cells.');
const g=JSON.parse(raw);current.validatePilot(g);
// Replay the original generated orders, not hand-edited replacements.
current.submit(g,0,copy(plans[0]));const half=JSON.stringify(g);
current.submit(g,1,copy(plans[1]));current.validatePilot(g);current.validateLedger(g);
const restored=current.migrateCampaign(JSON.parse(half));current.submit(restored,1,copy(plans[1]));
assert.deepEqual(copy(current.migrateCampaign(restored)),copy(current.migrateCampaign(copy(g))));
for(const seat of [0,1]){const view=current.publicState(g,seat);current.validateProductPricingView(view);current.validateFinancialGroupView(view);}
assert.equal(g.gameOver,oldState.gameOver);assert.equal(g.endReason,oldState.endReason);assert.equal(g.winnerId,oldState.winnerId);
const report={status:'PASS',cycle:188,snapshotSha256:hash(bytes),currentPortableSha256:hash(currentHtml),oldEndReason:oldState.endReason,
 staleCells:mismatch.length,oldUnpricedDepositAddition:mismatch.reduce((n,x)=>n+x.actual-x.review,0),examples:mismatch.slice(0,4),
 current:{ended:g.gameOver,endReason:g.endReason,winner:g.winnerId,balances:g.players.map(p=>({id:p.id,deposits:p.stats.deposits,loans:p.stats.loans,cash:p.stats.cash,capital:p.stats.capital}))},
 checks:['captured old-build failure','original unmodified AI orders','current pricing/book validation','current owner-private views','exact half-ready recovery','same winning result'],
 scope:'One real captured terminal turn, not a new 188-month current-build campaign or broad balance acceptance.'};
console.log(JSON.stringify(report,null,2));
