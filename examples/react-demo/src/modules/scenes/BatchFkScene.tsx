/**
 * Batch FK Swarm — trajx computes the forward kinematics of hundreds of robots
 * per frame, in one WebAssembly call, and we draw each as a bending arm.
 *
 * Using batchForwardKinematics (every link's pose, not just the end-effector) we
 * render each robot as an articulated poly-line (base → joints → tool tip) plus a
 * glowing end-effector marker. As the joint angles ripple, the arms visibly
 * flex — so it reads unmistakably as forward kinematics, not floating boxes.
 *
 * DH comes from the engine's WasmDhDatabase (real Fanuc LR Mate).
 *
 * NOTE: 3D output must be confirmed in a browser (`pnpm dev`).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';

const ROBOT_NAME = 'Fanuc_LR_Mate_200iD_7L';

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

interface SwarmProps {
  count: number;
  speed: number;
  onRate: (fkPerSec: number) => void;
}

/** Articulated arms driven by batch FK every frame. */
function BatchFkSwarm({ count, speed, onRate }: SwarmProps): React.JSX.Element {
  const linesRef = useRef<THREE.LineSegments>(null);
  const tipsRef = useRef<THREE.InstancedMesh>(null);
  const wasmRef = useRef<any>(null);
  const dhRawRef = useRef<Array<{ a: number; alpha: number; d: number; theta: number }> | null>(null);
  const jointCountRef = useRef(7);
  const linksRef = useRef(8); // link transforms per robot (from the engine)
  const errLoggedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const tmp = useMemo(() => new THREE.Matrix4(), []);
  const flatRef = useRef<Float64Array>(new Float64Array(count * 7));
  // 8 links → 7 segments → 2 verts/segment → 3 floats/vert
  const SEGS = 7;
  const lineAttr = useMemo(
    () => new THREE.BufferAttribute(new Float32Array(count * SEGS * 2 * 3), 3),
    [count],
  );

  // Base positions on a grid (robot Z-up frame).
  const offsets = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 1.25;
    const half = ((cols - 1) * spacing) / 2;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (i % cols) * spacing - half;
      arr[i * 3 + 1] = Math.floor(i / cols) * spacing - half;
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, [count]);

  useEffect(() => {
    let alive = true;
    loadTrajx().then((wasm) => {
      if (!alive) return;
      try {
        wasmRef.current = wasm;
        const db = (loadTrajx as any)._db || ((loadTrajx as any)._db = wasm.WasmDhDatabase.withDefaults());
        const names: string[] = db.listRobots();
        const name = names.includes(ROBOT_NAME) ? ROBOT_NAME : names.find((n) => /fanuc/i.test(n)) || names[0];
        const dh = db.getDhParams(name);
        dhRawRef.current = dh.map((p: any) => ({ a: p.a, alpha: p.alpha, d: p.d, theta: p.theta }));
        jointCountRef.current = dh.length;
        setReady(true);
      } catch (e) {
        console.error('[BatchFK] DH setup failed:', e);
      }
    }).catch((e) => console.error('[BatchFK] loadTrajx failed:', e));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    flatRef.current = new Float64Array(count * jointCountRef.current);
  }, [count, ready]);

  const rateAccum = useRef({ t: 0, frames: 0 });

  useFrame((state, delta) => {
    const lines = linesRef.current;
    const tips = tipsRef.current;
    const wasm = wasmRef.current;
    const dhRaw = dhRawRef.current;
    if (!lines || !tips || !wasm || !dhRaw) return;

    const N = count;
    const J = jointCountRef.current;
    let flat = flatRef.current;
    if (flat.length !== N * J) flat = flatRef.current = new Float64Array(N * J);

    const t = state.clock.elapsedTime * speed;
    for (let r = 0; r < N; r++) {
      const phase = r * 0.15;
      const base = r * J;
      for (let j = 1; j < J; j++) flat[base + j] = Math.sin(t + phase + j * 0.6) * 0.6;
    }

    // Every link's pose for every robot, in one WASM call — this is the FK.
    let out: Float64Array;
    try {
      const dhParams = dhRaw.map((r2) => new wasm.DhParam(r2.a, r2.alpha, r2.d, r2.theta));
      out = wasm.batchForwardKinematics(dhParams, flat, N, J);
    } catch (e) {
      if (!errLoggedRef.current) { errLoggedRef.current = true; console.error('[BatchFK] batch FK failed:', e); }
      return;
    }

    const links = out.length / N / 16;
    linksRef.current = links;
    const linePos = lineAttr.array as Float32Array;

    for (let i = 0; i < N; i++) {
      const ox = offsets[i * 3], oy = offsets[i * 3 + 1], oz = offsets[i * 3 + 2];
      const robotBase = i * links * 16;
      // one segment per adjacent link pair
      for (let s = 0; s < SEGS; s++) {
        const a = robotBase + s * 16;
        const b = robotBase + (s + 1) * 16;
        const v = (i * SEGS + s) * 6;
        linePos[v] = out[a + 12] + ox;
        linePos[v + 1] = out[a + 13] + oy;
        linePos[v + 2] = out[a + 14] + oz;
        linePos[v + 3] = out[b + 12] + ox;
        linePos[v + 4] = out[b + 13] + oy;
        linePos[v + 5] = out[b + 14] + oz;
      }
      // end-effector tip = last link
      const tip = robotBase + (links - 1) * 16;
      tmp.identity();
      tmp.setPosition(out[tip + 12] + ox, out[tip + 13] + oy, out[tip + 14] + oz);
      tips.setMatrixAt(i, tmp);
    }
    lineAttr.needsUpdate = true;
    tips.instanceMatrix.needsUpdate = true;

    const acc = rateAccum.current;
    acc.t += Math.min(delta, 0.1);
    acc.frames += 1;
    if (acc.t >= 0.3) {
      onRate(Math.round((N * acc.frames) / acc.t));
      acc.t = 0;
      acc.frames = 0;
    }
  });

  return (
    <group key={count}>
      <lineSegments ref={linesRef} frustumCulled={false}>
        <bufferGeometry>
          <primitive attach="attributes-position" object={lineAttr} />
        </bufferGeometry>
        <lineBasicMaterial color="#5aa2ff" transparent opacity={0.6} />
      </lineSegments>
      <instancedMesh ref={tipsRef} args={[undefined as any, undefined as any, count]} frustumCulled={false}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#38e8c8" emissive="#1a8a76" emissiveIntensity={0.9} metalness={0.2} roughness={0.4} />
      </instancedMesh>
    </group>
  );
}

