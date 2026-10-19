"""Slides 9-16: business model, market, traction, competition, GTM,
roadmap, why-us, the ask."""

import os

from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

from deck_lib import (
    BODY, GOLD, GOLD_L, GREEN, GREEN_L, INK, LIGHT, LINE, M, MUTED, NAVY, NAVY_2,
    SH, SW, TEAL, TEAL_L, WHITE, arrow, body, bullets, card, chip, footer, kicker,
    picture_cover, rect, rich, rule, scrim, shadow, source, stat, text, title,
)
from slides_a import blank, notes

A = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets") + "/"


# ------------------------------------------------------------------ 09 ------
def business(prs):
    s = blank(prs)
    kicker(s, M, 0.78, "Biznes modeli")
    title(s, M, 1.2, 11.4, "Bepul boshlash, chuqurlik uchun Premium")
    text(s, M, 2.06, 11.6, 0.4,
         "Bepul qatlam «noldan boshlash» va'dasini bajaradi; to'lov esa vaqt, "
         "hajm va chuqurlik uchun.",
         size=11.5, color=BODY)

    fy, fh = 2.58, 3.2
    # FREE
    fx, fw = M, 4.05
    card(s, fx, fy, fw, fh, fill=WHITE, line=LINE, radius=0.06)
    text(s, fx + 0.32, fy + 0.26, 2.0, 0.26, "BEPUL", size=10, color=MUTED,
         bold=True, spacing=140)
    text(s, fx + 0.32, fy + 0.54, 2.0, 0.5, "0 so'm", size=25, color=INK,
         bold=True, font="Georgia")
    text(s, fx + 1.9, fy + 0.7, 2.0, 0.26, "doimiy", size=10, color=MUTED)
    rows = ["10 ta universitet va 10 ta grant saqlash",
            "1 ta ariza ish maydoni",
            "Kuniga 5 ta AI so'rov",
            "Viza amaliyoti: kuniga 2 ta",
            "Forum o'qish va kurs intro darslari",
            "Telegram eslatmalari va o'quv reja"]
    y = fy + 1.2
    for r in rows:
        rect(s, fx + 0.34, y + 0.06, 0.09, 0.09, fill=TEAL, shape_type=MSO_SHAPE.OVAL)
        text(s, fx + 0.58, y - 0.02, fw - 0.9, 0.3, r, size=9.8, color=BODY)
        y += 0.33

    # PREMIUM
    gx, gw = fx + fw + 0.2, 4.05
    card(s, gx, fy, gw, fh, fill=NAVY, line=NAVY, radius=0.06)
    text(s, gx + 0.32, fy + 0.26, 2.4, 0.26, "PREMIUM", size=10, color=GOLD,
         bold=True, spacing=140)
    text(s, gx + 0.32, fy + 0.52, 3.0, 0.5, "89 000 so'm", size=25, color=WHITE,
         bold=True, font="Georgia")
    text(s, gx + 2.92, fy + 0.68, 1.0, 0.26, "/ oy", size=10,
         color=RGBColor(0xA9, 0xB8, 0xD2))
    rows = ["Cheksiz saqlash va ariza maydonlari",
            "SOP studiyasi va insho tekshiruvi",
            "Kuniga 60 ta AI so'rov",
            "To'liq kurslar va sertifikatlar",
            "Hujjat ombori va ota-ona paneli",
            "Forumda yozish, cheksiz viza amaliyoti"]
    y = fy + 1.2
    for r in rows:
        rect(s, gx + 0.34, y + 0.06, 0.09, 0.09, fill=GOLD, shape_type=MSO_SHAPE.OVAL)
        text(s, gx + 0.58, y - 0.02, gw - 0.9, 0.3, r, size=9.8,
             color=RGBColor(0xD5, 0xDF, 0xEE))
        y += 0.33

    # plan strip
    px = gx + gw + 0.2
    pw = SW - M - px
    card(s, px, fy, pw, fh, fill=LIGHT, line=LINE, radius=0.06, lift=False)
    text(s, px + 0.3, fy + 0.26, pw - 0.6, 0.26, "TO'LOV REJALARI", size=9,
         color=MUTED, bold=True, spacing=120)
    plans = [("30 kun", "89 000"), ("90 kun", "219 000"), ("365 kun", "999 000")]
    yy = fy + 0.66
    for label, price in plans:
        text(s, px + 0.3, yy, 1.3, 0.3, label, size=9.6, color=BODY)
        text(s, px + 0.9, yy, pw - 1.18, 0.3, price, size=11, color=NAVY,
             bold=True, align=PP_ALIGN.RIGHT)
        rule(s, px + 0.3, yy + 0.34, pw - 0.6, color=RGBColor(0xD8, 0xE1, 0xEB))
        yy += 0.5
    text(s, px + 0.3, yy + 0.04, pw - 0.6, 0.9,
         "Payme va Click (UZS), webhook bilan tasdiqlanadi. Yillik reja oyiga "
         "~83 000 so'mga tushadi.",
         size=8.4, color=BODY, line_spacing=1.4)

    # economics strip
    rect(s, M, 5.98, SW - 2 * M, 0.76, fill=WHITE, line=LINE, radius=0.22)
    econ = [("~90%", "Premium marjasi"), ("3", "to'lov rejasi"),
            ("5", "referal = 30 kun Premium"), ("2", "to'lov usuli")]
    for i, (v, l) in enumerate(econ):
        x = M + 0.34 + i * 2.95
        text(s, x, 6.08, 0.85, 0.3, v, size=12.5, color=TEAL, bold=True)
        text(s, x + 0.82, 6.12, 2.0, 0.3, l, size=9, color=BODY)

    footer(s, 9)
    notes(s, "Narxlar app_config'dan boshqariladi (89k / 219k / 999k). Bepul "
             "qatlam ataylab saxiy: maqsad — odam mahsulotni ichidan ko'rsin, "
             "keyin to'lasin. Referal: 5 faol referal = 30 kun Premium.")
    return s


