'use strict';

// Dependency-free, deterministic assembly. Source modules share a private scope
// within the engine/client boundary; the portable output needs no module loader.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const normalize = text => text.replace(/\r\n/g, '\n');
function assemble(sourceRoot = path.join(ROOT, 'src')) {
  const directory = fs.realpathSync(sourceRoot), used = new Set(['manifest.json']);
  function read(name) {
    if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9/.-]*$/.test(name) || name.split('/').includes('..')) throw Error('Invalid source path: ' + name);
    const file = fs.realpathSync(path.resolve(directory, name));
    if (!file.startsWith(directory + path.sep)) throw Error('Source escapes module directory: ' + name);
    if (used.has(name)) throw Error('Duplicate source module: ' + name);
    used.add(name);
    return normalize(fs.readFileSync(file, 'utf8'));
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1) throw Error('Unsupported source manifest');
  const replaceOnce = (text, token, value) => {
    if (text.split(token).length !== 2) throw Error('Expected one build slot: ' + token);
    return text.replace(token, () => value);
  };
  function script(section, label) {
    if (!Array.isArray(section.modules) || !section.modules.length) throw Error('Empty ' + label + ' module list');
    const parts = section.modules.map(read);
    if (parts.some(s => /<\/script\b/i.test(s))) throw Error('Closing script tag in ' + label + ' source');
    const code = replaceOnce(read(section.shell), '/* @modules */', parts.join(''));
    new vm.Script(code, {filename: label + '-bundle.js'});
    return code;
  }
  let html = read(manifest.template);
  html = replaceOnce(html, '/* @engine */', script(manifest.engine, 'engine'));
  html = replaceOnce(html, '/* @client */', script(manifest.client, 'client'));
  if (!Array.isArray(manifest.styles) || !manifest.styles.length) throw Error('Empty style module list');
  for (const [index, name] of manifest.styles.entries()) {
    const css = read(name);
    if (/<\/style\b/i.test(css)) throw Error('Closing style tag in source');
    html = replaceOnce(html, '/* @style-' + index + ' */', css);
  }
  if (/\/\* @(?:engine|client|modules|style-\d+) \*\//.test(html)) throw Error('Unfilled source slot');
  // A new source file must be wired deliberately, never silently ignored.
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), name + '/');
      else if (!used.has(name)) throw Error('Unlisted source file: ' + name);
    }
  }
  walk(directory);
  return {html, files: [...used].map(name => path.join(directory, name)), manifest};
}
function build({sourceRoot, output = path.join(ROOT, 'BRANCH_WARS.html'), check = false} = {}) {
  const result = assemble(sourceRoot);
  if (check) {
    if (!fs.existsSync(output) || normalize(fs.readFileSync(output, 'utf8')) !== result.html) throw Error('Portable game is stale. Run node game/tools/build_game.js from the repository root.');
  } else fs.writeFileSync(output, result.html);
  return result;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check') || args.length > 1) throw Error('Usage: node tools/build_game.js [--check]');
  const result = build({check: args.includes('--check')});
  console.log((args.includes('--check') ? 'Portable game is current' : 'Built portable game') + ': ' + result.files.length + ' source files, no runtime dependencies.');
}
module.exports = {assemble, build, normalize};
