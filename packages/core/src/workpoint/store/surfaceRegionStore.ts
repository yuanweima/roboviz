/**
 * Surface Region Store
 *
 * Zustand store for managing surface regions on workpieces.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import type {
  SurfaceRegion,
  SurfaceRegionType,
  SurfaceRegionCreateData,
  SurfaceRegionUpdateData,
  RegionBoundaryPoint,
  RegionEditMode,
  RegionCreationState,
} from '../types';
import { REGION_COLORS, DEFAULT_REGION_CONFIG } from '../types';

/**
 * Surface Region store state
 */
export interface SurfaceRegionState {
  // Regions collection
  regions: Map<string, SurfaceRegion>;

  // Selection
  selectedRegionId: string | null;

  // Creation state
  creationState: RegionCreationState;

  // Configuration
  config: typeof DEFAULT_REGION_CONFIG;

  // Actions
  // Region CRUD
  addRegion: (data: SurfaceRegionCreateData) => SurfaceRegion;
  removeRegion: (id: string) => void;
  updateRegion: (data: SurfaceRegionUpdateData) => void;
  clearRegions: () => void;

  // Selection
  selectRegion: (id: string | null) => void;

  // Creation mode
  startCreating: (type: SurfaceRegionType, workpieceId: string) => void;
  addBoundaryPoint: (
    position: [number, number, number],
    normal: [number, number, number],
    localPosition?: [number, number, number]
  ) => void;
  removeBoundaryPoint: (index: number) => void;
  setBoundaryPoints: (points: RegionBoundaryPoint[]) => void;
  finishCreating: (meshData?: { vertices: number[]; normals: number[]; indices: number[]; vertexCount: number; triangleCount: number }) => SurfaceRegion | null;
  cancelCreating: () => void;

  // Editing
  startEditing: (regionId: string) => void;
  finishEditing: () => void;

  // Boundary point editing
  updateBoundaryPoint: (
    regionId: string,
    pointId: string,
    position: [number, number, number],
    normal: [number, number, number]
  ) => void;
  updateRegionBoundaryPoints: (
    regionId: string,
    boundaryPoints: RegionBoundaryPoint[]
  ) => void;

  // Visibility
  setRegionVisible: (id: string, visible: boolean) => void;
  setAllRegionsVisible: (visible: boolean) => void;

  // Getters
  getRegion: (id: string) => SurfaceRegion | undefined;
  getRegionsByWorkpiece: (workpieceId: string) => SurfaceRegion[];
  getVisibleRegions: () => SurfaceRegion[];
  getSelectedRegion: () => SurfaceRegion | undefined;
}

/**
 * Create the surface region store
 */
