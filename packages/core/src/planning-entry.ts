/**
 * @yuanweima/roboviz-core/planning
 *
 * Motion planning entry point — path planning, collision detection,
 * and planning-dependent components.
 *
 * Requires either:
 * - trajx-wasm (for local WASM planning)
 * - A remote planner backend
 * - A custom IPlannerProvider implementation
 *
 * @packageDocumentation
 */

// =============================================================================
// Motion Planning
// =============================================================================
export * from './planning';

// =============================================================================
// Collision Detection
// =============================================================================
export * from './collision';

// =============================================================================
// Workers (FK computation workers)
// =============================================================================
export * from './workers';
