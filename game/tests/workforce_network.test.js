'use strict';
const assert = require('node:assert/strict');
const { harness } = require('./github_resilience.test.js');
const copy = x => JSON.parse(JSON.stringify(x));
const collections = process.argv.includes('--collections');
const households = collections || process.argv.includes('--households');
async function main() {
  for (const transport of ['gh', 'lan', 'p2p']) {
    const host = harness('host'), guest = harness('guest'), queue = [];
    for (const [i, peer] of [host, guest].entries()) {
      peer.c.enqueue = message => queue.push([i, copy(message)]);
      peer.run("game=null;view=null;send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'regional',scenario:'balanced'}");
      if (transport !== 'gh') peer.run("gh.active=false;lan={...emptyLan(),active:" + (transport === 'lan') + "}");
    }
    host.run('Object.assign(p2pConfig,{workforceVersion:1,campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2})');
    if(households)host.run('p2pConfig.customerOwnershipVersion=1');
    if(collections)host.run('p2pConfig.creditPerformanceVersion=1');
    const drain = async () => {
      for (let n = 0; queue.length; n++) { assert(n < 60); const [i, frame] = queue.shift(), receiver = i ? host : guest; receiver.c.frame = frame; await receiver.run('handleMessage(frame)'); }
    };
    await host.run("handleMessage({type:'hello',lobbySupported:1,pilotSupported:11,managementSupported:1,relationshipSupported:1,customerDemandSupported:2,name:'Old guest',color:'#8642bc'})");
    assert.equal(host.state().game, null); assert.equal(host.state().lobby, null);
    assert(queue.some(([, m]) => m.type === 'error' && (collections?/Credit performance/:households?/Household ownership/:/Specialist workforce/).test(m.message))); queue.length = 0;
    await guest.run("handleMessage({type:'hello_request'})"); await drain();
    assert.equal(guest.state().lobby.settings.workforceVersion, 1);
    assert(guest.elements.get('#lobbyRules').textContent.includes('Specialist workforce'));
    host.run('editLobbyIdentity(true)'); await drain(); guest.run('editLobbyIdentity(true)'); await drain();
    host.run('startLobbyCampaign()'); await drain();
    assert.equal(host.state().game.version, collections?'8.7':households?'8.6':'8.5'); assert.equal(guest.state().view.workforceVersion, 1);
    assert.deepEqual(copy(host.state().game.players[1].workforce), copy(guest.state().view.me.workforce));
    if(households){assert.equal(guest.state().lobby.settings.customerOwnershipVersion,1);assert.equal(guest.state().view.customerOwnershipVersion,1)}
    if(collections){assert.equal(guest.state().lobby.settings.creditPerformanceVersion,1);assert.equal(guest.state().view.creditPerformanceVersion,1)}
    if (transport === 'gh') {
      // The separate --workforce resilience run exercises actual sealed GitHub
      // commits/reveals, lost-write recovery and paid multi-turn workforce state.
      host.run('ghCheckpoint()');
      assert([...host.storage.values()].every(x => !String(x).includes('PRIVATE_TEST_TOKEN')));
      continue;
    }
    for (let month = 0; month < 3; month++) {
      for (const seat of [0, 1]) {
        host.c.nextSeat = seat;
        const plan = host.run("(()=>{const p=game.players[nextSeat];return {focus:p.focus,allocation:{...p.allocation},depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',products:{...p.products},newProjects:[],investments:{},hires:0,specialistHires:{service:game.cycle===1?1:0},workforcePolicy:{reserve:500000,training:{service:5000,business:0,lending:0,operations:0}},competitiveAction:'none',decision:'b'}})()");
        if(households)plan.householdPolicy={retention:50,priority:{everyday:2,connected:1,reserve:1}};
        if(collections)plan.collectionsPolicy={share:50,approach:'workout'};
        if (seat === 0) { host.c.plan = plan; host.run('E.submit(game,0,plan);syncPeers()'); }
        else { guest.c.plan = plan; guest.run("send({type:'plan',plan})"); }
        await drain();
      }
      host.run('E.validatePilot(game);E.validateLedger(game)');
      assert.deepEqual(copy(guest.state().view.me.workforce), copy(host.state().game.players[1].workforce));
      assert.equal(guest.state().view.rival.workforce, undefined);
      if(households){assert.deepEqual(copy(guest.state().view.me.householdBook),copy(host.state().game.players[1].householdBook));assert.equal(guest.state().view.rival.householdBook,undefined);assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].householdPolicy,undefined)}
      assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].specialistHires, undefined);
      if(collections){assert.deepEqual(copy(guest.state().view.me.creditPerformance),copy(host.state().game.players[1].creditPerformance));assert.equal(guest.state().view.rival.creditPerformance,undefined);assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].collectionsPolicy,undefined)}
    }
    assert.equal(guest.state().view.me.workforce.departments.service.count, 1);
    assert(guest.state().view.me.workforce.departments.service.skill > 20);
  }
  console.log('Workforce network passed: all three lobby transports, old-peer refusal, token-free checkpoint, paid hires/training over LAN and Direct plans, owner-only state.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
