// Paired connection to the existing corporate outside investor. This is not
// campaign creation: the future customer adapter must supply legitimate source
// positions. No duplicate outside cash pool or recurring dealer grant is created.
const InvestmentCorporateMarket=(()=>{
 function investmentCorporateValidate(company,world,entities){
  CompanyFinance.validate(company);InvestmentClients.validate(world,entities);
  const m=company.investmentMarket;
  if(world.income?m.version!==2||m.incomePaid!==world.income.paid:m.version!==1)throw Error('Corporate and investment income boundaries disagree.');
  if(![5,6].includes(company.version)||company.month!==world.month||m.dealerCapital!==world.openingCash||
   m.units!==world.outsideUnits||m.basis!==world.outsideBasis||m.cashNet!==m.dealerCapital+world.outsideCashNet||
   world.dealer.accounts.equity!==m.dealerCapital+world.dealer.retainedEarnings)
   throw Error('Corporate and investment-market ownership or transfers disagree.');
  return true;
 }
 function investmentCorporateOpening(company,positions,capital){
  const capitalized=CompanyFinance.fundInvestmentDealer(CompanyFinance.withInvestmentMarket(company),GroupAccounting.opening('investment:dealer'),capital);
  const world=InvestmentClients.opening(positions,capitalized.dealer);
  investmentCorporateValidate(capitalized.world,world,[]);return {company:capitalized.world,world};
 }
 function investmentCorporateTrade(company,world,entities,side,amount){
  investmentCorporateValidate(company,world,entities);
  const t=InvestmentClients.tradeOutside(world,entities,company.outside,side,amount);
  const next=CompanyFinance.recordInvestmentTrade(company,side,t.units,world.price,t.investor);
  investmentCorporateValidate(next,t.world,entities);return {company:next,world:t.world,units:t.units,paid:t.paid,realized:t.realized};
 }
 function investmentCorporateDistribution(company,world,entities,annualBp){
  investmentCorporateValidate(company,world,entities);
  const r=InvestmentClients.distributeIncome(world,entities,company.outside,annualBp);
  const next=CompanyFinance.recordInvestmentIncome(company,r.paid,r.issuer);
  investmentCorporateValidate(next,r.world,r.entities);return {company:next,world:r.world,entities:r.entities,paid:r.paid};
 }
 return Object.freeze({opening:investmentCorporateOpening,validate:investmentCorporateValidate,trade:investmentCorporateTrade,distribute:investmentCorporateDistribution});
})();
