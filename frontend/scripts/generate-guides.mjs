import { mkdir, writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';
import { guides } from '../src/content/guides.js';
import { infoPages } from '../src/content/about.js';

const origin = loadEnv(process.env.NODE_ENV === 'development' ? 'development' : 'production', process.cwd(), '').SITE_URL;
import { renderGuide } from './guide-template.mjs';

for (const guide of guides) {
  const html = renderGuide(guide, origin);
  const dir = new URL(`../dist/guides/${guide.slug}/`, import.meta.url);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('index.html', dir), html);
}

for (const page of infoPages) {
  const dir = new URL(`../dist/${page.slug}/`, import.meta.url);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('index.html', dir), renderGuide(page, origin, `/${page.slug}/`));
}
