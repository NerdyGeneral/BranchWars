'use strict';
// Real browser clicks against the assembled client and real HTTP room server.
// A JSON-copy observation hook inspects state; it never stages game actions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createServer}=require('./multiplayer_server'),{assemble}=require('./build_game');
const out=path.resolve(process.env.BRANCH_WARS_CORE_BROWSER_REPORT_DIR||path.join(os.tmpdir(),'branchwars-core-browser-'+Date.now()));fs.mkdirSync(out,{recursive:true});
const assembled=assemble().html,html=assembled.replace('const E=window.BWEngine',`Object.defineProperty(window,'__coreMultiRead',{value:()=>JSON.parse(JSON.stringify({game,draft,view,seat,owner:draftOwner,room:coreMultiOnline.room,lobby:coreMultiOnline.lobby,online:coreMultiplayerOnlineActive()}))});const E=window.BWEngine`);
const receipt={htmlSha256:createHash('sha256').update(assembled).digest('hex'),scope:'Actual source browser controls, local private handoffs, current engine quotes, real HTTP room server, separate browser contexts, mobile layout and closed-tab seat recovery.',checks:[],screens:[],errors:[]};
let browser,server;
const read=(page,expression)=>page.evaluate(expression=>{const value=window.__coreMultiRead();return Function('s','return ('+expression+')')(value);},expression);
async function open(context,base){const page=await context.newPage();page.on('pageerror',error=>receipt.errors.push(error.message));await page.route(base+'/',route=>route.fulfill({status:200,contentType:'text/html',body:html}));await page.goto(base+'/');await page.locator('#cmStartLocal').waitFor({state:'visible'});return page;}
async function tab(page,key){await page.locator('[data-cm-tab="'+key+'"]').click();}
async function decision(page){await tab(page,'month');await page.locator('[data-cm-decision="b"]').click();}
async function screen(page,name){const file=path.join(out,name+'.png');await page.screenshot({path:file,fullPage:true});receipt.screens.push(file);}
async function loseReplyAndRetry(page,routeUrl,button){
 await page.route(routeUrl,async route=>{const response=await route.fetch();assert.equal(response.status(),201);await route.abort('connectionreset');},{times:1});
 await page.locator(button).click();await page.waitForFunction(()=>document.querySelector('#cmSetupStatus').textContent.includes('Retry connection'));
 await page.reload();await page.locator('#cmRetryConnection').waitFor({state:'visible'});await page.locator('#cmRetryConnection').click();await page.locator('#cmLobbyReady').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('branchWarsCorePending')),null);
}
(async()=>{
 try{
  server=createServer({dataDir:path.join(out,'private-test-rooms')});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});
  const localContext=await browser.newContext({viewport:{width:1440,height:1000}}),local=await open(localContext,base);
  assert((await local.locator('#cmScenarioChoice option').allTextContents()).every(Boolean));
  await local.locator('#cmBankType1').selectOption('human');await local.locator('#cmBankName0').fill('Local Harbor Bank');await local.locator('#cmBankName1').fill('Local Valley Bank');await local.locator('#cmStartLocal').click();await local.locator('#privacyContinue').click();
  assert.equal(await read(local,'s.game.players.length'),4);assert.equal(await read(local,'Object.keys(s.game.territories).length'),24);assert.equal(await read(local,'s.game.version'),'10.1');
  await decision(local);await tab(local,'bank');await local.locator('#cmHires').fill('1');await local.locator('#cmHires').dispatchEvent('change');await tab(local,'research');await local.locator('#cmResearchAmount').fill('1000');await local.locator('#cmResearchAmount').dispatchEvent('change');assert.equal(await read(local,'s.draft.hires'),1);assert.equal(await read(local,'Object.values(s.draft.investments)[0]'),1000);
  await tab(local,'markets');assert.equal(await local.locator('[data-cm-market]').count(),24);await local.locator('[data-cm-market="east_haven"]').click();await local.locator('[data-cm-focus]').click();assert.equal(await read(local,'s.draft.focus'),'east_haven');await screen(local,'continental-map-desktop');
  await local.locator('#cmHandoff').click();assert.equal(await local.locator('.shell').evaluate(node=>node.inert),true);await local.locator('#privacyContinue').click();assert.equal(await read(local,'s.seat'),1);assert.equal(await read(local,'s.draft.hires'),0);await local.locator('#cmHandoff').click();await local.locator('#privacyContinue').click();assert.equal(await read(local,'s.seat'),0);assert.equal(await read(local,'s.draft.hires'),1);assert.equal(await read(local,'s.draft.focus'),'east_haven');
  await local.locator('#cmReady').click();await local.locator('#privacyContinue').click();await decision(local);await local.locator('#cmReady').click();await local.locator('#privacyContinue').click();assert.equal(await read(local,'s.game.cycle'),2);receipt.checks.push('Four-bank local campaign: 24 markets, explicit decision, hiring/research/focus, private covered handoff retaining each owner draft, two human submissions and two AI submissions resolve exactly once.');
  await tab(local,'bank');assert(await local.getByRole('heading',{name:'Private financial books',exact:true}).isVisible());await screen(local,'bank-finances-desktop');await local.setViewportSize({width:390,height:844});assert.equal(await local.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await screen(local,'bank-finances-mobile');await tab(local,'markets');assert.equal(await local.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await screen(local,'continental-map-mobile');await localContext.close();
  const hostContext=await browser.newContext({viewport:{width:1360,height:950}}),guestContext=await browser.newContext({viewport:{width:1360,height:950}}),thirdContext=await browser.newContext({viewport:{width:1360,height:950}}),fourthContext=await browser.newContext({viewport:{width:1360,height:950}});
  const host=await open(hostContext,base),guest=await open(guestContext,base),third=await open(thirdContext,base),fourth=await open(fourthContext,base);
  for(const slot of [1,2,3])await host.locator('#cmBankType'+slot).selectOption('human');await host.locator('#cmBankName0').fill('Online Harbor Bank');await loseReplyAndRetry(host,base+'/api/multiplayer/rooms','#cmCreateRoom');const room=await read(host,'s.room');
  assert.equal(fs.readdirSync(path.join(out,'private-test-rooms')).filter(name=>name.endsWith('.json')).length,1,'retry must not create a second room');
  for(const [page,name]of [[guest,'Online Valley Bank'],[third,'Online Peak Bank'],[fourth,'Online Cedar Bank']]){await page.locator('#cmBankName0').fill(name);await page.locator('#cmRoomCode').fill(room);if(page===guest)await loseReplyAndRetry(page,base+'/api/multiplayer/rooms/'+room+'/join','#cmJoinRoom');else{await page.locator('#cmJoinRoom').click();await page.locator('#cmLobbyReady').waitFor({state:'visible'});}}
  assert.equal(await read(host,'s.lobby.players[0].name'),'Online Harbor Bank');assert.equal(await read(guest,'s.lobby.players[1].name'),'Online Valley Bank');
  receipt.checks.push('Initial create and join replies dropped after actual server mutation: browser reload and Retry connection recover the original room/seat without duplicate rooms or stranded banks.');
  for(const page of [guest,third,fourth]){await page.locator('#cmLobbyRefresh').click();await page.locator('#cmLobbyReady').click();}
  await host.locator('#cmLobbyRefresh').click();await host.locator('#cmLobbyReady').click();await host.locator('#cmLobbyStart').click();await host.locator('#cmReady').waitFor({state:'visible'});for(const page of [guest,third,fourth])await page.locator('#cmLobbyRefresh').click();
  for(let poll=0;poll<2;poll++)await host.waitForResponse(response=>response.request().method()==='GET'&&response.url()===base+'/api/multiplayer/rooms/'+room);
  await decision(host);await tab(host,'bank');await host.locator('#cmHires').fill('1');await host.locator('#cmHires').dispatchEvent('change');await host.locator('#cmReady').click();await host.waitForFunction(()=>window.__coreMultiRead().view?.me.submitted===true);assert.equal(await read(host,'s.view.me.submitted'),true);assert.equal(await read(guest,'s.view.me.submitted'),false);assert.equal(await read(guest,'s.view.banks.filter(b=>b.id!==s.view.me.id).some(b=>b.policies||b.submittedPlan||b.allocation)'),false);
  await decision(guest);await guest.locator('#cmReady').click();await guest.waitForFunction(()=>window.__coreMultiRead().view?.me.submitted===true);await decision(third);await third.locator('#cmReady').click();await third.waitForFunction(()=>window.__coreMultiRead().view?.me.submitted===true);await decision(fourth);await fourth.locator('#cmReady').click();await fourth.waitForFunction(()=>window.__coreMultiRead().view?.cycle===2);await host.waitForFunction(()=>window.__coreMultiRead().view?.cycle===2);await guest.waitForFunction(()=>window.__coreMultiRead().view?.cycle===2);await third.waitForFunction(()=>window.__coreMultiRead().view?.cycle===2);assert.equal(await read(fourth,'s.view.cycle'),2);
  await tab(host,'saves');await screen(host,'online-private-dashboard');
  await host.close();const reopened=await open(hostContext,base);await reopened.locator('#cmReconnectRoom').click();await reopened.locator('#cmReady').waitFor({state:'visible'});assert.equal(await read(reopened,'s.view.me.name'),'Online Harbor Bank');assert.equal(await read(reopened,'s.view.cycle'),2);
  receipt.checks.push('Real online room: four isolated human browser contexts, private projections and sealed readiness, exactly one month resolution, and remembered private seat survives closing and reopening its tab.');
  for(const context of [hostContext,guestContext,thirdContext,fourthContext])await context.close();assert.deepEqual(receipt.errors,[]);receipt.passed=true;
 }catch(error){receipt.passed=false;receipt.failure=error.stack;process.exitCode=1;
  if(browser)for(const [index,context]of browser.contexts().entries())for(const [pageIndex,page]of context.pages().entries())try{await screen(page,'failure-context-'+index+'-page-'+pageIndex);fs.writeFileSync(path.join(out,'failure-context-'+index+'-page-'+pageIndex+'.txt'),await page.locator('body').innerText());}catch(captureError){}
 }
 finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:receipt.passed,checks:receipt.checks,receipt:path.join(out,'receipt.json'),screens:receipt.screens,failure:receipt.failure}));}
})();
