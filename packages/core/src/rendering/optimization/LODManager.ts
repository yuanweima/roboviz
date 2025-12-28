/**
 * RoboViz LOD Manager
 *
 * Level of Detail management for optimizing rendering performance
 * by switching between different detail levels based on camera distance.
 */

import * as THREE from 'three';
import type { LODLevel } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface LODObject {
  id: string;
  lod: THREE.LOD;
  levels: LODLevel[];
  autoUpdate: boolean;
}

export interface LODManagerConfig {
  /** Default distances for LOD levels [high, medium, low] */
  defaultDistances: [number, number, number];
  /** Enable fade transition between LOD levels */
  fadeTransition: boolean;
  /** Fade duration in seconds */
  fadeDuration: number;
  /** Update frequency (0 = every frame) */
  updateFrequency: number;
}

// ============================================================================
// LOD Generation Utilities
// ============================================================================

/**
 * Generate simplified geometry for LOD
 */
export function generateSimplifiedGeometry(
  geometry: THREE.BufferGeometry,
  ratio: number
): THREE.BufferGeometry {
  // Simple vertex decimation - for production use, consider using
  // a proper mesh simplification library like meshoptimizer

  if (!geometry.index) {
    return geometry.clone();
  }

  const positions = geometry.getAttribute('position');
  const indices = geometry.index;

  if (!positions || !indices) {
    return geometry.clone();
  }

  const targetTriangles = Math.floor((indices.count / 3) * ratio);
  if (targetTriangles >= indices.count / 3) {
    return geometry.clone();
  }

  // Very simple decimation - just skip triangles
  // For production, use proper simplification algorithms
  const step = Math.ceil(1 / ratio);
  const newIndices: number[] = [];

  for (let i = 0; i < indices.count; i += 3 * step) {
    if (i + 2 < indices.count) {
      newIndices.push(indices.getX(i), indices.getX(i + 1), indices.getX(i + 2));
    }
  }

  const simplified = geometry.clone();
  simplified.setIndex(newIndices);

  return simplified;
}

/**
 * Generate a bounding box mesh for lowest LOD
 */
export function generateBoundingBoxMesh(
  geometry: THREE.BufferGeometry,
  material?: THREE.Material
): THREE.Mesh {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;

  if (!box) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      material || new THREE.MeshBasicMaterial({ color: '#888888' })
    );
  }

  const size = new THREE.Vector3();
  box.getSize(size);

  const center = new THREE.Vector3();
  box.getCenter(center);

  const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const mesh = new THREE.Mesh(
    boxGeometry,
    material || new THREE.MeshBasicMaterial({ color: '#888888', wireframe: true })
  );

  mesh.position.copy(center);

  return mesh;
}

// ============================================================================
// LOD Manager Class
// ============================================================================

/**
 * LODManager - Manages Level of Detail for scene objects
 *
 * Automatically switches between detail levels based on camera distance
 * to optimize rendering performance.
 *
 * @example
 * ```typescript
 * const lodManager = new LODManager();
 *
 * // Create LOD for a robot mesh
 * const lodObject = lodManager.createLOD('robot-1', [
 *   { distance: 0, object: highDetailMesh },
 *   { distance: 10, object: mediumDetailMesh },
 *   { distance: 30, object: lowDetailMesh },
 * ]);
 *
 * // Add to scene
 * scene.add(lodObject.lod);
 *
 * // Update in render loop
 * lodManager.update(camera);
 * ```
 */
export class LODManager {
  private objects: Map<string, LODObject> = new Map();
  private config: LODManagerConfig;
  private frameCount = 0;

  constructor(config?: Partial<LODManagerConfig>) {
    this.config = {
      defaultDistances: [0, 15, 40],
      fadeTransition: true,
      fadeDuration: 0.3,
      updateFrequency: 0,
      ...config,
    };
  }

  /**
   * Create a LOD object with specified levels
   */
  createLOD(id: string, levels: LODLevel[]): LODObject {
    if (this.objects.has(id)) {
      console.warn(`LOD object already exists: ${id}`);
      return this.objects.get(id)!;
    }

    const lod = new THREE.LOD();

    // Sort levels by distance
    const sortedLevels = [...levels].sort((a, b) => a.distance - b.distance);

    for (const level of sortedLevels) {
      lod.addLevel(level.object, level.distance);
    }

    const lodObject: LODObject = {
      id,
      lod,
      levels: sortedLevels,
      autoUpdate: true,
    };

    this.objects.set(id, lodObject);
    return lodObject;
  }

