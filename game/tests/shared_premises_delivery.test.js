'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const c={};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,P=E.SharedPremises,I=E.InvestmentInstitution,S=E.InvestmentSettlement,C=E.InvestmentClients,T=E.InvestmentTrading,A=E.AccountingPrototype,G=E.GroupAccounting;
const copy=x=>JSON.parse(JSON.stringify(x)),{fixture,advice}=require('./investment_clients.test');
const empty=()=>copy(P.defaultPlan()),office=(id,market)=>({id,model:'retail',market,closed:false,condition:10000,maintenance:'full',legacySpace:0,busy:false});
const offices=[office('a:office:1','north'),office('a:office:2','south')];
function offers(w){return w.entities.map((e,i)=>({owner:e.owner,market:'downtown',reputation:80,pursue:i===0}));}
function premisesContext(book,bank,entity,condition=10000){
 return {month:book.month+1,cash:bank.accounts.cash,execution:4,offices:offices.map(o=>({...o,condition})),tenants:{[entity.book.entityId]:{
  cash:Math.max(0,entity.book.accounts.cash-60000),permissions:['advice'],available:Object.fromEntries(P.roles.map(k=>[k,k==='adviser'?4:0]))}}};
}
function opening(){
 let w=copy(fixture(180));w.world.clients.forEach((x,i)=>{x.service='advice';x.market=['downtown','north','south'][i%3];});
 let premises=P.opening(),bank=A.opening(4),vendor=G.opening('outside-premises');
 for(let month=1;month<=3;month++){
  w=S.advance(w,w.entities.map((e,i)=>({...I.defaults(e),...(month===1&&i===0?copy(advice):{})})),offers(w).map(o=>({...o,pursue:false})),100);
  const plan=empty();if(month<=2)plan.build={office:offices[month-1].id,kind:month===1?'visiting':'wealth'};
  const out=P.settle(premises,plan,premisesContext(premises,bank,w.entities[0]),bank,{[w.entities[0].book.entityId]:w.entities[0].book},vendor);
  premises=out.book;bank=out.bank;vendor=out.supplier;w.entities[0].book=out.tenants[w.entities[0].book.entityId];
 }
 return {w,premises,bank,vendor};
}
const orders=()=>({...empty(),allocations:[{room:1,entity:'a:investments',role:'adviser',quarters:1},{room:2,entity:'a:investments',role:'adviser',quarters:3}]});
function input(s,plan=orders(),condition=10000){
 // Empty second network has an authentic advanced clock; no invented room.
 const blank=copy(s.premises);blank.rooms=[];blank.arrears={};blank.externalDue=0;blank.report=null;
 return {version:1,month:s.w.world.month+1,sites:[{book:s.premises,plan,context:premisesContext(s.premises,s.bank,s.w.entities[0],condition)},
  {book:blank,plan:empty(),context:{month:blank.month+1,cash:0,execution:0,offices:[],tenants:{}}}]};
}
function run(s,network=input(s)){
 const before=JSON.stringify(s),p=network.sites[0];
 // Actual paired rent is posted, not a capacity-only fixture grant. Preserve
 // the pre-settlement quote used for the same month's dispatch instructions.
 const paid=P.settle(p.book,p.plan,p.context,s.bank,{[s.w.entities[0].book.entityId]:s.w.entities[0].book},s.vendor);
 const w=copy(s.w);w.entities[0].book=paid.tenants[w.entities[0].book.entityId];
 const result=S.advance(w,w.entities.map(e=>I.defaults(e)),offers(w),100,undefined,network);
 assert.equal(JSON.stringify(s),before);return {...s,w:result,premises:paid.book,bank:paid.bank,vendor:paid.supplier};
}
function cash(s){return s.bank.accounts.cash+s.vendor.accounts.cash+s.w.parents.reduce((n,b)=>n+b.accounts.cash,0)+s.w.entities.reduce((n,e)=>n+e.book.accounts.cash,0)+s.w.supplier.accounts.cash+s.w.world.dealer.accounts.cash+s.w.world.clients.reduce((n,c)=>n+c.cash,0);}

