import type { Locale } from "@/i18n/config";

export const WARDROBE_SLOTS = ["body", "eyes", "aura", "bubble"] as const;
export type WardrobeSlot = typeof WARDROBE_SLOTS[number];
export type WardrobeRarity = "common" | "rare" | "epic" | "legendary";
export type SchollyOutfit = Partial<Record<WardrobeSlot, string>>;
type Labels = Record<Locale, string>;
export type WardrobeUnlock =
  | { type: "default" }
  | { type: "buy"; price: number }
  | { type: "streak" | "level"; value: number }
  | { type: "season"; start: string; end: string; missions: number };

type WardrobeItem = {
  slot: WardrobeSlot;
  key: string;
  label: Labels;
  rarity: WardrobeRarity;
  unlock: WardrobeUnlock;
  color?: string;
};

const included = { type: "default" } as const;
const buy = (price: number) => ({ type: "buy", price }) as const;
const streak = (value: number) => ({ type: "streak", value }) as const;
const level = (value: number) => ({ type: "level", value }) as const;

export const SCHOLLY_WARDROBE: readonly WardrobeItem[] = [
  { slot: "body", key: "blue", label: { uz: "Ko‘k", ru: "Синий", en: "Blue" }, rarity: "common", unlock: included, color: "#2F6BFF" },
  { slot: "body", key: "purple", label: { uz: "Binafsha", ru: "Фиолетовый", en: "Purple" }, rarity: "common", unlock: buy(100), color: "#8B5CF6" },
  { slot: "body", key: "green", label: { uz: "Yashil", ru: "Зелёный", en: "Green" }, rarity: "common", unlock: buy(100), color: "#22C58B" },
  { slot: "body", key: "orange", label: { uz: "To‘q sariq", ru: "Оранжевый", en: "Orange" }, rarity: "common", unlock: buy(150), color: "#FF8A3D" },
  { slot: "body", key: "pink", label: { uz: "Pushti", ru: "Розовый", en: "Pink" }, rarity: "common", unlock: buy(150), color: "#FF6FB5" },
  { slot: "body", key: "silver", label: { uz: "Kumush", ru: "Серебряный", en: "Silver" }, rarity: "rare", unlock: buy(300), color: "#C9D3E3" },
  { slot: "body", key: "gold", label: { uz: "Oltin", ru: "Золотой", en: "Gold" }, rarity: "legendary", unlock: streak(30), color: "#F5C542" },
  { slot: "body", key: "night", label: { uz: "Tungi qora", ru: "Ночной", en: "Midnight" }, rarity: "epic", unlock: level(5), color: "#1B1F33" },
  { slot: "eyes", key: "cyan", label: { uz: "Moviy", ru: "Голубой", en: "Cyan" }, rarity: "common", unlock: included, color: "#4FC3FF" },
  { slot: "eyes", key: "green", label: { uz: "Yashil", ru: "Зелёный", en: "Green" }, rarity: "common", unlock: buy(50), color: "#4DF0A6" },
  { slot: "eyes", key: "orange", label: { uz: "To‘q sariq", ru: "Оранжевый", en: "Orange" }, rarity: "common", unlock: buy(50), color: "#FFA94D" },
  { slot: "eyes", key: "pink", label: { uz: "Pushti", ru: "Розовый", en: "Pink" }, rarity: "common", unlock: buy(50), color: "#FF7AC6" },
  { slot: "eyes", key: "rainbow", label: { uz: "Kamalak", ru: "Радуга", en: "Rainbow" }, rarity: "epic", unlock: streak(7), color: "#FF5E5E" },
  { slot: "aura", key: "soft", label: { uz: "Yumshoq nur", ru: "Мягкий свет", en: "Soft glow" }, rarity: "common", unlock: buy(150), color: "#7FA8FF" },
  { slot: "aura", key: "stars", label: { uz: "Yulduzlar", ru: "Звёзды", en: "Stars" }, rarity: "rare", unlock: buy(200), color: "#FFE9A8" },
  { slot: "aura", key: "rocket", label: { uz: "Raketa izi", ru: "След ракеты", en: "Rocket trail" }, rarity: "rare", unlock: buy(300), color: "#FF8A3D" },
  { slot: "aura", key: "fire", label: { uz: "Olov", ru: "Огонь", en: "Fire" }, rarity: "epic", unlock: streak(14), color: "#FF9F1C" },
  { slot: "aura", key: "snow", label: { uz: "Qor", ru: "Снег", en: "Snow" }, rarity: "rare", unlock: { type: "season", start: "12-01", end: "02-28", missions: 3 }, color: "#CFE8FF" },
  { slot: "aura", key: "nowruz", label: { uz: "Navro‘z gullari", ru: "Цветы Навруза", en: "Nowruz petals" }, rarity: "rare", unlock: { type: "season", start: "03-15", end: "04-05", missions: 3 }, color: "#FF7AA2" },
  { slot: "bubble", key: "round", label: { uz: "Yumaloq", ru: "Круглый", en: "Rounded" }, rarity: "common", unlock: included },
  { slot: "bubble", key: "pixel", label: { uz: "Piksel", ru: "Пиксели", en: "Pixel" }, rarity: "common", unlock: buy(100) },
  { slot: "bubble", key: "comic", label: { uz: "Komiks", ru: "Комикс", en: "Comic" }, rarity: "common", unlock: buy(100) },
];

