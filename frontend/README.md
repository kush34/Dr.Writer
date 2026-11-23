# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Search indexing

Set `SITE_URL` to the canonical production origin (for example, `https://example.com`) at build time. The build then adds canonical and social URLs and generates a sitemap and robots.txt with its location. Configure the same environment variable in Vercel for production builds. Submit `/sitemap.xml` in Google Search Console after deployment. Private route indexing headers are configured in `vercel.json`; other hosts need equivalent `X-Robots-Tag` headers.

## Visits and search performance

1. In the Vercel project, enable Web Analytics and deploy. Analytics is mounted across public and account routes; document URLs are excluded and query parameters are removed except `utm_source=chatgpt.com`. No document content, email, or user ID is sent in custom events.
2. In Vercel Analytics, review visitors, page views, top pages, and referrers. Successful email registrations send an `Email signup` event. Google sign-ins are not counted as signups. Vercel custom events require Pro or Enterprise; UTM reporting requires Web Analytics Plus or Enterprise. Client-side events can be blocked or lost, so Firebase account counts are the authoritative signup total.
3. Verify the production domain in Google Search Console, submit `https://YOUR-DOMAIN/sitemap.xml`, and review indexing and the Search results report for clicks, impressions, queries, and pages.
4. For AEO, review available referrer/UTM reports for ChatGPT and other AI sources, and periodically test a fixed list of relevant prompts in each assistant. Record the date, prompt, model/search setting, mention, citation, and URL; these samples do not measure all AI visibility. Google Search Console includes AI feature traffic in its overall Search reporting, not a separate complete AEO dashboard.
