/**
 * Property Editor Components
 *
 * A schema-driven property editing system for industrial robotics applications.
 * Designed for editing robot point attributes, obstacle properties, and custom parameters.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================
export * from './types';

// =============================================================================
// Registry
// =============================================================================
export {
  registerPropertyField,
  getFieldComponent,
  getFieldDefaultValue,
  getFieldValidator,
  hasFieldType,
  getRegisteredFieldTypes,
  unregisterPropertyField,
} from './registry';

// =============================================================================
// Validation
// =============================================================================
export {
  validateField,
  validateGroup,
  validateSchema,
  getSchemaFieldKeys,
  getFieldByKey,
  buildInitialValues,
} from './validation';

// =============================================================================
// Field Components
// =============================================================================
export * from './fields';

// =============================================================================
// Core Components
// =============================================================================
export { PropertyRow } from './PropertyRow';
export { PropertyGroup } from './PropertyGroup';
export { PropertyEditor } from './PropertyEditor';

// =============================================================================
// Hooks
// =============================================================================
export { usePropertyHistory } from './usePropertyHistory';
export type { PropertyHistoryOptions, PropertyHistoryState } from './usePropertyHistory';
