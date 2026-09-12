'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html;
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Reviewed engine digest. No release has authority to retune simulation, and
// the digest must never be updated to accommodate accidental drift.
//
// Sanctioned move, 2026-09-11 (feat/v3-economy, docs/changelog.md 9.7):
//   cc229f83  V3.1 c721ede, campaign ceiling Group 7 / save 9.6
//   7b5d48e7  adds the Group 8 / save 9.7 rules boundary, and its endings
//   7b5d48e7  retires the Modular combinations pilot
// Registering a new opt-in boundary necessarily re-hashes the assembled
// engine. Groups 1-7 are unchanged and still pinned by the compatibility
// fixtures, none of which were regenerated for this move.
const expected='7b5d48e71213e8ae0b1235b420ff91957cb9f856fe2f479e0a96dc9ec8467e47';
assert.equal(createHash('sha256').update(engine).digest('hex'),expected,'Usability work must preserve the baseline simulation byte for byte');
console.log(JSON.stringify({suite:'usability-engine-boundary',engineSha256:expected,scope:'Exact assembled simulation byte preservation; not UI, runtime or release acceptance.'}));
