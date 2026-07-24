import React, { useState } from 'react';

export function CodeBlock({ title, code, lang = 'ts' }: { title: string; code: string; lang?: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <div className="code">
      <div className="code-head">
        <span>{title}</span>
        <button className="copy" onClick={copy}>{copied ? 'copied ✓' : 'copy'}</button>
      </div>
      <pre><code className={`language-${lang}`}>{code}</code></pre>
    </div>
  );
}
