'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x));
function engine(html){const c={Math:Object.assign(Object.create(Math),{random:()=>.375}),Date:class extends Date{static now(){return 123456;}}};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=engine(require('../tools/build_game').assemble().html);
// Five-family credit is an internal rule in the integrated edition, not a
// checkbox. Pin this 9.21 fixture to the immutable preceding 9.20 rules.
const preCredit=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_expanded_35_ab06ac97.html'));
assert.equal(createHash('sha256').update(preCredit).digest('hex'),'ab06ac9722a481609f56bae50aa09a76f983db86330d8e6efbadf65665ad2cfa');
const priorOptions=engine(preCredit.toString()).previewCampaignEdition({},'expanded').options;
const options=()=>({...copy(priorOptions),creditProductsVersion:1});
function fresh(scenario='balanced'){return E.createGame({...options(),scenario,seed:'business-balance:1',mode:'hotseat',created:1});}
function next(g,plans){let n=copy(g);E.submit(n,0,copy(plans[0]));n=E.migrateCampaign(n);E.submit(n,1,copy(plans[1]));E.validatePilot(n);E.validateLedger(n);for(const i of [0,1])E.validateFinancialGroupView(E.publicState(n,i));return n;}

test('five families require explicit 9.21 rules; legacy and malformed campaign boundaries stay strict',()=>{
 const g=fresh();assert.equal(g.version,'9.21');assert.equal(Object.keys(g.players[0].creditPortfolio.allocation).length,5);
 for(const change of [x=>delete x.creditProductsVersion,x=>x.creditProductsVersion=2,x=>x.version='9.20',x=>delete x.players[0].creditProductsVersion,x=>x.players[0].creditPortfolio.version=1]){const n=copy(g);change(n);assert.throws(()=>E.migrateCampaign(n));}
 const caps=E.campaignCapabilities();delete caps.creditProductsSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'creditProductsVersion');
 const v=E.publicState(g,0);assert.equal(v.me.creditProductsVersion,1);assert(!v.rival.creditProductsVersion);assert.equal(Object.keys(v.productPortfolios.credit.options).length,5);
 v.rival.creditProductsVersion=1;assert.throws(()=>E.validateFinancialGroupView(v));
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.21');E.validatePilot(g);
});

test('terms, collateral and concentration are persistent credit risks, not extra money or books',()=>{
 const g=fresh(),p=g.players[0],before=JSON.stringify(g),review=E.creditProductReview(p,g);
 assert.equal(review.find(r=>r.product==='smallBusiness').months,36);assert.equal(review.find(r=>r.product==='commercialProperty').months,120);
 const c={product:'commercialProperty',principal:1000000,collateralBp:6500},n={...p,creditBook:{cohorts:[c]}},normal=E.creditProductRisk(n,c,{credit:1}),stress=E.creditProductRisk(n,c,{credit:2});
 assert(stress.incidence>normal.incidence);assert(stress.severity>normal.severity);assert(normal.severity<1);
 const diverse={...n,creditBook:{cohorts:[c,{product:'mortgage',principal:3000000}]}};assert(E.creditProductRisk(diverse,c,{credit:1}).incidence<normal.incidence);
 assert.equal(JSON.stringify(g),before,'Preview cannot create assets, reservations or loan books');
});

test('both new loan families fund, amortize, age and resume in all four economies with finite ordinary resources',()=>{
 for(const scenario of ['balanced','rate','regulatory','growth']){
  let g=fresh(scenario),seen=new Set();
  for(let month=0;month<6;month++){
   const plans=g.players.map((p,i)=>E.chooseBot(g,i));
   plans[0].groupPolicy.creditAllocation={mortgage:0,middleMarket:0,consumer:0,smallBusiness:50,commercialProperty:50};
   const before=JSON.stringify(g),v=E.publicState(g,0);E.operatingPreview(v.me,plans[0],g.economy,g,true);assert.equal(JSON.stringify(g),before);
   g=next(g,plans);for(const c of g.players[0].creditBook.cohorts){if(['smallBusiness','commercialProperty'].includes(c.product)){seen.add(c.product);assert.equal(c.collateralBp,c.product==='smallBusiness'?3500:6500);}}
   if(g.gameOver)break;
  }
  assert.equal(seen.size,2,scenario+' actually originates both new products');
  const bad=copy(g),c=bad.players[0].creditBook.cohorts.find(c=>c.collateralBp);c.collateralBp=9999;assert.throws(()=>E.migrateCampaign(bad));
 }
});

test('ordinary new-version AI protects acquired business-account work instead of assigning it twice',()=>{
 let g=fresh();for(let month=0;month<4;month++){
  const plans=g.players.map((p,i)=>E.chooseBot(g,i));
  for(const [i,p]of g.players.entries()){
   const q=E.commercialAccountReview(g,p,plans[i]);
   if(q.service){assert(q.quarters>=q.service,'Existing accounts retain physical servicing time');assert(q.quarters<=q.capacity);}
  }
  g=next(g,plans);
 }
 assert(Object.values(g.players[0].commercialAccounts.accounts).length>0,'No injected clients: the ordinary AI actually wins and retains an account');
});

test('immutable checkpoint35 9.20 preserves creation, AI, human drafts, RNG, half-ready recovery, private views and rematch exactly',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_expanded_35_ab06ac97.html'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'ab06ac9722a481609f56bae50aa09a76f983db86330d8e6efbadf65665ad2cfa');const O=engine(bytes.toString());
 for(const scenario of ['balanced','rate','regulatory','growth']){
  const config={...O.previewCampaignEdition({},'expanded').options,scenario,seed:65,mode:'hotseat',created:1};let a=O.createGame(config),b=E.createGame(config);assert.deepEqual(copy(a),copy(b));
  for(let m=0;m<3;m++){
   const pa=a.players.map((p,i)=>O.chooseBot(a,i)),pb=b.players.map((p,i)=>E.chooseBot(b,i));assert.deepEqual(copy(pa),copy(pb));
   if(m===1){pa[0].decision='b';pb[0].decision='b';}
   O.submit(a,0,pa[0]);E.submit(b,0,pb[0]);a=O.migrateCampaign(copy(a));b=E.migrateCampaign(copy(b));assert.deepEqual(copy(a),copy(b));
   O.submit(a,1,pa[1]);E.submit(b,1,pb[1]);assert.deepEqual(copy(a),copy(b));
   for(const i of [0,1])assert.deepEqual(copy(O.publicState(a,i)),copy(E.publicState(b,i)));
  }
  for(const [engine,g]of [[O,a],[E,b]]){g.gameOver=true;engine.rematch(g,0);engine.rematch(g,1);}assert.deepEqual(copy(a),copy(b));
 }
});
