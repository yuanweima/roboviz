/**
 * CollisionWorldRenderer Component
 *
 * Renders the complete collision world including all objects and optional Gizmo editing.
 */

import React, { useCallback, useState } from 'react';
import { CollisionObjectVisual } from './CollisionObjectVisual';
import { CollisionObjectGizmo, type GizmoMode } from './CollisionObjectGizmo';
import type { CollisionObject, Transform3D } from '../world/types';

// ============================================================================
// Types
// ============================================================================

export interface CollisionWorldRendererProps {
  /** Array of collision objects to render */
  objects: CollisionObject[];
  /** Currently selected object ID */
  selectedId: string | null;
  /** Whether editing is enabled */
  editingEnabled?: boolean;
  /** Current gizmo mode */
  gizmoMode?: GizmoMode;
  /** Gizmo size */
  gizmoSize?: number;
  /** Callback when object is selected */
  onSelect?: (id: string | null) => void;
  /** Callback when object transform changes */
  onTransformChange?: (id: string, transform: Transform3D) => void;
  /** Callback when dragging starts */
  onDragStart?: () => void;
  /** Callback when dragging ends */
  onDragEnd?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const CollisionWorldRenderer = React.memo(function CollisionWorldRenderer({
  objects,
  selectedId,
  editingEnabled = true,
  gizmoMode = 'translate',
  gizmoSize = 1,
  onSelect,
  onTransformChange,
  onDragStart,
  onDragEnd,
}: CollisionWorldRendererProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleClick = useCallback(
    (id: string) => {
      onSelect?.(id);
    },
    [onSelect]
  );

  const handleBackgroundClick = useCallback(() => {
    onSelect?.(null);
  }, [onSelect]);

  const handlePointerEnter = useCallback((id: string) => {
    setHoveredId(id);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  return (
    <group onClick={handleBackgroundClick}>
      {objects.map((object) => {
        const isSelected = object.id === selectedId;

        // If selected and editing enabled, show gizmo
        if (isSelected && editingEnabled && object.enabled) {
          return (
            <CollisionObjectGizmo
              key={object.id}
              object={object}
              mode={gizmoMode}
              enabled={true}
              size={gizmoSize}
              onTransformChange={onTransformChange}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={handleClick}
            />
          );
        }

        // Otherwise, just render the visual
        return (
          <CollisionObjectVisual
            key={object.id}
            object={object}
            isSelected={isSelected}
            isHovered={object.id === hoveredId}
            onClick={handleClick}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />
        );
      })}
    </group>
  );
});

export default CollisionWorldRenderer;
