/**
 * RoboViz Integration Tests
 *
 * 完整模块集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Import managers
import { FrameManager } from '../src/frames/frame-manager';
import { CollisionManager } from '../src/collision/collision-manager';
import { MultiRobotManager } from '../src/multi-robot/multi-robot-manager';
import { PerformanceManager } from '../src/performance/performance-manager';
import { DiagnosticManager } from '../src/diagnostic/diagnostic-manager';
import { SceneManager } from '../src/scene-management/scene-manager';

// Import types
import type { CoordinateFrame } from '../src/frames/types';
import type { CollisionGeometry } from '../src/collision/types';
import type { Transform, Vector3, Quaternion } from '../src/types';

// Helper to create identity transform
const identityTransform = (): Transform => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { w: 1, x: 0, y: 0, z: 0 },
});

// Helper to create transform
const createTransform = (x: number, y: number, z: number): Transform => ({
  position: { x, y, z },
  rotation: { w: 1, x: 0, y: 0, z: 0 },
});

// Default visualization helper
const defaultVisualization = () => ({
  visible: true,
  axisLength: 0.1,
  axisThickness: 1,
  showLabel: true,
  labelSize: 12,
  colors: { x: '#ff0000', y: '#00ff00', z: '#0000ff' },
});

// Test fixtures path
const FIXTURES_PATH = path.join(__dirname, 'fixtures');
const MODELS_PATH = path.join(FIXTURES_PATH, 'models');
const POINTCLOUDS_PATH = path.join(FIXTURES_PATH, 'pointclouds');
const IMAGES_PATH = path.join(FIXTURES_PATH, 'images');

// ============================================================================
// Test Fixtures Verification
// ============================================================================

describe('Test Fixtures', () => {
  it('should have Fanuc robot model', () => {
    const modelPath = path.join(MODELS_PATH, 'Fanuc_LR_Mate_200iD_7L');
    expect(fs.existsSync(modelPath)).toBe(true);

    // Check URDF
    const urdfPath = path.join(modelPath, 'robot_link.urdf');
    expect(fs.existsSync(urdfPath)).toBe(true);

    // Check meshes
    const meshesPath = path.join(modelPath, 'meshes');
    expect(fs.existsSync(meshesPath)).toBe(true);
    const meshFiles = fs.readdirSync(meshesPath);
    expect(meshFiles.length).toBeGreaterThan(0);
  });

  it('should have test point cloud', () => {
    const pcdPath = path.join(POINTCLOUDS_PATH, 'test-box.pcd');
    expect(fs.existsSync(pcdPath)).toBe(true);

    // Verify PCD format
    const content = fs.readFileSync(pcdPath, 'utf-8');
    expect(content).toContain('# .PCD v0.7');
    expect(content).toContain('FIELDS x y z rgb');
    expect(content).toContain('POINTS 125');
  });

  it('should have test image', () => {
    const imgPath = path.join(IMAGES_PATH, 'test-robot.jpg');
    expect(fs.existsSync(imgPath)).toBe(true);

    // Verify file is not empty
    const stats = fs.statSync(imgPath);
    expect(stats.size).toBeGreaterThan(0);
  });
});

// ============================================================================
// Frame Manager Tests
// ============================================================================

describe('FrameManager', () => {
  let manager: FrameManager;

  beforeEach(() => {
    manager = new FrameManager();
  });

  it('should create world frame automatically', () => {
    const worldFrame = manager.getFrame('world');
    expect(worldFrame).toBeDefined();
    expect(worldFrame?.id).toBe('world');
    expect(worldFrame?.parentFrameId).toBeNull();
  });

  it('should add child frames', () => {
    const robotBase: CoordinateFrame = {
      id: 'robot_base',
      name: 'Robot Base',
      type: 'base',
      parentFrameId: 'world',
      transform: createTransform(1, 0, 0),
      visualization: defaultVisualization(),
    };

    manager.addFrame(robotBase);
    const frame = manager.getFrame('robot_base');
    expect(frame).toBeDefined();
    expect(frame?.name).toBe('Robot Base');
  });

  it('should compute world transforms', () => {
    // Add parent frame
    manager.addFrame({
      id: 'parent',
      name: 'Parent',
      type: 'custom',
      parentFrameId: 'world',
      transform: createTransform(1, 0, 0),
      visualization: defaultVisualization(),
    });

    // Add child frame
    manager.addFrame({
      id: 'child',
      name: 'Child',
      type: 'custom',
      parentFrameId: 'parent',
      transform: createTransform(0, 1, 0),
      visualization: defaultVisualization(),
    });

    const worldTransform = manager.getWorldTransform('child');
    expect(worldTransform).toBeDefined();
    // Child should be at (1, 1, 0) in world coordinates
    expect(worldTransform!.position.x).toBeCloseTo(1);
    expect(worldTransform!.position.y).toBeCloseTo(1);
    expect(worldTransform!.position.z).toBeCloseTo(0);
  });

  it('should list all frames', () => {
    manager.addFrame({
      id: 'frame1',
      name: 'Frame 1',
      type: 'custom',
      parentFrameId: 'world',
      transform: identityTransform(),
      visualization: defaultVisualization(),
    });

    manager.addFrame({
      id: 'frame2',
      name: 'Frame 2',
      type: 'custom',
      parentFrameId: 'world',
      transform: identityTransform(),
      visualization: defaultVisualization(),
    });

    const frames = manager.getAllFrames();
    expect(frames.length).toBe(3); // world + frame1 + frame2
  });

  it('should detect circular dependencies', () => {
    manager.addFrame({
      id: 'a',
      name: 'A',
      type: 'custom',
      parentFrameId: 'world',
      transform: identityTransform(),
      visualization: defaultVisualization(),
    });

    manager.addFrame({
      id: 'b',
      name: 'B',
      type: 'custom',
      parentFrameId: 'a',
      transform: identityTransform(),
      visualization: defaultVisualization(),
    });

    // Try to make 'a' a child of 'b' - should fail
    expect(() => {
      manager.updateFrame('a', { parentFrameId: 'b' });
    }).toThrow('circular');
  });
});

// ============================================================================
// Collision Manager Tests
// ============================================================================

describe('CollisionManager', () => {
  let manager: CollisionManager;

  beforeEach(() => {
    manager = new CollisionManager();
  });

  it('should add collision geometry', () => {
    const geometry: CollisionGeometry = {
      id: 'box1',
      type: 'box',
      params: { width: 1, height: 1, depth: 1 },
      metadata: {},
    };

    manager.addCollisionGeometry(geometry, createTransform(0, 0, 0));

    const retrieved = manager.getCollisionGeometry('box1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.type).toBe('box');
  });

  it('should add and retrieve safety zones', () => {
    manager.addSafetyZone({
      id: 'zone1',
      name: 'Work Area',
      type: 'box',
      params: { width: 2, height: 2, depth: 2 },
      level: 'warning',
      action: 'slow',
      transform: identityTransform(),
      metadata: {},
    });

    const zone = manager.getSafetyZone('zone1');
    expect(zone).toBeDefined();
    expect(zone?.level).toBe('warning');
  });

  it('should check collisions between overlapping spheres', () => {
    // Add two overlapping spheres
    manager.addCollisionGeometry(
      { id: 'sphere1', type: 'sphere', params: { radius: 1 }, metadata: {} },
      createTransform(0, 0, 0)
    );

    manager.addCollisionGeometry(
      { id: 'sphere2', type: 'sphere', params: { radius: 1 }, metadata: {} },
      createTransform(1, 0, 0)
    );

    const result = manager.checkCollisions();
    expect(result).toBeDefined();
    expect(result.hasCollision).toBe(true);
  });
});

// ============================================================================
// Multi-Robot Manager Tests
// ============================================================================

describe('MultiRobotManager', () => {
  let manager: MultiRobotManager;

  beforeEach(() => {
    manager = new MultiRobotManager();
  });

  it('should create and retrieve robot group', () => {
    manager.createGroup({
      id: 'group1',
      name: 'Assembly Line',
      robotIds: ['robot1', 'robot2'],
      coordinationType: 'independent',
      enabled: true,
    });

    const group = manager.getGroup('group1');
    expect(group).toBeDefined();
    expect(group?.id).toBe('group1');
    expect(group?.robotIds).toContain('robot1');
  });

  it('should add robot to group', () => {
    manager.createGroup({
      id: 'group1',
      name: 'Team',
      robotIds: ['robot1'],
      coordinationType: 'independent',
      enabled: true,
    });

    manager.addRobotToGroup('group1', 'robot2');
    const group = manager.getGroup('group1');
    expect(group?.robotIds).toContain('robot2');
  });

  it('should add and retrieve workspace', () => {
    manager.addWorkspace({
      id: 'ws1',
      name: 'Main Workspace',
      robotId: 'robot1',
      type: 'reachable',
      geometry: {
        type: 'sphere',
        center: { x: 0, y: 0, z: 0 },
        radius: 2.0,
      },
      visualization: {
        visible: true,
        fillColor: '#00ff00',
        fillOpacity: 0.3,
        wireframe: true,
        wireframeColor: '#00ff00',
      },
    });

    const workspace = manager.getWorkspace('ws1');
    expect(workspace).toBeDefined();
    expect(workspace?.robotId).toBe('robot1');
  });

  it('should list robot groups', () => {
    manager.createGroup({
      id: 'group1',
      name: 'Group 1',
      robotIds: ['robot1'],
      coordinationType: 'independent',
      enabled: true,
    });

    manager.createGroup({
      id: 'group2',
      name: 'Group 2',
      robotIds: ['robot2'],
      coordinationType: 'synchronized',
      enabled: true,
    });

    const groups = manager.getGroups();
    expect(groups.length).toBe(2);
  });
});

// ============================================================================
// Performance Manager Tests
// ============================================================================

describe('PerformanceManager', () => {
  let manager: PerformanceManager;

  beforeEach(() => {
    manager = new PerformanceManager();
  });

  it('should get default config', () => {
    const config = manager.getConfig();
    expect(config).toBeDefined();
    expect(config.targetFPS).toBe(60);
  });

  it('should update config', () => {
    manager.setConfig({ targetFPS: 30 });
    const config = manager.getConfig();
    expect(config.targetFPS).toBe(30);
  });

  it('should get metrics', () => {
    const metrics = manager.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.render).toBeDefined();
    expect(typeof metrics.render.fps).toBe('number');
  });

  it('should get render stats', () => {
    const stats = manager.getRenderStats();
    expect(stats).toBeDefined();
    expect(typeof stats.drawCalls).toBe('number');
    expect(typeof stats.triangles).toBe('number');
  });

  it('should manage quality level', () => {
    manager.setQualityLevel(0.5);
    expect(manager.getQualityLevel()).toBe(0.5);

    manager.setQualityLevel(1.0);
    expect(manager.getQualityLevel()).toBe(1.0);
  });
});

// ============================================================================
// Diagnostic Manager Tests
// ============================================================================

describe('DiagnosticManager', () => {
  let manager: DiagnosticManager;

  beforeEach(() => {
    manager = new DiagnosticManager();
  });

  it('should show and hide joint diagnostics', () => {
    manager.showJointDiagnostic({
      robotId: 'robot1',
      dataTypes: ['position', 'velocity'],
      displayMode: 'chart',
      updateInterval: 100,
      historyLength: 100,
    });

    // Verify diagnostic was added
    const active = manager.getActiveDiagnostics();
    expect(active).toContain('robot1');

    manager.hideJointDiagnostic('robot1');
    const activeAfter = manager.getActiveDiagnostics();
    expect(activeAfter).not.toContain('robot1');
  });

  it('should show and hide singularity visualization', () => {
    manager.showSingularity({
      robotId: 'robot1',
      showSingularSurface: false,
      proximityThreshold: 0.1,
      warningColor: '#ffff00',
      dangerColor: '#ff0000',
      showProximityIndicator: true,
    });

    const state = manager.getSingularityState('robot1');
    expect(state).toBeDefined();

    manager.hideSingularity('robot1');
    expect(manager.getSingularityState('robot1')).toBeUndefined();
  });

  it('should list active diagnostics', () => {
    manager.showJointDiagnostic({
      robotId: 'robot1',
      dataTypes: ['position'],
      displayMode: 'chart',
      updateInterval: 100,
      historyLength: 100,
    });

    manager.showSingularity({
      robotId: 'robot2',
      showSingularSurface: false,
      proximityThreshold: 0.1,
      warningColor: '#ffff00',
      dangerColor: '#ff0000',
      showProximityIndicator: true,
    });

    const active = manager.getActiveDiagnostics();
    expect(active).toContain('robot1');
    expect(active).toContain('robot2');
  });
});

// ============================================================================
// Scene Manager Tests
// ============================================================================

describe('SceneManager', () => {
  let manager: SceneManager;

  beforeEach(() => {
    manager = new SceneManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should create snapshot', async () => {
    const snapshot = await manager.createSnapshot('test-snapshot', {
      description: 'Test snapshot',
    });

    expect(snapshot).toBeDefined();
    expect(snapshot.name).toBe('test-snapshot');
  });

  it('should list snapshots', async () => {
    await manager.createSnapshot('snapshot1');
    await manager.createSnapshot('snapshot2');

    const snapshots = manager.listSnapshots();
    expect(snapshots.length).toBe(2);
  });

  it('should restore snapshot', async () => {
    const snapshot = await manager.createSnapshot('test-snapshot');
    await manager.restoreSnapshot(snapshot.id);
    // Should not throw
  });

  it('should delete snapshot', async () => {
    const snapshot = await manager.createSnapshot('to-delete');
    expect(manager.getSnapshot(snapshot.id)).toBeDefined();

    manager.deleteSnapshot(snapshot.id);
    expect(manager.getSnapshot(snapshot.id)).toBeUndefined();
  });

  it('should support undo/redo', () => {
    // Initially no history
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);

    // History is empty, so undo/redo should return false
    expect(manager.undo()).toBe(false);
    expect(manager.redo()).toBe(false);
  });

  it('should export and import scene', async () => {
    const exported = await manager.exportScene({ format: 'json' });
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('string');

    // Import should work
    const result = await manager.importScene(exported, { merge: false });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Integration: Cross-Module Workflow
// ============================================================================

describe('Cross-Module Integration', () => {
  it('should work with frames and collision together', () => {
    // Setup frame hierarchy
    const frameManager = new FrameManager();
    frameManager.addFrame({
      id: 'robot_base',
      name: 'Robot Base',
      type: 'base',
      parentFrameId: 'world',
      transform: createTransform(1, 0, 0),
      visualization: defaultVisualization(),
    });

    // Add collision geometry at robot base
    const collisionManager = new CollisionManager();
    const worldTransform = frameManager.getWorldTransform('robot_base');

    collisionManager.addCollisionGeometry(
      { id: 'robot_collision', type: 'sphere', params: { radius: 0.3 }, metadata: {} },
      worldTransform
    );

    const geometry = collisionManager.getCollisionGeometry('robot_collision');
    expect(geometry).toBeDefined();
  });

  it('should work with multi-robot and performance', () => {
    const multiRobotManager = new MultiRobotManager();
    const performanceManager = new PerformanceManager();

    // Create robot group
    multiRobotManager.createGroup({
      id: 'assembly_line',
      name: 'Assembly Line',
      robotIds: ['robot1', 'robot2', 'robot3'],
      coordinationType: 'synchronized',
      enabled: true,
    });

    // Adjust performance for multi-robot scenario
    performanceManager.setConfig({
      lodEnabled: true,
      shadowQuality: 'low', // Reduce shadows for performance
    });

    const groups = multiRobotManager.getGroups();
    expect(groups.length).toBe(1);

    const config = performanceManager.getConfig();
    expect(config.shadowQuality).toBe('low');
  });

  it('should work with diagnostics and scene management', async () => {
    const diagnosticManager = new DiagnosticManager();
    const sceneManager = new SceneManager();

    // Enable diagnostics
    diagnosticManager.showJointDiagnostic({
      robotId: 'robot1',
      dataTypes: ['position'],
      displayMode: 'chart',
      updateInterval: 100,
      historyLength: 100,
    });

    // Create snapshot with diagnostics enabled
    const snapshot = await sceneManager.createSnapshot('with-diagnostics');
    expect(snapshot).toBeDefined();

    // Verify diagnostics are active
    const active = diagnosticManager.getActiveDiagnostics();
    expect(active).toContain('robot1');

    sceneManager.dispose();
  });
});

// ============================================================================
// PCD File Parsing Test
// ============================================================================

describe('PCD File Format', () => {
  it('should have valid PCD structure', () => {
    const pcdPath = path.join(POINTCLOUDS_PATH, 'test-box.pcd');
    const content = fs.readFileSync(pcdPath, 'utf-8');
    const lines = content.split('\n');

    // Parse header
    const header: Record<string, string> = {};
    let dataStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'DATA ascii') {
        dataStartLine = i + 1;
        break;
      }
      const parts = line.split(' ');
      if (parts.length >= 2) {
        header[parts[0]] = parts.slice(1).join(' ');
      }
    }

    expect(header['VERSION']).toBe('0.7');
    expect(header['FIELDS']).toBe('x y z rgb');
    expect(header['POINTS']).toBe('125');

    // Verify point data
    const points = lines.slice(dataStartLine).filter((l: string) => l.trim().length > 0);
    expect(points.length).toBe(125);

    // Verify first point format
    const firstPoint = points[0].split(' ');
    expect(firstPoint.length).toBe(4); // x y z rgb
  });
});
