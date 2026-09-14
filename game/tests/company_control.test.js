'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),ctx={};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const {GroupAccounting:G,CompanyControl:C,CompanyControlSettlement:S}=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const funded=(id,cash,assets=0)=>G.post(G.opening(id),'fixture.shareholders','external-test-founder',{cash,businessAssets:assets,equity:cash+assets});
function fresh(){
 // These are explicit already-funded domain fixtures, not a new-game endowment
 // or evidence that an ordinary bank can immediately afford an acquisition.
 const c={id:'factory',issued:100000,referenceCents:1000,equity:1000000,profits:[30000,40000,35000],capitalRevision:0,suspended:false,distributableMonthly:10000};
 const holders=[{id:'bank-a',book:funded('parent-a',1000000),positions:{factory:{shares:0,basis:0}}},{id:'bank-b',book:funded('parent-b',1000000),positions:{factory:{shares:0,basis:0}}},{id:'outside',book:funded('outside',100000,1000000),positions:{factory:{shares:100000,basis:1000000}}}];
 const paid=C.startDiligence(holders[0].book,G.opening('reviewers'),c,1);holders[0].book=paid.parent;
 const data={holders,lender:funded('lender',500000),exchange:G.opening('exchange')};
 const context={company:c,month:2,buyerEntityId:'parent-a',parentCash:holders[0].book.accounts.cash,protectedCash:50000,lenderCash:data.lender.accounts.cash,existingMonthlyCash:20000,existingDebtService:0,ownership:holders.map(h=>({id:h.id,shares:h.positions.factory.shares})),consents:[]};
 const offer={id:'bank-a/factory/2',buyer:'bank-a',issuer:'factory',shares:50001,priceCents:1150,borrow:200000,submittedMonth:2};
 return {c,data,context,offer,diligence:paid.record,provider:paid.provider};
}
const cash=data=>data.holders.reduce((n,h)=>n+h.book.accounts.cash,0)+data.lender.accounts.cash+data.exchange.accounts.cash;
function closing(f=fresh()){const pending=S.pending(f.context,f.offer,f.diligence);f.context.month=3;return {f,result:S.close(pending,f.context,f.data),pending};}

test('diligence costs are paid to a real counterparty, bound to owner, and expire',()=>{
 const f=fresh();assert.equal(f.provider.accounts.cash,10000);assert.equal(f.data.holders[0].book.accounts.cash,990000);assert.equal(C.diligenceQuote({...f.c,equity:1},1).fee,5000);assert.equal(C.diligenceQuote({...f.c,equity:9000000},1).fee,50000);
 const before=JSON.stringify(f);C.review(f.context,f.offer,f.diligence);assert.equal(JSON.stringify(f),before);
 for(const change of [{month:1},{month:5},{buyerEntityId:'parent-b'},{company:{...f.c,capitalRevision:1}},{company:{...f.c,suspended:true}}])assert.throws(()=>C.review({...f.context,...change},f.offer,f.diligence));
 assert.throws(()=>C.startDiligence(f.data.holders[0].book,f.provider,f.c,1,989000),/cash/);assert.equal(JSON.stringify(f),before);
});

test('control review enforces premiums, actual funds, debt coverage and whole amounts',()=>{
 const f=fresh(),q=C.review(f.context,f.offer,f.diligence);assert.equal(q.ownershipAfter,50001);assert.equal(q.purchase,575012);assert.equal(q.initialService,7056);assert.equal(q.parentRequired,q.equityFunding+q.buyerFee+q.integrationCost+q.debtReserve);
 for(const change of [{shares:50000},{shares:50000.5},{priceCents:1149},{borrow:230005},{borrow:Infinity},{submittedMonth:3}])assert.throws(()=>C.review(f.context,{...f.offer,...change},f.diligence));
 for(const change of [{parentCash:q.parentRequired+f.context.protectedCash-1},{lenderCash:199999},{existingMonthlyCash:0},{company:{...f.c,profits:[-1]}},{protectedCash:NaN}])assert.throws(()=>C.review({...f.context,...change},f.offer,f.diligence));
 assert.doesNotThrow(()=>C.review({...f.context,existingMonthlyCash:0,company:{...f.c,profits:[-1]}},{...f.offer,borrow:0},f.diligence),'An all-equity buyer may choose a loss-making but solvent target');
});

