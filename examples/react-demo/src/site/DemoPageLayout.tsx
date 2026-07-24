import React from 'react';
import { Link } from 'react-router-dom';
import { Leva } from 'leva';
import { SiteNav } from './SiteNav';
import { DEMOS } from './content';

interface DemoPageLayoutProps {
  slug: string;
  /** One-line "what trajx is doing here" narrative. */
  what: string;
  children: React.ReactNode; // the scene component
}

export function DemoPageLayout({ slug, what, children }: DemoPageLayoutProps): React.JSX.Element {
  const idx = DEMOS.findIndex((d) => d.slug === slug);
  const demo = DEMOS[idx] ?? DEMOS[0];
  const prev = DEMOS[(idx - 1 + DEMOS.length) % DEMOS.length];
  const next = DEMOS[(idx + 1) % DEMOS.length];

  return (
    <div className="demo-page site">
      <Leva collapsed />
      <SiteNav />
      <div className="demo-body">
        <aside className="demo-aside">
          <div className="kicker">Live demo · powered by RoboViz</div>
          <h1>{demo.title}</h1>
          <p className="blurb">{demo.blurb}</p>

          <div className="what">
            <div className="t">What trajx is doing</div>
            <p>{what}</p>
          </div>

          <div className="demo-nav">
            <Link to={`/demo/${prev.slug}`}><span className="lab">← prev</span>{prev.title}</Link>
            <Link to={`/demo/${next.slug}`}><span className="lab">next →</span>{next.title}</Link>
          </div>
        </aside>

        <main className="demo-stage">
          {children}
        </main>
      </div>
    </div>
  );
}
