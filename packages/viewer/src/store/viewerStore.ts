/**
 * Viewer state store
 * Manages all visualization state, updated via protocol messages
 */
import { create } from 'zustand';
import type {
  RobotState,
  TrajectoryState,
  ObstacleState,
  SafetyZoneState,
  WaypointState,
  SceneConfig,
  CameraConfig,
  Pose,
  CollisionGeometryState,
  CollisionResult,
  CollisionVisualizationConfig,
  CoordinateFrameState,
  FrameTreeVisualizationConfig,
  PointCloudState,
  PointCloudVisualization,
} from '../types';
import { DEFAULT_COLLISION_VISUALIZATION } from '../types';

// Playback state for active trajectory
export interface PlaybackState {
  activeTrajectoryId: string | null;
  isPlaying: boolean;
  currentTime: number;
  progress: number;
  speed: number;
  loop: boolean;
}

export interface ViewerState {
  // Scene
  scene: SceneConfig;
  camera: CameraConfig;

  // Entities
  robots: Map<string, RobotState>;
  trajectories: Map<string, TrajectoryState>;
  obstacles: Map<string, ObstacleState>;
  safetyZones: Map<string, SafetyZoneState>;
  waypoints: Map<string, WaypointState>;

  // Playback state
  playback: PlaybackState;

  // Collision state
  collisionGeometries: Map<string, CollisionGeometryState>;
  collisionResult: CollisionResult | null;
  collisionConfig: CollisionVisualizationConfig;
  collisionEnabled: boolean;

  // Coordinate frames state
  coordinateFrames: Map<string, CoordinateFrameState>;
  frameTreeConfig: FrameTreeVisualizationConfig;
  framesEnabled: boolean;

  // Point cloud state
  pointClouds: Map<string, PointCloudState>;
  pointCloudsEnabled: boolean;

  // Connection status
  connected: boolean;
  clientCount: number;

  // Actions - Scene
  setScene: (config: Partial<SceneConfig>) => void;
  setCamera: (config: Partial<CameraConfig>) => void;

  // Actions - Robots
  addRobot: (robot: RobotState) => void;
  removeRobot: (id: string) => void;
  updateRobot: (id: string, updates: Partial<RobotState>) => void;
  setRobotJoints: (id: string, joints: number[]) => void;
  setRobotTcpPose: (id: string, pose: Pose) => void;

  // Actions - Trajectories
  addTrajectory: (trajectory: TrajectoryState) => void;
  removeTrajectory: (id: string) => void;
  updateTrajectory: (id: string, updates: Partial<TrajectoryState>) => void;

  // Actions - Playback
  setPlayback: (updates: Partial<PlaybackState>) => void;
  startPlayback: (trajectoryId: string) => void;
  pausePlayback: () => void;
  stopPlayback: () => void;

  // Actions - Obstacles
  addObstacle: (obstacle: ObstacleState) => void;
  removeObstacle: (id: string) => void;
  clearObstacles: () => void;

  // Actions - Safety Zones
  addSafetyZone: (zone: SafetyZoneState) => void;
  removeSafetyZone: (id: string) => void;

  // Actions - Waypoints
  addWaypoint: (waypoint: WaypointState) => void;
  removeWaypoint: (id: string) => void;
  clearWaypoints: () => void;

  // Actions - Collision
  addCollisionGeometry: (geometry: CollisionGeometryState) => void;
  removeCollisionGeometry: (id: string) => void;
  updateCollisionGeometry: (id: string, updates: Partial<CollisionGeometryState>) => void;
  clearCollisionGeometries: () => void;
  setCollisionResult: (result: CollisionResult | null) => void;
  setCollisionConfig: (config: Partial<CollisionVisualizationConfig>) => void;
  setCollisionEnabled: (enabled: boolean) => void;

  // Actions - Coordinate Frames
  addFrame: (frame: CoordinateFrameState) => void;
  removeFrame: (id: string) => void;
  updateFrame: (id: string, updates: Partial<CoordinateFrameState>) => void;
  clearFrames: () => void;
  setFrameTreeConfig: (config: Partial<FrameTreeVisualizationConfig>) => void;
  setFramesEnabled: (enabled: boolean) => void;

