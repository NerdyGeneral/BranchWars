
'use strict';
const E=window.BWEngine,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function emptyLan(){return{active:false,room:'',token:'',after:0,outbox:[],busy:false,polling:false,failures:0,retryTimer:null}}
function emptyGh(){return{active:false,api:'',repo:'',branch:'',private:true,room:'',token:'',side:'',mine:0,published:0,seen:0,sha:'',etag:'',outbox:[],busy:false,sendFailures:0,pollFailures:0,retryTimer:null,cooldownUntil:0,lastWrite:0,lastContact:0,paused:false,polling:false}}

let mode='ai',game=null,view=null,seat=0,draft=null,draftOwner='',lastCycle=0,lastResolutionId=0,privacyNext=null,pc=null,dc=null,p2pRole='',p2pConfig=null,storageWarned=false,lan=emptyLan(),handshakeTimer=null,handshakeTries=0,linkWatch=null,planAckTimer=null,linkText='',linkCls='warn',linkSession='',dropGrace=null,relinking=false,linkReady=false,lanIp='',gh=emptyGh(),ghPendingPlan=null,ghIncomingCommit=null;
let workspaceTab='overview';
// Lobby state belongs to the connection, never to simulation state or its RNG.
let lobby=null,lobbyPending=null,lobbyDirty=false,lobbySettingsDirty=false;
// Capability acknowledgements are connection-local, never saved campaign rules.
let featureConnectionGeneration=0,featurePeerCapabilities=null,featurePeerGeneration=-1,featurePeerFresh=false,featureChallenge='';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>{const v=Number(n)||0,a=Math.abs(v),sign=v<0?'−':'';return sign+'$'+(a>=1e6?(a/1e6).toFixed(2)+'M':a>=1000?Math.round(a/1000)+'K':String(Math.round(a)))};
const integer=n=>Math.round(Number(n)||0).toLocaleString();
function toast(t){$('#toast').textContent=t;$('#toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').classList.add('hidden'),2600)}
function show(id){if(id!=='#gameScreen'&&typeof closeGameHelp==='function')closeGameHelp(false);['#startScreen','#connectScreen','#lobbyScreen','#gameScreen','#gameOver'].forEach(x=>$(x).classList.add('hidden'));$(id).classList.remove('hidden')}
function setStartMessage(t){$('#startMsg').textContent=t||''}
function setMode(next){mode=next;$$('.mode').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));$('#aiSetup').classList.toggle('hidden',mode!=='ai');$('#hotseatSetup').classList.toggle('hidden',mode!=='hotseat');$('#lanSetup').classList.toggle('hidden',mode!=='lan');$('#p2pSetup').classList.toggle('hidden',mode!=='p2p');$('#ghGuide').classList.toggle('hidden',mode!=='gh');$('#ghSetup').classList.toggle('hidden',mode!=='gh');setStartMessage('')}
