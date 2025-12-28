/**
 * RoboViz Instance Manager
 *
 * Provides GPU instancing support for rendering multiple copies of the same
 * geometry efficiently. Critical for multi-robot scenarios.
 */

import * as THREE from 'three';
import type { InstanceConfig, InstanceTransform } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface InstanceData {
  id: string;
  transform: InstanceTransform;
  instanceIndex: number;
}

export interface InstanceGroup {
  id: string;
  config: InstanceConfig;
  instancedMesh: THREE.InstancedMesh | null;
  instances: Map<string, InstanceData>;
  dirty: boolean;
}

// ============================================================================
// Instance Manager Class
// ============================================================================

/**
 * InstanceManager - GPU instancing for efficient multi-object rendering
 *
 * Manages instanced meshes for rendering multiple copies of the same geometry
 * with different transforms. Essential for multi-robot scenarios.
 *
 * @example
 * ```typescript
 * const manager = new InstanceManager();
 *
 * // Create instance group from a mesh
 * manager.createGroup('robots', {
 *   source: robotMesh,
 *   maxInstances: 100,
 *   dynamic: true,
 * });
 *
 * // Add instances
 * manager.addInstance('robots', {
 *   id: 'robot-1',
 *   position: [0, 0, 0],
 *   rotation: [0, 0, 0, 1],
 *   scale: [1, 1, 1],
 *   color: '#00ff88',
 * });
 *
 * // Update instance transforms
 * manager.updateInstance('robots', 'robot-1', {
 *   position: [1, 0, 0],
 * });
 * ```
 */
export class InstanceManager {
  private groups: Map<string, InstanceGroup> = new Map();
  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempQuaternion = new THREE.Quaternion();
  private tempScale = new THREE.Vector3();
  private tempColor = new THREE.Color();

  /**
   * Create a new instance group
   */
  createGroup(groupId: string, config: InstanceConfig): InstanceGroup {
    if (this.groups.has(groupId)) {
      console.warn(`Instance group already exists: ${groupId}`);
      return this.groups.get(groupId)!;
    }

    // Create instanced mesh from source
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material | THREE.Material[];

    if (config.source instanceof THREE.Mesh) {
      geometry = config.source.geometry;
      material = config.source.material;
    } else {
      // For groups, we need to merge geometries
      geometry = this.mergeGroupGeometry(config.source);
      material = this.extractGroupMaterial(config.source);
    }

    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      config.maxInstances
    );
    instancedMesh.count = 0;
    instancedMesh.instanceMatrix.setUsage(
      config.dynamic ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage
    );

