/**
 * RoboViz Collision Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for collision.* and safetyZone.* namespaces
 */

import type { MethodHandler } from '../handler';
import type { Vector3, Transform } from '../../types';
import type {
  CollisionGeometry,
  SafetyZone,
  SafetyLevel,
  CollisionResult,
  SafetyZoneTriggerState,
  CollisionVisualizationConfig,
  PathCollisionCheckRequest,
  PathCollisionCheckResult,
  DistanceQueryRequest,
  DistanceQueryResult,
} from '../../collision/types';
import { getCollisionManager } from '../../collision/collision-manager';

// ============================================================================
// Collision Geometry Handlers
// ============================================================================

/**
 * collision.addGeometry - 添加碰撞几何体
 */
export const collisionAddGeometry: MethodHandler<
  { geometry: CollisionGeometry; transform?: Transform },
  { success: boolean }
> = (params) => {
  const manager = getCollisionManager();
  manager.addCollisionGeometry(params.geometry, params.transform);
  return { success: true };
};

/**
 * collision.removeGeometry - 移除碰撞几何体
 */
export const collisionRemoveGeometry: MethodHandler<{ id: string }, { success: boolean }> = (
  params
) => {
  const manager = getCollisionManager();
  manager.removeCollisionGeometry(params.id);
  return { success: true };
};

/**
 * collision.updateGeometry - 更新碰撞几何体
 */
export const collisionUpdateGeometry: MethodHandler<
  { id: string; updates: Partial<CollisionGeometry> },
  { success: boolean }
> = (params) => {
  const manager = getCollisionManager();
  manager.updateCollisionGeometry(params.id, params.updates);
  return { success: true };
};

/**
 * collision.setGeometryTransform - 设置几何体变换
 */
export const collisionSetGeometryTransform: MethodHandler<
  { id: string; transform: Transform },
  { success: boolean }
> = (params) => {
  const manager = getCollisionManager();
  manager.setCollisionGeometryTransform(params.id, params.transform);
  return { success: true };
};

/**
 * collision.enableGeometry - 启用/禁用几何体
 */
export const collisionEnableGeometry: MethodHandler<
  { id: string; enabled: boolean },
  { success: boolean }
> = (params) => {
  const manager = getCollisionManager();
  manager.enableCollisionGeometry(params.id, params.enabled);
  return { success: true };
};

/**
 * collision.getGeometry - 获取几何体
 */
export const collisionGetGeometry: MethodHandler<
  { id: string },
  { geometry: CollisionGeometry | null }
> = (params) => {
  const manager = getCollisionManager();
  const geometry = manager.getCollisionGeometry(params.id);
  return { geometry: geometry ?? null };
};

/**
 * collision.listGeometries - 列出所有几何体
 */
export const collisionListGeometries: MethodHandler<
  Record<string, never>,
  { geometries: Array<{ id: string; type: string; enabled: boolean }> }
> = () => {
  const manager = getCollisionManager();
  const geometries = manager.getAllCollisionGeometries().map((g) => ({
    id: g.id,
    type: g.type,
    enabled: true, // TODO: 获取实际启用状态
  }));
  return { geometries };
};

/**
 * collision.clearGeometries - 清除所有几何体
 */
export const collisionClearGeometries: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getCollisionManager();
  manager.clearCollisionGeometries();
  return { success: true };
};

// ============================================================================
// Collision Check Handlers
// ============================================================================

/**
 * collision.check - 执行碰撞检测
 */
export const collisionCheck: MethodHandler<Record<string, never>, CollisionResult> = () => {
  const manager = getCollisionManager();
  return manager.checkCollisions();
};

/**
 * collision.getLastResult - 获取上次碰撞结果
 */
export const collisionGetLastResult: MethodHandler<
  Record<string, never>,
  { result: CollisionResult | null }
> = () => {
  const manager = getCollisionManager();
  return { result: manager.getLastCollisionResult() };
};

/**
 * collision.checkPath - 检查路径碰撞
 */
export const collisionCheckPath: MethodHandler<
  PathCollisionCheckRequest,
  PathCollisionCheckResult
> = (params) => {
  const manager = getCollisionManager();
  return manager.checkPathCollision(params);
};

/**
 * collision.queryDistance - 距离查询
 */
export const collisionQueryDistance: MethodHandler<
  DistanceQueryRequest,
  DistanceQueryResult
> = (params) => {
  const manager = getCollisionManager();
  return manager.queryDistance(params);
};

// ============================================================================
// Safety Zone Handlers
// ============================================================================

/**
 * safetyZone.add - 添加安全区域
 */
export const safetyZoneAdd: MethodHandler<SafetyZone, { success: boolean }> = (params) => {
  const manager = getCollisionManager();
  manager.addSafetyZone(params);
  return { success: true };
};

/**
 * safetyZone.remove - 移除安全区域
 */
export const safetyZoneRemove: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getCollisionManager();
  manager.removeSafetyZone(params.id);
  return { success: true };
};

/**
 * safetyZone.update - 更新安全区域
 */
