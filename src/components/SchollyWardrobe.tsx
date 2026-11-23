"use client";

import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { useEffect, useRef, useState } from "react";
import { Lock, RotateCcw, RotateCw, Sparkles, Shirt, Aperture, Backpack, Hand, Radio, MessageCircle, Move, Bot } from "lucide-react";
import type { Locale } from "@/i18n/config";
import {
  SCHOLLY_WARDROBE, SCHOLLY_COMPANIONS, SCHOLLY_OUTFIT_CHANGED, OPTIONAL_WARDROBE_SLOTS, STARTER_SCHOLLY_COLORS, WARDROBE_SLOTS, schollyPalette, wardrobeId,
  type SchollyCompanionId, type SchollyOutfit, type WardrobeSlot, type WardrobeSnapshot,
} from "@/lib/scholly-wardrobe";
import { SchollyModel } from "./SchollyModel";
import "./scholly-wardrobe.css";

const labels = {
  uz: {
    title: "Sozlash", hat: "Bosh kiyim", antenna: "Antenna", back: "Orqa", hand: "Qo‘l", motion: "Harakat", companions: "Yordamchilar", remove: "Yechish", turnLeft: "Chapga burish", turnRight: "O‘ngga burish", animate: "Harakatni ko‘rish", signature: "Bu yordamchi o‘z tana rangini saqlaydi.", body: "Tana", eyes: "Ko‘z", aura: "Aura", bubble: "Xabar",
    balance: "Balans", lifetime: "umumiy", count: (owned: number, total: number) => `${owned}/${total} ta`,
    purchase: (points: number) => `${points} ballga olish`, preview: "Sinab ko‘rish", stop: "Sinovni tugatish",
    equip: "Tanlash", equipped: "Tanlangan", removeAura: "Aurasiz", originalEyes: "Asl ko‘z rangi",
    level: (n: number) => `${n}-darajada ochiladi`, streak: (n: number) => `${n} kunlik streakda ochiladi`,
    season: (start: string, end: string, n: number) => `${start} – ${end} oralig‘ida ${n} ta missiya`,
    sample: "Salom!", loading: "Shkaf ochilyapti…", retry: "Qayta yuklash",
    unavailable: "Shkafni yuklab bo‘lmadi.", failed: "O‘zgarish saqlanmadi.", insufficient: "Ball yetarli emas.",
    starter: "Ilk rangni bepul olish",
  },
  en: {
    title: "Customize", hat: "Headwear", antenna: "Antenna", back: "Back", hand: "Handheld", motion: "Motion", companions: "Companions", remove: "Remove", turnLeft: "Rotate left", turnRight: "Rotate right", animate: "Play motion", signature: "This companion keeps its signature body color.", body: "Body", eyes: "Eyes", aura: "Aura", bubble: "Bubble",
    balance: "Balance", lifetime: "lifetime", count: (owned: number, total: number) => `${owned}/${total} owned`,
    purchase: (points: number) => `Buy for ${points} points`, preview: "Try on", stop: "End preview",
    equip: "Equip", equipped: "Equipped", removeAura: "No aura", originalEyes: "Original eye color",
    level: (n: number) => `Unlocks at level ${n}`, streak: (n: number) => `Unlocks at a ${n}-day streak`,
    season: (start: string, end: string, n: number) => `Complete ${n} missions from ${start} to ${end}`,
    sample: "Hi!", loading: "Opening wardrobe…", retry: "Reload",
    unavailable: "The wardrobe could not be loaded.", failed: "The change could not be saved.", insufficient: "Not enough points.",
    starter: "Claim your first color for free",
  },
  ru: {
    title: "Настроить", hat: "Головной убор", antenna: "Антенна", back: "На спину", hand: "В руку", motion: "Движение", companions: "Помощники", remove: "Снять", turnLeft: "Повернуть влево", turnRight: "Повернуть вправо", animate: "Показать движение", signature: "Корпус этого помощника сохраняет свой цвет.", body: "Корпус", eyes: "Глаза", aura: "Аура", bubble: "Реплика",
    balance: "Баланс", lifetime: "всего", count: (owned: number, total: number) => `${owned}/${total} в коллекции`,
    purchase: (points: number) => `Купить за ${points} б.`, preview: "Примерить", stop: "Закончить примерку",
    equip: "Выбрать", equipped: "Выбрано", removeAura: "Без ауры", originalEyes: "Исходный цвет глаз",
    level: (n: number) => `Откроется на уровне ${n}`, streak: (n: number) => `Откроется за серию из ${n} дней`,
    season: (start: string, end: string, n: number) => `Выполните задания (${n}) с ${start} по ${end}`,
    sample: "Привет!", loading: "Открываем гардероб…", retry: "Перезагрузить",
    unavailable: "Не удалось загрузить гардероб.", failed: "Не удалось сохранить изменение.", insufficient: "Недостаточно баллов.",
    starter: "Получить первый цвет бесплатно",
  },
};

