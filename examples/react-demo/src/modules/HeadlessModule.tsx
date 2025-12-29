/**
 * Headless Mode Demo Module
 *
 * Demonstrates headless mode - state management without rendering.
 * Useful for server-side state sync, testing, or custom renderers.
 *
 * Features:
 * - RoboVizHeadless component
 * - State management without Three.js rendering
 * - Custom visualization using state
 * - Integration with external renderers
 */
import React, { useState, useEffect, useRef } from 'react';
import { useControls, button } from 'leva';
import {
  RoboVizHeadless,
  createRoboViz,
  useRoboViz,
  useRoboVizStore,
  type IRoboVizInstance,
} from '@aspect/roboviz-react';
import { useAppStore } from '../store';

// Simple 2D robot arm visualization (custom renderer using state)
function Simple2DRobotArm({
  jointAngles,
  color = '#4ecdc4',
}: {
  jointAngles: number[];
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw robot arm (simplified 2D view)
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.8;
    const segmentLength = 60;

    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    let x = centerX;
    let y = centerY;
    let totalAngle = -Math.PI / 2; // Start pointing up

    // Draw each segment based on joint angles
    jointAngles.slice(0, 4).forEach((angle, i) => {
      totalAngle += angle;
      const newX = x + Math.cos(totalAngle) * segmentLength;
      const newY = y + Math.sin(totalAngle) * segmentLength;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(newX, newY);
      ctx.stroke();

      // Draw joint
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      x = newX;
      y = newY;
    });

    // Draw end effector
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw base
    ctx.fillStyle = '#666';
    ctx.fillRect(centerX - 30, centerY, 60, 20);
  }, [jointAngles, color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      style={{ borderRadius: '8px', background: '#1a1a2e' }}
    />
  );
}

