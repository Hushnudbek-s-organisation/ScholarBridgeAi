import * as React from "react";
import { resolveCountryCode, resolveCountryFlagEmoji } from "@/lib/countries";
import { FLAG_PALETTES } from "@/components/ui/flagTokens";

/**
 * Universal country flag.
 *
 * WHY THIS EXISTS: the app rendered flags as raw Unicode regional-indicator
 * emoji (🇺🇸). Windows/Chromium with Segoe UI Emoji shows those as the bare
 * letters "US" — every destination looked like a text code. This component
 * paints a small deterministic inline-SVG flag for the identities students
 * actually browse (zero network, zero latency, works in SSR output and in
 * the offline check-render harness), and only falls back to a crisp emoji
 * badge — wrapped in the `.sb-flag-emoji` font stack — for the long tail.
 *
 * It is deliberately `aria-hidden` by default: every wiring point places it
 * next to the localized country name, so screen readers must not repeat "flag
 * of X". Pass `label` when a flag stands alone.
 */

export interface CountryFlagProps {
  /** Any stored country label: English name, ISO code, or a localized (uz/ru) name. */
  country?: string | null;
  /** Emoji already carried by the row (e.g. `uni.flagEmoji`); also decoded as a code source. */
  flagEmoji?: string | null;
  /** Rendered height in px: 14 / 16 / 20 / 28. Width follows 4:3. */
  size?: CountryFlagSize;
  className?: string;
  /** Accessible name for standalone flags; the node is aria-hidden without it. */
  label?: string;
}

const HEIGHTS = { xs: 14, sm: 16, md: 20, lg: 28, xl: 44 } as const;

type CountryFlagSize = keyof typeof HEIGHTS;
const SIZE_CLASSES: Record<CountryFlagSize, { frame: string; emoji: string }> = {
  xs: { frame: "h-3.5 w-[19px]", emoji: "text-[14px]" },
  sm: { frame: "h-4 w-[21px]", emoji: "text-base" },
  md: { frame: "h-5 w-[27px]", emoji: "text-xl" },
  lg: { frame: "h-7 w-[37px]", emoji: "text-[28px]" },
  xl: { frame: "h-11 w-[59px]", emoji: "text-[44px]" },
};
const W = 24;
const H = 18;

/** Horizontal bands, top → bottom, equal height. */
const bands = (...colors: string[]) =>
  colors.map((fill, i) => (
    <rect key={i} x="0" y={(i * H) / colors.length} width={W} height={H / colors.length + 0.02} fill={fill} />
  ));

/** Vertical bands, left → right. */
const columns = (...colors: string[]) =>
  colors.map((fill, i) => (
    <rect key={i} x={(i * W) / colors.length} y="0" width={W / colors.length + 0.02} height={H} fill={fill} />
  ));

const Canton = ({ fill }: { fill: string }) => <rect x="0" y="0" width="10" height="9.6" fill={fill} />;

/**
 * One SVG per recognizable identity. Shapes are simplified but keep the
 * correct layout and official colors — enough to tell France from Italy at
 * 16 px, which is the entire job of a UI flag.
 */