export const schollyWardrobeTitle = (locale: Locale) => labels[locale].title;

const categoryIcons = {
  body: Bot, eyes: Aperture, hat: Shirt, antenna: Radio, back: Backpack, hand: Hand, aura: Sparkles, motion: Move, bubble: MessageCircle,
};

export function SchollyWardrobe({ profileId, locale, onEquip, studio = false }: {
  profileId: number;
  locale: Locale;
  onEquip: (outfit: SchollyOutfit) => void;
  studio?: boolean;
}) {
  const t = labels[locale];
  const [slot, setSlot] = useState<WardrobeSlot>("body");
  const [snapshot, setSnapshot] = useState<WardrobeSnapshot | null>(null);
  const [preview, setPreview] = useState<{ slot: WardrobeSlot; key: string } | null>(null);
  const [angle, setAngle] = useState(0);
  const [gesture, setGesture] = useState("");
  const turn = useRef(0);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const mutation = useRef<AbortController | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpoint = "/api/scholly/wardrobe";

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${endpoint}?profileId=${profileId}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error();
        const result = await response.json() as WardrobeSnapshot;
        if (controller.signal.aborted) return;
        setSnapshot(result);
        onEquip(result.outfit);
      })
      .catch(() => { if (!controller.signal.aborted) setError(t.unavailable); });
    return () => controller.abort();
  }, [onEquip, profileId, reload, t.unavailable]);

  useEffect(() => () => {
    mutation.current?.abort();
    if (previewTimer.current) clearTimeout(previewTimer.current);
  }, []);

  function tryOn(item: { slot: WardrobeSlot; key: string } | null) {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    setPreview(item);
    setGesture(item?.slot === "motion" ? `${item.key}:${++turn.current}` : "");
    if (item) previewTimer.current = setTimeout(() => setPreview(null), 10_000);
  }

  async function change(action: "equip" | "buy" | "starter" | "companion", slot: WardrobeSlot | null, key: string | null) {
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action, slot, key }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json() as { code?: string };
        if (!controller.signal.aborted) setError(result.code === "insufficient_points" ? t.insufficient : t.failed);
        return;
      }
      const result = await response.json() as WardrobeSnapshot;
      if (controller.signal.aborted) return;
      tryOn(null);
      setSnapshot(result);
      onEquip(result.outfit);
      window.dispatchEvent(new CustomEvent(SCHOLLY_OUTFIT_CHANGED, { detail: { profileId, outfit: result.outfit } }));
    } catch {
      if (!controller.signal.aborted) setError(t.failed);
    } finally {
      if (!controller.signal.aborted) setSaving(false);
      if (mutation.current === controller) mutation.current = null;
    }
  }

  if (!snapshot) return <div className="sb-scholly-wardrobe">
    {error ? <><p role="alert">{error}</p><Button variant="unstyled" type="button" onClick={() => { setError(""); setReload(value => value + 1); }}>{t.retry}</Button></>
      : <p role="status">{t.loading}</p>}
  </div>;

  const shown = preview ? { ...snapshot.outfit, [preview.slot]: preview.key } : snapshot.outfit;
  const companion = snapshot.outfit.companion ?? "scholly";
  const palette = schollyPalette(shown);
  const unlockedBody = companion === "scholly";
  const owned = new Set(snapshot.owned);
  const items = SCHOLLY_WARDROBE.filter(item => item.slot === slot);
  const numbers = new Intl.NumberFormat(locale);
  const isRemovable = OPTIONAL_WARDROBE_SLOTS.includes(slot);
  function selectCompanion(id: SchollyCompanionId) {
    if (companion === id) return;
    if (id !== "scholly" && slot === "body") setSlot("eyes");
    setAngle(0);
    void change("companion", null, id);
  }

  return (
    <div className="sb-scholly-wardrobe" data-studio={studio || undefined} aria-label={t.title}>
      {studio && <div className="sb-wardrobe-companions" role="group" aria-label={t.companions}>
        {Object.entries(SCHOLLY_COMPANIONS).map(([id, option]) => <Button variant="unstyled" key={id}
          style={{ "--choice-color": option.accent } as CSSProperties}
          type="button" aria-pressed={id === companion} disabled={saving} onClick={() => selectCompanion(id as SchollyCompanionId)}>
          <Bot size={21} aria-hidden /><span>{option.name}</span>
        </Button>)}
      </div>}
      <div className="sb-scholly-wardrobe-preview" style={{ "--wardrobe-accent": palette.highlight } as CSSProperties}>
        {studio && <strong className="sb-wardrobe-preview-name">{SCHOLLY_COMPANIONS[companion].name}</strong>}
        <div className="sb-scholly-wardrobe-avatar"><SchollyModel outfit={shown} studio={studio} angle={angle} gesture={gesture}
          motion={gesture.startsWith("celebrate:") ? "celebrate" : "idle"} /></div>
        <span className="sb-scholly-wardrobe-sample sb-scholly-look-bubble" data-bubble={shown.bubble}>{t.sample}</span>
        {studio && <div className="sb-wardrobe-preview-controls">
          <Button variant="unstyled" type="button" aria-label={t.turnLeft} onClick={() => setAngle(value => value - Math.PI / 6)}><RotateCcw size={17} aria-hidden /></Button>
          <Button variant="unstyled" type="button" aria-label={t.turnRight} onClick={() => setAngle(value => value + Math.PI / 6)}><RotateCw size={17} aria-hidden /></Button>
          {shown.motion && <Button variant="unstyled" type="button" aria-label={t.animate} onClick={() => setGesture(`${shown.motion}:${++turn.current}`)}><Sparkles size={17} aria-hidden /></Button>}
        </div>}
        {preview && <Button variant="unstyled" type="button" onClick={() => tryOn(null)}>{t.stop}</Button>}
      </div>
      <div className="sb-wardrobe-library">
      <div className="sb-scholly-wardrobe-totals">
        <span>{t.count(owned.size, SCHOLLY_WARDROBE.length)}</span>
        <span><strong>{t.balance} {numbers.format(snapshot.balance)}</strong> ({t.lifetime} {numbers.format(snapshot.lifetimePoints)})</span>
      </div>
      <div className="sb-scholly-wardrobe-tabs">
        {WARDROBE_SLOTS.map(value => {
          const group = SCHOLLY_WARDROBE.filter(item => item.slot === value);
          return <Button variant="unstyled" key={value} type="button" aria-pressed={slot === value}
            onClick={() => { setSlot(value); tryOn(null); }}>
            {t[value]} <small>{group.filter(item => owned.has(wardrobeId(item))).length}/{group.length}</small>
          </Button>;
        })}
      </div>
      {slot === "body" && !unlockedBody && <p className="sb-wardrobe-hint">{t.signature}</p>}
      {isRemovable && snapshot.outfit[slot] && <Button variant="unstyled" type="button" disabled={saving}
        onClick={() => void change("equip", slot, null)}>{slot === "aura" ? t.removeAura : t.remove}</Button>}
      {slot === "eyes" && snapshot.outfit.eyes !== "cyan" && <Button variant="unstyled" type="button" disabled={saving}
        onClick={() => void change("equip", "eyes", "cyan")}>{t.originalEyes}</Button>}
      {error && <p role="alert">{error}</p>}
      <ul className="sb-scholly-wardrobe-items">
        {(slot === "body" && !unlockedBody ? [] : items).map(item => {
          const Icon = categoryIcons[item.slot];
          const isOwned = owned.has(wardrobeId(item));
          const equipped = isOwned && snapshot.outfit[slot] === item.key;
          const unlock = item.unlock;
          const starter = !isOwned && slot === "body" && snapshot.starterAvailable &&
            STARTER_SCHOLLY_COLORS.some(color => color === item.key);
          const hint = isOwned ? null : unlock.type === "level" ? t.level(unlock.value)
            : unlock.type === "streak" ? t.streak(unlock.value)
            : unlock.type === "season" ? t.season(unlock.start, unlock.end, unlock.missions)
            : null;
          return (
            <li key={wardrobeId(item)} data-rarity={item.rarity} data-owned={isOwned}>
              {studio && <div className="sb-wardrobe-item-art" style={{ "--item-color": item.color ?? palette.highlight } as CSSProperties} aria-hidden>
                {item.slot === "body" || item.slot === "eyes" ? <i /> : <Icon size={27} />}
              </div>}
              <div className="sb-scholly-wardrobe-item-label">
                {!studio && isOwned && item.color ? <i style={{ "--sb-scholly-swatch": item.color } as CSSProperties} aria-hidden="true" />
                  : !isOwned ? <Lock size={14} aria-hidden="true" /> : null}
                <strong>{item.label[locale]}</strong>
              </div>
              {hint && <small>{hint}</small>}
              <div className="sb-scholly-wardrobe-actions">
                {!equipped && <Button variant="unstyled" type="button" onClick={() => tryOn(item)}>{t.preview}</Button>}
                {isOwned && <Button variant="unstyled" type="button" disabled={saving || equipped}
                  onClick={() => void change("equip", slot, item.key)}>{equipped ? t.equipped : t.equip}</Button>}
                {starter ? <Button variant="unstyled" type="button" disabled={saving} onClick={() => void change("starter", slot, item.key)}>{t.starter}</Button>
                  : !isOwned && unlock.type === "buy" ? <Button variant="unstyled" type="button" disabled={saving || snapshot.balance < unlock.price}
                    onClick={() => void change("buy", slot, item.key)}>{t.purchase(unlock.price)}</Button> : null}
              </div>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}
