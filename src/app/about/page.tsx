import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { publicMessagesFor } from "@/i18n/messages.server";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";

const copy = {
  en: {
    title: "Catalogue methodology",
    sections: [
      ["Official sources", "We use university admissions pages and scholarship providers as sources. Check the source on each record for the current application round."],
      ["Scope", "Fees and entry requirements may differ by intake, programme and applicant category. We show the scope when it is published."],
      ["Unknown values", "A missing price or minimum score means we do not have confirmed data for that field."],
      ["Matching", "Use the catalogue to shortlist options and review the official requirements before applying."],
    ],
  },
  uz: {
    title: "Katalog metodologiyasi",
    sections: [
      ["Rasmiy manbalar", "Universitetlarning qabul sahifalari va grant tashkilotchilariga tayanamiz. Joriy ariza davrini kartadagi manbadan tekshiring."],
      ["Qamrov", "Kontrakt va talablar qabul davri, dastur va abituriyent toifasiga qarab farq qilishi mumkin. E’lon qilingan doira kartada ko‘rsatiladi."],
      ["Noma’lum qiymatlar", "Narx yoki minimal ball ko‘rsatilmagan bo‘lsa, shu maydon bo‘yicha tasdiqlangan ma’lumotimiz yo‘q."],
      ["Moslik", "Katalogdan variantlarni saralash uchun foydalaning. Ariza topshirishdan oldin rasmiy talablarni tekshiring."],
    ],
  },
  ru: {
    title: "Методология каталога",
    sections: [
      ["Официальные источники", "Мы используем страницы приёма университетов и сайты организаторов стипендий. Сроки текущего набора проверяйте по ссылке в карточке."],
      ["Область применения", "Стоимость и требования зависят от набора, программы и категории поступающего. Мы указываем область применения, если она опубликована."],
      ["Отсутствующие данные", "Если стоимость или минимальный балл отсутствуют, подтверждённого значения в каталоге пока нет."],
      ["Подбор", "Используйте каталог для короткого списка и сверяйтесь с официальными требованиями перед подачей."],
    ],
  },
};

async function getLocale() {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: copy[await getLocale()].title };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const content = copy[locale];
  return (
    <LocaleProvider initialLocale={locale} initialMessages={publicMessagesFor(locale)}>
      <PublicCatalogHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 text-slate-900 dark:text-slate-100">
        <h1 className="mb-6 text-3xl font-bold">{content.title}</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {content.sections.map(([title, text]) => (
            <section key={title} className="rounded-overlay border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-2 text-lg font-semibold">{title}</h2>
              <p>{text}</p>
            </section>
          ))}
        </div>
      </main>
    </LocaleProvider>
  );
}
