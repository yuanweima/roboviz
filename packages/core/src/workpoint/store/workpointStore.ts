/**
 * Workpoint System State Store
 *
 * Zustand store for managing workpoint state including mode,
 * workpoints collection, selection, and preview.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import type {
  Workpoint,
  WorkpointType,
  WorkpointMode,
  GizmoMode,
  WorkpointConfig,
  WorkpointCreateData,
  WorkpointUpdateData,
  WorkpointPreviewState,
  WorkpointGroup,
  WorkpointDisplayConfig,
} from '../types';
import { DEFAULT_DISPLAY_CONFIG, GROUP_COLORS } from '../types';

/**
 * Workpoint store state
 */
export interface WorkpointState {
  // Mode
  mode: WorkpointMode;
  gizmoMode: GizmoMode;

  // Current workpoint type for creation
  currentType: WorkpointType;

  // Current group for creation (optional)
  currentGroupId: string | null;

  // Workpoints collection
  workpoints: Map<string, Workpoint>;

  // Groups collection
  groups: Map<string, WorkpointGroup>;

  // Selection
  selectedWorkpointId: string | null;

  // Hovered workpoint (for frustum display)
  hoveredWorkpointId: string | null;

  // Preview (during hover)
  preview: WorkpointPreviewState | null;

  // Active workpiece being targeted
  activeWorkpieceId: string | null;

  // Configuration
  config: WorkpointConfig;

  // Display configuration
  displayConfig: WorkpointDisplayConfig;

  // Actions
  setMode: (mode: WorkpointMode) => void;
  toggleMode: () => void;
  setGizmoMode: (mode: GizmoMode) => void;
  setCurrentType: (type: WorkpointType) => void;
  setCurrentGroup: (groupId: string | null) => void;

  addWorkpoint: (data: WorkpointCreateData) => Workpoint;
  removeWorkpoint: (id: string) => void;
  updateWorkpoint: (data: WorkpointUpdateData) => void;
  clearWorkpoints: () => void;

  // Group actions
  addGroup: (name: string, color?: string) => WorkpointGroup;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, data: Partial<Omit<WorkpointGroup, 'id'>>) => void;
  setGroupVisible: (id: string, visible: boolean) => void;
  setGroupShowFrustums: (id: string, show: boolean) => void;
  setGroupShowLabels: (id: string, show: boolean) => void;
  assignToGroup: (workpointIds: string[], groupId: string | null) => void;

  selectWorkpoint: (id: string | null) => void;
  setHoveredWorkpoint: (id: string | null) => void;
  setPreview: (preview: WorkpointPreviewState | null) => void;
  rotatePreview: (deltaRadians: number) => void;

  setActiveWorkpiece: (id: string | null) => void;
  setConfig: (config: Partial<WorkpointConfig>) => void;
  setDisplayConfig: (config: Partial<WorkpointDisplayConfig>) => void;

  // Getters
  getWorkpoint: (id: string) => Workpoint | undefined;
  getWorkpointsByWorkpiece: (workpieceId: string) => Workpoint[];
  getWorkpointsByGroup: (groupId: string | null) => Workpoint[];
  getWorkpointsOrdered: () => Workpoint[];
  getVisibleWorkpoints: () => Workpoint[];
  getSelectedWorkpoint: () => Workpoint | undefined;
  getGroup: (id: string) => WorkpointGroup | undefined;
  getGroupsOrdered: () => WorkpointGroup[];
}

/**
 * Create the workpoint store
 */
