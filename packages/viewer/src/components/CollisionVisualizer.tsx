/**
 * CollisionVisualizer component
 * Renders collision geometries, contact points, and collision indicators
 */
import * as React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useViewerStore } from '../store/viewerStore';
import type { CollisionGeometryState, CollisionPair, Vector3 } from '../types';

interface CollisionGeometryProps {
  data: CollisionGeometryState;
  opacity: number;
  color: string;
}

function CollisionGeometry({ data, opacity, color }: CollisionGeometryProps) {
  const { type, params, position, rotation } = data;

  const eulerRotation = React.useMemo(() => {
    if (!rotation) return [0, 0, 0] as [number, number, number];
    return rotation;
  }, [rotation]);

  const geometry = React.useMemo(() => {
    switch (type) {
      case 'box':
        return (
          <boxGeometry args={[params.width || 0.1, params.height || 0.1, params.depth || 0.1]} />
        );
      case 'sphere':
        return <sphereGeometry args={[params.radius || 0.1, 16, 16]} />;
      case 'cylinder':
        return (
          <cylinderGeometry args={[params.radius || 0.1, params.radius || 0.1, params.height || 0.1, 16]} />
        );
      case 'capsule':
        return (
          <capsuleGeometry args={[params.radius || 0.1, params.height || 0.1, 8, 16]} />
        );
      default:
        return <sphereGeometry args={[0.1, 16, 16]} />;
    }
  }, [type, params]);

  if (!data.enabled) return null;

  return (
    <mesh position={position} rotation={eulerRotation}>
      {geometry}
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        wireframe
      />
    </mesh>
  );
}

interface ContactPointProps {
  point: Vector3;
  size: number;
  color: string;
  animation: 'none' | 'pulse' | 'flash';
}

