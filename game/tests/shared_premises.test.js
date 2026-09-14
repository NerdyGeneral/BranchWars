'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const ctx={};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,P=E.SharedPremises,G=E.GroupAccounting,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x));
const funded=(id,cash)=>G.post(G.opening(id),'fixture.capital','external-founder',{cash,equity:cash});
function fresh(){return {book:P.opening(),bank:A.opening(4),tenants:{adviser:funded('adviser',200000),insurance:funded('insurance',200000)},supplier:G.opening('outside-fitout')};}
const host=(id='office:1',model='retail')=>({id,model,market:id,closed:false,condition:10000,maintenance:'full',legacySpace:0,busy:false});
function context(s,overrides={}){return {month:s.book.month+1,cash:s.bank.accounts.cash,execution:4,offices:[host()],tenants:{
 adviser:{cash:s.tenants.adviser.accounts.cash,available:Object.fromEntries(P.roles.map(k=>[k,['adviser','broker','operations'].includes(k)?4:0])),permissions:['advice','brokerage','custody']},
 insurance:{cash:s.tenants.insurance.accounts.cash,available:Object.fromEntries(P.roles.map(k=>[k,['propertyProducer','benefitsProducer','servicing'].includes(k)?4:0])),permissions:['insuranceProperty','insuranceBenefits','insuranceService']}
},...overrides};}
const plan=extra=>({...copy(P.defaultPlan()),...extra}),build=(kind,office='office:1')=>plan({build:{office,kind}});
const step=(s,p=plan(),extra={})=>P.settle(s.book,p,context(s,extra),s.bank,s.tenants,s.supplier);
const allocation=(room,entity,role,quarters)=>({room,entity,role,quarters});
function open(kind,extra={}){let s=step(fresh(),build(kind),extra);while(s.book.rooms[0].ready===null)s=step(s,plan(),extra);return s;}
const cash=s=>s.bank.accounts.cash+s.supplier.accounts.cash+Object.values(s.tenants).reduce((n,t)=>n+t.accounts.cash,0);
const equity=s=>s.bank.accounts.equity+Object.values(s.tenants).reduce((n,t)=>n+t.accounts.equity,0);

test('fit-out uses real cash and construction time, then opens next month without hiring or permissions',()=>{
 const s=fresh(),before=JSON.stringify(s),q=P.review(s.book,build('wealth'),context(s));
 assert.equal(q.construction,160000);assert.equal(q.committed,1);assert.equal(q.outsideCost,0);assert.equal(JSON.stringify(s),before);
 const first=step(s,build('wealth'));assert.equal(first.book.rooms[0].ready,null);assert.equal(first.bank.accounts.cash,s.bank.accounts.cash-160000);assert.equal(cash(first),cash(s));
 assert.throws(()=>P.review(first.book,plan({allocations:[allocation(1,'adviser','adviser',4)]}),context(first)),/open/);
 const second=step(first);assert.equal(second.book.rooms[0].ready,3);assert.equal(second.book.report.outsideCost,0);
 const third=step(second);assert.equal(third.book.report.outsideCost,3920);assert.equal(third.book.report.delivery.length,0);assert.deepEqual(copy(third.tenants),copy(s.tenants));
 assert.equal(equity(s)-equity(third),160000+3920);assert.equal(cash(s),cash(third));
 const duplicate=P.settle(third.book,build('agency'),context(third,{month:3}),third.bank,third.tenants,third.supplier);
 assert(duplicate.duplicate);assert.deepEqual(copy(duplicate.bank),copy(third.bank));assert.deepEqual(copy(duplicate.book),copy(third.book));
});

