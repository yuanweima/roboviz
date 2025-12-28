/**
 * Property Editor Types
 *
 * Type definitions for the schema-driven property editor system.
 * Designed for editing robot point attributes, obstacle properties,
 * and custom industrial parameters.
 */

import type { Pose3D, Position3D, EulerAngles } from '../../coordinates';

// =============================================================================
// Schema Types
// =============================================================================

/** Property field types */
export type PropertyFieldType =
  // Basic types
  | 'text'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'color'
  | 'tags'
  // Geometry types
  | 'position3d'
  | 'euler'
  | 'quaternion'
  | 'pose3d'
  // Robot-specific types
  | 'joint-array'
  // Custom (user-defined)
  | string;

/** Base property field definition */
export interface PropertyField {
  /** Unique key for this field (maps to data property) */
  key: string;
  /** Field type */
  type: PropertyFieldType;
  /** Display label */
  label: string;

  // Display options
  /** Placeholder text for empty fields */
  placeholder?: string;
  /** Unit to display (e.g., 'mm', '°', 'A') */
  unit?: string;
  /** Help text / description */
  description?: string;
  /** Icon to display */
  icon?: React.ComponentType<{ size?: number }>;
  /** Whether to show inline (for compact layout) */
  inline?: boolean;

  // Validation
  /** Whether this field is required */
  required?: boolean;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Step size (for numbers) */
  step?: number;
  /** Decimal precision (for numbers) */
  precision?: number;
  /** Pattern to match (for text) */
  pattern?: RegExp;
  /** Custom validation function */
  validate?: (value: unknown, allValues: Record<string, unknown>) => string | null;

  // Conditional logic
  /** Whether this field is visible */
  visible?: boolean | ((values: Record<string, unknown>) => boolean);
  /** Whether this field is disabled */
  disabled?: boolean | ((values: Record<string, unknown>) => boolean);
  /** Whether this field is read-only */
  readOnly?: boolean;

  // Computed/derived values
  /**
   * Computed value function - calculates field value from other fields.
   * When set, the field becomes read-only and its value is derived.
   * Useful for displaying calculated values like totals, distances, etc.
   *
   * @example
   * // Calculate distance from start/end positions
   * computedValue: (values) => {
   *   const start = values.start as [number, number, number];
   *   const end = values.end as [number, number, number];
   *   return Math.sqrt(
   *     Math.pow(end[0] - start[0], 2) +
   *     Math.pow(end[1] - start[1], 2) +
   *     Math.pow(end[2] - start[2], 2)
   *   );
   * }
   */
  computedValue?: (values: Record<string, unknown>) => unknown;
  /**
   * Dependencies for computed value - list of field keys that trigger recomputation.
   * If not specified, recomputes on any value change.
   */
  computedDeps?: string[];

  // Type-specific options
  /** Options for enum fields */
  options?: EnumOption[];
  /** Max length for text fields */
  maxLength?: number;
  /** Min length for text fields */
  minLength?: number;
  /** Whether text is multiline */
  multiline?: boolean;
  /** Number of rows for multiline text */
  rows?: number;

  // Number field options
  /** Show slider for number fields (requires min/max) */
  showSlider?: boolean;

  // Value transformation
  /**
   * Value transformer for converting between display and internal formats.
   * Useful for unit conversion (e.g., display mm but store m internally).
   *
   * @example
   * // Display millimeters, store meters
   * transform: ValueTransformers.metersToMillimeters
   *
   * @example
   * // Custom scale factor
   * transform: ValueTransformers.scale(1000)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform?: ValueTransformer<any, any>;

  // Position3D field options
  /** Whether to allow linking X/Y/Z for uniform scaling (Position3D only) */
  allowLink?: boolean;
  /** Coordinate labels for Position3D field */
  labels?: [string, string, string];
}

/** Enum option */
export interface EnumOption {
  value: string | number;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
}

