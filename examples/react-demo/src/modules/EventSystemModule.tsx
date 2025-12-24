/**
 * Event System Demo Module
 *
 * Demonstrates the comprehensive event system in RoboViz.
 * Shows how to use useEvents, useEventCallback, useEventValue hooks.
 *
 * Features:
 * - Event subscription with hooks
 * - Event emission
 * - Event value tracking
 * - Multiple event handlers
 * - Connection events
 */
import React, { useState, useEffect } from 'react';
import { useControls, button } from 'leva';
import {
  RoboViz,
  RoboVizProvider,
  Robot,
  createRoboViz,
  useRoboVizInstance,
  useEvents,
  useEventValue,
  useEventCallback,
  useMultipleEvents,
  useConnection,
  type IRoboVizInstance,
} from '@aspect/roboviz-react';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// Component that uses useEventValue hook
function LastClickDisplay() {
  const lastClick = useEventValue('robot:click', null);

  return (
    <div
      style={{
        padding: '12px',
        background: '#252540',
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', color: '#4ecdc4' }}>
        useEventValue('robot:click')
      </h4>
      {lastClick ? (
        <div style={{ fontSize: '12px', color: '#aaa' }}>
          <div>Robot: {lastClick.robotId}</div>
          <div>
            Position: ({lastClick.position.x.toFixed(2)}, {lastClick.position.y.toFixed(2)},{' '}
            {lastClick.position.z.toFixed(2)})
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: '#666' }}>Click a robot to see data</div>
      )}
    </div>
  );
}

