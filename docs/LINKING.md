# trajx ↔ RoboViz — how the two repos work together

**trajx is the engine (the product). RoboViz is its web frontend + official demo.**
They are two separate repos under the same account, linked by exactly one contract:
the **`@yuanweima/trajx-wasm`** npm package, published to private GitHub Packages.

```
  trajx repo                         RoboViz repo
  ──────────                         ────────────
  crates/trajx-wasm  ──wasm-pack──▶  @yuanweima/trajx-wasm  ──consumed by──▶  packages/core
  (Rust + WebGPU)     (pkg/)          (GitHub Packages)                        examples/react-demo
```

Do **not** build a second demo inside trajx and do **not** merge the repos —
RoboViz already is the renderer/demo.

Current state: `@yuanweima/trajx-wasm@0.9.0` is published; RoboViz consumes it from
GitHub Packages (`packages/core` peer/dev dep + `examples/react-demo`, pinned `^0.9.0`).

---

## Auth (one-time)

Private GitHub Packages needs a token. The repo's `.npmrc` only maps the scope to
the registry (no secret):

```
@yuanweima:registry=https://npm.pkg.github.com
```

The token lives in `~/.npmrc` locally (a GitHub PAT with `read:packages`, plus
`write:packages` to publish), or as `NPM_TOKEN`/`NODE_AUTH_TOKEN` in CI.

---

## Default: consume the published engine

`pnpm install` pulls `@yuanweima/trajx-wasm@^0.9.0` from GitHub Packages. Nothing
else to do — build and run:

```bash
pnpm install
pnpm build
pnpm --filter roboviz-react-demo dev
```

---

## Dev loop: iterate on trajx locally (before publishing)

To see **uncommitted** trajx changes in the demo without republishing, add a pnpm
override that links to trajx's live build output (assumes `trajx` and `roboviz` are
sibling directories):

```jsonc
// roboviz/package.json  — add temporarily, then `pnpm install`
"pnpm": {
  "overrides": { "@yuanweima/trajx-wasm": "link:../trajx/crates/trajx-wasm/pkg" }
}
```

Then, whenever you change trajx's Rust:

```bash
cd ../trajx/crates/trajx-wasm
wasm-pack build --target web --out-dir pkg --release   # default features: collision + gpu
node scripts/prepare-npm-pkg.mjs                       # re-applies @yuanweima scope + publishConfig
cd -                                                   # link picks up pkg/ automatically
pnpm --filter roboviz-react-demo dev
```

Remove the override to go back to the published version.

> The old vendored copy at `packages/core/vendor/trajx-wasm` (a hand-copied snapshot
> that silently drifted) was deleted — never re-introduce it.

---

## Release: publish a new engine version

WASM package **must** be scoped `@yuanweima` (GitHub Packages requires scope === repo
owner). `crates/trajx-wasm/scripts/prepare-npm-pkg.mjs` applies the scope,
`publishConfig`, and `repository` to the wasm-pack output.

```bash
cd ../trajx/crates/trajx-wasm
# bump version in Cargo.toml to reflect engine changes
wasm-pack build --target web --out-dir pkg --release
node scripts/prepare-npm-pkg.mjs

export NODE_AUTH_TOKEN=<github-PAT with write:packages>
cd pkg && npm publish
```

Then bump RoboViz's pinned range (`^0.9.0` → new) in `packages/core/package.json`
and `examples/react-demo/package.json`, and `pnpm install`.