  // Actions - Point Clouds
  addPointCloud: (pointCloud: PointCloudState) => void;
  removePointCloud: (id: string) => void;
  updatePointCloud: (id: string, updates: Partial<PointCloudState>) => void;
  setPointCloudVisualization: (id: string, visualization: Partial<PointCloudVisualization>) => void;
  clearPointClouds: () => void;
  setPointCloudsEnabled: (enabled: boolean) => void;

  // Actions - Connection
  setConnected: (connected: boolean) => void;
  setClientCount: (count: number) => void;

  // Actions - Reset
  reset: () => void;
}

const defaultScene: SceneConfig = {
  background: '#1a1a2e',
  grid: {
    enabled: true,
    size: 10,
    divisions: 20,
    color: '#404060',
  },
};

const defaultCamera: CameraConfig = {
  position: [3, 2, 3],
  target: [0, 0, 0],
  fov: 50,
};

const defaultPlayback: PlaybackState = {
  activeTrajectoryId: null,
  isPlaying: false,
  currentTime: 0,
  progress: 0,
  speed: 1,
  loop: false,
};

const defaultFrameTreeConfig: FrameTreeVisualizationConfig = {
  visible: true,
  showConnections: true,
  connectionColor: '#888888',
  connectionStyle: 'solid',
};

