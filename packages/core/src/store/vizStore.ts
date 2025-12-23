/**
 * Internal state store for RoboViz
 */
import { create } from 'zustand';
import type {
  RobotState,
  TrajectoryState,
  WaypointData,
  ObstacleData,
  SceneConfig,
  CameraState,
  PlaybackState,
} from '../types';

export interface VizState {
  // Scene configuration
  scene: SceneConfig;
  
  // Robots
  robots: Map<string, RobotState>;
  
  // Trajectories
  trajectories: Map<string, TrajectoryState>;
  playback: PlaybackState;
  
  // Waypoints
  waypoints: Map<string, WaypointData>;
  selectedWaypointId: string | null;
  
  // Obstacles
  obstacles: Map<string, ObstacleData>;
  
  // Camera
  camera: CameraState;
  
  // Interaction state
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  
  // Actions
  setScene: (config: Partial<SceneConfig>) => void;
  addRobot: (robot: RobotState) => void;
  removeRobot: (id: string) => void;
  updateRobot: (id: string, updates: Partial<RobotState>) => void;
  setRobotJointAngles: (id: string, angles: number[]) => void;
  addTrajectory: (trajectory: TrajectoryState) => void;
  removeTrajectory: (id: string) => void;
  setPlayback: (state: Partial<PlaybackState>) => void;
  addWaypoint: (waypoint: WaypointData) => void;
  removeWaypoint: (id: string) => void;
  selectWaypoint: (id: string | null) => void;
  addObstacle: (obstacle: ObstacleData) => void;
  removeObstacle: (id: string) => void;
  setCamera: (state: Partial<CameraState>) => void;
  selectObject: (id: string | null) => void;
  hoverObject: (id: string | null) => void;
  reset: () => void;
}

const defaultScene: SceneConfig = {
  background: '#0a0a0a',
  grid: {
    enabled: true,
    size: 10,
    divisions: 10,
    color: '#4a4a4a',
  },
  lighting: {
    ambient: { intensity: 0.4, color: '#ffffff' },
    directional: { intensity: 0.8, position: { x: 10, y: 10, z: 5 } },
  },
};

const defaultCamera: CameraState = {
  position: { x: 3, y: 3, z: 3 },
  target: { x: 0, y: 0, z: 0 },
  fov: 50,
};

const defaultPlayback: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  speed: 1.0,
  loop: false,
  activeTrajectoryId: null,
};

export const useVizStore = create<VizState>((set) => ({
  scene: defaultScene,
  robots: new Map(),
  trajectories: new Map(),
  playback: defaultPlayback,
  waypoints: new Map(),
  selectedWaypointId: null,
  obstacles: new Map(),
  camera: defaultCamera,
  selectedObjectId: null,
  hoveredObjectId: null,
  
  setScene: (config) => set((state) => ({
    scene: { ...state.scene, ...config },
  })),
  
  addRobot: (robot) => set((state) => {
    const newRobots = new Map(state.robots);
    newRobots.set(robot.id, robot);
    return { robots: newRobots };
  }),
  
  removeRobot: (id) => set((state) => {
    const newRobots = new Map(state.robots);
    newRobots.delete(id);
    return { robots: newRobots };
  }),
  
  updateRobot: (id, updates) => set((state) => {
    const robot = state.robots.get(id);
    if (!robot) return state;
    const newRobots = new Map(state.robots);
    newRobots.set(id, { ...robot, ...updates });
    return { robots: newRobots };
  }),
  
  setRobotJointAngles: (id, angles) => set((state) => {
    const robot = state.robots.get(id);
    if (!robot) return state;
    const newRobots = new Map(state.robots);
    newRobots.set(id, { ...robot, jointAngles: angles });
    return { robots: newRobots };
  }),
  
  addTrajectory: (trajectory) => set((state) => {
    const newTrajectories = new Map(state.trajectories);
    newTrajectories.set(trajectory.id, trajectory);
    return { trajectories: newTrajectories };
  }),
  
  removeTrajectory: (id) => set((state) => {
    const newTrajectories = new Map(state.trajectories);
    newTrajectories.delete(id);
    return { trajectories: newTrajectories };
  }),
  
  setPlayback: (updates) => set((state) => ({
    playback: { ...state.playback, ...updates },
  })),
  
  addWaypoint: (waypoint) => set((state) => {
    const newWaypoints = new Map(state.waypoints);
    newWaypoints.set(waypoint.id, waypoint);
    return { waypoints: newWaypoints };
  }),
  
  removeWaypoint: (id) => set((state) => {
    const newWaypoints = new Map(state.waypoints);
    newWaypoints.delete(id);
    return { waypoints: newWaypoints };
  }),
  
  selectWaypoint: (id) => set({ selectedWaypointId: id }),
  
  addObstacle: (obstacle) => set((state) => {
    const newObstacles = new Map(state.obstacles);
    newObstacles.set(obstacle.id, obstacle);
    return { obstacles: newObstacles };
  }),
  
  removeObstacle: (id) => set((state) => {
    const newObstacles = new Map(state.obstacles);
    newObstacles.delete(id);
    return { obstacles: newObstacles };
  }),
  
  setCamera: (updates) => set((state) => ({
    camera: { ...state.camera, ...updates },
  })),
  
  selectObject: (id) => set({ selectedObjectId: id }),
  hoverObject: (id) => set({ hoveredObjectId: id }),
  
  reset: () => set({
    scene: defaultScene,
    robots: new Map(),
    trajectories: new Map(),
    playback: defaultPlayback,
    waypoints: new Map(),
    selectedWaypointId: null,
    obstacles: new Map(),
    camera: defaultCamera,
    selectedObjectId: null,
    hoveredObjectId: null,
  }),
}));
