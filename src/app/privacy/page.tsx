import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ScholarBridgeAI",
  description: "Privacy Policy for ScholarBridgeAI — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-sm border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png"
                alt="ScholarBridgeAI Logo"
                className="h-8 w-8 object-cover"
              />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight">ScholarBridgeAI</span>
          </Link>
          <Link href="/" className="text-xs font-bold text-indigo-700 hover:text-indigo-900">
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-xs text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} • ScholarBridgeAI respects your privacy</p>

          <div className="mt-8 space-y-8 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-base font-extrabold text-slate-900">1. Overview</h2>
              <p className="mt-2">
                ScholarBridgeAI (&quot;we&quot;, &quot;us&quot;) helps students find universities and scholarships based on their academic profile. This Privacy Policy explains what personal data we collect, how we use it, and your rights. We keep the language plain because this is a prototype-stage product, but we aim to accurately describe what we actually do.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">2. What Personal Data We Collect</h2>
              <p className="mt-2">When you create a profile or use Premium, we collect:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong>Identity & contact:</strong> Full name, email address.</li>
                <li><strong>Academic profile:</strong> Degree level, target major, GPA and GPA scale, IELTS / TOEFL / SAT / GRE scores, work experience years, research publications, extracurriculars.</li>
                <li><strong>Preferences & financial:</strong> Budget annual USD, need-scholarship flag, preferred countries list.</li>
                <li><strong>Usage data:</strong> Saved universities/scholarships, application tasks, deadlines, documents, forum posts, course progress, AI chat history and SOP drafts.</li>
                <li><strong>Payment info:</strong> Amount, currency, provider (Payme / Click), transaction status, and subscription period. We do not store full card numbers — payments are processed by Payme and Click.</li>
                <li><strong>Technical:</strong> Preferred locale (en/uz/ru), referral code, device-linked profile IDs stored in localStorage for sign-in persistence.</li>
              </ul>
              <p className="mt-2">
                We do not intentionally collect sensitive categories like ethnicity, health, or political views.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">3. How We Use Your Data</h2>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong>Matching:</strong> GPA, test scores, budget, and preferred countries are used by our deterministic matching engine to rank universities and scholarships (Reach / Match / Safety) and to compute eligibility.</li>
                <li><strong>AI features:</strong> Your profile data, SOP drafts, and chat messages are sent to our AI provider (via OpenRouter / configured models) to generate SOP drafts, evaluate your profile, review essays, and answer counselor questions. AI usage is logged for cost control (ai_usage table) but prompts are not sold.</li>
                <li><strong>Communication:</strong> Email for account notifications, deadline reminders, scholarship openings, and support replies. You can manage in-app notification preferences.</li>
                <li><strong>Product improvement:</strong> Aggregated analytics (counts of profiles, saved items) to understand feature usage. No personal GPA or budget is shared publicly.</li>
                <li><strong>Referrals & gamification:</strong> Referral codes, points, and badges to reward community growth.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">4. What We Do NOT Do With Your Data</h2>
              <p className="mt-2">
                <strong>We do not sell your GPA, IELTS scores, budget, or any academic data to third parties.</strong> Those fields are used only for the matching algorithm and AI SOP features within ScholarBridgeAI. We do not sell your email list or provide it to advertisers. Payment data is handled by Payme / Click; we only store transaction status and amount.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">5. Data Storage — Supabase & Render.com</h2>
              <p className="mt-2">
                Your data is stored in a Postgres database hosted via Supabase (the database provider), and the application itself is hosted on Render.com. Both providers maintain their own security measures, encryption at rest, and access controls. Backups are managed by Supabase per its retention policy.
              </p>
              <p className="mt-2">
                AI provider credentials (OpenRouter, OpenAI, Anthropic, Gemini) are stored encrypted (AES-256-GCM, &quot;enc:v1:&quot; prefix) server-side and never returned by any API.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">6. How to Request Data Deletion</h2>
              <p className="mt-2">
                You have the right to access, correct, or delete your personal data:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong>In-app:</strong> Edit your profile via &quot;Edit Profile&quot; or remove saved universities/scholarships and tasks.</li>
                <li><strong>Email request:</strong> Send an email to <strong>privacy@scholarbridgeai.com</strong> from the email address associated with your profile with subject &quot;Data Deletion Request&quot; and include your profile ID or name. We will delete your student_profiles row and related saved data within 30 days, except where we must retain payment records for legal accounting purposes.</li>
                <li><strong>Local data:</strong> Clear your browser localStorage keys starting with &quot;scholarbridge_&quot; to remove device-linked profile IDs and referral storage.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">7. Cookies & Analytics</h2>
              <p className="mt-2">
                We use minimal cookies / localStorage:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong>Essential:</strong> scholarbridge_active_profile, scholarbridge_device_profiles, scholarbridge_ref (48h referral attribution), scholarbridge_locale.</li>
                <li><strong>Analytics (first-party, anonymous):</strong> we count visits with our own <code>sb_vid</code> cookie (a random id, valid 1 year) so we can see how many people visited, which sections they opened and where they came from. We store the page/section name, a shortened referrer domain, the browser user-agent string (only to separate bots and mobile/desktop) and — if you are signed in — your profile id. <strong>We never store your IP address</strong>, we use no third-party advertising cookies, and the counters are only visible to site administrators in aggregated form. Blocking the <code>sb_vid</code> cookie simply opts you out of the visit counter; the app keeps working normally.</li>
              </ul>
              <p className="mt-2">
                You can block cookies in your browser settings, but essential localStorage is needed to stay signed in and resume onboarding.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">8. Data Retention</h2>
              <p className="mt-2">
                We retain your profile and usage data as long as your account exists or until you request deletion. AI evaluations and chat history are kept to improve your experience but can be deleted upon request. Payment records are retained for up to 5 years for accounting and dispute resolution as required by Uzbek law.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">9. Children&apos;s Privacy</h2>
              <p className="mt-2">
                ScholarBridgeAI is not directed to children under 16. If you are under 16, please do not create a profile. If we learn that we have collected data from a child under 16, we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">10. Contact for Privacy Requests</h2>
              <p className="mt-2">
                For privacy questions, data access, or deletion requests, contact:
              </p>
              <p className="mt-2 font-semibold">
                Email: privacy@scholarbridgeai.com<br />
                Support: support@scholarbridgeai.com<br />
                Legal: legal@scholarbridgeai.com
              </p>
              <p className="mt-2">
                Please also review our <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 underline">Terms of Service</Link> for rules about Premium billing, refunds, and disclaimers.
              </p>
            </section>

            <section className="pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                This Privacy Policy may be updated as ScholarBridgeAI evolves from prototype to production. We will update the &quot;Last updated&quot; date and notify users via in-app notice for material changes. By using ScholarBridgeAI, you agree to this Privacy Policy and our Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} ScholarBridgeAI • Democratizing Global Higher Education Access</p>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-slate-800 underline underline-offset-4">Terms</Link>
            <Link href="/privacy" className="font-bold text-slate-700 underline underline-offset-4">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