/** Property group definition */
export interface PropertyGroup {
  /** Unique ID for this group */
  id: string;
  /** Display label */
  label: string;
  /** Icon */
  icon?: React.ComponentType<{ size?: number }>;
  /** Fields in this group */
  fields: PropertyField[];

  // Behavior
  /** Whether group is collapsible */
  collapsible?: boolean;
  /** Whether group starts collapsed */
  defaultCollapsed?: boolean;
  /** Whether to show group header */
  showHeader?: boolean;

  // Conditional
  /** Whether this group is visible */
  visible?: boolean | ((values: Record<string, unknown>) => boolean);
}

/** Complete property schema */
export interface PropertySchema {
  /** Groups of fields */
  groups: PropertyGroup[];

  // Layout options
  layout?: {
    /** Label column width */
    labelWidth?: number;
    /** Number of columns */
    columns?: 1 | 2 | 3;
    /** Compact mode */
    compact?: boolean;
  };

  // Global validation
  validate?: (values: Record<string, unknown>) => PropertyValidationResult;
}

// =============================================================================
// Value Transformation Types
// =============================================================================

/**
 * Value transformer for converting between display and internal formats.
 * Useful for unit conversion (e.g., mm display but m internal storage).
 */
export interface ValueTransformer<TInternal = unknown, TDisplay = unknown> {
  /**
   * Transform internal value to display value.
   * Called when rendering the field.
   * @example (meters) => meters * 1000  // m to mm
   */
  toDisplay: (internal: TInternal) => TDisplay;

  /**
   * Transform display value to internal value.
   * Called when user changes the field.
   * @example (mm) => mm / 1000  // mm to m
   */
  toInternal: (display: TDisplay) => TInternal;
}

/**
 * Common value transformers for typical use cases.
 */
export const ValueTransformers = {
  /** Meters to millimeters (display mm, store m) */
  metersToMillimeters: {
    toDisplay: (m: number) => m * 1000,
    toInternal: (mm: number) => mm / 1000,
  } as ValueTransformer<number, number>,

  /** Radians to degrees (display deg, store rad) */
  radiansToDegrees: {
    toDisplay: (rad: number) => rad * (180 / Math.PI),
    toInternal: (deg: number) => deg * (Math.PI / 180),
  } as ValueTransformer<number, number>,

  /** Percentage (display 0-100%, store 0-1) */
  percentage: {
    toDisplay: (ratio: number) => ratio * 100,
    toInternal: (percent: number) => percent / 100,
  } as ValueTransformer<number, number>,

  /** Seconds to milliseconds (display ms, store s) */
  secondsToMilliseconds: {
    toDisplay: (s: number) => s * 1000,
    toInternal: (ms: number) => ms / 1000,
  } as ValueTransformer<number, number>,

  /** Newtons to kilonewtons (display kN, store N) */
  newtonsToKilonewtons: {
    toDisplay: (n: number) => n / 1000,
    toInternal: (kn: number) => kn * 1000,
  } as ValueTransformer<number, number>,

  /** Create a scale transformer */
  scale: (factor: number): ValueTransformer<number, number> => ({
    toDisplay: (internal) => internal * factor,
    toInternal: (display) => display / factor,
  }),

  /** Create an offset transformer */
  offset: (offset: number): ValueTransformer<number, number> => ({
    toDisplay: (internal) => internal + offset,
    toInternal: (display) => display - offset,
  }),
} as const;

// =============================================================================
// Validation Types
// =============================================================================

/** Validation error (PropertyEditor-specific) */
export interface PropertyValidationError {
  /** Field key */
  field: string;
  /** Error message */
  message: string;
  /** Error severity */
  severity?: 'error' | 'warning';
}

/** Validation result (PropertyEditor-specific) */
export interface PropertyValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of errors */
  errors: PropertyValidationError[];
}

// =============================================================================
// Component Props Types
// =============================================================================

