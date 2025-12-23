/**
 * createRoboViz - Factory function for creating RoboViz instances
 *
 * This is the primary entry point for imperative/vanilla JavaScript usage.
 */

import { RoboVizInstance } from './RoboVizInstance';
import type { RoboVizConfig, IRoboVizInstance } from '../types';

/**
 * Create a new RoboViz visualization instance
 *
 * This factory function creates a new RoboViz instance that can be used
 * imperatively in vanilla JavaScript, Vue, Angular, or any other framework.
 *
 * @param config - Configuration options
 * @returns A RoboViz instance
 *
 * @example Basic Usage
 * ```typescript
 * import { createRoboViz } from '@aspect/roboviz-react';
 *
 * // Create and mount to a container
 * const viz = createRoboViz({
 *   container: '#roboviz-container',
 * });
 *
 * // Add a robot
 * const robotId = viz.addRobot({
 *   urdf: '/models/fanuc.urdf',
 * });
 *
 * // Control the robot
 * viz.setRobotJoints(robotId, [0, 0.5, 0.8, 0, 0, 0]);
 *
 * // Subscribe to events
 * viz.on('robot:click', (event) => {
 *   console.log('Robot clicked:', event.robotId);
 * });
 *
 * // Cleanup when done
 * viz.dispose();
 * ```
 *
 * @example With WebSocket Transport
 * ```typescript
 * const viz = createRoboViz({
 *   container: '#roboviz-container',
 *   transport: {
 *     type: 'websocket',
 *     url: 'ws://localhost:9876',
 *   },
 *   autoConnect: true,
 * });
 *
 * // The instance will automatically connect to the WebSocket server
 * viz.on('connect', () => {
 *   console.log('Connected to visualization server');
 * });
 * ```
 *
 * @example Headless Mode (State Management Only)
 * ```typescript
 * const viz = createRoboViz({
 *   headless: true,
 *   transport: {
 *     type: 'websocket',
 *     url: 'ws://localhost:9876',
 *   },
 * });
 *
 * // Use for state synchronization without rendering
 * viz.on('robot:joints-changed', (event) => {
 *   // Update your custom renderer
 *   myRenderer.updateJoints(event.robotId, event.angles);
 * });
 * ```
 *
 * @example Deferred Mounting
 * ```typescript
 * // Create without mounting
 * const viz = createRoboViz({
 *   scene: { background: '#1a1a2e' },
 * });
 *
 * // Setup state
 * viz.addRobot({ urdf: '/models/robot.urdf' });
 *
 * // Mount later when container is ready
 * viz.mount('#roboviz-container');
 *
 * // Or unmount and remount to a different container
 * viz.unmount();
 * viz.mount('#another-container');
 * ```
 */
export function createRoboViz(config: RoboVizConfig = {}): IRoboVizInstance {
  const instance = new RoboVizInstance(config);

  // Auto-mount if container is specified and not headless
  if (config.container && !config.headless) {
    instance.mount(config.container);
  }

  // Auto-connect if configured
  if (config.autoConnect && config.transport && config.transport.type !== 'none') {
    // Use setTimeout to allow instance to be returned first
    setTimeout(() => {
      instance.connect().catch((error) => {
        console.error('[createRoboViz] Auto-connect failed:', error);
        instance.emit('error', { error, context: 'auto-connect' });
      });
    }, 0);
  }

  return instance;
}

/**
 * Create multiple RoboViz instances at once
 *
 * Useful for dashboards or multi-robot scenarios where you need
 * to create several instances with similar configurations.
 *
 * @param configs - Array of configuration objects
 * @returns Array of RoboViz instances
 *
 * @example Multi-Robot Dashboard
 * ```typescript
 * const instances = createMultipleRoboViz([
 *   {
 *     container: '#robot-1',
 *     transport: { type: 'websocket', url: 'ws://robot1:9876' },
 *   },
 *   {
 *     container: '#robot-2',
 *     transport: { type: 'websocket', url: 'ws://robot2:9876' },
 *   },
 * ]);
 *
 * // Control all instances
 * instances.forEach((viz) => {
 *   viz.on('robot:click', console.log);
 * });
 *
 * // Cleanup all
 * instances.forEach((viz) => viz.dispose());
 * ```
 */
export function createMultipleRoboViz(configs: RoboVizConfig[]): IRoboVizInstance[] {
  return configs.map((config) => createRoboViz(config));
}

/**
 * Quick helper to create a simple visualization
 *
 * This is a convenience function for the most common use case:
 * displaying a single robot with minimal configuration.
 *
 * @param container - Container element or CSS selector
 * @param urdf - URL or content of the URDF file
 * @param options - Additional options
 * @returns A RoboViz instance with the robot already added
 *
 * @example
 * ```typescript
 * const { instance, robotId } = createSimpleRoboViz(
 *   '#viewer',
 *   '/models/fanuc.urdf'
 * );
 *
 * // Control the robot
 * instance.setRobotJoints(robotId, [0, 0.5, 0.8, 0, 0, 0]);
 * ```
 */
export function createSimpleRoboViz(
  container: HTMLElement | string,
  urdf: string,
  options: {
    jointAngles?: number[];
    scene?: Partial<RoboVizConfig['scene']>;
    camera?: Partial<RoboVizConfig['camera']>;
  } = {}
): { instance: IRoboVizInstance; robotId: string } {
  const instance = createRoboViz({
    container,
    scene: options.scene,
    camera: options.camera,
  });

  const robotId = instance.addRobot({
    urdf,
    jointAngles: options.jointAngles,
  });

  return { instance, robotId };
}
