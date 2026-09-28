'use strict';
// Focused interaction and layout checks for the September 28 planning repairs.
// Isolated browser storage; no external network or user session.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),html=source.replace('const E=window.BWEngine',"window.__planningRead=()=>JSON.parse(JSON.stringify({game,draft,seat}));\nconst E=window.BWEngine");
const output=process.env.BRANCH_WARS_REPAIR_OUTPUT||'/tmp/branchwars-planning-review';fs.mkdirSync(output,{recursive:true});
async function start(page,expanded=false){
 await page.evaluate(()=>{for(const key of ['localStorage','sessionStorage']){const data=new Map();Object.defineProperty(window,key,{configurable:true,value:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear()}});}});
 await page.setContent(html,{waitUntil:'load'});
 if(expanded){await page.getByRole('button',{name:'Expanded edition',exact:true}).click();await page.locator('#featureSelectionConfirm').click();}
 await page.locator('#startAi').click();
}
async function run(){
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})}),receipt={generatedAt:new Date().toISOString(),portableSha256:crypto.createHash('sha256').update(source).digest('hex'),browser:browser.version(),scope:'Focused local interaction and viewport checks; isolated storage, blocked network, read-only draft snapshot hook. Not full release or multiplayer acceptance.',checks:[],layouts:[],errors:[]};
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',r=>r.abort());
  const page=await context.newPage();page.on('pageerror',e=>receipt.errors.push(e.message));page.setDefaultTimeout(10000);
  const screenshot=async name=>{await page.screenshot({path:path.join(output,name+'.png')});};
  const layout=async label=>{const q=await page.evaluate(()=>({width:innerWidth,page:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('button,input')].filter(x=>x.getClientRects().length&&x.closest('#expandedInterface')).filter(x=>{const r=x.getBoundingClientRect();return r.left< -2||r.right>innerWidth+2;}).map(x=>x.textContent.slice(0,45))}));receipt.layouts.push({label,...q});assert(q.page<=q.width+2,label+' page overflow');assert.deepEqual(q.overflow,[],label+' controls overflow');};
  await start(page);await page.locator('[data-workspace-tab="operations"]').click();await page.locator('#operationsTab-forecast').click();
  await page.locator('[data-forecast-view="income"]').click();assert.equal(await page.locator('#operatingPreview details:visible').count(),0);await screenshot('core-income');receipt.checks.push('Core topic reports have no disclosure boxes');
  await page.locator('#operationsTab-plan').click();assert.equal(await page.locator('#decisionGrid .decision-effect').count(),4);await page.locator('#decisionGrid').scrollIntoViewIfNeeded();await screenshot('core-decisions');await page.setViewportSize({width:390,height:844});await page.locator('#decisionGrid .decision-effect').first().scrollIntoViewIfNeeded();await layout('Core decisions mobile');await screenshot('core-decisions-mobile');await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-workspace-tab="strategy"]').click();await page.locator('[data-workspace-tab="operations"]').click();
  const world=await page.evaluate(()=>JSON.stringify(window.__planningRead().game));
  await page.locator('[data-hire="1"]').click();await page.locator('[data-workspace-tab="strategy"]').click();
  const expectedFunding=await page.evaluate(()=>{const {game,draft,seat}=window.__planningRead(),E=window.BWEngine,v=E.publicState(game,seat);return E.fundingStep(v.me,draft,'network',50000,v);});
  await page.locator('#fund-network-more').click();const after=await page.evaluate(()=>window.__planningRead());assert.equal(after.draft.investments.network,expectedFunding);assert.equal(after.draft.hires,1);assert.equal(JSON.stringify(after.game),world);receipt.checks.push('Core research accepts fresh funding after other spending');
  await start(page,true);const open=async key=>page.locator('[data-interface-workspace="'+key+'"]').click();
  await open('reports');await page.locator('[data-ips-item="commitments"]').click();assert(await page.locator('[data-ips-item="statements"]').isVisible());await page.locator('[data-ips-item="forecasts"]').click();receipt.checks.push('Spending report retains navigation to other reports');
  await open('people');await page.locator('[data-ips-employer="agency"]').click();assert.equal(await page.locator('#interfacePeople [data-ips-view]').count(),0);assert.equal(await page.locator('#interfacePeople input').count(),0);assert(await page.locator('.ips-locked').innerText().then(t=>t.includes('Locked')));receipt.checks.push('Locked employers show no staffing editors');
  await page.locator('[data-ips-employer="bank"]').click();await page.locator('[data-ips-view="coverage"]').click();assert.equal(await page.locator('.ips-coverage-card').count(),8);await screenshot('expanded-coverage');await layout('coverage desktop');
  await page.locator('[data-ips-item="people"]').click();const before=await page.evaluate(()=>JSON.stringify(window.__planningRead().draft));await page.locator('#ips-field-quotas-people-operations').fill('0.25');assert.equal(await page.evaluate(()=>JSON.stringify(window.__planningRead().draft)),before);await page.locator('#ipsAdd').click();assert.equal(await page.evaluate(()=>window.__planningRead().draft.departmentFunctionsPolicy.quotas.people.operations),1);receipt.checks.push('Quarter-month UI translates exactly and stages explicitly');
  await page.locator('[data-ips-view="leadership"]').click();assert(await page.locator('.ips-inspector').innerText().then(t=>t.includes('Department leadership')));await screenshot('expanded-leadership');await layout('leadership desktop');
  await open('markets');await page.locator('[data-im-view="build"]').first().click();assert.equal(await page.locator('.im-options [data-im-context]').count(),1);await screenshot('expanded-building');receipt.checks.push('Building starts with one branch and retains grouped office choices');await layout('build desktop');
  await page.setViewportSize({width:390,height:844});await open('people');await page.locator('[data-ips-view="coverage"]').click();await page.locator('[data-ips-item="overview"]').click();await layout('coverage mobile');await screenshot('expanded-coverage-mobile');
  await open('reports');await page.locator('[data-ips-item="commitments"]').click();assert(await page.locator('.ips-back').isVisible());await page.locator('.ips-back').click();assert(await page.locator('[data-ips-item="statements"]').isVisible());await layout('reports mobile');receipt.checks.push('Mobile report navigation and coverage fit the viewport');
  assert.deepEqual(receipt.errors,[]);receipt.passed=true;
 }catch(error){receipt.passed=false;receipt.failure=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser.close();console.log(JSON.stringify(receipt));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