// State display component
function StateDisplay() {
  const robots = useRoboVizStore((s) => s.robots);
  const trajectories = useRoboVizStore((s) => s.trajectories);
  const waypoints = useRoboVizStore((s) => s.waypoints);
  const playback = useRoboVizStore((s) => s.playback);

  return (
    <div
      style={{
        padding: '16px',
        background: '#252540',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Headless State</h4>
      <div style={{ color: '#aaa' }}>
        <div>Robots: {robots.size}</div>
        <div>Trajectories: {trajectories.size}</div>
        <div>Waypoints: {waypoints.size}</div>
        <div>
          Playback: {playback.isPlaying ? 'Playing' : 'Stopped'} ({playback.currentTime.toFixed(2)}
          s)
        </div>
      </div>
      {robots.size > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ color: '#95e1d3', marginBottom: '4px' }}>Robot Details:</div>
          {Array.from(robots.values()).map((robot) => (
            <div key={robot.id} style={{ color: '#666', paddingLeft: '12px' }}>
              <div>ID: {robot.id}</div>
              <div>Joints: [{robot.jointAngles.map((a) => a.toFixed(2)).join(', ')}]</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Headless content with controls
function HeadlessContent() {
  const { addRobot, setRobotJoints, robots } = useRoboViz();
  const robotIdRef = useRef<string | null>(null);
  const [angles, setAngles] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const { addLog } = useAppStore();

  // Add a virtual robot (no URDF needed in headless mode)
  useEffect(() => {
    const id = addRobot({
      urdf: 'virtual://robot', // Virtual robot - no actual URDF
      jointAngles: [0, 0, 0, 0, 0, 0],
    });
    robotIdRef.current = id;
    addLog('info', `Headless robot created: ${id}`);
  }, [addRobot, addLog]);

  // Sync angles from store
  useEffect(() => {
    const robot = Array.from(robots.values())[0];
    if (robot) {
      setAngles(robot.jointAngles);
    }
  }, [robots]);

  useControls('Headless Control', {
    'Random Pose': button(() => {
      const robotId = robotIdRef.current;
      if (!robotId) return;
      const newAngles = [
        (Math.random() - 0.5) * Math.PI,
        (Math.random() - 0.5) * Math.PI * 0.5,
        Math.random() * Math.PI * 0.5,
        (Math.random() - 0.5) * Math.PI,
        (Math.random() - 0.5) * Math.PI * 0.5,
        (Math.random() - 0.5) * Math.PI,
      ];
      setRobotJoints(robotId, newAngles);
    }),
    'Animate': button(() => {
      const robotId = robotIdRef.current;
      if (!robotId) return;
      let t = 0;
      const interval = setInterval(() => {
        t += 0.1;
        if (t > Math.PI * 4) {
          clearInterval(interval);
          return;
        }
        setRobotJoints(robotId, [
          Math.sin(t) * 0.5,
          Math.cos(t * 0.7) * 0.3,
          Math.sin(t * 0.5) * 0.4,
          t * 0.2,
          Math.sin(t * 0.8) * 0.2,
          t * 0.3,
        ]);
      }, 50);
    }),
    'Home': button(() => {
      const robotId = robotIdRef.current;
      if (!robotId) return;
      setRobotJoints(robotId, [0, 0, 0, 0, 0, 0]);
    }),
  });

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* Custom 2D visualization */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: '#ff6b6b' }}>Custom 2D Renderer</h4>
        <Simple2DRobotArm jointAngles={angles} />
        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          Rendered from headless state
        </p>
      </div>

      {/* State display */}
      <div style={{ flex: 1 }}>
        <StateDisplay />
      </div>
    </div>
  );
}

// Imperative headless demo
function ImperativeHeadlessDemo() {
  const [instance, setInstance] = useState<IRoboVizInstance | null>(null);
  const [angles, setAngles] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [stateJson, setStateJson] = useState<string>('{}');
  const { addLog } = useAppStore();

  useEffect(() => {
    // Create headless instance imperatively
    const viz = createRoboViz({
      headless: true,
      debug: true,
    });

    // Add a robot
    const robotId = viz.addRobot({
      urdf: 'virtual://imperative-robot',
      jointAngles: [0, 0, 0, 0, 0, 0],
    });

    // Subscribe to state changes
    const unsubscribe = viz.subscribe((state) => {
      const robot = state.robots.get(robotId);
      if (robot) {
        setAngles(robot.jointAngles);
      }
      setStateJson(
        JSON.stringify(
          {
            robots: state.robots.size,
            trajectories: state.trajectories.size,
            playback: state.playback,
          },
          null,
          2
        )
      );
    });

    setInstance(viz);
    addLog('info', 'Headless instance created imperatively');

    return () => {
      unsubscribe();
      // Defer disposal to avoid "unmount during render" warning
      queueMicrotask(() => {
        viz.dispose();
      });
    };
  }, [addLog]);

  const animate = () => {
    if (!instance) return;
    const state = instance.getState();
    const robotId = Array.from(state.robots.keys())[0];
    if (!robotId) return;

    let t = 0;
    const interval = setInterval(() => {
      t += 0.1;
      if (t > Math.PI * 4) {
        clearInterval(interval);
        return;
      }
      instance.setRobotJoints(robotId, [
        Math.sin(t) * 0.6,
        Math.cos(t * 0.8) * 0.4,
        Math.sin(t * 0.6) * 0.5,
        t * 0.15,
        Math.sin(t * 0.9) * 0.3,
        t * 0.25,
      ]);
    }, 50);
  };

  return (
    <div
      style={{
        padding: '16px',
        background: '#1a1a2e',
        borderRadius: '8px',
        marginTop: '24px',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', color: '#95e1d3' }}>Imperative Headless Mode</h3>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Custom 2D visualization */}
        <div>
          <Simple2DRobotArm jointAngles={angles} color="#95e1d3" />
          <button
            onClick={animate}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#95e1d3',
              border: 'none',
              borderRadius: '4px',
              color: '#1a1a2e',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%',
            }}
          >
            Animate
          </button>
        </div>

        {/* State JSON */}
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#aaa' }}>Live State (JSON)</h4>
          <pre
            style={{
              margin: 0,
              padding: '12px',
              background: '#0d0d1a',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#888',
              overflow: 'auto',
              maxHeight: '200px',
            }}
          >
            {stateJson}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function HeadlessModule() {
  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Headless Mode Demo</h2>
        <p>
          State management without Three.js rendering. Perfect for server-side sync, testing, or
          custom renderers.
        </p>
      </div>

      <div className="module-content">
        {/* React Headless Component */}
        <div
          style={{
            padding: '16px',
            background: '#252540',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', color: '#ff6b6b' }}>
            RoboVizHeadless Component
          </h3>
          <RoboVizHeadless
            config={{
              scene: { background: '#1a1a2e' },
            }}
          >
            <HeadlessContent />
          </RoboVizHeadless>
        </div>

        {/* Imperative Headless */}
        <ImperativeHeadlessDemo />

        {/* Code examples */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#0d0d1a',
            borderRadius: '8px',
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Headless Mode Usage</h4>
          <pre
            style={{
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#aaa',
            }}
          >
            {`// React Component
<RoboVizHeadless config={{ ... }}>
  <MyCustomRenderer />
</RoboVizHeadless>

// Imperative API
const viz = createRoboViz({
  headless: true,  // No DOM rendering
});

// State management works normally
const robotId = viz.addRobot({ urdf: 'virtual://robot' });
viz.setRobotJoints(robotId, [0, 0.5, 0.8, 0, 0, 0]);

// Subscribe to state changes
viz.subscribe((state) => {
  // Update your custom renderer
  myRenderer.update(state);
});

// Use case: Server-side state sync
// Use case: Unit testing
// Use case: Custom WebGL/Canvas renderer
// Use case: State persistence`}
          </pre>
        </div>
      </div>
    </div>
  );
}
