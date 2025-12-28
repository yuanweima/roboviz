/**
 * GamepadStatusPanel Component
 *
 * Displays gamepad connection status, button hints, and real-time input visualization.
 * Designed to be integrated with JogControlPanel or used standalone.
 *
 * Features:
 * - Connection status indicator
 * - Real-time button state display
 * - Analog stick visualization
 * - Control hints based on current mapping
 * - Compact and expanded view modes
 */

import React, { useMemo } from 'react';
import { useRoboVizThemeWithFallback } from '../theme';
import type { RoboVizTheme } from '../theme/types';
import {
  type GamepadState,
  type InputDeviceInfo,
  type AnalogInput6DoF,
  type GamepadPresetType,
  StandardGamepadButton,
} from './types';
import { getButtonNames } from './gamepad-presets';

// ============================================================================
// Types
// ============================================================================

export interface GamepadStatusPanelProps {
  /** Whether a gamepad is connected */
  isConnected: boolean;
  /** Current gamepad state */
  gamepadState: GamepadState | null;
  /** List of all connected gamepads */
  connectedGamepads?: InputDeviceInfo[];
  /** Current analog input */
  analogInput?: AnalogInput6DoF | null;
  /** Whether analog input is active */
  isAnalogActive?: boolean;
  /** View mode */
  mode?: 'compact' | 'expanded' | 'minimal';
  /** Show control hints */
  showHints?: boolean;
  /** Show analog stick visualization */
  showSticks?: boolean;
  /** Custom style */
  style?: React.CSSProperties;
  /** Custom class name */
  className?: string;
  /** Override theme (uses context theme if not provided) */
  theme?: RoboVizTheme;
  /** Callback when user wants to configure mapping */
  onConfigureClick?: () => void;
}

// ============================================================================
// Subcomponents
// ============================================================================

interface ConnectionStatusProps {
  isConnected: boolean;
  deviceName?: string;
  preset?: GamepadPresetType;
  theme: RoboVizTheme;
}

function ConnectionStatus({ isConnected, deviceName, preset, theme }: ConnectionStatusProps) {
  const statusColor = isConnected
    ? theme.colors.success
    : theme.text.disabled;

  const statusText = isConnected
    ? `${deviceName || 'Gamepad'} (${preset || 'generic'})`
    : 'No gamepad connected';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 8px',
      backgroundColor: theme.backgrounds.surface,
      borderRadius: theme.borderRadius.sm,
    }}>
      {/* Status indicator */}
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: statusColor,
        boxShadow: isConnected ? `0 0 4px ${statusColor}` : 'none',
      }} />

      {/* Status text */}
      <span style={{
        fontSize: theme.typography.fontSize.xs,
        color: theme.text.secondary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '200px',
      }}>
        {statusText}
      </span>
    </div>
  );
}

interface AnalogStickVizProps {
  x: number;
  y: number;
  label: string;
  size?: number;
  theme: RoboVizTheme;
}

function AnalogStickViz({ x, y, label, size = 48, theme }: AnalogStickVizProps) {
  const dotSize = 8;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxOffset = (size - dotSize) / 2 - 2;

  // Calculate dot position
  const dotX = centerX + x * maxOffset - dotSize / 2;
  const dotY = centerY + y * maxOffset - dotSize / 2;

  const isActive = Math.abs(x) > 0.01 || Math.abs(y) > 0.01;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
    }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: theme.backgrounds.surface,
        border: `1px solid ${theme.borders.default}`,
        position: 'relative',
      }}>
        {/* Center crosshair */}
        <div style={{
          position: 'absolute',
          left: centerX - 0.5,
          top: 4,
          bottom: 4,
          width: 1,
          backgroundColor: theme.borders.subtle,
        }} />
        <div style={{
          position: 'absolute',
          top: centerY - 0.5,
          left: 4,
          right: 4,
          height: 1,
          backgroundColor: theme.borders.subtle,
        }} />

        {/* Position dot */}
        <div style={{
          position: 'absolute',
          left: dotX,
          top: dotY,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: isActive ? theme.colors.primary : theme.text.disabled,
          transition: 'background-color 0.1s',
        }} />
      </div>

      <span style={{
        fontSize: '10px',
        color: theme.text.secondary,
      }}>
        {label}
      </span>
    </div>
  );
}

interface ButtonIndicatorProps {
  isPressed: boolean;
  label: string;
  theme: RoboVizTheme;
}

function ButtonIndicator({ isPressed, label, theme }: ButtonIndicatorProps) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '24px',
      height: '20px',
      padding: '0 6px',
      backgroundColor: isPressed ? theme.colors.primary : theme.backgrounds.surface,
      color: isPressed ? theme.text.inverse : theme.text.secondary,
      borderRadius: theme.borderRadius.sm,
      fontSize: '11px',
      fontWeight: theme.typography.fontWeight.medium,
      transition: 'all 0.1s',
    }}>
      {label}
    </div>
  );
}

interface TriggerBarProps {
  value: number;
  label: string;
  theme: RoboVizTheme;
}

