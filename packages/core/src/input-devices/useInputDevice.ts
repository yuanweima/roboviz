/**
 * useInputDevice Hook
 *
 * Unified input device hook that bridges external input devices (gamepad, etc.)
 * with the robot jog control system. Converts device-specific inputs to
 * standardized jog actions.
 *
 * Features:
 * - Integrates with useGamepad for gamepad support
 * - Converts button presses to jog actions
 * - Handles analog input for smooth proportional control
 * - Supports multiple input devices with priority
 * - Extensible for future 6DoF controllers
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  JogControlActions,
  JogControlState,
  JogAxis,
  JogMode,
  StepSize,
} from '../components/JogControlPanel/useRobotJogControl';
import {
  type GamepadMapping,
  type GamepadState,
  type AnalogInput6DoF,
  type GamepadButtonAction,
  type InputDeviceInfo,
  StandardGamepadButton,
} from './types';
import { useGamepad, type UseGamepadOptions } from './useGamepad';

// ============================================================================
// Types
// ============================================================================

export interface UseInputDeviceOptions {
  /** Whether input devices are enabled */
  enabled?: boolean;
  /** Jog control actions from useRobotJogControl */
  actions: JogControlActions;
  /** Jog control state from useRobotJogControl */
  state: JogControlState;
  /** Custom gamepad mapping */
  gamepadMapping?: GamepadMapping;
  /** Base speed for analog jog (mm/s for translation, deg/s for rotation) */
  baseSpeed?: number;
  /** Analog update rate in Hz (how often to apply analog input) */
  analogUpdateRate?: number;
  /** Enable analog (proportional) control from sticks */
  enableAnalogControl?: boolean;
  /** Selected joint for jog operations (for cycling) */
  selectedJoint?: number;
  /** Callback when selected joint changes */
  onSelectedJointChange?: (joint: number) => void;
  /** Selected axis for Cartesian operations */
  selectedAxis?: JogAxis;
  /** Callback when selected axis changes */
  onSelectedAxisChange?: (axis: JogAxis) => void;
  /** Number of joints on the robot */
  jointCount?: number;
  /** Callback for device connect */
  onDeviceConnect?: (device: InputDeviceInfo) => void;
  /** Callback for device disconnect */
  onDeviceDisconnect?: (device: InputDeviceInfo) => void;
}

export interface UseInputDeviceResult {
  /** Whether a gamepad is connected */
  isGamepadConnected: boolean;
  /** Current gamepad state */
  gamepadState: GamepadState | null;
  /** List of connected gamepads */
  connectedGamepads: InputDeviceInfo[];
  /** Whether analog input is currently active */
  isAnalogActive: boolean;
  /** Current analog input values */
  analogInput: AnalogInput6DoF | null;
  /** Currently selected joint */
  selectedJoint: number;
  /** Currently selected axis */
  selectedAxis: JogAxis;
  /** Set custom gamepad mapping */
  setGamepadMapping: (mapping: GamepadMapping) => void;
}

// ============================================================================
// Constants
// ============================================================================

const CARTESIAN_AXES: JogAxis[] = ['x', 'y', 'z', 'rx', 'ry', 'rz'];

const DEFAULT_BASE_SPEED = 20; // mm/s or deg/s (reduced for better control)
const DEFAULT_ANALOG_UPDATE_RATE = 30; // Hz
const DEG_TO_RAD = Math.PI / 180;
const MM_TO_M = 0.001;

// ============================================================================
// Helper Functions
// ============================================================================

function eulerToQuaternion(roll: number, pitch: number, yaw: number): { x: number; y: number; z: number; w: number } {
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}

