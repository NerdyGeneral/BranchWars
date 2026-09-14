'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {testTimeout,createEvidence,fingerprintFiles}=require('../tools/gate_evidence');
function temporary(fn){
 const base=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(base,'branch-wars-gate-test-'));
 try{return fn(dir);}finally{
  assert.equal(path.dirname(fs.realpathSync(dir)),base);
  assert(path.basename(dir).startsWith('branch-wars-gate-test-'));
  fs.rmSync(dir,{recursive:true});
 }
}
test('gate timeout accommodates measured long tests but remains explicitly bounded',()=>{
 assert.equal(testTimeout({}),1800000);assert(testTimeout({})>994969);
 for(const value of ['60000','3600000','7200000'])assert.equal(testTimeout({BRANCH_WARS_TEST_TIMEOUT_MS:value}),Number(value));
 for(const value of ['','0','-1','59999','7200001','Infinity','1e6','1.5',' 60000'])assert.throws(()=>testTimeout({BRANCH_WARS_TEST_TIMEOUT_MS:value}),/integer/);
});
test('gate receipts retain commands and failed output, without inventing a terminal result',()=>temporary(dir=>{
 const e=createEvidence(dir,'test',{source:'fixed'});
 e.append('command-started',{command:['test.js']});fs.writeSync(e.logFd,'failure details\n');
 e.append('command-finished',{exitCode:1,error:'test failed'});
 assert(!fs.existsSync(e.summary),'Active or interrupted work is not given a final summary');
 const rows=fs.readFileSync(e.events,'utf8').trim().split('\n').map(JSON.parse);
 assert.deepEqual(rows.map(r=>r.sequence),[1,2,3]);assert.equal(rows[2].exitCode,1);
 e.finish({passed:false,incomplete:true,exitCode:1});
 const result=JSON.parse(fs.readFileSync(e.summary));assert.equal(result.passed,false);assert(result.incomplete);
 assert.equal(fs.readFileSync(result.log,'utf8'),'failure details\n');
 const saved=fs.readFileSync(e.summary,'utf8');e.finish({passed:true});assert.equal(fs.readFileSync(e.summary,'utf8'),saved);
 assert.throws(()=>e.append('later'),/terminal/);
 const next=createEvidence(dir,'test');assert.notEqual(next.summary,e.summary);next.finish({passed:true,incomplete:false});
 assert.equal(fs.readFileSync(e.summary,'utf8'),saved,'New runs never replace old evidence');
}));
test('input fingerprints detect changed bytes, additions and names independent of enumeration order',()=>temporary(dir=>{
 fs.mkdirSync(path.join(dir,'source'));fs.writeFileSync(path.join(dir,'source','a.js'),'original');fs.writeFileSync(path.join(dir,'helper.js'),'helper');
 const initial=fingerprintFiles(dir,['source','helper.js']);assert.equal(initial,fingerprintFiles(dir,['helper.js','source']));
 fs.writeFileSync(path.join(dir,'source','a.js'),'changed');assert.notEqual(initial,fingerprintFiles(dir,['source','helper.js']));
 fs.writeFileSync(path.join(dir,'source','a.js'),'original');assert.equal(initial,fingerprintFiles(dir,['source','helper.js']));
 fs.writeFileSync(path.join(dir,'source','b.js'),'new');assert.notEqual(initial,fingerprintFiles(dir,['source','helper.js']));
}));
test('desktop launcher delegates to the same full gate including current income checks',()=>{
 const root=path.join(__dirname,'..'),launcher=fs.readFileSync(path.join(root,'RUN_TESTS.bat'),'utf8'),runner=fs.readFileSync(path.join(root,'tools','check.js'),'utf8');
 assert.match(launcher,/node tools\\check\.js --full/);assert.doesNotMatch(launcher,/node tests\\(?:capture_baseline|release_balance)/);
 assert.match(runner,/commands\.push\(\['tests\/income_banking_trial\.test\.js'\]\)/);
 assert.match(runner,/commands\.push\(\['tests\/gate_evidence\.test\.js'\]\)/);
});
