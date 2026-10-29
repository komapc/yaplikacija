#!/usr/bin/env python3
"""Generate public/og-image.png (1200x630), the social-preview card.

Run from the repo root:  python3 scripts/og-image.py
Needs Pillow and the Noto fonts (Debian/Ubuntu: fonts-noto-core). Only isolated
Arabic/Hebrew letters are drawn, so no text shaping (raqm) is required.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
BG, TEXT, MUTED, ACCENT = (10, 12, 16), (238, 242, 246), (138, 147, 164), (47, 227, 155)
NOTO = "/usr/share/fonts/truetype/noto/"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(NOTO + name, size)


img = Image.new("RGB", (W, H), BG)

# Aurora glows (mint top-left, cool blue bottom-right), as on the site.
glow = Image.new("RGB", (W, H), BG)
g = ImageDraw.Draw(glow)
g.ellipse((-260, -320, 640, 300), fill=(22, 70, 52))
g.ellipse((760, 380, 1500, 900), fill=(18, 30, 62))
img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(140)), 1.0)
d = ImageDraw.Draw(img)

# The three target letters on cards.
# (letter, font, IPA, vertical centre in the card; ع has a deep tail, so it sits higher)
glyphs = [("Ы", font("NotoSans-Bold.ttf", 150), "[ɨ]", 105),
          ("ع", font("NotoSansArabic-Bold.ttf", 130), "[ʕ]", 72),
          ("ע", font("NotoSansHebrew-Bold.ttf", 150), "[ʕ]", 105)]
ipa = font("NotoSans-Regular.ttf", 34)
card_w, card_h, gap, top = 230, 250, 36, 70
x0 = (W - (3 * card_w + 2 * gap)) // 2
for i, (ch, f, sym, cy) in enumerate(glyphs):
    x = x0 + i * (card_w + gap)
    d.rounded_rectangle((x, top, x + card_w, top + card_h), 28, fill=(20, 24, 31), outline=(29, 143, 99), width=3)
    d.text((x + card_w / 2, top + cy), ch, font=f, fill=ACCENT, anchor="mm")
    d.text((x + card_w / 2, top + card_h - 36), sym, font=ipa, fill=MUTED, anchor="mm")

d.text((W / 2, 410), "Аппликация Ы · Yaplikacija", font=font("NotoSans-Bold.ttf", 58), fill=TEXT, anchor="mm")
d.text((W / 2, 482), "Pronunciation trainer for the Russian Ы and the Arabic/Hebrew Ain",
       font=font("NotoSans-Regular.ttf", 32), fill=MUTED, anchor="mm")
d.text((W / 2, 560), "yaplikacija.lipu.dev", font=font("NotoSans-Bold.ttf", 30), fill=ACCENT, anchor="mm")

img.save("public/og-image.png", optimize=True)
print("wrote public/og-image.png", img.size)
