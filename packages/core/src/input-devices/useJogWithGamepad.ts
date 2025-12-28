/**
 * useJogWithGamepad Hook
 *
 * A convenience hook that combines useRobotJogControl with gamepad support.
 * Provides a unified interface for robot jog control with both keyboard
 * and gamepad input.
 *
 * @example
 * ```tsx
 * import { useJogWithGamepad, GamepadStatusPanel } from '@aspect/roboviz-core';
 *
 * function RobotJogPanel() {
 *   const {
 *     state,
 *     actions,
 *     gamepad,
 *     selectedJoint,
 *     selectedAxis,
 *   } = useJogWithGamepad({
 *     robotId: 'my-robot',
 *     robotName: 'Fanuc M-10iA',
 *     enableGamepad: true,
 *   });
 *
 *   return (
 *     <div>
 *       <GamepadStatusPanel
 *         isConnected={gamepad.isConnected}
 *         gamepadState={gamepad.state}
 *         analogInput={gamepad.analogInput}
 *       />
 *       <JogControlPanel {...} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  useRobotJogControl,
  type UseRobotJogControlOptions,
  type JogControlState,
  type JogControlActions,
  type JogAxis,
} from '../components/JogControlPanel/useRobotJogControl';
import { useInputDevice } from './useInputDevice';
import type {
  GamepadMapping,
  GamepadState,
  AnalogInput6DoF,
  InputDeviceInfo,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface UseJogWithGamepadOptions extends UseRobotJogControlOptions {
  /** Enable gamepad support (default: true) */
  enableGamepad?: boolean;
  /** Enable analog (proportional) control from gamepad sticks (default: true) */
  enableAnalogControl?: boolean;
  /** Custom gamepad mapping */
  gamepadMapping?: GamepadMapping;
  /** Base speed for analog jog (mm/s or deg/s, default: 50) */
  analogBaseSpeed?: number;
  /** Analog update rate in Hz (default: 30) */
  analogUpdateRate?: number;
  /** Callback when gamepad connects */
  onGamepadConnect?: (device: InputDeviceInfo) => void;
  /** Callback when gamepad disconnects */
  onGamepadDisconnect?: (device: InputDeviceInfo) => void;
}

export interface GamepadInfo {
  /** Whether a gamepad is connected */
  isConnected: boolean;
  /** Current gamepad state */
  state: GamepadState | null;
  /** List of all connected gamepads */
  connectedList: InputDeviceInfo[];
  /** Current analog input values */
  analogInput: AnalogInput6DoF | null;
  /** Whether analog input is currently active */
  isAnalogActive: boolean;
  /** Update gamepad mapping */
  setMapping: (mapping: GamepadMapping) => void;
}

export interface UseJogWithGamepadResult {
  /** Jog control state */
  state: JogControlState;
  /** Jog control actions */
  actions: JogControlActions;
  /** Gamepad information and controls */
  gamepad: GamepadInfo;
  /** Currently selected joint (from keyboard or gamepad) */
  selectedJoint: number;
  /** Currently selected Cartesian axis (from keyboard or gamepad) */
  selectedAxis: JogAxis;
  /** Set selected joint */
  setSelectedJoint: (joint: number) => void;
  /** Set selected axis */
  setSelectedAxis: (axis: JogAxis) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useJogWithGamepad(
  options: UseJogWithGamepadOptions
): UseJogWithGamepadResult {
  const {
    // Gamepad-specific options
    enableGamepad = true,
    enableAnalogControl = true,
    gamepadMapping,
    analogBaseSpeed = 50,
    analogUpdateRate = 30,
    onGamepadConnect,
    onGamepadDisconnect,
    // Pass through to useRobotJogControl
    ...jogControlOptions
  } = options;

  // Use the base jog control hook
  const [state, actions] = useRobotJogControl(jogControlOptions);

  // Track selected joint/axis
  const [selectedJoint, setSelectedJoint] = useState(0);
  const [selectedAxis, setSelectedAxis] = useState<JogAxis>('x');

  // Callbacks for selection changes
  const handleSelectedJointChange = useCallback((joint: number) => {
    setSelectedJoint(joint);
  }, []);

  const handleSelectedAxisChange = useCallback((axis: JogAxis) => {
    setSelectedAxis(axis);
  }, []);

  // Refs to pass live values to useInputDevice without causing memoization issues
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const stateRef = useRef(state);
  stateRef.current = state;

  // Use input device hook for gamepad integration
  // Note: We pass both the refs and the current values.
  // The hook will use refs for callbacks to avoid stale closures.
  const {
    isGamepadConnected,
    gamepadState,
    connectedGamepads,
    analogInput,
    isAnalogActive,
    setGamepadMapping,
  } = useInputDevice({
    enabled: enableGamepad,
    actions,
    state,
    gamepadMapping,
    baseSpeed: analogBaseSpeed,
    analogUpdateRate,
    enableAnalogControl,
    selectedJoint,
    onSelectedJointChange: handleSelectedJointChange,
    selectedAxis,
    onSelectedAxisChange: handleSelectedAxisChange,
    jointCount: jogControlOptions.initialJoints?.length ?? 6,
    onDeviceConnect: onGamepadConnect,
    onDeviceDisconnect: onGamepadDisconnect,
  });

  // Build gamepad info object
  const gamepad: GamepadInfo = useMemo(() => ({
    isConnected: isGamepadConnected,
    state: gamepadState,
    connectedList: connectedGamepads,
    analogInput,
    isAnalogActive,
    setMapping: setGamepadMapping,
  }), [
    isGamepadConnected,
    gamepadState,
    connectedGamepads,
    analogInput,
    isAnalogActive,
    setGamepadMapping,
  ]);

  return {
    state,
    actions,
    gamepad,
    selectedJoint,
    selectedAxis,
    setSelectedJoint,
    setSelectedAxis,
  };
}

export default useJogWithGamepad;
