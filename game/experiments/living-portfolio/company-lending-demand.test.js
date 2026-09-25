'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({});
for(const name of ['accounting','group-accounting','company-finance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine/'+name+'.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/content/anchor-clients.js'),'utf8'),ctx);
const {A,G,C,anchors}=vm.runInContext('({A:AccountingPrototype,G:GroupAccounting,C:CompanyFinance,anchors:ANCHOR_CLIENTS})',ctx);
const L=require('./loan-contracts'),V=require('./company-finance-v4')({AccountingPrototype:A,GroupAccounting:G,legacy:C,loans:L});
const factory=require('./company-lending-demand'),D=factory({companyFinance:V,loans:L,anchorClients:anchors});
const copy=x=>JSON.parse(JSON.stringify(x)),equal=(a,b)=>assert.deepEqual(copy(a),copy(b));
const profiles=Array.from({length:6},(_,i)=>({market:'market'+i,baseFee:10000+2000*i}));
let checks=0,months=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function opening(){
 const world=V.withLending(C.opening(profiles),['bankA','bankB']),contracts=[],book=D.create({world,contracts});
 return {world,contracts,book,collateral:D.collateral({world,contracts,book}),banks:['bankA','bankB'].map(id=>({id,book:A.opening(3),legacyPrincipal:9500000,otherReceivables:0}))};
}
function totalCash(f){return [f.world.outside,f.world.creditor,...f.world.companies.map(c=>c.book),...f.banks.map(b=>b.book),...(f.carrier?[f.carrier]:[])].reduce((n,b)=>n+b.accounts.cash,0);}
const boundary=f=>({world:f.world,contracts:f.contracts,book:f.book});
function next(f,demand=1){
 const r=V.step(f.world,{demand},{contracts:f.contracts,collateral:f.collateral,banks:f.banks});months++;
 const a=V.transact(r.world,{contracts:r.contracts,collateral:r.collateral,banks:r.banks,instructions:[],protectedCash:Object.fromEntries([...r.banks,...r.world.companies].map(x=>[x.id,0])),creditWork:Object.fromEntries(r.banks.map(b=>[b.id,100]))});
 return {...f,...a};
}
function snapshot(f,prepared=D.prepare(boundary(f))){
 return {version:1,month:f.world.month,banks:f.banks.map(b=>({id:b.id,cash:b.book.accounts.cash,reserve:500000,capital:b.book.accounts.equity,minimumCapitalRatioBps:1000,
  riskWeightedAssets:b.legacyPrincipal+Math.ceil(b.book.accounts.securities*.2)+b.book.accounts.receivables+f.contracts.filter(c=>c.bankId===b.id).reduce((n,c)=>n+Number((BigInt(c.commitment)*BigInt(c.originalTerms.riskWeightBps)+9999n)/10000n),0),
  originationLimit:1000000,creditWork:100,contractSlots:10000-f.contracts.filter(c=>c.bankId===b.id).length,
  sectorLimits:Object.fromEntries(D.catalog.map(p=>[p.sector,1000000])),sectorExposure:Object.fromEntries(D.catalog.map(p=>[p.sector,f.contracts.filter(c=>c.bankId===b.id&&c.sector===p.sector).reduce((n,c)=>n+c.commitment,0)])),
  deployments:f.world.companies.flatMap(c=>['commercial','cre'].map(product=>({product,market:c.market,channel:'physical',status:'active'})))})),borrowers:prepared.borrowers,applications:prepared.applications};
}
function originate(f,{reverse=false,empty=false,feeBps=0}={}){
 const prepared=D.prepare(boundary(f)),s=snapshot(f,prepared);
 let offers=empty?[]:s.applications.flatMap(a=>s.banks.map(b=>({bankId:b.id,applicationId:a.id,amount:a.amount,terms:{annualRateBps:900,feeBps,termMonths:L.catalog[a.product].terms[0],underwriting:'balanced'}})));
 if(reverse){s.banks.reverse();s.borrowers.reverse();s.applications.reverse();offers.reverse();}
 const r=V.originate(f.world,{contracts:f.contracts,collateral:prepared.collateral,banks:f.banks,snapshot:s,offers});V.validateSettled(r.world,r.contracts);D.validate({world:r.world,contracts:r.contracts,book:f.book});
 return {...f,...r};
}

