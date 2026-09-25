'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
assert.equal(source.split('root.BWEngine={').length,2,'The test-only private API hook must be unique');
const ctx={};vm.runInNewContext(source.replace('root.BWEngine={','root.BWEngine={settleAgency,prepareAgencySettlement,finishAgencySettlement,settleCorporateCirculation,agencyDelivery,agencyPrepare,agencyInvoice,agencyWindDown,validateAgencySave,validateAgencyPlayer,CompanyFinance,syncAccounts,'),ctx);
const E=ctx.BWEngine,P=E.SharedPremises,G=E.GroupAccounting,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x));
const blank=()=>copy(P.defaultPlan());
function fixture(){
 const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:10}).options;
 const g=E.createGame({...options,mode:'hotseat',seed:'agency-premises47',created:1}),p=g.players[0],amount=240000;
 // The fixture returns existing bank capital to the existing parent, conserved
 // before agency formation. This is not opening income or an in-game gift.
 p.accounting=A.post(p.accounting,'fixture.capitalReturn',{cash:-amount,equity:-amount});E.syncAccounts(p);
 p.financialGroup.parent=G.post(p.financialGroup.parent,'fixture.capitalReturn',p.id,{cash:amount,investments:-amount});p.financialGroup.investmentBasis.bank-=amount;
 return {g,book:P.opening(),supplier:G.opening('premises:outside'),offices:[1,2].map(i=>({id:p.id+':office:'+i,model:'retail',market:g.companyEconomy.companies[i].market,closed:false,condition:10000,maintenance:'full',legacySpace:0,busy:false}))};
}
function plans(s,acquire=false){return s.g.players.map((p,i)=>({focus:s.g.companyEconomy.companies[0].market,groupPolicy:{bankSupport:0},agencyPolicy:{...E.defaultAgencyPlan(p),outreach:i?0:acquire?2:0}}));}
function context(s,condition=10000){const p=s.g.players[0],a=p.agency;return {month:s.g.cycle,cash:p.accounting.accounts.cash,execution:4,offices:s.offices.map(o=>({...o,condition})),tenants:{[a.book.entityId]:{
 cash:Math.max(0,a.book.accounts.cash-50000),permissions:['insuranceProperty','insuranceService'],available:Object.fromEntries(P.roles.map(k=>[k,['propertyProducer','servicing'].includes(k)?4:0]))}}};}
function network(s,order,condition=10000){const empty=copy(s.book);empty.rooms=[];empty.arrears={};empty.externalDue=0;empty.report=null;return {version:1,month:s.g.cycle,sites:[{book:s.book,plan:order,context:context(s,condition)},
 {book:empty,plan:blank(),context:{month:s.g.cycle,cash:0,execution:0,offices:[],tenants:{}}}]};}
function allocations(s){const entity=s.g.players[0].agency.book.entityId;return {...blank(),allocations:[1,2].flatMap(room=>['propertyProducer','servicing'].map(role=>({room,entity,role,quarters:2})))};}
function warm(){let s=fixture();
 for(let m=1;m<=4;m++){
  const p=plans(s);if(m===1)Object.assign(p[0].agencyPolicy,{launch:true,capital:200000,staff:2,roles:{propertyProducer:1,benefitsProducer:0,servicing:1}});
  s.g.companyEconomy=E.CompanyFinance.step(s.g.companyEconomy,{demand:1});E.settleAgency(s.g,p);
  const order=blank();if(m===1||m===3)order.build={office:s.offices[m===1?0:1].id,kind:'agency'};
  const me=s.g.players[0],r=P.settle(s.book,order,context(s),me.accounting,{[me.agency.book.entityId]:me.agency.book},s.supplier);
  s.book=r.book;s.supplier=r.supplier;me.accounting=r.bank;me.agency.book=r.tenants[me.agency.book.entityId];E.settleCorporateCirculation(s.g);s.g.cycle++;
 }
 return s;
}
function run(s,order=allocations(s),condition=10000){
 const before=JSON.stringify(s),next=copy(s),n=network(next,order,condition),p=plans(next,true);
 next.g.companyEconomy=E.CompanyFinance.step(next.g.companyEconomy,{demand:1});E.settleAgency(next.g,p,n);
 const me=next.g.players[0],q=P.settle(next.book,order,n.sites[0].context,me.accounting,{[me.agency.book.entityId]:me.agency.book},next.supplier);
 next.book=q.book;next.supplier=q.supplier;me.accounting=q.bank;me.agency.book=q.tenants[me.agency.book.entityId];E.settleCorporateCirculation(next.g);next.g.cycle++;
 assert.equal(JSON.stringify(s),before);for(const player of next.g.players)E.validateAgencyPlayer(player,next.g.cycle);E.CompanyFinance.validate(next.g.companyEconomy);
 return next;
}
function totalCash(s){const g=s.g;return s.supplier.accounts.cash+g.companyEconomy.outside.accounts.cash+g.companyEconomy.creditor.accounts.cash+g.companyEconomy.companies.reduce((n,c)=>n+c.book.accounts.cash,0)+
 g.agencyEconomy.carrier.accounts.cash+g.agencyEconomy.supplier.accounts.cash+g.players.reduce((n,p)=>n+p.accounting.accounts.cash+p.financialGroup.parent.accounts.cash+p.agency.book.accounts.cash,0);}

