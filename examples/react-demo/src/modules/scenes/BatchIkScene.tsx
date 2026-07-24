/**
 * Batch IK Swarm — trajx's flagship: solve hundreds of independent inverse
 * kinematics problems at once on the GPU (WebGPU), in the browser.
 *
 * Each cell of the grid holds a robot with its own floating target marker.
 * Every cycle we pick N fresh reachable target poses, hand the whole batch to
 * trajx's `BatchIkSolver.solveBest` (WebGPU, multi-seed damped least squares),
 * and every arm flows to the joint configuration the solver returned — so you
 * literally watch N arms reach N different goals simultaneously. The HUD shows
 * the real, on-your-machine throughput (solves / second) and convergence.
 *
 * Rendering reuses the batch-FK swarm approach: we run `batchForwardKinematics`
 * on the (interpolated) solved joints each frame to draw each robot as a
 * bending poly-line with a glowing end-effector. Everything stays in the robot
 * Z-up DH frame (Canvas up = [0,0,1]), same as BatchFkScene — no coordinate
 * conversion needed.
 *
 * WebGPU is required (Chrome / Edge 113+); the scene degrades to a notice if
 * `navigator.gpu` or the GPU adapter is unavailable.
 *
 * NOTE: 3D output must be confirmed in a browser (`pnpm dev`).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';

const ROBOT_NAME = 'Fanuc_LR_Mate_200iD_7L';
const SEEDS_PER_TARGET = 4;

let trajxCache: Promise<any> | null = null;
function loadTrajx(): Promise<any> {
  if (!trajxCache) {
    trajxCache = (async () => {
      const wasm: any = await import('@yuanweima/trajx-wasm');
      if (typeof wasm.default === 'function') await wasm.default();
      return wasm;
    })();
  }
  return trajxCache;
}

interface Metrics {
  count: number;
  solveMs: number;
  perSec: number;
  converged: number;
}

interface SwarmProps {
  count: number;
  onMetrics: (m: Metrics) => void;
  onFail: (msg: string) => void;
}

/** Grid of arms, each flowing to its batch-IK solution. */
function BatchIkSwarm({ count, onMetrics, onFail }: SwarmProps): React.JSX.Element {
  const linesRef = useRef<THREE.LineSegments>(null);
  const tipsRef = useRef<THREE.InstancedMesh>(null);
  const targetsRef = useRef<THREE.InstancedMesh>(null);
  const wasmRef = useRef<any>(null);
  const solverRef = useRef<any>(null);
  const dhRawRef = useRef<Array<{ a: number; alpha: number; d: number; theta: number }> | null>(null);
  const jointCountRef = useRef(6);

  // Latest batch-IK result the render interpolates toward.
  const solvedRef = useRef<Float64Array | null>(null); // N * J joint values
  const displayRef = useRef<Float64Array | null>(null); // interpolated joints
  const targetPosRef = useRef<Float32Array | null>(null); // N * 3 target positions (robot frame)

  const tmp = useMemo(() => new THREE.Matrix4(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const SEGS = 7; // up to 8 links → 7 segments
  const lineAttr = useMemo(
    () => new THREE.BufferAttribute(new Float32Array(count * SEGS * 2 * 3), 3),
    [count],
  );

  // Base positions on a grid (robot Z-up frame).
  const offsets = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 1.6;
    const half = ((cols - 1) * spacing) / 2;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (i % cols) * spacing - half;
      arr[i * 3 + 1] = Math.floor(i / cols) * spacing - half;
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, [count]);

  // Fresh DhParam[] each call — batchForwardKinematics consumes/frees them.
  const makeDh = (wasm: any) =>
    (dhRawRef.current || []).map((r) => new wasm.DhParam(r.a, r.alpha, r.d, r.theta));

  // Deterministic-ish PRNG seeded per cycle so successive batches differ.
  const makeRand = (seed: number) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  };

  // Setup: load engine, DH, and the WebGPU solver.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (typeof navigator === 'undefined' || !(navigator as any).gpu) {
        onFail('This demo needs WebGPU — open it in Chrome or Edge 113+.');
        return;
      }
      try {
        const wasm = await loadTrajx();
        if (!alive) return;
        wasmRef.current = wasm;
        if (!wasm.BatchIkSolver) {
          onFail('This build of trajx-wasm has no BatchIkSolver.');
          return;
        }
        const db = (loadTrajx as any)._db || ((loadTrajx as any)._db = wasm.WasmDhDatabase.withDefaults());
        const names: string[] = db.listRobots();
        const name = names.includes(ROBOT_NAME) ? ROBOT_NAME : names.find((n) => /fanuc/i.test(n)) || names[0];
        const dh = db.getDhParams(name);
        dhRawRef.current = dh.map((p: any) => ({ a: p.a, alpha: p.alpha, d: p.d, theta: p.theta }));
        jointCountRef.current = dh.length;

        const dhFlat = new Float64Array(dhRawRef.current!.flatMap((r) => [r.a, r.alpha, r.d, r.theta]));
        const solver = await wasm.BatchIkSolver.create(dhFlat, new Float64Array(0));
        if (!alive) { solver.free?.(); return; }
        solverRef.current = solver;
      } catch (e: any) {
        console.error('[BatchIK] setup failed:', e);
        onFail('Could not initialise the WebGPU IK solver on this device.');
      }
    })();
    return () => { alive = false; };
  }, [onFail]);

  // Solve loop: generate a fresh reachable batch, solve it on the GPU, publish
  // the solution + metrics, pause so arms visibly reach, then repeat.
  useEffect(() => {
    let alive = true;
    let cycle = 0;
    const run = async () => {
      const wasm = wasmRef.current;
      const solver = solverRef.current;
      const dhRaw = dhRawRef.current;
      if (!wasm || !solver || !dhRaw) {
        if (alive) setTimeout(run, 120);
        return;
      }
      const N = count;
      const J = jointCountRef.current;
      try {
        // Reachable targets = FK of random joint configs.
        const rand = makeRand(0x9e3779b9 ^ (cycle++ * 2654435761));
        const qTrue = new Float64Array(N * J);
        for (let i = 0; i < N; i++) {
          for (let j = 1; j < J; j++) qTrue[i * J + j] = (rand() * 2 - 1) * 1.4;
        }
        const fkOut: Float64Array = wasm.batchForwardKinematics(makeDh(wasm), qTrue, N, J);
        const links = fkOut.length / N / 16;
        const targets = new Float64Array(N * 7);
        const targetPos = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          const ee = i * links * 16 + (links - 1) * 16; // end-effector matrix
          tmp.fromArray(fkOut as unknown as number[], ee);
          tmpQuat.setFromRotationMatrix(tmp);
          const px = fkOut[ee + 12], py = fkOut[ee + 13], pz = fkOut[ee + 14];
          targets.set([px, py, pz, tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w], i * 7);
          targetPos[i * 3] = px; targetPos[i * 3 + 1] = py; targetPos[i * 3 + 2] = pz;
        }

        // Seeds: SEEDS_PER_TARGET random configs per target (target-major).
        const seeds = new Float64Array(N * SEEDS_PER_TARGET * J);
        for (let k = 0; k < seeds.length; k++) seeds[k] = (rand() * 2 - 1) * 2.5;

        const opts = wasm.BatchIkSolverOptions.default();
        const t0 = performance.now();
        // solveBest consumes (moves + frees) the options object — do NOT free it
        // again here, or Rust throws "null pointer passed to rust".
        const results: any[] = await solver.solveBest(targets, seeds, SEEDS_PER_TARGET, opts);
        const solveMs = performance.now() - t0;
        if (!alive) return;

        const solved = new Float64Array(N * J);
        let converged = 0;
        for (let i = 0; i < N; i++) {
          const r = results[i];
          if (r?.converged) converged++;
          const joints = r?.joints as ArrayLike<number> | undefined;
          if (joints) for (let j = 0; j < J; j++) solved[i * J + j] = joints[j] ?? 0;
        }
        solvedRef.current = solved;
        if (!displayRef.current || displayRef.current.length !== solved.length) {
          displayRef.current = new Float64Array(solved); // first batch snaps in
        }
        targetPosRef.current = targetPos;
        onMetrics({ count: N, solveMs, perSec: Math.round((N / solveMs) * 1000), converged });
      } catch (e: any) {
        console.error('[BatchIK] solve failed:', e);
        onFail('Batch IK solve failed on this device.');
        return;
      }
      if (alive) setTimeout(run, 1300); // let arms reach before the next batch
    };
    run();
    return () => { alive = false; };
  }, [count, onMetrics, onFail]);

  // Render: interpolate toward the solved joints and draw arms + targets.
  useFrame(() => {
    const lines = linesRef.current;
    const tips = tipsRef.current;
    const targetMarkers = targetsRef.current;
    const wasm = wasmRef.current;
    const dhRaw = dhRawRef.current;
    const solved = solvedRef.current;
    const display = displayRef.current;
    if (!lines || !tips || !targetMarkers || !wasm || !dhRaw || !solved || !display) return;

    const N = count;
    const J = jointCountRef.current;
    if (display.length !== N * J || solved.length !== N * J) return;

    // Ease displayed joints toward the latest solution.
    for (let k = 0; k < display.length; k++) display[k] += (solved[k] - display[k]) * 0.14;

    let out: Float64Array;
    try {
      out = wasm.batchForwardKinematics(makeDh(wasm), display, N, J);
    } catch {
      return;
    }
    const links = out.length / N / 16;
    const linePos = lineAttr.array as Float32Array;
    const targetPos = targetPosRef.current;

    for (let i = 0; i < N; i++) {
      const ox = offsets[i * 3], oy = offsets[i * 3 + 1], oz = offsets[i * 3 + 2];
      const robotBase = i * links * 16;
      for (let s = 0; s < SEGS; s++) {
        const li = Math.min(s, links - 1);
        const lj = Math.min(s + 1, links - 1);
        const a = robotBase + li * 16;
        const b = robotBase + lj * 16;
        const v = (i * SEGS + s) * 6;
        linePos[v] = out[a + 12] + ox;
        linePos[v + 1] = out[a + 13] + oy;
        linePos[v + 2] = out[a + 14] + oz;
        linePos[v + 3] = out[b + 12] + ox;
        linePos[v + 4] = out[b + 13] + oy;
        linePos[v + 5] = out[b + 14] + oz;
      }
      // solved end-effector tip
      const tip = robotBase + (links - 1) * 16;
      tmp.identity();
      tmp.setPosition(out[tip + 12] + ox, out[tip + 13] + oy, out[tip + 14] + oz);
      tips.setMatrixAt(i, tmp);
      // fixed target marker for this arm
      if (targetPos) {
        tmp.identity();
        tmp.setPosition(targetPos[i * 3] + ox, targetPos[i * 3 + 1] + oy, targetPos[i * 3 + 2] + oz);
        targetMarkers.setMatrixAt(i, tmp);
      }
    }
    lineAttr.needsUpdate = true;
    tips.instanceMatrix.needsUpdate = true;
    targetMarkers.instanceMatrix.needsUpdate = true;
  });

  return (
    <group key={count}>
      <lineSegments ref={linesRef} frustumCulled={false}>
        <bufferGeometry>
          <primitive attach="attributes-position" object={lineAttr} />
        </bufferGeometry>
        <lineBasicMaterial color="#5aa2ff" transparent opacity={0.55} />
      </lineSegments>
      {/* solved end-effectors */}
      <instancedMesh ref={tipsRef} args={[undefined as any, undefined as any, count]} frustumCulled={false}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#38e8c8" emissive="#1a8a76" emissiveIntensity={0.9} metalness={0.2} roughness={0.4} />
      </instancedMesh>
      {/* fixed IK target markers */}
      <instancedMesh ref={targetsRef} args={[undefined as any, undefined as any, count]} frustumCulled={false}>
        <octahedronGeometry args={[0.075, 0]} />
        <meshBasicMaterial color="#ffb454" transparent opacity={0.85} wireframe />
      </instancedMesh>
    </group>
  );
}

