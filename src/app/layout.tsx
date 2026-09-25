import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteTracker } from "@/components/SiteTracker";
import { getBranding } from "@/lib/branding";

// The middleware sends a per-request nonce-based CSP. Next.js can only stamp
// that nonce on its <script> tags when the page is rendered per request —
// statically prerendered HTML has no nonce, so the browser blocks every
// script, React never hydrates and no button (Sign in / Get started) works.
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://scholarbridgeai-1.onrender.com";

export async function generateMetadata(): Promise<Metadata> {
  const { logo, favicon } = await getBranding();
  return {
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.json",
  // Google Search Console ownership verification (renders the
  // <meta name="google-site-verification" .../> tag in <head>).
  verification: {
    google: "EZ2ipQrYUQxTQEBlEGYcqAOfVHm6pc0oIm1BYkN2VTs",
  },
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-slate-100 text-slate-900 antialiased">
        {/* Anonymous, first-party traffic counter for Admin → Analytics. */}
        <SiteTracker />
        {children}
      </body>
    </html>
  );
}
