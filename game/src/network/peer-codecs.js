function pack(prefix,obj){return prefix+btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function resetFeaturePeer(){
 featureConnectionGeneration++;featurePeerCapabilities=null;featurePeerGeneration=-1;featurePeerFresh=false;featureChallenge='';
}
function currentFeatureSource(){return game||lobby&&lobby.settings||p2pConfig||{}}
function peerFeatureStatus(settings=currentFeatureSource()){
 const context=game&&settings===game?'game':'lobby',rules=E.campaignRules(settings,{context});
 if(!featurePeerCapabilities||featurePeerGeneration!==featureConnectionGeneration)return {compatible:false,pending:true,reason:'Waiting for the other computer to confirm supported campaign rules.'};
 const issue=E.peerRulesIssue(rules,featurePeerCapabilities);
 if(issue)return {compatible:false,pending:false,reason:issue.message,code:issue.code,status:issue.status};
 if(E.campaignNeedsFreshHandshake(rules.options)&&!featurePeerFresh)return {compatible:false,pending:true,reason:'Waiting for a fresh campaign-rules handshake from the other computer.'};
 return {compatible:true,pending:false,reason:''};
}
function challengePeerFeatures(){
 if(!featureChallenge)featureChallenge=String(featureConnectionGeneration)+'-'+(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2));
 send({type:'hello_request',featureChallenge});
}
function makeFeatureHello(request){
 const config=p2pConfig||{},hello={type:'hello',...E.campaignCapabilities(),color:config.color,name:config.guestName,doctrine:config.doctrine};
 if(request&&typeof request.featureChallenge==='string'&&request.featureChallenge.length>0&&request.featureChallenge.length<=100)hello.featureChallenge=request.featureChallenge;
 return hello;
}
function capturePeerFeatures(message){
 // A challenged reply from an earlier connection may not replace current support.
 if(message.featureChallenge!==undefined&&message.featureChallenge!==featureChallenge)return {...peerFeatureStatus(),ignored:true};
 const caps=Object.fromEntries(Object.keys(E.campaignCapabilities()).map(key=>[key,message[key]]));
 const same=featurePeerGeneration===featureConnectionGeneration&&JSON.stringify(caps)===JSON.stringify(featurePeerCapabilities);
 featurePeerCapabilities=caps;featurePeerGeneration=featureConnectionGeneration;
 featurePeerFresh=Boolean(featureChallenge&&message.featureChallenge===featureChallenge)||same&&featurePeerFresh;
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
