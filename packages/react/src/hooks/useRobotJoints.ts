/**
 * useRobotJoints - Hook for robot joint control
 *
 * Provides convenient access to robot joint angles and control methods.
 */

import * as React from 'react';
import { useRoboVizInstance, useRoboVizStore } from '../context/RoboVizProvider';
import type { UseRobotJointsReturn } from '../types';

/**
 * Hook for controlling robot joints
 *
 * @param robotId - The ID of the robot to control
 * @returns Joint state and control functions
 *
 * @example
 * ```tsx
 * function JointSliders({ robotId }: { robotId: string }) {
 *   const {
 *     jointAngles,
 *     jointNames,
 *     jointLimits,
 *     setJointAngle,
 *     setAllJointAngles,
 *     goToHome,
 *   } = useRobotJoints(robotId);
 *
 *   return (
 *     <div>
 *       {jointAngles.map((angle, index) => (
 *         <div key={index}>
 *           <label>{jointNames[index] || `Joint ${index + 1}`}</label>
 *           <input
 *             type="range"
 *             min={jointLimits[index]?.[0] ?? -Math.PI}
 *             max={jointLimits[index]?.[1] ?? Math.PI}
 *             step={0.01}
 *             value={angle}
 *             onChange={(e) => setJointAngle(index, parseFloat(e.target.value))}
 *           />
 *           <span>{angle.toFixed(2)}</span>
 *         </div>
 *       ))}
 *
 *       <button onClick={goToHome}>Go to Home</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRobotJoints(robotId: string): UseRobotJointsReturn {
  const instance = useRoboVizInstance();
  const robots = useRoboVizStore((state) => state.robots);

  // Get robot state
  const robot = robots.get(robotId);

  // Extract joint information
  const jointAngles = robot?.jointAngles ?? [];
  const jointNames = robot?.info?.jointNames ?? [];
  const jointLimits = robot?.info?.jointLimits ?? [];

  // Set a single joint angle
  const setJointAngle = React.useCallback(
    (index: number, value: number) => {
      if (!robot) return;

      const newAngles = [...robot.jointAngles];
      newAngles[index] = value;
      instance.setRobotJoints(robotId, newAngles);
    },
    [instance, robotId, robot]
  );

  // Set all joint angles
  const setAllJointAngles = React.useCallback(
    (angles: number[]) => {
      instance.setRobotJoints(robotId, angles);
    },
    [instance, robotId]
  );

  // Reset to home position (all zeros)
  const goToHome = React.useCallback(() => {
    if (!robot) return;

    const homeAngles = robot.jointAngles.map(() => 0);
    instance.setRobotJoints(robotId, homeAngles);
  }, [instance, robotId, robot]);

  return {
    jointAngles,
    jointNames,
    jointLimits,
    setJointAngle,
    setAllJointAngles,
    goToHome,
  };
}
