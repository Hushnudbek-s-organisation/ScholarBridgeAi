export const destinations = [
  { country: "US", locale: "en-US", flag: "🇺🇸" },
  { country: "DE", locale: "de-DE", flag: "🇩🇪" },
  { country: "CA", locale: "en-CA", flag: "🇨🇦" },
  { country: "KR", locale: "ko-KR", flag: "🇰🇷" },
  { country: "AU", locale: "en-AU", flag: "🇦🇺" },
  { country: "SG", locale: "en-SG", flag: "🇸🇬" },
  { country: "JP", locale: "ja-JP", flag: "🇯🇵" },
  { country: "GB", locale: "en-GB", flag: "🇬🇧" },
  { country: "FR", locale: "fr-FR", flag: "🇫🇷" },
  { country: "TR", locale: "tr-TR", flag: "🇹🇷" },
  { country: "AE", locale: "ar-AE", flag: "🇦🇪" },
] as const;

export const speakerProfiles = {
  calm: { rate: 0.88, pitch: 1, prompt: "Speak calmly at a steady pace. Be patient and easy to follow." },
  fast: { rate: 1.28, pitch: 1.06, prompt: "Speak as a quick, energetic local. Use short phrases and natural contractions." },
  irritated: { rate: 1.04, pitch: 0.86, prompt: "Sound irritated and impatient but keep it playful and civil. Be direct and brisk, never insulting or threatening." },
};

export type SpeakerStyle = keyof typeof speakerProfiles;

const prompts: Record<string, [opening: string, followUps: [string, string, string], question: string]> = {
  en: ["Hey! What’s on your mind today?", ["Tell me a bit more about that.", "How do you feel about it?", "What happened next?"], "Good question. What do you think?"],
  "en-GB": ["Hiya! What d’you fancy chatting about?", ["Go on, tell me a bit more.", "How do you feel about it?", "What happened after that, then?"], "Good question. What do you reckon?"],
  de: ["Hi! Worüber möchtest du heute quatschen?", ["Erzähl mal ein bisschen mehr.", "Wie findest du das?", "Und was ist dann passiert?"], "Gute Frage. Was meinst du?"],
  fr: ["Salut ! De quoi tu veux parler aujourd’hui ?", ["Vas-y, raconte-moi un peu plus.", "T’en penses quoi ?", "Et après, qu’est-ce qui s’est passé ?"], "Bonne question. À ton avis ?"],
  ja: ["こんにちは！今日は何について話そうか？", ["もう少し聞かせて。", "それについてどう思う？", "それで、そのあとどうなったの？"], "いい質問だね。どう思う？"],
  ko: ["안녕! 오늘은 무슨 얘기 할까?", ["좀 더 얘기해 줘.", "그건 어떻게 생각해?", "그다음엔 무슨 일이 있었어?"], "좋은 질문이네. 넌 어떻게 생각해?"],
  tr: ["Selam! Bugün ne hakkında konuşalım?", ["Biraz daha anlatsana.", "Bu konuda ne düşünüyorsun?", "Peki sonra ne oldu?"], "Güzel soru. Sence nasıl?"],
  ar: ["هلا! عن شو تبا تسولف اليوم؟", ["خبرني أكثر.", "شو رايك في هالموضوع؟", "وعقب شو صار؟"], "سؤال حلو. شو رايك إنت؟"],
};

const impatientOpenings: Record<string, string> = {
  en: "Well? What do you want to talk about?",
  de: "Na? Worüber willst du reden?",
  fr: "Bon, alors ? De quoi tu veux parler ?",
  ja: "で、何の話をしたいの？",
  ko: "그래서, 무슨 얘기 할 건데?",
  tr: "Ee, ne konuşacağız?",
  ar: "ها، عن شو بتتكلم؟",
};

export function practicePrompt(locale: string, style: SpeakerStyle, turn = 0, input = "") {
  const [opening, followUps, question] = prompts[locale] ?? prompts[locale.split("-")[0]] ?? prompts.en;
  if (turn === 0) return style === "irritated" ? impatientOpenings[locale.split("-")[0]] ?? opening : opening;
  if (/[?？؟]\s*$/u.test(input) && turn % 2 === 1) return question;
  return followUps[(turn - 1) % followUps.length];
}
