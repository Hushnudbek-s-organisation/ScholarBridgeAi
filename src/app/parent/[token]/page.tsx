import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { ParentShareView } from "@/components/ParentShareView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared student summary | ScholarBridgeAI",
  description: "A student-shared, read-only application summary.",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

/** Human-facing view for the revocable bearer link created by /api/parent-share. */
export default async function ParentSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const storedLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const initialLocale = storedLocale && isLocale(storedLocale) ? storedLocale : defaultLocale;

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <ParentShareView key={token} token={token} />
    </LocaleProvider>
  );
}
