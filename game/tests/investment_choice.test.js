'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine;
function fresh(engine=E,choice=true){return engine.createGame({...engine.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,...(choice?{investmentChoiceVersion:1}:{}),mode:'hotseat',seed:'investment-choice',created:1});}
function plans(g,engine=E){return g.players.map((p,i)=>({...engine.chooseBot(g,i),investmentPolicy:engine.defaultInvestmentPlan(p)}));}
function next(g,orders,engine=E,reverse=false){const n=copy(g);engine.submit(n,reverse?1:0,copy(orders[reverse?1:0]));const loaded=engine.migrateCampaign(n);engine.submit(loaded,reverse?0:1,copy(orders[reverse?0:1]));engine.validatePilot(loaded);engine.validateLedger(loaded);return loaded;}
function fund(g,engine=E){const p=g.players[0];p.financialGroup.parent=engine.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});return g;}
function launchOrders(g,engine=E){const p=plans(g,engine);p[0].investmentPolicy.institution={...engine.InvestmentInstitution.defaults(g.players[0].investmentBusiness),launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1},feeBp:60};p[0].investmentPolicy.pursue=true;return p;}

test('customer priorities are stable, explainable and respond to real fees, delivery and continuity',()=>{
 const C=E.InvestmentCustomerChoice,I=E.InvestmentInstitution,clients={};
 for(let n=0;Object.keys(clients).length<3;n++){const c={id:'account:'+n,owner:'a',custodian:'atlas',acquired:1,missed:0};clients[C.profile(c).key]=c;}
 const e={...I.opening('a'),policy:{...I.defaults(I.opening('a')),feeBp:120}};
 assert(!C.assess(clients.price,e,80,13).acceptable);assert(C.assess(clients.service,e,80,13).acceptable);
 for(const c of Object.values(clients)){
  const before=JSON.stringify({c,e});const r=C.assess(c,e,80,13);
  assert(r.score>C.assess({...c,missed:1},e,80,13).score);
  assert(r.score>C.assess({...c,custodian:'harbor'},e,80,13).score);
  assert(r.score>C.assess(c,e,80,1).score);
  assert(C.assess(c,{...e,policy:{...e.policy,feeBp:60}},80,13).score>r.score);
  assert.equal(C.profile({...c,owner:'b',custodian:'harbor'}).key,C.profile(c).key);
  assert.equal(JSON.stringify({c,e}),before);
 }
 assert.equal(C.assess(clients.service,{...e,policy:{...e.policy,provider:'harbor'}},80,13).service,0,'A pending provider change is not actual service quality');
 assert(C.assess({...clients.service,owner:null}, {...e,policy:{...e.policy,provider:'harbor'}},80,13).service<0);
});

test('choice marker is explicit, preserves original accounts and fails closed on inconsistent saves or peers',()=>{
 const g=fresh(),old=fresh(E,false);assert.equal(g.version,'9.16');assert.equal(g.investmentEconomy.world.choiceVersion,1);
 assert.deepEqual(copy(g.investmentEconomy.world.clients),copy(old.investmentEconomy.world.clients));
 assert.equal(g.investmentEconomy.world.openingCash,old.investmentEconomy.world.openingCash);
 const v=E.publicState(g,0);E.validateFinancialGroupView(v);assert.equal(v.investmentChoiceVersion,1);assert.equal(v.rival.investmentChoiceVersion,undefined);
 const caps=E.campaignCapabilities();delete caps.investmentChoiceSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'investmentChoiceVersion');
 for(const mutate of [x=>delete x.investmentChoiceVersion,x=>delete x.investmentEconomy.world.choiceVersion,x=>x.version='9.15',x=>x.investmentChoiceVersion=2,x=>x.investmentEconomy.world.choiceVersion=0]){const bad=copy(g);mutate(bad);assert.throws(()=>E.migrateCampaign(bad));}
 assert.equal(E.migrateCampaign(copy(old)).investmentChoiceVersion,undefined);
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.16');assert.equal(g.investmentEconomy.world.choiceVersion,1);E.validatePilot(g);
});

test('funded customers can reject a fee increase without losing assets or copying bank deposit claims',()=>{
 let g=fund(fresh());g=next(g,launchOrders(g));
 for(let n=0;n<3;n++){const o=plans(g);o[0].investmentPolicy.pursue=true;g=next(g,o);}
 const owner=g.players[0].id,sourceIds=new Set(g.investmentEconomy.links.accounts.filter(a=>a.bankId===owner).map(a=>a.clientId));
 const c=g.investmentEconomy.world.clients.find(c=>c.owner===owner&&sourceIds.has(c.id)&&E.InvestmentCustomerChoice.profile(c).key==='price');assert(c,'Acquired price-conscious customer');
 let o=plans(g);o[0].investmentPolicy.funding=[{clientId:c.id,amount:2000,destination:'cash'}];g=next(g,o);
 assert.equal(g.players[0].investmentReport.transfers[0].paid,2000);
 o=plans(g);o[0].investmentPolicy.cashOrders=[{clientId:c.id,mode:'affiliated',buffer:100}];g=next(g,o);
 const before=g.investmentEconomy.world.clients.find(x=>x.id===c.id),value=E.InvestmentClients.value(g.investmentEconomy.world,before);
 const claim=g.investmentEconomy.world.cashRoutes.accounts.find(x=>x.clientId===c.id).deposit,transfers=copy(g.investmentEconomy.links.transfers);
 if(process.argv.includes('--fixture'))fs.writeFileSync(path.join(__dirname,'../output/investment-choice-browser-qa.json'),JSON.stringify(g));
 o=plans(g);o[0].investmentPolicy.institution.feeBp=120;
 const result=next(g,o);assert.deepEqual(result,next(g,o,E,true),'Submission order and checkpoint restoration must not change customer choice');
 const w=result.investmentEconomy.world,after=w.clients.find(x=>x.id===c.id);
 assert.equal(after.owner,null);assert.equal(E.InvestmentClients.value(w,after),value-(after.fees-before.fees));
 const cashWork=w.cashRoutes.report.find(x=>x.clientId===c.id);
 assert.equal(w.cashRoutes.accounts.find(x=>x.clientId===c.id).deposit,claim+cashWork.placed-cashWork.released,'Only the actual standing cash refill may change the bank claim, not departure');assert.deepEqual(copy(result.investmentEconomy.links.transfers),transfers);
 assert.equal(w.clients.length,g.investmentEconomy.world.clients.length);assert(w.reports[0].lost>0);
 const view=E.publicState(result,0);E.validateFinancialGroupView(view);assert(!view.me.investmentSnapshot.clients.some(x=>x.id===c.id),'Departed customer details are no longer exposed to former adviser');
});

test('frozen 9.15 creation, funded operations, AI, RNG, public views and resume stay exact',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_sweeps1_900f62d2.html'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'900f62d20ad78b2cf6828bd9c428952797b9ae8edbd7ff08f8ce65f5889eca05');
 const old={console};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);const O=old.BWEngine;
 let a=fund(fresh(O,false),O),b=fund(fresh(E,false));assert.deepEqual(copy(a),copy(b));
 for(let month=0;month<4;month++){
  const pa=month?plans(a,O):launchOrders(a,O),pb=month?plans(b):launchOrders(b);assert.deepEqual(copy(pa),copy(pb));
  a=next(a,pa,O);b=next(b,pb);assert.deepEqual(copy(a),copy(b));
  for(const i of [0,1])assert.deepEqual(copy(O.publicState(a,i)),copy(E.publicState(b,i)));
 }
});