# ------------------------------------------------------------------ 10 ------
def market(prs):
    s = blank(prs)
    rect(s, 0, 0, SW, SH, fill=NAVY)
    picture_cover(s, A + "campus_cambridge.jpg", 8.9, 0, SW - 8.9, SH)
    scrim(s, 8.9, 0, SW - 8.9, SH, NAVY, 70)
    text(s, 9.24, 5.5, 3.6, 0.8, "Kembrij universiteti — katalogdagi\n200 "
         "universitetdan biri (QS #6).", size=8.5,
         color=RGBColor(0xE8, 0xEE, 0xF7), line_spacing=1.4)

    kicker(s, M, 0.78, "Bozor", color=GOLD)
    title(s, M, 1.2, 8.2, "Katta va tizimli bozor", color=WHITE)
    text(s, M, 2.05, 7.6, 0.6,
         "Talab ixtiyoriy emas: har yili o'n minglab oila bu qarorni qabul "
         "qiladi va buning uchun pul to'laydi.",
         size=11.8, color=RGBColor(0xC9, 0xD5, 0xE6), line_spacing=1.42)

    cards = [
        ("TAM", "6–7 mln", "dunyo bo'ylab xalqaro talabalar",
         "Global mobil talabalar soni (UNESCO UIS, taxminiy)."),
        ("SAM", "~320 ming", "Markaziy Osiyodan chet elda tahsil olayotganlar",
         "UZ, QZ, KG, TJ, TM bo'yicha taxminiy yig'indi."),
        ("SOM", "10 000", "to'lovchi — 3 yillik maqsad",
         "10 000 × 89 000 so'm × 12 ≈ 10,7 mlrd so'm ARR (yillik reja bilan)."),
    ]
    x = M
    for i, (tag, value, label, note) in enumerate(cards):
        w = 2.44 if i < 2 else 0.0
        cw = 2.44
        x = M + i * 2.6
        card(s, x, 2.98, cw, 2.62, fill=NAVY_2, line=RGBColor(0x35, 0x4A, 0x74),
             radius=0.07, lift=False)
        text(s, x + 0.24, 3.14, 1.0, 0.24, tag, size=9.5, color=GOLD, bold=True,
             spacing=120)
        text(s, x + 0.24, 3.44, cw - 0.4, 0.5, value, size=21, color=WHITE,
             bold=True, font="Georgia")
        text(s, x + 0.24, 3.96, cw - 0.44, 0.62, label, size=9, color=WHITE,
             line_spacing=1.3)
        text(s, x + 0.24, 4.62, cw - 0.44, 0.8, note, size=7.8,
             color=RGBColor(0x93, 0xA4, 0xBF), line_spacing=1.35)

    text(s, M, 5.92, 7.9, 0.8,
         "100 000+ o'zbek talabasi xorijda  ·  har yili 20–38 ming yangi  ·  "
         "hozirgi tashrifchilarning 87% i — O'zbekistondan",
         size=10.2, color=RGBColor(0xD5, 0xDF, 0xEE), line_spacing=1.45)
    source(s, M, 6.66, 8.2,
           "Manbalar: UNESCO UIS; O'zbekiston Respublikasi statistika qo'mitasi (2025). "
           "TAM/SAM — uchinchi tomon taxminlari, ichki o'lchov emas.")

    footer(s, 10, dark=True)
    notes(s, "Bozorni ataylab konservativ ko'rsataman: TAM/SAM uchinchi tomon "
             "taxminlari. SOM esa bizning 3 yillik rejamiz va u ARR bilan "
             "bog'langan.")
    return s


