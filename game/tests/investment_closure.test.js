'use strict';
// Pure-domain integration, not campaign/network or release acceptance.
const assert=require('node:assert/strict');
const {fixture,tick,advice,owned,A,I,C,S,totalCash}=require('./investment_clients.test');
const copy=x=>JSON.parse(JSON.stringify(x));let checks=0,months=0;
function test(name,fn){if(require.main!==module)return;fn();checks++;console.log('PASS '+name);}
function advance(w,changes=[{},{}],options,offering=[true,false]){
 const before=JSON.stringify(w),plans=w.entities.map((e,i)=>({...I.defaults(e),...changes[i]}));
 const offers=w.entities.map((e,i)=>({owner:e.owner,market:'downtown',reputation:80,pursue:offering[i]}));
 const result=S.advance(w,plans,offers,100,options);months++;
 assert.equal(JSON.stringify(w),before,'Failed or successful settlement must preserve input');
 assert.equal(totalCash(result)-result.world.outsideCashNet-result.world.bankCashNet,result.openingCash);
 for(const [i,e]of result.entities.entries()){I.validate(e);assert.equal(result.parents[i].accounts.investments,e.capitalBasis);}
 C.validate(result.world,result.entities);return copy(result);
}
function invoice(w,amount){
 const result=copy(w),e=result.entities[0],v=result.supplier;
 e.book=A.post(e.book,'fixture.unexpectedBill',v.entityId,{payables:amount,equity:-amount},-amount);
 result.supplier=A.post(v,'fixture.unexpectedBill',e.book.entityId,{businessAssets:amount,equity:amount},amount);
 e.report.permitted=I.permissionState(e,e.month,e.report.permitted.available);
 I.validate(e);return result;
}
const options=close=>({reservedParentCash:[0,0],close:[close,false]});
const aggregateEarnings=w=>w.parents.reduce((n,p)=>n+p.retainedEarnings,0)+w.entities.reduce((n,e)=>n+e.book.retainedEarnings,0)+w.supplier.retainedEarnings;

test('ordered boundary exactly matches existing funded operations until a closure is needed',()=>{
 let w=fixture(9);
 for(let n=0;n<8;n++){const changes=n===0?[advice,{}]:[{},{}];
  assert.deepEqual(advance(w,changes),copy(tick(w,changes)));w=advance(w,changes);}
});

test('natural cash exhaustion closes once and future months do not accrue payroll',()=>{
 let w=advance(fixture(0,0),[advice,{}]);
 while(w.entities[0].status==='active'&&w.world.month<70)w=advance(w);
 const e=w.entities[0];assert.equal(e.status,'closed');assert(e.closure.writtenOff>0);
 assert.equal(e.closure.realized,-advice.capital);assert.equal(w.parents[0].retainedEarnings,-advice.capital);
 assert.equal(e.book.retainedEarnings,0);assert.equal(e.employees.length,0);assert.equal(e.closures,1);
 const before=copy(w),sequence=e.book.sequence,supplier=copy(w.supplier);
 for(let n=0;n<6;n++)w=advance(w);
 assert.equal(w.entities[0].book.sequence,sequence);assert.deepEqual(w.supplier,supplier);
 assert.equal(w.entities[0].closures,1);assert.equal(aggregateEarnings(w),aggregateEarnings(before));
 assert.throws(()=>I.close(w.parents[0],w.entities[0],w.supplier,'insolvent'),/closure/);
});

test('owned custody is returned intact before insolvency and creditor losses reconcile',()=>{
 let w=advance(fixture(9),[owned,{}]);for(let n=0;n<8;n++)w=advance(w);
 assert(w.entities[0].book.accounts.custodyAssets>0);
 w=invoice(w,w.entities[0].book.accounts.cash+100000);
 const before=copy(w),positions=w.world.clients.map(c=>[c.id,c.units,c.cash]),earnings=aggregateEarnings(w);
 assert.throws(()=>I.close(w.parents[0],w.entities[0],w.supplier,'insolvent'),/client assets/);
 w=advance(w);
 assert.equal(w.entities[0].status,'closed');assert.equal(w.world.reports[0].fees,0);
 assert.deepEqual(w.world.clients.map(c=>[c.id,c.units,c.cash]),positions);
 assert(w.world.clients.every(c=>c.owner===null&&['atlas','harbor'].includes(c.custodian)));
 assert.equal(w.entities[0].book.accounts.custodyAssets,0);assert.equal(w.supplier.accounts.businessAssets,0);
 assert.equal(aggregateEarnings(w),earnings);assert.equal(totalCash(w),totalCash(before));
 assert.equal(w.parents[0].accounts.investments,0);assert(w.entities[0].closure.writtenOff>=100000);
 assert.deepEqual(advance(copy(w)),advance(w),'Restoring closed books must replay deterministically');
});

test('voluntary closure returns residual capital and preserves the disposed operating result',()=>{
 let w=advance(fixture(9),[advice,{}]);for(let n=0;n<4;n++)w=advance(w);
 const serviced=tick(w,[{},{}],[false,false]),expected=serviced.entities[0].book.accounts.cash;
 const result=advance(w,[{},{}],options(true));
 assert.equal(result.entities[0].closure.reason,'voluntary');assert.equal(result.entities[0].closure.writtenOff,0);
 assert.equal(result.entities[0].closure.returned,expected);
 assert.equal(result.parents[0].retainedEarnings,serviced.entities[0].book.retainedEarnings);
 assert.equal(aggregateEarnings(result),aggregateEarnings(serviced));
 assert.equal(result.world.reports[0].aum,0);assert(result.world.reports[0].lost>0);
 assert.equal(result.world.reports[0].fees,serviced.world.reports[0].fees,'Final service is billed once');
 assert.throws(()=>I.close(w.parents[0],w.entities[0],w.supplier,'insolvent'),/explicit/);
});

