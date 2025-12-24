/**
 * Workpoint Protocol Handlers
 *
 * JSON-RPC 2.0 protocol handlers for the workpoint system.
 * Handles communication between the viewer and SDK/backend.
 */

import type {
  Workpoint,
  WorkpointType,
  WorkpointMode,
  WorkpointCreateData,
  WorkpointUpdateData,
} from '../types';
import { useWorkpointStore } from '../store';
import { workpointEvents } from '../events';
import type { Vector3Tuple, QuaternionTuple } from '../../types';

/**
 * Workpoint protocol method names
 */
export const WORKPOINT_METHODS = {
  // Incoming (from SDK/backend)
  ADD: 'workpoint.add',
  REMOVE: 'workpoint.remove',
  UPDATE: 'workpoint.update',
  SELECT: 'workpoint.select',
  SET_MODE: 'workpoint.setMode',
  SET_TYPE: 'workpoint.setType',
  CLEAR: 'workpoint.clear',
  IMPORT: 'workpoint.import',

  // Outgoing (to SDK/backend) - notifications
  ADDED: 'workpoint.added',
  REMOVED: 'workpoint.removed',
  CHANGED: 'workpoint.changed',
  SELECTED: 'workpoint.selected',
  MODE_CHANGED: 'workpoint.modeChanged',

  // Execution
  EXECUTE: 'workpoint.execute',
  EXECUTE_SEQUENCE: 'workpoint.executeSequence',

  // Queries
  GET_ALL: 'workpoint.getAll',
  GET_BY_ID: 'workpoint.getById',
  GET_BY_WORKPIECE: 'workpoint.getByWorkpiece',
} as const;

/**
 * Protocol parameter types
 */
export interface WorkpointProtocolParams {
  // Add workpoint
  'workpoint.add': {
    type: WorkpointType;
    position: Vector3Tuple;
    quaternion: QuaternionTuple;
    workpieceId: string;
    surfaceNormal?: Vector3Tuple;
    order?: number;
    metadata?: Record<string, unknown>;
  };

  // Remove workpoint
  'workpoint.remove': {
    workpointId: string;
  };

  // Update workpoint
  'workpoint.update': {
    id: string;
    position?: Vector3Tuple;
    quaternion?: QuaternionTuple;
    type?: WorkpointType;
    order?: number;
    enabled?: boolean;
    metadata?: Record<string, unknown>;
  };

  // Select workpoint
  'workpoint.select': {
    workpointId: string | null;
  };

  // Set mode
  'workpoint.setMode': {
    mode: WorkpointMode;
  };

  // Set type
  'workpoint.setType': {
    type: WorkpointType;
  };

  // Clear workpoints
  'workpoint.clear': {
    workpieceId?: string;
  };

  // Import workpoints
  'workpoint.import': {
    workpoints: Workpoint[];
    replace?: boolean;
  };

  // Execute workpoint
  'workpoint.execute': {
    workpointId: string;
    robotId: string;
  };

  // Execute sequence
  'workpoint.executeSequence': {
    workpointIds: string[];
    robotId: string;
  };

  // Get all workpoints
  'workpoint.getAll': Record<string, never>;

  // Get by ID
  'workpoint.getById': {
    workpointId: string;
  };

  // Get by workpiece
  'workpoint.getByWorkpiece': {
    workpieceId: string;
  };
}

/**
 * Protocol response types
 */
export interface WorkpointProtocolResults {
  'workpoint.add': { workpoint: Workpoint };
  'workpoint.remove': { success: boolean };
  'workpoint.update': { workpoint: Workpoint };
  'workpoint.select': { success: boolean };
  'workpoint.setMode': { mode: WorkpointMode };
  'workpoint.setType': { type: WorkpointType };
  'workpoint.clear': { count: number };
  'workpoint.import': { count: number; workpoints: Workpoint[] };
  'workpoint.execute': { success: boolean };
  'workpoint.executeSequence': { success: boolean };
  'workpoint.getAll': { workpoints: Workpoint[] };
  'workpoint.getById': { workpoint: Workpoint | null };
  'workpoint.getByWorkpiece': { workpoints: Workpoint[] };
}

