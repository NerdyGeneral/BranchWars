'use strict';
// A card program must never trap a bank whose capital falls below the 8% reserve.
// Such a program pauses at settlement instead of charging, so its running costs
// are not a plan commitment, and the AI never stages a launch it cannot pay for.
// A cash loss through delta() stands in for a costly executive decision.
if(!process.argv.includes('--portable')&&!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html,c={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={capitalRatio,riskAssets,pilotSpendingLimit,delta,validatePlan,'),c);
const E=c.BWEngine,C=E.PartnerCards,copy=x=>JSON.parse(JSON.stringify(x));
const FLAGS={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true,currentDigitalCommercial:true,currentPartnerCards:true,currentCardEconomics:true};
function create(mode,bank,seed){
 const g=E.createGame({...E.previewCampaignEdition({},'expanded',{...FLAGS,currentBankCards:bank}).options,mode,seed,scenario:'balanced',created:1,startingWorkforce:'covered'});
 for(const p of g.players)for(const key of ['digitalArchitecture','relationshipPlanning'])p.digitalCommercial.nodes[key]={funded:E.DigitalCommercial.NODES[key].cost,completed:1};
 return g;
}
// Take the bank to a 7% capital ratio with a balanced cash loss.
function belowReserve(p){const loss=Math.ceil(p.stats.capital-E.riskAssets(p)*.07);E.delta(p,'cash',-loss);assert(E.capitalRatio(p)<8);assert.equal(E.pilotSpendingLimit(p),0);}
const valid=(g,i,plan)=>E.validatePlan(copy(g),copy(g.players[i]),copy(plan));
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}

test('a human whose running program outlives the reserve can still submit; the program pauses',()=>{
 const g=create('hotseat',false,'card-reserve-human'),p=()=>g.players[0];
 assert.equal(g.version,'9.39');
 const month=cardPolicy=>{const plans=g.players.map((_,i)=>E.chooseBot(g,i));plans[0].cardPolicy=cardPolicy;plans[1].cardPolicy={...C.defaults(g.players[1]),action:'none',intake:false,marketing:0};E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);};
 month({action:'launch',intake:false,marketing:0});month({action:'none',intake:true,marketing:0});month({action:'none',intake:true,marketing:0});
 assert.equal(p().cardProgram.status,'active');assert(p().cardProgram.accounts.length>0);
 belowReserve(p());
 const plan=E.chooseBot(g,0);plan.cardPolicy={action:'none',intake:true,marketing:0};
 const q=C.quote(g,p(),plan);assert.equal(q.pauses,true);assert.equal(q.cost,0);assert.equal(C.commitment(p(),plan),0);
 valid(g,0,plan);
 const plans=[plan,E.chooseBot(g,1)];plans[1].cardPolicy={...C.defaults(g.players[1]),action:'none',intake:false,marketing:0};
 const before=copy(p().cardProgram.totals);E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);
 const r=p().cardProgram.history.at(-1);
 assert.equal(r.suspended,true);assert.equal(r.costs,0);assert.equal(p().cardProgram.totals.costs,before.costs,'A paused program is not charged');
 E.validatePilot(g);E.validateLedger(g);
});

test('in AI mode a card-running AI below the reserve plans legally and the human month resolves',()=>{
 const g=create('ai',true,'card-reserve-ai'),ai=()=>g.players[1];
 assert.equal(g.version,'9.40');
 for(let m=0;m<3;m++){const plan=E.chooseBot(g,0);plan.cardPolicy={...C.defaults(g.players[0]),action:'none',intake:false,marketing:0};E.submit(g,0,plan);}
 assert(['active','paused'].includes(ai().cardProgram.status),'The AI launched its own program: '+ai().cardProgram.status);
 belowReserve(ai());
 const aiPlan=E.chooseBot(g,1);valid(g,1,aiPlan);
 const cycle=g.cycle,human=E.chooseBot(g,0);human.cardPolicy={...C.defaults(g.players[0]),action:'none',intake:false,marketing:0};
 E.submit(g,0,human);assert.equal(g.cycle,cycle+1,'The human submission resolved the month');
 E.validatePilot(g);E.validateLedger(g);
});

test('the AI does not stage a launch the reserve would reject',()=>{
 for(const bank of [false,true]){
  const g=create('hotseat',bank,'card-reserve-launch'),p=g.players[1];
  assert.equal(C.bot(g,1,{}).cardPolicy.action,'launch','With room, the AI launches');
  belowReserve(p);
  const plan=C.bot(g,1,{});assert.equal(plan.cardPolicy.action,'none');assert.equal(C.commitment(p,plan),0);
 }
});

console.log('Card capital reserve passed: '+checks+' checks on paused running costs, AI-mode submission and AI launch affordability.');