test('a solvent capital shortfall suspends selling but does not force liquidation',()=>{
 let w=advance(fixture(0),[advice,{}]);
 w=invoice(w,w.entities[0].book.accounts.cash-100000);
 w=advance(w);assert.equal(w.entities[0].status,'active');assert.equal(w.entities[0].book.accounts.payables,0);
 assert(w.entities[0].book.accounts.equity>0);assert.equal(w.entities[0].report.permitted.advice,false);
});

test('closure can cancel a pending provider migration without fresh parent support',()=>{
 let w=advance(fixture(9),[advice,{}]);for(let n=0;n<3;n++)w=advance(w);
 w=advance(w,[{provider:'harbor',supportCap:100000},{}]);assert(w.entities[0].migration);
 w=invoice(w,w.entities[0].book.accounts.cash-50000);
 const parentCash=w.parents[0].accounts.cash,basis=w.entities[0].capitalBasis;
 const result=advance(w,[{},{}],options(true)),e=result.entities[0];
 assert.equal(e.status,'closed');assert.equal(e.migration,null);assert.equal(e.closure.basis,basis);
 assert.equal(result.parents[0].accounts.cash,parentCash+e.closure.returned);
 assert.equal(e.policy.supportCap,0);assert(result.world.clients.every(c=>c.owner===null));
});

test('profitable disposal moves earnings to the parent, not a second group gain',()=>{
 // Nine explicitly large existing test portfolios, not extra assets added each
 // month or a proposed live-campaign endowment. Dealer funding stays finite.
 let w=fixture(0,8000000);
 w.world=C.opening(Array.from({length:9},(_,i)=>({id:'large-fixture:'+i,market:'downtown',service:'advice',units:100000,custodian:'atlas'})),w.world.dealer);
 w=advance(w,[advice,{}]);for(let n=0;n<7;n++)w=advance(w);
 assert(w.entities[0].book.retainedEarnings>0);
 const serviced=tick(w,[{},{}],[false,false]),result=advance(w,[{},{}],options(true));
 assert(result.entities[0].closure.realized>0);
 assert.equal(result.parents[0].retainedEarnings,serviced.entities[0].book.retainedEarnings);
 assert.equal(aggregateEarnings(result),aggregateEarnings(serviced));
 assert.equal(result.entities[0].book.retainedEarnings,0);
});

test('funded restart retains history but cannot reuse employees or old permissions',()=>{
 let w=advance(fixture(9),[advice,{}]);w=advance(w,[{},{}],options(true));
 const closure=copy(w.entities[0].closure),counter=w.entities[0].nextEmployee;
 assert.throws(()=>advance(w,[{capital:700000},{}]),/Form and fund/);
 w=advance(w,[advice,{}]);assert.equal(w.entities[0].status,'active');assert.deepEqual(w.entities[0].closure,closure);
 assert.equal(w.entities[0].closures,1);assert.equal(w.entities[0].employees[0].id,'a:investment-worker:'+counter);
 assert.equal(w.entities[0].report.permitted.advice,false);assert.equal(w.world.reports[0].won,0);
 assert.equal(w.entities[0].permissions.advice.applied,w.world.month);assert.equal(w.entities[0].report.upfront,43000);
 assert.throws(()=>I.step(w.parents[0],w.entities[0],w.supplier,I.defaults(w.entities[0]),w.world.month),/sequence/);
});

test('reserved parent cash cannot fund launch or be consumed by standing support',()=>{
 let w=fixture(0);const before=JSON.stringify(w);
 assert.throws(()=>advance(w,[advice,{}],{reservedParentCash:[4500000,0],close:[false,false]}),/unreserved/);
 assert.equal(JSON.stringify(w),before);
 w=advance(w,[advice,{}]);w=invoice(w,w.entities[0].book.accounts.cash-130000);
 const parentCash=w.parents[0].accounts.cash;
 w=advance(w,[{supportCap:100000},{}],{reservedParentCash:[parentCash-2000,0],close:[false,false]});
 assert.equal(w.entities[0].report.support,2000);assert.equal(w.parents[0].accounts.cash,parentCash-2000);
 assert.equal(w.entities[0].capitalBasis,702000);
});

test('invalid second-player orders and closure conflicts leave the whole month unchanged',()=>{
 const start=fixture(9),before=JSON.stringify(start);
 assert.throws(()=>advance(start,[advice,{...advice,capital:1}]),/fund/);assert.equal(JSON.stringify(start),before);
 let w=advance(start,[advice,{}]);
 for(const change of [{capital:1},{launch:true},{provider:'harbor'},{brokerage:true},{roles:{...advice.roles,adviser:2}}]){
  const source=JSON.stringify(w);assert.throws(()=>advance(w,[change,{}],options(true)));assert.equal(JSON.stringify(w),source);}
 const malformed=copy(w);malformed.entities[0].status='closed';assert.throws(()=>advance(malformed));
 const closed=advance(w,[{},{}],options(true));closed.entities[0].closure.realized++;assert.throws(()=>advance(closed),/closure/);
});
if(require.main===module)console.log(JSON.stringify({status:'PASS',checks,months,scope:'Isolated ordered closure, conservation and recovery; not live campaign or release acceptance.'}));
module.exports={advance};
