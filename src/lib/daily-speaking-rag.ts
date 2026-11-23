/**
 * Selected entries from the Scholly Angry / Sarcastic RAG.
 * Only use reactions to a situation. The learner’s answer is never the target.
 */
const reactions = {
  mild: [
    { id: "mild-01", text: "Oh, come on!" },
    { id: "mild-13", text: "Good grief!" },
    { id: "medium-07", text: "My patience just left the chat." },
    { id: "max-08", text: "I can feel my imaginary circuits screaming!" },
  ],
  explicit: [
    { id: "strong-03", text: "Holy shit, that was chaos!" },
    { id: "strong-05", text: "Fuck, we were SO close!" },
    { id: "strong-12", text: "Shit! I lost my train of thought." },
    { id: "strong-18", text: "I am one mistake away from turning into a damn volcano." },
  ],
} as const;

const localizedReactions: Record<string, string[]> = {
  de: ["Ach, komm schon!", "Was für ein Chaos!"],
  fr: ["Oh, allez !", "Quel bazar !"],
  ja: ["もう、勘弁してよ！", "なんてドタバタなんだ！"],
  ko: ["아, 정말!", "완전 난리네!"],
  tr: ["Hadi ama!", "Bu ne biçim karmaşa!"],
  ar: ["يا ساتر!", "شو هالفوضى!"],
  uz: ["Obbo, yana shumi?!", "Voy dod, shunaqa ham bo‘ladimi?!"],
};

const optOutCommands = /^(?:please[,. ]*)?(?:stop(?: it| swearing| cursing| roasting| joking)?|(?:please )?be (?:calm|nice|respectful)|(?:no|without) (?:swearing|profanity|cursing)|calm mode|to[‘’ʻ'g-]?xta(?:ng)?|so[‘’ʻ'g-]?kin rejim|хватит|без мата|спокойный режим|arrête|sans jurons|hör auf|nicht fluchen|やめて|그만|küfür etme|توقف)[.!?\s]*$/iu;
const needsCare = /\b(?:i(?: am|'m|’m) (?:only |just )?\d{1,2}(?: years? old)?|i need help|i don['’]t (?:understand|get it)|i am confused|i(?:'m|’m| am) (?:struggling|scared|upset|depressed)|help me|serious(?:ly)?|sick|hospital|hurt|bully(?:ing)?|death|grief|abuse|self[- ]harm|suicid\w*|bereavement|mental health)\b|tushunmadim|yordam kerak|yordam bering|помогите|не понимаю|je ne comprends pas|ich verstehe nicht|わかりません|모르겠어요|anlamadım|لا أفهم/iu;
const playfulCue = /\b(?:joke|joking|prank|banter|silly|goofy|ridiculous|chaos|plot twist|cartoon|lol|lmao|haha|that was wild|over the top)\b|hazil|шутка|haha|😂|🤣/iu;

export const optedOutOfAnger = (input: string) => optOutCommands.test(input.trim());

export function retrieveSpeakingReaction(locale: string, input: string, turn: number, lastReactionTurn: number, explicit: boolean) {
  if (!playfulCue.test(input) || needsCare.test(input) || optedOutOfAnger(input) || turn - lastReactionTurn < 3) return null;
  const language = locale.toLowerCase().split("-")[0];
  if (language === "en") {
    const bank = explicit ? reactions.explicit : reactions.mild;
    return { ...bank[(turn - 1) % bank.length], emotion: "angry" as const };
  }
  const bank = localizedReactions[language];
  return bank ? { id: `${language}-playful-${turn % bank.length}`, text: bank[(turn - 1) % bank.length], emotion: "angry" as const } : null;
}

export function needsCalmSpeaking(input: string) {
  return optedOutOfAnger(input) || needsCare.test(input);
}
