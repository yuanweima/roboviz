import React from 'react';
import { DemoPageLayout } from './DemoPageLayout';
import { IKDemoScene } from '../modules/scenes/IKDemoScene';
import { MotionPlanningScene } from '../modules/scenes/MotionPlanningScene';
import { BatchFkScene } from '../modules/scenes/BatchFkScene';
import { BatchIkScene } from '../modules/scenes/BatchIkScene';

export function IkDemoPage(): React.JSX.Element {
  return (
    <DemoPageLayout
      slug="ik"
      what="For every target you drag, trajx runs the closed-form (analytical) inverse kinematics of the Fanuc LR Mate and returns a reachable joint configuration in microseconds — the green ghost arm you see is a live IK solution, with reachability status."
    >
      <IKDemoScene />
    </DemoPageLayout>
  );
}

export function PlanningDemoPage(): React.JSX.Element {
  return (
    <DemoPageLayout
      slug="planning"
      what="trajx plans a collision-free path from start to goal with several sampling planners (BiRRT, RRT*, PRM). Each runs against the same obstacles and is timed, so you can compare planning time and path length side by side."
    >
      <MotionPlanningScene />
    </DemoPageLayout>
  );
}

export function BatchIkDemoPage(): React.JSX.Element {
  return (
    <DemoPageLayout
      slug="batch-ik"
      what="Every arm has its own target pose (the amber markers). Instead of solving them one by one, trajx hands the whole batch to the GPU: BatchIkSolver.solveBest runs multi-seed damped-least-squares inverse kinematics for all of them at once via WebGPU, and each arm flows to the joint solution it got back. The counter shows the live throughput — inverse-kinematics solves per second, measured on your machine."
    >
      <BatchIkScene />
    </DemoPageLayout>
  );
}

export function BatchFkDemoPage(): React.JSX.Element {
  return (
    <DemoPageLayout
      slug="batch-fk"
      what="Each arm is a 6-axis robot. Every frame, trajx turns all their joint angles into every link's pose in a single WebAssembly call (batchForwardKinematics) — so the arms you see bending ARE the forward kinematics, and the glowing tips are the end-effectors. The counter shows live full-robot FK throughput."
    >
      <BatchFkScene />
    </DemoPageLayout>
  );
}
