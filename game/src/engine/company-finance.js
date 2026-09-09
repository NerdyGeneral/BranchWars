// Pure corporate settlement boundary for the Financial Group implementation.
// Not installed into existing campaigns. Opening assets are explicit corporate
// endowments, never player deposits or parent cash. All subsequent receipts have
// a funded payer; supplier receivables cannot be spent as cash.
const CompanyFinance = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const whole = n => Number.isSafeInteger(n) && n >= 0;
  const exact = (x, keys) => x && typeof x === 'object' && !Array.isArray(x) &&
    Object.keys(x).sort().join() === [...keys].sort().join();
  const sensitivity = [1.3, 1.2, .4, 1.1, 1, .8];
  function companyValidate(world) {
    if (!exact(world, ['version','month','outside','creditor','companies','openingCash','recoveredAssets','bankCashPaid','bankFlows',...([3,4].includes(world?.version)?['agencyCashNet']:[]),...(world?.version===4?['circulation']:[])]) ||
        ![2,3,4].includes(world.version) || ([3,4].includes(world.version)&&!Number.isSafeInteger(world.agencyCashNet)) || !whole(world.month) || !whole(world.openingCash) ||
        !whole(world.recoveredAssets) ||
        !Array.isArray(world.companies) || world.companies.length !== 6) throw Error('Invalid corporate economy.');
    GroupAccounting.validate(world.outside); GroupAccounting.validate(world.creditor);
    if(world.version===4){
      const r=world.circulation;
      if(!exact(r,['version','month','externalReturned','creditorSpent','lastExternal','lastCreditor'])||r.version!==1||
        ['month','externalReturned','creditorSpent','lastExternal','lastCreditor'].some(k=>!whole(r[k]))||
        r.month>world.month||r.month<Math.max(0,world.month-1)||r.lastExternal>r.externalReturned||r.lastCreditor>r.creditorSpent||
        r.month===0&&(r.externalReturned||r.creditorSpent||r.lastExternal||r.lastCreditor))throw Error('Invalid funded corporate circulation.');
    }
    if (world.outside.entityId !== 'corporate:outside' || world.creditor.entityId !== 'corporate:creditors')
      throw Error('Invalid corporate counterparty.');
    const ids = new Set();
    if(!Array.isArray(world.bankCashPaid)||world.bankCashPaid.length!==2||world.bankCashPaid.some(n=>!whole(n))||
        !Array.isArray(world.bankFlows)||world.bankFlows.length!==2)throw Error('Invalid corporate bank boundary.');
    for(const flow of world.bankFlows)if(!exact(flow,['billed','cash','receivable','recovered','writtenOff'])||
        Object.values(flow).some(n=>!whole(n))||flow.billed!==flow.cash+flow.receivable)
      throw Error('Invalid corporate bank flows.');
    let debt = 0, payable = 0, interestClaims = 0;
    for (const [index,c] of world.companies.entries()) {
      if (!exact(c,['id','market','clientIndex','baseFee','principalDue','principalArrears','interestArrears','book','report','resolution','bankArrears']) ||
          c.id !== 'company:' + index || c.clientIndex !== index ||
          typeof c.market !== 'string' || !c.market || ids.has(c.market) ||
          !whole(c.baseFee) || !c.baseFee || c.baseFee>100000 || c.principalDue !== c.baseFee / 2 ||
          !whole(c.interestArrears) || !whole(c.principalArrears)||!Array.isArray(c.bankArrears)||
          c.bankArrears.length!==2||c.bankArrears.some(n=>!whole(n)))
      throw Error('Invalid corporate profile.');
      ids.add(c.market); GroupAccounting.validate(c.book);
      if (c.book.entityId !== c.id || c.book.accounts.investments ||
          c.book.accounts.custodyAssets || c.book.accounts.businessAssets !== (c.resolution ? 0 : 72*c.baseFee))
        throw Error('Invalid corporate assets.');
      if(c.resolution!==null){
        const fields=['month','proceeds','assetLoss','creditorRecovery','creditorWriteoff','supplierRecovery',
          'supplierWriteoff','equityDistribution','bankRecovery','bankWriteoff'];
        if(!exact(c.resolution,fields)||fields.filter(k=>!k.startsWith('bank')).some(k=>!whole(c.resolution[k]))||
          ['bankRecovery','bankWriteoff'].some(k=>!Array.isArray(c.resolution[k])||c.resolution[k].length!==2||c.resolution[k].some(n=>!whole(n)))||
          !c.resolution.month||c.resolution.month>world.month||
          c.resolution.proceeds>36*c.baseFee||c.resolution.assetLoss!==72*c.baseFee-c.resolution.proceeds||
          Object.values(c.book.accounts).some(n=>n!==0)||c.principalArrears||c.interestArrears||c.bankArrears.some(Boolean))
          throw Error('Invalid corporate resolution.');
      }
      debt += c.book.accounts.debt; payable += c.book.accounts.payables;interestClaims+=c.interestArrears;
      if(c.interestArrears+c.bankArrears.reduce((a,b)=>a+b,0)>c.book.accounts.payables||c.principalArrears>c.book.accounts.debt)
        throw Error('Invalid corporate debt arrears.');
      const r=c.report;
      if (r !== null) {
        const fields=['month','salesRequested','sales','operatingCost','operatingPaid','interest','interestPaid',
          'principalDue','principalPaid','serviceDue','servicePaid','profit','resolutionEarnings','dividend','arrears','cashLimited',...([3,4].includes(world.version)?['agencyExpense']:[])];
        if (!exact(r,fields) || r.month!==world.month || typeof r.cashLimited!=='boolean' ||
            fields.filter(k=>!['cashLimited','profit','resolutionEarnings'].includes(k)).some(k=>!whole(r[k])) ||
            !Number.isSafeInteger(r.profit) || !Number.isSafeInteger(r.resolutionEarnings) || r.sales>r.salesRequested ||
            r.operatingPaid>r.operatingCost || r.interestPaid>r.interest ||
            r.principalPaid>r.principalDue || r.servicePaid>r.serviceDue ||
            r.profit!==r.sales-r.operatingCost-r.interest-r.serviceDue+r.resolutionEarnings-([3,4].includes(world.version)?r.agencyExpense:0) ||
            r.resolutionEarnings!==(c.resolution?.month===world.month?
              -c.resolution.assetLoss+c.resolution.creditorWriteoff+c.resolution.supplierWriteoff+c.resolution.bankWriteoff.reduce((a,b)=>a+b,0):0) ||
            r.arrears!==c.book.accounts.payables) throw Error('Invalid corporate report.');
        if(c.resolution?.month<world.month&&(r.cashLimited||fields.some(k=>
          !['month','cashLimited'].includes(k)&&r[k]!==0))) throw Error('Closed company is still trading.');
      } else if (world.month!==0) throw Error('Missing corporate report.');
    }
    if (world.creditor.accounts.businessAssets !== debt+interestClaims)
      throw Error('Corporate debt and creditor claims do not reconcile.');
    if (world.recoveredAssets!==world.companies.reduce((n,c)=>n+(c.resolution?.proceeds||0),0)||
        world.outside.accounts.businessAssets !== payable-interestClaims-world.companies.reduce((n,c)=>n+c.bankArrears[0]+c.bankArrears[1],0)+world.recoveredAssets)
      throw Error('Corporate arrears and supplier claims do not reconcile.');
    for (const book of [world.outside,world.creditor]) if (book.accounts.debt || book.accounts.payables ||
      book.accounts.investments || book.accounts.custodyAssets) throw Error('Unsupported corporate counterparty account.');
    const cash = [world.outside,world.creditor,...world.companies.map(c=>c.book)].reduce((n,b)=>n+b.accounts.cash,0);
    if (cash+world.bankCashPaid[0]+world.bankCashPaid[1]+([3,4].includes(world.version)?world.agencyCashNet:0) - (world.version===4?world.circulation.externalReturned:0) !== world.openingCash) throw Error('Corporate cash is not conserved.');
    return {cash,debt,payable,companies:6};
  }
  function companyOpening(profiles) {
    if (!Array.isArray(profiles) || profiles.length !== 6) throw Error('Six anchor companies are required.');
    let outside=GroupAccounting.opening('corporate:outside'),creditor=GroupAccounting.opening('corporate:creditors');
    const companies=profiles.map((profile,index)=>{
      if (!exact(profile,['market','baseFee']) || !whole(profile.baseFee) ||
          !profile.baseFee || profile.baseFee>100000 || profile.baseFee%2) throw Error('Invalid opening company fee.');
      const f=profile.baseFee,id='company:'+index;
      const book=GroupAccounting.post(GroupAccounting.opening(id),'opening.corporateEndowment','outside-founders',
        {cash:6*f,businessAssets:72*f,debt:18*f,equity:60*f});
      outside=GroupAccounting.post(outside,'opening.corporateCustomers',id,{cash:240*f,equity:240*f});
      creditor=GroupAccounting.post(creditor,'opening.corporateDebt',id,{businessAssets:18*f,equity:18*f});
      return {id,market:profile.market,clientIndex:index,baseFee:f,principalDue:f/2,
        principalArrears:0,interestArrears:0,bankArrears:[0,0],book,report:null,resolution:null};
    });
    const world={version:2,month:0,outside,creditor,companies,recoveredAssets:0,bankCashPaid:[0,0],bankFlows:[companyEmptyBankFlow(),companyEmptyBankFlow()],
      openingCash:outside.accounts.cash+companies.reduce((n,c)=>n+c.book.accounts.cash,0)};
    companyValidate(world);return world;
  }
  const companyEmptyBankFlow=()=>({billed:0,cash:0,receivable:0,recovered:0,writtenOff:0});
  function companyBankPayment(world,c,bank,amount){
    if(!amount)return;
    c.book=GroupAccounting.settlePayable(c.book,amount,'bank:'+bank);c.bankArrears[bank]-=amount;
    world.bankCashPaid[bank]+=amount;world.bankFlows[bank].recovered+=amount;
  }
  function companyCashSplit(amount,claims,month){
    const total=claims.reduce((a,b)=>a+b,0),budget=Math.min(amount,total);
    if(!total)return claims.map(()=>0);
    const result=claims.map(n=>Math.floor(n*budget/total));
    let left=budget-result.reduce((a,b)=>a+b,0);
    const order=claims.map((_,i)=>i).sort((a,b)=>claims[b]*budget%total-claims[a]*budget%total||
      (a+month)%claims.length-(b+month)%claims.length);
    for(const i of order)if(left-->0)result[i]++;
    return result;
  }
  function companyBankBill(world,c,bank,fee){
    const cash=Math.min(fee,c.book.accounts.cash),receivable=fee-cash;
    if(fee)c.book=GroupAccounting.post(c.book,'corporate.bankService','bank:'+bank,
      {cash:-cash,payables:receivable,equity:-fee},-fee);
    c.bankArrears[bank]+=receivable;world.bankCashPaid[bank]+=cash;
    const flow=world.bankFlows[bank];flow.billed+=fee;flow.cash+=cash;flow.receivable+=receivable;
    return cash;
  }
  function companyPay(world,c,requested,source) {
    const paid=Math.min(requested,c.book.accounts.cash),unpaid=requested-paid;
    if(paid) {
      c.book=GroupAccounting.post(c.book,source,world.outside.entityId,{cash:-paid,equity:-paid},-paid);
      world.outside=GroupAccounting.post(world.outside,source,c.id,{cash:paid,equity:paid},paid);
    }
    if(unpaid) {
      c.book=GroupAccounting.post(c.book,source+'.invoice',world.outside.entityId,{payables:unpaid,equity:-unpaid},-unpaid);
      world.outside=GroupAccounting.post(world.outside,source+'.receivable',c.id,
        {businessAssets:unpaid,equity:unpaid},unpaid);
    }
    return paid;
  }
  function companyResolve(world,c) {
    // A funded purchaser acquires productive assets at at most 50% book value.
    // The haircut is a real aggregate loss, not a transfer or a cash grant.
    const proceeds=Math.min(36*c.baseFee,world.outside.accounts.cash);
    const assetLoss=c.book.accounts.businessAssets-proceeds;
    c.book=GroupAccounting.post(c.book,'resolution.assetSale',world.outside.entityId,
      {cash:proceeds,businessAssets:-c.book.accounts.businessAssets,equity:-assetLoss},-assetLoss);
    if(proceeds)world.outside=GroupAccounting.post(world.outside,'resolution.assetPurchase',c.id,
      {cash:-proceeds,businessAssets:proceeds});
    world.recoveredAssets+=proceeds;
    const lenderClaim=c.book.accounts.debt+c.interestArrears;
    const supplierClaim=c.book.accounts.payables-c.interestArrears-c.bankArrears[0]-c.bankArrears[1];
    const creditorRecovery=Math.min(lenderClaim,c.book.accounts.cash);
    const creditorWriteoff=lenderClaim-creditorRecovery;
    const recoveries=companyCashSplit(c.book.accounts.cash-creditorRecovery,[supplierClaim,...c.bankArrears],world.month);
    const supplierRecovery=recoveries[0],bankRecovery=recoveries.slice(1);
    const bankWriteoff=c.bankArrears.map((n,i)=>n-bankRecovery[i]);
    const supplierWriteoff=supplierClaim-supplierRecovery;
    if(lenderClaim){
      c.book=GroupAccounting.post(c.book,'resolution.lender',world.creditor.entityId,
        {cash:-creditorRecovery,debt:-c.book.accounts.debt,payables:-c.interestArrears,
          equity:creditorWriteoff},creditorWriteoff);
      world.creditor=GroupAccounting.post(world.creditor,'resolution.lender',c.id,
        {cash:creditorRecovery,businessAssets:-lenderClaim,equity:-creditorWriteoff},-creditorWriteoff);
    }
    if(supplierClaim){
      c.book=GroupAccounting.post(c.book,'resolution.supplier',world.outside.entityId,
        {cash:-supplierRecovery,payables:-supplierClaim,equity:supplierWriteoff},supplierWriteoff);
      world.outside=GroupAccounting.post(world.outside,'resolution.supplier',c.id,
        {cash:supplierRecovery,businessAssets:-supplierClaim,equity:-supplierWriteoff},-supplierWriteoff);
    }
    for(const bank of [0,1]){
      companyBankPayment(world,c,bank,bankRecovery[bank]);
      if(bankWriteoff[bank]){
        c.book=GroupAccounting.post(c.book,'resolution.bankInvoice','bank:'+bank,
          {payables:-bankWriteoff[bank],equity:bankWriteoff[bank]},bankWriteoff[bank]);
        c.bankArrears[bank]=0;world.bankFlows[bank].writtenOff+=bankWriteoff[bank];
      }
    }
    // Residual capital returns only after creditors are settled or explicitly
    // written down. This is liquidation, not a retained-profit dividend.
    const equityDistribution=c.book.accounts.cash;
    if(equityDistribution){
      c.book=GroupAccounting.post(c.book,'resolution.capitalReturned',world.outside.entityId,
        {cash:-equityDistribution,equity:-equityDistribution});
      world.outside=GroupAccounting.post(world.outside,'resolution.capitalReceived',c.id,
        {cash:equityDistribution,equity:equityDistribution});
    }
    c.principalArrears=0;c.interestArrears=0;
    c.resolution={month:world.month,proceeds,assetLoss,creditorRecovery,creditorWriteoff,
      supplierRecovery,supplierWriteoff,equityDistribution,bankRecovery,bankWriteoff};
    c.report.resolutionEarnings=-assetLoss+creditorWriteoff+supplierWriteoff+bankWriteoff[0]+bankWriteoff[1];
    c.report.profit+=c.report.resolutionEarnings;c.report.arrears=0;
  }
  function companyStep(input,options={}) {
    companyValidate(input);
    if (!(exact(options,['demand'])||exact(options,['demand','services'])) || typeof options.demand!=='number' || !Number.isFinite(options.demand) ||
        options.demand<0 || options.demand>3) throw Error('Invalid corporate demand.');
    const services=options.services||input.companies.map(c=>({provider:-1,fee:c.baseFee,served:true}));
    if(!Array.isArray(services)||services.length!==6||services.some(s=>!exact(s,['provider','fee','served'])||
        ![-1,0,1].includes(s.provider)||!whole(s.fee)||s.fee>100000||typeof s.served!=='boolean'))
      throw Error('Invalid corporate service instructions.');
    const world=clone(input);world.month++;world.bankFlows=[companyEmptyBankFlow(),companyEmptyBankFlow()];
    const requests=world.companies.map(c=>c.resolution?0:Math.round(12*c.baseFee*Math.max(.5,
      Math.min(1.5,1+sensitivity[c.clientIndex]*(options.demand-1)))));
    // Reserve sales simultaneously from one finite purchaser pool. Rotating the
    // deterministic remainder tie prevents array-order preference over time.
    const requested=requests.reduce((a,b)=>a+b,0),budget=Math.min(requested,world.outside.accounts.cash);
    const paid=requests.map(n=>requested?Math.floor(n*budget/requested):0);
    let remainder=budget-paid.reduce((a,b)=>a+b,0);
    const order=paid.map((_,i)=>i).sort((a,b)=>
      (requests[b]*budget%requested)-(requests[a]*budget%requested) ||
      ((a+world.month)%6)-((b+world.month)%6));
    for(const i of order)if(remainder-->0)paid[i]++;
    for(const [i,c] of world.companies.entries())if(paid[i]) {
      const receipt=GroupAccounting.servicePayment(world.outside,c.book,paid[i]);
      world.outside=receipt.payer;c.book=receipt.provider;
    }
    for(const [i,c] of world.companies.entries()) {
      if(c.resolution){
        c.report={month:world.month,salesRequested:0,sales:0,operatingCost:0,operatingPaid:0,
          interest:0,interestPaid:0,principalDue:0,principalPaid:0,serviceDue:0,servicePaid:0,
          profit:0,resolutionEarnings:0,dividend:0,arrears:0,cashLimited:false,...([3,4].includes(world.version)?{agencyExpense:0}:{})};
        continue;
      }
      // Old supplier invoices have priority. Settlement creates no second cost.
      const oldClaims=[c.book.accounts.payables-c.interestArrears-c.bankArrears[0]-c.bankArrears[1],...c.bankArrears];
      const oldPayments=companyCashSplit(c.book.accounts.cash,oldClaims,world.month),arrearsPaid=oldPayments[0];
      if(arrearsPaid) {
        c.book=GroupAccounting.settlePayable(c.book,arrearsPaid,world.outside.entityId);
        world.outside=GroupAccounting.post(world.outside,'invoice.settled',c.id,
          {cash:arrearsPaid,businessAssets:-arrearsPaid});
      }
      for(const bank of [0,1])companyBankPayment(world,c,bank,oldPayments[bank+1]);
      const interestArrearsPaid=Math.min(c.interestArrears,c.book.accounts.cash);
      if(interestArrearsPaid) {
        c.book=GroupAccounting.settlePayable(c.book,interestArrearsPaid,world.creditor.entityId);
        world.creditor=GroupAccounting.post(world.creditor,'interestInvoice.settled',c.id,
          {cash:interestArrearsPaid,businessAssets:-interestArrearsPaid});
        c.interestArrears-=interestArrearsPaid;
      }
      const multiplier=requests[i]/(12*c.baseFee);
      const operatingCost=Math.round(5*c.baseFee*(1+multiplier));
      const operatingPaid=companyPay(world,c,operatingCost,'corporate.operations');
      const interest=Math.round(c.book.accounts.debt*.005);
      // Unpaid interest remains a claim held by that same lender, not principal,
      // not supplier income and not spendable cash.
      const interestPaid=Math.min(interest,c.book.accounts.cash);
      if(interestPaid) {
        const interestTransfer=GroupAccounting.servicePayment(c.book,world.creditor,interestPaid);
        c.book=interestTransfer.payer;world.creditor=interestTransfer.provider;
      }
      if(interest>interestPaid) {
        const unpaid=interest-interestPaid;c.interestArrears+=unpaid;
        c.book=GroupAccounting.post(c.book,'corporate.interestInvoice',world.creditor.entityId,
          {payables:unpaid,equity:-unpaid},-unpaid);
        world.creditor=GroupAccounting.post(world.creditor,'corporate.interestReceivable',c.id,
          {businessAssets:unpaid,equity:unpaid},unpaid);
      }
      const principalDue=Math.min(c.book.accounts.debt,c.principalDue+c.principalArrears);
      const principalPaid=Math.min(principalDue,c.book.accounts.cash);
      if(principalPaid) {
        c.book=GroupAccounting.post(c.book,'corporate.principal',world.creditor.entityId,
          {cash:-principalPaid,debt:-principalPaid});
        world.creditor=GroupAccounting.post(world.creditor,'corporate.principal',c.id,
          {cash:principalPaid,businessAssets:-principalPaid});
      }
      c.principalArrears=principalDue-principalPaid;
      // Service ownership is supplied independently of company share ownership.
      // Bank receipts and receivables are explicit boundary flows consumed by
      // the authoritative bank adapter, never bank deposits or free cash.
      const instruction=services[i],serviceDue=instruction.served?instruction.fee:0;
      const servicePaid=instruction.provider===-1?companyPay(world,c,serviceDue,'corporate.bankingService'):
        companyBankBill(world,c,instruction.provider,serviceDue);
      const profit=paid[i]-operatingCost-interest-serviceDue;
      const dividend=c.principalArrears||c.interestArrears?0:Math.min(Math.floor(Math.max(0,profit)*.3),
        GroupAccounting.distributionLimit(c.book,0,c.baseFee));
      if(dividend) {
        const distribution=GroupAccounting.dividend(c.book,world.outside,dividend,{monthlyFixedCost:c.baseFee});
        c.book=distribution.entity;world.outside=distribution.parent;
      }
      c.report={month:world.month,salesRequested:requests[i],sales:paid[i],operatingCost,operatingPaid,
        interest,interestPaid,principalDue,principalPaid,serviceDue,servicePaid,profit,resolutionEarnings:0,dividend,arrears:c.book.accounts.payables,
        ...([3,4].includes(world.version)?{agencyExpense:0}:{}),cashLimited:paid[i]<requests[i]||operatingPaid<operatingCost||interestPaid<interest||
          principalPaid<principalDue||servicePaid<serviceDue};
    }
    // Provisional credit stop: three normal operating months of unpaid bills
    // (10F operations + F banking service per month), or
    // exhausted equity, ends trading. Resolve after all monthly operations so
    // asset-sale receipts cannot fund another company's same-month sales.
    // Rotate scarce liquidation-buyer cash priority deterministically.
    for(let offset=0;offset<6;offset++){
      const c=world.companies[(offset+world.month)%6];
      if(!c.resolution&&(c.book.accounts.payables>=33*c.baseFee||c.book.accounts.equity<=0))
        companyResolve(world,c);
    }
    companyValidate(world);return world;
  }
  // Explicit creation boundary, never an import repair or an implicit upgrade.
  function withAgency(input) {
    companyValidate(input);
    if(input.version!==2||input.month!==0)throw Error('Agency company rules must be selected at campaign creation.');
    const world=clone(input);world.version=3;world.agencyCashNet=0;
    companyValidate(world);return world;
  }
  function payAgencyPremium(input,index,carrier,amount) {
    companyValidate(input);GroupAccounting.validate(carrier);
    if(![3,4].includes(input.version)||!Number.isInteger(index)||index<0||index>=6||!whole(amount))
      throw Error('Invalid company insurance payment.');
    const world=clone(input),company=world.companies[index];
    if(company.resolution||!company.report||company.book.accounts.cash<amount)
      throw Error('Company cannot fund this insurance premium.');
    const premiumTransfer=GroupAccounting.servicePayment(company.book,carrier,amount);
    company.book=premiumTransfer.payer;
    company.report.agencyExpense+=amount;company.report.profit-=amount;
    world.agencyCashNet+=amount;
    companyValidate(world);
    return {world,carrier:premiumTransfer.provider};
  }
  return Object.freeze({opening:companyOpening,validate:companyValidate,step:companyStep,withAgency,payAgencyPremium});
})();
