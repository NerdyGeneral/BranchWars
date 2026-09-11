// Live company/bank boundary for Financial Group rules 2. Public company
// statements are distinct from private bank ledgers and sealed instructions.
let corporateForecastContext=null;
const corporateForecastCache=new Map();
function corporateStatement(g){
  const world=JSON.parse(JSON.stringify(g.companyEconomy));
  for(const book of [world.outside,world.creditor,...world.companies.map(c=>c.book)]){
    book.checkpoint={accounts:{...book.accounts},retainedEarnings:book.retainedEarnings,sequence:book.sequence};
    book.journal=[];
  }
  // For rival delivery, forecasts assume the public signed service is delivered.
  // They never inspect the rival's staffing or sealed next-month instructions.
  return {world,services:g.serviceAgreements.map(c=>({provider:c.owner===null?-1:g.players.findIndex(p=>p.id===c.owner),fee:c.fee,served:!c.companyClosed}))};
}
function withCorporateForecast(g,fn){
  if(![2,3,4,5,6,7,8].includes(g.financialGroupVersion))return fn();
  const previous=corporateForecastContext;corporateForecastContext=corporateStatement(g);
  try{return fn()}finally{corporateForecastContext=previous;}
}
function initializeCorporateEconomy(g){
  if(![2,3,4,5,6,7,8].includes(g.financialGroupVersion))return;
  g.companyEconomy=CompanyFinance.opening(g.serviceAgreements.map(c=>({market:c.market,baseFee:SERVICE_TYPES[c.kind].fee})));
  if([3,4,5,6,7,8].includes(g.financialGroupVersion))g.companyEconomy=CompanyFinance.withAgency(g.companyEconomy);
  g.serviceAgreements.forEach(c=>c.companyClosed=false);
  g.players.forEach((p,index)=>{
    p.accounting=AccountingPrototype.withReceivables(p.accounting);syncAccounts(p);
    p.corporate={version:1,index,report:null};
  });
}
function corporateServiceInstructions(g){
  const loads=g.players.map(p=>serviceLoad(p));
  return g.serviceAgreements.map(c=>{
    const provider=c.owner===null?-1:g.players.findIndex(p=>p.id===c.owner);
    return {provider,fee:c.fee,served:!c.companyClosed&&(provider===-1||!!loads[provider].rows.find(r=>r.id===c.id)?.served)};
  });
}
function settleCorporateEconomy(g){
  if(![2,3,4,5,6,7,8].includes(g.financialGroupVersion))return [];
  if(g.companyEconomy.month!==g.cycle-1||g.players.some(p=>p._corporatePayment))throw Error('Corporate month already reserved.');
  g.companyEconomy=CompanyFinance.step(g.companyEconomy,{demand:g.economy.demand,services:corporateServiceInstructions(g)});
  g.players.forEach((p,i)=>p._corporatePayment={cycle:g.cycle,consumed:false,...g.companyEconomy.bankFlows[i]});
  return [];
}
function corporateIncomeFlow(g,p,preview){
  if(!p.corporate)return null;
  if(!preview){
    const held=p._corporatePayment;
    if(!held||held.cycle!==g.cycle||held.consumed)throw Error('Corporate receipts were not reserved, or were already consumed.');
    return held;
  }
  const companyStatement=p.companySnapshot||corporateForecastContext;
  if(!companyStatement)throw Error('A public company statement is required for this forecast.');
  const instructions=companyStatement.services.map(s=>({...s})),load=serviceLoad(p);
  const contracts=new Map(p.serviceDesk.contracts.map(c=>[c.id,c]));
  for(const [i,c]of companyStatement.world.companies.entries()){
    const id='service-'+c.market,contract=contracts.get(id);
    if(instructions[i].provider===p.corporate.index||contract){
      instructions[i]={provider:p.corporate.index,fee:contract?.fee||instructions[i].fee,
        served:!c.resolution&&!!load.rows.find(r=>r.id===id)?.served};
    }
  }
  const key=JSON.stringify([companyStatement.world,instructions,g.economy.demand]);
  let flows=corporateForecastCache.get(key);
  if(!flows){
    flows=CompanyFinance.step(companyStatement.world,{demand:g.economy.demand,services:instructions}).bankFlows;
    corporateForecastCache.set(key,flows);
    if(corporateForecastCache.size>16)corporateForecastCache.delete(corporateForecastCache.keys().next().value);
  }
  return {...flows[p.corporate.index]};
}
function adjustCorporateIncomeReport(g,p,r,preview){
  const flow=corporateIncomeFlow(g,p,preview);if(!flow)return null;
  const difference=flow.billed-(r.contractFees||0);
  r.otherIncome+=difference;r.contractFees=flow.billed;r.profit+=difference-flow.writtenOff;
  Object.assign(r,{corporateFeesPaid:flow.cash,corporateFeesReceivable:flow.receivable,
    corporateInvoiceRecovery:flow.recovered,corporateInvoiceLoss:flow.writtenOff});
  return flow;
}
function postCorporateReceivables(g,p,flow,preview){
  if(!flow)return;
  p.accounting=AccountingPrototype.post(p.accounting,'corporate.receivables',
    {cash:flow.recovered,receivables:flow.receivable-flow.recovered-flow.writtenOff,
      equity:flow.receivable-flow.writtenOff},flow.receivable-flow.writtenOff);
  syncAccounts(p);
  if(!preview){
    p._corporatePayment.consumed=true;
    p.corporate.report={cycle:g.cycle,...Object.fromEntries(['billed','cash','receivable','recovered','writtenOff'].map(k=>[k,flow[k]]))};
  }
}
function finishCorporateEconomy(g){
  if(![2,3,4,5,6,7,8].includes(g.financialGroupVersion))return [];
  const lines=[];
  for(const p of g.players){
    if(!p._corporatePayment?.consumed)throw Error('A bank did not settle its corporate receipts.');
    delete p._corporatePayment;
    const r=p.corporate.report;
    if(r.billed||r.recovered||r.writtenOff)lines.push(p.name+' company services: $'+r.billed.toLocaleString()+
      ' billed; $'+r.cash.toLocaleString()+' paid, $'+r.receivable.toLocaleString()+' newly receivable, $'+
      r.recovered.toLocaleString()+' old invoices collected and $'+r.writtenOff.toLocaleString()+' written off.');
  }
  for(const [i,c]of g.serviceAgreements.entries())if(g.companyEconomy.companies[i].resolution&&!c.companyClosed){
    c.companyClosed=true;c.owner=null;c.due=g.cycle;
    lines.push(ANCHOR_CLIENTS[c.clientIndex].name+' entered liquidation. Its banking service contract is closed; no rival receives it for free.');
    const history=g.relationshipRecords[c.id];history.owner=null;history.streak=0;
  }
  syncServiceBook(g);return lines;
}
function validateCorporatePlayer(p,world,month,groupVersion){
  const c=p.corporate;
  if(!c||Object.keys(c).sort().join()!=='index,report,version'||c.version!==1||![0,1].includes(c.index))throw Error('Invalid corporate banking book.');
  if(p.accounting.version!==(groupVersion===8?4:[4,5,6,7].includes(groupVersion)?3:2)||p.accounting.accounts.receivables!==world.companies.reduce((n,x)=>n+x.bankArrears[c.index],0))
    throw Error('Bank receivables disagree with company liabilities.');
  if(month===0){if(c.report!==null)throw Error('Unexpected opening company receipts.');}
  else{
    const expected={cycle:month,...world.bankFlows[c.index]};
    if(!c.report||Object.keys(c.report).sort().join()!==Object.keys(expected).sort().join()||
      Object.keys(expected).some(k=>c.report[k]!==expected[k]))throw Error('Corporate receipts do not reconcile.');
  }
}
function validateCorporateSave(g){
  if(![2,3,4,5,6,7,8].includes(g.financialGroupVersion)){
    if(g.companyEconomy!==undefined||g.players.some(p=>p.corporate!==undefined)||
      (g.serviceAgreements||[]).some(c=>c.companyClosed!==undefined))throw Error('Unversioned company economy.');
    return;
  }
  CompanyFinance.validate(g.companyEconomy);
  if(g.companyEconomy.version!==([7,8].includes(g.financialGroupVersion)?4:[3,4,5,6].includes(g.financialGroupVersion)?3:2))throw Error('Company rules do not match the campaign.');
  validateCorporateCirculation(g);
  const month=g.gameOver?g.cycle:g.cycle-1;
  if(g.companyEconomy.month!==month)throw Error('Corporate settlement month does not match the campaign.');
  for(const [i,c]of g.serviceAgreements.entries()){
    const company=g.companyEconomy.companies[i];
    if(company.market!==c.market||company.clientIndex!==c.clientIndex||company.baseFee!==SERVICE_TYPES[c.kind].fee||
      c.companyClosed!==!!company.resolution||c.companyClosed&&c.owner!==null)throw Error('Company service identity disagrees.');
  }
  for(const [i,p]of g.players.entries()){
    if(p.corporate?.index!==i||p._corporatePayment!==undefined||p.companySnapshot!==undefined)throw Error('Invalid corporate owner or unfinished settlement.');
    validateCorporatePlayer(p,g.companyEconomy,month,g.financialGroupVersion);
  }
}
function projectCorporateEconomy(g,out,index){
  if(![2,3,4,5,6,7,8].includes(g.financialGroupVersion))return;
  out.me.corporate=JSON.parse(JSON.stringify(g.players[index].corporate));
  out.me.companySnapshot=corporateStatement(g);
  delete out.rival.corporate;delete out.rival.companySnapshot;
}
function validateCorporateView(view){
  if(![2,3,4,5,6,7,8].includes(view.financialGroupVersion)){
    if(view.me?.corporate!==undefined||view.me?.companySnapshot!==undefined||view.rival?.corporate!==undefined||view.rival?.companySnapshot!==undefined)throw Error('Unversioned corporate view.');return;
  }
  const companyStatement=view.me.companySnapshot;
  if(!companyStatement||Object.keys(companyStatement).sort().join()!=='services,world'||!Array.isArray(companyStatement.services)||companyStatement.services.length!==6)
    throw Error('Missing public company statements.');
  CompanyFinance.validate(companyStatement.world);
  if(companyStatement.world.version!==([7,8].includes(view.financialGroupVersion)?4:[3,4,5,6].includes(view.financialGroupVersion)?3:2))throw Error('Company view rules do not match the campaign.');
  if(!Array.isArray(view.serviceAgreements)||view.serviceAgreements.length!==6)throw Error('Missing company service roster.');
  for(const [i,c]of companyStatement.world.companies.entries()){
    const contract=view.serviceAgreements[i];
    if(!contract||contract.market!==c.market||contract.clientIndex!==c.clientIndex||
      !SERVICE_TYPES[contract.kind]||SERVICE_TYPES[contract.kind].fee!==c.baseFee||
      contract.companyClosed!==!!c.resolution||contract.companyClosed&&contract.owner!==null)
      throw Error('Company statement identity disagrees with the service roster.');
    const service=companyStatement.services[i],own=view.me.corporate?.index;
    const provider=contract.owner===null?-1:contract.owner===view.me.id?own:contract.owner===view.rival.id?1-own:NaN;
    if(service?.provider!==provider||service?.fee!==contract.fee)throw Error('Company service provider disagrees.');
  }
  if([companyStatement.world.outside,companyStatement.world.creditor,...companyStatement.world.companies.map(c=>c.book)]
    .some(book=>book.journal.length!==0))throw Error('Company statements must use compact public balances.');
  if(companyStatement.world.month!==(view.gameOver?view.cycle:view.cycle-1))throw Error('Stale company statements.');
  validateCorporatePlayer(view.me,companyStatement.world,companyStatement.world.month,view.financialGroupVersion);
  AccountingPrototype.restore(AccountingPrototype.snapshot(view.me.accounting,96));
  if(view.rival.corporate!==undefined||view.rival.companySnapshot!==undefined)throw Error('Private rival corporate ledger exposed.');
  for(const [i,s]of companyStatement.services.entries())if(!s||Object.keys(s).sort().join()!=='fee,provider,served'||
    ![-1,0,1].includes(s.provider)||!Number.isSafeInteger(s.fee)||s.fee<0||s.fee>100000||typeof s.served!=='boolean'||
    s.served===!!companyStatement.world.companies[i].resolution)throw Error('Invalid public company contract.');
}
