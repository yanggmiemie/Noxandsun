/**
 * 🍬 糖果罐 · 花色目录（共享常量）
 *
 * 这里定义「罐子可以是什么样」「糖果可以长成什么样」。
 * main 用它做参数校验与兜底，子包工具用它给 AI 提供可选项，UI 用它把存档里的
 * (shape, color) 换回真正的水彩素材图。
 *
 * ⚠️ 这一版目录是**长在真实资源上**的：
 *   罐型 6 种 ↔ resources/jar/*.png
 *   形状 11 种 / 颜色 15 种 ↔ resources/candy/*.png（共 77 颗）
 * 所以 ids 一旦发布就不再改（存档里存的是 id，不是中文名）。新增只追加、不重命名
 * ——改名等于让老罐子里的糖全部失去形状。
 */

import { CANDY_ASSETS, CANDY_BY_SHAPE, JAR_BY_ID, type CandyAsset } from './resources.js';

/** 罐型：对应 6 张真实罐子素材 */
const JAR_TYPES = [
    { id: 'tall', zh: '细长罐', emoji: '🫙', desc: '细长直筒，高瘦，适合装每天一点的小事' },
    { id: 'milk_bottle', zh: '牛奶瓶', emoji: '🍼', desc: '矮胖圆肩的牛奶瓶，圆滚滚、甜甜的' },
    { id: 'glass', zh: '玻璃罐', emoji: '🏺', desc: '圆肩宽体的经典玻璃罐，什么糖都装得下' },
    { id: 'mason', zh: '梅森罐', emoji: '🥫', desc: '八角棱柱的梅森罐，系着麻绳蝴蝶结，很居家' },
    { id: 'belly', zh: '大肚罐', emoji: '🫗', desc: '大肚圆筒、瓶口收窄，能装很多很多' },
    { id: 'flower_jar', zh: '花边罐', emoji: '🌸', desc: '波浪花边的罐身，像一朵云，适合装柔软的话' }
];

/** 糖果形状：对应 77 颗真实糖里归纳出的 11 种轮廓 */
const CANDY_SHAPES = [
    { id: 'round', zh: '圆糖', emoji: '🔴', desc: '最经典的圆形硬糖，什么话都合适' },
    { id: 'heart', zh: '心形糖', emoji: '💗', desc: '一颗心，适合写喜欢' },
    { id: 'star', zh: '星星糖', emoji: '⭐', desc: '小小的星，适合写愿望' },
    { id: 'drop', zh: '水滴糖', emoji: '💧', desc: '一滴，适合写想哭又忍住了的事' },
    { id: 'flower', zh: '小花糖', emoji: '🌸', desc: '五瓣小花，适合写细小的高兴' },
    { id: 'moon', zh: '月牙糖', emoji: '🌙', desc: '弯弯的月牙，适合写晚安' },
    { id: 'block', zh: '方块糖', emoji: '🟪', desc: '规规矩矩的块状软糖，适合写正经事' },
    { id: 'bean', zh: '糖豆', emoji: '🫘', desc: '圆滚滚的糖豆，适合写碎碎念' },
    { id: 'wrapper', zh: '糖纸糖', emoji: '🍬', desc: '两头拧起来的糖纸糖，最有节日感' },
    { id: 'lollipop', zh: '棒棒糖', emoji: '🍭', desc: '带小棍的棒棒糖，适合写要慢慢含着的话' },
    { id: 'cane', zh: '拐杖糖', emoji: '🎄', desc: '红白螺旋的拐杖糖，适合写冬天和节日' }
];

/** 糖果配色：15 个色名，每一个都能在素材里找到对应的糖 */
const CANDY_COLORS = [
    { id: 'pink', zh: '樱花粉', hex: '#F2A0BE' },
    { id: 'pink_green', zh: '粉青', hex: '#F0B8C8' },
    { id: 'orange', zh: '蜜橘', hex: '#F0A868' },
    { id: 'yellow', zh: '柠檬黄', hex: '#F2DC7A' },
    { id: 'gold', zh: '琥珀金', hex: '#E8C063' },
    { id: 'cream', zh: '奶油白', hex: '#F2E8D8' },
    { id: 'red', zh: '樱桃红', hex: '#E0685C' },
    { id: 'deep_red', zh: '莓果红', hex: '#B5453F' },
    { id: 'mint', zh: '薄荷绿', hex: '#A8DCC0' },
    { id: 'green', zh: '草绿', hex: '#8CC272' },
    { id: 'teal', zh: '湖水青', hex: '#7CC8C0' },
    { id: 'blue', zh: '天空蓝', hex: '#9CC4E8' },
    { id: 'purple', zh: '葡萄紫', hex: '#B18CD8' },
    { id: 'lilac', zh: '薰衣草', hex: '#C8B4E8' },
    { id: 'rainbow', zh: '彩虹', hex: '#F2B6D2' }
];

/** 罐子默认糖色（新建罐子时如果没指定，就按罐型给一个顺眼的） */
const JAR_DEFAULT_COLOR = {
    tall: 'teal',
    milk_bottle: 'cream',
    glass: 'blue',
    mason: 'gold',
    belly: 'pink',
    flower_jar: 'lilac'
};