export const DEFAULT_SCHOLLY_OUTFIT: Readonly<SchollyOutfit> = { body: "blue", eyes: "cyan", bubble: "round" };
export const STARTER_SCHOLLY_COLORS = ["purple", "green"] as const;
export const SCHOLLY_LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000] as const;
export const SCHOLLY_RAINBOW = ["#FF5E5E", "#FFD93D", "#4DF0A6", "#4FC3FF", "#B388FF"] as const;

export const wardrobeId = (item: Pick<WardrobeItem, "slot" | "key">) => `${item.slot}:${item.key}`;
export const wardrobeItem = (slot: unknown, key: unknown) => SCHOLLY_WARDROBE.find(item => item.slot === slot && item.key === key);

export function sanitizeSchollyOutfit(value: unknown): SchollyOutfit {
  const outfit: SchollyOutfit = { ...DEFAULT_SCHOLLY_OUTFIT };
  if (!value || typeof value !== "object") return outfit;
  const stored = value as Record<string, unknown>;
  for (const slot of WARDROBE_SLOTS) {
    const item = wardrobeItem(slot, stored[slot]);
    if (item) outfit[slot] = item.key;
  }
  return outfit;
}

export type WardrobeSnapshot = {
  outfit: SchollyOutfit;
  owned: string[];
  balance: number;
  lifetimePoints: number;
  starterAvailable: boolean;
};

export function schollySeason(day: string, unlock: Extract<WardrobeUnlock, { type: "season" }>) {
  const year = Number(day.slice(0, 4));
  const wraps = unlock.start > unlock.end;
  const startYear = wraps && day.slice(5) <= unlock.end ? year - 1 : year;
  const start = `${startYear}-${unlock.start}`;
  const end = `${startYear + Number(wraps)}-${unlock.end}`;
  return day >= start && day <= end ? { start, end } : null;
}

export function schollyPalette(outfit: SchollyOutfit = DEFAULT_SCHOLLY_OUTFIT) {
  const bodyItem = wardrobeItem("body", outfit.body);
  const main = bodyItem?.color ?? "#2F6BFF";
  const eye = wardrobeItem("eyes", outfit.eyes)?.color ?? "#4FC3FF";
  if (bodyItem?.key === "night") return { main, shade: "#11142A", highlight: "#3A4170", eye };
  if (main === "#2F6BFF") return { main, shade: "#1D3FA8", highlight: "#8DB4FF", eye };

  const [r, g, b] = [1, 3, 5].map(start => Number.parseInt(main.slice(start, start + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const light = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  const hue = delta === 0 ? 0 : 60 * ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) + 6) % 360;
  const hsl = (s: number, l: number) => `hsl(${hue.toFixed(1)}, ${Math.max(0, Math.min(100, s)).toFixed(1)}%, ${Math.max(0, Math.min(100, l)).toFixed(1)}%)`;
  return { main, shade: hsl(saturation * 100, light * 100 - 18), highlight: hsl(saturation * 100 - 8, light * 100 + 22), eye };
}
