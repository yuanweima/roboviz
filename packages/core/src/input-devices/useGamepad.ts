/**
 * useGamepad Hook
 *
 * React hook for reading gamepad state using the Web Gamepad API.
 * Provides:
 * - Automatic gamepad detection and connection handling
 * - Configurable polling rate
 * - Deadzone and sensitivity processing
 * - Edge detection for button presses
 * - Preset-based mapping with auto-detection
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  type InputDeviceInfo,
  type GamepadState,
  type GamepadMapping,
  type AnalogInput6DoF,
  type JogInputAction,
  StandardGamepadAxis,
  StandardGamepadButton,
} from './types';
import {
  detectGamepadPreset,
  getGamepadPreset,
  DEFAULT_DEADZONE,
} from './gamepad-presets';

// ============================================================================
// Types
// ============================================================================

export interface UseGamepadOptions {
  /** Enable gamepad support (default: true) */
  enabled?: boolean;
  /** Polling rate in Hz (default: 60) */
  pollingRate?: number;
  /** Custom mapping override */
  customMapping?: GamepadMapping;
  /** Gamepad index to use (default: 0 = first connected gamepad) */
  gamepadIndex?: number;
  /** Callback when a button is pressed (edge-triggered) */
  onButtonPress?: (button: StandardGamepadButton, gamepad: GamepadState) => void;
  /** Callback when a button is released (edge-triggered) */
  onButtonRelease?: (button: StandardGamepadButton, gamepad: GamepadState) => void;
  /** Callback for continuous analog input (called every frame when active) */
  onAnalogInput?: (input: AnalogInput6DoF, gamepad: GamepadState) => void;
  /** Callback when gamepad connects */
  onConnect?: (gamepad: GamepadState) => void;
  /** Callback when gamepad disconnects */
  onDisconnect?: (info: InputDeviceInfo) => void;
}

export interface UseGamepadResult {
  /** Whether a gamepad is connected */
  isConnected: boolean;
  /** Current gamepad state (null if not connected) */
  gamepad: GamepadState | null;
  /** List of all connected gamepads */
  connectedGamepads: InputDeviceInfo[];
  /** Currently applied mapping */
  mapping: GamepadMapping | null;
  /** Current analog input (processed with deadzone) */
  analogInput: AnalogInput6DoF | null;
  /** Whether any analog input is active (above deadzone) */
  isAnalogActive: boolean;
  /** Refresh gamepad state manually */
  refresh: () => void;
  /** Set custom mapping */
  setMapping: (mapping: GamepadMapping) => void;
  /** Select a specific gamepad by index */
  selectGamepad: (index: number) => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Apply deadzone to a single axis value
 */
function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) {
    return 0;
  }
  // Rescale to 0-1 range after deadzone
  const sign = value > 0 ? 1 : -1;
  return sign * (Math.abs(value) - deadzone) / (1 - deadzone);
}

/**
 * Apply sensitivity curve to a value
 * sensitivity > 1 = more responsive at edges (exponential)
 * sensitivity < 1 = more responsive near center
 * sensitivity = 1 = linear
 */
function applySensitivity(value: number, sensitivity: number): number {
  const sign = value > 0 ? 1 : -1;
  return sign * Math.pow(Math.abs(value), sensitivity);
}

/**
 * Process an axis value with deadzone, inversion, and sensitivity
 */
function processAxis(
  value: number,
  inverted: boolean = false,
  deadzone: number = DEFAULT_DEADZONE,
  sensitivity: number = 1.0
): number {
  let processed = inverted ? -value : value;
  processed = applyDeadzone(processed, deadzone);
  processed = applySensitivity(processed, sensitivity);
  return processed;
}

/**
 * Create device info from browser Gamepad object
 */
