/**
 * Input Devices Types
 *
 * Unified type definitions for external input devices (Gamepad, SpaceMouse, 6DoF controllers, etc.)
 * Designed to be extensible for future input device types.
 */

import type { JogAxis, JogMode, StepSize } from '../components/JogControlPanel/useRobotJogControl';

// ============================================================================
// Core Input Types
// ============================================================================

/**
 * Supported input device types
 */
export type InputDeviceType =
  | 'keyboard'      // Built-in keyboard (handled by useJogShortcuts)
  | 'gamepad'       // Standard gamepad (Xbox, PlayStation, generic)
  | 'spacemouse'    // 3Dconnexion SpaceMouse (future)
  | '6dof'          // 6DoF VR/AR controllers (future)
  | 'custom';       // Custom HID devices (future)

/**
 * Connection state of an input device
 */
export type InputDeviceConnectionState =
  | 'disconnected'  // No device connected
  | 'connecting'    // Device is being initialized
  | 'connected'     // Device is ready for use
  | 'error';        // Connection error

/**
 * Base input device info
 */
export interface InputDeviceInfo {
  /** Unique device ID */
  id: string;
  /** Device type */
  type: InputDeviceType;
  /** Human-readable device name */
  name: string;
  /** Vendor ID (if available) */
  vendorId?: number;
  /** Product ID (if available) */
  productId?: number;
  /** Connection state */
  connectionState: InputDeviceConnectionState;
  /** Timestamp of last activity */
  lastActivity: number;
}

// ============================================================================
// Analog Input Types (for smooth/proportional control)
// ============================================================================

/**
 * 2D analog input (e.g., joystick)
 */
export interface AnalogInput2D {
  x: number;  // -1.0 to 1.0
  y: number;  // -1.0 to 1.0
}

/**
 * 3D analog input (e.g., SpaceMouse translation)
 */
export interface AnalogInput3D {
  x: number;  // -1.0 to 1.0
  y: number;  // -1.0 to 1.0
  z: number;  // -1.0 to 1.0
}

/**
 * 6DoF analog input (e.g., SpaceMouse with rotation)
 */
export interface AnalogInput6DoF {
  // Translation
  tx: number;  // -1.0 to 1.0
  ty: number;  // -1.0 to 1.0
  tz: number;  // -1.0 to 1.0
  // Rotation
  rx: number;  // -1.0 to 1.0
  ry: number;  // -1.0 to 1.0
  rz: number;  // -1.0 to 1.0
}

/**
 * Trigger input (0.0 to 1.0)
 */
export type TriggerInput = number;

// ============================================================================
// Unified Jog Input Action
// ============================================================================

/**
 * Unified jog input action that can come from any input device
 */
export interface JogInputAction {
  /** Source device type */
  source: InputDeviceType;
  /** Source device ID */
  deviceId: string;
  /** Timestamp */
  timestamp: number;

  // Discrete actions (from buttons)
  /** Mode switch request */
  setMode?: JogMode;
  /** Step size change request */
  setStepSize?: StepSize;
  /** Joint selection (0-5 for 6-axis robot) */
  selectJoint?: number;
  /** Axis selection for Cartesian mode */
  selectAxis?: JogAxis;
  /** IK configuration selection (1-8) */
  selectConfig?: number;
  /** Emergency stop */
  emergencyStop?: boolean;
  /** Home position request */
  goHome?: boolean;

  // Analog inputs (normalized -1.0 to 1.0)
  /** 6DoF analog input for smooth control */
  analog6DoF?: AnalogInput6DoF;
  /** Speed multiplier from analog input (0.0 to 1.0) */
  speedMultiplier?: number;
}

// ============================================================================
// Gamepad-Specific Types
// ============================================================================

/**
 * Standard gamepad button indices (following W3C Gamepad API)
 * https://w3c.github.io/gamepad/#remapping
 */
export enum StandardGamepadButton {
  A = 0,              // Bottom button (A on Xbox, X on PlayStation)
  B = 1,              // Right button (B on Xbox, Circle on PlayStation)
  X = 2,              // Left button (X on Xbox, Square on PlayStation)
  Y = 3,              // Top button (Y on Xbox, Triangle on PlayStation)
  LB = 4,             // Left bumper
  RB = 5,             // Right bumper
  LT = 6,             // Left trigger (analog on most gamepads)
  RT = 7,             // Right trigger (analog on most gamepads)
  Back = 8,           // Back/Select/Share
  Start = 9,          // Start/Options
  LeftStick = 10,     // Left stick press
  RightStick = 11,    // Right stick press
  DPadUp = 12,        // D-pad up
  DPadDown = 13,      // D-pad down
  DPadLeft = 14,      // D-pad left
  DPadRight = 15,     // D-pad right
  Home = 16,          // Home/Guide button
}

/**
 * Standard gamepad axis indices
 */
export enum StandardGamepadAxis {
  LeftStickX = 0,     // Left stick horizontal (-1 = left, 1 = right)
  LeftStickY = 1,     // Left stick vertical (-1 = up, 1 = down)
  RightStickX = 2,    // Right stick horizontal
  RightStickY = 3,    // Right stick vertical
}

/**
 * Gamepad preset type for common controller brands
 */
export type GamepadPresetType =
  | 'xbox'            // Xbox controllers
  | 'playstation'     // PlayStation controllers (DualShock, DualSense)
  | 'nintendo'        // Nintendo Pro Controller
  | 'generic'         // Generic/unknown gamepads
  | 'custom';         // User-defined mapping

/**
 * Gamepad button action mapping
 */
