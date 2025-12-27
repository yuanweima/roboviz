/**
 * TCP Utilities
 *
 * Unified helpers for computing Tool Center Point (TCP) from tool metadata.
 * These utilities provide consistent TCP computation across all scenes.
 */

import * as THREE from 'three';
import type { ToolMetadata } from './types';

/**
 * TCP configuration with position and quaternion
 */
export interface TcpConfig {
  /** TCP position [x, y, z] in meters */
  position: [number, number, number];
  /** TCP orientation as quaternion [x, y, z, w] */
  quaternion: [number, number, number, number];
}

/**
 * Compute TCP from tool metadata with optional working distance
 *
 * The working distance extends the TCP along the tool's Z-axis direction.
 * This is useful for tools that need to maintain a specific distance from
 * the workpiece (e.g., inspection cameras, spray guns).
 *
 * @param metadata - Tool metadata with defaultTcpOffset
 * @param workingDistance - Optional distance to add along the tool's TCP Z-axis (default: 0)
 * @returns TCP configuration with position and quaternion
 *
 * @example
 * ```ts
 * // Simple case: use default TCP
 * const tcp = computeTcpFromMetadata(WELDING_TORCH_METADATA);
 *
 * // With working distance for inspection camera
 * const tcp = computeTcpFromMetadata(INSPECTION_CAMERA_METADATA, 0.25);
 * ```
 */
export function computeTcpFromMetadata(
  metadata: ToolMetadata,
  workingDistance: number = 0
): TcpConfig {
  const tcpOffset = metadata.defaultTcpOffset;

  if (!tcpOffset) {
    // No TCP offset defined, return identity
    return {
      position: [0, 0, workingDistance],
      quaternion: [0, 0, 0, 1],
    };
  }

  const toolTcpPos = tcpOffset.position;
  const toolTcpRot = tcpOffset.rotation;

  // Create quaternion from Euler angles (XYZ order)
  const toolQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(toolTcpRot[0], toolTcpRot[1], toolTcpRot[2], 'XYZ')
  );

  // If working distance is provided, extend TCP along the rotated Z-axis
  let finalPos: [number, number, number];
  if (workingDistance !== 0) {
    // Get Z-axis direction after rotation
    const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(toolQuat);
    finalPos = [
      toolTcpPos[0] + zAxis.x * workingDistance,
      toolTcpPos[1] + zAxis.y * workingDistance,
      toolTcpPos[2] + zAxis.z * workingDistance,
    ];
  } else {
    finalPos = [...toolTcpPos] as [number, number, number];
  }

  return {
    position: finalPos,
    quaternion: [toolQuat.x, toolQuat.y, toolQuat.z, toolQuat.w],
  };
}

/**
 * Get TCP position as Vector3
 *
 * Convenience function that returns just the position as a THREE.Vector3.
 *
 * @param metadata - Tool metadata with defaultTcpOffset
 * @param workingDistance - Optional distance to add along the tool's TCP Z-axis
 * @returns TCP position as THREE.Vector3
 */
export function getTcpPosition(
  metadata: ToolMetadata,
  workingDistance: number = 0
): THREE.Vector3 {
  const tcp = computeTcpFromMetadata(metadata, workingDistance);
  return new THREE.Vector3(...tcp.position);
}

/**
 * Get TCP quaternion as THREE.Quaternion
 *
 * Convenience function that returns just the orientation as a THREE.Quaternion.
 *
 * @param metadata - Tool metadata with defaultTcpOffset
 * @returns TCP orientation as THREE.Quaternion
 */
export function getTcpQuaternion(metadata: ToolMetadata): THREE.Quaternion {
  const tcp = computeTcpFromMetadata(metadata);
  return new THREE.Quaternion(...tcp.quaternion);
}

/**
 * Get default TCP offset from metadata
 *
 * Returns the raw TCP offset from metadata, or default values if not defined.
 *
 * @param metadata - Tool metadata
 * @returns Object with position and rotation arrays
 */
export function getDefaultTcpOffset(metadata: ToolMetadata): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  if (metadata.defaultTcpOffset) {
    return {
      position: [...metadata.defaultTcpOffset.position] as [number, number, number],
      rotation: [...metadata.defaultTcpOffset.rotation] as [number, number, number],
    };
  }
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  };
}
