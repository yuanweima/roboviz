import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteNav } from './SiteNav';
import { HeroSwarm } from './HeroSwarm';
import { CodeBlock } from './CodeBlock';
import { GpuVsCpuWidget } from './GpuVsCpuWidget';
import {
  SITE, THESIS, HERO_BENCHMARK, BENCHMARKS, FEATURES, COMPARISON,
  ROBOTS, USE_CASES, SNIPPETS, DEMOS,
} from './content';

function InstallCta() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(SITE.npmInstall).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button className="btn btn-ghost btn-mono" onClick={copy} title="Copy install command">
      {copied ? 'copied ✓' : SITE.npmInstall}
    </button>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function Landing(): React.JSX.Element {
  return (
    <div className="site">
      <SiteNav />

      {/* Hero */}
      <header className="hero">
        <div className="hero-canvas"><HeroSwarm /></div>
        <div className="hero-inner">
          <span className="hero-badge"><span className="dot" /> {HERO_BENCHMARK.value} IK solves · {HERO_BENCHMARK.time} · in your browser</span>
          <h1>GPU robot kinematics &amp; planning, <span className="accent">in the browser.</span></h1>
          <p className="sub">{SITE.subTagline}</p>
          <div className="cta-row">
            <Link className="btn btn-primary" to="/demo/batch-ik">Try the live demo →</Link>
            <InstallCta />
          </div>
          <div className="powered">{SITE.demoBy}</div>
        </div>
      </header>

      {/* Thesis */}
      <section className="thesis">
        <div className="section-sm">
          <p dangerouslySetInnerHTML={{ __html: THESIS.replace('trajx is the only engine', '<strong>trajx is the only engine</strong>') }} />
        </div>
      </section>

      {/* Benchmarks */}
      <section className="section" id="benchmarks">
        <Reveal>
          <div className="bench-hero">
            <div className="eyebrow">Measured, not marketing</div>
            <div className="big">{HERO_BENCHMARK.value} IK · {HERO_BENCHMARK.time}</div>
            <div className="cap">{HERO_BENCHMARK.unit} · {HERO_BENCHMARK.speedup} · {HERO_BENCHMARK.note}</div>
            <div className="src">source: {HERO_BENCHMARK.source}</div>
          </div>
        </Reveal>
        <div className="bench-grid">
          {BENCHMARKS.map((b, i) => (
            <Reveal key={b.label} delay={i * 0.06}>
              <div className="bench-card">
                <div className="label">{b.label}</div>
                <div className="val">{b.value}</div>
                <div className="det">{b.detail}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}><GpuVsCpuWidget /></Reveal>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <Reveal>
          <div className="eyebrow">Engine</div>
          <h2>Everything you need to move a robot — on the web</h2>
          <p className="lead">A single Rust core, compiled to WebAssembly and WebGPU. FK/IK are table stakes; batch GPU kinematics, WebGPU collision and cable-aware planning are where trajx is different.</p>
        </Reveal>
        <div className="feat-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 0.05}>
              <div className="feat-card">
                <div className="ic">{f.icon}</div>
                <h3>{f.title}{f.tag && <span className="pill">{f.tag}</span>}</h3>
                <p>{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="section">
        <Reveal>
          <div className="eyebrow">Where it fits</div>
          <h2>The only GPU kinematics engine that runs in a browser</h2>
          <p className="lead">Not faster than cuRobo — but the one you can ship on the web, with no CUDA, no ROS and no backend.</p>
          <div className="cmp-wrap">
            <table className="cmp">
              <thead>
                <tr>
                  <th></th>
                  {COMPARISON.columns.map((c, i) => (
                    <th key={c} className={i === COMPARISON.highlight ? 'hl' : ''}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.rows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {row.cells.map((cell, i) => (
                      <td key={i} className={i === COMPARISON.highlight ? 'hl' : ''}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      {/* Supported robots */}
      <section className="section-sm">
        <Reveal>
          <div className="eyebrow">Supported robots</div>
          <h2 style={{ fontSize: 24 }}>13 arms built in — analytical IK for spherical-wrist families</h2>
          <div className="robot-grid">
            {ROBOTS.map((r) => <span key={r} className="robot-chip">{r}</span>)}
          </div>
        </Reveal>
      </section>

      {/* Use cases */}
      <section className="section">
        <Reveal>
          <div className="eyebrow">Built for</div>
          <h2>Where browser-native kinematics changes what you can build</h2>
        </Reveal>
        <div className="uc-grid">
          {USE_CASES.map((u, i) => (
            <Reveal key={u.title} delay={(i % 2) * 0.06}>
              <div className="uc-card">
                <div className="ic">{u.icon}</div>
                <div>
                  <h3>{u.title}</h3>
                  <p>{u.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Demos */}
      <section className="section" id="demos">
        <Reveal>
          <div className="eyebrow">Live demos</div>
          <h2>See it run — four interactive scenes, powered by RoboViz</h2>
          <p className="lead">Every scene calls the real trajx-wasm engine in your browser. Start with the GPU batch IK swarm; it is what trajx does that nothing else on the web can.</p>
        </Reveal>
        <div className="demo-grid">
          {DEMOS.map((d, i) => (
            <Reveal key={d.slug} delay={(i % 4) * 0.05}>
              <Link className="demo-card" to={`/demo/${d.slug}`}>
                <h3>{d.title}</h3>
                <p>{d.blurb}</p>
                <span className="go">Open demo →</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Get started */}
      <section className="section" id="get-started">
        <Reveal>
          <div className="eyebrow">Get started</div>
          <h2>Install the engine, solve IK in five lines</h2>
          <p className="lead">trajx-wasm is published to npm. Load it, build a robot from a URDF string, and you have FK, analytical multi-solution IK and batch kinematics.</p>
          <div className="gs-grid">
            <CodeBlock title="FK + analytical IK" code={SNIPPETS.fkIk} />
            <CodeBlock title="GPU batch FK (Three.js)" code={SNIPPETS.batch} />
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="section-sm">
          <div>
            <div className="brand">trajx</div>
            <p className="note">{SITE.status}</p>
          </div>
          <div className="links">
            <a href={SITE.githubTrajx} target="_blank" rel="noreferrer">trajx</a>
            <a href={SITE.githubRoboviz} target="_blank" rel="noreferrer">RoboViz</a>
            <Link to="/#demos">Demos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
