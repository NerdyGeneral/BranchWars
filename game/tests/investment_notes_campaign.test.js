'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine;
function fresh(engine=E,notes=true){const o=engine.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options;for(const f of ['Services','Assets','Cash','Sweep','Choice','Income','Suitability','Trading'])o['investment'+f+'Version']=1;if(notes)o.investmentNotesVersion=1;const g=engine.createGame({...o,mode:'hotseat',seed:'term-products',created:1});g.players[0].financialGroup.parent=engine.GroupAccounting.post(g.players[0].financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});return g;}
function plans(g,engine=E){return g.players.map((p,i)=>({...engine.chooseBot(g,i),investmentPolicy:{...engine.defaultInvestmentPlan(p),market:i?'northside':'downtown'}}));}
function next(g,p,engine=E,reverse=false){const n=copy(g);engine.submit(n,reverse?1:0,copy(p[reverse?1:0]));const restored=engine.migrateCampaign(n);engine.submit(restored,reverse?0:1,copy(p[reverse?0:1]));engine.validatePilot(restored);engine.validateLedger(restored);for(const i of [0,1])engine.validateFinancialGroupView(engine.publicState(restored,i));return restored;}
function setup(g,p,m){if(m===0){p[0].investmentPolicy.institution={...p[0].investmentPolicy.institution,launch:true,capital:700000,feeBp:60,roles:{adviser:1,broker:0,principal:0,operations:1}};}if(m<4)p[0].investmentPolicy.pursue=true;if(m===4){const c=g.investmentEconomy.world.clients.find(c=>c.owner===g.players[0].id);assert(c);p[0].investmentPolicy.inventorySale=20000;p[0].investmentPolicy.funding=[{clientId:c.id,amount:2000,destination:'cash'}];}}

test('term campaign rejects marker drift, preserves notes through resume and validates both owner views',()=>{
 const g=fresh();assert.equal(g.version,'9.20');for(const change of [x=>delete x.investmentNotesVersion,x=>x.version='9.19',x=>x.investmentNotesVersion=2,x=>delete x.investmentEconomy.world.notes,x=>delete x.players[0].investmentNotesVersion]){const b=copy(g);change(b);assert.throws(()=>E.migrateCampaign(b));}
 const caps=E.campaignCapabilities();delete caps.investmentNotesSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'investmentNotesVersion');
 const b=copy(E.publicState(g,0));b.me.investmentSnapshot.notes.issuer.issueRoom++;assert.throws(()=>E.validateFinancialGroupView(b));
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.20');assert.equal(g.investmentEconomy.world.notes.month,0);E.validatePilot(g);
});

test('actual cash-funded note purchase, coupon and maturity reconcile in a resumed 13-month campaign',()=>{
 let g=fresh();for(let m=0;m<5;m++){const p=plans(g);setup(g,p,m);g=next(g,p);}
 const c=g.investmentEconomy.world.clients.find(c=>c.owner===g.players[0].id),p=plans(g);p[0].investmentPolicy.notes=[{clientId:c.id,product:'short',amount:100}];
 const before=JSON.stringify(g),bought=next(g,p);assert.deepEqual(copy(bought),copy(next(g,p,E,true)));assert.equal(JSON.stringify(g),before);g=bought;
 const n=g.investmentEconomy.world.notes;assert.equal(n.positions.length,1);assert.equal(n.positions[0].principal,100);assert.equal(n.execution[0].fee,5);assert.equal(g.investmentEconomy.world.reports[0].noteWork,5);
 const v=E.publicState(g,0);assert.equal(E.investmentViewPosition(v.me,v.me.investmentSnapshot.clients.find(x=>x.id===c.id)).value,100);assert.equal(E.publicState(g,1).me.investmentSnapshot.notes.positions.length,0);
 const forged=copy(g);forged.investmentEconomy.world.notes.execution[0].owner='foreign';assert.throws(()=>E.migrateCampaign(forged));
 const orders=plans(g);orders[0].investmentPolicy.notes=[{clientId:'foreign',product:'short',amount:100}];const original=JSON.stringify(g);assert.throws(()=>E.submit(g,0,orders[0]));assert.equal(JSON.stringify(g),original);
 if(process.argv.includes('--fixture'))fs.writeFileSync(path.join(__dirname,'../output/investment-notes-browser-qa.json'),JSON.stringify(g));
 for(let m=0;m<7;m++){g=next(g,plans(g));if(g.gameOver)break;}
 assert.equal(g.investmentEconomy.world.notes.principalPaid,100);assert.equal(g.investmentEconomy.world.notes.positions.length,0);assert(g.investmentEconomy.world.notes.interestPaid>0);
});

test('checkpoint33 9.19 creation, funding, buy/sell, AI/RNG and owner projections remain exactly unchanged',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_trading1_84b55d3d.html'));assert.equal(createHash('sha256').update(bytes).digest('hex'),'84b55d3d8621fd221b5ca3e77775f0b1bcd3767ee6f35e8f5c4ba0ed34a92b0f');const old={};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);const O=old.BWEngine;
 let a=fresh(O,false),b=fresh(E,false);assert.deepEqual(copy(a),copy(b));for(let m=0;m<7;m++){
  const pa=plans(a,O),pb=plans(b);for(const [g,p]of [[a,pa],[b,pb]]){setup(g,p,m);if(m>=5){const c=g.investmentEconomy.world.clients.find(c=>c.owner===g.players[0].id);p[0].investmentPolicy.trades=[{clientId:c.id,side:m===5?'buy':'sell',amount:100}];}}
  assert.deepEqual(copy(pa),copy(pb));a=next(a,pa,O);b=next(b,pb);assert.deepEqual(copy(a),copy(b));for(const i of [0,1])assert.deepEqual(copy(O.publicState(a,i)),copy(E.publicState(b,i)));
 }
});
