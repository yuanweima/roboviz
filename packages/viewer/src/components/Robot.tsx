/**
 * Robot component wrapper for Viewer
 * Uses the core Robot component with viewer store data
 */
import { useCallback } from 'react';
import { Robot as CoreRobot } from '@aspect/roboviz-core';
import type { Pose as CorePose } from '@aspect/roboviz-core';
import { useViewerStore } from '../store/viewerStore';
import type { RobotState, Pose } from '../types';

export interface RobotProps {
  data: RobotState;
  /** Callback when robot is clicked */
  onSelect?: (robotId: string, linkName?: string) => void;
  /** Callback when joint angles change via dragging */
  onJointChange?: (robotId: string, angles: number[]) => void;
}

export function Robot({ data, onSelect, onJointChange }: RobotProps) {
  const { setRobotTcpPose, setRobotJoints } = useViewerStore();

  // Update TCP pose in store when end effector moves
  const handleEndEffectorUpdate = useCallback((pose: CorePose) => {
    const viewerPose: Pose = {
      position: pose.position,
      orientation: pose.orientation,
    };
    setRobotTcpPose(data.id, viewerPose);
  }, [data.id, setRobotTcpPose]);

  // Handle robot selection
  const handleSelect = useCallback((id: string, linkName?: string) => {
    onSelect?.(id, linkName);
  }, [onSelect]);

  // Handle joint changes from dragging
  const handleJointChange = useCallback((id: string, angles: number[]) => {
    // Update store
    setRobotJoints(id, angles);
    // Notify callback
    onJointChange?.(id, angles);
  }, [setRobotJoints, onJointChange]);

  return (
    <CoreRobot
      id={data.id}
      urdfPath={data.urdfPath}
      urdfContent={data.urdfContent}
      meshData={data.meshData}
      jointAngles={data.joints}
      position={data.position}
      color={data.color}
      opacity={data.opacity}
      showAxes={data.showAxes}
      upAxis="Z"
      onEndEffectorUpdate={handleEndEffectorUpdate}
      onSelect={handleSelect}
      onJointChange={handleJointChange}
    />
  );
}
