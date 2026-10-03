// Read-only owner reporting. Recorded income stays separate from balances,
// forecasts and the rest of the monthly settlement; missing amounts stay missing.
function coreMultiFinancialReport(v){
 const owner=v?.me;
 if(!owner)return '<section class="cm-card"><h2>Private financial books</h2><p>Your bank report is unavailable.</p></section>';
 const stats=owner.stats||{},accounts=owner.accounting?.accounts||{};
 const dollars=value=>esc(Number.isFinite(value)?coreMultiMoney(value):'Unavailable');
 const facts=rows=>'<dl class="cm-facts">'+rows.map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+dollars(value)+'</dd></div>').join('')+'</dl>';
 const completed=Number.isSafeInteger(v.cycle)&&v.cycle>0?(v.gameOver?v.cycle:v.cycle-1):0;
 const observed=row=>row&&Number.isSafeInteger(row.cycle)&&row.cycle>0&&row.cycle<=completed;
 const history=owner.incomeHistory?.version===1&&Array.isArray(owner.incomeHistory.records)
  ?owner.incomeHistory.records.filter(observed).slice().sort((a,b)=>a.cycle-b.cycle).slice(-12):[];
 const operating=observed(owner.operatingReport)?owner.operatingReport:null;
 const retained=history.at(-1);
 const latest=operating&&(!retained||operating.cycle>=retained.cycle)?operating:retained;
 const balances=facts([
  ['Cash',stats.cash],['Outstanding loan principal',stats.loans],['Securities held',accounts.securities],
  ['Customer deposits · liabilities',stats.deposits],['Emergency borrowing',stats.emergencyDebt],
  ['Bank equity',stats.capital],['Cumulative settled earnings',stats.earnings]
 ]);
 const statement=latest?'<h2>Recorded operations · month '+esc(latest.cycle)+'</h2>'+facts([
  ['Loan interest income',latest.loanIncome],['Commercial service income',latest.commercialIncome],
  ['Deposit-linked income',latest.depositIncome],['Other operating income',latest.otherIncome],
  ['Funding costs',latest.fundingCost],['Operating expenses',latest.expense],['Credit losses',latest.chargeoff],
  ['Event adjustment',latest.eventAdjustment],['Recorded operating profit',latest.profit]
 ])+'<p class="cm-note">Operating profit is the recorded result of bank operations. Cumulative settled earnings also include executive decisions, research and other monthly activity. Profit is not the change in cash.</p>'
  :'<h2>Recorded operations</h2><p>'+(completed===0?'No month has completed yet.':'No completed operating report is available.')+'</p><p class="cm-note">Income and expenses appear after a month resolves. Missing records are unavailable; they are not treated as zero or reconstructed from current balances.</p>';
 const components=operating&&operating.cycle===latest?.cycle?[
  ['Securities interest · included in other income',operating.incomeSource_securitiesInterest],
  ['Payroll · included in operating expenses',operating.incomeSource_basePayroll],
  ['Office upkeep · included in operating expenses',operating.incomeSource_facilityUpkeep]
 ].filter(([,amount])=>Number.isFinite(amount)):[];
 const columns=[['Loan interest','loanIncome'],['Commercial income','commercialIncome'],['Deposit-linked income','depositIncome'],
  ['Other income','otherIncome'],['Funding costs','fundingCost'],['Operating expenses','expense'],['Credit losses','chargeoff'],
  ['Event adjustment','eventAdjustment'],['Operating profit','profit'],['Loan principal · balance','principal']];
 const table=history.length?'<div class="cm-table-scroll" tabindex="0" role="region" aria-label="Your recorded monthly financial history"><table><caption>Recorded monthly results · latest '+history.length+' of up to 12 retained months</caption><thead><tr><th scope="col">Month</th>'+columns.map(([label])=>'<th scope="col">'+esc(label)+'</th>').join('')+'</tr></thead><tbody>'+history.map(row=>'<tr><th scope="row">'+esc(row.cycle)+'</th>'+columns.map(([,key])=>'<td>'+dollars(row[key])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'
  :'<p>No retained monthly history is available. Completed reports will appear here when they are recorded.</p>';
 return '<div class="cm-columns"><section class="cm-card"><h2>Private financial books</h2><p>'+esc(owner.name||'Your bank')+' · current settled balances</p>'+balances+'<p class="cm-note">Loan principal and securities are assets. Customer deposits and borrowing are funding liabilities. These balances are not income.</p></section><section class="cm-card">'+statement+(components.length?'<details><summary>Recorded income and cost components</summary>'+facts(components)+'<p class="cm-note">These amounts are already included above; they are not additional income or charges.</p></details>':'')+'</section></div><section class="cm-card"><h2>Your monthly financial history</h2><p class="cm-note">Actual recorded amounts, rounded to whole dollars. The principal column is the closing loan balance, separate from monthly income. Missing amounts remain unavailable.</p>'+table+'</section>';
}