test('paid adviser desks reach two real markets instead of duplicating the central workforce',()=>{
 const s=opening(),before=JSON.stringify(s),legacy=S.advance(s.w,s.w.entities.map(e=>I.defaults(e)),offers(s.w),100),r=run(s);
 assert.equal(JSON.stringify(s),before);assert.equal(legacy.world.reports[0].won,40);
 assert(legacy.world.clients.filter(x=>x.owner==='a').every(x=>x.market==='downtown'));
 const byMarket=Object.fromEntries(['downtown','north','south'].map(m=>[m,r.w.world.clients.filter(x=>x.owner==='a'&&x.market===m).length]));
 assert.deepEqual(byMarket,{downtown:0,north:10,south:30});assert.equal(r.w.world.reports[0].acquisitionWork,200);
 assert.equal(r.w.localDelivery[0].central.advice,0);assert.equal(r.w.localDelivery[0].reserved.adviser,4);
 assert.equal(r.premises.report.invoiced,3948);assert.equal(r.premises.report.received,3948);assert.equal(r.premises.report.unfunded,0);
 assert.equal(cash(r),cash(s));assert.equal(r.w.world.issuedUnits,s.w.world.issuedUnits);assert.equal(r.w.world.clients.length,s.w.world.clients.length);
 assert.deepEqual(copy(r),copy(run(s)),'Identical inputs replay exactly');
});

test('condition reduces local acquisition without restoring reserved time to headquarters',()=>{
 const s=opening(),worn=run(s,input(s,orders(),5000));
 assert.equal(worn.w.world.reports[0].won,20);assert.equal(worn.w.localDelivery[0].central.advice,0);
 assert.equal(worn.w.localDelivery[0].reserved.adviser,4);assert.equal(cash(worn),cash(s));
 const unusable=run(s,input(s,orders(),1499));assert.equal(unusable.w.world.reports[0].won,0);assert.equal(unusable.premises.report.invoiced,3948);
});

test('service and acquisition consume one location budget; subsequent fees remain customer-funded',()=>{
 const s=run(opening()),r=run(s);assert.equal(r.w.world.reports[0].serviced,40);assert.equal(r.w.world.reports[0].won,32);
 assert.equal(r.w.world.reports[0].serviced+r.w.world.reports[0].acquisitionWork,200);assert(r.w.world.reports[0].fees>0);
 assert.equal(cash(r),cash(s));assert.equal(r.w.world.clients.filter(x=>x.owner==='a'&&x.market==='downtown').length,0);
 // Returning staff to central work is explicit and does not abandon existing
 // relationships. Digital/remote service remains viable across the network.
 const remote=run(r,input(r,empty()));assert(remote.w.world.reports[0].serviced>=72);
 assert(remote.w.world.clients.some(x=>x.owner==='a'&&x.market==='downtown'));
});

test('outdated, foreign, unqualified and overbooked delivery instructions fail without mutation',()=>{
 const s=opening();
 for(const mutate of [n=>n.month--,n=>n.version=2,n=>n.sites[0].context.month--,
  n=>{n.sites[0].plan.allocations[1].quarters=4;n.sites[0].context.tenants['a:investments'].available.adviser=8;},
  n=>{n.sites[0].plan.allocations[1].role='broker';n.sites[0].context.tenants['a:investments'].available.broker=4;n.sites[0].context.tenants['a:investments'].permissions.push('brokerage');},
  n=>n.sites.reverse()]){
  const n=input(s);mutate(n);const before=JSON.stringify({s,n});assert.throws(()=>run(s,n));assert.equal(JSON.stringify({s,n}),before);
 }
});

