'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.md')?[path.join(dir,e.name)]:[]);
const files=[path.join(root,'../README.md'),path.join(root,'../CONTRIBUTING.md'),path.join(root,'README.md'),path.join(root,'tools/README.md'),...walk(path.join(root,'docs'))];
let links=0;
for(const file of files){
 const name=path.basename(file);assert(['README.md','CONTRIBUTING.md'].includes(name)||/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(name),'Document name: '+file);
 const text=fs.readFileSync(file,'utf8');
 for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
  let url=m[1].replace(/^<|>$/g,'');if(/^(?:[a-z]+:|#)/i.test(url))continue;
  url=decodeURIComponent(url.split('#')[0]);if(!url)continue;
  assert(fs.existsSync(path.resolve(path.dirname(file),url)),'Broken local link in '+path.relative(root,file)+': '+url);links++;
 }
}
const expected=['game-reference.md','player-guide.md','release-status.md','roadmap.md'];
for(const name of expected)assert(fs.existsSync(path.join(root,'docs',name)));
assert(!fs.existsSync(path.join(root,'GAME_REFERENCE.md')),'Generated reference must not return to the game root');
assert(fs.readFileSync(path.join(root,'tools/build_reference.js'),'utf8').includes("path.join(ROOT, 'docs', 'game-reference.md')"));
console.log('Documentation checks passed: '+files.length+' Markdown files, '+links+' local links, canonical names and generated-reference destination.');