/**
 * Create workpoint protocol handlers
 */
export function createWorkpointHandlers() {
  const store = useWorkpointStore;

  return {
    /**
     * Add a workpoint
     */
    [WORKPOINT_METHODS.ADD]: (
      params: WorkpointProtocolParams['workpoint.add']
    ): WorkpointProtocolResults['workpoint.add'] => {
      const createData: WorkpointCreateData = {
        type: params.type,
        position: params.position,
        quaternion: params.quaternion,
        workpieceId: params.workpieceId,
        surfaceNormal: params.surfaceNormal,
        order: params.order,
        metadata: params.metadata,
      };

      const workpoint = store.getState().addWorkpoint(createData);
      workpointEvents.emit('workpoint:added', { workpoint });

      return { workpoint };
    },

    /**
     * Remove a workpoint
     */
    [WORKPOINT_METHODS.REMOVE]: (
      params: WorkpointProtocolParams['workpoint.remove']
    ): WorkpointProtocolResults['workpoint.remove'] => {
      store.getState().removeWorkpoint(params.workpointId);
      workpointEvents.emit('workpoint:removed', { workpointId: params.workpointId });

      return { success: true };
    },

    /**
     * Update a workpoint
     */
    [WORKPOINT_METHODS.UPDATE]: (
      params: WorkpointProtocolParams['workpoint.update']
    ): WorkpointProtocolResults['workpoint.update'] => {
      const updateData: WorkpointUpdateData = {
        id: params.id,
        position: params.position,
        quaternion: params.quaternion,
        type: params.type,
        order: params.order,
        enabled: params.enabled,
        metadata: params.metadata,
      };

      store.getState().updateWorkpoint(updateData);
      const workpoint = store.getState().getWorkpoint(params.id)!;
      workpointEvents.emit('workpoint:changed', { workpoint });

      return { workpoint };
    },

    /**
     * Select a workpoint
     */
    [WORKPOINT_METHODS.SELECT]: (
      params: WorkpointProtocolParams['workpoint.select']
    ): WorkpointProtocolResults['workpoint.select'] => {
      store.getState().selectWorkpoint(params.workpointId);
      workpointEvents.emit('workpoint:selected', { workpointId: params.workpointId });

      return { success: true };
    },

    /**
     * Set workpoint mode
     */
    [WORKPOINT_METHODS.SET_MODE]: (
      params: WorkpointProtocolParams['workpoint.setMode']
    ): WorkpointProtocolResults['workpoint.setMode'] => {
      store.getState().setMode(params.mode);
      workpointEvents.emit('workpoint:mode-changed', { mode: params.mode });

      return { mode: params.mode };
    },

    /**
     * Set current workpoint type
     */
    [WORKPOINT_METHODS.SET_TYPE]: (
      params: WorkpointProtocolParams['workpoint.setType']
    ): WorkpointProtocolResults['workpoint.setType'] => {
      store.getState().setCurrentType(params.type);
      workpointEvents.emit('workpoint:type-changed', { type: params.type });

      return { type: params.type };
    },

    /**
     * Clear workpoints
     */
    [WORKPOINT_METHODS.CLEAR]: (
      params: WorkpointProtocolParams['workpoint.clear']
    ): WorkpointProtocolResults['workpoint.clear'] => {
      const state = store.getState();

      let count = 0;
      if (params.workpieceId) {
        // Clear only workpoints for specific workpiece
        const toRemove = state.getWorkpointsByWorkpiece(params.workpieceId);
        count = toRemove.length;
        for (const wp of toRemove) {
          state.removeWorkpoint(wp.id);
        }
      } else {
        // Clear all
        count = state.workpoints.size;
        state.clearWorkpoints();
      }

      workpointEvents.emit('workpoint:cleared', { workpieceId: params.workpieceId });

      return { count };
    },

    /**
     * Import workpoints
     */
    [WORKPOINT_METHODS.IMPORT]: (
      params: WorkpointProtocolParams['workpoint.import']
    ): WorkpointProtocolResults['workpoint.import'] => {
      const state = store.getState();

      if (params.replace) {
        state.clearWorkpoints();
      }

      const imported: Workpoint[] = [];
      for (const wp of params.workpoints) {
        const created = state.addWorkpoint({
          type: wp.type,
          position: wp.position,
          quaternion: wp.quaternion,
          workpieceId: wp.workpieceId,
          surfaceNormal: wp.surfaceNormal,
          localPosition: wp.localPosition,
          order: wp.order,
          metadata: wp.metadata,
        });
        imported.push(created);
      }

      workpointEvents.emit('workpoint:imported', { workpoints: imported });

      return { count: imported.length, workpoints: imported };
    },

    /**
     * Execute workpoint (trigger robot movement)
     */
    [WORKPOINT_METHODS.EXECUTE]: (
      params: WorkpointProtocolParams['workpoint.execute']
    ): WorkpointProtocolResults['workpoint.execute'] => {
      workpointEvents.emit('workpoint:execute', {
        workpointId: params.workpointId,
        robotId: params.robotId,
      });

      return { success: true };
    },

    /**
     * Execute workpoint sequence
     */
    [WORKPOINT_METHODS.EXECUTE_SEQUENCE]: (
      params: WorkpointProtocolParams['workpoint.executeSequence']
    ): WorkpointProtocolResults['workpoint.executeSequence'] => {
      workpointEvents.emit('workpoint:execute-sequence', {
        workpointIds: params.workpointIds,
        robotId: params.robotId,
      });

      return { success: true };
    },

    /**
     * Get all workpoints
     */
    [WORKPOINT_METHODS.GET_ALL]: (): WorkpointProtocolResults['workpoint.getAll'] => {
      const workpoints = store.getState().getWorkpointsOrdered();
      return { workpoints };
    },

    /**
     * Get workpoint by ID
     */
    [WORKPOINT_METHODS.GET_BY_ID]: (
      params: WorkpointProtocolParams['workpoint.getById']
    ): WorkpointProtocolResults['workpoint.getById'] => {
      const workpoint = store.getState().getWorkpoint(params.workpointId) ?? null;
      return { workpoint };
    },

    /**
     * Get workpoints by workpiece
     */
    [WORKPOINT_METHODS.GET_BY_WORKPIECE]: (
      params: WorkpointProtocolParams['workpoint.getByWorkpiece']
    ): WorkpointProtocolResults['workpoint.getByWorkpiece'] => {
      const workpoints = store.getState().getWorkpointsByWorkpiece(params.workpieceId);
      return { workpoints };
    },
  };
}

