/**
 * Timeline Component Types
 *
 * Core type definitions for the timeline visualization system.
 * Designed for collision visualization, trajectory playback, and multi-robot coordination.
 */

import type { Pose3D, Position3D } from '../../coordinates';

// =============================================================================
// Time Types
// =============================================================================

/** Time range in milliseconds */
export interface TimeRange {
  start: number;
  end: number;
}

/** Zoom level configuration */
export interface ZoomConfig {
  /** Pixels per millisecond */
  scale: number;
  /** Minimum scale (most zoomed out) */
  minScale: number;
  /** Maximum scale (most zoomed in) */
  maxScale: number;
}

// =============================================================================
// Event Types
// =============================================================================

/** Severity levels for timeline events */
export type EventSeverity = 'critical' | 'warning' | 'info';

/** Types of collision-related events (Timeline-specific) */
export type TimelineCollisionEventType =
  | 'collision'        // Actual collision detected
  | 'near-miss'        // Close proximity warning
  | 'zone-enter'       // Entered safety zone
  | 'zone-exit';       // Exited safety zone

/** Collision participant - the source of collision */
export interface CollisionSource {
  robotId: string;
  linkName: string;
  jointIndex?: number;
}

/** Collision target - what was collided with */
export type CollisionTarget =
  | { type: 'obstacle'; obstacleId: string; obstacleName: string }
  | { type: 'robot'; robotId: string; linkName: string }
  | { type: 'safety-zone'; zoneId: string; zoneName: string; level: 'warning' | 'danger' }
  | { type: 'self'; linkName: string };

/** Detailed collision information */
export interface CollisionDetails {
  /** Minimum distance at collision point (mm) */
  distance: number;
  /** Contact point in world coordinates */
  contactPoint?: Position3D;
  /** Robot state at collision time */
  robotState: {
    joints: number[];
    tcpPose: Pose3D;
  };
  /** Velocity at collision (mm/s) */
  velocity?: number;
}

/** A collision event on the timeline (Timeline-specific) */
export interface TimelineCollisionEvent {
  id: string;
  /** Timestamp when event occurred (ms) */
  timestamp: number;
  /** Duration of event (ms), for range-based events like zone occupancy */
  duration?: number;
  /** Event type */
  type: TimelineCollisionEventType;
  /** Severity level */
  severity: EventSeverity;
  /** Source of collision (robot part) */
  source: CollisionSource;
  /** Target of collision */
  target: CollisionTarget;
  /** Detailed collision data */
  details: CollisionDetails;
  /** Optional message for display */
  message?: string;
}

/** Extended severity levels for general use */
export type ExtendedSeverity = EventSeverity | 'high' | 'medium' | 'low' | 'success' | 'error';

/** Generic timeline event (extensible by users) */
export interface TimelineEvent<T = unknown> {
  id: string;
  timestamp: number;
  duration?: number;
  type: string;
  severity?: EventSeverity | ExtendedSeverity;
  /** Lane ID to associate this event with a specific lane */
  laneId?: string;
  data?: T;
  label?: string;
  /** Custom color for this event (overrides default) */
  color?: string;
  /** Custom icon for this event */
  icon?: React.ReactNode;
}

// =============================================================================
// Lane Types
// =============================================================================

/** Lane types for different visualization purposes */
export type LaneType =
  | 'robot'         // Robot overview lane
  | 'joint'         // Individual joint lane
  | 'tcp'           // TCP/end-effector lane
  | 'safety-zone'   // Safety zone lane
  | 'trajectory'    // Trajectory lane
  | 'custom';       // User-defined lane

/** Configuration for a timeline lane */
export interface TimelineLane {
  id: string;
  label: string;
  type: LaneType;

  // Associations
  robotId?: string;
  jointIndex?: number;
  zoneId?: string;

  // Visual configuration
  color?: string;
  height?: number;
  icon?: React.ComponentType<{ size?: number }>;

  // Behavior
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  selectable?: boolean;

  // Nested lanes (e.g., robot -> joints)
  children?: TimelineLane[];

  // Custom data
  metadata?: Record<string, unknown>;
}

/** Lane group for organizing related lanes */
export interface LaneGroup {
  id: string;
  label: string;
  lanes: TimelineLane[];
  collapsed?: boolean;
  color?: string;
  icon?: React.ComponentType<{ size?: number }>;
}

// =============================================================================
// State Types
// =============================================================================

/** Current playback state (Timeline-specific) */
export interface TimelinePlaybackState {
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  loop: boolean;
}

/** Selection state (Timeline-specific) */
export interface TimelineSelectionState {
  selectedEventId: string | null;
  selectedLaneId: string | null;
  selectedRange: TimeRange | null;
  hoveredEventId: string | null;
  hoveredLaneId: string | null;
}

/** View state for the timeline */
export interface TimelineViewState {
  /** Visible time range */
  visibleRange: TimeRange;
  /** Current zoom configuration */
  zoom: ZoomConfig;
  /** Scroll position (horizontal offset in pixels) */
  scrollX: number;
  /** Collapsed lane IDs */
  collapsedLanes: Set<string>;
}

// =============================================================================
// Component Props Types
// =============================================================================

/** Props for the TimelineContainer component */
export interface TimelineContainerProps {
  /** Total time range of the timeline */
  timeRange: TimeRange;
  /** Current playback time */
  currentTime: number;
  /** Callback when time changes (via playhead drag) */
  onTimeChange?: (time: number) => void;

  // Playback
  isPlaying?: boolean;
  playbackSpeed?: number;
  onPlayPause?: () => void;
  onSpeedChange?: (speed: number) => void;

  // View control
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  onViewChange?: (state: TimelineViewState) => void;

  // Children
  children?: React.ReactNode;

