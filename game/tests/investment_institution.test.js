'use strict';
// Domain acceptance only. This unfinished module is deliberately not exposed in
// the portable game before customer assets and campaign integration are ready.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),c={};
vm.runInNewContext(['src/engine/group-accounting.js','src/engine/investment-institution.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\nthis.A=GroupAccounting;this.I=InvestmentInstitution;',c);
const {A,I}=c,copy=x=>JSON.parse(JSON.stringify(x));let checks=0,months=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fixture(){return {parent:A.post(A.opening('owner:parent'),'fixture.openingEndowment','fixture',{cash:5000000,equity:5000000}),entity:I.opening('owner'),supplier:A.opening('outside:investment-services')};}
function plan(w,extra={}){return {...I.defaults(w.entity),...extra};}
function advance(w,extra={}){
 const before=JSON.stringify(w),s=plan(w,extra),r=I.step(w.parent,w.entity,w.supplier,s,w.entity.month+1);
 assert.equal(JSON.stringify(w),before,'domain settlement must be atomic and pure');
 assert.equal(r.parent.accounts.cash+r.entity.book.accounts.cash+r.supplier.accounts.cash,5000000);
 assert.equal(r.entity.book.accounts.payables,r.supplier.accounts.businessAssets);
 assert.equal(r.parent.accounts.investments,r.entity.capitalBasis);
 I.validate(r.entity);months++;
 return {parent:r.parent,entity:r.entity,supplier:r.supplier};
}
const advice={launch:true,capital:400000,roles:{adviser:1,broker:0,principal:0,operations:1}};
test('unfunded preview returns a shortfall without inventing cash, credentials or a license',()=>{
 const w=fixture(),s=plan(w,{...advice,capital:0}),before=JSON.stringify({w,s});
 const q=I.quote(w.entity,s,1);assert(q.requiredFunding>120000);assert.equal(q.permissions.advice,false);
 assert.equal(q.permissions.accountCapacity,0);assert.equal(q.entity.book.accounts.cash,0);
 assert.equal(JSON.stringify({w,s}),before);assert.throws(()=>advance(w,{...advice,capital:0}),/fund/);
 const idle=advance(w);assert.equal(idle.entity.status,'unopened');assert.equal(idle.entity.book.sequence,0);
});
test('formation, recruitment, ongoing payroll and registration are distinct and paid once',()=>{
 let w=fixture();const q=I.quote(w.entity,plan(w,advice),1);w=advance(w,advice);
 assert.equal(w.entity.report.upfront,43000);assert.equal(w.entity.report.recurring,14900);
 assert.equal(w.entity.report.paid,q.total);assert.equal(w.entity.employees.length,2);
 assert.equal(w.entity.report.permitted.accountCapacity,0);assert.equal(w.entity.permissions.advice.ready,3);
 w=advance(w);assert.equal(w.entity.report.upfront,0);assert.equal(w.entity.report.recurring,14900);
 assert.equal(w.entity.report.permitted.available.adviser,4);assert.equal(w.entity.report.permitted.advice,false);
 w=advance(w);assert.equal(w.entity.report.permitted.advice,true);assert.equal(w.entity.report.permitted.brokerage,false);
 assert.equal(w.entity.report.permitted.accountCapacity,200);
 const consolidated=A.consolidate(w.parent,[w.entity.book]);
 assert.equal(consolidated.operatingAssets,5000000-w.supplier.accounts.cash);
 assert.equal(consolidated.eliminatedInvestment,w.entity.capitalBasis);
});
test('generic bankers and facilities cannot substitute for qualified investment professionals',()=>{
 const w=fixture();assert.throws(()=>I.quote(w.entity,plan(w,{...advice,roles:{business:2}}),1),/instructions/);
 assert.throws(()=>I.quote(w.entity,plan(w,{...advice,roles:{...advice.roles,adviser:17}}),1),/instructions/);
 let b=advance(w,{launch:true,capital:600000,advice:false,brokerage:true,roles:{adviser:0,broker:1,principal:0,operations:1}});
 for(let n=0;n<4;n++)b=advance(b);
 assert.equal(b.entity.report.permitted.brokerage,false);assert.equal(b.entity.report.permitted.accountCapacity,0);
 b=advance(b,{roles:{adviser:0,broker:1,principal:1,operations:1}});
 assert.equal(b.entity.report.permitted.brokerage,false);assert.equal(b.entity.report.hires,1);
 b=advance(b);assert.equal(b.entity.report.permitted.brokerage,true);assert.equal(b.entity.report.permitted.accountCapacity,250);
});
test('expired qualifications suspend throughput; paid education consumes time',()=>{
 let w=advance(fixture(),{...advice,capital:1000000});
 while(w.entity.month<13)w=advance(w,{maintain:false});
 w=advance(w,{maintain:false});assert.equal(w.entity.report.permitted.advice,false);
 assert.equal(w.entity.report.permitted.available.adviser,0);
 w=advance(w,{maintain:true});assert.equal(w.entity.report.permitted.advice,true);
 assert.equal(w.entity.report.permitted.available.adviser,3);assert.equal(w.entity.report.permitted.accountCapacity,150);
 assert.equal(w.entity.report.recurring,14900+1500+3000);
});
test('custody assets never fund launch, payroll or distributions',()=>{
 let w=advance(fixture(),advice);const originalCash=w.entity.book.accounts.cash;
 w.entity.book=A.custody(w.entity.book,9000000,'client-ledger');I.validate(w.entity);
 const q=I.quote(w.entity,plan(w),2);assert.equal(w.entity.book.accounts.cash,originalCash);
 assert.equal(q.minimumCapital,I.RULES.capitalExternal);assert.equal(q.reserve,q.recurring*3);
 assert.throws(()=>advance(w,{dividend:100000}),/Dividend/);
 const total=A.consolidate(w.parent,[w.entity.book]);assert.equal(total.custodyAssets,9000000);
 assert.equal(total.operatingAssets,w.parent.accounts.cash+w.entity.book.accounts.cash);
});
test('provider migrations take paid work and preserve the live provider until completion',()=>{
 let w=advance(fixture(),{...advice,capital:700000});w=advance(w);w=advance(w);
 w=advance(w,{provider:'harbor'});assert.equal(w.entity.policy.provider,'atlas');assert.equal(w.entity.migration.work,1);
 assert.equal(w.entity.report.upfront,25000);assert.equal(w.entity.report.permitted.available.operations,0);
 assert.equal(I.defaults(w.entity).provider,'harbor');
 assert.throws(()=>advance(w,{provider:'atlas'}),/Finish/);
 w=advance(w);assert.equal(w.entity.migration.work,2);assert.equal(w.entity.report.upfront,0);
 w=advance(w);assert.equal(w.entity.migration,null);assert.equal(w.entity.policy.provider,'harbor');
 assert.equal(w.entity.report.migrationCompleted.work,3);
 w=advance(w);assert.equal(w.entity.report.recurring,14000);
});
test('owned carrying waits for its own permission and does not make clearing internal',()=>{
 let w=advance(fixture(),{launch:true,capital:2000000,advice:false,brokerage:true,roles:{adviser:0,broker:1,principal:1,operations:1}});
 while(w.entity.month<4)w=advance(w);
 w=advance(w,{custody:'owned'});assert.equal(w.entity.policy.custody,'external');assert.equal(w.entity.report.upfront,205000);
 assert.equal(w.entity.permissions.custody.ready,9);
 while(w.entity.month<8)w=advance(w);
 assert.equal(w.entity.migration.work,4);assert.equal(w.entity.policy.custody,'external');
 w=advance(w);assert.equal(w.entity.migration,null);assert.equal(w.entity.policy.custody,'owned');
 assert.equal(w.entity.report.permitted.custody,true);assert.equal(w.entity.report.permitted.custodyCapacity,500);
 assert.equal(w.entity.report.recurring,6000+8500+4200+1200+9000+750);
});
test('unpaid obligations suspend permissions and support is capped and paired',()=>{
 let w=advance(fixture(),{...advice,capital:200000});
 while(w.entity.book.accounts.cash>20000)w=advance(w,{maintain:false});
 w=advance(w,{maintain:false});w=advance(w,{maintain:false});
 assert(w.entity.book.accounts.payables>0);assert.equal(w.entity.report.permitted.advice,false);
 const before=w.parent.accounts.cash;w=advance(w,{supportCap:5000,maintain:false});
 assert.equal(w.entity.report.support,5000);assert.equal(before-w.parent.accounts.cash,5000);
 assert.equal(w.entity.report.permitted.advice,false);
 assert.throws(()=>advance(w,{supportCap:100001}),/instructions/);
});
test('malformed identities, permissions, reports, migration and replayed months fail atomically',()=>{
 let w=advance(fixture(),advice);w=advance(w);w=advance(w);
 for(const mutate of [x=>x.owner=17,x=>x.employees[0].role='constructor',x=>x.employees[0].id='foreign:investment-worker:1',
  x=>x.employees.push(copy(x.employees[0])),x=>x.permissions.advice.ready=0,x=>x.report.permitted.accountCapacity++,
  x=>x.report.permitted.available.adviser=100,x=>x.report.extra=true,x=>x.capitalBasis++,x=>x.report=null]){
  const e=copy(w.entity);mutate(e);const before=JSON.stringify(e);assert.throws(()=>I.validate(e));assert.equal(JSON.stringify(e),before);
 }
 const before=JSON.stringify(w);assert.throws(()=>I.step(w.parent,w.entity,w.supplier,plan(w),w.entity.month),/sequence/);
 assert.throws(()=>I.step(w.parent,w.entity,w.parent,plan(w),w.entity.month+1),/distinct/);assert.equal(JSON.stringify(w),before);
 const a=advance(w),b=advance(copy(w));assert.deepEqual(a,b);
});
console.log(JSON.stringify({status:'PASS',checks,months,scope:'Pure institution domain only; not playable campaign integration, asset servicing, balance or release acceptance.'}));