  /**
   * Create LOD from a single mesh with automatic simplification
   */
  createAutoLOD(
    id: string,
    mesh: THREE.Mesh,
    distances?: [number, number, number]
  ): LODObject {
    const [d1, d2, d3] = distances || this.config.defaultDistances;

    // Clone for high detail
    const highDetail = mesh.clone();

    // Generate medium detail (50% triangles)
    const mediumGeometry = generateSimplifiedGeometry(mesh.geometry, 0.5);
    const mediumDetail = new THREE.Mesh(mediumGeometry, mesh.material);

    // Generate low detail (20% triangles)
    const lowGeometry = generateSimplifiedGeometry(mesh.geometry, 0.2);
    const lowDetail = new THREE.Mesh(lowGeometry, mesh.material);

    return this.createLOD(id, [
      { distance: d1, object: highDetail },
      { distance: d2, object: mediumDetail },
      { distance: d3, object: lowDetail },
    ]);
  }

  /**
   * Create LOD with bounding box for lowest level
   */
  createLODWithBox(
    id: string,
    mesh: THREE.Mesh,
    distances?: [number, number, number]
  ): LODObject {
    const [d1, d2, d3] = distances || this.config.defaultDistances;

    // Clone for high detail
    const highDetail = mesh.clone();

    // Generate medium detail
    const mediumGeometry = generateSimplifiedGeometry(mesh.geometry, 0.5);
    const mediumDetail = new THREE.Mesh(mediumGeometry, mesh.material);

    // Generate bounding box for lowest LOD
    const boxMesh = generateBoundingBoxMesh(mesh.geometry);

    return this.createLOD(id, [
      { distance: d1, object: highDetail },
      { distance: d2, object: mediumDetail },
      { distance: d3, object: boxMesh },
    ]);
  }

  /**
   * Get a LOD object by ID
   */
  getLOD(id: string): LODObject | undefined {
    return this.objects.get(id);
  }

  /**
   * Get all LOD objects
   */
  getAllLODs(): LODObject[] {
    return Array.from(this.objects.values());
  }

  /**
   * Set auto-update for a LOD object
   */
  setAutoUpdate(id: string, autoUpdate: boolean): void {
    const obj = this.objects.get(id);
    if (obj) {
      obj.autoUpdate = autoUpdate;
    }
  }

  /**
   * Force update a specific LOD to a distance
   */
  forceLevel(id: string, distance: number): void {
    const obj = this.objects.get(id);
    if (obj) {
      // Create a dummy camera at the specified distance
      const dummyCamera = new THREE.PerspectiveCamera();
      dummyCamera.position.set(0, 0, distance);
      obj.lod.update(dummyCamera);
    }
  }

  /**
   * Update all LOD objects based on camera position
   */
  update(camera: THREE.Camera): void {
    // Skip frames based on update frequency
    if (this.config.updateFrequency > 0) {
      this.frameCount++;
      if (this.frameCount % this.config.updateFrequency !== 0) {
        return;
      }
    }

    for (const obj of this.objects.values()) {
      if (obj.autoUpdate) {
        obj.lod.update(camera);
      }
    }
  }

  /**
   * Remove a LOD object
   */
  removeLOD(id: string): void {
    const obj = this.objects.get(id);
    if (obj) {
      // Dispose geometries and materials
      obj.lod.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });

      this.objects.delete(id);
    }
  }

  /**
   * Get current visible level index for a LOD object
   */
  getCurrentLevel(id: string, camera: THREE.Camera): number {
    const obj = this.objects.get(id);
    if (!obj) return -1;

    const distance = camera.position.distanceTo(obj.lod.position);

    for (let i = obj.levels.length - 1; i >= 0; i--) {
      if (distance >= obj.levels[i].distance) {
        return i;
      }
    }

    return 0;
  }

  /**
   * Get statistics about LOD usage
   */
  getStats(camera: THREE.Camera): {
    total: number;
    byLevel: Record<number, number>;
  } {
    const stats = {
      total: this.objects.size,
      byLevel: {} as Record<number, number>,
    };

    for (const obj of this.objects.values()) {
      const level = this.getCurrentLevel(obj.id, camera);
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
    }

    return stats;
  }

  /**
   * Set configuration
   */
  setConfig(config: Partial<LODManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): LODManagerConfig {
    return { ...this.config };
  }

  /**
   * Dispose all LOD objects
   */
  dispose(): void {
    for (const id of this.objects.keys()) {
      this.removeLOD(id);
    }
  }
}

// ============================================================================
// Singleton accessor
// ============================================================================

let lodManagerSingleton: LODManager | null = null;

export function getLODManager(): LODManager {
  if (!lodManagerSingleton) {
    lodManagerSingleton = new LODManager();
  }
  return lodManagerSingleton;
}

export default LODManager;