/** Props for PropertyEditor component */
export interface PropertyEditorProps<T = Record<string, unknown>> {
  /** Schema definition */
  schema: PropertySchema;
  /** Current values */
  value: T;
  /** Callback when values change */
  onChange: (value: T) => void;

  // Mode
  /** Edit mode or view-only mode */
  mode?: 'edit' | 'view';

  // Submit behavior
  /** Whether to auto-save on change */
  autoSave?: boolean;
  /** Debounce delay for auto-save (ms) */
  autoSaveDelay?: number;
  /** Callback when form is submitted */
  onSubmit?: (value: T) => void;
  /** Callback when form is reset */
  onReset?: () => void;

  // Validation
  /** Whether to show validation errors */
  showValidation?: boolean;
  /** Validate on blur vs on change */
  validateOn?: 'blur' | 'change' | 'submit';
  /** Callback when validation state changes */
  onValidationChange?: (result: PropertyValidationResult) => void;

  // Preview integration (for 3D scene)
  /** Callback when preview value changes (for live 3D preview) */
  onPreviewChange?: (preview: Partial<T> | null) => void;
  /** Fields to highlight (e.g., from 3D selection) */
  highlightFields?: string[];

  // Customization
  /** Custom field renderers */
  fieldRenderers?: Record<string, React.ComponentType<PropertyFieldProps>>;
  /** Custom group renderer */
  renderGroup?: (group: PropertyGroup, children: React.ReactNode) => React.ReactNode;
  /** Custom field wrapper renderer */
  renderFieldWrapper?: (field: PropertyField, children: React.ReactNode) => React.ReactNode;
  /** Custom actions renderer (submit/reset buttons) */
  renderActions?: () => React.ReactNode;
  /** Hide default actions */
  hideActions?: boolean;

  // Styling
  className?: string;
  style?: React.CSSProperties;
  /** Compact display mode */
  compact?: boolean;
  /** Color theme */
  theme?: 'light' | 'dark' | 'auto';
}

/** Props for individual property field component */
export interface PropertyFieldProps<T = unknown> {
  /** Field definition */
  field: PropertyField;
  /** Current value */
  value: T;
  /** Callback when value changes */
  onChange: (value: T) => void;

  // State
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is read-only */
  readOnly?: boolean;
  /** Whether field has error */
  hasError?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Whether field is highlighted */
  highlighted?: boolean;

  // Preview
  /** Callback for preview updates (e.g., while dragging) */
  onPreviewChange?: (value: T | null) => void;

  // Styling
  className?: string;
}

/** Props for PropertyGroup component */
export interface PropertyGroupProps {
  /** Group definition */
  group: PropertyGroup;
  /** All current values */
  values: Record<string, unknown>;
  /** Callback when any field changes */
  onChange: (key: string, value: unknown) => void;

  // State
  /** Whether group is collapsed */
  collapsed?: boolean;
  /** Toggle collapsed state */
  onToggleCollapse?: () => void;
  /** Validation errors for fields in this group */
  errors?: Record<string, string>;
  /** Highlighted field keys */
  highlightedFields?: Set<string>;

  // Customization
  /** Custom field renderer */
  renderField?: (field: PropertyField, children: React.ReactNode) => React.ReactNode;
  /** Field component registry */
  fieldComponents?: Record<string, React.ComponentType<PropertyFieldProps>>;

  className?: string;
}

/** Props for PropertyRow component */
export interface PropertyRowProps {
  /** Field definition */
  field: PropertyField;
  /** Label width */
  labelWidth?: number;
  /** Children (the field component) */
  children: React.ReactNode;

  // State
  /** Whether field is required */
  required?: boolean;
  /** Whether field has error */
  hasError?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Whether field is highlighted */
  highlighted?: boolean;

  className?: string;
}

// =============================================================================
// Field-specific Props
// =============================================================================

/** Props for NumberField */
export interface NumberFieldProps extends PropertyFieldProps<number> {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  /** Show slider */
  showSlider?: boolean;
}

