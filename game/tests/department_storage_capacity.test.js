'use strict';
// Exact captured large campaigns, not generated balances or pruned histories.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const codec=fs.readFileSync(path.join(root,'src/persistence/storage-codec.js'),'utf8'),context={};
vm.runInNewContext(codec+';this.api={pack:packStorageValue,unpack:unpackStorageValue,dedup:storageDeduplicate,redup:storageReduplicate,compress:storageCompress,checksum:storageChecksum,cache:storageCodecCache};',context);
const C=context.api,rawFixture=zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'fixtures/department-captured-regressions.json.gz')));
assert.equal(hash(rawFixture),'f7fb95d40d6206e44270afe26be42941bd8b9ebd7dc314558e0ac940e337e79f');
const fixture=JSON.parse(rawFixture);let checks=0;
function roundtrip(value){const text=JSON.stringify(value),encoded=C.dedup(text),restored=C.redup(encoded,text.length);assert.equal(restored,text);checks++;return encoded;}
for(const value of [null,true,false,0,-1,1.125,'',[],{},[{},{}],{a:[],b:[]},JSON.parse('{"__proto__":{"safe":1},"constructor":{"prototype":2},"0":"numeric","text":"🏦\\ud800\\u0000"}')])roundtrip(value);
let seed=739;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
function tree(depth){if(!depth)return [null,true,false,random()%1000,'shared 🏦 '+random()%4][random()%5];const leaf=tree(depth-1);return random()%2?[leaf,leaf,{nested:leaf}]:{first:leaf,second:leaf,text:'Repeated financial evidence'};}
for(let i=0;i<80;i++)roundtrip(tree(i%6));
assert.equal({}.safe,undefined,'Dangerous-looking literal keys must not modify prototypes.');
const large={rows:Array.from({length:18000},()=>({notes:'Snapshot '.repeat(64),book:{cash:1200,debt:300,equity:900}}))};
const largeRaw=JSON.stringify(large),largePacked=C.pack(large,'game');assert.equal(largePacked.branchWarsStorage,2);
const restored=C.unpack(copy(largePacked));assert.equal(JSON.stringify(restored),largeRaw);assert.notEqual(restored.rows[0],restored.rows[1]);
restored.rows[0].book.cash++;assert.equal(restored.rows[1].book.cash,1200,'Decoded references must not alias mutable campaign objects.');checks++;
assert.equal(C.pack(large,'game'),largePacked);large.rows[0].book.cash++;assert.notEqual(C.pack(large,'game'),largePacked);checks++;
C.pack({small:true},'game');assert.equal(C.cache.has('game'),false,'A small replacement must release the previous large cache.');checks++;
const legacy={branchWarsStorage:1,codec:'lzw16',length:largeRaw.length,checksum:C.checksum(largeRaw),data:C.compress(largeRaw)};
assert.equal(JSON.stringify(C.unpack(legacy)),largeRaw,'Existing LZW envelopes remain readable.');checks++;
assert.equal(JSON.stringify(C.unpack({...legacy,data:legacy.data+'\u0100'.repeat(10000)})),largeRaw,'Legacy reset tolerance remains supported without repeated dictionary allocation.');checks++;
for(const data of [largePacked.data+'\u0100','\u0100'+largePacked.data,largePacked.data+'\u0100'.repeat(100000)]){assert.throws(()=>C.unpack({...largePacked,data}),/reset/);checks++;}
for(const change of [{branchWarsStorage:3},{codec:'unknown'},{encodedLength:largePacked.encodedLength+1},{length:largePacked.length-1},{checksum:'00000000'},{checksum:5},{encodedLength:33554433},{length:33554433},{extra:true},{data:largePacked.data.slice(2)},{data:'x'.repeat(2097153)}]){
 assert.throws(()=>C.unpack({...largePacked,...change}));checks++;
}
for(const graph of [null,{},[null,[],9],[[0],[]],[[0],[[1,[[0]]]]],[[0],[[1,[[-1]]]]],[[0],[[7,[]]]],[[0],[[0,['a',1,'a',2]]]],[[0],[[0,['a']]]],[[0],[[1,[{r:0}]]]],[[0],[[1,[]],[0,[]]]],[[1],[[1,[]],[1,[]]]]]){
 assert.throws(()=>C.redup(JSON.stringify(graph),100));checks++;
}
const bomb=[[0,[]]];for(let i=1;i<40;i++)bomb.push([1,[[i-1],[i-1]]]);
assert.throws(()=>C.redup(JSON.stringify([[39],bomb]),33554432),'Expanded length must reject exponential reference bombs before materializing JSON.');checks++;
const measurements=[];
for(const c of fixture.cases){
 const original=JSON.stringify(c.openingGame),start=performance.now(),packed=C.pack(c.openingGame,'game'),text=JSON.stringify(packed),decoded=C.unpack(JSON.parse(text));
 assert.equal(JSON.stringify(decoded),original);assert.equal(JSON.stringify(c.openingGame),original);assert.equal(packed.branchWarsStorage,2);
 assert(text.length*2<2*1024*1024,'Captured full save needs headroom for a multiplayer checkpoint.');
 assert.equal(decoded.eventLedger.length,c.openingGame.eventLedger.length);assert.equal(hash(JSON.stringify(decoded.eventLedger)),hash(JSON.stringify(c.openingGame.eventLedger)));
 measurements.push({case:c.id,rawBytes:Buffer.byteLength(original),storedUtf16Bytes:text.length*2,codec:packed.codec,roundtripMs:Math.round(performance.now()-start),events:decoded.eventLedger.length});checks++;
}
console.log(JSON.stringify({status:'PASS',checks,measurements,codecSha256:hash(codec),scope:'Lossless local-storage envelope, no game-rule change, no history pruning. Physical browser quota and complete retry-checkpoint acceptance remain separate.'}));
