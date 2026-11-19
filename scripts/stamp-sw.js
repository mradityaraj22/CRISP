// Stamp sw.js with a content hash of every cached file.
// Run with:  npm run stamp     (after changing any file listed in ASSETS)
//
// Why: with a cache-first worker, a forgotten version bump means users keep the old app
// forever. Hashing the files makes the version change exactly when the content does.
// scripts/test-pwa.js fails if the stamp is out of date.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);

export function assetsOf(swSource) {
  return JSON.parse(swSource.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
}

export function contentHash(swSource) {
  const hash = createHash('sha256');
  for (const file of assetsOf(swSource)) {
    if (file === './') continue;
    hash.update(file);
    hash.update(readFileSync(new URL(file, root)));
  }
  return hash.digest('hex').slice(0, 10);
}

const isMain = process.argv[1] && decodeURIComponent(new URL(import.meta.url).pathname) === process.argv[1];
if (isMain) {
  const path = new URL('sw.js', root);
  const src = readFileSync(path, 'utf8');
  const version = `lecturelens-${contentHash(src)}`;
  writeFileSync(path, src.replace(/const VERSION = '[^']+';/, `const VERSION = '${version}';`));
  console.log(`sw.js VERSION = ${version}`);
}
