'use strict';
// Development-only static check. Parse bindings, not matching words in unrelated
// scopes. This is not a call graph or a proof against dynamic eval/API aliases.
const {parse}=require('./vendor/acorn');
function analyze(text){
 const ast=parse(text,{ecmaVersion:'latest',sourceType:'script',locations:true});
 const functionNames=new Set(),assignments=[],initializers=[];
 const scope=(parent,kind)=>({parent,kind,bindings:new Map()});
 const top=scope(null,'program');
 function names(pattern){
  if(!pattern)return [];
  if(pattern.type==='Identifier')return [pattern.name];
  if(pattern.type==='RestElement')return names(pattern.argument);
  if(pattern.type==='AssignmentPattern')return names(pattern.left);
  if(pattern.type==='ArrayPattern')return pattern.elements.flatMap(names);
  if(pattern.type==='ObjectPattern')return pattern.properties.flatMap(p=>names(p.type==='RestElement'?p.argument:p.value));
  return [];
 }
 function bind(s,name,kind){
  const b=s.bindings.get(name)||{name,scope:s,functionDeclaration:false,callable:false};
  if(kind==='function'){b.functionDeclaration=true;b.callable=true;functionNames.add(name);}
  if(kind==='callable'){b.callable=true;functionNames.add(name);}
  s.bindings.set(name,b);return b;
 }
 const resolve=(s,name)=>s?(s.bindings.get(name)||resolve(s.parent,name)):null;
 const variableScope=s=>s.kind==='function'||s.kind==='program'?s:variableScope(s.parent);
 const isFunction=n=>n&&['FunctionExpression','ArrowFunctionExpression'].includes(n.type);
 function children(node,s){for(const [key,value]of Object.entries(node)){
  if(['type','start','end','loc'].includes(key))continue;
  if(Array.isArray(value)){for(const n of value)if(n?.type)visit(n,s);}
  else if(value?.type)visit(value,s);
 }}
 function visit(node,s){
  if(!node)return;
  switch(node.type){
   case 'Program':for(const n of node.body)visit(n,s);return;
   case 'FunctionDeclaration':case 'FunctionExpression':case 'ArrowFunctionExpression':{
    if(node.type==='FunctionDeclaration')bind(s,node.id.name,'function');
    // Default/destructured parameters run outside the function body's var
    // environment. A later body-local must not hide a write in an initializer.
    const named=node.type==='FunctionExpression'&&node.id,parent=named?scope(s,'function-name'):s;
    if(named)bind(parent,node.id.name,'callable');
    const separate=node.params.some(p=>p.type!=='Identifier'),params=scope(parent,separate?'parameters':'function');
    for(const param of node.params)for(const name of names(param))bind(params,name,'parameter');
    for(const param of node.params)visit(param,params);
    const inner=separate?scope(params,'function'):params;
    if(node.body.type==='BlockStatement'){for(const n of node.body.body)visit(n,inner);}else visit(node.body,inner);
    return;
   }
   case 'BlockStatement':case 'StaticBlock':{
    const inner=scope(s,node.type==='StaticBlock'?'function':'block');for(const n of node.body)visit(n,inner);return;
   }
   case 'VariableDeclaration':
    for(const d of node.declarations){const owner=node.kind==='var'?variableScope(s):s;
     for(const name of names(d.id))bind(owner,name,isFunction(d.init)?'callable':'variable');
     if(d.init)initializers.push({pattern:d.id,scope:s,node:d});visit(d.id,s);visit(d.init,s);
    }return;
   case 'CatchClause':{
    const inner=scope(s,'block');for(const name of names(node.param))bind(inner,name,'parameter');visit(node.param,inner);visit(node.body,inner);return;
   }
   case 'ForStatement':case 'ForInStatement':case 'ForOfStatement':{
    const inner=scope(s,'block');
    if(node.left&&node.left.type!=='VariableDeclaration')assignments.push({target:node.left,scope:inner,node});
    children(node,inner);return;
   }
   case 'SwitchStatement':{
    visit(node.discriminant,s);const inner=scope(s,'block');for(const c of node.cases)visit(c,inner);return;
   }
   case 'ClassDeclaration':case 'ClassExpression':{
    if(node.type==='ClassDeclaration'&&node.id)bind(s,node.id.name,'class');
    visit(node.superClass,s);const inner=scope(s,'block');if(node.id)bind(inner,node.id.name,'class');visit(node.body,inner);return;
   }
   case 'AssignmentExpression':assignments.push({target:node.left,scope:s,node});break;
   case 'UpdateExpression':assignments.push({target:node.argument,scope:s,node});break;
   case 'WithStatement':throw Error('Dynamic with scopes cannot be checked for engine overrides.');
  }
  children(node,s);
 }
 visit(ast,top);
 const writes=[];
 function record(name,node,kind){writes.push({name,line:node.loc.start.line,column:node.loc.start.column,kind});}
 function property(n){return n.computed?(n.property.type==='Literal'?n.property.value:null):n.property.name;}
 function apiName(n){
  if(n.type!=='MemberExpression')return null;
  const owner=n.object;
  if(owner.type!=='MemberExpression'||owner.object.type!=='Identifier'||owner.object.name!=='root'||property(owner)!=='BWEngine')return null;
  return property(n)??'<dynamic-api-write>';
 }
 function target(n,s,node){
  if(!n)return;
  if(n.type==='Identifier'){
   const binding=resolve(s,n.name);
   // Retain conservative detection for undeclared writes to known engine names,
   // including the gate's injected post-bundle override tests.
   if(binding?binding.callable:functionNames.has(n.name))record(n.name,node,'binding assignment');
  }else if(n.type==='MemberExpression'){
   const key=apiName(n);if(key!==null)record(key,node,'exported API assignment');
  }else if(n.type==='ObjectPattern')for(const p of n.properties)target(p.type==='RestElement'?p.argument:p.value,s,node);
  else if(n.type==='ArrayPattern')for(const e of n.elements)target(e,s,node);
  else if(n.type==='RestElement')target(n.argument,s,node);
  else if(n.type==='AssignmentPattern')target(n.left,s,node);
 }
 for(const a of assignments)target(a.target,a.scope,a.node);
 const initialized=new Set();
 for(const i of initializers)for(const name of names(i.pattern)){
  const binding=resolve(i.scope,name);
  if(binding.functionDeclaration||(binding.callable&&initialized.has(binding)))record(name,i.node,'reinitialization');
  initialized.add(binding);
 }
 writes.sort((a,b)=>a.line-b.line||a.column-b.column||a.name.localeCompare(b.name));
 return writes;
}
function counts(text){const result=Object.create(null);for(const row of analyze(text))result[row.name]=(result[row.name]||0)+1;return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));}
module.exports={analyze,counts};
