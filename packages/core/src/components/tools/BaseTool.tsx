/**
 * BaseTool Component
 *
 * Base wrapper component for all tool visualizations.
 * Provides common functionality like positioning, scaling, and debugging.
 */

import * as React from 'react';
import { useMemo, forwardRef } from 'react';
import * as THREE from 'three';
import type { ToolBaseProps } from './types';

export interface BaseToolProps extends ToolBaseProps {
  /** Children to render inside the tool group */
  children: React.ReactNode;
}

/**
 * Base tool wrapper component
 *
 * Handles common positioning, rotation, and scaling for all tools.
 * Tool-specific components should use this as their outer wrapper.
 */
export const BaseTool = forwardRef<THREE.Group, BaseToolProps>(function BaseTool(
  {
    position = [0, 0, 0],
    quaternion = [0, 0, 0, 1],
    scale = 1,
    showAxes = false,
    opacity = 1,
    children,
  },
  ref
) {
  // Create quaternion object
  const quatObj = useMemo(
    () => new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]),
    [quaternion[0], quaternion[1], quaternion[2], quaternion[3]]
  );

  // Scale as array
  const scaleArray = useMemo<[number, number, number]>(
    () => [scale, scale, scale],
    [scale]
  );

  return (
    <group ref={ref} position={position} quaternion={quatObj} scale={scaleArray}>
      {/* Debug axes */}
      {showAxes && <axesHelper args={[0.05 * scale]} />}

      {/* Tool content with opacity support */}
      {opacity < 1 ? (
        <group>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === 'mesh') {
              // Clone mesh with transparent material
              return React.cloneElement(child as React.ReactElement<any>, {
                children: React.Children.map(
                  (child as React.ReactElement<any>).props.children,
                  (materialChild) => {
                    if (
                      React.isValidElement(materialChild) &&
                      typeof materialChild.type === 'string' &&
                      materialChild.type.includes('Material')
                    ) {
                      return React.cloneElement(materialChild as React.ReactElement<any>, {
                        transparent: true,
                        opacity,
                      });
                    }
                    return materialChild;
                  }
                ),
              });
            }
            return child;
          })}
        </group>
      ) : (
        children
      )}
    </group>
  );
});

/**
 * Higher-order component to add base tool functionality to any component
 */
export function withBaseTool<P extends ToolBaseProps>(
  WrappedComponent: React.ComponentType<P>,
  displayName?: string
): React.FC<P> {
  const WithBaseTool: React.FC<P> = (props) => {
    const { position, quaternion, scale, showAxes, opacity, ...rest } = props;

    return (
      <BaseTool
        position={position}
        quaternion={quaternion}
        scale={scale}
        showAxes={showAxes}
        opacity={opacity}
      >
        <WrappedComponent {...(rest as P)} />
      </BaseTool>
    );
  };

  WithBaseTool.displayName = displayName || `WithBaseTool(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithBaseTool;
}