function TriggerBar({ value, label, theme }: TriggerBarProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
    }}>
      <div style={{
        width: '20px',
        height: '40px',
        backgroundColor: theme.backgrounds.surface,
        borderRadius: theme.borderRadius.sm,
        border: `1px solid ${theme.borders.default}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Fill bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${value * 100}%`,
          backgroundColor: value > 0.1 ? theme.colors.primary : 'transparent',
          transition: 'height 0.05s',
        }} />
      </div>
      <span style={{
        fontSize: '10px',
        color: theme.text.secondary,
      }}>
        {label}
      </span>
    </div>
  );
}

interface ControlHintsProps {
  preset: GamepadPresetType;
  theme: RoboVizTheme;
}

function ControlHints({ preset, theme }: ControlHintsProps) {
  const buttonNames = getButtonNames(preset);

  const hints = [
    { buttons: [buttonNames[StandardGamepadButton.LeftStick]], action: 'Toggle Mode' },
    { buttons: ['Left Stick'], action: 'X/Y Movement' },
    { buttons: ['Right Stick'], action: 'Rotation' },
    { buttons: [buttonNames[StandardGamepadButton.LT], buttonNames[StandardGamepadButton.RT]], action: 'Z Axis' },
    { buttons: ['D-Pad ↑↓'], action: 'Select Joint/Axis' },
    { buttons: [buttonNames[StandardGamepadButton.A], buttonNames[StandardGamepadButton.X], buttonNames[StandardGamepadButton.B]], action: 'Step Size' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '8px',
      backgroundColor: theme.backgrounds.surface,
      borderRadius: theme.borderRadius.md,
      fontSize: '11px',
    }}>
      <div style={{
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.text.primary,
        marginBottom: '4px',
      }}>
        Controls
      </div>
      {hints.map((hint, i) => (
        <div key={i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <span style={{
            color: theme.text.secondary,
            display: 'flex',
            gap: '4px',
          }}>
            {hint.buttons.map((btn, j) => (
              <span key={j} style={{
                padding: '1px 4px',
                backgroundColor: theme.backgrounds.input,
                borderRadius: '3px',
              }}>
                {btn}
              </span>
            ))}
          </span>
          <span style={{ color: theme.text.secondary }}>
            {hint.action}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GamepadStatusPanel({
  isConnected,
  gamepadState,
  connectedGamepads = [],
  analogInput,
  isAnalogActive: _isAnalogActive = false,
  mode = 'compact',
  showHints = true,
  showSticks = true,
  style,
  className,
  theme: themeProp,
  onConfigureClick,
}: GamepadStatusPanelProps): React.JSX.Element | null {
  const theme = useRoboVizThemeWithFallback(themeProp);

  const buttonNames = useMemo(() => {
    return getButtonNames(gamepadState?.detectedPreset || 'generic');
  }, [gamepadState?.detectedPreset]);

  // Get trigger values
  const leftTrigger = gamepadState?.buttons[StandardGamepadButton.LT] ? 1 : 0;
  const rightTrigger = gamepadState?.buttons[StandardGamepadButton.RT] ? 1 : 0;

  // Minimal mode - just show connection status
  if (mode === 'minimal') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          ...style,
        }}
      >
        <ConnectionStatus
          isConnected={isConnected}
          deviceName={gamepadState?.info.name}
          preset={gamepadState?.detectedPreset}
          theme={theme}
        />
      </div>
    );
  }

  // Compact mode - status + basic button indicators
  if (mode === 'compact') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '8px',
          backgroundColor: theme.backgrounds.panel,
          borderRadius: theme.borderRadius.md,
          border: `1px solid ${theme.borders.default}`,
          ...style,
        }}
      >
        {/* Connection status */}
        <ConnectionStatus
          isConnected={isConnected}
          deviceName={gamepadState?.info.name}
          preset={gamepadState?.detectedPreset}
          theme={theme}
        />

        {isConnected && gamepadState && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {/* Stick visualizations */}
            {showSticks && analogInput && (
              <>
                <AnalogStickViz
                  x={analogInput.tx}
                  y={analogInput.ty}
                  label="L"
                  size={40}
                  theme={theme}
                />
                <AnalogStickViz
                  x={analogInput.rx}
                  y={analogInput.ry}
                  label="R"
                  size={40}
                  theme={theme}
                />
              </>
            )}

            {/* Trigger bars */}
            <TriggerBar value={leftTrigger} label="LT" theme={theme} />
            <TriggerBar value={rightTrigger} label="RT" theme={theme} />

            {/* Key buttons */}
            <div style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
            }}>
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.A]}
                label={buttonNames[StandardGamepadButton.A]}
                theme={theme}
              />
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.B]}
                label={buttonNames[StandardGamepadButton.B]}
                theme={theme}
              />
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.X]}
                label={buttonNames[StandardGamepadButton.X]}
                theme={theme}
              />
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.Y]}
                label={buttonNames[StandardGamepadButton.Y]}
                theme={theme}
              />
            </div>
          </div>
        )}

        {/* Not connected message */}
        {!isConnected && (
          <div style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.text.secondary,
            textAlign: 'center',
            padding: '8px',
          }}>
            Connect a gamepad to enable controller input
          </div>
        )}
      </div>
    );
  }

  // Expanded mode - full display with hints
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        backgroundColor: theme.backgrounds.panel,
        borderRadius: theme.borderRadius.md,
        border: `1px solid ${theme.borders.default}`,
        ...style,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.text.secondary} strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="4" />
            <circle cx="8" cy="12" r="2" />
            <circle cx="16" cy="12" r="2" />
            <line x1="12" y1="8" x2="12" y2="10" />
            <line x1="10" y1="9" x2="14" y2="9" />
          </svg>
          <span style={{
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.text.primary,
          }}>
            Gamepad
          </span>
        </div>

        {onConfigureClick && (
          <button
            onClick={onConfigureClick}
            style={{
              padding: '4px 8px',
              fontSize: theme.typography.fontSize.xs,
              backgroundColor: theme.backgrounds.surface,
              color: theme.text.secondary,
              border: `1px solid ${theme.borders.default}`,
              borderRadius: theme.borderRadius.sm,
              cursor: 'pointer',
            }}
          >
            Configure
          </button>
        )}
      </div>

      {/* Connection status */}
      <ConnectionStatus
        isConnected={isConnected}
        deviceName={gamepadState?.info.name}
        preset={gamepadState?.detectedPreset}
        theme={theme}
      />

      {isConnected && gamepadState && (
        <>
          {/* Input visualization */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '20px',
            padding: '12px',
            backgroundColor: theme.backgrounds.surface,
            borderRadius: theme.borderRadius.md,
          }}>
            {/* Left side - LT and Left Stick */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <TriggerBar value={leftTrigger} label={buttonNames[StandardGamepadButton.LT]} theme={theme} />
              {showSticks && analogInput && (
                <AnalogStickViz
                  x={analogInput.tx}
                  y={analogInput.ty}
                  label="X/Y"
                  size={56}
                  theme={theme}
                />
              )}
            </div>

            {/* Center - Face buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: '4px',
              alignItems: 'center',
              justifyItems: 'center',
            }}>
              <div /> {/* Empty top-left */}
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.Y]}
                label={buttonNames[StandardGamepadButton.Y]}
                theme={theme}
              />
              <div /> {/* Empty top-right */}
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.X]}
                label={buttonNames[StandardGamepadButton.X]}
                theme={theme}
              />
              <div /> {/* Empty center */}
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.B]}
                label={buttonNames[StandardGamepadButton.B]}
                theme={theme}
              />
              <div /> {/* Empty bottom-left */}
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.A]}
                label={buttonNames[StandardGamepadButton.A]}
                theme={theme}
              />
              <div /> {/* Empty bottom-right */}
            </div>

            {/* Right side - RT and Right Stick */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <TriggerBar value={rightTrigger} label={buttonNames[StandardGamepadButton.RT]} theme={theme} />
              {showSticks && analogInput && (
                <AnalogStickViz
                  x={analogInput.rx}
                  y={analogInput.ry}
                  label="RX/RY"
                  size={56}
                  theme={theme}
                />
              )}
            </div>
          </div>

          {/* D-pad and bumpers */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.LB]}
                label={buttonNames[StandardGamepadButton.LB]}
                theme={theme}
              />
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.RB]}
                label={buttonNames[StandardGamepadButton.RB]}
                theme={theme}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.DPadUp]}
                label="↑"
                theme={theme}
              />
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.DPadDown]}
                label="↓"
                theme={theme}
              />
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.DPadLeft]}
                label="←"
                theme={theme}
              />
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.DPadRight]}
                label="→"
                theme={theme}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.Back]}
                label={buttonNames[StandardGamepadButton.Back]}
                theme={theme}
              />
              <ButtonIndicator
                isPressed={gamepadState.buttons[StandardGamepadButton.Start]}
                label={buttonNames[StandardGamepadButton.Start]}
                theme={theme}
              />
            </div>
          </div>

          {/* Control hints */}
          {showHints && (
            <ControlHints
              preset={gamepadState.detectedPreset}
              theme={theme}
            />
          )}
        </>
      )}

      {/* Not connected state */}
      {!isConnected && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: theme.text.secondary,
        }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.text.disabled}
            strokeWidth="1.5"
            style={{ margin: '0 auto 12px' }}
          >
            <rect x="2" y="6" width="20" height="12" rx="4" />
            <circle cx="8" cy="12" r="2" />
            <circle cx="16" cy="12" r="2" />
            <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" />
          </svg>
          <div style={{ fontSize: theme.typography.fontSize.sm, marginBottom: '4px' }}>
            No gamepad connected
          </div>
          <div style={{ fontSize: theme.typography.fontSize.xs }}>
            Connect an Xbox, PlayStation, or compatible controller
          </div>
        </div>
      )}

      {/* Multiple gamepads notice */}
      {connectedGamepads.length > 1 && (
        <div style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.text.secondary,
          textAlign: 'center',
        }}>
          {connectedGamepads.length} gamepads connected. Using first device.
        </div>
      )}
    </div>
  );
}

export default GamepadStatusPanel;
