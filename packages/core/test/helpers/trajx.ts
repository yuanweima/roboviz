/**
 * Test helper: load and initialize the vendored trajx-wasm kernel in Node.
 *
 * trajx-wasm is a wasm-bindgen "web" build: the JS glue loads, but the WASM
 * binary must be instantiated explicitly before use. In the browser the app's
 * bundler fetches the co-located `.wasm`; under Node/vitest we read the bytes
 * from the resolved package file and pass them to `initSync`.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const helperDir = dirname(fileURLToPath(import.meta.url));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any;

/** Load trajx-wasm and instantiate the WASM binary (idempotent). */
export async function loadTrajx(): Promise<any> {
  if (cached) return cached;
  const mod = await import('@yuanweima/trajx-wasm');
  const wasmPath = require.resolve('@yuanweima/trajx-wasm/trajx_wasm_bg.wasm');
  // @ts-expect-error initSync accepts a { module } wrapper around the bytes
  mod.initSync({ module: readFileSync(wasmPath) });
  cached = mod;
  return mod;
}

/** Read a bundled URDF fixture as a string. */
export function loadFixtureUrdf(
  relPath = 'Fanuc_LR_Mate_200iD_7L/robot_link.urdf',
): string {
  return readFileSync(join(helperDir, '..', 'fixtures', 'models', relPath), 'utf8');
}
