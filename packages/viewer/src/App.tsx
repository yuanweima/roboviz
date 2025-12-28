/**
 * RoboViz Viewer App
 *
 * Standalone viewer that connects to SDK via WebSocket
 * and renders the visualization based on received commands.
 */
import * as React from 'react';
import { useViewerStore } from './store/viewerStore';
import { useWebSocket, useKeyboardShortcuts, getKeyboardShortcuts } from './hooks';
import { Scene, Robot, Obstacle, SafetyZone, Waypoint, TrajectoryPlayer, CollisionVisualizer, FrameTree, PointCloudRenderer, ControlPanel, CableDemo, CableDemoPanel } from './components';
import type { CollisionPair, Vector3 } from './types';

// Check for demo mode from query params
function isDemoMode(): 'cable' | false {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (demo === 'cable') return 'cable';
  return false;
}

// Get WebSocket URL from query params or default
function getWebSocketUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const wsUrl = params.get('ws');
  if (wsUrl) return wsUrl;

  // Default: connect to same host on port 8765
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  const port = params.get('port') || '8765';
  return `${protocol}//${host}:${port}`;
}

function StatusBar() {
  const { connected, robots, obstacles, safetyZones, waypoints, trajectories, collisionResult, collisionEnabled, pointClouds } = useViewerStore();

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 4,
        color: 'white',
        fontSize: 12,
        fontFamily: 'monospace',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? '#00ff00' : '#ff4444',
          }}
        />
        {connected ? 'Connected' : 'Disconnected'}
      </span>
      <span>Robots: {robots.size}</span>
      <span>Obstacles: {obstacles.size}</span>
      <span>Zones: {safetyZones.size}</span>
      <span>Waypoints: {waypoints.size}</span>
      <span>Trajectories: {trajectories.size}</span>
      {pointClouds.size > 0 && <span>PointClouds: {pointClouds.size}</span>}
      {collisionEnabled && (
        <span
          style={{
            color: collisionResult?.hasCollision ? '#ff4444' : '#00ff00',
            fontWeight: collisionResult?.hasCollision ? 'bold' : 'normal',
          }}
        >
          {collisionResult?.hasCollision ? `Collision (${collisionResult.pairs.length})` : 'No Collision'}
        </span>
      )}
    </div>
  );
}

