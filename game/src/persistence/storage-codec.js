// Lossless browser-storage envelope only. Campaign/export/wire schemas and
// every ledger record remain unchanged. This checksum detects damage, not fraud.
const storageCodecCache=new Map();
const STORAGE_TEXT_LIMIT=32*1024*1024,STORAGE_CODE_LIMIT=2*1024*1024;
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
function storageExpand(data,length){
 if(typeof data!=='string'||data.length>STORAGE_CODE_LIMIT)throw Error('Invalid compressed browser save.');
 let dictionary=Array.from({length:256},(_,i)=>String.fromCharCode(i)),next=257,previous='',size=0;const chunks=[];
 for(let i=0;i<data.length;i++){
  const code=data.charCodeAt(i);
  if(code===256){dictionary=Array.from({length:256},(_,n)=>String.fromCharCode(n));next=257;previous='';continue}
  const entry=code<next?dictionary[code]:code===next&&previous?previous+previous[0]:undefined;
  if(entry===undefined)throw Error('Invalid compressed browser save dictionary.');
  size+=entry.length;if(size>length*3||size>STORAGE_TEXT_LIMIT*3)throw Error('Compressed browser save exceeds its declared size.');
  chunks.push(entry);if(previous&&next<65536)dictionary[next++]=previous+entry[0];previous=entry;
 }
 const text=decodeURIComponent(escape(chunks.join('')));if(text.length!==length)throw Error('Compressed browser save length mismatch.');return text;
}
function packStorageValue(value,slot=''){
 if(value===null||value===undefined){if(slot)storageCodecCache.delete(slot);return value}
 const text=JSON.stringify(value);if(text.length>STORAGE_TEXT_LIMIT)throw Error('Campaign exceeds the browser-storage safety limit. Export a backup.');
 if(text.length<256*1024)return value;
 if(slot&&!['game','view','connection'].includes(slot))throw Error('Invalid storage cache slot.');
 const cached=slot&&storageCodecCache.get(slot);if(cached&&cached.text===text)return cached.value;
 const data=storageCompress(text);if(data.length>STORAGE_CODE_LIMIT)throw Error('Campaign exceeds the compressed browser-storage limit. Export a backup.');
 const packed=Object.freeze({branchWarsStorage:1,codec:'lzw16',length:text.length,checksum:storageChecksum(text),data});
 if(slot)storageCodecCache.set(slot,{text,value:packed});return packed;
}
function unpackStorageValue(value){
 if(!value||typeof value!=='object'||!Object.hasOwn(value,'branchWarsStorage'))return value;
 if(value.branchWarsStorage!==1||value.codec!=='lzw16'||Object.keys(value).sort().join()!=='branchWarsStorage,checksum,codec,data,length'||!Number.isSafeInteger(value.length)||value.length<0||value.length>STORAGE_TEXT_LIMIT||typeof value.checksum!=='string'||!/^[a-f0-9]{8}$/.test(value.checksum))throw Error('Unsupported or invalid compressed browser save.');
 const text=storageExpand(value.data,value.length);if(storageChecksum(text)!==value.checksum)throw Error('Compressed browser save checksum mismatch.');return JSON.parse(text);
}
