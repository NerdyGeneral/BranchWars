'use strict';
// Display-only regression for the misleading franchise-transfer claim observed
// when importing the genuine Group7 month461 receivership in the browser.
const assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html;
const start=html.indexOf('function renderFinal('),end=html.indexOf('const renderBase=render;',start);
assert(start>=0&&end>start);
const elements=new Map(),node=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',className:'',disabled:false});return elements.get(id);};
const c={$:node,show(){},esc:s=>String(s).replaceAll('<','&lt;'),money:String,tierClass:String};
vm.createContext(c);vm.runInContext(html.slice(start,end),c);
const me={id:'a',name:'Cedar Bank',capitalRatio:-.5,capitalTier:{key:'failing',short:'FAILING'}},rival={id:'b',name:'Harbor Bank',capitalRatio:13.6,capitalTier:{key:'well',short:'WELL CAP'}};
const final={markets:1,earnings:0,achievements:0,base:20,total:20,mandate:{name:'Test mandate',desc:'Test',achieved:false,bonus:0}};
function render(extra={}){
 const view={me,rival,final:{a:final,b:final},winnerId:'b',failedId:'a',endReason:'receivership',receivershipCycles:3,rematchReady:false,rivalRematchReady:false,...extra};
 const before=JSON.stringify(view);c.view=view;vm.runInContext('renderFinal(view)',c);assert.equal(JSON.stringify(view),before,'Rendering changes no books or instructions');
 return {headline:node('#winnerText').textContent,note:node('#endingNote').textContent,style:node('#winnerText').className};
}
for(const perspective of [{me,rival},{me:rival,rival:me}]){
 const pilot=render({...perspective,campaignRulesVersion:1});
 assert.equal(pilot.headline,'Cedar Bank WAS PLACED INTO RECEIVERSHIP. Harbor Bank WINS THE BANKING RIVALRY.');
 assert(!pilot.headline.includes('ASSUMED THE FRANCHISE'));
 assert(pilot.note.includes('3 consecutive cycles below a 2% capital ratio'));
 assert(pilot.note.includes('No free assets or franchise are transferred'));
 assert.equal(pilot.style,'bad');
 const funding=render({...perspective,campaignRulesVersion:1,fundingCovenantVersion:1,endReason:'funding_resolution'});
 assert.equal(funding.headline,'Cedar Bank WAS PLACED INTO FUNDING RESOLUTION. Harbor Bank WINS THE BANKING RIVALRY.');
 assert(funding.note.includes('3 consecutive months above the emergency funding limit'));
 assert(!funding.note.includes('2%'));assert.equal(funding.style,'bad');
}
for(const endReason of ['receivership','funding_resolution']){
 const both=render({campaignRulesVersion:1,fundingCovenantVersion:1,endReason,winnerId:null,failedId:null});
 assert(both.headline.includes('BOTH INSTITUTIONS FAILED'));assert(!both.headline.includes('DEAD HEAT'));
 assert(both.note.includes('No free assets or franchise are transferred'));
}
const old=render();assert.equal(old.headline,'Cedar Bank WAS PLACED INTO RECEIVERSHIP. Harbor Bank ASSUMED THE FRANCHISE.');
assert.equal(old.note,'Receivership ends a campaign immediately: 3 consecutive cycles below a 2% capital ratio.');
assert.equal(render({winnerId:null,failedId:null}).headline,'BOTH INSTITUTIONS FAILED. THE REGULATOR CLOSED THE MARKET.');
assert.equal(render({endReason:'hostile_buyout'}).headline,'Harbor Bank WINS THE MARKET WAR.');
assert.equal(render({endReason:'hostile_buyout',winnerId:null}).headline,'THE CAMPAIGN ENDS IN A DEAD HEAT.');
render({campaignRulesVersion:1,rematchReady:true});assert(node('#rematchBtn').disabled);assert.equal(node('#rematchStatus').textContent,'Waiting for rival authorization.');
render({campaignRulesVersion:1,rivalRematchReady:true});assert(!node('#rematchBtn').disabled);assert.equal(node('#rematchStatus').textContent,'Rival requested a rematch.');
console.log('PASS final-result copy: pilot no-free-transfer receivership, funding covenant, both failures, both viewpoints, legacy text and rematch controls. Synthetic display cases; actual terminal import/rematch tested separately in browser.');
