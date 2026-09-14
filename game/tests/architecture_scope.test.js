'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {counts}=require('../tools/architecture_overrides');
const count=(code,name='operate')=>counts(code)[name]||0;
test('real declarations and writes resolve through their owning function scope',()=>{
 assert.equal(count('function operate(){} operate=()=>1;'),1);
 assert.equal(count('function operate(){} function nested(){operate=()=>1;}'),1);
 assert.equal(count('function operate(){} var operate=()=>1;'),1);
 assert.equal(count('function nested(){var operate=()=>1; function operate(){}}'),1);
 assert.equal(count('const operate=()=>1; function nested(){operate=()=>2;}'),1);
 assert.equal(count('var operate=()=>1; var operate=()=>2;'),1);
});
test('independent locals, parameters, catches, loop variables and class names do not override engine functions',()=>{
 const start='function operate(){} ';
 for(const body of [
  'function nested(){const other=1,operate=()=>2;operate();}',
  'function nested(operate=false){operate=true;}',
  '(function operate(operate){operate=2;})()',
  'function nested({operate=1}){operate=2;}',
  'function nested(){var operate=1;operate=2;}',
  'try{}catch(operate){operate=1;}',
  'for(let operate=0;operate<3;operate++){}',
  '{const operate=1;}',
  'class Example {method(operate=1){operate=2;}}',
  '(function(){class operate{} operate=1;})()'
 ])assert.equal(count(start+body),0,body);
 assert.equal(count(start+'for(let operate=0;operate<1;operate++){} operate=()=>1;'),1);
});
test('comments, literals, regular expressions and property names do not masquerade as bindings',()=>{
 assert.equal(count('function operate(){} /* operate=1 */ const a="operate=1",b=/operate=/,c=`operate=1`; player.operate=1;'),0);
 assert.equal(count('function operate(){} const x=`${operate=()=>1}`;'),1);
 assert.equal(count('function operate(){} const x={operate:1}; x.operate=2;'),0);
});
test('direct and computed public API writes remain visible, including compound and destructuring writes',()=>{
 assert.equal(count('root.BWEngine.operate=()=>1;'),1);
 assert.equal(count("root['BWEngine']['operate']=()=>1;"),1);
 assert.equal(count('function operate(){} operate ||= ()=>1; operate++;'),2);
 assert.equal(count('function operate(){} ({x:operate}=source); [operate]=source;'),2);
 assert.equal(counts('root.BWEngine[key]=value;')['<dynamic-api-write>'],1);
});
test('same-spelling helpers in distinct closures do not grant each other override permissions',()=>{
 const source='const A=(()=>{function review(){}return review;})(); const B=(()=>{const review=3;return review;})();';
 assert.deepEqual(counts(source),{});
 assert.equal(count(source+'review=()=>1;','review'),1,'Unknown global write stays conservative');
 assert.equal(count('function operate(){} { function operate(){} operate=()=>2; }'),1);
 assert.throws(()=>counts('with(x){operate=1;}'),/Dynamic/);
});

test('parameter initializers and switch discriminants precede body-local bindings',()=>{
 assert.equal(count('function operate(){} function x(a=(operate=()=>1)){var operate;}'),1);
 assert.equal(count('function operate(){} function x(operate=1){operate=2;}'),0);
 assert.equal(count('function operate(){} switch(operate=()=>1){case 1: let operate;}'),1);
 assert.equal(count('function operate(){} try{}catch(operate){var operate=1;}'),0);
});
test('implicit loop writes and unusual valid names cannot bypass the check',()=>{
 assert.equal(count('function operate(){} for(operate of xs){} for(operate in xs){}'),2);
 assert.equal(count('function operate(){} for({f:operate} of xs){}'),1);
 for(const name of ['__proto__','constructor','toString','$rule'])assert.equal(count('function '+name+'(){} '+name+'=()=>1;',name),1);
});
test('offline parser and license match the pinned upstream distribution',()=>{
 const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..');
 const receipt=JSON.parse(fs.readFileSync(path.join(root,'tools/vendor/acorn-provenance.json')));
 assert.equal(require('../tools/vendor/acorn').version,'8.18.0');assert.equal(receipt.version,'8.18.0');assert.equal(receipt.license,'MIT');
 for(const row of receipt.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,row.file))).digest('hex'),row.sha256,row.file);
});
