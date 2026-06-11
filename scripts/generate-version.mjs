import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '.wrangler', '.vscode']);
const EXCLUDE_FILES = new Set(['version.json']);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      if (EXCLUDE_FILES.has(entry.name)) continue;
      yield full;
    }
  }
}

const files = [...walk(ROOT)].sort();
const manifest = {};

for (const file of files) {
  const rel = relative(ROOT, file);
  const content = readFileSync(file);
  manifest[rel] = createHash('sha256').update(content).digest('hex');
}

const overallInput = Object.entries(manifest)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([p, h]) => `${p}:${h}`)
  .join('\n');
const overall = createHash('sha256').update(overallInput).digest('hex');

writeFileSync(
  join(ROOT, 'version.json'),
  JSON.stringify({ overall, files: manifest }, null, 2) + '\n'
);

console.log(`version.json written (${Object.keys(manifest).length} files, overall=${overall})`);
