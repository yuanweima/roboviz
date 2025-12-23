/**
 * Protocol message handler
 * Processes incoming JSON-RPC messages and updates the store
 */
import { useViewerStore } from '../store/viewerStore';
import type { JsonRpcMessage, JsonRpcRequest, JsonRpcResponse } from './types';
import { Methods } from './types';
import type {
  RobotState,
  ObstacleState,
  SafetyZoneState,
  WaypointState,
  Vector3Tuple,
  CollisionGeometryState,
  CollisionGeometryType,
  CollisionVisualizationConfig,
  CoordinateFrameState,
  FrameType,
  FrameTreeVisualizationConfig,
  PointCloudState,
  PointCloudData,
  PointCloudVisualization,
} from '../types';
import { DEFAULT_FRAME_VISUALIZATION, DEFAULT_POINT_CLOUD_VISUALIZATION } from '../types';

type SendFn = (message: JsonRpcMessage) => void;

export function createProtocolHandler(send: SendFn) {
  const store = useViewerStore.getState();

  function handleMessage(message: JsonRpcMessage) {
    // Handle response (we don't expect these in viewer)
    if ('result' in message || 'error' in message) {
      return;
    }

    const request = message as JsonRpcRequest;
    const { method, params, id } = request;

    try {
      const result = processMethod(method, params || {});

      // Send response if request has id
      if (id !== undefined) {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id,
          result,
        };
        send(response);
      }
    } catch (error) {
      if (id !== undefined) {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
        };
        send(response);
      }
    }
  }

  function processMethod(method: string, params: Record<string, unknown>): unknown {
    const actions = useViewerStore.getState();

    switch (method) {
      // Robot methods
      case Methods.ROBOT_ADD: {
        const robot: RobotState = {
          id: (params.id as string) || `robot-${Date.now()}`,
          // Support both URL path and inline content
          urdfPath: params.urdf as string || params.urdfPath as string,
          urdfContent: params.urdfContent as string | undefined,
          meshData: params.meshData as Record<string, string> | undefined,
          position: (params.position as Vector3Tuple) || [0, 0, 0],
          joints: (params.joints as number[]) || [],
          color: params.color as string | undefined,
          opacity: params.opacity as number | undefined,
          visible: true,
        };
        actions.addRobot(robot);
        return { id: robot.id, success: true };
      }

      case Methods.ROBOT_REMOVE: {
        actions.removeRobot(params.id as string);
        return { success: true };
      }

      case Methods.ROBOT_SET_JOINTS: {
        actions.setRobotJoints(params.id as string, params.angles as number[]);
        return { success: true };
      }

      case Methods.ROBOT_GET_JOINTS: {
        const robot = actions.robots.get(params.id as string);
        return { angles: robot?.joints || [] };
      }

      case Methods.ROBOT_GET_TCP_POSE: {
        const robot = actions.robots.get(params.id as string);
        if (!robot?.tcpPose) {
          return { pose: null };
        }
        return {
          pose: {
            position: robot.tcpPose.position,
            orientation: robot.tcpPose.orientation,
          },
        };
      }

      // Trajectory methods
      case Methods.TRAJECTORY_PLAY: {
        const robotId = params.robotId as string;
        const trajectory = params.trajectory as { times: number[]; positions: number[][] };
        const speed = (params.speed as number) || 1.0;
        const loop = (params.loop as boolean) || false;

        const trajectoryId = `traj-${robotId}-${Date.now()}`;
        actions.addTrajectory({
          id: trajectoryId,
          robotId,
          data: trajectory,
          isPlaying: true,
          currentTime: 0,
          speed,
          loop,
        });
        // Auto-start playback
        actions.startPlayback(trajectoryId);
        return { success: true, trajectoryId };
      }

      case Methods.TRAJECTORY_PAUSE: {
        const robotId = params.robotId as string;
        // Pause playback if active trajectory belongs to this robot
        const activeId = actions.playback.activeTrajectoryId;
        if (activeId) {
          const activeTraj = actions.trajectories.get(activeId);
          if (activeTraj?.robotId === robotId) {
            actions.pausePlayback();
          }
        }
        // Also update trajectory state
        for (const [id, traj] of actions.trajectories) {
          if (traj.robotId === robotId) {
            actions.updateTrajectory(id, { isPlaying: false });
          }
        }
        return { success: true };
      }

      case Methods.TRAJECTORY_STOP: {
        const robotId = params.robotId as string;
        // Stop playback if active trajectory belongs to this robot
        const activeId = actions.playback.activeTrajectoryId;
        if (activeId) {
          const activeTraj = actions.trajectories.get(activeId);
          if (activeTraj?.robotId === robotId) {
            actions.stopPlayback();
          }
        }
        // Remove trajectories for this robot
        for (const [id, traj] of actions.trajectories) {
          if (traj.robotId === robotId) {
            actions.removeTrajectory(id);
          }
        }
        return { success: true };
      }

      // Obstacle methods
      case Methods.OBSTACLE_ADD: {
        const obstacle: ObstacleState = {
          id: (params.id as string) || `obs-${Date.now()}`,
          shape: params.shape as 'box' | 'sphere' | 'cylinder',
          dimensions: [
            (params.dimensions as { x: number; y: number; z: number })?.x || 0.1,
            (params.dimensions as { x: number; y: number; z: number })?.y || 0.1,
            (params.dimensions as { x: number; y: number; z: number })?.z || 0.1,
          ],
          position: [
            (params.position as { x: number; y: number; z: number })?.x || 0,
            (params.position as { x: number; y: number; z: number })?.y || 0,
            (params.position as { x: number; y: number; z: number })?.z || 0,
          ],
          color: params.color as string | undefined,
          opacity: params.opacity as number | undefined,
        };
        actions.addObstacle(obstacle);
        return { success: true };
      }

      case Methods.OBSTACLE_REMOVE: {
        actions.removeObstacle(params.id as string);
        return { success: true };
      }

      case Methods.OBSTACLE_CLEAR: {
        actions.clearObstacles();
        return { success: true };
      }

      // Safety Zone methods
      case Methods.SAFETY_ZONE_ADD: {
        const zone: SafetyZoneState = {
          id: (params.id as string) || `zone-${Date.now()}`,
          position: [
            (params.position as { x: number; y: number; z: number })?.x || 0,
            (params.position as { x: number; y: number; z: number })?.y || 0,
            (params.position as { x: number; y: number; z: number })?.z || 0,
          ],
          radius: (params.radius as number) || 0.5,
          warningRadius: (params.warningRadius as number) || (params.radius as number) * 1.5 || 0.75,
          dangerRadius: (params.dangerRadius as number) || (params.radius as number) * 2 || 1.0,
        };
        actions.addSafetyZone(zone);
        return { success: true };
      }

      case Methods.SAFETY_ZONE_REMOVE: {
        actions.removeSafetyZone(params.id as string);
        return { success: true };
      }

      // Waypoint methods
      case Methods.WAYPOINT_ADD: {
        const waypoint: WaypointState = {
          id: (params.id as string) || `wp-${Date.now()}`,
          position: [
            (params.position as { x: number; y: number; z: number })?.x || 0,
            (params.position as { x: number; y: number; z: number })?.y || 0,
            (params.position as { x: number; y: number; z: number })?.z || 0,
          ],
          label: params.label as string | undefined,
          color: params.color as string | undefined,
        };
        actions.addWaypoint(waypoint);
        return { success: true };
      }

      case Methods.WAYPOINT_REMOVE: {
        actions.removeWaypoint(params.id as string);
        return { success: true };
      }

      case Methods.WAYPOINT_CLEAR: {
        actions.clearWaypoints();
        return { success: true };
      }

      // Camera methods
      case Methods.CAMERA_SET: {
        const updates: Partial<typeof store.camera> = {};
        if (params.position) {
          const pos = params.position as { x: number; y: number; z: number };
          updates.position = [pos.x, pos.y, pos.z];
        }
        if (params.target) {
          const target = params.target as { x: number; y: number; z: number };
          updates.target = [target.x, target.y, target.z];
        }
        if (params.fov) {
          updates.fov = params.fov as number;
        }
        actions.setCamera(updates);
        return { success: true };
      }

      case Methods.CAMERA_RESET: {
        actions.setCamera({
          position: [3, 2, 3],
          target: [0, 0, 0],
          fov: 50,
        });
        return { success: true };
      }

      // Scene methods
      case Methods.SCENE_CLEAR: {
        actions.reset();
        return { success: true };
      }

      case Methods.SCENE_SET_CONFIG: {
        const updates: Partial<typeof store.scene> = {};
        if (params.background) updates.background = params.background as string;
        if (params.shadows !== undefined) updates.shadows = params.shadows as boolean;
        if (params.groundPlane !== undefined) updates.groundPlane = params.groundPlane as boolean;
        if (params.groundColor) updates.groundColor = params.groundColor as string;
        if (params.environmentPreset) updates.environmentPreset = params.environmentPreset as typeof store.scene.environmentPreset;
        if (params.ambientIntensity !== undefined) updates.ambientIntensity = params.ambientIntensity as number;
        if (params.directionalIntensity !== undefined) updates.directionalIntensity = params.directionalIntensity as number;
        actions.setScene(updates);
        return { success: true };
      }

      // Collision methods
      case Methods.COLLISION_ADD_GEOMETRY: {
        const geometry: CollisionGeometryState = {
          id: (params.id as string) || `coll-${Date.now()}`,
          type: (params.type as CollisionGeometryType) || 'sphere',
          params: {
            width: (params.params as Record<string, number>)?.width,
            height: (params.params as Record<string, number>)?.height,
            depth: (params.params as Record<string, number>)?.depth,
            radius: (params.params as Record<string, number>)?.radius,
          },
          position: [
            (params.position as { x: number; y: number; z: number })?.x || 0,
            (params.position as { x: number; y: number; z: number })?.y || 0,
            (params.position as { x: number; y: number; z: number })?.z || 0,
          ],
          rotation: params.rotation as Vector3Tuple | undefined,
          enabled: params.enabled !== false,
          associatedObjectType: params.associatedObjectType as 'robot' | 'obstacle' | 'geometry' | undefined,
        };
        actions.addCollisionGeometry(geometry);
        return { success: true, id: geometry.id };
      }

      case Methods.COLLISION_REMOVE_GEOMETRY: {
        actions.removeCollisionGeometry(params.id as string);
        return { success: true };
      }

      case Methods.COLLISION_CLEAR_GEOMETRIES: {
        actions.clearCollisionGeometries();
        return { success: true };
      }

      case Methods.COLLISION_SET_CONFIG: {
        const config = params.config as Partial<CollisionVisualizationConfig>;
        if (config) {
          actions.setCollisionConfig(config);
        }
        return { success: true };
      }

      case Methods.COLLISION_ENABLE: {
        const enabled = params.enabled !== false;
        actions.setCollisionEnabled(enabled);
        return { success: true };
      }

      case Methods.COLLISION_GET_RESULT: {
        return { result: actions.collisionResult };
      }

      // Coordinate frame methods
      case Methods.FRAME_ADD: {
        const frame: CoordinateFrameState = {
          id: (params.id as string) || `frame-${Date.now()}`,
          name: (params.name as string) || 'Frame',
          type: (params.type as FrameType) || 'custom',
          parentFrameId: (params.parentFrameId as string | null) || null,
          position: [
            (params.position as { x: number; y: number; z: number })?.x || 0,
            (params.position as { x: number; y: number; z: number })?.y || 0,
            (params.position as { x: number; y: number; z: number })?.z || 0,
          ],
          rotation: (params.rotation as [number, number, number, number]) || [1, 0, 0, 0],
          robotId: params.robotId as string | undefined,
          visualization: {
            ...DEFAULT_FRAME_VISUALIZATION,
            ...(params.visualization as Partial<typeof DEFAULT_FRAME_VISUALIZATION>),
          },
          editable: params.editable as boolean | undefined,
        };
        actions.addFrame(frame);
        return { success: true, id: frame.id };
      }

      case Methods.FRAME_REMOVE: {
        actions.removeFrame(params.id as string);
        return { success: true };
      }

      case Methods.FRAME_UPDATE: {
        const id = params.id as string;
        const updates: Partial<CoordinateFrameState> = {};
        if (params.name) updates.name = params.name as string;
        if (params.position) {
          const pos = params.position as { x: number; y: number; z: number };
          updates.position = [pos.x, pos.y, pos.z];
        }
        if (params.rotation) updates.rotation = params.rotation as [number, number, number, number];
        if (params.parentFrameId !== undefined) updates.parentFrameId = params.parentFrameId as string | null;
        if (params.visualization) {
          updates.visualization = {
            ...DEFAULT_FRAME_VISUALIZATION,
            ...(params.visualization as Partial<typeof DEFAULT_FRAME_VISUALIZATION>),
          };
        }
        actions.updateFrame(id, updates);
        return { success: true };
      }

      case Methods.FRAME_CLEAR: {
        actions.clearFrames();
        return { success: true };
      }

      case Methods.FRAME_SET_CONFIG: {
        const config = params.config as Partial<FrameTreeVisualizationConfig>;
        if (config) {
          actions.setFrameTreeConfig(config);
        }
        return { success: true };
      }

      case Methods.FRAME_ENABLE: {
        const enabled = params.enabled !== false;
        actions.setFramesEnabled(enabled);
        return { success: true };
      }

      // Point cloud methods
      case Methods.POINTCLOUD_ADD: {
        const data: PointCloudData = {
          id: (params.id as string) || `pc-${Date.now()}`,
          points: (params.points as number[]) || [],
          pointCount: (params.pointCount as number) || Math.floor(((params.points as number[]) || []).length / 3),
          colors: params.colors as number[] | undefined,
          intensities: params.intensities as number[] | undefined,
          normals: params.normals as number[] | undefined,
          bounds: params.bounds as { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | undefined,
          frameId: params.frameId as string | undefined,
          timestamp: params.timestamp as number | undefined,
        };

        const visualization: PointCloudVisualization = {
          ...DEFAULT_POINT_CLOUD_VISUALIZATION,
          ...(params.visualization as Partial<PointCloudVisualization>),
        };

        const pointCloud: PointCloudState = {
          data,
          visualization,
          position: [
            (params.position as { x: number; y: number; z: number })?.x || 0,
            (params.position as { x: number; y: number; z: number })?.y || 0,
            (params.position as { x: number; y: number; z: number })?.z || 0,
          ],
          rotation: params.rotation as Vector3Tuple | undefined,
        };

        actions.addPointCloud(pointCloud);
        return { success: true, id: data.id };
      }

      case Methods.POINTCLOUD_UPDATE: {
        const id = params.id as string;
        const updates: Partial<PointCloudState> = {};

        if (params.points) {
          const currentPC = actions.pointClouds.get(id);
          if (currentPC) {
            updates.data = {
              ...currentPC.data,
              points: params.points as number[],
              pointCount: (params.pointCount as number) || Math.floor((params.points as number[]).length / 3),
            };
          }
        }
        if (params.position) {
          const pos = params.position as { x: number; y: number; z: number };
          updates.position = [pos.x, pos.y, pos.z];
        }
        if (params.rotation) {
          updates.rotation = params.rotation as Vector3Tuple;
        }

        actions.updatePointCloud(id, updates);
        return { success: true };
      }

      case Methods.POINTCLOUD_REMOVE: {
        actions.removePointCloud(params.id as string);
        return { success: true };
      }

      case Methods.POINTCLOUD_CLEAR: {
        actions.clearPointClouds();
        return { success: true };
      }

      case Methods.POINTCLOUD_SET_VISUALIZATION: {
        const id = params.id as string;
        const visualization = params.visualization as Partial<PointCloudVisualization>;
        if (visualization) {
          actions.setPointCloudVisualization(id, visualization);
        }
        return { success: true };
      }

      case Methods.POINTCLOUD_ENABLE: {
        const enabled = params.enabled !== false;
        actions.setPointCloudsEnabled(enabled);
        return { success: true };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  return { handleMessage };
}
