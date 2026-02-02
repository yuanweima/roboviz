/**
 * Gamepad Control Demo Module
 *
 * Demonstrates the UNIFIED GHOST ARCHITECTURE for robot jog control:
 * - Uses ProcessProvider + RobotProcessProvider for unified state
 * - Uses useGamepadInput for pure input layer
 * - Uses useProcessGhost for unified ghost control
 * - Ghost robot is the SAME concept as in WeldingScene
 *
 * This module showcases:
 * - Gamepad connection detection and status display
 * - Analog stick input for proportional robot movement
 * - D-pad for discrete joint/axis selection
 * - Button mappings for mode switching and step size control
 * - Real-time analog input visualization
 * - Support for Xbox, PlayStation, Nintendo, and generic controllers
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls, button } from 'leva';
// Rendering: theme system and core canvas
import {
  RoboVizCore,
  RoboVizThemeProvider,
  darkTheme,
  lightTheme,
  industrialTheme,
  createRoboVizTheme,
  type RoboVizTheme,
} from '@aspect/roboviz-core/rendering';
// Process, input devices, and jog control (main entry)
import {
  ProcessProvider,
  RobotProcessProvider,
  ProcessScene,
  useProcessGhost,
  useProcessRobot,
  useRobotProcessState,
  useGamepadInput,
  GamepadStatusPanel,
  GAMEPAD_PRESETS,
  StandardGamepadButton,
  JogControlPanel,
  useRobotJogControl,
} from '@aspect/roboviz-core';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';
const ROBOT_ID = 'gamepad-test-robot';

// Joint limits for Fanuc LR Mate 200iD/7L (in radians)
const DEG_TO_RAD = Math.PI / 180;
const JOINT_LIMITS = {
  lower: [-170, -100, -70, -190, -135, -360].map(d => d * DEG_TO_RAD),
  upper: [170, 135, 230, 190, 135, 360].map(d => d * DEG_TO_RAD),
};

// Theme presets
const THEME_PRESETS: Record<string, RoboVizTheme> = {
  dark: darkTheme,
  light: lightTheme,
  industrial: industrialTheme,
  gamepad: createRoboVizTheme({
    name: 'gamepad-theme',
    colors: {
      primary: '#00ff88',
      secondary: '#ff6b9d',
      success: '#00ff88',
      warning: '#ffaa00',
      error: '#ff4444',
    },
    backgrounds: {
      panel: '#0a0f14',
      surface: '#141c24',
    },
  }),
};

// Panel display modes for GamepadStatusPanel
type PanelMode = 'minimal' | 'compact' | 'expanded';

// Initial joint angles
const INITIAL_JOINTS = [0, -0.5, 0.5, 0, 0.5, 0];

// ============================================================================
// Gamepad Ghost Controller Component
// ============================================================================

interface GamepadGhostControllerProps {
  enabled: boolean;
  baseSpeed: number;
  autoApply: boolean;
  mode: 'joint' | 'cartesian';
}

/**
 * Component that applies gamepad input to the unified ghost
 * Uses useFrame for smooth updates
 */
