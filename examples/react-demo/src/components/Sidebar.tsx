import React from 'react';
import type { ModuleType } from '../App';

interface SidebarProps {
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}

const MODULES: { id: ModuleType; label: string; icon: string; description: string; isNew?: boolean }[] = [
  // New API Demos (highlighted)
  { id: 'imperative', label: 'Imperative API', icon: '🔧', description: 'createRoboViz factory', isNew: true },
  { id: 'multi-instance', label: 'Multi-Instance', icon: '📦', description: 'Instance isolation', isNew: true },
  { id: 'events', label: 'Event System', icon: '📡', description: 'Event hooks & bus', isNew: true },
  { id: 'headless', label: 'Headless Mode', icon: '🎭', description: 'State without render', isNew: true },
  { id: 'workpoint', label: 'Workpoint System', icon: '📍', description: 'Surface work points', isNew: true },
  // Original modules
  { id: 'robot', label: 'Robot Control', icon: '🤖', description: 'URDF loading, joint control' },
  { id: 'trajectory', label: 'Trajectory', icon: '📈', description: 'Playback, waypoints' },
  { id: 'vision', label: 'Vision', icon: '👁️', description: 'Point cloud, cameras' },
  { id: 'collision', label: 'Collision', icon: '⚡', description: 'Safety zones, detection' },
  { id: 'multi-robot', label: 'Multi-Robot', icon: '👥', description: 'Coordination, frames' },
  { id: 'performance', label: 'Performance', icon: '📊', description: 'Metrics, diagnostics' },
  { id: 'remote', label: 'Remote Control', icon: '🌐', description: 'Python SDK, WebSocket' },
];

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const newModules = MODULES.filter((m) => m.isNew);
  const originalModules = MODULES.filter((m) => !m.isNew);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Modules</h2>
      </div>

      <nav className="sidebar-nav">
        {/* New API Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title" style={{
            color: '#4ecdc4',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '8px 16px 4px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            ✨ New API Features
          </div>
          {newModules.map((module) => (
            <button
              key={module.id}
              className={`sidebar-item ${activeModule === module.id ? 'active' : ''}`}
              onClick={() => onModuleChange(module.id)}
              style={{
                borderLeft: activeModule === module.id ? '3px solid #4ecdc4' : '3px solid transparent',
              }}
            >
              <span className="sidebar-item-icon">{module.icon}</span>
              <div className="sidebar-item-content">
                <span className="sidebar-item-label">{module.label}</span>
                <span className="sidebar-item-desc">{module.description}</span>
              </div>
              {module.isNew && (
                <span style={{
                  fontSize: '9px',
                  background: '#4ecdc4',
                  color: '#1a1a2e',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                }}>
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: '#333',
          margin: '12px 16px',
        }} />

        {/* Original Modules */}
        <div className="sidebar-section">
          <div className="sidebar-section-title" style={{
            color: '#666',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '8px 16px 4px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Core Features
          </div>
          {originalModules.map((module) => (
            <button
              key={module.id}
              className={`sidebar-item ${activeModule === module.id ? 'active' : ''}`}
              onClick={() => onModuleChange(module.id)}
            >
              <span className="sidebar-item-icon">{module.icon}</span>
              <div className="sidebar-item-content">
                <span className="sidebar-item-label">{module.label}</span>
                <span className="sidebar-item-desc">{module.description}</span>
              </div>
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-info">
          <span className="info-label">@aspect/roboviz-react</span>
          <span className="info-value">v0.2.0</span>
        </div>
        <div className="sidebar-info" style={{ marginTop: '4px' }}>
          <span className="info-label">Test Fixtures</span>
          <span className="info-value">/fixtures</span>
        </div>
      </div>
    </aside>
  );
}
