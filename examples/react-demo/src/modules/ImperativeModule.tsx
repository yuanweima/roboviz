/**
 * Imperative API Demo Module
 *
 * Demonstrates the new imperative API that works with vanilla JS, Vue, Angular, etc.
 * Shows how to use createRoboViz factory function and instance methods.
 *
 * Features:
 * - createRoboViz() factory function
 * - Instance methods: addRobot, setRobotJoints, addTrajectory
 * - Event subscription with on/off
 * - State access with getState()
 * - Lifecycle: mount/unmount/dispose
 */
import React, { useEffect, useRef, useState } from 'react';
import { useControls, button } from 'leva';
import {
  createRoboViz,
  type IRoboVizInstance,
} from '@aspect/roboviz-react';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

export function ImperativeModule() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<IRoboVizInstance | null>(null);
  const [robotId, setRobotId] = useState<string | null>(null);
  const robotIdRef = useRef<string | null>(null); // Ref for callbacks to get latest value
  const [jointAngles, setJointAngles] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const jointAnglesRef = useRef<number[]>([0, 0, 0, 0, 0, 0]); // Ref for callbacks
  const [events, setEvents] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { addLog } = useAppStore();

  // Initialize RoboViz instance using the imperative API
  useEffect(() => {
    if (!containerRef.current) return;

    // Create instance using factory function (like vanilla JS would)
    const instance = createRoboViz({
      container: containerRef.current,
      scene: {
        background: '#1a1a2e',
        grid: { enabled: true, size: 10, divisions: 20, color: '#404060' },
      },
      camera: {
        position: { x: 3, y: 2, z: 3 },
        target: { x: 0, y: 0, z: 0 },
      },
      debug: true,
    });

    instanceRef.current = instance;
    addLog('info', 'RoboViz instance created via createRoboViz()');

    // Subscribe to events
    const unsubRobotClick = instance.on('robot:click', (e) => {
      setEvents((prev) => [...prev.slice(-9), `Robot clicked: ${e.robotId}`]);
      addLog('info', `Robot clicked: ${e.robotId}`);
    });

    const unsubJointsChanged = instance.on('robot:joints-changed', (e) => {
      setEvents((prev) => [
        ...prev.slice(-9),
        `Joints changed: ${e.angles.map((a) => a.toFixed(2)).join(', ')}`,
      ]);
    });

    const unsubCameraChanged = instance.on('camera:changed', (e) => {
      const pos = e.position;
      const x = Array.isArray(pos) ? pos[0] : pos.x;
      const y = Array.isArray(pos) ? pos[1] : pos.y;
      const z = Array.isArray(pos) ? pos[2] : pos.z;
      setEvents((prev) => [
        ...prev.slice(-9),
        `Camera moved to (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`,
      ]);
    });

    // Cleanup on unmount
    return () => {
      unsubRobotClick();
      unsubJointsChanged();
      unsubCameraChanged();
      instance.dispose();
      addLog('info', 'RoboViz instance disposed');
    };
  }, [addLog]);

  // Keep refs in sync with state for callback closures
  React.useEffect(() => {
    robotIdRef.current = robotId;
  }, [robotId]);

  React.useEffect(() => {
    jointAnglesRef.current = jointAngles;
  }, [jointAngles]);

  // Leva controls for imperative actions
  useControls('Imperative API', {
    'Add Robot': button(() => {
      if (!instanceRef.current) return;

      const id = instanceRef.current.addRobot({
        urdf: URDF_PATH,
        jointAngles: [0, 0, 0, 0, 0, 0],
      });
      setRobotId(id);
      robotIdRef.current = id; // Also update ref immediately
      addLog('info', `Robot added with ID: ${id}`);
    }),
    'Remove Robot': button(() => {
      const currentRobotId = robotIdRef.current;
      if (!instanceRef.current || !currentRobotId) return;
      instanceRef.current.removeRobot(currentRobotId);
      setRobotId(null);
      robotIdRef.current = null;
      addLog('info', 'Robot removed');
    }),
    'Animate Joints': button(() => {
      const currentRobotId = robotIdRef.current;
      if (!instanceRef.current || !currentRobotId) {
        console.log('[Animate] No robot or instance', { instance: !!instanceRef.current, robotId: currentRobotId });
        return;
      }

      console.log('[Animate] Starting animation for robot:', currentRobotId);
      let t = 0;
      const interval = setInterval(() => {
        t += 0.1;
        if (t > Math.PI * 4) {
          clearInterval(interval);
          console.log('[Animate] Animation complete');
          return;
        }
        const angles = [
          Math.sin(t) * 0.5,
          Math.cos(t * 0.7) * 0.3,
          Math.sin(t * 0.5) * 0.4,
          t * 0.3,
          Math.sin(t * 0.8) * 0.2,
          t * 0.5,
        ];
        instanceRef.current?.setRobotJoints(currentRobotId, angles);
        setJointAngles(angles);
      }, 50);
    }),
    'Get State': button(() => {
      if (!instanceRef.current) return;
      const state = instanceRef.current.getState();
      console.log('Current state:', state);
      addLog('info', `State: ${state.robots.size} robots, ${state.trajectories.size} trajectories`);
    }),
    'Add Trajectory': button(() => {
      const currentRobotId = robotIdRef.current;
      if (!instanceRef.current || !currentRobotId) return;

      // Generate a simple pick-place trajectory
      const numPoints = 21;
      const times: number[] = [];
      const positions: number[][] = [];

      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        times.push(t * 3);
        positions.push([
          Math.sin(t * Math.PI) * 0.5,
          -0.3 + Math.sin(t * Math.PI * 2) * 0.2,
          0.5 + Math.sin(t * Math.PI) * 0.3,
          t * Math.PI * 0.5,
          Math.sin(t * Math.PI * 2) * 0.2,
          t * Math.PI,
        ]);
      }

      const trajectoryId = instanceRef.current.addTrajectory({
        robotId: currentRobotId,
        data: { duration: 3, times, positions },
      });
      addLog('info', `Trajectory added: ${trajectoryId}`);
    }),
    'Play Trajectory': button(() => {
      if (!instanceRef.current) return;
      const state = instanceRef.current.getState();
      const trajectoryId = Array.from(state.trajectories.keys())[0];
      if (trajectoryId) {
        instanceRef.current.playTrajectory(trajectoryId, { speed: 1.0, loop: true });
        addLog('info', 'Playing trajectory');
      }
    }),
    'Stop Playback': button(() => {
      if (!instanceRef.current) return;
      instanceRef.current.stopTrajectory();
      addLog('info', 'Playback stopped');
    }),
  });

  // Joint slider controls - using Leva's set function for bidirectional sync
  const [, setLevaJoints] = useControls('Manual Joint Control', () => ({
    J1: {
      value: 0,
      min: -Math.PI,
      max: Math.PI,
      step: 0.01,
      onChange: (v: number) => {
        const currentRobotId = robotIdRef.current;
        if (!instanceRef.current || !currentRobotId) return;
        const newAngles = [...jointAnglesRef.current];
        newAngles[0] = v;
        setJointAngles(newAngles);
        instanceRef.current.setRobotJoints(currentRobotId, newAngles);
      },
    },
    J2: {
      value: 0,
      min: -Math.PI / 2,
      max: Math.PI / 2,
      step: 0.01,
      onChange: (v: number) => {
        const currentRobotId = robotIdRef.current;
        if (!instanceRef.current || !currentRobotId) return;
        const newAngles = [...jointAnglesRef.current];
        newAngles[1] = v;
        setJointAngles(newAngles);
        instanceRef.current.setRobotJoints(currentRobotId, newAngles);
      },
    },
    J3: {
      value: 0,
      min: -Math.PI / 2,
      max: Math.PI,
      step: 0.01,
      onChange: (v: number) => {
        const currentRobotId = robotIdRef.current;
        if (!instanceRef.current || !currentRobotId) return;
        const newAngles = [...jointAnglesRef.current];
        newAngles[2] = v;
        setJointAngles(newAngles);
        instanceRef.current.setRobotJoints(currentRobotId, newAngles);
      },
    },
  }));

  // Sync Leva controls when jointAngles change from animation
  React.useEffect(() => {
    setLevaJoints({
      J1: jointAngles[0],
      J2: jointAngles[1],
      J3: jointAngles[2],
    });
  }, [jointAngles, setLevaJoints]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Imperative API Demo</h2>
        <p>
          Demonstrates <code>createRoboViz()</code> factory for vanilla JS integration.
          Works with Vue, Angular, or any framework!
        </p>
      </div>

      <div className="module-content" style={{ display: 'flex', gap: '16px' }}>
        {/* Visualization container */}
        <div className="canvas-wrapper" style={{ flex: 2 }}>
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', minHeight: '500px' }}
          />
        </div>

        {/* Event log */}
        <div
          className="event-log"
          style={{
            flex: 1,
            background: '#1a1a2e',
            borderRadius: '8px',
            padding: '16px',
            overflow: 'auto',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Event Log</h3>
          <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {events.length === 0 ? (
              <p style={{ color: '#666' }}>No events yet. Add a robot and interact!</p>
            ) : (
              events.map((event, i) => (
                <div key={i} style={{ color: '#aaa', marginBottom: '4px' }}>
                  {event}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status indicators */}
      <div
        className="status-row"
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '16px',
          padding: '12px',
          background: '#252540',
          borderRadius: '8px',
        }}
      >
        <div>
          <span style={{ color: '#888' }}>Robot ID: </span>
          <span style={{ color: robotId ? '#4ecdc4' : '#666' }}>{robotId || 'None'}</span>
        </div>
        <div>
          <span style={{ color: '#888' }}>Joint Angles: </span>
          <span style={{ color: '#ff6b6b', fontFamily: 'monospace' }}>
            [{jointAngles.map((a) => a.toFixed(2)).join(', ')}]
          </span>
        </div>
      </div>

      {/* Code example */}
      <div
        className="code-example"
        style={{
          marginTop: '16px',
          padding: '16px',
          background: '#0d0d1a',
          borderRadius: '8px',
          overflow: 'auto',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Vanilla JS Usage</h4>
        <pre
          style={{
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aaa',
            whiteSpace: 'pre-wrap',
          }}
        >
          {`import { createRoboViz } from '@aspect/roboviz-react';

const viz = createRoboViz({
  container: '#my-container',
  scene: { background: '#1a1a2e' },
});

// Add a robot
const robotId = viz.addRobot({
  urdf: '/models/robot.urdf',
});

// Subscribe to events
viz.on('robot:click', (e) => {
  console.log('Clicked:', e.robotId);
});

// Control the robot
viz.setRobotJoints(robotId, [0, 0.5, 0.8, 0, 0, 0]);

// Cleanup when done
viz.dispose();`}
        </pre>
      </div>
    </div>
  );
}
