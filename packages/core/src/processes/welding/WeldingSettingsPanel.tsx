/**
 * WeldingSettingsPanel Component
 *
 * Settings panel for configuring welding parameters.
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import type { WeldingSettings, WeldingMethod, WeavePattern } from './types';

// ============================================================================
// Types
// ============================================================================

export interface WeldingSettingsPanelProps {
  /** Current settings */
  settings: WeldingSettings;

  /** Called when settings change */
  onSettingsChange: (settings: WeldingSettings) => void;

  /** Whether panel is readonly */
  readonly?: boolean;

  /** Override theme */
  theme?: RoboVizTheme;
}

// ============================================================================
// Styles
// ============================================================================

function getContainerStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.backgrounds.panel,
    borderRadius: theme.borderRadius.md,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    color: theme.text.primary,
  };
}

function getSectionStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  };
}

function getSectionTitleStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.xs,
  };
}

function getRowStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };
}

function getLabelStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    color: theme.text.secondary,
    flex: 1,
  };
}

function getInputStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    width: 80,
    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    backgroundColor: theme.backgrounds.surface,
    border: `1px solid ${theme.borders.default}`,
    borderRadius: theme.borderRadius.sm,
    color: theme.text.primary,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamilyMono,
    textAlign: 'right',
  };
}

function getSelectStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    ...getInputStyle(theme),
    width: 100,
    textAlign: 'left',
    cursor: 'pointer',
  };
}

function getUnitStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    color: theme.text.disabled,
    fontSize: theme.typography.fontSize.xs,
    width: 40,
    textAlign: 'left',
  };
}

// ============================================================================
// Component
// ============================================================================

