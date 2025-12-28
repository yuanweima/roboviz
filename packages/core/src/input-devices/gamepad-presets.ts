/**
 * Gamepad Preset Mappings
 *
 * Pre-configured mappings for common gamepad types.
 * These mappings are designed for intuitive robot jog control:
 *
 * - Left stick: X/Y translation in Cartesian mode, or J1/J2 in Joint mode
 * - Right stick: Rotation RX/RY or J3/J4
 * - Triggers: Z axis control (LT = down, RT = up)
 * - D-pad: Joint/axis selection
 * - Bumpers: Mode switching
 * - Face buttons: Step size, config selection
 */

import {
  StandardGamepadButton,
  type GamepadMapping,
  type GamepadPresetType,
} from './types';

/**
 * Default deadzone for analog sticks
 */
export const DEFAULT_DEADZONE = 0.15;

/**
 * Default sensitivity (1.0 = linear)
 */
export const DEFAULT_SENSITIVITY = 1.0;

/**
 * Xbox controller mapping
 *
 * Layout:
 * - Left Stick: X/Y translation
 * - Right Stick: RX/RY rotation
 * - LT/RT: Z- / Z+
 * - LB/RB: Previous/Next mode
 * - D-pad: Joint/axis selection
 * - A/B/X/Y: Step sizes and actions
 */