export type GamepadButtonAction =
  // Mode switching
  | 'toggleMode'
  | 'setModeJoint'
  | 'setModeCartesian'
  | 'setModeTool'
  // Joint selection
  | 'selectJoint1' | 'selectJoint2' | 'selectJoint3'
  | 'selectJoint4' | 'selectJoint5' | 'selectJoint6'
  | 'nextJoint' | 'prevJoint'
  // Axis selection
  | 'selectAxisX' | 'selectAxisY' | 'selectAxisZ'
  | 'selectAxisRX' | 'selectAxisRY' | 'selectAxisRZ'
  | 'nextAxis' | 'prevAxis'
  // Step size
  | 'stepFine' | 'stepMedium' | 'stepCoarse'
  | 'nextStep' | 'prevStep'
  // Config selection
  | 'nextConfig' | 'prevConfig'
  | 'selectConfig1' | 'selectConfig2' | 'selectConfig3' | 'selectConfig4'
  | 'selectConfig5' | 'selectConfig6' | 'selectConfig7' | 'selectConfig8'
  // Actions
  | 'emergencyStop'
  | 'goHome'
  | 'enableRobot'
  | 'disableRobot'
  // Modifier (held buttons)
  | 'speedBoost'      // 2x speed while held
  | 'precisionMode'   // 0.5x speed while held
  | 'none';           // No action

/**
 * Axis mapping for analog sticks
 */
export interface GamepadAxisMapping {
  /** Which axis this maps to in jog control */
  axis: JogAxis;
  /** Invert the axis direction */
  inverted?: boolean;
  /** Deadzone (0.0 to 1.0, default 0.1) */
  deadzone?: number;
  /** Sensitivity curve (1.0 = linear, >1 = more sensitive at edges) */
  sensitivity?: number;
}

/**
 * Stick mapping configuration
 */
export interface GamepadStickMapping {
  x: GamepadAxisMapping;
  y: GamepadAxisMapping;
}

/**
 * Complete gamepad mapping configuration
 */
export interface GamepadMapping {
  /** Preset name */
  name: string;
  /** Preset type */
  preset: GamepadPresetType;
  /** Description */
  description?: string;

  /** Button mappings (button index -> action) */
  buttons: Partial<Record<StandardGamepadButton, GamepadButtonAction>>;

  /** Left stick mapping (for translation XY) */
  leftStick: GamepadStickMapping;

  /** Right stick mapping (for rotation or translation Z) */
  rightStick: GamepadStickMapping;

  /** Left trigger mapping (for Z- or speed control) */
  leftTrigger?: {
    action: 'jogNegative' | 'speedMultiplier';
    axis?: JogAxis;
  };

  /** Right trigger mapping (for Z+ or speed control) */
  rightTrigger?: {
    action: 'jogPositive' | 'speedMultiplier';
    axis?: JogAxis;
  };

  /** Global deadzone for all axes (default 0.1) */
  globalDeadzone?: number;

  /** Whether triggers are analog (true) or digital (false) */
  analogTriggers?: boolean;
}

/**
 * Runtime gamepad state
 */
export interface GamepadState {
  /** Device info */
  info: InputDeviceInfo;
  /** Whether device is currently active/being used */
  isActive: boolean;
  /** Current button states (true = pressed) */
  buttons: boolean[];
  /** Previous button states (for edge detection) */
  prevButtons: boolean[];
  /** Current axis values (-1.0 to 1.0) */
  axes: number[];
  /** Applied mapping */
  mapping: GamepadMapping;
  /** Detected gamepad type */
  detectedPreset: GamepadPresetType;
}

// ============================================================================
// 6DoF Controller Types (for future SpaceMouse, VR controllers)
// ============================================================================

/**
 * 6DoF controller state
 */
export interface SixDoFControllerState {
  /** Device info */
  info: InputDeviceInfo;
  /** Current 6DoF input */
  input: AnalogInput6DoF;
  /** Button states */
  buttons: boolean[];
  /** Whether the controller is in "dominant hand" mode */
  isDominant?: boolean;
}

// ============================================================================
// Input Device Manager Types
// ============================================================================

/**
 * Callback for input actions
 */
export type JogInputActionCallback = (action: JogInputAction) => void;

/**
 * Callback for device connection changes
 */
export type DeviceConnectionCallback = (device: InputDeviceInfo) => void;

/**
 * Input device manager configuration
 */
export interface InputDeviceManagerConfig {
  /** Enable gamepad support */
  enableGamepad?: boolean;
  /** Enable SpaceMouse support (future) */
  enableSpaceMouse?: boolean;
  /** Enable 6DoF controllers (future) */
  enable6DoF?: boolean;
  /** Polling rate in Hz (default 60) */
  pollingRate?: number;
  /** Custom gamepad mapping */
  gamepadMapping?: GamepadMapping;
  /** Callback when input action is triggered */
  onInputAction?: JogInputActionCallback;
  /** Callback when device connects */
  onDeviceConnect?: DeviceConnectionCallback;
  /** Callback when device disconnects */
  onDeviceDisconnect?: DeviceConnectionCallback;
}

/**
 * Input device manager state
 */
export interface InputDeviceManagerState {
  /** All connected devices */
  devices: InputDeviceInfo[];
  /** Active gamepad state (if any) */
  gamepad: GamepadState | null;
  /** Active 6DoF controller state (if any) */
  sixDoFController: SixDoFControllerState | null;
  /** Whether any device is active */
  hasActiveDevice: boolean;
  /** Last input action */
  lastAction: JogInputAction | null;
}
