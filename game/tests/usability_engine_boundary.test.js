'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html;
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Reviewed engine digest. No release has authority to retune simulation, and
// the digest must never be updated to accommodate accidental drift.
//
// Sanctioned move, 2026-09-11 (feat/v3-economy, docs/changelog.md 9.7):
//   cc229f83  V3.1 c721ede, campaign ceiling Group 7 / save 9.6
//   433599b5  adds the Group 8 / save 9.7 rules boundary, and its endings
// Registering a new opt-in boundary necessarily re-hashes the assembled
// engine. Groups 1-7 are unchanged and still pinned by the compatibility
// fixtures, none of which were regenerated for this move.
const expected='433599b504e8ef37f365e41e4b7dc8d2532f7d0087362520e7b29b30905487a8';
assert.equal(createHash('sha256').update(engine).digest('hex'),expected,'Usability work must preserve the baseline simulation byte for byte');
console.log(JSON.stringify({suite:'usability-engine-boundary',engineSha256:expected,scope:'Exact assembled simulation byte preservation; not UI, runtime or release acceptance.'}));