export function BatchIkScene(): React.JSX.Element {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [failMsg, setFailMsg] = useState<string | null>(null);

  const { robots } = useControls('Batch IK', {
    robots: { value: 512, min: 128, max: 2048, step: 128, label: 'IK problems' },
  });

  // Stable callbacks so the swarm's effects don't re-run every render.
  const onMetrics = React.useCallback((m: Metrics) => { setMetrics(m); setFailMsg(null); }, []);
  const onFail = React.useCallback((msg: string) => setFailMsg(msg), []);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Batch Inverse Kinematics — Hundreds of Solves at Once, on the GPU</h2>
        <p>Every arm reaches its own target; trajx solves the whole batch with <code>BatchIkSolver.solveBest</code> (WebGPU).</p>
      </div>

      <div className="canvas-wrapper" style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            background: 'rgba(12,13,24,0.82)', border: '1px solid #38e8c8',
            borderRadius: 12, padding: '14px 18px', color: '#eaeaf2',
            fontFamily: 'monospace', pointerEvents: 'none', maxWidth: 340,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            {(metrics?.count ?? robots).toLocaleString()} IK problems · WebGPU batch
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#38e8c8', lineHeight: 1.1, margin: '2px 0' }}>
            {metrics ? metrics.perSec.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>IK solves / sec (on your machine)</div>
          {metrics && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              {metrics.solveMs.toFixed(1)} ms · converged {metrics.converged.toLocaleString()}/{metrics.count.toLocaleString()}
            </div>
          )}
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 8, lineHeight: 1.5 }}>
            Amber markers are the target poses; each arm flows to the joint solution trajx returned for it.
          </div>
        </div>

        {failMsg && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 20, display: 'flex',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              color: '#eaeaf2', fontFamily: 'monospace', padding: 24,
              background: 'rgba(12,13,24,0.6)',
            }}
          >
            <div style={{ maxWidth: 360 }}>
              <div style={{ fontSize: 15, marginBottom: 8 }}>Batch IK needs WebGPU</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>{failMsg}</div>
            </div>
          </div>
        )}

        <Canvas
          frameloop="always"
          camera={{ position: [0, -16, 11], fov: 50, up: [0, 0, 1] }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#0c0d18']} />
          <fog attach="fog" args={['#0c0d18', 16, 48]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, -5, 10]} intensity={1.1} />
          <directionalLight position={[-8, 8, 6]} intensity={0.4} color="#38e8c8" />
          <Grid
            args={[48, 48]}
            cellSize={1}
            sectionSize={5}
            rotation={[Math.PI / 2, 0, 0]}
            infiniteGrid
            fadeDistance={48}
            cellColor="#1c2038"
            sectionColor="#2c3358"
          />
          <BatchIkSwarm count={robots} onMetrics={onMetrics} onFail={onFail} />
          <OrbitControls makeDefault target={[0, 0, 1.5]} />
        </Canvas>
      </div>
    </div>
  );
}
