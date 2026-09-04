'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8');
const engine = html.match(/<script id="engine">([\s\S]*?)<\/script>/);
assert(engine, 'embedded engine script must exist');

let seed = 0x5eed1234;
const seededMath = Object.create(Math);
seededMath.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const context = { console, Math: seededMath, Date, globalThis: null };
context.globalThis = context;
vm.runInNewContext(engine[1], context, { filename: 'embedded-engine.js' });
const E = context.BWEngine;

const doctrines = Object.keys(E.DOCTRINES);
const scopes = ['town', 'regional', 'state', 'national'];
const scenarios = Object.keys(E.SCENARIOS);
const stats = Object.fromEntries(doctrines.map((key) => [key, { wins: 0, games: 0 }]));
const endings = {};
const lengths = [];
const scopeLengths = Object.fromEntries(scopes.map((key) => [key, []]));
const actThreeStarts = Object.fromEntries(scopes.map((key) => [key, []]));
const actThreeStrategies = Object.fromEntries(scopes.map((key) => [key, []]));
const actionCounts = Object.fromEntries(doctrines.map((key) => [key, Object.fromEntries(Object.keys(E.COMPETITIVE_ACTIONS).map((action) => [action, 0]))]));
let unfinished = 0;
let over250 = 0;
let run = 0;

for (const left of doctrines) {
  for (const right of doctrines) {
    if (left === right) continue;
    for (let sample = 0; sample < 40; sample++, run++) {
      const g = E.createGame({
        mode: 'ai',
        name1: left,
        name2: right,
        scope: scopes[run % scopes.length],
        scenario: scenarios[run % scenarios.length],
        difficulty: 'vp',
        doctrine1: left,
        doctrine2: right,
      });
      while (!g.gameOver && g.cycle <= 500) {
        const beforeAct = g.act;
        E.submit(g, 0, E.chooseBot(g, 0));
        for (const player of g.players) actionCounts[player.doctrine][player.lastCompetitiveAction]++;
        if (beforeAct < 2 && g.act === 2) {
          actThreeStarts[g.scope].push(g.cycle);
          actThreeStrategies[g.scope].push(g.players.reduce((sum, player) => sum + Object.values(player.strategy).reduce((a, b) => a + b, 0), 0));
        }
      }
      stats[left].games++;
      stats[right].games++;
      if (!g.gameOver) {
        unfinished++;
        continue;
      }
      if (g.cycle > 250) over250++;
      const winner = g.players.find((p) => p.id === g.winnerId);
      if (winner) stats[winner.doctrine].wins++;
      endings[g.endReason] = (endings[g.endReason] || 0) + 1;
      lengths.push(g.cycle);
      scopeLengths[g.scope].push(g.cycle);
    }
  }
}

lengths.sort((a, b) => a - b);
const percentile = (p) => lengths[Math.min(lengths.length - 1, Math.floor(lengths.length * p))];
console.log(`Seeded doctrine audit: ${run} games; ${unfinished} unfinished at cycle 500; ${over250} exceeded cycle 250.`);
for (const key of doctrines) {
  const item = stats[key];
  const plays = Object.entries(actionCounts[key]).filter(([action]) => action !== 'none').sort((a, b) => b[1] - a[1]).map(([action, count]) => `${action}:${count}`).join(', ');
  console.log(`${key.padEnd(11)} ${(item.wins / item.games * 100).toFixed(1)}% wins (${item.wins}/${item.games}); actions ${plays}`);
}
console.log(`Endings: ${JSON.stringify(endings)}`);
console.log(`Length: median ${percentile(.5)}, p90 ${percentile(.9)}, max ${lengths[lengths.length - 1]}`);
for (const key of scopes) {
  const values = scopeLengths[key].sort((a, b) => a - b);
  const starts = actThreeStarts[key].sort((a, b) => a - b);
  const strategies = actThreeStrategies[key].sort((a, b) => a - b);
  console.log(`${key.padEnd(11)} median ${values[Math.floor(values.length * .5)]}, p90 ${values[Math.floor(values.length * .9)]}, max ${values[values.length - 1]}; Act III median ${starts[Math.floor(starts.length * .5)]}, combined strategy ${strategies[Math.floor(strategies.length * .5)]}`);
}