export const useViewerStore = create<ViewerState>((set) => ({
  // Initial state
  scene: defaultScene,
  camera: defaultCamera,
  robots: new Map(),
  trajectories: new Map(),
  obstacles: new Map(),
  safetyZones: new Map(),
  waypoints: new Map(),
  playback: defaultPlayback,
  collisionGeometries: new Map(),
  collisionResult: null,
  collisionConfig: DEFAULT_COLLISION_VISUALIZATION,
  collisionEnabled: true,
  coordinateFrames: new Map(),
  frameTreeConfig: defaultFrameTreeConfig,
  framesEnabled: true,
  pointClouds: new Map(),
  pointCloudsEnabled: true,
  connected: false,
  clientCount: 0,

  // Scene actions
  setScene: (config) => set((state) => ({
    scene: { ...state.scene, ...config },
  })),

  setCamera: (config) => set((state) => ({
    camera: { ...state.camera, ...config },
  })),

  // Robot actions
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

  setRobotJoints: (id, joints) => set((state) => {
    const robot = state.robots.get(id);
    if (!robot) return state;
    const newRobots = new Map(state.robots);
    newRobots.set(id, { ...robot, joints });
    return { robots: newRobots };
  }),

  setRobotTcpPose: (id, pose) => set((state) => {
    const robot = state.robots.get(id);
    if (!robot) return state;
    const newRobots = new Map(state.robots);
    newRobots.set(id, { ...robot, tcpPose: pose });
    return { robots: newRobots };
  }),

  // Trajectory actions
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

  updateTrajectory: (id, updates) => set((state) => {
    const traj = state.trajectories.get(id);
    if (!traj) return state;
    const newTrajectories = new Map(state.trajectories);
    newTrajectories.set(id, { ...traj, ...updates });
    return { trajectories: newTrajectories };
  }),

  // Playback actions
  setPlayback: (updates) => set((state) => ({
    playback: { ...state.playback, ...updates },
  })),

  startPlayback: (trajectoryId) => set((state) => {
    const trajectory = state.trajectories.get(trajectoryId);
    if (!trajectory) return state;
    return {
      playback: {
        ...state.playback,
        activeTrajectoryId: trajectoryId,
        isPlaying: true,
        currentTime: 0,
        progress: 0,
        speed: trajectory.speed || 1,
        loop: trajectory.loop || false,
      },
    };
  }),

  pausePlayback: () => set((state) => ({
    playback: { ...state.playback, isPlaying: false },
  })),

  stopPlayback: () => set({
    playback: defaultPlayback,
  }),

  // Obstacle actions
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

  clearObstacles: () => set({ obstacles: new Map() }),

  // Safety Zone actions
  addSafetyZone: (zone) => set((state) => {
    const newZones = new Map(state.safetyZones);
    newZones.set(zone.id, zone);
    return { safetyZones: newZones };
  }),

  removeSafetyZone: (id) => set((state) => {
    const newZones = new Map(state.safetyZones);
    newZones.delete(id);
    return { safetyZones: newZones };
  }),

  // Waypoint actions
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

  clearWaypoints: () => set({ waypoints: new Map() }),

  // Collision actions
  addCollisionGeometry: (geometry) => set((state) => {
    const newGeometries = new Map(state.collisionGeometries);
    newGeometries.set(geometry.id, geometry);
    return { collisionGeometries: newGeometries };
  }),

  removeCollisionGeometry: (id) => set((state) => {
    const newGeometries = new Map(state.collisionGeometries);
    newGeometries.delete(id);
    return { collisionGeometries: newGeometries };
  }),

  updateCollisionGeometry: (id, updates) => set((state) => {
    const geometry = state.collisionGeometries.get(id);
    if (!geometry) return state;
    const newGeometries = new Map(state.collisionGeometries);
    newGeometries.set(id, { ...geometry, ...updates });
    return { collisionGeometries: newGeometries };
  }),

  clearCollisionGeometries: () => set({ collisionGeometries: new Map() }),

  setCollisionResult: (result) => set({ collisionResult: result }),

  setCollisionConfig: (config) => set((state) => ({
    collisionConfig: { ...state.collisionConfig, ...config },
  })),

  setCollisionEnabled: (enabled) => set({ collisionEnabled: enabled }),

  // Coordinate frame actions
  addFrame: (frame) => set((state) => {
    const newFrames = new Map(state.coordinateFrames);
    newFrames.set(frame.id, frame);
    return { coordinateFrames: newFrames };
  }),

  removeFrame: (id) => set((state) => {
    const newFrames = new Map(state.coordinateFrames);
    newFrames.delete(id);
    return { coordinateFrames: newFrames };
  }),

  updateFrame: (id, updates) => set((state) => {
    const frame = state.coordinateFrames.get(id);
    if (!frame) return state;
    const newFrames = new Map(state.coordinateFrames);
    newFrames.set(id, { ...frame, ...updates });
    return { coordinateFrames: newFrames };
  }),

  clearFrames: () => set({ coordinateFrames: new Map() }),

  setFrameTreeConfig: (config) => set((state) => ({
    frameTreeConfig: { ...state.frameTreeConfig, ...config },
  })),

  setFramesEnabled: (enabled) => set({ framesEnabled: enabled }),

  // Point cloud actions
  addPointCloud: (pointCloud) => set((state) => {
    const newPointClouds = new Map(state.pointClouds);
    newPointClouds.set(pointCloud.data.id, pointCloud);
    return { pointClouds: newPointClouds };
  }),

  removePointCloud: (id) => set((state) => {
    const newPointClouds = new Map(state.pointClouds);
    newPointClouds.delete(id);
    return { pointClouds: newPointClouds };
  }),

  updatePointCloud: (id, updates) => set((state) => {
    const pointCloud = state.pointClouds.get(id);
    if (!pointCloud) return state;
    const newPointClouds = new Map(state.pointClouds);
    newPointClouds.set(id, { ...pointCloud, ...updates });
    return { pointClouds: newPointClouds };
  }),

  setPointCloudVisualization: (id, visualization) => set((state) => {
    const pointCloud = state.pointClouds.get(id);
    if (!pointCloud) return state;
    const newPointClouds = new Map(state.pointClouds);
    newPointClouds.set(id, {
      ...pointCloud,
      visualization: { ...pointCloud.visualization, ...visualization },
    });
    return { pointClouds: newPointClouds };
  }),

  clearPointClouds: () => set({ pointClouds: new Map() }),

  setPointCloudsEnabled: (enabled) => set({ pointCloudsEnabled: enabled }),

  // Connection actions
  setConnected: (connected) => set({ connected }),
  setClientCount: (clientCount) => set({ clientCount }),

  // Reset
  reset: () => set({
    scene: defaultScene,
    camera: defaultCamera,
    robots: new Map(),
    trajectories: new Map(),
    obstacles: new Map(),
    safetyZones: new Map(),
    waypoints: new Map(),
    playback: defaultPlayback,
    collisionGeometries: new Map(),
    collisionResult: null,
    collisionConfig: DEFAULT_COLLISION_VISUALIZATION,
    collisionEnabled: true,
    coordinateFrames: new Map(),
    frameTreeConfig: defaultFrameTreeConfig,
    framesEnabled: true,
    pointClouds: new Map(),
    pointCloudsEnabled: true,
  }),
}));
