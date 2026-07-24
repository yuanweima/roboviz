import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { InteractionProvider } from '@yuanweima/roboviz-core';
import { Landing } from './site/Landing';
import { IkDemoPage, PlanningDemoPage, BatchFkDemoPage, BatchIkDemoPage, GpuPlanningDemoPage } from './site/DemoPages';

export default function App() {
  return (
    <InteractionProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo/ik" element={<IkDemoPage />} />
        <Route path="/demo/planning" element={<PlanningDemoPage />} />
        <Route path="/demo/gpu-planning" element={<GpuPlanningDemoPage />} />
        <Route path="/demo/batch-ik" element={<BatchIkDemoPage />} />
        <Route path="/demo/batch-fk" element={<BatchFkDemoPage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </InteractionProvider>
  );
}
