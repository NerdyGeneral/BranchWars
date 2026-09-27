'use strict';
// Real JPEG byte fixtures + actual engine/client logic. DOM image decoding is
// stubbed explicitly below; this is not live-browser or physical-peer evidence.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test');
const fixtures=require('./fixtures/bank-logo-jpegs.json');
const E=harness().c.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const crest={version:1,crest:'columns',monogram:'BW'},mark={...crest,jpeg:fixtures.square};
const data=bytes=>'data:image/jpeg;base64,'+Buffer.from(bytes).toString('base64');
const bytes=uri=>Buffer.from(uri.split(',')[1],'base64');
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
function uploadHarness(side='host'){
 const h=harness(side);h.c.mark=copy(mark);h.c.image=fixtures.square;
 h.run("game=null;view=null;lobby=null;p2pRole='';initializeBankIdentityControls();$('#aiName').value='Upload Bank';$('#bankCrest1').value='columns';$('#bankMonogram1').value='BW';");
 return h;
}
function file(uri=fixtures.square,overrides={}){const b=bytes(uri);return {name:'logo.JPG',type:'image/jpeg',size:b.length,arrayBuffer:async()=>b,...overrides};}
function browserDecoder(h,{width=200,height=200,fail=false,output=fixtures.square}={}){
 h.c.Image=class{constructor(){this.naturalWidth=width;this.naturalHeight=height;}set src(value){h.decoded=value;queueMicrotask(()=>fail?this.onerror():this.onload());}};
 h.c.document.createElement=tag=>{assert.equal(tag,'canvas');const c={width:0,height:0,getContext:()=>({drawImage:(img,x,y)=>{assert.equal(x,0);assert.equal(y,0);h.drawn=true;}}),toDataURL:(type,quality)=>{assert.equal(type,'image/jpeg');assert.equal(quality,.9);return output;}};h.canvas=c;return c;};
}
function open(h){h.run("p2pRole='host';ghFlush=()=>{};send=()=>{};p2pConfig={name:'Host Bank',color:'#102238',identity:mark,scope:'national',scenario:'balanced'};capturePeerFeatures(E.campaignCapabilities());openLobby({...E.campaignCapabilities(),name:'Guest Bank',color:'#eeeeee',identity:mark});");}
(async()=>{
 await test('actual JPEGs accept square, rectangular and progressive images within limits',()=>{
  assert.deepEqual(copy(E.bankLogoInfo(fixtures.square)),{width:200,height:200,bytes:bytes(fixtures.square).length});
  assert.equal(E.bankLogoInfo(fixtures.rectangle).height,80);assert.equal(E.bankLogoInfo(fixtures.progressive).width,32);
  assert.equal(E.bankLogoInfo(fixtures.tooWide),null);assert.equal(E.bankLogoInfo(fixtures.tooTall),null);
  assert.deepEqual(copy(E.bankIdentity(mark,'Bank')),mark);
 });
 await test('strict payload bounds reject forged formats, dimensions, truncation and appended content',()=>{
  const b=bytes(fixtures.square),frame=b.indexOf(Buffer.from([255,192]));assert(frame>0);
  const zero=Buffer.from(b);zero[frame+5]=0;zero[frame+6]=0;
  const big=Buffer.concat([b.subarray(0,2),Buffer.from([255,254,255,255]),Buffer.alloc(65533),b.subarray(2)]);
  const tooBig=Buffer.concat([big.subarray(0,2),Buffer.from([255,254,255,255]),Buffer.alloc(65533),big.subarray(2)]);
  assert(E.bankLogoInfo(data(big)),'Valid JPEG comment segment inside byte budget');
  for(const jpeg of ['',null,'https://example.invalid/logo.jpg','data:image/svg+xml;base64,PHN2Zy8+',fixtures.square.replace('image/jpeg','image/png'),fixtures.square.slice(0,-4),data(Buffer.concat([b,Buffer.from('<script>')])),data(zero),data(tooBig),fixtures.tooTall,fixtures.tooWide]){
   assert.equal(E.bankLogoInfo(jpeg),null);assert.throws(()=>E.validateBankIdentity({...crest,jpeg}),/JPG/);
   assert.deepEqual(copy(E.bankIdentity({...crest,jpeg},'Safe Bank')),{version:1,crest:'shield',monogram:'SB'});
  }
  assert.throws(()=>E.validateBankIdentity({...mark,url:'file:///private.jpg'}),/bank crest/);
 });
 for(const edition of ['core','expanded'])await test(edition+': JPEGs preserve save, both perspectives, rematch and economic neutrality',()=>{
  const options={...E.previewCampaignEdition({},edition,{currentReporting:true,currentEconomics:true,currentResearch:true,currentRivalry:true,currentLending:true}).options,mode:'hotseat',seed:'jpg-neutral-'+edition,created:1};
  const g=E.createGame({...options,identity1:mark,identity2:{...crest,jpeg:fixtures.rectangle}}),plain=E.createGame({...options,identity1:crest,identity2:crest});
  const clean=value=>{const x=copy(value);for(const p of x.players)delete p.identity.jpeg;return x;};
  for(const i of [0,1]){const v=E.publicState(g,i);assert.equal(v.me.identity.jpeg,i?fixtures.rectangle:fixtures.square);assert.equal(v.rival.identity.jpeg,i?fixtures.square:fixtures.rectangle);v.me.identity.jpeg='bad';assert.notEqual(g.players[i].identity.jpeg,'bad');}
  const plans=g.players.map((_,i)=>E.chooseBot(g,i)),plainPlans=plain.players.map((_,i)=>E.chooseBot(plain,i));assert.deepEqual(copy(plans),copy(plainPlans));
  E.submit(g,0,plans[0]);E.submit(plain,0,plainPlans[0]);const restored=E.migrateCampaign(copy(g));assert.deepEqual(clean(restored),copy(E.migrateCampaign(copy(plain))));assert.deepEqual(copy(restored.players.map(p=>p.identity)),copy(g.players.map(p=>p.identity)));
  E.submit(g,1,plans[1]);E.submit(restored,1,plans[1]);E.submit(plain,1,plainPlans[1]);assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(E.migrateCampaign(copy(restored))));assert.deepEqual(clean(g),copy(plain));
  const invalid=copy(g);invalid.players[0].identity.jpeg=fixtures.tooWide;const before=JSON.stringify(invalid);assert.throws(()=>E.migrateCampaign(invalid),/JPG/);assert.equal(JSON.stringify(invalid),before);
  g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.players[0].identity.jpeg,fixtures.square);
 });
 await test('rendering uses embedded images with escaped names and falls back for unsafe payloads',()=>{
  const h=uploadHarness();h.c.bank={name:'<bad>',color:'#102238',identity:copy(mark)};const markup=h.run('bankIdentityMarkup(bank,{showName:true})');
  assert(markup.includes('<img src="data:image/jpeg;base64,'));assert(markup.includes('&lt;bad&gt;'));assert(!markup.includes('<bad>'));assert(!markup.includes('<svg'));
  h.c.bank.identity.jpeg='javascript:alert(1)';const safe=h.run('bankIdentityMarkup(bank)');assert(!safe.includes('<img'));assert(safe.includes('<svg'));
 });
 await test('file selection decodes and re-encodes pixels, previews locally, and can restore the crest',async()=>{
  const h=uploadHarness();browserDecoder(h,{output:fixtures.rectangle,width:160,height:80});h.c.file=file();
  h.elements.get('#bank1LogoFile').listeners.change({target:{files:[h.c.file],value:'logo.JPG'}});await new Promise(r=>setImmediate(r));
  assert(h.drawn);assert.equal(h.canvas.width,160);assert.equal(h.run('setupBankIdentity(1,"Upload Bank").jpeg'),fixtures.rectangle);
  assert(h.elements.get('#bankLogoPreview1').innerHTML.includes('<img'));assert(h.elements.get('#bank1LogoStatus').textContent.includes('160 × 80'));
  h.elements.get('#bank1LogoRemove').listeners.click();assert.equal(h.run('setupBankIdentity(1,"Upload Bank").jpeg'),undefined);assert.equal(h.run('setupBankIdentity(1,"Upload Bank").crest'),'columns');
  assert(h.elements.get('#bank1LogoRemove').disabled);
 });
 await test('invalid replacements keep the existing logo and reject bad extension, bytes, size and decode',async()=>{
  const h=uploadHarness();h.run('bankLogoDrafts.bank1.jpeg=image');browserDecoder(h);
  for(const f of [file(fixtures.tooWide),file(fixtures.square,{name:'logo.png'}),file(fixtures.square,{type:'image/png'}),file(fixtures.square,{size:102401}),file(fixtures.square,{size:0}),file(fixtures.square,{arrayBuffer:async()=>Buffer.from('not JPEG')}),file(fixtures.square,{arrayBuffer:async()=>{throw Error('Read failed')}})]){
   h.c.file=f;await h.run('uploadBankLogo("bank1",file)');assert.equal(h.run('bankLogoDrafts.bank1.jpeg'),fixtures.square);assert(!h.run('bankLogoDrafts.bank1.busy'));
  }
  browserDecoder(h,{fail:true});h.c.file=file();await h.run('uploadBankLogo("bank1",file)');assert.match(h.elements.get('#bank1LogoStatus').textContent,/could not be opened/);assert.equal(h.run('bankLogoDrafts.bank1.jpeg'),fixtures.square);
  browserDecoder(h,{width:201});await h.run('uploadBankLogo("bank1",file)');assert.match(h.elements.get('#bank1LogoStatus').textContent,/200/);
 });
 await test('cancel, newer selection and changed connection fence late file completion',async()=>{
  for(const action of ['removeBankLogo("bank1")','connectionAttempt++','mode="hotseat"']){
   const h=uploadHarness();let finish;h.c.pending=new Promise(r=>finish=r);h.run('readBankLogoFile=()=>pending');const loading=h.run('uploadBankLogo("bank1",{})');
   assert.throws(()=>h.run('setupBankIdentity(1,"Bank")'),/Wait/);h.run(action);finish({jpeg:fixtures.square,width:200,height:200});await loading;
   assert.equal(h.run('bankLogoDrafts.bank1.jpeg'),'');assert(!h.run('bankLogoDrafts.bank1.busy'));
  }
  const h=uploadHarness();let first;h.c.pending=new Promise(r=>first=r);h.run('readBankLogoFile=()=>pending');const old=h.run('uploadBankLogo("bank1",{})');
  h.run('readBankLogoFile=async()=>({jpeg:image,width:200,height:200})');await h.run('uploadBankLogo("bank1",{})');first({jpeg:fixtures.rectangle,width:160,height:80});await old;assert.equal(h.run('bankLogoDrafts.bank1.jpeg'),fixtures.square);
 });
 await test('lobby image is a private draft until Save identity, then resets readiness; remove follows the same contract',async()=>{
  const h=uploadHarness();open(h);let finish;h.c.pending=new Promise(r=>finish=r);h.run('readBankLogoFile=()=>pending');const loading=h.run('uploadBankLogo("lobby",{})');
  assert(h.elements.get('#lobbySave').disabled);assert(h.elements.get('#lobbyReady').disabled);h.run('editLobbyIdentity(true)');assert(!h.state().lobby.players[0].ready);
  finish({jpeg:fixtures.rectangle,width:160,height:80});await loading;assert(h.run('lobbyDirty'));assert.equal(h.state().lobby.players[0].identity.jpeg,fixtures.square);
  h.run('lobby.players[1].ready=true;editLobbyIdentity(false)');assert.equal(h.state().lobby.players[0].identity.jpeg,fixtures.rectangle);assert(h.state().lobby.players.every(p=>!p.ready));
  h.run('removeBankLogo("lobby")');assert.equal(h.state().lobby.players[0].identity.jpeg,fixtures.rectangle);h.run('editLobbyIdentity(false)');assert.equal(h.state().lobby.players[0].identity.jpeg,undefined);
  h.run('editLobbyIdentity(true)');assert(h.elements.get('#lobbyLogoFile').disabled);h.run('readBankLogoFile=()=>{throw Error("should not read")};uploadBankLogo("lobby",{})');assert(h.state().lobby.players[0].ready);
 });
 await test('a replaced lobby or revised setup cannot accept a stale upload',async()=>{
  for(const action of ['lobby.revision++','lobby=JSON.parse(JSON.stringify(lobby))','leaveGame()']){
   const h=uploadHarness();open(h);let finish;h.c.pending=new Promise(r=>finish=r);h.run('readBankLogoFile=()=>pending');const loading=h.run('uploadBankLogo("lobby",{})');
   h.run(action);finish({jpeg:fixtures.rectangle,width:160,height:80});await loading;assert.notEqual(h.run('bankLogoDrafts.lobby.jpeg'),fixtures.rectangle);assert(!h.run('bankLogoDrafts.lobby.busy'));
  }
 });
 const {peers,lobby,start}=require('./agency_peer_compat.test');
 for(const transport of ['gh','lan','p2p'])await test(transport+': JPEG hello, saved lobby edits, public state, checkpoint and resume summary',async()=>{
  const pair=peers(transport,10);for(const peer of [pair.host,pair.guest]){peer.c.logo=copy(mark);peer.run('p2pConfig.identity=logo');}
  await lobby(pair);
  for(const peer of [pair.host,pair.guest])assert(peer.state().lobby.players.every(p=>p.identity.jpeg===fixtures.square));
  pair.guest.c.newImage=fixtures.rectangle;pair.guest.run('bankLogoDrafts.lobby.jpeg=newImage;markLobbyDirty()');assert.equal(pair.host.state().lobby.players[1].identity.jpeg,fixtures.square);
  pair.guest.run('editLobbyIdentity(false)');await pair.drain();assert.equal(pair.host.state().lobby.players[1].identity.jpeg,fixtures.rectangle);
  await start(pair);assert.equal(pair.guest.state().view.me.identity.jpeg,fixtures.rectangle);assert.equal(pair.guest.state().view.rival.identity.jpeg,fixtures.square);
  const saved=pair.host.run('E.migrateCampaign(JSON.parse(JSON.stringify(game)))');assert.equal(saved.players[0].identity.jpeg,fixtures.square);
  pair.host.c.saved=saved;const summary=pair.host.run('lobbyResumeSummary(saved)');pair.guest.c.summary=summary;assert(pair.guest.run('validLobbyResume(summary)'));assert.equal(summary.identities[1].identity.jpeg,fixtures.rectangle);
  pair.guest.c.bad=copy(pair.guest.state().view);pair.guest.c.bad.me.identity.jpeg=fixtures.tooTall;assert.throws(()=>pair.guest.run('validateIncomingFeatureRules(bad)'),/JPG/);
  if(transport==='gh'){pair.host.run('ghCheckpoint()');assert([...pair.host.storage.values()].some(text=>text.includes(fixtures.square)),'Host checkpoint retains image');}
 });
 console.log('Bank JPG uploads passed: '+checks+' focused checks; browser decoder is stubbed and transports are simulated.');
})().catch(error=>{console.error(error);process.exitCode=1;});
