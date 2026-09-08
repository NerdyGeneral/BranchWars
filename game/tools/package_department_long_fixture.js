'use strict';
// Preserve the actual 480-month campaign which exceeded the old 32MiB ceiling.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const source=process.argv[2];if(!source||process.argv.length!==3)throw Error('Usage: node tools/package_department_long_fixture.js ORIGINAL_REPORT');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync(source);
const expected='ac59ce818ff470b886a0c3a8f8c1269631316bca58a0a91f4989be3215988de6';
if(hash(bytes)!==expected)throw Error('Original stress evidence changed.');
const r=JSON.parse(bytes),c=r.finalCheckpoints[0];
if(r.status!=='PASS'||!r.sourceUnchanged||!r.portableUnchanged||r.months!==480||c.game.cycle!==481)throw Error('Invalid long-run provenance.');
const raw=Buffer.from(JSON.stringify({schemaVersion:1,sourceReportSha256:expected,identity:r.identity,spec:c.spec,game:c.game})+'\n');
if(/"(?:authorization|password|githubToken|accessToken|refreshToken|localStorage|sessionStorage)"\s*:/i.test(raw.toString('utf8')))throw Error('Unexpected credential field.');
const zipped=zlib.gzipSync(raw,{level:9}),target=path.resolve(__dirname,'../tests/fixtures/department-regulatory480.json.gz');
if(!zlib.gunzipSync(zipped).equals(raw))throw Error('Fixture did not roundtrip.');
if(fs.existsSync(target)){if(!fs.readFileSync(target).equals(zipped))throw Error('Existing fixture differs; refusing to overwrite.');}
else fs.writeFileSync(target,zipped,{flag:'wx'});
console.log(JSON.stringify({target,rawBytes:raw.length,compressedBytes:zipped.length,rawSha256:hash(raw),compressedSha256:hash(zipped),gameSha256:hash(JSON.stringify(c.game))}));
