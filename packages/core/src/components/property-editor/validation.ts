/**
 * Validation Utilities
 *
 * Functions for validating property editor values.
 */

import type {
  PropertySchema,
  PropertyField,
  PropertyGroup,
  PropertyValidationResult,
  PropertyValidationError,
} from './types';
import { getFieldValidator } from './registry';

/**
 * Validate a single field value
 */
export function validateField(
  field: PropertyField,
  value: unknown,
  allValues: Record<string, unknown>
): string | null {
  // Required check
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      return `${field.label} is required`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return `${field.label} is required`;
    }
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // Type-specific validations
  switch (field.type) {
    case 'number': {
      const numValue = value as number;
      if (typeof numValue !== 'number' || isNaN(numValue)) {
        return `${field.label} must be a number`;
      }
      if (field.min !== undefined && numValue < field.min) {
        return `${field.label} must be at least ${field.min}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `${field.label} must be at most ${field.max}`;
      }
      break;
    }

    case 'text': {
      const strValue = value as string;
      if (typeof strValue !== 'string') {
        return `${field.label} must be a string`;
      }
      if (field.minLength !== undefined && strValue.length < field.minLength) {
        return `${field.label} must be at least ${field.minLength} characters`;
      }
      if (field.maxLength !== undefined && strValue.length > field.maxLength) {
        return `${field.label} must be at most ${field.maxLength} characters`;
      }
      if (field.pattern && !field.pattern.test(strValue)) {
        return `${field.label} format is invalid`;
      }
      break;
    }

    case 'enum': {
      if (field.options) {
        const validValues = field.options.map((opt) => opt.value);
        if (!validValues.includes(value as string | number)) {
          return `${field.label} must be one of the valid options`;
        }
      }
      break;
    }

    case 'position3d': {
      const pos = value as { x: number; y: number; z: number };
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number' || typeof pos.z !== 'number') {
        return `${field.label} must be a valid position`;
      }
      break;
    }

    case 'joint-array': {
      if (!Array.isArray(value)) {
        return `${field.label} must be an array`;
      }
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== 'number' || isNaN(value[i])) {
          return `${field.label} joint ${i + 1} must be a number`;
        }
      }
      break;
    }
  }

  // Custom type validator from registry
  const typeValidator = getFieldValidator(field.type);
  if (typeValidator) {
    const typeError = typeValidator(value);
    if (typeError) return typeError;
  }

  // Custom field validator
  if (field.validate) {
    const customError = field.validate(value, allValues);
    if (customError) return customError;
  }

  return null;
}

/**
 * Validate a group of fields
 */
export function validateGroup(
  group: PropertyGroup,
  values: Record<string, unknown>
): PropertyValidationError[] {
  const errors: PropertyValidationError[] = [];

  for (const field of group.fields) {
    // Skip invisible fields
    if (typeof field.visible === 'function' && !field.visible(values)) {
      continue;
    }
    if (field.visible === false) {
      continue;
    }

    const value = values[field.key];
    const error = validateField(field, value, values);

    if (error) {
      errors.push({
        field: field.key,
        message: error,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate entire schema
 */
export function validateSchema(
  schema: PropertySchema,
  values: Record<string, unknown>
): PropertyValidationResult {
  const errors: PropertyValidationError[] = [];

  // Validate each group
  for (const group of schema.groups) {
    // Skip invisible groups
    if (typeof group.visible === 'function' && !group.visible(values)) {
      continue;
    }
    if (group.visible === false) {
      continue;
    }

    const groupErrors = validateGroup(group, values);
    errors.push(...groupErrors);
  }

  // Run schema-level validation
  if (schema.validate) {
    const schemaResult = schema.validate(values);
    errors.push(...schemaResult.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get all field keys from a schema
 */
export function getSchemaFieldKeys(schema: PropertySchema): string[] {
  const keys: string[] = [];

  for (const group of schema.groups) {
    for (const field of group.fields) {
      keys.push(field.key);
    }
  }

  return keys;
}

/**
 * Get field by key from schema
 */
export function getFieldByKey(
  schema: PropertySchema,
  key: string
): PropertyField | undefined {
  for (const group of schema.groups) {
    for (const field of group.fields) {
      if (field.key === key) {
        return field;
      }
    }
  }
  return undefined;
}

/**
 * Build initial values from schema defaults
 */
export function buildInitialValues(schema: PropertySchema): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const group of schema.groups) {
    for (const field of group.fields) {
      // Use field default or type default
      const defaultValue = getDefaultValueForType(field.type);
      if (defaultValue !== undefined) {
        values[field.key] = defaultValue;
      }
    }
  }

  return values;
}

/**
 * Get default value for a field type
 */
function getDefaultValueForType(type: string): unknown {
  switch (type) {
    case 'number':
      return 0;
    case 'text':
      return '';
    case 'boolean':
      return false;
    case 'enum':
      return undefined;
    case 'color':
      return '#000000';
    case 'tags':
      return [];
    case 'position3d':
      return { x: 0, y: 0, z: 0 };
    case 'euler':
      return { x: 0, y: 0, z: 0 };
    case 'quaternion':
      return { x: 0, y: 0, z: 0, w: 1 };
    case 'pose3d':
      return {
        position: { x: 0, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      };
    case 'joint-array':
      return [0, 0, 0, 0, 0, 0];
    default:
      return undefined;
  }
}
