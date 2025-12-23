/**
 * RoboViz Diagnostic Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for diagnostic.* namespace
 */

import type { MethodHandler } from '../handler';
import type {
  DiagnosticDisplayConfig,
  WorkspaceVisConfig,
  SingularityConfig,
  SingularityState,
  JointLimitConfig,
  JointLimitState,
  VelocityVisConfig,
} from '../../diagnostic/types';
import { getDiagnosticManager } from '../../diagnostic/diagnostic-manager';

// ============================================================================
// Joint Diagnostic Handlers
// ============================================================================

/**
 * diagnostic.showJoint - 显示关节诊断
 */
export const diagnosticShowJoint: MethodHandler<DiagnosticDisplayConfig, { success: boolean }> = (
  params
) => {
  const manager = getDiagnosticManager();
  manager.showJointDiagnostic(params);
  return { success: true };
};

/**
 * diagnostic.hideJoint - 隐藏关节诊断
 */
export const diagnosticHideJoint: MethodHandler<{ robotId: string }, { success: boolean }> = (
  params
) => {
  const manager = getDiagnosticManager();
  manager.hideJointDiagnostic(params.robotId);
  return { success: true };
};

/**
 * diagnostic.updateJoint - 更新关节诊断配置
 */
export const diagnosticUpdateJoint: MethodHandler<
  { robotId: string; updates: Partial<DiagnosticDisplayConfig> },
  { success: boolean }
> = (params) => {
  const manager = getDiagnosticManager();
  manager.updateJointDiagnostic(params.robotId, params.updates);
  return { success: true };
};

/**
 * diagnostic.getJointConfig - 获取关节诊断配置
 */
export const diagnosticGetJointConfig: MethodHandler<
  { robotId: string },
  { config: DiagnosticDisplayConfig | null }
> = (params) => {
  const manager = getDiagnosticManager();
  const config = manager.getJointDiagnosticConfig(params.robotId);
  return { config: config ?? null };
};

// ============================================================================
// Workspace Visualization Handlers
// ============================================================================

/**
 * diagnostic.showWorkspace - 显示工作空间
 */
export const diagnosticShowWorkspace: MethodHandler<
  WorkspaceVisConfig,
  { success: boolean }
> = async (params) => {
  const manager = getDiagnosticManager();
  await manager.showWorkspace(params);
  return { success: true };
};

/**
 * diagnostic.hideWorkspace - 隐藏工作空间
 */
export const diagnosticHideWorkspace: MethodHandler<{ robotId: string }, { success: boolean }> = (
  params
) => {
  const manager = getDiagnosticManager();
  manager.hideWorkspace(params.robotId);
  return { success: true };
};

/**
 * diagnostic.getWorkspaceConfig - 获取工作空间配置
 */
export const diagnosticGetWorkspaceConfig: MethodHandler<
  { robotId: string },
  { config: WorkspaceVisConfig | null }
> = (params) => {
  const manager = getDiagnosticManager();
  const config = manager.getWorkspaceVisConfig(params.robotId);
  return { config: config ?? null };
};

// ============================================================================
// Singularity Handlers
// ============================================================================

/**
 * diagnostic.showSingularity - 显示奇异点可视化
 */
export const diagnosticShowSingularity: MethodHandler<
  SingularityConfig,
  { success: boolean }
> = (params) => {
  const manager = getDiagnosticManager();
  manager.showSingularity(params);
  return { success: true };
};

/**
 * diagnostic.hideSingularity - 隐藏奇异点可视化
 */
export const diagnosticHideSingularity: MethodHandler<{ robotId: string }, { success: boolean }> = (
  params
) => {
  const manager = getDiagnosticManager();
  manager.hideSingularity(params.robotId);
  return { success: true };
};

/**
 * diagnostic.getSingularityState - 获取奇异点状态
 */
export const diagnosticGetSingularityState: MethodHandler<
  { robotId: string },
  { state: SingularityState | null }
> = (params) => {
  const manager = getDiagnosticManager();
  const state = manager.getSingularityState(params.robotId);
  return { state: state ?? null };
};

/**
 * diagnostic.getSingularityConfig - 获取奇异点配置
 */
export const diagnosticGetSingularityConfig: MethodHandler<
  { robotId: string },
  { config: SingularityConfig | null }
> = (params) => {
  const manager = getDiagnosticManager();
  const config = manager.getSingularityConfig(params.robotId);
  return { config: config ?? null };
};

// ============================================================================
// Joint Limits Handlers
// ============================================================================

/**
 * diagnostic.showJointLimits - 显示关节限位
 */
export const diagnosticShowJointLimits: MethodHandler<
  JointLimitConfig,
  { success: boolean }
> = (params) => {
  const manager = getDiagnosticManager();
  manager.showJointLimits(params);
  return { success: true };
};

