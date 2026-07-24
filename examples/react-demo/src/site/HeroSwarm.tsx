/**
 * Hero background: a stripped-down Batch FK swarm (no controls, no HUD).
 *
 * Renders hundreds of end-effectors driven every frame by trajx's
 * batchForwardKinematicsEndEffector — the "GPU-class kinematics in the browser"
 * wow, as a living backdrop. Real Fanuc DH from the engine's WasmDhDatabase.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ROBOT_NAME = 'Fanuc_LR_Mate_200iD_7L';
const COUNT = 900;

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

function Swarm(): React.JSX.Element {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const wasmRef = useRef<any>(null);
  const dhRawRef = useRef<Array<{ a: number; alpha: number; d: number; theta: number }> | null>(null);
  const jRef = useRef(7);
  const errRef = useRef(false);
  const tmp = useMemo(() => new THREE.Matrix4(), []);
  const flatRef = useRef<Float32Array>(new Float32Array(COUNT * 7));

  const offsets = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(COUNT));
    const spacing = 1.15;
    const half = ((cols - 1) * spacing) / 2;
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (i % cols) * spacing - half;
      arr[i * 3 + 1] = Math.floor(i / cols) * spacing - half;
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, []);

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
        jRef.current = dh.length;
      } catch {
        /* engine unavailable — hero degrades to the empty scrim */
      }
    });
    return () => { alive = false; };
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    const wasm = wasmRef.current;
    const dhRaw = dhRawRef.current;
    if (!mesh || !wasm || !dhRaw) return;
    const J = jRef.current;
    let flat = flatRef.current;
    if (flat.length !== COUNT * J) flat = flatRef.current = new Float32Array(COUNT * J);
    const t = state.clock.elapsedTime * 0.7;
    for (let r = 0; r < COUNT; r++) {
      const phase = r * 0.12;
      const base = r * J;
      for (let j = 1; j < J; j++) flat[base + j] = Math.sin(t + phase + j * 0.6) * 0.55;
    }
    let out: Float32Array;
    try {
      const dhParams = dhRaw.map((r2) => new wasm.DhParam(r2.a, r2.alpha, r2.d, r2.theta));
      out = wasm.batchForwardKinematicsEndEffector(dhParams, flat, COUNT, J);
    } catch (e) {
      if (!errRef.current) { errRef.current = true; console.error('[HeroSwarm] batch FK failed:', e); }
      return;
    }
    for (let i = 0; i < COUNT; i++) {
      tmp.fromArray(out, i * 16);
      tmp.elements[12] += offsets[i * 3];
      tmp.elements[13] += offsets[i * 3 + 1];
      tmp.elements[14] += offsets[i * 3 + 2];
      mesh.setMatrixAt(i, tmp);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, COUNT]} frustumCulled={false}>
      <boxGeometry args={[0.13, 0.13, 0.13]} />
      <meshStandardMaterial color="#4a9eff" emissive="#1c5fb0" emissiveIntensity={0.55} metalness={0.35} roughness={0.4} />
    </instancedMesh>
  );
}

/** Slow auto-orbit so the swarm feels alive without user input. */
function AutoOrbit(): null {
  useFrame((state) => {
    const r = 20;
    const a = state.clock.elapsedTime * 0.06 + 0.6;
    state.camera.position.set(Math.sin(a) * r, -r * 0.85, 11);
    state.camera.up.set(0, 0, 1);
    state.camera.lookAt(0, 0, 2.5);
  });
  return null;
}

export function HeroSwarm(): React.JSX.Element {
  return (
    <Canvas
      frameloop="always"
      dpr={[1, 1.75]}
      camera={{ position: [0, -18, 11], fov: 48, up: [0, 0, 1] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0c0d18']} />
      <fog attach="fog" args={['#0c0d18', 18, 46]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, -6, 12]} intensity={1.0} />
      <directionalLight position={[-8, 8, 6]} intensity={0.35} color="#38e8c8" />
      <AutoOrbit />
      <Swarm />
    </Canvas>
  );
}
