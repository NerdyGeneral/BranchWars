'use strict';
// Diagnostic-only exact text patcher. Never writes source or portable output.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=function patchEngine(source,names,reverse=false){
 for(const name of reverse?[...names].reverse():names){
  const text=fs.readFileSync(path.join(__dirname,name),'utf8').replace(/\r\n/g,'\n');
  for(const part of text.split('\n@@\n').slice(1)){
   const lines=part.split('\n').filter(line=>/^[ +\-]/.test(line));
   let before=lines.filter(line=>line[0]!=='+').map(line=>line.slice(1)).join('\n');
   let after=lines.filter(line=>line[0]!=='-').map(line=>line.slice(1)).join('\n');
   // Explicit campaign context was added to these two calls, not to the
   // archived repair itself. Keep exact unique-hunk and failing-before checks.
   if(name==='department-ai-affordability.patch'){
    const adapt=s=>s.replace('planBudget(p,plan)','planBudget(p,plan,g)').replace('normalizeDepartmentPlan(p,plan);','normalizeDepartmentPlan(p,plan,g);');
    if(source.includes(adapt(reverse?after:before))){before=adapt(before);after=adapt(after);}
   }
   // Expanded 9.36 adds explicitly gated business obligations to the same
   // quote. Adapt the comparison context, not the archived leadership repair;
   // historical fixtures still exercise its exact failing-before behavior.
   if(name==='department-mandatory-obligations.patch'&&source.includes('digitalPlatform=ExpandedBusiness.monthlyCost(p)')){
    const adapt=s=>s.replace('quote.mandatoryObligations=leadership.rows.reduce((sum,row)=>sum+row.severance+(row.appointment?0:row.salary),0);','quote.mandatoryObligations=leadership.rows.reduce((sum,row)=>sum+row.severance+(row.appointment?0:row.salary),0)+(p.expandedBusinessVersion===1?BrandCampaigns.mandatory(p,plan)+digitalPlatform:0);');
    if(source.includes(adapt(reverse?after:before))){before=adapt(before);after=adapt(after);}
   }
   const from=reverse?after:before,to=reverse?before:after;
   assert.equal(source.split(from).length,2,'Patch must have one exact context: '+name);
   source=source.replace(from,()=>to);
  }
 }
 return source;
};
