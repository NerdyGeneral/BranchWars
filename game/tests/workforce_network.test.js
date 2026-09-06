'use strict';
const assert = require('node:assert/strict');
const { harness } = require('./github_resilience.test.js');
const copy = x => JSON.parse(JSON.stringify(x));
const relationshipOffers = process.argv.includes('--relationship-offers');
const regionalGrowth = relationshipOffers || process.argv.includes('--regional-growth');
const advertising = regionalGrowth || process.argv.includes('--advertising');
const programmes = advertising || process.argv.includes('--product-programs');
const segments = programmes || process.argv.includes('--segment-deposits');
const collections = segments || process.argv.includes('--collections');
const households = collections || process.argv.includes('--households');
async function main() {
  let activeRelationshipOffers = 0, convertedRelationships = 0;
  if (relationshipOffers) {
    const setup = harness(), offers = setup.elements.get('#relationshipOffersPreview');
    for (const id of ['#regionalGrowthPreview','#advertisingPreview','#productPrograms','#segmentDeposits','#creditPerformance','#householdOwnership','#specialistWorkforce','#customerNeeds','#institutionManagement','#serviceExpansion','#rivalryPilot']) {
      offers.checked = true; offers.listeners.change();
      assert(setup.elements.get(id).checked, 'Relationship offers enables prerequisite ' + id);
      const dependency = setup.elements.get(id); dependency.checked = false; dependency.listeners.change();
      assert.equal(offers.checked, false, 'Disabling prerequisite disables relationship offers: ' + id);
    }
  }
  if (regionalGrowth) {
    const setup = harness(), growth = setup.elements.get('#regionalGrowthPreview');
    for (const id of ['#advertisingPreview','#productPrograms','#segmentDeposits','#creditPerformance','#householdOwnership','#specialistWorkforce','#customerNeeds','#institutionManagement','#serviceExpansion','#rivalryPilot']) {
      growth.checked = true; growth.listeners.change();
      assert(setup.elements.get(id).checked, 'Regional growth enables prerequisite ' + id);
      const dependency = setup.elements.get(id); dependency.checked = false; dependency.listeners.change();
      assert.equal(growth.checked, false, 'Disabling prerequisite disables regional growth: ' + id);
    }
  }
  for (const transport of ['gh', 'lan', 'p2p']) {
    const host = harness('host'), guest = harness('guest'), queue = [];
    for (const [i, peer] of [host, guest].entries()) {
      peer.c.enqueue = message => queue.push([i, copy(message)]);
      peer.run("game=null;view=null;send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'regional',scenario:'balanced'}");
      if (transport !== 'gh') peer.run("gh.active=false;lan={...emptyLan(),active:" + (transport === 'lan') + "}");
    }
    host.run('Object.assign(p2pConfig,{workforceVersion:1,campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2})');
    if(households)host.run('p2pConfig.customerOwnershipVersion=1');
    if(relationshipOffers)host.run('p2pConfig.relationshipOffersVersion=1');
    if(regionalGrowth)host.run('p2pConfig.regionalGrowthVersion=1');
    if(advertising)host.run('p2pConfig.advertisingVersion=1');
    if(programmes)host.run('p2pConfig.productProgramsVersion=1');
    if(segments)host.run('p2pConfig.segmentDepositsVersion=1');
    if(collections)host.run('p2pConfig.creditPerformanceVersion=1');
    const drain = async () => {
      for (let n = 0; queue.length; n++) { assert(n < 60); const [i, frame] = queue.shift(), receiver = i ? host : guest; receiver.c.frame = frame; await receiver.run('handleMessage(frame)'); }
    };
    await host.run("handleMessage({type:'hello',lobbySupported:1,pilotSupported:11,managementSupported:1,relationshipSupported:1,customerDemandSupported:2,name:'Old guest',color:'#8642bc'})");
    assert.equal(host.state().game, null); assert.equal(host.state().lobby, null);
    assert(queue.some(([, m]) => m.type === 'error' && (relationshipOffers?/Relationship offers/:regionalGrowth?/Regional growth/:advertising?/Advertising/:programmes?/Product programmes/:segments?/Segment deposits/:collections?/Credit performance/:households?/Household ownership/:/Specialist workforce/).test(m.message))); queue.length = 0;
    if (relationshipOffers) {
      await host.run("handleMessage({type:'hello',lobbySupported:1,pilotSupported:11,managementSupported:1,relationshipSupported:1,customerDemandSupported:2,regionalGrowthSupported:1,advertisingSupported:1,productProgramsSupported:1,segmentDepositsSupported:1,creditPerformanceSupported:1,customerOwnershipSupported:1,workforceSupported:1,name:'Version 8.11 guest',color:'#8642bc'})");
      assert.equal(host.state().lobby, null);
      assert(queue.some(([, m]) => m.type === 'error' && /Relationship offers/.test(m.message))); queue.length = 0;
    }
    if (regionalGrowth && !relationshipOffers) {
      await host.run("handleMessage({type:'hello',lobbySupported:1,pilotSupported:11,managementSupported:1,relationshipSupported:1,customerDemandSupported:2,advertisingSupported:1,productProgramsSupported:1,segmentDepositsSupported:1,creditPerformanceSupported:1,customerOwnershipSupported:1,workforceSupported:1,name:'Version 8.10 guest',color:'#8642bc'})");
      assert.equal(host.state().lobby, null);
      assert(queue.some(([, m]) => m.type === 'error' && /Regional growth/.test(m.message))); queue.length = 0;
    }
    await guest.run("handleMessage({type:'hello_request'})"); await drain();
    assert.equal(guest.state().lobby.settings.workforceVersion, 1);
    assert(guest.elements.get('#lobbyRules').textContent.includes('Specialist workforce'));
    host.run('editLobbyIdentity(true)'); await drain(); guest.run('editLobbyIdentity(true)'); await drain();
    host.run('startLobbyCampaign()'); await drain();
    assert.equal(host.state().game.version, relationshipOffers?'8.12':regionalGrowth?'8.11':advertising?'8.10':programmes?'8.9':segments?'8.8':collections?'8.7':households?'8.6':'8.5'); assert.equal(guest.state().view.workforceVersion, 1);
    assert.deepEqual(copy(host.state().game.players[1].workforce), copy(guest.state().view.me.workforce));
    if(relationshipOffers){assert.equal(guest.state().lobby.settings.relationshipOffersVersion,1);assert(guest.elements.get('#lobbyRules').textContent.includes('Relationship offers'));assert.equal(guest.state().view.relationshipOffersVersion,1);assert.deepEqual(copy(guest.state().view.me.relationshipOffers),copy(host.state().game.players[1].relationshipOffers));assert.equal(guest.state().view.rival.relationshipOffers,undefined);}
    if(regionalGrowth){assert.equal(guest.state().lobby.settings.regionalGrowthVersion,1);assert(guest.elements.get('#lobbyRules').textContent.includes('Regional growth'));assert.equal(guest.state().view.regionalGrowthVersion,1);assert.equal(host.state().game.regionalGrowth.lastCycle,0);}
    if(households){assert.equal(guest.state().lobby.settings.customerOwnershipVersion,1);assert.equal(guest.state().view.customerOwnershipVersion,1)}
    if(advertising){assert.equal(guest.state().lobby.settings.advertisingVersion,1);assert(guest.elements.get('#lobbyRules').textContent.includes('Advertising'));assert.equal(guest.state().view.advertisingVersion,1);assert(guest.state().view.me.advertising);assert.equal(guest.state().view.rival.advertising,undefined);}
    if(programmes){assert.equal(guest.state().view.productProgramsVersion,1);assert(guest.state().view.me.productPrograms);assert.equal(guest.state().view.rival.productPrograms,undefined);}
    if(segments){assert.equal(guest.state().view.segmentDepositsVersion,1);assert(guest.state().view.me.segmentDeposits);assert.equal(guest.state().view.me.marketSnapshot.markets.downtown.segmentDeposits.total,undefined)}
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
        if(programmes){
          plan.productProgramPolicy=copy(host.run('E.productProgramPolicy(game.players[nextSeat])'));
          if(month===0)plan.newProjects=['licenseRewards'];
          if(month===1)plan.productProgramPolicy.markets.downtown.connected={essential:0,rewards:4,highYield:0};
          if(month===2){plan.productProgramPolicy.retire=['rewards'];plan.productProgramPolicy.markets.downtown.connected={essential:4,rewards:0,highYield:0};}
        }
        if(relationshipOffers)plan.relationshipOfferPolicy=month===0?copy(host.run('game.players[nextSeat].relationshipOffers.policy')):{market:'downtown',segment:'connected',product:'rewards',share:25};
        if(advertising)plan.advertisingPolicy={market:plan.focus,segment:'everyday',product:'essential',budget:15000};
        if(households)plan.householdPolicy={retention:50,priority:{everyday:2,connected:1,reserve:1}};
        if(collections)plan.collectionsPolicy={share:50,approach:'workout'};
        if (seat === 0) { host.c.plan = plan; host.run('E.submit(game,0,plan);syncPeers()'); }
        else { guest.c.plan = plan; guest.run("send({type:'plan',plan})"); }
        await drain();
      }
      host.run('E.validatePilot(game);E.validateLedger(game)');
      if (relationshipOffers) {
        assert.deepEqual(copy(guest.state().view.me.relationshipOffers),copy(host.state().game.players[1].relationshipOffers));
        assert.equal(guest.state().view.rival.relationshipOffers,undefined);
        assert.doesNotMatch(JSON.stringify([guest.state().view.resolution,guest.state().view.log]), /Existing-customer offers switched|relationshipOffer(?:Cost|Converted|Principal|RunRateDelta|Policy)/i, 'public resolution and log do not disclose exact private offer results');
        assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].relationshipOfferPolicy,undefined);
        for (const p of host.state().game.players) {
          assert.equal(p.relationshipOffers.lastCycle,month+1);assert.equal(p.relationshipOffers.report.cycle,month+1);
          if(month===1){assert.equal(p.relationshipOffers.policy.share,25);activeRelationshipOffers++;convertedRelationships+=p.relationshipOffers.report.converted;}
          if(month===2)assert.equal(p.relationshipOffers.policy.share,0,'retirement pauses the standing relationship offer');
        }
      }
      if (regionalGrowth) {
        assert.equal(host.state().game.regionalGrowth.lastCycle, month + 1);
        assert.deepEqual(copy(guest.state().view.regionalGrowth), copy(host.run('E.publicState(game,1).regionalGrowth')));
        assert.equal(Object.keys(guest.state().view.regionalGrowth).sort().join(','), 'forecast,lastCycle,report,version', 'public regional flow omits opening books, cumulative segment totals and private carry');
      }
      assert.deepEqual(copy(guest.state().view.me.workforce), copy(host.state().game.players[1].workforce));
      assert.equal(guest.state().view.rival.workforce, undefined);
      if(households){assert.deepEqual(copy(guest.state().view.me.householdBook),copy(host.state().game.players[1].householdBook));assert.equal(guest.state().view.rival.householdBook,undefined);assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].householdPolicy,undefined)}
      assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].specialistHires, undefined);
      if(programmes){assert.deepEqual(copy(guest.state().view.me.productPrograms),copy(host.state().game.players[1].productPrograms));assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].productProgramPolicy,undefined);}
      if(advertising){
        assert.deepEqual(copy(guest.state().view.me.advertising),copy(host.state().game.players[1].advertising));
        assert.equal(guest.state().view.rival.advertising,undefined);
        assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].advertisingPolicy,undefined);
        for(const p of host.state().game.players){assert.equal(p.advertising.report.requested,15000);assert.equal(p.advertising.report.spent,15000);}
      }
      if(collections){assert.deepEqual(copy(guest.state().view.me.creditPerformance),copy(host.state().game.players[1].creditPerformance));assert.equal(guest.state().view.rival.creditPerformance,undefined);assert.equal(guest.state().view.lastPlans[host.state().game.players[0].id].collectionsPolicy,undefined)}
    }
    assert.equal(guest.state().view.me.workforce.departments.service.count, 1);
    assert(guest.state().view.me.workforce.departments.service.skill > 20);
  }
  if(relationshipOffers){assert(activeRelationshipOffers>0);assert(convertedRelationships>0,'active relationship offers must convert eligible relationships');}
  console.log('Workforce network passed: all three lobby transports, old-peer refusal, token-free checkpoint, paid hires/training over LAN and Direct plans, owner-only state.'+(advertising?' Advertising adds three paid cycles per seat with exact private reports alongside product launch, targets and retirement.':'')+(regionalGrowth?' Regional growth preserves all prerequisite modes, rejects v8.10 guests, and publishes exact month-end public flow across transports.':'')+(relationshipOffers?' Relationship offers adds active local conversion, retirement pause and exact private owner reports.':''));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
