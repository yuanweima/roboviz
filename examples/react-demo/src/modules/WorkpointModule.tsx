/**
 * Workpoint Module Demo
 *
 * 展示工作点系统的功能：
 * - 在工件表面创建工作点
 * - 悬停预览
 * - Gizmo编辑
 * - 不同类型的工作点可视化
 * - 分组管理和显示控制
 * - 工作点分组移动
 */
import React, { useState, useCallback } from 'react';
import { useControls, button } from 'leva';
import { RoboViz, Robot } from '@aspect/roboviz-react';
import * as THREE from 'three';
import {
  WorkpointManager,
  SurfaceRegionManager,
  useWorkpointStore,
  useWorkpointMode,
  useWorkpointGroups,
  useCurrentGroupId,
  useSurfaceRegionStore,
  useSurfaceRegions,
  useRegionCreationState,
  type Workpoint,
  type WorkpointType,
  type WorkpointGroup,
  type SurfaceRegion,
  type SurfaceRegionType,
} from '@aspect/roboviz-core';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

/**
 * Simple workpiece mesh component
 */
function Workpiece({ id, meshRef }: { id: string; meshRef?: React.RefObject<THREE.Mesh | null> }) {
  return (
    <mesh
      ref={meshRef}
      name={id}
      position={[0.5, 0.15, 0]}
      userData={{ workpieceId: id }}
    >
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#888888" metalness={0.3} roughness={0.7} />
    </mesh>
  );
}

/**
 * Cylinder workpiece
 */