function ContactPoint({ point, size, color, animation }: ContactPointProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const scaleRef = React.useRef(1);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (animation === 'pulse') {
      scaleRef.current += delta * 3;
      const scale = 1 + Math.sin(scaleRef.current) * 0.3;
      meshRef.current.scale.setScalar(scale);
    } else if (animation === 'flash') {
      scaleRef.current += delta * 8;
      const opacity = 0.5 + Math.sin(scaleRef.current) * 0.5;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef} position={[point.x, point.y, point.z]}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

interface CollisionIndicatorProps {
  pair: CollisionPair;
  config: {
    highlightColor: string;
    animation: 'none' | 'pulse' | 'flash';
    showContactPoints: boolean;
    contactPointSize: number;
    contactPointColor: string;
  };
}

function CollisionIndicator({ pair, config }: CollisionIndicatorProps) {
  const lineRef = React.useRef<THREE.Line>(null);
  const opacityRef = React.useRef(1);

  // Create a line connecting the two colliding objects (simplified visualization)
  useFrame((_, delta) => {
    if (!lineRef.current) return;

    if (config.animation === 'flash') {
      opacityRef.current += delta * 8;
      const opacity = 0.5 + Math.sin(opacityRef.current) * 0.5;
      (lineRef.current.material as THREE.LineBasicMaterial).opacity = opacity;
    }
  });

  if (!pair.contactPoint) return null;

  return (
    <group>
      {/* Contact point visualization */}
      {config.showContactPoints && pair.contactPoint && (
        <ContactPoint
          point={pair.contactPoint}
          size={config.contactPointSize}
          color={config.contactPointColor}
          animation={config.animation}
        />
      )}

      {/* Penetration indicator (if depth available) */}
      {pair.penetrationDepth && pair.penetrationDepth > 0 && (
        <mesh position={[pair.contactPoint.x, pair.contactPoint.y, pair.contactPoint.z]}>
          <ringGeometry args={[0, pair.penetrationDepth * 2, 32]} />
          <meshBasicMaterial
            color={config.highlightColor}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

export interface CollisionVisualizerProps {
  onCollisionDetected?: (pairs: CollisionPair[]) => void;
  onCollisionCleared?: () => void;
}

export function CollisionVisualizer({ onCollisionDetected, onCollisionCleared }: CollisionVisualizerProps) {
  const {
    collisionGeometries,
    collisionResult,
    collisionConfig,
    collisionEnabled,
    robots,
    obstacles,
    safetyZones,
    setCollisionResult,
  } = useViewerStore();

  const prevHadCollision = React.useRef(false);

  // Simple collision check between robots and obstacles based on TCP position
  useFrame(() => {
    if (!collisionEnabled) return;

    const pairs: CollisionPair[] = [];

    // Check each robot's TCP against obstacles and safety zones
    for (const [robotId, robot] of robots) {
      if (!robot.tcpPose) continue;

      const tcpPos = robot.tcpPose.position;

      // Check against obstacles
      for (const [obstacleId, obstacle] of obstacles) {
        const obsPos = obstacle.position;
        const dims = obstacle.dimensions;

        let isColliding = false;

        if (obstacle.shape === 'sphere') {
          const radius = dims[0] / 2;
          const dx = tcpPos.x - obsPos[0];
          const dy = tcpPos.y - obsPos[1];
          const dz = tcpPos.z - obsPos[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          isColliding = dist < radius;
        } else if (obstacle.shape === 'box') {
          const hx = dims[0] / 2;
          const hy = dims[1] / 2;
          const hz = dims[2] / 2;
          isColliding =
            Math.abs(tcpPos.x - obsPos[0]) < hx &&
            Math.abs(tcpPos.y - obsPos[1]) < hy &&
            Math.abs(tcpPos.z - obsPos[2]) < hz;
        } else if (obstacle.shape === 'cylinder') {
          const radius = dims[0] / 2;
          const height = dims[1] / 2;
          const dx = tcpPos.x - obsPos[0];
          const dz = tcpPos.z - obsPos[2];
          const distXZ = Math.sqrt(dx * dx + dz * dz);
          isColliding = distXZ < radius && Math.abs(tcpPos.y - obsPos[1]) < height;
        }

        if (isColliding) {
          pairs.push({
            objectA: { type: 'robot', id: robotId },
            objectB: { type: 'obstacle', id: obstacleId },
            contactPoint: { x: tcpPos.x, y: tcpPos.y, z: tcpPos.z },
            penetrationDepth: 0.01,
          });
        }
      }

      // Check against safety zone danger radius
      for (const [zoneId, zone] of safetyZones) {
        const zonePos = zone.position;
        const dx = tcpPos.x - zonePos[0];
        const dy = tcpPos.y - zonePos[1];
        const dz = tcpPos.z - zonePos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < zone.dangerRadius) {
          pairs.push({
            objectA: { type: 'robot', id: robotId },
            objectB: { type: 'safetyZone', id: zoneId },
            contactPoint: { x: tcpPos.x, y: tcpPos.y, z: tcpPos.z },
            penetrationDepth: zone.dangerRadius - dist,
          });
        }
      }

      // Check against collision geometries
      for (const [geomId, geometry] of collisionGeometries) {
        if (!geometry.enabled) continue;

        const geomPos = geometry.position;
        let isColliding = false;
        let penetration = 0;

        if (geometry.type === 'sphere') {
          const radius = geometry.params.radius || 0.1;
          const dx = tcpPos.x - geomPos[0];
          const dy = tcpPos.y - geomPos[1];
          const dz = tcpPos.z - geomPos[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          isColliding = dist < radius;
          penetration = radius - dist;
        } else if (geometry.type === 'box') {
          const hx = (geometry.params.width || 0.1) / 2;
          const hy = (geometry.params.height || 0.1) / 2;
          const hz = (geometry.params.depth || 0.1) / 2;
          isColliding =
            Math.abs(tcpPos.x - geomPos[0]) < hx &&
            Math.abs(tcpPos.y - geomPos[1]) < hy &&
            Math.abs(tcpPos.z - geomPos[2]) < hz;
          if (isColliding) {
            penetration = Math.min(
              hx - Math.abs(tcpPos.x - geomPos[0]),
              hy - Math.abs(tcpPos.y - geomPos[1]),
              hz - Math.abs(tcpPos.z - geomPos[2])
            );
          }
        } else if (geometry.type === 'cylinder') {
          const radius = geometry.params.radius || 0.1;
          const height = (geometry.params.height || 0.1) / 2;
          const dx = tcpPos.x - geomPos[0];
          const dz = tcpPos.z - geomPos[2];
          const distXZ = Math.sqrt(dx * dx + dz * dz);
          isColliding = distXZ < radius && Math.abs(tcpPos.y - geomPos[1]) < height;
          if (isColliding) {
            penetration = Math.min(radius - distXZ, height - Math.abs(tcpPos.y - geomPos[1]));
          }
        }

        if (isColliding) {
          pairs.push({
            objectA: { type: 'robot', id: robotId },
            objectB: { type: geometry.associatedObjectType || 'geometry', id: geomId },
            contactPoint: { x: tcpPos.x, y: tcpPos.y, z: tcpPos.z },
            penetrationDepth: Math.max(0, penetration),
          });
        }
      }
    }

    // Update collision result
    const hasCollision = pairs.length > 0;
    const result = {
      hasCollision,
      pairs,
      timestamp: Date.now(),
    };
    setCollisionResult(result);

    // Emit events
    if (hasCollision && !prevHadCollision.current) {
      onCollisionDetected?.(pairs);
    } else if (!hasCollision && prevHadCollision.current) {
      onCollisionCleared?.();
    }

    prevHadCollision.current = hasCollision;
  });

  if (!collisionEnabled) return null;

  return (
    <group>
      {/* Render collision geometries if enabled */}
      {collisionConfig.showCollisionGeometry &&
        Array.from(collisionGeometries.values()).map((geometry) => (
          <CollisionGeometry
            key={geometry.id}
            data={geometry}
            opacity={collisionConfig.collisionGeometryOpacity}
            color={collisionConfig.collisionGeometryColor}
          />
        ))}

      {/* Render collision indicators */}
      {collisionConfig.highlightCollisions &&
        collisionResult?.pairs.map((pair, index) => (
          <CollisionIndicator
            key={`${pair.objectA.id}-${pair.objectB.id}-${index}`}
            pair={pair}
            config={{
              highlightColor: collisionConfig.collisionHighlightColor,
              animation: collisionConfig.collisionHighlightAnimation,
              showContactPoints: collisionConfig.showContactPoints,
              contactPointSize: collisionConfig.contactPointSize,
              contactPointColor: collisionConfig.contactPointColor,
            }}
          />
        ))}
    </group>
  );
}
