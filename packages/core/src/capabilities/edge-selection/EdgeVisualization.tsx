/**
 * EdgeVisualization Component
 *
 * 3D visualization of detected edges using Three.js/R3F.
 * Shows edges with selection/hover states.
 */

import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useEdgeSelection } from './EdgeSelectionContext';
import type { DetectedEdge } from './types';

// ============================================================================
// Types
// ============================================================================

export interface EdgeVisualizationProps {
  /** Override display settings */
  lineWidth?: number;
  defaultColor?: string;
  selectedColor?: string;
  hoverColor?: string;
  opacity?: number;
}

export interface SingleEdgeProps {
  edge: DetectedEdge;
  isSelected: boolean;
  isHovered: boolean;
  color: string;
  lineWidth: number;
  opacity: number;
  onClick: (edgeId: string) => void;
  onPointerEnter: (edgeId: string) => void;
  onPointerLeave: () => void;
}

// ============================================================================
// Single Edge Component
// ============================================================================

function SingleEdge({
  edge,
  isSelected,
  isHovered,
  color,
  lineWidth,
  opacity,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: SingleEdgeProps): React.JSX.Element {
  // Convert edge points to Vector3 array
  const points = useMemo(() => {
    return edge.points.map((p) => new THREE.Vector3(...p.position));
  }, [edge.points]);

  // Determine visual properties based on state
  const effectiveColor = isHovered || isSelected ? color : color;
  const effectiveWidth = isSelected ? lineWidth * 1.5 : isHovered ? lineWidth * 1.2 : lineWidth;
  const effectiveOpacity = isSelected ? 1 : isHovered ? 0.9 : opacity;

  const handleClick = useCallback(() => {
    onClick(edge.id);
  }, [edge.id, onClick]);

  const handlePointerEnter = useCallback(() => {
    onPointerEnter(edge.id);
  }, [edge.id, onPointerEnter]);

  return (
    <group
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <Line
        points={points}
        color={effectiveColor}
        lineWidth={effectiveWidth}
        transparent
        opacity={effectiveOpacity}
      />
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EdgeVisualization({
  lineWidth: lineWidthOverride,
  defaultColor: defaultColorOverride,
  selectedColor: selectedColorOverride,
  hoverColor: hoverColorOverride,
  opacity: opacityOverride,
}: EdgeVisualizationProps): React.JSX.Element | null {
  const { state, actions } = useEdgeSelection();
  const { detectedEdges, selectedEdgeIds, hoveredEdgeId, displaySettings } = state;

  // Merge overrides with display settings
  const lineWidth = lineWidthOverride ?? displaySettings.lineWidth;
  const defaultColor = defaultColorOverride ?? displaySettings.defaultColor;
  const selectedColor = selectedColorOverride ?? displaySettings.selectedColor;
  const hoverColor = hoverColorOverride ?? displaySettings.hoverColor;
  const opacity = opacityOverride ?? displaySettings.opacity;

  // Handlers
  const handleClick = useCallback(
    (edgeId: string) => {
      actions.toggleEdgeSelection(edgeId);
    },
    [actions]
  );

  const handlePointerEnter = useCallback(
    (edgeId: string) => {
      actions.setHoveredEdge(edgeId);
    },
    [actions]
  );

  const handlePointerLeave = useCallback(() => {
    actions.setHoveredEdge(null);
  }, [actions]);

  // Don't render if no edges or showAllEdges is false
  if (!displaySettings.showAllEdges || detectedEdges.length === 0) {
    return null;
  }

  return (
    <group name="edge-visualization">
      {detectedEdges.map((edge) => {
        const isSelected = selectedEdgeIds.includes(edge.id);
        const isHovered = hoveredEdgeId === edge.id;

        // Determine color based on state
        let color = defaultColor;
        if (isSelected) color = selectedColor;
        else if (isHovered) color = hoverColor;

        return (
          <SingleEdge
            key={edge.id}
            edge={edge}
            isSelected={isSelected}
            isHovered={isHovered}
            color={color}
            lineWidth={lineWidth}
            opacity={opacity}
            onClick={handleClick}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />
        );
      })}
    </group>
  );
}

export default EdgeVisualization;
