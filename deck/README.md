# ScholarBridgeAI — pitch deck (2026)

Ikki ko'rinishda tayyorlangan, **bir xil mazmun**dagi 16 slaydli taqdimot:

| Fayl | Nima |
|---|---|
| [`ScholarBridgeAI_Pitch_Deck_UZ.pptx`](./ScholarBridgeAI_Pitch_Deck_UZ.pptx) | To'liq dizaynli, tahrirlanadigan PPTX (16:9, 16 slayd, izohlar bilan) |
| Google Slides | `ScholarBridgeAI_Pitch_Deck` — xuddi shu mazmun, Google'da tahrirlanadigan nusxa |

## Slaydlar

1. Muqova — 100 000+ o'zbek talabasi, 200 universitet · 40 mamlakat
2. Muammo — tarqoq ma'lumot, SOP to'sig'i, qimmat maslahat, o'tgan muddatlar
3. Yechim — bitta profil, oltita asosiy modul
4. Sakkiz bosqichli sayohat (discover → depart)
5. Katalog — 200 universitet · 2 848 program · 305 grant · 40 mamlakat
6. Farq — manba, taklif qilinmagan ehtimol, yorliqlangan AI, maxfiylik
7. AI arxitekturasi — provayder routeri, kvota, xarajat, shifrlangan kalitlar
8. Telegram bot + Mini App
9. Biznes modeli — Bepul / Premium 89 000 so'm · 3 ta reja
10. Bozor — TAM / SAM / SOM
11. Traksiya — 103 tashrifchi, 1 564 sessiya, 16 profil
12. Raqobat taqqoslamasi
13. O'sish rejasi — Telegram-first, referal, funnel
14. Keyingi 90 kun — launch → daromad → hamkorlik
15. Nima uchun biz — qurilgan mahsulot faktlari
16. So'rov — pre-seed, mablag' taqsimoti, 12 oylik maqsadlar

> 15-slayd va 16-slaydda **jamoa ismi, aniq summa va aloqa** kontekstga qarab
> to'ldirilishi kerak (hozir `email@domen.uz · @telegram` ko'rinishida).

## Raqamlar qayerdan

- **Katalog:** jonli baza — 200 universitet, 2 848 program, 305 grant,
  40 mamlakat, 98 jadval (Supabase, 2026-10).
- **Traksiya:** `site_visits` jadvali (2026-09-13 → 2026-10-19): 103 unikal
  tashrifchi, 1 564 sessiya, 16 profil, 87% O'zbekistondan.
- **Narxlar:** `app_config` → 89 000 / 219 000 / 999 000 so'm.
- **Limitlar:** `src/lib/entitlements.ts` (`FREE_CAPS`) va
  `src/lib/config.ts` (AI kvotalari: 5 / 60).
- **Bozor (TAM/SAM):** UNESCO UIS va O'zbekiston statistika qo'mitasi
  taxminlari — slaydda shu tarzda belgilangan, ichki o'lchov sifatida
  ko'rsatilmagan.

## Rasmlar

Barcha kampus fotolari — Wikimedia Commons'dan, ya'ni sayt katalogi
(`data/universities_campus_images_and_full_data.csv`, `image_url` maydoni)
ishlatadigan manbaning o'zi:

| Fayl | Manba |
|---|---|
| `hero_mit.jpg` | MIT — Great Dome / Killian Court |
| `campus_cambridge.jpg` | King's College Chapel, Cambridge |
| `campus_oxford.jpg` | Radcliffe Camera, Oxford |
| `campus_eth.jpg` | ETH Zürich Hauptgebäude |
| `campus_harvard.jpg` | Harvard Memorial Hall |
| `campus_stanford.jpg` | Stanford Main Quad |
| `campus_imperial.jpg` | Imperial College London |
| `logo_mark.png` | `public/icon-512.png` (fon shaffof qilingan) |

Google Slides nusxasida rasmlar to'g'ridan-to'g'ri Wikimedia URL'laridan
qo'yiladi (sayt `wikimediaThumb` orqali aynan shu fayllarni ishlatadi).

## Qayta yig'ish

```bash
pip install python-pptx pillow
cd deck
python3 build_deck.py        # -> ScholarBridgeAI_Pitch_Deck_UZ.pptx
python3 render_preview.py    # ixtiyoriy: preview/slide-XX.png (tekshirish uchun)
```

Dizayn tizimi (ranglar, sarlavha uslubi, kartalar) — `deck_lib.py`; slaydlar —
`slides_a.py` (1–8) va `slides_b.py` (9–16). Har bir element **native**
PowerPoint obyekti (matn, shakl, jadval, diagramma), ya'ni to'liq tahrirlanadi.

## Google Slides'ga ko'chirish

PPTX'ni Google Drive'ga yuklab, **Open with → Google Slides** yoki
**File → Import slides** orqali ochish mumkin — joylashuv va matn saqlanadi.
