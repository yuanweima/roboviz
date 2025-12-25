/**
 * Welding Process Definition
 *
 * Complete process plugin for robotic welding operations.
 */

import type { ProcessDefinition, ValidationResult, ProcessSettingsPanelProps, ProcessVisualizationProps } from '../../process';
import type {
  WeldingSettings,
  WeldingInput,
  WeldingOutput,
} from './types';
import { DEFAULT_WELDING_SETTINGS } from './types';
import { WeldingSettingsPanel as SettingsPanel } from './WeldingSettingsPanel';
import { WeldingVisualization as Visualization } from './WeldingVisualization';
import { WeldingIcon } from './WeldingIcon';

/**
 * Welding process definition
 */
export const weldingProcess: ProcessDefinition<
  WeldingInput,
  WeldingSettings,
  WeldingOutput
> = {
  id: 'welding',
  name: 'Welding',
  description: 'Arc welding operations including MIG, TIG, and laser welding',
  category: 'manufacturing',
  icon: WeldingIcon,
  color: '#ff6600',

  // Capabilities used by welding
  capabilities: [
    'edge-selection', // Select weld seams
    'angle-lock', // Maintain torch angles
    'collision-preview', // Check for collisions
    'seam-tracking', // Optional seam tracking
  ],

  // Input types
  inputTypes: ['edge', 'path'],

  // Tool type
  toolType: 'torch',

  // Default settings
  defaultSettings: DEFAULT_WELDING_SETTINGS,

  // UI Components - cast to proper types
  components: {
    SettingsPanel: SettingsPanel as unknown as React.ComponentType<ProcessSettingsPanelProps<WeldingSettings>>,
    Visualization: Visualization as unknown as React.ComponentType<ProcessVisualizationProps<WeldingInput, WeldingSettings>>,
  },

  // Lifecycle hooks
  onActivate: () => {
    console.log('[WeldingProcess] Activated');
  },

  onDeactivate: () => {
    console.log('[WeldingProcess] Deactivated');
  },

  onInputChange: (input: WeldingInput | null) => {
    console.log('[WeldingProcess] Input changed:', input);
  },

  onSettingsChange: (settings: WeldingSettings) => {
    console.log('[WeldingProcess] Settings changed:', settings);
  },

  // Validation
  validateInput: (input: WeldingInput): ValidationResult => {
    const errors: ValidationResult['errors'] = [];

    if (!input.seams || input.seams.length === 0) {
      errors.push({
        message: 'At least one welding seam must be selected',
        severity: 'error',
      });
    }

    for (const seam of input.seams ?? []) {
      if (seam.edges.length === 0) {
        errors.push({
          field: seam.name,
          message: `Seam "${seam.name}" has no edges defined`,
          severity: 'error',
        });
      }
      if (seam.passCount < 1) {
        errors.push({
          field: seam.name,
          message: `Seam "${seam.name}" must have at least one pass`,
          severity: 'error',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  validateSettings: (settings: WeldingSettings): ValidationResult => {
    const errors: ValidationResult['errors'] = [];

    if (settings.voltage < 10 || settings.voltage > 50) {
      errors.push({
        field: 'voltage',
        message: 'Voltage must be between 10V and 50V',
        severity: 'error',
      });
    }
    if (settings.current < 50 || settings.current > 500) {
      errors.push({
        field: 'current',
        message: 'Current must be between 50A and 500A',
        severity: 'error',
      });
    }
    if (settings.travelSpeed < 1 || settings.travelSpeed > 50) {
      errors.push({
        field: 'travelSpeed',
        message: 'Travel speed must be between 1 and 50 mm/s',
        severity: 'error',
      });
    }
    if (settings.wireFeedSpeed < 1 || settings.wireFeedSpeed > 25) {
      errors.push({
        field: 'wireFeedSpeed',
        message: 'Wire feed speed must be between 1 and 25 m/min',
        severity: 'error',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // Protocol configuration
  protocol: {
    messagePrefix: 'welding',
  },
};

export default weldingProcess;
