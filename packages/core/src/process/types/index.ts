/**
 * Process System Types
 *
 * Re-exports all types for the process plugin system.
 */

// Capability types
export type {
  BuiltinCapability,
  CapabilityId,
  CapabilityComponentProps,
  CapabilityDefinition,
  CapabilityRegistry,
  CapabilityState,
  CapabilityActions,
  CapabilityContextValue,
} from './capability';

// Input types
export type {
  InputType,
  BaseInputSelection,
  EdgePoint,
  EdgeSelection,
  SurfaceSelection,
  PointSelection,
  RegionSelection,
  PathSelection,
  InputSelection,
  SelectionState,
  SelectionActions,
} from './input';

// Process types
export type {
  ToolType,
  ProcessStatus,
  ProcessSettingsPanelProps,
  ProcessVisualizationProps,
  ProcessInspectorProps,
  ProcessToolbarExtrasProps,
  ValidationResult,
  ProcessDefinition,
  ProcessState,
  ProcessActions,
  ProcessContextValue,
  ProcessRegistrationOptions,
} from './process';
