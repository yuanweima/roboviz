import { create } from 'zustand';
import * as THREE from 'three';

export interface RobotState {
  id: string;
  jointAngles: number[];
  jointNames: string[];
  jointLimits: [number, number][];
  transform: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
  };
  visible: boolean;
  showAxes: boolean;
  showCollision: boolean;
  opacity: number;
  color: string | null;
}

export interface TrajectoryState {
  id: string;
  robotId: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  loop: boolean;
}

export interface PointCloudState {
  id: string;
  pointCount: number;
  visible: boolean;
  pointSize: number;
  colorMode: 'rgb' | 'height' | 'uniform';
}

export interface SafetyZoneState {
  id: string;
  name: string;
  level: 'info' | 'warning' | 'danger' | 'stop';
  triggered: boolean;
}

export interface AppState {
  // Robots
  robots: Map<string, RobotState>;
  activeRobotId: string | null;
  addRobot: (robot: RobotState) => void;
  updateRobot: (id: string, updates: Partial<RobotState>) => void;
  removeRobot: (id: string) => void;
  setActiveRobot: (id: string | null) => void;

  // Trajectories
  trajectories: Map<string, TrajectoryState>;
  addTrajectory: (trajectory: TrajectoryState) => void;
  updateTrajectory: (id: string, updates: Partial<TrajectoryState>) => void;
  removeTrajectory: (id: string) => void;

  // Point Clouds
  pointClouds: Map<string, PointCloudState>;
  addPointCloud: (pc: PointCloudState) => void;
  updatePointCloud: (id: string, updates: Partial<PointCloudState>) => void;
  removePointCloud: (id: string) => void;

  // Safety Zones
  safetyZones: Map<string, SafetyZoneState>;
  addSafetyZone: (zone: SafetyZoneState) => void;
  updateSafetyZone: (id: string, updates: Partial<SafetyZoneState>) => void;
  removeSafetyZone: (id: string) => void;

  // Performance
  performance: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
  };
  updatePerformance: (updates: Partial<AppState['performance']>) => void;

  // Logs
  logs: Array<{ level: 'info' | 'warning' | 'warn' | 'error'; message: string; timestamp: number }>;
  addLog: (level: 'info' | 'warning' | 'warn' | 'error', message: string) => void;
  clearLogs: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Robots
  robots: new Map(),
  activeRobotId: null,
  addRobot: (robot) => set((state) => {
    const newRobots = new Map(state.robots);
    newRobots.set(robot.id, robot);
    return { robots: newRobots, activeRobotId: state.activeRobotId ?? robot.id };
  }),
  updateRobot: (id, updates) => set((state) => {
    const robot = state.robots.get(id);
    if (!robot) return state;
    const newRobots = new Map(state.robots);
    newRobots.set(id, { ...robot, ...updates });
    return { robots: newRobots };
  }),
  removeRobot: (id) => set((state) => {
    const newRobots = new Map(state.robots);
    newRobots.delete(id);
    return {
      robots: newRobots,
      activeRobotId: state.activeRobotId === id ? null : state.activeRobotId
    };
  }),
  setActiveRobot: (id) => set({ activeRobotId: id }),

  // Trajectories
  trajectories: new Map(),
  addTrajectory: (trajectory) => set((state) => {
    const newTrajectories = new Map(state.trajectories);
    newTrajectories.set(trajectory.id, trajectory);
    return { trajectories: newTrajectories };
  }),
  updateTrajectory: (id, updates) => set((state) => {
    const traj = state.trajectories.get(id);
    if (!traj) return state;
    const newTrajectories = new Map(state.trajectories);
    newTrajectories.set(id, { ...traj, ...updates });
    return { trajectories: newTrajectories };
  }),
  removeTrajectory: (id) => set((state) => {
    const newTrajectories = new Map(state.trajectories);
    newTrajectories.delete(id);
    return { trajectories: newTrajectories };
  }),

  // Point Clouds
  pointClouds: new Map(),
  addPointCloud: (pc) => set((state) => {
    const newPCs = new Map(state.pointClouds);
    newPCs.set(pc.id, pc);
    return { pointClouds: newPCs };
  }),
  updatePointCloud: (id, updates) => set((state) => {
    const pc = state.pointClouds.get(id);
    if (!pc) return state;
    const newPCs = new Map(state.pointClouds);
    newPCs.set(id, { ...pc, ...updates });
    return { pointClouds: newPCs };
  }),
  removePointCloud: (id) => set((state) => {
    const newPCs = new Map(state.pointClouds);
    newPCs.delete(id);
    return { pointClouds: newPCs };
  }),

  // Safety Zones
  safetyZones: new Map(),
  addSafetyZone: (zone) => set((state) => {
    const newZones = new Map(state.safetyZones);
    newZones.set(zone.id, zone);
    return { safetyZones: newZones };
  }),
  updateSafetyZone: (id, updates) => set((state) => {
    const zone = state.safetyZones.get(id);
    if (!zone) return state;
    const newZones = new Map(state.safetyZones);
    newZones.set(id, { ...zone, ...updates });
    return { safetyZones: newZones };
  }),
  removeSafetyZone: (id) => set((state) => {
    const newZones = new Map(state.safetyZones);
    newZones.delete(id);
    return { safetyZones: newZones };
  }),

  // Performance
  performance: {
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
  },
  updatePerformance: (updates) => set((state) => ({
    performance: { ...state.performance, ...updates },
  })),

  // Logs
  logs: [],
  addLog: (level, message) => set((state) => ({
    logs: [...state.logs.slice(-99), { level, message, timestamp: Date.now() }]
  })),
  clearLogs: () => set({ logs: [] }),
}));
