'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html;
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Immutable reviewed V3.1 c721ede engine. This UI release has no authority to
// retune simulation. Do not update the digest to accommodate accidental drift.
const expected='cc229f83d09b769461497646daa64ce68e0c63a364b68ab6b175fa712db40633';
assert.equal(createHash('sha256').update(engine).digest('hex'),expected,'Usability work must preserve the baseline simulation byte for byte');
console.log(JSON.stringify({suite:'usability-engine-boundary',engineSha256:expected,scope:'Exact assembled simulation byte preservation; not UI, runtime or release acceptance.'}));
