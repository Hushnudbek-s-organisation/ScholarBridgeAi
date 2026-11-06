/**
 * Rendered-copy regression — not just i18n key parity.
 *
 * The landing FAQ and testimonials used to be hardcoded (Uzbek-only / mixed
 * English), and the testimonials claimed verified admission outcomes. This
 * renders both sections through the real provider for en/uz/ru and checks the
 * text a visitor actually sees.
 *
 * Run: npm run test:landing-copy
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { PremiumFAQ } from "../src/components/landing/PremiumFAQ";
import { PremiumTestimonials } from "../src/components/landing/PremiumTestimonials";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

const expectations: Record<string, { faq: RegExp; demo: RegExp; quote: RegExp; notEnglishOnly: RegExp }> = {
  en: {
    faq: /Does ScholarBridge guarantee a grant\?/,
    demo: /DEMO EXAMPLE/,
    quote: /I compared the published tuition/,
    notEnglishOnly: /guarantee a grant/,
  },
  uz: {
    faq: /grant kafolatlaydimi/,
    demo: /DEMO NAMUNA/,
    quote: /e’lon qilingan kontrakt/,
    notEnglishOnly: / grant kafolatlaydimi/,
  },
  ru: {
    faq: /гарантирует грант/,
    demo: /ДЕМО-ПРИМЕР/,
    quote: /опубликованные суммы обучения/,
    notEnglishOnly: /гарантирует грант/,
  },
};

console.log("\nLocalization — rendered landing copy in en / uz / ru");

for (const locale of ["en", "uz", "ru"] as const) {
  const messages = JSON.parse(read(`src/i18n/messages/${locale}.json`));
  const render = (component: React.ComponentType) => renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {React.createElement(component)}
    </NextIntlClientProvider>,
  );
  const faq = render(PremiumFAQ);
  const testimonials = render(PremiumTestimonials);
  const exp = expectations[locale];

  check(`${locale}: the FAQ is rendered in the active locale`, () => {
    assert.match(faq, exp.faq);
    assert.match(faq, exp.notEnglishOnly);
  });

  check(`${locale}: the FAQ no longer claims every university is verified`, () => {
    assert.doesNotMatch(faq, /Har bir universitet|every university.*verified|Каждый университет.*проверен/i);
    assert.match(faq, locale === "en" ? /review-needed|Some rows/ : locale === "uz" ? /ko‘rib chiqish kerak|tasdiqlanmagan/ : /требующие проверки|непроверенные/);
  });

  check(`${locale}: testimonials are explicitly a demo, not a verified outcome`, () => {
    assert.match(testimonials, exp.demo);
    assert.match(testimonials, exp.quote);
    assert.doesNotMatch(testimonials, /Admitted 2025|full grant|I got into KAIST|saved me \$2k|Har bir hikoya tekshirilgan|Каждая история проверена/i);
  });

  check(`${locale}: no untranslated legacy strings reach the page`, () => {
    assert.doesNotMatch(faq + testimonials, /Ko‘p so‘raladigan savollar.*Shubhangiz|Talabalar fikri|Ishonch qozongan natijalar/i);
    assert.doesNotMatch(faq + testimonials, /“ScholarBridge made my SOP|“The chancing fit/);
  });
}

check("the component sources contain no hardcoded visitor-facing FAQ/testimonial copy", () => {
  const faqSource = read("src/components/landing/PremiumFAQ.tsx");
  const testimonialSource = read("src/components/landing/PremiumTestimonials.tsx");
  assert.match(faqSource, /useTranslations\("landing"\)/);
  assert.match(testimonialSource, /useTranslations\("landing"\)/);
  assert.doesNotMatch(faqSource, /kafolatlaydimi|Does ScholarBridge guarantee/);
  assert.doesNotMatch(testimonialSource, /KAIST|Admitted 2025|got into/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
