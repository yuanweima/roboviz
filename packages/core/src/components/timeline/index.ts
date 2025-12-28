/**
 * Timeline Components
 *
 * A comprehensive timeline system for visualizing collision events,
 * robot trajectories, and time-based data in robotics applications.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================
export * from './types';

// =============================================================================
// Hooks
// =============================================================================
export * from './hooks';

// =============================================================================
// Core Components
// =============================================================================
export { TimeRuler } from './TimeRuler';
export { Playhead } from './Playhead';
export { EventMarker } from './EventMarker';
export { Lane } from './Lane';
export { LaneGroup } from './LaneGroup';
export { TimelineContainer, type TimelineContainerHandle } from './TimelineContainer';

// =============================================================================
// High-level Components
// =============================================================================
export { CollisionTimeline } from './CollisionTimeline';
export { GenericTimeline, DEFAULT_SEVERITY_COLORS } from './GenericTimeline';
export type { GenericTimelineProps, LegendItemConfig } from './GenericTimeline';
