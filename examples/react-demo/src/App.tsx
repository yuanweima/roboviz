import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Leva } from 'leva';
import { InteractionProvider } from '@aspect/roboviz-core';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';

// Process Scenes - Featured demos
import { WeldingScene } from './modules/scenes/WeldingScene';
import { GrindingScene } from './modules/scenes/GrindingScene';
import { InspectionScene } from './modules/scenes/InspectionScene';
import { CableManagementScene } from './modules/scenes/CableManagementScene';
import { CollisionAnalysisScene } from './modules/scenes/CollisionAnalysisScene';
import RenderingShowcaseScene from './modules/scenes/RenderingShowcaseScene';
import { MotionPlanningScene } from './modules/scenes/MotionPlanningScene';
import { GPUMotionPlanningScene } from './modules/scenes/GPUMotionPlanningScene';
import { IKDemoScene } from './modules/scenes/IKDemoScene';

// Core Features
import { RobotModule } from './modules/RobotModule';
import { WorkpointModule } from './modules/WorkpointModule';
import { ImperativeModule } from './modules/ImperativeModule';

// Robot Control
import { MultiRobotModule } from './modules/MultiRobotModule';
import { GhostRobotModule } from './modules/GhostRobotModule';
import { TrajxWasmModule } from './modules/TrajxWasmModule';
import { GamepadControlModule } from './modules/GamepadControlModule';

// Trajectory
import { TrajectoryModule } from './modules/TrajectoryModule';

// Vision
import { VisionModule } from './modules/VisionModule';
import { VisionStreamModule } from './modules/VisionStreamModule';

// Advanced
import { CollisionModule } from './modules/CollisionModule';
import { EventSystemModule } from './modules/EventSystemModule';
import { PerformanceModule } from './modules/PerformanceModule';

// UI Components
import { TimelineModule } from './modules/TimelineModule';
import { PropertyEditorModule } from './modules/PropertyEditorModule';

// Integration
import { MultiInstanceModule } from './modules/MultiInstanceModule';
import { HeadlessModule } from './modules/HeadlessModule';
import { RemoteControlModule } from './modules/RemoteControlModule';

export type ModuleType =
  // Process Scenes
  | 'welding'
  | 'grinding'
  | 'inspection'
  | 'cable-management'
  | 'collision-analysis'
  | 'rendering-showcase'
  | 'motion-planning'
  | 'gpu-motion-planning'
  | 'ik-demo'
  // Core Features
  | 'robot'
  | 'workpoint'
  | 'imperative'
  // Robot Control
  | 'multi-robot'
  | 'ghost-robot'
  | 'trajx-wasm'
  | 'gamepad-control'
  // Trajectory
  | 'trajectory'
  // Vision
  | 'vision'
  | 'vision-stream'
  // Advanced
  | 'collision'
  | 'events'
  | 'performance'
  // UI Components
  | 'timeline'
  | 'property-editor'
  // Integration
  | 'multi-instance'
  | 'headless'
  | 'remote';

const MODULE_COMPONENTS: Record<ModuleType, React.ComponentType> = {
  // Process Scenes
  'welding': WeldingScene,
  'grinding': GrindingScene,
  'inspection': InspectionScene,
  'cable-management': CableManagementScene,
  'collision-analysis': CollisionAnalysisScene,
  'rendering-showcase': RenderingShowcaseScene,
  'motion-planning': MotionPlanningScene,
  'gpu-motion-planning': GPUMotionPlanningScene,
  'ik-demo': IKDemoScene,
  // Core Features
  'robot': RobotModule,
  'workpoint': WorkpointModule,
  'imperative': ImperativeModule,
  // Robot Control
  'multi-robot': MultiRobotModule,
  'ghost-robot': GhostRobotModule,
  'trajx-wasm': TrajxWasmModule,
  'gamepad-control': GamepadControlModule,
  // Trajectory
  'trajectory': TrajectoryModule,
  // Vision
  'vision': VisionModule,
  'vision-stream': VisionStreamModule,
  // Advanced
  'collision': CollisionModule,
  'events': EventSystemModule,
  'performance': PerformanceModule,
  // UI Components
  'timeline': TimelineModule,
  'property-editor': PropertyEditorModule,
  // Integration
  'multi-instance': MultiInstanceModule,
  'headless': HeadlessModule,
  'remote': RemoteControlModule,
};

// Process scenes that don't use Leva
const PROCESS_SCENES: ModuleType[] = ['welding', 'grinding', 'inspection', 'cable-management', 'collision-analysis'];

export default function App() {
  // TEST: Start with inspection scene to verify first load works
  const [activeModule, setActiveModule] = useState<ModuleType>('inspection');
  // Transitioning state to add delay between unmount and mount
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingModuleRef = useRef<ModuleType | null>(null);

  const ActiveModuleComponent = MODULE_COMPONENTS[activeModule];

  // Hide Leva for process scenes (they use native UI controls)
  const hideLeva = PROCESS_SCENES.includes(activeModule);

  // Handle module change with delay for proper cleanup
  const handleModuleChange = useCallback((newModule: ModuleType) => {
    if (newModule === activeModule) return;

    // Start transition - unmount current scene
    setIsTransitioning(true);
    pendingModuleRef.current = newModule;
  }, [activeModule]);

  // Complete transition after delay
  useEffect(() => {
    if (isTransitioning && pendingModuleRef.current) {
      // Wait a frame for cleanup to complete, then mount new scene
      const timeoutId = setTimeout(() => {
        setActiveModule(pendingModuleRef.current!);
        pendingModuleRef.current = null;
        setIsTransitioning(false);
      }, 50); // 50ms delay for WebGL cleanup

      return () => clearTimeout(timeoutId);
    }
  }, [isTransitioning]);

  return (
    <InteractionProvider>
      <div className="app">
        {/* Leva controls - hidden for process scenes */}
        <Leva collapsed hidden={hideLeva} />

        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0 }}>RoboViz Demo</h1>
            <span className="version">v0.3.0</span>
          </div>
        </header>

        <div className="main-layout">
          <Sidebar
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
          />

          <main className="main-content">
            {/* Key ensures full unmount/remount on module switch to prevent WebGL resource leaks */}
            {/* During transition, render nothing to allow cleanup */}
            {!isTransitioning && <ActiveModuleComponent key={activeModule} />}
          </main>
        </div>

        <StatusBar />
      </div>
    </InteractionProvider>
  );
}
