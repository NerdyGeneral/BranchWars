'use strict';
// Diagnostic-only exact text patcher. Never writes source or portable output.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=function patchEngine(source,names,reverse=false){
 for(const name of reverse?[...names].reverse():names){
  const text=fs.readFileSync(path.join(__dirname,name),'utf8').replace(/\r\n/g,'\n');
  for(const part of text.split('\n@@\n').slice(1)){
   const lines=part.split('\n').filter(line=>/^[ +\-]/.test(line));
   const before=lines.filter(line=>line[0]!=='+').map(line=>line.slice(1)).join('\n');
   const after=lines.filter(line=>line[0]!=='-').map(line=>line.slice(1)).join('\n');
   const from=reverse?after:before,to=reverse?before:after;
   assert.equal(source.split(from).length,2,'Patch must have one exact context: '+name);
   source=source.replace(from,to);
  }
 }
 return source;
};
