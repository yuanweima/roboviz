/**
 * Multi-Robot Module Demo
 *
 * Demonstrates multiple Robot instances from @aspect/roboviz-core.
 * This module shows how to:
 * - Manage multiple robot instances with position/rotation props
 * - Use Workspace and CoordinationLine helper components
 * - Use SharedWorkspace for overlapping areas
 */
import React, { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls, button } from 'leva';
import {
  RoboVizCore,
  Robot,
  WorkspaceVisual,
  SharedWorkspace,
  CoordinationLine,
} from '@aspect/roboviz-core/rendering';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

interface RobotInstance {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  jointAngles: number[];
  color: string;
}

// Scene component
function MultiRobotScene() {
  // Z-up coordinate system: [X, Y, Z] where Z is height
  const [robots, setRobots] = useState<RobotInstance[]>([
    {
      id: 'robot_left',
      position: [0, -0.8, 0], // Left side (negative Y)
      rotation: [0, 0, -Math.PI / 4], // Rotate around Z axis to face center
      jointAngles: [0, -0.3, 0.6, 0, -0.3, 0],
      color: '#ff6b6b',
    },
    {
      id: 'robot_right',
      position: [0, 0.8, 0], // Right side (positive Y)
      rotation: [0, 0, Math.PI / 4], // Rotate around Z axis to face center
      jointAngles: [0, -0.3, 0.6, 0, -0.3, 0],
      color: '#4ecdc4',
    },
  ]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showCoordination, setShowCoordination] = useState(true);
  const { addLog } = useAppStore();

  // Animation loop
  useFrame((_, delta) => {
    if (isAnimating) {
      setAnimationPhase((prev) => prev + delta);

      // Update robot joint angles during animation
      setRobots((prev) =>
        prev.map((robot, index) => {
          const t = animationPhase;
          const baseAngle = robot.position[0] > 0 ? 0 : Math.PI;
          const phaseOffset = index * 0.5;

          return {
            ...robot,
            jointAngles: [
              baseAngle + 0.3 * Math.sin((t + phaseOffset) * 2),
              -0.3 + 0.2 * Math.cos((t + phaseOffset) * 1.5),
              0.6 + 0.2 * Math.sin((t + phaseOffset) * 1.8),
              (t + phaseOffset) * 0.5,
              0.2 * Math.sin((t + phaseOffset) * 2.2),
              t + phaseOffset,
            ],
          };
        })
      );
    }
  });

  // Multi-robot controls
  const controls = useControls('Multi-Robot', {
    showWorkspaces: { value: true, label: 'Show Workspaces' },
    showCoordination: {
      value: true,
      label: 'Show Coordination',
      onChange: setShowCoordination,
    },
    syncMode: {
      value: 'synchronized',
      options: ['synchronized', 'sequential', 'independent'],
      label: 'Sync Mode',
    },
  });

  // Animation controls
  useControls('Coordination', {
    'Start Animation': button(() => {
      setIsAnimating(true);
      setAnimationPhase(0);
      addLog('info', 'Multi-robot coordination started');
    }),
    'Stop Animation': button(() => {
      setIsAnimating(false);
      addLog('info', 'Multi-robot coordination stopped');
    }),
    'Home All': button(() => {
      setRobots((prev) =>
        prev.map((r) => ({
          ...r,
          jointAngles: [0, 0, 0, 0, 0, 0],
        }))
      );
      addLog('info', 'All robots moved to home position');
    }),
    'Mirror Pose': button(() => {
      const leftAngles = robots[0].jointAngles;
      setRobots((prev) => [
        prev[0],
        {
          ...prev[1],
          jointAngles: leftAngles.map((a, i) => (i === 0 ? -a : a)),
        },
        ...prev.slice(2),
      ]);
      addLog('info', 'Right robot mirroring left robot pose');
    }),
  });

  // Robot management
  useControls('Robots', {
    'Add Robot': button(() => {
      if (robots.length >= 4) {
        addLog('warning', 'Maximum 4 robots supported');
        return;
      }

      const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7'];
      // Z-up coordinate system: [X, Y, Z] where Z is height
      const positions: [number, number, number][] = [
        [0, -0.8, 0],   // Left (negative Y)
        [0, 0.8, 0],    // Right (positive Y)
        [-0.8, 0, 0],   // Back (negative X)
        [0.8, 0, 0],    // Front (positive X)
      ];
      // Rotation around Z axis to face center
      const rotations: [number, number, number][] = [
        [0, 0, -Math.PI / 4],  // Left robot facing center-right
        [0, 0, Math.PI / 4],   // Right robot facing center-left
        [0, 0, Math.PI],       // Back robot facing forward
        [0, 0, 0],             // Front robot facing backward
      ];

      const newRobot: RobotInstance = {
        id: `robot_${robots.length}`,
        position: positions[robots.length],
        rotation: rotations[robots.length],
        jointAngles: [0, -0.3, 0.6, 0, -0.3, 0],
        color: colors[robots.length],
      };

      setRobots((prev) => [...prev, newRobot]);
      addLog('info', `Added robot ${newRobot.id}`);
    }),
    'Remove Last': button(() => {
      if (robots.length <= 1) {
        addLog('warning', 'At least one robot required');
        return;
      }

      const removed = robots[robots.length - 1];
      setRobots((prev) => prev.slice(0, -1));
      addLog('info', `Removed robot ${removed.id}`);
    }),
  });

  return (
    <>
      {/* ✨ Robots with direct position/rotation props - no wrapper group needed! */}
      {robots.map((robot) => (
        <React.Fragment key={robot.id}>
          <Robot
            id={robot.id}
            urdfPath={URDF_PATH}
            jointAngles={robot.jointAngles}
            position={robot.position}
            rotation={robot.rotation}
            showAxes
            color={robot.color}
          />
          {/* ✨ Using the new WorkspaceVisual helper component */}
          {/* Z-up: position is [X, Y, Z], workspace on XY plane at Z=0.02 */}
          {controls.showWorkspaces && (
            <WorkspaceVisual
              radius={0.8}
              position={[robot.position[0], robot.position[1], 0.02]}
              color={robot.color}
              opacity={0.1}
              showBoundary
            />
          )}
        </React.Fragment>
      ))}

      {/* ✨ Using the new CoordinationLine helper component */}
      {/* Z-up: line at height Z=0.5 */}
      {showCoordination &&
        robots.length >= 2 &&
        robots.slice(0, -1).map((robot, i) => (
          <CoordinationLine
            key={`coord_${i}`}
            start={[robot.position[0], robot.position[1], 0.5]}
            end={[robots[i + 1].position[0], robots[i + 1].position[1], 0.5]}
            color="#00ffff"
            dashed
          />
        ))}

      {/* ✨ Using the new SharedWorkspace helper component */}
      {robots.length >= 2 && (
        <SharedWorkspace
          workspaces={robots.map((r) => r.position)}
          radius={0.8}
          color="#ffffff"
          opacity={0.15}
        />
      )}
    </>
  );
}

export function MultiRobotModule() {
  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Multi-Robot Coordination</h2>
        <p>
          Using Robot's <code>position</code>/<code>rotation</code> props and{' '}
          <code>WorkspaceVisual</code>, <code>CoordinationLine</code> helper components
        </p>
      </div>

      <div className="canvas-wrapper">
        <RoboVizCore
          camera={{
            position: { x: 3, y: 2, z: 3 },
            fov: 50,
          }}
        >
          <MultiRobotScene />
        </RoboVizCore>
      </div>
    </div>
  );
}
