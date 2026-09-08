'use strict';
const assert = require('node:assert/strict');
const {harness} = require('./github_resilience.test.js');

function setup() {
  const h = harness('guest');
  h.run("validName=()=> 'Local Bank';readSetupFeatureOptions=()=>({});featureSelectionPending=()=>false;messages=[];setStartMessage=s=>messages.push(s);entered=0;enterGame=()=>entered++;saved=0;saveLocal=()=>saved++;shown=[];show=s=>shown.push(s);handoffs=[];showPrivacy=(...args)=>handoffs.push(args);view={cycle:9,me:{submitted:false}};draftOwner='old guest';lan={...emptyLan(),active:true,room:'OLDLAN'};oldGeneration=connectionAttempt");
  for (const kind of ['ai','hot']) {
    h.c.document.querySelector('#'+kind+'Scope').value = 'town';
    h.c.document.querySelector('#'+kind+'Scenario').value = 'balanced';
  }
  h.c.document.querySelector('#aiDifficulty').value = 'vp';
  h.c.document.querySelector('#bankColor1').value = '#2277cc';
  h.c.document.querySelector('#bankColor2').value = '#cc7722';
  return h;
}
function cleared(h) {
  assert.equal(h.run('gh.active'), false);
  assert.equal(h.run('lan.active'), false);
  assert.equal(h.run('view'), null);
  assert.equal(h.run('p2pRole'), '');
  assert.equal(h.run('draftOwner'), '');
  assert(h.run('connectionAttempt>oldGeneration'), 'pending remote attempt invalidated');
  assert.equal(h.run('saved'), 1);
}
for (const mode of ['ai','hotseat']) {
  const h = setup(); h.run(`startLocal('${mode}')`); cleared(h);
  assert.equal(h.run('game.mode'), mode);
  assert.equal(h.run('entered'), 1);
  assert.equal(h.run('messages.length'), 0);
}
const invalid = setup();
invalid.run('readSetupFeatureOptions=()=>({campaignRulesVersion:99})');
invalid.run("startLocal('ai')");
assert.equal(invalid.run('connectionAttempt'), invalid.run('oldGeneration'));
assert.equal(invalid.run('gh.active'), true, 'failed validation leaves prior session intact');
assert.equal(invalid.run('view.cycle'), 9);
assert.equal(invalid.run('saved'), 0);
assert.equal(invalid.run('messages.length'), 1);

for (const mode of ['ai','hotseat','lan','p2p']) for (const sealed of [false,true]) {
  const h = setup();
  h.run(`restored=E.createGame({mode:'${mode}',seed:'transition',created:1});restored.players[0].submitted=${sealed};resumeLocalCampaign(restored)`);
  cleared(h);
  const handoff = sealed && mode !== 'ai';
  assert.equal(h.run('handoffs.length'), handoff ? 1 : 0);
  assert.equal(h.run('entered'), handoff ? 0 : 1);
  assert.equal(h.run('game.mode'), mode === 'ai' ? 'ai' : 'hotseat');
}
function imports() {
  const h = setup(), readers = [];
  h.c.FileReader = class { constructor() { readers.push(this); } readAsText() {} };
  h.run("savedFixture=JSON.stringify(E.createGame({mode:'hotseat',seed:'import',created:1}));importSave({})");
  readers[0].result = h.run('savedFixture');
  return {h,readers};
}
const stale = imports();
stale.h.run("startLocal('ai');messages=[]");
stale.readers[0].onload(); stale.readers[0].onerror();
assert.equal(stale.h.run('game.mode'), 'ai');
assert.equal(stale.h.run('saved'), 1);
assert.equal(stale.h.run('messages.length'), 0);
const doubled = imports(); doubled.h.run('importSave({})');
doubled.readers[0].onload();
assert.equal(doubled.h.run('saved'), 0, 'superseded file read cannot install campaign');
doubled.readers[1].result = doubled.h.run('savedFixture'); doubled.readers[1].onload();
cleared(doubled.h); assert.equal(doubled.h.run('game.mode'), 'hotseat');
const unreadable = imports(); unreadable.readers[0].onerror();
assert.equal(unreadable.h.run('saved'), 0);
assert.equal(unreadable.h.run('gh.active'), true);
assert.match(unreadable.h.run('messages[0]'), /could not be read/);
console.log('Local transitions: validated creation, failed-creation preservation, all resume modes, sealed privacy and superseded/unreadable imports passed.');
