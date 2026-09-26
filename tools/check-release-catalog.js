'use strict';
// Read-only catalog acceptance. No archive extraction or game mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),release=path.join(root,'releases');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const catalog=JSON.parse(fs.readFileSync(path.join(release,'catalog.json')));
const inventory=['BRANCH_WARS.html','BRANCH_WARS_LAN_SERVER.ps1','OPEN_BRANCH_WARS.bat','OPEN_LAN_GAME.bat','README.txt','manifest.json'].sort();
// Schema 2: main is the development line, so game/BRANCH_WARS.html is checked for
// freshness against source by game/tools/check.js rather than pinned here. This
// catalog pins only what releases/ stores: frozen packages and test fixtures.
assert.equal(catalog.schemaVersion,2);
for(const [name,expected] of Object.entries(catalog.artifacts))assert.equal(hash(fs.readFileSync(path.join(release,name))),expected,name+' changed');
function zipEntries(bytes,expected=inventory,depth=2){
 const end=bytes.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));assert(end>=0,'Missing ZIP directory');
 assert.equal(bytes.readUInt16LE(end+4),0);assert.equal(bytes.readUInt16LE(end+6),0);
 const count=bytes.readUInt16LE(end+10);assert(count<=20);let p=bytes.readUInt32LE(end+16);const entries=new Map();
 for(let i=0;i<count;i++){
  assert.equal(bytes.readUInt32LE(p),0x02014b50);const flags=bytes.readUInt16LE(p+8),method=bytes.readUInt16LE(p+10),compressed=bytes.readUInt32LE(p+20),size=bytes.readUInt32LE(p+24),n=bytes.readUInt16LE(p+28),extra=bytes.readUInt16LE(p+30),comment=bytes.readUInt16LE(p+32),offset=bytes.readUInt32LE(p+42);
  const name=bytes.subarray(p+46,p+46+n).toString('utf8').replace(/\\/g,'/');p+=46+n+extra+comment;
  assert(!(flags&1)&&size<=10*1024*1024,'Unsafe ZIP entry');
  assert(!name.startsWith('/')&&!name.split('/').includes('..'),'Unsafe ZIP path');if(name.endsWith('/'))continue;
  const parts=name.split('/');assert.equal(parts.length,depth,'Unexpected ZIP nesting');const leaf=parts.at(-1);assert(expected.includes(leaf));assert(!entries.has(leaf));
  assert.equal(bytes.readUInt32LE(offset),0x04034b50);const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28);assert(start+compressed<=bytes.length);
  const payload=bytes.subarray(start,start+compressed);assert([0,8].includes(method));const data=method===0?payload:zlib.inflateRawSync(payload,{maxOutputLength:10*1024*1024});assert.equal(data.length,size);entries.set(leaf,data);
 }
 assert.deepEqual([...entries.keys()].sort(),expected);return entries;
}
const packages=catalog.versions.map(version=>version.package);
assert.equal(new Set(packages).size,packages.length,'Duplicate catalogued package');
assert.deepEqual(fs.readdirSync(release,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort(),[...packages].sort(),'Every package folder in releases/ must be catalogued');
for(const version of catalog.versions){
 assert(['published','fixture'].includes(version.role),version.id+': unknown role');
 const dir=path.join(release,version.package);assert.deepEqual(fs.readdirSync(dir).sort(),inventory,version.id+' package inventory');
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));assert.equal(manifest.schemaVersion,1);assert.equal(manifest.hashAlgorithm,'sha256');
 assert.deepEqual(manifest.files.map(f=>f.name).sort(),inventory.filter(n=>n!=='manifest.json'));
 // Original V2/V3 archives use a wrapper folder; the verified V3.1 archive is
 // flat. Pin the expected shape per edition instead of accepting arbitrary paths.
 // A version may be folder-only (zip:null); a catalogued ZIP must match the folder.
 if(version.zip!==null){
  const zipDepth=version.zipDepth??2;assert([1,2].includes(zipDepth),'Unsupported package layout');
  const zipped=zipEntries(fs.readFileSync(path.join(release,version.zip)),inventory,zipDepth);
  // Buffer.equals, not deepEqual: diffing two multi-megabyte buffers exhausts memory.
  for(const name of inventory)assert(zipped.get(name).equals(fs.readFileSync(path.join(dir,name))),version.id+' ZIP mismatch: '+name);
 }
 for(const f of manifest.files){const bytes=fs.readFileSync(path.join(dir,f.name));assert.equal(bytes.length,f.bytes,version.id+' manifest size: '+f.name);assert.equal(hash(bytes),f.sha256,version.id+' manifest hash: '+f.name);}
 assert.equal(hash(fs.readFileSync(path.join(dir,'BRANCH_WARS.html'))),version.portableSha256,version.id+' portable changed');
}
let links=0;
for(const file of ['README.md',...fs.readdirSync(release).filter(n=>n.endsWith('.md')).map(n=>'releases/'+n)]){
 const text=fs.readFileSync(path.join(root,file),'utf8');for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
  const url=m[1].replace(/^<|>$/g,'');if(/^(?:[a-z]+:|#)/i.test(url))continue;const dest=decodeURIComponent(url.split('#')[0]);if(!dest)continue;assert(fs.existsSync(path.resolve(root,path.dirname(file),dest)),file+': broken link '+dest);links++;
 }
}
console.log(JSON.stringify({passed:true,versions:catalog.versions.map(v=>v.id),packageFiles:catalog.versions.length*inventory.length,artifacts:Object.keys(catalog.artifacts).length,localLinks:links,scope:'Integrity of frozen packages and pinned fixtures; no gameplay or physical multiplayer acceptance.'},null,2));