function PlaybackControls() {
  const { playback, trajectories, pausePlayback, stopPlayback, setPlayback, startPlayback } = useViewerStore();

  // Only show if there are trajectories or active playback
  if (trajectories.size === 0 && !playback.activeTrajectoryId) {
    return null;
  }

  const activeTrajectory = playback.activeTrajectoryId
    ? trajectories.get(playback.activeTrajectoryId)
    : null;

  const duration = activeTrajectory
    ? activeTrajectory.data.times[activeTrajectory.data.times.length - 1] || 0
    : 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 20px',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: 8,
        color: 'white',
        fontSize: 12,
        fontFamily: 'system-ui',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        minWidth: 400,
      }}
    >
      {/* Play/Pause button */}
      <button
        onClick={() => {
          if (playback.isPlaying) {
            pausePlayback();
          } else if (playback.activeTrajectoryId) {
            setPlayback({ isPlaying: true });
          } else if (trajectories.size > 0) {
            // Start first trajectory
            const firstTraj = Array.from(trajectories.values())[0];
            startPlayback(firstTraj.id);
          }
        }}
        style={{
          background: playback.isPlaying ? '#ff6b6b' : '#4ecdc4',
          border: 'none',
          borderRadius: 4,
          padding: '8px 16px',
          color: 'white',
          cursor: 'pointer',
          fontWeight: 'bold',
          minWidth: 70,
        }}
      >
        {playback.isPlaying ? 'Pause' : 'Play'}
      </button>

      {/* Stop button */}
      <button
        onClick={stopPlayback}
        style={{
          background: '#666',
          border: 'none',
          borderRadius: 4,
          padding: '8px 16px',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        Stop
      </button>

      {/* Progress bar */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ minWidth: 50, textAlign: 'right' }}>
          {playback.currentTime.toFixed(1)}s
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={playback.progress * 100}
          onChange={(e) => {
            const progress = parseFloat(e.target.value) / 100;
            const newTime = progress * duration;
            setPlayback({
              currentTime: newTime,
              progress,
            });
          }}
          style={{
            flex: 1,
            height: 4,
            cursor: 'pointer',
          }}
        />
        <span style={{ minWidth: 50 }}>
          {duration.toFixed(1)}s
        </span>
      </div>

      {/* Speed control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>Speed:</span>
        <select
          value={playback.speed}
          onChange={(e) => setPlayback({ speed: parseFloat(e.target.value) })}
          style={{
            background: '#333',
            border: '1px solid #555',
            borderRadius: 4,
            padding: '4px 8px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          <option value={0.25}>0.25x</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>

      {/* Loop toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={playback.loop}
          onChange={(e) => setPlayback({ loop: e.target.checked })}
        />
        Loop
      </label>
    </div>
  );
}

interface ViewerSceneProps {
  onTrajectoryEnded?: (trajectoryId: string) => void;
  onRobotSelect?: (robotId: string, linkName?: string) => void;
  onRobotJointChange?: (robotId: string, angles: number[]) => void;
  onCollisionDetected?: (pairs: CollisionPair[]) => void;
  onCollisionCleared?: () => void;
  onPointCloudClick?: (pointCloudId: string, pointIndex: number, position: Vector3) => void;
  demoMode?: 'cable' | false;
}

function ViewerScene({ onTrajectoryEnded, onRobotSelect, onRobotJointChange, onCollisionDetected, onCollisionCleared, onPointCloudClick, demoMode }: ViewerSceneProps) {
  const { scene, camera, robots, obstacles, safetyZones, waypoints } = useViewerStore();

  return (
    <Scene config={scene} camera={camera}>
      {/* Demo mode: Cable Management */}
      {demoMode === 'cable' && <CableDemo visible />}

      {/* Normal mode: Trajectory playback controller */}
      {!demoMode && <TrajectoryPlayer onTrajectoryEnded={onTrajectoryEnded} />}

      {/* Render robots */}
      {!demoMode && Array.from(robots.values()).map((robot) => (
        <Robot
          key={robot.id}
          data={robot}
          onSelect={onRobotSelect}
          onJointChange={onRobotJointChange}
        />
      ))}

      {/* Render obstacles */}
      {!demoMode && Array.from(obstacles.values()).map((obstacle) => (
        <Obstacle key={obstacle.id} data={obstacle} />
      ))}

      {/* Render safety zones */}
      {!demoMode && Array.from(safetyZones.values()).map((zone) => (
        <SafetyZone key={zone.id} data={zone} />
      ))}

      {/* Render waypoints */}
      {!demoMode && Array.from(waypoints.values()).map((waypoint) => (
        <Waypoint key={waypoint.id} data={waypoint} />
      ))}

      {/* Collision detection and visualization */}
      {!demoMode && (
        <CollisionVisualizer
          onCollisionDetected={onCollisionDetected}
          onCollisionCleared={onCollisionCleared}
        />
      )}

      {/* Coordinate frame tree */}
      {!demoMode && <FrameTree />}

      {/* Point clouds */}
      {!demoMode && <PointCloudRenderer onPointCloudClick={onPointCloudClick} />}
    </Scene>
  );
}

