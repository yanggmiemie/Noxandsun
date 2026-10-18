# -*- coding: utf-8 -*-
"""糖果罐 · 极简玻璃罐示意图 v2
修正：罐子放大居中 / 麻绳贴合罐口带投影 / 两颗糖有前后+接触阴影 / 纸纹更真
"""
from PIL import Image, ImageDraw, ImageFilter
import os

SRC = '/sdcard/Download/Operit/dev_package/com.nox.candy_jar/resources'
OUT = '/sdcard/Download/Operit/dev_package/com.nox.candy_jar/_preview/glass_v3.png'

W, H = 1000, 1400
BG = (245, 240, 231)
CX = 500
BASE_Y = 1256
JAR_H = 872

# ---------- 1. 纸底 ----------
canvas = Image.new('RGB', (W, H), BG)

# 细颗粒
grain = Image.effect_noise((W, H), 15).convert('RGB')
canvas = Image.blend(canvas, grain, 0.075)

# 大尺度纸张不匀（低分辨率噪声放大）
big = Image.effect_noise((W // 12, H // 12), 90).convert('L').resize((W, H), Image.BICUBIC)
big = big.point(lambda v: 118 + int((v - 128) * 0.28))
canvas = Image.blend(canvas, Image.merge('RGB', (big, big, big)), 0.10)

# 中心提亮
vig = Image.new('L', (W, H), 0)
ImageDraw.Draw(vig).ellipse((-280, -200, W + 280, H + 120), fill=46)
vig = vig.filter(ImageFilter.GaussianBlur(180))
canvas = Image.composite(Image.new('RGB', (W, H), (253, 250, 243)), canvas, vig)
canvas = canvas.convert('RGBA')

# ---------- 2. 罐子 ----------
jar = Image.open(os.path.join(SRC, 'jar/glass.png')).convert('RGBA')
jar = jar.crop(jar.getchannel('A').getbbox())
sc = JAR_H / jar.height
jar = jar.resize((max(1, int(jar.width * sc)), JAR_H), Image.LANCZOS)

al = jar.getchannel('A'); pw = al.load()
cs = []
for y in range(int(JAR_H * 0.55), int(JAR_H * 0.95), 4):
    xs = [x for x in range(jar.width) if pw[x, y] > 40]
    if xs:
        cs.append((xs[0] + xs[-1]) / 2)
body_cx = sum(cs) / len(cs)
px_left = int(CX - body_cx)
py_top = BASE_Y - JAR_H

# ---------- 3. 落地阴影（玻璃罐：贴地、颜色偏冷） ----------
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh).ellipse((CX - 268, BASE_Y - 34, CX + 268, BASE_Y + 40), fill=(104, 94, 80, 66))
sh = sh.filter(ImageFilter.GaussianBlur(26))
canvas.alpha_composite(sh)

# ---------- 4. 罐子本体 ----------
canvas.alpha_composite(jar, (px_left, py_top))

# ---------- 5. 罐口麻绳 ----------
ROPE = (156, 118, 82, 255)
ROPE_DK = (120, 88, 58, 150)

# 先量一下罐口实际宽度（取顶部附近 alpha 范围）
neck_ys = int(JAR_H * 0.045)
xs0 = [x for x in range(jar.width) if pw[x, neck_ys] > 40]
neck_cx = (xs0[0] + xs0[-1]) / 2 + px_left if xs0 else CX
neck_w = int((xs0[-1] - xs0[0]) * 1.06) if xs0 else int(jar.width * 0.42)
rope_y = py_top + int(JAR_H * 0.062)

rope_l = Image.new('RGBA', (W, H), (0, 0, 0, 0))
dr = ImageDraw.Draw(rope_l)
half = neck_w // 2
pts = [(neck_cx + i, rope_y + int(8 * (1 - (i / half) ** 2))) for i in range(-half, half + 1, 2)]

# 绳下投影（贴住玻璃）
dr.line([(x, y + 7) for (x, y) in pts], fill=ROPE_DK, width=9, joint='curve')
# 主绳两股
dr.line(pts, fill=ROPE, width=9, joint='curve')
dr.line([(x, y - 7) for (x, y) in pts], fill=ROPE, width=5, joint='curve')

# 结（在罐口右偏一点，垂下来）
kx, ky = neck_cx + int(neck_w * 0.10), rope_y + 11
dr.ellipse((kx - 12, ky - 11, kx + 12, ky + 13), fill=ROPE)
dr.line([(kx - 3, ky + 6), (kx - 14, ky + 38)], fill=ROPE, width=7)
dr.line([(kx + 6, ky + 7), (kx + 19, ky + 32)], fill=ROPE, width=7)

rope = rope_l.filter(ImageFilter.GaussianBlur(0.7))
canvas.alpha_composite(rope)

# ---------- 6. 散落的糖（全部落在罐底前方/右前方的地面上，先远后近） ----------
def drop_candy(name, cx, cy, target_w, angle, shadow=44, blur=7):
    c = Image.open(os.path.join(SRC, 'candy', name)).convert('RGBA')
    c = c.crop(c.getchannel('A').getbbox())
    s = target_w / c.width
    c = c.resize((target_w, max(1, int(c.height * s))), Image.LANCZOS)
    c = c.rotate(angle, expand=True, resample=Image.BICUBIC)
    # 接触阴影：窄而贴地，压在糖的正下方
    cs_ = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(cs_).ellipse(
        (cx - c.width // 2 + 4, cy + c.height // 2 - 16,
         cx + c.width // 2 - 4, cy + c.height // 2 + 6),
        fill=(100, 90, 74, shadow))
    cs_ = cs_.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(cs_)
    canvas.alpha_composite(c, (int(cx - c.width / 2), int(cy - c.height / 2)))

# 远处那颗：贴在罐子右前的地上，不压罐身
drop_candy('bean_30.png', 872, 1292, 126, 10, shadow=42)
# 近处那颗：更靠下 = 更近观者，压在罐底前方
drop_candy('bean_04.png', 672, 1312, 162, -13, shadow=54, blur=8)

# ---------- 7. 导出 ----------
canvas.convert('RGB').save(OUT, quality=95)
print('saved', OUT, canvas.size, 'neck_cx=', round(neck_cx, 1), 'neck_w=', neck_w)