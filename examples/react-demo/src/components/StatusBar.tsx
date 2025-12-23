import { useAppStore } from '../store';

export function StatusBar() {
  const { performance, robots, activeRobotId, logs } = useAppStore();
  const activeRobot = activeRobotId ? robots.get(activeRobotId) : null;

  const lastLog = logs[logs.length - 1];

  return (
    <footer className="status-bar">
      <div className="status-section">
        <span className="status-label">FPS:</span>
        <span className={`status-value ${performance.fps < 30 ? 'warning' : ''}`}>
          {performance.fps.toFixed(0)}
        </span>
      </div>

      <div className="status-section">
        <span className="status-label">Frame:</span>
        <span className="status-value">{performance.frameTime.toFixed(1)}ms</span>
      </div>

      {activeRobot && (
        <div className="status-section">
          <span className="status-label">Robot:</span>
          <span className="status-value">{activeRobot.id}</span>
        </div>
      )}

      {activeRobot && (
        <div className="status-section joints">
          <span className="status-label">Joints:</span>
          <span className="status-value">
            {activeRobot.jointAngles.map((a, i) => (
              <span key={i} className="joint-value">
                J{i + 1}: {(a * 180 / Math.PI).toFixed(1)}°
              </span>
            ))}
          </span>
        </div>
      )}

      {lastLog && (
        <div className={`status-section log ${lastLog.level}`}>
          <span className="status-value">{lastLog.message}</span>
        </div>
      )}
    </footer>
  );
}
