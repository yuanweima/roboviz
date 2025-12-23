/**
 * RoboViz Collision Manager
 *
 * 碰撞检测和安全区域管理
 */

import type { Vector3, Transform } from '../types';
import type {
  CollisionGeometry,
  SafetyZone,
  SafetyLevel,
  SafetyZoneVisualization,
  CollisionResult,
  CollisionPair,
  SafetyZoneTriggerState,
  CollisionVisualizationConfig,
  ICollisionManager,
  CollisionEvent,
  CollisionDetectedEvent,
  SafetyZoneEnteredEvent,
  SafetyZoneExitedEvent,
  PathCollisionCheckRequest,
  PathCollisionCheckResult,
  DistanceQueryRequest,
  DistanceQueryResult,
} from './types';
import { DEFAULT_COLLISION_VISUALIZATION } from './types';

// ============================================================================
// Types
// ============================================================================

type CollisionEventCallback = (event: CollisionEvent) => void;

/**
 * 碰撞几何体实例
 */
interface CollisionGeometryInstance {
  geometry: CollisionGeometry;
  transform: Transform;
  enabled: boolean;
}

/**
 * 安全区域实例
 */
interface SafetyZoneInstance {
  zone: SafetyZone;
  triggered: boolean;
  enteredTime?: number;
}

// ============================================================================
// Collision Manager Implementation
// ============================================================================

/**
 * 碰撞管理器
 */
export class CollisionManager implements ICollisionManager {
  private readonly geometries: Map<string, CollisionGeometryInstance> = new Map();
  private readonly safetyZones: Map<string, SafetyZoneInstance> = new Map();
  private readonly eventListeners: Set<CollisionEventCallback> = new Set();

  private visualizationConfig: CollisionVisualizationConfig = { ...DEFAULT_COLLISION_VISUALIZATION };
  private lastCollisionResult: CollisionResult | null = null;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  // ==========================================================================
  // Collision Geometry Management
  // ==========================================================================

  addCollisionGeometry(geometry: CollisionGeometry, transform?: Transform): void {
    const instance: CollisionGeometryInstance = {
      geometry,
      transform: transform ?? {
        position: { x: 0, y: 0, z: 0 },
        rotation: { w: 1, x: 0, y: 0, z: 0 },
      },
      enabled: true,
    };

    this.geometries.set(geometry.id, instance);
  }

  removeCollisionGeometry(id: string): void {
    this.geometries.delete(id);
  }

  updateCollisionGeometry(id: string, updates: Partial<CollisionGeometry>): void {
    const instance = this.geometries.get(id);
    if (!instance) {
      throw new Error(`Collision geometry '${id}' not found`);
    }

    instance.geometry = { ...instance.geometry, ...updates };
  }

  setCollisionGeometryTransform(id: string, transform: Transform): void {
    const instance = this.geometries.get(id);
    if (!instance) {
      throw new Error(`Collision geometry '${id}' not found`);
    }

    instance.transform = transform;
  }

  enableCollisionGeometry(id: string, enabled: boolean): void {
    const instance = this.geometries.get(id);
    if (!instance) {
      throw new Error(`Collision geometry '${id}' not found`);
    }

    instance.enabled = enabled;
  }

  getCollisionGeometry(id: string): CollisionGeometry | undefined {
    return this.geometries.get(id)?.geometry;
  }

  getAllCollisionGeometries(): CollisionGeometry[] {
    return Array.from(this.geometries.values()).map((i) => i.geometry);
  }

  clearCollisionGeometries(): void {
    this.geometries.clear();
  }

  // ==========================================================================
  // Safety Zone Management
  // ==========================================================================

  addSafetyZone(zone: SafetyZone): void {
    const instance: SafetyZoneInstance = {
      zone,
      triggered: false,
    };

    this.safetyZones.set(zone.id, instance);
  }

  removeSafetyZone(id: string): void {
    this.safetyZones.delete(id);
  }