export const createSurfaceRegionStore = (
  initialConfig: Partial<typeof DEFAULT_REGION_CONFIG> = {}
) => {
  const config = {
    ...DEFAULT_REGION_CONFIG,
    ...initialConfig,
  };

  return create<SurfaceRegionState>()(
    subscribeWithSelector((set, get) => ({
      // Initial state
      regions: new Map(),
      selectedRegionId: null,
      creationState: {
        mode: 'none',
        regionType: 'processing',
        workpieceId: null,
        points: [],
        isClosed: false,
      },
      config,

      // Region CRUD
      addRegion: (data) => {
        const id = nanoid();
        const now = Date.now();

        const boundaryPoints: RegionBoundaryPoint[] = data.boundaryPoints.map(
          (p, index) => ({
            ...p,
            id: nanoid(),
            order: index,
          })
        );

        const region: SurfaceRegion = {
          id,
          name: data.name || `Region ${get().regions.size + 1}`,
          type: data.type,
          workpieceId: data.workpieceId,
          boundaryPoints,
          visible: true,
          color: data.color || REGION_COLORS[data.type],
          opacity: data.opacity ?? config.defaultOpacity,
          groupId: data.groupId,
          createdAt: now,
          updatedAt: now,
          meshData: data.meshData,
        };

        set((state) => {
          const newRegions = new Map(state.regions);
          newRegions.set(id, region);
          return { regions: newRegions };
        });

        return region;
      },

      removeRegion: (id) => {
        set((state) => {
          const newRegions = new Map(state.regions);
          newRegions.delete(id);

          const selectedRegionId =
            state.selectedRegionId === id ? null : state.selectedRegionId;

          return { regions: newRegions, selectedRegionId };
        });
      },

      updateRegion: (data) => {
        set((state) => {
          const existing = state.regions.get(data.id);
          if (!existing) return state;

          const updated: SurfaceRegion = {
            ...existing,
            ...data,
            updatedAt: Date.now(),
          };

          const newRegions = new Map(state.regions);
          newRegions.set(data.id, updated);
          return { regions: newRegions };
        });
      },

      clearRegions: () => {
        set({
          regions: new Map(),
          selectedRegionId: null,
          creationState: {
            mode: 'none',
            regionType: 'processing',
            workpieceId: null,
            points: [],
            isClosed: false,
          },
        });
      },

      // Selection
      selectRegion: (id) => {
        set({ selectedRegionId: id });
      },

      // Creation mode
      startCreating: (type, workpieceId) => {
        set({
          creationState: {
            mode: 'creating',
            regionType: type,
            workpieceId,
            points: [],
            isClosed: false,
          },
          selectedRegionId: null,
        });
      },

      addBoundaryPoint: (position, normal, localPosition) => {
        set((state) => {
          if (state.creationState.mode !== 'creating') return state;

          const newPoint: RegionBoundaryPoint = {
            id: nanoid(),
            position,
            normal,
            localPosition,
            order: state.creationState.points.length,
            isUserPoint: true, // Mark as user-clicked point
          };

          return {
            creationState: {
              ...state.creationState,
              points: [...state.creationState.points, newPoint],
            },
          };
        });
      },

      removeBoundaryPoint: (index) => {
        set((state) => {
          if (state.creationState.mode !== 'creating') return state;

          const newPoints = state.creationState.points
            .filter((_, i) => i !== index)
            .map((p, i) => ({ ...p, order: i }));

          return {
            creationState: {
              ...state.creationState,
              points: newPoints,
            },
          };
        });
      },

      setBoundaryPoints: (points) => {
        set((state) => {
          if (state.creationState.mode !== 'creating') return state;

          return {
            creationState: {
              ...state.creationState,
              points: points.map((p, i) => ({ ...p, order: i })),
            },
          };
        });
      },

      finishCreating: (meshData) => {
        const state = get();
        const { creationState, config } = state;

        if (creationState.mode !== 'creating') return null;
        if (creationState.points.length < config.minPointsForRegion) return null;
        if (!creationState.workpieceId) return null;

        const region = state.addRegion({
          type: creationState.regionType,
          workpieceId: creationState.workpieceId,
          boundaryPoints: creationState.points,
          meshData,
        });

        set({
          creationState: {
            mode: 'none',
            regionType: 'processing',
            workpieceId: null,
            points: [],
            isClosed: false,
          },
        });

        return region;
      },

      cancelCreating: () => {
        set({
          creationState: {
            mode: 'none',
            regionType: 'processing',
            workpieceId: null,
            points: [],
            isClosed: false,
          },
        });
      },

      // Editing
      startEditing: (regionId) => {
        const region = get().regions.get(regionId);
        if (!region) return;

        set((state) => {
          const newRegions = new Map(state.regions);
          newRegions.set(regionId, { ...region, isEditing: true });

          return {
            regions: newRegions,
            selectedRegionId: regionId,
            creationState: {
              mode: 'editing',
              regionType: region.type,
              workpieceId: region.workpieceId,
              points: [...region.boundaryPoints],
              isClosed: true,
            },
          };
        });
      },

      finishEditing: () => {
        const state = get();
        const { creationState, selectedRegionId } = state;

        if (creationState.mode !== 'editing' || !selectedRegionId) return;

        const region = state.regions.get(selectedRegionId);
        if (!region) return;

        set((prevState) => {
          const newRegions = new Map(prevState.regions);
          newRegions.set(selectedRegionId, {
            ...region,
            boundaryPoints: creationState.points,
            isEditing: false,
            updatedAt: Date.now(),
          });

          return {
            regions: newRegions,
            creationState: {
              mode: 'none',
              regionType: 'processing',
              workpieceId: null,
              points: [],
              isClosed: false,
            },
          };
        });
      },

      // Boundary point editing
      updateBoundaryPoint: (regionId, pointId, position, normal) => {
        set((state) => {
          const region = state.regions.get(regionId);
          if (!region) return state;

          const updatedPoints = region.boundaryPoints.map((point) =>
            point.id === pointId ? { ...point, position, normal } : point
          );

          const newRegions = new Map(state.regions);
          newRegions.set(regionId, {
            ...region,
            boundaryPoints: updatedPoints,
            updatedAt: Date.now(),
          });

          return { regions: newRegions };
        });
      },

      updateRegionBoundaryPoints: (regionId, boundaryPoints) => {
        set((state) => {
          const region = state.regions.get(regionId);
          if (!region) return state;

          const newRegions = new Map(state.regions);
          newRegions.set(regionId, {
            ...region,
            boundaryPoints: boundaryPoints.map((p, i) => ({ ...p, order: i })),
            updatedAt: Date.now(),
          });

          return { regions: newRegions };
        });
      },

      // Visibility
      setRegionVisible: (id, visible) => {
        get().updateRegion({ id, visible });
      },

      setAllRegionsVisible: (visible) => {
        set((state) => {
          const newRegions = new Map(state.regions);
          for (const [id, region] of newRegions) {
            newRegions.set(id, { ...region, visible });
          }
          return { regions: newRegions };
        });
      },

      // Getters
      getRegion: (id) => get().regions.get(id),

      getRegionsByWorkpiece: (workpieceId) => {
        return Array.from(get().regions.values()).filter(
          (r) => r.workpieceId === workpieceId
        );
      },

      getVisibleRegions: () => {
        return Array.from(get().regions.values()).filter((r) => r.visible);
      },

      getSelectedRegion: () => {
        const { selectedRegionId, regions } = get();
        return selectedRegionId ? regions.get(selectedRegionId) : undefined;
      },
    }))
  );
};

/**
 * Default store instance
 */
export const useSurfaceRegionStore = createSurfaceRegionStore();

/**
 * Selector hooks
 */
export const useRegionCreationState = () =>
  useSurfaceRegionStore(useShallow((s) => s.creationState));

export const useSelectedRegionId = () =>
  useSurfaceRegionStore((s) => s.selectedRegionId);

export const useSurfaceRegions = () => {
  return useSurfaceRegionStore(
    useShallow((s) => Array.from(s.regions.values()))
  );
};

export const useVisibleSurfaceRegions = () => {
  return useSurfaceRegionStore(
    useShallow((s) => Array.from(s.regions.values()).filter((r) => r.visible))
  );
};

export const useSelectedRegion = () => {
  return useSurfaceRegionStore(
    useShallow((s) => {
      if (!s.selectedRegionId) return undefined;
      return s.regions.get(s.selectedRegionId);
    })
  );
};
