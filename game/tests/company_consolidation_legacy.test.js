'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const consolidation=process.argv.includes('--consolidation');
const bytes=fs.readFileSync(require('node:path').join(__dirname,consolidation?'../output/BRANCH_WARS_consolidation43_review.html':'../output/BRANCH_WARS_control42_review.html'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),consolidation?'00c37a32ea5c092fc8abbdc1b2ae97aca6edd4614c04ef55f21ff5ea4986226f':'de6c18ffa3f515ee1b038b8c93dcb45c8ec8df083d6f147b55a72667bf351ffd','The preserved control build must not change.');
function load(html){const math=Object.create(Math);math.random=()=>.375;const c={Math:math,Date:class extends Date{static now(){return 123456;}}};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const engines=[load(bytes.toString()),load(require('../tools/build_game').assemble().html)],copy=x=>JSON.parse(JSON.stringify(x));
for(const scenario of ['balanced','rate','regulatory','growth']){
 const config={...engines[0].previewCampaignEdition({},'expanded').options,companyControlVersion:1,...(consolidation?{companyConsolidationVersion:1}:{}),scenario,seed:5,created:1,mode:'hotseat'};
 const games=engines.map(E=>{const g=E.createGame(config);for(const p of g.players)p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholders','external-test-shareholder',{cash:3000000,equity:3000000});return g;});
 assert.deepEqual(copy(games[1]),copy(games[0]),scenario+' creation');
 for(let month=1;month<=3;month++){
  const plans=engines.map((E,i)=>games[i].players.map((p,seat)=>{const plan={...E.chooseBot(games[i],seat),companyControlPolicy:E.defaultCompanyControlPlan(p),companyShareOrders:[],investmentPolicy:E.defaultInvestmentPlan(p),investments:{},newProjects:[],newProject:null};plan.groupPolicy.bankSupport=0;plan.groupPolicy.bankDividend=0;
   if(seat===0&&month===1)plan.companyControlPolicy.diligence='company:0';
   if(seat===0&&month===2)plan.companyControlPolicy.offer={issuer:'company:0',shares:50001,priceCents:Math.ceil(E.companyControlCompany(games[i],'company:0').referenceCents*1.5),borrow:0};return plan;}));
  assert.deepEqual(copy(plans[1]),copy(plans[0]),scenario+' human/AI plans');
  for(const [i,E]of engines.entries()){E.submit(games[i],0,plans[i][0]);games[i]=E.migrateCampaign(copy(games[i]));}
  assert.deepEqual(copy(games[1]),copy(games[0]),scenario+' half-ready restore');
  for(const [i,E]of engines.entries())E.submit(games[i],1,plans[i][1]);
  assert.deepEqual(copy(games[1]),copy(games[0]),scenario+' settlement/RNG');
  for(const seat of [0,1])assert.deepEqual(copy(engines[1].publicState(games[1],seat)),copy(engines[0].publicState(games[0],seat)),scenario+' owner views');
 }
 assert.equal(games[1].players[0].companyControl.deals[0].status,'closed');
 for(const [i,E]of engines.entries()){games[i].gameOver=true;E.rematch(games[i],0);E.rematch(games[i],1);}
 assert.deepEqual(copy(games[1]),copy(games[0]),scenario+' rematch');console.log('PASS exact immutable '+(consolidation?'9.25':'9.24')+' '+scenario+' creation, paid acquisition, human/AI, RNG, restore, views and rematch');
}
