import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { guides } from "./src/content/guides.js"
import { infoPages } from "./src/content/about.js"
import { renderGuide } from "./scripts/guide-template.mjs"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const siteUrl = loadEnv(mode, process.cwd(), "").SITE_URL;
  let origin: string | undefined;
  if (siteUrl) {
    const url = new URL(siteUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
      throw new Error("SITE_URL must be an HTTP(S) origin, such as https://example.com");
    }
    origin = url.origin;
  }
  return {
  plugins: [react(), tailwindcss(), {
    name: "public-seo",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        const page = infoPages.find(item => pathname === `/${item.slug}` || pathname === `/${item.slug}/`);
        if (page) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(renderGuide(page, origin, `/${page.slug}/`));
          return;
        }
        if (!pathname.startsWith("/guides/")) return next();
        const guide = guides.find(item => pathname === `/guides/${item.slug}` || pathname === `/guides/${item.slug}/`);
        if (!guide) {
          res.statusCode = 404;
          res.end("Guide not found");
          return;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderGuide(guide, origin));
      });
    },
    transformIndexHtml(html) {
      if (!origin) return html;
      return html.replace("</head>", `  <link rel="canonical" href="${origin}/" />\n    <meta property="og:url" content="${origin}/" />\n    <meta property="og:image" content="${origin}/editor-hero.png" />\n    <meta name="twitter:image" content="${origin}/editor-hero.png" />\n  </head>`);
    },
    generateBundle() {
      if (!origin) return;
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url>${infoPages.map(page => `<url><loc>${origin}/${page.slug}/</loc></url>`).join("")}${guides.map(guide => `<url><loc>${origin}/guides/${guide.slug}/</loc></url>`).join("")}</urlset>\n` });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n` });
    },
  }],
  optimizeDeps: { esbuildOptions: { target: "es2022" }, include: ["docx"] },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // vite.config.ts
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'], // only what you import
          'vendor-tiptap': [
            '@tiptap/react',
            '@tiptap/core',
            '@tiptap/starter-kit',
            '@tiptap/extensions',
            '@tiptap/extension-color',
            '@tiptap/extension-highlight',
            '@tiptap/extension-image',
            '@tiptap/extension-list',
            '@tiptap/extension-text-align',
            '@tiptap/extension-text-style',
            '@tiptap/extension-typography',
            '@tiptap/extension-horizontal-rule',
            '@tiptap/extension-subscript',
            '@tiptap/extension-superscript',
          ],
          'vendor-ui': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            'lucide-react',
            'motion',
          ],
          'vendor-misc': ['axios', 'socket.io-client', 'react-redux', 'redux'],
        },
      },
    },
  },
  }
})
