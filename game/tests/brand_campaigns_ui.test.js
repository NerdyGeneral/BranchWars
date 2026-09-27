'use strict';
// Real source engine + controller, minimal DOM. Browser acceptance is separate.
if(!process.argv.includes('--portable')&&!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test.js');
function fresh(){const h=harness();h.run(`
 const originalFind=document.querySelector,decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 function decorate(selector){const el=originalFind(selector);if(el.decorated)return el;el.decorated=true;el.addEventListener=function(event,fn){this.listeners[event]=fn;};el.prepend=()=>{};el.querySelector=decorate;
  el.querySelectorAll=function(selector){const attr=selector.match(/^\\[([^=\\]]+)/)?.[1];if(!attr)return [];const out=[];for(const match of this.innerHTML.matchAll(/<(input|button)\\b[^>]*>/g)){const tag=match[0];if(!tag.includes(attr+'='))continue;const attrs=Object.fromEntries([...tag.matchAll(/([\\w-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])]));const node=decorate(attrs.id?'#'+attrs.id:'#generated-'+attr+'-'+attrs[attr]+'-'+(attrs['data-ips-value']||''));node.dataset={};for(const[k,v]of Object.entries(attrs))if(k.startsWith('data-'))node.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;node.value=attrs.value||'';node.disabled=/\\sdisabled(?:\\s|>)/.test(tag);out.push(node);}return out;};return el;
 }
 document.querySelector=decorate;document.createElement=()=>decorate('#created');
 game=E.createGame({...E.previewCampaignEdition({},'expanded',{currentEconomics:true,currentRivalry:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true}).options,mode:'hotseat',seed:'brand-ui',created:1});seat=0;p2pRole='';gh.active=false;newDraft(currentView());draft.decision='b';draft.hires=1;
 interfaceSetLocation=()=>{};renderReady=()=>{};toast=()=>{};let brandRoute={workspace:'strategy',view:'campaigns',context:{campaignType:'advertising'}};interfaceCurrentRoute=()=>brandRoute;
 function showBrand(kind='advertising'){brandRoute={workspace:'strategy',view:'campaigns',context:{campaignType:kind}};renderBrandCampaigns(currentView(),brandRoute,$('#brand'));}
 `);return h;}
function choose(h,path,value){const el=[...h.elements.values()].find(x=>x.dataset?.ipsChoice===path&&x.dataset.ipsValue===String(value));assert(el,path+' choice '+value);el.listeners.click();}
function input(h,path,value){const el=h.elements.get('#ips-field-'+path);assert(el);el.value=String(value);el.listeners.input();}
const add=h=>h.elements.get('#ipsAdd').listeners.click(),bytes=h=>h.run('JSON.stringify({game,draft})');
test('custom budget and presets quote without staging, then patch only regular advertising',()=>{
 const h=fresh();h.run('showBrand()');const before=bytes(h);choose(h,'mode','general');input(h,'budget',12345);assert.equal(bytes(h),before);assert.equal(h.run('interfacePeopleStrategyState.forms["brand-regular"].review.next.brandCampaignPolicy.regular.budget'),12345);
 choose(h,'budget',40000);assert.equal(h.elements.get('#ips-field-budget').value,'40000');assert.equal(h.run('interfacePeopleStrategyState.forms["brand-regular"].review.next.brandCampaignPolicy.regular.budget'),40000);add(h);assert.equal(h.run('draft.brandCampaignPolicy.regular.budget'),40000);assert.equal(h.run('draft.hires'),1);assert.equal(h.run('draft.brandCampaignPolicy.sponsorship.action'),'none');assert.equal(h.run('game.players[0].brandCampaigns.regular.budget'),0);
});
test('sponsorship displays fixed terms, stays working until added and preserves regular order',()=>{
 const h=fresh();h.run('draft.brandCampaignPolicy.regular={...draft.brandCampaignPolicy.regular,mode:"general",budget:12345};showBrand("sponsorship")');const before=bytes(h);choose(h,'action','start');choose(h,'package','burs');choose(h,'market','northside');assert.equal(bytes(h),before);assert.match(h.elements.get('.ips-inspector').innerHTML,/180,000/);assert.match(h.elements.get('#ipsQuote').innerHTML,/150,000/);add(h);assert.equal(h.run('draft.brandCampaignPolicy.sponsorship.market'),'downtown');assert.equal(h.run('draft.brandCampaignPolicy.regular.budget'),12345);assert.equal(h.run('draft.hires'),1);assert.equal(h.run('game.players[0].brandCampaigns.contract'),null);
});
test('invalid custom amounts retain working input and cannot stage',()=>{
 for(const value of ['',-1,1.5,250001]){const h=fresh();h.run('showBrand()');choose(h,'mode','general');input(h,'budget',value);const before=bytes(h);assert.equal(h.elements.get('#ipsAdd').disabled,true);add(h);assert.equal(bytes(h),before);assert.equal(h.run('String(interfacePeopleStrategyState.forms["brand-regular"].value.budget)'),String(value));}
});
test('working edits survive campaign switching and same-month guest refresh',()=>{
 const h=fresh();h.run('view=E.publicState(game,0);game=null;showBrand()');choose(h,'mode','general');input(h,'budget',12345);h.run('showBrand("sponsorship");view=JSON.parse(JSON.stringify(view));view.rival.submitted=true;showBrand()');assert.equal(h.elements.get('#ips-field-budget').value,'12345');assert.equal(h.run('draft.brandCampaignPolicy.regular.budget'),0);add(h);assert.equal(h.run('draft.brandCampaignPolicy.regular.budget'),12345);
});
test('locked, wrong-seat, stale draft, changed cycle, route and connection controls fail closed',()=>{
 for(const mutation of ['game.players[0].submitted={}','seat=1','draft.hires=2','game.cycle++','brandRoute={...brandRoute}','featureConnectionGeneration++']){const h=fresh();h.run('showBrand()');choose(h,'mode','general');input(h,'budget',12345);h.run(mutation);const before=bytes(h);add(h);assert.equal(bytes(h),before,mutation);}
});
test('owner pending campaign restores exactly and public team markup escapes text',()=>{
 const h=fresh();h.run('draft.brandCampaignPolicy.regular={...draft.brandCampaignPolicy.regular,mode:"general",budget:12345};draft.brandCampaignPolicy.sponsorship={action:"start",package:"burs",scope:"market",market:"downtown"};E.submit(game,0,draft);newDraft(E.publicState(game,0))');assert.equal(h.run('draft.brandCampaignPolicy.regular.budget'),12345);assert.equal(h.run('draft.brandCampaignPolicy.sponsorship.action'),'start');
 const markup=h.run('brandSponsorshipEvents({me:{name:"<script>bad</script>",sponsorshipEvents:[{package:"burs",text:"<img onerror=bad>",type:"start",cycle:1}]},rival:{sponsorshipEvents:[]}})');assert(!markup.includes('<script>'));assert(!markup.includes('<img onerror'));assert.match(markup,/&lt;img/);
});