// Component that uses useEventCallback hook
function EventCallbackDemo() {
  const [count, setCount] = useState(0);

  useEventCallback('camera:changed', () => {
    setCount((c) => c + 1);
  });

  return (
    <div
      style={{
        padding: '12px',
        background: '#252540',
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', color: '#ff6b6b' }}>
        useEventCallback('camera:changed')
      </h4>
      <div style={{ fontSize: '12px', color: '#aaa' }}>Camera moved {count} times</div>
    </div>
  );
}

// Component that uses useMultipleEvents hook
function MultiEventLogger() {
  const [logs, setLogs] = useState<string[]>([]);

  useMultipleEvents({
    'robot:click': (e) => {
      setLogs((prev) => [...prev.slice(-4), `Click: ${e.robotId}`]);
    },
    'robot:joints-changed': (e) => {
      setLogs((prev) => [...prev.slice(-4), `Joints: ${e.angles[0].toFixed(2)}...`]);
    },
    'camera:changed': (e) => {
      const pos = e.position;
      const x = Array.isArray(pos) ? pos[0] : pos.x;
      setLogs((prev) => [...prev.slice(-4), `Camera: (${x.toFixed(1)}, ...)`]);
    },
    'object:selected': (e) => {
      setLogs((prev) => [...prev.slice(-4), `Selected: ${e.objectId || 'none'}`]);
    },
  });

  return (
    <div
      style={{
        padding: '12px',
        background: '#252540',
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', color: '#95e1d3' }}>useMultipleEvents()</h4>
      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#aaa' }}>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>Listening for events...</div>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>
    </div>
  );
}

// Component that uses useConnection hook
function ConnectionStatus() {
  const { isConnected, error } = useConnection();

  return (
    <div
      style={{
        padding: '12px',
        background: '#252540',
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', color: '#f38181' }}>useConnection()</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? '#4ecdc4' : '#ff6b6b',
          }}
        />
        <span style={{ fontSize: '12px', color: '#aaa' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {error && <div style={{ fontSize: '11px', color: '#ff6b6b' }}>{error.message}</div>}
    </div>
  );
}

// Main event controls using useEvents hook
function EventControls() {
  const { emit } = useEvents();

  const emitCustomEvent = () => {
    emit('robot:joints-changed', {
      robotId: 'demo-robot',
      angles: [Math.random(), Math.random(), Math.random(), 0, 0, 0],
      source: 'local' as const,
    });
  };

  return (
    <div
      style={{
        padding: '12px',
        background: '#1a1a2e',
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    >
      <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>useEvents() Hook</h4>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={emitCustomEvent}
          style={{
            padding: '8px 16px',
            background: '#4ecdc4',
            border: 'none',
            borderRadius: '4px',
            color: '#1a1a2e',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Emit Custom Event
        </button>
      </div>
    </div>
  );
}

// Robot controls component (uses instance directly)
function RobotControls({ instance }: { instance: IRoboVizInstance }) {
  const [robotId, setRobotId] = useState<string | null>(null);
  const { addLog } = useAppStore();

  // Add robot on mount
  useEffect(() => {
    const id = instance.addRobot({
      urdf: URDF_PATH,
      jointAngles: [0, 0, 0, 0, 0, 0],
    });
    setRobotId(id);
    addLog('info', `Robot added: ${id}`);

    return () => {
      instance.removeRobot(id);
    };
  }, [instance, addLog]);

  // Leva controls
  useControls('Event Demo', {
    'Animate Robot': button(() => {
      if (!robotId) return;
      let t = 0;
      const interval = setInterval(() => {
        t += 0.1;
        if (t > Math.PI * 2) {
          clearInterval(interval);
          return;
        }
        instance.setRobotJoints(robotId, [
          Math.sin(t) * 0.5,
          Math.cos(t * 0.7) * 0.3,
          Math.sin(t * 0.5) * 0.4,
          0,
          Math.sin(t * 0.8) * 0.2,
          0,
        ]);
      }, 50);
    }),
    'Random Position': button(() => {
      if (!robotId) return;
      instance.setRobotJoints(robotId, [
        (Math.random() - 0.5) * Math.PI,
        (Math.random() - 0.5) * Math.PI * 0.5,
        Math.random() * Math.PI * 0.5,
        (Math.random() - 0.5) * Math.PI,
        (Math.random() - 0.5) * Math.PI * 0.5,
        (Math.random() - 0.5) * Math.PI,
      ]);
    }),
  });

  return null; // This component only manages state via Leva
}

// Event panels that need to be inside RoboVizProvider but outside Canvas
function EventPanels() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '280px' }}>
      <EventControls />
      <LastClickDisplay />
      <EventCallbackDemo />
      <MultiEventLogger />
      <ConnectionStatus />
    </div>
  );
}

export function EventSystemModule() {
  const { addLog } = useAppStore();

  // Create a single instance for this module
  const [instance] = useState(() =>
    createRoboViz({
      headless: false,
      debug: false,
    })
  );

  // Cleanup on unmount
  useEffect(() => {
    addLog('info', 'Event System module loaded');
    return () => {
      instance.dispose();
    };
  }, [instance, addLog]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Event System Demo</h2>
        <p>
          Comprehensive event handling with <code>useEvents</code>, <code>useEventValue</code>,{' '}
          <code>useEventCallback</code>, and <code>useMultipleEvents</code> hooks.
        </p>
      </div>

      {/* Wrap everything in RoboVizProvider so hooks work outside Canvas */}
      <RoboVizProvider instance={instance}>
        {/* Robot controls (uses instance) */}
        <RobotControls instance={instance} />

        <div className="module-content" style={{ display: 'flex', gap: '16px' }}>
          {/* 3D Visualization */}
          <div className="canvas-wrapper" style={{ flex: 2, minHeight: '400px' }}>
            <RoboViz
              instance={instance}
              config={{
                scene: {
                  background: '#1a1a2e',
                  grid: { enabled: true, size: 10, divisions: 20, color: '#404060' },
                },
                camera: { position: { x: 2, y: 1.5, z: 2 } },
              }}
              width="100%"
              height="400px"
            />
          </div>

          {/* Event panels (outside Canvas but inside Provider) */}
          <EventPanels />
        </div>
      </RoboVizProvider>

      {/* Code examples */}
      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          background: '#0d0d1a',
          borderRadius: '8px',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Event Hook Examples</h4>
        <pre
          style={{
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aaa',
          }}
        >
          {`// Subscribe to events and emit
const { on, emit } = useEvents();
const unsub = on('robot:click', (e) => console.log(e));

// Track the latest event value
const lastClick = useEventValue('robot:click', null);

// Simple callback subscription
useEventCallback('camera:changed', (e) => {
  console.log('Camera moved to:', e.position);
});

// Multiple events at once
useMultipleEvents({
  'robot:click': handleClick,
  'trajectory:completed': handleComplete,
  'error': handleError,
});

// Connection status hook
const { isConnected, connect, disconnect } = useConnection();`}
        </pre>
      </div>
    </div>
  );
}
