/**
 * Cable Management Capability
 *
 * Provides cable/wire harness management for industrial robots.
 * Tracks cable twist, prevents entanglement, and integrates with motion planning.
 *
 * @example
 * ```tsx
 * import {
 *   CableManagementProvider,
 *   CableVisualizer,
 *   CableTwistGauge,
 *   CableStatusIndicator,
 *   CABLE_PRESETS,
 *   DEFAULT_TWIST_CONSTRAINTS,
 * } from '@roboviz/core/capabilities/cable-management';
 *
 * function RobotScene() {
 *   return (
 *     <CableManagementProvider
 *       robotId="main-robot"
 *       initialCables={[{
 *         id: 'welding-cable',
 *         anchorPoint: { type: 'world', offset: [-0.5, 0, 0] },
 *         attachmentPoint: { type: 'tcp', offset: [0, 0, 0] },
 *         properties: { ...CABLE_PRESETS.welding, label: 'Welding Cable' },
 *         twistConstraints: DEFAULT_TWIST_CONSTRAINTS,
 *       }]}
 *     >
 *       <Canvas>
 *         <Robot id="main-robot" />
 *         <CableVisualizer robotId="main-robot" />
 *       </Canvas>
 *       <CableTwistGauge cableId="welding-cable" />
 *       <CableStatusIndicator />
 *     </CableManagementProvider>
 *   );
 * }
 * ```
 */

// Provider
export { CableManagementProvider } from './CableManagementContext';

// Hooks
export {
  useCableManagement,
  useCableManagementState,
  useCableManagementActions,
  useCableState,
  useCableConfig,
  useAllCableStates,
  useAllCableConfigs,
  useCableWarningLevel,
  useCableDisplaySettings,
  useTwistHistory,
  useCableEvents,
} from './CableManagementContext';

export { useCablePlanning } from './hooks/useCablePlanning';
export type { UseCablePlanningOptions, UseCablePlanningReturn } from './hooks/useCablePlanning';

// Components
export {
  CableVisualizer,
  CablePathOverlay,
  CableTwistGauge,
  CableTwistMiniGauge,
  CableStatusIndicator,
  CableStatusBadge,
} from './components';

export type {
  CableVisualizerProps,
  CablePathOverlayProps,
  CableTwistGaugeProps,
  CableTwistMiniGaugeProps,
  CableStatusIndicatorProps,
  CableStatusBadgeProps,
} from './components';

// Types
export type {
  // Basic types
  CableAttachment,
  CableProperties,
  CableType,
  CableTwistConstraints,
  CableConfig,
  // State types
  CableState,
  CableWarningLevel,
  TwistHistoryPoint,
  CableManagementState,
  CableDisplaySettings,
  // Analysis types
  TrajectoryTwistAnalysis,
  TrajectoryWarningPoint,
  TwistProfilePoint,
  TwistOptimizationSuggestion,
  // Planning types
  CableAwarePlanRequest,
  CableAwarePlanOptions,
  CableAwarePlanResult,
  CycleOptimizationRequest,
  CycleOptimizationResult,
  // Event types
  CableEvent,
  CableEventHandler,
  // Actions
  CableManagementActions,
  // Provider props
  CableManagementProviderProps,
} from './types';

// Constants and presets
export {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_TWIST_CONSTRAINTS,
  WARNING_LEVEL_COLORS,
  WARNING_LEVEL_PRIORITY,
  CABLE_PRESETS,
  UPDATE_CONSTANTS,
  TWIST_CONSTANTS,
  VISUALIZATION_CONSTANTS,
  createDefaultCableConfig,
  getWarningLevelFromTwist,
  isMoreSevere,
  getMostSevereLevel,
} from './constants';

// Utilities
export {
  // Twist calculator
  calculateTcpTwist,
  calculateJointBasedTwist,
  unwrapAngle,
  TwistTracker,
  analyzeTrajectoryTwist,
  estimateTwistDelta,
  suggestUnwindConfiguration,
  // Spline generator
  generateCableSpline,
  generateCatenaryPath,
  generateCablePathAlongRobot,
  sampleCurvePoints,
  getCurveLength,
  getTangentAtPoint,
  calculateCurvatureProfile,
  checkMinBendRadius,
  createTubeGeometry,
  smoothPoints,
  // Color mapping
  getWarningLevelColor,
  getTwistGradientColor,
  getStressColor,
  lerpColor,
  hexToRgb,
  rgbToHex,
  generateStressColorArray,
  generateGradientTextureData,
  CABLE_COLOR_PALETTE,
  getCableColor,
  adjustBrightness,
  getContrastColor,
} from './utils';

export type { Pose3D } from './utils/twist-calculator';
