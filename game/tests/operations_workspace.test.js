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
assert.equal((operations.match(/role="tab"/g)||[]).length,4);
assert.equal((operations.match(/role="tabpanel"/g)||[]).length,4);
assert(operations.includes('id="operationsDecisionShortcut"'),'required executive decision has a persistent shortcut');
assert(!script.includes('innerHTML'),'navigation must not recreate module mounts');
function node(id,dataset={}){const attributes={},events={},classes=new Set();return {id,dataset,attributes,events,hidden:false,tabIndex:0,textContent:'',focusCount:0,setAttribute:(k,v)=>attributes[k]=v,focus(){this.focusCount++},addEventListener(k,fn){(events[k]||=[]).push(fn)},classList:{toggle(k,on){on?classes.add(k):classes.delete(k)},contains:k=>classes.has(k)},querySelector(){return null}}}
const elements=new Map(),buttons=Object.keys(groups).map(k=>node('operationsTab-'+k,{operationsTab:k})),panels=Object.keys(groups).map(k=>node('operationsPanel-'+k,{operationsPanel:k}));
for(const n of [...buttons,...panels,node('operationsWorkspace',{workspace:'operations'}),node('operationsDeskHint'),node('operationsDecisionShortcut'),node('decisionGrid'),node('gameScreen')])elements.set('#'+n.id,n);
const focusDecision=node('firstDecision');elements.get('#decisionGrid').querySelector=()=>focusDecision;
const mainTabs=['overview','operations','strategy'].map(k=>node('main-'+k,{workspaceTab:k})),workspaces=[elements.get('#operationsWorkspace'),node('strategy',{workspace:'strategy'})];
const frozenDraft=Object.freeze({decision:'a',investments:Object.freeze({digital:50000})}),frozenGame=Object.freeze({cycle:4});
const c={draftOwner:'bank-a',draft:frozenDraft,game:frozenGame,workspaceTab:'operations',$:s=>elements.get(s)||null,$$:s=>({'[data-operations-tab]':buttons,'[data-operations-panel]':panels,'[data-workspace-tab]':mainTabs,'[data-workspace]':workspaces}[s]||[])};
vm.createContext(c);vm.runInContext(script,c);
const run=s=>vm.runInContext(s,c),select=k=>run('setOperationsDesk('+JSON.stringify(k)+')');
run('reconcileOperationsWorkspace()');
assert.equal(run('operationsDesk'),'monthly');
for(const key of Object.keys(groups)){
 select(key);assert.equal(panels.filter(p=>!p.hidden).length,1);assert.equal(panels.find(p=>!p.hidden).dataset.operationsPanel,key);
 assert.equal(buttons.filter(b=>b.attributes['aria-selected']==='true').length,1);assert.equal(buttons.find(b=>b.tabIndex===0).dataset.operationsTab,key);
 run('reconcileOperationsWorkspace()');assert.equal(run('operationsDesk'),key,'redraw retains desk');
 assert.equal(c.draft,frozenDraft);assert.equal(c.game,frozenGame,'navigation changes no engine or draft object');
}
for(const b of buttons){assert.equal(b.events.click.length,1);assert.equal(b.events.keydown.length,1)}
let prevented=0;buttons[3].events.keydown[0]({key:'ArrowRight',preventDefault(){prevented++}});
assert.equal(run('operationsDesk'),'monthly');assert.equal(buttons[0].focusCount,1);
buttons[0].events.keydown[0]({key:'End',preventDefault(){prevented++}});assert.equal(run('operationsDesk'),'forecast');
buttons[3].events.keydown[0]({key:'Home',preventDefault(){prevented++}});assert.equal(run('operationsDesk'),'monthly');
buttons[0].events.keydown[0]({key:'ArrowLeft',preventDefault(){prevented++}});assert.equal(run('operationsDesk'),'forecast');
assert.equal(prevented,4);
buttons[1].events.click[0]();assert.equal(run('operationsDesk'),'funding');
elements.get('#operationsDecisionShortcut').events.click[0]();assert.equal(run('operationsDesk'),'monthly');assert.equal(focusDecision.focusCount,1);
select('projects');c.draftOwner='bank-b';run('reconcileOperationsWorkspace()');assert.equal(run('operationsDesk'),'monthly','another hotseat bank does not inherit prior desk');
select('bogus');assert.equal(run('operationsDesk'),'monthly');
// Exercise the actual setWorkspaceTab integration without starting or mutating a campaign.
vm.runInContext(draftScript,c);select('forecast');run("setWorkspaceTab('strategy');setWorkspaceTab('operations')");
assert.equal(run('operationsDesk'),'forecast','main-tab round trip retains the same owner desk');
assert(elements.get('#operationsWorkspace').classList.contains('active'));
assert.equal(c.draft,frozenDraft);assert.equal(c.game,frozenGame);
console.log('Operations workspace passed: unique preserved mounts, four task desks, exact nested grouping, keyboard/ARIA focus, single listener binding, required-decision shortcut, hotseat owner reset, draft purity and actual main-tab round trip.');
