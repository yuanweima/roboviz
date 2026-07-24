/**
 * TcpDebugPanel Component
 *
 * A debug panel for manually adjusting TCP (Tool Center Point) offset.
 * Use this to fine-tune TCP position and rotation in demo scenes,
 * then copy the values back to the tool's metadata.
 */
import React from 'react';
import * as THREE from 'three';

export interface TcpDebugState {
  enabled: boolean;
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in radians
}

export interface TcpDebugPanelProps {
  tcpDebug: TcpDebugState;
  onTcpDebugChange: (update: Partial<TcpDebugState>) => void;
  toolName?: string;
  backgroundColor?: string;
  accentColor?: string;
}

export function TcpDebugPanel({
  tcpDebug,
  onTcpDebugChange,
  toolName = 'Tool',
  backgroundColor = '#1a0810',
  accentColor = '#4488ff',
}: TcpDebugPanelProps) {
  const inputStyle: React.CSSProperties = {
    width: '70px',
    padding: '4px 6px',
    background: backgroundColor,
    border: `1px solid ${accentColor}40`,
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    textAlign: 'right',
  };

  const updatePosition = (axis: 0 | 1 | 2, value: number) => {
    const newPos = [...tcpDebug.position] as [number, number, number];
    newPos[axis] = value;
    onTcpDebugChange({ position: newPos });
  };

  const updateRotation = (axis: 0 | 1 | 2, value: number) => {
    const newRot = [...tcpDebug.rotation] as [number, number, number];
    newRot[axis] = (value * Math.PI) / 180; // Convert degrees to radians
    onTcpDebugChange({ rotation: newRot });
  };

  const copyToClipboard = () => {
    const code = `defaultTcpOffset: {
  position: [${tcpDebug.position.map((v) => v.toFixed(4)).join(', ')}],
  rotation: [${tcpDebug.rotation.map((v) => v.toFixed(4)).join(', ')}],
},`;
    navigator.clipboard.writeText(code);
    alert('TCP offset copied to clipboard!\n\n' + code);
  };

  return (
    <div
      style={{
        padding: '12px',
        background: '#1a2030',
        borderRadius: '8px',
        border: `1px solid ${accentColor}60`,
        marginTop: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <h4 style={{ margin: 0, color: accentColor, fontSize: '13px' }}>
          TCP Debug ({toolName})
        </h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={tcpDebug.enabled}
            onChange={(e) => onTcpDebugChange({ enabled: e.target.checked })}
          />
          <span style={{ fontSize: '11px', color: tcpDebug.enabled ? '#44ff88' : '#888' }}>
            {tcpDebug.enabled ? 'ENABLED' : 'OFF'}
          </span>
        </label>
      </div>

      {tcpDebug.enabled && (
        <>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#88aaff', marginBottom: '4px' }}>
              Position (m)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#ff6666' }}>X</span>
                <input
                  type="number"
                  step="0.001"
                  value={tcpDebug.position[0].toFixed(4)}
                  onChange={(e) => updatePosition(0, parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#66ff66' }}>Y</span>
                <input
                  type="number"
                  step="0.001"
                  value={tcpDebug.position[1].toFixed(4)}
                  onChange={(e) => updatePosition(1, parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#6666ff' }}>Z</span>
                <input
                  type="number"
                  step="0.001"
                  value={tcpDebug.position[2].toFixed(4)}
                  onChange={(e) => updatePosition(2, parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#88aaff', marginBottom: '4px' }}>
              Rotation (deg)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#ff6666' }}>RX</span>
                <input
                  type="number"
                  step="1"
                  value={((tcpDebug.rotation[0] * 180) / Math.PI).toFixed(1)}
                  onChange={(e) => updateRotation(0, parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#66ff66' }}>RY</span>
                <input
                  type="number"
                  step="1"
                  value={((tcpDebug.rotation[1] * 180) / Math.PI).toFixed(1)}
                  onChange={(e) => updateRotation(1, parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#6666ff' }}>RZ</span>
                <input
                  type="number"
                  step="1"
                  value={((tcpDebug.rotation[2] * 180) / Math.PI).toFixed(1)}
                  onChange={(e) => updateRotation(2, parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <button
            onClick={copyToClipboard}
            style={{
              width: '100%',
              padding: '6px',
              background: accentColor,
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Copy TCP Offset Code
          </button>

          <div
            style={{
              marginTop: '8px',
              padding: '6px',
              background: '#0a1020',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#88aaff',
              fontFamily: 'monospace',
            }}
          >
            pos: [{tcpDebug.position.map((v) => v.toFixed(3)).join(', ')}]
            <br />
            rot: [{tcpDebug.rotation.map((v) => v.toFixed(3)).join(', ')}]
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Helper function to compute TCP from debug state
 */
export function computeTcpFromDebug(tcpDebug: TcpDebugState): {
  position: [number, number, number];
  quaternion: [number, number, number, number];
} {
  const euler = new THREE.Euler(
    tcpDebug.rotation[0],
    tcpDebug.rotation[1],
    tcpDebug.rotation[2],
    'XYZ'
  );
  const quat = new THREE.Quaternion().setFromEuler(euler);
  return {
    position: tcpDebug.position,
    quaternion: [quat.x, quat.y, quat.z, quat.w] as [number, number, number, number],
  };
}

/**
 * Create default TCP debug state from tool metadata
 */
export function createDefaultTcpDebug(
  metadata: { defaultTcpOffset?: { position?: number[]; rotation?: number[] } } | undefined
): TcpDebugState {
  return {
    enabled: false,
    position: (metadata?.defaultTcpOffset?.position as [number, number, number]) || [0, 0, 0],
    rotation: (metadata?.defaultTcpOffset?.rotation as [number, number, number]) || [0, 0, 0],
  };
}
