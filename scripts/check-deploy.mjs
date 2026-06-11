import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LOCAL = JSON.parse(readFileSync(join(ROOT, 'version.json'), 'utf-8'));
const DEPLOY_URL = process.env.DEPLOY_URL || 'https://novabase-cloud.github.io/version.json';
const INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL || '5000', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '60', 10);

const expected = LOCAL.overall;

async function fetchRemote() {
  const res = await fetch(DEPLOY_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.json();
}

async function main() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const remote = await fetchRemote();
      if (remote.overall === expected) {
        console.log(`PASS  attempt=${attempt}  hash=${expected}`);
        process.exit(0);
      }
      console.log(`MISMATCH  attempt=${attempt}  remote=${remote.overall?.slice(0, 16)}…  local=${expected.slice(0, 16)}…`);
    } catch (err) {
      console.log(`FAIL  attempt=${attempt}  ${err.message}`);
    }
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
  }
  console.error(`TIMEOUT after ${MAX_RETRIES} attempts`);
  process.exit(1);
}

main();
