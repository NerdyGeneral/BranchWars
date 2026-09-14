'use strict';
// Verify an explicitly extracted player package, without adopting any saved game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {verifyPackage}=require('./package_release'),{assemble}=require('./build_game');
const digest=b=>createHash('sha256').update(b).digest('hex');
const copy=v=>JSON.parse(JSON.stringify(v));
function verify(directory,zip){
 const inventory=verifyPackage(directory),bytes=fs.readFileSync(path.join(directory,'BRANCH_WARS.html'));
 assert.equal(digest(bytes),digest(assemble().html),'Package differs from current source');
 const context={console,Math,Date};
 const code=bytes.toString('utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
 vm.runInNewContext(code,context);const E=context.BWEngine,checks=[];
 for(const edition of ['core','expanded']){
  const options=E.previewCampaignEdition({},edition,{currentEconomics:true}).options;
  let game=E.createGame({...options,seed:'v4-rc2-package',created:1,mode:'hotseat'});
  assert.equal(game.version,edition==='core'?'8.19':'9.32');
  const plans=[0,1].map(seat=>E.chooseBot(game,seat));
  E.submit(game,0,plans[0]);const half=copy(game),resumed=E.migrateCampaign(copy(half));
  assert.deepEqual(copy(E.migrateCampaign(copy(resumed))),copy(resumed),'Repeated recovery drift');
  // Canonicalize both paths: historical migration has legitimate normalization.
  game=E.migrateCampaign(copy(game));E.submit(game,1,plans[1]);E.submit(resumed,1,plans[1]);
  assert.deepEqual(copy(resumed),copy(game),'Half-ready recovery changed resolved outcome');
  assert.equal(game.cycle,half.cycle+1);E.validatePilot(game);E.validateLedger(game);
  for(const seat of [0,1])assert.deepEqual(copy(E.publicState(resumed,seat)),copy(E.publicState(game,seat)));
  checks.push({edition,version:game.version,creation:true,halfReadyRecovery:true,resolvedMonth:true,idempotentRecovery:true});
 }
 return {status:'passed',scope:'Exact extracted package smoke check; not full release certification',
  package:'branch-wars-v4.zip',release:'v4.0.0-rc2',sha256:digest(fs.readFileSync(zip)),
  htmlSha256:inventory.portableSha256,engineSha256:digest(code),
  files:JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8')).files,
  extractedInventory:true,checks,limitations:['Final complete Windows gate not certified.',
   'Conventional lending balance remains open.','No visual or physical two-computer acceptance claimed.']};
}
if(require.main===module){
 const [directory,zip,report]=process.argv.slice(2);
 if(![directory,zip,report].every(p=>p&&path.isAbsolute(p)))throw Error('Provide absolute extracted directory, ZIP and new report paths.');
 const result=verify(directory,zip);
 fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(result,null,2));
}
module.exports={verify};
