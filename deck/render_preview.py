"""Rasterise the .pptx with PIL so the layout can be visually checked.

This is a QA tool only (PowerPoint / Google Slides render the real thing);
it approximates fills, text wrapping, tables and charts closely enough to
catch overflow, collisions and contrast mistakes.
"""

import io
import os
import sys

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.util import Emu

DPI = 128
FONTS = {
    ("Arial", False): "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ("Arial", True): "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ("Georgia", False): "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ("Georgia", True): "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
}
_cache = {}


def font(name, size, bold=False, italic=False):
    key = (name, round(size, 1), bold, italic)
    if key not in _cache:
        path = FONTS.get((name, bold), FONTS[("Arial", bold)])
        _cache[key] = ImageFont.truetype(path, max(6, int(round(size * DPI / 72))))
    return _cache[key]


def px(emu):
    return int(round(Emu(emu).inches * DPI))


def rgb(color, default=(0, 0, 0)):
    try:
        c = color.rgb
        return (c[0], c[1], c[2]) if isinstance(c, tuple) else (int(str(c)[0:2], 16), int(str(c)[2:4], 16), int(str(c)[4:6], 16))
    except Exception:
        return default


def fill_of(shape):
    """(rgb, alpha 0-255) for solid AND gradient fills, else None."""
    try:
        f = shape.fill
    except Exception:
        return None
    try:
        if f.type == 1:  # solid
            return rgb(f.fore_color), 255
        if f.type == 5:  # gradient
            stops = f.gradient_stops
            cols = []
            for st in stops:
                c = st.color
                cols.append((int(c.rgb[0]), int(c.rgb[1]), int(c.rgb[2])))
            if cols:
                n = len(cols)
                avg = tuple(int(sum(c[i] for c in cols) / n) for i in range(3))
                return avg, 255
    except Exception:
        pass
    return None


def xml_alpha(shape):
    """Alpha of the shape's FILL only (shadow colours must not leak in)."""
    from pptx.oxml.ns import qn
    try:
        spPr = shape._element.spPr
        for solid in spPr.findall(qn("a:solidFill")):
            for srgb in solid.iter(qn("a:srgbClr")):
                a = srgb.find(qn("a:alpha"))
                if a is not None:
                    return int(a.get("val")) / 100000
            return 1.0
        for grad in spPr.findall(qn("a:gradFill")):
            return 1.0
    except Exception:
        pass
    return 1.0


def line_of(shape):
    try:
        ln = shape.line
        if ln.fill.type == 1:
            return rgb(ln.color), max(1, int(ln.width.pt * DPI / 72)) if ln.width else 1
    except Exception:
        pass
    return None


