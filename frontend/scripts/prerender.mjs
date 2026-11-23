import { readFile, writeFile } from 'node:fs/promises';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

// Render the same public component used by the client so the HTML stays in sync.
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error',
});
try {
  const { default: Landing } = await server.ssrLoadModule('/src/pages/Landing.tsx');
  const markup = renderToString(React.createElement(Landing));
  const file = new URL('../dist/index.html', import.meta.url);
  const html = await readFile(file, 'utf8');
  const start = html.indexOf('<div id="root">');
  const end = html.indexOf('</div>', start);
  if (start < 0 || end < 0) throw new Error('Could not find the root element in dist/index.html');
  await writeFile(file, `${html.slice(0, start)}<div id="root">${markup}</div>${html.slice(end + 6)}`);
} finally {
  await server.close();
}