test('qualified local insurance teams win two real markets without doubling central capacity or customers',()=>{
 const s=warm(),r=run(s),id=r.g.players[0].id,owned=r.g.agencyEconomy.relationships.filter(x=>x.owner===id);
 assert.equal(owned.length,2);assert(owned.every(x=>x.product==='property'));
 const markets=owned.map(x=>r.g.companyEconomy.companies.find(c=>c.id===x.companyId).market).sort();assert.deepEqual(copy(markets),s.offices.map(o=>o.market).sort());
 assert.equal(r.book.report.received,5824);assert.equal(r.book.report.invoiced,5824);assert.equal(totalCash(r),totalCash(s));
 assert.equal(r.g.agencyEconomy.relationships.length,18);assert.equal(r.g.players[0].agency.staff,2);assert(r.g.players[0].agency.report.commission>0);
 assert.deepEqual(copy(r),copy(run(s)));
});

test('an office without local producers cannot acquire policies and wear reduces qualified local outreach',()=>{
 const s=warm(),p=allocations(s);p.allocations=p.allocations.filter(x=>x.role==='servicing');
 const r=run(s,p),won=r.g.agencyEconomy.relationships.filter(x=>x.owner===r.g.players[0].id);
 assert.equal(won.length,1,'The unreserved central producer can acquire only in the selected central market');
 assert.equal(r.g.companyEconomy.companies.find(c=>c.id===won[0].companyId).market,r.g.companyEconomy.companies[0].market);
 const worn=run(s,allocations(s),5000);assert.equal(worn.g.players[0].agency.report.won,0);assert.equal(worn.book.report.invoiced,5824);assert.equal(totalCash(worn),totalCash(s));
});

test('servicing retains real policies, uses the same local pools and earns actual carrier commissions',()=>{
 const s=run(warm()),r=run(s);assert.equal(r.g.players[0].agency.report.clients,2);assert.equal(r.g.players[0].agency.report.won,0);
 assert.equal(r.g.players[0].agency.report.lost,0);assert(r.g.players[0].agency.report.commission>0);assert.equal(totalCash(r),totalCash(s));
 const before=JSON.stringify(r),g=copy(r.g),p=plans(r,true);g.companyEconomy=E.CompanyFinance.step(g.companyEconomy,{demand:1});for(const [i,player]of g.players.entries())E.agencyPrepare(g,player,p[i]);
 const n=network(r,allocations(r)),q=P.agencyDelivery(n,g.players,g.cycle);assert.equal(q[0].central.units,0);assert.equal(q[0].reserved.propertyProducer,4);assert.equal(q[0].reserved.servicing,4);
 assert.equal(q[0].local.reduce((v,x)=>v+x.units,0),20);assert.equal(JSON.stringify(r),before);
 for(const change of [x=>x.version=2,x=>x.month--,x=>x.sites.reverse(),x=>{x.sites[0].plan.allocations[0].quarters=3;x.sites[0].plan.allocations[1].quarters=1;x.sites[0].context.tenants[g.players[0].agency.book.entityId].available.propertyProducer=8;}]){const bad=copy(n);change(bad);assert.throws(()=>P.agencyDelivery(bad,g.players,g.cycle));}
});

test('registration and education are actual maintained limits, never inferred from the room',()=>{
 const s=warm(),g=copy(s.g),p=plans(s,true);g.companyEconomy=E.CompanyFinance.step(g.companyEconomy,{demand:1});
 for(const [i,player]of g.players.entries())E.agencyPrepare(g,player,p[i]);
 const me=g.players[0],n=network(s,allocations(s));
 me.agency.professionals.report.renewed=[me.agency.professionals.employees.find(x=>x.role==='propertyProducer').id];
 assert.throws(()=>P.agencyDelivery(n,g.players,g.cycle),/prepared professional time/);
 me.agency.professionals.report.renewed=[];me.agency.professionals.registration.validThrough=g.cycle-1;
 assert.throws(()=>P.agencyDelivery(n,g.players,g.cycle),/prepared professional time/);
});