function GamepadGhostController({
  enabled,
  baseSpeed,
  autoApply,
  mode,
}: GamepadGhostControllerProps) {
  const ghost = useProcessGhost();
  const robot = useProcessRobot();
  const gamepad = useGamepadInput({ enabled });

  // Apply gamepad input to ghost on every frame
  useFrame((_, delta) => {
    if (!enabled || !gamepad.isConnected || !gamepad.isAnalogActive) {
      return;
    }

    if (mode === 'joint') {
      // Get current joints (from ghost if active, else from robot)
      const currentJoints = ghost.jointAngles ?? robot.jointAngles;
      const jointInputs = gamepad.getJointInputs();

      // Calculate new joint angles
      const newJoints = currentJoints.map((joint, i) => {
        if (i >= 6) return joint; // Only handle 6 joints
        const input = jointInputs[i];
        if (Math.abs(input) < 0.01) return joint;

        // Apply input with speed multiplier
        const speed = baseSpeed * gamepad.speedMultiplier * DEG_TO_RAD; // Convert to rad/s
        return joint + input * speed * delta;
      });

      // Update ghost with new joints
      ghost.setTargetJoints(newJoints);

      // If autoApply, also update the robot
      if (autoApply) {
        robot.setJointAngles(newJoints);
      }
    } else {
      // Cartesian mode - for now, still use joint deltas
      // TODO: Integrate with IK when Cartesian mode is fully supported
      const currentJoints = ghost.jointAngles ?? robot.jointAngles;
      const jointInputs = gamepad.getJointInputs();

      const newJoints = currentJoints.map((joint, i) => {
        if (i >= 6) return joint;
        const input = jointInputs[i];
        if (Math.abs(input) < 0.01) return joint;
        const speed = baseSpeed * gamepad.speedMultiplier * DEG_TO_RAD;
        return joint + input * speed * delta;
      });

      ghost.setTargetJoints(newJoints);

      if (autoApply) {
        robot.setJointAngles(newJoints);
      }
    }
  });

  // Return null - this is a controller component, no visual output
  return null;
}

// ============================================================================
// Scene Content Component
// ============================================================================

interface SceneContentProps {
  enableGamepad: boolean;
  baseSpeed: number;
  autoApply: boolean;
  mode: 'joint' | 'cartesian';
}

function SceneContent({
  enableGamepad,
  baseSpeed,
  autoApply,
  mode,
}: SceneContentProps) {
  const ghost = useProcessGhost();

  return (
    <>
      {/* ProcessScene renders the robot and ghost automatically */}
      <ProcessScene
        urdfPath={URDF_PATH}
        showGhost={!autoApply && ghost.jointAngles !== null}
        showTrajectory={false}
      />

      {/* Gamepad ghost controller */}
      <GamepadGhostController
        enabled={enableGamepad}
        baseSpeed={baseSpeed}
        autoApply={autoApply}
        mode={mode}
      />
    </>
  );
}

// ============================================================================
// Inner Component (with context access)
// ============================================================================

interface GamepadDemoInnerProps {
  currentTheme: RoboVizTheme;
}