test('new hires and education cannot be counted as an extra local full-time adviser',()=>{
 const s=opening(),n=input(s),w=copy(s.w);
 // Both quotes and settlement retain the actual preparation clock and time.
 const prepared=I.step(w.parents[0],w.entities[0],w.supplier,{...I.defaults(w.entities[0]),capital:100000,roles:{adviser:2,broker:0,principal:0,operations:1}},4);
 w.entities[0]=prepared.entity;w.entities[1]=I.step(w.parents[1],w.entities[1],prepared.supplier,I.defaults(w.entities[1]),4).entity;
 n.sites[0].context.tenants['a:investments'].available.adviser=8;n.sites[0].plan.allocations[1].quarters=4;
 assert.throws(()=>P.investmentDelivery(n,w.entities,4),/prepared professional time/);
 const education=copy(w.entities);education[0].report.permitted=I.permissionState(education[0],4,{...education[0].report.permitted.available,adviser:3});
 assert.throws(()=>P.investmentDelivery(input(s),education,4),/prepared professional time/);
});

test('external-custodian operations can occupy a wealth suite without receiving custody permission',()=>{
 const s=opening(),plan=empty();plan.allocations=[{room:2,entity:'a:investments',role:'operations',quarters:4}];
 const n=input(s,plan,5000),tenant=n.sites[0].context.tenants['a:investments'];
 tenant.available.operations=4;tenant.permissions.push('investmentOperations');
 const prepared=S.prepare(s.w,s.w.entities.map(e=>I.defaults(e)),offers(s.w));
 const before=JSON.stringify({n,prepared}),r=P.investmentDelivery(n,prepared.entities,4);
 assert.equal(prepared.entities[0].report.permitted.custody,false);
 assert.equal(r[0].central.custody,0);assert.equal(r[0].central.operations,I.ROLES.operations.capacity/2);
 assert.equal(r[0].reserved.operations,4);assert.equal(JSON.stringify({n,prepared}),before);
 const bad=copy(n);bad.sites[0].context.tenants['a:investments'].permissions=['advice'];
 assert.throws(()=>P.investmentDelivery(bad,prepared.entities,4),/authorized/);
 const noTime=copy(prepared.entities);noTime[0].report.permitted=I.permissionState(noTime[0],4,{...noTime[0].report.permitted.available,operations:0});
 assert.throws(()=>P.investmentDelivery(n,noTime,4),/qualified permission/);
});

test('investment preparation and service are once-only phases with no retained previous-month routing',()=>{
 const s=opening(),policies=s.w.entities.map(e=>I.defaults(e)),o=offers(s.w),before=JSON.stringify(s.w);
 assert.throws(()=>S.finish(s.w,o,100),/Prepare/);
 const prepared=S.prepare(s.w,policies,o),snapshot=JSON.stringify(prepared);
 assert.equal(JSON.stringify(s.w),before);assert.throws(()=>S.prepare(prepared,policies,o));
 const finished=S.finish(prepared,o,100);assert.equal(JSON.stringify(prepared),snapshot);
 assert.deepEqual(copy(finished),copy(S.advance(s.w,policies,o,100)));
 assert.throws(()=>S.finish(finished,o,100),/Prepare/);
 const local=run(s).w;assert(local.localDelivery);
 const central=S.advance(local,local.entities.map(e=>I.defaults(e)),offers(local),100);
 assert(!Object.hasOwn(central,'localDelivery'),'No stale location budget survives an explicit return to central delivery');
});