test('invalid premises cannot partially charge payroll, move parent cash or resolve insurance relationships',()=>{
 const s=warm(),g=s.g,orders=plans(s,true),n=network(s,allocations(s));
 g.companyEconomy=E.CompanyFinance.step(g.companyEconomy,{demand:1});orders[0].agencyPolicy.capital=1000;
 n.sites[0].plan.allocations[0].quarters=3;n.sites[0].plan.allocations[1].quarters=1;n.sites[0].context.tenants[g.players[0].agency.book.entityId].available.propertyProducer=8;
 const before=JSON.stringify({g,orders,n});assert.throws(()=>E.settleAgency(g,orders,n),/prepared professional time/);assert.equal(JSON.stringify({g,orders,n}),before);
});

test('ordered preparation allows occupancy before service without charging the agency workforce twice',()=>{
 const s=warm(),g=s.g,p=plans(s,true),n=network(s,allocations(s));g.companyEconomy=E.CompanyFinance.step(g.companyEconomy,{demand:1});
 assert.throws(()=>E.finishAgencySettlement(g,p,n),/Prepare/);E.prepareAgencySettlement(g,p);
 const snapshot=JSON.stringify(g);assert.throws(()=>E.prepareAgencySettlement(g,p),/already prepared/);assert.equal(JSON.stringify(g),snapshot);
 const me=g.players[0],paid=P.settle(s.book,n.sites[0].plan,n.sites[0].context,me.accounting,{[me.agency.book.entityId]:me.agency.book},s.supplier);
 me.accounting=paid.bank;me.agency.book=paid.tenants[me.agency.book.entityId];const expense=me.agency.report.expense;
 E.finishAgencySettlement(g,p,n);assert.equal(me.agency.report.expense,expense);assert.equal(me.agency.report.won,2);
 const finished=JSON.stringify(g);assert.throws(()=>E.finishAgencySettlement(g,p,n),/once before service/);assert.equal(JSON.stringify(g),finished);
 assert.deepEqual(copy(E.settleAgency({financialGroupVersion:0},[])),[],'Core campaigns do not acquire agency rules');
});

test('unpaid bank occupancy is settled separately before the real outside-supplier agency wind-down',()=>{
 const s=warm(),g=s.g,me=g.players[0],agency=me.agency;
 // Existing operating cash is spent to a real outside supplier, leaving a
 // distressed institution with competing due invoices. No cash is invented.
 E.agencyInvoice(g,me,agency.book.accounts.cash-1000,'fixture.realOperatingLoss');
 const due=agency.book.accounts.payables;agency.book=G.settlePayable(agency.book,due,g.agencyEconomy.supplier.entityId);
 g.agencyEconomy.supplier=G.post(g.agencyEconomy.supplier,'fixture.billPaid',agency.book.entityId,{cash:due,businessAssets:-due});g.agencyEconomy.operatingPaid+=due;
 E.agencyInvoice(g,me,6000,'fixture.outsideInvoice');
 const order=allocations(s),c=context(s);c.tenants[agency.book.entityId].cash=0;
 const rented=P.settle(s.book,order,c,me.accounting,{[agency.book.entityId]:agency.book},s.supplier);s.book=rented.book;s.supplier=rented.supplier;me.accounting=rented.bank;agency.book=rented.tenants[agency.book.entityId];
 const before=JSON.stringify(s),cash=totalCash(s),equity=me.accounting.accounts.equity+agency.book.accounts.equity;
 const exit=P.releaseTenant(s.book,me.accounting,agency.book);assert.equal(exit.paid,Math.floor(1000*5824/11824));assert.equal(exit.writtenOff,5824-exit.paid);
 assert.equal(JSON.stringify(s),before);s.book=exit.book;me.accounting=exit.bank;agency.book=exit.tenant;
 assert.equal(agency.book.accounts.payables,6000);assert.equal(me.accounting.accounts.receivables,0);
 assert.equal(me.accounting.accounts.equity+agency.book.accounts.equity,equity);assert.equal(totalCash(s),cash);
 assert.deepEqual(copy(P.releaseTenant(s.book,me.accounting,agency.book)),{book:copy(s.book),bank:copy(me.accounting),tenant:copy(agency.book),paid:0,writtenOff:0});
 E.agencyWindDown(g,me);assert.equal(agency.status,'failed');assert(Object.values(agency.book.accounts).every(n=>n===0));assert.equal(g.agencyEconomy.supplier.accounts.businessAssets,0);
 assert.equal(g.agencyEconomy.creditorLoss,6000-(1000-exit.paid));assert.equal(totalCash(s),cash);E.validateAgencyPlayer(me,g.cycle);
 const bad=copy(s.book);bad.arrears[agency.book.entityId]=1;assert.throws(()=>P.releaseTenant(bad,me.accounting,agency.book),/claim/);
});

