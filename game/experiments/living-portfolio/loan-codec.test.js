'use strict';
const assert=require('node:assert/strict'),Loan=require('./loan-contracts'),Codec=require('./loan-codec')(Loan),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function contract(product='installment',n=0,bankId='a'){
 const p=Loan.catalog[product],applicationId='app:'+n,originalTerms=Loan.terms(product,{annualRateBps:1200,feeBps:100,termMonths:p.terms[0],underwriting:'growth'}),originalCommitment=70000,
  pledge=p.maxLtvBps?Math.ceil(originalCommitment*10000/p.maxLtvBps):0;
 return{id:'loan:1:'+applicationId.length+':'+applicationId+':'+bankId.length+':'+bankId,applicationId,originatorBankId:bankId,bankId,basisAdjustment:0,borrowerId:'borrower:'+n,market:'downtown',sector:'general',product:p.family,offerProduct:product,
  principal:70000,undrawn:0,commitment:70000,remainingMonths:p.terms[0]-1,originatedMonth:1,originalPrincipal:70000,originalCommitment,originalTerms,
  collateral:pledge?{id:'property:'+n,originalValue:200000,pledgedValue:pledge,originationLtvBps:Math.ceil(originalCommitment*10000/pledge),releasedMonth:null}:null,
  servicing:{lastMonth:2,activityMonth:1,principalDue:0,interestDue:0,suspendedInterest:0,missedMonths:0,interestCarry:1200}};
}
function sorted(cs){return cs.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);}
test('all seven retained offers round trip exactly with deterministic input order',()=>{
 const cs=Object.keys(Loan.catalog).map((p,i)=>contract(p,i)),before=hash(cs),encoded=Codec.encode(cs),decoded=Codec.decode(encoded);
 assert.deepEqual(decoded,sorted(cs));assert.equal(hash(cs),before);assert.deepEqual(Codec.encode(cs.slice().reverse()),encoded);
 decoded[0].originalTerms.annualRateBps=1;assert.equal(cs[0].originalTerms.annualRateBps,1200);
});
test('arrears, suspended interest, protected terms and released collateral are lossless',()=>{
 const c=contract('mortgage');c.servicing.principalDue=100;c.servicing.interestDue=900;c.servicing.suspendedInterest=450;c.servicing.missedMonths=1;
 assert.deepEqual(Codec.decode(Codec.encode([c])),[c]);
 const paid=contract('auto');paid.principal=0;paid.commitment=0;paid.collateral.releasedMonth=2;assert.deepEqual(Codec.decode(Codec.encode([paid])),[paid]);
});
test('fresh decoded borrower transactions produce identical economic results',()=>{
 const c=contract('businessLine'),input={version:1,month:2,contracts:[c],banks:[{id:'a',cash:1000000,protectedCash:100000,creditWork:10}],borrowers:[{id:c.borrowerId,cash:10000,protectedCash:1000}],collateral:[],instructions:[{contractId:c.id,borrowerId:c.borrowerId,kind:'repay',amount:20000}]};
 assert.deepEqual(Loan.transactContracts({...input,contracts:Codec.decode(Codec.encode(input.contracts))}),Loan.transactContracts(input));
});