  // Styling
  className?: string;
  style?: React.CSSProperties;
  height?: number;

  /** Color theme */
  theme?: 'light' | 'dark' | 'auto';
}

/** Props for TimeRuler component */
export interface TimeRulerProps {
  timeRange: TimeRange;
  visibleRange: TimeRange;
  zoom: ZoomConfig;
  height?: number;
  showMilliseconds?: boolean;
  tickColor?: string;
  labelColor?: string;
  className?: string;
}

/** Props for Lane component */
export interface LaneProps {
  lane: TimelineLane;
  events: TimelineEvent[];
  timeRange: TimeRange;
  zoom: ZoomConfig;

  // Selection
  selectedEventId?: string | null;
  hoveredEventId?: string | null;
  onEventSelect?: (event: TimelineEvent) => void;
  onEventHover?: (event: TimelineEvent | null) => void;

  // Customization
  renderEvent?: (event: TimelineEvent, lane: TimelineLane) => React.ReactNode;

  className?: string;
}

/** Props for LaneGroup component */
export interface LaneGroupProps {
  group: LaneGroup;
  events: TimelineEvent[];
  timeRange: TimeRange;
  zoom: ZoomConfig;

  // State
  collapsed?: boolean;
  onToggleCollapse?: (groupId: string) => void;

  // Selection
  selectedEventId?: string | null;
  hoveredEventId?: string | null;
  onEventSelect?: (event: TimelineEvent) => void;
  onEventHover?: (event: TimelineEvent | null) => void;

  // Customization
  renderLaneHeader?: (lane: TimelineLane) => React.ReactNode;
  renderEvent?: (event: TimelineEvent, lane: TimelineLane) => React.ReactNode;

  className?: string;
}

/** Props for EventMarker component */
export interface EventMarkerProps {
  event: TimelineEvent;
  position: number;
  width?: number;

  // State
  selected?: boolean;
  hovered?: boolean;

  // Callbacks
  onClick?: (event: TimelineEvent) => void;
  onMouseEnter?: (event: TimelineEvent) => void;
  onMouseLeave?: () => void;
  onDoubleClick?: (event: TimelineEvent) => void;

  // Customization
  color?: string;
  icon?: React.ReactNode;
  tooltip?: React.ReactNode;

  className?: string;
}

/** Props for Playhead component */
export interface PlayheadProps {
  time: number;
  position: number;
  height: number;
  dragging?: boolean;
  onDragStart?: () => void;
  onDrag?: (time: number) => void;
  onDragEnd?: () => void;
  color?: string;
  className?: string;
}

// =============================================================================
// High-level Component Props
// =============================================================================

/** Props for CollisionTimeline component */
export interface CollisionTimelineProps {
  // Data
  events: TimelineCollisionEvent[];
  lanes: TimelineLane[];

  // Time control
  timeRange: TimeRange;
  currentTime: number;
  onTimeChange?: (time: number) => void;

  // Playback
  isPlaying?: boolean;
  playbackSpeed?: number;
  loop?: boolean;
  onPlayPause?: () => void;
  onSpeedChange?: (speed: number) => void;

  // Selection
  selectedEventId?: string | null;
  onEventSelect?: (event: TimelineCollisionEvent | null) => void;
  onEventHover?: (event: TimelineCollisionEvent | null) => void;
  onEventDoubleClick?: (event: TimelineCollisionEvent) => void;

  // Lane control
  collapsedLanes?: string[];
  onLaneToggle?: (laneId: string, collapsed: boolean) => void;

  // Customization
  renderEvent?: (event: TimelineCollisionEvent, lane: TimelineLane) => React.ReactNode;
  renderLaneHeader?: (lane: TimelineLane) => React.ReactNode;
  renderTooltip?: (event: TimelineCollisionEvent) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;

  // Filtering
  severityFilter?: EventSeverity[];
  typeFilter?: TimelineCollisionEventType[];

  // Display options
  showPlaybackControls?: boolean;
  showZoomControls?: boolean;
  showLegend?: boolean;
  showMinimap?: boolean;

  // Styling
  className?: string;
  style?: React.CSSProperties;
  height?: number;
  theme?: 'light' | 'dark' | 'auto';
}

// =============================================================================
// Utility Types
// =============================================================================

/** Callback for timeline interactions */
export interface TimelineCallbacks {
  onTimeChange?: (time: number) => void;
  onEventSelect?: (event: TimelineEvent | null) => void;
  onEventHover?: (event: TimelineEvent | null) => void;
  onRangeSelect?: (range: TimeRange | null) => void;
  onZoomChange?: (zoom: ZoomConfig) => void;
}

/** Configuration for event colors by type/severity */
export interface EventColorConfig {
  collision: {
    critical: string;
    warning: string;
    info: string;
  };
  nearMiss: {
    critical: string;
    warning: string;
    info: string;
  };
  zoneEnter: string;
  zoneExit: string;
  default: string;
}

/** Default event colors */
export const DEFAULT_EVENT_COLORS: EventColorConfig = {
  collision: {
    critical: '#ef4444',  // red-500
    warning: '#f97316',   // orange-500
    info: '#3b82f6',      // blue-500
  },
  nearMiss: {
    critical: '#fbbf24',  // amber-400
    warning: '#fcd34d',   // amber-300
    info: '#93c5fd',      // blue-300
  },
  zoneEnter: '#f97316',   // orange-500
  zoneExit: '#22c55e',    // green-500
  default: '#6b7280',     // gray-500
};

/** Default lane heights */
export const DEFAULT_LANE_HEIGHTS = {
  robot: 32,
  joint: 24,
  tcp: 28,
  'safety-zone': 28,
  trajectory: 28,
  custom: 24,
} as const;
