# ScholarBridgeAi

## Static UI prototypes (no build step)

Two standalone pages built with plain HTML, Tailwind CSS (Play CDN) and vanilla
JavaScript live in `public/`, so they are served as-is by the Next.js app
(`npm run dev`) and require no build:

- `/landing.html` — public marketing landing page (hero, "One Profile" steps,
  dark feature grid, fit-vs-chance explainer, roadmap section, CTA, footer).
- `/dashboard.html` — signed-in student dashboard.

Quick local preview of just the static files:

```bash
npx serve public      # then open /landing.html or /dashboard.html
```

### Dashboard UI (static prototype)

A fully responsive, interactive dashboard prototype for the ScholarBridge
educational platform lives at [`public/dashboard.html`](public/dashboard.html).
It is built with plain HTML, Tailwind CSS (Play CDN) and vanilla JavaScript —
no build step required.

- **Open locally:** open the file directly in a browser, or run any static
  server (`npx serve public`). With the Next.js app running (`npm run dev`),
  it is also served at `/dashboard.html`.
- **Layout:** dark sidebar + light content area, indigo (`#6366F1`) accent,
  Inter font.
- **Responsive breakpoints:**
  - Mobile — sidebar hidden behind a burger button (slide-in animation),
    single-column content.
  - Tablet — narrow icon-only sidebar, 2×2 stat grid, stacked bottom sections.
  - Desktop — fixed 250px sidebar, 4-column stat grid, 2/3 + 1/3 bottom split.
- **Interactions:** hover lift on cards, scaling buttons, progress bars that
  animate from 0% on load, staggered fade-in-up entrance animations, working
  checkboxes, sidebar AI Tools accordion, language switcher, and a floating
  help button.
