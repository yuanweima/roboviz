import React from 'react';

interface ControlPanelProps {
  jointAngles: number[];
  onJointChange: (index: number, value: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onHome: () => void;
  showAxes: boolean;
  onShowAxesChange: (value: boolean) => void;
  showGrid: boolean;
  onShowGridChange: (value: boolean) => void;
  animationSpeed: number;
  onAnimationSpeedChange: (value: number) => void;
}

const JOINT_LIMITS: [number, number][] = [
  [-3.14, 3.14],   // J1
  [-2.0, 2.0],     // J2
  [-2.5, 2.5],     // J3
  [-6.28, 6.28],   // J4
  [-2.0, 2.0],     // J5
  [-6.28, 6.28],   // J6
];

const JOINT_NAMES = ['J1 (Base)', 'J2 (Shoulder)', 'J3 (Elbow)', 'J4 (Wrist 1)', 'J5 (Wrist 2)', 'J6 (Wrist 3)'];

export function ControlPanel({
  jointAngles,
  onJointChange,
  isPlaying,
  onPlay,
  onPause,
  onHome,
  showAxes,
  onShowAxesChange,
  showGrid,
  onShowGridChange,
  animationSpeed,
  onAnimationSpeedChange,
}: ControlPanelProps) {
  return (
    <div className="control-panel">
      {/* 播放控制 */}
      <section className="section">
        <h3>Playback</h3>
        <div className="button-group">
          <button
            className={`btn ${isPlaying ? 'btn-secondary' : 'btn-primary'}`}
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="btn btn-secondary" onClick={onHome}>
            🏠 Home
          </button>
        </div>

        <div className="slider-group">
          <label>
            Speed: {animationSpeed.toFixed(1)}x
          </label>
          <input
            type="range"
            min={0.1}
            max={3.0}
            step={0.1}
            value={animationSpeed}
            onChange={(e) => onAnimationSpeedChange(parseFloat(e.target.value))}
          />
        </div>
      </section>

      {/* 关节控制 */}
      <section className="section">
        <h3>Joint Control</h3>
        {JOINT_NAMES.map((name, index) => {
          const [min, max] = JOINT_LIMITS[index];
          const value = jointAngles[index] ?? 0;
          const degrees = (value * 180 / Math.PI).toFixed(1);

          return (
            <div key={name} className="slider-group">
              <label>
                {name}: {degrees}°
              </label>
              <input
                type="range"
                min={min}
                max={max}
                step={0.01}
                value={value}
                onChange={(e) => onJointChange(index, parseFloat(e.target.value))}
                disabled={isPlaying}
              />
            </div>
          );
        })}
      </section>

      {/* 可视化选项 */}
      <section className="section">
        <h3>Visualization</h3>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => onShowAxesChange(e.target.checked)}
            />
            Show Axes
          </label>
          <label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => onShowGridChange(e.target.checked)}
            />
            Show Grid
          </label>
        </div>
      </section>

      {/* 预设位置 */}
      <section className="section">
        <h3>Presets</h3>
        <div className="button-group vertical">
          <button
            className="btn btn-secondary"
            onClick={() => {
              onJointChange(0, 0);
              onJointChange(1, -0.5);
              onJointChange(2, 0.8);
              onJointChange(3, 0);
              onJointChange(4, -0.3);
              onJointChange(5, 0);
            }}
            disabled={isPlaying}
          >
            Ready Position
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              onJointChange(0, 0.8);
              onJointChange(1, -0.3);
              onJointChange(2, 1.0);
              onJointChange(3, 0);
              onJointChange(4, -0.7);
              onJointChange(5, 0);
            }}
            disabled={isPlaying}
          >
            Pick Position
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              onJointChange(0, -0.8);
              onJointChange(1, -0.3);
              onJointChange(2, 1.0);
              onJointChange(3, 0);
              onJointChange(4, -0.7);
              onJointChange(5, 0);
            }}
            disabled={isPlaying}
          >
            Place Position
          </button>
        </div>
      </section>
    </div>
  );
}
