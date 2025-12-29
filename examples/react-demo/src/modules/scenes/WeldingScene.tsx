/**
 * Welding Scene - Industrial Manufacturing Demo
 *
 * Optimized using new Process Architecture:
 * - RobotProcessProvider for unified kinematics + tool + ghost
 * - ProcessScene for robot/ghost/trajectory rendering
 * - useProcessPlayback for trajectory control
 * - useProcessGhost for IK preview
 *
 * TCP Debug Mode:
 * - Enable debug mode to manually adjust TCP position and rotation
 * - Final values can be copied back to WELDING_TORCH_METADATA
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { RoboViz, PropertyEditor, type PropertySchema } from '@aspect/roboviz-react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ProcessProvider,
  RobotProcessProvider,
  ProcessScene,
  useProcessPlayback,
  useProcessGhost,
  useRobotProcessState,
  EndEffector,
  Robot,
  registerProcess,
  weldingProcess,
  type PoseTrajectory,
  type WeldingSettings,
  type ProcessDefinition,
  DEFAULT_WELDING_SETTINGS,
  type WeldingMethod,
  // Tools from core library
  WeldingTorch,
  WELDING_TORCH_METADATA,
  computeTcpFromMetadata,
  // History hook for undo/redo
  usePropertyHistory,
  // Rendering system
  RenderPipeline,
  EnvironmentSystem,
  SKYBOX_PRESETS,
  QUALITY_PRESETS,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';
import {
  TcpDebugPanel,
  type TcpDebugState,
  computeTcpFromDebug,
  createDefaultTcpDebug,
} from '../../components/TcpDebugPanel';

// Default TCP debug state from tool metadata
const DEFAULT_TCP_DEBUG = createDefaultTcpDebug(WELDING_TORCH_METADATA);

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// ============================================================================
// Theme
// ============================================================================

const THEME = {
  primary: '#ff6600',
  secondary: '#ff8833',
  accent: '#ffaa00',
  success: '#00ff88',
  warning: '#ffcc00',
  danger: '#ff3333',
  background: '#1a1208',
  surface: '#2a2018',
  panel: '#3a2820',
  text: '#fff',
  textSecondary: '#cc9966',
};

// ============================================================================
// Types
// ============================================================================

interface WeldSeam {
  id: string;
  start: [number, number, number]; // Z-up
  end: [number, number, number];
}

// ============================================================================
// Welding Sparks
// ============================================================================

function WeldingSparks({ position, active }: { position: [number, number, number]; active: boolean }) {
  const particlesRef = React.useRef<THREE.Points>(null);
  const particleCount = 100;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      vel[i * 3] = (Math.random() - 0.5) * 0.1;
      vel[i * 3 + 1] = Math.random() * 0.1 + 0.02;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
    return [pos, vel];
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current || !active) return;
    const posAttr = particlesRef.current.geometry.getAttribute('position');
    const posArray = posAttr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      if (Math.random() < 0.1) {
        // Z-up scene: use position directly
        posArray[i * 3] = position[0];
        posArray[i * 3 + 1] = position[1];
        posArray[i * 3 + 2] = position[2];
        // Velocity: sparks fly upward (+Z) and outward
        velocities[i * 3] = (Math.random() - 0.5) * 0.15;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
        velocities[i * 3 + 2] = Math.random() * 0.15 + 0.03; // upward in Z
      } else {
        posArray[i * 3] += velocities[i * 3] * delta * 2;
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta * 2;
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta * 2;
        velocities[i * 3 + 2] -= delta * 0.3; // gravity pulls down (-Z)
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.008} color={THEME.accent} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ============================================================================
// Workpiece
// ============================================================================

function WeldingWorkpiece({
  seams,
  selectedSeamId,
  onSeamSelect,
}: {
  seams: WeldSeam[];
  selectedSeamId: string | null;
  onSeamSelect: (id: string) => void;
}) {
  return (
    <group>
      {/* Base plate - Z-up: height is Z coordinate, boxGeometry args are [width, depth, height] in Z-up */}
      <mesh position={[0.5, 0, -0.025]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color="#8090a0" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Vertical plates - standing upright in Z-up */}
      <mesh position={[0.5, -0.1, 0.15]}>
        <boxGeometry args={[0.3, 0.02, 0.3]} />
        <meshStandardMaterial color="#95a5b5" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0.5, 0.1, 0.15]}>
        <boxGeometry args={[0.3, 0.02, 0.3]} />
        <meshStandardMaterial color="#95a5b5" metalness={0.65} roughness={0.3} />
      </mesh>

      {/* Seam lines - Z-up scene, use coordinates directly */}
      {seams.map((seam) => {
        const start = new THREE.Vector3(...seam.start);
        const end = new THREE.Vector3(...seam.end);
        const midPoint = start.clone().add(end).multiplyScalar(0.5);
        const length = start.distanceTo(end);
        const dir = end.clone().sub(start).normalize();
        // Cylinder is Y-up by default, align it along the seam direction
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        return (
          <mesh key={seam.id} position={midPoint} quaternion={quat} onClick={() => onSeamSelect(seam.id)}>
            <cylinderGeometry args={[0.005, 0.005, length, 8]} />
            <meshBasicMaterial color={selectedSeamId === seam.id ? THEME.success : THEME.primary} />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// PropertyEditor Schemas - 展示 Schema 驱动的强大之处
// ============================================================================

/**
 * 焊接参数 Schema
 *
 * 优势展示:
 * 1. 声明式定义 - 无需手写 input/select，自动生成 UI
 * 2. 内置验证 - min/max/required 自动处理
 * 3. 条件显示 - visible 函数根据焊接方法显示不同参数
 * 4. 单位显示 - unit 属性自动添加单位标签
 * 5. 分组折叠 - 复杂参数分组管理
 */
const WELDING_SETTINGS_SCHEMA: PropertySchema = {
  groups: [
    {
      id: 'method',
      label: '焊接方式 / Method',
      collapsible: false,
      fields: [
        {
          key: 'method',
          type: 'enum',
          label: '焊接方法',
          description: '选择焊接工艺类型',
          options: [
            { value: 'MIG', label: 'MIG - 熔化极惰性气体保护焊' },
            { value: 'TIG', label: 'TIG - 钨极惰性气体保护焊' },
            { value: 'MAG', label: 'MAG - 熔化极活性气体保护焊' },
            { value: 'Laser', label: 'Laser - 激光焊接' },
          ],
        },
      ],
    },
    {
      id: 'electrical',
      label: '电气参数 / Electrical',
      collapsible: true,
      fields: [
        {
          key: 'voltage',
          type: 'number',
          label: '电压',
          unit: 'V',
          min: 10,
          max: 50,
          step: 0.5,
          precision: 1,
          description: '焊接电弧电压',
        },
        {
          key: 'current',
          type: 'number',
          label: '电流',
          unit: 'A',
          min: 50,
          max: 500,
          step: 5,
          precision: 0,
          description: '焊接电流强度',
          // 条件验证：激光焊不需要电流参数
          visible: (values) => values.method !== 'Laser',
        },
      ],
    },
    {
      id: 'motion',
      label: '运动参数 / Motion',
      collapsible: true,
      fields: [
        {
          key: 'travelSpeed',
          type: 'number',
          label: '行进速度',
          unit: 'mm/s',
          min: 1,
          max: 100,
          step: 1,
          precision: 0,
          description: '焊枪移动速度',
        },
        {
          key: 'wireFeedSpeed',
          type: 'number',
          label: '送丝速度',
          unit: 'm/min',
          min: 0.5,
          max: 25,
          step: 0.5,
          precision: 1,
          description: '焊丝送进速度',
          // 条件显示：只有 MIG/MAG 需要送丝
          visible: (values) => values.method === 'MIG' || values.method === 'MAG',
        },
      ],
    },
    {
      id: 'gas',
      label: '气体参数 / Gas',
      collapsible: true,
      defaultCollapsed: true,
      // 条件显示：激光焊不需要保护气体
      visible: (values) => values.method !== 'Laser',
      fields: [
        {
          key: 'gasFlowRate',
          type: 'number',
          label: '气体流量',
          unit: 'L/min',
          min: 5,
          max: 30,
          step: 1,
          precision: 0,
          description: '保护气体流量',
        },
        {
          key: 'gasType',
          type: 'enum',
          label: '气体类型',
          options: [
            { value: 'Ar', label: 'Ar - 纯氩气' },
            { value: 'Ar+CO2', label: 'Ar+CO₂ - 混合气体' },
            { value: 'CO2', label: 'CO₂ - 二氧化碳' },
            { value: 'He', label: 'He - 氦气' },
          ],
        },
      ],
    },
    {
      id: 'quality',
      label: '质量控制 / Quality',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          key: 'qualityLevel',
          type: 'enum',
          label: '质量等级',
          options: [
            { value: 'standard', label: '标准级' },
            { value: 'high', label: '高质量级' },
            { value: 'critical', label: '关键焊点' },
          ],
        },
        {
          key: 'inspectionRequired',
          type: 'boolean',
          label: '需要检测',
          description: '焊接完成后是否需要质量检测',
        },
      ],
    },
  ],
};

/**
 * 焊缝点 Schema
 *
 * 优势展示:
 * 1. position3d 类型 - 专为 3D 坐标设计
 * 2. 与 3D 场景联动 - highlightFields 可高亮正在编辑的字段
 * 3. onPreviewChange - 拖拽时实时更新 3D 预览
 */
const WELD_SEAM_SCHEMA: PropertySchema = {
  groups: [
    {
      id: 'info',
      label: '焊缝信息 / Seam Info',
      collapsible: false,
      fields: [
        {
          key: 'id',
          type: 'text',
          label: '焊缝 ID',
          readOnly: true,
        },
        {
          key: 'name',
          type: 'text',
          label: '焊缝名称',
          placeholder: '输入焊缝名称...',
        },
      ],
    },
    {
      id: 'geometry',
      label: '几何参数 / Geometry',
      collapsible: true,
      fields: [
        {
          key: 'start',
          type: 'position3d',
          label: '起点位置',
          unit: 'm',
          precision: 4,
          min: -2,
          max: 2,
          step: 0.001,
          description: '焊缝起始点坐标 (Z-up)',
        },
        {
          key: 'end',
          type: 'position3d',
          label: '终点位置',
          unit: 'm',
          precision: 4,
          min: -2,
          max: 2,
          step: 0.001,
          description: '焊缝结束点坐标 (Z-up)',
        },
        // 新功能展示: computedValue - 自动计算焊缝长度
        {
          key: 'length',
          type: 'number',
          label: '焊缝长度',
          unit: 'm',
          precision: 4,
          description: '自动计算: 基于起点和终点的距离 (computedValue)',
          // computedValue 让字段变成只读的派生字段
          computedValue: (values) => {
            const start = values.start as [number, number, number] | undefined;
            const end = values.end as [number, number, number] | undefined;
            if (!start || !end) return 0;
            return Math.sqrt(
              Math.pow(end[0] - start[0], 2) +
              Math.pow(end[1] - start[1], 2) +
              Math.pow(end[2] - start[2], 2)
            );
          },
          computedDeps: ['start', 'end'],
        },
      ],
    },
    {
      id: 'approach',
      label: '进近参数 / Approach',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        // 新功能展示: showSlider - 带滑块的数字输入
        {
          key: 'approachHeight',
          type: 'number',
          label: '进近高度',
          unit: 'mm',
          min: 5,
          max: 100,
          step: 1,
          precision: 0,
          description: '焊枪从上方进近的高度 (showSlider)',
          showSlider: true, // 显示滑块
        },
        {
          key: 'retractHeight',
          type: 'number',
          label: '退出高度',
          unit: 'mm',
          min: 5,
          max: 100,
          step: 1,
          precision: 0,
          description: '焊接完成后抬起的高度 (showSlider)',
          showSlider: true, // 显示滑块
        },
      ],
    },
  ],
};

// 扩展的焊接设置类型（包含新增字段）
interface ExtendedWeldingSettings extends WeldingSettings {
  gasType?: string;
  qualityLevel?: string;
  inspectionRequired?: boolean;
}

// 扩展的焊缝类型
interface ExtendedWeldSeam extends WeldSeam {
  name?: string;
  approachHeight?: number;
  retractHeight?: number;
}

// 默认扩展设置
const DEFAULT_EXTENDED_SETTINGS: ExtendedWeldingSettings = {
  ...DEFAULT_WELDING_SETTINGS,
  gasType: 'Ar+CO2',
  qualityLevel: 'standard',
  inspectionRequired: false,
};

// ============================================================================
// 3D Scene Content
// ============================================================================

// Static environment and render configs - defined outside component to prevent re-creation
const WELDING_ENVIRONMENT_CONFIG = {
  ...SKYBOX_PRESETS.industrial,
  fog: {
    ...SKYBOX_PRESETS.industrial.fog!,
    enabled: true,
    color: '#1a1208',
    near: 5,
    far: 25,
  },
};

const WELDING_RENDER_CONFIG = {
  ...QUALITY_PRESETS.high,
  qualityPreset: 'high' as const,
  postProcessing: {
    ...QUALITY_PRESETS.high.postProcessing!,
    enabled: true,
    ssao: {
      ...QUALITY_PRESETS.high.postProcessing!.ssao,
      enabled: true,
      intensity: 0.4,
      radius: 0.3,
    },
    bloom: {
      ...QUALITY_PRESETS.high.postProcessing!.bloom,
      enabled: true,
      intensity: 1.0, // Static bloom - welding sparks use emissive material
      threshold: 0.6,
    },
    vignette: {
      ...QUALITY_PRESETS.high.postProcessing!.vignette,
      enabled: true,
      darkness: 0.3,
    },
  },
};

function WeldingSceneContent({
  seams,
  selectedSeamId,
  onSeamSelect,
  isWelding,
  sparkPosition,
}: {
  seams: WeldSeam[];
  selectedSeamId: string | null;
  onSeamSelect: (id: string) => void;
  isWelding: boolean;
  sparkPosition: [number, number, number];
}) {
  return (
    <EnvironmentSystem config={WELDING_ENVIRONMENT_CONFIG}>
      <RenderPipeline config={WELDING_RENDER_CONFIG}>
        <ProcessScene
          urdfPath={URDF_PATH}
          showGhost={true}
          showTrajectory={true}
          trajectoryColor={THEME.primary}
        >
          <EndEffector showAxes={false}>
            <WeldingTorch color={THEME.primary} isActive={isWelding} scale={1.0} />
          </EndEffector>
        </ProcessScene>

        <WeldingWorkpiece seams={seams} selectedSeamId={selectedSeamId} onSeamSelect={onSeamSelect} />
        <WeldingSparks position={sparkPosition} active={isWelding} />

        {/* Enhanced workpiece lighting - Z-up: height is Z coordinate */}
        <pointLight position={[0.5, 0.5, 1.5]} intensity={0.6} color="#ffffff" distance={5} decay={2} />
        <pointLight position={[-0.5, -0.5, 1]} intensity={0.3} color="#e0f0ff" distance={4} decay={2} />
      </RenderPipeline>
    </EnvironmentSystem>
  );
}

// ============================================================================
// Demo Inner Component (with context access)
// ============================================================================

interface WeldingDemoInnerProps {
  tcpDebug: TcpDebugState;
  onTcpDebugChange: (update: Partial<TcpDebugState>) => void;
}

function WeldingDemoInner({ tcpDebug, onTcpDebugChange }: WeldingDemoInnerProps) {
  const { addLog } = useAppStore();

  // State - 使用扩展类型
  const [weldingSettings, setWeldingSettings] = useState<ExtendedWeldingSettings>(DEFAULT_EXTENDED_SETTINGS);
  const [selectedSeamId, setSelectedSeamId] = useState<string | null>(null);
  const [isWelding, setIsWelding] = useState(false);
  const [sparkPosition, setSparkPosition] = useState<[number, number, number]>([0.5, 0, 0.3]);
  const [activeTab, setActiveTab] = useState<'settings' | 'seam'>('settings');

  // 新功能展示: usePropertyHistory - 撤销/重做历史
  const settingsHistory = usePropertyHistory<ExtendedWeldingSettings>(
    weldingSettings,
    setWeldingSettings,
    { maxHistory: 30, debounceMs: 500 }
  );

  // Playback from context
  const playback = useProcessPlayback();
  const ghost = useProcessGhost();
  const state = useRobotProcessState();

  // Seams (Z-up coordinates) - 使用扩展类型，支持编辑
  // Seams are at the junction of base plate (top at Z=0) and vertical plates (at Y=±0.1)
  const [seams, setSeams] = useState<ExtendedWeldSeam[]>([
    { id: 'seam1', name: '底部焊缝 1', start: [0.35, -0.09, 0.005], end: [0.65, -0.09, 0.005], approachHeight: 20, retractHeight: 30 },
    { id: 'seam2', name: '底部焊缝 2', start: [0.35, 0.09, 0.005], end: [0.65, 0.09, 0.005], approachHeight: 20, retractHeight: 30 },
    { id: 'seam3', name: '中心焊缝', start: [0.35, 0, 0.005], end: [0.65, 0, 0.005], approachHeight: 25, retractHeight: 35 },
  ]);

  // 获取当前选中的焊缝
  const selectedSeam = useMemo(() => {
    return seams.find(s => s.id === selectedSeamId) || null;
  }, [seams, selectedSeamId]);

  // 更新焊缝
  const handleSeamChange = useCallback((updatedSeam: ExtendedWeldSeam) => {
    setSeams(prev => prev.map(s => s.id === updatedSeam.id ? updatedSeam : s));
    addLog('info', `焊缝 ${updatedSeam.name || updatedSeam.id} 已更新`);
  }, [addLog]);

  // 焊缝预览变化时更新 Ghost
  const handleSeamPreviewChange = useCallback((preview: Partial<ExtendedWeldSeam> | null) => {
    if (preview?.start) {
      // 180° around X to point tool Z down (Z-up scene)
      ghost.setTarget({
        position: preview.start as [number, number, number],
        quaternion: [0, 1, 0, 0],
      });
    }
  }, [ghost]);

  // Generate trajectory from seam
  const generateFromSeam = useCallback(() => {
    if (!selectedSeamId) {
      addLog('warning', 'Please select a weld seam first');
      return;
    }
    const seam = seams.find(s => s.id === selectedSeamId);
    if (!seam) return;

    // TCP Z-axis pointing down toward workpiece (Z-up scene)
    // For a tool with TCP Z pointing forward (+Z), we need 180° rotation around X
    // to flip Z from +Z to -Z (pointing down in world coordinates)
    // Quaternion for 180° around X: [w, x, y, z] = [0, 1, 0, 0]
    const downQuat: [number, number, number, number] = [0, 1, 0, 0];

    const waypoints = [];
    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      waypoints.push({
        position: [
          seam.start[0] + t * (seam.end[0] - seam.start[0]),
          seam.start[1] + t * (seam.end[1] - seam.start[1]),
          seam.start[2] + t * (seam.end[2] - seam.start[2]),
        ] as [number, number, number],
        quaternion: downQuat,
        time: t * 5,
      });
    }

    const trajectory: PoseTrajectory = {
      id: `weld-${selectedSeamId}-${Date.now()}`,
      name: `Weld ${selectedSeamId}`,
      waypoints,
      duration: 5,
    };

    playback.load(trajectory);
    addLog('info', `Trajectory generated: ${waypoints.length} points`);
  }, [selectedSeamId, seams, playback, addLog]);

  // Start welding
  const startWelding = useCallback(() => {
    if (!state.trajectory) {
      addLog('warning', 'Generate trajectory first');
      return;
    }
    setIsWelding(true);
    playback.play();
    addLog('info', 'Welding started');
  }, [state.trajectory, playback, addLog]);

  // Update spark position during playback
  React.useEffect(() => {
    if (state.isPlaying && state.playbackPose) {
      setSparkPosition(state.playbackPose.position);
    }
    if (state.playbackPosition >= 1 && isWelding) {
      setIsWelding(false);
      addLog('info', 'Welding complete');
    }
  }, [state.isPlaying, state.playbackPose, state.playbackPosition, isWelding, addLog]);

  // Ghost preview on seam hover
  const handleSeamSelect = useCallback((id: string) => {
    setSelectedSeamId(id);
    const seam = seams.find(s => s.id === id);
    if (seam) {
      // 180° around X to point tool Z down toward workpiece (Z-up scene)
      // Quaternion for 180° around X: [w, x, y, z] = [0, 1, 0, 0]
      ghost.setTarget({
        position: seam.start,
        quaternion: [0, 1, 0, 0],
      });
    }
    addLog('info', `Selected: ${id}`);
  }, [seams, ghost, addLog]);

  const handleStop = useCallback(() => {
    setIsWelding(false);
    playback.pause();
  }, [playback]);

  const handleReset = useCallback(() => {
    setIsWelding(false);
    playback.stop();
    ghost.clear();
  }, [playback, ghost]);

  const btnStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: '8px 16px',
    background: active ? color : '#666',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: active ? 'pointer' : 'not-allowed',
    opacity: active ? 1 : 0.5,
    fontSize: '12px',
  });

  return (
    <div className="module-container" style={{ background: THEME.background, overflowY: 'auto', maxHeight: '100%' }}>
      <div className="module-header" style={{ borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary }}>Welding Process</h2>
        <p style={{ color: THEME.textSecondary }}>Optimized with RobotProcessProvider + ProcessScene</p>
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', gap: '16px', padding: '12px 16px', background: THEME.surface, borderRadius: '8px', marginBottom: '12px', border: `1px solid ${THEME.primary}30`, alignItems: 'center' }}>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>STATUS</span><div style={{ color: isWelding ? THEME.accent : THEME.text, fontWeight: 'bold' }}>{isWelding ? 'WELDING' : 'IDLE'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>SEAM</span><div style={{ color: selectedSeamId ? THEME.success : '#666', fontWeight: 'bold' }}>{selectedSeamId || 'None'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>PROGRESS</span><div style={{ color: THEME.accent, fontWeight: 'bold' }}>{(state.playbackPosition * 100).toFixed(0)}%</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>METHOD</span><div style={{ color: THEME.text, fontWeight: 'bold' }}>{weldingSettings.method}</div></div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={generateFromSeam} disabled={isWelding} style={btnStyle(!!selectedSeamId && !isWelding, THEME.primary)}>Generate Path</button>
          <button onClick={startWelding} disabled={!state.trajectory || isWelding} style={btnStyle(!!state.trajectory && !isWelding, THEME.success)}>Start Welding</button>
          <button onClick={handleStop} disabled={!isWelding} style={btnStyle(isWelding, THEME.warning)}>Stop</button>
          <button onClick={handleReset} style={btnStyle(true, THEME.danger)}>Reset</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Left Panel - 使用 PropertyEditor */}
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Tab 切换 */}
          <div style={{ display: 'flex', gap: '4px', padding: '4px', background: THEME.surface, borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: activeTab === 'settings' ? THEME.primary : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: activeTab === 'settings' ? '#fff' : THEME.textSecondary,
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              焊接参数
            </button>
            <button
              onClick={() => setActiveTab('seam')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: activeTab === 'seam' ? THEME.primary : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: activeTab === 'seam' ? '#fff' : THEME.textSecondary,
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              焊缝编辑 {selectedSeam ? `(${selectedSeam.name || selectedSeam.id})` : ''}
            </button>
          </div>

          {/* 焊接参数编辑器 - PropertyEditor + Undo/Redo */}
          {activeTab === 'settings' && (
            <div style={{ background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40`, overflow: 'hidden' }}>
              {/* Undo/Redo 工具栏 - 新功能展示 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                borderBottom: `1px solid ${THEME.primary}30`,
                background: THEME.surface,
              }}>
                <button
                  onClick={settingsHistory.undo}
                  disabled={!settingsHistory.canUndo}
                  style={{
                    padding: '4px 8px',
                    border: `1px solid ${THEME.primary}40`,
                    borderRadius: '4px',
                    background: settingsHistory.canUndo ? THEME.panel : 'transparent',
                    color: settingsHistory.canUndo ? THEME.text : THEME.textSecondary,
                    cursor: settingsHistory.canUndo ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={`撤销 (${settingsHistory.undoCount} 步可用)`}
                >
                  <span>↶</span> 撤销
                </button>
                <button
                  onClick={settingsHistory.redo}
                  disabled={!settingsHistory.canRedo}
                  style={{
                    padding: '4px 8px',
                    border: `1px solid ${THEME.primary}40`,
                    borderRadius: '4px',
                    background: settingsHistory.canRedo ? THEME.panel : 'transparent',
                    color: settingsHistory.canRedo ? THEME.text : THEME.textSecondary,
                    cursor: settingsHistory.canRedo ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={`重做 (${settingsHistory.redoCount} 步可用)`}
                >
                  <span>↷</span> 重做
                </button>
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: THEME.textSecondary }}>
                  历史: {settingsHistory.undoCount} / {settingsHistory.undoCount + settingsHistory.redoCount}
                </span>
              </div>
              <PropertyEditor
                schema={WELDING_SETTINGS_SCHEMA}
                value={settingsHistory.value as unknown as Record<string, unknown>}
                onChange={(v) => settingsHistory.push(v as unknown as ExtendedWeldingSettings)}
                theme="dark"
                compact={true}
                hideActions={true}
                autoSave={true}
              />
            </div>
          )}

          {/* 焊缝编辑器 - PropertyEditor */}
          {activeTab === 'seam' && (
            <div style={{ background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40`, overflow: 'hidden' }}>
              {selectedSeam ? (
                <PropertyEditor
                  schema={WELD_SEAM_SCHEMA}
                  value={selectedSeam as unknown as Record<string, unknown>}
                  onChange={(v) => handleSeamChange(v as unknown as ExtendedWeldSeam)}
                  onPreviewChange={handleSeamPreviewChange as any}
                  theme="dark"
                  compact={true}
                  hideActions={true}
                  autoSave={true}
                  // 高亮正在编辑的位置字段
                  highlightFields={['start', 'end']}
                />
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: THEME.textSecondary }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👆</div>
                  <div>请在 3D 场景中点击选择一条焊缝</div>
                </div>
              )}
            </div>
          )}

          {/* 焊缝列表 */}
          <div style={{ background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40`, padding: '12px' }}>
            <div style={{ fontSize: '11px', color: THEME.textSecondary, marginBottom: '8px' }}>焊缝列表</div>
            {seams.map((seam) => (
              <div
                key={seam.id}
                onClick={() => handleSeamSelect(seam.id)}
                style={{
                  padding: '8px 12px',
                  marginBottom: '4px',
                  background: selectedSeamId === seam.id ? `${THEME.primary}30` : THEME.surface,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: selectedSeamId === seam.id ? `1px solid ${THEME.primary}` : '1px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: selectedSeamId === seam.id ? THEME.primary : THEME.text, fontWeight: 500, fontSize: '12px' }}>
                  {seam.name || seam.id}
                </span>
                <span style={{ color: THEME.textSecondary, fontSize: '10px' }}>
                  {Math.sqrt(
                    Math.pow(seam.end[0] - seam.start[0], 2) +
                    Math.pow(seam.end[1] - seam.start[1], 2) +
                    Math.pow(seam.end[2] - seam.start[2], 2)
                  ).toFixed(3)}m
                </span>
              </div>
            ))}
          </div>

          {/* TCP Debug Panel */}
          <TcpDebugPanel
            tcpDebug={tcpDebug}
            onTcpDebugChange={onTcpDebugChange}
            toolName="WeldingTorch"
            backgroundColor={THEME.background}
            accentColor={THEME.primary}
          />

          {/* 进度条 */}
          {state.trajectory && (
            <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
              <h4 style={{ margin: '0 0 12px 0', color: THEME.secondary, fontSize: '12px' }}>焊接进度</h4>
              <div style={{ height: '8px', background: THEME.background, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${state.playbackPosition * 100}%`, height: '100%', background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.accent})`, transition: 'width 0.1s linear' }} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: THEME.textSecondary, display: 'flex', justifyContent: 'space-between' }}>
                <span>已完成: {(state.playbackPosition * 100).toFixed(1)}%</span>
                <span>设置: {weldingSettings.method} / {weldingSettings.current}A</span>
              </div>
            </div>
          )}
        </div>

        {/* 3D View */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="canvas-wrapper" style={{ height: '600px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${THEME.primary}30` }}>
            <RoboViz config={{ scene: { background: THEME.background }, camera: { position: { x: 2.0, y: 1.5, z: 2.0 } } }}>
              <WeldingSceneContent
                seams={seams}
                selectedSeamId={selectedSeamId}
                onSeamSelect={handleSeamSelect}
                isWelding={isWelding}
                sparkPosition={sparkPosition}
              />
            </RoboViz>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Export - Full Version with ProcessProvider
