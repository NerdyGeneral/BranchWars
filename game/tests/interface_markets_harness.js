'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness}=require('./github_resilience.test');
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
function mount(){
 let html='',nodes=[];const box={};
 Object.defineProperty(box,'innerHTML',{get:()=>html,set:value=>{html=String(value);nodes=[];
  for(const match of html.matchAll(/<(button|input|div)\b([^>]*)>/g)){
   const attributes=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])])),dataset={};
   for(const [k,v]of Object.entries(attributes))if(k.startsWith('data-'))dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;
   nodes.push({attributes,dataset,value:attributes.value||'',disabled:/ disabled/.test(match[2]),listeners:{},innerHTML:'',addEventListener(k,f){this.listeners[k]=f;},focus(){}});
  }
 }});
 const match=(el,s)=>s.startsWith('#')?el.attributes.id===s.slice(1):s.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/)?((m)=>Object.hasOwn(el.attributes,m[1])&&(m[2]===undefined||el.attributes[m[1]]===m[2]))(s.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/)):false;
 box.querySelectorAll=s=>nodes.filter(el=>match(el,s));box.querySelector=s=>box.querySelectorAll(s)[0]||null;return box;
}
function fresh({version=null,realRouter=false}={}){
 const h=harness();
 if(h.run('typeof renderInterfaceMarkets')==='undefined')h.run(fs.readFileSync(path.join(__dirname,'../src/ui/interface-markets.js'),'utf8'));
 h.c.imMount=mount();h.c.imMount.id='interfaceMarkets';h.elements.set('#interfaceMarkets',h.c.imMount);
 h.c.imVersion=version;h.c.imRealRouter=realRouter;
 h.run(`game=E.createGame({...(${version?'E.previewFeatureSelection({}, {field:"financialGroupVersion",value:imVersion})':'E.previewCampaignEdition({},"expanded",{currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true})'}).options,startingWorkforce:'covered',mode:'hotseat',seed:'interface-markets',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());draft.decision='b';
  messages=[];toast=s=>messages.push(s);renderReady=()=>{};imRoute={workspace:'markets',view:'overview',context:{market:draft.focus}};
  if(!imRealRouter){globalThis.openInterfaceWorkspace=(workspace,view,context)=>{imRoute={workspace,view,context};if(workspace==='markets')renderInterfaceMarkets(currentView(),imRoute,imMount);return true;};globalThis.interfaceNavigate=(item)=>{imRoute=item;return true;};}
  globalThis.interfaceSetLocation=()=>{};globalThis.requestAnimationFrame=fn=>fn();window.scrollTo=()=>{};globalThis.renderExpandedInterface=()=>{if(imRealRouter){interfaceIdentity(currentView());imRoute=interfaceCurrentRoute();}if(imRoute.workspace==='markets')renderInterfaceMarkets(currentView(),imRoute,imMount);};
  office=currentView().me.facilityNetwork.offices[0];renderInterfaceMarkets(currentView(),imRoute,imMount);`);
 h.go=(view,extra={})=>{h.c.testContext=extra;h.run(`openInterfaceWorkspace('markets',${JSON.stringify(view)},{market:office.market,office:office.id,...testContext})`);};
 h.click=action=>{const el=h.c.imMount.querySelector(`[data-im-action="${action}"]`);assert(el,'action '+action);el.listeners.click();};
 return h;
}

module.exports={fresh,mount};