export function BatchFkScene(): React.JSX.Element {
  const [fkPerSec, setFkPerSec] = useState(0);

  const { robots, speed } = useControls('Batch FK', {
    robots: { value: 700, min: 100, max: 2500, step: 100, label: 'Robots' },
    speed: { value: 1.0, min: 0.1, max: 3, step: 0.1, label: 'Motion Speed' },
  });

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Batch Forward Kinematics — In-Browser Throughput</h2>
        <p>Every arm is a 6-axis robot; trajx computes all their link poses per frame via <code>batchForwardKinematics</code>.</p>
      </div>

      <div className="canvas-wrapper" style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            background: 'rgba(12,13,24,0.82)', border: '1px solid #38e8c8',
            borderRadius: 12, padding: '14px 18px', color: '#eaeaf2',
            fontFamily: 'monospace', pointerEvents: 'none', maxWidth: 320,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.7 }}>{robots.toLocaleString()} robots · forward kinematics</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#38e8c8', lineHeight: 1.1, margin: '2px 0' }}>
            {fkPerSec.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>full-robot FK / sec</div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 8, lineHeight: 1.5 }}>
            Each frame, trajx turns every robot’s joint angles into all 8 link poses (base → tool). The tips are the end-effectors.
          </div>
        </div>

        <Canvas
          frameloop="always"
          camera={{ position: [0, -13, 9], fov: 50, up: [0, 0, 1] }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#0c0d18']} />
          <fog attach="fog" args={['#0c0d18', 14, 40]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, -5, 10]} intensity={1.1} />
          <directionalLight position={[-8, 8, 6]} intensity={0.4} color="#38e8c8" />
          <Grid
            args={[40, 40]}
            cellSize={1}
            sectionSize={5}
            rotation={[Math.PI / 2, 0, 0]}
            infiniteGrid
            fadeDistance={40}
            cellColor="#1c2038"
            sectionColor="#2c3358"
          />
          <BatchFkSwarm count={robots} speed={speed} onRate={setFkPerSec} />
          <OrbitControls makeDefault target={[0, 0, 1.5]} />
        </Canvas>
      </div>
    </div>
  );
}
