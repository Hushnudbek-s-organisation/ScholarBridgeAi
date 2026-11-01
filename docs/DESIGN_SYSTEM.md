# ScholarBridge design system

`src/components/ui` is the **only** UI-library location. Feature folders contain product composition and data logic, not another button/form kit.

## Canonical imports

```tsx
import { Button } from "@/components/ui/Button";
import { ProgressBar, ProgressFill } from "@/components/ui/ProgressBar";
import { cn } from "@/components/ui/cn";
```

Journey, growth and hub compositions live in `ui/journey.tsx`, `ui/growth.tsx` and `ui/hubs.tsx`. They consume the same primitives. `ui/Button.tsx` is the only module that renders a native `<button>`; use `MotionButton` when Framer Motion props are required.

## Rules

- **Font:** self-hosted variable Inter through `next/font/local` in `app/layout.tsx`. Latin and Cyrillic subsets share the `font-sans` stack; no runtime Google Fonts request.
- **Type:** 14px (`text-sm`) is the body default and the explicit size for paragraphs, lists, labels, and form values. 12px (`text-xs`) is the minimum for captions, badges and compact metadata. Display sizes use the normal Tailwind scale. Do not add arbitrary sub-12px text, including inside decorative dashboard mockups.
- **Contrast:** light-mode secondary text is `text-slate-500` or darker, never `text-slate-400`. Solid fills with white text must reach 4.5:1; bright amber/sky helpers use dark ink instead. The separately audited dark ramp may use `dark:text-slate-400`.
- **Buttons:** `primary` is indigo-600 with an indigo-700 hover. `success` is emerald-700, `danger` is rose-600, and `outline`/`ghost` use the neutral ramp. `variant="unstyled"` preserves feature-specific artwork but retains shared focus, disabled, touch and default control-radius behavior.
- **Radius:** `rounded-control` = 8px for fields and controls; `rounded-surface` = 12px for cards and content surfaces; `rounded-overlay` = 16px for panels, modals and hero containers; `rounded-full` for pills and circular artwork. Legacy `rounded-sm/md/lg/xl/2xl/3xl` and arbitrary radii should not be introduced.
- **Semantic color:** indigo = brand/action, emerald = success, amber = warning, **rose = every error/danger state**, sky/blue = information, slate = neutral. Do not use red as a second danger palette.
- **Color tokens:** use Tailwind roles (`bg-canvas`, `bg-surface`, `text-ink-body`, `border-border`, etc.) or semantic palette classes. SVG/chart values come from `ui/tokens.ts`; official flag artwork palettes come from `ui/flagTokens.ts`. No hex literals in TSX feature components.
- **Inline styles:** prohibited for static visual values. The few remaining styles are runtime geometry only (calculated progress, SVG dimensions, popover constraints and audio/scroll animation). `ProgressFill` owns the shared dynamic-width implementation.

Run `npm run audit:ui`, `npm run test:dark`, `npm run test:responsive` and `npm run typecheck` after changing these rules or a shared primitive.
