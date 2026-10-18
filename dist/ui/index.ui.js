"use strict";
/**
 * 🍬 糖果罐 · 侧边框界面（Compose DSL runtime）
 *
 * 视觉主张：奶油纸底 + 水彩玻璃罐 + 浮起来的糖。
 *   - 罐子用真实素材图打底（6 种罐型）
 *   - 每颗糖都是素材图里的某一颗，按存档里算好的 (x, y, rot) 百分比坐标摆进罐子
 *   - 点一颗糖，它的话就摊开给你看
 *
 * 数据全部来自 main 侧 IPC（candy.*），本文件不自己存东西。
 */
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_js_1 = require("../catalog.js");
/** 罐子舞台尺寸（dp）：糖果坐标按这个框换算 */
const STAGE_W = 260;
const STAGE_H = 360;
const C = {
    bg: '#F5F0E7',
    card: '#FFFDF8',
    ink: '#4A3F3A',
    sub: '#9C8B80',
    line: '#E7DCCB',
    accent: '#E88AA8',
    accentSoft: '#FDEDF2',
    glow: '#FFFDF9'
};
/** 纸纹底图资源 key（铺满整个界面用） */
const PAPER_KEY = 'paper';
// ---------------------------------------------------------------- 图片缓存
/** readResource 的结果按 key 缓存；同一张图只解析一次 */
const pathCache = {};
const pending = {};
function cachedPath(key) {
    return pathCache[key] || '';
}
function loadPath(key, bump) {
    if (!key || pathCache[key] || pending[key])
        return;
    pending[key] = true;
    Promise.resolve()
        .then(function () { return ToolPkg.readResource(key); })
        .then(function (p) {
        pending[key] = false;
        if (p && typeof p === 'string') {
            pathCache[key] = p;
            bump();
        }
    })
        .catch(function () { pending[key] = false; });
}
// ---------------------------------------------------------------- 入口
const screen = function (ctx) {
    const UI = ctx.UI;
    const Modifier = ctx.Modifier;
    const [stamp, setStamp] = ctx.useState('cj_stamp', 0);
    const [jars, setJars] = ctx.useState('cj_jars', []);
    const [curJar, setCurJar] = ctx.useState('cj_cur', '');
    const [candies, setCandies] = ctx.useState('cj_candies', []);
    const [panelOpen, setPanelOpen] = ctx.useState('cj_panel', false);
    const [msg, setMsg] = ctx.useState('cj_msg', '');
    const [busy, setBusy] = ctx.useState('cj_busy', false);
    // 选中的糖（摊开看）
    const [openCandy, setOpenCandy] = ctx.useState('cj_open', null);
    // 写糖草稿
    const [draftText, setDraftText] = ctx.useState('cj_d_text', '');
    const [draftTitle, setDraftTitle] = ctx.useState('cj_d_title', '');
    const [draftShape, setDraftShape] = ctx.useState('cj_d_shape', 'round');
    const [draftColor, setDraftColor] = ctx.useState('cj_d_color', 'pink');
    // 新建罐子草稿
    const [newName, setNewName] = ctx.useState('cj_n_name', '');
    const [newType, setNewType] = ctx.useState('cj_n_type', 'glass');
    const [newIntro, setNewIntro] = ctx.useState('cj_n_intro', '');
    // 罐型快换
    const [typePick, setTypePick] = ctx.useState('cj_type_pick', '');
    const bump = function () { setStamp(Date.now()); };
    // ------------------------------------------------------------ IPC 包装
    function normalize(raw) {
        let v = raw;
        for (let i = 0; i < 6; i++) {
            if (typeof v === 'string') {
                try {
                    v = JSON.parse(v);
                }
                catch (e) {
                    break;
                }
                continue;
            }
            if (!v || typeof v !== 'object')
                break;
            if (v.result !== undefined) {
                v = v.result;
                continue;
            }
            if (v.output !== undefined) {
                v = v.output;
                continue;
            }
            break;
        }
        return v || {};
    }
    async function call(name, params) {
        const full = name.indexOf(':') >= 0 ? name : 'candy_jar:' + name;
        try {
            return normalize(await ctx.callTool(full, params || {}));
        }
        catch (err) {
            return { success: false, message: String(err) };
        }
    }
    function toast(t) {
        if (!t)
            return;
        setMsg(t);
        try {
            void ctx.showToast(t);
        }
        catch (e) { /* ignore */ }
    }
    // ------------------------------------------------------------ 数据
    async function reload(jarId) {
        const r = await call('list_jars');
        const list = (r && r.jars) || [];
        setJars(list);
        let target = jarId || curJar;
        if (!target || !findIn(list, target))
            target = list.length ? (list[0].jar_id || list[0].id) : '';
        setCurJar(target);
        if (target) {
            const cd = await call('list_candies', { jar_id: target });
            setCandies((cd && cd.candies) || []);
        }
        else {
            setCandies([]);
        }
    }
    function findIn(list, id) {
        for (let i = 0; i < list.length; i++) {
            const x = list[i] || {};
            if ((x.jar_id || x.id) === id)
                return x;
        }
        return null;
    }
    function currentJar() {
        return findIn(jars, curJar) || null;
    }
    // 首次进入：拉一次数据
    if (!jars.length && !busy) {
        setBusy(true);
        void (async function () {
            await reload();
            setBusy(false);
        })();
    }
    // ------------------------------------------------------------ 动作
    async function pickJar(id) {
        setCurJar(id);
        setOpenCandy(null);
        const cd = await call('list_candies', { jar_id: id });
        setCandies((cd && cd.candies) || []);
    }
    async function dropCandy() {
        const text = String(draftText || '').trim();
        if (!text) {
            toast('先写点什么，再把它变成糖');
            return;
        }
        setBusy(true);
        let jarId = curJar;
        if (!jarId) {
            // 一颗糖都没有的新用户：先替他摆一只罐子
            const nj = await call('create_jar', { name: '我的糖果罐', jar_type: 'glass' });
            jarId = nj && nj.jar_id ? nj.jar_id : '';
            if (!jarId) {
                setBusy(false);
                toast('罐子没摆好，再试一次');
                return;
            }
        }
        const r = await call('drop_candy', {
            jar_id: jarId,
            text: text,
            title: draftTitle,
            shape: draftShape,
            color: draftColor
        });
        setBusy(false);
        if (r && r.success === false) {
            toast(r.message || '投不进去');
            return;
        }
        setDraftText('');
        setDraftTitle('');
        toast((r && r.message) || '投进去啦');
        await reload(jarId);
    }
    async function shake() {
        if (!curJar)
            return;
        const r = await call('shake', { jar_id: curJar });
        toast((r && r.message) || '摇了摇');
        await reload(curJar);
    }
    async function createJar() {
        const name = String(newName || '').trim();
        if (!name) {
            toast('给罐子起个名字吧');
            return;
        }
        setBusy(true);
        const r = await call('create_jar', { name: name, jar_type: newType, intro: newIntro });
        setBusy(false);
        if (r && r.success === false) {
            toast(r.message || '建罐失败');
            return;
        }
        setNewName('');
        setNewIntro('');
        toast((r && r.message) || '罐子摆好了');
        const id = r && r.jar_id ? r.jar_id : '';
        await reload(id);
        setPanelOpen(false);
    }
    async function deleteJar(id) {
        const r = await call('delete_jar', { jar_id: id, force: true });
        toast((r && r.message) || '罐子收走了');
        await reload();
    }
    async function changeType(t) {
        if (!curJar) {
            setTypePick(t);
            return;
        }
        setTypePick('');
        await call('update_jar', { jar_id: curJar, jar_type: t });
        await reload(curJar);
    }
    async function eatCandy(c) {
        const r = await call('remove_candy', { candy_id: c.id || c.candy_id, purge: false });
        toast((r && r.message) || '拿出来了');
        setOpenCandy(null);
        await reload(curJar);
    }
    async function markRead(c) {
        if (!c || !c.unread)
            return;
        await call('read_candy', { candy_id: c.id || c.candy_id, mark_read: true });
        await reload(curJar);
    }
    function openOne(c) {
        setOpenCandy(c);
        void markRead(c);
    }
    // ------------------------------------------------------------ 小零件
    function text(s, color, size, extra) {
        return UI.Text(Object.assign({ text: String(s === undefined || s === null ? '' : s), color: color, fontSize: size }, extra || {}));
    }
    function pill(label, active, onTap, tint) {
        const col = tint || C.accent;
        return UI.Button({
            onClick: onTap,
            content: [text(label, active ? '#FFFFFF' : col, 12)],
            background: active ? col : '#FFFFFF',
            shape: { type: 'pill' },
            padding: { horizontal: 12, vertical: 7 },
            border: active ? undefined : { width: 1, color: C.line }
        });
    }
    function card(children, extra) {
        return UI.Box(Object.assign({
            background: C.card,
            backgroundShape: { type: 'rounded', cornerRadius: 16 },
            border: { width: 1, color: C.line },
            padding: 12,
            fillMaxWidth: true
        }, extra || {}), children);
    }
    /** 取图片路径；未就绪时返回 null 并触发后台解析 */
    function img(key) {
        const p = cachedPath(key);
        if (!p && key)
            loadPath(key, bump);
        return p;
    }
    // ------------------------------------------------------------ 罐子舞台
    function candyNode(c) {
        const asset = (0, catalog_js_1.pickCandyAsset)(c.shape, c.color, hashOf(c.id || c.candy_id));
        const p = img(asset.key);
        const size = Number(c.size || 36);
        const x = (Number(c.x === undefined ? 50 : c.x) / 100 - 0.5) * STAGE_W - size / 2;
        const y = (Number(c.y === undefined ? 84 : c.y) / 100 - 0.5) * STAGE_H - size / 2;
        const mod = Modifier.size(size).offset(x, y).rotate(Number(c.rot || 0))
            .clickable(function () { openOne(c); });
        if (!p) {
            // 图还没解析出来：先占个位，形状别跳
            return UI.Box({
                modifier: mod,
                background: (0, catalog_js_1.colorHexOf)(c.color),
                backgroundShape: { type: 'circle' },
                alpha: 0.25
            });
        }
        return UI.Image({
            path: p,
            modifier: mod,
            contentScale: 'fit',
            key: 'cd-' + asset.key
        });
    }
    function hashOf(s) {
        let h = 2166136261;
        const str = String(s || '');
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }
    function stage() {
        const jar = currentJar();
        const typeId = typePick || (jar ? (jar.jar_type || 'glass') : 'glass');
        const jAsset = (0, catalog_js_1.jarAsset)(typeId);
        const jp = img(jAsset.key);
        const nodes = [];
        // 1) 罐子本体
        if (jp) {
            nodes.push(UI.Image({
                path: jp,
                modifier: Modifier.matchParentSize(),
                contentScale: 'fit',
                key: 'jar-' + jAsset.key
            }));
        }
        // 2) 一颗一颗糖（在罐子之上：水彩玻璃不透明，压下去就看不见了）
        for (let i = 0; i < candies.length; i++) {
            const c = candies[i];
            nodes.push(candyNode(c));
        }
        // 2.5) 罐脚两只小熊软糖（纯装饰，不参与点按；压在罐子最上层）
        const bears = [
            { asset: 'c46', x: 83, y: 88, size: 26, rot: 9 }, // 远一点：橙黄熊
            { asset: 'c47', x: 70, y: 91, size: 33, rot: -11 } // 近一点：粉熊
        ];
        for (let i = 0; i < bears.length; i++) {
            const b = bears[i];
            const bp = img(b.asset);
            if (!bp)
                continue;
            const bx = (b.x / 100 - 0.5) * STAGE_W - b.size / 2;
            const by = (b.y / 100 - 0.5) * STAGE_H - b.size / 2;
            nodes.push(UI.Image({
                path: bp,
                modifier: Modifier.size(b.size).offset(bx, by).rotate(b.rot),
                contentScale: 'fit',
                key: 'bear-' + b.asset
            }));
        }
        // 3) 空罐提示
        if (!candies.length) {
            nodes.push(UI.Box({
                modifier: Modifier.offset(0, 40),
                children: [
                    UI.Column({ horizontalAlignment: 'center', spacing: 6 }, [
                        text('空空的', C.sub, 13),
                        text('写下第一颗糖吧', C.sub, 11)
                    ])
                ]
            }));
        }
        return UI.Box({
            modifier: Modifier.size(STAGE_W, STAGE_H),
            contentAlignment: 'center',
            key: 'stage-' + typeId + '-' + candies.length + '-' + stamp
        }, nodes);
    }
    // ------------------------------------------------------------ 写一颗糖
    function writeCard() {
        const shapeChips = [];
        for (let i = 0; i < catalog_js_1.CANDY_SHAPES.length; i++) {
            const s = catalog_js_1.CANDY_SHAPES[i];
            shapeChips.push(pill(s.emoji + ' ' + s.zh, draftShape === s.id, function () { setDraftShape(s.id); }));
        }
        const colorChips = [];
        for (let i = 0; i < catalog_js_1.CANDY_COLORS.length; i++) {
            const col = catalog_js_1.CANDY_COLORS[i];
            colorChips.push(UI.Box({
                modifier: Modifier.size(22).clip({ type: 'circle' })
                    .background(col.hex)
                    .border(draftColor === col.id ? 3 : 1, draftColor === col.id ? C.ink : C.line)
                    .clickable(function () { setDraftColor(col.id); }),
                key: 'sw-' + col.id
            }));
        }
        return card([
            UI.Column({ spacing: 10, fillMaxWidth: true }, [
                UI.Row({ verticalAlignment: 'center', spacing: 8 }, [
                    text('✍️ 写一颗糖', C.ink, 15),
                    UI.Box({ modifier: Modifier.weight(1) }),
                    text(candies.length + ' / 240', C.sub, 11)
                ]),
                UI.TextField({
                    value: draftText,
                    onValueChange: function (v) { setDraftText(v); },
                    placeholder: '想说的话……',
                    fillMaxWidth: true,
                    minLines: 2,
                    maxLines: 4,
                    key: 'd-text'
                }),
                UI.TextField({
                    value: draftTitle,
                    onValueChange: function (v) { setDraftTitle(v); },
                    placeholder: '给它起个小标题（可留空）',
                    fillMaxWidth: true,
                    singleLine: true,
                    key: 'd-title'
                }),
                text('形状', C.sub, 11),
                UI.LazyRow({ spacing: 6 }, shapeChips),
                text('颜色', C.sub, 11),
                UI.Row({ spacing: 8, verticalAlignment: 'center' }, colorChips),
                UI.Button({
                    onClick: function () { void dropCandy(); },
                    enabled: !busy,
                    content: [text(busy ? '……' : '🍬 投进去', '#FFFFFF', 14)],
                    background: C.accent,
                    shape: { type: 'rounded', cornerRadius: 12 },
                    fillMaxWidth: true,
                    padding: { vertical: 10 }
                })
            ])
        ]);
    }
    // ------------------------------------------------------------ 糖纸详情
    function candySheet() {
        const c = openCandy;
        if (!c)
            return null;
        const s = (0, catalog_js_1.shapeInfo)(c.shape);
        const col = (0, catalog_js_1.colorInfo)(c.color);
        const jar = currentJar();
        return UI.Box({
            modifier: Modifier.matchParentSize(),
            background: '#66000000',
            contentAlignment: 'center',
            children: [
                UI.Box({
                    background: C.glow,
                    backgroundShape: { type: 'rounded', cornerRadius: 20 },
                    border: { width: 1, color: C.line },
                    padding: 18,
                    width: 300
                }, [
                    UI.Column({ spacing: 12, fillMaxWidth: true }, [
                        UI.Row({ verticalAlignment: 'center', spacing: 8 }, [
                            text(s.emoji + ' ' + (c.shape_name || s.zh), C.ink, 14),
                            text('· ' + (c.color_name || col.zh), C.sub, 12),
                            UI.Box({ modifier: Modifier.weight(1) }),
                            text(fmtTime(c.created_at), C.sub, 10)
                        ]),
                        c.title ? text(c.title, C.ink, 17) : null,
                        text(c.text || '', C.ink, 14, { lineHeight: 22 }),
                        c.flavor ? text('味道：' + c.flavor, C.sub, 11) : null,
                        text('来自「' + ((jar && jar.name) || '糖果罐') + '」', C.sub, 10),
                        UI.Row({ spacing: 8 }, [
                            UI.Button({
                                onClick: function () { setOpenCandy(null); },
                                content: [text('放回去', C.ink, 12)],
                                background: '#FFFFFF',
                                shape: { type: 'rounded', cornerRadius: 10 },
                                border: { width: 1, color: C.line },
                                padding: { horizontal: 14, vertical: 8 }
                            }),
                            UI.Button({
                                onClick: function () { void eatCandy(c); },
                                content: [text('吃掉它', '#FFFFFF', 12)],
                                background: C.accent,
                                shape: { type: 'rounded', cornerRadius: 10 },
                                padding: { horizontal: 14, vertical: 8 }
                            })
                        ])
                    ])
                ])
            ]
        });
    }
    function fmtTime(ts) {
        const n = Number(ts || 0);
        if (!n)
            return '';
        const d = new Date(n);
        const p = function (x) { return x < 10 ? '0' + x : String(x); };
        return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }
    // ------------------------------------------------------------ 侧栏：罐子架
    function sidePanel() {
        const nodes = [];
        nodes.push(UI.Column({ spacing: 3 }, [
            text('🍬 糖果罐', C.ink, 21),
            text('舍不得说的话，先变成糖放进来', C.sub, 11)
        ]));
        nodes.push(card([
            UI.Column({ spacing: 9, fillMaxWidth: true }, [
                text('摆一只新罐子', C.ink, 14),
                UI.TextField({
                    value: newName,
                    onValueChange: function (v) { setNewName(v); },
                    placeholder: '罐子的名字',
                    fillMaxWidth: true,
                    singleLine: true,
                    key: 'n-name'
                }),
                UI.TextField({
                    value: newIntro,
                    onValueChange: function (v) { setNewIntro(v); },
                    placeholder: '想在这只罐子上写一句什么（可留空）',
                    fillMaxWidth: true,
                    singleLine: true,
                    key: 'n-intro'
                }),
                UI.LazyRow({ spacing: 6 }, catalog_js_1.JAR_TYPES.map(function (t) {
                    return pill(t.emoji + ' ' + t.zh, newType === t.id, function () { setNewType(t.id); });
                })),
                UI.Button({
                    onClick: function () { void createJar(); },
                    enabled: !busy,
                    content: [text('摆上架子', '#FFFFFF', 13)],
                    background: C.accent,
                    shape: { type: 'rounded', cornerRadius: 12 },
                    fillMaxWidth: true,
                    padding: { vertical: 9 }
                })
            ])
        ]));
        nodes.push(text('罐子架（' + jars.length + '）', C.sub, 11));
        if (!jars.length) {
            nodes.push(card([text('还是空的，先摆一只吧。', C.sub, 12)]));
        }
        for (let i = 0; i < jars.length; i++) {
            const j = jars[i];
            const active = (j.jar_id || j.id) === curJar;
            const tInfo = (0, catalog_js_1.jarInfo)(j.jar_type);
            nodes.push(UI.Box({
                background: active ? C.accentSoft : C.card,
                backgroundShape: { type: 'rounded', cornerRadius: 14 },
                border: { width: 1, color: active ? C.accent : C.line },
                padding: 11,
                fillMaxWidth: true,
                modifier: Modifier.clickable(function () { void pickJar(j.jar_id || j.id); })
            }, [
                UI.Column({ spacing: 3, fillMaxWidth: true }, [
                    UI.Row({ verticalAlignment: 'center', spacing: 6 }, [
                        text(tInfo.emoji, C.ink, 13),
                        text(j.name || '糖果罐', C.ink, 13),
                        UI.Box({ modifier: Modifier.weight(1) }),
                        text(String(j.candy_count || 0) + ' 颗', C.sub, 11)
                    ]),
                    j.intro ? text(j.intro, C.sub, 10, { maxLines: 2, overflow: 'ellipsis' }) : null
                ])
            ]));
        }
        nodes.push(UI.Row({ spacing: 8 }, [
            UI.Button({
                onClick: function () { void shake(); },
                content: [text('🫨 摇一摇', C.ink, 12)],
                background: '#FFFFFF',
                shape: { type: 'pill' },
                border: { width: 1, color: C.line },
                padding: { horizontal: 12, vertical: 7 }
            }),
            UI.Button({
                onClick: function () { void reload(); },
                content: [text('↻ 刷新', C.ink, 12)],
                background: '#FFFFFF',
                shape: { type: 'pill' },
                border: { width: 1, color: C.line },
                padding: { horizontal: 12, vertical: 7 }
            })
        ]));
        // 素材索引（让人类/AI 知道有什么可选）
        nodes.push(text('素材：6 种罐子 · 77 颗糖 · ' + catalog_js_1.CANDY_SHAPES.length + ' 形状 · ' + catalog_js_1.CANDY_COLORS.length + ' 色', C.sub, 10));
        const bp = img(PAPER_KEY);
        return UI.Box({ fillMaxSize: true, background: C.bg }, [
            bp ? UI.Image({
                path: bp,
                modifier: Modifier.matchParentSize(),
                contentScale: 'crop',
                key: 'paper-side'
            }) : null,
            UI.LazyColumn({ fillMaxSize: true, padding: 16, spacing: 12 }, nodes)
        ].filter(Boolean));
    }
    // ------------------------------------------------------------ 主区
    function mainContent() {
        const jar = currentJar();
        const typeId = typePick || (jar ? (jar.jar_type || 'glass') : 'glass');
        const tInfo = (0, catalog_js_1.jarInfo)(typeId);
        const nodes = [];
        // 标题行
        nodes.push(UI.Row({ verticalAlignment: 'center', spacing: 8 }, [
            UI.Column({ spacing: 2 }, [
                text(jar ? (jar.name || '糖果罐') : '还没有罐子', C.ink, 20),
                text(jar ? (tInfo.zh + ' · ' + candies.length + ' 颗糖') : '去侧栏摆一只', C.sub, 11)
            ]),
            UI.Box({ modifier: Modifier.weight(1) }),
            UI.Button({
                onClick: function () { setPanelOpen(!panelOpen); },
                content: [text(panelOpen ? '收起 ⇥' : '罐子架 ⇤', C.ink, 12)],
                background: '#FFFFFF',
                shape: { type: 'pill' },
                border: { width: 1, color: C.line },
                padding: { horizontal: 12, vertical: 7 }
            })
        ]));
        // 罐型快换
        nodes.push(UI.LazyRow({ spacing: 6 }, catalog_js_1.JAR_TYPES.map(function (t) {
            return pill(t.emoji + ' ' + t.zh, typeId === t.id, function () { void changeType(t.id); });
        })));
        // 舞台
        nodes.push(UI.Box({
            fillMaxWidth: true,
            contentAlignment: 'center',
            padding: { vertical: 6 }
        }, [stage()]));
        // 写糖
        nodes.push(writeCard());
        if (msg) {
            nodes.push(text(msg, C.sub, 11));
        }
        const bp = img(PAPER_KEY);
        return UI.Box({ fillMaxSize: true, background: C.bg }, [
            bp ? UI.Image({
                path: bp,
                modifier: Modifier.matchParentSize(),
                contentScale: 'crop',
                key: 'paper-main'
            }) : null,
            UI.LazyColumn({ fillMaxSize: true, padding: 16, spacing: 14 }, nodes),
            candySheet()
        ].filter(Boolean));
    }
    // ------------------------------------------------------------ 渲染
    return UI.AdaptiveSidePanel({
        open: !!panelOpen,
        side: sidePanel(),
        onOpenChanged: function (o) { setPanelOpen(!!o); },
        defaultWidth: 360,
        minWidth: 300,
        minContentWidth: 340,
        breakpoint: 660,
        fillMaxSize: true
    }, [mainContent()]);
};
exports.default = screen;