test('rival votes require offer-specific consent, never coerced transfers',()=>{
 const f=fresh();f.context.ownership=[{id:'bank-a',shares:0},{id:'bank-b',shares:60000},{id:'outside',shares:40000}];
 assert.throws(()=>C.review(f.context,f.offer,f.diligence),/consent/);
 assert.throws(()=>C.review({...f.context,consents:[{offerId:'stale',seller:'bank-b',shares:10001}]},f.offer,f.diligence),/stale/);
 const q=C.review({...f.context,consents:[{offerId:f.offer.id,seller:'bank-b',shares:10001}]},f.offer,f.diligence);assert.deepEqual(copy(q.sellers),[{id:'outside',shares:40000},{id:'bank-b',shares:10001}]);
 assert.throws(()=>C.review({...f.context,consents:[{offerId:f.offer.id,seller:'outside',shares:10001}]},f.offer,f.diligence),/consent/);
});

test('competing offers prefer price then equity, with rotating identity ties',()=>{
 const f=fresh(),a={offer:f.offer,quote:C.review(f.context,f.offer,f.diligence)},b=copy(a);b.offer.buyer='bank-b';b.offer.id='bank-b/factory/2';
 assert.notEqual(C.choose([a,b],2,0),C.choose([a,b],3,0));assert.equal(C.choose([a,b],2,0),C.choose([b,a],2,0));
 b.quote.equityFunding++;assert.equal(C.choose([a,b],2,0),b.offer.id);a.offer.priceCents++;assert.equal(C.choose([a,b],2,0),a.offer.id);
});

test('one-month settlement conserves money and shares, records debt, fees and premium',()=>{
 const f=fresh(),record=S.pending(f.context,f.offer,f.diligence),before=JSON.stringify(f),cashBefore=cash(f.data);
 assert.throws(()=>S.close(record,f.context,f.data),/ready/);const result=S.close(record,{...f.context,month:3},f.data);assert.equal(JSON.stringify(f),before);
 assert.equal(cash(result),cashBefore);assert.equal(result.holders.reduce((n,h)=>n+h.positions.factory.shares,0),100000);assert.equal(result.holders[0].positions.factory.shares,50001);assert.equal(result.holders[0].positions.factory.basis,result.quote.purchase);
 assert.equal(result.holders[0].book.accounts.debt,200000);assert.equal(result.lender.accounts.businessAssets,200000);assert.equal(result.exchange.accounts.cash,result.fees);
 assert.equal(result.receipts.reduce((n,r)=>n+r.consideration,0),result.quote.purchase);assert.equal(result.record.integration.workDone,0);assert.equal(result.record.loan.principalPaid,0);
 assert.throws(()=>S.close(result.record,{...f.context,month:3},result),/first settlement/);assert.throws(()=>S.close(S.cancel(record),{...f.context,month:3},f.data),/first settlement/);
 assert.throws(()=>S.close(record,{...f.context,month:3,parentCash:f.context.parentCash+1},f.data),/current/);
});

test('multiple sellers release proportional basis and reconcile fractional-dollar proceeds',()=>{
 const f=fresh();f.offer.priceCents=1151;const outside=f.data.holders[2],rival=f.data.holders[1];
 outside.positions.factory={shares:40001,basis:400010};rival.positions.factory={shares:59999,basis:599990};
 outside.book=G.post(outside.book,'fixture.completedSale','parent-b',{cash:599990,businessAssets:-599990});rival.book=G.post(rival.book,'fixture.completedPurchase','outside',{cash:-599990,businessAssets:599990});
 f.context.ownership=f.data.holders.map(h=>({id:h.id,shares:h.positions.factory.shares}));f.context.consents=[{offerId:f.offer.id,seller:'bank-b',shares:10000}];
 const before=cash(f.data),{result}=closing(f);assert.equal(cash(result),before);assert.equal(result.receipts.length,2);assert.equal(result.receipts.reduce((n,r)=>n+r.consideration,0),result.quote.purchase);
 assert.equal(result.holders[2].positions.factory.basis,0);assert.equal(result.holders[1].positions.factory.shares,49999);
});