test('mandatory post-occupancy wind-down cannot sell or earn fees after its internal claim is released',()=>{
 const s=run(opening()),o=offers(s.w),prepared=S.prepare(s.w,s.w.entities.map(e=>I.defaults(e)),o);
 const bank=s.bank,inv=prepared.entities[0],rent=1000;
 assert.throws(()=>S.finish(prepared,o,100,undefined,undefined,[true,false]),/current unpaid-creditor release/,'A boolean cannot force a solvent business into default');
 const loss=inv.book.accounts.cash;
 inv.book=G.post(inv.book,'fixture.operatingLoss',prepared.supplier.entityId,{cash:-loss,equity:-loss},-loss);
 prepared.supplier=G.post(prepared.supplier,'fixture.operatingReceipt',inv.book.entityId,{cash:loss,equity:loss},loss);
 // Identified rent follows an actual operating loss. The landlord writes off
 // the unpayable claim on BOTH books. Default survives that release even when
 // book equity returns to zero; the write-off is not a funded rescue.
 const book=copy(s.premises);book.arrears[inv.book.entityId]=rent;book.report.unfunded=rent;
 const landlord=A.post(bank,'premises.invoice',{receivables:rent,equity:rent},rent);
 inv.book=G.post(inv.book,'premises.invoice','bank',{payables:rent,equity:-rent},-rent);
 const cleared=P.releaseTenant(book,landlord,inv.book);inv.book=cleared.tenant;
 inv.report.permitted=I.permissionState(inv,inv.month,inv.report.permitted.available);
 assert.equal(cleared.writtenOff,rent);assert.equal(inv.book.accounts.payables,0);assert.equal(inv.book.accounts.equity,0);
 const before=JSON.stringify(prepared),out=S.finish(prepared,o,100,undefined,undefined,[true,false]);
 assert.equal(JSON.stringify(prepared),before);assert.equal(out.entities[0].status,'closed');
 assert.equal(out.entities[0].closure.reason,'insolvent');assert.equal(out.world.reports[0].fees,0);assert.equal(out.world.reports[0].won,0);assert.equal(out.world.reports[0].serviced,0);
 assert(out.world.clients.every(c=>c.owner!=='a'));assert.equal(out.world.clients.length,prepared.world.clients.length);
 const sum=w=>w.parents.reduce((n,b)=>n+b.accounts.cash,0)+w.entities.reduce((n,e)=>n+e.book.accounts.cash,0)+w.supplier.accounts.cash+w.world.dealer.accounts.cash+w.world.clients.reduce((n,c)=>n+c.cash,0);
 assert.equal(sum(out),sum(prepared));
});

test('portfolio orders consume matching local time and cannot borrow another location or rival staff',()=>{
 const clients=['north','south'].map((market,i)=>({id:'trade:'+i,owner:'a',cash:10000,units:5,service:'advice',serviced:true,ownedCustody:false,position:{deposit:0,value:500}}));
 const market={clients,price:100,dealerCash:100000,dealerUnits:100,capacity:[{owner:'a',advice:0,brokerage:0,operations:10,custody:0}]};
 const locations={version:1,markets:clients.map((c,i)=>({id:c.id,market:['north','south'][i]})),local:[{owner:'a',markets:[{market:'north',advice:5,brokerage:0},{market:'south',advice:4,brokerage:0}]}]};
 const trades=clients.map(c=>({owner:'a',clientId:c.id,side:'sell',amount:100})),before=JSON.stringify({market,locations});
 const r=T.clear(market,trades,locations);assert.equal(r.receipts[0].units,1);assert.equal(r.receipts[1].reason,'capacity');assert.equal(r.local[0].markets[0].advice,0);
 assert.equal(r.local[0].markets[1].advice,4);assert.equal(r.capacity[0].operations,9);assert.equal(JSON.stringify({market,locations}),before);
 assert.deepEqual(copy(r),copy(T.clear(market,trades.slice().reverse(),locations)));
 for(const mutate of [x=>x.local[0].owner='b',x=>x.local[0].markets[0].advice=-1,x=>x.markets.pop(),x=>x.version=2]){const bad=copy(locations);mutate(bad);assert.throws(()=>T.clear(market,trades,bad));}
});

test('24 successive local-service months preserve finite money, staff and customer identities',()=>{
 let s=opening(),initial=cash(s);const count=s.w.world.clients.length,units=s.w.world.issuedUnits;
 for(let n=0;n<24;n++){
  const q=I.quote(s.w.entities[0],I.defaults(s.w.entities[0]),s.w.world.month+1),p=orders();
  if(!q.permissions.advice)p.allocations=[];
  else p.allocations[1].quarters=q.permissions.available.adviser-1;
  const before=copy(s);s=run(s,input(s,p));
  assert.equal(cash(s),initial);assert.equal(s.w.world.clients.length,count);assert.equal(s.w.world.issuedUnits,units);
  C.validate(s.w.world,s.w.entities);P.validate(s.premises);
  for(const e of s.w.entities)I.validate(e);
  assert(s.w.world.reports[0].serviced+s.w.world.reports[0].acquisitionWork<=q.permissions.accountCapacity);
  if(n===0||n===12||n===23)assert.deepEqual(copy(s),copy(run(before,input(before,p))));
 }
 assert(s.w.world.feesPaid>0);assert.equal(s.premises.month,27);assert.equal(s.premises.externalDue,0);
});