test('ownership and signed purchase basis survive without rewriting origination identity',()=>{
 for(const basis of [-70000,-123,0,456]){
  const c=contract();c.bankId='buyer';c.basisAdjustment=basis;
  assert.deepEqual(Codec.decode(Codec.encode([c])),[c]);assert(c.id.endsWith(':1:a'));
 }
 for(const mutate of [c=>delete c.originatorBankId,c=>c.originatorBankId='buyer',c=>delete c.basisAdjustment,c=>c.basisAdjustment=-70001,
  c=>c.basisAdjustment=Number.MAX_SAFE_INTEGER,c=>{c.principal=0;c.commitment=0;c.basisAdjustment=1;}]){
  const c=contract();mutate(c);assert.throws(()=>Codec.encode([c]));
 }
 const old=Codec.encode([contract()]);old.version=1;old.rows[0].splice(21);assert.throws(()=>Codec.decode(old),/Unsupported loan codec/,'no implicit experiment-format upgrade');
});
test('duplicate, missing, out-of-bounds, forged and unknown encoded data reject',()=>{
 for(const mutate of [s=>s.version=1,s=>s.rows[0].pop(),s=>s.rows[0][0]=999999,s=>s.rows[0][6]=-1,s=>s.rows[0][12]=99999,s=>s.rows.push(copy(s.rows[0])),
  s=>s.terms[0][0]=5001,s=>s.terms[0][3]='unlimited',s=>s.terms.push(copy(s.terms[0])),s=>s.dictionary.push('unused'),s=>s.rows[0][13]=[],s=>s.extra=true,s=>s.rows[0][15]=99]){
  const s=Codec.encode([contract()]);mutate(s);assert.throws(()=>Codec.decode(s));
 }
 const c=contract();c.commitment++;assert.throws(()=>Codec.encode([c]));assert.throws(()=>Codec.encode([contract(),contract()]));
});
test('dictionary and rows cannot reorder canonical identity or retain hidden payload',()=>{
 const cs=[contract('installment',0),contract('installment',1)],s=Codec.encode(cs);s.rows.reverse();assert.throws(()=>Codec.decode(s),/row order/);
 const bad=Codec.encode(cs);bad.dictionary[0]='<script>';assert.throws(()=>Codec.decode(bad),/dictionary/);
 assert.deepEqual(Codec.decode(Codec.encode([])),[]);
 const varied=[contract('installment',0),contract('installment',1)];varied[1].originalTerms.annualRateBps=1100;
 const switched=Codec.encode(varied);assert.equal(switched.terms.length,2);switched.terms.reverse();switched.rows.forEach(r=>r[12]=1-r[12]);
 assert.throws(()=>Codec.decode(switched),/noncanonical encoded terms/,'same decoded balances do not authorize another wire ordering');
});
const cs=Array.from({length:10000},(_,n)=>['a','b'].map(bank=>contract('installment',n,bank))).flat(),start=performance.now(),encoded=Codec.encode(cs),encodingMs=performance.now()-start;
const decodeStart=performance.now(),decoded=Codec.decode(encoded),decodingMs=performance.now()-decodeStart;
assert.deepEqual(decoded,sorted(cs));const rawBytes=Buffer.byteLength(JSON.stringify(cs)),encodedBytes=Buffer.byteLength(JSON.stringify(encoded));assert(encodedBytes<rawBytes*.35);
const storageSource=fs.readFileSync(path.resolve(__dirname,'../../src/persistence/storage-codec.js'),'utf8'),storageContext={};
vm.runInNewContext(storageSource+';this.pack=packStorageValue;this.unpack=unpackStorageValue;',storageContext);
const packed=storageContext.pack(encoded),roundTrip=storageContext.unpack(packed);assert.deepEqual(copy(roundTrip),encoded);assert.deepEqual(Codec.decode(copy(roundTrip)),decoded);
const portfolioStorageUtf16Bytes=JSON.stringify(packed).length*2;
// Bounded extra-payload characterization alongside an actual saved campaign.
// This wrapper is deliberately NOT accepted as a game save/schema upgrade.
const checkpointPath=path.resolve(__dirname,'../../reports/qa/department-group6-balanced120-first.json');let combined=null;
if(fs.existsSync(checkpointPath)){
 const checkpoint=JSON.parse(fs.readFileSync(checkpointPath,'utf8')).finalCheckpoints[0].game,
  payload={existingCampaign:checkpoint,candidateLoanPayload:encoded},payloadHash=hash(payload),started=performance.now(),stored=storageContext.pack(payload),packMs=performance.now()-started;
 assert.equal(hash(storageContext.unpack(stored)),payloadHash,'actual historical data and extra contracts must round trip without dropping fields');
 combined={existingCampaignCycle:checkpoint.cycle,existingCampaignVersion:checkpoint.version,rawBytes:Buffer.byteLength(JSON.stringify(payload)),storageUtf16Bytes:JSON.stringify(stored).length*2,packMs:Math.round(packMs),payloadSha256:payloadHash,
  schemaAccepted:false,note:'Synthetic wrapper for storage headroom only; no candidate fields were added to the existing campaign.'};
 assert(combined.storageUtf16Bytes<4*1024*1024,'Composite diagnostic lacks browser quota headroom');
}
console.log(JSON.stringify({passed:true,checks,contracts:cs.length,encodingMs:Math.round(encodingMs),decodingMs:Math.round(decodingMs),rawBytes,encodedBytes,reductionPercent:Math.round((1-encodedBytes/rawBytes)*100),canonicalSha256:hash(sorted(cs)),
 portfolioStorageUtf16Bytes,combined,storageCodecSha256:crypto.createHash('sha256').update(storageSource).digest('hex'),
 limitations:'Lossless isolated serialization only. Not a game save upgrade or actual GitHub/local-storage payload acceptance; the rest of campaign state and maximum-length identities are additional.'}));
