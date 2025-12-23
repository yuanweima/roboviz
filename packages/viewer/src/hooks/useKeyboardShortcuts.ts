/**
 * Keyboard Shortcuts Hook
 * Provides keyboard shortcuts for common viewer operations
 */
import { useEffect, useCallback } from 'react';
import { useViewerStore } from '../store/viewerStore';

export interface KeyboardShortcutConfig {
  /** Enable/disable keyboard shortcuts */
  enabled?: boolean;
  /** Called when play/pause is toggled */
  onPlayPauseToggle?: () => void;
  /** Called when stop is pressed */
  onStop?: () => void;
  /** Called when reset view is requested */
  onResetView?: () => void;
}

// Camera preset positions for quick access
const CAMERA_PRESETS = {
  front: { position: [0, 0, 3] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  back: { position: [0, 0, -3] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  left: { position: [-3, 0, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  right: { position: [3, 0, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  top: { position: [0, 3, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  iso: { position: [2, 2, 2] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
};

/**
 * Keyboard shortcuts:
 * - Space: Play/Pause trajectory
 * - Escape: Stop trajectory
 * - G: Toggle grid
 * - C: Toggle collision detection
 * - F: Toggle coordinate frames
 * - P: Toggle point clouds
 * - S: Toggle shadows
 * - H: Toggle control panel (handled externally)
 * - R: Reset camera to default
 * - 1: Front view
 * - 2: Back view
 * - 3: Left view
 * - 4: Right view
 * - 5: Top view
 * - 6: Isometric view
 * - +: Increase playback speed
 * - -: Decrease playback speed
 */
export function useKeyboardShortcuts(config: KeyboardShortcutConfig = {}) {
  const { enabled = true, onPlayPauseToggle, onStop, onResetView } = config;

  const {
    playback,
    setPlayback,
    pausePlayback,
    stopPlayback,
    scene,
    setScene,
    setCamera,
    collisionEnabled,
    setCollisionEnabled,
    framesEnabled,
    setFramesEnabled,
    pointCloudsEnabled,
    setPointCloudsEnabled,
    trajectories,
    startPlayback,
  } = useViewerStore();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    // Check for modifier keys
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

    switch (event.key.toLowerCase()) {
      // Playback controls
      case ' ':
        event.preventDefault();
        if (playback.isPlaying) {
          pausePlayback();
        } else if (playback.activeTrajectoryId) {
          setPlayback({ isPlaying: true });
        } else if (trajectories.size > 0) {
          const firstTraj = Array.from(trajectories.values())[0];
          startPlayback(firstTraj.id);
        }
        onPlayPauseToggle?.();
        break;

      case 'escape':
        stopPlayback();
        onStop?.();
        break;

      // Speed controls
      case '+':
      case '=':
        event.preventDefault();
        if (playback.speed < 4) {
          const newSpeed = Math.min(4, playback.speed * 1.5);
          setPlayback({ speed: Math.round(newSpeed * 10) / 10 });
        }
        break;

      case '-':
      case '_':
        event.preventDefault();
        if (playback.speed > 0.25) {
          const newSpeed = Math.max(0.25, playback.speed / 1.5);
          setPlayback({ speed: Math.round(newSpeed * 10) / 10 });
        }
        break;

      // View toggles
      case 'g':
        if (!hasModifier) {
          setScene({ grid: { ...scene.grid, enabled: !scene.grid.enabled } });
        }
        break;

      case 'c':
        if (!hasModifier) {
          setCollisionEnabled(!collisionEnabled);
        }
        break;

      case 'f':
        if (!hasModifier) {
          setFramesEnabled(!framesEnabled);
        }
        break;

      case 'p':
        if (!hasModifier) {
          setPointCloudsEnabled(!pointCloudsEnabled);
        }
        break;

      case 's':
        if (!hasModifier) {
          setScene({ shadows: !(scene.shadows ?? true) });
        }
        break;

      // Camera presets
      case 'r':
        if (!hasModifier) {
          setCamera({ position: [3, 2, 3], target: [0, 0, 0], fov: 50 });
          onResetView?.();
        }
        break;

      case '1':
        if (!hasModifier) {
          setCamera(CAMERA_PRESETS.front);
        }
        break;

      case '2':
        if (!hasModifier) {
          setCamera(CAMERA_PRESETS.back);
        }
        break;

      case '3':
        if (!hasModifier) {
          setCamera(CAMERA_PRESETS.left);
        }
        break;

      case '4':
        if (!hasModifier) {
          setCamera(CAMERA_PRESETS.right);
        }
        break;

      case '5':
        if (!hasModifier) {
          setCamera(CAMERA_PRESETS.top);
        }
        break;

      case '6':
        if (!hasModifier) {
          setCamera(CAMERA_PRESETS.iso);
        }
        break;
    }
  }, [
    playback,
    setPlayback,
    pausePlayback,
    stopPlayback,
    scene,
    setScene,
    setCamera,
    collisionEnabled,
    setCollisionEnabled,
    framesEnabled,
    setFramesEnabled,
    pointCloudsEnabled,
    setPointCloudsEnabled,
    trajectories,
    startPlayback,
    onPlayPauseToggle,
    onStop,
    onResetView,
  ]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Returns a list of available keyboard shortcuts for display
 */
export function getKeyboardShortcuts(): Array<{ key: string; description: string; category: string }> {
  return [
    // Playback
    { key: 'Space', description: 'Play/Pause trajectory', category: 'Playback' },
    { key: 'Esc', description: 'Stop trajectory', category: 'Playback' },
    { key: '+', description: 'Increase speed', category: 'Playback' },
    { key: '-', description: 'Decrease speed', category: 'Playback' },
    // View toggles
    { key: 'G', description: 'Toggle grid', category: 'View' },
    { key: 'C', description: 'Toggle collision detection', category: 'View' },
    { key: 'F', description: 'Toggle coordinate frames', category: 'View' },
    { key: 'P', description: 'Toggle point clouds', category: 'View' },
    { key: 'S', description: 'Toggle shadows', category: 'View' },
    // Camera
    { key: 'R', description: 'Reset camera', category: 'Camera' },
    { key: '1', description: 'Front view', category: 'Camera' },
    { key: '2', description: 'Back view', category: 'Camera' },
    { key: '3', description: 'Left view', category: 'Camera' },
    { key: '4', description: 'Right view', category: 'Camera' },
    { key: '5', description: 'Top view', category: 'Camera' },
    { key: '6', description: 'Isometric view', category: 'Camera' },
  ];
}