test('local servicing, cash-funded securities orders and term notes share one real prepared budget',()=>{
 let w=copy(fixture(180));w.world=C.opening(w.world.clients.map((x,i)=>({id:x.id,market:['downtown','north','south'][i%3],service:'advice',units:0,custodian:'atlas'})),w.world.dealer);
 w.world=C.cashOpening(C.backedOpening(w.world),w.entities);w.world.choiceVersion=1;w.world.income=E.InvestmentIncome.opening(w.world.clients);
 w.world.cashRoutes.incomeReceived=0;w.world.suitabilityVersion=1;w.world.trading={version:1,month:0,receipts:[]};w.world.notes=E.InvestmentNotes.opening();
 w.banks=w.entities.map(e=>({id:e.owner,book:A.opening(4)}));
 let s={w,premises:P.opening(),bank:w.banks[0].book,vendor:G.opening('outside-premises')},clientId,issuer=G.opening('corporate:outside');
 const initial=cash(s)+w.banks[1].book.accounts.cash;
 for(let month=1;month<=5;month++){
  const plan=month>=4?orders():empty();if(month<=2)plan.build={office:offices[month-1].id,kind:month===1?'visiting':'wealth'};
  const network=input(s,plan),site=network.sites[0],paid=P.settle(site.book,site.plan,site.context,s.bank,{[s.w.entities[0].book.entityId]:s.w.entities[0].book},s.vendor);
  const next=copy(s.w);next.entities[0].book=paid.tenants[next.entities[0].book.entityId];next.banks[0].book=paid.bank;
  const opts={reservedParentCash:[0,0],close:[false,false],cashOrders:[],trades:clientId?[{owner:'a',clientId,side:'buy',amount:100}]:[],noteOrders:clientId?[{owner:'a',clientId,product:'short',amount:100}]:[],noteAnnualBp:400};
  const result=S.advance(next,next.entities.map((e,i)=>({...I.defaults(e),...(month===1&&i===0?copy(advice):{})})),offers(next).map(o=>({...o,pursue:month>=4&&o.pursue})),100,opts,network);
  const distribution=C.distributeIncome(result.world,result.entities,issuer,400);result.world=distribution.world;result.entities=distribution.entities;issuer=distribution.issuer;
  s={w:result,premises:paid.book,bank:result.banks[0].book,vendor:paid.supplier};
  if(month===1){const stock=C.stockFromBank(s.w.world,s.w.entities,s.bank,'a',100000);assert.equal(stock.paid,100000);s.w.world=stock.world;s.bank=stock.bank;s.w.banks[0].book=s.bank;}
  if(month===4){
   const client=s.w.world.clients.find(x=>x.owner==='a'&&x.market==='north');assert(client);clientId=client.id;
   const funded=C.depositCash(s.w.world,s.w.entities,s.bank,clientId,2000);s.w.world=funded.world;s.w.entities=funded.entities;s.bank=funded.bank;s.w.banks[0].book=s.bank;
  }
  assert.equal(cash(s)+s.w.banks[1].book.accounts.cash,initial);
 }
 assert.equal(s.w.world.trading.receipts[0].work,5);assert.equal(s.w.world.trading.receipts[0].units,1);
 assert.equal(s.w.world.notes.execution[0].work,5);assert.equal(s.w.world.notes.execution[0].filled,100);
 const report=s.w.world.reports[0];assert.equal(report.tradeWork+report.noteWork,10);assert(report.serviced+report.acquisitionWork+report.tradeWork+report.noteWork<=200);
 assert.equal(s.w.world.bankCashNet,2000,'Orders spend client cash, not a second bank withdrawal');
 assert.equal(s.w.localDelivery[0].central.advice,0);C.validate(s.w.world,s.w.entities);
});
