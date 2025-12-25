/**
 * Capability System Types
 *
 * Capabilities are reusable feature modules that can be composed
 * by different processes. Each capability provides hooks, UI components,
 * and 3D visualization components.
 */

import type * as React from 'react';

// ============================================================================
// Capability Identifiers
// ============================================================================

/**
 * Built-in capability identifiers
 */
export type BuiltinCapability =
  | 'edge-selection'      // Pick edges on mesh
  | 'surface-selection'   // Pick surfaces/regions on mesh
  | 'point-selection'     // Pick individual points
  | 'region-selection'    // Select/draw regions
  | 'angle-lock'          // Lock tool orientation angle
  | 'force-control'       // Force-based control settings
  | 'coverage-planning'   // Surface coverage pattern generation
  | 'viewpoint-planning'  // Camera viewpoint optimization
  | 'collision-preview'   // Show collision detection results
  | 'seam-tracking'       // Real-time seam tracking
  | 'multi-robot';        // Coordinate multiple robots

/**
 * Capability identifier (builtin or custom string)
 */
export type CapabilityId = BuiltinCapability | (string & {});

// ============================================================================
// Capability Definition
// ============================================================================

/**
 * Generic props for capability components
 */
export interface CapabilityComponentProps {
  enabled?: boolean;
  [key: string]: unknown;
}

/**
 * Definition of a capability module
 */
export interface CapabilityDefinition<
  THooks extends Record<string, () => unknown> = Record<string, () => unknown>,
  TComponents extends Record<string, React.ComponentType<CapabilityComponentProps>> = Record<string, React.ComponentType<CapabilityComponentProps>>,
  TVisualization extends Record<string, React.ComponentType<CapabilityComponentProps>> = Record<string, React.ComponentType<CapabilityComponentProps>>
> {
  /** Unique identifier for this capability */
  id: CapabilityId;

  /** Human-readable name */
  name: string;

  /** Description of what this capability provides */
  description: string;

  /**
   * React hooks provided by this capability
   * Keys are hook names (e.g., 'useEdgeSelection')
   */
  hooks: THooks;

  /**
   * UI panel components provided by this capability
   * Keys are component names (e.g., 'SettingsPanel')
   */
  components: TComponents;

  /**
   * 3D visualization components provided by this capability
   * Keys are component names (e.g., 'Highlighter')
   */
  visualization: TVisualization;

  /**
   * Dependencies on other capabilities
   */
  dependencies?: CapabilityId[];

  /**
   * Default configuration for this capability
   */
  defaultConfig?: Record<string, unknown>;
}

// ============================================================================
// Capability Registry
// ============================================================================

/**
 * Registry of all available capabilities
 */
export interface CapabilityRegistry {
  /** Get a capability by ID */
  get: (id: CapabilityId) => CapabilityDefinition | undefined;

  /** Register a new capability */
  register: (capability: CapabilityDefinition) => void;

  /** Check if a capability is registered */
  has: (id: CapabilityId) => boolean;

  /** Get all registered capabilities */
  getAll: () => CapabilityDefinition[];

  /** Get capabilities by IDs */
  getMany: (ids: CapabilityId[]) => CapabilityDefinition[];
}

// ============================================================================
// Capability State
// ============================================================================

/**
 * Runtime state for an active capability
 */
export interface CapabilityState {
  /** Capability ID */
  id: CapabilityId;

  /** Whether the capability is currently enabled */
  enabled: boolean;

  /** Capability-specific configuration */
  config: Record<string, unknown>;

  /** Capability-specific state data */
  data: Record<string, unknown>;
}

/**
 * Actions for manipulating capability state
 */
export interface CapabilityActions {
  /** Enable or disable the capability */
  setEnabled: (enabled: boolean) => void;

  /** Update capability configuration */
  setConfig: (config: Partial<Record<string, unknown>>) => void;

  /** Update capability state data */
  setData: (data: Partial<Record<string, unknown>>) => void;

  /** Reset capability to default state */
  reset: () => void;
}

// ============================================================================
// Capability Context
// ============================================================================

/**
 * Context value for capability system
 */
export interface CapabilityContextValue {
  /** All registered capabilities */
  registry: CapabilityRegistry;

  /** Currently active capabilities (for current process) */
  activeCapabilities: CapabilityState[];

  /** Get state for a specific capability */
  getCapabilityState: (id: CapabilityId) => CapabilityState | undefined;

  /** Get actions for a specific capability */
  getCapabilityActions: (id: CapabilityId) => CapabilityActions | undefined;
}
