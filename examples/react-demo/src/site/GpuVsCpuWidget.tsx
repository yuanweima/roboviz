import React, { useEffect, useState } from 'react';

/**
 * "Run GPU compute in YOUR browser" widget — a live, honest demonstration that
 * trajx's WebGPU collision runs client-side, and how fast it is on the visitor's
 * own machine.
 *
 * We intentionally do NOT show a CPU-vs-GPU speedup here: benchmarkGpuVsCpu()'s
 * CPU baseline is a naive loop whose timer reads ~0 in the wasm build, which
 * would make the GPU look infinitely slower — misleading. The headline speedup
 * stays the cited 19.6x from CHANGELOG.md. Here we only surface the real GPU
 * time + throughput.
 */
type Phase = 'idle' | 'checking' | 'unavailable' | 'running' | 'done' | 'error';

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

const PAIRS = 200000;

export function GpuVsCpuWidget(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('idle');
  const [gpuMs, setGpuMs] = useState<number | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setPhase('checking');
    loadTrajx()
      .then(async (wasm) => {
        const ok = typeof wasm.isWebGpuAvailable === 'function' ? await wasm.isWebGpuAvailable() : false;
        if (alive) setPhase(ok ? 'idle' : 'unavailable');
      })
      .catch(() => { if (alive) setPhase('unavailable'); });
    return () => { alive = false; };
  }, []);

  const run = async () => {
    setPhase('running');
    setErr('');
    try {
      const wasm = await loadTrajx();
      const cmp: any = await wasm.benchmarkGpuVsCpu(PAIRS);
      setGpuMs(cmp.gpuTimeMs);
      setPhase('done');
      cmp.free?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const throughput = gpuMs && gpuMs > 0 ? Math.round(PAIRS / (gpuMs / 1000)) : null;

  return (
    <div className="gpu-widget">
      <div className="gpu-widget-head">
        <div>
          <div className="t">Run GPU compute in your browser</div>
          <div className="s">{PAIRS.toLocaleString()} collision pairs on WebGPU — client-side, no backend. This is the compute that runs nowhere else in a browser.</div>
        </div>
        {phase !== 'unavailable' && (
          <button className="btn btn-primary" onClick={run} disabled={phase === 'running' || phase === 'checking'}>
            {phase === 'running' ? 'Running…' : phase === 'checking' ? 'Checking…' : phase === 'done' ? 'Run again' : 'Run on your GPU'}
          </button>
        )}
      </div>

      {phase === 'unavailable' && (
        <div className="gpu-note">WebGPU isn’t available in this browser — try Chrome/Edge on desktop to run it live. (The 19.6× above is from a WebGPU-capable run.)</div>
      )}
      {phase === 'error' && <div className="gpu-note err">Benchmark failed: {err}</div>}

      {phase === 'done' && gpuMs != null && (
        <div className="gpu-result">
          <div className="col"><span className="k">{PAIRS.toLocaleString()} pairs</span><span className="v">{gpuMs.toFixed(1)} ms</span></div>
          <div className="arrow">→</div>
          {throughput && (
            <div className="col big"><span className="v">{throughput.toLocaleString()}</span><span className="k">pairs / sec, on your GPU</span></div>
          )}
        </div>
      )}
    </div>
  );
}
