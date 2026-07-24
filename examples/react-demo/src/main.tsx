import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import './site/landing.css';

// HashRouter: GitHub Pages is static and served from the /roboviz/ subpath, so
// hash routes (/roboviz/#/demo/ik) never 404 on refresh — no 404.html needed.
// No StrictMode: its dev-only mount→unmount→remount tears down the R3F WebGL
// context (blank canvas in dev). Production was unaffected; this aligns the two.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
