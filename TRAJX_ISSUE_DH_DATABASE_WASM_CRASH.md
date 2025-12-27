# Bug: WasmDhDatabase.listRobots() crashes with "RuntimeError: unreachable" in browser

## Summary

When calling `WasmDhDatabase.withDefaults().listRobots()` or any of the top-level DH database functions (`listDhDatabase()`, `listSupportedRobots()`) in a browser environment, the WASM module crashes with `RuntimeError: unreachable`.

## Environment

- **trajx version**: 0.7.0 (commit e1ad305)
- **Rust version**: rustc 1.92.0 (ded5c06cf 2025-12-08)
- **wasm-pack version**: 0.13.1
- **Browser**: Chrome (latest)
- **OS**: macOS Darwin 25.2.0

## Steps to Reproduce

1. Build trajx-wasm:
   ```bash
   cd crates/trajx-wasm
   wasm-pack build --release --target web
   ```

2. Import and use in a web application:
   ```typescript
   import init, { WasmDhDatabase } from 'trajx-wasm';

   async function test() {
     await init();

     // This crashes with RuntimeError: unreachable
     const db = WasmDhDatabase.withDefaults();
     const robots = db.listRobots();
   }
   ```

3. Alternatively, using the top-level functions also crashes:
   ```typescript
   import init, { listDhDatabase, listSupportedRobots } from 'trajx-wasm';

   async function test() {
     await init();

     // Both of these crash
     const robots1 = listDhDatabase();
     const robots2 = listSupportedRobots();
   }
   ```

## Expected Behavior

The functions should return an array of robot names from the hardcoded DH database, e.g.:
```javascript
["Fanuc_LR_Mate_200iD_7L", "Fanuc_LR_Mate_200iD", "UR5", "UR10", ...]
```

## Actual Behavior

The WASM module crashes with:
```
trajx_wasm_bg.wasm:0xdebad Uncaught RuntimeError: unreachable
    at trajx_wasm_bg.wasm:0xdebad
    at WasmDhDatabase.listRobots (trajx_wasm.js:5615:18)
    ...
```

The error `unreachable` typically indicates a Rust panic occurred inside the WASM module.

## Full Error Stack Trace

```
trajx_wasm_bg.wasm:0xdebad Uncaught RuntimeError: unreachable
    at trajx_wasm_bg.wasm:0xdebad
    at WasmDhDatabase.listRobots (trajx_wasm.js?v=8b51456f:5615:18)
    at KinematicsManager.getAvailableRobots (index.mjs:872:28)
    at index.mjs:1151:34
    at Object.react_stack_bottom_frame (chunk-MA4GMVPM.js?v=8b51456f:18567:20)
    at runWithFiberInDEV (chunk-MA4GMVPM.js?v=8b51456f:997:72)
    at commitHookEffectListMount (chunk-MA4GMVPM.js?v=8b51456f:9411:163)
    at commitHookPassiveMountEffects (chunk-MA4GMVPM.js?v=8b51456f:9465:60)
    ...
$__wbindgen_export_3 @ trajx_wasm_bg.wasm:0xdebad
listRobots @ trajx_wasm.js?v=8b51456f:5615
```

## Analysis

The crash occurs in `$__wbindgen_export_3` which is typically the panic handler. The root cause appears to be in the `DhDatabase::with_defaults()` → `add_default_robots()` code path.

### Relevant Code

**crates/trajx-wasm/src/dh_database.rs**:
```rust
#[wasm_bindgen]
impl WasmDhDatabase {
    #[wasm_bindgen(js_name = withDefaults)]
    pub fn with_defaults() -> Self {
        Self {
            inner: CoreDhDatabase::with_defaults(),
        }
    }

    #[wasm_bindgen(js_name = listRobots)]
    pub fn list_robots(&self) -> Vec<String> {
        self.inner.list_robots()
    }
}
```

**crates/trajx-core/src/robot/dh_database.rs**:
```rust
impl DhDatabase {
    pub fn with_defaults() -> Self {
        let mut db = Self::new();
        db.add_default_robots();  // <-- This may be panicking
        db
    }
}
```

### Possible Causes

1. **Memory allocation failure** in WASM when creating the HashMap or Vec for robot configurations
2. **String allocation issue** when creating robot names/descriptions
3. **Float constant evaluation** - some DH parameter constants use `std::f64::consts::PI` which may have issues in WASM context
4. **Missing panic hook initialization** - the WASM panic handler may not be properly set up
5. **Lazy static initialization issue** - if there are any lazy_static or once_cell patterns that fail in WASM

## Workaround

Currently there is no workaround - any use of the DH database API in WASM crashes.

## Suggested Investigation

1. Add `console_error_panic_hook` to get better panic messages:
   ```rust
   #[wasm_bindgen(start)]
   pub fn start() {
       console_error_panic_hook::set_once();
   }
   ```

2. Test the `DhDatabase::with_defaults()` function in a native Rust test to verify it works:
   ```bash
   cargo test --package trajx-core test_with_defaults_has_known_robots
   ```

3. Add debug logging to `add_default_robots()` to identify which robot configuration causes the panic

4. Check if there's a size limit issue - the hardcoded database is quite large with many robots

5. Build with debug symbols to get better stack traces:
   ```bash
   wasm-pack build --dev --target web
   ```

## Related Files

- `crates/trajx-wasm/src/dh_database.rs` - WASM bindings for DH database
- `crates/trajx-core/src/robot/dh_database.rs` - Core DH database implementation
- `crates/trajx-wasm/src/lib.rs` - WASM module entry point

## Impact

This bug blocks all DH database functionality in the WASM build, including:
- Listing available robots
- Looking up DH parameters by robot name
- Auto-detection of robot type for analytical IK

## Consumer Context

This issue was discovered when using trajx-wasm in the RoboViz project (montpelier). The `KinematicsManager` class tries to initialize the DH database during WASM initialization to provide a list of available robots to the UI.
