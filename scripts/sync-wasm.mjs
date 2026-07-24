#!/usr/bin/env node
/**
 * Sync the vendored trajx-wasm copies from the installed npm package.
 *
 * The engine binary lives in two checked-in ("vendored") places besides the npm
 * dependency, and they drift. node_modules/@yuanweima/trajx-wasm is the single
 * source of truth — run this after bumping the dependency so both copies match:
 *   - packages/core/src/wasm/            (reference glue + wasm)
 *   - examples/react-demo/public/workers/ (worker copy served by the demo)
 *
 * Usage: node scripts/sync-wasm.mjs   (or: pnpm sync-wasm)
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Resolve the package as core would (workspace dep).
const require = createRequire(join(root, 'packages/core/index.js'));
const pkgJson = require.resolve('@yuanweima/trajx-wasm/package.json');
const pkgDir = dirname(pkgJson);
const version = require(pkgJson).version;

const coreWasm = join(root, 'packages/core/src/wasm');
const demoWorkers = join(root, 'examples/react-demo/public/workers');
mkdirSync(coreWasm, { recursive: true });
mkdirSync(demoWorkers, { recursive: true });

// Copy every trajx_wasm* artifact the package ships into src/wasm.
const artifacts = [
  'trajx_wasm_bg.wasm',
  'trajx_wasm_bg.wasm.d.ts',
  'trajx_wasm.d.ts',
  'trajx_wasm.js',
];
let copied = 0;
for (const f of artifacts) {
  const src = join(pkgDir, f);
  if (existsSync(src)) {
    copyFileSync(src, join(coreWasm, f));
    copied++;
  }
}
// The demo's worker copy only needs the binary.
copyFileSync(join(pkgDir, 'trajx_wasm_bg.wasm'), join(demoWorkers, 'trajx_wasm_bg.wasm'));

console.log(`[sync-wasm] trajx-wasm ${version} → src/wasm (${copied} files) + public/workers`);
