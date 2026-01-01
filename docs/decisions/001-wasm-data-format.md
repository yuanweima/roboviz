# ADR-001: WASM Flat Array Data Format

## Status
Accepted

## Date
2024-12

## Context

The trajx-wasm library (Rust compiled to WebAssembly) needs to return multi-dimensional data (paths, solutions) to JavaScript. Key considerations:

1. **Performance**: Minimize data copy between WASM and JS
2. **Memory**: Avoid creating many small objects
3. **Flexibility**: Support variable-length data (paths with different waypoint counts)

### Options Considered

1. **Return JS objects directly**
   - Pros: Easy to use
   - Cons: Slow (requires many allocations), complex WASM bindings

2. **Return flat typed arrays**
   - Pros: Fast (single allocation), efficient memory
   - Cons: Requires parsing, loses structure

3. **Return flat arrays with metadata header**
   - Pros: Self-describing, fast
   - Cons: Callers must skip header

## Decision

Use **flat typed arrays with metadata header** for all multi-element returns.

### Format Specification

```
[metadata..., data...]
```

For path data:
```
[dof, n_waypoints, j1_1, j2_1, ..., jN_1, j1_2, j2_2, ..., jN_2, ...]
 ^^^  ^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 DOF  Count        Actual joint data (waypoint 1, waypoint 2, ...)
```

For IK solutions:
```
[dof, n_solutions, sol1_j1, sol1_j2, ..., sol1_jN, sol2_j1, ...]
```

### API Examples

```typescript
// Raw WASM return
const raw = result.getPathFlat();
// raw = [6, 10, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, ...]
//        ^  ^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//       dof=6, 10 waypoints, joint data...

// Proper parsing
const dof = raw[0];
const count = raw[1];
const data = raw.slice(2);
const waypoints = [];
for (let i = 0; i < count; i++) {
  waypoints.push(Array.from(data.slice(i * dof, (i + 1) * dof)));
}
```

## Consequences

### Positive
- Fast data transfer (single Float64Array allocation)
- Self-describing (metadata included)
- Consistent format across all APIs

### Negative
- **Callers MUST skip metadata** - forgetting causes subtle bugs
- Metadata values can look like valid joint values (e.g., dof=6 is within joint limits)
- Requires documentation and validation

### Mitigations

1. **Documentation**: JSDoc on all functions that return this format
2. **Validation**: Check first waypoint against joint limits to catch metadata-as-data bugs
3. **Wrapper functions**: Provide high-level APIs that handle parsing internally
4. **Pitfall documentation**: Record in `docs/internal/pitfalls.md`

## Related
- `planning-manager.ts:610-634` - Implementation
- `trajx_wasm.js:2454` - WASM binding documentation
- `docs/internal/pitfalls.md#P001` - Related pitfall
