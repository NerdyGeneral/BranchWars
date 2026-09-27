// Cosmetic identity only. Never consumes simulation randomness, changes rules,
// or adds fields to campaigns that did not explicitly choose a logo.
const BANK_CRESTS=Object.freeze({shield:'Shield',columns:'Pillars',diamond:'Diamond',roundel:'Roundel'});
const BANK_LOGO_LIMITS=Object.freeze({pixels:200,bytes:100*1024});
// Validate the embedded format and dimensions without DOM/image decoders or RNG.
// Uploads additionally pass through the browser decoder and a clean JPEG canvas.
function bankLogoInfo(jpeg){
 const prefix='data:image/jpeg;base64,',alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 if(typeof jpeg!=='string'||!jpeg.startsWith(prefix)||jpeg.length>prefix.length+4*Math.ceil(BANK_LOGO_LIMITS.bytes/3))return null;
 const encoded=jpeg.slice(prefix.length);
 if(!encoded.length||encoded.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return null;
 const padding=encoded.endsWith('==')?2:encoded.endsWith('=')?1:0,length=encoded.length/4*3-padding;
 if(length<20||length>BANK_LOGO_LIMITS.bytes)return null;
 if(padding&&(alphabet.indexOf(encoded[encoded.length-padding-1])&(padding===2?15:3)))return null;
 const bytes=new Uint8Array(length);let bits=0,value=0,index=0;
 for(let i=0;i<encoded.length-padding;i++){
  value=(value<<6)|alphabet.indexOf(encoded[i]);bits+=6;
  if(bits>=8){bits-=8;bytes[index++]=(value>>>bits)&255;}
 }
 if(bytes[0]!==255||bytes[1]!==216)return null;
 let offset=2,frame=null,scanned=false;
 while(offset<length){
  if(bytes[offset++]!==255)return null;
  while(bytes[offset]===255)offset++;
  const marker=bytes[offset++];
  if(marker===217)return frame&&scanned&&offset===length?{width:frame.width,height:frame.height,bytes:length}:null;
  if(!marker||marker===216||marker===220||marker>=208&&marker<=215||offset+2>length)return null;
  const size=bytes[offset]*256+bytes[offset+1],end=offset+size;
  if(size<2||end>length)return null;
  if(marker>=192&&marker<=207&&![196,200,204].includes(marker)){
   if(frame||![192,194].includes(marker)||size<11||bytes[offset+2]!==8)return null;
   const height=bytes[offset+3]*256+bytes[offset+4],width=bytes[offset+5]*256+bytes[offset+6],components=bytes[offset+7];
   if(!width||!height||width>BANK_LOGO_LIMITS.pixels||height>BANK_LOGO_LIMITS.pixels||![1,3].includes(components)||size!==8+3*components)return null;
   frame={width,height,components};
  }
  if(marker===218){
   if(!frame||size<6||bytes[offset+2]<1||bytes[offset+2]>frame.components||size!==6+2*bytes[offset+2])return null;
   scanned=true;offset=end;
   // Entropy-coded bytes may escape FF or contain restart markers.
   while(offset<length){
    if(bytes[offset]!==255){offset++;continue;}
    if(bytes[offset+1]===0||bytes[offset+1]>=208&&bytes[offset+1]<=215){offset+=2;continue;}
    break;
   }
  }else offset=end;
 }
 return null;
}
function bankMonogram(name){
 const words=String(name||'').toUpperCase().match(/[A-Z0-9]+/g)||[];
 return words.slice(0,3).map(word=>word[0]).join('')||'BW';
}
function validBankIdentity(identity){
 return !!identity&&typeof identity==='object'&&!Array.isArray(identity)&&
  ['crest,monogram,version','crest,jpeg,monogram,version'].includes(Object.keys(identity).sort().join(','))&&identity.version===1&&
  (!Object.hasOwn(identity,'jpeg')||!!bankLogoInfo(identity.jpeg))&&
  Object.hasOwn(BANK_CRESTS,identity.crest)&&typeof identity.monogram==='string'&&/^[A-Z0-9]{1,3}$/.test(identity.monogram);
}
function validateBankIdentity(identity){
 if(!validBankIdentity(identity))throw Error('Choose a bank crest and a monogram of one to three letters or numbers. Optional JPG logos must be valid JPEGs, at most 200 × 200 pixels and 100 KB.');
 return identity;
}
function bankIdentity(identity,name,seat=0){
 return validBankIdentity(identity)?{version:1,crest:identity.crest,monogram:identity.monogram,...(identity.jpeg?{jpeg:identity.jpeg}:{})}:
  {version:1,crest:'shield',monogram:bankMonogram(name)};
}
function initializeBankIdentities(g,options){
 for(const [i,p] of g.players.entries()){
  const identity=options[i===0?'identity1':'identity2'];
  if(identity!==undefined)p.identity=bankIdentity(validateBankIdentity(identity),p.name,i);
 }
}
function validateBankIdentities(source){
 for(const p of source.players||[source.me,source.rival].filter(Boolean))
  if(p.identity!==undefined)validateBankIdentity(p.identity);
}
function projectBankIdentities(g,out,index){
 for(const [target,seat] of [[out.me,index],[out.rival,1-index]]){
  const player=g.players[seat];
  if(player.identity!==undefined)target.identity=bankIdentity(player.identity,player.name,seat);
 }
}
