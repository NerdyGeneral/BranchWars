'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),page=fs.readFileSync(path.join(root,'src/page.html'),'utf8'),script=fs.readFileSync(path.join(root,'src/ui/operations-workspace.js'),'utf8'),draftScript=fs.readFileSync(path.join(root,'src/ui/draft.js'),'utf8');
const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'page IDs remain unique; no duplicate draft controls');
const groups={monthly:['eventName','eventText','decisionGrid','staffPool','staffGrid'],funding:['productPortfolio','portfolioBridge','depositPolicies','lendingPolicies','capitalPolicies'],projects:['activeProject','capitalAction','hiringPanel','projectGrid'],forecast:['operatingPreview']};
const operations=page.slice(page.indexOf('<section id="operationsWorkspace"'),page.indexOf('<div class="game-layout">'));
// Walk actual container nesting, rather than accepting mere text ordering.
const stack=[],mountGroups={};
for(const match of operations.matchAll(/<\/?[a-z][^>]*>/g)){
 const tag=match[0];if(tag.startsWith('</')){assert(stack.length,'balanced Operations containers');stack.pop();continue}
 const id=tag.match(/\bid="([^"]+)"/)?.[1],pane=tag.match(/\bdata-operations-panel="([^"]+)"/)?.[1];
 const group=pane||stack.at(-1)?.group||null;if(id)mountGroups[id]=group;if(!/^<(?:br|input|hr|img)\b/.test(tag))stack.push({group});
}
assert.equal(stack.length,0,'Operations markup has balanced containers');
for(const[key,mounts]of Object.entries(groups))for(const id of mounts){assert(ids.includes(id));assert.equal(mountGroups[id],key,id+' retained in intended desk')}
// Two desks over four sections: the executive call and staffing, products and
// pricing, and projects are one monthly submission, so one tab owns all three.
const desks={plan:['monthly','funding','projects'],forecast:['forecast']};
assert.equal((operations.match(/role="tab"/g)||[]).length,2);
assert.equal((operations.match(/role="tabpanel"/g)||[]).length,4);
for(const[desk,sections]of Object.entries(desks))for(const section of sections)
 assert(new RegExp('id="operationsPanel-'+section+'"[^>]*aria-labelledby="operationsTab-'+desk+'"').test(operations),section+' is labelled by the '+desk+' desk');
