"use client";

import React from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/config";

interface FaqItem {
  question: string;
  answer: string;
}

const copy: Record<Locale, { title: string; intro: string; items: FaqItem[] }> = {
  en: {
    title: "Frequently asked questions",
    intro: "A practical guide to using ScholarBridge for your study-abroad planning.",
    items: [
      { question: "What does ScholarBridge help me do?", answer: "ScholarBridge brings your study goals, university research, applications, documents and planning tools together. Recommendations depend on the information in your profile and are a starting point for your own research—not an admission or funding decision." },
      { question: "Are fit scores or readiness percentages admission probabilities?", answer: "No. They summarize selected profile details or checklist progress. They are not probabilities, guarantees or an assessment by a university. Admissions decisions depend on each institution and applicant pool." },
      { question: "How do I know if a scholarship is open to me?", answer: "Eligibility can depend on citizenship, degree level, course, financial need and the application cycle. Review the current official scholarship page before relying on a listing; contact the provider if an important condition is unclear." },
      { question: "Can I rely on the costs and deadlines shown here?", answer: "Use them for planning, not as a substitute for an official fee schedule or application portal. Costs, exchange rates and deadlines can change; check the university or award provider's current source before making a payment or submitting an application." },
    ],
  },
  uz: {
    title: "Ko‘p so‘raladigan savollar",
    intro: "ScholarBridge orqali xorijda o‘qishni rejalashtirish bo‘yicha qisqa qo‘llanma.",
    items: [
      { question: "ScholarBridge menga nimalarda yordam beradi?", answer: "ScholarBridge o‘qish maqsadlari, universitet izlash, arizalar, hujjatlar va rejalashtirish vositalarini bir joyga jamlaydi. Tavsiyalar profilingizdagi ma’lumotlarga asoslangan boshlang‘ich yo‘nalishdir — ular qabul yoki moliyalashtirish qarori emas." },
      { question: "Moslik balli yoki tayyorgarlik foizi qabul ehtimolini bildiradimi?", answer: "Yo‘q. Bu ko‘rsatkichlar ayrim profil ma’lumotlari yoki ro‘yxatdagi bajarilgan ishlarni umumlashtiradi. Ular ehtimol, kafolat yoki universitet bahosi emas. Qabul qarori har bir universitet va arizachilar guruhiga bog‘liq." },
      { question: "Grant menga mos kelishini qanday bilaman?", answer: "Talablar fuqarolik, ta’lim bosqichi, yo‘nalish, moliyaviy ehtiyoj va ariza davriga qarab farq qilishi mumkin. Ma’lumotga tayanishdan oldin grantning amaldagi rasmiy sahifasini tekshiring; muhim shart tushunarsiz bo‘lsa, grant tashkilotchisiga murojaat qiling." },
      { question: "Saytdagi xarajat va muddatlarga to‘liq ishonsam bo‘ladimi?", answer: "Ulardan rejalashtirish uchun foydalaning, ammo rasmiy to‘lov jadvali yoki ariza portalining o‘rniga emas. Xarajatlar, valyuta kurslari va muddatlar o‘zgarishi mumkin; to‘lov yoki ariza yuborishdan oldin universitet yoki grant tashkilotchisining joriy manbasini tekshiring." },
    ],
  },
  ru: {
    title: "Часто задаваемые вопросы",
    intro: "Краткое руководство по планированию обучения за рубежом с ScholarBridge.",
    items: [
      { question: "Чем помогает ScholarBridge?", answer: "ScholarBridge объединяет учебные цели, поиск университетов, заявки, документы и инструменты планирования. Рекомендации основаны на данных вашего профиля и служат отправной точкой для самостоятельного поиска — это не решение о зачислении или финансировании." },
      { question: "Означают ли баллы соответствия или готовности вероятность поступления?", answer: "Нет. Эти показатели суммируют отдельные данные профиля или выполненные пункты списка. Это не вероятность, гарантия и не оценка университета. Решение о зачислении зависит от конкретного вуза и состава заявителей." },
      { question: "Как узнать, могу ли я подать заявку на стипендию?", answer: "Условия могут зависеть от гражданства, уровня обучения, программы, финансовой потребности и цикла подачи. Перед тем как полагаться на описание, проверьте актуальную официальную страницу стипендии; если важное условие неясно, обратитесь к организатору." },
      { question: "Можно ли полагаться на указанные здесь расходы и сроки?", answer: "Используйте их для планирования, но не вместо официального тарифа или портала подачи заявок. Расходы, валютные курсы и сроки могут меняться; перед оплатой или отправкой заявки проверьте актуальный источник университета или организатора стипендии." },
    ],
  },
};

export function FaqSection() {
  const { locale } = useLocaleContext();
  const faq = copy[locale];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="mt-10" aria-label={faq.title}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
            <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{faq.title}</h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{faq.intro}</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {faq.items.map((item, idx) => (
            <details key={item.question} className="group rounded-xl border border-slate-200 bg-slate-50/50 transition-colors open:border-indigo-200 open:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:open:border-indigo-700 dark:open:bg-slate-900">
              <summary className="flex cursor-pointer list-none select-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <span className="w-6 shrink-0 text-xs font-extrabold text-indigo-700 dark:text-indigo-300">{String(idx + 1).padStart(2, "0")}</span>
                <h3 className="flex-1 text-sm font-bold text-slate-900 dark:text-white">{item.question}</h3>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180 dark:text-slate-300" aria-hidden />
              </summary>
              <p className="px-4 pb-4 pl-[52px] text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
