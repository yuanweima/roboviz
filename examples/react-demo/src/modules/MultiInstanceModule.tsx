/**
 * Multi-Instance Demo Module
 *
 * Demonstrates instance isolation - multiple RoboViz instances on the same page
 * with completely independent state.
 *
 * Features:
 * - Multiple independent RoboViz instances
 * - Each instance has its own store and state
 * - Instances can have different configurations
 * - Communication between instances via events
 */
import React, { useState, useRef, useEffect } from 'react';
import { useControls, button } from 'leva';
import {
  RoboViz,
  RoboVizProvider,
  useRoboVizInstance,
  useRoboVizStore,
  useRoboVizActions,
  createRoboViz,
  type IRoboVizInstance,
} from '@aspect/roboviz-react';
import { Robot } from '@aspect/roboviz-core';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// Instance card component that shows state from its RoboViz context
function InstanceCard({
  title,
  color,
  onSync,
}: {
  title: string;
  color: string;
  onSync?: (angles: number[]) => void;
}) {
  const instance = useRoboVizInstance();
  const robots = useRoboVizStore((s) => s.robots);
  const actions = useRoboVizActions();

  const [localAngles, setLocalAngles] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const robotId = Array.from(robots.keys())[0];

  // Add robot on mount
  useEffect(() => {
    const id = instance.addRobot({
      urdf: URDF_PATH,
      jointAngles: [0, 0, 0, 0, 0, 0],
    });
    return () => {
      instance.removeRobot(id);
    };
  }, [instance]);

  // Animate this instance
  const handleAnimate = () => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.1;
      if (t > Math.PI * 2) {
        clearInterval(interval);
        return;
      }
      const angles = [
        Math.sin(t) * 0.5,
        Math.cos(t * 0.7) * 0.3,
        Math.sin(t * 0.5) * 0.4,
        0,
        Math.sin(t * 0.8) * 0.2,
        0,
      ];
      if (robotId) {
        instance.setRobotJoints(robotId, angles);
        setLocalAngles(angles);
      }
    }, 50);
  };

  // Sync to other instances
  const handleSync = () => {
    onSync?.(localAngles);
  };

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: '8px',
        padding: '12px',
        border: `2px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, color }}>{title}</h4>
        <span style={{ color: '#666', fontSize: '12px' }}>ID: {instance.id}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          onClick={handleAnimate}
          style={{
            padding: '4px 12px',
            background: color,
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Animate
        </button>
        <button
          onClick={handleSync}
          style={{
            padding: '4px 12px',
            background: '#333',
            border: `1px solid ${color}`,
            borderRadius: '4px',
            color: color,
            cursor: 'pointer',
          }}
        >
          Sync to Others
        </button>
      </div>

      <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
        Robots: {robots.size} | J1: {localAngles[0].toFixed(2)}
      </div>
    </div>
  );
}

// Mini visualization for each instance
function MiniViz({
  instance,
  color,
}: {
  instance: IRoboVizInstance;
  color: string;
}) {
  return (
    <RoboVizProvider instance={instance}>
      <div style={{ height: '200px', borderRadius: '8px', overflow: 'hidden' }}>
        <RoboViz
          instance={instance}
          config={{
            scene: {
              background: '#0d0d1a',
              grid: { enabled: true, size: 5, divisions: 10, color: '#303050' },
            },
          }}
          width="100%"
          height="100%"
        />
      </div>
      <InstanceCard title={`Instance`} color={color} />
    </RoboVizProvider>
  );
}

export function MultiInstanceModule() {
  const { addLog } = useAppStore();

  // Create 4 independent instances
  const [instances] = useState(() => {
    return [
      createRoboViz({ headless: false, debug: false }),
      createRoboViz({ headless: false, debug: false }),
      createRoboViz({ headless: false, debug: false }),
      createRoboViz({ headless: false, debug: false }),
    ];
  });

  const colors = ['#4ecdc4', '#ff6b6b', '#95e1d3', '#f38181'];

  // Cleanup on unmount
  useEffect(() => {
    addLog('info', `Created ${instances.length} independent RoboViz instances`);

    return () => {
      instances.forEach((instance) => instance.dispose());
      addLog('info', 'All instances disposed');
    };
  }, [instances, addLog]);

  // Sync all instances to the same joint angles
  const syncAllInstances = (angles: number[]) => {
    instances.forEach((instance) => {
      const state = instance.getState();
      const robotId = Array.from(state.robots.keys())[0];
      if (robotId) {
        instance.setRobotJoints(robotId, angles);
      }
    });
    addLog('info', 'Synced all instances');
  };

  // Leva controls
  useControls('Multi-Instance', {
    'Animate All': button(() => {
      let t = 0;
      const interval = setInterval(() => {
        t += 0.1;
        if (t > Math.PI * 2) {
          clearInterval(interval);
          return;
        }
        instances.forEach((instance, i) => {
          const phase = (i * Math.PI) / 2; // Different phase for each
          const angles = [
            Math.sin(t + phase) * 0.5,
            Math.cos((t + phase) * 0.7) * 0.3,
            Math.sin((t + phase) * 0.5) * 0.4,
            0,
            Math.sin((t + phase) * 0.8) * 0.2,
            0,
          ];
          const state = instance.getState();
          const robotId = Array.from(state.robots.keys())[0];
          if (robotId) {
            instance.setRobotJoints(robotId, angles);
          }
        });
      }, 50);
    }),
    'Reset All': button(() => {
      instances.forEach((instance) => {
        const state = instance.getState();
        const robotId = Array.from(state.robots.keys())[0];
        if (robotId) {
          instance.setRobotJoints(robotId, [0, 0, 0, 0, 0, 0]);
        }
      });
      addLog('info', 'Reset all instances');
    }),
    'Log States': button(() => {
      instances.forEach((instance, i) => {
        const state = instance.getState();
        console.log(`Instance ${i + 1}:`, state);
      });
      addLog('info', 'States logged to console');
    }),
  });

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Multi-Instance Demo</h2>
        <p>
          Each visualization is a completely <strong>isolated instance</strong> with its own state.
          Changes in one don't affect others unless explicitly synced.
        </p>
      </div>

      {/* 2x2 Grid of instances */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginTop: '16px',
        }}
      >
        {instances.map((instance, i) => (
          <div key={instance.id}>
            <MiniViz instance={instance} color={colors[i]} />
          </div>
        ))}
      </div>

      {/* Instance comparison */}
      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          background: '#1a1a2e',
          borderRadius: '8px',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Instance Isolation</h4>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {instances.map((instance, i) => {
            const state = instance.getState();
            return (
              <div
                key={instance.id}
                style={{
                  padding: '8px 16px',
                  background: '#252540',
                  borderRadius: '4px',
                  borderLeft: `3px solid ${colors[i]}`,
                }}
              >
                <div style={{ color: colors[i], fontWeight: 'bold', marginBottom: '4px' }}>
                  Instance {i + 1}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  <div>ID: {instance.id}</div>
                  <div>Robots: {state.robots.size}</div>
                  <div>Mounted: {instance.isMounted ? 'Yes' : 'No'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code example */}
      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          background: '#0d0d1a',
          borderRadius: '8px',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Multi-Instance Pattern</h4>
        <pre
          style={{
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aaa',
          }}
        >
          {`// Each instance is completely isolated
const instances = [
  createRoboViz({ container: '#viz1' }),
  createRoboViz({ container: '#viz2' }),
  createRoboViz({ container: '#viz3' }),
];

// Changes to one don't affect others
instances[0].addRobot({ urdf: '/robot1.urdf' });
instances[1].addRobot({ urdf: '/robot2.urdf' });

// Each has its own state
instances[0].getState().robots.size; // 1
instances[1].getState().robots.size; // 1

// Cleanup all
instances.forEach(i => i.dispose());`}
        </pre>
      </div>
    </div>
  );
}