/** Props for TextField */
export interface TextFieldProps extends PropertyFieldProps<string> {
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
}

/** Props for BooleanField */
export interface BooleanFieldProps extends PropertyFieldProps<boolean> {
  /** Display as switch or checkbox */
  variant?: 'switch' | 'checkbox';
}

/** Props for EnumField */
export interface EnumFieldProps extends PropertyFieldProps<string | number> {
  options: EnumOption[];
  /** Display as dropdown or radio buttons */
  variant?: 'dropdown' | 'radio' | 'segmented';
}

/** Props for ColorField */
export interface ColorFieldProps extends PropertyFieldProps<string> {
  /** Preset colors */
  presets?: string[];
  /** Allow alpha channel */
  allowAlpha?: boolean;
}

/** Props for TagsField */
export interface TagsFieldProps extends PropertyFieldProps<string[]> {
  /** Suggested tags */
  suggestions?: string[];
  /** Max number of tags */
  maxTags?: number;
}

/** Props for Position3DField */
export interface Position3DFieldProps extends PropertyFieldProps<Position3D> {
  /** Coordinate labels */
  labels?: [string, string, string];
  /** Unit */
  unit?: string;
  /** Precision */
  precision?: number;
  /** Allow linking X/Y/Z for uniform scaling */
  allowLink?: boolean;
}

/** Props for EulerField */
export interface EulerFieldProps extends PropertyFieldProps<EulerAngles> {
  /** Euler order */
  order?: 'XYZ' | 'ZYX' | 'ZYZ';
  /** Unit (degrees or radians) */
  unit?: 'deg' | 'rad';
  /** Precision */
  precision?: number;
}

/** Props for Pose3DField */
export interface Pose3DFieldProps extends PropertyFieldProps<Pose3D> {
  /** Rotation mode */
  rotationMode?: 'euler' | 'quaternion';
  /** Euler order (if using euler) */
  eulerOrder?: 'XYZ' | 'ZYX' | 'ZYZ';
  /** Available coordinate frames */
  coordinateFrames?: { id: string; label: string }[];
  /** Current coordinate frame */
  coordinateFrame?: string;
  /** Callback when frame changes */
  onCoordinateFrameChange?: (frame: string) => void;
  /** Enable 3D gizmo */
  enableGizmo?: boolean;
  /** Gizmo mode */
  gizmoMode?: 'translate' | 'rotate';
  /** Callback when gizmo mode changes */
  onGizmoModeChange?: (mode: 'translate' | 'rotate') => void;
}

/** Props for JointArrayField */
export interface JointArrayFieldProps extends PropertyFieldProps<number[]> {
  /** Number of joints */
  numJoints?: number;
  /** Joint names */
  jointNames?: string[];
  /** Joint limits */
  limits?: { lower: number[]; upper: number[] };
  /** Joint colors */
  colors?: string[];
  /** Unit */
  unit?: 'deg' | 'rad';
  /** Show slider for each joint */
  showSliders?: boolean;
}

// =============================================================================
// Registry Types
// =============================================================================

/** Field component registry entry */
export interface FieldRegistryEntry<T = unknown> {
  /** Field component */
  component: React.ComponentType<PropertyFieldProps<T>>;
  /** Default value for this field type */
  defaultValue?: T;
  /** Type-level validation */
  validate?: (value: T) => string | null;
}

/** Field registry */
export type FieldRegistry = Record<string, FieldRegistryEntry>;

// =============================================================================
// Utility Types
// =============================================================================

/** Extract field type from value type */
export type InferFieldType<T> = T extends number
  ? 'number'
  : T extends string
  ? 'text' | 'enum' | 'color'
  : T extends boolean
  ? 'boolean'
  : T extends string[]
  ? 'tags'
  : T extends number[]
  ? 'joint-array'
  : T extends Pose3D
  ? 'pose3d'
  : T extends Position3D
  ? 'position3d'
  : string;
