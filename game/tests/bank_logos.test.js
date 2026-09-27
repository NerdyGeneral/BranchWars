'use strict';
// Cosmetic identities must survive the real engine/lobby boundaries without
// altering a bank's money, decisions, private plans, or simulation randomness.
const assert=require('node:assert/strict'),vm=require('node:vm');
if(!process.argv.includes('--portable')&&!process.argv.includes('--source'))process.argv.push('--source');
const fs=require('node:fs'),path=require('node:path');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const context={console};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);const E=context.BWEngine;
const copy=value=>JSON.parse(JSON.stringify(value));
const mark1={version:1,crest:'columns',monogram:'SNB'},mark2={version:1,crest:'roundel',monogram:'MFG'};
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function options(edition){return {...E.previewCampaignEdition({},edition,{currentReporting:true,currentEconomics:true,currentResearch:true,currentRivalry:true,currentLending:true}).options,seed:'logo-neutrality-'+edition,created:1,mode:'hotseat',scope:'national',name1:'Steenburgen National Bank',name2:'Monica Financial Group',color1:'#102238',color2:'#eeeeee'};}
for(const edition of ['core','expanded']){
 test(edition+': both public perspectives, detached projections, half-ready migration and rematch retain logos',()=>{
  const g=E.createGame({...options(edition),identity1:mark1,identity2:mark2});
  for(const seat of [0,1]){
   const view=E.publicState(g,seat);assert.deepEqual(copy(view.me.identity),seat?mark2:mark1);assert.deepEqual(copy(view.rival.identity),seat?mark1:mark2);
   view.me.identity.monogram='BAD';view.rival.identity.crest='shield';assert.deepEqual(copy(g.players.map(p=>p.identity)),[mark1,mark2]);
  }
  E.submit(g,0,E.chooseBot(g,0));assert(g.players[0].submitted);assert(!g.players[1].submitted);
  const before=JSON.stringify(g),restored=E.migrateCampaign(g);assert.equal(JSON.stringify(g),before);
  assert.deepEqual(copy(restored.players.map(p=>p.identity)),[mark1,mark2]);assert.deepEqual(copy(restored.players[0].submitted),copy(g.players[0].submitted));
  E.submit(restored,1,E.chooseBot(restored,1));assert.equal(restored.cycle,2);
  restored.gameOver=true;assert.equal(E.rematch(restored,0),false);assert.equal(E.rematch(restored,1),true);
  assert.deepEqual(copy(restored.players.map(p=>p.identity)),[mark1,mark2]);assert.equal(restored.cycle,1);
 });
 test(edition+': cosmetic choices do not alter AI, monthly results or RNG',()=>{
  const plain=E.createGame(options(edition)),branded=E.createGame({...options(edition),identity1:mark1,identity2:mark2});
  const normalize=g=>{const result=copy(g);result.players.forEach(p=>delete p.identity);return result;};
  assert.deepEqual(normalize(branded),normalize(plain));
  for(let month=0;month<3&&!plain.gameOver;month++){
   for(const seat of [0,1]){const plan=E.chooseBot(plain,seat),other=E.chooseBot(branded,seat);assert.deepEqual(copy(plan),copy(other));E.submit(plain,seat,plan);E.submit(branded,seat,other);}
   assert.deepEqual(normalize(branded),normalize(plain));
  }
 });
}
test('legacy campaigns retain absent identity fields and receive stable display-only defaults',()=>{
 const g=E.createGame({seed:'legacy-logo',created:1,mode:'hotseat',name1:'Old Bank',name2:'Rival Bank'}),before=JSON.stringify(g);
 const a=E.bankIdentity(undefined,g.players[0].name,0),b=E.bankIdentity(undefined,g.players[1].name,1);
 assert.deepEqual(copy(a),{version:1,crest:'shield',monogram:'OB'});assert.equal(b.crest,'shield');
 assert.deepEqual(copy(E.bankIdentity(undefined,'Rival Bank',0)),copy(b),'Legacy fallback does not swap shapes with viewer perspective');
 const restored=E.migrateCampaign(g);assert(restored.players.every(p=>!Object.hasOwn(p,'identity')));
 for(const seat of [0,1]){const view=E.publicState(g,seat);assert(!Object.hasOwn(view.me,'identity'));assert(!Object.hasOwn(view.rival,'identity'));}
 assert.equal(JSON.stringify(g),before);assert.equal(E.bankMonogram(''), 'BW');assert.equal(E.bankMonogram('First & Trust Bank'),'FTB');
});
test('bounded identity validation rejects malformed creation and saves without mutation',()=>{
 const invalid=[null,{},[],{...mark1,version:2},{...mark1,crest:'constructor'},{...mark1,crest:'<svg onload=alert(1)>'},{...mark1,monogram:'A<B'},{...mark1,monogram:'FOUR'},{...mark1,url:'https://example.invalid/logo'}];
 for(const identity of invalid){
  assert.throws(()=>E.createGame({...options('core'),identity1:identity}),/bank crest/);
  const g=E.createGame(options('core'));g.players[0].identity=copy(identity);const before=JSON.stringify(g);
  assert.throws(()=>E.migrateCampaign(g),/bank crest/);assert.equal(JSON.stringify(g),before);
  assert.deepEqual(copy(E.bankIdentity(identity,'Safe Bank')),{version:1,crest:'shield',monogram:'SB'});
 }
});
const {harness}=require('./github_resilience.test');
test('portable crest rendering escapes names, bounds SVG geometry and preserves contrast',()=>{
 const h=harness();h.c.bank={name:'<img src=x onerror=alert(1)>',color:'#ffffff',identity:mark1};
 const markup=h.run('bankIdentityMarkup(bank,{showName:true,size:"large"})');
 assert(!markup.includes('<img'));assert(markup.includes('&lt;img'));assert(markup.includes('SNB'));assert(markup.includes('aria-label='));assert(markup.includes('--crest-ink:#102238'));
 assert.equal(h.run("bankIdentityInk('#000000')"),'#ffffff');
 h.c.bank.identity={version:1,crest:'<script>',monogram:'<x>'};const safe=h.run('bankIdentityMarkup(bank)');assert(!safe.includes('<script>'));assert(!safe.includes('<x>'));
});
test('shared lobby carries both logos and a model-only edit invalidates readiness',()=>{
 const h=harness('host');h.c.one=mark1;h.c.two=mark2;
 h.run("ghFlush=()=>{};send=()=>{};game=null;view=null;p2pConfig={name:'Host Bank',color:'#102238',identity:one,scope:'national',scenario:'balanced'};capturePeerFeatures(E.campaignCapabilities());openLobby({...E.campaignCapabilities(),name:'Guest Bank',color:'#eeeeee',identity:two})");
 assert.deepEqual(copy(h.state().lobby.players.map(p=>p.identity)),[mark1,mark2]);assert(h.elements.get('#lobbyBanks').innerHTML.includes('SNB'));
 h.run("lobby.players.forEach(p=>p.ready=true);applyLobbyUpdate(1,{id:'logo-edit',revision:lobby.revision,player:{name:'Guest Bank',color:'#eeeeee',identity:{version:1,crest:'diamond',monogram:'NEW'}}})");
 assert(h.state().lobby.players.every(p=>!p.ready));assert.equal(h.state().lobby.revision,2);assert.equal(h.state().lobby.players[1].identity.monogram,'NEW');
 const before=JSON.stringify(h.state().lobby.players);
 h.run("applyLobbyUpdate(1,{id:'old-logo',revision:1,player:{name:'Guest Bank',color:'#eeeeee',identity:two},ready:true})");
 assert.equal(JSON.stringify(h.state().lobby.players),before);
 h.run("lobby.players.forEach(p=>p.ready=true);syncPeers=()=>{};startLobbyCampaign()");
 assert(h.state().game,'Confirmed lobby creates a game: '+h.elements.get('#lobbyError').textContent);assert.equal(h.state().game.players[1].identity.monogram,'NEW');
});
test('guest hello and public-state validation carry only bounded cosmetic identities',()=>{
 const guest=harness('guest');guest.c.identity=mark2;
 guest.run("p2pConfig={guestName:'Guest Bank',color:'#eeeeee',identity};hello=makeFeatureHello()");assert.deepEqual(copy(guest.run('hello.identity')),mark2);
 const g=E.createGame({...options('core'),identity1:mark1,identity2:mark2});guest.c.frame=copy(E.publicState(g,1));
 guest.run('validateIncomingFeatureRules(frame)');guest.c.frame.rival.identity={...mark1,monogram:'<x>'};
 assert.throws(()=>guest.run('validateIncomingFeatureRules(frame)'),/bank crest/);
});
test('resume summary identifies saved-bank logos and confirms saved rules without inventing identities',()=>{
 const h=harness('host');h.c.saved=E.createGame({...options('core'),identity1:mark1,identity2:mark2});
 const summary=h.run('lobbyResumeSummary(saved)');assert.equal(summary.identities.length,2);assert.deepEqual(copy(summary.identities[1].identity),mark2);h.c.summary=summary;assert(h.run('validLobbyResume(summary)'));
 h.run('delete saved.players[0].identity;delete saved.players[1].identity');assert.deepEqual(Object.keys(h.run('lobbyResumeSummary(saved)')).sort(),['banks','cycle','rules','version']);
});
console.log('Bank logos passed: '+checks+' focused engine, save, privacy, lobby and presentation checks; no browser or physical multiplayer claim.');