export function WeldingSettingsPanel({
  settings,
  onSettingsChange,
  readonly = false,
  theme: themeProp,
}: WeldingSettingsPanelProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);

  // Update handler
  const updateSetting = useCallback(
    <K extends keyof WeldingSettings>(key: K, value: WeldingSettings[K]) => {
      onSettingsChange({ ...settings, [key]: value });
    },
    [settings, onSettingsChange]
  );

  // Number input handler
  const handleNumberChange = useCallback(
    (key: keyof WeldingSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        updateSetting(key, value as WeldingSettings[typeof key]);
      }
    },
    [updateSetting]
  );

  // Select handler
  const handleMethodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateSetting('method', e.target.value as WeldingMethod);
    },
    [updateSetting]
  );

  // Weave toggle
  const toggleWeave = useCallback(() => {
    if (settings.weave) {
      updateSetting('weave', null);
    } else {
      updateSetting('weave', {
        pattern: 'linear',
        width: 3,
        frequency: 2,
        dwellTime: 50,
        phaseOffset: 0,
      });
    }
  }, [settings.weave, updateSetting]);

  // Weave settings update
  const updateWeave = useCallback(
    <K extends keyof NonNullable<WeldingSettings['weave']>>(
      key: K,
      value: NonNullable<WeldingSettings['weave']>[K]
    ) => {
      if (settings.weave) {
        updateSetting('weave', { ...settings.weave, [key]: value });
      }
    },
    [settings.weave, updateSetting]
  );

  const methodOptions: WeldingMethod[] = ['MIG', 'TIG', 'MAG', 'FCAW', 'SAW', 'Laser', 'LaserHybrid'];
  const weavePatterns: WeavePattern[] = ['linear', 'triangular', 'circular', 'figure8', 'crescent'];

  return (
    <div style={getContainerStyle(theme)}>
      {/* Method Section */}
      <div style={getSectionStyle(theme)}>
        <div style={getSectionTitleStyle(theme)}>Welding Method</div>
        <div style={getRowStyle(theme)}>
          <span style={getLabelStyle(theme)}>Method</span>
          <select
            style={getSelectStyle(theme)}
            value={settings.method}
            onChange={handleMethodChange}
            disabled={readonly}
          >
            {methodOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Power Settings */}
      <div style={getSectionStyle(theme)}>
        <div style={getSectionTitleStyle(theme)}>Power Settings</div>

        <div style={getRowStyle(theme)}>
          <span style={getLabelStyle(theme)}>Voltage</span>
          <input
            type="number"
            style={getInputStyle(theme)}
            value={settings.voltage}
            onChange={handleNumberChange('voltage')}
            disabled={readonly}
            step={0.5}
            min={10}
            max={50}
          />
          <span style={getUnitStyle(theme)}>V</span>
        </div>

        <div style={getRowStyle(theme)}>
          <span style={getLabelStyle(theme)}>Current</span>
          <input
            type="number"
            style={getInputStyle(theme)}
            value={settings.current}
            onChange={handleNumberChange('current')}
            disabled={readonly}
            step={5}
            min={50}
            max={500}
          />
          <span style={getUnitStyle(theme)}>A</span>
        </div>

        <div style={getRowStyle(theme)}>
          <span style={getLabelStyle(theme)}>Wire Feed</span>
          <input
            type="number"
            style={getInputStyle(theme)}
            value={settings.wireFeedSpeed}
            onChange={handleNumberChange('wireFeedSpeed')}
            disabled={readonly}
            step={0.5}
            min={1}
            max={25}
          />
          <span style={getUnitStyle(theme)}>m/min</span>
        </div>
      </div>

      {/* Motion Settings */}
      <div style={getSectionStyle(theme)}>
        <div style={getSectionTitleStyle(theme)}>Motion</div>

        <div style={getRowStyle(theme)}>
          <span style={getLabelStyle(theme)}>Travel Speed</span>
          <input
            type="number"
            style={getInputStyle(theme)}
            value={settings.travelSpeed}
            onChange={handleNumberChange('travelSpeed')}
            disabled={readonly}
            step={1}
            min={1}
            max={50}
          />
          <span style={getUnitStyle(theme)}>mm/s</span>
        </div>

        <div style={getRowStyle(theme)}>
          <span style={getLabelStyle(theme)}>Standoff</span>
          <input
            type="number"
            style={getInputStyle(theme)}
            value={settings.standoffDistance}
            onChange={handleNumberChange('standoffDistance')}
            disabled={readonly}
            step={1}
            min={5}
            max={30}
          />
          <span style={getUnitStyle(theme)}>mm</span>
        </div>
      </div>

      {/* Weave Settings */}
      <div style={getSectionStyle(theme)}>
        <div style={getRowStyle(theme)}>
          <span style={getSectionTitleStyle(theme)}>Weave Pattern</span>
          <button
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              backgroundColor: settings.weave ? theme.colors.primary : theme.backgrounds.surface,
              color: settings.weave ? theme.text.inverse : theme.text.secondary,
              border: `1px solid ${settings.weave ? theme.colors.primary : theme.borders.default}`,
              borderRadius: theme.borderRadius.sm,
              cursor: readonly ? 'not-allowed' : 'pointer',
              fontSize: theme.typography.fontSize.xs,
            }}
            onClick={toggleWeave}
            disabled={readonly}
          >
            {settings.weave ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {settings.weave && (
          <>
            <div style={getRowStyle(theme)}>
              <span style={getLabelStyle(theme)}>Pattern</span>
              <select
                style={getSelectStyle(theme)}
                value={settings.weave.pattern}
                onChange={(e) => updateWeave('pattern', e.target.value as WeavePattern)}
                disabled={readonly}
              >
                {weavePatterns.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div style={getRowStyle(theme)}>
              <span style={getLabelStyle(theme)}>Width</span>
              <input
                type="number"
                style={getInputStyle(theme)}
                value={settings.weave.width}
                onChange={(e) => updateWeave('width', parseFloat(e.target.value))}
                disabled={readonly}
                step={0.5}
                min={0.5}
                max={10}
              />
              <span style={getUnitStyle(theme)}>mm</span>
            </div>

            <div style={getRowStyle(theme)}>
              <span style={getLabelStyle(theme)}>Frequency</span>
              <input
                type="number"
                style={getInputStyle(theme)}
                value={settings.weave.frequency}
                onChange={(e) => updateWeave('frequency', parseFloat(e.target.value))}
                disabled={readonly}
                step={0.5}
                min={0.5}
                max={10}
              />
              <span style={getUnitStyle(theme)}>Hz</span>
            </div>
          </>
        )}
      </div>

      {/* Consumables */}
      <div style={getSectionStyle(theme)}>
        <div style={getSectionTitleStyle(theme)}>Consumables</div>

        <div style={getRowStyle(theme)}>
          <span style={getLabelStyle(theme)}>Wire Diameter</span>
          <input
            type="number"
            style={getInputStyle(theme)}
            value={settings.wireDiameter}
            onChange={handleNumberChange('wireDiameter')}
            disabled={readonly}
            step={0.1}
            min={0.6}
            max={2.4}
          />
          <span style={getUnitStyle(theme)}>mm</span>
        </div>

        <div style={getRowStyle(theme)}>
          <span style={getLabelStyle(theme)}>Gas Flow</span>
          <input
            type="number"
            style={getInputStyle(theme)}
            value={settings.gasFlowRate}
            onChange={handleNumberChange('gasFlowRate')}
            disabled={readonly}
            step={1}
            min={10}
            max={30}
          />
          <span style={getUnitStyle(theme)}>L/min</span>
        </div>
      </div>
    </div>
  );
}

export default WeldingSettingsPanel;
