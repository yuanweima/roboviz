/**
 * RoboViz Diagnostic Module
 *
 * 调试诊断模块
 */

// Types
export type {
  JointDiagnosticDataType,
  TcpDiagnosticDataType,
  DiagnosticDisplayMode,
  DiagnosticDisplayConfig,
  WorkspaceVisType,
  WorkspaceVisConfig,
  SingularityType,
  SingularityConfig,
  SingularityState,
  JointLimitConfig,
  JointLimitState,
  VelocityVisConfig,
  IDiagnosticManager,
  DiagnosticEventType,
  DiagnosticEvent,
} from './types';

// Diagnostic Manager
export {
  DiagnosticManager,
  createDiagnosticManager,
  getDiagnosticManager,
  resetDiagnosticManager,
} from './diagnostic-manager';
export type { DiagnosticManagerConfig } from './diagnostic-manager';
