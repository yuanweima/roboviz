import React from 'react';
import type { ModuleType } from '../App';

interface SidebarProps {
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}

// Category definitions
type DemoCategory = 'scenes' | 'core' | 'robot' | 'trajectory' | 'vision' | 'advanced' | 'ui' | 'integration';

const CATEGORY_INFO: Record<DemoCategory, { label: string; color: string; icon: string }> = {
  scenes: { label: 'Process Scenes', color: '#ff6600', icon: '🏭' },
  core: { label: 'Core Features', color: '#4ecdc4', icon: '⚡' },
  robot: { label: 'Robot Control', color: '#ff6b6b', icon: '🤖' },
  trajectory: { label: 'Trajectory', color: '#95e1d3', icon: '📐' },
  vision: { label: 'Vision', color: '#a855f7', icon: '👁' },
  advanced: { label: 'Advanced', color: '#f38181', icon: '🔬' },
  ui: { label: 'UI Components', color: '#06b6d4', icon: '🎨' },
  integration: { label: 'Integration', color: '#00aaff', icon: '🔗' },
};

interface ModuleInfo {
  id: ModuleType;
  label: string;
  icon: string;
  description: string;
  category: DemoCategory;
  isFeatured?: boolean;
}

const MODULES: ModuleInfo[] = [
  // Process Scenes - Featured
  { id: 'welding', label: 'Welding', icon: '🔥', description: 'Industrial welding simulation', category: 'scenes', isFeatured: true },
  { id: 'grinding', label: 'Grinding', icon: '⚙️', description: 'Force-controlled grinding', category: 'scenes', isFeatured: true },
  { id: 'inspection', label: 'Inspection', icon: '🔍', description: 'AI defect detection', category: 'scenes', isFeatured: true },
  { id: 'cable-management', label: 'Cable Management', icon: '🔌', description: 'Cable twist tracking', category: 'scenes', isFeatured: true },
  { id: 'collision-analysis', label: 'Collision Analysis', icon: '📊', description: 'Timeline + Robot integration', category: 'scenes', isFeatured: true },
  { id: 'rendering-showcase', label: 'Rendering Showcase', icon: '✨', description: 'Post-processing & shaders', category: 'scenes', isFeatured: true },
  { id: 'motion-planning', label: 'Motion Planning', icon: '🧭', description: 'Algorithm comparison', category: 'scenes', isFeatured: true },
  { id: 'gpu-motion-planning', label: 'GPU Planning Pro', icon: '⚡', description: 'Advanced collision + waypoints', category: 'scenes', isFeatured: true },
  { id: 'ik-demo', label: 'IK Demo', icon: '📐', description: 'usePoseIK reference implementation', category: 'scenes', isFeatured: true },

  // Core Features
  { id: 'robot', label: 'Robot Basics', icon: '🤖', description: 'URDF loading, joint control', category: 'core' },
  { id: 'workpoint', label: 'Workpoints', icon: '📍', description: 'Surface work points', category: 'core' },
  { id: 'imperative', label: 'Imperative API', icon: '🔧', description: 'createRoboViz factory', category: 'core' },

  // Robot Control
  { id: 'multi-robot', label: 'Multi-Robot', icon: '👥', description: 'Robot coordination', category: 'robot' },
  { id: 'ghost-robot', label: 'Ghost Robot', icon: '👻', description: 'Target pose preview', category: 'robot' },
  { id: 'trajx-wasm', label: 'Trajx WASM', icon: '⚡', description: 'FK/IK solver', category: 'robot' },
  { id: 'gamepad-control', label: 'Gamepad', icon: '🎮', description: 'Controller input', category: 'robot' },

  // Trajectory
  { id: 'trajectory', label: 'Trajectory', icon: '📈', description: 'Playback, waypoints', category: 'trajectory' },

  // Vision
  { id: 'vision', label: 'Point Cloud', icon: '👁️', description: 'Point cloud, cameras', category: 'vision' },
  { id: 'vision-stream', label: 'Streaming', icon: '📹', description: 'Real-time streams', category: 'vision' },

  // Advanced
  { id: 'collision', label: 'Collision', icon: '🛡️', description: 'Safety zones', category: 'advanced' },
  { id: 'events', label: 'Events', icon: '📡', description: 'Event system', category: 'advanced' },
  { id: 'performance', label: 'Performance', icon: '📊', description: 'Metrics, LOD', category: 'advanced' },

  // UI Components
  { id: 'timeline', label: 'Timeline', icon: '📊', description: 'Collision timeline', category: 'ui' },
  { id: 'property-editor', label: 'Property Editor', icon: '⚙️', description: 'Schema-driven forms', category: 'ui' },

  // Integration
  { id: 'multi-instance', label: 'Multi-Instance', icon: '📦', description: 'Instance isolation', category: 'integration' },
  { id: 'headless', label: 'Headless', icon: '🎭', description: 'State without render', category: 'integration' },
  { id: 'remote', label: 'Remote', icon: '🌐', description: 'Python SDK', category: 'integration' },
];