  updateSafetyZone(id: string, updates: Partial<SafetyZone>): void {
    const instance = this.safetyZones.get(id);
    if (!instance) {
      throw new Error(`Safety zone '${id}' not found`);
    }

    instance.zone = { ...instance.zone, ...updates };
  }

  getSafetyZone(id: string): SafetyZone | undefined {
    return this.safetyZones.get(id)?.zone;
  }

  getAllSafetyZones(): SafetyZone[] {
    return Array.from(this.safetyZones.values()).map((i) => i.zone);
  }

  getSafetyZonesByLevel(level: SafetyLevel): SafetyZone[] {
    return Array.from(this.safetyZones.values())
      .filter((i) => i.zone.level === level)
      .map((i) => i.zone);
  }

  clearSafetyZones(): void {
    this.safetyZones.clear();
  }

  // ==========================================================================
  // Collision Detection
  // ==========================================================================

  checkCollisions(): CollisionResult {
    const pairs: CollisionPair[] = [];
    const geometryList = Array.from(this.geometries.values()).filter((g) => g.enabled);

    // 简单的 O(n^2) 碰撞检测
    // 实际应用中应使用空间分区结构优化
    for (let i = 0; i < geometryList.length; i++) {
      for (let j = i + 1; j < geometryList.length; j++) {
        const a = geometryList[i];
        const b = geometryList[j];

        const collision = this.checkPairCollision(a, b);
        if (collision) {
          pairs.push(collision);
        }
      }
    }

    const result: CollisionResult = {
      hasCollision: pairs.length > 0,
      pairs,
      timestamp: Date.now(),
    };

    // 发送碰撞事件
    if (result.hasCollision) {
      const previousHadCollision = this.lastCollisionResult?.hasCollision ?? false;
      if (!previousHadCollision) {
        this.emitEvent({
          type: 'collision_detected',
          timestamp: result.timestamp,
          pairs: result.pairs,
        } as CollisionDetectedEvent);
      }
    }

    this.lastCollisionResult = result;
    return result;
  }

  getLastCollisionResult(): CollisionResult | null {
    return this.lastCollisionResult;
  }

  getSafetyZoneTriggerStates(): SafetyZoneTriggerState[] {
    return Array.from(this.safetyZones.values()).map((instance) => ({
      zoneId: instance.zone.id,
      triggered: instance.triggered,
      enteredTime: instance.enteredTime,
      level: instance.zone.level,
    }));
  }

  // ==========================================================================
  // Path Collision Check
  // ==========================================================================

  checkPathCollision(request: PathCollisionCheckRequest): PathCollisionCheckResult {
    const { path, resolution = 0.01, robotId, geometryId } = request;
    const collisions: Array<{ pathIndex: number; position: Vector3; geometryId: string }> = [];

    // 沿路径采样检查
    for (let i = 0; i < path.length; i++) {
      const point = path[i];

      // 检查与所有几何体的碰撞
      for (const [id, instance] of this.geometries) {
        if (!instance.enabled) continue;
        if (geometryId && id !== geometryId) continue;

        if (this.isPointInGeometry(point, instance)) {
          collisions.push({
            pathIndex: i,
            position: point,
            geometryId: id,
          });
        }
      }
    }

    return {
      hasCollision: collisions.length > 0,
      collisions,
      checkedPoints: path.length,
    };
  }

  // ==========================================================================
  // Distance Query
  // ==========================================================================

  queryDistance(request: DistanceQueryRequest): DistanceQueryResult {
    const { point, geometryIds, maxDistance = Infinity } = request;
    let minDistance = Infinity;
    let closestGeometryId: string | undefined;
    let closestPoint: Vector3 | undefined;

    for (const [id, instance] of this.geometries) {
      if (!instance.enabled) continue;
      if (geometryIds && !geometryIds.includes(id)) continue;

      const result = this.computeDistanceToGeometry(point, instance);
      if (result.distance < minDistance && result.distance <= maxDistance) {
        minDistance = result.distance;
        closestGeometryId = id;
        closestPoint = result.closestPoint;
      }
    }

    return {
      distance: minDistance === Infinity ? -1 : minDistance,
      closestGeometryId,
      closestPoint,
    };
  }