export const createWorkpointStore = (
  initialConfig: Partial<WorkpointConfig> = {},
  initialDisplayConfig: Partial<WorkpointDisplayConfig> = {}
) => {
  const defaultConfig: WorkpointConfig = {
    rotationStepDegrees: 1, // 1 degree for fine rotation control
    positionStepMeters: 0.001, // 1mm default step
    fineStepMultiplier: 0.1, // Alt key: 0.1mm / 0.1°
    coarseStepMultiplier: 10, // Shift key: 10mm / 10°
    previewOpacity: 0.5,
    enableGizmo: true,
    gizmoSize: 2, // Reasonable size for gizmo
    // Camera parameters: 80mm x 60mm view at 300mm distance
    // FOV(vertical) = 2 * atan(30mm / 300mm) ≈ 11.4 degrees
    defaultCameraFOV: 11.4,
    defaultCameraDistance: 0.3, // 300mm in meters
    defaultCameraAspectRatio: 80 / 60, // 80mm width / 60mm height
    workpointSize: 0.02,
    showLabels: true,
    showOrder: true,
    ...initialConfig,
  };

  const defaultDisplayConfig: WorkpointDisplayConfig = {
    ...DEFAULT_DISPLAY_CONFIG,
    ...initialDisplayConfig,
  };

  return create<WorkpointState>()(
    subscribeWithSelector((set, get) => ({
      // Initial state
      mode: 'view',
      gizmoMode: 'translate',
      currentType: 'normal',
      currentGroupId: null,
      workpoints: new Map(),
      groups: new Map(),
      selectedWorkpointId: null,
      hoveredWorkpointId: null,
      preview: null,
      activeWorkpieceId: null,
      config: defaultConfig,
      displayConfig: defaultDisplayConfig,

      // Mode actions
      setMode: (mode) => {
        set({ mode });
        // Clear selection and preview when exiting edit mode
        if (mode === 'view') {
          set({ selectedWorkpointId: null, preview: null });
        }
      },

      toggleMode: () => {
        const currentMode = get().mode;
        get().setMode(currentMode === 'view' ? 'edit' : 'view');
      },

      setGizmoMode: (gizmoMode) => set({ gizmoMode }),

      setCurrentType: (currentType) => set({ currentType }),

      setCurrentGroup: (groupId) => set({ currentGroupId: groupId }),

      // Workpoint CRUD
      addWorkpoint: (data) => {
        const id = nanoid();
        const now = Date.now();
        const { config, currentGroupId } = get();

        // Set default metadata for camera type
        const metadata = { ...data.metadata };
        if (data.type === 'camera') {
          metadata.cameraFOV = metadata.cameraFOV ?? config.defaultCameraFOV;
          metadata.cameraDistance =
            metadata.cameraDistance ?? config.defaultCameraDistance;
          metadata.cameraAspectRatio =
            metadata.cameraAspectRatio ?? config.defaultCameraAspectRatio;
        }

        const workpoint: Workpoint = {
          id,
          type: data.type,
          position: data.position,
          quaternion: data.quaternion,
          workpieceId: data.workpieceId,
          groupId: data.groupId ?? currentGroupId ?? undefined,
          surfaceNormal: data.surfaceNormal,
          localPosition: data.localPosition,
          localQuaternion: data.localQuaternion,
          order: data.order ?? get().workpoints.size + 1,
          enabled: true,
          metadata,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const newWorkpoints = new Map(state.workpoints);
          newWorkpoints.set(id, workpoint);
          return { workpoints: newWorkpoints };
        });

        return workpoint;
      },

      removeWorkpoint: (id) => {
        set((state) => {
          const newWorkpoints = new Map(state.workpoints);
          newWorkpoints.delete(id);

          // Clear selection if removed workpoint was selected
          const selectedWorkpointId =
            state.selectedWorkpointId === id ? null : state.selectedWorkpointId;
          const hoveredWorkpointId =
            state.hoveredWorkpointId === id ? null : state.hoveredWorkpointId;

          return { workpoints: newWorkpoints, selectedWorkpointId, hoveredWorkpointId };
        });
      },

      updateWorkpoint: (data) => {
        set((state) => {
          const existing = state.workpoints.get(data.id);
          if (!existing) return state;

          const updated: Workpoint = {
            ...existing,
            ...data,
            metadata: { ...existing.metadata, ...data.metadata },
            updatedAt: Date.now(),
          };

          const newWorkpoints = new Map(state.workpoints);
          newWorkpoints.set(data.id, updated);
          return { workpoints: newWorkpoints };
        });
      },

      clearWorkpoints: () => {
        set({
          workpoints: new Map(),
          selectedWorkpointId: null,
          hoveredWorkpointId: null,
        });
      },

      // Group CRUD
      addGroup: (name, color) => {
        const id = nanoid();
        const now = Date.now();
        const groupCount = get().groups.size;

        const group: WorkpointGroup = {
          id,
          name,
          color: color ?? GROUP_COLORS[groupCount % GROUP_COLORS.length],
          visible: true,
          showFrustums: true,
          showLabels: true,
          order: groupCount + 1,
          createdAt: now,
        };

        set((state) => {
          const newGroups = new Map(state.groups);
          newGroups.set(id, group);
          return { groups: newGroups };
        });

        return group;
      },

      removeGroup: (id) => {
        set((state) => {
          const newGroups = new Map(state.groups);
          newGroups.delete(id);

          // Remove group reference from workpoints
          const newWorkpoints = new Map(state.workpoints);
          for (const [wpId, wp] of newWorkpoints) {
            if (wp.groupId === id) {
              newWorkpoints.set(wpId, { ...wp, groupId: undefined });
            }
          }

          // Clear current group if it was removed
          const currentGroupId = state.currentGroupId === id ? null : state.currentGroupId;

          return { groups: newGroups, workpoints: newWorkpoints, currentGroupId };
        });
      },

      updateGroup: (id, data) => {
        set((state) => {
          const existing = state.groups.get(id);
          if (!existing) return state;

          const updated: WorkpointGroup = { ...existing, ...data };
          const newGroups = new Map(state.groups);
          newGroups.set(id, updated);
          return { groups: newGroups };
        });
      },

      setGroupVisible: (id, visible) => {
        get().updateGroup(id, { visible });
      },

      setGroupShowFrustums: (id, show) => {
        get().updateGroup(id, { showFrustums: show });
      },

      setGroupShowLabels: (id, show) => {
        get().updateGroup(id, { showLabels: show });
      },

      assignToGroup: (workpointIds, groupId) => {
        set((state) => {
          const newWorkpoints = new Map(state.workpoints);
          for (const id of workpointIds) {
            const wp = newWorkpoints.get(id);
            if (wp) {
              newWorkpoints.set(id, {
                ...wp,
                groupId: groupId ?? undefined,
                updatedAt: Date.now(),
              });
            }
          }
          return { workpoints: newWorkpoints };
        });
      },

      // Selection
      selectWorkpoint: (id) => {
        set({ selectedWorkpointId: id });
      },

      setHoveredWorkpoint: (id) => {
        set({ hoveredWorkpointId: id });
      },

      // Preview
      setPreview: (preview) => {
        set({ preview });
      },

      rotatePreview: (deltaRadians) => {
        set((state) => {
          if (!state.preview) return state;
          return {
            preview: {
              ...state.preview,
              rotationOffset: state.preview.rotationOffset + deltaRadians,
            },
          };
        });
      },

      // Active workpiece
      setActiveWorkpiece: (id) => {
        set({ activeWorkpieceId: id });
      },

      // Config
      setConfig: (configUpdate) => {
        set((state) => ({
          config: { ...state.config, ...configUpdate },
        }));
      },

      setDisplayConfig: (configUpdate) => {
        set((state) => ({
          displayConfig: { ...state.displayConfig, ...configUpdate },
        }));
      },

      // Getters
      getWorkpoint: (id) => get().workpoints.get(id),

      getWorkpointsByWorkpiece: (workpieceId) => {
        return Array.from(get().workpoints.values()).filter(
          (wp) => wp.workpieceId === workpieceId
        );
      },

      getWorkpointsByGroup: (groupId) => {
        return Array.from(get().workpoints.values()).filter(
          (wp) => (groupId === null ? !wp.groupId : wp.groupId === groupId)
        );
      },

      getWorkpointsOrdered: () => {
        return Array.from(get().workpoints.values()).sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
      },

      getVisibleWorkpoints: () => {
        const { workpoints, groups } = get();
        return Array.from(workpoints.values()).filter((wp) => {
          if (!wp.groupId) return true; // Ungrouped workpoints are always visible
          const group = groups.get(wp.groupId);
          return group ? group.visible : true;
        });
      },

      getSelectedWorkpoint: () => {
        const { selectedWorkpointId, workpoints } = get();
        return selectedWorkpointId
          ? workpoints.get(selectedWorkpointId)
          : undefined;
      },

      getGroup: (id) => get().groups.get(id),

      getGroupsOrdered: () => {
        return Array.from(get().groups.values()).sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
      },
    }))
  );
};

