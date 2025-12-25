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
// New modules showcasing refactored API
import { ImperativeModule } from './modules/ImperativeModule';
import { MultiInstanceModule } from './modules/MultiInstanceModule';
import { EventSystemModule } from './modules/EventSystemModule';
import { HeadlessModule } from './modules/HeadlessModule';
import { WorkpointModule } from './modules/WorkpointModule';
import { VisionStreamModule } from './modules/VisionStreamModule';
import { GhostRobotModule } from './modules/GhostRobotModule';
import { TrajxWasmModule } from './modules/TrajxWasmModule';
import { ProcessWorkflowModule } from './modules/ProcessWorkflowModule';
import { StatusBar } from './components/StatusBar';
import { useAppStore } from './store';

export type ModuleType =
  | 'robot'
  | 'trajectory'
  | 'vision'
  | 'collision'
  | 'multi-robot'
  | 'performance'
  | 'remote'
  // New module types
  | 'imperative'
  | 'multi-instance'
  | 'events'
  | 'headless'
  | 'workpoint'
  | 'vision-stream'
  | 'ghost-robot'
  | 'trajx-wasm'
  | 'process-workflow';

const MODULE_COMPONENTS: Record<ModuleType, React.ComponentType> = {
  'robot': RobotModule,
  'trajectory': TrajectoryModule,
  'vision': VisionModule,
  'collision': CollisionModule,
  'multi-robot': MultiRobotModule,
  'performance': PerformanceModule,
  'remote': RemoteControlModule,
  // New modules
  'imperative': ImperativeModule,
  'multi-instance': MultiInstanceModule,
  'events': EventSystemModule,
  'headless': HeadlessModule,
  'workpoint': WorkpointModule,
  'vision-stream': VisionStreamModule,
  'ghost-robot': GhostRobotModule,
  'trajx-wasm': TrajxWasmModule,
  'process-workflow': ProcessWorkflowModule,
};

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('imperative');
  const ActiveModuleComponent = MODULE_COMPONENTS[activeModule];

  return (
    <div className="app">
      <Leva collapsed />

      <header className="header">
        <h1>RoboViz Test Suite</h1>
        <span className="version">v0.2.0</span>
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
