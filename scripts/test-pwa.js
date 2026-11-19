// Offline (PWA) checks. Zero dependencies.
// The classic offline bug: add a file, forget to add it to sw.js, and the app silently
// breaks offline. These tests walk everything the page loads and compare it with ASSETS.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { contentHash } from './stamp-sw.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const norm = (p) => './' + p.replace(/^\.\//, '');

const sw = read('sw.js');
const ASSETS = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
const html = read('index.html');
const manifest = JSON.parse(read('manifest.json'));

/** Every file the app needs: HTML links and scripts, the ES-module import graph, manifest icons. */
function requiredFiles() {
  const files = new Set(['./', './index.html', './manifest.json']);
  for (const m of html.matchAll(/<(?:link|script)[^>]+(?:href|src)="([^"#:]+)"/g)) files.add(norm(m[1]));
  const queue = [...files].filter((f) => f.endsWith('.js'));
  while (queue.length) {
    const file = queue.pop();
    const src = read(file);
    for (const m of src.matchAll(/(?:import|from)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const resolved = norm(new URL(m[1], new URL(file, root)).pathname.slice(new URL(root).pathname.length));
      if (!files.has(resolved)) { files.add(resolved); queue.push(resolved); }
    }
  }
  for (const icon of manifest.icons) files.add(norm(icon.src));
  files.delete('./sw.js'); // the worker itself is fetched by the browser, not from the cache
  return files;
}

test('sw.js caches every file the page loads (offline completeness)', () => {
  const missing = [...requiredFiles()].filter((f) => !ASSETS.includes(f));
  assert.deepEqual(missing, [], `add these to ASSETS in sw.js: ${missing.join(', ')}`);
});

test('every file in ASSETS exists (addAll fails on a single 404)', () => {
  const absent = ASSETS.filter((f) => f !== './' && !existsSync(new URL(f, root)));
  assert.deepEqual(absent, []);
});

test('sw.js VERSION matches the content of the cached files (run npm run stamp)', () => {
  const version = sw.match(/const VERSION = 'lecturelens-([0-9a-f]+)'/)?.[1];
  assert.equal(version, contentHash(sw), 'files changed but the cache version did not: run npm run stamp');
});

test('sw.js cleans up old caches and ignores other origins', () => {
  assert.match(sw, /caches\.delete/);
  assert.match(sw, /origin !== self\.location\.origin/, 'never caches cross-origin requests');
});

test('index.html registers the worker only over http(s) and links the manifest', () => {
  assert.match(html, /navigator\.serviceWorker\.register\('sw\.js'\)/);
  assert.match(html, /location\.protocol\.startsWith\('http'\)/);
  assert.match(html, /<link rel="manifest" href="manifest\.json">/);
  assert.match(html, /<meta name="theme-color"/);
});

test('manifest has what install prompts need', () => {
  for (const key of ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color']) assert.ok(manifest[key], key);
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
});
