'use strict';
// Manual QA: ordinary submitted choices only. Never inject resources, office
// records, specialist/leader identities, campaign rules or participant flags.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const hash=x=>createHash('sha256').update(x).digest('hex');
function loadEngine(){
  const html=require('./build_game.js').assemble().html;
  const source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
  vm.runInNewContext(source,context,{filename:'institution-qa-engine.js'});
  return {E:context.BWEngine,htmlHash:hash(html),engineHash:hash(source)};
}
function createCampaign(E,scenario='balanced',seed='institution-playtest'){
  const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
  const g=E.createGame({...options,mode:'hotseat',scenario,seed,created:1});
  assert.equal(g.version,'9.3');assert.equal(g.financialGroupVersion,4);return g;
}
function validate(E,g,purity=false){
  E.validatePilot(g);E.validateLedger(g);
  const before=purity?hash(JSON.stringify(g)):null;
  for(const seat of [0,1]){
    const v=E.publicState(g,seat);E.validateFinancialGroupView(v);E.validateAgencyView(v);
    assert.equal(v.me.id,g.players[seat].id);
    assert(v.me.facilityNetwork&&v.me.departmentOffice);
    assert.equal(v.rival.facilityNetwork,undefined);assert.equal(v.rival.departmentOffice,undefined);
    assert.equal(v.rival.agency,undefined);assert.equal(v.departmentEconomy,undefined);
    const other=v.lastPlans?.[v.rival.id];
    for(const key of ['leaderOrders','departmentPolicy','facilityPolicy'])assert.equal(other?.[key],undefined);
  }
  if(purity)assert.equal(hash(JSON.stringify(g)),before,'View/validation must not mutate the campaign.');
}
function metrics(E,g){
  const deposits=g.players.reduce((n,p)=>n+p.stats.deposits,0);
  return {cycle:g.cycle,terminal:!!g.gameOver,terminalReason:g.gameOver||null,
    players:g.players.map(p=>({id:p.id,cash:p.stats.cash,capital:p.stats.capital,
      capitalRatio:E.capitalRatio(p),deposits:p.stats.deposits,depositShare:deposits?p.stats.deposits/deposits:0,
      lastProfit:p.stats.lastProfit,staff:p.stats.staff,
      offices:p.facilityNetwork.offices.filter(o=>o.closedCycle===null).length,
      conversions:p.facilityNetwork.offices.reduce((n,o)=>n+o.conversions,0),
      activeConversions:p.facilityNetwork.offices.filter(o=>o.conversion).length,
      leaders:Object.values(p.departmentOffice.leaders).filter(Boolean).length,
      leadershipPaid:p.departmentOffice.paid,leadershipArrears:Object.values(p.departmentOffice.arrears).reduce((n,x)=>n+x,0),
      specialists:Object.values(p.workforce.departments).reduce((n,d)=>n+d.count,0),
      agencyStatus:p.agency.status,agencyFailures:p.agency.failures}))};
}
function rejectCredentials(value){
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
    assert(!/^(authorization|password|githubToken|accessToken|refreshToken|sessionStorage|localStorage|gh|lan|p2pConfig)$/i.test(key),'Credential or transport field in QA save: '+key);
    rejectCredentials(child);
  }
}
function generate({inspect=false,output='institution-playtest.json'}={}){
  const {E,htmlHash,engineHash}=loadEngine(),g=createCampaign(E),flags=g.players.map(p=>p.isBot),orders=[];
  validate(E,g,true);
  // Deliberately prioritize a service-development programme over new research
  // and other projects for this three-month illustrative human strategy.
  while(g.cycle<=6&&!g.gameOver){
    const plans=g.players.map((p,i)=>E.chooseBot(g,i)),p=g.players[0],plan=plans[0];
    plan.newProject=null;plan.newProjects=[];plan.investments={};plan.hires=0;
    plan.specialistHires=E.emptySpecialistOrders();
    if(p.workforce.departments.service.count<2)plan.specialistHires.service=2-p.workforce.departments.service.count;
    plan.allocation={service:3,business:2,lending:Math.max(0,p.stats.staff-6),operations:1};
    plan.departmentPolicy=copy(p.departmentOffice.policy);plan.leaderOrders=E.defaultDepartmentPlan(p).leaderOrders;
    if(p.workforce.departments.service.count>=2&&!p.departmentOffice.leaders.service)plan.leaderOrders.service='mentor';
    plan.workforcePolicy=copy(p.workforce.policy);plan.workforcePolicy.training.service=E.WORKFORCE_TRAINING_BUDGETS.find(n=>n>=12000);
    plan.facilityPolicy=E.defaultFacilityPolicy(p);
    const office=p.facilityNetwork.offices.find(o=>o.closedCycle===null&&o.conversions===0&&!o.conversion);
    if(g.cycle===1&&office)plan.facilityPolicy={convert:{officeId:office.id,model:office.model==='digital'?'retail':'digital'},cancel:null};
    E.normalizeDepartmentPlan(p,plan);E.normalizeWorkforcePlan(p,plan);
    assert(E.facilityInstructionQuote(E.publicState(g,0),p,plan).status.eligible);
    orders.push({cycle:g.cycle,specialistHires:copy(plan.specialistHires),leaderOrders:copy(plan.leaderOrders),facilityPolicy:copy(plan.facilityPolicy)});
    E.submit(g,0,plan);E.submit(g,1,plans[1]);validate(E,g,true);
    if(p.departmentOffice.leaders.service&&p.facilityNetwork.offices.some(o=>o.conversions>0))break;
  }
  const owner=g.players[0];
  assert(owner.departmentOffice.leaders.service,'An ordinarily hired specialist must be promoted through a paid order.');
  assert(owner.departmentOffice.paid>0);assert(owner.workforce.departments.service.count>=2);
  assert(owner.facilityNetwork.offices.some(o=>o.conversions>0),'Normal paid conversion must activate.');
  assert(g.players.every(p=>!p.submitted));assert.deepEqual(g.players.map(p=>p.isBot),flags);assert.equal(g.mode,'hotseat');
  const imported=copy(E.migrateCampaign(copy(g))),expected=copy(g);
  for(const p of expected.players)delete p.strategy;
  assert.equal(hash(JSON.stringify(imported)),hash(JSON.stringify(expected)),'Import permits only established obsolete-strategy cleanup.');
  validate(E,imported,true);rejectCredentials(g);
  if(inspect)return {game:g,htmlHash,engineHash,orders};
  assert(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(output),'Output must be a JSON filename inside reports/qa, not a path.');
  const directory=path.resolve(root,'reports','qa'),file=path.resolve(directory,output),bytes=Buffer.from(JSON.stringify(g,null,2)+'\n');
  assert.equal(path.dirname(file),directory,'Resolved output must remain in the QA artifact directory.');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if(fs.existsSync(file))assert(fs.readFileSync(file).equals(bytes),'Preserve the different existing fixture before regenerating.');
  else fs.writeFileSync(file,bytes,{flag:'wx'});
  console.log(JSON.stringify({file,sha256:hash(bytes),bytes:bytes.length,htmlHash,engineHash,orders,...metrics(E,g),
    evidence:'Ordinary submitted human-style choices; no gifts, synthetic accounts, ownership injection or participant rewrites. This fixture is not an AI competence or multiplayer playtest claim.'},null,2));
}
module.exports={loadEngine,createCampaign,validate,metrics,hash,generate};
if(require.main===module){const output=process.argv.find(x=>x.startsWith('--output='))?.slice(9);generate(output?{output}:{});}