# ------------------------------------------------------------------ 11 ------
def traction(prs):
    s = blank(prs)
    kicker(s, M, 0.78, "Traksiya")
    title(s, M, 1.2, 10.8, "Birinchi haqiqiy signallar")
    text(s, M, 2.02, 11.3, 0.4,
         "Yopiq test davri: 2026-yil 13-sentyabrdan. Raqamlar kichik, lekin "
         "haqiqiy — saytning o'z analitikasidan olingan.",
         size=11, color=BODY)

    cd = CategoryChartData()
    cd.categories = ["7–13 sen", "14–20 sen", "21–27 sen", "28 sen–4 okt",
                     "5–11 okt", "12–18 okt", "19 okt"]
    cd.add_series("Sessiyalar", (79, 155, 387, 458, 115, 326, 44))
    gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(M),
                            Inches(2.62), Inches(6.5), Inches(3.2), cd)
    ch = gf.chart
    ch.has_legend = False
    ch.has_title = False
    ch.font.name = "Arial"
    ch.font.size = Pt(9)
    ch.font.color.rgb = MUTED
    plot = ch.plots[0]
    plot.gap_width = 58
    ser = plot.series[0]
    ser.format.fill.solid()
    ser.format.fill.fore_color.rgb = TEAL
    ser.format.line.fill.background()
    plot.has_data_labels = True
    dl = plot.data_labels
    dl.font.size = Pt(9)
    dl.font.bold = True
    dl.font.color.rgb = NAVY
    dl.position = 2  # above
    dl.number_format = '0'
    dl.number_format_is_linked = False
    ca = ch.category_axis
    ca.tick_labels.font.size = Pt(8)
    ca.format.line.color.rgb = LINE
    ca.has_major_gridlines = False
    va = ch.value_axis
    va.visible = False
    va.has_major_gridlines = False
    text(s, M, 5.9, 6.4, 0.26, "Haftalik sessiyalar (sayt analitikasi)",
         size=8.4, color=MUTED)

    stats = [("103", "unikal tashrifchi", TEAL), ("1 564", "sessiya", TEAL),
             ("16", "ro'yxatdan o'tgan profil", NAVY), ("87%", "tashrif — O'zbekistondan", GREEN)]
    for i, (v, l, c) in enumerate(stats):
        x = 7.34 + (i % 2) * 2.66
        y = 2.58 + (i // 2) * 1.4
        card(s, x, y, 2.48, 1.18, fill=LIGHT, line=LINE, radius=0.08, lift=False)
        text(s, x + 0.24, y + 0.16, 2.0, 0.44, v, size=20, color=c, bold=True,
             font="Georgia")
        text(s, x + 0.24, y + 0.68, 2.1, 0.4, l, size=8.4, color=MUTED,
             line_spacing=1.25)

    # honesty band
    rect(s, M, 6.18, SW - 2 * M, 0.66, fill=GOLD_L, radius=0.22)
    text(s, M + 0.3, 6.24, 3.2, 0.22, "ISBOTLANDI", size=8.5, color=RGBColor(0x8A, 0x66, 0x1B),
         bold=True, spacing=120)
    text(s, M + 0.3, 6.46, 5.6, 0.34,
         "Mahsulot ishlaydi va odamlar qaytadi — haftasiga 300+ sessiya.",
         size=9.4, color=INK, line_spacing=1.25)
    rect(s, M + 6.2, 6.3, 0.012, 0.42, fill=RGBColor(0xE2, 0xCE, 0xA2))
    text(s, M + 6.4, 6.24, 3.2, 0.22, "ISBOTLANMAGAN", size=8.5,
         color=RGBColor(0x8A, 0x66, 0x1B), bold=True, spacing=120)
    text(s, M + 6.4, 6.46, 5.3, 0.34,
         "To'lovga tayyorlik — keyingi 90 kunning asosiy vazifasi.",
         size=9.4, color=INK, line_spacing=1.25)

    footer(s, 11)
    notes(s, "Halollik muhim: 103 tashrifchi — bu test, traction emas. "
             "Lekin qaytish (haftasiga 300+ sessiya) mahsulot ishlayotganini "
             "ko'rsatadi. Keyingi bosqich — to'lov konversiyasi.")
    return s


# ------------------------------------------------------------------ 12 ------
def competition(prs):
    s = blank(prs)
    kicker(s, M, 0.78, "Raqobat")
    title(s, M, 1.2, 11.0, "Nima uchun biz — va nima uchun hozir")
    text(s, M, 2.02, 11.4, 0.4,
         "Bozorda har bir bo'lak uchun alohida vosita bor. Hech biri butun "
         "yo'lni bir joyda, o'zbek tilida va manba bilan qamramaydi.",
         size=11, color=BODY)

    headers = ["Imkoniyat", "ScholarBridgeAI", "Konsalting agentlik",
               "Grant bazalari", "AI chatbot"]
    data = [
        ("Narx", "89 000 so'm/oy", "$500–2 000", "Bepul", "$20/oy"),
        ("Profilga moslik", "4 o'lchovli moslik", "Qo'lda", "Oddiy filtr", "Umumiy"),
        ("Manba + tekshirilgan sana", "Har bir faktda", "—", "Qisman", "—"),
        ("Ariza va hujjat boshqaruvi", "To'liq", "Qisman", "—", "—"),
        ("SOP va insho studiyasi", "Bor", "Bor", "—", "Qisman"),
        ("Viza intervyusi simulyatori", "Bor (ovozli)", "Qisman", "—", "—"),
        ("Telegram eslatmalari", "Bor", "—", "Qisman", "—"),
        ("O'zbek va rus tili", "To'liq", "Bor", "Qisman", "Qisman"),
    ]
    rows, cols = len(data) + 1, len(headers)
    x, y, w = M, 2.6, SW - 2 * M
    col_w = [3.3, 2.5, 2.3, 2.05, 1.73]
    gf = s.shapes.add_table(rows, cols, Inches(x), Inches(y), Inches(w),
                            Inches(0.395 * rows))
    tbl = gf.table
    tbl.first_row = True
    tbl.horz_banding = False
    for i, cw in enumerate(col_w):
        tbl.columns[i].width = Inches(cw)
    tbl.rows[0].height = Inches(0.42)
    for r in range(1, rows):
        tbl.rows[r].height = Inches(0.385)

    for c, h in enumerate(headers):
        cell = tbl.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY if c else RGBColor(0x2A, 0x3E, 0x63)
        cell.margin_left = Inches(0.14)
        cell.margin_right = Inches(0.08)
        cell.margin_top = Inches(0.06)
        cell.margin_bottom = Inches(0.04)
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER if c else PP_ALIGN.LEFT
        run = p.add_run()
        run.text = h
        run.font.size = Pt(8.6)
        run.font.bold = True
        run.font.name = "Arial"
        run.font.color.rgb = GOLD if c == 1 else WHITE

    for r, row in enumerate(data, start=1):
        for c, val in enumerate(row):
            cell = tbl.cell(r, c)
            cell.fill.solid()
            if c == 1:
                cell.fill.fore_color.rgb = TEAL_L
            else:
                cell.fill.fore_color.rgb = WHITE if r % 2 else RGBColor(0xF8, 0xFA, 0xFC)
            cell.margin_left = Inches(0.14)
            cell.margin_right = Inches(0.08)
            cell.margin_top = Inches(0.04)
            cell.margin_bottom = Inches(0.04)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER if c else PP_ALIGN.LEFT
            run = p.add_run()
            run.text = val
            run.font.size = Pt(8.6)
            run.font.name = "Arial"
            run.font.bold = (c == 1 or c == 0)
            run.font.color.rgb = INK if (c == 0 or c == 1) else MUTED

    text(s, M, 6.5, 11.9, 0.4,
         "Bizning himoya: 2 848 programlik baza + manba madaniyati + o'zbek "
         "tilidagi to'liq yo'l. Buni nusxalash uchun mahsulotni qaytadan qurish kerak.",
         size=10, color=BODY, line_spacing=1.35)
    footer(s, 12)
    notes(s, "Raqobat jadvali ataylab ehtiyotkor: 'qisman' deb belgilangan "
             "joylar bor. Bizning farq — vertikal integratsiya va ishonch "
             "qatlami, narx emas.")
    return s


# ------------------------------------------------------------------ 13 ------
def gtm(prs):
    s = blank(prs)
    kicker(s, M, 0.78, "O'sish rejasi")
    title(s, M, 1.2, 11.0, "Telegram-first, referal bilan o'sish")
    text(s, M, 2.02, 11.4, 0.4,
         "O'zbekistonda o'quvchi Instagram va Telegram'da yashaydi. Shuning "
         "uchun mahsulot o'zi tarqaladigan kanallarga qurilgan.",
         size=11, color=BODY)

    channels = [
        ("01", "Telegram bot + Mini App",
         "Ilova o'rnatmasdan ishlaydi. Har bir eslatma — qaytish sababi.",
         "CPA ≈ 0", GREEN),
        ("02", "Referal",
         "5 faol referal = 30 kun Premium. O'quvchi o'z do'stini olib keladi.",
         "Viral loop", TEAL),
        ("03", "Maktab va universitetlar",
         "11-sinf va 1–2-kurs guruhlari bilan bepul seminar + guruh hisobi.",
         "B2B2C", NAVY),
        ("04", "Kontent va SEO",
         "Grant kalendari, «qanday topshiraman» qo'llanmalari — uz/ru tilida.",
         "Organik", GOLD),
    ]
    x = M
    for num, head, desc, tag, col in channels:
        card(s, x, 2.66, 2.82, 2.1, fill=WHITE, line=LINE, radius=0.06)
        rect(s, x, 2.66, 0.05, 2.1, fill=col)
        text(s, x + 0.26, 2.84, 0.6, 0.22, num, size=9, color=col, bold=True,
             spacing=80)
        text(s, x + 0.26, 3.1, 2.36, 0.56, head, size=11.5, color=INK, bold=True,
             line_spacing=1.2)
        text(s, x + 0.26, 3.68, 2.34, 0.72, desc, size=9, color=BODY,
             line_spacing=1.34)
        chip(s, x + 0.26, 4.36, tag, fill=LIGHT, color=BODY, size=8, h=0.26,
             bold=True)
        x += 3.0

    # funnel
    text(s, M, 5.06, 4.0, 0.26, "CONVERSION FUNNEL", size=8.5, color=MUTED,
         bold=True, spacing=140)
    steps = [("Tashrif", "100%", TEAL), ("Ro'yxatdan o'tish", "~15%", TEAL),
             ("Faol profil", "~60%", GREEN), ("Premium", "8–10%", GOLD)]
    x = M
    widths = [2.86, 2.86, 2.86, 2.86]
    for i, (label, pct, col) in enumerate(steps):
        shp = rect(s, x, 5.4, widths[i], 0.78, fill=col, radius=0.1,
                   alpha=18 if i else 100)
        rect(s, x, 5.4, 0.05, 0.78, fill=col)
        text(s, x + 0.24, 5.5, 1.9, 0.26, label, size=9.5, color=INK, bold=True)
        text(s, x + 0.24, 5.76, 1.9, 0.3, pct, size=12.5, color=col, bold=True)
        if i < 3:
            arrow(s, x + widths[i] + 0.03, 5.72, 0.14, 0.14,
                  color=RGBColor(0xC9, 0xD3, 0xE0))
        x += widths[i] + 0.2

    text(s, M, 6.5, 11.9, 0.5,
         "Hozirgi testdagi ro'yxatdan o'tish darajasi ~15% — kichik tanlanma, "
         "lekin mahsulotning birinchi tabiiy signali.",
         size=9, color=MUTED, line_spacing=1.3)
    footer(s, 13)
    notes(s, "Kanallar mahsulot ichiga qurilgan: bot, referal, guruh hisoblari, "
             "kontent. Pulli reklamaga bog'liq emas — bu pre-seed bosqichda "
             "muhim.")
    return s


# ------------------------------------------------------------------ 14 ------
def roadmap(prs):
    s = blank(prs)
    rect(s, 0, 0, SW, SH, fill=NAVY)
    kicker(s, M, 0.78, "Keyingi 90 kun", color=GOLD)
    title(s, M, 1.2, 9.6, "Reja: gipotezani isbotlash", color=WHITE)
    text(s, M, 2.05, 8.4, 0.6,
         "Mahsulot qurilgan. Endi savol «ishlaydimi?» emas — «to'laydimi?».",
         size=11.8, color=RGBColor(0xC9, 0xD5, 0xE6))

    phases = [
        ("0–30 kun", "Ochiq launch", TEAL,
         ["Sayt va botni ochiq ro'yxatdan o'tishga ochish",
          "1 000 ro'yxatdan o'tgan foydalanuvchi",
          "Onboardingni 5 qadamga qisqartirish"]),
        ("30–60 kun", "Birinchi daromad", GOLD,
         ["Birinchi 100 to'lovchi (Payme/Click)",
          "Premium devorini A/B test qilish",
          "Eslatma kanallarini optimallashtirish"]),
        ("60–90 kun", "Kontent va hamkorlik", GREEN,
         ["3 universitet va 5 mentor bilan hamkorlik",
          "Grant kalendari (uz/ru) — SEO motor",
          "40% oylik qaytish (retention)"]),
    ]
    x = M
    for i, (period, head, col, items) in enumerate(phases):
        card(s, x, 2.86, 3.82, 3.0, fill=NAVY_2,
             line=RGBColor(0x35, 0x4A, 0x74), radius=0.06, lift=False)
        rect(s, x, 2.86, 3.82, 0.05, fill=col)
        text(s, x + 0.3, 3.04, 2.0, 0.24, period.upper(), size=9, color=col,
             bold=True, spacing=120)
        text(s, x + 0.3, 3.34, 3.2, 0.34, head, size=14, color=WHITE, bold=True)
        yy = 3.82
        for it in items:
            rect(s, x + 0.32, yy + 0.08, 0.08, 0.08, fill=col,
                 shape_type=MSO_SHAPE.OVAL)
            text(s, x + 0.54, yy, 3.0, 0.56, it, size=9.2,
                 color=RGBColor(0xC9, 0xD5, 0xE6), line_spacing=1.3)
            yy += 0.62
        x += 4.0

    rect(s, M, 6.12, SW - 2 * M, 0.86, fill=RGBColor(0x24, 0x38, 0x60), radius=0.2)
    text(s, M + 0.32, 6.2, 3.6, 0.26, "MUVAFFAQIYAT MEZONI", size=8.5, color=GOLD,
         bold=True, spacing=120)
    text(s, M + 0.32, 6.44, 11.2, 0.4,
         "1 000 ro'yxatdan o'tgan  ·  100 to'lovchi  ·  40% oylik qaytish  ·  "
         "birinchi 3 ta hamkorlik shartnomasi",
         size=10.5, color=WHITE)
    footer(s, 14, dark=True)
    notes(s, "90 kunlik reja aniq o'lchanadi. Har bir bosqichda bitta asosiy "
             "raqam bor — va u investor bilan kelishilgan bo'ladi.")
    return s


# ------------------------------------------------------------------ 15 ------
def whyus(prs):
    s = blank(prs)
    kicker(s, M, 0.78, "Nima uchun biz")
    title(s, M, 1.2, 10.6, "Mahsulot allaqachon qurilgan")
    text(s, M, 2.02, 11.2, 0.4,
         "Bu slaydda va'da yo'q — faqat tekshirsa bo'ladigan faktlar. "
         "Ko'p raqobatchilar shu bosqichda hali prototipda.",
         size=11, color=BODY)

    facts = [
        ("98 jadval · 2 848 program · 3 til",
         "PostgreSQL sxemasi, en/uz/ru tarjimalar, 16 bo'lim — production'da."),
        ("50+ avtomatik test to'plami",
         "Moslik, to'lov, xavfsizlik, Telegram va i18n uchun regressiya testlari."),
        ("To'lov integratsiyasi tayyor",
         "Payme JSON-RPC va Click ikki bosqichli callback — webhook bilan."),
        ("Telegram bot + Mini App",
         "Sayt API'sini chaqiradi: bir xil hisob, bir xil qoidalar, alohida kod bazasi yo'q."),
        ("Past infrastruktura xarajati",
         "Bitta Node host + PostgreSQL; AI xarajati so'rov boshiga hisoblanadi."),
    ]
    y = 2.62
    for i, (head, desc) in enumerate(facts):
        rect(s, M, y + 0.04, 0.3, 0.3, fill=GREEN_L, shape_type=MSO_SHAPE.OVAL)
        text(s, M, y + 0.05, 0.3, 0.26, "✓", size=10, color=GREEN, bold=True,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        text(s, M + 0.46, y, 7.5, 0.3, head, size=12, color=INK, bold=True)
        text(s, M + 0.46, y + 0.3, 7.5, 0.34, desc, size=9.4, color=BODY,
             line_spacing=1.3)
        y += 0.82

    # team card
    tx = 8.36
    card(s, tx, 2.5, SW - M - tx, 3.9, fill=LIGHT, line=LINE, radius=0.06,
         lift=False)
    text(s, tx + 0.34, 2.7, 3.2, 0.26, "JAMOA", size=8.5, color=MUTED, bold=True,
         spacing=140)
    text(s, tx + 0.34, 2.98, 3.6, 0.62, "Asoschi + mahsulot\nmuhandisligi",
         size=13, color=INK, bold=True, line_spacing=1.25)
    text(s, tx + 0.34, 3.72, 3.7, 0.9,
         "Mahsulotning to'liq sikli — dizayn, backend, AI, to'lov va "
         "infratuzilma — bir qo'lda qurilgan.",
         size=9.4, color=BODY, line_spacing=1.35)
    rule(s, tx + 0.34, 4.66, 3.6, color=RGBColor(0xDB, 0xE4, 0xEE))
    text(s, tx + 0.34, 4.8, 3.7, 0.26, "90 kun ichida qo'shiladi", size=8.5,
         color=MUTED, bold=True, spacing=60)
    hires = ["1 backend / frontend muhandis", "1 o'sish (growth) menejeri",
             "Mentorlar tarmog'i (12 ta ro'yxatda)"]
    yy = 5.1
    for h in hires:
        text(s, tx + 0.34, yy, 3.7, 0.3, "·  " + h, size=9, color=BODY)
        yy += 0.34

    footer(s, 15)
    notes(s, "Bu yerda asoschi ismi, tajribasi va foto qo'shilishi kerak. "
             "Hozir slayd ataylab faqat faktlarga tayanadi.")
    return s


# ------------------------------------------------------------------ 16 ------
def ask(prs):
    s = blank(prs)
    rect(s, 0, 0, SW, SH, fill=NAVY)
    picture_cover(s, A + "campus_stanford.jpg", 0, 0, SW, SH)
    scrim(s, 0, 0, SW, SH, NAVY, 88)

    kicker(s, M, 0.78, "So'rov", color=GOLD)
    title(s, M, 1.2, 9.0, "Pre-seed: 12 oylik runway", color=WHITE)
    text(s, M, 2.02, 7.4, 0.5,
         "Maqsad — O'zbekistonda to'lov modelini isbotlash va keyingi bozorga "
         "chiqish uchun poydevor.",
         size=11.5, color=RGBColor(0xC9, 0xD5, 0xE6))

    uses = [("Mahsulot va muhandislik", 40, TEAL),
            ("O'sish va marketing", 25, GOLD),
            ("Kontent va mentorlar", 20, RGBColor(0x7F, 0xB2, 0xC8)),
            ("Operatsiya va huquqiy", 15, RGBColor(0x8E, 0xA3, 0xC4))]
    y = 2.8
    for label, pct, col in uses:
        text(s, M, y, 3.4, 0.26, label, size=9.6, color=WHITE)
        text(s, M + 3.7, y, 0.8, 0.26, f"{pct}%", size=9.6, color=col, bold=True,
             align=PP_ALIGN.RIGHT)
        rect(s, M, y + 0.3, 4.4, 0.1, fill=RGBColor(0x33, 0x47, 0x70), radius=0.5)
        rect(s, M, y + 0.3, 4.4 * pct / 100, 0.1, fill=col, radius=0.5)
        y += 0.64

    text(s, M, 5.42, 4.6, 0.3, "Summa va shartlar — ochiq muhokama.",
         size=9, color=RGBColor(0x93, 0xA4, 0xBF))

    # milestones card
    mx = 6.62
    rect(s, mx, 2.7, SW - M - mx, 3.6, fill=RGBColor(0x24, 0x38, 0x60), radius=0.05)
    text(s, mx + 0.36, 2.9, 4.0, 0.26, "12 OYDAN KEYIN", size=8.5, color=GOLD,
         bold=True, spacing=140)
    ms = [("25 000", "ro'yxatdan o'tgan foydalanuvchi"),
          ("1 500", "to'lovchi Premium obunachi"),
          ("~1,6 mlrd", "so'm yillik daromad (ARR)"),
          ("3", "bozor: UZ, QZ, KG")]
    yy = 3.24
    for i, (v, l) in enumerate(ms):
        x = mx + 0.36 + (i % 2) * 2.9
        yy2 = yy + (i // 2) * 1.42
        text(s, x, yy2, 2.6, 0.44, v, size=19, color=WHITE, bold=True,
             font="Georgia")
        text(s, x, yy2 + 0.46, 2.55, 0.5, l, size=8.6,
             color=RGBColor(0xB9, 0xC7, 0xDC), line_spacing=1.3)

    text(s, M, 5.92, 5.4, 0.4,
         "«Chet elda o'qish — orzu emas, reja.»", size=12.5,
         color=RGBColor(0xD5, 0xDF, 0xEE), font="Georgia", italic=True)
    text(s, M, 6.52, 5.4, 0.3, "ScholarBridgeAI  ·  2026", size=9,
         color=RGBColor(0x93, 0xA4, 0xBF))
    text(s, mx, 6.52, SW - M - mx, 0.3,
         "Aloqa:  email@domen.uz  ·  @telegram", size=9,
         color=RGBColor(0x93, 0xA4, 0xBF), align=PP_ALIGN.RIGHT)
    notes(s, "Bu yerga aniq summa va aloqa ma'lumotlari qo'yiladi. Hozir "
             "ko'rsatilgan raqamlar 90 kunlik reja bilan izchil: 1 500 "
             "to'lovchi × 89 000 × 12 ≈ 1,6 mlrd so'm.")
    return s
