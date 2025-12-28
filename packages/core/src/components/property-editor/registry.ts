/**
 * Field Registry
 *
 * Central registry for property field components.
 * Allows users to register custom field types.
 */

import type { FieldRegistry, FieldRegistryEntry, PropertyFieldProps } from './types';

// Global field registry
const fieldRegistry: FieldRegistry = {};

/**
 * Register a custom field type
 *
 * @example
 * ```tsx
 * import { registerPropertyField } from '@aspect/roboviz-core';
 *
 * registerPropertyField('weld-params', {
 *   component: WeldParamsField,
 *   defaultValue: { type: 'spot', current: 150 },
 *   validate: (value) => {
 *     if (value.current < 50) return 'Current must be >= 50A';
 *     return null;
 *   },
 * });
 * ```
 */
export function registerPropertyField<T>(
  type: string,
  entry: FieldRegistryEntry<T>
): void {
  fieldRegistry[type] = entry as FieldRegistryEntry;
}

/**
 * Get a registered field component
 */
export function getFieldComponent(
  type: string
): React.ComponentType<PropertyFieldProps> | undefined {
  return fieldRegistry[type]?.component;
}

/**
 * Get default value for a field type
 */
export function getFieldDefaultValue(type: string): unknown {
  return fieldRegistry[type]?.defaultValue;
}

/**
 * Get field validator
 */
export function getFieldValidator(
  type: string
): ((value: unknown) => string | null) | undefined {
  return fieldRegistry[type]?.validate as ((value: unknown) => string | null) | undefined;
}

/**
 * Check if a field type is registered
 */
export function hasFieldType(type: string): boolean {
  return type in fieldRegistry;
}

/**
 * Get all registered field types
 */
export function getRegisteredFieldTypes(): string[] {
  return Object.keys(fieldRegistry);
}

/**
 * Unregister a field type
 */
export function unregisterPropertyField(type: string): boolean {
  if (type in fieldRegistry) {
    delete fieldRegistry[type];
    return true;
  }
  return false;
}

/**
 * Clear all registered fields (useful for testing)
 */
export function clearFieldRegistry(): void {
  for (const key of Object.keys(fieldRegistry)) {
    delete fieldRegistry[key];
  }
}

// Export the registry for direct access if needed
export { fieldRegistry };
