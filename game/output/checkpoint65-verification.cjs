'use strict';
// One-shot exact-source integration record. Never replaces the normal playable.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),rel=p=>path.relative(root,p).replaceAll('\\','/'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
process.chdir(root);
const artifact='output/BRANCH_WARS_expanded65_review.html',reportFile='output/master-checkpoint65-verification.json';
if(fs.existsSync(artifact)||fs.existsSync(reportFile))throw Error('Preserve earlier artifacts: use a new checkpoint path.');
const assembled=require('../tools/build_game').assemble(),source=()=>assembled.files.map(p=>({path:rel(p),sha256:hash(fs.readFileSync(p))}));
const testFiles=fs.readdirSync('tests').filter(f=>f.endsWith('.js')).sort(),testHashes=()=>testFiles.map(f=>({path:'tests/'+f,sha256:hash(fs.readFileSync('tests/'+f))}));
const normalBefore=hash(fs.readFileSync('BRANCH_WARS.html'));
fs.writeFileSync(artifact,assembled.html);
const report={created:new Date().toISOString(),scope:'Ordinary Expanded 9.28 setup and existing subsystem integration; not a final release or long-run balance certification',artifact,sha256:hash(assembled.html),inputs:source(),tests:testHashes(),normalBefore,status:'running',initialObservations:[
 {scope:'Initial seven-file targeted run',tests:29,passed:28,failed:1,issue:'Domain-only bank-credit fixture expected not enabled; current campaign validator correctly rejects it as Unversioned named-company credit. Exact rejection assertion updated; no validator weakened.'},
 {scope:'New unsupported-peer test',issue:'Direct relay validator threw the expected unsupported-rules error before snapshot adoption. Test now explicitly asserts that rejection; production transports already catch and display it.'}
],checks:[]};
const save=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');save();
function run(args){return new Promise(resolve=>{const start=Date.now(),p=spawn(process.execPath,args,{cwd:root,windowsHide:true});let stdout='',stderr='';p.stdout.on('data',d=>stdout+=d);p.stderr.on('data',d=>stderr+=d);p.on('error',e=>stderr+=e.stack);p.on('close',code=>{report.checks.push({args,code,elapsedMs:Date.now()-start,stdout,stderr});save();console.log(JSON.stringify({args,code,elapsedMs:Date.now()-start}));resolve(code);});});}
(async()=>{
 const affected=testFiles.filter(f=>f.endsWith('.test.js')&&!f.includes('network')&&f!=='commercial_accounts_balance.test.js'&&fs.readFileSync('tests/'+f,'utf8').includes('previewCampaignEdition')).map(f=>'tests/'+f);
 await run(['--test','--test-concurrency=2',...affected]);
 for(const args of [['tests/expanded_edition_network.test.js'],['tests/company_credit_network.test.js'],['tests/shared_premises_network.test.js'],['tests/company_control_network.test.js'],['tests/company_shares_network.test.js'],['tests/architecture.test.js','--source'],['tests/docs.test.js']])await run(args);
 report.sourceUnchanged=JSON.stringify(source())===JSON.stringify(report.inputs);report.testsUnchanged=JSON.stringify(testHashes())===JSON.stringify(report.tests);report.normalUnchanged=hash(fs.readFileSync('BRANCH_WARS.html'))===normalBefore;
 report.status=report.checks.every(c=>c.code===0)&&report.sourceUnchanged&&report.testsUnchanged&&report.normalUnchanged?'passed':'failed';report.finished=new Date().toISOString();save();console.log(JSON.stringify({status:report.status,artifact,reportFile}));process.exitCode=report.status==='passed'?0:1;
})().catch(e=>{report.status='error';report.error=e.stack;save();console.error(e);process.exitCode=1;});
