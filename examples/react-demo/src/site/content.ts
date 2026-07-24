/**
 * Single source of truth for all marketing copy + numbers on the trajx site.
 *
 * CREDIBILITY IS THE PRODUCT. Every number here is backed by a cited source in
 * the trajx repo. Do NOT add unverified claims. Specifically BANNED (the project
 * removed these as fabricated — trajx/CHANGELOG.md:39,52):
 *   42x, 4600x, 4000+ configs/s.
 * Also do NOT claim: trajx is 1.0/stable, roboviz is on public npm, or the web
 * demo contains welding / multi-robot / vision streaming.
 */

export const SITE = {
  name: 'trajx',
  tagline: 'GPU-accelerated robot kinematics & planning — in the browser.',
  subTagline: 'No CUDA. No ROS. No install. A Rust + WebGPU engine that runs anywhere wgpu runs — Metal, Vulkan, DX12, and the browser.',
  demoBy: 'Interactive demos powered by RoboViz',
  npm: '@yuanweima/trajx-wasm',
  npmInstall: 'npm install @yuanweima/trajx-wasm',
  githubTrajx: 'https://github.com/yuanweima/trajx',
  githubRoboviz: 'https://github.com/yuanweima/roboviz',
  // Honesty note surfaced in the footer.
  status: 'trajx is pre-release (0.9.0). trajx-wasm is published to npm; RoboViz is a pre-release visualization frontend.',
};

/** The one-line thesis vs. the incumbents. */
export const THESIS =
  'cuRobo gives you GPU — but locks you into NVIDIA + Python. Pinocchio and MoveIt are strong but can’t run on the web. trajx is the only engine that brings GPU-class kinematics to the browser.';

/** Headline benchmark — the strongest, fully-sourced web number. */
export const HERO_BENCHMARK = {
  value: '20,000',
  unit: '6-axis IK solves',
  time: '81.7 ms',
  speedup: '19.6× faster than single-thread JS',
  note: 'WebGPU, Chrome on Apple M4',
  source: 'trajx/CHANGELOG.md:31',
};

/** Supporting benchmark cards. All from trajx CHANGELOG.md / README.md. */
export const BENCHMARKS: Array<{
  label: string;
  value: string;
  detail: string;
  source: string;
}> = [
  {
    label: 'Browser batch IK (WebGPU)',
    value: '20k IK / 81.7 ms',
    detail: '≈245k problems/sec · 19.6× vs JS · Chrome/M4',
    source: 'CHANGELOG.md:31',
  },
  {
    label: 'GPU batch IK (native)',
    value: '100k / 32.3 ms',
    detail: 'vs 46.8 ms rayon · 173 ms single-core',
    source: 'CHANGELOG.md:26',
  },
  {
    label: 'GPU FK→SDF collision',
    value: '100k / 35 ms',
    detail: '≈2.85M configs/sec · 7.4× vs rayon',
    source: 'CHANGELOG.md:28',
  },
  {
    label: 'Core FK / IK latency',
    value: 'FK 1.7–2.6 µs',
    detail: 'seeded IK 21 µs · Ruckig 6-DOF 1 µs',
    source: 'README.md:826',
  },
];

/** Feature grid — strengths first, table-stakes after. All API-backed. */
export const FEATURES: Array<{ icon: string; title: string; body: string; tag?: string }> = [
  {
    icon: '⚡',
    title: 'GPU batch kinematics',
    body: 'Solve thousands of FK/IK per frame on WebGPU. Float32, zero-copy into an InstancedMesh.',
    tag: 'WebGPU',
  },
  {
    icon: '🛡️',
    title: 'WebGPU collision',
    body: 'GPU-resident FK→SDF batch collision, sphere-sphere and capsule approximation.',
    tag: 'experimental',
  },
  {
    icon: '🧭',
    title: 'Sampling planners',
    body: 'BiRRT, RRT*, PRM and Task-Space RRT with pluggable collision — plus a GPU Lazy-PRM mode.',
  },
  {
    icon: '🪢',
    title: 'Cable-aware planning',
    body: 'Track and constrain cable twist, with Light / Standard / Precision / HeavyDuty presets.',
  },
  {
    icon: '🎯',
    title: 'Analytical IK, all solutions',
    body: 'Closed-form IK for 6-DOF spherical-wrist arms — up to 8 solutions, ranked and FK-verified.',
  },
  {
    icon: '📐',
    title: 'Jacobian & manipulability',
    body: 'Jacobian, manipulability, singularity detection and workspace analysis, per configuration.',
  },
  {
    icon: '📈',
    title: 'Time-optimal trajectories',
    body: 'Ruckig jerk-limited S-curves with velocity / acceleration / jerk limits.',
  },
  {
    icon: '📦',
    title: 'One WASM package, no backend',
    body: 'The whole engine ships as a single npm package. No CUDA, no ROS, no server.',
  },
];