const FLAGS: Record<string, React.ReactNode> = {
  de: bands(FLAG_PALETTES.de[0], FLAG_PALETTES.de[1], FLAG_PALETTES.de[2]),
  be: columns(FLAG_PALETTES.be[0], FLAG_PALETTES.be[1], FLAG_PALETTES.be[2]),
  fr: columns(FLAG_PALETTES.fr[0], FLAG_PALETTES.fr[1], FLAG_PALETTES.fr[2]),
  it: columns(FLAG_PALETTES.it[0], FLAG_PALETTES.it[1], FLAG_PALETTES.it[2]),
  nl: bands(FLAG_PALETTES.nl[0], FLAG_PALETTES.nl[1], FLAG_PALETTES.nl[2]),
  lu: bands(FLAG_PALETTES.lu[0], FLAG_PALETTES.lu[1], FLAG_PALETTES.lu[2]),
  hu: bands(FLAG_PALETTES.hu[0], FLAG_PALETTES.hu[1], FLAG_PALETTES.hu[2]),
  pl: bands(FLAG_PALETTES.pl[0], FLAG_PALETTES.pl[1]),
  ua: bands(FLAG_PALETTES.ua[0], FLAG_PALETTES.ua[1]),
  ru: bands(FLAG_PALETTES.ru[0], FLAG_PALETTES.ru[1], FLAG_PALETTES.ru[2]),
  at: bands(FLAG_PALETTES.at[0], FLAG_PALETTES.at[1], FLAG_PALETTES.at[2]),
  ch: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.ch[0]} />
      <rect x="10.2" y="4.8" width="3.6" height="8.4" fill={FLAG_PALETTES.ch[1]} />
      <rect x="7.8" y="7.2" width="8.4" height="3.6" fill={FLAG_PALETTES.ch[1]} />
    </>
  ),
  es: (
    <>
      {bands(FLAG_PALETTES.es[0], FLAG_PALETTES.es[1], FLAG_PALETTES.es[0])}
      <rect x="0" y={H / 3} width={H / 3} height={H / 3} fill={FLAG_PALETTES.es[2]} opacity="0.9" />
    </>
  ),
  pt: (
    <>
      <rect x="0" y="0" width="9.6" height={H} fill={FLAG_PALETTES.pt[0]} />
      <rect x="9.6" y="0" width={W - 9.6} height={H} fill={FLAG_PALETTES.pt[1]} />
      <circle cx="9.6" cy={H / 2} r="3.2" fill={FLAG_PALETTES.pt[2]} stroke={FLAG_PALETTES.pt[1]} strokeWidth="0.5" />
    </>
  ),
  se: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.se[0]} />
      <rect x="6.6" y="0" width="2.6" height={H} fill={FLAG_PALETTES.se[1]} />
      <rect x="0" y="7.7" width={W} height="2.6" fill={FLAG_PALETTES.se[1]} />
    </>
  ),
  no: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.no[0]} />
      <rect x="6.2" y="0" width="4" height={H} fill={FLAG_PALETTES.no[1]} />
      <rect x="0" y="7" width={W} height="4" fill={FLAG_PALETTES.no[1]} />
      <rect x="7.2" y="0" width="2" height={H} fill={FLAG_PALETTES.no[2]} />
      <rect x="0" y="8" width={W} height="2" fill={FLAG_PALETTES.no[2]} />
    </>
  ),
  dk: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.dk[0]} />
      <rect x="7.4" y="0" width="2.4" height={H} fill={FLAG_PALETTES.dk[1]} />
      <rect x="0" y="7.8" width={W} height="2.4" fill={FLAG_PALETTES.dk[1]} />
    </>
  ),
  fi: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.fi[0]} />
      <rect x="6.8" y="0" width="3" height={H} fill={FLAG_PALETTES.fi[1]} />
      <rect x="0" y="7.5" width={W} height="3" fill={FLAG_PALETTES.fi[1]} />
    </>
  ),
  is: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.is[0]} />
      <rect x="6.8" y="0" width="3.6" height={H} fill={FLAG_PALETTES.is[1]} />
      <rect x="0" y="7.2" width={W} height="3.6" fill={FLAG_PALETTES.is[1]} />
      <rect x="7.6" y="0" width="2" height={H} fill={FLAG_PALETTES.is[2]} />
      <rect x="0" y="8" width={W} height="2" fill={FLAG_PALETTES.is[2]} />
    </>
  ),
  gb: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.gb[0]} />
      <path d="M0 0 L24 18 M24 0 L0 18" stroke={FLAG_PALETTES.gb[1]} strokeWidth="3.4" />
      <path d="M0 0 L24 18 M24 0 L0 18" stroke={FLAG_PALETTES.gb[2]} strokeWidth="1.6" />
      <path d="M12 0 V18 M0 9 H24" stroke={FLAG_PALETTES.gb[1]} strokeWidth="5.4" />
      <path d="M12 0 V18 M0 9 H24" stroke={FLAG_PALETTES.gb[2]} strokeWidth="3" />
    </>
  ),
  us: (
    <>
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x="0" y={(i * H) / 13} width={W} height={H / 13 + 0.02} fill={i % 2 ? FLAG_PALETTES.us[0] : FLAG_PALETTES.us[1]} />
      ))}
      <Canton fill={FLAG_PALETTES.us[2]} />
    </>
  ),
  ca: (
    <>
      <rect x="0" y="0" width="6" height={H} fill={FLAG_PALETTES.ca[0]} />
      <rect x="18" y="0" width="6" height={H} fill={FLAG_PALETTES.ca[0]} />
      <rect x="6" y="0" width="12" height={H} fill={FLAG_PALETTES.ca[1]} />
      <path d="M12 3.4 l1.5 3.1 2.2-1 -1 2.4 2.7.5 -2 1.7 .7 3 -2.7-.8 -.4 2.6h-1.6l-.4-2.6 -2.7.8 .7-3 -2-1.7 2.7-.5 -1-2.4 2.2 1z" fill={FLAG_PALETTES.ca[0]} />
    </>
  ),
  mx: (
    <>
      {columns(FLAG_PALETTES.mx[0], FLAG_PALETTES.mx[1], FLAG_PALETTES.mx[2])}
      <circle cx="12" cy="9" r="1.7" fill={FLAG_PALETTES.mx[3]} />
    </>
  ),
  ar: (
    <>
      {bands(FLAG_PALETTES.ar[0], FLAG_PALETTES.ar[1], FLAG_PALETTES.ar[0])}
      <circle cx="12" cy="9" r="1.6" fill={FLAG_PALETTES.ar[2]} stroke={FLAG_PALETTES.ar[3]} strokeWidth="0.4" />
    </>
  ),
  br: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.br[0]} />
      <path d="M12 2.4 L21.6 9 L12 15.6 L2.4 9 Z" fill={FLAG_PALETTES.br[1]} />
      <circle cx="12" cy="9" r="3.4" fill={FLAG_PALETTES.br[2]} />
    </>
  ),
  cl: (
    <>
      <rect x="0" y="0" width={W} height="9" fill={FLAG_PALETTES.cl[0]} />
      <rect x="0" y="9" width={W} height="9" fill={FLAG_PALETTES.cl[1]} />
      <Canton fill={FLAG_PALETTES.cl[2]} />
      <path d="M5 2 l.9 1.9 2 .3 -1.5 1.4 .4 2 -1.8-1 -1.8 1 .4-2 -1.5-1.4 2-.3z" fill={FLAG_PALETTES.cl[0]} />
    </>
  ),
  jp: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.jp[0]} />
      <circle cx="12" cy="9" r="4.6" fill={FLAG_PALETTES.jp[1]} />
    </>
  ),
  kr: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.kr[0]} />
      <path d="M7.6 9 a4.4 4.4 0 0 1 8.8 0 a2.2 2.2 0 0 1 -4.4 0 a2.2 2.2 0 0 0 -4.4 0" fill={FLAG_PALETTES.kr[1]} />
      <path d="M7.6 9 a4.4 4.4 0 0 0 8.8 0 a2.2 2.2 0 0 1 -4.4 0 a2.2 2.2 0 0 0 -4.4 0" fill={FLAG_PALETTES.kr[2]} />
    </>
  ),
  cn: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.cn[0]} />
      <path d="M4.6 2.6 l1 2 2.2.3 -1.6 1.5 .4 2.2 -2-1 -2 1 .4-2.2 -1.6-1.5 2.2-.3z" fill={FLAG_PALETTES.cn[1]} />
      <circle cx="9.6" cy="2.6" r="0.7" fill={FLAG_PALETTES.cn[1]} />
      <circle cx="11" cy="4.8" r="0.7" fill={FLAG_PALETTES.cn[1]} />
      <circle cx="11" cy="7.4" r="0.7" fill={FLAG_PALETTES.cn[1]} />
      <circle cx="9.6" cy="9.4" r="0.7" fill={FLAG_PALETTES.cn[1]} />
    </>
  ),
  in: (
    <>
      {bands(FLAG_PALETTES.in[0], FLAG_PALETTES.in[1], FLAG_PALETTES.in[2])}
      <circle cx="12" cy="9" r="2.3" fill="none" stroke={FLAG_PALETTES.in[3]} strokeWidth="0.5" />
    </>
  ),
  pk: (
    <>
      <rect x="0" y="0" width="5.4" height={H} fill={FLAG_PALETTES.pk[0]} />
      <rect x="5.4" y="0" width={W - 5.4} height={H} fill={FLAG_PALETTES.pk[1]} />
      <circle cx="14.2" cy="9" r="3.6" fill={FLAG_PALETTES.pk[0]} />
      <circle cx="15.4" cy="9" r="3" fill={FLAG_PALETTES.pk[1]} />
      <path d="M18 7.4 l.5 1.2 1.3.1 -1 .8 .3 1.3 -1.1-.7 -1.1.7 .3-1.3 -1-.8 1.3-.1z" fill={FLAG_PALETTES.pk[0]} />
    </>
  ),
  bd: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.bd[0]} />
      <circle cx="10.4" cy="9" r="4.4" fill={FLAG_PALETTES.bd[1]} />
    </>
  ),
  id: bands(FLAG_PALETTES.id[0], FLAG_PALETTES.id[1]),
  sg: (
    <>
      <rect x="0" y="0" width={W} height="9" fill={FLAG_PALETTES.sg[0]} />
      <rect x="0" y="9" width={W} height="9" fill={FLAG_PALETTES.sg[1]} />
      <circle cx="5.6" cy="4.5" r="2.6" fill={FLAG_PALETTES.sg[1]} />
      <circle cx="7" cy="4.5" r="2.1" fill={FLAG_PALETTES.sg[0]} />
      <circle cx="3.4" cy="1.9" r="0.55" fill={FLAG_PALETTES.sg[1]} />
      <circle cx="5.8" cy="0.9" r="0.55" fill={FLAG_PALETTES.sg[1]} />
      <circle cx="8" cy="2.3" r="0.55" fill={FLAG_PALETTES.sg[1]} />
      <circle cx="2.9" cy="4.6" r="0.55" fill={FLAG_PALETTES.sg[1]} />
      <circle cx="2.9" cy="6.9" r="0.55" fill={FLAG_PALETTES.sg[1]} />
    </>
  ),
  my: (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x="0" y={(i * H) / 14} width={W} height={H / 14 + 0.02} fill={i % 2 ? FLAG_PALETTES.my[0] : FLAG_PALETTES.my[1]} />
      ))}
      <Canton fill={FLAG_PALETTES.my[2]} />
      <circle cx="4.6" cy="4.4" r="2.1" fill={FLAG_PALETTES.my[3]} />
      <circle cx="5.8" cy="4.4" r="1.7" fill={FLAG_PALETTES.my[2]} />
      <path d="M9 2.6 l.7 1.5 1.7.2 -1.2 1.1 .3 1.7 -1.5-.8 -1.5.8 .3-1.7 -1.2-1.1 1.7-.2z" fill={FLAG_PALETTES.my[3]} />
    </>
  ),
  th: bands(FLAG_PALETTES.th[0], FLAG_PALETTES.th[1], FLAG_PALETTES.th[2], FLAG_PALETTES.th[1], FLAG_PALETTES.th[0]),
  vn: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.vn[0]} />
      <path d="M12 5 l1.4 3 3.2.3 -2.4 2.1 .7 3.2 -2.9-1.7 -2.9 1.7 .7-3.2 -2.4-2.1 3.2-.3z" fill={FLAG_PALETTES.vn[1]} />
    </>
  ),
  tr: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.tr[0]} />
      <circle cx="10" cy="9" r="4.1" fill={FLAG_PALETTES.tr[1]} />
      <circle cx="11.2" cy="9" r="3.3" fill={FLAG_PALETTES.tr[0]} />
      <path d="M15.6 7.2 l.9 1.9 2 .3 -1.5 1.4 .4 2 -1.8-1 -1.8 1 .4-2 -1.5-1.4 2-.3z" fill={FLAG_PALETTES.tr[1]} />
    </>
  ),
  gr: (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x="0" y={(i * H) / 9} width={W} height={H / 9 + 0.02} fill={i % 2 ? FLAG_PALETTES.gr[0] : FLAG_PALETTES.gr[1]} />
      ))}
      <Canton fill={FLAG_PALETTES.gr[1]} />
      <path d="M4.2 3 h1.6 v2.4 h2.4 v1.6 h-2.4 v2.4 h-1.6 v-2.4 h-2.4 v-1.6 h2.4z" fill={FLAG_PALETTES.gr[0]} transform="scale(0.8) translate(1.2 0.6)" />
    </>
  ),
  ro: columns(FLAG_PALETTES.ro[0], FLAG_PALETTES.ro[1], FLAG_PALETTES.ro[2]),
  bg: bands(FLAG_PALETTES.bg[0], FLAG_PALETTES.bg[1], FLAG_PALETTES.bg[2]),
  kz: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.kz[0]} />
      <circle cx="13" cy="9" r="3" fill={FLAG_PALETTES.kz[1]} />
      <path d="M4.6 9 l1.2-1.2 1.2 1.2 -1.2 1.2z" fill={FLAG_PALETTES.kz[1]} opacity="0.9" />
    </>
  ),
  qa: (
    <>
      <rect x="0" y="0" width="8" height={H} fill={FLAG_PALETTES.qa[0]} />
      <rect x="8" y="0" width={W - 8} height={H} fill={FLAG_PALETTES.qa[1]} />
      <path d="M8 0 l-2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5" fill={FLAG_PALETTES.qa[1]} />
    </>
  ),
  sa: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.sa[0]} />
      <path d="M5 6.6 h14 M5 9.4 h11" stroke={FLAG_PALETTES.sa[1]} strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
  ae: (
    <>
      {bands(FLAG_PALETTES.ae[0], FLAG_PALETTES.ae[1], FLAG_PALETTES.ae[2])}
      <rect x="0" y="0" width="5.4" height={H} fill={FLAG_PALETTES.ae[3]} />
    </>
  ),
  eg: (
    <>
      {bands(FLAG_PALETTES.eg[0], FLAG_PALETTES.eg[1], FLAG_PALETTES.eg[2])}
      <path d="M11 7.4 h2 v1.6 h1.4 v1.6 h-4.8 v-1.6 h1.4z" fill={FLAG_PALETTES.eg[3]} />
    </>
  ),
  za: (
    <>
      <rect x="0" y="0" width={W} height="9" fill={FLAG_PALETTES.za[0]} />
      <rect x="0" y="9" width={W} height="9" fill={FLAG_PALETTES.za[1]} />
      <path d="M0 0 L9 9 L0 18 Z" fill={FLAG_PALETTES.za[2]} />
      <path d="M0 1.6 L7.3 9 L0 16.4 Z" fill={FLAG_PALETTES.za[3]} />
      <path d="M0 4 L4.6 9 L0 14 Z" fill={FLAG_PALETTES.za[4]} />
    </>
  ),
  nz: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.nz[0]} />
      <path d="M0 0 L10 4.8 M10 0 L0 4.8" stroke={FLAG_PALETTES.nz[1]} strokeWidth="1" />
      <path d="M0 0 L10 4.8 M10 0 L0 4.8" stroke={FLAG_PALETTES.nz[2]} strokeWidth="0.5" />
      <path d="M5 0 v4.8 M0 2.4 h10" stroke={FLAG_PALETTES.nz[1]} strokeWidth="1.6" />
      <path d="M5 0 v4.8 M0 2.4 h10" stroke={FLAG_PALETTES.nz[2]} strokeWidth="0.9" />
      <circle cx="17.4" cy="3.4" r="0.9" fill={FLAG_PALETTES.nz[2]} stroke={FLAG_PALETTES.nz[1]} strokeWidth="0.4" />
      <circle cx="20.6" cy="7.6" r="0.9" fill={FLAG_PALETTES.nz[2]} stroke={FLAG_PALETTES.nz[1]} strokeWidth="0.4" />
      <circle cx="16.6" cy="13.4" r="1.1" fill={FLAG_PALETTES.nz[2]} stroke={FLAG_PALETTES.nz[1]} strokeWidth="0.4" />
      <circle cx="21" cy="11.2" r="0.7" fill={FLAG_PALETTES.nz[2]} stroke={FLAG_PALETTES.nz[1]} strokeWidth="0.4" />
    </>
  ),
  au: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.au[0]} />
      <path d="M0 0 L10 4.8 M10 0 L0 4.8" stroke={FLAG_PALETTES.au[1]} strokeWidth="1" />
      <path d="M0 0 L10 4.8 M10 0 L0 4.8" stroke={FLAG_PALETTES.au[2]} strokeWidth="0.5" />
      <path d="M5 0 v4.8 M0 2.4 h10" stroke={FLAG_PALETTES.au[1]} strokeWidth="1.6" />
      <path d="M5 0 v4.8 M0 2.4 h10" stroke={FLAG_PALETTES.au[2]} strokeWidth="0.9" />
      <circle cx="5.6" cy="8.8" r="0.9" fill={FLAG_PALETTES.au[1]} />
      <circle cx="17" cy="5" r="0.9" fill={FLAG_PALETTES.au[1]} />
      <circle cx="20.6" cy="9.4" r="0.8" fill={FLAG_PALETTES.au[1]} />
      <circle cx="15.6" cy="12.6" r="0.9" fill={FLAG_PALETTES.au[1]} />
      <circle cx="19" cy="14" r="0.6" fill={FLAG_PALETTES.au[1]} />
    </>
  ),
  eu: (
    <>
      <rect x="0" y="0" width={W} height={H} fill={FLAG_PALETTES.eu[0]} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={12 + Math.cos(a) * 4.6} cy={9 + Math.sin(a) * 4.6} r="0.62" fill={FLAG_PALETTES.eu[1]} />;
      })}
    </>
  ),
  uz: (
    <>
      {bands(FLAG_PALETTES.uz[0], FLAG_PALETTES.uz[1], FLAG_PALETTES.uz[2])}
      <rect x="0" y="5.63" width={W} height="0.5" fill={FLAG_PALETTES.uz[3]} />
      <rect x="0" y="11.87" width={W} height="0.5" fill={FLAG_PALETTES.uz[3]} />
      <circle cx="4" cy="2.8" r="1.5" fill={FLAG_PALETTES.uz[4]} />
      <circle cx="4.9" cy="2.8" r="1.2" fill={FLAG_PALETTES.uz[0]} />
    </>
  ),
};