const SHAPE_IDS = CANDY_SHAPES.map(function (x: any) { return x.id; });
const COLOR_IDS = CANDY_COLORS.map(function (x: any) { return x.id; });
const JAR_TYPE_IDS = JAR_TYPES.map(function (x: any) { return x.id; });

/** 形状别名表：中文 / 拼音 / 英文俗名 → 标准 id */
const SHAPE_ALIAS: Record<string, string> = {
    circle: 'round', ball: 'round', yuan: 'round', yuanxing: 'round', '圆': 'round',
    love: 'heart', xin: 'heart', xinxing: 'heart', '爱心': 'heart',
    xing: 'star', xingxing: 'star', '星星': 'star',
    water: 'drop', shuidi: 'drop', tear: 'drop', '水滴': 'drop',
    hua: 'flower', blossom: 'flower', '花': 'flower',
    yue: 'moon', yueliang: 'moon', '月亮': 'moon', '月牙': 'moon',
    square: 'block', cube: 'block', fang: 'block', fangtang: 'block',
    gummy: 'block', soft: 'block', '软糖': 'block', '方块': 'block', '方糖': 'block',
    doudou: 'bean', jellybean: 'bean', ellipse: 'bean', '糖豆': 'bean', '椭圆': 'bean',
    candy: 'wrapper', tangzhi: 'wrapper', wrapped: 'wrapper', '糖纸': 'wrapper',
    lolli: 'lollipop', bangbangtang: 'lollipop', '棒棒': 'lollipop', '棒棒糖': 'lollipop',
    cane_candy: 'cane', guaizhang: 'cane', '拐杖': 'cane', '圣诞': 'cane'
};

/** 颜色别名表 */
const COLOR_ALIAS: Record<string, string> = {
    sakura: 'pink', rose: 'pink', fen: 'pink', '粉': 'pink', '粉色': 'pink', '樱花': 'pink',
    hong: 'red', '红': 'red', '红色': 'red', '樱桃': 'red',
    berry: 'deep_red', crimson: 'deep_red', '深红': 'deep_red', '莓果': 'deep_red',
    cheng: 'orange', '橙': 'orange', '橘': 'orange', '橙色': 'orange', '蜜橘': 'orange',
    huang: 'yellow', lemon: 'yellow', '黄': 'yellow', '黄色': 'yellow', '柠檬': 'yellow',
    amber: 'gold', '金': 'gold', '琥珀': 'gold', '金黄': 'gold',
    milk: 'cream', white: 'cream', bai: 'cream', '白': 'cream', '米白': 'cream', '奶': 'cream',
    lv: 'green', grass: 'green', '绿': 'green', '草绿': 'green',
    mint_green: 'mint', '薄荷': 'mint',
    cyan: 'teal', soda: 'teal', qing: 'teal', '青': 'teal', '湖水': 'teal',
    lan: 'blue', sky: 'blue', '蓝': 'blue', '蓝色': 'blue', '天空': 'blue',
    zi: 'purple', grape: 'purple', '紫': 'purple', '葡萄': 'purple',
    lavender: 'lilac', '薰衣草': 'lilac', '淡紫': 'lilac',
    colorful: 'rainbow', '彩': 'rainbow', '彩虹': 'rainbow',
    '粉青': 'pink_green'
};

/** 把任意输入（id / 中文名 / 别名 / emoji）解析成合法形状 id，认不出就回退 round */
function resolveShape(raw: any): string {
    const input = String(raw === undefined || raw === null ? '' : raw).trim();
    const s = input.toLowerCase();
    if (!s) return 'round';
    if (SHAPE_IDS.indexOf(s) >= 0) return s;
    for (let i = 0; i < CANDY_SHAPES.length; i++) {
        const t: any = CANDY_SHAPES[i];
        if (t.zh === input || t.emoji === input) return t.id;
        if (s.length >= 2 && t.zh.indexOf(s) >= 0) return t.id;
    }
    if (SHAPE_ALIAS[s]) return SHAPE_ALIAS[s];
    if (SHAPE_ALIAS[input]) return SHAPE_ALIAS[input];
    for (let i = 0; i < CANDY_SHAPES.length; i++) {
        const t: any = CANDY_SHAPES[i];
        if (input.indexOf(t.emoji) >= 0) return t.id;
    }
    return 'round';
}

/** 把任意输入解析成合法配色 id */
function resolveColor(raw: any): string {
    const input = String(raw === undefined || raw === null ? '' : raw).trim();
    const s = input.toLowerCase();
    if (!s) return 'pink';
    if (COLOR_IDS.indexOf(s) >= 0) return s;
    if (/^#[0-9a-f]{6}$/.test(s) || /^#[0-9a-f]{8}$/.test(s)) {
        return nearestColor(s);
    }
    for (let i = 0; i < CANDY_COLORS.length; i++) {
        const c: any = CANDY_COLORS[i];
        if (c.zh === input) return c.id;
        if (s.length >= 1 && c.zh.indexOf(s) >= 0) return c.id;
    }
    if (COLOR_ALIAS[s]) return COLOR_ALIAS[s];
    if (COLOR_ALIAS[input]) return COLOR_ALIAS[input];
    return 'pink';
}