for(const recapitalize of [false,true])test('shared agency/adviser office: '+(recapitalize?'explicit parent recapitalization':'unsupported agency failure remains ring-fenced'),()=>{
 const I=E.InvestmentInstitution,S=E.InvestmentSettlement,C=E.InvestmentClients;
 const options=E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options;
 const g=E.createGame({...options,investmentServicesVersion:1,mode:'hotseat',seed:'shared-institution48',created:1}),me=g.players[0];
 const returned=1100000;
 me.accounting=A.post(me.accounting,'fixture.capitalReturn',{cash:-returned,equity:-returned});E.syncAccounts(me);
 me.financialGroup.parent=G.post(me.financialGroup.parent,'fixture.capitalReturn',me.id,{cash:returned,investments:-returned});me.financialGroup.investmentBasis.bank-=returned;
 const actual=me.facilityNetwork.offices.find(o=>o.closedCycle===null||o.closedCycle===undefined);
 assert(actual,'Use an identified existing campaign office, not a free additional location');
 const host={id:actual.id,model:actual.model,market:actual.market,closed:false,condition:10000,maintenance:'full',legacySpace:0,busy:false};
 let book=P.opening(),supplier=G.opening('premises:outside'),agencyRent=0,investmentRent=0;
 const initialCustomers=g.investmentEconomy.world.clients.length;
 const total=()=>totalCash({g,supplier})+g.investmentEconomy.supplier.accounts.cash+g.investmentEconomy.world.dealer.accounts.cash+
  g.investmentEconomy.world.clients.reduce((n,c)=>n+c.cash,0)+g.players.reduce((n,p)=>n+p.investmentBusiness.book.accounts.cash,0);
 const openingCash=total();
 for(let month=1;month<=12;month++){
  const plans=g.players.map(p=>({focus:host.market,groupPolicy:{bankSupport:0},agencyPolicy:{...E.defaultAgencyPlan(p),outreach:month>=8?2:0},investmentPolicy:E.defaultInvestmentPlan(p)}));
  if(month===1){
   Object.assign(plans[0].agencyPolicy,{launch:true,capital:200000,staff:2,roles:{propertyProducer:1,benefitsProducer:0,servicing:1}});
   Object.assign(plans[0].investmentPolicy.institution,{launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}});
  }
  if(month===10&&recapitalize)plans[0].agencyPolicy.capital=50000;
  g.companyEconomy=E.CompanyFinance.step(g.companyEconomy,{demand:1});E.prepareAgencySettlement(g,plans);
  const parents=g.players.map(p=>p.financialGroup.parent),offers=g.players.map((p,i)=>({owner:p.id,market:host.market,reputation:80,pursue:i===0&&month>=8}));
  const prepared=S.prepare({parents,entities:g.players.map(p=>p.investmentBusiness),world:g.investmentEconomy.world,supplier:g.investmentEconomy.supplier},plans.map(p=>p.investmentPolicy.institution),offers);
  g.investmentEconomy.parentCashNet+=parents.reduce((n,b,i)=>n+b.accounts.cash-prepared.parents[i].accounts.cash,0);
  g.players.forEach((p,i)=>{p.financialGroup.parent=prepared.parents[i];p.investmentBusiness=prepared.entities[i];});
  const a=me.agency,inv=me.investmentBusiness,order=blank();
  assert.equal(a.status,!recapitalize&&month===12?'failed':'active','Actual funded agency status at month '+month);
  if(month===1)order.build={office:host.id,kind:'additionalPremises'};
  if(month===5)order.build={office:host.id,kind:'advisoryWing'};
  if(month>=8)order.allocations=[{room:2,entity:inv.book.entityId,role:'adviser',quarters:4},...(a.status==='active'?[{room:2,entity:a.book.entityId,role:'propertyProducer',quarters:2},{room:2,entity:a.book.entityId,role:'servicing',quarters:2}]:[])];
  const resources={month,cash:me.accounting.accounts.cash,execution:4,offices:[host],tenants:{
   [a.book.entityId]:{cash:a.book.accounts.cash,permissions:['insuranceProperty','insuranceService'],available:Object.fromEntries(P.roles.map(k=>[k,['propertyProducer','servicing'].includes(k)?4:0]))},
   [inv.book.entityId]:{cash:inv.book.accounts.cash,permissions:['advice','investmentOperations'],available:Object.fromEntries(P.roles.map(k=>[k,inv.report?.permitted.available[k]||0]))}
  }};
  const emptyBook=copy(book);emptyBook.rooms=[];emptyBook.arrears={};emptyBook.externalDue=0;emptyBook.report=null;
  const network={version:1,month,sites:[{book,plan:order,context:resources},{book:emptyBook,plan:blank(),context:{month,cash:0,execution:0,offices:[],tenants:{}}}]};
  // Both dispatchers must authorize the same room/time quote BEFORE adopting
  // any occupancy posting. Agency staff can never substitute for an adviser.
  const investmentWork=P.investmentDelivery(network,prepared.entities,month),agencyWork=P.agencyDelivery(network,g.players,month);
  const quoted=P.review(book,order,resources),cashBefore=total(),equityBefore=me.accounting.accounts.equity+a.book.accounts.equity+inv.book.accounts.equity;
  const paid=P.settle(book,order,resources,me.accounting,{[a.book.entityId]:a.book,[inv.book.entityId]:inv.book},supplier);
  book=paid.book;supplier=paid.supplier;me.accounting=paid.bank;a.book=paid.tenants[a.book.entityId];inv.book=paid.tenants[inv.book.entityId];
  agencyRent+=quoted.tenantInvoices[a.book.entityId]||0;investmentRent+=quoted.tenantInvoices[inv.book.entityId]||0;
  assert.equal(total(),cashBefore);assert.equal(me.accounting.accounts.equity+a.book.accounts.equity+inv.book.accounts.equity,equityBefore-quoted.construction-quoted.outsideCost);
  const agencyPayroll=a.report.expense,investmentPayroll=inv.report.recurring;
  E.finishAgencySettlement(g,plans,network);
  // Agency dividends, if any, belong to the shared parent before the second
  // service phase; an older preparation snapshot must not overwrite them.
  prepared.parents=g.players.map(p=>p.financialGroup.parent);prepared.entities=g.players.map(p=>p.investmentBusiness);
  const finished=S.finish(prepared,offers,100,undefined,network);
  g.investmentEconomy.world=finished.world;g.investmentEconomy.supplier=finished.supplier;
  g.players.forEach((p,i)=>{p.financialGroup.parent=finished.parents[i];p.investmentBusiness=finished.entities[i];});
  assert.equal(me.agency.report.expense,agencyPayroll);assert.equal(me.investmentBusiness.report.recurring,investmentPayroll);
  assert.equal(me.investmentBusiness.report.permitted.custody,false);
  if(month>=8){const active=a.status==='active';assert.equal(book.report.invoiced,active?6720:3360);assert.equal(book.report.received,active?6720:3360);assert.equal(investmentWork[0].central.advice,0);assert.equal(agencyWork[0].reserved.propertyProducer,active?2:0);}
  E.settleCorporateCirculation(g);assert.equal(total(),openingCash);
  const ae=g.agencyEconomy,ie=g.investmentEconomy;
  assert.equal(ae.carrier.accounts.cash+ae.supplier.accounts.cash+g.players.reduce((n,p)=>n+p.agency.book.accounts.cash,0)+ae.circulated.carrier+ae.circulated.supplier+agencyRent,ae.parentCashNet+ae.premiumPaid);
  assert.equal(ie.supplier.accounts.cash+ie.world.dealer.accounts.cash+ie.world.clients.reduce((n,c)=>n+c.cash,0)+g.players.reduce((n,p)=>n+p.investmentBusiness.book.accounts.cash,0)+investmentRent,ie.parentCashNet+ie.world.outsideCashNet+ie.world.bankCashNet);
  for(const p of g.players){E.validateAgencyPlayer(p,g.cycle);I.validate(p.investmentBusiness);}C.validate(ie.world,g.players.map(p=>p.investmentBusiness));
  assert.equal(ie.world.clients.length,initialCustomers);g.cycle++;
 }
 assert(agencyRent>0&&investmentRent>0);assert(g.investmentEconomy.world.clients.some(c=>c.owner===me.id));
 if(recapitalize)assert(me.agency.report.clients>0);else{assert.equal(me.agency.failedCycle,12);assert.equal(me.agency.report.clients,0);assert.equal(g.agencyEconomy.supplier.accounts.businessAssets,0);}
 assert.equal(me.agency.staff,recapitalize?2:0);assert.equal(me.investmentBusiness.employees.length,2);
 // Domain integration, not yet an accepted campaign schema: the rent offsets
 // above must become explicit canonical counters before save/network enablement.
});