function quaternionToEuler(q: { x: number; y: number; z: number; w: number }): { roll: number; pitch: number; yaw: number } {
  const sinrCosp = 2 * (q.w * q.x + q.y * q.z);
  const cosrCosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  const sinp = 2 * (q.w * q.y - q.z * q.x);
  let pitch: number;
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * (Math.PI / 2);
  } else {
    pitch = Math.asin(sinp);
  }

  const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
  const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return { roll, pitch, yaw };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useInputDevice(options: UseInputDeviceOptions): UseInputDeviceResult {
  const {
    enabled = true,
    actions,
    state,
    gamepadMapping,
    baseSpeed = DEFAULT_BASE_SPEED,
    analogUpdateRate = DEFAULT_ANALOG_UPDATE_RATE,
    enableAnalogControl = true,
    selectedJoint: externalSelectedJoint,
    onSelectedJointChange,
    selectedAxis: externalSelectedAxis,
    onSelectedAxisChange,
    jointCount = 6,
    onDeviceConnect,
    onDeviceDisconnect,
  } = options;

  // Internal state for joint/axis selection
  const selectedJointRef = useRef(externalSelectedJoint ?? 0);
  const selectedAxisRef = useRef<JogAxis>(externalSelectedAxis ?? 'x');

  // Refs to avoid stale closures in callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const enableAnalogControlRef = useRef(enableAnalogControl);
  enableAnalogControlRef.current = enableAnalogControl;

  const baseSpeedRef = useRef(baseSpeed);
  baseSpeedRef.current = baseSpeed;

  const analogUpdateRateRef = useRef(analogUpdateRate);
  analogUpdateRateRef.current = analogUpdateRate;

  const jointCountRef = useRef(jointCount);
  jointCountRef.current = jointCount;

  // Update refs when external values change
  useEffect(() => {
    if (externalSelectedJoint !== undefined) {
      selectedJointRef.current = externalSelectedJoint;
    }
  }, [externalSelectedJoint]);

  useEffect(() => {
    if (externalSelectedAxis !== undefined) {
      selectedAxisRef.current = externalSelectedAxis;
    }
  }, [externalSelectedAxis]);

  // Analog input interval ref
  const analogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAnalogInputRef = useRef<AnalogInput6DoF | null>(null);
  const gamepadStateRef = useRef<GamepadState | null>(null);

  /**
   * Execute a button action (uses refs to avoid stale closures)
   */
  const executeButtonAction = useCallback((
    action: GamepadButtonAction,
    _gamepad: GamepadState
  ) => {
    const currentState = stateRef.current;
    const currentActions = actionsRef.current;
    const currentJointCount = jointCountRef.current;

    switch (action) {
      // Mode switching
      case 'toggleMode': {
        const modes: JogMode[] = ['joint', 'cartesian', 'tool'];
        const currentIndex = modes.indexOf(currentState.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        currentActions.setMode(modes[nextIndex]);
        break;
      }
      case 'setModeJoint':
        currentActions.setMode('joint');
        break;
      case 'setModeCartesian':
        currentActions.setMode('cartesian');
        break;
      case 'setModeTool':
        currentActions.setMode('tool');
        break;

      // Joint selection
      case 'selectJoint1':
      case 'selectJoint2':
      case 'selectJoint3':
      case 'selectJoint4':
      case 'selectJoint5':
      case 'selectJoint6': {
        const jointIndex = parseInt(action.replace('selectJoint', '')) - 1;
        selectedJointRef.current = jointIndex;
        onSelectedJointChange?.(jointIndex);
        break;
      }
      case 'nextJoint': {
        const next = (selectedJointRef.current + 1) % currentJointCount;
        selectedJointRef.current = next;
        onSelectedJointChange?.(next);
        break;
      }
      case 'prevJoint': {
        const prev = (selectedJointRef.current - 1 + currentJointCount) % currentJointCount;
        selectedJointRef.current = prev;
        onSelectedJointChange?.(prev);
        break;
      }

      // Axis selection
      case 'selectAxisX':
      case 'selectAxisY':
      case 'selectAxisZ':
      case 'selectAxisRX':
      case 'selectAxisRY':
      case 'selectAxisRZ': {
        const axisMap: Record<string, JogAxis> = {
          selectAxisX: 'x',
          selectAxisY: 'y',
          selectAxisZ: 'z',
          selectAxisRX: 'rx',
          selectAxisRY: 'ry',
          selectAxisRZ: 'rz',
        };
        const axis = axisMap[action];
        selectedAxisRef.current = axis;
        onSelectedAxisChange?.(axis);
        break;
      }
      case 'nextAxis': {
        const currentIndex = CARTESIAN_AXES.indexOf(selectedAxisRef.current);
        const nextIndex = (currentIndex + 1) % CARTESIAN_AXES.length;
        const nextAxis = CARTESIAN_AXES[nextIndex];
        selectedAxisRef.current = nextAxis;
        onSelectedAxisChange?.(nextAxis);
        break;
      }
      case 'prevAxis': {
        const currentIndex = CARTESIAN_AXES.indexOf(selectedAxisRef.current);
        const prevIndex = (currentIndex - 1 + CARTESIAN_AXES.length) % CARTESIAN_AXES.length;
        const prevAxis = CARTESIAN_AXES[prevIndex];
        selectedAxisRef.current = prevAxis;
        onSelectedAxisChange?.(prevAxis);
        break;
      }

      // Step size
      case 'stepFine':
        currentActions.setStepJoint(0.1 as StepSize);
        currentActions.setStepCartesian(0.1 as StepSize);
        break;
      case 'stepMedium':
        currentActions.setStepJoint(1 as StepSize);
        currentActions.setStepCartesian(1 as StepSize);
        break;
      case 'stepCoarse':
        currentActions.setStepJoint(10 as StepSize);
        currentActions.setStepCartesian(10 as StepSize);
        break;
      case 'nextStep': {
        const steps: StepSize[] = [0.1, 1, 10];
        const currentIndex = steps.indexOf(currentState.stepJoint);
        const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
        currentActions.setStepJoint(steps[nextIndex]);
        currentActions.setStepCartesian(steps[nextIndex]);
        break;
      }
      case 'prevStep': {
        const steps: StepSize[] = [0.1, 1, 10];
        const currentIndex = steps.indexOf(currentState.stepJoint);
        const prevIndex = Math.max(currentIndex - 1, 0);
        currentActions.setStepJoint(steps[prevIndex]);
        currentActions.setStepCartesian(steps[prevIndex]);
        break;
      }

      // Config selection
      case 'nextConfig': {
        const nextConfig = (currentState.selectedConfig + 1) % currentState.ikSolutions.length;
        if (currentState.ikSolutions.length > 0) {
          currentActions.setSelectedConfig(nextConfig);
        }
        break;
      }
      case 'prevConfig': {
        const prevConfig = (currentState.selectedConfig - 1 + currentState.ikSolutions.length) % currentState.ikSolutions.length;
        if (currentState.ikSolutions.length > 0) {
          currentActions.setSelectedConfig(prevConfig);
        }
        break;
      }
      case 'selectConfig1':
      case 'selectConfig2':
      case 'selectConfig3':
      case 'selectConfig4':
      case 'selectConfig5':
      case 'selectConfig6':
      case 'selectConfig7':
      case 'selectConfig8': {
        const configIndex = parseInt(action.replace('selectConfig', '')) - 1;
        if (configIndex < currentState.ikSolutions.length) {
          currentActions.setSelectedConfig(configIndex);
        }
        break;
      }

      // Actions
      case 'goHome':
        // Reset to home position (all zeros)
        currentActions.setJoints(new Array(currentJointCount).fill(0));
        break;

      case 'emergencyStop':
        // Stop any continuous jog
        currentActions.stopContinuousJog();
        break;

      // Modifiers are handled separately
      case 'speedBoost':
      case 'precisionMode':
      case 'none':
        break;
    }
  }, [onSelectedJointChange, onSelectedAxisChange]); // Only external callbacks as deps

  /**
   * Handle button press from gamepad
   */
  const handleButtonPress = useCallback((button: StandardGamepadButton, gamepad: GamepadState) => {
    const action = gamepad.mapping.buttons[button];
    if (action && action !== 'none') {
      executeButtonAction(action, gamepad);
    }
  }, [executeButtonAction]);

  /**
   * Apply analog input to jog control (uses refs to avoid stale closures)
   */
  const applyAnalogInput = useCallback((input: AnalogInput6DoF, gamepad: GamepadState) => {
    if (!enableAnalogControlRef.current) return;

    const currentState = stateRef.current;
    const currentActions = actionsRef.current;
    const currentBaseSpeed = baseSpeedRef.current;
    const currentAnalogUpdateRate = analogUpdateRateRef.current;
    const currentJointCount = jointCountRef.current;

    // Check for modifier buttons
    const isSpeedBoost = gamepad.buttons[StandardGamepadButton.RB] || false;
    const isPrecision = gamepad.buttons[StandardGamepadButton.RightStick] || false;

    // Calculate speed multiplier
    // Normal: 1.0x, Speed boost (RB): 1.5x, Precision (R3): 0.2x
    let speedMultiplier = 1.0;
    if (isSpeedBoost) speedMultiplier = 1.5;
    if (isPrecision) speedMultiplier = 0.2;

    const mode = currentState.mode;

    if (mode === 'joint') {
      // In joint mode, map sticks to joint pairs
      // Left stick X -> J1, Left stick Y -> J2
      // Right stick X -> J3, Right stick Y -> J4
      // Triggers (RT-LT) -> J5
      // Right stick Y when LB held -> J6 (modifier mode)

      // Check if LB is held for J6 control
      const isJ6Mode = gamepad.buttons[StandardGamepadButton.LB] || false;

      const jointDeltas = [
        isJ6Mode ? 0 : input.tx, // J1 (disabled when LB held)
        isJ6Mode ? 0 : input.ty, // J2 (disabled when LB held)
        isJ6Mode ? 0 : input.rx, // J3 (disabled when LB held)
        isJ6Mode ? 0 : input.ry, // J4 (disabled when LB held)
        input.tz,                 // J5 (RT positive, LT negative)
        isJ6Mode ? input.ry : 0,  // J6 (Right stick Y when LB held)
      ];

      // Get current joints and calculate new values directly
      // This avoids the stale closure issue with jogJoint
      const currentJoints = [...currentState.currentJoints];
      let hasChange = false;

      for (let i = 0; i < Math.min(jointDeltas.length, currentJointCount); i++) {
        const delta = jointDeltas[i];
        if (Math.abs(delta) > 0.01) {
          // Convert analog value to radians per frame
          // analog value (-1 to 1) * baseSpeed (deg/s) * speedMultiplier * dt (s)
          const deltaRad = delta * currentBaseSpeed * speedMultiplier * (1 / currentAnalogUpdateRate) * DEG_TO_RAD;
          currentJoints[i] += deltaRad;
          hasChange = true;
        }
      }

      // Apply all joint changes at once
      if (hasChange) {
        currentActions.setJoints(currentJoints);
      }
    } else {
      // In Cartesian/tool mode, map sticks to translation/rotation
      // LB modifier switches right stick to RZ control
      const isRzMode = gamepad.buttons[StandardGamepadButton.LB] || false;

      const axisInputs: Record<JogAxis, number> = {
        x: isRzMode ? 0 : input.tx,  // X translation (disabled when LB held)
        y: isRzMode ? 0 : input.ty,  // Y translation (disabled when LB held)
        z: input.tz,                  // Z translation (triggers)
        rx: isRzMode ? 0 : input.rx, // RX rotation (disabled when LB held)
        ry: isRzMode ? 0 : input.ry, // RY rotation (disabled when LB held)
        rz: isRzMode ? input.rx : 0, // RZ rotation (right stick X when LB held)
      };

      // Build new pose by applying deltas directly
      const currentPose = { ...currentState.currentPose };
      const newPosition = { ...currentPose.position };
      let hasPositionChange = false;

      // Apply translation
      for (const axis of ['x', 'y', 'z'] as const) {
        const value = axisInputs[axis];
        if (Math.abs(value) > 0.01) {
          const delta = value * currentBaseSpeed * speedMultiplier * (1 / currentAnalogUpdateRate);
          const deltaM = delta * MM_TO_M;
          newPosition[axis] += deltaM;
          hasPositionChange = true;
        }
      }

      // Apply rotation using Euler angles
      // Get current orientation as Euler angles and apply deltas
      const currentOrientation = currentPose.orientation;
      const euler = quaternionToEuler(currentOrientation);
      let hasRotationChange = false;

      for (const axis of ['rx', 'ry', 'rz'] as const) {
        const value = axisInputs[axis];
        if (Math.abs(value) > 0.01) {
          const deltaDeg = value * currentBaseSpeed * speedMultiplier * (1 / currentAnalogUpdateRate);
          const deltaRad = deltaDeg * DEG_TO_RAD;
          if (axis === 'rx') euler.roll += deltaRad;
          if (axis === 'ry') euler.pitch += deltaRad;
          if (axis === 'rz') euler.yaw += deltaRad;
          hasRotationChange = true;
        }
      }

      // Apply all changes via setPose in a single call
      if (hasPositionChange || hasRotationChange) {
        const newOrientation = hasRotationChange
          ? eulerToQuaternion(euler.roll, euler.pitch, euler.yaw)
          : currentPose.orientation;
        currentActions.setPose({
          position: newPosition,
          orientation: newOrientation,
        });
      }
    }
  }, []); // No deps - uses refs

  /**
   * Handle analog input from gamepad
   */
  const handleAnalogInput = useCallback((input: AnalogInput6DoF, gamepad: GamepadState) => {
    lastAnalogInputRef.current = input;
    // Analog input is applied at a fixed rate via interval
  }, []);

  /**
   * Handle device connect
   */
  const handleConnect = useCallback((gamepad: GamepadState) => {
    onDeviceConnect?.(gamepad.info);
  }, [onDeviceConnect]);

  /**
   * Handle device disconnect
   */
  const handleDisconnect = useCallback((info: InputDeviceInfo) => {
    // Stop any ongoing analog input
    lastAnalogInputRef.current = null;
    onDeviceDisconnect?.(info);
  }, [onDeviceDisconnect]);

  // Set up gamepad hook
  const gamepadOptions: UseGamepadOptions = useMemo(() => ({
    enabled,
    customMapping: gamepadMapping,
    onButtonPress: handleButtonPress,
    onAnalogInput: handleAnalogInput,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  }), [enabled, gamepadMapping, handleButtonPress, handleAnalogInput, handleConnect, handleDisconnect]);

  const {
    isConnected: isGamepadConnected,
    gamepad: gamepadState,
    connectedGamepads,
    analogInput,
    isAnalogActive,
    setMapping: setGamepadMapping,
  } = useGamepad(gamepadOptions);

  // Keep gamepadStateRef updated
  useEffect(() => {
    gamepadStateRef.current = gamepadState;
  }, [gamepadState]);

  // Set up analog input interval
  useEffect(() => {
    if (!enabled || !enableAnalogControl || !isGamepadConnected) {
      if (analogIntervalRef.current) {
        clearInterval(analogIntervalRef.current);
        analogIntervalRef.current = null;
      }
      return;
    }

    const intervalMs = 1000 / analogUpdateRateRef.current;

    analogIntervalRef.current = setInterval(() => {
      if (lastAnalogInputRef.current && gamepadStateRef.current) {
        applyAnalogInput(lastAnalogInputRef.current, gamepadStateRef.current);
      }
    }, intervalMs);

    return () => {
      if (analogIntervalRef.current) {
        clearInterval(analogIntervalRef.current);
        analogIntervalRef.current = null;
      }
    };
  }, [enabled, enableAnalogControl, isGamepadConnected, applyAnalogInput]);

  return {
    isGamepadConnected,
    gamepadState,
    connectedGamepads,
    isAnalogActive,
    analogInput,
    selectedJoint: selectedJointRef.current,
    selectedAxis: selectedAxisRef.current,
    setGamepadMapping,
  };
}

export default useInputDevice;
