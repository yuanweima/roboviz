/**
 * PropertyEditor Module Demo
 *
 * Demonstrates the PropertyEditor component for schema-driven
 * property editing with various field types.
 *
 * ===== 使用说明 / Usage Guide =====
 *
 * ## 1. 基本导入 / Basic Import
 * ```tsx
 * import {
 *   PropertyEditor,
 *   type PropertySchema,
 *   type PropertyGroup,
 *   type PropertyField,
 *   type PropertyValidationResult,
 * } from '@aspect/roboviz-react';
 * ```
 *
 * ## 2. 必需属性 / Required Props
 * - `schema`: PropertySchema - Schema定义 / Schema definition
 * - `value`: T - 当前值对象 / Current value object
 * - `onChange`: (value: T) => void - 值改变回调 / Value change callback
 *
 * ## 3. 可选属性 / Optional Props
 *
 * ### 模式控制 / Mode Control
 * - `mode`: 'edit' | 'view' - 编辑或只读模式 (default: 'edit')
 * - `autoSave`: boolean - 自动保存模式 (default: true)
 * - `autoSaveDelay`: number - 自动保存延迟(ms) (default: 300)
 *
 * ### 表单操作 / Form Actions
 * - `onSubmit`: (value: T) => void - 提交回调 / Submit callback
 * - `onReset`: () => void - 重置回调 / Reset callback
 * - `hideActions`: boolean - 隐藏操作按钮 (default: false)
 *
 * ### 验证 / Validation
 * - `showValidation`: boolean - 显示验证错误 (default: true)
 * - `validateOn`: 'blur' | 'change' | 'submit' - 验证时机 (default: 'change')
 * - `onValidationChange`: (result: PropertyValidationResult) => void - 验证状态回调
 *
 * ### 3D集成 / 3D Integration
 * - `onPreviewChange`: (preview: Partial<T> | null) => void - 预览回调(拖拽时实时更新)
 * - `highlightFields`: string[] - 高亮显示的字段(从3D场景选择)
 *
 * ### 样式 / Styling
 * - `className`: string - 自定义CSS类名
 * - `style`: React.CSSProperties - 内联样式
 * - `compact`: boolean - 紧凑模式 (default: false)
 * - `theme`: 'light' | 'dark' | 'auto' - 主题 (default: 'auto' → 'dark')
 *
 * ### 自定义渲染 / Custom Rendering
 * - `fieldRenderers`: Record<string, React.ComponentType> - 自定义字段渲染器
 * - `renderGroup`: (group, children) => ReactNode - 自定义组渲染
 * - `renderFieldWrapper`: (field, children) => ReactNode - 自定义字段包装器
 * - `renderActions`: () => ReactNode - 自定义操作按钮
 *
 * ## 4. Schema 结构 / Schema Structure
 * ```tsx
 * interface PropertySchema {
 *   groups: PropertyGroup[];        // 字段分组 / Field groups
 *   layout?: {
 *     labelWidth?: number;          // 标签宽度 / Label width
 *     columns?: 1 | 2 | 3;          // 列数 / Number of columns
 *     compact?: boolean;            // 紧凑模式 / Compact mode
 *   };
 *   validate?: (values) => PropertyValidationResult; // 全局验证
 * }
 *
 * interface PropertyGroup {
 *   id: string;                     // 组ID / Group ID
 *   label: string;                  // 组标签 / Group label
 *   fields: PropertyField[];        // 字段列表 / Field list
 *   collapsible?: boolean;          // 可折叠 / Collapsible
 *   defaultCollapsed?: boolean;     // 默认折叠 / Default collapsed
 *   visible?: boolean | ((values) => boolean); // 条件显示
 * }
 * ```
 *
 * ## 5. 字段类型 / Field Types
 *
 * ### 基础类型 / Basic Types
 * - `text`: 文本输入 / Text input
 * - `number`: 数字输入(支持slider) / Number input with optional slider
 * - `boolean`: 布尔开关 / Boolean switch
 * - `enum`: 下拉选择 / Dropdown select
 * - `color`: 颜色选择器 / Color picker
 * - `tags`: 标签数组 / Tag array
 *
 * ### 几何类型 / Geometry Types
 * - `position3d`: 3D位置 { x, y, z } / 3D position
 * - `euler`: 欧拉角 { x, y, z } / Euler angles
 * - `quaternion`: 四元数 { x, y, z, w } / Quaternion
 * - `pose3d`: 完整位姿 / Full 6-DOF pose
 *
 * ### 机器人类型 / Robot Types
 * - `joint-array`: 关节角数组 / Joint angle array
 *
 * ## 6. 字段定义 / Field Definition
 * ```tsx
 * interface PropertyField {
 *   key: string;                    // 字段键名 / Field key (maps to value property)
 *   type: PropertyFieldType;        // 字段类型 / Field type
 *   label: string;                  // 显示标签 / Display label
 *   description?: string;           // 帮助文本 / Help text
 *   placeholder?: string;           // 占位符 / Placeholder
 *   unit?: string;                  // 单位 (mm, deg, %) / Unit display
 *
 *   // 验证 / Validation
 *   required?: boolean;             // 必填 / Required
 *   min?: number;                   // 最小值 / Minimum value
 *   max?: number;                   // 最大值 / Maximum value
 *   step?: number;                  // 步进值 / Step value
 *   precision?: number;             // 小数精度 / Decimal precision
 *   pattern?: RegExp;               // 正则验证 / Regex pattern
 *   validate?: (value, allValues) => string | null; // 自定义验证
 *
 *   // 条件逻辑 / Conditional Logic
 *   visible?: boolean | ((values) => boolean);   // 条件显示
 *   disabled?: boolean | ((values) => boolean);  // 条件禁用
 *   readOnly?: boolean;             // 只读 / Read-only
 *
 *   // 类型特定选项 / Type-specific Options
 *   options?: EnumOption[];         // enum类型选项 / Options for enum type
 *   multiline?: boolean;            // text多行 / Multiline text
 *   rows?: number;                  // 多行行数 / Number of rows
 * }
 * ```
 *
 * ## 7. 完整示例 / Complete Example
 * ```tsx
 * const schema: PropertySchema = {
 *   groups: [{
 *     id: 'settings',
 *     label: 'Settings',
 *     collapsible: true,
 *     fields: [
 *       { key: 'name', type: 'text', label: 'Name', required: true },
 *       { key: 'speed', type: 'number', label: 'Speed', unit: '%', min: 0, max: 100 },
 *       { key: 'enabled', type: 'boolean', label: 'Enabled' },
 *       {
 *         key: 'mode',
 *         type: 'enum',
 *         label: 'Mode',
 *         options: [
 *           { value: 'auto', label: 'Automatic' },
 *           { value: 'manual', label: 'Manual' },
 *         ],
 *       },
 *     ],
 *   }],
 * };
 *
 * <PropertyEditor
 *   schema={schema}
 *   value={config}
 *   onChange={setConfig}
 *   onSubmit={handleSave}
 *   theme="dark"
 * />
 * ```
 *
 * ===================================
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useControls, button, folder } from 'leva';
import {
  PropertyEditor,
  type PropertySchema,
} from '@aspect/roboviz-react';
import { useAppStore } from '../store';

// Demo robot configuration type
interface RobotConfig {
  // General
  name: string;
  enabled: boolean;
  model: string;

  // Position
  basePosition: { x: number; y: number; z: number };
  basePose: {
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
  };

  // Joints
  jointAngles: number[];
  speed: number;
  acceleration: number;

  // Tool
  toolOffset: { x: number; y: number; z: number };
  toolWeight: number;

  // Safety
  maxVelocity: number;
  collisionEnabled: boolean;
  safetyZoneRadius: number;
}

// Default configuration
const DEFAULT_CONFIG: RobotConfig = {
  name: 'Robot_01',
  enabled: true,
  model: 'fanuc_lr_mate',

  basePosition: { x: 0, y: 0, z: 0 },
  basePose: {
    position: { x: 0, y: 0, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
  },

  jointAngles: [0, -0.3, 0.6, 0, -0.3, 0],
  speed: 50,
  acceleration: 100,

  toolOffset: { x: 0, y: 0, z: 0.1 },
  toolWeight: 2.5,

  maxVelocity: 1000,
  collisionEnabled: true,
  safetyZoneRadius: 0.5,
};

// Schema definition
const ROBOT_SCHEMA: PropertySchema = {
  groups: [
    {
      id: 'general',
      label: 'General',
      collapsible: true,
      defaultCollapsed: false,
      fields: [
        {
          key: 'name',
          type: 'text',
          label: 'Robot Name',
          description: 'Unique identifier for this robot',
          required: true,
          placeholder: 'Enter robot name...',
          maxLength: 50,
        },
        {
          key: 'enabled',
          type: 'boolean',
          label: 'Enabled',
          description: 'Enable or disable this robot',
        },
        {
          key: 'model',
          type: 'enum',
          label: 'Robot Model',
          description: 'Select the robot model',
          options: [
            { value: 'fanuc_lr_mate', label: 'FANUC LR Mate 200iD/7L' },
            { value: 'ur5', label: 'Universal Robots UR5' },
            { value: 'kuka_kr6', label: 'KUKA KR 6 R900' },
            { value: 'abb_irb120', label: 'ABB IRB 120' },
          ],
        },
      ],
    },
    {
      id: 'position',
      label: 'Base Position',
      collapsible: true,
      defaultCollapsed: false,
      fields: [
        {
          key: 'basePosition',
          type: 'position3d',
          label: 'Base Position',
          description: 'Robot base position in world coordinates (meters)',
          unit: 'm',
          precision: 3,
          min: -10,
          max: 10,
          step: 0.01,
        },
        {
          key: 'basePose',
          type: 'pose3d',
          label: 'Base Pose',
          description: 'Full 6-DOF pose of robot base',
        },
      ],
    },
    {
      id: 'motion',
      label: 'Motion Control',
      collapsible: true,
      defaultCollapsed: false,
      fields: [
        {
          key: 'jointAngles',
          type: 'joint-array',
          label: 'Joint Angles',
          description: 'Current joint positions (radians)',
          unit: 'rad',
          precision: 3,
        },
        {
          key: 'speed',
          type: 'number',
          label: 'Speed',
          description: 'Motion speed percentage',
          unit: '%',
          min: 0,
          max: 100,
          step: 1,
          precision: 0,
        },
        {
          key: 'acceleration',
          type: 'number',
          label: 'Acceleration',
          description: 'Motion acceleration percentage',
          unit: '%',
          min: 0,
          max: 100,
          step: 1,
          precision: 0,
        },
      ],
    },
    {
      id: 'tool',
      label: 'Tool Settings',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          key: 'toolOffset',
          type: 'position3d',
          label: 'TCP Offset',
          description: 'Tool center point offset from flange',
          unit: 'm',
          precision: 4,
          min: -1,
          max: 1,
          step: 0.001,
        },
        {
          key: 'toolWeight',
          type: 'number',
          label: 'Tool Weight',
          description: 'Weight of the attached tool',
          unit: 'kg',
          min: 0,
          max: 50,
          step: 0.1,
          precision: 1,
        },
      ],
    },
    {
      id: 'safety',
      label: 'Safety',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          key: 'maxVelocity',
          type: 'number',
          label: 'Max Velocity',
          description: 'Maximum TCP velocity limit',
          unit: 'mm/s',
          min: 0,
          max: 5000,
          step: 10,
          precision: 0,
        },
        {
          key: 'collisionEnabled',
          type: 'boolean',
          label: 'Collision Detection',
          description: 'Enable real-time collision detection',
        },
        {
          key: 'safetyZoneRadius',
          type: 'number',
          label: 'Safety Zone Radius',
          description: 'Radius of the safety monitoring zone',
          unit: 'm',
          min: 0.1,
          max: 5,
          step: 0.1,
          precision: 1,
          visible: (values) => values.collisionEnabled === true,
        },
      ],
    },
  ],
};

export function PropertyEditorModule() {
  const { addLog } = useAppStore();

  // State
  const [config, setConfig] = useState<RobotConfig>(DEFAULT_CONFIG);
  const [autoSave, setAutoSave] = useState(true);
  const [compact, setCompact] = useState(false);

  // Handlers
  const handleChange = useCallback((newValue: RobotConfig) => {
    setConfig(newValue);
    if (autoSave) {
      addLog('info', 'Config updated (auto-save)');
    }
  }, [autoSave, addLog]);

  const handleSubmit = useCallback((value: RobotConfig) => {
    addLog('info', `Config saved: ${value.name}`);
  }, [addLog]);

  const handleReset = useCallback(() => {
    addLog('info', 'Config reset to defaults');
  }, [addLog]);

  const handleValidationChange = useCallback((result: { valid: boolean; errors: Array<{ field: string; message: string }> }) => {
    if (!result.valid) {
      addLog('warning', `Validation errors: ${result.errors.length}`);
    }
  }, [addLog]);

  // Leva controls
  useControls('Editor Settings', {
    autoSave: {
      value: autoSave,
      label: 'Auto Save',
      onChange: (v: boolean) => setAutoSave(v),
    },
    compact: {
      value: compact,
      label: 'Compact Mode',
      onChange: (v: boolean) => setCompact(v),
    },
    'Reset to Defaults': button(() => {
      setConfig(DEFAULT_CONFIG);
      addLog('info', 'Reset to default configuration');
    }),
  });

  useControls('Presets', {
    'Load Home Position': button(() => {
      setConfig((prev) => ({
        ...prev,
        jointAngles: [0, 0, 0, 0, 0, 0],
        basePosition: { x: 0, y: 0, z: 0 },
      }));
      addLog('info', 'Loaded home position preset');
    }),
    'Load Work Position': button(() => {
      setConfig((prev) => ({
        ...prev,
        jointAngles: [0, -0.5, 1.0, 0, -0.5, 0],
        speed: 75,
        acceleration: 80,
      }));
      addLog('info', 'Loaded work position preset');
    }),
    'Load Safe Position': button(() => {
      setConfig((prev) => ({
        ...prev,
        jointAngles: [0, -1.57, 1.57, 0, 0, 0],
        speed: 25,
        collisionEnabled: true,
        maxVelocity: 500,
      }));
      addLog('info', 'Loaded safe position preset');
    }),
  });

  // Formatted display values
  const displayValues = useMemo(() => ({
    joints: config.jointAngles.map((j) => `${(j * 180 / Math.PI).toFixed(1)}deg`).join(', '),
    position: `(${config.basePosition.x.toFixed(2)}, ${config.basePosition.y.toFixed(2)}, ${config.basePosition.z.toFixed(2)})`,
    speed: `${config.speed}%`,
  }), [config]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Property Editor</h2>
        <p>
          Schema-driven property editing with validation, grouping, and custom field types.
        </p>
      </div>

      {/* Current config summary */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 16,
          padding: 12,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
          flexWrap: 'wrap',
          fontSize: 12,
        }}
      >
        <div>
          <span style={{ color: '#888' }}>Name: </span>
          <span style={{ fontWeight: 600 }}>{config.name}</span>
        </div>
        <div>
          <span style={{ color: '#888' }}>Model: </span>
          <span>{config.model}</span>
        </div>
        <div>
          <span style={{ color: '#888' }}>Enabled: </span>
          <span style={{ color: config.enabled ? '#22c55e' : '#dc2626' }}>
            {config.enabled ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span style={{ color: '#888' }}>Speed: </span>
          <span>{displayValues.speed}</span>
        </div>
        <div>
          <span style={{ color: '#888' }}>Collision: </span>
          <span style={{ color: config.collisionEnabled ? '#22c55e' : '#888' }}>
            {config.collisionEnabled ? 'On' : 'Off'}
          </span>
        </div>
      </div>

      {/* Property Editor */}
      <div
        style={{
          backgroundColor: '#1e1e2e',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        <PropertyEditor
          schema={ROBOT_SCHEMA}
          value={config as unknown as Record<string, unknown>}
          onChange={handleChange as unknown as (value: Record<string, unknown>) => void}
          onSubmit={handleSubmit as unknown as (value: Record<string, unknown>) => void}
          onReset={handleReset}
          onValidationChange={handleValidationChange}
          autoSave={autoSave}
          autoSaveDelay={500}
          showValidation={true}
          validateOn="change"
          compact={compact}
          hideActions={autoSave}
          style={{
            backgroundColor: 'var(--pe-bg, #1e1e2e)',
            color: 'var(--pe-text, #e5e7eb)',
          }}
        />
      </div>

      {/* Current state display */}
      <div className="module-status">
        <span>Mode: {autoSave ? 'Auto-save' : 'Manual'}</span>
        <span>Layout: {compact ? 'Compact' : 'Normal'}</span>
        <span>Joints: {config.jointAngles.length}</span>
        <span>Position: {displayValues.position}</span>
      </div>

      {/* Field types reference */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          fontSize: 12,
          color: '#888',
        }}
      >
        <strong>Available Field Types:</strong>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          <FieldTypeBadge type="number" />
          <FieldTypeBadge type="text" />
          <FieldTypeBadge type="boolean" />
          <FieldTypeBadge type="enum" />
          <FieldTypeBadge type="position3d" />
          <FieldTypeBadge type="pose3d" />
          <FieldTypeBadge type="joint-array" />
        </div>
      </div>
    </div>
  );
}

// Field type badge component
function FieldTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    number: '#3b82f6',
    text: '#22c55e',
    boolean: '#f59e0b',
    enum: '#a855f7',
    position3d: '#ec4899',
    pose3d: '#06b6d4',
    'joint-array': '#f97316',
  };

  return (
    <span
      style={{
        padding: '2px 8px',
        backgroundColor: `${colors[type] || '#888'}22`,
        color: colors[type] || '#888',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      {type}
    </span>
  );
}
