import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { clientMessagesFor } from "@/i18n/messages.server";
import { CertificateVerifyView } from "./verify-view";

export const metadata: Metadata = {
  title: "Verify certificate",
  description: "Public verification of ScholarBridge course certificates by code.",
};

export const dynamic = "force-dynamic";

/**
 * Public certificate verification (audit A22).
 *
 * Anyone — an employer, an advisor, a parent — can open
 * `/certificates/<code>` (shared from the student's "My certificates" panel)
 * and see whether the certificate really exists, who earned it and for which
 * course. The data comes from the existing `/api/certificates/verify`
 * endpoint; this page is the human face of it.
 */
export default async function CertificateVerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const initialLocale = stored && isLocale(stored) ? stored : defaultLocale;
  return (
    <LocaleProvider initialLocale={initialLocale} initialMessages={clientMessagesFor(initialLocale)}>
      <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl">
          <CertificateVerifyView code={code} />
        </div>
      </div>
    </LocaleProvider>
  );
}
