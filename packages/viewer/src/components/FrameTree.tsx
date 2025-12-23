/**
 * FrameTree component
 * Renders the coordinate frame tree with all frames and parent-child connections
 */
import { useViewerStore } from '../store/viewerStore';
import { CoordinateFrame, FrameConnection } from './CoordinateFrame';

export interface FrameTreeProps {
  onFrameClick?: (frameId: string) => void;
}

export function FrameTree({ onFrameClick }: FrameTreeProps) {
  const { coordinateFrames, frameTreeConfig, framesEnabled } = useViewerStore();

  if (!framesEnabled || coordinateFrames.size === 0) return null;

  const framesArray = Array.from(coordinateFrames.values());

  // Build parent-child connections
  const connections: Array<{ from: string; to: string }> = [];
  for (const frame of framesArray) {
    if (frame.parentFrameId && coordinateFrames.has(frame.parentFrameId)) {
      connections.push({
        from: frame.parentFrameId,
        to: frame.id,
      });
    }
  }

  return (
    <group>
      {/* Render connections first (behind frames) */}
      {frameTreeConfig.showConnections &&
        connections.map(({ from, to }) => {
          const parentFrame = coordinateFrames.get(from);
          const childFrame = coordinateFrames.get(to);
          if (!parentFrame || !childFrame) return null;
          return (
            <FrameConnection
              key={`${from}-${to}`}
              from={parentFrame}
              to={childFrame}
              color={frameTreeConfig.connectionColor}
              dashed={frameTreeConfig.connectionStyle === 'dashed'}
            />
          );
        })}

      {/* Render all frames */}
      {framesArray.map((frame) => (
        <CoordinateFrame
          key={frame.id}
          data={frame}
          highlighted={frameTreeConfig.highlightedFrame === frame.id}
          highlightColor={frameTreeConfig.highlightColor}
          onClick={onFrameClick}
        />
      ))}
    </group>
  );
}