  // ==========================================================================
  // Robot Safety Zone Check
  // ==========================================================================

  checkRobotInSafetyZones(robotId: string, tcpPosition: Vector3): SafetyZoneTriggerState[] {
    const states: SafetyZoneTriggerState[] = [];

    for (const [_, instance] of this.safetyZones) {
      const zone = instance.zone;

      // 检查机器人是否关联此安全区域
      if (zone.robotIds && !zone.robotIds.includes(robotId)) {
        continue;
      }

      const wasTriggered = instance.triggered;
      const isTriggered = this.isPointInSafetyZone(tcpPosition, zone);

      instance.triggered = isTriggered;

      if (isTriggered && !wasTriggered) {
        instance.enteredTime = Date.now();
        this.emitEvent({
          type: 'safety_zone_entered',
          timestamp: Date.now(),
          zoneId: zone.id,
          robotId,
          level: zone.level,
        } as SafetyZoneEnteredEvent);
      } else if (!isTriggered && wasTriggered) {
        this.emitEvent({
          type: 'safety_zone_exited',
          timestamp: Date.now(),
          zoneId: zone.id,
          robotId,
          level: zone.level,
        } as SafetyZoneExitedEvent);
        instance.enteredTime = undefined;
      }

      states.push({
        zoneId: zone.id,
        triggered: isTriggered,
        enteredTime: instance.enteredTime,
        level: zone.level,
      });
    }

    return states;
  }

  // ==========================================================================
  // Visualization
  // ==========================================================================

  setVisualizationConfig(config: Partial<CollisionVisualizationConfig>): void {
    this.visualizationConfig = { ...this.visualizationConfig, ...config };
  }

  getVisualizationConfig(): CollisionVisualizationConfig {
    return { ...this.visualizationConfig };
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onCollisionEvent(callback: CollisionEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  // ==========================================================================
  // Continuous Monitoring
  // ==========================================================================

  startContinuousCheck(intervalMs: number = 100): void {
    this.stopContinuousCheck();
    this.checkInterval = setInterval(() => {
      this.checkCollisions();
    }, intervalMs);
  }

  stopContinuousCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  dispose(): void {
    this.stopContinuousCheck();
    this.geometries.clear();
    this.safetyZones.clear();
    this.eventListeners.clear();
    this.lastCollisionResult = null;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private emitEvent(event: CollisionEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in collision event listener:', error);
      }
    }
  }

  private checkPairCollision(
    a: CollisionGeometryInstance,
    b: CollisionGeometryInstance
  ): CollisionPair | null {
    // 简化的碰撞检测 - 基于包围球
    const aCenter = a.transform.position;
    const bCenter = b.transform.position;

    const aRadius = this.getGeometryBoundingRadius(a.geometry);
    const bRadius = this.getGeometryBoundingRadius(b.geometry);

    const dx = aCenter.x - bCenter.x;
    const dy = aCenter.y - bCenter.y;
    const dz = aCenter.z - bCenter.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < aRadius + bRadius) {
      return {
        objectA: { type: a.geometry.associatedObjectType ?? 'geometry', id: a.geometry.id },
        objectB: { type: b.geometry.associatedObjectType ?? 'geometry', id: b.geometry.id },
        contactPoint: {
          x: (aCenter.x + bCenter.x) / 2,
          y: (aCenter.y + bCenter.y) / 2,
          z: (aCenter.z + bCenter.z) / 2,
        },
        penetrationDepth: (aRadius + bRadius) - distance,
      };
    }

    return null;
  }

