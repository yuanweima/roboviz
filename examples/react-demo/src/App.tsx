import React, { useState } from 'react';
import { Leva } from 'leva';
import { Sidebar } from './components/Sidebar';
import { RobotModule } from './modules/RobotModule';
import { TrajectoryModule } from './modules/TrajectoryModule';
import { VisionModule } from './modules/VisionModule';
import { CollisionModule } from './modules/CollisionModule';
import { MultiRobotModule } from './modules/MultiRobotModule';
import { PerformanceModule } from './modules/PerformanceModule';
import { RemoteControlModule } from './modules/RemoteControlModule';
import { StatusBar } from './components/StatusBar';
import { useAppStore } from './store';

export type ModuleType = 'robot' | 'trajectory' | 'vision' | 'collision' | 'multi-robot' | 'performance' | 'remote';

const MODULE_COMPONENTS: Record<ModuleType, React.ComponentType> = {
  'robot': RobotModule,
  'trajectory': TrajectoryModule,
  'vision': VisionModule,
  'collision': CollisionModule,
  'multi-robot': MultiRobotModule,
  'performance': PerformanceModule,
  'remote': RemoteControlModule,
};

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('robot');
  const ActiveModuleComponent = MODULE_COMPONENTS[activeModule];

  return (
    <div className="app">
      <Leva collapsed />

      <header className="header">
        <h1>RoboViz Test Suite</h1>
        <span className="version">v0.1.0</span>
      </header>

      <div className="main-layout">
        <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

        <main className="main-content">
          <ActiveModuleComponent />
        </main>
      </div>

      <StatusBar />
    </div>
  );
}