/**
 * Deterministic inline SVG flag → rounded badge with an emoji fallback.
 * The badge text node uses `.sb-flag-emoji` (a pinned font stack) so Windows
 * Chrome/Edge paints a color glyph instead of the two ASCII letters.
 */
export function CountryFlag({ country, flagEmoji, size = "sm", className = "", label }: CountryFlagProps) {
  const iso2 = resolveCountryCode(country, flagEmoji);
  const height = HEIGHTS[size];
  const width = Math.round((height * W) / H);
  const svg = iso2 ? FLAGS[iso2] : undefined;
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : ({ "aria-hidden": true } as const);

  if (svg) {
    return (
      <span
        {...a11y}
        className={`inline-flex shrink-0 items-center overflow-hidden rounded-control align-middle ring-1 ring-black/15 dark:ring-white/25 ${SIZE_CLASSES[size].frame} ${className}`}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width={width} height={height} focusable="false" className="block">
          {svg}
        </svg>
      </span>
    );
  }

  const emoji = resolveCountryFlagEmoji(country, flagEmoji);
  if (!emoji) return null;
  return (
    <span
      {...a11y}
      className={`sb-flag-emoji inline-flex shrink-0 items-center justify-center leading-none align-middle ${SIZE_CLASSES[size].emoji} ${className}`}
    >
      {emoji}
    </span>
  );
}

export default CountryFlag;
