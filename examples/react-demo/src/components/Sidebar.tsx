import React from 'react';
import type { ModuleType } from '../App';

interface SidebarProps {
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}

const MODULES: { id: ModuleType; label: string; icon: string; description: string }[] = [
  { id: 'robot', label: 'Robot Control', icon: '🤖', description: 'URDF loading, joint control' },
  { id: 'trajectory', label: 'Trajectory', icon: '📈', description: 'Playback, waypoints' },
  { id: 'vision', label: 'Vision', icon: '👁️', description: 'Point cloud, cameras' },
  { id: 'collision', label: 'Collision', icon: '⚡', description: 'Safety zones, detection' },
  { id: 'multi-robot', label: 'Multi-Robot', icon: '👥', description: 'Coordination, frames' },
  { id: 'performance', label: 'Performance', icon: '📊', description: 'Metrics, diagnostics' },
  { id: 'remote', label: 'Remote Control', icon: '🌐', description: 'Python SDK, WebSocket' },
];

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Modules</h2>
      </div>

      <nav className="sidebar-nav">
        {MODULES.map((module) => (
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
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-info">
          <span className="info-label">Test Fixtures</span>
          <span className="info-value">/fixtures</span>
        </div>
      </div>
    </aside>
  );
}
