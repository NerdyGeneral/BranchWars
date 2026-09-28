'use strict';

// Timing hints affect scheduling only. Every command occurrence is retained,
// and each partition keeps the original command order for reproducible logs.
function balancedPartitions(commands,count,seconds={},fallbackSeconds=60){
 if(!Number.isSafeInteger(count)||count<1||count>commands.length)throw Error('Partition count must be between 1 and the number of shard commands.');
 if(!Number.isFinite(fallbackSeconds)||fallbackSeconds<=0)throw Error('Fallback duration must be positive.');
 const buckets=Array.from({length:count},()=>({seconds:0,rows:[]}));
 const ranked=commands.map((command,index)=>{const measured=seconds[command.join(' ')];return {command,index,seconds:Number.isFinite(measured)&&measured>0?measured:fallbackSeconds};}).sort((a,b)=>b.seconds-a.seconds||a.index-b.index);
 for(const row of ranked){let target=buckets[0];for(const bucket of buckets)if(bucket.seconds<target.seconds)target=bucket;target.rows.push(row);target.seconds+=row.seconds;}
 return buckets.map(bucket=>({estimatedSeconds:bucket.seconds,commands:bucket.rows.sort((a,b)=>a.index-b.index).map(row=>row.command)}));
}
module.exports={balancedPartitions};
