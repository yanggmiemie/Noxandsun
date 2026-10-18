# -*- coding: utf-8 -*-
"""糖果罐 · 极简玻璃罐示意图 v1
底：米白纸纹 | 主：玻璃罐 | 细节：罐口麻绳 + 散两颗糖
"""
from PIL import Image, ImageDraw, ImageFilter
import os

SRC = '/sdcard/Download/Operit/dev_package/com.nox.candy_jar/resources'
OUT = '/sdcard/Download/Operit/dev_package/com.nox.candy_jar/_preview/glass_v1.png'

W, H = 1000, 1400
BG = (246, 241, 232)
CX = 500
BASE_Y = 1252          # 罐底落点
JAR_H = 830

# ---------- 1. 纸底 ----------
canvas = Image.new('RGB', (W, H), BG)
tex = Image.effect_noise((W, H), 16).convert('RGB')
canvas = Image.blend(canvas, tex, 0.06)

# 中心微微提亮，形成柔和渐晕
vig = Image.new('L', (W, H), 0)
ImageDraw.Draw(vig).ellipse((-260, -180, W + 260, H + 120), fill=52)
vig = vig.filter(ImageFilter.GaussianBlur(170))
canvas = Image.composite(Image.new('RGB', (W, H), (253, 250, 244)), canvas, vig)
canvas = canvas.convert('RGBA')

# ---------- 2. 罐子 ----------
jar = Image.open(os.path.join(SRC, 'jar/glass.png')).convert('RGBA')
jar = jar.crop(jar.getchannel('A').getbbox())
sc = JAR_H / jar.height
jar = jar.resize((max(1, int(jar.width * sc)), JAR_H), Image.LANCZOS)

# 用下半身 alpha 中心对齐（避免素材右侧空白把罐子推歪）
al = jar.getchannel('A'); pw = al.load()
cs = []
for y in range(int(JAR_H * 0.55), int(JAR_H * 0.95), 4):
    xs = [x for x in range(jar.width) if pw[x, y] > 40]
    if xs:
        cs.append((xs[0] + xs[-1]) / 2)
body_cx = sum(cs) / len(cs)
px_left = int(CX - body_cx)
py_top = BASE_Y - JAR_H

# ---------- 3. 落地阴影 ----------
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh).ellipse((CX - 285, BASE_Y - 38, CX + 285, BASE_Y + 44), fill=(96, 84, 68, 62))
sh = sh.filter(ImageFilter.GaussianBlur(30))
canvas.alpha_composite(sh)

# ---------- 4. 罐子本体 ----------
canvas.alpha_composite(jar, (px_left, py_top))

# ---------- 5. 罐口麻绳 ----------
ROPE = (162, 125, 88, 255)
rope = Image.new('RGBA', (W, H), (0, 0, 0, 0))
dr = ImageDraw.Draw(rope)

# 罐口大致位置：素材顶部附近
neck_w = int(jar.width * 0.40)
rope_y = py_top + int(JAR_H * 0.058)
half = neck_w // 2
pts = []
for i in range(-half, half + 1, 2):
    t = i / half                    # -1..1
    dy = int(9 * (1 - t * t))       # 中间略垂
    pts.append((CX + i, rope_y + dy))
dr.line(pts, fill=ROPE, width=8, joint='curve')
dr.line([(x, y - 7) for (x, y) in pts], fill=ROPE, width=5, joint='curve')   # 第二股，做出"缠绕"

# 结
kx, ky = CX + 6, rope_y + 12
dr.ellipse((kx - 13, ky - 12, kx + 13, ky + 14), fill=ROPE)
dr.line([(kx - 4, ky + 6), (kx - 16, ky + 40)], fill=ROPE, width=7)
dr.line([(kx + 6, ky + 8), (kx + 20, ky + 34)], fill=ROPE, width=7)
rope = rope.filter(ImageFilter.GaussianBlur(0.6))
canvas.alpha_composite(rope)

# ---------- 6. 散落的两颗糖 ----------
def drop_candy(name, cx, cy, target_w, angle):
    c = Image.open(os.path.join(SRC, 'candy', name)).convert('RGBA')
    c = c.crop(c.getchannel('A').getbbox())
    s = target_w / c.width
    c = c.resize((target_w, max(1, int(c.height * s))), Image.LANCZOS)
    c = c.rotate(angle, expand=True, resample=Image.BICUBIC)
    # 小阴影
    cs_ = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(cs_).ellipse((cx - c.width // 2 - 6, cy - 12, cx + c.width // 2 + 6, cy + 16),
                                fill=(96, 84, 68, 58))
    cs_ = cs_.filter(ImageFilter.GaussianBlur(9))
    canvas.alpha_composite(cs_)
    canvas.alpha_composite(c, (int(cx - c.width / 2), int(cy - c.height / 2)))

drop_candy('bean_04.png', 690, 1232, 150, -14)
drop_candy('bean_30.png', 858, 1262, 138, 12)

# ---------- 7. 导出 ----------
canvas.convert('RGB').save(OUT, quality=95)
print('saved', OUT, canvas.size)