function CylinderWorkpiece({ id, meshRef }: { id: string; meshRef?: React.RefObject<THREE.Mesh | null> }) {
  return (
    <mesh
      ref={meshRef}
      name={id}
      position={[-0.5, 0.1, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      userData={{ workpieceId: id }}
    >
      <cylinderGeometry args={[0.15, 0.15, 0.2, 32]} />
      <meshStandardMaterial color="#aa8866" metalness={0.2} roughness={0.8} />
    </mesh>
  );
}

export function WorkpointModule() {
  const { addLog } = useAppStore();
  const [workpoints, setWorkpoints] = useState<Workpoint[]>([]);
  const mode = useWorkpointMode();
  const groups = useWorkpointGroups();
  const currentGroupId = useCurrentGroupId();
  const store = useWorkpointStore;

  // Surface region state
  const [isRegionCreating, setIsRegionCreating] = useState(false);
  const [regionType, setRegionType] = useState<SurfaceRegionType>('processing');
  const [activeWorkpieceId, setActiveWorkpieceId] = useState('workpiece_box');
  const regions = useSurfaceRegions();
  const creationState = useRegionCreationState();
  const regionStore = useSurfaceRegionStore;

  // Mesh refs for surface region raycast
  const boxMeshRef = React.useRef<THREE.Mesh>(null);
  const cylinderMeshRef = React.useRef<THREE.Mesh>(null);

  // Get active workpiece mesh
  const activeWorkpieceMesh = activeWorkpieceId === 'workpiece_box'
    ? boxMeshRef.current
    : cylinderMeshRef.current;

  // Workpoint type mapping for display
  const typeNames: Record<WorkpointType, string> = {
    normal: 'Normal',
    camera: 'Camera',
    weld: 'Weld',
    spray: 'Spray',
    measure: 'Measure',
  };

  // Workpoint system controls (without group selector - moved to custom UI)
  useControls('Workpoint System', {
    mode: {
      value: mode,
      options: ['view', 'edit'] as const,
      onChange: (v: 'view' | 'edit') => store.getState().setMode(v),
    },
    workpointType: {
      value: 'normal' as WorkpointType,
      options: ['normal', 'camera', 'weld', 'spray', 'measure'] as const,
      onChange: (v: WorkpointType) => store.getState().setCurrentType(v),
    },
    workpointSize: {
      value: 0.02,
      min: 0.005,
      max: 0.1,
      step: 0.005,
      onChange: (v: number) => store.getState().setConfig({ workpointSize: v }),
    },
    'Clear All': button(() => {
      store.getState().clearWorkpoints();
      setWorkpoints([]);
      addLog('info', 'All workpoints cleared');
    }),
    'Log Workpoints': button(() => {
      const wps = store.getState().getWorkpointsOrdered();
      console.log('Current workpoints:', wps);
      addLog('info', `${wps.length} workpoints logged to console`);
    }),
  });

  // Display controls
  useControls('Display', {
    simplifiedIcons: {
      value: true,
      label: 'Simplified Icons',
      onChange: (v: boolean) => store.getState().setDisplayConfig({ simplifiedIcons: v }),
    },
    showAxes: {
      value: true,
      label: 'Show Axes',
      onChange: (v: boolean) => store.getState().setDisplayConfig({ showAxes: v }),
    },
    showFrustums: {
      value: true,
      onChange: (v: boolean) => store.getState().setDisplayConfig({ showFrustums: v }),
    },
    frustumOnHoverOnly: {
      value: false,
      label: 'Frustum on Hover',
      onChange: (v: boolean) => store.getState().setDisplayConfig({ frustumOnHoverOnly: v }),
    },
    frustumOpacity: {
      value: 0.2,
      min: 0.05,
      max: 0.5,
      step: 0.05,
      onChange: (v: number) => store.getState().setDisplayConfig({ frustumOpacity: v }),
    },
    maxVisibleFrustums: {
      value: 0,
      min: 0,
      max: 20,
      step: 1,
      label: 'Max Frustums',
      onChange: (v: number) => store.getState().setDisplayConfig({ maxVisibleFrustums: v }),
    },
    showLabels: {
      value: true,
      onChange: (v: boolean) => store.getState().setDisplayConfig({ showLabels: v }),
    },
    showOrder: {
      value: true,
      onChange: (v: boolean) => store.getState().setDisplayConfig({ showOrder: v }),
    },
    lockRotation: {
      value: false,
      label: 'Lock Rotation (Batch)',
      onChange: (v: boolean) => store.getState().setDisplayConfig({ lockRotation: v }),
    },
  });

  // Tool angle controls for welding etc.
  useControls('Tool Angle', {
    lockTiltAngle: {
      value: false,
      label: 'Lock Tilt Angle',
      onChange: (v: boolean) => store.getState().setDisplayConfig({ lockTiltAngle: v }),
    },
    defaultTiltAngle: {
      value: 0,
      min: 0,
      max: 60,
      step: 5,
      label: 'Tilt Angle (deg)',
      onChange: (v: number) => store.getState().setDisplayConfig({ defaultTiltAngle: v }),
    },
  });

  // Camera controls for camera-type workpoints
  useControls('Camera Config', {
    'FOV (deg)': {
      value: 11.4,
      min: 5,
      max: 60,
      step: 0.5,
      onChange: (v: number) => store.getState().setConfig({ defaultCameraFOV: v }),
    },
    'Distance (m)': {
      value: 0.3,
      min: 0.1,
      max: 1,
      step: 0.01,
      onChange: (v: number) => store.getState().setConfig({ defaultCameraDistance: v }),
    },
    'Aspect Ratio': {
      value: 80 / 60,
      min: 0.5,
      max: 2,
      step: 0.1,
      onChange: (v: number) => store.getState().setConfig({ defaultCameraAspectRatio: v }),
    },
  });

  // Surface region controls
  useControls('Surface Region', {
    regionType: {
      value: regionType,
      options: ['processing', 'spray', 'weld', 'avoid', 'inspection'] as const,
      label: 'Region Type',
      onChange: (v: SurfaceRegionType) => setRegionType(v),
    },
    workpiece: {
      value: activeWorkpieceId,
      options: { 'Box': 'workpiece_box', 'Cylinder': 'workpiece_cylinder' },
      label: 'Target Workpiece',
      onChange: (v: string) => setActiveWorkpieceId(v),
    },
    'Start Creating': button(() => {
      if (!isRegionCreating) {
        setIsRegionCreating(true);
        addLog('info', `Started creating ${regionType} region on ${activeWorkpieceId}`);
      }
    }),
    'Finish Region': button(() => {
      if (isRegionCreating && creationState.points.length >= 3) {
        const region = regionStore.getState().finishCreating();
        if (region) {
          setIsRegionCreating(false);
          addLog('info', `Region created: ${region.name} with ${region.boundaryPoints.length} points`);
        }
      }
    }),
    'Cancel': button(() => {
      if (isRegionCreating) {
        regionStore.getState().cancelCreating();
        setIsRegionCreating(false);
        addLog('warning', 'Region creation cancelled');
      }
    }),
    'Clear All Regions': button(() => {
      regionStore.getState().clearRegions();
      addLog('warning', 'All regions cleared');
    }),
  });

  // Callbacks
  const handleWorkpointAdded = useCallback((wp: Workpoint) => {
    setWorkpoints((prev) => [...prev, wp]);
    const groupName = wp.groupId ? store.getState().getGroup(wp.groupId)?.name : null;
    addLog('info', `Workpoint #${wp.order} (${wp.type})${groupName ? ` [${groupName}]` : ''} created`);
    console.log('Workpoint added:', wp);
  }, [addLog]);

  const handleWorkpointChanged = useCallback((wp: Workpoint) => {
    setWorkpoints((prev) => prev.map((w) => (w.id === wp.id ? wp : w)));
    addLog('info', `Workpoint #${wp.order} updated`);
  }, [addLog]);

  const handleWorkpointRemoved = useCallback((id: string) => {
    setWorkpoints((prev) => prev.filter((w) => w.id !== id));
    addLog('warning', 'Workpoint deleted');
  }, [addLog]);

  const handleWorkpointSelected = useCallback((id: string | null) => {
    if (id) {
      addLog('info', `Workpoint selected: ${id.slice(0, 8)}...`);
    }
  }, [addLog]);

  // Get group info for a workpoint
  const getGroupInfo = (wp: Workpoint): WorkpointGroup | undefined => {
    if (!wp.groupId) return undefined;
    return groups.find(g => g.id === wp.groupId);
  };

  // Handle group change for a workpoint
  const handleWorkpointGroupChange = (wpId: string, newGroupId: string) => {
    const groupId = newGroupId === '' ? null : newGroupId;
    store.getState().assignToGroup([wpId], groupId);

    // Update local state
    setWorkpoints((prev) => prev.map((w) =>
      w.id === wpId ? { ...w, groupId: groupId ?? undefined } : w
    ));

    const groupName = groupId ? store.getState().getGroup(groupId)?.name : 'No Group';
    addLog('info', `Workpoint moved to ${groupName}`);
  };

  // Handle current group change
  const handleCurrentGroupChange = (groupId: string) => {
    store.getState().setCurrentGroup(groupId === '' ? null : groupId);
  };

  // Handle add group
  const handleAddGroup = () => {
    const groupCount = store.getState().groups.size;
    const group = store.getState().addGroup(`Group ${groupCount + 1}`);
    addLog('info', `Created group: ${group.name}`);
  };

  // Get ungrouped workpoints
  const ungroupedWorkpoints = workpoints.filter(wp => !wp.groupId);

  // Common select style
  const selectStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '1px solid #444',
    borderRadius: '3px',
    color: '#fff',
    padding: '2px 4px',
    fontSize: '11px',
    cursor: 'pointer',
  };

  const buttonStyle: React.CSSProperties = {
    background: '#444',
    border: 'none',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '10px',
    cursor: 'pointer',
    color: '#fff',
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Workpoint System</h2>
        <p>
          在工件表面定义工作点，用于机械臂操作。按 <code>W</code> 切换编辑模式。
        </p>
      </div>

      <div className="shortcuts-info" style={{
        padding: '10px',
        background: '#2a2a3e',
        borderRadius: '8px',
        marginBottom: '10px',
        fontSize: '12px'
      }}>
        <strong>快捷键：</strong>
        <span style={{ marginLeft: '10px' }}>
          <code>W</code> 切换模式 |
          <code>Space/Enter</code> 创建 |
          <code>R</code> 旋转预览 |
          <code>1-5</code> 切换类型 |
          <code>Delete</code> 删除 |
          <code>T</code> 移动Gizmo |
          <code>Ctrl+R</code> 旋转Gizmo
        </span>
      </div>

      <div className="status-bar" style={{
        padding: '8px',
        background: mode === 'edit' ? '#2a4a3e' : isRegionCreating ? '#4a3a2e' : '#2a2a3e',
        borderRadius: '8px',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span>
          Mode: <strong style={{ color: mode === 'edit' ? '#4ecdc4' : isRegionCreating ? '#ff8800' : '#aaa' }}>
            {isRegionCreating ? 'REGION CREATING' : mode.toUpperCase()}
          </strong>
        </span>
        <span>Workpoints: <strong>{workpoints.length}</strong></span>
        <span>Groups: <strong>{groups.length}</strong></span>
        <span>Regions: <strong>{regions.length}</strong></span>
        {isRegionCreating && (
          <span style={{ color: '#ff8800' }}>
            Points: <strong>{creationState.points.length}</strong>/3+
          </span>
        )}
      </div>

      {/* Current Group Selector for new workpoints */}
      <div className="current-group-panel" style={{
        padding: '10px',
        background: '#2a2a3e',
        borderRadius: '8px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '12px' }}>新建工作点归属分组：</span>
        <select
          value={currentGroupId || ''}
          onChange={(e) => handleCurrentGroupChange(e.target.value)}
          style={{ ...selectStyle, flex: 1, maxWidth: '200px' }}
        >
          <option value="">(未分组)</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <button
          onClick={handleAddGroup}
          style={{ ...buttonStyle, background: '#4ecdc4' }}
        >
          + 新建分组
        </button>
      </div>

      {/* Group list with visibility toggles */}
      {groups.length > 0 && (
        <div className="groups-panel" style={{
          padding: '10px',
          background: '#2a2a3e',
          borderRadius: '8px',
          marginBottom: '10px',
        }}>
          <strong>分组管理：</strong>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {groups.map((group) => {
              const groupWorkpoints = workpoints.filter(wp => wp.groupId === group.id);
              return (
                <div key={group.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  background: '#1a1a2e',
                  borderRadius: '4px',
                  borderLeft: `3px solid ${group.color}`,
                }}>
                  <input
                    type="checkbox"
                    checked={group.visible}
                    onChange={(e) => store.getState().setGroupVisible(group.id, e.target.checked)}
                    title="显示/隐藏"
                  />
                  <span style={{ color: group.color, flex: 1, fontSize: '12px' }}>{group.name}</span>
                  <span style={{ color: '#666', fontSize: '11px' }}>{groupWorkpoints.length} 个点</span>
                  <button
                    style={{
                      ...buttonStyle,
                      background: group.showFrustums ? '#4ecdc4' : '#444',
                    }}
                    onClick={() => store.getState().setGroupShowFrustums(group.id, !group.showFrustums)}
                    title="显示/隐藏视锥体"
                  >
                    F
                  </button>
                  <button
                    style={{
                      ...buttonStyle,
                      background: group.showLabels ? '#4ecdc4' : '#444',
                    }}
                    onClick={() => store.getState().setGroupShowLabels(group.id, !group.showLabels)}
                    title="显示/隐藏标签"
                  >
                    L
                  </button>
                  <button
                    style={{
                      ...buttonStyle,
                      background: currentGroupId === group.id ? '#4ecdc4' : '#444',
                    }}
                    onClick={() => handleCurrentGroupChange(currentGroupId === group.id ? '' : group.id)}
                    title="设为当前分组"
                  >
                    ✓
                  </button>
                  <button
                    style={{ ...buttonStyle, background: '#c44' }}
                    onClick={() => {
                      store.getState().removeGroup(group.id);
                      addLog('warning', `Deleted group: ${group.name}`);
                    }}
                    title="删除分组"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Ungrouped count */}
          {ungroupedWorkpoints.length > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '4px 8px',
              background: '#1a1a2e',
              borderRadius: '4px',
              borderLeft: '3px solid #666',
              fontSize: '12px',
              color: '#888',
            }}>
              未分组: {ungroupedWorkpoints.length} 个点
            </div>
          )}
        </div>
      )}

      <div className="canvas-wrapper">
        <RoboViz
          config={{
            scene: {
              background: '#1a1a2e',
              grid: { enabled: true, size: 10, divisions: 20, color: '#404060' },
            },
            camera: { position: { x: 1.5, y: 1, z: 1.5 } },
          }}
        >
          {/* Robot */}
          <Robot
            id="fanuc_robot"
            urdfPath={URDF_PATH}
            jointAngles={[0, -0.5, 0.8, 0, -0.3, 0]}
            color="#4ecdc4"
            showAxes={false}
          />

          {/* Workpieces */}
          <Workpiece id="workpiece_box" meshRef={boxMeshRef} />
          <CylinderWorkpiece id="workpiece_cylinder" meshRef={cylinderMeshRef} />

          {/* Workpoint Manager */}
          <WorkpointManager
            workpieceIds={['workpiece_box', 'workpiece_cylinder']}
            activeRobotId="fanuc_robot"
            callbacks={{
              onWorkpointAdded: handleWorkpointAdded,
              onWorkpointChanged: handleWorkpointChanged,
              onWorkpointRemoved: handleWorkpointRemoved,
              onWorkpointSelected: handleWorkpointSelected,
            }}
          />

          {/* Surface Region Manager */}
          <SurfaceRegionManager
            workpieceMesh={activeWorkpieceMesh}
            workpieceId={activeWorkpieceId}
            isCreating={isRegionCreating}
            regionType={regionType}
            callbacks={{
              onRegionCreated: (region) => {
                setIsRegionCreating(false); // End creation mode after region is created
                addLog('info', `Region "${region.name}" created with ${region.boundaryPoints.length} points`);
              },
              onPointAdded: (point) => {
                addLog('info', `Boundary point added (${creationState.points.length + 1} points)`);
              },
            }}
          />
        </RoboViz>
      </div>

      {/* Workpoint List with group assignment */}
      {workpoints.length > 0 && (
        <div className="workpoint-list" style={{
          marginTop: '10px',
          padding: '10px',
          background: '#2a2a3e',
          borderRadius: '8px',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          <strong>工作点列表：</strong>
          <table style={{ width: '100%', marginTop: '8px', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#888', textAlign: 'left' }}>
                <th style={{ padding: '4px' }}>#</th>
                <th style={{ padding: '4px' }}>类型</th>
                <th style={{ padding: '4px' }}>分组</th>
                <th style={{ padding: '4px' }}>位置</th>
              </tr>
            </thead>
            <tbody>
              {workpoints.map((wp) => {
                const group = getGroupInfo(wp);
                return (
                  <tr key={wp.id} style={{ borderTop: '1px solid #333' }}>
                    <td style={{ padding: '4px', color: group?.color || '#4ecdc4' }}>
                      {wp.order}
                    </td>
                    <td style={{ padding: '4px', color: '#888' }}>
                      {typeNames[wp.type]}
                    </td>
                    <td style={{ padding: '4px' }}>
                      <select
                        value={wp.groupId || ''}
                        onChange={(e) => handleWorkpointGroupChange(wp.id, e.target.value)}
                        style={{
                          ...selectStyle,
                          borderColor: group?.color || '#444',
                        }}
                      >
                        <option value="">(未分组)</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '4px', color: '#666', fontSize: '10px' }}>
                      [{wp.position.map(p => p.toFixed(2)).join(', ')}]
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