/**
 * diagnostic.hideJointLimits - 隐藏关节限位
 */
export const diagnosticHideJointLimits: MethodHandler<{ robotId: string }, { success: boolean }> = (
  params
) => {
  const manager = getDiagnosticManager();
  manager.hideJointLimits(params.robotId);
  return { success: true };
};

/**
 * diagnostic.getJointLimitStates - 获取关节限位状态
 */
export const diagnosticGetJointLimitStates: MethodHandler<
  { robotId: string },
  { states: JointLimitState[] }
> = (params) => {
  const manager = getDiagnosticManager();
  const states = manager.getJointLimitStates(params.robotId);
  return { states };
};

/**
 * diagnostic.getJointLimitConfig - 获取关节限位配置
 */
export const diagnosticGetJointLimitConfig: MethodHandler<
  { robotId: string },
  { config: JointLimitConfig | null }
> = (params) => {
  const manager = getDiagnosticManager();
  const config = manager.getJointLimitConfig(params.robotId);
  return { config: config ?? null };
};

// ============================================================================
// Velocity Visualization Handlers
// ============================================================================

/**
 * diagnostic.showVelocity - 显示速度可视化
 */
export const diagnosticShowVelocity: MethodHandler<VelocityVisConfig, { success: boolean }> = (
  params
) => {
  const manager = getDiagnosticManager();
  manager.showVelocityVis(params);
  return { success: true };
};

/**
 * diagnostic.hideVelocity - 隐藏速度可视化
 */
export const diagnosticHideVelocity: MethodHandler<{ robotId: string }, { success: boolean }> = (
  params
) => {
  const manager = getDiagnosticManager();
  manager.hideVelocityVis(params.robotId);
  return { success: true };
};

/**
 * diagnostic.getVelocityConfig - 获取速度可视化配置
 */
export const diagnosticGetVelocityConfig: MethodHandler<
  { robotId: string },
  { config: VelocityVisConfig | null }
> = (params) => {
  const manager = getDiagnosticManager();
  const config = manager.getVelocityVisConfig(params.robotId);
  return { config: config ?? null };
};

// ============================================================================
// Global Control Handlers
// ============================================================================

/**
 * diagnostic.hideAll - 隐藏所有诊断
 */
export const diagnosticHideAll: MethodHandler<Record<string, never>, { success: boolean }> = () => {
  const manager = getDiagnosticManager();
  manager.hideAll();
  return { success: true };
};

/**
 * diagnostic.getActive - 获取活跃诊断
 */
export const diagnosticGetActive: MethodHandler<
  Record<string, never>,
  { robotIds: string[] }
> = () => {
  const manager = getDiagnosticManager();
  return { robotIds: manager.getActiveDiagnostics() };
};

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * 所有诊断处理器
 */
export const diagnosticHandlers: Record<string, MethodHandler> = {
  // Joint Diagnostic
  'diagnostic.showJoint': diagnosticShowJoint,
  'diagnostic.hideJoint': diagnosticHideJoint,
  'diagnostic.updateJoint': diagnosticUpdateJoint,
  'diagnostic.getJointConfig': diagnosticGetJointConfig,

  // Workspace
  'diagnostic.showWorkspace': diagnosticShowWorkspace,
  'diagnostic.hideWorkspace': diagnosticHideWorkspace,
  'diagnostic.getWorkspaceConfig': diagnosticGetWorkspaceConfig,

  // Singularity
  'diagnostic.showSingularity': diagnosticShowSingularity,
  'diagnostic.hideSingularity': diagnosticHideSingularity,
  'diagnostic.getSingularityState': diagnosticGetSingularityState,
  'diagnostic.getSingularityConfig': diagnosticGetSingularityConfig,

  // Joint Limits
  'diagnostic.showJointLimits': diagnosticShowJointLimits,
  'diagnostic.hideJointLimits': diagnosticHideJointLimits,
  'diagnostic.getJointLimitStates': diagnosticGetJointLimitStates,
  'diagnostic.getJointLimitConfig': diagnosticGetJointLimitConfig,

  // Velocity
  'diagnostic.showVelocity': diagnosticShowVelocity,
  'diagnostic.hideVelocity': diagnosticHideVelocity,
  'diagnostic.getVelocityConfig': diagnosticGetVelocityConfig,

  // Global
  'diagnostic.hideAll': diagnosticHideAll,
  'diagnostic.getActive': diagnosticGetActive,
};

/**
 * 注册所有诊断处理器到 dispatcher
 */
export function registerDiagnosticHandlers(
  registerMethod: (method: string, handler: MethodHandler) => void
): void {
  for (const [method, handler] of Object.entries(diagnosticHandlers)) {
    registerMethod(method, handler);
  }
}
