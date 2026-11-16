"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import type { Locale } from "@/i18n/config";
import {
  SCHOLLY_WARDROBE, STARTER_SCHOLLY_COLORS, WARDROBE_SLOTS, wardrobeId,
  type SchollyOutfit, type WardrobeSlot, type WardrobeSnapshot,
} from "@/lib/scholly-wardrobe";
import { SchollyModel } from "./SchollyModel";
import "./scholly-wardrobe.css";

const labels = {
  uz: {
    title: "Scholly shkafi", body: "Tana", eyes: "Ko‘z", aura: "Aura", bubble: "Xabar",
    balance: (points: number) => `${points} ball`, count: (owned: number, total: number) => `${owned}/${total} ta`,
    purchase: (points: number) => `${points} ballga olish`, preview: "Sinab ko‘rish", stop: "Sinovni tugatish",
    equip: "Tanlash", equipped: "Tanlangan", removeAura: "Aurasiz", originalEyes: "Asl ko‘z rangi",
    level: (n: number) => `${n}-darajada ochiladi`, streak: (n: number) => `${n} kunlik streakda ochiladi`,
    season: (start: string, end: string, n: number) => `${start} – ${end} oralig‘ida ${n} ta missiya`,
    sample: "Salom!", loading: "Shkaf ochilyapti…", retry: "Qayta yuklash",
    unavailable: "Shkafni yuklab bo‘lmadi.", failed: "O‘zgarish saqlanmadi.", insufficient: "Ball yetarli emas.",
    starter: "Ilk rangni bepul olish",
  },
  en: {
    title: "Scholly wardrobe", body: "Body", eyes: "Eyes", aura: "Aura", bubble: "Bubble",
    balance: (points: number) => `${points} points`, count: (owned: number, total: number) => `${owned}/${total} owned`,
    purchase: (points: number) => `Buy for ${points} points`, preview: "Try on", stop: "End preview",
    equip: "Equip", equipped: "Equipped", removeAura: "No aura", originalEyes: "Original eye color",
    level: (n: number) => `Unlocks at level ${n}`, streak: (n: number) => `Unlocks at a ${n}-day streak`,
    season: (start: string, end: string, n: number) => `Complete ${n} missions from ${start} to ${end}`,
    sample: "Hi!", loading: "Opening wardrobe…", retry: "Reload",
    unavailable: "The wardrobe could not be loaded.", failed: "The change could not be saved.", insufficient: "Not enough points.",
    starter: "Claim your first color for free",
  },
  ru: {
    title: "Гардероб Scholly", body: "Корпус", eyes: "Глаза", aura: "Аура", bubble: "Реплика",
    balance: (points: number) => `Баллы: ${points}`, count: (owned: number, total: number) => `${owned}/${total} в коллекции`,
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

export function SchollyWardrobe({ profileId, locale, onEquip }: {
  profileId: number;
  locale: Locale;
  onEquip: (outfit: SchollyOutfit) => void;
}) {
  const t = labels[locale];
  const [slot, setSlot] = useState<WardrobeSlot>("body");
  const [snapshot, setSnapshot] = useState<WardrobeSnapshot | null>(null);
  const [preview, setPreview] = useState<{ slot: WardrobeSlot; key: string } | null>(null);
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
    if (item) previewTimer.current = setTimeout(() => setPreview(null), 10_000);
  }

  async function change(action: "equip" | "buy" | "starter", slot: WardrobeSlot, key: string | null) {
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
    } catch {
      if (!controller.signal.aborted) setError(t.failed);
    } finally {
      if (!controller.signal.aborted) setSaving(false);
      if (mutation.current === controller) mutation.current = null;
    }
  }

  if (!snapshot) return <div className="sb-scholly-wardrobe">
    {error ? <><p role="alert">{error}</p><button type="button" onClick={() => { setError(""); setReload(value => value + 1); }}>{t.retry}</button></>
      : <p role="status">{t.loading}</p>}
  </div>;

  const shown = preview ? { ...snapshot.outfit, [preview.slot]: preview.key } : snapshot.outfit;
  const owned = new Set(snapshot.owned);
  const items = SCHOLLY_WARDROBE.filter(item => item.slot === slot);
  return (
    <div className="sb-scholly-wardrobe" aria-label={t.title}>
      <div className="sb-scholly-wardrobe-preview">
        <div className="sb-scholly-wardrobe-avatar"><SchollyModel outfit={shown} staticPreview /></div>
        <span className="sb-scholly-wardrobe-sample sb-scholly-look-bubble" data-bubble={shown.bubble}>{t.sample}</span>
        {preview && <button type="button" onClick={() => tryOn(null)}>{t.stop}</button>}
      </div>
      <div className="sb-scholly-wardrobe-totals">
        <span>{t.count(owned.size, SCHOLLY_WARDROBE.length)}</span><strong>{t.balance(snapshot.balance)}</strong>
      </div>
      <div className="sb-scholly-wardrobe-tabs">
        {WARDROBE_SLOTS.map(value => {
          const group = SCHOLLY_WARDROBE.filter(item => item.slot === value);
          return <button key={value} type="button" aria-pressed={slot === value}
            onClick={() => { setSlot(value); tryOn(null); }}>
            {t[value]} <small>{group.filter(item => owned.has(wardrobeId(item))).length}/{group.length}</small>
          </button>;
        })}
      </div>
      {slot === "aura" && snapshot.outfit.aura && <button type="button" disabled={saving}
        onClick={() => void change("equip", "aura", null)}>{t.removeAura}</button>}
      {slot === "eyes" && snapshot.outfit.eyes !== "cyan" && <button type="button" disabled={saving}
        onClick={() => void change("equip", "eyes", "cyan")}>{t.originalEyes}</button>}
      {error && <p role="alert">{error}</p>}
      <ul className="sb-scholly-wardrobe-items">
        {items.map(item => {
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
              <div className="sb-scholly-wardrobe-item-label">
                {isOwned && item.color ? <i style={{ backgroundColor: item.color }} aria-hidden="true" />
                  : !isOwned ? <Lock size={14} aria-hidden="true" /> : null}
                <strong>{item.label[locale]}</strong>
              </div>
              {hint && <small>{hint}</small>}
              <div className="sb-scholly-wardrobe-actions">
                {!equipped && <button type="button" onClick={() => tryOn(item)}>{t.preview}</button>}
                {isOwned && <button type="button" disabled={saving || equipped}
                  onClick={() => void change("equip", slot, item.key)}>{equipped ? t.equipped : t.equip}</button>}
                {starter ? <button type="button" disabled={saving} onClick={() => void change("starter", slot, item.key)}>{t.starter}</button>
                  : !isOwned && unlock.type === "buy" ? <button type="button" disabled={saving || snapshot.balance < unlock.price}
                    onClick={() => void change("buy", slot, item.key)}>{t.purchase(unlock.price)}</button> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
