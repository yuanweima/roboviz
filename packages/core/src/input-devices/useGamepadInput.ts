/**
 * useGamepadInput Hook
 *
 * A pure input layer hook that provides gamepad analog values and button states
 * without directly managing robot state. This hook is designed to be used with
 * the unified ghost architecture, where the consumer decides how to apply
 * the input (to ghost joints, to robot directly, etc.).
 *
 * Key Design Principles:
 * - Pure input layer: outputs raw/processed values, doesn't mutate external state
 * - Mode-agnostic: works for both Joint mode and Cartesian mode
 * - Composable: can be used with useProcessGhost, useRobotJogControl, or custom logic
 *
 * @example Basic usage with unified ghost
 * ```tsx
 * function GamepadGhostController() {
 *   const ghost = useProcessGhost();
 *   const robot = useProcessRobot();
 *   const gamepad = useGamepadInput({ enabled: true });
 *
 *   // Apply gamepad input to ghost in Joint mode
 *   useFrame((_, delta) => {
 *     if (!gamepad.isConnected) return;
 *
 *     const currentJoints = robot.jointAngles;
 *     const newJoints = currentJoints.map((j, i) => {
 *       const input = gamepad.getJointInput(i);
 *       return j + input * delta * 0.5; // 0.5 rad/s speed
 *     });
 *     ghost.setTargetJoints(newJoints);
 *   });
 * }
 * ```
 */

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  useGamepad,
  type UseGamepadOptions,
} from './useGamepad';
import {
  StandardGamepadButton,
  type GamepadMapping,
  type GamepadState,
  type AnalogInput6DoF,
  type GamepadButtonAction,
  type InputDeviceInfo,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Joint input values for 6DoF robot
 * Mapped from gamepad sticks:
 * - joints[0]: Left stick X (J1)
 * - joints[1]: Left stick Y (J2)
 * - joints[2]: Right stick X (J3)
 * - joints[3]: Right stick Y (J4)
 * - joints[4]: Triggers (RT - LT) (J5)
 * - joints[5]: Right stick Y when LB held (J6)
 */
export type JointInputValues = [number, number, number, number, number, number];

/**
 * Cartesian input values for 6DoF motion
 * - translation: [x, y, z] in mm/s equivalent
 * - rotation: [rx, ry, rz] in deg/s equivalent
 */
export interface CartesianInputValues {
  translation: [number, number, number];
  rotation: [number, number, number];
}

export interface UseGamepadInputOptions {
  /** Whether gamepad input is enabled */
  enabled?: boolean;
  /** Custom gamepad mapping */
  gamepadMapping?: GamepadMapping;
  /** Callback when device connects */
  onDeviceConnect?: (device: InputDeviceInfo) => void;
  /** Callback when device disconnects */
  onDeviceDisconnect?: (device: InputDeviceInfo) => void;
}

export interface UseGamepadInputResult {
  /** Whether a gamepad is connected */
  isConnected: boolean;
  /** Current gamepad state */
  gamepadState: GamepadState | null;
  /** List of connected gamepads */
  connectedGamepads: InputDeviceInfo[];
  /** Raw analog input (6DoF) */
  analogInput: AnalogInput6DoF | null;
  /** Whether any analog input is active (above deadzone) */
  isAnalogActive: boolean;

  /**
   * Get joint input for a specific joint (0-5)
   * Returns value between -1 and 1
   */
  getJointInput: (jointIndex: number) => number;

  /**
   * Get all joint inputs as array [J1..J6]
   * Returns values between -1 and 1
   */
  getJointInputs: () => JointInputValues;

  /**
   * Get Cartesian input values
   * Returns translation [x,y,z] and rotation [rx,ry,rz] in normalized form (-1 to 1)
   */
  getCartesianInputs: () => CartesianInputValues;

  /**
   * Check if a button is currently pressed
   */
  isButtonPressed: (button: StandardGamepadButton) => boolean;

  /**
   * Check if LB (modifier) is held for J6/RZ control
   */
  isModifierHeld: boolean;

  /**
   * Check if speed boost (RB) is active
   */
  isSpeedBoostActive: boolean;

  /**
   * Check if precision mode (R3) is active
   */
  isPrecisionModeActive: boolean;

  /**
   * Get speed multiplier based on modifier buttons
   * Returns: 0.2 (precision), 1.0 (normal), or 1.5 (speed boost)
   */
  speedMultiplier: number;

  /** Update gamepad mapping */
  setMapping: (mapping: GamepadMapping) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEADZONE = 0.1;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGamepadInput(options: UseGamepadInputOptions = {}): UseGamepadInputResult {
  const {
    enabled = true,
    gamepadMapping,
    onDeviceConnect,
    onDeviceDisconnect,
  } = options;

  // State for analog input
  const [analogInput, setAnalogInput] = useState<AnalogInput6DoF | null>(null);
  const [isAnalogActive, setIsAnalogActive] = useState(false);
  const gamepadStateRef = useRef<GamepadState | null>(null);

  // Handle analog input updates
  const handleAnalogInput = useCallback((input: AnalogInput6DoF, _gamepad: GamepadState) => {
    setAnalogInput(input);
    // Check if any axis is above deadzone
    const isActive = Math.abs(input.tx) > DEADZONE ||
                     Math.abs(input.ty) > DEADZONE ||
                     Math.abs(input.tz) > DEADZONE ||
                     Math.abs(input.rx) > DEADZONE ||
                     Math.abs(input.ry) > DEADZONE ||
                     Math.abs(input.rz) > DEADZONE;
    setIsAnalogActive(isActive);
  }, []);

  // Handle connect
  const handleConnect = useCallback((gamepad: GamepadState) => {
    onDeviceConnect?.(gamepad.info);
  }, [onDeviceConnect]);

  // Handle disconnect
  const handleDisconnect = useCallback((info: InputDeviceInfo) => {
    setAnalogInput(null);
    setIsAnalogActive(false);
    onDeviceDisconnect?.(info);
  }, [onDeviceDisconnect]);

  // Use base gamepad hook
  const gamepadOptions: UseGamepadOptions = useMemo(() => ({
    enabled,
    customMapping: gamepadMapping,
    onAnalogInput: handleAnalogInput,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  }), [enabled, gamepadMapping, handleAnalogInput, handleConnect, handleDisconnect]);

  const {
    isConnected,
    gamepad: gamepadState,
    connectedGamepads,
    setMapping,
  } = useGamepad(gamepadOptions);

  // Keep ref updated
  useEffect(() => {
    gamepadStateRef.current = gamepadState;
  }, [gamepadState]);

  // Check modifier buttons
  const isModifierHeld = gamepadState?.buttons[StandardGamepadButton.LB] ?? false;
  const isSpeedBoostActive = gamepadState?.buttons[StandardGamepadButton.RB] ?? false;
  const isPrecisionModeActive = gamepadState?.buttons[StandardGamepadButton.RightStick] ?? false;

  // Calculate speed multiplier
  const speedMultiplier = useMemo(() => {
    if (isPrecisionModeActive) return 0.2;
    if (isSpeedBoostActive) return 1.5;
    return 1.0;
  }, [isPrecisionModeActive, isSpeedBoostActive]);

  // Get input for specific joint
  const getJointInput = useCallback((jointIndex: number): number => {
    if (!analogInput) return 0;

    switch (jointIndex) {
      case 0: return isModifierHeld ? 0 : analogInput.tx; // J1
      case 1: return isModifierHeld ? 0 : analogInput.ty; // J2
      case 2: return isModifierHeld ? 0 : analogInput.rx; // J3
      case 3: return isModifierHeld ? 0 : analogInput.ry; // J4
      case 4: return analogInput.tz; // J5 (triggers)
      case 5: return isModifierHeld ? analogInput.ry : 0; // J6 (right stick Y when LB held)
      default: return 0;
    }
  }, [analogInput, isModifierHeld]);

  // Get all joint inputs
  const getJointInputs = useCallback((): JointInputValues => {
    return [
      getJointInput(0),
      getJointInput(1),
      getJointInput(2),
      getJointInput(3),
      getJointInput(4),
      getJointInput(5),
    ];
  }, [getJointInput]);

  // Get Cartesian inputs
  const getCartesianInputs = useCallback((): CartesianInputValues => {
    if (!analogInput) {
      return {
        translation: [0, 0, 0],
        rotation: [0, 0, 0],
      };
    }

    return {
      translation: [
        isModifierHeld ? 0 : analogInput.tx, // X
        isModifierHeld ? 0 : analogInput.ty, // Y
        analogInput.tz, // Z (triggers)
      ],
      rotation: [
        isModifierHeld ? 0 : analogInput.rx, // RX
        isModifierHeld ? 0 : analogInput.ry, // RY
        isModifierHeld ? analogInput.rx : 0, // RZ (right stick X when LB held)
      ],
    };
  }, [analogInput, isModifierHeld]);

  // Check button state
  const isButtonPressed = useCallback((button: StandardGamepadButton): boolean => {
    return gamepadState?.buttons[button] ?? false;
  }, [gamepadState]);

  return {
    isConnected,
    gamepadState,
    connectedGamepads,
    analogInput,
    isAnalogActive,
    getJointInput,
    getJointInputs,
    getCartesianInputs,
    isButtonPressed,
    isModifierHeld,
    isSpeedBoostActive,
    isPrecisionModeActive,
    speedMultiplier,
    setMapping,
  };
}

export default useGamepadInput;
