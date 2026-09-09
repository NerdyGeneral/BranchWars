function pack(prefix,obj){return prefix+btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
// Transport fences are deliberately transient: no save fields or engine RNG.
let peerTurnEnvelopeSupported=false,outgoingTurnContext=null,incomingTurnContext=null,turnContextGame=null;
let turnStateRevision=0,incomingTurnRevision=0,incomingTurnChallenge='',seenTurnChallenges=new Set();
let turnGuestChallenge='',peerTurnGuestChallenge='';
let hostStaffingEvidence=null;
function guestTurnChallenge(){
 if(!turnGuestChallenge)turnGuestChallenge=(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2));
 return turnGuestChallenge;
}
function getTurnContext(){
 if(!game)return null;
 if(turnContextGame!==game||!outgoingTurnContext||outgoingTurnContext.session!==featureChallenge||outgoingTurnContext.cycle!==game.cycle||outgoingTurnContext.resolutionId!==game.resolutionId){
  turnContextGame=game;
  outgoingTurnContext={version:1,cycle:game.cycle,resolutionId:game.resolutionId,session:featureChallenge,token:String(featureConnectionGeneration)+'-'+(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2))};
 }
 return {...outgoingTurnContext};
}
function turnMessage(type,extra={}){
 const v=currentView();
 requireDepartmentPeer(v);
 return {type,...extra,cycle:v.cycle,resolutionId:v.resolutionId,...(incomingTurnContext?{turnContext:{...incomingTurnContext}}:{})};
}
function validateTurnMessage(message){
 const context=message.turnContext;
 if(peerTurnEnvelopeSupported&&!context)throw Error('The turn confirmation is missing. Reconnect before submitting this plan.');
 if(message.cycle!==undefined&&message.cycle!==game.cycle)throw Error('That instruction belongs to a different month. Review the current plan.');
 if(message.resolutionId!==undefined&&message.resolutionId!==game.resolutionId)throw Error('That instruction belongs to an earlier resolution. Review the current plan.');
 if(context!==undefined){
  const expected=getTurnContext();
  if(!context||context.version!==1||context.cycle!==game.cycle||context.resolutionId!==game.resolutionId||
     message.cycle!==game.cycle||message.resolutionId!==game.resolutionId||context.session!==expected.session||context.token!==expected.token)
   throw Error('That instruction has an expired or invalid turn confirmation. Reconnect and review the current plan.');
 }
}
function receiveTurnContext(message){
 const c=message.turnContext;
 if(c===undefined){
  if(incomingTurnContext)throw Error('The host omitted its turn confirmation. Reconnect with matching game files.');
  return true;
 }
 if(!c||c.version!==1||c.cycle!==message.state.cycle||c.resolutionId!==message.state.resolutionId||typeof c.token!=='string'||c.token.length<4||c.token.length>100||!Number.isSafeInteger(c.revision)||c.revision<1||typeof c.session!=='string')
  throw Error('The host sent an invalid turn confirmation.');
 if(c.session!==incomingTurnChallenge)return false;
 if(c.revision<=incomingTurnRevision)return false;
 incomingTurnRevision=c.revision;
 incomingTurnContext={...c};
 return true;
}
function resetFeaturePeer(){
 featureConnectionGeneration++;featurePeerCapabilities=null;featurePeerGeneration=-1;featurePeerFresh=false;featureChallenge='';
 peerTurnEnvelopeSupported=false;outgoingTurnContext=null;incomingTurnContext=null;turnContextGame=null;
 turnStateRevision=0;incomingTurnRevision=0;incomingTurnChallenge='';seenTurnChallenges=new Set();
 ghPendingTurnToken=null;
 turnGuestChallenge='';peerTurnGuestChallenge='';
 hostStaffingEvidence=null;
}
function currentFeatureSource(){return game||lobby&&lobby.settings||p2pConfig||{}}
function departmentPeerStatus(settings=currentFeatureSource()){
 if(![6,7].includes(settings?.financialGroupVersion)&&!(p2pRole==='guest'&&hostStaffingEvidence?.required))return {compatible:true,pending:false,reason:''};
 if(p2pRole==='host')return peerFeatureStatus(settings);
 if(!hostStaffingEvidence||hostStaffingEvidence.generation!==featureConnectionGeneration||hostStaffingEvidence.challenge!==incomingTurnChallenge)
  return {compatible:false,pending:true,reason:'Waiting for a fresh department-staffing handshake from the host.'};
 if(hostStaffingEvidence.support!==2)return {compatible:false,pending:false,reason:'Department staffing requires matching updated game files on both computers. Update the host before playing.'};
 return {compatible:true,pending:false,reason:''};
}
function requireDepartmentPeer(settings){
 if(!['host','guest'].includes(p2pRole)||(!gh.active&&!lan.active&&!['p2p','lan'].includes(game?.mode)&&p2pRole!=='guest'))return;
 const status=departmentPeerStatus(settings);if(!status.compatible)throw Error(status.reason);
}
function receiveDepartmentPeer(settings){
 // A refused lobby is not adopted. Remember only its required handshake so a
 // reachable repository file cannot subsequently repaint this refusal green.
 if(p2pRole==='guest'){
  if(!hostStaffingEvidence&&[6,7].includes(settings?.financialGroupVersion))hostStaffingEvidence={generation:featureConnectionGeneration};
  if(hostStaffingEvidence)hostStaffingEvidence.required=[6,7].includes(settings?.financialGroupVersion);
 }
 const status=departmentPeerStatus(settings);
 if(status.compatible)return true;
 linkReady=false;setConnection(status.reason,status.pending?'warn':'bad');toast(status.reason);return false;
}
function peerFeatureStatus(settings=currentFeatureSource()){
 const context=game&&settings===game?'game':'lobby',rules=E.campaignRules(settings,{context});
 if(!featurePeerCapabilities||featurePeerGeneration!==featureConnectionGeneration)return {compatible:false,pending:true,reason:'Waiting for the other computer to confirm supported campaign rules.'};
 const issue=E.peerRulesIssue(rules,featurePeerCapabilities);
 if(issue)return {compatible:false,pending:false,reason:issue.message,code:issue.code,status:issue.status};
 if((peerTurnEnvelopeSupported||E.campaignNeedsFreshHandshake(rules.options))&&!featurePeerFresh)return {compatible:false,pending:true,reason:'Waiting for a fresh campaign-rules handshake from the other computer.'};
 return {compatible:true,pending:false,reason:''};
}
function challengePeerFeatures(){
 if(!featureChallenge)featureChallenge=String(featureConnectionGeneration)+'-'+(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2));
 send({type:'hello_request',featureChallenge,turnEnvelopeSupported:1,turnGuestChallenge:peerTurnGuestChallenge,financialGroupSupported:E.campaignCapabilities().financialGroupSupported,departmentStaffingSupported:E.campaignCapabilities().departmentStaffingSupported});
}
function makeFeatureHello(request){
 const config=p2pConfig||{},hello={type:'hello',...E.campaignCapabilities(),turnEnvelopeSupported:1,turnGuestChallenge:guestTurnChallenge(),color:config.color,name:config.guestName,doctrine:config.doctrine};
 // Released V2 hosts reject capabilities above their known maximum, even when
 // playing retained Group 1/2 rules. Advertise the legacy-compatible range until
 // the host explicitly requests the modern range. This never changes game rules.
 hello.financialGroupSupported=Math.min(hello.financialGroupSupported,
  Number.isInteger(request?.financialGroupSupported)&&request.financialGroupSupported>=3?request.financialGroupSupported:2);
 if(request&&typeof request.featureChallenge==='string'&&request.featureChallenge.length>0&&request.featureChallenge.length<=100){
  // A delayed host challenge cannot establish a new guest connection. Bootstrap
  // once with this connection's nonce; the host must echo it before state adoption.
  if(request.turnEnvelopeSupported===1&&request.turnGuestChallenge!==guestTurnChallenge())return hello;
  // Host evidence is accepted only with this connection's nonce, and is immutable
  // for an authenticated challenge. Legacy requests remain usable below Group 6.
  if(request.turnEnvelopeSupported===1&&request.turnGuestChallenge===guestTurnChallenge()&&!seenTurnChallenges.has(request.featureChallenge))
   hostStaffingEvidence={generation:featureConnectionGeneration,challenge:request.featureChallenge,support:request.departmentStaffingSupported,required:hostStaffingEvidence?.required===true};
  hello.featureChallenge=request.featureChallenge;
  if(!seenTurnChallenges.has(request.featureChallenge)){
   seenTurnChallenges.add(request.featureChallenge);incomingTurnChallenge=request.featureChallenge;incomingTurnRevision=0;incomingTurnContext=null;
  }
 }
 return hello;
}
function capturePeerFeatures(message){
 // A challenged reply from an earlier connection may not replace current support.
 if(message.featureChallenge!==undefined&&message.featureChallenge!==featureChallenge)return {...peerFeatureStatus(),ignored:true};
 // Connection capabilities are immutable once freshly challenged. A late
 // bootstrap retry must not replace the stronger reply with its V2 fallback.
 if(featurePeerFresh&&message.featureChallenge===undefined)return {...peerFeatureStatus(),ignored:true};
 if(message.turnEnvelopeSupported!==undefined&&message.turnEnvelopeSupported!==1)return {compatible:false,pending:false,reason:'The other computer uses an unsupported turn protocol.'};
 if(message.turnEnvelopeSupported===1){
  if(typeof message.turnGuestChallenge!=='string'||message.turnGuestChallenge.length<4||message.turnGuestChallenge.length>100)return {compatible:false,pending:false,reason:'The other computer sent an invalid connection confirmation.'};
  if(message.featureChallenge!==undefined&&peerTurnGuestChallenge!==message.turnGuestChallenge)return {...peerFeatureStatus(),ignored:true};
  peerTurnGuestChallenge=message.turnGuestChallenge;
 }
 // Never let an unsolicited retry downgrade an already observed modern peer.
 peerTurnEnvelopeSupported=peerTurnEnvelopeSupported||message.turnEnvelopeSupported===1;
 const caps=Object.fromEntries(Object.keys(E.campaignCapabilities()).map(key=>[key,message[key]]));
 const same=featurePeerGeneration===featureConnectionGeneration&&JSON.stringify(caps)===JSON.stringify(featurePeerCapabilities);
 if(featurePeerFresh&&!same)return {...peerFeatureStatus(),ignored:true};
 featurePeerCapabilities=caps;featurePeerGeneration=featureConnectionGeneration;
 featurePeerFresh=Boolean(featureChallenge&&message.featureChallenge===featureChallenge)||same&&featurePeerFresh;
 // A modern guest's unsolicited hello deliberately speaks V2. Ask once before
 // deciding Group 3 is unsupported; an actual V2 guest then replies 2 and fails.
 if(!featureChallenge&&message.featureChallenge===undefined&&
    [3,4,5,6,7].includes(currentFeatureSource().financialGroupVersion)&&caps.financialGroupSupported===2)
  return {compatible:false,pending:true,reason:'Confirming Financial Group support with the other computer.'};
 return peerFeatureStatus();
}
function validateIncomingFeatureRules(snapshot,context='view'){
 const rules=E.validateCampaignRules(snapshot,context);
 const issue=E.peerRulesIssue(rules,E.campaignCapabilities());
 if(issue)throw Error(issue.message);
 if(context==='view'){E.validateProductPricingView(snapshot);E.validateFinancialGroupView(snapshot);}
 return rules;
}
// Chat and mail add wrapping, quote markers, smart punctuation and zero-width characters.
function cleanCode(text){return String(text==null?'':text).replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[\u2010-\u2015\u2212]/g,'-').replace(/[\u201C\u201D\u2018\u2019]/g,'').replace(/^[>\s]+/gm,'').replace(/\s+/g,'')}
function decodeCode(body){const norm=body.replace(/-/g,'+').replace(/_/g,'/'),padded=norm+'='.repeat((4-norm.length%4)%4);let raw;try{raw=atob(padded)}catch{throw Error('That code is incomplete or was altered in transit. Copy the whole code again, including the BW7 prefix.')}try{return JSON.parse(decodeURIComponent(escape(raw)))}catch{throw Error('That code decoded but is not readable. It was probably truncated; ask for a freshly generated code.')}}
function unpack(text,prefix){const clean=cleanCode(text);if(!clean)throw Error(`Paste ${CODE_KINDS[prefix]} into this box first.`);
 // Accept the code wherever it sits in a pasted blob, and name the mix-up when the wrong kind arrives.
 const at=clean.indexOf(prefix);if(at<0){for(const[other,label]of Object.entries(CODE_KINDS))if(other!==prefix&&clean.includes(other))throw Error(`That is ${label}, not ${CODE_KINDS[prefix]}. It belongs in the other box.`);throw Error(`That does not contain ${CODE_KINDS[prefix]}. A valid code starts with ${prefix}`)}
 const body=clean.slice(at+prefix.length).replace(/[^A-Za-z0-9\-_]/g,'');if(body.length<24)throw Error('Only part of the code was pasted. Copy the entire block; it is long, and chat windows often select only the first line.');return decodeCode(body)}
// Resolve the moment gathering completes; otherwise settle once candidates stop arriving,
// so a stalled gatherer costs a second rather than the whole ceiling.