/** 解析罐型 */
function resolveJarType(raw: any): string {
    const input = String(raw === undefined || raw === null ? '' : raw).trim();
    const s = input.toLowerCase();
    if (!s) return 'glass';
    if (JAR_TYPE_IDS.indexOf(s) >= 0) return s;
    for (let i = 0; i < JAR_TYPES.length; i++) {
        const t: any = JAR_TYPES[i];
        if (t.zh === input || t.emoji === input) return t.id;
    }
    if (s === 'bottle' || s === 'ping' || s === 'milk' || s === 'nai' || s === '牛奶瓶') return 'milk_bottle';
    if (s === 'jar' || s === 'glass_jar' || s === '玻璃罐') return 'glass';
    if (s === 'mason_jar' || s === '梅森罐') return 'mason';
    if (s === 'big' || s === 'dadu' || s === '大肚罐') return 'belly';
    if (s === 'flower' || s === 'huabian' || s === '花边罐') return 'flower_jar';
    if (s === 'long' || s === 'thin' || s === 'xichang' || s === '细长罐') return 'tall';
    return 'glass';
}

function hexToRgb(hex: string): number[] {
    let h = hex.replace('#', '');
    if (h.length === 8) h = h.slice(2);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function nearestColor(hex: string): string {
    const target = hexToRgb(hex);
    let best = CANDY_COLORS[0].id;
    let bestD = -1;
    for (let i = 0; i < CANDY_COLORS.length; i++) {
        const rgb = hexToRgb((CANDY_COLORS[i] as any).hex);
        const d = Math.pow(rgb[0] - target[0], 2) + Math.pow(rgb[1] - target[1], 2) + Math.pow(rgb[2] - target[2], 2);
        if (bestD < 0 || d < bestD) { bestD = d; best = CANDY_COLORS[i].id; }
    }
    return best;
}

function colorHexOf(id: string): string {
    for (let i = 0; i < CANDY_COLORS.length; i++) {
        if ((CANDY_COLORS[i] as any).id === id) return (CANDY_COLORS[i] as any).hex;
    }
    return '#F2A0BE';
}

function shapeInfo(id: string): any {
    for (let i = 0; i < CANDY_SHAPES.length; i++) {
        if ((CANDY_SHAPES[i] as any).id === id) return CANDY_SHAPES[i];
    }
    return CANDY_SHAPES[0];
}

function colorInfo(id: string): any {
    for (let i = 0; i < CANDY_COLORS.length; i++) {
        if ((CANDY_COLORS[i] as any).id === id) return CANDY_COLORS[i];
    }
    return CANDY_COLORS[0];
}

function jarInfo(id: string): any {
    for (let i = 0; i < JAR_TYPES.length; i++) {
        if ((JAR_TYPES[i] as any).id === id) return JAR_TYPES[i];
    }
    return JAR_TYPES[0];
}

/**
 * 按 (形状, 颜色) 挑一颗真实的糖。
 *
 * 77 颗糖撑不满 11×15 的组合，所以这里按「先保形状、再保颜色、最后随便给一颗」
 * 的顺序回退——宁可颜色不准，也别让罐子里出现一颗看不见的糖。
 *
 * @param salt 同组合有多张图时用它稳定挑选，保证同一颗糖每次渲染长得一样
 */
function pickCandyAsset(shape: string, color: string, salt?: number): CandyAsset {
    const s = resolveShape(shape);
    const c = resolveColor(color);
    const byShape: CandyAsset[] = (CANDY_BY_SHAPE[s] || []);
    const exact: CandyAsset[] = [];
    for (let i = 0; i < byShape.length; i++) {
        if (byShape[i].color === c) exact.push(byShape[i]);
    }
    if (exact.length) return exact[Math.abs(salt || 0) % exact.length];
    if (byShape.length) return byShape[Math.abs(salt || 0) % byShape.length];
    return CANDY_ASSETS[Math.abs(salt || 0) % CANDY_ASSETS.length];
}

/** 罐子素材（含图片路径与 readResource 用的 key），认不出就回退 glass */
function jarAsset(typeId: string): any {
    return JAR_BY_ID[resolveJarType(typeId)] || JAR_BY_ID['glass'];
}

/** 这类形状有多少颗真糖可选 */
function shapeCount(shape: string): number {
    return (CANDY_BY_SHAPE[shape] || []).length;
}

/** 这个颜色有多少颗真糖可选 */
function colorCount(color: string): number {
    let n = 0;
    for (let i = 0; i < CANDY_ASSETS.length; i++) {
        if (CANDY_ASSETS[i].color === color) n++;
    }
    return n;
}

export {
    JAR_TYPES,
    CANDY_SHAPES,
    CANDY_COLORS,
    JAR_DEFAULT_COLOR,
    resolveShape,
    resolveColor,
    resolveJarType,
    colorHexOf,
    shapeInfo,
    colorInfo,
    jarInfo,
    pickCandyAsset,
    jarAsset,
    shapeCount,
    colorCount
};