/**
 * Register workpoint handlers with a protocol handler registry
 */
export function registerWorkpointHandlers(
  registry: {
    register: (method: string, handler: (params: any) => any) => void;
  }
): void {
  const handlers = createWorkpointHandlers();

  for (const [method, handler] of Object.entries(handlers)) {
    registry.register(method, handler);
  }
}

/**
 * Create notification sender for workpoint events
 * Use this to send notifications to the backend when workpoints change
 */
export function createWorkpointNotificationSender(
  send: (method: string, params: unknown) => void
): () => void {
  // Subscribe to events and forward as notifications
  const unsubscribers = [
    workpointEvents.on('workpoint:added', (data) => {
      send(WORKPOINT_METHODS.ADDED, { workpoint: data.workpoint });
    }),
    workpointEvents.on('workpoint:removed', (data) => {
      send(WORKPOINT_METHODS.REMOVED, { workpointId: data.workpointId });
    }),
    workpointEvents.on('workpoint:changed', (data) => {
      send(WORKPOINT_METHODS.CHANGED, { workpoint: data.workpoint });
    }),
    workpointEvents.on('workpoint:selected', (data) => {
      send(WORKPOINT_METHODS.SELECTED, { workpointId: data.workpointId });
    }),
    workpointEvents.on('workpoint:mode-changed', (data) => {
      send(WORKPOINT_METHODS.MODE_CHANGED, { mode: data.mode });
    }),
  ];

  // Return cleanup function
  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  };
}
