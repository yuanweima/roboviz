import React from 'react';
import { Link } from 'react-router-dom';
import { SITE } from './content';

export function SiteNav(): React.JSX.Element {
  return (
    <nav className="site-nav">
      <Link to="/" className="brand">
        <span className="logo">◆</span>
        trajx
        <span className="tag">wasm</span>
      </Link>
      <div className="links">
        <Link to="/#features">Features</Link>
        <Link to="/#benchmarks">Benchmarks</Link>
        <Link to="/#demos">Demos</Link>
        <Link to="/#get-started">Get&nbsp;started</Link>
        <a className="cta" href={SITE.githubTrajx} target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </nav>
  );
}