/**
 * Default store instance
 */
export const useWorkpointStore = createWorkpointStore();

/**
 * Selector hooks for common operations
 * Primitive selectors don't need shallow comparison
 */
export const useWorkpointMode = () => useWorkpointStore((s) => s.mode);
export const useWorkpointGizmoMode = () => useWorkpointStore((s) => s.gizmoMode);
export const useWorkpointType = () => useWorkpointStore((s) => s.currentType);
export const useCurrentGroupId = () => useWorkpointStore((s) => s.currentGroupId);
export const useSelectedWorkpointId = () =>
  useWorkpointStore((s) => s.selectedWorkpointId);
export const useHoveredWorkpointId = () =>
  useWorkpointStore((s) => s.hoveredWorkpointId);

/**
 * Object selectors use useShallow for stability in Zustand v5
 */
export const useWorkpointPreview = () =>
  useWorkpointStore(useShallow((s) => s.preview));
export const useWorkpointConfig = () =>
  useWorkpointStore(useShallow((s) => s.config));
export const useWorkpointDisplayConfig = () =>
  useWorkpointStore(useShallow((s) => s.displayConfig));

/**
 * Get all workpoints as array
 * Uses useShallow to prevent infinite loops from Array.from creating new arrays
 */
export const useWorkpoints = () => {
  return useWorkpointStore(
    useShallow((s) => Array.from(s.workpoints.values()))
  );
};

/**
 * Get visible workpoints (filtered by group visibility)
 */
export const useVisibleWorkpoints = () => {
  return useWorkpointStore(
    useShallow((s) => {
      const workpoints = Array.from(s.workpoints.values());
      return workpoints.filter((wp) => {
        if (!wp.groupId) return true;
        const group = s.groups.get(wp.groupId);
        return group ? group.visible : true;
      });
    })
  );
};

/**
 * Get all groups as array
 */
export const useWorkpointGroups = () => {
  return useWorkpointStore(
    useShallow((s) => Array.from(s.groups.values()))
  );
};

/**
 * Get selected workpoint
 */
export const useSelectedWorkpoint = () => {
  return useWorkpointStore(
    useShallow((s) => {
      if (!s.selectedWorkpointId) return undefined;
      return s.workpoints.get(s.selectedWorkpointId);
    })
  );
};
