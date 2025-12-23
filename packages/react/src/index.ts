/**
 * @aspect/roboviz-react
 * 
 * React bindings for RoboViz
 */

export { RoboViz, type RoboVizProps } from './RoboViz';
export { useRoboViz } from './useRoboViz';
export { useRoboVizBridge, type RoboVizBridge } from './useRoboVizBridge';
export { RoboVizContext, RoboVizProvider } from './context';

// TODO: Re-export core types when package is built
// These types will be re-exported from @aspect/roboviz-core once built
// For now, define minimal placeholder types
export interface Vector3 { x: number; y: number; z: number; }
export interface Quaternion { w: number; x: number; y: number; z: number; }
export interface Transform { position: Vector3; rotation: Quaternion; }
export interface Pose { position: Vector3; orientation: Quaternion; }
