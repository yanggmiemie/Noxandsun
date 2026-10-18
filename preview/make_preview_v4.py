# -*- coding: utf-8 -*-
"""糖果罐 · 极简玻璃罐示意图 v4
修正：① 糖换成完整的小熊软糖，贴图时只取 alpha 最大连通块（杜绝半颗）
      ② 两颗糖收拢成一小堆，紧贴罐脚右前方，不再四处散
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from scipy import ndimage
import os

SRC = '/sdcard/Download/Operit/dev_package/com.nox.candy_jar/resources'
OUT = '/sdcard/Download/Operit/dev_package/com.nox.candy_jar/_preview/glass_v4.png'

W, H = 1000, 1400
BG = (245, 240, 231)
CX = 500
BASE_Y = 1256
JAR_H = 872

# ---------- 1. 纸底 ----------
canvas = Image.new('RGB', (W, H), BG)
grain = Image.effect_noise((W, H), 15).convert('RGB')
canvas = Image.blend(canvas, grain, 0.075)
big = Image.effect_noise((W // 12, H // 12), 90).convert('L').resize((W, H), Image.BICUBIC)
big = big.point(lambda v: 118 + int((v - 128) * 0.28))
canvas = Image.blend(canvas, Image.merge('RGB', (big, big, big)), 0.10)
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

# ---------- 3. 落地阴影 ----------
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh).ellipse((CX - 268, BASE_Y - 34, CX + 268, BASE_Y + 40), fill=(104, 94, 80, 66))
sh = sh.filter(ImageFilter.GaussianBlur(26))
canvas.alpha_composite(sh)

# ---------- 4. 罐子本体 ----------
canvas.alpha_composite(jar, (px_left, py_top))

# ---------- 5. 罐口麻绳 ----------
ROPE = (156, 118, 82, 255)
ROPE_DK = (120, 88, 58, 150)
neck_ys = int(JAR_H * 0.045)
xs0 = [x for x in range(jar.width) if pw[x, neck_ys] > 40]
neck_cx = (xs0[0] + xs0[-1]) / 2 + px_left if xs0 else CX
neck_w = int((xs0[-1] - xs0[0]) * 1.06) if xs0 else int(jar.width * 0.42)
rope_y = py_top + int(JAR_H * 0.062)

rope_l = Image.new('RGBA', (W, H), (0, 0, 0, 0))
dr = ImageDraw.Draw(rope_l)
half = neck_w // 2
pts = [(neck_cx + i, rope_y + int(8 * (1 - (i / half) ** 2))) for i in range(-half, half + 1, 2)]
dr.line([(x, y + 7) for (x, y) in pts], fill=ROPE_DK, width=9, joint='curve')
dr.line(pts, fill=ROPE, width=9, joint='curve')
dr.line([(x, y - 7) for (x, y) in pts], fill=ROPE, width=5, joint='curve')
kx, ky = neck_cx + int(neck_w * 0.10), rope_y + 11
dr.ellipse((kx - 12, ky - 11, kx + 12, ky + 13), fill=ROPE)
dr.line([(kx - 3, ky + 6), (kx - 14, ky + 38)], fill=ROPE, width=7)
dr.line([(kx + 6, ky + 7), (kx + 19, ky + 32)], fill=ROPE, width=7)
canvas.alpha_composite(rope_l.filter(ImageFilter.GaussianBlur(0.7)))


# ---------- 6. 糖：只取最大连通块，杜绝"半颗" ----------
def load_single_candy(name):
    im = Image.open(os.path.join(SRC, 'candy', name)).convert('RGBA')
    a = np.array(im.getchannel('A'))
    lab, k = ndimage.label(a > 60)
    if k > 1:
        sizes = ndimage.sum(a > 60, lab, range(1, k + 1))
        keep = int(np.argmax(sizes)) + 1
        mask = (lab == keep)
    else:
        mask = a > 0
    mask = ndimage.binary_fill_holes(mask)
    alpha = Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    out = im.copy(); out.putalpha(alpha)
    return out.crop(out.getchannel('A').getbbox())


def drop_candy(name, cx, cy, target_w, angle, tilt_shadow=0, shadow=48, blur=8):
    c = load_single_candy(name)
    s = target_w / c.width
    c = c.resize((target_w, max(1, int(c.height * s))), Image.LANCZOS)
    c = c.rotate(angle, expand=True, resample=Image.BICUBIC)
    w, h = c.size
    # 接触阴影：贴在脚底的一条窄影
    cs_ = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(cs_).ellipse((cx - w // 2 + int(w * 0.10), cy + h // 2 - 18,
                                 cx + w // 2 - int(w * 0.10), cy + h // 2 + 4),
                                fill=(100, 90, 74, shadow))
    cs_ = cs_.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(cs_)
    canvas.alpha_composite(c, (int(cx - w / 2), int(cy - h / 2)))


# 远一点的：黄熊，站在罐子右前，不压罐身
drop_candy('block_46.png', 828, 1262, 92, 9, shadow=44)
# 近一点的：粉熊，稍大，压在罐底右前方
drop_candy('block_47.png', 726, 1294, 112, -11, shadow=56, blur=9)

# ---------- 7. 导出 ----------
canvas.convert('RGB').save(OUT, quality=95)
print('saved', OUT)