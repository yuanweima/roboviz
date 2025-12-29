/**
 * GPU Motion Planning Scene - Simplified Version
 *
 * 简化的运动规划演示场景
 * - 使用 useTrajx 初始化 WASM
 * - 使用 useHybridSolver 进行 IK 计算
 * - 工作点拖动时自动计算 IK 并显示 ghost robot
 *
 * Z-up 坐标系: X=forward, Y=left, Z=up
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { RoboViz } from '@aspect/roboviz-react';
import { TransformControls, Line } from '@react-three/drei';
import {
  Robot,
  GhostRobot,
  useTrajx,
  useHybridSolver,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';

// ============================================================================
// Constants
// ============================================================================

const THEME = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#a855f7',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#0f0f1a',
  surface: '#1a1a2e',
  panel: '#252540',
  text: '#e5e7eb',
  textSecondary: '#9ca3af',
};

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';
const ROBOT_ID = 'planning-robot';

// ============================================================================
// Types
// ============================================================================

interface CollisionObject {
  id: string;
  name: string;
  type: 'box' | 'sphere' | 'cylinder';
  position: [number, number, number];
  color: string;
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
}

interface Workpoint {
  id: string;
  name: string;
  type: 'start' | 'via' | 'goal';
  position: [number, number, number];
  order: number;
}

// ============================================================================
// IK Helper - Tool pointing down orientation (for Z-up scene)
// ============================================================================

// Quaternion for tool pointing down (-Z direction in world frame)
// This is 180° rotation around X axis: q = (1, 0, 0, 0) normalized
// Or equivalently, 180° around Y: q = (0, 1, 0, 0)
// For Fanuc robots, we use a 90° rotation around Y which points tool forward
const TOOL_FORWARD_QUATERNION = { x: 0, y: 0.707, z: 0, w: 0.707 };

// Alternative: tool pointing straight down
const TOOL_DOWN_QUATERNION = { x: 0.707, y: 0, z: 0, w: 0.707 };

// ============================================================================
// Initial Data (Z-up coordinates)
// ============================================================================

const INITIAL_OBJECTS: CollisionObject[] = [
  {
    id: 'table-1',
    name: 'Work Table',
    type: 'box',
    position: [0.5, 0, 0.01],
    color: '#555555',
    width: 0.6,
    height: 0.8,
    depth: 0.02,
  },
  {
    id: 'pillar-1',
    name: 'Pillar 1',
    type: 'cylinder',
    position: [0.3, 0.3, 0.15],
    color: '#666666',
    radius: 0.05,
    height: 0.3,
  },
  {
    id: 'workpiece-1',
    name: 'Workpiece',
    type: 'box',
    position: [0.4, 0.15, 0.07],
    color: '#888888',
    width: 0.1,
    height: 0.1,
    depth: 0.1,
  },
];

// Workpoints within robot's reachable workspace (LR Mate 200iD/7L has ~0.7m reach)
const INITIAL_WORKPOINTS: Workpoint[] = [
  { id: 'wp-start', name: 'Start', type: 'start', position: [0.35, 0.15, 0.3], order: 0 },
  { id: 'wp-via', name: 'Via', type: 'via', position: [0.4, 0, 0.35], order: 1 },
  { id: 'wp-goal', name: 'Goal', type: 'goal', position: [0.35, -0.15, 0.25], order: 2 },
];

const WORKPOINT_COLORS = {
  start: '#22c55e',
  via: '#3b82f6',
  goal: '#ef4444',
};

// ============================================================================
// Simple Visual Components
// ============================================================================

function CollisionObjectMesh({ object, color }: { object: CollisionObject; color: string }) {
  if (object.type === 'box') {
    return (
      <mesh>
        <boxGeometry args={[object.width!, object.height!, object.depth!]} />
        <meshStandardMaterial color={color} transparent opacity={0.7} />
      </mesh>
    );
  }
  if (object.type === 'sphere') {
    return (
      <mesh>
        <sphereGeometry args={[object.radius!, 32, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.7} />
      </mesh>
    );
  }
  if (object.type === 'cylinder') {
    return (
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[object.radius!, object.radius!, object.height!, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.7} />
      </mesh>
    );
  }
  return null;
}

function CoordinateAxes({ size = 0.1 }: { size?: number }) {
  return (
    <group>
      <Line points={[[0, 0, 0], [size, 0, 0]]} color="#ff0000" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, size, 0]]} color="#00ff00" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, size]]} color="#0000ff" lineWidth={2} />
    </group>
  );
}

// ============================================================================
// Draggable Wrapper
// ============================================================================

interface DraggableProps {
  position: [number, number, number];
  onDragEnd: (pos: [number, number, number]) => void;
  onDrag?: (pos: [number, number, number]) => void;
  onClick?: () => void;
  children: React.ReactNode;
}

function Draggable({ position, onDragEnd, onDrag, onClick, children }: DraggableProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const controlsRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const isDraggingRef = useRef(false);

  // Initialize position on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...position);
      setReady(true);
    }
  }, []);

  // Update position from props only when NOT dragging
  useEffect(() => {
    if (groupRef.current && !isDraggingRef.current) {
      groupRef.current.position.set(...position);
    }
  }, [position]);

  // Handle drag events
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (e: { value: boolean }) => {
      isDraggingRef.current = e.value;
      if (!e.value && groupRef.current) {
        // Drag ended - commit position
        onDragEnd(groupRef.current.position.toArray() as [number, number, number]);
      }
    };

    // Real-time position updates during drag
    const handleObjectChange = () => {
      if (isDraggingRef.current && groupRef.current && onDrag) {
        onDrag(groupRef.current.position.toArray() as [number, number, number]);
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);
    controls.addEventListener('objectChange', handleObjectChange);
    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
      controls.removeEventListener('objectChange', handleObjectChange);
    };
  }, [onDragEnd, onDrag]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.();
  }, [onClick]);

  return (
    <>
      <group ref={groupRef} onClick={handleClick}>{children}</group>
      {ready && groupRef.current && (
        <TransformControls ref={controlsRef} object={groupRef.current} mode="translate" size={0.6} />
      )}
    </>
  );
}

// ============================================================================
// Scene Content (inside Canvas)
// ============================================================================

interface SceneContentProps {
  objects: CollisionObject[];
  workpoints: Workpoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdatePosition: (id: string, pos: [number, number, number]) => void;
  onDragPosition?: (id: string, pos: [number, number, number]) => void;
  ghostJoints: number[] | null;
  ghostStatus: 'valid' | 'warning' | 'error';
}

function SceneContent({
  objects,
  workpoints,
  selectedId,
  onSelect,
  onUpdatePosition,
  onDragPosition,
  ghostJoints,
  ghostStatus,
}: SceneContentProps) {
  // Connection line between workpoints
  const connectionPoints = useMemo(() => {
    const sorted = [...workpoints].sort((a, b) => a.order - b.order);
    return sorted.map(wp => new THREE.Vector3(...wp.position));
  }, [workpoints]);

  const handleBackgroundClick = useCallback(() => onSelect(null), [onSelect]);

  return (
    <>
      {/* Robot */}
      <Robot id={ROBOT_ID} urdfPath={URDF_PATH} showAxes={false} />

      {/* Ghost Robot for selected workpoint */}
      {ghostJoints && (
        <GhostRobot
          id="ghost"
          urdfPath={URDF_PATH}
          jointAngles={ghostJoints}
          opacity={0.4}
          status={ghostStatus}
          upAxis="Z"
        />
      )}

      {/* Collision Objects */}
      {objects.map(obj => {
        const isSelected = obj.id === selectedId;
        if (isSelected) {
          return (
            <Draggable
              key={obj.id}
              position={obj.position}
              onDragEnd={pos => onUpdatePosition(obj.id, pos)}
              onClick={() => onSelect(obj.id)}
            >
              <CollisionObjectMesh object={obj} color="#00ff00" />
              <CoordinateAxes size={0.12} />
            </Draggable>
          );
        }
        return (
          <group
            key={obj.id}
            position={obj.position}
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(obj.id); }}
          >
            <CollisionObjectMesh object={obj} color={obj.color} />
          </group>
        );
      })}

      {/* Workpoints */}
      {workpoints.map(wp => {
        const isSelected = wp.id === selectedId;
        const color = isSelected ? '#ffffff' : WORKPOINT_COLORS[wp.type];
        const radius = isSelected ? 0.025 : 0.02;

        if (isSelected) {
          return (
            <Draggable
              key={wp.id}
              position={wp.position}
              onDragEnd={pos => onUpdatePosition(wp.id, pos)}
              onDrag={onDragPosition ? pos => onDragPosition(wp.id, pos) : undefined}
              onClick={() => onSelect(wp.id)}
            >
              <mesh>
                <sphereGeometry args={[radius, 16, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
              </mesh>
              <CoordinateAxes size={0.08} />
            </Draggable>
          );
        }
        return (
          <group
            key={wp.id}
            position={wp.position}
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(wp.id); }}
          >
            <mesh>
              <sphereGeometry args={[radius, 16, 16]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        );
      })}

      {/* Connection line */}
      {connectionPoints.length >= 2 && (
        <Line points={connectionPoints} color="#6366f1" lineWidth={2} dashed dashSize={0.04} gapSize={0.02} />
      )}

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      {/* Ground */}
      <mesh position={[0, 0, 0]} onClick={handleBackgroundClick}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GPUMotionPlanningScene() {
  const { addLog } = useAppStore();

  // State
  const [objects, setObjects] = useState<CollisionObject[]>(INITIAL_OBJECTS);
  const [workpoints, setWorkpoints] = useState<Workpoint[]>(INITIAL_WORKPOINTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ghostJoints, setGhostJoints] = useState<number[] | null>(null);
  const [ghostStatus, setGhostStatus] = useState<'valid' | 'warning' | 'error'>('valid');

  // Temp position during drag (for real-time IK)
  const [dragPosition, setDragPosition] = useState<[number, number, number] | null>(null);

  // URDF content for solver
  const [urdfContent, setUrdfContent] = useState<string | null>(null);

  // Initialize WASM
  const { ready: wasmReady } = useTrajx();

  // Load URDF
  useEffect(() => {
    fetch(URDF_PATH)
      .then(r => r.text())
      .then(content => {
        setUrdfContent(content);
        addLog('info', 'URDF loaded');
      })
      .catch(err => addLog('error', `Failed to load URDF: ${err.message}`));
  }, [addLog]);

  // Create hybrid solver (Z-up coordinate system, no conversion needed)
  const { ready: solverReady, ik, hasAnalyticalIk } = useHybridSolver({
    robotId: ROBOT_ID,
    urdfContent: wasmReady ? urdfContent : null,
    coordinateSystem: 'Z-up',
  });

  // Log solver status
  useEffect(() => {
    if (solverReady) {
      addLog('info', `Solver ready, analytical IK: ${hasAnalyticalIk ? 'yes' : 'no'}`);
    }
  }, [solverReady, hasAnalyticalIk, addLog]);

  // Find selected workpoint
  const selectedWorkpoint = useMemo(() => {
    return workpoints.find(wp => wp.id === selectedId);
  }, [workpoints, selectedId]);

  // Get the effective position for IK (use drag position if available)
  const effectivePosition = useMemo(() => {
    if (dragPosition) return dragPosition;
    if (selectedWorkpoint) return selectedWorkpoint.position;
    return null;
  }, [dragPosition, selectedWorkpoint]);

  // Compute IK when position changes (either from selection or drag)
  useEffect(() => {
    if (!solverReady || !effectivePosition) {
      setGhostJoints(null);
      return;
    }

    // Create target pose for IK
    // Use tool-forward orientation (90° around Y) which is a typical reachable pose
    const pose = {
      position: {
        x: effectivePosition[0],
        y: effectivePosition[1],
        z: effectivePosition[2],
      },
      orientation: TOOL_FORWARD_QUATERNION, // Tool pointing forward (X direction)
    };

    console.log('[GPUMotionPlanningScene] Computing IK for pose:', pose);

    const result = ik(pose);
    console.log('[GPUMotionPlanningScene] IK result:', result);

    if (result && result.success && result.solution) {
      setGhostJoints(result.solution);
      setGhostStatus('valid');
      // Only log on final position (not during drag)
      if (!dragPosition && selectedWorkpoint) {
        addLog('info', `IK solved for ${selectedWorkpoint.name}: [${result.solution.map(j => j.toFixed(2)).join(', ')}]`);
      }
    } else {
      setGhostJoints(null);
      setGhostStatus('error');
      if (!dragPosition && selectedWorkpoint) {
        addLog('warning', `IK failed for ${selectedWorkpoint.name}: ${result?.errorMessage || 'unknown'}`);
      }
    }
  }, [solverReady, effectivePosition, ik, addLog, dragPosition, selectedWorkpoint]);

  // Handle real-time drag for workpoints (IK updates)
  const handleDragPosition = useCallback((id: string, pos: [number, number, number]) => {
    // Only track drag position for workpoints
    if (workpoints.some(w => w.id === id)) {
      setDragPosition(pos);
    }
  }, [workpoints]);

  // Update position handler (drag end)
  const handleUpdatePosition = useCallback((id: string, pos: [number, number, number]) => {
    // Clear drag position
    setDragPosition(null);

    // Check if it's a collision object
    const objIndex = objects.findIndex(o => o.id === id);
    if (objIndex >= 0) {
      setObjects(prev => prev.map(o => o.id === id ? { ...o, position: pos } : o));
      addLog('info', `Updated ${id} position`);
      return;
    }

    // Check if it's a workpoint
    const wpIndex = workpoints.findIndex(w => w.id === id);
    if (wpIndex >= 0) {
      setWorkpoints(prev => prev.map(w => w.id === id ? { ...w, position: pos } : w));
      addLog('info', `Updated ${id} position`);
    }
  }, [objects, workpoints, addLog]);

  // Loading state
  if (!wasmReady) {
    return (
      <div style={{ padding: 20, color: THEME.text }}>
        <h3>Loading WASM kinematics...</h3>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: THEME.background }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary, margin: 0 }}>Motion Planning</h2>
        <p style={{ color: THEME.textSecondary, margin: '4px 0 0', fontSize: 12 }}>
          Click to select, drag to move • IK: {solverReady ? (hasAnalyticalIk ? 'Analytical' : 'Numerical') : 'Loading...'}
        </p>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: 12, padding: 12, minHeight: 0 }}>
        {/* Left panel */}
        <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Selected info */}
          <div style={{ background: THEME.panel, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
              {selectedId ? `Selected: ${selectedId}` : 'Click to select'}
            </div>
            {selectedWorkpoint && ghostJoints && (
              <div style={{ fontSize: 10, color: THEME.textSecondary, marginTop: 4 }}>
                IK Status: {ghostStatus}
              </div>
            )}
          </div>

          {/* Objects list */}
          <div style={{ background: THEME.panel, borderRadius: 8, padding: 12, flex: 1, overflow: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: THEME.textSecondary, marginBottom: 8 }}>
              Collision Objects
            </div>
            {objects.map(obj => (
              <div
                key={obj.id}
                onClick={() => setSelectedId(obj.id)}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderRadius: 4,
                  color: obj.id === selectedId ? THEME.success : THEME.text,
                  background: obj.id === selectedId ? `${THEME.success}20` : 'transparent',
                }}
              >
                {obj.name}
              </div>
            ))}

            <div style={{ fontSize: 11, fontWeight: 600, color: THEME.textSecondary, marginTop: 12, marginBottom: 8 }}>
              Workpoints
            </div>
            {workpoints.map(wp => (
              <div
                key={wp.id}
                onClick={() => setSelectedId(wp.id)}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderRadius: 4,
                  color: wp.id === selectedId ? WORKPOINT_COLORS[wp.type] : THEME.text,
                  background: wp.id === selectedId ? `${WORKPOINT_COLORS[wp.type]}20` : 'transparent',
                }}
              >
                {wp.order + 1}. {wp.name}
              </div>
            ))}
          </div>
        </div>

        {/* 3D View */}
        <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: `1px solid ${THEME.primary}30` }}>
          <RoboViz config={{ scene: { background: THEME.background }, camera: { position: { x: 1, y: 0.8, z: 1 } } }}>
            <SceneContent
              objects={objects}
              workpoints={workpoints}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdatePosition={handleUpdatePosition}
              onDragPosition={handleDragPosition}
              ghostJoints={ghostJoints}
              ghostStatus={ghostStatus}
            />
          </RoboViz>
        </div>
      </div>
    </div>
  );
}

export default GPUMotionPlanningScene;
