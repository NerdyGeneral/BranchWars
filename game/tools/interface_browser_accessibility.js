'use strict';
// Bounded keyboard/focus check in isolated Chromium. No file URL navigation,
// user profile, external traffic, or persistent browser storage is involved.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),out=process.env.BRANCH_WARS_INTERFACE_REPORT_DIR?path.resolve(process.env.BRANCH_WARS_INTERFACE_REPORT_DIR):path.join(root,'reports/local/interface-rebuild-20260927/browser');
const html=process.argv.includes('--source')?require('./build_game').assemble().html:fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
fs.mkdirSync(out,{recursive:true});
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function activate(page,locator){await locator.focus();await page.keyboard.press('Enter');await settle(page);}
async function main(){
 const receipt={started:new Date().toISOString(),htmlSha256:createHash('sha256').update(html).digest('hex'),scope:(process.argv.includes('--source')?'Source assembly':'Portable HTML')+'; isolated Chromium; keyboard events and actual focus/geometry; network blocked; in-memory storage',checks:[],errors:[],zoom:null};
 const browser=await chromium.launch({headless:true});
 const check=(label,pass,details={})=>receipt.checks.push({label,pass,...details});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});await context.route('**/*',route=>route.abort());
  const page=await context.newPage();page.on('pageerror',error=>receipt.errors.push(error.message));
  await page.evaluate(()=>{for(const key of ['localStorage','sessionStorage']){const store=new Map();Object.defineProperty(window,key,{configurable:true,value:{getItem:k=>store.get(String(k))??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(String(k)),clear:()=>store.clear(),key:i=>[...store.keys()][i]??null,get length(){return store.size;}}});}});
  await page.setContent(html,{waitUntil:'load'});await activate(page,page.getByRole('button',{name:'Expanded edition',exact:true}));await activate(page,page.locator('#featureSelectionConfirm'));
  await page.locator('#aiName').fill('The Long International Community Banking Group');await activate(page,page.locator('#startAi'));
  async function visibleFocus(label){
   await settle(page);const state=await page.evaluate(()=>{
    const el=document.activeElement,r=el?.getBoundingClientRect(),header=document.querySelector('#interfaceHeader'),h=header.getBoundingClientRect(),insideHeader=header.contains(el),x=r?Math.max(1,Math.min(innerWidth-1,r.left+r.width/2)):0,y=r?Math.max(1,Math.min(innerHeight-1,r.top+r.height/2)):0,hit=document.elementFromPoint(x,y);
    return {id:el?.id||'',tag:el?.tagName,text:el?.textContent?.trim().slice(0,70),top:r?.top,bottom:r?.bottom,headerBottom:h.bottom,insideHeader,connected:!!el?.isConnected,visible:!!r&&r.width>0&&r.height>0&&r.top>=-1&&r.bottom<=innerHeight+1&&r.left>=-1&&r.right<=innerWidth+1,uncovered:!!el&&(el===hit||el.contains(hit)),headerClear:insideHeader||r?.top>=h.bottom-1,outline:el?getComputedStyle(el).outlineStyle:null};
   });check(label,state.tag!=='BODY'&&state.connected&&state.visible&&state.uncovered&&state.headerClear,state);return state;
  }
  async function open(workspace){await activate(page,page.locator('[data-interface-workspace="'+workspace+'"]'));}
  for(const width of [1366,1024,480]){
   await page.setViewportSize({width,height:900});await settle(page);
   const measured=await page.evaluate(()=>({actual:document.querySelector('#interfaceHeader').getBoundingClientRect().height,declared:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--interface-header-height')),padding:parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)}));
   check('Dynamic long-name header spacing '+width,Math.abs(measured.actual-measured.declared)<1&&measured.padding>=measured.actual+15,measured);
   await open('markets');await activate(page,page.locator('.im-map-point[data-im-market="downtown"]'));check('Markets keyboard selection has local focus '+width,await page.locator('.im-inspector').evaluate(el=>el.contains(document.activeElement)));
   await visibleFocus('Markets selected inspector clears header '+width);
   await activate(page,page.locator('#interfaceMarkets [data-im-view="office"]').first());await activate(page,page.locator('#interfaceMarkets [data-im-view="maintenance"]').first());await activate(page,page.locator('#interfaceMarkets [data-im-value="basic"]').first());
   check('Markets local choice redraw keeps selected keyboard control '+width,await page.evaluate(()=>document.activeElement?.dataset.imValue==='basic'));await visibleFocus('Markets maintenance choice clears header '+width);
   await open('people');await activate(page,page.locator('[data-ips-view="leadership"]'));await activate(page,page.locator('[data-ips-item="limits"]'));
   check('People keyboard selection has local focus '+width,await page.locator('.ips-inspector').evaluate(el=>el.contains(document.activeElement)));
   const peopleFields=page.locator('#interfacePeople input:visible');assert(await peopleFields.count(),'People limits fields exist');
   await peopleFields.first().focus();await page.keyboard.press('Tab');await visibleFocus('People Tab reaches unobscured next field '+width);
   await page.keyboard.press('Shift+Tab');await visibleFocus('People reverse Tab reaches unobscured field '+width);
   await peopleFields.first().evaluate(el=>el.scrollIntoView({block:'start'}));await visibleFocus('People scroll alignment clears sticky header '+width);
   if(width===480){await activate(page,page.locator('#interfacePeople .ips-back:visible').first());check('People narrow Back restores list focus',await page.locator('#interfacePeople .ips-directory').evaluate(el=>el.contains(document.activeElement)));}
   await open('banking');await activate(page,page.locator('#interfaceBanking .finance-record').filter({hasText:'Essential'}).first());
   check('Banking keyboard selection has local focus '+width,await page.locator('.finance-inspector').evaluate(el=>el.contains(document.activeElement)));
   await activate(page,page.locator('#depositSales'));
   const bankField=page.locator('#interfaceBanking .finance-fields button:visible,#interfaceBanking .finance-fields input:visible').first();assert(await bankField.count(),'Banking form control exists');await bankField.focus();await page.keyboard.press('Tab');await visibleFocus('Banking Tab reaches unobscured control '+width);await page.keyboard.press('Shift+Tab');await visibleFocus('Banking reverse Tab reaches unobscured field '+width);
   await bankField.evaluate(el=>el.scrollIntoView({block:'start'}));await visibleFocus('Banking scroll alignment clears sticky header '+width);
   if(width===480){await activate(page,page.locator('#financeBackToRecords'));check('Banking narrow Back restores list focus',await page.locator('#interfaceBanking .finance-directory').evaluate(el=>el.contains(document.activeElement)));}
   await activate(page,page.locator('[data-interface-review]'));check('Header Review works from keyboard '+width,await page.locator('#interfaceReview').isVisible());
  }
  await page.setViewportSize({width:1366,height:900});const before=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio}));await page.keyboard.press('Control++');await settle(page);const after=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio}));
  receipt.zoom={nativeAttempt:'Control++',before,after,nativeChanged:before.width!==after.width||before.dpr!==after.dpr};await page.keyboard.press('Control+0');
  if(!receipt.zoom.nativeChanged){receipt.zoom.limitation='Headless Chromium did not apply native browser zoom; CSS 125% is only a layout stress check.';await page.evaluate(()=>{document.documentElement.style.zoom='1.25';});}
  await open('people');await activate(page,page.locator('[data-ips-view="leadership"]'));await activate(page,page.locator('[data-ips-item="limits"]'));const zoomField=page.locator('#interfacePeople input:visible').first();await zoomField.focus();await zoomField.evaluate(el=>el.scrollIntoView({block:'start'}));await visibleFocus(receipt.zoom.nativeChanged?'Native zoom focus':'CSS 125% focus stress');
  await page.screenshot({path:path.join(out,'keyboard-focus-css125.png'),fullPage:false});
  assert.deepEqual(receipt.errors,[],'Unexpected browser errors');const failed=receipt.checks.filter(x=>!x.pass);assert.equal(failed.length,0,failed.map(x=>x.label+' '+JSON.stringify(x)).join('\n'));receipt.passed=true;
 }catch(error){receipt.failure=error.stack;throw error;}finally{receipt.completed=new Date().toISOString();fs.writeFileSync(path.join(out,'keyboard-focus-receipt.json'),JSON.stringify(receipt,null,2));await browser.close();}
 console.log(JSON.stringify({passed:receipt.passed,checks:receipt.checks.length,zoom:receipt.zoom,receipt:path.join(out,'keyboard-focus-receipt.json')}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
