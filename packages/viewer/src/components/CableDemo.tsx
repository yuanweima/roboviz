/**
 * Cable Management Demo Component
 *
 * Demonstrates cable management visualization capabilities
 * without requiring SDK connection.
 */
import * as React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  DEFAULT_TWIST_CONSTRAINTS,
  generateCatenaryPath,
  getWarningLevelFromTwist,
  WARNING_LEVEL_COLORS,
} from '@aspect/roboviz-core';

// ============================================================
// Demo Cable Path Generator
// ============================================================

interface DemoCableProps {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  twist: number;
}

function DemoCablePath({ startPosition, endPosition, twist }: DemoCableProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);

  // Generate catenary path
  const pathPoints = React.useMemo(() => {
    const start = new THREE.Vector3(...startPosition);
    const end = new THREE.Vector3(...endPosition);
    return generateCatenaryPath(start, end, {
      sagFactor: 0.15,
      segments: 30,
    });
  }, [startPosition, endPosition]);

  // Create tube geometry
  const tubeGeometry = React.useMemo(() => {
    if (pathPoints.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(pathPoints);
    return new THREE.TubeGeometry(curve, 64, 0.015, 8, false);
  }, [pathPoints]);

  // Get color based on twist level
  const cableColor = React.useMemo(() => {
    const level = getWarningLevelFromTwist(twist, DEFAULT_TWIST_CONSTRAINTS);
    return WARNING_LEVEL_COLORS[level];
  }, [twist]);

  if (!tubeGeometry) return null;

  return (
    <mesh ref={meshRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        color={cableColor}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
  );
}

// ============================================================
// Interactive Cable Demo
// ============================================================

interface CableDemoContentProps {
  animating: boolean;
}

function CableDemoContent({ animating }: CableDemoContentProps) {
  const [time, setTime] = React.useState(0);

  // Animate twist over time
  useFrame((_, delta) => {
    if (animating) {
      setTime((t) => t + delta);
    }
  });

  // Calculate animated twist (oscillates between -π and π)
  const twist1 = Math.sin(time * 0.5) * Math.PI;
  const twist2 = Math.sin(time * 0.3 + 1) * Math.PI * 1.5;
  const twist3 = Math.sin(time * 0.7 + 2) * Math.PI * 0.8;

  // Robot base (cylinder)
  const robotBase = React.useMemo(() => (
    <group position={[0, 0, 0]}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.2, 32]} />
        <meshStandardMaterial color="#404050" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Arm representation */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
        <meshStandardMaterial color="#505060" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* TCP */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>
    </group>
  ), []);

  // Calculate end position based on animation
  const tcpPosition: [number, number, number] = [
    Math.sin(time * 0.3) * 0.2,
    0.85 + Math.sin(time * 0.5) * 0.1,
    Math.cos(time * 0.3) * 0.2,
  ];

  return (
    <>
      {robotBase}

      {/* Cable anchor points (world) */}
      <mesh position={[-0.5, 0.3, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[-0.3, 0.1, 0.4]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[0.4, 0.2, -0.3]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>

      {/* Demo cables */}
      <DemoCablePath
        startPosition={[-0.5, 0.3, 0]}
        endPosition={tcpPosition}
        twist={twist1}
      />
      <DemoCablePath
        startPosition={[-0.3, 0.1, 0.4]}
        endPosition={tcpPosition}
        twist={twist2}
      />
      <DemoCablePath
        startPosition={[0.4, 0.2, -0.3]}
        endPosition={tcpPosition}
        twist={twist3}
      />

      {/* Labels */}
      <Html position={[-0.5, 0.4, 0]} center>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 10,
          whiteSpace: 'nowrap',
        }}>
          焊接线
        </div>
      </Html>
      <Html position={[-0.3, 0.2, 0.4]} center>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 10,
          whiteSpace: 'nowrap',
        }}>
          气管
        </div>
      </Html>
      <Html position={[0.4, 0.3, -0.3]} center>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 10,
          whiteSpace: 'nowrap',
        }}>
          信号线
        </div>
      </Html>
    </>
  );
}

// ============================================================
// Main Demo Component
// ============================================================

export interface CableDemoProps {
  visible?: boolean;
}

export function CableDemo({ visible = true }: CableDemoProps) {
  // Animation is always enabled in demo mode
  const animating = true;

  if (!visible) return null;

  // Render the demo content directly (no context needed for visual-only demo)
  return <CableDemoContent animating={animating} />;
}

// ============================================================
// Demo UI Panel
// ============================================================

export function CableDemoPanel() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 10,
        width: 280,
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: 8,
        padding: 16,
        color: 'white',
        fontSize: 12,
        fontFamily: 'system-ui',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#4ecdc4' }}>
        线束管理演示
      </h3>
      <p style={{ margin: '0 0 12px 0', color: '#aaa', lineHeight: 1.5 }}>
        展示线束缠绕追踪和可视化功能。线束颜色根据扭曲程度变化：
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            background: WARNING_LEVEL_COLORS.safe,
          }} />
          <span>安全 - 扭曲 &lt; 60%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            background: WARNING_LEVEL_COLORS.caution,
          }} />
          <span>注意 - 扭曲 60-75%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            background: WARNING_LEVEL_COLORS.warning,
          }} />
          <span>警告 - 扭曲 75-95%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            background: WARNING_LEVEL_COLORS.critical,
          }} />
          <span>危险 - 扭曲 &gt; 95%</span>
        </div>
      </div>
      <div style={{
        marginTop: 16,
        padding: 12,
        background: 'rgba(78, 205, 196, 0.1)',
        borderRadius: 4,
        border: '1px solid rgba(78, 205, 196, 0.3)',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#4ecdc4' }}>
          💡 提示: 线束颜色随着模拟的扭曲角度实时变化
        </p>
      </div>
    </div>
  );
}

export default CableDemo;
