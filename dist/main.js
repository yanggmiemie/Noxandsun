"use strict";
/**
 * 🍬 糖果罐 Candy Jar · ToolPkg 主入口
 *
 * 职责：
 *  1. registerToolPkg 注册 Compose DSL UI 路由 + 主侧边栏 / 工具箱入口
 *  2. IPC handler：糖果罐数据层 —— 建罐、投糖、改糖、取出糖、摇一摇
 *
 * 数据模型（candy_jar.json）：
 *  jar    = { id, name, jarType, intro, createdAt, updatedAt }
 *  candy  = { id, jarId, shape, color, flavor, title, text, mood,
 *             order, x, y, rot, size, createdAt, readAt }
 *
 * 关于 x / y / rot / size：
 *   都是「罐内百分比坐标」，由本文件统一算好写进存档（而不是让 UI 每次自己算）。
 *   这样同一罐糖在任何设备上、任何窗口尺寸下，堆叠的样子都一致；
 *   摇一摇（shake）也只是重算一遍这些数字。
 *
 * 罐子与糖果数据保存在 main 上下文（同一 ToolPkg 容器内唯一稳定内存态），
 * UI 模块与子包工具都通过 ToolPkg.ipc 访问。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_js_1 = require("./catalog.js");
const index_ui_js_1 = __importDefault(require("./ui/index.ui.js"));
const PLUGIN_ID = 'candy_jar';
const TOOLPKG_ID = 'com.nox.candy_jar';
const UI_ID = 'candy_jar';
const UI_ROUTE = 'toolpkg:' + TOOLPKG_ID + ':ui:' + UI_ID;
const STORE_FILE = 'candy_jar.json';
/** 单罐糖果上限：再多罐子也塞不下了，超出就挡回去（并说明原因，而不是静默丢弃） */
const MAX_CANDY_PER_JAR = 240;
/** 便签正文上限：糖纸就这么大，写太长会溢出 */
const MAX_TEXT_LEN = 2000;
let baseDir = '';
let jars = [];
let candies = [];
let loaded = false;
// ---------------------------------------------------------------- 存储层
async function ensureDir() {
    if (baseDir)
        return baseDir;
    try {
        baseDir = getPluginConfigDir(PLUGIN_ID);
    }
    catch (e) {
        baseDir = '/sdcard/Download/Operit/plugins/candy_jar';
    }
    try {
        await Tools.Files.mkdir(baseDir, true);
    }
    catch (e) { /* ignore */ }
    return baseDir;
}
function storePath() {
    return baseDir.replace(/\/+$/, '') + '/' + STORE_FILE;
}
async function fileExists(path) {
    try {
        const r = await Tools.Files.exists(path);
        if (r === true)
            return true;
        if (r && typeof r === 'object')
            return !!(r.exists || r.result || r.value);
        return false;
    }
    catch (e) {
        return false;
    }
}
async function loadStore() {
    await ensureDir();
    if (loaded)
        return;
    loaded = true;
    try {
        if (await fileExists(storePath())) {
            const r = await Tools.Files.read(storePath());
            const txt = r && (typeof r.content === 'string' ? r.content : (typeof r === 'string' ? r : null));
            if (txt && txt.trim()) {
                const obj = JSON.parse(txt);
                // 兼容两种历史形态：{jars,candies} 与裸数组（早期只有糖果没有罐子）
                if (Array.isArray(obj)) {
                    candies = obj;
                }
                else if (obj && typeof obj === 'object') {
                    if (Array.isArray(obj.jars))
                        jars = obj.jars;
                    if (Array.isArray(obj.candies))
                        candies = obj.candies;
                }
            }
        }
    }
    catch (e) {
        jars = [];
        candies = [];
    }
    // 老存档里可能缺字段，这里补齐，避免 UI 拿到半成品
    for (let i = 0; i < jars.length; i++) {
        const j = jars[i] || {};
        j.id = String(j.id || ('jar_' + i));
        j.name = String(j.name || '糖果罐');
        j.jarType = (0, catalog_js_1.resolveJarType)(j.jarType);
        j.intro = String(j.intro || '');
        j.createdAt = Number(j.createdAt || 0) || Date.now();
        j.updatedAt = Number(j.updatedAt || 0) || j.createdAt;
        jars[i] = j;
    }
    for (let i = 0; i < candies.length; i++) {
        const c = candies[i] || {};
        c.id = String(c.id || ('candy_' + i));
        c.jarId = String(c.jarId || (jars[0] ? jars[0].id : ''));
        c.shape = (0, catalog_js_1.resolveShape)(c.shape);
        c.color = (0, catalog_js_1.resolveColor)(c.color);
        c.flavor = String(c.flavor || '');
        c.title = String(c.title || '');
        c.text = String(c.text || '');
        c.mood = String(c.mood || '');
        c.order = Number(c.order || 0) || (i + 1);
        c.size = Number(c.size || 0) || 0;
        c.rot = Number(c.rot || 0);
        c.createdAt = Number(c.createdAt || 0) || Date.now();
        c.readAt = Number(c.readAt || 0);
        candies[i] = c;
    }
    // 有糖却没罐子（或糖指向的罐子已不存在）：补一个默认罐收容，别让糖变成孤儿
    if (candies.length && !jars.length) {
        jars.push(newJar('我的糖果罐', 'glass', ''));
    }
    for (let i = 0; i < candies.length; i++) {
        if (!findJar(candies[i].jarId))
            candies[i].jarId = jars[0].id;
    }
}
async function saveStore() {
    await ensureDir();
    try {
        await Tools.Files.write(storePath(), JSON.stringify({ jars: jars, candies: candies }, null, 2));
    }
    catch (e) { /* ignore */ }
}
// ---------------------------------------------------------------- 工具函数
function ok(data) {
    return Object.assign({ success: true }, data || {});
}
function fail(message) {
    return { success: false, message: message };
}
function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function newJar(name, jarType, intro) {
    const now = Date.now();
    return {
        id: newId('jar'),
        name: String(name || '').trim() || '糖果罐',
        jarType: (0, catalog_js_1.resolveJarType)(jarType),
        intro: String(intro || '').trim(),
        createdAt: now,
        updatedAt: now
    };
}
function findJar(id) {
    if (!id)
        return null;
    for (let i = 0; i < jars.length; i++) {
        if (jars[i] && jars[i].id === id)
            return jars[i];
    }
    return null;
}
function findCandy(id) {
    if (!id)
        return null;
    for (let i = 0; i < candies.length; i++) {
        if (candies[i] && candies[i].id === id)
            return candies[i];
    }
    return null;
}
function candiesOf(jarId) {
    const out = [];
    for (let i = 0; i < candies.length; i++) {
        if (candies[i] && candies[i].jarId === jarId)
            out.push(candies[i]);
    }
    out.sort(function (a, b) {
        if (a.order !== b.order)
            return a.order - b.order;
        return a.createdAt - b.createdAt;
    });
    return out;
}
/** 取默认罐：没指定 jar_id 时用它；一个罐子都没有就先造一个 */
function defaultJar() {
    if (jars.length)
        return jars[0];
    const j = newJar('我的糖果罐', 'glass', '');
    jars.push(j);
    return j;
}
/** FNV-1a：把糖果 id 变成稳定的伪随机种子 */
function hashSeed(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
}
function rand01(seed, salt) {
    let x = (seed + Math.imul(salt, 374761393)) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return x / 4294967296;
}
/**
 * 重排某一罐里所有糖果的堆叠位置。
 *
 * 规则（从下往上堆，像真的糖倒进罐子）：
 *  - 每层 3 颗，铺满一层再往上走；
 *  - 纵向可用区间 26%~84%，层数越多层距越小（罐子就那么大，只能挤一挤）；
 *  - 每颗糖带一点确定性抖动（同一 id 每次算出来一样），免得像军阵一样整齐。
 *
 * @param jarId 目标罐
 * @param jitter 是否抖动（摇一摇时传 true，会额外叠一层随机，晃得更活）
 */