assert(operations.includes('id="operationsDecisionShortcut"'),'required executive decision has a persistent shortcut');
assert(!script.includes('innerHTML'),'navigation must not recreate module mounts');
function node(id,dataset={}){const attributes={},events={},classes=new Set();return {id,dataset,attributes,events,hidden:false,tabIndex:0,textContent:'',focusCount:0,setAttribute:(k,v)=>attributes[k]=v,focus(){this.focusCount++},addEventListener(k,fn){(events[k]||=[]).push(fn)},classList:{toggle(k,on){on?classes.add(k):classes.delete(k)},contains:k=>classes.has(k)},querySelector(){return null}}}
const elements=new Map(),buttons=Object.keys(desks).map(k=>node('operationsTab-'+k,{operationsTab:k})),panels=Object.keys(groups).map(k=>node('operationsPanel-'+k,{operationsPanel:k}));
for(const n of [...buttons,...panels,node('operationsWorkspace',{workspace:'operations'}),node('operationsDeskHint'),node('operationsDecisionShortcut'),node('decisionGrid'),node('gameScreen')])elements.set('#'+n.id,n);
const focusDecision=node('firstDecision');elements.get('#decisionGrid').querySelector=()=>focusDecision;
const mainTabs=['overview','operations','strategy'].map(k=>node('main-'+k,{workspaceTab:k})),workspaces=[elements.get('#operationsWorkspace'),node('strategy',{workspace:'strategy'})];
const frozenDraft=Object.freeze({decision:'a',investments:Object.freeze({digital:50000})}),frozenGame=Object.freeze({cycle:4});
const c={draftOwner:'bank-a',draft:frozenDraft,game:frozenGame,workspaceTab:'operations',$:s=>elements.get(s)||null,$$:s=>({'[data-operations-tab]':buttons,'[data-operations-panel]':panels,'[data-workspace-tab]':mainTabs,'[data-workspace]':workspaces}[s]||[])};
vm.createContext(c);vm.runInContext(script,c);
const run=s=>vm.runInContext(s,c),select=k=>run('setOperationsDesk('+JSON.stringify(k)+')');
const visible=()=>panels.filter(p=>!p.hidden).map(p=>p.dataset.operationsPanel);
run('reconcileOperationsWorkspace()');
assert.equal(run('operationsDesk'),'plan');assert.deepEqual(visible(),desks.plan,'the plan desk shows all three monthly sections');
for(const key of Object.keys(desks)){
 select(key);assert.deepEqual(visible(),desks[key]);
 assert.equal(buttons.filter(b=>b.attributes['aria-selected']==='true').length,1);assert.equal(buttons.find(b=>b.tabIndex===0).dataset.operationsTab,key);
 run('reconcileOperationsWorkspace()');assert.equal(run('operationsDesk'),key,'redraw retains desk');
 assert.equal(c.draft,frozenDraft);assert.equal(c.game,frozenGame,'navigation changes no engine or draft object');
}
// plan-review, facility-lifecycle, strategy and products still ask for the old desk
// names; each must land on the desk that now holds that section.
for(const old of desks.plan){select('forecast');select(old);assert.equal(run('operationsDesk'),'plan',old+' routes to the plan desk');assert.deepEqual(visible(),desks.plan)}
for(const b of buttons){assert.equal(b.events.click.length,1);assert.equal(b.events.keydown.length,1)}
let prevented=0;buttons[1].events.keydown[0]({key:'ArrowRight',preventDefault(){prevented++}});
assert.equal(run('operationsDesk'),'plan');assert.equal(buttons[0].focusCount,1);
buttons[0].events.keydown[0]({key:'End',preventDefault(){prevented++}});assert.equal(run('operationsDesk'),'forecast');
buttons[1].events.keydown[0]({key:'Home',preventDefault(){prevented++}});assert.equal(run('operationsDesk'),'plan');
buttons[0].events.keydown[0]({key:'ArrowLeft',preventDefault(){prevented++}});assert.equal(run('operationsDesk'),'forecast');
buttons[1].events.keydown[0]({key:'Tab',preventDefault(){prevented++}});assert.equal(run('operationsDesk'),'forecast','other keys are left to the browser');
assert.equal(prevented,4);
buttons[0].events.click[0]();assert.equal(run('operationsDesk'),'plan');
buttons[1].events.click[0]();assert.equal(run('operationsDesk'),'forecast');
elements.get('#operationsDecisionShortcut').events.click[0]();assert.equal(run('operationsDesk'),'plan');assert.equal(focusDecision.focusCount,1);
select('forecast');c.draftOwner='bank-b';run('reconcileOperationsWorkspace()');assert.equal(run('operationsDesk'),'plan','another hotseat bank does not inherit prior desk');
select('bogus');assert.equal(run('operationsDesk'),'plan');
// When the Products workspace owns pricing, the funding section leaves the plan desk
// and a request for it opens Products instead of an empty section.
const productSubjects=[];c.subjectWorkspace={productsEnabled:true};c.selectProductSubject=k=>productSubjects.push(k);
run('reconcileOperationsWorkspace()');assert.deepEqual(visible(),['monthly','projects']);
select('funding');assert.deepEqual(productSubjects,['policies']);
run('reconcileOperationsWorkspace()');assert.equal(run('operationsDesk'),'plan');assert.deepEqual(visible(),['monthly','projects']);
delete c.subjectWorkspace;delete c.selectProductSubject;run('reconcileOperationsWorkspace()');assert.deepEqual(visible(),desks.plan);
// Exercise the retained Core setWorkspaceTab integration. The real function
// projects a current view even for navigation; this isolated fixture supplies
// that read-only API contract without pretending to run the Expanded shell.
const coreView=Object.freeze({cycle:4,me:Object.freeze({id:'bank-b'})});
c.seat=0;c.E={publicState(g,s){assert.equal(g,frozenGame);assert.equal(s,0);return coreView;}};
vm.runInContext(draftScript,c);select('forecast');run("setWorkspaceTab('strategy');setWorkspaceTab('operations')");
assert.equal(run('operationsDesk'),'forecast','main-tab round trip retains the same owner desk');
assert(elements.get('#operationsWorkspace').classList.contains('active'));
assert.equal(c.draft,frozenDraft);assert.equal(c.game,frozenGame);
console.log('Core Operations workspace passed: unique preserved mounts, two task desks over four sections, old desk names, Products-owned pricing, exact nested grouping, keyboard/ARIA focus, single listener binding, required-decision shortcut, hotseat owner reset, draft purity and actual Core main-tab round trip. Expanded routing is covered by interface_shell and usability_navigation tests.');
