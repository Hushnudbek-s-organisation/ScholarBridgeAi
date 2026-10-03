import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { SiteTracker } from "@/components/SiteTracker";
import { getBranding } from "@/lib/branding";
import { siteUrlForRequest } from "@/lib/requestAppUrl";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MotionProvider } from "@/components/motion";
import { isThemeChoice, themeInitScript, THEME_COOKIE } from "@/lib/theme";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

// The middleware sends a per-request nonce-based CSP. Next.js can only stamp
// that nonce on its <script> tags when the page is rendered per request —
// statically prerendered HTML has no nonce, so the browser blocks every
// script, React never hydrates and no button (Sign in / Get started) works.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { logo, favicon } = await getBranding();
  const SITE_URL = await siteUrlForRequest();
  // Search Console ownership token belongs to whoever owns the domain, so it
  // is configuration (GOOGLE_SITE_VERIFICATION), not code.
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return {
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.json",
  // Google Search Console ownership verification (renders the
  // <meta name="google-site-verification" .../> tag in <head>).
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  title: {
    default: "ScholarBridgeAI — Xorijda O'qish, Grant va Universitet Tanlash",
    template: "%s | ScholarBridgeAI",
  },
  description:
    "ScholarBridgeAI — GPA, IELTS va byudjetga mos xorijiy universitetlar va grantlarni toping. Universitet tanlash, SOP yozish va ariza topshirishda AI yordami.",
  keywords: [
    "xorijda o'qish",
    "grant",
    "stipendiya",
    "universitet tanlash",
    "IELTS",
    "GPA",
    "SOP yozish",
    "magistratura",
    "bakalavriat",
    "DAAD",
    "Chevening",
    "Erasmus Mundus",
    "Fulbright",
    "xalqaro talaba",
    "xorijiy universitetlar",
    "ScholarBridgeAI",
    "ScholarBridge",
  ],
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: SITE_URL,
    siteName: "ScholarBridgeAI",
    title: "ScholarBridgeAI — Xorijda O'qish, Grant va Universitet Tanlash",
    description:
      "ScholarBridgeAI — GPA, IELTS va byudjetga mos xorijiy universitetlar va grantlarni toping. Universitet tanlash, SOP yozish va ariza topshirishda AI yordami.",
    images: [
      {
        url: logo,
        width: 1200,
        height: 630,
        alt: "ScholarBridgeAI logotipi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarBridgeAI — Xorijda O'qish, Grant va Universitet Tanlash",
    description:
      "ScholarBridgeAI — GPA, IELTS va byudjetga mos xorijiy universitetlar va grantlarni toping. Universitet tanlash, SOP yozish va ariza topshirishda AI yordami.",
    images: [logo],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: favicon, sizes: "any" },
      { url: favicon, type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: favicon, sizes: "180x180", type: "image/png" },
    ],
    shortcut: favicon,
  },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The middleware generates a fresh CSP nonce per request and forwards it on
  // `x-nonce`. The pre-hydration theme script is inline, so it must carry that
  // nonce or the browser will refuse to run it (and the theme would flash).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Server-side hint so the first render matches what the inline script
  // painted, avoiding a hydration mismatch on the theme toggle.
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  const initialTheme = isThemeChoice(stored) ? stored : "system";

  // Language of the document itself. Screen readers use it to pick a
  // pronunciation dictionary, so it must match the locale the app renders —
  // it is read from the same cookie the LocaleProvider uses, and the provider
  // keeps it in sync when the language is switched without a reload.
  const storedLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const lang = storedLocale && isLocale(storedLocale) ? storedLocale : defaultLocale;

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint — no light/dark flash. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased">
        <ThemeProvider defaultTheme={initialTheme}>
          <MotionProvider>
            {/* Anonymous, first-party traffic counter for Admin → Analytics. */}
            <SiteTracker />
            {children}
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
