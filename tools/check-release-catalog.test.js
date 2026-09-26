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
const rc4=c=>c.versions.find(v=>v.id==='v4-rc4');
assert.throws(()=>run(c=>c.schemaVersion=1),/Expected values to be strictly equal/);
assert.throws(()=>run(c=>rc4(c).portableSha256='0'.repeat(64)),/v4-rc4 portable changed/);
assert.throws(()=>run(c=>c.artifacts['branch-wars-v3.zip']='0'.repeat(64)),/branch-wars-v3.zip changed/);
assert.throws(()=>run(c=>c.versions=c.versions.filter(v=>v.id!=='v4-rc3')),/must be catalogued/);
assert.throws(()=>run(c=>c.versions.push({...rc4(c)})),/Duplicate catalogued package/);
assert.throws(()=>run(c=>rc4(c).role='current'),/unknown role/);
// The wrapped V3 archive exercises the ZIP parser: wrong nesting, bad layout, and
// a well-formed archive whose bytes do not match the folder are all rejected.
assert.throws(()=>run(c=>Object.assign(rc4(c),{zip:'branch-wars-v3.zip',zipDepth:1})),/Unexpected ZIP nesting/);
assert.throws(()=>run(c=>Object.assign(rc4(c),{zip:'branch-wars-v3.zip',zipDepth:0})),/Unsupported package layout/);
assert.throws(()=>run(c=>rc4(c).zip='branch-wars-v3.zip'),/v4-rc4 ZIP mismatch/);
console.log('PASS: exact schema-2 catalog; wrong schema, portable hash, fixture hash, uncatalogued or duplicate package, unknown role, ZIP nesting/layout and ZIP-folder mismatch rejected. No files changed.');