  private getGeometryBoundingRadius(geometry: CollisionGeometry): number {
    const params = geometry.params;

    switch (geometry.type) {
      case 'sphere':
        return params.radius ?? 0;
      case 'box':
        const hx = (params.width ?? 0) / 2;
        const hy = (params.height ?? 0) / 2;
        const hz = (params.depth ?? 0) / 2;
        return Math.sqrt(hx * hx + hy * hy + hz * hz);
      case 'cylinder':
      case 'capsule':
        const r = params.radius ?? 0;
        const h = (params.height ?? 0) / 2;
        return Math.sqrt(r * r + h * h);
      default:
        return 0.1; // 默认半径
    }
  }

  private isPointInGeometry(
    point: Vector3,
    instance: CollisionGeometryInstance
  ): boolean {
    const geometry = instance.geometry;
    const center = instance.transform.position;
    const params = geometry.params;

    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const dz = point.z - center.z;

    switch (geometry.type) {
      case 'sphere':
        const distSq = dx * dx + dy * dy + dz * dz;
        return distSq <= (params.radius ?? 0) * (params.radius ?? 0);

      case 'box':
        const hx = (params.width ?? 0) / 2;
        const hy = (params.height ?? 0) / 2;
        const hz = (params.depth ?? 0) / 2;
        return Math.abs(dx) <= hx && Math.abs(dy) <= hy && Math.abs(dz) <= hz;

      case 'cylinder':
        const r = params.radius ?? 0;
        const h = (params.height ?? 0) / 2;
        const distXZ = Math.sqrt(dx * dx + dz * dz);
        return distXZ <= r && Math.abs(dy) <= h;

      default:
        return false;
    }
  }

  private isPointInSafetyZone(point: Vector3, zone: SafetyZone): boolean {
    // 使用安全区域的几何体检查
    const center = zone.transform.position;
    const params = zone.params;

    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const dz = point.z - center.z;

    switch (zone.type) {
      case 'sphere':
        const distSq = dx * dx + dy * dy + dz * dz;
        return distSq <= (params.radius ?? 0) * (params.radius ?? 0);

      case 'box':
        const hx = (params.width ?? 0) / 2;
        const hy = (params.height ?? 0) / 2;
        const hz = (params.depth ?? 0) / 2;
        return Math.abs(dx) <= hx && Math.abs(dy) <= hy && Math.abs(dz) <= hz;

      case 'cylinder':
        const r = params.radius ?? 0;
        const h = (params.height ?? 0) / 2;
        const distXZ = Math.sqrt(dx * dx + dz * dz);
        return distXZ <= r && Math.abs(dy) <= h;

      default:
        return false;
    }
  }

  private computeDistanceToGeometry(
    point: Vector3,
    instance: CollisionGeometryInstance
  ): { distance: number; closestPoint: Vector3 } {
    const center = instance.transform.position;
    const params = instance.geometry.params;

    // 简化实现 - 仅计算到中心的距离
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const dz = point.z - center.z;
    const distToCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const boundingRadius = this.getGeometryBoundingRadius(instance.geometry);
    const distance = Math.max(0, distToCenter - boundingRadius);

    // 简化的最近点计算
    const closestPoint: Vector3 = distance === 0 ? point : {
      x: center.x + (dx / distToCenter) * boundingRadius,
      y: center.y + (dy / distToCenter) * boundingRadius,
      z: center.z + (dz / distToCenter) * boundingRadius,
    };

    return { distance, closestPoint };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建碰撞管理器
 */
export function createCollisionManager(): CollisionManager {
  return new CollisionManager();
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalCollisionManager: CollisionManager | null = null;

/**
 * 获取全局碰撞管理器
 */
export function getCollisionManager(): CollisionManager {
  if (!globalCollisionManager) {
    globalCollisionManager = createCollisionManager();
  }
  return globalCollisionManager;
}

/**
 * 重置全局碰撞管理器
 */
export function resetCollisionManager(): void {
  if (globalCollisionManager) {
    globalCollisionManager.dispose();
    globalCollisionManager = null;
  }
}