test('debt amortizes over 36 months; inability to pay leaves real obligations and no free reset',()=>{
 const {result}=closing();let parent=result.holders[0].book,lender=result.lender,loan=result.record.loan,interest=0,paid=0;
 const opening=parent.accounts.cash+lender.accounts.cash;
 for(let month=4;month<=39;month++){const step=S.serviceDebt(parent,lender,loan,month);parent=step.parent;lender=step.lender;loan=step.loan;interest+=step.interest;paid+=step.principalPaid;assert.equal(parent.accounts.cash+lender.accounts.cash,opening);}
 assert.equal(paid,200000);assert.equal(parent.accounts.debt,0);assert.equal(parent.accounts.payables,0);assert.equal(lender.accounts.businessAssets,0);assert(interest>0);assert.equal(loan.missedMonths,0);
 assert.throws(()=>S.serviceDebt(parent,lender,loan,39),/once/);
 const r=closing().result,p=r.holders[0].book,protectedCash=p.accounts.cash,unpaid=S.serviceDebt(p,r.lender,r.record.loan,4,protectedCash);
 assert.equal(unpaid.principalPaid,0);assert.equal(unpaid.interestPaid,0);assert.equal(unpaid.parent.accounts.debt,200000);assert.equal(unpaid.parent.accounts.payables,1500);assert.equal(unpaid.loan.missedMonths,1);assert.equal(unpaid.lender.accounts.businessAssets,201500);
 const catchup=S.serviceDebt(unpaid.parent,unpaid.lender,unpaid.loan,5);assert.equal(catchup.interestPaid,3000);assert.equal(catchup.principalPaid,11111);assert.equal(catchup.loan.missedMonths,0);
});

test('integration consumes one finite work unit and exact total expense; pauses preserve commitments',()=>{
 const r=closing().result;let parent=r.holders[0].book,provider=G.opening('integration-provider'),integration=r.record.integration;
 const before=JSON.stringify({parent,provider,integration}),paused=S.integrate(parent,provider,integration,4,1,true);assert.equal(JSON.stringify({parent,provider,integration}),before);assert.equal(paused.workUsed,0);assert.equal(paused.integration.workDone,0);
 integration=paused.integration;const short=S.integrate(parent,provider,integration,5,.75);integration=short.integration;assert.equal(short.workUsed,0);
 const reserved=S.integrate(parent,provider,integration,6,1,false,parent.accounts.cash);integration=reserved.integration;assert.equal(reserved.paid,0);
 let total=0;for(let month=7;month<=12;month++){const step=S.integrate(parent,provider,integration,month,1);parent=step.parent;provider=step.provider;integration=step.integration;total+=step.paid;assert.equal(step.workUsed,1);}
 assert.equal(total,r.quote.integrationCost);assert.equal(provider.accounts.cash,total);assert.equal(integration.workDone,6);assert.equal(S.integrate(parent,provider,integration,13,1).paid,0);assert.throws(()=>S.integrate(parent,provider,integration,12,1),/once/);
});

test('a funded controlling-owner defense buys one month, not dilution or cancellation',()=>{
 const f=fresh(),record=S.pending(f.context,f.offer,f.diligence),parent=f.data.holders[1].book,provider=G.opening('defense-reviewer');
 const defended=S.defend(record,parent,provider,f.c,60000,2);assert.equal(defended.record.reviewMonth,4);assert.equal(defended.fee,10000);assert.equal(defended.parent.accounts.cash+defended.provider.accounts.cash,parent.accounts.cash);
 assert.throws(()=>S.defend(defended.record,defended.parent,defended.provider,f.c,60000,3),/one/);assert.throws(()=>S.defend(record,parent,provider,f.c,50000,2),/controlling/);
 const broken=copy(record);broken.offer.shares=-1;assert.throws(()=>S.validate(broken));
});

test('restored control records reject forged obligations, wrong counterparties and unpaid progress',()=>{
 const {result:r}=closing(),original=JSON.stringify(r),restored=copy(r);S.validate(restored.record);
 for(const [index,edit]of [x=>x.loan.original--,x=>x.loan.borrower='foreign',x=>x.loan.principalPaid++,x=>x.integration.totalCost++,x=>x.integration.owner='foreign',x=>x.integration.workDone++,x=>x.offer.shares++,x=>x.defended=true].entries()){const bad=copy(r.record);edit(bad);assert.throws(()=>S.validate(bad),undefined,'Forged field case '+index);}
 const borrower=funded('wrong-parent',1000000);assert.throws(()=>S.serviceDebt(borrower,r.lender,r.record.loan,4),/counterparties/);assert.throws(()=>S.integrate(borrower,G.opening('provider'),r.record.integration,4,1),/owner/);
 const serviced=S.serviceDebt(restored.holders[0].book,restored.lender,restored.record.loan,4);restored.record.loan=serviced.loan;S.validate(restored.record);assert.equal(JSON.stringify(r),original);
});