export default function App() {
  const wsUrl = React.useMemo(() => getWebSocketUrl(), []);
  const demoMode = React.useMemo(() => isDemoMode(), []);

  // Connect to WebSocket server (skip in demo mode)
  const { sendEvent } = useWebSocket(wsUrl, {
    autoConnect: !demoMode,
    reconnect: !demoMode,
    reconnectInterval: 2000,
    debug: true,
  });

  // Handle trajectory ended event
  const handleTrajectoryEnded = React.useCallback((trajectoryId: string) => {
    console.log('Trajectory ended:', trajectoryId);
    sendEvent('trajectory.ended', { trajectoryId });
  }, [sendEvent]);

  // Handle robot click event
  const handleRobotSelect = React.useCallback((robotId: string, linkName?: string) => {
    console.log('Robot clicked:', robotId, linkName);
    sendEvent('robot.clicked', { robotId, linkName });
  }, [sendEvent]);

  // Handle joint change from dragging
  const handleRobotJointChange = React.useCallback((robotId: string, angles: number[]) => {
    // Send event to SDK so it knows about the change
    sendEvent('robot.jointsChanged', { robotId, angles });
  }, [sendEvent]);

  // Handle collision detected
  const handleCollisionDetected = React.useCallback((pairs: CollisionPair[]) => {
    console.log('Collision detected:', pairs.length, 'pairs');
    sendEvent('collision.detected', {
      pairs: pairs.map(p => ({
        objectA: p.objectA,
        objectB: p.objectB,
        contactPoint: p.contactPoint,
        penetrationDepth: p.penetrationDepth,
      })),
      timestamp: Date.now(),
    });
  }, [sendEvent]);

  // Handle collision cleared
  const handleCollisionCleared = React.useCallback(() => {
    console.log('Collision cleared');
    sendEvent('collision.cleared', { timestamp: Date.now() });
  }, [sendEvent]);

  // Handle point cloud click
  const handlePointCloudClick = React.useCallback((pointCloudId: string, pointIndex: number, position: Vector3) => {
    console.log('Point cloud clicked:', pointCloudId, pointIndex, position);
    sendEvent('pointCloud.clicked', { pointCloudId, pointIndex, position });
  }, [sendEvent]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts({ enabled: true });

  // State for showing keyboard help
  const [showKeyboardHelp, setShowKeyboardHelp] = React.useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ViewerScene
        onTrajectoryEnded={handleTrajectoryEnded}
        onRobotSelect={handleRobotSelect}
        onRobotJointChange={handleRobotJointChange}
        onCollisionDetected={handleCollisionDetected}
        onCollisionCleared={handleCollisionCleared}
        onPointCloudClick={handlePointCloudClick}
        demoMode={demoMode}
      />
      {!demoMode && <StatusBar />}
      {!demoMode && <PlaybackControls />}
      {!demoMode && <ControlPanel onJointChange={handleRobotJointChange} />}

      {/* Cable Demo Panel */}
      {demoMode === 'cable' && <CableDemoPanel />}

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 4,
          color: 'white',
          fontSize: 14,
          fontFamily: 'system-ui',
        }}
      >
        {demoMode === 'cable' ? 'RoboViz - 线束管理演示' : 'RoboViz Viewer'}
      </div>

      {/* Connection info (hide in demo mode) */}
      {!demoMode && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 4,
            color: '#888',
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        >
          WS: {wsUrl}
        </div>
      )}

      {/* Keyboard shortcuts help button */}
      <button
        onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          border: 'none',
          borderRadius: 4,
          padding: '8px 12px',
          color: '#888',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        ? Shortcuts
      </button>

      {/* Keyboard shortcuts help overlay */}
      {showKeyboardHelp && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            borderRadius: 8,
            padding: 24,
            color: 'white',
            fontSize: 12,
            fontFamily: 'system-ui',
            maxWidth: 400,
            zIndex: 100,
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Keyboard Shortcuts</h3>
          {['Playback', 'View', 'Camera'].map((category) => (
            <div key={category} style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#4ecdc4' }}>{category}</h4>
              {getKeyboardShortcuts()
                .filter((s) => s.category === category)
                .map((shortcut) => (
                  <div
                    key={shortcut.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: '#aaa' }}>{shortcut.description}</span>
                    <kbd
                      style={{
                        background: '#333',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 10,
                        fontFamily: 'monospace',
                      }}
                    >
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
            </div>
          ))}
          <button
            onClick={() => setShowKeyboardHelp(false)}
            style={{
              marginTop: 8,
              background: '#4ecdc4',
              border: 'none',
              borderRadius: 4,
              padding: '8px 16px',
              color: '#000',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