export const safetyZoneUpdate: MethodHandler<
  { id: string; updates: Partial<SafetyZone> },
  { success: boolean }
> = (params) => {
  const manager = getCollisionManager();
  manager.updateSafetyZone(params.id, params.updates);
  return { success: true };
};

/**
 * safetyZone.get - 获取安全区域
 */
export const safetyZoneGet: MethodHandler<{ id: string }, { zone: SafetyZone | null }> = (
  params
) => {
  const manager = getCollisionManager();
  const zone = manager.getSafetyZone(params.id);
  return { zone: zone ?? null };
};

/**
 * safetyZone.list - 列出所有安全区域
 */
export const safetyZoneList: MethodHandler<
  { level?: SafetyLevel },
  { zones: Array<{ id: string; name: string; level: SafetyLevel }> }
> = (params) => {
  const manager = getCollisionManager();
  let zones = manager.getAllSafetyZones();

  if (params.level) {
    zones = zones.filter((z) => z.level === params.level);
  }

  return {
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      level: z.level,
    })),
  };
};

/**
 * safetyZone.clear - 清除所有安全区域
 */
export const safetyZoneClear: MethodHandler<Record<string, never>, { success: boolean }> = () => {
  const manager = getCollisionManager();
  manager.clearSafetyZones();
  return { success: true };
};

/**
 * safetyZone.getTriggerStates - 获取触发状态
 */
export const safetyZoneGetTriggerStates: MethodHandler<
  Record<string, never>,
  { states: SafetyZoneTriggerState[] }
> = () => {
  const manager = getCollisionManager();
  return { states: manager.getSafetyZoneTriggerStates() };
};

/**
 * safetyZone.checkRobot - 检查机器人在安全区域中的状态
 */
export const safetyZoneCheckRobot: MethodHandler<
  { robotId: string; tcpPosition: Vector3 },
  { states: SafetyZoneTriggerState[] }
> = (params) => {
  const manager = getCollisionManager();
  return { states: manager.checkRobotInSafetyZones(params.robotId, params.tcpPosition) };
};

// ============================================================================
// Visualization Handlers
// ============================================================================

/**
 * collision.setVisualization - 设置可视化配置
 */
export const collisionSetVisualization: MethodHandler<
  Partial<CollisionVisualizationConfig>,
  { success: boolean }
> = (params) => {
  const manager = getCollisionManager();
  manager.setVisualizationConfig(params);
  return { success: true };
};

/**
 * collision.getVisualization - 获取可视化配置
 */
export const collisionGetVisualization: MethodHandler<
  Record<string, never>,
  { config: CollisionVisualizationConfig }
> = () => {
  const manager = getCollisionManager();
  return { config: manager.getVisualizationConfig() };
};

// ============================================================================
// Continuous Check Handlers
// ============================================================================

/**
 * collision.startContinuousCheck - 开始持续检测
 */
export const collisionStartContinuousCheck: MethodHandler<
  { intervalMs?: number },
  { success: boolean }
> = (params) => {
  const manager = getCollisionManager();
  manager.startContinuousCheck(params.intervalMs);
  return { success: true };
};

/**
 * collision.stopContinuousCheck - 停止持续检测
 */
export const collisionStopContinuousCheck: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getCollisionManager();
  manager.stopContinuousCheck();
  return { success: true };
};

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * 注册所有碰撞处理器到 dispatcher
 *
 * 使用类型安全的逐个注册方式，而不是使用 Record 存储异构类型
 */
export function registerCollisionHandlers(
  register: <TParams, TResult>(method: string, handler: MethodHandler<TParams, TResult>) => void
): void {
  // Geometry
  register('collision.addGeometry', collisionAddGeometry);
  register('collision.removeGeometry', collisionRemoveGeometry);
  register('collision.updateGeometry', collisionUpdateGeometry);
  register('collision.setGeometryTransform', collisionSetGeometryTransform);
  register('collision.enableGeometry', collisionEnableGeometry);
  register('collision.getGeometry', collisionGetGeometry);
  register('collision.listGeometries', collisionListGeometries);
  register('collision.clearGeometries', collisionClearGeometries);

  // Collision check
  register('collision.check', collisionCheck);
  register('collision.getLastResult', collisionGetLastResult);
  register('collision.checkPath', collisionCheckPath);
  register('collision.queryDistance', collisionQueryDistance);

  // Safety zones
  register('safetyZone.add', safetyZoneAdd);
  register('safetyZone.remove', safetyZoneRemove);
  register('safetyZone.update', safetyZoneUpdate);
  register('safetyZone.get', safetyZoneGet);
  register('safetyZone.list', safetyZoneList);
  register('safetyZone.clear', safetyZoneClear);
  register('safetyZone.getTriggerStates', safetyZoneGetTriggerStates);
  register('safetyZone.checkRobot', safetyZoneCheckRobot);

  // Visualization
  register('collision.setVisualization', collisionSetVisualization);
  register('collision.getVisualization', collisionGetVisualization);

  // Continuous check
  register('collision.startContinuousCheck', collisionStartContinuousCheck);
  register('collision.stopContinuousCheck', collisionStopContinuousCheck);
}
