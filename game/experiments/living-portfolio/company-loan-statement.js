'use strict';
// Quarantined v4 public-statement boundary, not an engine/forecast replacement.
// Only the projector sees canonical contracts. Public validation uses company
// accounting and aggregate attribution, never invented private loan objects.
function createCompanyLoanStatement({GroupAccounting:G,companyFinance:V}){
  const whole=(n,signed=false)=>Number.isSafeInteger(n)&&(signed||n>=0);
  const check=(n,label,signed=false)=>{if(!whole(n,signed))throw Error('Invalid public '+label);return n;};
  const sum=values=>values.reduce((n,v)=>check(n+check(v,'amount'),'sum'),0);
  const shape=(x,keys,label)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join('|')!==keys.slice().sort().join('|'))throw Error('Invalid public '+label+' fields');};
  const copy=x=>JSON.parse(JSON.stringify(x));
  const reportKeys=['month','salesRequested','sales','operatingCost','operatingPaid','interest','interestPaid','principalDue','principalPaid','serviceDue','servicePaid','profit','resolutionEarnings','dividend','arrears','cashLimited','agencyExpense','loanFee','loanInterest','loanPrincipalPaid','loanInterestPaid'];
  const resolutionKeys=['month','openingCash','cashAvailable','proceeds','assetLoss','creditorRecovery','creditorWriteoff','supplierRecovery','supplierWriteoff','equityDistribution','bankServiceRecovery','bankServiceWriteoff','bankLoanRecovery','bankLoanWriteoff'];
  const companyKeys=['id','market','clientIndex','baseFee','principalDue','externalDebt','externalPrincipalArrears','externalInterestArrears','bankServicePayables','supplierPayables','bankLoans','book','report','resolution'];
  function validate(statement,expected=null){
    shape(statement,['version','world','services'],'company loan statement');if(statement.version!==1)throw Error('Unsupported public company statement');
    const w=statement.world;shape(w,['version','month','companies'],'company world');if(w.version!==4)throw Error('Unsupported public company rules');check(w.month,'company month');
    if(!Array.isArray(w.companies)||w.companies.length!==6||!Array.isArray(statement.services)||statement.services.length!==6)throw Error('Six public companies and service rows required');
    const markets=new Set();
    for(const [i,c]of w.companies.entries()){
      shape(c,companyKeys,'company');
      if(c.id!=='company:'+i||c.clientIndex!==i||typeof c.market!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(c.market)||markets.has(c.market)||!whole(c.baseFee)||c.baseFee<2||c.baseFee>100000||c.baseFee%2||c.principalDue!==c.baseFee/2)throw Error('Invalid public company identity');markets.add(c.market);
      for(const key of ['externalDebt','externalPrincipalArrears','externalInterestArrears','bankServicePayables','supplierPayables'])check(c[key],key);
      if(c.externalPrincipalArrears>c.externalDebt)throw Error('External principal arrears exceed external debt');
      const q=c.bankLoans;shape(q,['principal','recognizedInterest','undrawn','suspendedInterest'],'aggregate loan claims');for(const n of Object.values(q))check(n,'loan claim');sum([q.principal,q.undrawn]);
      // A real balanced GroupAccounting checkpoint, with no transaction journal
      // or counterparties. G.validate rejects nested unknown accounts/fields.
      G.validate(c.book);if(c.book.entityId!==c.id||c.book.journal.length!==0)throw Error('Public company books require compact matching checkpoints');
      const a=c.book.accounts;if(a.investments||a.custodyAssets||a.custodyLiabilities||a.businessAssets!==(c.resolution?0:72*c.baseFee))throw Error('Unsupported public company assets');
      if(a.debt!==sum([c.externalDebt,q.principal]))throw Error('Public debt attribution does not reconcile');
      if(a.payables!==sum([c.externalInterestArrears,c.bankServicePayables,c.supplierPayables,q.recognizedInterest]))throw Error('Public payable attribution does not reconcile');
      if(c.resolution!==null){
        const r=c.resolution;shape(r,resolutionKeys,'company resolution');for(const n of Object.values(r))check(n,'resolution amount');
        if(!r.month||r.month>w.month||r.proceeds>36*c.baseFee||r.assetLoss!==72*c.baseFee-r.proceeds||Object.values(a).some(Boolean)||c.externalDebt||c.externalPrincipalArrears||c.externalInterestArrears||c.bankServicePayables||c.supplierPayables||Object.values(q).some(Boolean))throw Error('Unresolved public company claims');
        if(r.cashAvailable!==sum([r.openingCash,r.proceeds])||r.cashAvailable!==sum([r.creditorRecovery,r.supplierRecovery,r.equityDistribution,r.bankServiceRecovery,r.bankLoanRecovery]))throw Error('Public liquidation opening cash and distributions do not reconcile');
      }
      if(c.report===null){if(w.month!==0)throw Error('Missing public monthly report');}
      else{
        const r=c.report;shape(r,reportKeys,'company report');
        if(r.month!==w.month||typeof r.cashLimited!=='boolean')throw Error('Invalid public report month');
        for(const [key,n]of Object.entries(r))if(key!=='cashLimited')check(n,'report '+key,['profit','resolutionEarnings'].includes(key));
        const profit=BigInt(r.sales)-BigInt(r.operatingCost)-BigInt(r.interest)-BigInt(r.serviceDue)-BigInt(r.agencyExpense)-BigInt(r.loanFee)-BigInt(r.loanInterest)+BigInt(r.resolutionEarnings);
        if(BigInt(r.profit)!==profit||r.sales>r.salesRequested||r.operatingPaid>r.operatingCost||r.interestPaid>r.interest||r.principalPaid>r.principalDue||r.servicePaid>r.serviceDue||r.arrears!==a.payables)throw Error('Public company earnings do not reconcile');
        const release=c.resolution?.month===w.month?-c.resolution.assetLoss+sum([c.resolution.creditorWriteoff,c.resolution.supplierWriteoff,c.resolution.bankServiceWriteoff,c.resolution.bankLoanWriteoff]):0;
        if(r.resolutionEarnings!==release)throw Error('Public resolution earnings do not reconcile');
        if(c.resolution?.month<w.month&&(r.cashLimited||reportKeys.some(k=>!['month','cashLimited'].includes(k)&&r[k]!==0)))throw Error('Closed public company still operates');
      }
      const s=statement.services[i];shape(s,['provider','fee','served'],'public service');
      if(![-1,0,1].includes(s.provider)||!whole(s.fee)||s.fee>100000||typeof s.served!=='boolean'||s.served===!!c.resolution||c.resolution&&s.provider!==-1)throw Error('Invalid public signed service assumption');
    }
    // Optional independent public roster/time fence supplied by the live view
    // adapter. This is not a private lender ledger or a rival instruction set.
    if(expected!==null){
      shape(expected,['month','profiles','services'],'expected statement boundary');check(expected.month,'expected month');
      if(expected.month!==w.month||!Array.isArray(expected.profiles)||expected.profiles.length!==6||!Array.isArray(expected.services)||expected.services.length!==6)throw Error('Stale public statement or missing public roster');
      for(const [i,p]of expected.profiles.entries()){
        shape(p,['market','baseFee'],'expected company profile');shape(expected.services[i],['provider','fee','served'],'expected public service');
        if(p.market!==w.companies[i].market||p.baseFee!==w.companies[i].baseFee||['provider','fee','served'].some(k=>expected.services[i][k]!==statement.services[i][k]))throw Error('Public statement and signed service roster disagree');
      }
    }
    return {month:w.month,companies:6,cash:sum(w.companies.map(c=>c.book.accounts.cash)),debt:sum(w.companies.map(c=>c.book.accounts.debt)),payables:sum(w.companies.map(c=>c.book.accounts.payables)),bankPrincipal:sum(w.companies.map(c=>c.bankLoans.principal)),externalDebt:sum(w.companies.map(c=>c.externalDebt))};
  }
  function project(world,contracts,publicServices){
    if(world?.version!==4)throw Error('Only explicit v4 companies use this statement boundary');
    V.validateSettled(world,contracts);
    const companies=world.companies.map(c=>{
      const held=contracts.filter(x=>x.borrowerId===c.id),bankLoans={principal:sum(held.map(x=>x.principal)),recognizedInterest:sum(held.map(x=>x.servicing.interestDue)),undrawn:sum(held.map(x=>x.undrawn)),suspendedInterest:sum(held.map(x=>x.servicing.suspendedInterest))};
      const state={accounts:{...c.book.accounts},retainedEarnings:c.book.retainedEarnings,sequence:c.book.sequence};
      const book={version:c.book.version,entityId:c.id,...copy(state),checkpoint:copy(state),journal:[]};
      const bankServicePayables=sum(c.bankArrears),supplierPayables=c.book.accounts.payables-c.interestArrears-bankServicePayables-bankLoans.recognizedInterest;
      let resolution=null;if(c.resolution){const r=c.resolution;resolution={...Object.fromEntries(resolutionKeys.filter(k=>!k.startsWith('bank')).map(k=>[k,r[k]])),bankServiceRecovery:sum(r.bankRecovery),bankServiceWriteoff:sum(r.bankWriteoff),bankLoanRecovery:sum(r.loanRecovery),bankLoanWriteoff:sum(r.loanWriteoff)};}
      return {id:c.id,market:c.market,clientIndex:c.clientIndex,baseFee:c.baseFee,principalDue:c.principalDue,externalDebt:c.externalDebt,externalPrincipalArrears:c.principalArrears,externalInterestArrears:c.interestArrears,bankServicePayables,supplierPayables,bankLoans,book,report:c.report?Object.fromEntries(reportKeys.map(k=>[k,c.report[k]])):null,resolution};
    });
    // Whitelist all output; even this already-public service input is validated
    // strictly rather than allowing extra sealed-plan metadata through a spread.
    if(!Array.isArray(publicServices))throw Error('Public service rows required');for(const s of publicServices)shape(s,['provider','fee','served'],'public service');
    const result={version:1,world:{version:4,month:world.month,companies},services:publicServices.map(s=>({provider:s.provider,fee:s.fee,served:s.served}))};
    validate(result);return result;
  }
  return Object.freeze({project,validate,limitations:Object.freeze([
    'Aggregate consistency is validated, not authenticity of a forged but internally consistent remote balance sheet; the live session snapshot/owner fence remains mandatory.',
    'Current corporateIncomeFlow calls CompanyFinance.step on a full company world. It cannot consume this public v4 statement.',
    'A separate owner-safe company-service forecast must model finite publicly available company cash and public creditor priority without accessing rival loan terms or sealed plans.',
    'Agency quote/premium affordability forecasts, company UI adapters, owner loan servicing forecasts and transport/version validation are not wired by this candidate.',
    'Signed public services assume delivery while companies remain open; actual rival staffing or pending instructions are never forecast inputs.'
  ])});
}
module.exports=createCompanyLoanStatement;