function relayout(jarId, jitter) {
    const list = candiesOf(jarId);
    const n = list.length;
    if (!n)
        return;
    const PER_LAYER = 3;
    const layers = Math.ceil(n / PER_LAYER);
    const BOTTOM = 84;
    const TOP = 26;
    const span = BOTTOM - TOP;
    const gap = layers <= 1 ? 0 : Math.min(11, span / (layers - 1));
    for (let i = 0; i < n; i++) {
        const c = list[i];
        const layer = Math.floor(i / PER_LAYER);
        const inLayer = i % PER_LAYER;
        const countInLayer = Math.min(PER_LAYER, n - layer * PER_LAYER);
        const seed = hashSeed(String(c.id));
        // 层越往上越窄一点，堆成小丘的形状
        const shrink = 1 - Math.min(0.22, layer * 0.035);
        const spacing = 25 * shrink;
        const centerOffset = (inLayer - (countInLayer - 1) / 2) * spacing;
        const jx = jitter ? (rand01(seed, 7 + i) - 0.5) * 7 : (rand01(seed, 7) - 0.5) * 3.2;
        const jy = jitter ? (rand01(seed, 11 + i) - 0.5) * 2.4 : (rand01(seed, 11) - 0.5) * 1.1;
        c.x = Math.max(12, Math.min(88, 50 + centerOffset + jx));
        c.y = Math.max(20, Math.min(88, BOTTOM - layer * gap + jy));
        c.rot = (rand01(seed, 13) - 0.5) * 34;
        // 显示尺寸（dp）：罐子舞台 260x360，糖要看得清花纹才值得用真图
        if (!c.size)
            c.size = 34 + rand01(seed, 17) * 8;
    }
}
/** 没指定花色时，替 AI 挑一个：形状轮换、颜色轮换，保证一罐糖五颜六色 */
function autoPick(jarId) {
    const count = candiesOf(jarId).length;
    const shape = catalog_js_1.CANDY_SHAPES[count % catalog_js_1.CANDY_SHAPES.length].id;
    const color = catalog_js_1.CANDY_COLORS[(count * 5 + 3) % catalog_js_1.CANDY_COLORS.length].id;
    return { shape: shape, color: color };
}
function statsOf(jarId) {
    const perJar = jars.map(function (j) {
        return { jar_id: j.id, name: j.name, jar_type: j.jarType, candy_count: candiesOf(j.id).length };
    });
    const scope = jarId ? candiesOf(jarId) : candies;
    let unread = 0;
    for (let i = 0; i < scope.length; i++) {
        if (!scope[i].readAt)
            unread++;
    }
    return {
        jar_count: jars.length,
        candy_count: scope.length,
        total_candy: candies.length,
        unread_count: unread,
        jars: perJar
    };
}
function shapeInfo(id) {
    for (let i = 0; i < catalog_js_1.CANDY_SHAPES.length; i++) {
        if (catalog_js_1.CANDY_SHAPES[i].id === id)
            return catalog_js_1.CANDY_SHAPES[i];
    }
    return catalog_js_1.CANDY_SHAPES[0];
}
function colorInfo(id) {
    for (let i = 0; i < catalog_js_1.CANDY_COLORS.length; i++) {
        if (catalog_js_1.CANDY_COLORS[i].id === id)
            return catalog_js_1.CANDY_COLORS[i];
    }
    return catalog_js_1.CANDY_COLORS[0];
}
/** 给糖果补上可读的描述字段（UI 与工具返回值都用这套） */
function decorate(c) {
    const s = shapeInfo(c.shape);
    const col = colorInfo(c.color);
    return {
        id: c.id,
        candy_id: c.id,
        jar_id: c.jarId,
        shape: c.shape,
        shape_name: s.zh,
        shape_emoji: s.emoji,
        color: c.color,
        color_name: col.zh,
        color_hex: col.hex,
        flavor: c.flavor || '',
        title: c.title || '',
        text: c.text || '',
        mood: c.mood || '',
        order: c.order,
        x: c.x,
        y: c.y,
        rot: c.rot,
        size: c.size,
        created_at: c.createdAt,
        read_at: c.readAt || 0,
        unread: !c.readAt
    };
}
// ---------------------------------------------------------------- IPC：罐子
async function ipcCatalog() {
    return ok({
        jar_types: catalog_js_1.JAR_TYPES,
        shapes: catalog_js_1.CANDY_SHAPES,
        colors: catalog_js_1.CANDY_COLORS,
        max_candy_per_jar: MAX_CANDY_PER_JAR,
        max_text_len: MAX_TEXT_LEN
    });
}
async function ipcListJars() {
    await loadStore();
    const list = jars.map(function (j) {
        const cs = candiesOf(j.id);
        let lastAt = 0;
        for (let i = 0; i < cs.length; i++) {
            if (cs[i].createdAt > lastAt)
                lastAt = cs[i].createdAt;
        }
        return {
            jar_id: j.id,
            id: j.id,
            name: j.name,
            jar_type: j.jarType,
            intro: j.intro || '',
            candy_count: cs.length,
            last_candy_at: lastAt,
            created_at: j.createdAt,
            updated_at: j.updatedAt
        };
    });
    list.sort(function (a, b) { return (b.last_candy_at || b.created_at) - (a.last_candy_at || a.created_at); });
    return ok({ jars: list, stats: statsOf() });
}
async function ipcCreateJar(payload) {
    await loadStore();
    const p = payload || {};
    const jar = newJar(p.name, p.jar_type || p.jarType, p.intro);
    jars.push(jar);
    await saveStore();
    return ok({ jar: jar, stats: statsOf(), message: '罐子摆好了：' + jar.name });
}
async function ipcUpdateJar(payload) {
    await loadStore();
    const p = payload || {};
    const jar = findJar(p.jar_id);
    if (!jar)
        return fail('没有找到这只罐子');
    if (p.name !== undefined)
        jar.name = String(p.name).trim() || jar.name;
    if (p.intro !== undefined)
        jar.intro = String(p.intro).trim();
    if (p.jar_type !== undefined)
        jar.jarType = (0, catalog_js_1.resolveJarType)(p.jar_type);
    jar.updatedAt = Date.now();
    await saveStore();
    return ok({ jar: jar, stats: statsOf() });
}
async function ipcDeleteJar(payload) {
    await loadStore();
    const p = payload || {};
    const id = p.jar_id;
    const jar = findJar(id);
    if (!jar)
        return fail('没有找到这只罐子');
    const owned = candiesOf(id);
    // 罐子里还有糖时必须显式确认：罐子一碎，里面的糖就全没了，不能悄悄丢
    if (owned.length && !p.force) {
        return fail('这只罐子里还有 ' + owned.length + ' 颗糖。要连糖一起倒掉的话，请传 force=true。');
    }
    jars = jars.filter(function (j) { return !j || j.id !== id; });
    candies = candies.filter(function (c) { return !c || c.jarId !== id; });
    if (!jars.length && candies.length)
        jars.push(newJar('我的糖果罐', 'glass', ''));
    await saveStore();
    return ok({ deleted: id, removed_candy: owned.length, stats: statsOf(), message: '罐子已经收走了' });
}
// ---------------------------------------------------------------- IPC：糖果
async function ipcDropCandy(payload) {
    await loadStore();
    const p = payload || {};
    const text = String(p.text === undefined || p.text === null ? '' : p.text).trim();
    if (!text)
        return fail('便签是空的——写上点什么再投进去吧');
    if (text.length > MAX_TEXT_LEN)
        return fail('这段话太长了（' + text.length + ' 字），糖纸写不下，请压到 ' + MAX_TEXT_LEN + ' 字以内');
    let jar = findJar(p.jar_id);
    if (!jar) {
        // 没指定罐子：用默认罐；一个都没有就顺手造一个，别让 AI 卡在「先建罐」这一步
        jar = defaultJar();
    }
    const owned = candiesOf(jar.id);
    if (owned.length >= MAX_CANDY_PER_JAR) {
        return fail('这只罐子已经装满 ' + MAX_CANDY_PER_JAR + ' 颗糖了，先取出一些再投吧');
    }
    const picked = autoPick(jar.id);
    const shape = p.shape !== undefined && p.shape !== null && String(p.shape).trim() !== ''
        ? (0, catalog_js_1.resolveShape)(p.shape) : picked.shape;
    const color = p.color !== undefined && p.color !== null && String(p.color).trim() !== ''
        ? (0, catalog_js_1.resolveColor)(p.color) : picked.color;
    let maxOrder = 0;
    for (let i = 0; i < owned.length; i++) {
        if (owned[i].order > maxOrder)
            maxOrder = owned[i].order;
    }
    const now = Date.now();
    const candy = {
        id: newId('candy'),
        jarId: jar.id,
        shape: shape,
        color: color,
        flavor: String(p.flavor || '').trim(),
        title: String(p.title || '').trim(),
        text: text,
        mood: String(p.mood || '').trim(),
        order: maxOrder + 1,
        x: 50,
        y: 84,
        rot: 0,
        size: 0,
        createdAt: now,
        readAt: 0
    };
    candies.push(candy);
    relayout(jar.id);
    jar.updatedAt = now;
    await saveStore();
    const s = shapeInfo(shape);
    return ok({
        candy: decorate(candy),
        jar: { jar_id: jar.id, name: jar.name, jar_type: jar.jarType, candy_count: candiesOf(jar.id).length },
        stats: statsOf(),
        message: '把一颗' + s.zh + '投进了「' + jar.name + '」'
    });
}
async function ipcListCandies(payload) {
    await loadStore();
    const p = payload || {};
    let list;
    if (p.jar_id) {
        const jar = findJar(p.jar_id);
        if (!jar)
            return fail('没有找到这只罐子');
        list = candiesOf(jar.id);
    }
    else {
        list = candies.slice();
        list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    }
    if (p.unread_only) {
        list = list.filter(function (c) { return !c.readAt; });
    }
    if (p.limit && Number(p.limit) > 0)
        list = list.slice(0, Number(p.limit));
    return ok({
        count: list.length,
        candies: list.map(decorate),
        stats: statsOf(p.jar_id || undefined)
    });
}
async function ipcGetCandy(payload) {
    await loadStore();
    const c = findCandy(payload && payload.candy_id);
    if (!c)
        return fail('没有找到这颗糖');
    if (payload && payload.mark_read) {
        c.readAt = Date.now();
        await saveStore();
    }
    const jar = findJar(c.jarId);
    return ok({
        candy: decorate(c),
        jar: jar ? { jar_id: jar.id, name: jar.name, jar_type: jar.jarType } : null
    });
}
async function ipcUpdateCandy(payload) {
    await loadStore();
    const p = payload || {};
    const c = findCandy(p.candy_id);
    if (!c)
        return fail('没有找到这颗糖');
    if (p.text !== undefined) {
        const t = String(p.text).trim();
        if (!t)
            return fail('便签不能改成空的');
        if (t.length > MAX_TEXT_LEN)
            return fail('这段话太长了（' + t.length + ' 字），糖纸写不下');
        c.text = t;
    }
    if (p.title !== undefined)
        c.title = String(p.title).trim();
    if (p.flavor !== undefined)
        c.flavor = String(p.flavor).trim();
    if (p.mood !== undefined)
        c.mood = String(p.mood).trim();
    if (p.shape !== undefined)
        c.shape = (0, catalog_js_1.resolveShape)(p.shape);
    if (p.color !== undefined)
        c.color = (0, catalog_js_1.resolveColor)(p.color);
    if (p.jar_id !== undefined && findJar(p.jar_id)) {
        const oldJar = c.jarId;
        c.jarId = p.jar_id;
        // 换罐子要重排两边，不然旧罐会留下一个空缺、新罐会多出一颗悬空的糖
        if (oldJar !== c.jarId)
            relayout(oldJar);
        relayout(c.jarId);
    }
    if (p.mark_read)
        c.readAt = Date.now();
    if (p.mark_unread)
        c.readAt = 0;
    await saveStore();
    return ok({ candy: decorate(c), stats: statsOf(), message: '这颗糖改好了' });
}
async function ipcRemoveCandy(payload) {
    await loadStore();
    const p = payload || {};
    const c = findCandy(p.candy_id);
    if (!c)
        return fail('没有找到这颗糖');
    // 默认保留正文：人类「把糖吃掉」时，往往只是想让它从罐子里消失，
    // 而不是想丢掉 AI 写的话。要连内容一起抹掉得显式说 purge=true。
    const purge = !!p.purge;
    const text = c.text;
    const jarId = c.jarId;
    candies = candies.filter(function (x) { return !x || x.id !== c.id; });
    relayout(jarId);
    await saveStore();
    return ok({
        removed: c.id,
        purged: purge,
        last_text: purge ? '' : text,
        stats: statsOf(),
        message: purge ? '这颗糖连糖纸一起销毁了' : '把这颗糖拿了出来（便签内容仍留在返回值里）'
    });
}
async function ipcStats() {
    await loadStore();
    return ok({ stats: statsOf() });
}
/** 摇一摇：重新排一遍堆叠，位置会自然松散一些 */
async function ipcShake(payload) {
    await loadStore();
    const p = payload || {};
    const targets = p.jar_id ? [findJar(p.jar_id)].filter(Boolean) : jars.slice();
    if (!targets.length)
        return fail('还没有罐子可摇');
    let moved = 0;
    for (let i = 0; i < targets.length; i++) {
        const j = targets[i];
        const before = candiesOf(j.id);
        relayout(j.id, true);
        moved += before.length;
    }
    await saveStore();
    return ok({ moved: moved, stats: statsOf(), message: '摇了摇罐子，' + moved + ' 颗糖换了换位置' });
}
/** 放进一只样板罐 + 三颗示范糖，让空罐子一眼就能看懂怎么玩 */
async function ipcSeedDemo() {
    await loadStore();
    let jar = jars[0];
    if (!jar) {
        jar = newJar('第一只糖罐', 'glass', '所有舍不得说出口的话，都可以先变成糖放进来。');
        jars.push(jar);
    }
    const demos = [
        { shape: 'heart', color: 'sakura', flavor: '草莓味', title: '今天', text: '今天你笑的那一下，我记下来了。' },
        { shape: 'star', color: 'lemon', flavor: '柠檬味', title: '愿望', text: '希望你想做的事，都能慢慢做成。' },
        { shape: 'moon', color: 'lavender', flavor: '牛奶味', title: '晚安', text: '夜里的糖不苦，晚安。' }
    ];
    const owned = candiesOf(jar.id);
    let maxOrder = 0;
    for (let i = 0; i < owned.length; i++) {
        if (owned[i].order > maxOrder)
            maxOrder = owned[i].order;
    }
    const now = Date.now();
    for (let i = 0; i < demos.length; i++) {
        const d = demos[i];
        candies.push({
            id: newId('candy'),
            jarId: jar.id,
            shape: d.shape,
            color: d.color,
            flavor: d.flavor,
            title: d.title,
            text: d.text,
            mood: '',
            order: maxOrder + i + 1,
            x: 50,
            y: 84,
            rot: 0,
            size: 0,
            createdAt: now + i,
            readAt: 0
        });
    }
    relayout(jar.id);
    await saveStore();
    return ok({ jar: jar, stats: statsOf(), message: '已放进样板罐和三颗示范糖' });
}
// ---------------------------------------------------------------- IPC 注册
function registerIpc() {
    ToolPkg.ipc.on('candy.catalog', ipcCatalog);
    ToolPkg.ipc.on('candy.list_jars', ipcListJars);
    ToolPkg.ipc.on('candy.create_jar', ipcCreateJar);
    ToolPkg.ipc.on('candy.update_jar', ipcUpdateJar);
    ToolPkg.ipc.on('candy.delete_jar', ipcDeleteJar);
    ToolPkg.ipc.on('candy.drop_candy', ipcDropCandy);
    ToolPkg.ipc.on('candy.list_candies', ipcListCandies);
    ToolPkg.ipc.on('candy.get_candy', ipcGetCandy);
    ToolPkg.ipc.on('candy.update_candy', ipcUpdateCandy);
    ToolPkg.ipc.on('candy.remove_candy', ipcRemoveCandy);
    ToolPkg.ipc.on('candy.stats', ipcStats);
    ToolPkg.ipc.on('candy.shake', ipcShake);
    ToolPkg.ipc.on('candy.seed_demo', ipcSeedDemo);
}
// ---------------------------------------------------------------- registerToolPkg
function registerToolPkg() {
    const screen = index_ui_js_1.default;
    ToolPkg.registerUiRoute({
        id: UI_ID,
        route: UI_ROUTE,
        runtime: 'compose_dsl',
        screen: screen,
        params: {},
        keepAlive: false,
        title: {
            zh: '🍬 糖果罐',
            en: 'Candy Jar'
        }
    });
    ToolPkg.registerNavigationEntry({
        id: 'candy_jar_sidebar',
        route: UI_ROUTE,
        surface: 'main_sidebar_plugins',
        title: {
            zh: '🍬 糖果罐',
            en: 'Candy Jar'
        },
        icon: 'cake',
        order: 6
    });
    ToolPkg.registerNavigationEntry({
        id: 'candy_jar_toolbox',
        route: UI_ROUTE,
        surface: 'toolbox',
        title: {
            zh: '🍬 糖果罐',
            en: 'Candy Jar'
        },
        icon: 'cake',
        order: 6
    });
    return true;
}
// 预加载数据 + IPC 注册（必须在模块加载阶段完成，UI 与子包工具才能立即通信）
loadStore().catch(function () { });
registerIpc();
exports.registerToolPkg = registerToolPkg;
