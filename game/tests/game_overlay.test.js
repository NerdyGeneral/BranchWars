'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=process.argv.includes('--source')?require('../tools/build_game').assemble().html:fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
const elements=new Map();let focused=null;
function node(id){const classes=new Set(['hidden']);return {id,classes,inert:false,disabled:false,isConnected:true,textContent:'',innerHTML:'',focus(){focused=this},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)}}}
for(const id of ['.shell','#privacyScreen','#resolutionScreen','#privacyContinue','#resolutionContinue','#privacyTitle','#privacyText','#resolutionTitle','#resolutionList'])elements.set(id,node(id));
const origin=node('origin'),c={$:s=>elements.get(s),document:{activeElement:origin},lastResolutionId:0,esc:s=>s,seat:0,draft:{},draftOwner:'owner',lastCycle:1,privacyNext:null,render(){}};
// Include the real owner-only display adapter now used by maybeResolution;
// the empty opening-view fixture must preserve its original result text.
vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function initiativeFeedback('),source.indexOf('async function submitPlan')),c);
const run=s=>vm.runInContext(s,c);
run("maybeResolution({resolutionId:1,resolution:['test result'],cycle:2,gameOver:false})");
assert.equal(elements.get('#resolutionList').innerHTML,'<li>test result</li>');
assert.equal(focused,elements.get('#resolutionContinue'));
assert.equal(elements.get('.shell').inert,true);
assert.equal(elements.get('#resolutionScreen').classes.has('hidden'),false);
let prevented=0;c.key={key:'Tab',shiftKey:true,preventDefault(){prevented++}};run('gameOverlayKey(key)');assert.equal(prevented,1);
assert.equal(focused,elements.get('#resolutionContinue'));
run("closeGameOverlay('#resolutionScreen')");assert.equal(elements.get('.shell').inert,false);assert.equal(focused,origin);
run("showPrivacy(1,'Other bank','Plan sealed')");assert.equal(focused,elements.get('#privacyContinue'));assert.equal(elements.get('.shell').inert,true);
run('gameOverlayKey(key)');assert.equal(prevented,2);assert.equal(focused,elements.get('#privacyContinue'));
run('privacyNext()');assert.equal(c.seat,1);assert.equal(c.draft,null);assert.equal(c.draftOwner,'');assert.equal(elements.get('.shell').inert,false);
assert.equal(elements.get('#privacyScreen').classes.has('hidden'),true);
run('gameOverlayKey(key)');assert.equal(prevented,2,'ordinary navigation is not trapped');
assert.match(source, /id="privacyScreen"[^>]*role="dialog"[^>]*aria-modal="true"/);
assert.match(source, /id="resolutionScreen"[^>]*role="dialog"[^>]*aria-modal="true"/);
assert(source.includes("document.addEventListener('keydown',gameOverlayKey)"));
console.log('Game overlays: labeled dialogs, focused continuation, inert background, keyboard containment and privacy-seat handoff passed.');
