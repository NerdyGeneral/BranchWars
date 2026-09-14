'use strict';
const {harness}=require('./github_resilience.test.js');
function groupHarness(){
 const h=harness();
 // Replacing innerHTML creates fresh controls with their authored input values.
 // The shared inert sink otherwise retains detached listeners and blank inputs.
 const original=h.c.document.querySelector;
 h.c.document.querySelector=selector=>{const node=original(selector);node.addEventListener=function(event,fn){this.listeners[event]=fn;};node.insertAdjacentHTML=function(where,markup){if(where==='beforeend')this.innerHTML+=markup;else this.adjacentHTML=markup;};node.remove=function(){this.innerHTML='';};return node;};
 const panel=h.c.document.querySelector('#financialGroupPanel');let content='';
 Object.defineProperty(panel,'innerHTML',{configurable:true,get:()=>content,set(markup){
  content=markup;
  for(const match of markup.matchAll(/<(?:button|input|select)[^>]*\bid="([^"]+)"[^>]*>/g)){
   const node=h.c.document.querySelector('#'+match[1]);node.listeners={};
   if(match[0].startsWith('<input')){node.value=match[0].match(/\bvalue="([^"]*)"/)?.[1]||'';node.checked=/\schecked(?:\s|>)/.test(match[0]);}
  }
 }});
 return h;
}
module.exports={groupHarness};
