'use strict';
// Exercise real catalog verification with read-only, in-memory manifest mutations.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=path.join(__dirname,'check-release-catalog.js');
const catalogPath=path.resolve(__dirname,'../releases/catalog.json');
const source=fs.readFileSync(file,'utf8');
function run(change){
 const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));change?.(catalog);
 const adapter={...fs,readFileSync(target,...args){
  return path.resolve(String(target))===catalogPath?Buffer.from(JSON.stringify(catalog)):fs.readFileSync(target,...args);
 }};
 const check=vm.runInThisContext('(function(require,__dirname,console){'+source+'\n})',{filename:file});
 return check(name=>name==='node:fs'?adapter:require(name),__dirname,{log(){}});
}
run();
assert.throws(()=>run(c=>c.versions.find(v=>v.id==='v3').zipDepth=2),/Unexpected ZIP nesting/);
assert.throws(()=>run(c=>c.versions.find(v=>v.id==='v2').zipDepth=1),/Unexpected ZIP nesting/);
assert.throws(()=>run(c=>c.versions.find(v=>v.id==='v3').zipDepth=0),/Unsupported package layout/);
assert.throws(()=>run(c=>c.artifacts['branch-wars-v3-manual.pdf']='0'.repeat(64)),/manual.pdf changed/);
assert.throws(()=>run(c=>c.versions.find(v=>v.id==='v3').portableSha256='0'.repeat(64)),/Expected values to be strictly equal/);
console.log('PASS: exact catalog, flat V3.1 and wrapped V2 layouts; wrong layout, manual hash and runtime hash rejected. No files changed.');
