"use strict";
/**
 * 🍬 糖果罐 · 子包工具（AI 侧）
 *
 * 这是「AI 自由选糖果来书写」的入口：AI 可以把想说的话挑一个形状、一个颜色，
 * 变成一颗糖投进某只罐子里；也可以回头把糖一颗颗读出来。
 * 所有工具都通过 ToolPkg.ipc 转发到 main 上下文执行，数据由 main 统一持有。
 *
 * 调用节奏（AI 侧）：
 *   写糖：drop_candy（罐子不存在会自动建一只）→ 人类在侧边栏插件里能看到糖浮进罐子
 *   读糖：list_candies → read_candy（读到就自动标记已读）
 *   整理：create_jar / update_candy / remove_candy / shake / stats
 */
/* METADATA
{
  "name": "candy_jar",
  "display_name": {
    "zh": "糖果罐",
    "en": "Candy Jar"
  },
  "description": {
    "zh": "糖果罐：把想说的话做成一颗糖（真实的水彩糖图，11 种形状 × 15 种颜色），投进一只玻璃罐里存着；也能随时把糖一颗颗读出来。适合 AI 给人类留话、人类给 AI 留话，以及任何「先存着，以后再看」的小心情。【文件行为说明】所有罐子与糖果只保存在插件私有目录 candy_jar.json；无网络请求。",
    "en": "Candy Jar: turn words into a candy (real watercolor candy art, 11 shapes x 15 colors) and drop it into a glass jar; read them back one by one. [File behavior] All jars and candies live only in the plugin private directory (candy_jar.json); no network requests."
  },
  "enabledByDefault": true,
  "category": "Lifestyle",
  "tools": [
    {
      "name": "create_jar",
      "description": {
        "zh": "摆一只新的糖果罐。罐型有 6 种：tall 细长罐 / milk_bottle 牛奶瓶 / glass 玻璃罐 / mason 梅森罐 / belly 大肚罐 / flower_jar 花边罐。适合按主题分罐（例如「今天」「想对你说」「不敢说的」），而不是把所有糖堆在一只罐子里。",
        "en": "Create a new candy jar. 6 jar styles: tall / milk_bottle / glass / mason / belly / flower_jar. Better to keep one jar per theme."
      },
      "parameters": [
        {
          "name": "name",
          "description": { "zh": "罐子的名字，例如「今天」「想对你说的话」", "en": "Jar name" },
          "type": "string",
          "required": true
        },
        {
          "name": "jar_type",
          "description": { "zh": "罐型 id，可用 tall / milk_bottle / glass / mason / belly / flower_jar，也可直接写中文名。省略则用 glass。", "en": "Jar style id or Chinese name. Defaults to glass." },
          "type": "string",
          "required": false
        },
        {
          "name": "intro",
          "description": { "zh": "写在罐身上的一句话，说明这只罐子打算装什么", "en": "Optional one-line note describing this jar" },
          "type": "string",
          "required": false
        }
      ]
    },
    {
      "name": "list_jars",
      "description": {
        "zh": "看看现在有哪些罐子、每只装了几颗糖、最后投糖是什么时候，以及整体统计（总糖数、未读糖数）。不知道往哪只罐子里投糖时先调这个。",
        "en": "List all jars with candy counts, last-candy time, and overall stats (total / unread). Call this first when unsure where to drop a candy."
      },
      "parameters": []
    },
    {
      "name": "update_jar",
      "description": {
        "zh": "改一只已有的罐子：改名、换罐型、改罐身上那句话。只传要改的字段即可。",
        "en": "Update an existing jar: name, style, or its one-line note. Pass only the fields to change."
      },
      "parameters": [
        {
          "name": "jar_id",
          "description": { "zh": "罐子 id", "en": "Jar id" },
          "type": "string",
          "required": true
        },
        {
          "name": "name",
          "description": { "zh": "新的名字", "en": "New name" },
          "type": "string",
          "required": false
        },
        {
          "name": "jar_type",
          "description": { "zh": "新的罐型", "en": "New jar style" },
          "type": "string",
          "required": false
        },
        {
          "name": "intro",
          "description": { "zh": "罐身上那句新的话", "en": "New one-line note" },
          "type": "string",
          "required": false
        }
      ]
    },
    {
      "name": "delete_jar",
      "description": {
        "zh": "收走一只罐子。如果罐子里还有糖，必须显式传 force=true（那些糖会一起消失），否则会被挡回来——这是为了防止误删。",
        "en": "Remove a jar. If it still holds candies you must pass force=true (those candies disappear too); otherwise the call is rejected to prevent accidental loss."
      },
      "parameters": [
        {
          "name": "jar_id",
          "description": { "zh": "罐子 id", "en": "Jar id" },
          "type": "string",
          "required": true
        },
        {
          "name": "force",
          "description": { "zh": "罐子里还有糖时，是否确认连糖一起倒掉", "en": "Confirm deleting non-empty jars" },
          "type": "boolean",
          "required": false
        }
      ]
    },
    {
      "name": "drop_candy",
      "description": {
        "zh": "把一段话做成一颗糖，投进罐子里——这是本插件最核心的工具。可以自己挑形状和颜色：形状 round 圆糖 / heart 心形 / star 星星 / drop 水滴 / flower 小花 / moon 月牙 / block 方块 / bean 糖豆 / wrapper 糖纸 / lollipop 棒棒糖 / cane 拐杖糖；颜色 pink 粉 / pink_green 粉青 / orange 橘 / yellow 黄 / gold 金 / cream 奶白 / red 红 / deep_red 莓红 / mint 薄荷 / green 草绿 / teal 青 / blue 蓝 / purple 紫 / lilac 薰衣草 / rainbow 彩虹。不指定形状颜色时，系统会自动配一颗花色好看的糖。罐子里已有的糖会自动重新堆叠，所以不用自己算位置。",
        "en": "Turn a piece of text into a candy and drop it into a jar — the core tool. Pick shape (round/heart/star/drop/flower/moon/block/bean/wrapper/lollipop/cane) and color (pink/pink_green/orange/yellow/gold/cream/red/deep_red/mint/green/teal/blue/purple/lilac/rainbow), or let the system auto-pick. Candies restack automatically."
      },
      "parameters": [
        {
          "name": "text",
          "description": { "zh": "糖纸上写的话（必填，2000 字以内）。写具体的、当下的、有温度的话，不要写空泛的口号。", "en": "The words written on the candy wrapper (required, <=2000 chars)." },
          "type": "string",
          "required": true
        },
        {
          "name": "jar_id",
          "description": { "zh": "投进哪只罐子。省略则投进最近使用的那只；一只罐子都没有时会自动建一只。", "en": "Target jar id. Defaults to the most recent jar; auto-creates one if none exists." },
          "type": "string",
          "required": false
        },
        {
          "name": "title",
          "description": { "zh": "给这颗糖起的小标题，例如「今天」「愿望」「晚安」。省略则不显示标题。", "en": "Optional short title, e.g. a date or a one-word theme." },
          "type": "string",
          "required": false
        },
        {
          "name": "shape",
          "description": { "zh": "形状 id 或中文名（圆糖/心形/星星……），省略则自动选", "en": "Shape id or Chinese name; auto-picked if omitted." },
          "type": "string",
          "required": false
        },
        {
          "name": "color",
          "description": { "zh": "颜色 id 或中文名（粉/蓝/薄荷……），省略则自动选", "en": "Color id or Chinese name; auto-picked if omitted." },
          "type": "string",
          "required": false
        },
        {
          "name": "flavor",
          "description": { "zh": "口味描述，例如「草莓味」「薄荷味」，纯装饰用，可留空", "en": "Optional flavor label, purely decorative" },
          "type": "string",
          "required": false
        },
        {
          "name": "mood",
          "description": { "zh": "这颗糖的情绪标签，例如「软软的」「有点酸」，可留空", "en": "Optional mood tag" },
          "type": "string",
          "required": false
        }
      ]
    },
    {
      "name": "list_candies",
      "description": {
        "zh": "把罐子里的糖列出来（只给摘要：形状、颜色、标题、正文、时间、是否已读）。要读完整内容请用 read_candy。",
        "en": "List candies in a jar (summary fields). Use read_candy for full content."
      },
      "parameters": [
        {
          "name": "jar_id",
          "description": { "zh": "只看某只罐子；省略则看全部罐子的糖", "en": "Limit to one jar; omit to list across all jars" },
          "type": "string",
          "required": false
        },
        {
          "name": "unread_only",
          "description": { "zh": "只看还没读过的糖", "en": "Only unread candies" },
          "type": "boolean",
          "required": false
        },
        {
          "name": "limit",
          "description": { "zh": "最多返回几颗，省略则全部", "en": "Max results" },
          "type": "number",
          "required": false
        }
      ]
    },
    {
      "name": "read_candy",
      "description": {
        "zh": "读某一颗糖的完整内容（含糖纸上的每一句话）。默认读的同时把它标记成已读。",
        "en": "Read one candy in full; marks it read by default."
      },
      "parameters": [
        {
          "name": "candy_id",
          "description": { "zh": "糖果 id，从 list_candies 里拿", "en": "Candy id from list_candies" },
          "type": "string",
          "required": true
        },
        {
          "name": "mark_read",
          "description": { "zh": "是否顺手标记已读，默认 true", "en": "Mark as read (default true)" },
          "type": "boolean",
          "required": false
        }
      ]
    },
    {
      "name": "update_candy",
      "description": {
        "zh": "改一颗已经投进去的糖：改正文、改标题、换形状颜色、换罐子、标记已读/未读。只传要改的字段即可。",
        "en": "Update an existing candy: text, title, shape, color, jar, read state. Pass only the fields to change."
      },
      "parameters": [
        {
          "name": "candy_id",
          "description": { "zh": "糖果 id", "en": "Candy id" },
          "type": "string",
          "required": true
        },
        {
          "name": "text",
          "description": { "zh": "新的正文", "en": "New text" },
          "type": "string",
          "required": false
        },
        {
          "name": "title",
          "description": { "zh": "新的小标题", "en": "New title" },
          "type": "string",
          "required": false
        },
        {
          "name": "shape",
          "description": { "zh": "换形状", "en": "New shape" },
          "type": "string",
          "required": false
        },
        {
          "name": "color",
          "description": { "zh": "换颜色", "en": "New color" },
          "type": "string",
          "required": false
        },
        {
          "name": "flavor",
          "description": { "zh": "换口味标签", "en": "New flavor label" },
          "type": "string",
          "required": false
        },
        {
          "name": "mood",
          "description": { "zh": "换情绪标签", "en": "New mood tag" },
          "type": "string",
          "required": false
        },
        {
          "name": "jar_id",
          "description": { "zh": "换到另一只罐子里", "en": "Move to another jar" },
          "type": "string",
          "required": false
        },
        {
          "name": "mark_read",
          "description": { "zh": "设为已读", "en": "Mark read" },
          "type": "boolean",
          "required": false
        },
        {
          "name": "mark_unread",
          "description": { "zh": "设为未读", "en": "Mark unread" },
          "type": "boolean",
          "required": false
        }
      ]
    },
    {
      "name": "remove_candy",
      "description": {
        "zh": "把一颗糖从罐子里拿出来。默认保留正文（返回值里会带回 last_text，人类往往只是想让它从罐子里消失，而不是想丢掉里面的话）；只有当明确要销毁内容时才传 purge=true。",
        "en": "Take a candy out of the jar. Keeps the text by default (returned as last_text); pass purge=true only when the content should really be destroyed."
      },
      "parameters": [
        {
          "name": "candy_id",
          "description": { "zh": "糖果 id", "en": "Candy id" },
          "type": "string",
          "required": true
        },
        {
          "name": "purge",
          "description": { "zh": "是否连内容一起销毁，默认 false", "en": "Destroy the content too (default false)" },
          "type": "boolean",
          "required": false
        }
      ]
    },
    {
      "name": "shake",
      "description": {
        "zh": "摇一摇罐子：重新堆叠里面所有糖的位置，看起来会松散一些。纯视觉动作，不改变任何内容。",
        "en": "Shake the jar: restack all candies into looser positions. Purely visual."
      },
      "parameters": [
        {
          "name": "jar_id",
          "description": { "zh": "摇哪只罐子；省略则全部罐子都摇", "en": "Jar to shake; omit for all jars" },
          "type": "string",
          "required": false
        }
      ]
    },
    {
      "name": "stats",
      "description": {
        "zh": "糖果罐概览：总共几只罐子、多少颗糖、其中多少颗还没读过。",
        "en": "Overview: jar count, candy count, unread count."
      },
      "parameters": []
    },
    {
      "name": "catalog",
      "description": {
        "zh": "查可用花色：6 种罐型、11 种糖果形状、15 种颜色（每种多少颗真糖可选）。想在描写里准确说出形状/颜色名字时先查一下。",
        "en": "Browse available styles: 6 jar types, 11 candy shapes, 15 colors with real-art counts."
      },
      "parameters": []
    },
    {
      "name": "seed_demo",
      "description": {
        "zh": "放一只示范罐子加三颗示范糖，让空罐子一眼就能看懂怎么玩（界面上「载入示例」按钮用的就是它）。不传任何参数。",
        "en": "Drop a demo jar plus three sample candies. Takes no parameters."
      },
      "parameters": []
    }
  ]
}
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_jar = create_jar;
exports.list_jars = list_jars;
exports.update_jar = update_jar;
exports.delete_jar = delete_jar;
exports.drop_candy = drop_candy;
exports.list_candies = list_candies;
exports.read_candy = read_candy;
exports.update_candy = update_candy;
exports.remove_candy = remove_candy;
exports.shake = shake;
exports.stats = stats;
exports.catalog = catalog;
exports.seed_demo = seed_demo;
function ipc(channel, payload) {
    return ToolPkg.ipc.call(channel, payload || {});
}
/** 层层解包 IPC 返回值（可能是 JSON 字符串 / {result} / {data}） */
function unpack(raw) {
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
        if (v.data !== undefined && v.success === undefined) {
            v = v.data;
            continue;
        }
        break;
    }
    return v || {};
}
function guard(fn) {
    return fn().catch(function (e) {
        complete({ success: false, message: (e && e.message) ? e.message : String(e) });
    });
}
/** 摆一只新罐子 */
async function create_jar(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.create_jar', {
            name: p.name,
            jar_type: p.jar_type,
            intro: p.intro
        }));
        if (u && u.success) {
            const jar = u.jar || {};
            complete({
                success: true,
                jar_id: jar.id,
                name: jar.name,
                jar_type: jar.jarType,
                message: '罐子摆好了：' + (jar.name || '') + '。之后可以往它里面投糖了。',
                stats: u.stats
            });
            return;
        }
        complete({ success: false, message: (u && u.message) || '建罐失败' });
    });
}
/** 看有哪些罐子 */
async function list_jars(params) {
    return guard(async function () {
        const u = unpack(await ipc('candy.list_jars', {}));
        const jars = (u && u.jars) || [];
        complete({
            success: true,
            count: jars.length,
            jars: jars.map(function (j) {
                return {
                    jar_id: j.jar_id || j.id,
                    name: j.name,
                    jar_type: j.jar_type,
                    intro: j.intro || '',
                    candy_count: j.candy_count || 0,
                    last_candy_at: j.last_candy_at || 0
                };
            }),
            stats: u.stats || {},
            message: jars.length ? ('现在有 ' + jars.length + ' 只罐子') : '还没有罐子，投糖时会自动建一只'
        });
    });
}
/** 改一只罐子：改名、换罐型、改那句话 */
async function update_jar(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.update_jar', {
            jar_id: p.jar_id,
            name: p.name,
            intro: p.intro,
            jar_type: p.jar_type
        }));
        if (u && u.success === false) {
            complete({ success: false, message: u.message || '没有找到这只罐子' });
            return;
        }
        const jar = (u && u.jar) || {};
        complete({
            success: true,
            jar_id: jar.id || p.jar_id,
            name: jar.name,
            jar_type: jar.jarType,
            message: '罐子改好了'
        });
    });
}
/** 收走一只罐子（里面的糖会一起消失，需显式 force） */
async function delete_jar(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.delete_jar', { jar_id: p.jar_id, force: !!p.force }));
        if (u && u.success === false) {
            complete({ success: false, message: u.message || '没有找到这只罐子' });
            return;
        }
        complete({
            success: true,
            deleted: u.deleted,
            removed_candy: u.removed_candy || 0,
            message: (u && u.message) || '罐子收走了',
            stats: u.stats
        });
    });
}
/** 投一颗糖 —— 核心动作 */
async function drop_candy(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.drop_candy', {
            jar_id: p.jar_id,
            text: p.text,
            title: p.title,
            shape: p.shape,
            color: p.color,
            flavor: p.flavor,
            mood: p.mood
        }));
        if (u && u.success === false) {
            complete({ success: false, message: u.message || '投不进去' });
            return;
        }
        const c = (u && u.candy) || {};
        complete({
            success: true,
            candy_id: c.id || c.candy_id,
            shape: c.shape,
            shape_name: c.shape_name,
            color: c.color,
            color_name: c.color_name,
            title: c.title || '',
            text: c.text || '',
            jar: u.jar || null,
            message: (u && u.message) || '糖投进去了',
            stats: u.stats
        });
    });
}
/** 把糖列出来（摘要） */
async function list_candies(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.list_candies', {
            jar_id: p.jar_id,
            unread_only: p.unread_only,
            limit: p.limit
        }));
        if (u && u.success === false) {
            complete({ success: false, message: u.message || '读取失败' });
            return;
        }
        const list = (u && u.candies) || [];
        complete({
            success: true,
            count: list.length,
            unread_count: (u && u.stats && u.stats.unread_count) || 0,
            candies: list.map(function (c) {
                return {
                    candy_id: c.id || c.candy_id,
                    jar_id: c.jar_id,
                    shape: c.shape,
                    shape_name: c.shape_name,
                    color: c.color,
                    color_name: c.color_name,
                    title: c.title || '',
                    text: c.text || '',
                    mood: c.mood || '',
                    created_at: c.created_at,
                    unread: !!c.unread,
                    // 罐内布局坐标（由 main 侧算好）：UI 用它把糖摆进罐子，AI 一般可忽略
                    x: c.x,
                    y: c.y,
                    rot: c.rot,
                    size: c.size
                };
            }),
            stats: u.stats || {}
        });
    });
}
/** 读一颗糖的完整内容 */
async function read_candy(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.get_candy', {
            candy_id: p.candy_id,
            mark_read: p.mark_read === undefined ? true : !!p.mark_read
        }));
        if (u && u.success === false) {
            complete({ success: false, message: u.message || '没有找到这颗糖' });
            return;
        }
        const c = (u && u.candy) || {};
        complete({
            success: true,
            candy_id: c.id || c.candy_id,
            shape: c.shape,
            shape_name: c.shape_name,
            color: c.color,
            color_name: c.color_name,
            title: c.title || '',
            text: c.text || '',
            flavor: c.flavor || '',
            mood: c.mood || '',
            jar: u.jar || null,
            created_at: c.created_at,
            message: '这颗糖（' + (c.shape_name || '') + '·' + (c.color_name || '') + '）上写着：' + (c.text || '')
        });
    });
}
/** 改一颗糖 */
async function update_candy(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.update_candy', {
            candy_id: p.candy_id,
            text: p.text,
            title: p.title,
            shape: p.shape,
            color: p.color,
            flavor: p.flavor,
            mood: p.mood,
            jar_id: p.jar_id,
            mark_read: p.mark_read,
            mark_unread: p.mark_unread
        }));
        if (u && u.success === false) {
            complete({ success: false, message: u.message || '没有找到这颗糖' });
            return;
        }
        const c = (u && u.candy) || {};
        complete({
            success: true,
            candy_id: c.id || c.candy_id,
            shape: c.shape,
            color: c.color,
            title: c.title || '',
            text: c.text || '',
            message: (u && u.message) || '这颗糖改好了'
        });
    });
}
/** 把糖拿出来 */
async function remove_candy(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.remove_candy', {
            candy_id: p.candy_id,
            purge: !!p.purge
        }));
        if (u && u.success === false) {
            complete({ success: false, message: u.message || '没有找到这颗糖' });
            return;
        }
        complete({
            success: true,
            removed: u.removed,
            purged: !!u.purged,
            last_text: u.last_text || '',
            message: (u && u.message) || '拿出来了',
            stats: u.stats
        });
    });
}
/** 摇一摇 */
async function shake(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.shake', { jar_id: p.jar_id }));
        complete({
            success: !!(u && u.success !== false),
            moved: u.moved || 0,
            message: (u && u.message) || '摇了摇罐子',
            stats: u.stats
        });
    });
}
/** 概览 */
async function stats(params) {
    const p = params || {};
    return guard(async function () {
        const u = unpack(await ipc('candy.stats', { jar_id: p.jar_id }));
        complete({
            success: true,
            stats: u.stats || {},
            message: '罐子 ' + ((u.stats && u.stats.jar_count) || 0) + ' 只，糖 ' + ((u.stats && u.stats.candy_count) || 0) + ' 颗，其中 ' + ((u.stats && u.stats.unread_count) || 0) + ' 颗还没读过'
        });
    });
}
/** 查可用花色 */
async function catalog(params) {
    return guard(async function () {
        const u = unpack(await ipc('candy.catalog', {}));
        complete({
            success: true,
            jar_types: u.jar_types || [],
            shapes: u.shapes || [],
            colors: u.colors || [],
            max_candy_per_jar: u.max_candy_per_jar,
            max_text_len: u.max_text_len
        });
    });
}
/** 放示范 */
async function seed_demo(params) {
    return guard(async function () {
        const u = unpack(await ipc('candy.seed_demo', {}));
        complete({
            success: !!(u && u.success !== false),
            message: (u && u.message) || '已放进样板罐和三颗示范糖',
            stats: u.stats
        });
    });
}
