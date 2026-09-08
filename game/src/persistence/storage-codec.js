// Lossless browser-storage envelope only. Campaign/export/wire schemas and
// every ledger record remain unchanged. This checksum detects damage, not fraud.
const storageCodecCache=new Map();
// The captured 480-month Group6 campaign needs 52M raw string units but less
// than 1MiB of compressed codes. Keep finite raw/code/depth/bomb limits; do not
// prune its history merely to fit the former 32MiB-sized text ceiling.
const STORAGE_TEXT_LIMIT=64*1024*1024,STORAGE_CODE_LIMIT=2*1024*1024;
function storageChecksum(text){let n=2166136261;for(let i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619)}return (n>>>0).toString(16).padStart(8,'0')}
function storageCompress(text){
 const input=unescape(encodeURIComponent(text)),dictionary=new Map(),codes=[];
 let next=257,word=input.charCodeAt(0);
 for(let i=1;i<input.length;i++){
  const byte=input.charCodeAt(i),key=word*256+byte,found=dictionary.get(key);
  if(found!==undefined){word=found;continue}
  codes.push(word);
  if(next<65536)dictionary.set(key,next++);else{codes.push(256);dictionary.clear();next=257}
  word=byte;
 }
 if(input.length)codes.push(word);
 // Web Storage counts UTF-16 units. JSON safely escapes control/surrogate units;
 // base64 would spend nearly three times as many storage characters per code.
 const chunks=[];for(let i=0;i<codes.length;i+=4096)chunks.push(String.fromCharCode(...codes.slice(i,i+4096)));
 return chunks.join('');
}
function storageExpand(data,length,strict=false){
 if(typeof data!=='string'||data.length>STORAGE_CODE_LIMIT)throw Error('Invalid compressed browser save.');
 let dictionary=Array.from({length:256},(_,i)=>String.fromCharCode(i)),next=257,previous='',size=0;const chunks=[];
 for(let i=0;i<data.length;i++){
  const code=data.charCodeAt(i);
  if(code===256){
   if(strict&&(next!==65536||!previous||i===data.length-1))throw Error('Invalid compressed browser save reset.');
   dictionary.length=256;next=257;previous='';continue;
  }
  const entry=code<next?dictionary[code]:code===next&&previous?previous+previous[0]:undefined;
  if(entry===undefined)throw Error('Invalid compressed browser save dictionary.');
  size+=entry.length;if(size>length*3||size>STORAGE_TEXT_LIMIT*3)throw Error('Compressed browser save exceeds its declared size.');
  chunks.push(entry);if(previous&&next<65536)dictionary[next++]=previous+entry[0];previous=entry;
 }
 const text=decodeURIComponent(escape(chunks.join('')));if(text.length!==length)throw Error('Compressed browser save length mismatch.');return text;
}
// Causal records repeat whole before/after snapshots. Intern identical JSON
// containers before compression, without pruning a record or changing its order.
// References exist only inside this storage envelope, never in the restored game.
function storageDeduplicate(text){
 const nodes=[],known=new Map();
 function encode(value,depth){
  if(depth>128)throw Error('Browser save nesting exceeds its safety limit.');
  if(value===null||typeof value!=='object')return value;
  const row=Array.isArray(value)?[1,value.map(x=>encode(x,depth+1))]:[0,Object.entries(value).flatMap(([k,v])=>[k,encode(v,depth+1)])];
  const key=JSON.stringify(row);let id=known.get(key);
  if(id===undefined){id=nodes.length;nodes.push(row);known.set(key,id);}
  return [id];
 }
 const root=encode(JSON.parse(text),0);return JSON.stringify([root,nodes]);
}
function storageReduplicate(encoded,length){
 const graph=JSON.parse(encoded),fail=()=>{throw Error('Invalid deduplicated browser save.');};
 if(!Array.isArray(graph)||graph.length!==2||!Array.isArray(graph[1])||graph[1].length>1000000)fail();
 const nodes=graph[1],values=[],sizes=[],depths=[],children=[],canonical=new Set();
 function token(value,limit){
  if(Array.isArray(value)){
   if(value.length!==1||!Number.isSafeInteger(value[0])||value[0]<0||value[0]>=limit)fail();
   const id=value[0];return {value:values[id],size:sizes[id],depth:depths[id],id};
  }
  if(value!==null&&!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))fail();
  return {value,size:JSON.stringify(value).length,depth:0,id:null};
 }
 for(let i=0;i<nodes.length;i++){
  const row=nodes[i];if(!Array.isArray(row)||row.length!==2||![0,1].includes(row[0])||!Array.isArray(row[1])||row[0]===0&&row[1].length%2)fail();
  const key=JSON.stringify(row);if(canonical.has(key))fail();canonical.add(key);
  const object=row[0]===0,result=object?Object.create(null):[],refs=[],keys=new Set();let size=2,depth=1,count=0;
  for(let j=0;j<row[1].length;j+=object?2:1){
   const name=object?row[1][j]:null;if(object&&(typeof name!=='string'||keys.has(name)))fail();
   const part=token(row[1][j+(object?1:0)],i);size+=(count++?1:0)+(object?JSON.stringify(name).length+1:0)+part.size;depth=Math.max(depth,part.depth+1);
   // Check expanded length BEFORE constructing/stringifying a shared tree.
   // This rejects exponential reference bombs even when encoded input is tiny.
   if(!Number.isSafeInteger(size)||size>length||depth>128)fail();
   if(part.id!==null)refs.push(part.id);
   if(object){keys.add(name);result[name]=part.value;}else result.push(part.value);
  }
  values.push(result);sizes.push(size);depths.push(depth);children.push(refs);
 }
 const root=token(graph[0],nodes.length);if(root.size!==length)fail();
 const used=new Set(),pending=root.id===null?[]:[root.id];
 while(pending.length){const id=pending.pop();if(used.has(id))continue;used.add(id);for(const child of children[id])pending.push(child);}
 if(used.size!==nodes.length)fail();
 const text=JSON.stringify(root.value);if(text.length!==length)fail();return text;
}
function packStorageValue(value,slot=''){
 if(value===null||value===undefined){if(slot)storageCodecCache.delete(slot);return value}
 const text=JSON.stringify(value);if(text.length>STORAGE_TEXT_LIMIT)throw Error('Campaign exceeds the browser-storage safety limit. Export a backup.');
 if(text.length<256*1024){if(['game','view','connection'].includes(slot))storageCodecCache.delete(slot);return value;}
 if(slot&&!['game','view','connection'].includes(slot))throw Error('Invalid storage cache slot.');
 const cached=slot&&storageCodecCache.get(slot);if(cached&&cached.text===text)return cached.value;
 const checksum=storageChecksum(text);let candidate=null;
 // Retain the established envelope for ordinary saves. Large repeated history
 // benefits from a second, explicitly versioned, lossless storage representation.
 if(text.length>=8*1024*1024){
  const encoded=storageDeduplicate(text);
  if(encoded.length<text.length){
   const compact=storageCompress(encoded);
   if(compact.length<=STORAGE_CODE_LIMIT)candidate={branchWarsStorage:2,codec:'jsondag-lzw16',length:text.length,encodedLength:encoded.length,checksum,data:compact};
   // A fourfold structural reduction avoids compressing tens of megabytes a
   // second time on the synchronous autosave path. Ambiguous cases compare both.
   if(candidate&&encoded.length*4>=text.length){
    const data=storageCompress(text),legacy={branchWarsStorage:1,codec:'lzw16',length:text.length,checksum,data};
    if(data.length<=STORAGE_CODE_LIMIT&&JSON.stringify(legacy).length<JSON.stringify(candidate).length)candidate=legacy;
   }
  }
 }
 if(!candidate)candidate={branchWarsStorage:1,codec:'lzw16',length:text.length,checksum,data:storageCompress(text)};
 if(candidate.data.length>STORAGE_CODE_LIMIT)throw Error('Campaign exceeds the compressed browser-storage limit. Export a backup.');
 const packed=Object.freeze(candidate);
 if(slot)storageCodecCache.set(slot,{text,value:packed});return packed;
}
function unpackStorageValue(value){
 if(!value||typeof value!=='object'||!Object.hasOwn(value,'branchWarsStorage'))return value;
 if(value.branchWarsStorage===2){
  if(value.codec!=='jsondag-lzw16'||Object.keys(value).sort().join()!=='branchWarsStorage,checksum,codec,data,encodedLength,length'||!Number.isSafeInteger(value.length)||value.length<0||value.length>STORAGE_TEXT_LIMIT||!Number.isSafeInteger(value.encodedLength)||value.encodedLength<0||value.encodedLength>STORAGE_TEXT_LIMIT||typeof value.checksum!=='string'||!/^[a-f0-9]{8}$/.test(value.checksum))throw Error('Unsupported or invalid deduplicated browser save.');
  const text=storageReduplicate(storageExpand(value.data,value.encodedLength,true),value.length);
  if(storageChecksum(text)!==value.checksum)throw Error('Compressed browser save checksum mismatch.');
  return JSON.parse(text);
 }
 if(value.branchWarsStorage!==1||value.codec!=='lzw16'||Object.keys(value).sort().join()!=='branchWarsStorage,checksum,codec,data,length'||!Number.isSafeInteger(value.length)||value.length<0||value.length>STORAGE_TEXT_LIMIT||typeof value.checksum!=='string'||!/^[a-f0-9]{8}$/.test(value.checksum))throw Error('Unsupported or invalid compressed browser save.');
 const text=storageExpand(value.data,value.length);if(storageChecksum(text)!==value.checksum)throw Error('Compressed browser save checksum mismatch.');return JSON.parse(text);
}
