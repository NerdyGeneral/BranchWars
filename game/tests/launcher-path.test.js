'use strict';

// Exercise the real root wrappers without opening a browser or hosting a room.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
if (process.platform !== 'win32') {
  console.log('Windows launcher execution not run on this platform.');
  process.exit(0);
}
const root = path.resolve(__dirname, '../..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'branch wars launcher test '));
const filenames = ['OPEN_BRANCH_WARS.bat', 'OPEN_LAN_GAME.bat'];
try {
  fs.mkdirSync(path.join(dir, 'game'));
  for (const name of filenames) {
    fs.copyFileSync(path.join(root, name), path.join(dir, name));
    // Generated inert test double. Only the wrapper is under test here.
    fs.writeFileSync(path.join(dir, 'game', name), '@echo off\r\necho REACHED_' + name + '\r\nexit /b 7\r\n');
    const result = spawnSync(process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', '""' + path.join(dir, name) + '""'],
      {cwd: os.tmpdir(), encoding: 'utf8', windowsHide: true, windowsVerbatimArguments: true});
    assert.ifError(result.error);
    assert.equal(result.status, 7, name + ': preserve child exit code. ' + result.stderr);
    assert(result.stdout.includes('REACHED_' + name), name + ': wrong target');
  }
} finally {
  // Remove only exact test-owned files; never recursively delete a computed path.
  for (const name of filenames) {
    for (const file of [path.join(dir, name), path.join(dir, 'game', name)]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
  if (fs.existsSync(path.join(dir, 'game'))) fs.rmdirSync(path.join(dir, 'game'));
  fs.rmdirSync(dir);
}
console.log('Windows root launchers passed: spaced paths, unrelated working directory, target forwarding and exit codes.');