test('explicit opening identifies existing assets without posting or mutating money',()=>{
 const f=opening(),before=copy(f);equal(D.create({world:f.world,contracts:[]}),f.book);equal(f,before);
 for(const [i,row]of f.book.companies.entries()){
  assert.equal(row.sector,D.catalog[i].sector);assert.equal(row.openingAssets,f.world.companies[i].book.accounts.businessAssets);
  assert.equal(row.property.openingValue+(row.openingAssets-row.property.openingValue),row.openingAssets);
  assert.equal(f.collateral[i].externalPledgedValue,0);assert(f.world.companies[i].externalDebt>0,'Actual outside debt exists but supplies no invented lien');
 }
 assert.throws(()=>D.create({world:C.opening(profiles),contracts:[]}));assert.throws(()=>D.create({...boundary(f),extra:true}));
 const later=next(f);assert.throws(()=>D.create({world:later.world,contracts:[]}));assert.throws(()=>D.prepare(boundary(f)));
 const invalid=copy(anchors);invalid[0].name='Other Company';assert.throws(()=>factory({companyFinance:V,loans:L,anchorClients:invalid}));
});
test('strict retained identities, partitions, version and unknown fields reject',()=>{
 const f=opening();
 for(const mutate of [b=>b.version=2,b=>b.startedMonth=1,b=>b.extra=true,b=>b.companies.pop(),b=>b.companies.reverse(),b=>b.companies[0].sector='general',b=>b.companies[0].market='other',b=>b.companies[0].openingAssets++,b=>b.companies[0].property.openingValue++,b=>b.companies[0].property.extra=0,b=>b.companies[0].property.id='made-up']){
  const book=copy(f.book);mutate(book);assert.throws(()=>D.validate({world:f.world,contracts:[],book}));
 }
 assert.throws(()=>D.validate({...boundary(f),cash:999}));equal(D.validate(boundary(f)),f.book);
});
test('one actual cash gap is split across two products and never duplicated',()=>{
 const f=next(opening()),before=copy(f),p=D.prepare(boundary(f));equal(f,before);equal(D.prepare(boundary(f)),p);
 assert.equal(p.applications.length,12);L.validateSnapshot(snapshot(f,p));
 for(const need of p.needs){const requests=p.applications.filter(a=>a.borrowerId===need.id);assert.equal(requests.reduce((n,a)=>n+a.amount,0),need.requested);assert.equal(need.commercial+need.cre,need.requested);assert(need.requested<=need.liquidityGap);assert(need.requested<=need.borrowingRoom);}
 assert(p.applications.every(a=>a.initialDrawBps===10000&&a.channel==='physical'));
 assert.equal(new Set(p.applications.map(a=>a.id)).size,p.applications.length);
 for(const changes of [{activityMonth:0},{originatedMonth:1},{originatedMonth:2}]){
  const altered=copy(f.world);Object.assign(altered.lending,changes);assert.throws(()=>D.prepare({world:altered,contracts:f.contracts,book:f.book}));
 }
});
test('actual simultaneous funded origination preserves whole-world cash and exact liabilities',()=>{
 const f=next(opening()),before=copy(f),prepared=D.prepare(boundary(f)),r=originate(f,{feeBps:100});equal(f,before);assert.equal(totalCash(r),totalCash(f));assert(r.contracts.length>0);
 for(const [i,c]of r.world.companies.entries()){
  const held=r.contracts.filter(x=>x.borrowerId===c.id),principal=held.reduce((n,x)=>n+x.principal,0);
  assert.equal(c.book.accounts.debt-f.world.companies[i].book.accounts.debt,principal);assert(principal<=prepared.needs[i].requested);
  assert.equal(c.book.accounts.cash-f.world.companies[i].book.accounts.cash,principal-c.report.loanFee);
 }
 for(const p of r.collateral){assert.equal(p.externalPledgedValue,0);assert.equal(p.pledgedValue,r.contracts.filter(c=>c.collateral?.id===p.id).reduce((n,c)=>n+c.collateral.pledgedValue,0));}
 equal(D.collateral(boundary(r)),r.collateral);assert.throws(()=>D.prepare(boundary(r)),'Completed month cannot issue another copy of demand');
});
test('bank, offer, application and borrower order do not change funded fills',()=>{
 const f=next(opening()),a=originate(f),b=originate(f,{reverse:true});equal(a,b);
 const nextA=next(a),nextB=copy(nextA);nextB.contracts.reverse();equal(D.prepare(boundary(nextA)),D.prepare(boundary(nextB)));
});
test('individually valid two-lender claims cannot overpledge the same fixed property',()=>{
 const f=originate(next(opening())),contracts=copy(f.contracts),secured=contracts.filter(c=>c.borrowerId==='company:0'&&c.collateral);
 assert.equal(secured.length,2,'Actual paid clearing must give both banks a CRE claim');
 for(const c of secured){
  c.collateral.pledgedValue=c.collateral.originalValue;
  c.collateral.originationLtvBps=Number((BigInt(c.originalCommitment)*10000n+BigInt(c.collateral.pledgedValue)-1n)/BigInt(c.collateral.pledgedValue));
  L.validateContract(c);
 }
 V.validate(f.world,contracts); // Full cash/debt books and individual contracts still reconcile.
 assert.equal(contracts.reduce((n,c)=>n+c.principal,0),f.contracts.reduce((n,c)=>n+c.principal,0));
 assert(secured.reduce((n,c)=>n+c.collateral.pledgedValue,0)>f.book.companies[0].property.openingValue);
 const boundary={world:f.world,book:f.book,contracts};
 assert.throws(()=>D.validate(boundary),/aggregate|pledge/i);
 assert.throws(()=>D.collateral(boundary),/aggregate|pledge/i);
});
test('real debt ceilings can be exhausted and actual paid surplus suppresses demand',()=>{
 let f=opening();let capped=false,surplus=false;const total=totalCash(f);
 for(let i=0;i<12;i++){
  f=next(f);const p=D.prepare(boundary(f));
  for(const n of p.needs){if(n.requested<n.liquidityGap){capped=true;assert.equal(n.requested,n.borrowingRoom);}if(n.blocked==='cash-sufficient'){surplus=true;assert.equal(n.requested,0);}}
  f=originate(f);assert.equal(totalCash(f),total);
 }
 assert(capped,'Authored ceilings must actually constrain requested new debt');
 // Actual paid premiums stress retained equity; no book/cash/debt injection.
 // This is a funded boundary stress fixture, not a claim that a UI policy may
 // spend every company dollar on one normal insurance product.
 let stressed=opening(),exhausted=false;stressed.carrier=G.opening('ceiling-stress-carrier');const conserved=totalCash(stressed);
 for(let i=0;i<8&&!exhausted;i++){
  stressed=next(stressed);
  const paid=V.payAgencyPremium(stressed.world,0,stressed.carrier,stressed.world.companies[0].book.accounts.cash,stressed.contracts);
  stressed={...stressed,world:paid.world,carrier:paid.carrier};const n=D.prepare(boundary(stressed)).needs[0];
  if(n.blocked==='debt-limit'){exhausted=true;assert.equal(n.borrowingRoom,0);assert.equal(n.requested,0);assert(n.existingDebt>=n.borrowingLimit);}
  stressed=originate(stressed);assert.equal(totalCash(stressed),conserved);
 }
 assert(exhausted,'Real paid expense can exhaust the borrowing ceiling without deleting debt');
 // Independently obtain a naturally cash-rich firm from ordinary funded sales.
 let rich=opening();for(let i=0;i<24&&!surplus;i++){rich=next(rich,1.3);surplus=D.prepare(boundary(rich)).needs.some(n=>n.blocked==='cash-sufficient');rich=originate(rich,{empty:true});}
 assert(surplus,'Real funded revenue can eliminate the liquidity gap');
});
test('ordinary stress liquidation retires property capacity without deleting history or new requests',()=>{
 let f=originate(next(opening())),carrier=G.opening('actual-premium-carrier');const total=totalCash({...f,carrier});
 const paid=V.payAgencyPremium(f.world,0,carrier,f.world.companies[0].book.accounts.cash,f.contracts);f={...f,world:paid.world,carrier:paid.carrier};
 let resolved=false;
 for(let i=0;i<24&&!resolved;i++){
  f=next(f,0);const p=D.prepare(boundary(f));resolved=!!f.world.companies[0].resolution;
  if(resolved){assert.equal(p.needs[0].blocked,'resolved');assert.equal(p.needs[0].requested,0);assert(!p.applications.some(a=>a.borrowerId==='company:0'));assert(!p.borrowers.some(a=>a.id==='company:0'));assert.equal(p.collateral[0].value,0);assert.equal(p.collateral[0].pledgedValue,0);assert(f.book.companies[0].property.openingValue>0);
   const reopened=copy(f.contracts),claim=reopened.find(c=>c.borrowerId==='company:0'&&c.collateral);assert(claim);claim.collateral.releasedMonth=null;
   L.validateContract(claim);V.validate(f.world,reopened);
   assert.throws(()=>D.validate({world:f.world,book:f.book,contracts:reopened}),/aggregate|pledge/i,'Resolved zero-value property cannot retain a live lien');
  }
  f=originate(f,{empty:true});assert.equal(totalCash(f),total);
 }
 assert(resolved,'Actual loan stress must reach funded resolution');
});
test('asset-derived pledge evidence rejects canonical property relabeling',()=>{
 const f=originate(next(opening())),contracts=copy(f.contracts),c=contracts.find(x=>x.collateral);c.collateral.id='other-property';
 assert.throws(()=>D.validate({world:f.world,book:f.book,contracts}));
 const sectors=copy(f.contracts);for(const c of sectors)if(c.borrowerId==='company:0')c.sector='other-sector';assert.throws(()=>D.validate({world:f.world,book:f.book,contracts:sectors}));
});
console.log(JSON.stringify({status:'PASS',checks,months,scope:'Isolated authored finite company demand consumed by actual V4 funded settlement; not installed gameplay, household funding or complete UI/AI acceptance'}));
