'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),{test}=require('node:test');
const c={console},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,A=E.GroupAccounting,I=E.InvestmentInstitution;
function fresh(){return E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,mode:'hotseat',seed:'investment-campaign',created:1});}
function cycle(g,changes={}){
 const plans=g.players.map((p,i)=>{const plan=E.chooseBot(g,i);if(changes[i])plan.investmentPolicy={...E.defaultInvestmentPlan(p),...changes[i]};return plan;});
 E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);return g;
}
function launched(){
 const g=fresh(),p=g.players[0];
 // Explicit shareholder test fixture, not ordinary game income. The actual
 // parent ledger funds the business; no detached test-only parent is used.
 p.financialGroup.parent=A.post(p.financialGroup.parent,'fixture.shareholderContribution','external-shareholder',{cash:1000000,equity:1000000});
 E.validatePilot(g);
 cycle(g,{0:{institution:{...I.defaults(p.investmentBusiness),launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}},pursue:true}});
 for(let n=0;n<3;n++)cycle(g,{0:{pursue:true}});
 return g;
}
test('new investment campaign starts empty and leaves historical campaigns untouched',()=>{
 const g=fresh();assert.equal(g.version,'9.12');assert(g.investmentEconomy.world.clients.length>0);
 assert.equal(g.investmentEconomy.world.issuedUnits,0);assert.equal(g.investmentEconomy.parentCashNet,0);
 assert(g.investmentEconomy.world.clients.every(c=>c.units===0&&c.cash===0));
 assert(g.players.every(p=>p.investmentBusiness.status==='unopened'));E.validatePilot(g);
 const old=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,seed:1,created:1});
 assert.equal(old.version,'9.11');assert.equal(old.investmentServicesVersion,undefined);assert.equal(old.investmentEconomy,undefined);
 const bad=copy(old);bad.investmentEconomy=copy(g.investmentEconomy);assert.throws(()=>E.migrateCampaign(bad),/Unversioned/);
 for(let n=0;n<4;n++)cycle(g);
 assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));
});
test('actual monthly resolution keeps funded deposits, pricing traces, recovery and submission order intact',()=>{
 const original=launched(),p=original.players[0];
 const client=original.investmentEconomy.world.clients.find(c=>c.owner===p.id&&original.investmentEconomy.links.accounts.some(a=>a.clientId===c.id&&a.bankId===p.id));
 assert(client,'Real qualified acquisition must precede funding');
 for(const edits of [{close:true,institution:{...I.defaults(p.investmentBusiness),roles:{adviser:2,broker:0,principal:0,operations:1}}},
  {institution:{...I.defaults(p.investmentBusiness),dividend:999999999}}]){
  const bad=E.chooseBot(original,0);bad.investmentPolicy={...E.defaultInvestmentPlan(p),...edits};
  const frozen=JSON.stringify(original); // AI planning legitimately consumes RNG before submission.
  assert.throws(()=>E.submit(original,0,bad),/closure|dividend/i);
  assert.equal(JSON.stringify(original),frozen,'Rejected investment order changed the campaign');
 }
 const plans=original.players.map((p,i)=>E.chooseBot(original,i));
 plans[0].investmentPolicy={...E.defaultInvestmentPlan(p),pursue:true,funding:[{clientId:client.id,amount:100,destination:'cash'}]};
 function resolve(reverse,restore){
  let g=copy(original);const first=reverse?1:0,last=1-first;
  E.submit(g,first,copy(plans[first]));if(restore)g=E.migrateCampaign(copy(g));
  E.submit(g,last,copy(plans[last]));E.validatePilot(g);E.validateLedger(g);
  assert.equal(g.investmentEconomy.world.bankCashNet,100);assert.equal(g.investmentEconomy.links.transfers.length,1);
  assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));return g;
 }
 const a=resolve(false,false),b=resolve(true,false),d=resolve(false,true);
 assert.deepEqual(copy(a),copy(b));assert.deepEqual(copy(a),copy(d));
 for(let n=0;n<8;n++)cycle(a);
 assert.equal(a.investmentEconomy.world.bankCashNet,100,'Standing plans must not repeat the one-shot transfer');
 const restored=E.migrateCampaign(copy(a));assert.deepEqual(copy(restored),copy(a));
 const views=[0,1].map(i=>E.publicState(a,i));
 for(const v of views){E.validateFinancialGroupView(v);assert.equal(v.rival.investmentBusiness,undefined);assert.equal(v.rival.investmentSnapshot,undefined);}
});
module.exports={fresh,launched,cycle,E,copy};