function createDeviceInfo(gamepad: Gamepad): InputDeviceInfo {
  return {
    id: `gamepad-${gamepad.index}`,
    type: 'gamepad',
    name: gamepad.id,
    connectionState: gamepad.connected ? 'connected' : 'disconnected',
    lastActivity: Date.now(),
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGamepad(options: UseGamepadOptions = {}): UseGamepadResult {
  const {
    enabled = true,
    pollingRate = 60,
    customMapping,
    gamepadIndex = 0,
    onButtonPress,
    onButtonRelease,
    onAnalogInput,
    onConnect,
    onDisconnect,
  } = options;

  // State
  const [gamepadState, setGamepadState] = useState<GamepadState | null>(null);
  const [connectedGamepads, setConnectedGamepads] = useState<InputDeviceInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(gamepadIndex);
  const [currentMapping, setCurrentMapping] = useState<GamepadMapping | null>(customMapping || null);

  // Refs for callbacks to avoid stale closures
  const callbacksRef = useRef({ onButtonPress, onButtonRelease, onAnalogInput, onConnect, onDisconnect });
  callbacksRef.current = { onButtonPress, onButtonRelease, onAnalogInput, onConnect, onDisconnect };

  // Previous state for edge detection
  const prevButtonsRef = useRef<boolean[]>([]);

  // Polling interval ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);

  /**
   * Get current gamepad from browser API
   */
  const getBrowserGamepad = useCallback((): Gamepad | null => {
    const gamepads = navigator.getGamepads();
    return gamepads[selectedIndex] || null;
  }, [selectedIndex]);

  /**
   * Update the list of connected gamepads
   */
  const updateConnectedList = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const connected: InputDeviceInfo[] = [];
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.connected) {
        connected.push(createDeviceInfo(gp));
      }
    }
    setConnectedGamepads(connected);
    return connected;
  }, []);

  // Ref to track current mapping to avoid stale closure issues
  const currentMappingRef = useRef(currentMapping);
  currentMappingRef.current = currentMapping;

  // Ref to track gamepad state for callbacks
  const gamepadStateRef = useRef<GamepadState | null>(null);

  /**
   * Process gamepad state and trigger callbacks
   */
  const processGamepadState = useCallback((browserGamepad: Gamepad) => {
    // Detect and apply mapping if not set
    let mapping = currentMappingRef.current;
    if (!mapping) {
      mapping = getGamepadPreset(browserGamepad.id);
      setCurrentMapping(mapping);
      currentMappingRef.current = mapping;
    }

    const detectedPreset = detectGamepadPreset(browserGamepad.id);

    // Extract button states
    const buttons = browserGamepad.buttons.map(b => b.pressed);
    const prevButtons = prevButtonsRef.current;

    // Build new state first (before edge detection callbacks)
    const axes = [...browserGamepad.axes];

    // Build processed analog input
    const leftStickX = processAxis(
      axes[StandardGamepadAxis.LeftStickX] || 0,
      mapping.leftStick?.x?.inverted,
      mapping.leftStick?.x?.deadzone ?? mapping.globalDeadzone,
      mapping.leftStick?.x?.sensitivity
    );
    const leftStickY = processAxis(
      axes[StandardGamepadAxis.LeftStickY] || 0,
      mapping.leftStick?.y?.inverted,
      mapping.leftStick?.y?.deadzone ?? mapping.globalDeadzone,
      mapping.leftStick?.y?.sensitivity
    );
    const rightStickX = processAxis(
      axes[StandardGamepadAxis.RightStickX] || 0,
      mapping.rightStick?.x?.inverted,
      mapping.rightStick?.x?.deadzone ?? mapping.globalDeadzone,
      mapping.rightStick?.x?.sensitivity
    );
    const rightStickY = processAxis(
      axes[StandardGamepadAxis.RightStickY] || 0,
      mapping.rightStick?.y?.inverted,
      mapping.rightStick?.y?.deadzone ?? mapping.globalDeadzone,
      mapping.rightStick?.y?.sensitivity
    );

    // Triggers (buttons 6 and 7 are analog triggers on most gamepads)
    const leftTrigger = browserGamepad.buttons[StandardGamepadButton.LT]?.value || 0;
    const rightTrigger = browserGamepad.buttons[StandardGamepadButton.RT]?.value || 0;

    // Calculate Z from triggers (RT = positive, LT = negative)
    const triggerZ = rightTrigger - leftTrigger;

    // Build new state
    const newState: GamepadState = {
      info: createDeviceInfo(browserGamepad),
      isActive: true,
      buttons,
      prevButtons: [...prevButtons],
      axes,
      mapping,
      detectedPreset,
    };

    // Update ref before callbacks
    gamepadStateRef.current = newState;

    // Edge detection for button presses/releases (after state is built)
    for (let i = 0; i < buttons.length; i++) {
      const isPressed = buttons[i];
      const wasPressed = prevButtons[i] || false;

      if (isPressed && !wasPressed) {
        // Button just pressed
        const buttonEnum = i as StandardGamepadButton;
        if (callbacksRef.current.onButtonPress) {
          callbacksRef.current.onButtonPress(buttonEnum, newState);
        }
      } else if (!isPressed && wasPressed) {
        // Button just released
        const buttonEnum = i as StandardGamepadButton;
        if (callbacksRef.current.onButtonRelease) {
          callbacksRef.current.onButtonRelease(buttonEnum, newState);
        }
      }
    }

    // Save current buttons for next frame
    prevButtonsRef.current = [...buttons];

    // Update state (batch this update)
    setGamepadState(newState);

    // Build 6DoF input
    // Map sticks to translation/rotation based on mapping
    const analogInput: AnalogInput6DoF = {
      tx: leftStickX,
      ty: leftStickY,
      tz: triggerZ,
      rx: rightStickX,
      ry: rightStickY,
      rz: 0, // Could be mapped to stick twist or button combo
    };

    // Check if any analog input is active (above deadzone)
    const isAnalogActive =
      Math.abs(analogInput.tx) > 0 ||
      Math.abs(analogInput.ty) > 0 ||
      Math.abs(analogInput.tz) > 0 ||
      Math.abs(analogInput.rx) > 0 ||
      Math.abs(analogInput.ry) > 0 ||
      Math.abs(analogInput.rz) > 0;

    // Always call analog input callback (even with zero values)
    // This ensures the robot stops when sticks return to center
    if (callbacksRef.current.onAnalogInput) {
      callbacksRef.current.onAnalogInput(analogInput, newState);
    }

    return { state: newState, analogInput, isAnalogActive };
  }, []); // Remove dependencies to avoid recreation

  /**
   * Main polling function
   */
  const poll = useCallback(() => {
    if (!enabled) return;

    const browserGamepad = getBrowserGamepad();

    if (browserGamepad && browserGamepad.connected) {
      processGamepadState(browserGamepad);
    } else if (gamepadStateRef.current) {
      // Gamepad was disconnected
      if (callbacksRef.current.onDisconnect) {
        callbacksRef.current.onDisconnect(gamepadStateRef.current.info);
      }
      setGamepadState(null);
      gamepadStateRef.current = null;
      prevButtonsRef.current = [];
    }

    // Schedule next poll using requestAnimationFrame for smooth updates
    rafRef.current = requestAnimationFrame(poll);
  }, [enabled, getBrowserGamepad, processGamepadState]);

  /**
   * Handle gamepad connection
   */
  const handleGamepadConnected = useCallback((event: GamepadEvent) => {
    updateConnectedList();

    // If this is the first gamepad or our selected index, update state
    if (event.gamepad.index === selectedIndex) {
      const mapping = customMapping || getGamepadPreset(event.gamepad.id);
      setCurrentMapping(mapping);

      const info = createDeviceInfo(event.gamepad);
      const state: GamepadState = {
        info,
        isActive: false,
        buttons: event.gamepad.buttons.map(b => b.pressed),
        prevButtons: [],
        axes: [...event.gamepad.axes],
        mapping,
        detectedPreset: detectGamepadPreset(event.gamepad.id),
      };

      setGamepadState(state);

      if (callbacksRef.current.onConnect) {
        callbacksRef.current.onConnect(state);
      }
    }
  }, [selectedIndex, customMapping, updateConnectedList]);

  /**
   * Handle gamepad disconnection
   */
  const handleGamepadDisconnected = useCallback((event: GamepadEvent) => {
    updateConnectedList();

    if (event.gamepad.index === selectedIndex && gamepadStateRef.current) {
      if (callbacksRef.current.onDisconnect) {
        callbacksRef.current.onDisconnect(gamepadStateRef.current.info);
      }
      setGamepadState(null);
      gamepadStateRef.current = null;
      prevButtonsRef.current = [];
    }
  }, [selectedIndex, updateConnectedList]);

  // Set up event listeners and polling
  useEffect(() => {
    if (!enabled) return;

    // Check for Gamepad API support
    if (!navigator.getGamepads) {
      console.warn('Gamepad API not supported in this browser');
      return;
    }

    // Add event listeners
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Initial check for already-connected gamepads
    updateConnectedList();
    const browserGamepad = getBrowserGamepad();
    if (browserGamepad) {
      handleGamepadConnected({ gamepad: browserGamepad } as GamepadEvent);
    }

    // Start polling
    rafRef.current = requestAnimationFrame(poll);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [enabled, handleGamepadConnected, handleGamepadDisconnected, poll, getBrowserGamepad, updateConnectedList]);

  // Computed values
  const analogInput = useMemo(() => {
    if (!gamepadState) return null;

    const mapping = gamepadState.mapping;
    const axes = gamepadState.axes;

    const leftStickX = processAxis(
      axes[StandardGamepadAxis.LeftStickX] || 0,
      mapping.leftStick?.x?.inverted,
      mapping.leftStick?.x?.deadzone ?? mapping.globalDeadzone,
      mapping.leftStick?.x?.sensitivity
    );
    const leftStickY = processAxis(
      axes[StandardGamepadAxis.LeftStickY] || 0,
      mapping.leftStick?.y?.inverted,
      mapping.leftStick?.y?.deadzone ?? mapping.globalDeadzone,
      mapping.leftStick?.y?.sensitivity
    );
    const rightStickX = processAxis(
      axes[StandardGamepadAxis.RightStickX] || 0,
      mapping.rightStick?.x?.inverted,
      mapping.rightStick?.x?.deadzone ?? mapping.globalDeadzone,
      mapping.rightStick?.x?.sensitivity
    );
    const rightStickY = processAxis(
      axes[StandardGamepadAxis.RightStickY] || 0,
      mapping.rightStick?.y?.inverted,
      mapping.rightStick?.y?.deadzone ?? mapping.globalDeadzone,
      mapping.rightStick?.y?.sensitivity
    );

    // Get trigger values from buttons array
    const leftTrigger = gamepadState.buttons[StandardGamepadButton.LT] ? 1 : 0;
    const rightTrigger = gamepadState.buttons[StandardGamepadButton.RT] ? 1 : 0;
    const triggerZ = rightTrigger - leftTrigger;

    return {
      tx: leftStickX,
      ty: leftStickY,
      tz: triggerZ,
      rx: rightStickX,
      ry: rightStickY,
      rz: 0,
    };
  }, [gamepadState]);

  const isAnalogActive = useMemo(() => {
    if (!analogInput) return false;
    return (
      Math.abs(analogInput.tx) > 0 ||
      Math.abs(analogInput.ty) > 0 ||
      Math.abs(analogInput.tz) > 0 ||
      Math.abs(analogInput.rx) > 0 ||
      Math.abs(analogInput.ry) > 0 ||
      Math.abs(analogInput.rz) > 0
    );
  }, [analogInput]);

  // Actions
  const refresh = useCallback(() => {
    updateConnectedList();
  }, [updateConnectedList]);

  const setMapping = useCallback((mapping: GamepadMapping) => {
    setCurrentMapping(mapping);
    currentMappingRef.current = mapping;
    // Update gamepad state with new mapping if connected
    if (gamepadStateRef.current) {
      const newState = {
        ...gamepadStateRef.current,
        mapping,
      };
      gamepadStateRef.current = newState;
      setGamepadState(newState);
    }
  }, []);

  const selectGamepad = useCallback((index: number) => {
    setSelectedIndex(index);
    prevButtonsRef.current = [];
    setGamepadState(null);
  }, []);

  return {
    isConnected: gamepadState !== null && gamepadState.info.connectionState === 'connected',
    gamepad: gamepadState,
    connectedGamepads,
    mapping: currentMapping,
    analogInput,
    isAnalogActive,
    refresh,
    setMapping,
    selectGamepad,
  };
}

export default useGamepad;
