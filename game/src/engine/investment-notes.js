// Fixed-term investment claims funded from existing client cash. This pure
// domain owns the issuer debt/interest mirror, not campaign authorization,
// suitability, qualified work or custody. No opening endowment or bank deposit.
const InvestmentNotes=(()=>{
 const clone=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const DENOM=120000,MAX_POSITIONS=4096;
 const products=Object.freeze({
  short:Object.freeze({label:'Six-month income note',months:6,spreadBp:-50,minimum:100,description:'Lower fixed coupon and earlier scheduled return of principal. No early redemption or deposit protection.'}),
  long:Object.freeze({label:'Two-year income note',months:24,spreadBp:100,minimum:100,description:'Higher fixed coupon with a longer cash commitment and exposure to the same issuer. No early redemption or deposit protection.'})
 });
 function investmentNotesOpening(){return {version:1,month:0,cleared:false,sequence:0,issued:0,principalPaid:0,interestAccrued:0,interestPaid:0,positions:[],report:[],execution:[]};}
 function investmentNotesTerms(product,annualBp){
  if(!Object.hasOwn(products,product)||!whole(annualBp)||annualBp>2000)throw Error('Invalid investment note product or reference rate.');
  return {...products[product],annualBp:Math.max(0,annualBp+products[product].spreadBp)};
 }
 function investmentNotesClaims(book,clientId){
  return book.positions.filter(p=>p.clientId===clientId).reduce((n,p)=>n+p.principal+p.interestDue,0);
 }
 function investmentNotesQuote(client,price,position,product,amount,annualBp){
  const terms=investmentNotesTerms(product,annualBp),fit=InvestmentSuitability.assess(client,price,position);
  if(!whole(amount)||amount<100||amount>1000000||amount%100)throw Error('Note orders use whole $100 units, up to $1M.');
  if(product==='long'&&fit.key==='liquidity')return {amount:0,fee:0,annualBp:terms.annualBp,months:terms.months,reason:'horizon'};
  const reserve=5,headroom=Math.max(0,Number(BigInt(Math.max(0,fit.total-reserve))*BigInt(fit.maximumBp)/10000n)-fit.exposure);
  const cashRoom=Math.max(0,client.cash-reserve),filled=Math.floor(Math.min(amount,cashRoom,headroom)/100)*100;
  return {amount:filled,fee:filled?reserve:0,annualBp:terms.annualBp,months:terms.months,reason:filled===amount?'':headroom<Math.min(amount,cashRoom)?'suitability':'cash'};
 }
 function investmentNotesRoom(dealer){
  GroupAccounting.validate(dealer);
  // Existing net assets and securities constrain borrowing. New subscription
  // cash cannot immediately enlarge the same issue's underwriting allowance.
  return Math.max(0,Math.min(Math.floor(dealer.accounts.equity/2),Number(BigInt(dealer.accounts.businessAssets)*4n/5n))-dealer.accounts.debt);
 }
 function investmentNotesValidate(book,clients,dealer){
  GroupAccounting.validate(dealer);
  if(!exact(book,['version','month','cleared','sequence','issued','principalPaid','interestAccrued','interestPaid','positions','report','execution'])||book.version!==1||typeof book.cleared!=='boolean'||!['month','sequence','issued','principalPaid','interestAccrued','interestPaid'].every(k=>whole(book[k]))||!Array.isArray(book.positions)||book.positions.length>MAX_POSITIONS||!Array.isArray(book.report)||book.report.length>MAX_POSITIONS+32||!Array.isArray(clients)||new Set(clients.map(c=>c.id)).size!==clients.length||clients.some(c=>typeof c.id!=='string'||!c.id||c.id.length>80||!whole(c.cash)))throw Error('Invalid investment note ledger.');
  const ids=new Set(),known=new Set(clients.map(c=>c.id));let principal=0,interest=0;
  for(const p of book.positions){
   if(!exact(p,['id','clientId','product','original','principal','annualBp','opened','matures','carry','interestDue'])||!whole(p.id)||!p.id||p.id>book.sequence||ids.has(p.id)||!known.has(p.clientId)||!Object.hasOwn(products,p.product)||!['original','principal','annualBp','opened','matures','carry','interestDue'].every(k=>whole(p[k]))||!p.original||p.original%100||p.principal>p.original||!p.principal&&!p.interestDue||!p.opened||p.opened>book.month||p.matures!==p.opened+products[p.product].months||p.annualBp>2100||p.carry>=DENOM)throw Error('Invalid or duplicated fixed-term position.');
   ids.add(p.id);principal+=p.principal;interest+=p.interestDue;
  }
  if(!whole(principal)||!whole(interest)||book.issued!==book.principalPaid+principal||book.interestAccrued!==book.interestPaid+interest||dealer.accounts.debt!==principal||dealer.accounts.payables!==interest)throw Error('Investment note claims and issuer obligations do not reconcile.');
  if(!book.month&&(book.cleared||book.sequence||book.issued||book.principalPaid||book.interestAccrued||book.interestPaid||book.positions.length||book.report.length))throw Error('Opening note ledger cannot contain manufactured claims.');
  if(!Array.isArray(book.execution)||book.execution.length>32||new Set(book.execution.map(r=>r.clientId)).size!==book.execution.length||!book.month&&book.execution.length)throw Error('Invalid note execution report.');
  for(const r of book.execution)if(!exact(r,['owner','clientId','product','amount','filled','fee','work','reason'])||typeof r.owner!=='string'||!r.owner||!known.has(r.clientId)||!Object.hasOwn(products,r.product)||!['amount','filled','fee','work'].every(k=>whole(r[k]))||!r.amount||r.amount>1000000||r.amount%100||r.filled%100||r.filled>r.amount||r.fee!==(r.filled?5:0)||![0,5].includes(r.work)||r.filled&&!r.work||!['','cash','suitability','horizon','relationship','capacity','issuer capacity'].includes(r.reason))throw Error('Invalid qualified note execution.');
  const reports=new Set();
  for(const r of book.report){
   const key=r.kind+'/'+r.id;
   if(!exact(r,['kind','id','clientId','principal','interest','remaining','overdue'])||!['subscription','payment'].includes(r.kind)||!whole(r.id)||!r.id||r.id>book.sequence||reports.has(key)||!known.has(r.clientId)||!['principal','interest','remaining','overdue'].every(k=>whole(r[k]))||r.kind==='subscription'&&(!r.principal||r.interest||r.remaining!==r.principal||r.overdue))throw Error('Invalid investment note receipt.');
   reports.add(key);
  }
  return true;
 }
 function investmentNotesValidateView(s,month,clients,owner){
  if(!exact(s,['month','positions','report','execution','issuer'])||s.month!==month||!Array.isArray(s.positions)||s.positions.length>MAX_POSITIONS||!Array.isArray(s.report)||s.report.length>MAX_POSITIONS+32||!Array.isArray(s.execution)||s.execution.length>32||!exact(s.issuer,['cash','securities','equity','principal','interestDue','issueRoom'])||!Number.isSafeInteger(s.issuer.equity)||!['cash','securities','principal','interestDue','issueRoom'].every(k=>whole(s.issuer[k])))throw Error('Invalid term-note projection.');
  const ids=new Set(),known=new Set(clients.map(c=>c.id));let principal=0,interest=0;
  for(const p of s.positions){if(!exact(p,['id','clientId','product','original','principal','annualBp','opened','matures','carry','interestDue'])||!whole(p.id)||!p.id||ids.has(p.id)||!known.has(p.clientId)||!Object.hasOwn(products,p.product)||!['original','principal','annualBp','opened','matures','carry','interestDue'].every(k=>whole(p[k]))||!p.original||p.original%100||p.principal>p.original||!p.principal&&!p.interestDue||!p.opened||p.opened>month||p.matures!==p.opened+products[p.product].months||p.annualBp>2100||p.carry>=DENOM)throw Error('Invalid or private term-note holding.');ids.add(p.id);principal+=p.principal;interest+=p.interestDue;}
  const a=s.issuer,room=Math.max(0,Math.min(Math.floor(a.equity/2),Number(BigInt(a.securities)*4n/5n))-a.principal);
  if(principal>a.principal||interest>a.interestDue||a.cash+a.securities!==a.principal+a.interestDue+a.equity||a.issueRoom!==room)throw Error('Projected note issuer and claims disagree.');
  const payments=new Set();for(const r of s.report){const key=r.kind+'/'+r.id;if(!exact(r,['kind','id','clientId','principal','interest','remaining','overdue'])||!['subscription','payment'].includes(r.kind)||!whole(r.id)||!r.id||payments.has(key)||!known.has(r.clientId)||!['principal','interest','remaining','overdue'].every(k=>whole(r[k]))||r.overdue>r.remaining||r.kind==='subscription'&&(!r.principal||r.interest||r.remaining!==r.principal||r.overdue))throw Error('Invalid private note receipt.');payments.add(key);}
  const ordered=new Set();for(const r of s.execution){if(!exact(r,['owner','clientId','product','amount','filled','fee','work','reason'])||r.owner!==owner||typeof r.clientId!=='string'||!r.clientId||r.clientId.length>80||ordered.has(r.clientId)||!Object.hasOwn(products,r.product)||!['amount','filled','fee','work'].every(k=>whole(r[k]))||!r.amount||r.amount>1000000||r.amount%100||r.filled%100||r.filled>r.amount||r.fee!==(r.filled?5:0)||![0,5].includes(r.work)||r.filled&&!r.work||!['','cash','suitability','horizon','relationship','capacity','issuer capacity'].includes(r.reason))throw Error('Invalid or private note execution.');ordered.add(r.clientId);}
  if(!month&&(s.positions.length||s.report.length||s.execution.length))throw Error('Unexpected opening note projection.');
  return true;
 }
 function investmentNotesAllocate(total,rows){
  const sum=rows.reduce((n,r)=>n+BigInt(r.amount),0n);if(!sum)return rows.map(()=>0);
  const budget=BigInt(total)<sum?BigInt(total):sum,paid=rows.map(r=>Number(budget*BigInt(r.amount)/sum));
  const ranks=rows.map((r,i)=>({i,id:r.id,left:budget*BigInt(r.amount)%sum})).sort((a,b)=>a.left===b.left?a.id-b.id:a.left>b.left?-1:1);
  for(let n=Number(budget)-paid.reduce((a,b)=>a+b,0),i=0;i<n;i++)paid[ranks[i].i]++;
  return paid;
 }
 function investmentNotesAdvance(input,cycle){
  const {book,clients,dealer}=input;investmentNotesValidate(book,clients,dealer);
  if(!whole(cycle)||cycle!==book.month+1)throw Error('Invalid or repeated investment note month.');
  const out=clone(input),b=out.book;b.month=cycle;b.cleared=false;b.report=[];b.execution=[];
  let accrued=0;
  for(const p of b.positions){
   // Interest stops at maturity; a liquidity shortfall does not manufacture
   // penalty yields or compound an unpaid coupon into principal.
   if(cycle<=p.matures){const numerator=BigInt(p.principal)*BigInt(p.annualBp)+BigInt(p.carry);const due=Number(numerator/BigInt(DENOM));p.carry=Number(numerator%BigInt(DENOM));p.interestDue+=due;accrued+=due;}
  }
  b.interestAccrued+=accrued;
  if(accrued)out.dealer=GroupAccounting.post(out.dealer,'investment.noteInterestAccrued','investment:note-clients',{payables:accrued,equity:-accrued},-accrued);
  // Due principal is senior to coupons for this fictional issuer. Each class
  // shares actual available cash proportionally rather than by bank/turn order.
  const principal=investmentNotesAllocate(out.dealer.accounts.cash,b.positions.map(p=>({id:p.id,amount:cycle>=p.matures?p.principal:0})));
  const coupons=investmentNotesAllocate(out.dealer.accounts.cash-principal.reduce((a,n)=>a+n,0),b.positions.map(p=>({id:p.id,amount:p.interestDue})));
  for(const [i,p]of b.positions.entries()){
   const paid=principal[i]+coupons[i];p.principal-=principal[i];p.interestDue-=coupons[i];
   if(paid){out.clients.find(c=>c.id===p.clientId).cash+=paid;out.dealer=GroupAccounting.post(out.dealer,'investment.notePayment',p.clientId,{cash:-paid,debt:-principal[i],payables:-coupons[i]});}
   b.principalPaid+=principal[i];b.interestPaid+=coupons[i];
   b.report.push({kind:'payment',id:p.id,clientId:p.clientId,principal:principal[i],interest:coupons[i],remaining:p.principal+p.interestDue,overdue:cycle>=p.matures?p.principal+p.interestDue:p.interestDue});
  }
  b.positions=b.positions.filter(p=>p.principal||p.interestDue);investmentNotesValidate(b,out.clients,out.dealer);return out;
 }
 function investmentNotesSubscribe(input,orders,annualBp){
  investmentNotesValidate(input.book,input.clients,input.dealer);
  if(!input.book.month||!Array.isArray(orders)||orders.length>32||new Set(orders.map(o=>o?.clientId)).size!==orders.length||orders.some(o=>!exact(o,['clientId','product','amount'])||!input.clients.some(c=>c.id===o.clientId)||!Object.hasOwn(products,o.product)||!whole(o.amount)||o.amount<100||o.amount>1000000||o.amount%100))throw Error('Invalid or duplicate note subscription.');
  investmentNotesTerms('short',annualBp);
  for(const o of orders)if(o.amount>input.clients.find(c=>c.id===o.clientId).cash)throw Error('Note subscription exceeds actual client cash.');
  if(input.book.cleared)throw Error('Note subscriptions already cleared this month.');
  if(input.book.positions.length+orders.length>MAX_POSITIONS)throw Error('Investment note position capacity reached.');
  const ordered=orders.slice().sort((a,b)=>a.clientId<b.clientId?-1:1),units=investmentNotesAllocate(Math.floor(investmentNotesRoom(input.dealer)/100),ordered.map((o,i)=>({id:i,amount:o.amount/100})));
  const out=clone(input),b=out.book;b.cleared=true;
  for(const [i,o]of ordered.entries()){
   const amount=units[i]*100;if(!amount)continue;
   const terms=investmentNotesTerms(o.product,annualBp),p={id:++b.sequence,clientId:o.clientId,product:o.product,original:amount,principal:amount,annualBp:terms.annualBp,opened:b.month,matures:b.month+terms.months,carry:0,interestDue:0};
   out.clients.find(c=>c.id===o.clientId).cash-=amount;
   out.dealer=GroupAccounting.post(out.dealer,'investment.noteSubscription',o.clientId,{cash:amount,debt:amount});b.issued+=amount;b.positions.push(p);
   b.report.push({kind:'subscription',id:p.id,clientId:o.clientId,principal:amount,interest:0,remaining:amount,overdue:0});
  }
  investmentNotesValidate(b,out.clients,out.dealer);return out;
 }
 return Object.freeze({products,opening:investmentNotesOpening,terms:investmentNotesTerms,quote:investmentNotesQuote,claims:investmentNotesClaims,room:investmentNotesRoom,validate:investmentNotesValidate,validateView:investmentNotesValidateView,advance:investmentNotesAdvance,subscribe:investmentNotesSubscribe});
})();
