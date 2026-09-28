'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const {balancedPartitions}=require('../tools/gate_shards');
const root=path.resolve(__dirname,'..'),runner=path.join(root,'tools/check.js');
const workflow=fs.readFileSync(path.join(root,'../.github/workflows/checks.yml'),'utf8');
function list(...args){
 const r=spawnSync(process.execPath,[runner,...args,'--list'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);return r.stdout.trim().split('\n').slice(0,-1);
}
function bag(values){const counts=new Map();for(const value of values)counts.set(value,(counts.get(value)||0)+1);return [...counts].sort(([a],[b])=>a.localeCompare(b));}

test('CI partitions cover the complete gate exactly once except shared build checks',()=>{
 const all=list(),build=all[0],shards=JSON.parse(workflow.match(/shard: (\[[^\n]+\])/)[1]),parts=JSON.parse(workflow.match(/part: (\[[^\n]+\])/)[1]);
 assert.deepEqual(shards,[1,2,3,4,6,7,8]);assert.deepEqual(parts,[1,2,3]);
 assert.match(workflow,/run: node game\/tools\/check\.js --shard=\$\{\{ matrix\.shard \}\}\/8/);
 assert.match(workflow,/run: node game\/tools\/check\.js --shard=5\/8 --partition=\$\{\{ matrix\.part \}\}\/3/);
 const jobs=shards.map(n=>list('--shard='+n+'/8')).concat(parts.map(n=>list('--shard=5/8','--partition='+n+'/3')));
 for(const job of jobs){assert.equal(job[0],build);assert(job.length>1);}
 assert.deepEqual(bag(jobs.flatMap(job=>job.slice(1))),bag(all.slice(1)),'No skipped or duplicated test/argument combinations');
 const original=list('--shard=5/8');assert.deepEqual(bag(jobs.slice(shards.length).flatMap(job=>job.slice(1))),bag(original.slice(1)));
 for(const job of jobs.slice(shards.length))assert.deepEqual(job.slice(1),original.filter(command=>job.slice(1).includes(command)),'Original execution order within each part');
 const staffing=jobs.slice(shards.length).find(job=>job.includes('tests/integrated_staffing.test.js'));
 assert.deepEqual(staffing,[build,'tests/integrated_staffing.test.js'],'Longest measured command runs without other tests queued behind it');
});

test('timing hints never drop new, duplicate or unmeasured command occurrences',()=>{
 const commands=[['long'],['medium'],['unknown'],['same','--a'],['same','--b'],['same','--a']];
 const before=JSON.stringify(commands),parts=balancedPartitions(commands,3,{long:100,medium:40,'same --a':NaN,'same --b':-2,obsolete:999},10);
 assert.equal(JSON.stringify(commands),before);
 assert.deepEqual(bag(parts.flatMap(p=>p.commands).map(c=>c.join(' '))),bag(commands.map(c=>c.join(' '))));
 assert.deepEqual(parts,balancedPartitions(commands,3,{long:100,medium:40,'same --a':NaN,'same --b':-2,obsolete:999},10));
 assert.deepEqual(parts.map(p=>p.estimatedSeconds),[100,40,40]);
 assert.throws(()=>balancedPartitions(commands,0));assert.throws(()=>balancedPartitions(commands,7));assert.throws(()=>balancedPartitions(commands,2,{},0));
});

test('invalid partition arguments fail instead of silently running an incomplete gate',()=>{
 for(const args of [
  ['--partition=1/3'],['--shard=5/8','--partition=0/3'],['--shard=5/8','--partition=4/3'],
  ['--shard=5/8','--partition=1/0'],['--shard=5/8','--partition=1/3','--partition=2/3'],
  ['--shard=5/8','--partition=1/3','--full'],['--shard=5/8','--partition=1/3','--from=tests/build.test.js'],
  ['--shard=5/8','--partition=1/999999999999999999999'],['--shard=5/8','--partition=1/500']
 ]){const r=spawnSync(process.execPath,[runner,...args,'--list'],{encoding:'utf8'});assert.notEqual(r.status,0,args.join(' '));assert.match(r.stderr,/Usage:|Partition count/);}
});

test('original fast (5) status requires all parts and rejects failure, cancellation or skipped work',()=>{
 const gate=workflow.slice(workflow.indexOf('  fast_five_gate:'));
 assert.match(gate,/name: fast \(5\)/);assert.match(gate,/needs: fast_five_parts/);assert.match(gate,/if: \$\{\{ always\(\) \}\}/);
 assert.match(gate,/PARTS_RESULT: \$\{\{ needs\.fast_five_parts\.result \}\}/);
 const command=gate.match(/run: node -e "([^"]+)"/)[1];
 for(const result of ['success','failure','cancelled','skipped','']){
  const r=spawnSync(process.execPath,['-e',command],{env:{...process.env,PARTS_RESULT:result},encoding:'utf8'});
  assert.ifError(r.error);assert.equal(r.status===0,result==='success',result);
 }
 const workers=workflow.slice(workflow.indexOf('  fast_five_parts:'),workflow.indexOf('  fast_five_gate:'));
 assert.match(workers,/fail-fast: false/);assert.doesNotMatch(workers,/continue-on-error|max-parallel:/);
});
