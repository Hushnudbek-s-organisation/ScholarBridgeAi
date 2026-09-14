import type { Metadata } from "next";
import Link from "next/link";
import { BrandingImage } from "@/components/BrandingImage";

export const metadata: Metadata = {
  title: "Terms of Service | ScholarBridgeAI",
  description: "Terms of Service for ScholarBridgeAI — study abroad matching platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-sm border border-slate-200">
              <BrandingImage alt="ScholarBridgeAI Logo" className="h-8 w-8 object-cover" />
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Terms of Service</h1>
          <p className="mt-2 text-xs text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} • Effective for all users of ScholarBridgeAI</p>

          <div className="mt-8 space-y-8 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-base font-extrabold text-slate-900">1. Description of Service</h2>
              <p className="mt-2">
                ScholarBridgeAI is an AI-powered study-abroad platform that helps international students discover universities and scholarships matching their academic profile. The service includes:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>University matching based on GPA, IELTS/TOEFL, SAT/GRE, budget, and preferred countries.</li>
                <li>Scholarship discovery and eligibility scoring (DAAD, Chevening, Erasmus Mundus, Fulbright, etc.).</li>
                <li>Application tracking, deadline center, document checklist, and personalized roadmap.</li>
                <li>AI tools for Statement of Purpose (SOP) drafting, review, and profile evaluation.</li>
                <li>Community forum, video courses, referral rewards, and consulting requests.</li>
              </ul>
              <p className="mt-2">
                ScholarBridgeAI is currently in prototype / early-access stage. Features and availability may change as we improve the product.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">2. Free vs Premium Tiers</h2>
              <p className="mt-2">
                <strong>Free tier:</strong> Creating a profile, browsing universities and scholarships, viewing match scores, and saving shortlists are free. No credit card is required to start.
              </p>
              <p className="mt-2">
                <strong>Premium tier:</strong> AI SOP Studio (drafting, evaluation, review), Tasks & Roadmap generation, Deadline Center, Community Forum, Video Courses with certificates, and priority support are Premium-only features. Premium is offered as a subscription and may also be granted temporarily via referral rewards (e.g., 30 days for every 5 friends who join and complete their profile).
              </p>
              <p className="mt-2">
                We may introduce additional Premium benefits over time. Prices and entitlements are shown at checkout and in the app&apos;s Premium section.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">3. Subscription Billing via Payme / Click</h2>
              <p className="mt-2">
                Premium subscriptions are billed through supported payment providers in Uzbekistan, including Payme and Click. By purchasing Premium, you agree to:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Provide accurate payment information and authorize charges for the selected plan.</li>
                <li>Pay in UZS (Uzbekistani Som) unless otherwise displayed; currency conversion may apply via your provider.</li>
                <li>Automatic renewal if you choose a recurring plan — you will be notified before renewal where required by the payment provider.</li>
              </ul>
              <p className="mt-2">
                Payment processing is handled by Payme and Click; ScholarBridgeAI does not store full card numbers. Receipts are available in Payment History.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">4. Refund Policy</h2>
              <p className="mt-2">
                Premium subscriptions can be canceled anytime from the app or by contacting support. Our refund policy is:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong>Monthly plans:</strong> Unused days are not refunded after the subscription period has started. If you cancel, you retain Premium access until the end of the current billing period.</li>
                <li><strong>Referral-granted Premium:</strong> Free Premium earned via referrals is non-refundable and non-transferable.</li>
                <li><strong>Duplicate or failed charges:</strong> If you were charged twice or a payment failed but was debited, contact us at support@scholarbridgeai.com within 14 days with your payment ID for review.</li>
              </ul>
              <p className="mt-2">
                As a small early-stage team, we aim to be fair — if you believe a charge was made in error, please reach out and we will review case by case.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">5. User Responsibilities</h2>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>You are responsible for the accuracy of all data you enter, including name, email, GPA, GPA scale, IELTS/TOEFL/SAT/GRE scores, budget, preferred countries, work experience, and publications.</li>
                <li>Intentionally providing false academic credentials to inflate match scores is prohibited and may result in suspension.</li>
                <li>You must not use the platform to scrape, copy, or redistribute university/scholarship data at scale, nor to harass other users in the forum.</li>
                <li>You must be at least 16 years old to create an account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">6. Disclaimer — No Guarantee of Admission</h2>
              <p className="mt-2">
                Match scores, eligibility percentages, Reach / Match / Safety labels, and AI-drafted SOP content are <strong>guidance only</strong> and not a guarantee of admission, scholarship award, or visa approval. Admissions decisions are made solely by universities and scholarship committees based on their own criteria, which can change at any time.
              </p>
              <p className="mt-2">
                We source university and scholarship information from official pages where possible and link each result to its origin via our <em>sources</em> tables, showing a &quot;Source&quot; link and &quot;Last verified&quot; date on each card. If no verified source is linked yet, we display &quot;Source: pending verification&quot;. Always confirm critical details (deadlines, tuition, requirements) on the official university or scholarship website before applying.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">7. Limitation of Liability</h2>
              <p className="mt-2">
                To the maximum extent permitted by law, ScholarBridgeAI is provided &quot;as is&quot; without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or that all data is complete or up to date. In no event shall ScholarBridgeAI, its founders, or affiliates be liable for indirect, incidental, consequential, or punitive damages, or loss of data, opportunity, or admission, arising from your use of the service. Our total liability for any claim shall not exceed the amount you paid for Premium in the 3 months preceding the claim, or $50 if you are on the Free tier.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">8. Governing Law</h2>
              <p className="mt-2">
                These Terms are governed by the laws of the Republic of Uzbekistan. Any disputes arising out of or related to these Terms or the service shall be resolved in the courts of Tashkent, Uzbekistan, unless otherwise required by mandatory local law. We will attempt to resolve disputes informally via email before formal proceedings.
              </p>
            </section>

            <section>
              <h2 className="text-base font-extrabold text-slate-900">9. Contact</h2>
              <p className="mt-2">
                For questions about these Terms, billing, or general support, contact us at:
              </p>
              <p className="mt-2 font-semibold">
                Email: support@scholarbridgeai.com<br />
                Legal inquiries: legal@scholarbridgeai.com
              </p>
              <p className="mt-2">
                We also provide links to our <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline">Privacy Policy</Link> in the footer and during signup.
              </p>
            </section>

            <section className="pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                By continuing to use ScholarBridgeAI, creating a profile, or clicking &quot;Start for free&quot;, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use the service.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} ScholarBridgeAI • Democratizing Global Higher Education Access</p>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="font-bold text-slate-700 underline underline-offset-4">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-800 underline underline-offset-4">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