def draw_text_frame(draw, img, tf, box, defaults):
    x, y, w, h = box
    ml = px(tf.margin_left or 0)
    mt = px(tf.margin_top or 0)
    mr = px(tf.margin_right or 0)
    mb = px(tf.margin_bottom or 0)
    cx, cy = x + ml, y + mt
    maxw = w - ml - mr

    paragraphs = list(tf.paragraphs)
    # measure block height
    blocks = []
    for p in paragraphs:
        runs = []
        for r in p.runs:
            size = r.font.size.pt if r.font.size else defaults["size"]
            bold = bool(r.font.bold) if r.font.bold is not None else defaults["bold"]
            name = r.font.name or defaults["font"]
            col = rgb(r.font.color, defaults["color"]) if r.font.color and r.font.color.type is not None else defaults["color"]
            runs.append((r.text, size, bold, name, col))
        if not runs:
            runs = [(" ", defaults["size"], defaults["bold"], defaults["font"], defaults["color"])]
        ls = 1.15
        try:
            if p.line_spacing:
                ls = float(p.line_spacing)
        except Exception:
            pass
        sa = p.space_after.pt if p.space_after is not None else 0
        sb = p.space_before.pt if p.space_before is not None else 0
        align = str(p.alignment) if p.alignment is not None else "LEFT"

        # wrap runs into lines
        words = []
        for text, size, bold, name, col in runs:
            for chunk in text.split("\n"):
                words.append((chunk, size, bold, name, col, False))
            words.append((None, size, bold, name, col, True))  # soft break
        lines, cur, curw = [], [], 0.0
        space_w = 0.0
        for chunk, size, bold, name, col, is_break in words:
            if is_break:
                lines.append(cur)
                cur, curw = [], 0.0
                continue
            f = font(name, size, bold)
            pieces = chunk.split(" ")
            for i, piece in enumerate(pieces):
                token = (" " if i else "") + piece
                tw = draw.textlength(token, font=f)
                if curw + tw > maxw and cur:
                    lines.append(cur)
                    cur, curw = [], 0.0
                    token = piece
                    tw = draw.textlength(token, font=f)
                cur.append((token, size, bold, name, col))
                curw += tw
        if cur or not lines:
            lines.append(cur)
        blocks.append((lines, ls, sa, sb, align, p))

    total = 0
    for lines, ls, sa, sb, align, p in blocks:
        biggest = max((l[1] for line in lines for l in line), default=defaults["size"])
        total += sb * DPI / 72 + len(lines) * biggest * ls * DPI / 72 + sa * DPI / 72

    anchor = str(tf.vertical_anchor) if tf.vertical_anchor is not None else "TOP"
    if "MIDDLE" in anchor:
        cy = y + (h - total) / 2 + mt
    elif "BOTTOM" in anchor:
        cy = y + h - total - mb
    else:
        cy = y + mt

    overflow = total > (h - mt - mb + 2)
    for lines, ls, sa, sb, align, p in blocks:
        biggest = max((l[1] for line in lines for l in line), default=defaults["size"])
        cy += sb * DPI / 72
        for line in lines:
            lh = biggest * ls * DPI / 72
            lw = sum(draw.textlength(t, font=font(n, s, b)) for t, s, b, n, c in line)
            lx = cx
            if "CENTER" in align:
                lx = cx + (maxw - lw) / 2
            elif "RIGHT" in align or "END" in align:
                lx = cx + maxw - lw
            # baseline align: use anchor "ls" (left-baseline-ish)
            for t, s, b, n, c in line:
                draw.text((lx, cy), t, font=font(n, s, b), fill=c, anchor="lt")
                lx += draw.textlength(t, font=font(n, s, b))
            cy += lh
        cy += sa * DPI / 72
    return overflow


