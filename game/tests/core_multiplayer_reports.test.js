'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={
 esc:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
 coreMultiMoney:value=>Number.isFinite(value)?'$'+Math.round(value).toLocaleString('en-US'):'Unavailable'
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/ui/core-multiplayer-reports.js'),'utf8'),context);
const render=context.coreMultiFinancialReport;
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}
function record(cycle){return {cycle,loanIncome:12345,commercialIncome:6789,depositIncome:0,otherIncome:4321,fundingCost:2345,expense:3456,chargeoff:456,eventAdjustment:-567,profit:7654,principal:9876543};}
function owner(){return {name:'Cedar Bank',stats:{cash:111111,loans:222222,deposits:333333,emergencyDebt:4444,capital:555555,earnings:-6666,lastProfit:998877},accounting:{accounts:{securities:777777}},incomeHistory:{version:1,records:[record(1),record(2)]},operatingReport:{...record(2),incomeSource_securitiesInterest:4321,incomeSource_basePayroll:3000,incomeSource_facilityUpkeep:456}};}

test('Private books show observed balances, income and costs without mutating a frozen owner view',()=>{
 const view=frozen({cycle:3,gameOver:false,me:owner()}),before=JSON.stringify(view),html=render(view);
 assert.equal(JSON.stringify(view),before);
 for(const amount of ['$111,111','$222,222','$333,333','$4,444','$555,555','$-6,666','$777,777','$12,345','$6,789','$4,321','$2,345','$3,456','$456','$-567','$7,654','$9,876,543'])assert(html.includes(amount),amount);
 assert.match(html,/Outstanding loan principal/);assert.match(html,/Customer deposits · liabilities/);assert.match(html,/Loan principal · balance/);
 assert.match(html,/These balances are not income/);assert.match(html,/Profit is not the change in cash/);
 assert.match(html,/included in other income/);assert.match(html,/included in operating expenses/);
});
test('Opening and missing history do not invent earnings from balances or last-profit statistics',()=>{
 const me=owner();delete me.incomeHistory;delete me.operatingReport;
 const opening=render({cycle:1,me}),later=render({cycle:8,me});
 assert.match(opening,/No month has completed yet/);assert.match(later,/No completed operating report is available/);
 for(const html of [opening,later]){assert.match(html,/No retained monthly history/);assert(!html.includes('$998,877'));assert(!html.includes('<tbody>'));assert(!html.includes('Recorded operating profit</dt>'));}
});
test('Only the latest twelve actual months appear, in order, without changing retained records',()=>{
 const me=owner();delete me.operatingReport;me.incomeHistory.records=Array.from({length:15},(_,index)=>record(15-index));
 const view=frozen({cycle:16,me}),before=JSON.stringify(view),html=render(view);
 const months=[...html.matchAll(/<th scope="row">(\d+)<\/th>/g)].map(match=>Number(match[1]));
 assert.deepEqual(months,Array.from({length:12},(_,index)=>index+4));assert.equal(JSON.stringify(view),before);
 assert.match(html,/Recorded operations · month 15/);
});
test('Missing observed amounts remain unavailable and current-month reports are not presented as completed',()=>{
 const me=owner();delete me.incomeHistory.records[1].profit;me.operatingReport={...record(3),profit:11223344};
 const html=render({cycle:3,me});
 assert.match(html,/Recorded operations · month 2/);assert.match(html,/Recorded operating profit<\/dt><dd>Unavailable/);
 assert(!html.includes('$11,223,344'));assert(!html.includes('$998,877'));
});
test('A retained operating report is shown without fabricating a history row',()=>{
 const me=owner();delete me.incomeHistory;
 const html=render({cycle:3,me});assert.match(html,/Recorded operations · month 2/);assert.match(html,/\$7,654/);
 assert.match(html,/No retained monthly history/);assert(!html.includes('<tbody>'));
});
test('Rendering escapes owner text and never reads rivals, bank rosters, plans or forecasts',()=>{
 const me=owner();me.name='<img src=x onerror="bad()">';
 const view={cycle:3,me};for(const key of ['rival','rivals','banks','players','lastPlans','forecast'])Object.defineProperty(view,key,{get(){throw Error('Private report read '+key);}});
 Object.defineProperty(me,'submittedPlan',{get(){throw Error('Private report read a draft');}});
 const html=render(view);assert(!html.includes('<img'));assert.match(html,/&lt;img src=x onerror=&quot;bad\(\)&quot;&gt;/);
 assert(!/<(?:input|button|script)\b/.test(html));
});
