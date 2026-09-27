// The editor is private to this owner/month; only Stage touches the shared
// monthly draft. Preview and results use the same engine-formatted plain text.
let announcementEditor={owner:null,campaign:null,cycle:null,resolution:null,stamp:null,audience:'public',text:'',review:null,notice:'',revision:0};
function resetAnnouncementEditor(){announcementEditor={...announcementEditor,owner:null,review:null,revision:announcementEditor.revision+1};}
function announcementEditorContext(v){return {campaign:presentationCampaignIdentity(v),attempt:connectionAttempt,connection:featureConnectionGeneration,link:linkSession,repository:gh,lan};}
function announcementEditorCurrent(v){return !!v&&draftOwner===v.me.id&&lastCycle===v.cycle&&announcementEditor.owner===v.me.id&&announcementEditor.cycle===v.cycle&&announcementEditor.resolution===v.resolutionId&&Object.entries(announcementEditorContext(v)).every(([key,value])=>announcementEditor[key]===value);}
function pendingAnnouncementEdits(v){
 if(!announcementEditorCurrent(v)||v.me.submitted||v.gameOver)return false;
 const staged=draft?.announcement,entered={audience:announcementEditor.audience,text:announcementEditor.text};
 return (Boolean(entered.text)||Boolean(staged))&&JSON.stringify(entered)!==JSON.stringify(staged||{audience:'public',text:''});
}
function announcementResolutionMarkup(v,text,index){
 const row=v.announcements?.[index];
 if(!row)return esc(text);
 const bank=[v.me,v.rival].find(p=>p.id===row.bankId);
 if(!bank||E.BankAnnouncements.format(bank,{audience:row.audience,text:row.text})!==text)return esc(text);
 const logo=typeof bankIdentityMarkup==='function'?bankIdentityMarkup(bank,{seat:bank===v.me?0:1,size:'small',showName:false}):'';
 return '<span class="bank-announcement-result">'+logo+'<span style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(text)+'</span></span>';
}
function renderBankAnnouncements(v){
 const mount=$('#bankAnnouncements');if(!mount||!draft)return;
 const expanded=typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v);
 const locked=Boolean(v.me.submitted||v.gameOver),staged=locked?(v.me.pendingAnnouncement??draft.announcement):draft.announcement,stamp=JSON.stringify(staged);
 if(!announcementEditorCurrent(v)||announcementEditor.stamp!==stamp){
  announcementEditor={...announcementEditorContext(v),owner:v.me.id,cycle:v.cycle,resolution:v.resolutionId,stamp,audience:staged?.audience||'public',text:staged?.text||'',review:null,notice:'',revision:announcementEditor.revision};
 }
 const revision=++announcementEditor.revision,disabled=locked?' disabled':'',state=announcementEditor;
 mount.innerHTML='<section class="financial-explanation" aria-labelledby="announcementTitle"><h2 id="announcementTitle">BANK ANNOUNCEMENTS</h2><p class="small">Send a joke or a statement to the public or your shareholders. Published statements appear first in the next round’s results for both players. They have no cost or gameplay effect.</p>'+ 
  '<p id="announcementStatus" class="small" role="status"></p><div id="announcementStaged" class="notice"'+(staged?'':' hidden')+' style="white-space:pre-wrap;overflow-wrap:anywhere"></div>'+ 
  (expanded?'<fieldset class="interface-announcement-audience"><legend>Audience</legend><input type="hidden" id="announcementAudience"><button type="button" class="btn" data-announcement-audience="public"'+disabled+'>Public</button><button type="button" class="btn" data-announcement-audience="shareholders"'+disabled+'>Shareholders</button></fieldset>':'<div class="row"><label for="announcementAudience">Audience <select id="announcementAudience"'+disabled+'><option value="public">Public</option><option value="shareholders">Shareholders</option></select></label></div>')+ 
  '<label for="announcementText">Your announcement</label><textarea id="announcementText" rows="3" aria-describedby="announcementCount announcementPrivacy" style="display:block;width:100%;box-sizing:border-box;resize:vertical"'+disabled+'></textarea>'+ 
  '<p id="announcementCount" class="micro"></p><p id="announcementPrivacy" class="micro">Private until both plans resolve. Preview checks your exact text; Stage adds it to this month’s plan. Mark Ready locks it with your other instructions.</p>'+ 
  '<div class="workbench-toolbar"><button type="button" class="btn" id="announcementPreview"'+disabled+'>Preview</button><button type="button" class="btn" id="announcementStage" disabled>Stage announcement</button><button type="button" class="btn" id="announcementEdit"'+(locked||!staged?' disabled':'')+'>Edit staged</button><button type="button" class="btn" id="announcementRemove"'+(locked||!staged?' disabled':'')+'>Remove announcement</button><button type="button" class="btn" id="announcementDiscard"'+disabled+'>Discard edits</button></div>'+ 
  '<div id="announcementExactPreview" class="notice" hidden style="white-space:pre-wrap;overflow-wrap:anywhere"></div></section>';
 $('#announcementAudience').value=state.audience;$('#announcementText').value=state.text;
 const current=()=>{const now=currentView();return announcementEditor.revision===revision&&announcementEditorCurrent(now)&&!now.me.submitted&&!now.gameOver?now:null;};
 const status=text=>{$('#announcementStatus').textContent=text;state.notice=text;};
 const count=()=>{$('#announcementCount').textContent=E.BankAnnouncements.length(state.text)+' / '+E.BankAnnouncements.MAX_CHARACTERS+' characters';};
 const read=()=>({audience:$('#announcementAudience').value,text:$('#announcementText').value});
 const invalidate=()=>{if(!current())return;Object.assign(state,read());state.review=null;$('#announcementStage').disabled=true;$('#announcementExactPreview').hidden=true;status('Unstaged edits. Preview, then Stage to include this message.');count();};
 count();
 if(staged)$('#announcementStaged').textContent=E.BankAnnouncements.format(v.me,staged);
 status(state.notice||(locked?(staged?'Announcement locked with your submitted plan.':'No announcement in the locked plan.'):(staged?'Staged for this month. You can edit or remove it before Mark Ready.':'No announcement staged.')));
 $('#announcementText').addEventListener('input',invalidate);$('#announcementAudience').addEventListener('change',invalidate);
 if(expanded){$('#announcementStage').textContent=staged?'Update planned action':'Add to monthly plan';$$('[data-announcement-audience]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.announcementAudience===state.audience));button.onclick=()=>{if(!current())return;$('#announcementAudience').value=button.dataset.announcementAudience;invalidate();$$('[data-announcement-audience]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.announcementAudience===state.audience)));};});}
 if(state.review&&state.review.stamp===JSON.stringify(read())){$('#announcementExactPreview').textContent=E.BankAnnouncements.format(v.me,state.review.message);$('#announcementExactPreview').hidden=false;$('#announcementStage').disabled=locked;}
 $('#announcementPreview').addEventListener('click',()=>{
  const now=current();if(!now)return;
  try{Object.assign(state,read());const message=E.BankAnnouncements.validate(read());state.review={message,stamp:JSON.stringify(read())};$('#announcementExactPreview').textContent=E.BankAnnouncements.format(now.me,message);$('#announcementExactPreview').hidden=false;$('#announcementStage').disabled=false;status('Exact preview. Stage this text to include it in your plan.');count();}
  catch(error){state.review=null;$('#announcementStage').disabled=true;$('#announcementExactPreview').hidden=true;status(error.message);}
 });
 $('#announcementStage').addEventListener('click',()=>{
  const now=current();if(!now)return;
  if(!state.review||state.review.stamp!==JSON.stringify(read())){status('Your text changed. Preview it again before staging.');return;}
  draft.announcement=E.BankAnnouncements.validate(state.review.message);state.stamp=JSON.stringify(draft.announcement);state.review=null;state.notice='Announcement staged for this month.';render();
 });
 $('#announcementEdit').addEventListener('click',()=>{if(!current()||!draft.announcement)return;Object.assign(state,draft.announcement);state.review=null;state.notice='Edit the message, then Preview and Stage the replacement.';renderBankAnnouncements(currentView());$('#announcementText').focus();});
 $('#announcementRemove').addEventListener('click',()=>{if(!current())return;delete draft.announcement;state.stamp=undefined;state.audience='public';state.text='';state.review=null;state.notice='Announcement removed from this month’s plan.';render();});
 $('#announcementDiscard').addEventListener('click',()=>{if(!current())return;state.audience=draft.announcement?.audience||'public';state.text=draft.announcement?.text||'';state.review=null;state.notice='Unstaged edits discarded.';renderBankAnnouncements(currentView());});
}
