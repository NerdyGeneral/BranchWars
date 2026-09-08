'use strict';
// Lossless packaging of preserved engine-only regression evidence. This does
// not regenerate a campaign, alter expectations or overwrite the source report.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=path.join(root,'reports/qa/department-group6-matrix192-second.json');
const target=path.join(root,'tests/fixtures/department-matrix192-second.json.gz');
const expected='f961e016e5713579b7cc0c7fe2535c85de6ef53ee01e9143ee20589c1c84f7cc';
if(process.argv.length!==2)throw Error('Usage: node tools/package_department_fixture.js');
const raw=fs.readFileSync(source);
if(hash(raw)!==expected)throw Error('Preserved regression evidence changed; refusing to package new expectations.');
const data=JSON.parse(raw);
if(data.failure||data.finalCheckpoints.length!==8||data.months!==192)throw Error('Not the expected eight-campaign evidence.');
if(/"(?:authorization|password|githubToken|accessToken|refreshToken|localStorage|sessionStorage)"\s*:/i.test(raw.toString('utf8')))throw Error('Unexpected credential/storage field in engine-only evidence.');
const compressed=zlib.gzipSync(raw,{level:9});
if(!zlib.gunzipSync(compressed).equals(raw))throw Error('Lossless regression packaging failed.');
if(fs.existsSync(target)){
 if(!fs.readFileSync(target).equals(compressed))throw Error('Existing packaged fixture differs; refusing to overwrite.');
}else fs.writeFileSync(target,compressed,{flag:'wx'});
console.log(JSON.stringify({target,rawBytes:raw.length,compressedBytes:compressed.length,rawSha256:hash(raw),compressedSha256:hash(compressed),scope:'Exact preserved fixture packaging; no simulation or expectation regeneration.'}));
