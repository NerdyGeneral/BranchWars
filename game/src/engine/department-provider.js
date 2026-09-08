// Group6 paired department settlement; both plans validate before either pays.
// One authored outside service network offers 32 quarter-work units per function
// per month. Each of the two banks may reserve at most 16. These guaranteed
// nontransferable slots avoid exposing a sealed rival's orders or promising
// capacity that simultaneous clearing could take away. Unused slots expire;
// they are not bank employees, assets, money or project execution capacity.
const DepartmentProvider=(()=>{
  const copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const CAPACITY=32,ENTITLEMENT=16,ID='department:service-network';
  function providerInitialize(cycle){
    if(!whole(cycle)||cycle<1)throw Error('A new service network requires a campaign month.');
    return {version:1,startedCycle:cycle,month:cycle-1,paid:0,supplier:GroupAccounting.opening(ID),report:null};
  }
  function providerValidate(book){
    if(!exact(book,['version','startedCycle','month','paid','supplier','report'])||book.version!==1||
      !whole(book.startedCycle)||book.startedCycle<1||!whole(book.month)||book.month<book.startedCycle-1||!whole(book.paid))throw Error('Invalid department provider book.');
    GroupAccounting.validate(book.supplier);
    if(book.supplier.entityId!==ID||book.supplier.accounts.cash!==book.paid||book.supplier.accounts.equity!==book.paid||book.supplier.retainedEarnings!==book.paid||
      Object.entries(book.supplier.accounts).some(([key,value])=>!['cash','equity'].includes(key)&&value!==0))throw Error('Department provider receipts do not reconcile.');
    if(book.month===book.startedCycle-1){if(book.report!==null||book.paid!==0)throw Error('Unsettled provider has receipts.');return true;}
    const r=book.report;
    if(!exact(r,['cycle','owners','used','paid'])||r.cycle!==book.month||!exact(r.used,DepartmentFunctions.IDS)||
      !whole(r.paid)||r.paid>book.paid||!Array.isArray(r.owners)||r.owners.length!==2||new Set(r.owners.map(row=>row.id)).size!==2)throw Error('Invalid provider settlement report.');
    for(const row of r.owners){
      if(!exact(row,['id','vendors','expense'])||typeof row.id!=='string'||!row.id||!exact(row.vendors,DepartmentFunctions.IDS)||
        Object.values(row.vendors).some(n=>!whole(n)||n>ENTITLEMENT)||row.expense!==DepartmentFunctions.IDS.reduce((n,id)=>n+row.vendors[id]*DepartmentFunctions.FUNCTIONS[id].vendorRate,0))throw Error('Invalid reserved provider slots.');
    }
    for(const id of DepartmentFunctions.IDS)if(r.used[id]!==r.owners.reduce((n,row)=>n+row.vendors[id],0)||r.used[id]>CAPACITY)throw Error('Outside provider capacity exceeded.');
    if(r.paid!==r.owners.reduce((n,row)=>n+row.expense,0))throw Error('Provider monthly receipts do not match bills.');
    return true;
  }
  function providerSupply(){return Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,ENTITLEMENT]));}
  function providerSettle(book,owners,policies,contexts){
    providerValidate(book);
    if(!Array.isArray(owners)||owners.length!==2||!Array.isArray(policies)||policies.length!==2||!Array.isArray(contexts)||contexts.length!==2||
      new Set(owners.map(p=>p.id)).size!==2)throw Error('Two distinct banks and opening department contexts are required.');
    const before=owners.reduce((n,p)=>n+BigInt(p.accounting.accounts.cash),BigInt(book.supplier.accounts.cash));
    const next=copy(book),players=copy(owners),reports=[],rows=[];
    // Validate BOTH sealed plans before posting either payment. Contexts must
    // already include every other opening cash reservation, not be recomputed
    // after the first bank pays. No future sales/dividends can fund these orders.
    const quotes=owners.map((p,i)=>{
      if(contexts[i]?.cycle!==book.month+1||!exact(contexts[i].vendorSupply,DepartmentFunctions.IDS)||
        DepartmentFunctions.IDS.some(id=>contexts[i].vendorSupply[id]!==ENTITLEMENT))throw Error('Current guaranteed provider slots required.');
      const q=DepartmentFunctions.quote(p,policies[i],contexts[i]);
      if(!q.enabled||!q.eligible)throw Error(q.reason||'Versioned department owner required.');return q;
    });
    // Canonical posting order removes player-array order from the supplier
    // journal. This does not read rival instructions when constructing a quote.
    const order=owners.map((p,i)=>({id:p.id,index:i})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    for(const {index:i}of order){
      const result=DepartmentFunctions.settle(players[i],quotes[i].policy,contexts[i],{
        supplier:next.supplier,pay(bank,provider,amount,id,source){
          return {bank:AccountingPrototype.post(bank,source,{cash:-amount,equity:-amount},-amount),
            provider:GroupAccounting.post(provider,source,id,{cash:amount,equity:amount},amount)};
        }});
      players[i]=result.owner;next.supplier=result.supplier;reports[i]=result.report;
      rows.push({id:players[i].id,vendors:copy(result.report.policy.vendors),expense:result.report.vendorExpense});
    }
    const paid=rows.reduce((n,r)=>n+r.expense,0);
    next.month++;next.paid+=paid;next.report={cycle:next.month,owners:rows,
      used:Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,rows.reduce((n,r)=>n+r.vendors[id],0)])),paid};
    providerValidate(next);
    const after=players.reduce((n,p)=>n+BigInt(p.accounting.accounts.cash),BigInt(next.supplier.accounts.cash));
    if(after!==before)throw Error('Department payments did not conserve bank and provider cash.');
    return {provider:next,players,reports};
  }
  return Object.freeze({CAPACITY,ENTITLEMENT,initialize:providerInitialize,validate:providerValidate,supply:providerSupply,settle:providerSettle});
})();
