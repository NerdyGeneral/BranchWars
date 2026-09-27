// Optional, cosmetic turn messages. Missing fields stay missing in older saves
// and ordinary plans. Publishing changes only the existing results/history and
// the bounded metadata needed to identify each speaker; never money or RNG.
const BankAnnouncements=(()=>{
 const MAX_CHARACTERS=240,copy=value=>JSON.parse(JSON.stringify(value));
 const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join()===keys.slice().sort().join();
 const length=text=>Array.from(text).length;
 function validate(value){
  if(value===undefined)return null;
  if(!exact(value,['audience','text'])||!['public','shareholders'].includes(value.audience)||typeof value.text!=='string')throw Error('Choose Public or Shareholders and enter announcement text.');
  if(!value.text.trim()||length(value.text)>MAX_CHARACTERS)throw Error('Announcements need 1–240 characters.');
  // Keep punctuation, emoji, spacing and line breaks exactly as previewed.
  // Reject invisible control/directional escapes rather than silently editing.
  if(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/.test(value.text)||Array.from(value.text).some(c=>c.length===1&&c.charCodeAt(0)>=0xD800&&c.charCodeAt(0)<=0xDFFF))throw Error('Announcements must contain ordinary text without control characters.');
  return {audience:value.audience,text:value.text};
 }
 function format(bank,value){const message=validate(value);return bank.name+' — '+(message.audience==='public'?'Public announcement':'Shareholder announcement')+': '+message.text;}
 function publish(g,plans){
  const records=[];
  for(const [index,p]of g.players.entries()){const message=validate(plans[index].announcement);if(message)records.push({bankId:p.id,cycle:g.cycle,...message});}
  if(records.length)g.announcements=records;else delete g.announcements;
  return records.map(row=>format(g.players.find(p=>p.id===row.bankId),{audience:row.audience,text:row.text}));
 }
 function validatePublished(source,banks){
  if(source.announcements===undefined)return;
  const rows=source.announcements,cycle=source.gameOver?source.cycle:source.cycle-1,seen=new Set();
  if(!Array.isArray(rows)||!rows.length||rows.length>2||!Array.isArray(source.resolution))throw Error('Invalid published announcements.');
  for(const [index,row]of rows.entries()){
   if(!exact(row,['bankId','cycle','audience','text'])||!Number.isSafeInteger(row.cycle)||row.cycle!==cycle||row.cycle<1||seen.has(row.bankId))throw Error('Invalid published announcement identity.');
   const bank=banks.find(p=>p.id===row.bankId);if(!bank)throw Error('Unknown announcement speaker.');
   const message=validate({audience:row.audience,text:row.text});seen.add(row.bankId);
   if(source.resolution[index]!==format(bank,message))throw Error('Published announcements must begin the round results.');
  }
 }
 function validateGame(g){
  for(const p of g.players)if(p.submitted)validate(p.submitted.announcement);
  for(const plan of Object.values(g.lastPlans||{}))if(plan)validate(plan.announcement);
  validatePublished(g,g.players);
  if(g.announcements?.length===2&&g.announcements[0].bankId!==g.players[0].id)throw Error('Announcements must retain seat order.');
 }
 function project(g,out,index){
  const pending=g.players[index].submitted?.announcement;
  if(pending!==undefined)out.me.pendingAnnouncement=validate(pending);
  if(g.announcements!==undefined)out.announcements=copy(g.announcements);
 }
 function validateView(v){
  if(v.rival?.pendingAnnouncement!==undefined)throw Error('Private rival announcement exposed.');
  if(v.me?.pendingAnnouncement!==undefined){if(!v.me.submitted)throw Error('An unsubmitted announcement cannot be public.');validate(v.me.pendingAnnouncement);}
  validatePublished(v,[v.me,v.rival]);
 }
 return {MAX_CHARACTERS,length,validate,format,publish,validateGame,project,validateView};
})();
