'use strict';
// Uncaptured direct-integration UI contract test. Actual Group5 engine/context;
// the candidate function book exists ONLY in a private fixture view, never as
// an unversioned mutation of the actual game. Browser visual acceptance pending.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
const engine=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const prototype=read('experiments/institution/department-functions.js')+'\n'+read('experiments/institution/department-function-context.js');
vm.runInNewContext(engine.replace('root.BWEngine={',prototype+'\nroot.BWEngine={DepartmentFunctions,DepartmentFunctionContext,'),ctx);
vm.runInNewContext(read('experiments/institution/department-functions-ui.js')+'\nthis.UI=DepartmentFunctionsUI;',ctx);
const E=ctx.BWEngine,D=E.DepartmentFunctions,C=E.DepartmentFunctionContext;let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){error.message=name+': '+error.message;throw error;}}
function harness({supply=0}={}){
 const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options;
 const g=E.createGame({...options,mode:'hotseat',seed:'function-ui',created:1});let seat=0,identity={},plan=E.chooseBot(g,0),adopted=[],errors=[],enabled=true,accept=true;
 plan.allocation=copy(g.players[0].allocation);plan.investments={};plan.newProjects=[];plan.newProject=null;plan.hires=0;plan.specialistHires=E.emptySpecialistOrders();plan.competitiveAction='none';plan.contractBid=null;
 plan.facilityPolicy=E.defaultFacilityPolicy();plan.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(g.players[0]);plan.agencyPolicy=E.defaultAgencyPlan(g.players[0]);plan.groupPolicy.bankSupport=0;plan.groupPolicy.bankDividend=0;
 for(const role of D.ROLES){plan.leaderOrders[role]=null;plan.workforcePolicy.training[role]=0;}
 const mandate={priorities:[...D.IDS],maxAdditionalQuarters:4,maxVendorExpense:0,floorQuarters:{service:0,business:0,lending:0,operations:0}};
 const provider=Object.fromEntries(D.IDS.map(id=>[id,supply]));let policy=D.defaultPlan(D.initialize(g.players[0],g.cycle,true));
 function snapshot(){const view=E.publicState(g,seat);if(enabled)view.me=D.initialize(view.me,g.cycle,true);return {view,plan,policy,mandate,vendorSupply:provider,identity};}
 const ui=ctx.UI.create({functions:D,contextBuilder:C,getSnapshot:snapshot,onAdopt(request){if(!accept)return false;const now=snapshot();assert.equal(request.expected.identity,identity);assert.equal(request.expected.ownerId,now.view.me.id);assert.equal(request.expected.cycle,g.cycle);
  assert.deepEqual(Object.keys(request).sort(),['expected','policy','proposalMandate']);D.validatePolicy(request.policy);adopted.push(request);policy=copy(request.policy);return true;},onError:message=>errors.push(message)});
 const nodes=new Map(),mount={innerHTML:'',querySelector:id=>nodes.get(id)||null};
 function draw(){mount.innerHTML=ui.render();nodes.clear();
  for(const input of mount.innerHTML.matchAll(/<(input|button|select)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
   const id='#'+input[2],tag=input[0],n={value:tag.match(/value="([^"]*)"/)?.[1]||'',disabled:/\sdisabled(?:\s|>)/.test(tag),textContent:'',listeners:{},addEventListener(event,fn){this.listeners[event]=fn;}};
   if(input[1]==='select'){const body=mount.innerHTML.slice(input.index+tag.length).split('</select>')[0],options=[...body.matchAll(/<option\b([^>]*)>/g)],pick=options.find(x=>/ selected/.test(x[1]))||options[0];n.value=pick?.[1].match(/value="([^"]*)"/)?.[1]||'';}
   nodes.set(id,n);
  }
  nodes.set('#df-status',{textContent:''});ui.bind(mount);return mount.innerHTML;
 }
 // Controller-driven redraw uses a real DOM in production. Tests call draw()
 // after controller actions so each mock node is detached and rebuilt likewise.
 return {ui,g,plan,mandate,provider,errors,adopted,snapshot,draw,nodes,policy:()=>copy(policy),enable:x=>enabled=x,accept:x=>accept=x,reconnect:()=>identity={},seat:x=>{seat=x;},setPlan:q=>plan=q};
}
test('actual owner context, bounded table and one-function editor render without mutations',()=>{const h=harness(),before=JSON.stringify(h.g),draft=JSON.stringify(h.plan),html=h.draw();
 assert.match(html,/DEPARTMENT FUNCTIONS/);assert.match(html,/max-height:280px/);assert.match(html,/Inspect or edit one function/);assert.match(html,/remaining for facilities\/sales/);assert.match(html,/uncredited fractional-time hold/);
 for(const id of D.IDS)assert(html.includes(D.FUNCTIONS[id].name.replace(/&/g,'&amp;')));
 assert.equal((html.match(/id="df-vendor"/g)||[]).length,1);assert.equal(h.nodes.get('#df-adopt').disabled,true);
 assert.equal(JSON.stringify(h.g),before);assert.equal(JSON.stringify(h.plan),draft);assert.equal(h.g.players[0].departmentFunctions,undefined);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
test('manual edit must be previewed, explicitly adopted, and only emits function patch',()=>{const h=harness();h.draw();const before=JSON.stringify(h.g),draft=JSON.stringify(h.plan),policy=h.policy();policy.quotas.people.operations=1;
 assert.equal(h.ui.adopt(h.ui.token()),false);assert.equal(h.adopted.length,0);
 assert(h.ui.preview(policy,h.ui.token()));h.draw();assert.equal(h.nodes.get('#df-adopt').disabled,false);assert.equal(h.adopted.length,0);assert(h.ui.adopt(h.ui.token()));assert.equal(h.adopted.length,1);
 assert.equal(h.policy().quotas.people.operations,1);assert.equal(h.adopted[0].proposalMandate,null);assert.equal(JSON.stringify(h.g),before);assert.equal(JSON.stringify(h.plan),draft);
 assert.equal(h.g.players[0].accounting.accounts.emergencyDebt,0);assert.equal(h.g.players[0].submitted,null);
});
test('proposal review shows exact changes/costs, Cancel means no adoption',()=>{const h=harness({supply:2});h.mandate.maxVendorExpense=15000;h.draw();const before=JSON.stringify(h.snapshot()),draft=JSON.stringify(h.plan);
 assert(h.ui.prepare(h.mandate,h.ui.token()));const html=h.draw();assert.match(html,/Review proposed changes/);assert.match(html,/added vendor cost/);assert.match(html,/Adopt reviewed proposal/);assert.match(html,/Preview only/);
 assert.equal(h.adopted.length,0);assert(h.ui.cancel(h.ui.token()));h.draw();assert.equal(h.nodes.get('#df-adopt').disabled,true);assert.equal(h.adopted.length,0);assert.equal(JSON.stringify(h.snapshot()),before);assert.equal(JSON.stringify(h.plan),draft);
});
test('explicit proposal adoption revalidates real context and preserves full strategic draft',()=>{const h=harness({supply:2});h.mandate.maxVendorExpense=12000;h.draw();const draft=JSON.stringify(h.plan),game=JSON.stringify(h.g);
 assert(h.ui.prepare(h.mandate,h.ui.token()));h.draw();assert(h.ui.adopt(h.ui.token()));assert.equal(h.adopted.length,1);assert.deepEqual(copy(h.adopted[0].proposalMandate),h.mandate);
 assert.equal(JSON.stringify(h.g),game);assert.equal(JSON.stringify(h.plan),draft);assert(h.adopted[0].policy.quotas.relationships.business>0||h.adopted[0].policy.quotas.relationships.service>0);
});
test('vendor supply/cash and malformed staffing stay visibly blocked',()=>{const h=harness();h.draw();const unavailable=h.policy();unavailable.vendors.people=1;assert(h.ui.preview(unavailable,h.ui.token()));let html=h.draw();assert.match(html,/Finite vendor capacity/);assert.equal(h.nodes.get('#df-adopt').disabled,true);assert.equal(h.ui.adopt(h.ui.token()),false);
 h.ui.cancel(h.ui.token());h.plan.departmentPolicy.reserve=10000000;h.provider.people=1;h.draw();const cost=h.policy();cost.vendors.people=1;assert(h.ui.preview(cost,h.ui.token()));html=h.draw();assert.match(html,/funded cash/);assert.equal(h.ui.adopt(h.ui.token()),false);
 const invalid=h.policy();invalid.quotas.people.operations=1.5;assert.equal(h.ui.preview(invalid,h.ui.token()),false);assert.equal(h.adopted.length,0);
});
test('engine proposal conflicts remain blocked without deleting manual choices',()=>{const h=harness();h.draw();const policy=h.policy();policy.quotas.relationships.business=7;assert(h.ui.preview(policy,h.ui.token()));h.draw();const m=copy(h.mandate);m.floorQuarters.business=2;
 assert(h.ui.prepare(m,h.ui.token()));const html=h.draw();assert.match(html,/protected floor/);assert.equal(h.nodes.get('#df-adopt').disabled,true);assert.equal(h.ui.adopt(h.ui.token()),false);assert.equal(h.adopted.length,0);
});
test('stale month, owner, book, draft, vendor, and connection snapshots cannot adopt',()=>{
 for(const alter of [h=>h.g.cycle++,h=>h.seat(1),h=>h.g.players[0].stats.compliance++,h=>h.plan.servicePolicy.staff=1,h=>h.provider.people=1,h=>h.reconnect()]){
  const h=harness();h.draw();assert(h.ui.prepare(h.mandate,h.ui.token()));h.draw();const token=h.ui.token();alter(h);assert.equal(h.ui.adopt(token),false);assert.equal(h.adopted.length,0);
 }
});
test('sealed/terminal views lock writes but permit inspection',()=>{for(const ended of [false,true]){const h=harness();if(ended)h.g.gameOver={reason:'fixture'};else h.g.players[0].submitted={};const html=h.draw();assert.match(html,/Instructions are locked/);assert.equal(h.nodes.get('#df-preview').disabled,true);assert.equal(h.nodes.get('#df-adopt').disabled,true);
 assert(h.ui.select('risk',h.ui.token()));h.draw();assert.equal(h.ui.prepare(h.mandate,h.ui.token()),false);assert.equal(h.ui.adopt(h.ui.token()),false);assert.equal(h.adopted.length,0);
}});
test('actual bound input handlers invalidate old quotes, reject blanks and require review before switching',()=>{const h=harness();h.draw();const policy=h.policy();assert(h.ui.preview(policy,h.ui.token()));h.draw();
 const input=h.nodes.get('#df-staff-service');input.value='1';input.listeners.input();assert.equal(h.nodes.get('#df-adopt').disabled,true);assert.match(h.nodes.get('#df-status').textContent,/Inputs changed/);
 assert.equal(h.ui.prepare(h.mandate,h.ui.token()),false);assert.equal(h.ui.select('people',h.ui.token()),false);assert.equal(h.ui.adopt(h.ui.token()),false);
 input.value='';h.nodes.get('#df-preview').listeners.click();assert.match(h.errors.at(-1),/blank is not zero/);assert.equal(h.adopted.length,0);
 assert(h.ui.cancel(h.ui.token()));h.draw();assert(h.ui.select('people',h.ui.token()));
});
test('actual bound preview and adopt handlers transfer only explicitly reviewed values',()=>{const h=harness();h.draw();const before=JSON.stringify(h.g),draft=JSON.stringify(h.plan),input=h.nodes.get('#df-staff-business');
 input.value='1';input.listeners.input();h.nodes.get('#df-preview').listeners.click();h.draw();assert.equal(h.nodes.get('#df-adopt').disabled,false);assert.equal(h.adopted.length,0);
 h.nodes.get('#df-adopt').listeners.click();h.draw();assert.equal(h.policy().quotas.relationships.business,1);assert.equal(h.adopted.length,1);assert.equal(h.nodes.get('#df-adopt').disabled,true);
 assert.equal(JSON.stringify(h.g),before);assert.equal(JSON.stringify(h.plan),draft);
});
test('overcommitted pool arithmetic is displayed honestly and cannot be adopted',()=>{const h=harness();h.draw();const policy=h.policy();policy.quotas.relationships.service=400;assert(h.ui.preview(policy,h.ui.token()));const html=h.draw();
 assert.match(html,/quarters overcommitted; no extra bankers/);assert.match(html,/hold = -\d+ remaining/);assert.equal(h.ui.adopt(h.ui.token()),false);assert.equal(h.adopted.length,0);
});
test('rejected adoption callback does not falsely announce acceptance',()=>{const h=harness();h.draw();h.ui.preview(h.policy(),h.ui.token());h.draw();h.accept(false);assert.equal(h.ui.adopt(h.ui.token()),false);assert.equal(h.adopted.length,0);assert.match(h.errors.at(-1),/did not accept/);});
test('owner text escapes, disabled feature hides without book initialization, and returned markup is credential-free',()=>{const h=harness();h.g.players[0].name='<img src=x onerror=alert(1)>';const html=h.draw();assert.match(html,/&lt;img/);assert(!html.includes('<img'));assert(!html.includes('PRIVATE_TEST_TOKEN'));
 h.enable(false);assert.equal(h.ui.render(),'');assert.equal(h.g.players[0].departmentFunctions,undefined);
});
console.log(JSON.stringify({suite:'experimental-department-functions-ui',checks,integrated:false,scope:'Actual assembled Group5 context, private candidate owner, pure markup and guarded injected adoption; no live feature, settlement, multiplayer or browser-layout claim.'}));
