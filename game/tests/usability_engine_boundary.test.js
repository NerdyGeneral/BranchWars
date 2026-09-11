'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html;
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Reviewed engine digest. No release has authority to retune simulation, and
// the digest must never be updated to accommodate accidental drift.
//
// Sanctioned move, 2026-09-11 (feat/v3-economy, docs/changelog.md 9.7):
//   cc229f83  V3.1 c721ede, campaign ceiling Group 7 / save 9.6
//   aa7b670b  adds the Group 8 / save 9.7 rules boundary, and its endings
// Registering a new opt-in boundary necessarily re-hashes the assembled
// engine. Groups 1-7 are unchanged and still pinned by the compatibility
// fixtures, none of which were regenerated for this move.
const expected='aa7b670ba53dcf1a644c47d3f6f184c65486e62847269e4cd2931fc1e21632a1';
assert.equal(createHash('sha256').update(engine).digest('hex'),expected,'Usability work must preserve the baseline simulation byte for byte');
console.log(JSON.stringify({suite:'usability-engine-boundary',engineSha256:expected,scope:'Exact assembled simulation byte preservation; not UI, runtime or release acceptance.'}));
