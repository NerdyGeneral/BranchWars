'use strict';
// Execute the portable batch parser, mocking only address discovery and the
// external browser launch. Never open windows or touch browser associations.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
if(process.platform!=='win32'){console.log('Portable Windows launcher execution not run on this platform.');process.exit(0);}
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'branch wars portable launcher '));
const launcher=path.join(folder,'OPEN_BRANCH_WARS.bat'),stub=path.join(folder,'powershell.cmd');
try{
 const source=fs.readFileSync(path.join(__dirname,'../OPEN_BRANCH_WARS.bat'),'utf8');
 assert(source.includes('start "" "%GAMEURL%"'),'Expected generated URL launch path');
 fs.writeFileSync(launcher,source.replace(/^\s*start "" /gm,'echo OPEN_URL '));
 fs.writeFileSync(stub,'@echo off\r\nif "%AUDIT_CASE%"=="no-address" exit /b 0\r\nif not defined GAMEFILE (echo 192.0.2.10& exit /b 0)\r\nif "%AUDIT_CASE%"=="uri-failure" exit /b 0\r\necho file:///C:/fixture/Bank%%20Name/BRANCH_WARS.html#lanip=192.0.2.10\r\n');
 for(const test of ['normal','no-address','uri-failure']){
  const env={...process.env,AUDIT_CASE:test};delete env.GAMEURL;delete env.GAMEFILE;delete env.LANIP;
  const result=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c','""'+launcher+'""'],{cwd:os.tmpdir(),env,encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true});
  assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const opened=result.stdout.split(/\r?\n/).filter(line=>line.startsWith('OPEN_URL '));
  assert.equal(opened.length,1,'Exactly one browser launch for '+test+': '+result.stdout);
  const expected=test==='normal'?'file:///C:/fixture/Bank%20Name/BRANCH_WARS.html#lanip=192.0.2.10':path.join(folder,'BRANCH_WARS.html');
  assert.equal(opened[0],'OPEN_URL "'+expected+'"','Resolved URL must be read after assignment: '+test);
 }
 console.log('Portable launcher PASS: Windows batch expansion, encoded spaced URL, missing address/URL fallback, unrelated working directory and one launch. Browser associations remain a manual acceptance check.');
}finally{
 for(const file of [launcher,stub])if(fs.existsSync(file))fs.unlinkSync(file);
 fs.rmdirSync(folder);
}
