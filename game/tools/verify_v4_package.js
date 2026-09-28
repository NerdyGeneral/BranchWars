'use strict';
// Current-source and pinned-archive evidence are deliberately distinct.
// A self-consistent manifest alone proves neither origin nor currentness.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {verifyPackage,README,RUNTIME_FILES}=require('./package_release'),{assemble}=require('./build_game');
const digest=b=>createHash('sha256').update(b).digest('hex');
const copy=v=>JSON.parse(JSON.stringify(v));
const PROFILES=Object.freeze({
 current:{flags:{currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true,currentDigitalCommercial:true,currentPartnerCards:true,currentCardEconomics:true,currentBankCards:true},versions:{core:'8.20',expanded:'9.40'}},
 rc4:{flags:{currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true},versions:{core:'8.20',expanded:'9.33'}},
 rc2:{flags:{currentEconomics:true},versions:{core:'8.19',expanded:'9.32'}},
 rc3:{flags:{currentReporting:true,currentEconomics:true,currentRivalry:true},versions:{core:'8.19',expanded:'9.33'}}
});
function markers(game){
 const of=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key.endsWith('Version')&&key!=='ledgerVersion'));
 return copy({campaign:of(game),owners:game.players.map(of)});
}
function validate(E,game){E.validatePilot(game);E.validateLedger(game);}
function resolve(E,game){
 const plans=[0,1].map(seat=>E.chooseBot(game,seat));
 for(const seat of [0,1])E.submit(game,seat,plans[seat]);
 validate(E,game);
}
function researchRecovery(E,options){
 const game=E.createGame({...options,seed:'research-program',created:1,mode:'hotseat',startingWorkforce:'covered'});
 // Earn a third operating model in the sixth branch using normal paid plans.
 for(let month=0;month<12&&!game.players[0].specializations.risk;month++){
  const plans=[0,1].map(seat=>E.chooseBot(game,seat)),owner=game.players[0];
  Object.assign(plans[0],{newProjects:[],newProject:null,hires:0,competitiveAction:'none',investments:{}});
  const amount=Math.floor(Math.min(E.capabilityNextCost(owner,'risk'),E.CAPABILITY_CAP_PER_CYCLE,E.planBudget(owner,plans[0],game).remaining));
  plans[0].investments=amount>=1000?{risk:amount}:{};
  plans[0].specializations={...owner.specializations,risk:'standing'};
  for(const seat of [0,1])E.submit(game,seat,plans[seat]);
  validate(E,game);
 }
 assert.equal(game.players[0].specializations.risk,'standing','Packaged research model must be earned through legal plans');
 const restored=E.migrateCampaign(copy(game));validate(E,restored);
 assert.equal(restored.version,'8.20');assert.equal(restored.researchProgramVersion,1);
 for(const seat of [0,1]){
  for(const key of ['specializations','capability','stats'])assert.deepEqual(copy(restored.players[seat][key]),copy(game.players[seat][key]),'Research reload changed '+key);
  assert.equal(restored.players[seat].researchProgramVersion,1);
 }
 const plan=E.chooseBot(restored,0);
 plan.specializations={...restored.players[0].specializations,risk:'provisioning'};
 const before=copy(restored);
 assert.throws(()=>E.submit(restored,0,plan),/already operates a permanent model/);
 assert.deepEqual(copy(restored),before,'Rejected permanent-model change mutated the save');
 return {branch:'risk',model:'standing',legalPaidAcquisition:true,reloadPreservesPaidProgress:true,permanentChoiceEnforced:true};
}
function rematchRecovery(E,options,edition){
 const game=E.createGame({...options,seed:'research-program',created:1,mode:'hotseat',startingWorkforce:'covered'});
 if(edition==='expanded'){
  // Bounded funded stress fixture: ordinary covenant settlement ends play.
  // This is not an ordinary-start balance trial or a forced gameOver flag.
  const owner=game.players[0],A=E.AccountingPrototype;
  owner.accounting=A.transact(owner.accounting,'borrow',6000000);
  const investment=owner.accounting.accounts.cash;
  owner.accounting=A.transact(owner.accounting,'buySecurities',investment);
  if(owner.treasury){owner.treasury.liquid+=investment;owner.treasury.openingDebt=6000000;}
  const a=owner.accounting.accounts;
  Object.assign(owner.stats,{cash:a.cash,loans:a.loans,deposits:a.deposits,emergencyDebt:a.emergencyDebt,capital:a.equity,earnings:owner.accounting.retainedEarnings});
  validate(E,game);
 }
 const bound=edition==='core'?240:3;
 for(let month=0;month<bound&&!game.gameOver;month++)resolve(E,game);
 assert.equal(game.gameOver,true,'Packaged rematch fixture must reach an engine-resolved ending');
 if(edition==='expanded')assert.equal(game.endReason,'funding_resolution');
 const restored=E.migrateCampaign(copy(game)),before=markers(restored),version=restored.version,endReason=restored.endReason;
 assert.equal(E.rematch(restored,0),false,'One hotseat vote must not restart play');
 assert.equal(restored.gameOver,true);assert.equal(restored.version,version);
 assert.equal(E.rematch(restored,1),true);
 assert.equal(restored.gameOver,false);assert.equal(restored.cycle,1);assert.equal(restored.version,version);
 assert.deepEqual(markers(restored),before,'Rematch changed saved campaign rules');
 assert.equal(restored.researchProgramVersion,edition==='core'?1:undefined);
 for(const owner of restored.players){
  assert.equal(owner.researchProgramVersion,edition==='core'?1:undefined);
  assert.equal(E.researchBranches(owner).includes('risk'),edition==='core');
  assert(Object.values(owner.capability).every(amount=>amount===0),'Rematch must reset paid research');
  assert.deepEqual(copy(owner.specializations),{},'Rematch must reset earned models');
  if(owner.expandedBusinessVersion===1)assert.equal(owner.expandedBusiness.digital.route,'none','Rematch must reset paid digital platforms');
 }
 validate(E,restored);
 const reloaded=E.migrateCampaign(copy(restored));assert.equal(reloaded.version,version);
 assert.deepEqual(markers(reloaded),before);
 return {rulesPreserved:true,paidResearchReset:true,twoVotesRequired:true,fixture:edition==='core'?'natural-bot-ending':'funded-covenant-stress',endReason};
}
function verify(directory,zip,{profile='current',release=null,expectedHtmlSha256}={}){
 assert(Object.hasOwn(PROFILES,profile),'Unknown package profile');
 assert(release===null||(typeof release==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(release)),'Invalid release label');
 const current=profile==='current',selected=PROFILES[profile];
 if(current)assert.equal(expectedHtmlSha256,undefined,'Current profile must compare assembled source, not a supplied hash');
 else assert.match(expectedHtmlSha256||'',/^[0-9a-f]{64}$/,'Historical profiles require an explicit expected HTML SHA-256');
 const inventory=verifyPackage(directory,current?{expectedReadme:README}:{}),bytes=fs.readFileSync(path.join(directory,'BRANCH_WARS.html'));
 const expected=current?digest(assemble().html):expectedHtmlSha256;
 assert.equal(digest(bytes),expected,current?'Package differs from current assembled source':'Package differs from pinned historical HTML');
 if(current)for(const name of RUNTIME_FILES.filter(name=>name!=='BRANCH_WARS.html'))
  assert.equal(digest(fs.readFileSync(path.join(directory,name))),digest(fs.readFileSync(path.join(__dirname,'..',name))),'Package runtime file differs from current source: '+name);
 const context={console,Math,Date},match=bytes.toString('utf8').match(/<script id="engine">([\s\S]*?)<\/script>/);
 assert(match,'Package has no engine script');const code=match[1];
 vm.runInNewContext(code,context);const E=context.BWEngine,checks=[];
 for(const edition of ['core','expanded']){
  const options=E.previewCampaignEdition({},edition,selected.flags).options;
  let game=E.createGame({...options,seed:'v4-package-smoke',created:1,mode:'hotseat'});
  assert.equal(game.version,selected.versions[edition],edition+' package profile version');
  if(current)assert.equal(game.expandedBusinessVersion,edition==='expanded'?1:undefined,'Current package must select the intended consolidated business rules');
  const plans=[0,1].map(seat=>E.chooseBot(game,seat));
  E.submit(game,0,plans[0]);const half=copy(game),resumed=E.migrateCampaign(copy(half));
  assert.deepEqual(copy(E.migrateCampaign(copy(resumed))),copy(resumed),'Repeated recovery drift');
  // Canonicalize both paths: historical migration has legitimate normalization.
  game=E.migrateCampaign(copy(game));E.submit(game,1,plans[1]);E.submit(resumed,1,plans[1]);
  assert.deepEqual(copy(resumed),copy(game),'Half-ready recovery changed resolved outcome');
  assert.equal(game.cycle,half.cycle+1);validate(E,game);
  for(const seat of [0,1]){
   const view=E.publicState(resumed,seat);
   assert.deepEqual(copy(view),copy(E.publicState(game,seat)));
   // Earned operating models are intentionally public; plans, paid capability
   // totals and income history are private in the existing projection contract.
   for(const key of ['capability','allocation','projects','policies','submittedPlan','incomeHistory','expandedBusiness','brandCampaigns','pendingBrandCampaignPolicy','pendingHoldingCapitalOrders'])assert.equal(view.rival[key],undefined,'Rival leaks private '+key);
  }
  const check={edition,version:game.version,creation:true,halfReadyRecovery:true,resolvedMonth:true,idempotentRecovery:true,ownerViewsMatch:true,rivalPrivateFieldsAbsent:true};
  if(current){
   if(edition==='core')check.research=researchRecovery(E,options);
   check.rematch=rematchRecovery(E,options,edition);
  }
  checks.push(check);
 }
 return {status:'passed',scope:'Exact extracted package smoke check; not full release certification',
  verification:current?'current-source-and-runtime':'pinned-archive-and-runtime',profile,
  package:path.basename(zip),release,sha256:digest(fs.readFileSync(zip)),archiveContentVerified:false,
  manifestIntegrity:true,sourceCompared:current,sourceMatches:current?true:null,runtimeFilesCompared:current,expectedReadmeVerified:current,
  pinnedHtmlSha256:current?null:expectedHtmlSha256,htmlSha256:inventory.portableSha256,engineSha256:digest(code),
  files:JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8')).files,
  extractedInventory:true,checks,limitations:['This smoke check does not execute or certify the complete Windows release gate.',
   'ZIP hash recorded only; extraction and ZIP-entry comparison must be checked separately.',
   'A supplied historical hash pins caller-selected bytes; it does not establish publisher authenticity.',
   'Research/rematch checks are bounded functional fixtures, not long-run strategic balance evidence.',
   'No visual or physical two-computer acceptance claimed.']};
}
function main(args){
 const [directory,zip,report,...flags]=args,options={},seen=new Set();
 assert([directory,zip,report].every(p=>p&&path.isAbsolute(p)),'Provide absolute extracted directory, ZIP and new report paths.');
 for(let i=0;i<flags.length;i+=2){
  const flag=flags[i],value=flags[i+1],key={'--profile':'profile','--release':'release','--expected-html-sha256':'expectedHtmlSha256'}[flag];
  assert(key&&value&&!seen.has(flag),'Use unique --profile current|rc2|rc3|rc4, --release LABEL, --expected-html-sha256 HASH options.');
  seen.add(flag);options[key]=value;
 }
 const result=verify(directory,zip,options);
 fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(result,null,2));
}
if(require.main===module){try{main(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={verify};