export const XBOX_MAPPING: GamepadMapping = {
  name: 'Xbox Controller',
  preset: 'xbox',
  description: 'Standard mapping for Xbox One/Series controllers',

  buttons: {
    // Face buttons
    [StandardGamepadButton.A]: 'stepMedium',      // A - Medium step (default)
    [StandardGamepadButton.B]: 'stepCoarse',       // B - Coarse step (10x)
    [StandardGamepadButton.X]: 'stepFine',         // X - Fine step (0.1x)
    [StandardGamepadButton.Y]: 'goHome',           // Y - Go to home position

    // Bumpers - mode switching
    [StandardGamepadButton.LB]: 'prevStep',        // LB - Previous step size
    [StandardGamepadButton.RB]: 'nextStep',        // RB - Next step size

    // D-pad - selection
    [StandardGamepadButton.DPadUp]: 'prevJoint',   // D-pad Up - Previous joint/axis
    [StandardGamepadButton.DPadDown]: 'nextJoint', // D-pad Down - Next joint/axis
    [StandardGamepadButton.DPadLeft]: 'prevConfig', // D-pad Left - Previous IK config
    [StandardGamepadButton.DPadRight]: 'nextConfig', // D-pad Right - Next IK config

    // Stick presses
    [StandardGamepadButton.LeftStick]: 'toggleMode', // Left stick press - Toggle mode
    [StandardGamepadButton.RightStick]: 'precisionMode', // Right stick press - Precision mode

    // Menu buttons
    [StandardGamepadButton.Back]: 'setModeJoint',  // Back - Joint mode
    [StandardGamepadButton.Start]: 'setModeCartesian', // Start - Cartesian mode
    [StandardGamepadButton.Home]: 'emergencyStop', // Guide - Emergency stop
  },

  leftStick: {
    x: { axis: 'x', deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
    y: { axis: 'y', inverted: true, deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
  },

  rightStick: {
    x: { axis: 'rx', deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
    y: { axis: 'ry', inverted: true, deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
  },

  leftTrigger: {
    action: 'jogNegative',
    axis: 'z',
  },

  rightTrigger: {
    action: 'jogPositive',
    axis: 'z',
  },

  globalDeadzone: DEFAULT_DEADZONE,
  analogTriggers: true,
};

/**
 * PlayStation controller mapping (DualShock 4, DualSense)
 *
 * Similar to Xbox but with PlayStation button names
 */
export const PLAYSTATION_MAPPING: GamepadMapping = {
  name: 'PlayStation Controller',
  preset: 'playstation',
  description: 'Mapping for DualShock 4 and DualSense controllers',

  buttons: {
    // Face buttons (Cross, Circle, Square, Triangle)
    [StandardGamepadButton.A]: 'stepMedium',      // Cross - Medium step
    [StandardGamepadButton.B]: 'stepCoarse',       // Circle - Coarse step
    [StandardGamepadButton.X]: 'stepFine',         // Square - Fine step
    [StandardGamepadButton.Y]: 'goHome',           // Triangle - Home

    // Bumpers
    [StandardGamepadButton.LB]: 'prevStep',        // L1
    [StandardGamepadButton.RB]: 'nextStep',        // R1

    // D-pad
    [StandardGamepadButton.DPadUp]: 'prevJoint',
    [StandardGamepadButton.DPadDown]: 'nextJoint',
    [StandardGamepadButton.DPadLeft]: 'prevConfig',
    [StandardGamepadButton.DPadRight]: 'nextConfig',

    // Stick presses
    [StandardGamepadButton.LeftStick]: 'toggleMode', // L3
    [StandardGamepadButton.RightStick]: 'precisionMode', // R3

    // Menu buttons
    [StandardGamepadButton.Back]: 'setModeJoint',  // Share
    [StandardGamepadButton.Start]: 'setModeCartesian', // Options
    [StandardGamepadButton.Home]: 'emergencyStop', // PS button
  },

  leftStick: {
    x: { axis: 'x', deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
    y: { axis: 'y', inverted: true, deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
  },

  rightStick: {
    x: { axis: 'rx', deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
    y: { axis: 'ry', inverted: true, deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
  },

  leftTrigger: {
    action: 'jogNegative',
    axis: 'z',
  },

  rightTrigger: {
    action: 'jogPositive',
    axis: 'z',
  },

  globalDeadzone: DEFAULT_DEADZONE,
  analogTriggers: true,
};

/**
 * Nintendo Pro Controller mapping
 */
export const NINTENDO_MAPPING: GamepadMapping = {
  name: 'Nintendo Pro Controller',
  preset: 'nintendo',
  description: 'Mapping for Nintendo Switch Pro Controller',

  buttons: {
    // Face buttons (B, A, Y, X - Nintendo layout)
    [StandardGamepadButton.A]: 'stepMedium',      // B (bottom)
    [StandardGamepadButton.B]: 'stepCoarse',       // A (right)
    [StandardGamepadButton.X]: 'stepFine',         // Y (left)
    [StandardGamepadButton.Y]: 'goHome',           // X (top)

    // Bumpers
    [StandardGamepadButton.LB]: 'prevStep',        // L
    [StandardGamepadButton.RB]: 'nextStep',        // R

    // D-pad
    [StandardGamepadButton.DPadUp]: 'prevJoint',
    [StandardGamepadButton.DPadDown]: 'nextJoint',
    [StandardGamepadButton.DPadLeft]: 'prevConfig',
    [StandardGamepadButton.DPadRight]: 'nextConfig',

    // Stick presses
    [StandardGamepadButton.LeftStick]: 'toggleMode',
    [StandardGamepadButton.RightStick]: 'precisionMode',

    // Menu buttons
    [StandardGamepadButton.Back]: 'setModeJoint',  // Minus
    [StandardGamepadButton.Start]: 'setModeCartesian', // Plus
    [StandardGamepadButton.Home]: 'emergencyStop', // Home
  },

  leftStick: {
    x: { axis: 'x', deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
    y: { axis: 'y', inverted: true, deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
  },

  rightStick: {
    x: { axis: 'rx', deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
    y: { axis: 'ry', inverted: true, deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
  },

  leftTrigger: {
    action: 'jogNegative',
    axis: 'z',
  },

  rightTrigger: {
    action: 'jogPositive',
    axis: 'z',
  },

  globalDeadzone: DEFAULT_DEADZONE,
  analogTriggers: false, // Nintendo triggers are digital
};

/**
 * Generic/fallback mapping for unknown controllers
 */
export const GENERIC_MAPPING: GamepadMapping = {
  name: 'Generic Controller',
  preset: 'generic',
  description: 'Basic mapping for unknown/generic controllers',

  buttons: {
    [StandardGamepadButton.A]: 'stepMedium',
    [StandardGamepadButton.B]: 'stepCoarse',
    [StandardGamepadButton.X]: 'stepFine',
    [StandardGamepadButton.Y]: 'goHome',
    [StandardGamepadButton.LB]: 'prevJoint',
    [StandardGamepadButton.RB]: 'nextJoint',
    [StandardGamepadButton.DPadUp]: 'prevJoint',
    [StandardGamepadButton.DPadDown]: 'nextJoint',
    [StandardGamepadButton.DPadLeft]: 'prevConfig',
    [StandardGamepadButton.DPadRight]: 'nextConfig',
    [StandardGamepadButton.LeftStick]: 'toggleMode',
    [StandardGamepadButton.Start]: 'setModeCartesian',
    [StandardGamepadButton.Back]: 'setModeJoint',
  },

  leftStick: {
    x: { axis: 'x', deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
    y: { axis: 'y', inverted: true, deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
  },

  rightStick: {
    x: { axis: 'rx', deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
    y: { axis: 'ry', inverted: true, deadzone: DEFAULT_DEADZONE, sensitivity: DEFAULT_SENSITIVITY },
  },

  leftTrigger: {
    action: 'jogNegative',
    axis: 'z',
  },

  rightTrigger: {
    action: 'jogPositive',
    axis: 'z',
  },

  globalDeadzone: DEFAULT_DEADZONE,
  analogTriggers: true,
};

/**
 * All preset mappings
 */
export const GAMEPAD_PRESETS: Record<GamepadPresetType, GamepadMapping> = {
  xbox: XBOX_MAPPING,
  playstation: PLAYSTATION_MAPPING,
  nintendo: NINTENDO_MAPPING,
  generic: GENERIC_MAPPING,
  custom: GENERIC_MAPPING, // Custom starts from generic
};

/**
 * Detect gamepad preset from gamepad ID string
 */
export function detectGamepadPreset(gamepadId: string): GamepadPresetType {
  const id = gamepadId.toLowerCase();

  // Xbox detection
  if (
    id.includes('xbox') ||
    id.includes('microsoft') ||
    id.includes('xinput') ||
    id.includes('045e') // Microsoft vendor ID
  ) {
    return 'xbox';
  }

  // PlayStation detection
  if (
    id.includes('playstation') ||
    id.includes('dualshock') ||
    id.includes('dualsense') ||
    id.includes('sony') ||
    id.includes('054c') // Sony vendor ID
  ) {
    return 'playstation';
  }

  // Nintendo detection
  if (
    id.includes('nintendo') ||
    id.includes('pro controller') ||
    id.includes('joy-con') ||
    id.includes('057e') // Nintendo vendor ID
  ) {
    return 'nintendo';
  }

  return 'generic';
}

/**
 * Get preset mapping for a gamepad
 */
export function getGamepadPreset(gamepadId: string): GamepadMapping {
  const presetType = detectGamepadPreset(gamepadId);
  return { ...GAMEPAD_PRESETS[presetType] };
}

/**
 * Create custom mapping from a base preset
 */
export function createCustomMapping(
  basePreset: GamepadPresetType,
  overrides: Partial<GamepadMapping>
): GamepadMapping {
  const base = GAMEPAD_PRESETS[basePreset];
  return {
    ...base,
    ...overrides,
    preset: 'custom',
    buttons: {
      ...base.buttons,
      ...overrides.buttons,
    },
    leftStick: {
      ...base.leftStick,
      ...overrides.leftStick,
    },
    rightStick: {
      ...base.rightStick,
      ...overrides.rightStick,
    },
  };
}

/**
 * Button names for display
 */
export const XBOX_BUTTON_NAMES: Record<StandardGamepadButton, string> = {
  [StandardGamepadButton.A]: 'A',
  [StandardGamepadButton.B]: 'B',
  [StandardGamepadButton.X]: 'X',
  [StandardGamepadButton.Y]: 'Y',
  [StandardGamepadButton.LB]: 'LB',
  [StandardGamepadButton.RB]: 'RB',
  [StandardGamepadButton.LT]: 'LT',
  [StandardGamepadButton.RT]: 'RT',
  [StandardGamepadButton.Back]: 'Back',
  [StandardGamepadButton.Start]: 'Start',
  [StandardGamepadButton.LeftStick]: 'LS',
  [StandardGamepadButton.RightStick]: 'RS',
  [StandardGamepadButton.DPadUp]: 'D-Up',
  [StandardGamepadButton.DPadDown]: 'D-Down',
  [StandardGamepadButton.DPadLeft]: 'D-Left',
  [StandardGamepadButton.DPadRight]: 'D-Right',
  [StandardGamepadButton.Home]: 'Guide',
};

export const PLAYSTATION_BUTTON_NAMES: Record<StandardGamepadButton, string> = {
  [StandardGamepadButton.A]: 'X',
  [StandardGamepadButton.B]: 'O',
  [StandardGamepadButton.X]: '□',
  [StandardGamepadButton.Y]: '△',
  [StandardGamepadButton.LB]: 'L1',
  [StandardGamepadButton.RB]: 'R1',
  [StandardGamepadButton.LT]: 'L2',
  [StandardGamepadButton.RT]: 'R2',
  [StandardGamepadButton.Back]: 'Share',
  [StandardGamepadButton.Start]: 'Options',
  [StandardGamepadButton.LeftStick]: 'L3',
  [StandardGamepadButton.RightStick]: 'R3',
  [StandardGamepadButton.DPadUp]: 'D-Up',
  [StandardGamepadButton.DPadDown]: 'D-Down',
  [StandardGamepadButton.DPadLeft]: 'D-Left',
  [StandardGamepadButton.DPadRight]: 'D-Right',
  [StandardGamepadButton.Home]: 'PS',
};

export const NINTENDO_BUTTON_NAMES: Record<StandardGamepadButton, string> = {
  [StandardGamepadButton.A]: 'B',
  [StandardGamepadButton.B]: 'A',
  [StandardGamepadButton.X]: 'Y',
  [StandardGamepadButton.Y]: 'X',
  [StandardGamepadButton.LB]: 'L',
  [StandardGamepadButton.RB]: 'R',
  [StandardGamepadButton.LT]: 'ZL',
  [StandardGamepadButton.RT]: 'ZR',
  [StandardGamepadButton.Back]: '-',
  [StandardGamepadButton.Start]: '+',
  [StandardGamepadButton.LeftStick]: 'LS',
  [StandardGamepadButton.RightStick]: 'RS',
  [StandardGamepadButton.DPadUp]: 'D-Up',
  [StandardGamepadButton.DPadDown]: 'D-Down',
  [StandardGamepadButton.DPadLeft]: 'D-Left',
  [StandardGamepadButton.DPadRight]: 'D-Right',
  [StandardGamepadButton.Home]: 'Home',
};

/**
 * Get button names for a preset
 */
export function getButtonNames(preset: GamepadPresetType): Record<StandardGamepadButton, string> {
  switch (preset) {
    case 'playstation':
      return PLAYSTATION_BUTTON_NAMES;
    case 'nintendo':
      return NINTENDO_BUTTON_NAMES;
    default:
      return XBOX_BUTTON_NAMES;
  }
}
