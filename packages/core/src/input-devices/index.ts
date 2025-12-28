/**
 * Input Devices Module
 *
 * Provides support for external input devices (gamepad, SpaceMouse, 6DoF controllers)
 * for robot jog control.
 *
 * @example
 * ```tsx
 * import {
 *   useGamepad,
 *   useInputDevice,
 *   GamepadStatusPanel,
 *   XBOX_MAPPING,
 * } from '@aspect/roboviz-core';
 *
 * function RobotControl() {
 *   const [state, actions] = useRobotJogControl({ robotId: 'my-robot' });
 *
 *   // Integrate gamepad with jog control
 *   const {
 *     isGamepadConnected,
 *     gamepadState,
 *     analogInput,
 *   } = useInputDevice({
 *     enabled: true,
 *     actions,
 *     state,
 *   });
 *
 *   return (
 *     <div>
 *       <GamepadStatusPanel
 *         isConnected={isGamepadConnected}
 *         gamepadState={gamepadState}
 *         analogInput={analogInput}
 *       />
 *       <JogControlPanel {...} />
 *     </div>
 *   );
 * }
 * ```
 */

// Types
export {
  // Core types
  type InputDeviceType,
  type InputDeviceConnectionState,
  type InputDeviceInfo,
  // Analog input types
  type AnalogInput2D,
  type AnalogInput3D,
  type AnalogInput6DoF,
  type TriggerInput,
  // Unified action type
  type JogInputAction,
  type JogInputActionCallback,
  type DeviceConnectionCallback,
  // Gamepad-specific types
  StandardGamepadButton,
  StandardGamepadAxis,
  type GamepadPresetType,
  type GamepadButtonAction,
  type GamepadAxisMapping,
  type GamepadStickMapping,
  type GamepadMapping,
  type GamepadState,
  // 6DoF types (for future)
  type SixDoFControllerState,
  // Manager types
  type InputDeviceManagerConfig,
  type InputDeviceManagerState,
} from './types';

// Gamepad presets
export {
  // Constants
  DEFAULT_DEADZONE,
  DEFAULT_SENSITIVITY,
  // Preset mappings
  XBOX_MAPPING,
  PLAYSTATION_MAPPING,
  NINTENDO_MAPPING,
  GENERIC_MAPPING,
  GAMEPAD_PRESETS,
  // Utility functions
  detectGamepadPreset,
  getGamepadPreset,
  createCustomMapping,
  // Button name maps
  XBOX_BUTTON_NAMES,
  PLAYSTATION_BUTTON_NAMES,
  NINTENDO_BUTTON_NAMES,
  getButtonNames,
} from './gamepad-presets';

// Hooks
export {
  useGamepad,
  type UseGamepadOptions,
  type UseGamepadResult,
} from './useGamepad';

export {
  useInputDevice,
  type UseInputDeviceOptions,
  type UseInputDeviceResult,
} from './useInputDevice';

// Components
export {
  GamepadStatusPanel,
  type GamepadStatusPanelProps,
} from './GamepadStatusPanel';

// Convenience hook combining jog control with gamepad
export {
  useJogWithGamepad,
  type UseJogWithGamepadOptions,
  type UseJogWithGamepadResult,
  type GamepadInfo,
} from './useJogWithGamepad';

// Pure input layer hook for unified ghost architecture
export {
  useGamepadInput,
  type UseGamepadInputOptions,
  type UseGamepadInputResult,
  type JointInputValues,
  type CartesianInputValues,
} from './useGamepadInput';
