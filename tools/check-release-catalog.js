'use strict';
// Read-only catalog acceptance. No archive extraction or game mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),release=path.join(root,'releases');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const catalog=JSON.parse(fs.readFileSync(path.join(release,'catalog.json')));
const inventory=['BRANCH_WARS.html','BRANCH_WARS_LAN_SERVER.ps1','OPEN_BRANCH_WARS.bat','OPEN_LAN_GAME.bat','README.txt','manifest.json'].sort();
assert.equal(catalog.schemaVersion,1);
assert.equal(hash(fs.readFileSync(path.join(root,'game/BRANCH_WARS.html'),'utf8').replace(/\r\n/g,'\n')),catalog.preservedMain.normalizedGameSha256,'The default main game changed');
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
const manualName='branch-wars-v3-manual.pdf';
const manualZip=zipEntries(fs.readFileSync(path.join(release,'branch-wars-v3-manual.zip')),[manualName],1);
assert.deepEqual(manualZip.get(manualName),fs.readFileSync(path.join(release,manualName)),'Manual ZIP must contain the complete unchanged PDF');
for(const version of catalog.versions){
 const dir=path.join(release,version.id);assert.deepEqual(fs.readdirSync(dir).sort(),inventory);
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));assert.equal(manifest.schemaVersion,1);assert.equal(manifest.hashAlgorithm,'sha256');
 assert.deepEqual(manifest.files.map(f=>f.name).sort(),inventory.filter(n=>n!=='manifest.json'));
 const zipped=zipEntries(fs.readFileSync(path.join(release,version.zip)));
 for(const name of inventory)assert.deepEqual(zipped.get(name),fs.readFileSync(path.join(dir,name)),version.id+' ZIP mismatch: '+name);
 for(const f of manifest.files){const bytes=fs.readFileSync(path.join(dir,f.name));assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256);}
 assert.equal(hash(fs.readFileSync(path.join(dir,'BRANCH_WARS.html'))),version.portableSha256);
}
let links=0;
for(const file of ['README.md',...fs.readdirSync(release).filter(n=>n.endsWith('.md')).map(n=>'releases/'+n)]){
 const text=fs.readFileSync(path.join(root,file),'utf8');for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
  const url=m[1].replace(/^<|>$/g,'');if(/^(?:[a-z]+:|#)/i.test(url))continue;const dest=decodeURIComponent(url.split('#')[0]);if(!dest)continue;assert(fs.existsSync(path.resolve(root,path.dirname(file),dest)),file+': broken link '+dest);links++;
 }
}
console.log(JSON.stringify({passed:true,preservedMain:catalog.preservedMain.commit,versions:catalog.versions.map(v=>v.id),packageFiles:12,exactZipEntries:13,manualZipMatchesPdf:true,artifacts:Object.keys(catalog.artifacts).length,localLinks:links,scope:'Integrity and unchanged default game; no new gameplay or physical multiplayer acceptance.'},null,2));