def render_slide(slide, out_path, warn):
    W = px(slide.part.package.presentation_part.presentation.slide_width)
    H = px(slide.part.package.presentation_part.presentation.slide_height)
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    # background
    try:
        bg = slide.background.fill
        if bg.type == 1:
            img.paste(Image.new("RGB", (W, H), rgb(bg.fore_color)), (0, 0))
            draw = ImageDraw.Draw(img)
    except Exception:
        pass

    for shape in slide.shapes:
        x, y = px(shape.left), px(shape.top)
        w, h = px(shape.width), px(shape.height)
        st = str(shape.shape_type)

        if shape.shape_type == 13 or shape.__class__.__name__ == "Picture":  # PICTURE
            try:
                pic = shape.image
                im = Image.open(io.BytesIO(pic.blob))
                # honour crop
                cl, cr = shape.crop_left or 0, shape.crop_right or 0
                ct, cb = shape.crop_top or 0, shape.crop_bottom or 0
                iw, ih = im.size
                box = (int(iw * cl), int(ih * ct), int(iw * (1 - cr)), int(ih * (1 - cb)))
                im = im.crop(box).convert("RGBA").resize((max(1, w), max(1, h)), Image.LANCZOS)
                img.paste(im, (x, y), im)
            except Exception as exc:
                draw.rectangle([x, y, x + w, y + h], fill=(220, 220, 220))
                warn.append(f"picture error: {exc}")
            continue

        if getattr(shape, "has_table", False) and shape.has_table:
            tbl = shape.table
            cy = y
            for r in range(len(tbl.rows)):
                rh = px(tbl.rows[r].height)
                cx = x
                for c in range(len(tbl.columns)):
                    cw = px(tbl.columns[c].width)
                    cell = tbl.cell(r, c)
                    try:
                        cf = cell.fill
                        col = rgb(cf.fore_color) if cf.type == 1 else (255, 255, 255)
                    except Exception:
                        col = (255, 255, 255)
                    draw.rectangle([cx, cy, cx + cw, cy + rh], fill=col,
                                   outline=(225, 231, 239))
                    if cell.text_frame is not None:
                        draw_text_frame(draw, img, cell.text_frame,
                                        (cx, cy, cw, rh),
                                        dict(size=9, bold=False, font="Arial",
                                             color=(30, 41, 59)))
                    cx += cw
                cy += rh
            continue

        if getattr(shape, "has_chart", False) and shape.has_chart:
            chart = shape.chart
            draw.rectangle([x, y, x + w, y + h], fill=(250, 251, 253),
                           outline=(225, 231, 239))
            try:
                plot = chart.plots[0]
                vals = list(plot.series[0].values)
                cats = list(plot.categories)
                maxv = max(vals) or 1
                pad = 30
                n = len(vals)
                bw = (w - 2 * pad) / max(1, n * 1.6)
                for i, v in enumerate(vals):
                    bx = x + pad + i * (bw * 1.6)
                    bh = (h - 90) * v / maxv
                    draw.rectangle([bx, y + h - 50 - bh, bx + bw, y + h - 50],
                                   fill=(28, 114, 147))
                    draw.text((bx + bw / 2, y + h - 44), str(v), anchor="mt",
                              font=font("Arial", 9, True), fill=(15, 23, 42))
                    if i < len(cats):
                        draw.text((bx + bw / 2, y + h - 30), str(cats[i]),
                                  anchor="mt", font=font("Arial", 7), fill=(120, 130, 145))
            except Exception as exc:
                warn.append(f"chart parse: {exc}")
            continue

        # ---- autoshape / textbox
        f = fill_of(shape)
        a = xml_alpha(shape) if f else 1.0
        ln = line_of(shape)
        shp_name = ""
        try:
            shp_name = shape.auto_shape_type
            shp_name = str(shp_name)
        except Exception:
            shp_name = "TEXT_BOX" if shape.has_text_frame and not hasattr(shape, "adjustments") else ""

        if f and a < 0.999:
            overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            od = ImageDraw.Draw(overlay)
            col = tuple(f[0]) + (int(255 * a),)
            if "ROUNDED" in shp_name:
                rad = int(min(w, h) * (shape.adjustments[0] if len(shape.adjustments) else 0.1))
                od.rounded_rectangle([x, y, x + w, y + h], radius=max(2, rad), fill=col)
            elif "OVAL" in shp_name:
                od.ellipse([x, y, x + w, y + h], fill=col)
            else:
                od.rectangle([x, y, x + w, y + h], fill=col)
            img.paste(overlay, (0, 0), overlay)
            draw = ImageDraw.Draw(img)
        elif f:
            col = tuple(f[0])
            if "ROUNDED" in shp_name:
                rad = int(min(w, h) * (shape.adjustments[0] if len(shape.adjustments) else 0.1))
                draw.rounded_rectangle([x, y, x + w, y + h], radius=max(2, rad),
                                       fill=col, outline=ln[0] if ln else None,
                                       width=ln[1] if ln else 1)
            elif "OVAL" in shp_name:
                draw.ellipse([x, y, x + w, y + h], fill=col,
                             outline=ln[0] if ln else None)
            else:
                draw.rectangle([x, y, x + w, y + h], fill=col,
                               outline=ln[0] if ln else None,
                               width=ln[1] if ln else 1)

        if shape.has_text_frame and shape.text_frame.text.strip():
            ov = draw_text_frame(draw, img, shape.text_frame, (x, y, w, h),
                                 dict(size=12, bold=False, font="Arial",
                                      color=(30, 41, 59)))
            if ov:
                warn.append(f"text overflow: {shape.text_frame.text[:60]!r}")

    img.save(out_path)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "ScholarBridgeAI_Pitch_Deck_UZ.pptx"
    outdir = sys.argv[2] if len(sys.argv) > 2 else "preview"
    os.makedirs(outdir, exist_ok=True)
    prs = Presentation(path)
    warn = []
    for i, slide in enumerate(prs.slides, start=1):
        p = os.path.join(outdir, f"slide-{i:02d}.png")
        render_slide(slide, p, warn)
    print(f"rendered {len(prs.slides)} slides -> {outdir}")
    if warn:
        print("\nWARNINGS:")
        for w in warn:
            print(" -", w)


if __name__ == "__main__":
    main()