test('desk, suite and shared-wing limits reserve finite qualified time across locations and entities',()=>{
 const s=open('visiting');
 assert.throws(()=>P.review(s.book,plan({allocations:[allocation(1,'adviser','adviser',2)]}),context(s)),/space limit/);
 assert.throws(()=>P.review(s.book,plan({allocations:[allocation(1,'insurance','servicing',1)]}),context(s)),/compatible/);
 const c=context(s);c.tenants.adviser.permissions=[];
 assert.throws(()=>P.review(s.book,plan({allocations:[allocation(1,'adviser','adviser',1)]}),c),/authorized/);
 const wingContext={offices:[host('office:1','financialCenter'),host('office:2','wealth')]};
 let w=open('advisoryWing',wingContext);w=step(w,build('wealth','office:2'),wingContext);w=step(w,plan(),wingContext);
 const allocations=[allocation(1,'adviser','adviser',3),allocation(1,'insurance','propertyProducer',4),allocation(2,'adviser','adviser',2)];
 assert.throws(()=>P.review(w.book,plan({allocations}),context(w,wingContext)),/twice/);
 allocations[2].quarters=1;const q=P.review(w.book,plan({allocations}),context(w,wingContext));
 assert.equal(q.reserved.adviser.adviser,4);assert.equal(q.reserved.insurance.propertyProducer,4);assert.equal(q.delivery.reduce((n,a)=>n+a.effectiveQuarters,0),8);
 assert(q.tenantInvoices.adviser>0&&q.tenantInvoices.insurance>0);assert(q.charges.every(r=>r.billed<=r.cost));
});

test('real room space includes commercial suites; added premises must finish before hosting more services',()=>{
 const legacy={offices:[{...host(),legacySpace:1}]};
 assert.throws(()=>P.review(P.opening(),build('visiting'),context(fresh(),legacy)),/Not enough/);
 let s=step(fresh(),build('additionalPremises'),legacy);
 assert.throws(()=>P.review(s.book,build('agency'),context(s,legacy)),/construction/);
 for(let i=0;i<3;i++)s=step(s,plan(),legacy);
 s=step(s,build('agency'),legacy);s=step(s,plan(),legacy);
 assert.equal(P.space(s.book,legacy.offices[0],7).total,4);assert.equal(P.space(s.book,legacy.offices[0],7).used,2);
 assert.throws(()=>P.review(s.book,plan({remove:1}),context(s,legacy)),/excess/);
 assert.throws(()=>P.review(s.book,build('additionalPremises'),context(s,legacy)),/already/);
 assert.throws(()=>P.review(P.opening(),build('visiting'),context(fresh(),{offices:[host('office:1','atm')]})),/ATM/);
});

test('unpaid occupancy remains a paired obligation, not cash; later payment is not a second expense',()=>{
 let s=open('agency');s.tenants.insurance=G.opening('insurance');
 const before=copy(s),orders=plan({allocations:[allocation(1,'insurance','propertyProducer',4)]});
 s=step(s,orders);assert.equal(s.book.report.invoiced,2912);assert.equal(s.book.report.received,0);assert.equal(s.book.arrears.insurance,2912);
 assert.equal(s.tenants.insurance.accounts.payables,2912);assert.equal(s.bank.accounts.receivables,2912);assert.equal(cash(s),cash(before));
 assert.equal(equity(before)-equity(s),2912,'Internal rent cannot create group profit');
 // External founder capital is declared fixture funding, never campaign income.
 s.tenants.insurance=G.post(s.tenants.insurance,'fixture.recapitalization','external-founder',{cash:6000,equity:6000});
 const oldEarnings=s.tenants.insurance.retainedEarnings;s=step(s,plan());
 assert.equal(s.tenants.insurance.retainedEarnings,oldEarnings);assert.equal(s.bank.accounts.receivables,0);assert.equal(s.tenants.insurance.accounts.payables,0);assert.equal(s.book.arrears.insurance,undefined);
});

