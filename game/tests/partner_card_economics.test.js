'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html,c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,C=E.PartnerCards,copy=x=>JSON.parse(JSON.stringify(x)),flags={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true,currentDigitalCommercial:true,currentPartnerCards:true};
const create=(modern=true)=>E.createGame({...E.previewCampaignEdition({},'expanded',{...flags,currentCardEconomics:modern}).options,mode:'hotseat',seed:'card-economics',created:1,startingWorkforce:'covered'});
function fixture(){const g=create();for(const p of g.players){for(const k of ['digitalArchitecture','relationshipPlanning'])p.digitalCommercial.nodes[k]={funded:E.DigitalCommercial.NODES[k].cost,completed:1};p._departmentFunctionExecution={rows:['technology','risk'].map(id=>({id,workload:4,delivered:{served:4}}))};}return g;}
function step(g,policy){C.settle(g,[{cardPolicy:policy},{cardPolicy:{action:'none',intake:false,marketing:0}}]);g.cycle++;C.validate(g,'game');}
const launch={action:'launch',intake:false,marketing:0};
test('9.39 is explicit and historical card contracts keep their rates',()=>{
 const g=create(),old=create(false);assert.equal(g.version,'9.39');assert.equal(old.version,'9.38');assert.equal(g.cardEconomicsVersion,1);assert.equal(C.rules(old.players[0]).setup,25000);assert.equal(C.rules(g.players[0]).setup,2500);assert.equal(old.players[0].cardProgram.totals,undefined);assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));
 assert.throws(()=>E.createGame({cardEconomicsVersion:1}),/requires|rule|version|feature/i);
 const v=E.publicState(g,0);assert.equal(v.me.cardEconomicsVersion,1);assert.equal(v.rival.cardEconomicsVersion,undefined);assert.equal(v.rival.cardProgram,undefined);C.validate(v,'view');
 const bad=copy(v);bad.me.cardEconomicsVersion=undefined;assert.throws(()=>C.validate(bad,'view'));
 const caps=E.campaignCapabilities(),rules=E.campaignRules(g,{context:'game'});assert.equal(E.peerRulesIssue(rules,caps),null);delete caps.cardEconomicsSupported;assert.equal(E.peerRulesIssue(rules,caps).field,'cardEconomicsVersion');assert.equal(E.peerRulesIssue(E.campaignRules(old,{context:'game'}),caps),null);
});
test('quotes and charges agree, budgets use 100-dollar steps and lifetime records survive rolling history',()=>{
 const g=fixture(),p=g.players[0],cash=p.stats.cash;assert.equal(C.commitment(p,{cardPolicy:launch}),2500);step(g,launch);assert.equal(p.stats.cash,cash-2500);assert.equal(g.cardMarket.provider.accounts.cash,2500);assert.equal(p.cardProgram.totals.setup,2500);assert.equal(C.workload(p),.1);
 for(const value of [1,50,1100])assert.throws(()=>C.policy(p,{cardPolicy:{action:'none',intake:true,marketing:value}}));assert.equal(C.commitment(p,{cardPolicy:{action:'none',intake:true,marketing:100}}),200);
 const recorded=[];for(let i=0;i<15;i++){step(g,{action:'none',intake:true,marketing:200});recorded.push(copy(p.cardProgram.history.at(-1)));}
 assert.equal(p.cardProgram.history.length,12);for(const key of ['feesPaid','costs','marketing'])assert.equal(p.cardProgram.totals[key],recorded.reduce((n,r)=>n+r[key],0));
 const before=JSON.stringify(g),report=C.performance(p);assert.equal(JSON.stringify(g),before);assert.equal(report.contribution,report.totals.feesPaid-report.totals.setup-report.totals.costs-report.totals.marketing);assert.equal(report.operating,p.cardProgram.history.at(-1).contribution);
 for(const corrupt of [x=>delete x.players[0].cardProgram.totals,x=>x.players[0].cardProgram.totals.setup++,x=>x.players[0].cardProgram.totals.costs=0,x=>x.players[0].cardProgram.totals.extra=1]){const x=copy(g);corrupt(x);assert.throws(()=>C.validate(x,'game'));}
});
test('bounded full-capacity fixtures allow sensible payback and continued overspending can lose',()=>{
 const results={};for(const strategy of ['conservative','aggressive','wasteful']){const g=fixture(),p=g.players[0];step(g,launch);for(let m=2;m<=36;m++){const live=p.cardProgram.accounts.filter(a=>!a.closed&&!a.chargedOff).length;step(g,{action:'none',intake:true,marketing:strategy==='wasteful'||strategy==='aggressive'&&live<30?1000:0});}results[strategy]=C.performance(p).contribution;}
 assert(results.conservative>0,JSON.stringify(results));assert(results.aggressive>0,JSON.stringify(results));assert(results.wasteful<0,JSON.stringify(results));assert(results.aggressive>results.wasteful);console.log(JSON.stringify({kernelContributions:results,scope:'Explicit capability/full-delivery fixtures; shared payroll and research excluded.'}));
});
test('no delivery and marketing with no acquisitions explain losses without inventing payback',()=>{
 const g=fixture(),p=g.players[0];step(g,launch);for(const row of p._departmentFunctionExecution.rows)row.delivered.served=0;step(g,{action:'none',intake:true,marketing:1000});const report=C.performance(p);assert.equal(report.unconvertedMarketing,true);assert.equal(report.operating,-1100);assert.equal(report.paybackMonths,null);assert.equal(report.unrecovered,3600);assert.equal(report.live,0);
 const old=create(false);assert.equal(C.performance(old.players[0]),null);
});
