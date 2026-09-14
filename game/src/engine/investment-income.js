// Cash-limited variable distributions on the existing par-100 income units.
// This ledger calculates entitlements; the paired corporate/client adapter pays
// from the existing outside issuer pool. Unpaid amounts are disclosed shortfalls,
// not spendable receivables or promised debt. No RNG or opening endowment.
const InvestmentIncome=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const DENOMINATOR=120000;
 function investmentIncomeOpening(clients){
  const ids=['$dealer','$fund',...clients.map(c=>c.id)];
  if(new Set(ids).size!==ids.length)throw Error('Investment income requires unique identified holders.');
  return {version:1,month:0,paid:0,annualBp:0,accounts:ids.map(id=>({id,carry:0,paid:0})),report:[]};
 }
 function investmentIncomeValidate(book,ids){
  if(!exact(book,['version','month','paid','annualBp','accounts','report'])||book.version!==1||!whole(book.month)||!whole(book.paid)||!whole(book.annualBp)||book.annualBp>2000||
   !Array.isArray(book.accounts)||!Array.isArray(book.report)||!Array.isArray(ids)||new Set(ids).size!==ids.length||book.accounts.length!==ids.length)throw Error('Invalid investment income ledger.');
  const seen=new Set();let paid=0;
  for(const a of book.accounts){
   if(!exact(a,['id','carry','paid'])||!ids.includes(a.id)||seen.has(a.id)||!whole(a.carry)||a.carry>=DENOMINATOR||!whole(a.paid))throw Error('Invalid income holder or fractional carry.');
   seen.add(a.id);paid+=a.paid;
  }
  if(!whole(paid)||paid!==book.paid||(!book.month&&(paid||book.annualBp||book.report.length||book.accounts.some(a=>a.carry))))throw Error('Investment income totals disagree.');
  const reports=new Set();
  for(const r of book.report){
   if(!exact(r,['id','units','openingCarry','openingPaid','due','paid'])||!seen.has(r.id)||reports.has(r.id)||!Object.entries(r).every(([k,n])=>k==='id'||whole(n))||r.openingCarry>=DENOMINATOR||r.paid>r.due)throw Error('Invalid investment distribution receipt.');
   const a=book.accounts.find(a=>a.id===r.id),numerator=BigInt(r.units)*100n*BigInt(book.annualBp)+BigInt(r.openingCarry);
   if(BigInt(r.due)!==numerator/BigInt(DENOMINATOR)||BigInt(a.carry)!==numerator%BigInt(DENOMINATOR)||a.paid!==r.openingPaid+r.paid)throw Error('Investment distribution arithmetic disagrees.');
   reports.add(r.id);
  }
  if(book.month&&reports.size!==seen.size)throw Error('Missing investment distribution receipts.');
  return true;
 }
 function investmentIncomePrepare(input,holdings,cycle,annualBp,available){
  const ids=holdings.map(h=>h.id);investmentIncomeValidate(input,ids);
  if(!whole(cycle)||cycle!==input.month+1||!whole(annualBp)||annualBp>2000||!whole(available)||holdings.some(h=>!exact(h,['id','units'])||!whole(h.units)))throw Error('Invalid or repeated investment distribution.');
  const b=copy(input);b.month=cycle;b.annualBp=annualBp;
  b.report=b.accounts.map(a=>{
   const units=holdings.find(h=>h.id===a.id).units,numerator=BigInt(units)*100n*BigInt(annualBp)+BigInt(a.carry);
   const row={id:a.id,units,openingCarry:a.carry,openingPaid:a.paid,due:Number(numerator/BigInt(DENOMINATOR)),paid:0};
   a.carry=Number(numerator%BigInt(DENOMINATOR));return row;
  });
  const due=b.report.reduce((n,r)=>n+BigInt(r.due),0n),budget=due<BigInt(available)?due:BigInt(available);
  if(due){
   const fractions=b.report.map((r,i)=>{r.paid=Number(BigInt(r.due)*budget/due);return {i,id:r.id,remainder:BigInt(r.due)*budget%due};});
   fractions.sort((a,c)=>a.remainder===c.remainder?(a.id<c.id?-1:a.id>c.id?1:0):a.remainder>c.remainder?-1:1);
   const remainder=Number(budget)-b.report.reduce((n,r)=>n+r.paid,0);
   for(let i=0;i<remainder;i++)b.report[fractions[i].i].paid++;
  }
  for(const r of b.report)b.accounts.find(a=>a.id===r.id).paid+=r.paid;
  b.paid+=Number(budget);investmentIncomeValidate(b,ids);return b;
 }
 return Object.freeze({opening:investmentIncomeOpening,validate:investmentIncomeValidate,prepare:investmentIncomePrepare});
})();