function GamepadDemoInner({ currentTheme }: GamepadDemoInnerProps) {
  const { addLog } = useAppStore();

  // Get state from unified context
  const state = useRobotProcessState();
  const ghost = useProcessGhost();
  const robot = useProcessRobot();

  // Local state for UI
  const [autoApply, setAutoApply] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('expanded');
  const [showJogPanel, setShowJogPanel] = useState(true);
  const [enableGamepad, setEnableGamepad] = useState(true);
  const [enableAnalogControl, setEnableAnalogControl] = useState(true);
  const [analogBaseSpeed, setAnalogBaseSpeed] = useState(50);

  // Jog mode state (shared with JogControlPanel)
  const [jogState, jogActions] = useRobotJogControl({
    robotId: ROBOT_ID,
    robotName: 'Fanuc LR Mate 200iD/7L',
    jointLimits: JOINT_LIMITS,
    initialJoints: robot.jointAngles,
  });

  // Use gamepad for UI (connection status, etc.)
  const gamepad = useGamepadInput({
    enabled: enableGamepad,
    onDeviceConnect: (device) => {
      addLog('info', `Gamepad connected: ${device.name}`);
    },
    onDeviceDisconnect: (device) => {
      addLog('warning', `Gamepad disconnected: ${device.name}`);
    },
  });

  // Refs for Leva button callbacks
  const ghostRef = useRef(ghost);
  ghostRef.current = ghost;
  const robotRef = useRef(robot);
  robotRef.current = robot;
  const gamepadRef = useRef(gamepad);
  gamepadRef.current = gamepad;

  // Leva controls
  useControls('Gamepad Settings', {
    enableGamepad: {
      value: enableGamepad,
      onChange: setEnableGamepad,
      label: 'Enable Gamepad',
    },
    enableAnalogControl: {
      value: enableAnalogControl,
      onChange: setEnableAnalogControl,
      label: 'Analog Control',
    },
    analogBaseSpeed: {
      value: analogBaseSpeed,
      min: 10,
      max: 200,
      step: 10,
      onChange: setAnalogBaseSpeed,
      label: 'Base Speed',
    },
  });

  useControls('Ghost Mode', {
    autoApply: {
      value: autoApply,
      onChange: setAutoApply,
      label: 'Auto Apply (Direct Control)',
    },
  });

  useControls('Display', {
    panelMode: {
      value: panelMode,
      options: ['minimal', 'compact', 'expanded'] as PanelMode[],
      onChange: (v: PanelMode) => setPanelMode(v),
      label: 'Status Panel Mode',
    },
    showJogPanel: {
      value: showJogPanel,
      onChange: setShowJogPanel,
      label: 'Show Jog Panel',
    },
  });

  // Preset buttons
  useControls('Controller Presets', {
    'Use Xbox': button(() => {
      gamepadRef.current.setMapping(GAMEPAD_PRESETS.xbox);
      addLog('info', 'Applied xbox controller mapping');
    }),
    'Use Playstation': button(() => {
      gamepadRef.current.setMapping(GAMEPAD_PRESETS.playstation);
      addLog('info', 'Applied playstation controller mapping');
    }),
    'Use Nintendo': button(() => {
      gamepadRef.current.setMapping(GAMEPAD_PRESETS.nintendo);
      addLog('info', 'Applied nintendo controller mapping');
    }),
    'Use Generic': button(() => {
      gamepadRef.current.setMapping(GAMEPAD_PRESETS.generic);
      addLog('info', 'Applied generic controller mapping');
    }),
  });

  // Ghost robot actions
  useControls('Ghost Actions', {
    'Apply to Robot': button(() => {
      const joints = ghostRef.current.applyToRobot();
      if (joints) {
        robotRef.current.setJointAngles(joints);
        addLog('info', 'Applied ghost position to real robot');
      }
    }),
    'Reset Ghost': button(() => {
      ghostRef.current.setTargetJoints(robotRef.current.jointAngles);
      addLog('info', 'Reset ghost to match real robot');
    }),
    'Clear Ghost': button(() => {
      ghostRef.current.clear();
      addLog('info', 'Ghost preview cleared');
    }),
  });

  // Connection status info
  const connectionStatus = useMemo(() => {
    if (!enableGamepad) {
      return { text: 'Gamepad disabled', color: '#666' };
    }
    if (gamepad.isConnected) {
      return { text: `Connected: ${gamepad.connectedGamepads.length} gamepad(s)`, color: '#00ff88' };
    }
    return { text: 'No gamepad connected', color: '#ffaa00' };
  }, [enableGamepad, gamepad.isConnected, gamepad.connectedGamepads.length]);

  // Analog activity indicator
  const analogStatus = useMemo(() => {
    if (!gamepad.isAnalogActive || !gamepad.analogInput) {
      return null;
    }
    const { tx, ty, tz, rx, ry, rz } = gamepad.analogInput;
    const maxTranslation = Math.max(Math.abs(tx), Math.abs(ty), Math.abs(tz));
    const maxRotation = Math.max(Math.abs(rx), Math.abs(ry), Math.abs(rz));
    return {
      translation: (maxTranslation * 100).toFixed(0),
      rotation: (maxRotation * 100).toFixed(0),
    };
  }, [gamepad.isAnalogActive, gamepad.analogInput]);

  return (
    <div className="module-content" style={{ display: 'flex', gap: '16px' }}>
      {/* 3D Visualization */}
      <div className="canvas-wrapper" style={{ flex: 2, position: 'relative', minHeight: 500 }}>
        <RoboVizCore
          style={{ width: '100%', height: '100%' }}
          camera={{
            position: { x: 1.5, y: 1.5, z: 1.5 },
            target: { x: 0, y: 0.3, z: 0 },
            fov: 50,
          }}
        >
          <SceneContent
            enableGamepad={enableGamepad && enableAnalogControl}
            baseSpeed={analogBaseSpeed}
            autoApply={autoApply}
            mode={jogState.mode === 'joint' ? 'joint' : 'cartesian'}
          />
        </RoboVizCore>
      </div>

      {/* Right Panel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '750px',
          overflow: 'auto',
        }}
      >
        {/* Connection Status */}
        <div
          style={{
            background: currentTheme.backgrounds.panel,
            borderRadius: currentTheme.borderRadius.lg,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: `1px solid ${currentTheme.borders.default}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: connectionStatus.color,
                boxShadow: gamepad.isConnected ? `0 0 8px ${connectionStatus.color}` : 'none',
              }}
            />
            <span style={{ color: connectionStatus.color, fontSize: 12, fontWeight: 'bold' }}>
              {connectionStatus.text}
            </span>
            {autoApply ? (
              <span
                style={{
                  marginLeft: 8,
                  padding: '2px 6px',
                  fontSize: 9,
                  background: '#ffaa0030',
                  color: '#ffaa00',
                  borderRadius: 4,
                  fontWeight: 'bold',
                }}
              >
                DIRECT CONTROL
              </span>
            ) : (
              <span
                style={{
                  marginLeft: 8,
                  padding: '2px 6px',
                  fontSize: 9,
                  background: '#00ff8830',
                  color: '#00ff88',
                  borderRadius: 4,
                  fontWeight: 'bold',
                }}
              >
                PREVIEW MODE
              </span>
            )}
            {ghost.inputMode === 'joints' && (
              <span
                style={{
                  marginLeft: 4,
                  padding: '2px 6px',
                  fontSize: 9,
                  background: '#6688ff30',
                  color: '#88aaff',
                  borderRadius: 4,
                  fontWeight: 'bold',
                }}
              >
                JOINT
              </span>
            )}
          </div>
          {analogStatus && (
            <div style={{ fontSize: 10, color: currentTheme.text.secondary }}>
              T:{analogStatus.translation}% R:{analogStatus.rotation}%
            </div>
          )}
        </div>

        {/* Gamepad Status Panel */}
        <RoboVizThemeProvider theme={currentTheme}>
          <GamepadStatusPanel
            isConnected={gamepad.isConnected}
            gamepadState={gamepad.gamepadState}
            analogInput={gamepad.analogInput}
            mode={panelMode}
            showHints={panelMode === 'expanded'}
            showSticks={panelMode !== 'minimal'}
          />
        </RoboVizThemeProvider>

        {/* JogControlPanel */}
        {showJogPanel && (
          <RoboVizThemeProvider theme={currentTheme}>
            <JogControlPanel
              robotId={ROBOT_ID}
              robotName="Fanuc LR Mate 200iD/7L"
              jointLimits={JOINT_LIMITS}
              compact={true}
              enableShortcuts={false}
              externalState={jogState}
              externalActions={jogActions}
            />
          </RoboVizThemeProvider>
        )}

        {/* Instructions */}
        <div
          style={{
            background: currentTheme.backgrounds.surface,
            borderRadius: currentTheme.borderRadius.lg,
            padding: '12px',
            border: `1px solid ${currentTheme.borders.subtle}`,
          }}
        >
          <div style={{ color: currentTheme.text.secondary, fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>
            How to Use
          </div>
          <div style={{ color: currentTheme.text.label, fontSize: 10, lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong style={{ color: currentTheme.colors.primary }}>1. Connect a gamepad</strong>
              <br />Press any button to activate the Gamepad API.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong style={{ color: currentTheme.colors.primary }}>2. Preview Mode (default)</strong>
              <br />Gamepad controls the ghost (green preview).
              <br />Click "Apply to Robot" to confirm position.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: currentTheme.colors.primary }}>3. Direct Control Mode</strong>
              <br />Enable "Auto Apply" to control robot directly.
              <br />Ghost preview is hidden in this mode.
            </p>
          </div>
        </div>

        {/* Gamepad Control Hints */}
        <div
          style={{
            background: currentTheme.backgrounds.panel,
            borderRadius: currentTheme.borderRadius.lg,
            padding: '12px',
            border: `1px solid ${currentTheme.borders.default}`,
          }}
        >
          <div style={{ color: currentTheme.text.secondary, fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>
            Gamepad Mapping ({jogState.mode === 'joint' ? 'Joint Mode' : 'Cartesian Mode'})
          </div>
          <div style={{ color: currentTheme.text.label, fontSize: 10, lineHeight: 1.8 }}>
            {jogState.mode === 'joint' ? (
              <>
                <div><strong>Left Stick X:</strong> J1 | <strong>Left Stick Y:</strong> J2</div>
                <div><strong>Right Stick X:</strong> J3 | <strong>Right Stick Y:</strong> J4</div>
                <div><strong>RT/LT Triggers:</strong> J5 (+/-)</div>
                <div><strong>LB + Right Stick Y:</strong> J6</div>
                <div><strong>RB:</strong> Speed boost | <strong>R3:</strong> Precision mode</div>
              </>
            ) : (
              <>
                <div><strong>Left Stick:</strong> X/Y Translation</div>
                <div><strong>Right Stick:</strong> RX/RY Rotation</div>
                <div><strong>RT/LT:</strong> Z Translation (+/-)</div>
                <div><strong>LB + Right Stick X:</strong> RZ Rotation</div>
                <div><strong>RB:</strong> Speed boost | <strong>R3:</strong> Precision mode</div>
              </>
            )}
          </div>
        </div>

        {/* Connected Gamepads List */}
        {gamepad.connectedGamepads.length > 0 && (
          <div
            style={{
              background: currentTheme.backgrounds.panel,
              borderRadius: currentTheme.borderRadius.lg,
              padding: '12px',
              border: `1px solid ${currentTheme.borders.default}`,
            }}
          >
            <div style={{ color: currentTheme.text.secondary, fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>
              Connected Devices ({gamepad.connectedGamepads.length})
            </div>
            {gamepad.connectedGamepads.map((device, index) => (
              <div
                key={device.id}
                style={{
                  fontSize: 10,
                  padding: '6px 8px',
                  marginBottom: 4,
                  background: currentTheme.backgrounds.surface,
                  borderRadius: currentTheme.borderRadius.sm,
                  color: currentTheme.text.label,
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
                  {device.name}
                </div>
                <div style={{ color: currentTheme.text.secondary, fontSize: 9 }}>
                  Type: {device.type} | Index: {index}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component with Providers
// ============================================================================

export function GamepadControlModule() {
  // Theme state
  const [selectedTheme, setSelectedTheme] = useState<string>('gamepad');
  const currentTheme = THEME_PRESETS[selectedTheme];

  useControls('Display', {
    theme: {
      value: selectedTheme,
      options: Object.keys(THEME_PRESETS),
      onChange: setSelectedTheme,
      label: 'Theme',
    },
  });

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Gamepad Control Demo</h2>
        <p>Connect a gamepad/controller to control the robot with analog sticks and buttons.</p>
        <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
          Using unified ghost architecture (ProcessProvider + useProcessGhost)
        </p>
      </div>

      <ProcessProvider>
        <RobotProcessProvider
          urdfPath={URDF_PATH}
          robotId={ROBOT_ID}
          initialJoints={INITIAL_JOINTS}
          enableGhost={true}
        >
          <GamepadDemoInner currentTheme={currentTheme} />
        </RobotProcessProvider>
      </ProcessProvider>
    </div>
  );
}
