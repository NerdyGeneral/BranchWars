'use strict';
// Append-only execution receipts. A missing terminal receipt is incomplete,
// never success; this does not infer whether a process is still alive.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function testTimeout(env=process.env){
 const raw=env.BRANCH_WARS_TEST_TIMEOUT_MS;
 if(raw===undefined)return 1800000;
 if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<60000||Number(raw)>7200000)
  throw Error('BRANCH_WARS_TEST_TIMEOUT_MS must be an integer from 60000 to 7200000.');
 return Number(raw);
}
function fingerprintFiles(root,entries){
 const hash=crypto.createHash('sha256');
 function visit(relative){
  const file=path.join(root,relative),stat=fs.lstatSync(file);
  if(stat.isSymbolicLink())throw Error('Gate input must not be a symbolic link: '+relative);
  if(stat.isDirectory())for(const name of fs.readdirSync(file).sort())visit(path.join(relative,name));
  else {hash.update(relative.replace(/\\/g,'/')+'\0');hash.update(fs.readFileSync(file));hash.update('\0');}
 }
 for(const entry of [...entries].sort())visit(entry);
 return hash.digest('hex');
}
function createEvidence(directory,kind,metadata={}){
 if(!/^[a-z0-9-]+$/.test(kind))throw Error('Invalid gate evidence name');
 fs.mkdirSync(directory,{recursive:true});
 const stem=path.join(directory,kind+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID());
 const events=stem+'.jsonl',summary=stem+'.json',log=stem+'.log';
 const fd=fs.openSync(events,'wx'),logFd=fs.openSync(log,'wx');let finished=false,sequence=0;
 function append(type,data={}){
  if(finished)throw Error('Gate evidence is already terminal');
  fs.writeSync(fd,JSON.stringify({sequence:++sequence,time:new Date().toISOString(),type,...data})+'\n');
  fs.fsyncSync(fd);
 }
 append('started',{pid:process.pid,node:process.version,platform:process.platform,metadata,log});
 function finish(result){
  if(finished)return;
  append('finished',result);
  fs.writeFileSync(summary,JSON.stringify({metadata,events,log,...result},null,2)+'\n',{flag:'wx'});
  fs.fsyncSync(logFd);fs.closeSync(fd);fs.closeSync(logFd);finished=true;
 }
 return {events,summary,log,logFd,append,finish};
}
module.exports={testTimeout,createEvidence,fingerprintFiles};
