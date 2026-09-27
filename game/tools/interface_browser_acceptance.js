'use strict';
// Isolated Chromium UI acceptance. No file URL navigation, external requests,
// user browser profile or existing save storage. In-memory Storage is explicit:
// this runner checks interactions/export/import, not file-origin autosaving.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),out=process.env.BRANCH_WARS_INTERFACE_REPORT_DIR?path.resolve(process.env.BRANCH_WARS_INTERFACE_REPORT_DIR):path.join(root,'reports/local/interface-rebuild-20260927/browser');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
async function start(page,edition='expanded'){
 await page.evaluate(()=>{for(const key of ['localStorage','sessionStorage']){const store=new Map();Object.defineProperty(window,key,{configurable:true,value:{getItem:k=>store.get(String(k))??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(String(k)),clear:()=>store.clear(),key:i=>[...store.keys()][i]??null,get length(){return store.size;}}});}});
 await page.setContent(html,{waitUntil:'load'});
 if(edition==='expanded'){await page.getByRole('button',{name:'Expanded edition',exact:true}).click();await page.locator('#featureSelectionConfirm').click();}
 await page.locator('#aiName').fill('A Very Long International Bank Name');await page.locator('#startAi').click();
}
async function open(page,key){await page.locator('[data-interface-workspace="'+key+'"]').click();}
async function layout(page,label,receipt){
 const data=await page.evaluate(()=>({width:innerWidth,page:document.documentElement.scrollWidth,nestedAccordions:document.querySelectorAll('#expandedInterface details details').length,visibleAccordions:[...document.querySelectorAll('#expandedInterface details')].filter(el=>el.getClientRects().length).length,overflow:[...document.querySelectorAll('#expandedInterface button,#expandedInterface input,#expandedInterface select')].filter(el=>el.getClientRects().length).filter(el=>{const b=el.getBoundingClientRect();return b.right>innerWidth+2||b.left<-2;}).map(el=>el.id||el.textContent.slice(0,60))}));
 receipt.layouts.push({label,...data});assert(data.page<=data.width+2,label+' page overflow: '+data.page);assert.equal(data.nestedAccordions,0,label+' nested accordions');assert.deepEqual(data.overflow,[],label+' controls outside viewport');
}
async function run(){
 const receipt={started:new Date().toISOString(),htmlSha256:createHash('sha256').update(html).digest('hex'),scope:'Generated game HTML in isolated Chromium; in-memory browser storage; all network blocked',errors:[],layouts:[],screens:[],routes:[],checks:[]};
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});await context.route('**/*',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>receipt.errors.push(e.stack));await start(page);
  assert(await page.locator('#interfaceHeader').innerText().then(t=>t.includes('Available to spend')));receipt.checks.push('Expanded starts through real setup UI with authoritative header');
  for(const workspace of ['markets','banking','people','strategy','group','reports']){
   await open(page,workspace);const mount=page.locator('#interface'+workspace[0].toUpperCase()+workspace.slice(1));
   const tabs=await mount.locator('.finance-view-nav button,[data-ips-view]').allTextContents();
   for(const name of tabs){await mount.getByRole('button',{name,exact:true}).first().click();receipt.routes.push(workspace+' / '+name);if(['banking','group'].includes(workspace))assert(await mount.locator('.finance-inspector').isVisible(),workspace+' '+name+' has visible inspector');await layout(page,workspace+' / '+name,receipt);}
   if(workspace==='reports'){
    const names=await mount.locator('[data-ips-item]').allTextContents();for(const name of names){await open(page,'reports');await page.locator('#interfaceReports [data-ips-item]').filter({hasText:name}).first().click();receipt.routes.push('reports / '+name);await layout(page,'reports / '+name,receipt);}
   }
  }
  await open(page,'month');await page.locator('[data-interface-month="announcements"]').click();await page.locator('#announcementText').fill('Our bank officially has the best biscuits.');await page.getByRole('button',{name:'Shareholders',exact:true}).click();await page.locator('#announcementPreview').click();await open(page,'markets');await open(page,'month');await page.locator('[data-interface-month="announcements"]').click();assert.equal(await page.locator('#announcementText').inputValue(),'Our bank officially has the best biscuits.');await page.locator('#announcementStage').click();receipt.checks.push('Announcement working text/preview survives navigation and explicit Add stages');
  await page.locator('[data-interface-month="decision"]').click();await page.locator('[data-interface-decision="b"]').click();await page.locator('#interfaceDecisionAdd').click();await page.locator('[data-interface-review]').click();assert(await page.locator('#interfaceReview').innerText().then(t=>t.includes('Bank announcement')));
  await page.locator('#interfaceReview [data-interface-edit]').first().click();assert(await page.locator('#interfaceReturnBar').innerText().then(t=>t.includes('Return')));await page.locator('#interfaceBack').click();await page.locator('#readyBtn').click();await page.locator('#resolutionContinue').click();assert(await page.locator('#interfaceHeader').innerText().then(t=>t.includes('Month 2')));await page.locator('[data-interface-month="events"]').click();assert.equal(await page.locator('#interfaceMonth').getByText('Our bank officially has the best biscuits.',{exact:false}).count(),1);receipt.checks.push('Ready resolves month; staged announcement published once at next events');
  for(let month=2;month<=3;month++){await open(page,'month');await page.locator('[data-interface-month="decision"]').click();await page.locator('[data-interface-decision="b"]').click();await page.locator('#interfaceDecisionAdd').click();await page.locator('[data-interface-review]').click();await page.locator('#readyBtn').click();await page.locator('#resolutionContinue').click();}receipt.checks.push('Three actual UI-submitted months resolve');
  await open(page,'utilities');const downloadWait=page.waitForEvent('download');await page.locator('#exportBtn').click();const download=await downloadWait,save=path.join(out,'browser-campaign.json');await download.saveAs(save);await page.locator('#exitBtn').click();await page.locator('#importFile').setInputFiles(save);assert(await page.locator('#interfaceHeader').innerText().then(t=>t.includes('Month 4')));receipt.checks.push('Exported and imported actual settled campaign through UI');
  for(const [width,height]of [[1920,1080],[1366,768],[1024,768],[480,900]]){
   await page.setViewportSize({width,height});for(const workspace of ['month','markets','banking','people','strategy','group','review']){
    if(workspace==='review')await page.locator('[data-interface-review]').click();else await open(page,workspace);
    await layout(page,workspace+' '+width+'x'+height,receipt);const name=workspace+'-'+width+'x'+height+'.png';await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,name),fullPage:true});receipt.screens.push(name);
   }
  }
  await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>{document.documentElement.style.zoom='1.25';});await open(page,'markets');await layout(page,'Markets CSS 125% zoom stress (not native browser zoom)',receipt);await page.screenshot({path:path.join(out,'markets-css125.png'),fullPage:true});receipt.screens.push('markets-css125.png');
  const core=await context.newPage();core.on('pageerror',e=>receipt.errors.push(e.stack));await start(core,'core');assert.equal(await core.locator('#expandedInterface').isVisible(),false);assert.equal(await core.locator('#gameScreen').isVisible(),true);receipt.checks.push('Core opens original functioning interface');
  assert.deepEqual(receipt.errors,[],'Unexpected browser errors');receipt.completed=new Date().toISOString();receipt.passed=true;
 }catch(error){receipt.failure=error.stack;throw error;}finally{fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));await browser.close();}
 console.log(JSON.stringify({passed:receipt.passed,checks:receipt.checks.length,routes:receipt.routes.length,layouts:receipt.layouts.length,screens:receipt.screens.length,receipt:path.join(out,'receipt.json')}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
