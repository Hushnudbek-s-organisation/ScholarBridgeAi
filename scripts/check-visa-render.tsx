import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { VisaSpeakingAssistant } from "@/components/VisaSpeakingAssistant";
import type { StudentProfile } from "@/components/Navbar";
import en from "@/i18n/messages/en.json";
import uz from "@/i18n/messages/uz.json";
import ru from "@/i18n/messages/ru.json";

const locales = { en, uz, ru } as const;
const baseProfile = {
  id: 1,
  name: "Visa render fixture",
  email: "fixture@example.invalid",
  degreeLevel: "Bachelor",
  targetMajor: "Computer Science",
  gpa: null,
  gpaScale: null,
  budgetAnnualUsd: null,
  needScholarship: false,
} as const;
const preferredCountryCases: unknown[] = [
  '["United States", "Germany"]',
  "United States, Germany",
  "United States; Germany",
  null,
  "",
  "{malformed json}",
  { unexpected: "shape" },
  ["United States", 42, null],
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

for (const [locale, messages] of Object.entries(locales)) {
  for (const preferredCountries of preferredCountryCases) {
    const profile = { ...baseProfile, preferredCountries } as unknown as StudentProfile;
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        onError={() => {}}
        getMessageFallback={({ namespace, key }) => `${namespace ?? ""}.${key}`}
      >
        <VisaSpeakingAssistant activeProfile={profile} />
      </NextIntlClientProvider>,
    );
    assert(markup.length > 5_000, `${locale}: setup screen rendered no useful markup`);
    assert(!markup.includes("visa."), `${locale}: setup screen leaked an unresolved translation key`);
  }
}

console.log(`Visa setup SSR passed: ${Object.keys(locales).length * preferredCountryCases.length} locale/profile cases.`);
