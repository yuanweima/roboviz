/**
 * Trajx-WASM Integration Demo Module
 *
 * Tests the trajx-wasm kinematics library integration:
 * - WASM initialization
 * - Forward Kinematics (FK)
 * - Inverse Kinematics (IK) - with analytical IK for supported robots
 * - Tool API - creating tools, attaching to robot, FK with TCP
 * - Industrial Jog Control with bidirectional sync
 *
 * IMPORTANT: This module uses hybrid kinematics mode.
 * - URDF is used for joint names, limits, and visualization
 * - DH database is used for analytical IK when the robot is recognized
 * - For Fanuc LR Mate 200iD/7L, analytical IK provides up to 8 solutions
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useControls, button, folder } from 'leva';
// Rendering components and theme system (no kinematics dependency)
import {
  RoboVizCore,
  Robot,
  RoboVizThemeProvider,
  darkTheme,
  lightTheme,
  industrialTheme,
  createRoboVizTheme,
  type RoboVizTheme,
  type Pose,
} from '@aspect/roboviz-core/rendering';
// Kinematics hooks and solver provider
import {
  useTrajx,
  useHybridSolver,
  getKinematicsManager,
  SolverProvider,
  WasmSolverProvider,
  type TrajxTool,
} from '@aspect/roboviz-core/kinematics';
// JogControlPanel uses kinematics internally, from main entry
import { JogControlPanel } from '@aspect/roboviz-core';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';
const ROBOT_ID = 'trajx-test-robot';

// Theme presets for testing
const THEME_PRESETS: Record<string, RoboVizTheme> = {
  dark: darkTheme,
  light: lightTheme,
  industrial: industrialTheme,
  // Custom theme example
  custom: createRoboVizTheme({
    name: 'custom-cyan',
    colors: {
      primary: '#00d4ff',
      secondary: '#ff6b9d',
      success: '#00ff9f',
      warning: '#ffd93d',
      error: '#ff6b6b',
    },
    backgrounds: {
      panel: '#0d1117',
      surface: '#161b22',
    },
  }),
};

// Test poses for IK
const TEST_POSES: Record<string, Pose> = {
  front: {
    position: { x: 0.4, y: 0.3, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  },
  side: {
    position: { x: 0, y: 0.35, z: 0.4 },
    orientation: { x: 0, y: 0.707, z: 0, w: 0.707 },
  },
  high: {
    position: { x: 0.25, y: 0.5, z: 0.25 },
    orientation: { x: 0.5, y: 0, z: 0, w: 0.866 },
  },
};

interface TestResult {
  type: 'fk' | 'ik' | 'fk-tcp' | 'tool' | 'info';
  success: boolean;
  message: string;
  data?: unknown;
  time: number;
}

// Preset tool configurations
const TOOL_PRESETS = {
  'welding-torch': {
    name: 'welding-torch',
    position: [0, 0, 0.15] as [number, number, number],
    description: 'Welding torch with 150mm extension',
  },
  'gripper': {
    name: 'gripper',
    position: [0, 0, 0.08] as [number, number, number],
    description: 'Parallel gripper with 80mm offset',
  },
  'camera': {
    name: 'camera',
    position: [0, 0, 0.05] as [number, number, number],
    description: 'Inspection camera with 50mm offset',
  },
};

export function TrajxWasmModule() {
  const { addLog } = useAppStore();
  const mountedRef = useRef(true);

  // Robot state - synchronized between JogControlPanel and visualization
  // Start at a non-singular configuration to avoid SINGULAR warning
  // Zero position is typically near a singularity for most robots
  const [currentJoints, setCurrentJoints] = useState<number[]>([0, -0.5, 0.5, 0, 0.5, 0]);
  const [selectedPose, setSelectedPose] = useState<string>('front');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showTestPanel, setShowTestPanel] = useState(true);

  // Theme state - for testing theme system
  const [selectedTheme, setSelectedTheme] = useState<string>('dark');
  const currentTheme = THEME_PRESETS[selectedTheme];

  // Tool state
  const [activeTool, setActiveTool] = useState<TrajxTool | null>(null);
  const [selectedToolPreset, setSelectedToolPreset] = useState<string>('welding-torch');
  const [toolAttached, setToolAttached] = useState(false);

  // URDF content state - fetched from the URDF path
  const [urdfContent, setUrdfContent] = useState<string | null>(null);
  const [urdfLoading, setUrdfLoading] = useState(true);
  const [urdfError, setUrdfError] = useState<Error | null>(null);

  // Initialize trajx-wasm
  const { ready: wasmReady, loading: wasmLoading, error: wasmError } = useTrajx();

  // Fetch URDF content
  useEffect(() => {
    setUrdfLoading(true);
    setUrdfError(null);

    fetch(URDF_PATH)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch URDF: ${response.status}`);
        }
        return response.text();
      })
      .then(content => {
        if (mountedRef.current) {
          setUrdfContent(content);
          setUrdfLoading(false);
          addLog('info', `URDF loaded: ${content.length} bytes`);
        }
      })
      .catch(err => {
        if (mountedRef.current) {
          setUrdfError(err);
          setUrdfLoading(false);
          addLog('error', `Failed to load URDF: ${err.message}`);
        }
      });
  }, [addLog]);

  // Create hybrid solver from URDF content
  // Uses URDF for joint info + DH database for analytical IK when available
  const {
    ready: solverReady,
    error: solverError,
    jointNames,
    jointLimits,
    hasAnalyticalIk,
    dhRobotName,
    fk,
    fkTcp,
    ik,
    ikAll,
    attachTool,
    detachTool,
    hasTool,
  } = useHybridSolver({
    robotId: ROBOT_ID,
    urdfContent: wasmReady ? urdfContent : null,
  });

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Log solver status
  useEffect(() => {
    if (solverReady && jointNames.length > 0) {
      addLog('info', `Hybrid Solver ready: ${jointNames.length} DOF`);
      addLog('info', `Joints: ${jointNames.join(', ')}`);
      if (jointLimits) {
        addLog('info', `Joint limits extracted from URDF`);
      }
      if (hasAnalyticalIk) {
        addLog('info', `✓ Analytical IK enabled via DH database (${dhRobotName})`);
      } else {
        addLog('warning', `Numerical IK only - no DH database match found`);
      }
    } else if (solverError) {
      addLog('error', `Solver error: ${solverError.message}`);
    }
  }, [solverReady, solverError, jointNames, jointLimits, hasAnalyticalIk, dhRobotName, addLog]);

  // Add test result
  const addResult = useCallback((result: TestResult) => {
    if (mountedRef.current) {
      setTestResults(prev => [result, ...prev].slice(0, 10));
    }
  }, []);

  // Handle joints change from JogControlPanel
  const handleJointsChange = useCallback((joints: number[]) => {
    setCurrentJoints(joints);
  }, []);

  // Handle pose change from JogControlPanel (for logging)
  const handlePoseChange = useCallback((_pose: Pose) => {
    // Optional: log pose changes
  }, []);

  // Test FK
  const testFK = useCallback(() => {
    if (!solverReady || !fk) {
      addLog('warning', 'Solver not ready');
      return;
    }

    const startTime = performance.now();
    try {
      const result = fk(currentJoints);
      const time = performance.now() - startTime;

      if (result) {
        addResult({
          type: 'fk',
          success: true,
          message: `FK: pos=(${result.pose.position.x.toFixed(3)}, ${result.pose.position.y.toFixed(3)}, ${result.pose.position.z.toFixed(3)})`,
          data: result.pose,
          time,
        });
        addLog('info', `FK computed in ${time.toFixed(2)}ms`);
      } else {
        addResult({ type: 'fk', success: false, message: 'FK failed', time });
      }
    } catch (e) {
      const time = performance.now() - startTime;
      addResult({ type: 'fk', success: false, message: `FK error: ${e}`, time });
    }
  }, [solverReady, fk, currentJoints, addLog, addResult]);

  // Test IK (all solutions - uses analytical IK if available)
  const testIK = useCallback(() => {
    if (!solverReady || !ikAll) {
      addLog('warning', 'Solver not ready');
      return;
    }

    const target = TEST_POSES[selectedPose];
    const startTime = performance.now();

    try {
      const result = ikAll(target, currentJoints);
      const time = performance.now() - startTime;

      if (result && result.success && result.solutionCount > 0) {
        const ikType = result.isAnalytical ? 'Analytical' : 'Numerical';
        addResult({
          type: 'ik',
          success: true,
          message: `${ikType} IK: found ${result.solutionCount} solution(s), error=${((result.positionErrors[0] || 0) * 1000).toFixed(3)}mm`,
          data: result.solutions,
          time,
        });
        addLog('info', `${ikType} IK solved in ${time.toFixed(2)}ms - ${result.solutionCount} solution(s)`);
      } else {
        addResult({
          type: 'ik',
          success: false,
          message: `IK failed: ${result?.errorMessage || 'no solution'}`,
          time,
        });
      }
    } catch (e) {
      const time = performance.now() - startTime;
      addResult({ type: 'ik', success: false, message: `IK error: ${e}`, time });
    }
  }, [solverReady, ikAll, selectedPose, currentJoints, addLog, addResult]);

  // Create and attach tool
  const handleCreateTool = useCallback(() => {
    if (!wasmReady) {
      addLog('warning', 'WASM not ready');
      return;
    }

    const startTime = performance.now();
    try {
      const manager = getKinematicsManager();
      const preset = TOOL_PRESETS[selectedToolPreset as keyof typeof TOOL_PRESETS];

      // Create a simple tool with position offset
      const tool = manager.createSimplePositionTool(
        preset.name,
        preset.position[0],
        preset.position[1],
        preset.position[2]
      );

      const time = performance.now() - startTime;
      setActiveTool(tool);

      addResult({
        type: 'tool',
        success: true,
        message: `Created tool "${preset.name}" - ${preset.description}`,
        data: { name: tool.name, toolLength: tool.toolLength, tcpCount: tool.tcpCount },
        time,
      });
      addLog('info', `Tool "${preset.name}" created with length ${(tool.toolLength * 1000).toFixed(1)}mm`);
    } catch (e) {
      const time = performance.now() - startTime;
      addResult({ type: 'tool', success: false, message: `Tool creation error: ${e}`, time });
      addLog('error', `Failed to create tool: ${e}`);
    }
  }, [wasmReady, selectedToolPreset, addLog, addResult]);

  // Attach tool to robot
  const handleAttachTool = useCallback(() => {
    if (!solverReady || !attachTool || !activeTool) {
      addLog('warning', 'Solver not ready or no tool created');
      return;
    }

    const startTime = performance.now();
    try {
      // Get the active TCP offset from the tool
      const tcpOffset = activeTool.getActiveTcpOffset();
      const pos = tcpOffset.getPositionArray();
      const ori = tcpOffset.getOrientationArray();

      // Attach to robot using pose
      attachTool({
        position: { x: pos[0], y: pos[1], z: pos[2] },
        orientation: { x: ori[0], y: ori[1], z: ori[2], w: ori[3] },
      });

      const time = performance.now() - startTime;
      setToolAttached(true);

      addResult({
        type: 'tool',
        success: true,
        message: `Attached tool "${activeTool.name}" to robot`,
        data: { position: pos, orientation: ori },
        time,
      });
      addLog('info', `Tool "${activeTool.name}" attached - FK TCP now includes tool offset`);
    } catch (e) {
      const time = performance.now() - startTime;
      addResult({ type: 'tool', success: false, message: `Attach error: ${e}`, time });
      addLog('error', `Failed to attach tool: ${e}`);
    }
  }, [solverReady, attachTool, activeTool, addLog, addResult]);

  // Detach tool from robot
  const handleDetachTool = useCallback(() => {
    if (!solverReady || !detachTool) {
      addLog('warning', 'Solver not ready');
      return;
    }

    const startTime = performance.now();
    try {
      detachTool();
      const time = performance.now() - startTime;
      setToolAttached(false);

      addResult({
        type: 'tool',
        success: true,
        message: 'Tool detached from robot',
        time,
      });
      addLog('info', 'Tool detached - FK now returns flange pose');
    } catch (e) {
      const time = performance.now() - startTime;
      addResult({ type: 'tool', success: false, message: `Detach error: ${e}`, time });
    }
  }, [solverReady, detachTool, addLog, addResult]);

  // Test FK with TCP (tool center point)
  const testFKTcp = useCallback(() => {
    if (!solverReady || !fkTcp) {
      addLog('warning', 'Solver not ready');
      return;
    }

    const startTime = performance.now();
    try {
      const result = fkTcp(currentJoints);
      const time = performance.now() - startTime;

      if (result) {
        const hasToolNow = hasTool?.() ?? false;
        addResult({
          type: 'fk-tcp',
          success: true,
          message: `FK-TCP: pos=(${result.pose.position.x.toFixed(3)}, ${result.pose.position.y.toFixed(3)}, ${result.pose.position.z.toFixed(3)}) [tool: ${hasToolNow ? 'yes' : 'no'}]`,
          data: { pose: result.pose, toolApplied: result.toolApplied },
          time,
        });
        addLog('info', `FK-TCP computed in ${time.toFixed(2)}ms (tool applied: ${result.toolApplied})`);
      } else {
        addResult({ type: 'fk-tcp', success: false, message: 'FK-TCP failed', time });
      }
    } catch (e) {
      const time = performance.now() - startTime;
      addResult({ type: 'fk-tcp', success: false, message: `FK-TCP error: ${e}`, time });
    }
  }, [solverReady, fkTcp, hasTool, currentJoints, addLog, addResult]);

  // Test controls
  useControls('Kinematics Tests', {
    targetPose: { value: selectedPose, options: Object.keys(TEST_POSES), onChange: setSelectedPose },
    'Run FK': button(() => testFK()),
    'Run FK-TCP': button(() => testFKTcp()),
    'Run IK': button(() => testIK()),
  }, [testFK, testFKTcp, testIK, selectedPose]);

  // Tool controls
  useControls('Tool API', {
    toolPreset: {
      value: selectedToolPreset,
      options: Object.keys(TOOL_PRESETS),
      onChange: setSelectedToolPreset,
    },
    'Create Tool': button(() => handleCreateTool()),
    'Attach Tool': button(() => handleAttachTool(), { disabled: !activeTool || toolAttached }),
    'Detach Tool': button(() => handleDetachTool(), { disabled: !toolAttached }),
    toolStatus: {
      value: activeTool
        ? `${activeTool.name} (${(activeTool.toolLength * 1000).toFixed(0)}mm) ${toolAttached ? '[ATTACHED]' : ''}`
        : 'No tool created',
      editable: false,
    },
  }, [selectedToolPreset, handleCreateTool, handleAttachTool, handleDetachTool, activeTool, toolAttached]);

  // View controls
  useControls('View', {
    showTestPanel: { value: showTestPanel, onChange: setShowTestPanel },
    theme: {
      value: selectedTheme,
      options: Object.keys(THEME_PRESETS),
      onChange: (v: string) => {
        setSelectedTheme(v);
        addLog('info', `Theme changed to: ${v}`);
      },
    },
  }, [showTestPanel, selectedTheme, addLog]);

  // Status display
  const status = useMemo(() => {
    if (urdfLoading) return { text: 'Loading URDF...', color: '#ffaa00' };
    if (urdfError) return { text: `URDF Error: ${urdfError.message}`, color: '#ff4444' };
    if (wasmLoading) return { text: 'Loading WASM...', color: '#ffaa00' };
    if (wasmError) return { text: `WASM Error: ${wasmError.message}`, color: '#ff4444' };
    if (!wasmReady) return { text: 'WASM not ready', color: '#ffaa00' };
    if (solverError) return { text: `Solver error: ${solverError.message}`, color: '#ff4444' };
    if (!solverReady) return { text: 'Creating hybrid solver...', color: '#ffaa00' };
    const ikType = hasAnalyticalIk ? 'Analytical IK' : 'Numerical IK';
    return { text: `Ready (${jointNames.length} DOF, ${ikType})`, color: '#00ff88' };
  }, [urdfLoading, urdfError, wasmLoading, wasmError, wasmReady, solverError, solverReady, jointNames, hasAnalyticalIk]);

  // Get joint limits from URDF or use defaults
  const effectiveJointLimits = useMemo(() => {
    if (jointLimits && jointLimits.lower.length > 0) {
      return jointLimits;
    }
    // Fallback defaults
    return {
      lower: [-2.96, -1.74, -2.35, -3.49, -2.09, -6.28],
      upper: [2.96, 2.26, 4.36, 3.49, 2.09, 6.28],
    };
  }, [jointLimits]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Trajx-WASM Kinematics + Tool API</h2>
        <p>Hybrid kinematics (URDF + DH) with Tool API for TCP management.</p>
      </div>

      <div className="module-content" style={{ display: 'flex', gap: '16px' }}>
        {/* SolverProvider + WasmSolverProvider inject IK/FK solver via context */}
        <SolverProvider>
          <WasmSolverProvider robotId={ROBOT_ID} urdfContent={urdfContent}>
        {/* Visualization */}
        <div className="canvas-wrapper" style={{ flex: 2 }}>
          <RoboVizCore
            config={{
              background: '#1a1a2e',
              grid: { enabled: true, size: 2, divisions: 20, color: '#404060' },
            }}
            camera={{ position: { x: 1.5, y: 1.2, z: 1.5 } }}
          >
            {/* Current robot */}
            <Robot
              id={ROBOT_ID}
              urdfPath={URDF_PATH}
              jointAngles={currentJoints}
            />

            {/* Target pose indicator (from preset) */}
            <mesh
              position={[
                TEST_POSES[selectedPose].position.x,
                TEST_POSES[selectedPose].position.y,
                TEST_POSES[selectedPose].position.z,
              ]}
            >
              <sphereGeometry args={[0.015, 16, 16]} />
              <meshBasicMaterial color="#ff6b6b" transparent opacity={0.6} />
            </mesh>
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
          {/* Status */}
          <div
            style={{
              background: currentTheme.backgrounds.panel,
              borderRadius: currentTheme.borderRadius.lg,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: status.color,
              }}
            />
            <span style={{ color: status.color, fontSize: 12, fontWeight: 'bold' }}>
              {status.text}
            </span>
          </div>

          {/* Theme Info Panel */}
          <div
            style={{
              background: currentTheme.backgrounds.panel,
              borderRadius: currentTheme.borderRadius.lg,
              padding: '12px',
              border: `1px solid ${currentTheme.borders.default}`,
            }}
          >
            <div style={{ color: currentTheme.text.secondary, fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>
              Theme: {currentTheme.name}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(currentTheme.colors).map(([name, color]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: color,
                      border: `1px solid ${currentTheme.borders.default}`,
                    }}
                  />
                  <span style={{ color: currentTheme.text.label, fontSize: 9 }}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hybrid Solver Info Panel */}
          {solverReady && (
            <div
              style={{
                background: '#1a1a2e',
                borderRadius: 8,
                padding: '12px',
              }}
            >
              <div style={{ color: '#888', fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>
                Hybrid Kinematics
              </div>
              <div style={{ color: '#4ecdc4', fontSize: 12, marginBottom: 4 }}>
                Joints: {jointNames.join(', ')}
              </div>
              <div style={{
                color: hasAnalyticalIk ? '#00ff88' : '#ffaa00',
                fontSize: 11,
                marginBottom: 4,
                fontWeight: 'bold',
              }}>
                {hasAnalyticalIk
                  ? `✓ Analytical IK (DH: ${dhRobotName})`
                  : '○ Numerical IK only'}
              </div>
              <div style={{ color: '#666', fontSize: 10 }}>
                {hasAnalyticalIk
                  ? 'URDF for visualization + DH database for analytical IK (up to 8 solutions).'
                  : 'URDF-based kinematics. Add robot to URDF_TO_DH_MAPPING for analytical IK.'}
              </div>
            </div>
          )}

          {/* Tool API Info Panel */}
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: 8,
              padding: '12px',
            }}
          >
            <div style={{ color: '#888', fontSize: 10, marginBottom: 8, textTransform: 'uppercase' }}>
              Tool API (New)
            </div>
            {activeTool ? (
              <>
                <div style={{ color: '#ff6b9d', fontSize: 12, marginBottom: 4, fontWeight: 'bold' }}>
                  {activeTool.name}
                </div>
                <div style={{ color: '#4ecdc4', fontSize: 11, marginBottom: 4 }}>
                  Length: {(activeTool.toolLength * 1000).toFixed(1)}mm | TCPs: {activeTool.tcpCount}
                </div>
                <div style={{
                  color: toolAttached ? '#00ff88' : '#ffaa00',
                  fontSize: 11,
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}>
                  {toolAttached ? '✓ Attached to robot' : '○ Not attached'}
                </div>
                <div style={{ color: '#666', fontSize: 10 }}>
                  {toolAttached
                    ? 'FK-TCP returns TCP pose (includes tool offset)'
                    : 'Use Leva panel → Tool API → Attach Tool'}
                </div>
              </>
            ) : (
              <>
                <div style={{ color: '#666', fontSize: 11 }}>
                  No tool created
                </div>
                <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
                  Use Leva panel → Tool API → Create Tool
                </div>
              </>
            )}
          </div>

          {/* Jog Control Panel - uses URDF-based solver via robotId */}
          {/* Wrapped in ThemeProvider for theme testing */}
          {solverReady && urdfContent && (
            <RoboVizThemeProvider theme={currentTheme}>
              <JogControlPanel
                robotId={ROBOT_ID}
                robotName={ROBOT_ID} // Not used for DH lookup anymore
                initialJoints={currentJoints}
                jointLimits={effectiveJointLimits}
                jointNames={jointNames.length > 0 ? jointNames : undefined}
                numJoints={jointNames.length || 6}
                onJointsChange={handleJointsChange}
                onPoseChange={handlePoseChange}
              />
            </RoboVizThemeProvider>
          )}

          {/* Test Results */}
          {showTestPanel && (
            <div
              style={{
                background: '#1a1a2e',
                borderRadius: 8,
                padding: '12px',
                flex: 1,
                overflow: 'auto',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', color: '#888', fontSize: 11 }}>TEST RESULTS</h4>
              <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>
                Use Leva panel (IK Tests) to run FK/IK tests
              </div>
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                {testResults.length === 0 ? (
                  <div style={{ color: '#666', fontSize: 11 }}>No tests run yet.</div>
                ) : (
                  testResults.map((result, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 8px',
                        marginBottom: '4px',
                        background: '#252540',
                        borderRadius: 4,
                        borderLeft: `3px solid ${result.success ? '#00ff88' : '#ff4444'}`,
                        fontSize: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: result.success ? '#00ff88' : '#ff4444', fontWeight: 'bold' }}>
                          [{result.type.toUpperCase()}] {result.time.toFixed(1)}ms
                        </span>
                      </div>
                      <div style={{ color: '#aaa', marginTop: 2 }}>{result.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
          </WasmSolverProvider>
        </SolverProvider>
      </div>
    </div>
  );
}
