'use strict';
// Explicit allowlist only: never recursively copy a developer workspace.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { build } = require('./build_game');
const ROOT = path.resolve(__dirname, '..');
const RUNTIME_FILES = Object.freeze(['BRANCH_WARS.html', 'OPEN_BRANCH_WARS.bat', 'OPEN_LAN_GAME.bat', 'BRANCH_WARS_LAN_SERVER.ps1']);
const CONTENT_FILES = Object.freeze([...RUNTIME_FILES, 'README.txt'].sort());
const INVENTORY = Object.freeze([...CONTENT_FILES, 'manifest.json'].sort());
const README = `BRANCH WARS - LOCAL RELEASE CANDIDATE

Keep these files together. No installation or account is needed for local play.
Open OPEN_BRANCH_WARS.bat on Windows, or open BRANCH_WARS.html in your browser.
Choose Solo vs Corporate AI or Pass & Play for local hotseat play.

MULTIPLAYER
LAN/Intranet: the host runs OPEN_LAN_GAME.bat and keeps the server window open.
Use the address shown by that server on both computers. The host creates an
Intranet Room; the friend joins with its room code. Follow the shared lobby.
Only allow network access on a trusted local network; do not expose this server
to the public Internet. Do not disable firewall/security protections.

Repository Link: both players use their own access tokens for the intended
shared GitHub repository. Prefer a private repository. Exchange the room join
code, not credentials. Keep the host browser open. Use Resume/Retry for recovery
and retain your own campaign exports. Room play writes fictional game messages
to the chosen repository; this package itself performs no publication.

Direct P2P: exchange the complete host invitation and rival response codes.
Both browsers must remain open. Network restrictions can prevent a direct link;
LAN/Intranet or Repository Link are alternatives. No public relay is bundled.

SAVES AND UPDATES
Before updating or moving this folder, the host should EXPORT the campaign and
keep the old package. Browser autosaves depend on browser/origin and are not a
substitute for an exported backup. IMPORT the export when moving to a new origin.
Only the host exports the authoritative multiplayer campaign. Never distribute
private saves or access tokens with the game. Keep a backup before importing.

CAMPAIGN EDITIONS
New campaigns start as Core version 8.20, with six research branches and
permanent operating models. After starting, open Research and check that it
lists six capabilities, including RISK & CAPITAL. Choose Expanded edition and
confirm for version 9.39: persistent bank rivalry, lending beyond local office
capacity, bank-wide digital platforms, brand campaigns and holding capital.
Strategy > Research adds five paid capability nodes. Corporate treasury reuses
the existing internal/partner platform, central delivery and actual fee book.
Treasury > Outside-bank advance offers funded one-month borrowing with explicit
interest and repayment. Banking > Cards offers a paid Cedar Reserve partner
program after Digital Architecture and Relationship Planning. Cedar funds and
owns the loans; your bank receives collected fees and pays direct program costs.
Bank-issued cards, overnight funding and outside-bank share trading remain future features.
Open Banking > Treasury for the shared Fed calendar and fixed or liquid treasury
investments, including interest and early-sale values. Historical
campaigns retain their saved rules; import and rematch do not silently upgrade
them. In multiplayer, the host applies the
shared settings and both players confirm readiness. Campaign rules stay fixed
after play begins. National Empire remains a future expansion.

RELEASE STATUS
This is an engineering release candidate for review, not a claim that human
balance or enjoyment is settled. A real two-computer multiplayer acceptance
session remains unverified. Automated and simulated tests do not replace it.

INTEGRITY
manifest.json lists SHA-256 hashes and byte sizes of the five content files.
The six-file package contains no development sources, reports, private saves,
credentials, or dependencies. Hashes detect accidental changes, not authenticity
of an untrusted distribution. No GitHub commit, push, or release is performed by
the packaging tool.
`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function within(directory, root) {
  const relative = path.relative(root, directory);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function readRegular(file) {
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) throw Error('Expected a regular package file: ' + path.basename(file));
  return fs.readFileSync(file);
}
function verifyPackage(directory, { expectedReadme } = {}) {
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Expected a regular package directory.');
  const entries = fs.readdirSync(directory).sort();
  if (JSON.stringify(entries) !== JSON.stringify(INVENTORY)) throw Error('Package inventory differs from the six-file allowlist.');
  const manifest = JSON.parse(readRegular(path.join(directory, 'manifest.json')).toString('utf8'));
  if (manifest.schemaVersion !== 1 || manifest.hashAlgorithm !== 'sha256' || !Array.isArray(manifest.files) ||
      JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(['files', 'hashAlgorithm', 'schemaVersion']) ||
      JSON.stringify(manifest.files.map(entry => entry && entry.name)) !== JSON.stringify(CONTENT_FILES)) throw Error('Invalid package manifest.');
  for (const entry of manifest.files) {
    if (JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(['bytes', 'name', 'sha256']) ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[0-9a-f]{64}$/.test(entry.sha256)) throw Error('Invalid manifest file record.');
    const bytes = readRegular(path.join(directory, entry.name));
    if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) throw Error('Package content hash mismatch: ' + entry.name);
  }
  // A manifest proves internal integrity, not the origin or currentness of bytes.
  // Historical packages may contain a historical README. Current-candidate
  // verification and package creation explicitly require today's generated text.
  if (expectedReadme !== undefined && readRegular(path.join(directory, 'README.txt')).toString('utf8') !== expectedReadme) throw Error('Package README does not match the expected release text.');
  return { directory: path.resolve(directory), portableSha256: manifest.files.find(entry => entry.name === 'BRANCH_WARS.html').sha256, files: INVENTORY.length,
    verification: 'manifest-integrity', scope: 'Six-file manifest integrity only; no source, runtime or publisher-authenticity certification.',
    provenanceVerified: false, sourceCompared: false, expectedReadmeVerified: expectedReadme !== undefined };
}
function packageRelease({ output, gameRoot = ROOT } = {}) {
  if (typeof output !== 'string' || !path.isAbsolute(output)) throw Error('Provide an explicit absolute output directory outside the repository.');
  const gameDirectory = fs.realpathSync(gameRoot), repository = fs.realpathSync(path.join(gameDirectory, '..'));
  const requested = path.resolve(output), parent = fs.realpathSync(path.dirname(requested));
  const directory = path.join(parent, path.basename(requested));
  if (within(directory, repository)) throw Error('Release output must be outside the repository.');
  if (fs.existsSync(directory)) throw Error('Release output already exists; choose a new directory.');
  // The existing builder is authoritative and check mode never writes the portable.
  build({ sourceRoot: path.join(gameDirectory, 'src'), output: path.join(gameDirectory, 'BRANCH_WARS.html'), check: true });
  const expected = new Map(RUNTIME_FILES.map(name => [name, readRegular(path.join(gameDirectory, name))]));
  expected.set('README.txt', Buffer.from(README, 'utf8'));
  fs.mkdirSync(directory); // No recursive creation, replacement, merge, or cleanup.
  for (const name of RUNTIME_FILES) {
    const destination = path.join(directory, name);
    fs.copyFileSync(path.join(gameDirectory, name), destination, fs.constants.COPYFILE_EXCL);
    if (!readRegular(destination).equals(expected.get(name))) throw Error('Source changed during packaging: ' + name);
  }
  fs.writeFileSync(path.join(directory, 'README.txt'), expected.get('README.txt'), { flag: 'wx' });
  const manifest = { schemaVersion: 1, hashAlgorithm: 'sha256', files: CONTENT_FILES.map(name => ({ name, bytes: expected.get(name).length, sha256: hash(expected.get(name)) })) };
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return verifyPackage(directory, { expectedReadme: README });
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || !['--output', '--verify'].includes(args[0]) || !path.isAbsolute(args[1])) throw Error('Usage: node tools/package_release.js --output ABSOLUTE_NEW_DIRECTORY | --verify ABSOLUTE_PACKAGE_DIRECTORY');
    const result = args[0] === '--verify' ? verifyPackage(args[1]) : packageRelease({ output: args[1] });
    console.log(JSON.stringify({ verified: true, ...result }, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { packageRelease, verifyPackage, RUNTIME_FILES, INVENTORY, README };
