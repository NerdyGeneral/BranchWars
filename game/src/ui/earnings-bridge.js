'use strict';
// Owner-only presentation. No saved-book or ledger calculation lives here.
function createBankEarningsBridgeUi(engine){
  const unavailable=reason=>({available:false,reason});
  const int=Number.isSafeInteger;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dollars=n=>(n<0?'−':'')+'$'+Math.abs(n).toLocaleString('en-US');
  function reviewProjectedBankEarningsBridge(v){
    const b=v?.earningsBridge;
    if(!b)return engine.review(v);
    if(![6,7].includes(v.financialGroupVersion)||b.version!==1||b.ownerId!==v.me?.id||b.resolutionId!==v.resolutionId)
      return unavailable('The owner earnings summary does not match this snapshot.');
    if(b.available===false)return unavailable('Complete monthly earnings history is unavailable. No opening balance has been reconstructed.');
    if(b.available!==true||!['cycle','opening','operatingProfit','otherNet','change','closing'].every(k=>int(b[k]))||
      b.cycle!==(v.gameOver?v.cycle:v.cycle-1)||b.cycle!==v.me?.operatingReport?.cycle||b.operatingProfit!==v.me.operatingReport.profit||
      b.closing!==v.me?.accounting?.retainedEarnings||b.closing!==v.me?.stats?.earnings||b.opening+b.change!==b.closing||b.operatingProfit+b.otherNet!==b.change)
      return unavailable('The owner earnings summary does not reconcile with this bank report.');
    return b;
  }
  function renderBankEarningsBridgeDetails(v){
    if(![6,7].includes(v?.financialGroupVersion)||!v.me?.accounting)return '';
    const b=reviewProjectedBankEarningsBridge(v);
    if(!b.available)return '<details class="earnings-bridge regional-economics"><summary>Bank retained earnings · bridge unavailable</summary><p>'+escape(b.reason)+'</p></details>';
    const rows=[['Opening bank retained earnings',b.opening],['Reported operating profit',b.operatingProfit],['Other net changes',b.otherNet],['Closing bank retained earnings',b.closing]];
    return '<details class="earnings-bridge regional-economics"><summary>Bank retained earnings · month '+b.cycle+' · net change '+dollars(b.change)+'</summary><table class="forecast-table"><caption>Latest completed month only</caption><tbody>'+rows.map(([label,n])=>'<tr><th scope="row">'+label+'</th><td>'+dollars(n)+'</td></tr>').join('')+'</tbody></table><p>Operating profit is included once, including its reported department and maintenance costs. Other net changes can include expansion, research, events, competitive spending and transfers to the parent. A bank dividend reduces bank retained earnings; it is not an expense for the consolidated group. New deposits and borrowing are not earnings.</p><p>The opening balance is reconstructed from this month’s retained owner events, not from the shortened accounting journal. This is a bank earnings bridge, not cash flow or lifetime group return.</p></details>';
  }
  return Object.freeze({review:reviewProjectedBankEarningsBridge,render:renderBankEarningsBridgeDetails});
}

const bankEarningsBridgeView=createBankEarningsBridgeUi(E.BankEarningsBridge);
function renderBankEarningsBridge(v){return bankEarningsBridgeView.render(v);}