/** Comparison table. Differentiation only — never claim we beat cuRobo on perf. */
export const COMPARISON = {
  columns: ['trajx', 'cuRobo', 'Pinocchio', 'MoveIt', 'Foxglove'],
  rows: [
    { label: 'GPU acceleration', cells: ['WebGPU / wgpu', 'CUDA only', 'CPU', 'CPU', '—'] },
    { label: 'Runs in the browser', cells: ['yes', 'no', 'no', 'no', 'viewer only'] },
    { label: 'Dependencies', cells: ['1 wasm pkg', 'CUDA + Python', 'C++ / Python', 'full ROS', 'ROS / data'] },
    { label: 'Analytical multi-solution IK', cells: ['up to 8', 'numerical', 'yes', 'plugin', '—'] },
    { label: 'Motion planning', cells: ['RRT*/BiRRT/PRM/TS-RRT', 'GPU', 'no', 'OMPL', 'no'] },
    { label: 'Cable-aware planning', cells: ['yes', 'no', 'no', 'no', 'no'] },
  ],
  // Index of the column to highlight (trajx).
  highlight: 0,
};

/** 13 robots actually in the DH database (trajx-core/src/robot/dh_database.rs). */
export const ROBOTS: string[] = [
  'Fanuc LR Mate 200iD/7L',
  'Fanuc LR Mate 200iD',
  'Fanuc M-20iB/25',
  'Fanuc M-20iD/25',
  'Universal Robots UR5',
  'Universal Robots UR10',
  'JAKA Zu7',
  'JAKA S12',
  'JAKA A12L',
  'Agilebot GBT-C12A',
  'Agilebot GBT-C5A-850',
  'Agilebot GBT P7A-700',
  'Agilebot GBT P7A-900',
];

export const USE_CASES: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: '🕹️',
    title: 'Browser teleoperation & web teach',
    body: 'Drag the end-effector, solve IK in real time, preview reachability with a ghost arm.',
  },
  {
    icon: '🌐',
    title: 'Digital twins & cloud viz',
    body: 'Drive an InstancedMesh of hundreds of arms with batch FK, all client-side.',
  },
  {
    icon: '🔀',
    title: 'Cross-platform robotics',
    body: 'One Rust core compiles to native (Metal/Vulkan/DX12) and the browser (WebGPU). No CUDA lock-in.',
  },
  {
    icon: '☁️',
    title: 'Zero-install toolchains',
    body: 'IK, collision and planning run in client WASM — no ROS, no backend GPU cluster.',
  },
];

/** Real, runnable code snippets (APIs from trajx_wasm.d.ts). */
export const SNIPPETS = {
  install: 'npm install @yuanweima/trajx-wasm',
  fkIk: `import init, { createRobot } from '@yuanweima/trajx-wasm';

await init();
const robot = createRobot(urdfString);

// Forward kinematics
const pose = robot.forwardKinematics(new Float64Array([0,0,0,0,0,0]));

// Analytical IK — all solutions at once (up to 8 for spherical-wrist arms)
const ik = robot.inverseKinematicsAll(pose);
if (ik.success) {
  console.log(\`\${ik.solutionCount} solutions, analytical: \${ik.isAnalytical}\`);
}`,
  batch: `import { batchForwardKinematicsF32 } from '@yuanweima/trajx-wasm';

// Thousands of robots' FK in one call — Float32, zero-copy into Three.js
const transforms = batchForwardKinematicsF32(
  dhParams, jointAnglesFlat, robotCount, jointCount,
);`,
};

/** Demo pages, in order (for nav + prev/next). */
export const DEMOS: Array<{ slug: string; title: string; blurb: string }> = [
  { slug: 'batch-ik', title: 'Batch IK Swarm', blurb: 'Hundreds of inverse-kinematics problems solved at once on the GPU (WebGPU), live in the browser.' },
  { slug: 'batch-fk', title: 'Batch FK Swarm', blurb: 'Thousands of robots’ forward kinematics, computed per frame in the browser.' },
  { slug: 'ik', title: 'Interactive IK', blurb: 'Drag a target; trajx solves analytical IK in real time with live reachability.' },
  { slug: 'planning', title: 'Motion Planning', blurb: 'RRT* / BiRRT / PRM compared and timed against obstacles.' },
];
