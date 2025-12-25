/**
 * Process System Types
 *
 * Core types for the process plugin system. A process represents
 * a specific industrial application (welding, grinding, inspection, etc.)
 * that can be registered and activated in the RoboViz workspace.
 */

import type * as React from 'react';
import type { CapabilityId } from './capability';
import type { InputType, InputSelection } from './input';

// ============================================================================
// Tool Types
// ============================================================================

/**
 * Types of robot end-effector tools
 */
export type ToolType =
  | 'torch'     // Welding torch
  | 'grinder'   // Grinding/polishing tool
  | 'camera'    // Inspection camera
  | 'probe'     // Measurement probe
  | 'spray'     // Spray painting gun
  | 'laser'     // Laser cutter/engraver
  | 'gripper'   // Pick and place gripper
  | 'custom';   // Custom tool

// ============================================================================
// Process Status
// ============================================================================

/**
 * Status of a process operation
 */
export type ProcessStatus =
  | 'idle'           // No active operation
  | 'selecting'      // Selecting input geometry
  | 'configuring'    // Configuring process settings
  | 'generating'     // Generating trajectory (backend)
  | 'ready'          // Trajectory ready for review
  | 'adjusting'      // User is adjusting waypoints
  | 'validating'     // Validating trajectory (backend)
  | 'executing'      // Robot is executing
  | 'paused'         // Execution paused
  | 'completed'      // Process completed
  | 'error';         // Error occurred

// ============================================================================
// Process Definition
// ============================================================================

/**
 * Props passed to process settings panel component
 */
export interface ProcessSettingsPanelProps<TSettings = unknown> {
  settings: TSettings;
  onChange: (settings: TSettings) => void;
  disabled?: boolean;
}

/**
 * Props passed to process visualization component
 */
export interface ProcessVisualizationProps<TInput = unknown, TSettings = unknown> {
  input: TInput | null;
  settings: TSettings;
  status: ProcessStatus;
  enabled?: boolean;
}

/**
 * Props passed to process inspector component
 */
export interface ProcessInspectorProps {
  trajectoryId: string | null;
  selectedWaypointId: string | null;
  onSelectWaypoint: (id: string | null) => void;
}

/**
 * Props passed to process toolbar extras component
 */
export interface ProcessToolbarExtrasProps {
  status: ProcessStatus;
}

/**
 * Validation result for process inputs or settings
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field?: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

/**
 * Definition of a process plugin
 *
 * @template TInput - Type of input this process accepts
 * @template TSettings - Type of process-specific settings
 * @template TOutput - Type of additional output (beyond trajectory)
 */
export interface ProcessDefinition<
  TInput = unknown,
  TSettings = unknown,
  TOutput = unknown
> {
  // ========== Identity ==========

  /** Unique identifier for this process */
  id: string;

  /** Human-readable name */
  name: string;

  /** Short description */
  description: string;

  /** Icon component for UI */
  icon: React.ComponentType<{ size?: number; color?: string }>;

  /** Primary color for this process */
  color: string;

  /** Category for grouping in UI */
  category?: string;

  // ========== Capabilities ==========

  /** Capabilities this process requires */
  capabilities: CapabilityId[];

  /** Types of input this process accepts */
  inputTypes: InputType[];

  /** Type of tool used by this process */
  toolType: ToolType;

  // ========== Settings ==========

  /** Default settings for this process */
  defaultSettings: TSettings;

  /** Validate process settings */
  validateSettings?: (settings: TSettings) => ValidationResult;

  /** Validate input selection */
  validateInput?: (input: TInput) => ValidationResult;

  // ========== UI Components ==========

  components: {
    /**
     * Settings panel for this process
     * Rendered in the sidebar when this process is active
     */
    SettingsPanel?: React.ComponentType<ProcessSettingsPanelProps<TSettings>>;

    /**
     * 3D visualization specific to this process
     * Rendered in the Canvas when this process is active
     */
    Visualization?: React.ComponentType<ProcessVisualizationProps<TInput, TSettings>>;

    /**
     * Inspector panel for trajectory/waypoint details
     * Rendered in the sidebar when trajectory is available
     */
    Inspector?: React.ComponentType<ProcessInspectorProps>;

    /**
     * Additional toolbar buttons/controls
     * Rendered in the main toolbar when this process is active
     */
    ToolbarExtras?: React.ComponentType<ProcessToolbarExtrasProps>;

    /**
     * Help/documentation panel
     * Rendered when user requests help
     */
    HelpPanel?: React.ComponentType;
  };

  // ========== Lifecycle Hooks ==========

  /**
   * Called when process is activated
   */
  onActivate?: () => void | Promise<void>;

  /**
   * Called when process is deactivated
   */
  onDeactivate?: () => void | Promise<void>;

  /**
   * Called when input selection changes
   */
  onInputChange?: (input: TInput | null) => void;

  /**
   * Called when settings change
   */
  onSettingsChange?: (settings: TSettings) => void;

  // ========== Protocol ==========

  protocol?: {
    /**
     * Message type prefix for this process
     * e.g., 'welding' -> 'welding.generateTrajectory'
     */
    messagePrefix: string;

    /**
     * Custom message handlers for this process
     */
    handlers?: Record<string, (payload: unknown) => void | Promise<void>>;
  };
}

// ============================================================================
// Process State
// ============================================================================

/**
 * Runtime state for an active process
 */
export interface ProcessState<
  TInput = unknown,
  TSettings = unknown
> {
  /** Process definition ID */
  processId: string;

  /** Current status */
  status: ProcessStatus;

  /** Current input selection */
  input: TInput | null;

  /** Current settings */
  settings: TSettings;

  /** ID of the generated trajectory (if any) */
  trajectoryId: string | null;

  /** Progress of current operation (0-100) */
  progress: number;

  /** Error message (if status is 'error') */
  error: string | null;

  /** Timestamp of last state change */
  lastUpdated: number;
}

/**
 * Actions for manipulating process state
 */
export interface ProcessActions<
  TInput = unknown,
  TSettings = unknown
> {
  /** Set current status */
  setStatus: (status: ProcessStatus) => void;

  /** Set input selection */
  setInput: (input: TInput | null) => void;

  /** Update settings */
  setSettings: (settings: TSettings) => void;

  /** Update settings partially */
  updateSettings: (updates: Partial<TSettings>) => void;

  /** Set trajectory ID */
  setTrajectoryId: (id: string | null) => void;

  /** Set progress */
  setProgress: (progress: number) => void;

  /** Set error */
  setError: (error: string | null) => void;

  /** Reset to initial state */
  reset: () => void;

  /** Generate trajectory from current input and settings */
  generateTrajectory: () => Promise<void>;

  /** Validate current input and settings */
  validate: () => ValidationResult;
}

// ============================================================================
// Process Context
// ============================================================================

/**
 * Context value for process system
 */
export interface ProcessContextValue {
  /** All registered processes */
  processes: ProcessDefinition[];

  /** Currently active process definition */
  activeProcess: ProcessDefinition | null;

  /** Current process state */
  processState: ProcessState | null;

  /** Process actions */
  processActions: ProcessActions | null;

  /** Activate a process by ID */
  activateProcess: (processId: string) => void;

  /** Deactivate current process */
  deactivateProcess: () => void;

  /** Check if a process is registered */
  hasProcess: (processId: string) => boolean;

  /** Get a process by ID */
  getProcess: (processId: string) => ProcessDefinition | undefined;
}

// ============================================================================
// Process Registration
// ============================================================================

/**
 * Options for registering a process
 */
export interface ProcessRegistrationOptions {
  /** Override existing process with same ID */
  override?: boolean;
}