// Group modules by category
function groupByCategory(modules: ModuleInfo[]): Record<DemoCategory, ModuleInfo[]> {
  const result = {} as Record<DemoCategory, ModuleInfo[]>;
  for (const mod of modules) {
    if (!result[mod.category]) {
      result[mod.category] = [];
    }
    result[mod.category].push(mod);
  }
  return result;
}

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const featuredModules = MODULES.filter((m) => m.isFeatured);
  const groupedModules = groupByCategory(MODULES.filter((m) => !m.isFeatured));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          RoboViz
        </h2>
      </div>

      <nav className="sidebar-nav">
        {/* Featured - Process Scenes */}
        <div className="sidebar-section">
          <div className="sidebar-section-title" style={{
            color: '#ff6600',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '8px 16px 4px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            🏭 Process Scenes
          </div>
          {featuredModules.map((module) => (
            <button
              key={module.id}
              className={`sidebar-item ${activeModule === module.id ? 'active' : ''}`}
              onClick={() => onModuleChange(module.id)}
              style={{
                borderLeft: activeModule === module.id ? `3px solid ${CATEGORY_INFO[module.category].color}` : '3px solid transparent',
              }}
            >
              <span className="sidebar-item-icon">{module.icon}</span>
              <div className="sidebar-item-content">
                <span className="sidebar-item-label">{module.label}</span>
                <span className="sidebar-item-desc">{module.description}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Other categories */}
        {(Object.keys(CATEGORY_INFO) as DemoCategory[])
          .filter(cat => cat !== 'scenes' && groupedModules[cat]?.length > 0)
          .map((category) => (
            <div key={category} className="sidebar-section">
              <div className="sidebar-section-title" style={{
                color: CATEGORY_INFO[category].color,
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '12px 16px 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.8,
              }}>
                {CATEGORY_INFO[category].icon} {CATEGORY_INFO[category].label}
              </div>
              {groupedModules[category]?.map((module) => (
                <button
                  key={module.id}
                  className={`sidebar-item ${activeModule === module.id ? 'active' : ''}`}
                  onClick={() => onModuleChange(module.id)}
                  style={{
                    borderLeft: activeModule === module.id ? `3px solid ${CATEGORY_INFO[category].color}` : '3px solid transparent',
                    padding: '8px 16px',
                  }}
                >
                  <span className="sidebar-item-icon" style={{ fontSize: '14px' }}>{module.icon}</span>
                  <div className="sidebar-item-content">
                    <span className="sidebar-item-label" style={{ fontSize: '12px' }}>{module.label}</span>
                    <span className="sidebar-item-desc" style={{ fontSize: '10px' }}>{module.description}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-info">
          <span className="info-label">@aspect/roboviz</span>
          <span className="info-value">v0.3.0</span>
        </div>
      </div>
    </aside>
  );
}