test('closed hosts, condition and maintenance change delivered service and real costs without multiplying staff',()=>{
 const s=open('wealth'),orders=plan({allocations:[allocation(1,'adviser','adviser',4)]});
 const good=P.review(s.book,orders,context(s));const worn=P.review(s.book,orders,context(s,{offices:[{...host(),condition:5000,maintenance:'off'}]}));
 assert.equal(good.delivery[0].effectiveQuarters,4);assert.equal(worn.delivery[0].effectiveQuarters,2);assert.equal(worn.reserved.adviser.adviser,4);assert.equal(worn.outsideCost,3500);
 assert.equal(P.review(s.book,orders,context(s,{offices:[{...host(),condition:1499}]})).delivery[0].effectiveQuarters,0);
 assert.throws(()=>P.review(s.book,orders,context(s,{offices:[{...host(),closed:true}]})),/open/);
 const closed=step(s,plan(),{offices:[{...host(),closed:true}]});assert.equal(closed.book.report.outsideCost,0);assert.equal(closed.book.rooms.length,1,'Closure does not erase historical fit-out');
});

test('funding, shared construction conflicts, cancellations and malformed states fail atomically',()=>{
 const s=fresh(),before=JSON.stringify(s);
 assert.throws(()=>step(s,build('wealth'),{cash:1000}),/existing bank cash/);
 assert.throws(()=>step(s,build('wealth'),{execution:.5}),/capacity/);
 assert.throws(()=>step(s,build('wealth'),{offices:[{...host(),busy:true}]}),/construction/);
 assert.equal(JSON.stringify(s),before);
 let w=step(s,build('wealth'));w=step(w,plan(),{execution:0});assert.equal(w.book.rooms[0].work,1);
 const spent=w.bank.accounts.cash;w=step(w,plan({cancel:1}));assert.equal(w.bank.accounts.cash,spent);assert.equal(w.book.rooms.length,0);
 const malformed=copy(w.book);malformed.arrears.insurance=-1;assert.throws(()=>P.validate(malformed),/obligation/);
 assert.throws(()=>P.review(w.book,{...plan(),surprise:1},context(w)),/instruction/);
 assert.throws(()=>P.review(w.book,plan(),context(w,{month:99})),/month/);
 const dup=open('visiting');assert.throws(()=>P.review(dup.book,plan({allocations:[allocation(1,'adviser','adviser',1),allocation(1,'adviser','adviser',1)]}),context(dup)),/compatible/);
});

test('unfunded running costs suspend delivery and accrue real claims without trapping an ordinary turn',()=>{
 const s=open('wealth'),orders=plan({allocations:[allocation(1,'adviser','adviser',4)]}),before=copy(s);
 const unpaid=step(s,orders,{cash:0});
 assert.equal(unpaid.book.externalDue,3920);assert.equal(unpaid.book.report.delivery[0].effectiveQuarters,0);
 assert.equal(unpaid.bank.accounts.payables,3920);assert.equal(unpaid.supplier.accounts.businessAssets,3920);
 assert.equal(unpaid.supplier.accounts.cash,before.supplier.accounts.cash);assert.equal(cash(unpaid),cash(before));
 const paid=step(unpaid,plan({remove:1}));assert.equal(paid.book.externalDue,0);assert.equal(paid.bank.accounts.payables,0);
 assert.equal(paid.supplier.accounts.businessAssets,0);assert.equal(paid.book.report.outsideCost,0);assert.equal(paid.book.report.externalPaid,3920);
 assert.equal(paid.supplier.retainedEarnings,unpaid.supplier.retainedEarnings,'Collecting a claim is not new income');
 assert.equal(cash(paid),cash(before));
});

test('occupancy cannot raid reserved payroll cash or accept mismatched entity and receivable books',()=>{
 const s=open('agency'),orders=plan({allocations:[allocation(1,'insurance','propertyProducer',4)]}),c=context(s);c.tenants.insurance.cash=100;
 const after=P.settle(s.book,orders,c,s.bank,s.tenants,s.supplier);assert.equal(after.book.report.received,100);assert.equal(after.book.arrears.insurance,2812);assert.equal(after.tenants.insurance.accounts.cash,199900);
 const bad=copy(after);bad.book.arrears.insurance=3000;const original=JSON.stringify(bad);assert.throws(()=>step(bad),/claim/);assert.equal(JSON.stringify(bad),original);
 const duplicate=copy(s.tenants);duplicate.other=copy(duplicate.insurance);assert.throws(()=>P.settle(s.book,orders,context(s),s.bank,duplicate,s.supplier),/identities/);
});
