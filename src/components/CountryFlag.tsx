import * as React from "react";
import { resolveCountryCode, resolveCountryFlagEmoji } from "@/lib/countries";

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
  de: bands("#000000", "#dd0000", "#ffce00"),
  be: columns("#000000", "#fae042", "#ed2939"),
  fr: columns("#002395", "#ffffff", "#ed2939"),
  it: columns("#009246", "#ffffff", "#ce2b37"),
  nl: bands("#ae1c28", "#ffffff", "#21468b"),
  lu: bands("#ed2939", "#ffffff", "#00a1de"),
  hu: bands("#cd2a3e", "#ffffff", "#436f4d"),
  pl: bands("#ffffff", "#dc143c"),
  ua: bands("#0057b7", "#ffd700"),
  ru: bands("#ffffff", "#0039a6", "#d52b1e"),
  at: bands("#ed2939", "#ffffff", "#ed293c"),
  ch: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#da291c" />
      <rect x="10.2" y="4.8" width="3.6" height="8.4" fill="#fff" />
      <rect x="7.8" y="7.2" width="8.4" height="3.6" fill="#fff" />
    </>
  ),
  es: (
    <>
      {bands("#aa151b", "#f1bf00", "#aa151b")}
      <rect x="0" y={H / 3} width={H / 3} height={H / 3} fill="#c60b1e" opacity="0.9" />
    </>
  ),
  pt: (
    <>
      <rect x="0" y="0" width="9.6" height={H} fill="#046a38" />
      <rect x="9.6" y="0" width={W - 9.6} height={H} fill="#da291c" />
      <circle cx="9.6" cy={H / 2} r="3.2" fill="#ffe900" stroke="#da291c" strokeWidth="0.5" />
    </>
  ),
  se: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#006aa7" />
      <rect x="6.6" y="0" width="2.6" height={H} fill="#fecc00" />
      <rect x="0" y="7.7" width={W} height="2.6" fill="#fecc00" />
    </>
  ),
  no: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#ba0c2f" />
      <rect x="6.2" y="0" width="4" height={H} fill="#fff" />
      <rect x="0" y="7" width={W} height="4" fill="#fff" />
      <rect x="7.2" y="0" width="2" height={H} fill="#00205b" />
      <rect x="0" y="8" width={W} height="2" fill="#00205b" />
    </>
  ),
  dk: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#c8102e" />
      <rect x="7.4" y="0" width="2.4" height={H} fill="#fff" />
      <rect x="0" y="7.8" width={W} height="2.4" fill="#fff" />
    </>
  ),
  fi: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#fff" />
      <rect x="6.8" y="0" width="3" height={H} fill="#003580" />
      <rect x="0" y="7.5" width={W} height="3" fill="#003580" />
    </>
  ),
  is: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#02529c" />
      <rect x="6.8" y="0" width="3.6" height={H} fill="#fff" />
      <rect x="0" y="7.2" width={W} height="3.6" fill="#fff" />
      <rect x="7.6" y="0" width="2" height={H} fill="#dc1e35" />
      <rect x="0" y="8" width={W} height="2" fill="#dc1e35" />
    </>
  ),
  gb: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#012169" />
      <path d="M0 0 L24 18 M24 0 L0 18" stroke="#fff" strokeWidth="3.4" />
      <path d="M0 0 L24 18 M24 0 L0 18" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M12 0 V18 M0 9 H24" stroke="#fff" strokeWidth="5.4" />
      <path d="M12 0 V18 M0 9 H24" stroke="#c8102e" strokeWidth="3" />
    </>
  ),
  us: (
    <>
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x="0" y={(i * H) / 13} width={W} height={H / 13 + 0.02} fill={i % 2 ? "#fff" : "#b31942"} />
      ))}
      <Canton fill="#0a3161" />
    </>
  ),
  ca: (
    <>
      <rect x="0" y="0" width="6" height={H} fill="#d80621" />
      <rect x="18" y="0" width="6" height={H} fill="#d80621" />
      <rect x="6" y="0" width="12" height={H} fill="#fff" />
      <path d="M12 3.4 l1.5 3.1 2.2-1 -1 2.4 2.7.5 -2 1.7 .7 3 -2.7-.8 -.4 2.6h-1.6l-.4-2.6 -2.7.8 .7-3 -2-1.7 2.7-.5 -1-2.4 2.2 1z" fill="#d80621" />
    </>
  ),
  mx: (
    <>
      {columns("#006847", "#ffffff", "#ce1126")}
      <circle cx="12" cy="9" r="1.7" fill="#8a6642" />
    </>
  ),
  ar: (
    <>
      {bands("#74acdf", "#ffffff", "#74acdf")}
      <circle cx="12" cy="9" r="1.6" fill="#f6b40e" stroke="#c8860a" strokeWidth="0.4" />
    </>
  ),
  br: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#009c3b" />
      <path d="M12 2.4 L21.6 9 L12 15.6 L2.4 9 Z" fill="#ffdf00" />
      <circle cx="12" cy="9" r="3.4" fill="#002776" />
    </>
  ),
  cl: (
    <>
      <rect x="0" y="0" width={W} height="9" fill="#fff" />
      <rect x="0" y="9" width={W} height="9" fill="#d52b1e" />
      <Canton fill="#0039a6" />
      <path d="M5 2 l.9 1.9 2 .3 -1.5 1.4 .4 2 -1.8-1 -1.8 1 .4-2 -1.5-1.4 2-.3z" fill="#fff" />
    </>
  ),
  jp: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#fff" />
      <circle cx="12" cy="9" r="4.6" fill="#bc002d" />
    </>
  ),
  kr: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#fff" />
      <path d="M7.6 9 a4.4 4.4 0 0 1 8.8 0 a2.2 2.2 0 0 1 -4.4 0 a2.2 2.2 0 0 0 -4.4 0" fill="#cd2e3c" />
      <path d="M7.6 9 a4.4 4.4 0 0 0 8.8 0 a2.2 2.2 0 0 1 -4.4 0 a2.2 2.2 0 0 0 -4.4 0" fill="#0047a0" />
    </>
  ),
  cn: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#de2910" />
      <path d="M4.6 2.6 l1 2 2.2.3 -1.6 1.5 .4 2.2 -2-1 -2 1 .4-2.2 -1.6-1.5 2.2-.3z" fill="#ffde00" />
      <circle cx="9.6" cy="2.6" r="0.7" fill="#ffde00" />
      <circle cx="11" cy="4.8" r="0.7" fill="#ffde00" />
      <circle cx="11" cy="7.4" r="0.7" fill="#ffde00" />
      <circle cx="9.6" cy="9.4" r="0.7" fill="#ffde00" />
    </>
  ),
  in: (
    <>
      {bands("#ff9933", "#ffffff", "#138808")}
      <circle cx="12" cy="9" r="2.3" fill="none" stroke="#000080" strokeWidth="0.5" />
    </>
  ),
  pk: (
    <>
      <rect x="0" y="0" width="5.4" height={H} fill="#fff" />
      <rect x="5.4" y="0" width={W - 5.4} height={H} fill="#01411c" />
      <circle cx="14.2" cy="9" r="3.6" fill="#fff" />
      <circle cx="15.4" cy="9" r="3" fill="#01411c" />
      <path d="M18 7.4 l.5 1.2 1.3.1 -1 .8 .3 1.3 -1.1-.7 -1.1.7 .3-1.3 -1-.8 1.3-.1z" fill="#fff" />
    </>
  ),
  bd: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#006a4e" />
      <circle cx="10.4" cy="9" r="4.4" fill="#f42a41" />
    </>
  ),
  id: bands("#ce1126", "#ffffff"),
  sg: (
    <>
      <rect x="0" y="0" width={W} height="9" fill="#ed2939" />
      <rect x="0" y="9" width={W} height="9" fill="#fff" />
      <circle cx="5.6" cy="4.5" r="2.6" fill="#fff" />
      <circle cx="7" cy="4.5" r="2.1" fill="#ed2939" />
      <circle cx="3.4" cy="1.9" r="0.55" fill="#fff" />
      <circle cx="5.8" cy="0.9" r="0.55" fill="#fff" />
      <circle cx="8" cy="2.3" r="0.55" fill="#fff" />
      <circle cx="2.9" cy="4.6" r="0.55" fill="#fff" />
      <circle cx="2.9" cy="6.9" r="0.55" fill="#fff" />
    </>
  ),
  my: (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x="0" y={(i * H) / 14} width={W} height={H / 14 + 0.02} fill={i % 2 ? "#fff" : "#cc0001"} />
      ))}
      <Canton fill="#010067" />
      <circle cx="4.6" cy="4.4" r="2.1" fill="#ffcc00" />
      <circle cx="5.8" cy="4.4" r="1.7" fill="#010067" />
      <path d="M9 2.6 l.7 1.5 1.7.2 -1.2 1.1 .3 1.7 -1.5-.8 -1.5.8 .3-1.7 -1.2-1.1 1.7-.2z" fill="#ffcc00" />
    </>
  ),
  th: bands("#a51931", "#f4f5f8", "#2d2a4a", "#f4f5f8", "#a51931"),
  vn: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#da251d" />
      <path d="M12 5 l1.4 3 3.2.3 -2.4 2.1 .7 3.2 -2.9-1.7 -2.9 1.7 .7-3.2 -2.4-2.1 3.2-.3z" fill="#ffff00" />
    </>
  ),
  tr: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#e30a17" />
      <circle cx="10" cy="9" r="4.1" fill="#fff" />
      <circle cx="11.2" cy="9" r="3.3" fill="#e30a17" />
      <path d="M15.6 7.2 l.9 1.9 2 .3 -1.5 1.4 .4 2 -1.8-1 -1.8 1 .4-2 -1.5-1.4 2-.3z" fill="#fff" />
    </>
  ),
  gr: (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x="0" y={(i * H) / 9} width={W} height={H / 9 + 0.02} fill={i % 2 ? "#fff" : "#0d5e88"} />
      ))}
      <Canton fill="#0d5e88" />
      <path d="M4.2 3 h1.6 v2.4 h2.4 v1.6 h-2.4 v2.4 h-1.6 v-2.4 h-2.4 v-1.6 h2.4z" fill="#fff" transform="scale(0.8) translate(1.2 0.6)" />
    </>
  ),
  ro: columns("#002b7f", "#fcd116", "#c1272d"),
  bg: bands("#fff", "#00966e", "#d62612"),
  kz: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#00afca" />
      <circle cx="13" cy="9" r="3" fill="#fec50c" />
      <path d="M4.6 9 l1.2-1.2 1.2 1.2 -1.2 1.2z" fill="#fec50c" opacity="0.9" />
    </>
  ),
  qa: (
    <>
      <rect x="0" y="0" width="8" height={H} fill="#fff" />
      <rect x="8" y="0" width={W - 8} height={H} fill="#8a1538" />
      <path d="M8 0 l-2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5 -2 1.5 2 1.5" fill="#8a1538" />
    </>
  ),
  sa: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#165d31" />
      <path d="M5 6.6 h14 M5 9.4 h11" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
  ae: (
    <>
      {bands("#00732f", "#fff", "#000")}
      <rect x="0" y="0" width="5.4" height={H} fill="#c8102e" />
    </>
  ),
  eg: (
    <>
      {bands("#ce1126", "#ffffff", "#000000")}
      <path d="M11 7.4 h2 v1.6 h1.4 v1.6 h-4.8 v-1.6 h1.4z" fill="#c09300" />
    </>
  ),
  za: (
    <>
      <rect x="0" y="0" width={W} height="9" fill="#de3831" />
      <rect x="0" y="9" width={W} height="9" fill="#002395" />
      <path d="M0 0 L9 9 L0 18 Z" fill="#fff" />
      <path d="M0 1.6 L7.3 9 L0 16.4 Z" fill="#007a4d" />
      <path d="M0 4 L4.6 9 L0 14 Z" fill="#ffb612" />
    </>
  ),
  nz: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#00247d" />
      <path d="M0 0 L10 4.8 M10 0 L0 4.8" stroke="#fff" strokeWidth="1" />
      <path d="M0 0 L10 4.8 M10 0 L0 4.8" stroke="#cc142b" strokeWidth="0.5" />
      <path d="M5 0 v4.8 M0 2.4 h10" stroke="#fff" strokeWidth="1.6" />
      <path d="M5 0 v4.8 M0 2.4 h10" stroke="#cc142b" strokeWidth="0.9" />
      <circle cx="17.4" cy="3.4" r="0.9" fill="#cc142b" stroke="#fff" strokeWidth="0.4" />
      <circle cx="20.6" cy="7.6" r="0.9" fill="#cc142b" stroke="#fff" strokeWidth="0.4" />
      <circle cx="16.6" cy="13.4" r="1.1" fill="#cc142b" stroke="#fff" strokeWidth="0.4" />
      <circle cx="21" cy="11.2" r="0.7" fill="#cc142b" stroke="#fff" strokeWidth="0.4" />
    </>
  ),
  au: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#00247d" />
      <path d="M0 0 L10 4.8 M10 0 L0 4.8" stroke="#fff" strokeWidth="1" />
      <path d="M0 0 L10 4.8 M10 0 L0 4.8" stroke="#cc142b" strokeWidth="0.5" />
      <path d="M5 0 v4.8 M0 2.4 h10" stroke="#fff" strokeWidth="1.6" />
      <path d="M5 0 v4.8 M0 2.4 h10" stroke="#cc142b" strokeWidth="0.9" />
      <circle cx="5.6" cy="8.8" r="0.9" fill="#fff" />
      <circle cx="17" cy="5" r="0.9" fill="#fff" />
      <circle cx="20.6" cy="9.4" r="0.8" fill="#fff" />
      <circle cx="15.6" cy="12.6" r="0.9" fill="#fff" />
      <circle cx="19" cy="14" r="0.6" fill="#fff" />
    </>
  ),
  eu: (
    <>
      <rect x="0" y="0" width={W} height={H} fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={12 + Math.cos(a) * 4.6} cy={9 + Math.sin(a) * 4.6} r="0.62" fill="#ffcc00" />;
      })}
    </>
  ),
  uz: (
    <>
      {bands("#0099b5", "#ffffff", "#1eb53a")}
      <rect x="0" y="5.63" width={W} height="0.5" fill="#ce1126" />
      <rect x="0" y="11.87" width={W} height="0.5" fill="#ce1126" />
      <circle cx="4" cy="2.8" r="1.5" fill="#fff" />
      <circle cx="4.9" cy="2.8" r="1.2" fill="#0099b5" />
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
        className={`inline-flex shrink-0 items-center overflow-hidden rounded-[3px] align-middle ring-1 ring-black/15 dark:ring-white/25 ${className}`}
        style={{ width, height }}
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
      className={`sb-flag-emoji inline-flex shrink-0 items-center justify-center leading-none align-middle ${className}`}
      style={{ fontSize: Math.max(13, height) }}
    >
      {emoji}
    </span>
  );
}

export default CountryFlag;
