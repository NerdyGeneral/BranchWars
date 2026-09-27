// One portable, escaped mark for setup, both multiplayer seats and campaign UI.
// Preset geometry is code-owned; uploads are bounded embedded JPEGs, never URLs.
const bankLogoDrafts={bank1:{jpeg:'',request:0,busy:false},bank2:{jpeg:'',request:0,busy:false},lobby:{jpeg:'',request:0,busy:false}};
function bankIdentityInk(color){
 const rgb=[1,3,5].map(i=>parseInt(E.bankColor(color).slice(i,i+2),16)/255)
  .map(n=>n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4));
 const luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 return (luminance+.05)/(.01564+.05)>1.05/(luminance+.05)?'#102238':'#ffffff';
}
function bankIdentityMarkup(bank,{seat=0,size='small',showName=false}={}){
 const identity=E.bankIdentity(bank?.identity,bank?.name,seat),color=E.bankColor(bank?.color,seat),ink=bankIdentityInk(color);
 const shapes={
  shield:'<path d="M8 5H56V32C56 46 43 57 32 61C21 57 8 46 8 32Z"/>',
  columns:'<path d="M4 15L32 3L60 15V20H4Z"/><path d="M8 23H16V49H8ZM28 23H36V49H28ZM48 23H56V49H48ZM4 53H60V61H4Z"/>',
  diamond:'<path d="M32 2L62 32L32 62L2 32Z"/>',
  roundel:'<circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="24" fill="none" stroke="'+ink+'" stroke-width="1"/>'
 };
 const label=String(bank?.name||'Bank')+' · '+(identity.jpeg?'Uploaded logo':E.BANK_CRESTS[identity.crest]+' · '+identity.monogram);
 const content=identity.jpeg?'<img src="'+esc(identity.jpeg)+'" alt="" draggable="false">':'<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">'+shapes[identity.crest]+'</svg><span class="bank-monogram'+(identity.crest==='columns'?' bank-monogram-pillars':'')+'">'+esc(identity.monogram)+'</span>';
 const mark='<span class="bank-crest bank-crest-'+(['small','large'].includes(size)?size:'small')+(identity.jpeg?' bank-crest-upload':'')+'" style="--crest-color:'+color+';--crest-ink:'+ink+'" role="img" aria-label="'+esc(label)+'">'+content+'</span>';
 return showName?'<span class="bank-logo-name">'+mark+'<span>'+esc(bank?.name||'Bank')+'</span></span>':mark;
}
function readBankIdentityFields(crestSelector,monogramSelector,name,seat=0,preview=false){
 const logo=bankLogoDrafts[crestSelector==='#lobbyCrest'?'lobby':crestSelector==='#bankCrest2'?'bank2':'bank1'];
 if(logo.busy&&!preview)throw Error('Wait for the logo preview to finish, or choose Use crest instead.');
 const identity={version:1,crest:$(crestSelector)?.value|| (seat===1?'diamond':'shield'),
  monogram:String($(monogramSelector)?.value||'').trim().toUpperCase()||E.bankMonogram(name),...(logo.jpeg?{jpeg:logo.jpeg}:{})};
 return E.bankIdentity(E.validateBankIdentity(identity),name,seat);
}
function setupBankIdentity(number,name,preview=false){return readBankIdentityFields('#bankCrest'+number,'#bankMonogram'+number,name,number-1,preview)}
let bankIdentityPreviewMode='',bankIdentityPreviewNameField=null;
function renderSetupBankIdentities(event){
 if(bankIdentityPreviewMode!==mode){bankIdentityPreviewMode=mode;bankIdentityPreviewNameField=null;}
 if(event?.target?.id&&['aiName','hotName1','lanHostName','lanGuestName','hostName','guestName','ghHostName','ghGuestName'].includes(event.target.id))bankIdentityPreviewNameField='#'+event.target.id;
 const hostNames={ai:'#aiName',hotseat:'#hotName1',lan:'#lanHostName',p2p:'#hostName',gh:'#ghHostName'},name1=$(bankIdentityPreviewNameField||hostNames[mode]||'#aiName')?.value||'Your Bank';
 $('#rivalIdentitySetup')?.classList.toggle('hidden',!['ai','hotseat'].includes(mode));
 const name2=mode==='hotseat'?$('#hotName2')?.value||'Second Bank':'Synergy Holdings AI';
 for(const [number,name] of [[1,name1],[2,name2]]){
  const target=$('#bankLogoPreview'+number);if(!target)continue;
  try{target.innerHTML=bankIdentityMarkup({name,color:$('#bankColor'+number)?.value,identity:setupBankIdentity(number,name,true)},{seat:number-1,size:'large',showName:true});}
  catch(error){target.textContent=error.message;}
 }
}
function renderLobbyIdentityPreview(){
 const target=$('#lobbyLogoPreview');if(!target)return;
 const seat=p2pRole==='guest'?1:0,name=$('#lobbyName').value;
 try{target.innerHTML=bankIdentityMarkup({name,color:$('#lobbyColor').value,identity:readBankIdentityFields('#lobbyCrest','#lobbyMonogram',name,seat,true)},{seat,size:'large',showName:true});}
 catch(error){target.textContent=error.message;}
}
function initializeBankIdentityControls(){
 for(const id of ['#bankColor1','#bankColor2','#bankCrest1','#bankCrest2','#bankMonogram1','#bankMonogram2',
  '#aiName','#hotName1','#hotName2','#lanHostName','#lanGuestName','#hostName','#guestName','#ghHostName','#ghGuestName'])
  $(id)?.addEventListener('input',renderSetupBankIdentities);
 for(const key of Object.keys(bankLogoDrafts)){
  $('#'+key+'LogoFile')?.addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';if(file)uploadBankLogo(key,file);});
  $('#'+key+'LogoRemove')?.addEventListener('click',()=>removeBankLogo(key));
  renderBankLogoControls(key);
 }
 renderSetupBankIdentities();
}
function renderBankLogoControls(key){
 const state=bankLogoDrafts[key],locked=key==='lobby'&&(!lobby||!!game||!!view||!!lobbyPending||lobby.players[p2pRole==='guest'?1:0].ready);
 const input=$('#'+key+'LogoFile'),remove=$('#'+key+'LogoRemove');
 if(input)input.disabled=locked;
 if(remove)remove.disabled=locked||(!state.jpeg&&!state.busy);
}
function bankLogoEditable(key){
 return key==='lobby'?!!lobby&&!game&&!view&&!lobbyPending&&!lobby.players[p2pRole==='guest'?1:0].ready:!game&&!view&&!lobby;
}
function refreshBankLogo(key){
 renderBankLogoControls(key);
 if(key==='lobby'){renderLobbyIdentityPreview();renderLobbyControls();}else renderSetupBankIdentities();
}
function removeBankLogo(key){
 if(!bankLogoEditable(key))return;
 const state=bankLogoDrafts[key],changed=!!state.jpeg;state.request++;state.busy=false;state.jpeg='';
 $('#'+key+'LogoStatus').textContent='Using your crest and monogram.';
 if(key==='lobby'&&changed)lobbyDirty=true;
 refreshBankLogo(key);
}
// Any common image a player picks is decoded by the browser, scaled to fit the
// stored logo bounds and re-encoded as a plain JPEG, discarding EXIF/location
// metadata. SVG is refused: it is a document, not pixels.
const BANK_LOGO_SOURCE=Object.freeze({bytes:10*1024*1024,side:12000,
 types:Object.freeze({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'}),
 qualities:Object.freeze([.9,.82,.74,.66,.58,.5])});
async function readBankLogoFile(file){
 const extension=String(file.name||'').toLowerCase().match(/\.([a-z]+)$/)?.[1],type=BANK_LOGO_SOURCE.types[extension];
 if(!type||file.type&&!Object.values(BANK_LOGO_SOURCE.types).includes(file.type))throw Error('Choose a JPG, PNG, WebP or GIF image.');
 if(!file.size||file.size>BANK_LOGO_SOURCE.bytes)throw Error('Choose an image of 10 MB or less.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!bytes.length||bytes.length>BANK_LOGO_SOURCE.bytes)throw Error('Choose an image of 10 MB or less.');
 let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));
 const source='data:'+(file.type||type)+';base64,'+btoa(binary);
 const decoded=await new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('That image could not be opened. Try another file.'));img.src=source;
 });
 const sourceWidth=decoded.naturalWidth,sourceHeight=decoded.naturalHeight;
 if(!sourceWidth||!sourceHeight)throw Error('That image could not be opened. Try another file.');
 if(sourceWidth>BANK_LOGO_SOURCE.side||sourceHeight>BANK_LOGO_SOURCE.side)throw Error('Choose an image under 12,000 pixels on each side.');
 const scale=Math.min(1,E.BANK_LOGO_LIMITS.pixels/Math.max(sourceWidth,sourceHeight)),
  width=Math.max(1,Math.round(sourceWidth*scale)),height=Math.max(1,Math.round(sourceHeight*scale));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');if(!context)throw Error('Your browser could not prepare the logo. Try another browser.');
 // JPEG has no transparency: a transparent PNG logo sits on white, not black.
 context.fillStyle='#ffffff';context.fillRect(0,0,width,height);
 context.drawImage(decoded,0,0,width,height);
 for(const quality of BANK_LOGO_SOURCE.qualities){
  const jpeg=canvas.toDataURL('image/jpeg',quality);
  if(E.bankLogoInfo(jpeg))return {jpeg,width,height};
 }
 throw Error('That logo could not be compressed below '+E.BANK_LOGO_LIMITS.bytes/1024+' KB. Try a simpler image.');
}
async function uploadBankLogo(key,file){
 if(!bankLogoEditable(key))return;
 const state=bankLogoDrafts[key],request=++state.request,attempt=connectionAttempt,selectedMode=mode,
  owner=key==='lobby'?lobby:null,revision=owner?.revision,role=p2pRole,generation=featureConnectionGeneration;
 const current=()=>state.request===request&&attempt===connectionAttempt&&generation===featureConnectionGeneration&&
  selectedMode===mode&&role===p2pRole&&bankLogoEditable(key)&&(key!=='lobby'||lobby===owner&&lobby.revision===revision);
 state.busy=true;$('#'+key+'LogoStatus').textContent='Preparing logo…';refreshBankLogo(key);
 try{
  const result=await readBankLogoFile(file);
  if(!current())return;
  state.jpeg=result.jpeg;
  $('#'+key+'LogoStatus').textContent='Logo ready · '+result.width+' × '+result.height+' pixels. '+(key==='lobby'?'Save identity to share it.':'Included when you start or join.');
  if(key==='lobby')lobbyDirty=true;
 }catch(error){if(current())$('#'+key+'LogoStatus').textContent=error.message;}
 finally{
  if(state.request===request){
   const stale=!current();state.busy=false;
   if(stale)$('#'+key+'LogoStatus').textContent='Setup changed while the image was loading. Choose your image again.';
   refreshBankLogo(key);
  }
 }
}