// ============================================================================

// Register welding process at module load time
// This ensures it's available when ProcessProvider initializes
try {
  registerProcess(weldingProcess as ProcessDefinition, { override: true });
} catch (e) {
  // Already registered, that's fine
}

export function WeldingScene() {
  // TCP Debug state - lifted to this level to control RobotProcessProvider
  const [tcpDebug, setTcpDebug] = useState<TcpDebugState>(DEFAULT_TCP_DEBUG);

  const handleTcpDebugChange = useCallback((update: Partial<TcpDebugState>) => {
    setTcpDebug(prev => ({ ...prev, ...update }));
  }, []);

  // Compute TCP - use debug values if enabled, otherwise use metadata
  const tcp = useMemo(() => {
    if (tcpDebug.enabled) {
      return computeTcpFromDebug(tcpDebug);
    }
    return computeTcpFromMetadata(WELDING_TORCH_METADATA);
  }, [tcpDebug.enabled, tcpDebug.position, tcpDebug.rotation]);

  // Key changes when TCP debug changes to force re-mount of RobotProcessProvider
  const providerKey = tcpDebug.enabled
    ? `debug-${tcpDebug.position.join('-')}-${tcpDebug.rotation.join('-')}`
    : 'default';

  return (
    <ProcessProvider>
      <RobotProcessProvider
        key={providerKey}
        urdfPath={URDF_PATH}
        robotId="welding-robot"
        tool={{ position: tcp.position, quaternion: tcp.quaternion }}
      >
        <WeldingDemoInner tcpDebug={tcpDebug} onTcpDebugChange={handleTcpDebugChange} />
      </RobotProcessProvider>
    </ProcessProvider>
  );
}

export default WeldingScene;