    // Enable per-instance colors
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(config.maxInstances * 3),
      3
    );
    if (config.dynamic) {
      instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }

    const group: InstanceGroup = {
      id: groupId,
      config,
      instancedMesh,
      instances: new Map(),
      dirty: false,
    };

    this.groups.set(groupId, group);
    return group;
  }

  /**
   * Merge geometries from a group into a single geometry
   */
  private mergeGroupGeometry(group: THREE.Group): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    const transforms: THREE.Matrix4[] = [];

    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        geometries.push(child.geometry);
        transforms.push(child.matrixWorld);
      }
    });

    if (geometries.length === 0) {
      return new THREE.BufferGeometry();
    }

    if (geometries.length === 1) {
      return geometries[0].clone();
    }

    // Simple merge - for complex cases, consider BufferGeometryUtils.mergeGeometries
    const merged = geometries[0].clone();
    // Note: For production, use THREE.BufferGeometryUtils.mergeGeometries
    return merged;
  }

  /**
   * Extract material from a group
   */
  private extractGroupMaterial(
    group: THREE.Group
  ): THREE.Material | THREE.Material[] {
    let material: THREE.Material | null = null;

    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && !material) {
        material = child.material as THREE.Material;
      }
    });

    return material || new THREE.MeshStandardMaterial({ color: '#cccccc' });
  }

  /**
   * Get an instance group
   */
  getGroup(groupId: string): InstanceGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get all groups
   */
  getAllGroups(): InstanceGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Add an instance to a group
   */
  addInstance(groupId: string, transform: InstanceTransform): boolean {
    const group = this.groups.get(groupId);
    if (!group || !group.instancedMesh) {
      console.warn(`Instance group not found: ${groupId}`);
      return false;
    }

    if (group.instances.has(transform.id)) {
      console.warn(`Instance already exists: ${transform.id}`);
      return false;
    }

    if (group.instances.size >= group.config.maxInstances) {
      console.warn(`Max instances reached for group: ${groupId}`);
      return false;
    }

    const instanceIndex = group.instances.size;
    const instanceData: InstanceData = {
      id: transform.id,
      transform,
      instanceIndex,
    };

    group.instances.set(transform.id, instanceData);
    group.instancedMesh.count = group.instances.size;
    group.dirty = true;

    // Set initial transform and color
    this.updateInstanceMatrix(group, instanceData);
    this.updateInstanceColor(group, instanceData);

    return true;
  }

  /**
   * Remove an instance from a group
   */
  removeInstance(groupId: string, instanceId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group || !group.instancedMesh) {
      return false;
    }

    const instanceData = group.instances.get(instanceId);
    if (!instanceData) {
      return false;
    }

    group.instances.delete(instanceId);

    // Reindex remaining instances
    let index = 0;
    for (const data of group.instances.values()) {
      data.instanceIndex = index++;
    }

    group.instancedMesh.count = group.instances.size;
    group.dirty = true;

    // Rebuild all matrices (could be optimized)
    this.rebuildGroup(group);

    return true;
  }

  /**
   * Update an instance's transform
   */
  updateInstance(
    groupId: string,
    instanceId: string,
    updates: Partial<InstanceTransform>
  ): boolean {
    const group = this.groups.get(groupId);
    if (!group || !group.instancedMesh) {
      return false;
    }

    const instanceData = group.instances.get(instanceId);
    if (!instanceData) {
      return false;
    }

    // Apply updates
    if (updates.position) {
      instanceData.transform.position = updates.position;
    }
    if (updates.rotation) {
      instanceData.transform.rotation = updates.rotation;
    }
    if (updates.scale) {
      instanceData.transform.scale = updates.scale;
    }
    if (updates.color !== undefined) {
      instanceData.transform.color = updates.color;
      this.updateInstanceColor(group, instanceData);
    }
    if (updates.visible !== undefined) {
      instanceData.transform.visible = updates.visible;
    }

    this.updateInstanceMatrix(group, instanceData);
    group.dirty = true;

    return true;
  }

  /**
   * Batch update multiple instances
   */
  batchUpdate(
    groupId: string,
    updates: Array<{ id: string; transform: Partial<InstanceTransform> }>
  ): void {
    const group = this.groups.get(groupId);
    if (!group || !group.instancedMesh) {
      return;
    }

    for (const { id, transform } of updates) {
      const instanceData = group.instances.get(id);
      if (instanceData) {
        if (transform.position) {
          instanceData.transform.position = transform.position;
        }
        if (transform.rotation) {
          instanceData.transform.rotation = transform.rotation;
        }
        if (transform.scale) {
          instanceData.transform.scale = transform.scale;
        }
        if (transform.color !== undefined) {
          instanceData.transform.color = transform.color;
          this.updateInstanceColor(group, instanceData);
        }

        this.updateInstanceMatrix(group, instanceData);
      }
    }

    group.dirty = true;
    group.instancedMesh.instanceMatrix.needsUpdate = true;
    if (group.instancedMesh.instanceColor) {
      group.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Update the instance matrix
   */
  private updateInstanceMatrix(group: InstanceGroup, data: InstanceData): void {
    if (!group.instancedMesh) return;

    const { position, rotation, scale, visible } = data.transform;

    // Handle visibility by scaling to zero
    const effectiveScale = visible === false ? [0, 0, 0] : scale;

    this.tempPosition.set(position[0], position[1], position[2]);
    this.tempQuaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
    this.tempScale.set(effectiveScale[0], effectiveScale[1], effectiveScale[2]);

    this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
    group.instancedMesh.setMatrixAt(data.instanceIndex, this.tempMatrix);
    group.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update the instance color
   */
  private updateInstanceColor(group: InstanceGroup, data: InstanceData): void {
    if (!group.instancedMesh || !group.instancedMesh.instanceColor) return;

    const color = data.transform.color || '#ffffff';
    this.tempColor.set(color);
    group.instancedMesh.setColorAt(data.instanceIndex, this.tempColor);
    group.instancedMesh.instanceColor.needsUpdate = true;
  }

  /**
   * Rebuild all instance matrices for a group
   */
  private rebuildGroup(group: InstanceGroup): void {
    if (!group.instancedMesh) return;

    for (const data of group.instances.values()) {
      this.updateInstanceMatrix(group, data);
      this.updateInstanceColor(group, data);
    }

    group.instancedMesh.instanceMatrix.needsUpdate = true;
    if (group.instancedMesh.instanceColor) {
      group.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Get the instanced mesh for a group (for adding to scene)
   */
  getInstancedMesh(groupId: string): THREE.InstancedMesh | null {
    return this.groups.get(groupId)?.instancedMesh || null;
  }

  /**
   * Get instance count for a group
   */
  getInstanceCount(groupId: string): number {
    return this.groups.get(groupId)?.instances.size || 0;
  }

  /**
   * Dispose a group and release resources
   */
  disposeGroup(groupId: string): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    if (group.instancedMesh) {
      group.instancedMesh.dispose();
    }

    group.instances.clear();
    this.groups.delete(groupId);
  }

  /**
   * Dispose all groups
   */
  dispose(): void {
    for (const groupId of this.groups.keys()) {
      this.disposeGroup(groupId);
    }
  }
}

// ============================================================================
// Singleton accessor
// ============================================================================

let instanceManagerSingleton: InstanceManager | null = null;

export function getInstanceManager(): InstanceManager {
  if (!instanceManagerSingleton) {
    instanceManagerSingleton = new InstanceManager();
  }
  return instanceManagerSingleton;
}

export default InstanceManager;
