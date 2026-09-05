
'use strict';
// Random context is synchronous and restored after every entry point. State lives on the game.
let randomContext=null;
function seedHash(value){let n=2166136261;for(const c of String(value)){n=Math.imul(n^c.charCodeAt(0),16777619)>>>0}return n}
function ensureSimulation(g){
 if(g.simulationVersion!==undefined&&g.simulationVersion!==1)throw Error('Unsupported simulation version.');
 if(!g.rng){if(g.simulationVersion===1||g.rng!==undefined)throw Error('Invalid saved simulation RNG.');const seed=seedHash(JSON.stringify([g.created,g.players&&g.players.map(p=>p.id),g.cycle,g.scope]));g.rng={algorithm:'lcg32-v1',seed,state:seed,aiState:(seed^0x9e3779b9)>>>0};g.simulationVersion=1}
 if(g.rng.algorithm!=='lcg32-v1'||!['seed','state','aiState'].every(k=>Number.isInteger(g.rng[k])&&g.rng[k]>=0&&g.rng[k]<=0xffffffff))throw Error('Invalid saved simulation RNG.');
 g.simulationVersion=1;return g
}
function withRandom(g,stream,fn){ensureSimulation(g);const previous=randomContext;randomContext={g,stream};try{return fn()}finally{randomContext=previous}}
function simulationRandom(){if(!randomContext)throw Error('Simulation randomness requires a campaign context.');const r=randomContext.g.rng,k=randomContext.stream;r[k]=(Math.imul(r[k],1664525)+1013904223)>>>0;return r[k]/0x100000000}
function shuffled(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(simulationRandom()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rint=(a,b)=>Math.floor(simulationRandom()*(b-a+1))+a;
const pick=a=>a[Math.floor(simulationRandom()*a.length)];
