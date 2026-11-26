import { initialFall, stepFall } from "./states";

export type Rectangle = { x: number; y: number; w: number; h: number };
export const overlap = (a: Rectangle, b: Rectangle) =>
  Math.max(a.x, b.x) < Math.min(a.x + a.w, b.x + b.w)
  && Math.max(a.y, b.y) < Math.min(a.y + a.h, b.y + b.h);

type Values = Record<string, string>;
type Field = { key: string; label: string; initial: string; options?: [string, string][] };
type Check = { label: string; result: string; ok: boolean };
type Plot = { width: number; height: number; items: (Rectangle & { label: string })[] };
export type Report = { checks: Check[]; plot?: Plot; note?: string };
type Bench = { fields: Field[]; run: (values: Values) => Report };
const check = (label: string, result: string, ok: boolean): Check => ({ label, result, ok });
export const benchPassed = (report: Report | null) => Boolean(report?.checks.length && report.checks.every(c => c.ok));

function select(key: string, label: string, initial: string, options: [string, string][]): Field {
  return { key, label, initial, options };
}
const numbered = (values: number[]): [string, string][] => values.map(n => [String(n), String(n)]);
const toggle = (key: string, label: string, initial = "off") => select(key, label, initial, [["off", "关闭"], ["on", "启用"]]);

const wall = { x: 4, y: 1, w: 2, h: 2 };
const collision: Bench = {
  fields: [
    select("x", "角色 X", "2", numbered([1, 2, 3, 4])),
    select("y", "角色 Y", "0", numbered([0, 1, 2, 3])),
  ],
  run({ x = "2", y = "0" }) {
    const body = { x: Number(x), y: Number(y), w: 2, h: 2 };
    const hit = overlap(body, wall);
    const previous = { ...body, x: body.x - 1 };
    const above = { ...body, y: wall.y - body.h };
    return {
      checks: [
        check("当前位置", hit ? "两轴重叠，检测到正面积交叠" : "没有正面积交叠", hit && body.x === 3 && body.y === 1),
        check("向左退一格", overlap(previous, wall) ? "仍重叠" : "没有重叠", !overlap(previous, wall) && previous.x + previous.w === wall.x),
        check("上边界对照", overlap(above, wall) ? "重叠" : "边缘相接，无面积", !overlap(above, wall)),
      ],
      plot: { width: 7, height: 5, items: [{ ...wall, label: "墙" }, { ...body, label: "角色" }] },
    };
  },
};

type Scene = "workshop" | "entrance";
const savedSpawn: Record<Scene, number> = { workshop: 0, entrance: 2 };
export function previewScene(scene: Scene, edit: number, playOffset: number, save: boolean) {
  const preview = Math.max(0, Math.min(5, edit + playOffset));
  return { before: savedSpawn[scene], edit, preview, afterStop: edit, loaded: save ? edit : savedSpawn[scene] };
}
const editor: Bench = {
  fields: [
    select("scene", "打开场景", "workshop", [["workshop", "工坊场景"], ["entrance", "入口场景"]]),
    select("position", "编辑模式出生点 X", "0", numbered([0, 1, 2, 3])),
    select("trial", "播放模式移动量", "0", numbered([0, 1, 2])),
    toggle("save", "保存编辑模式场景"),
  ],
  run({ scene, position = "0", trial = "0", save }) {
    const r = previewScene(scene === "entrance" ? "entrance" : "workshop", Number(position), Number(trial), save === "on");
    return { checks: [
      check("场景与编辑", `原保存点 x=${r.before}；已编辑 x=${r.edit}`, scene === "entrance" && r.edit === 3),
      check("播放／停止", `播放中 x=${r.preview}；停止后 x=${r.afterStop}`, r.preview === 5 && r.afterStop === 3),
      check("重新打开资源", `从保存快照读到 x=${r.loaded}`, r.loaded === 3),
    ] };
  },
};

export function componentProbe(sprite: boolean, movement: boolean, collider: boolean) {
  const proposed = movement ? 2 : 0;
  const hits = collider && overlap({ x: proposed, y: 0, w: 1, h: 1 }, { x: 2, y: 0, w: 1, h: 1 });
  const position = hits ? proposed - 1 : proposed;
  return { sprite, moved: position > 0, hits, position };
}
const components: Bench = {
  fields: [toggle("sprite", "Sprite Renderer", "on"), toggle("movement", "移动脚本"), toggle("collider", "碰撞组件")],
  run(values) {
    const r = componentProbe(values.sprite === "on", values.movement === "on", values.collider === "on");
    return { checks: [
      check("显示", r.sprite ? "已绘制机器人精灵" : "没有精灵绘制", r.sprite),
      check("脚本更新", `执行测试动作后 x=${r.position}`, r.moved),
      check("墙体接触", r.hits ? "在墙前停下" : "未检测到接触（检查坐标与组件）", r.hits),
    ], plot: { width: 4, height: 2, items: [{ x: 2, y: 0, w: 1, h: 1, label: "墙" }, ...(r.sprite ? [{ x: r.position, y: 0, w: 1, h: 1, label: "角色" }] : [])] } };
  },
};

type Sample = { energy: number; grounded: boolean };
type Expression = (sample: Sample) => boolean;
const operators: Record<string, (x: number, rhs: number) => boolean> = {
  "<": (x, y) => x < y, "<=": (x, y) => x <= y, ">": (x, y) => x > y, ">=": (x, y) => x >= y,
  "==": (x, y) => x === y, "!=": (x, y) => x !== y,
};
function parseAtom(value: string): Expression | undefined {
  const atom = value.trim();
  if (atom === "grounded") return s => s.grounded;
  if (/^!\s*grounded$/.test(atom)) return s => !s.grounded;
  const match = atom.match(/^energy\s*(<=|>=|==|!=|<|>)\s*(-?(?:0|[1-9]\d?))$/);
  if (match) return s => operators[match[1]!]!(s.energy, Number(match[2]));
}
export function parseReturn(code: string): Expression | undefined {
  if (code.length > 240) return;
  const base = code.trim().match(/^return\s+([^;]+);$/);
  if (!base) return;
  const groups = base[1]!.split("||").map(and => and.split("&&").map(parseAtom));
  if (groups.flat().some(atom => !atom)) return;
  return s => groups.some(and => and.every(atom => atom!(s)));
}
const scripting: Bench = {
  fields: [{ key: "code", label: "C# 条件语句", initial: "return energy > 3 || grounded;" }],
  run({ code = "" }) {
    const expr = parseReturn(code);
    if (!expr) return { checks: [check("代码解析", "请写一条带分号的 return，使用 energy 比较和 grounded 条件。此模拟不接受括号或其他语句。", false)] };
    const samples = Array.from({ length: 11 }, (_, energy) => [false, true].map(grounded => ({ energy, grounded }))).flat();
    const failures = samples.filter(s => expr(s) !== (s.energy >= 3 && s.grounded));
    const sampleRows = [{ energy: 2, grounded: true }, { energy: 3, grounded: false }, { energy: 3, grounded: true }, { energy: 9, grounded: true }];
    return { checks: [...sampleRows.map(s => check(
      `电量 ${s.energy} · ${s.grounded ? "在地面" : "腾空"}`,
      expr(s) ? "允许启动" : "拒绝启动",
      expr(s) === (s.energy >= 3 && s.grounded)
    )), check("全部样本", failures.length ? `首个差异：电量 ${failures[0]!.energy}，在地面：${failures[0]!.grounded ? "是" : "否"}` : "22 个边界与对照样本都匹配", !failures.length)] };
  },
};

export function physicsProbe(body: string, platform: string, sensor: string) {
  let f = initialFall();
  for (let step = 0; step < 4 && body === "dynamic"; step++) f = stepFall(f, 4, platform === "solid");
  const falls = f.heights.length > 0;
  const entersSensor = falls && f.heights.some(y => y <= 1);
  return { y: f.y, rests: f.landed, enters: sensor === "trigger" && entersSensor };
}
const physics: Bench = {
  fields: [
    select("body", "角色刚体", "static", [["static", "Static"], ["kinematic", "Kinematic · 未下达移动指令"], ["dynamic", "Dynamic"]]),
    select("platform", "地面形状", "trigger", [["solid", "实体 Collider2D"], ["trigger", "Trigger 感应区"]]),
    select("sensor", "签到区域", "off", [["off", "未配置"], ["trigger", "Trigger 感应区"]]),
  ],
  run({ body = "static", platform = "trigger", sensor = "off" }) {
    const r = physicsProbe(body, platform, sensor);
    return { checks: [
      check("足部位置", `四步后 y=${r.y}`, body === "dynamic" && r.y === 0),
      check("地面接触", r.rests ? "落地阻挡，垂直速度归零" : "没有实体落地", r.rests),
      check("签到触发", r.enters ? "进入感应区，保留移动" : "没有记录进入事件", r.enters),
    ] };
  },
};

export function hudPosition(width: number, anchor: string, inset: number) {
  const size = 112;
  return { x: anchor === "right" ? width - inset - size : inset, w: size, right: anchor === "right" ? inset : width - inset - size };
}
const hud: Bench = {
  fields: [
    select("anchor", "水平锚点", "left", [["left", "左侧"], ["right", "右侧"]]),
    select("inset", "安全边距", "0", numbered([0, 12, 24])),
    select("value", "界面数据来源", "fixed", [["fixed", "写死满电"], ["state", "当前游戏电量"]]),
  ],
  run({ anchor = "left", inset = "0", value }) {
    const a = hudPosition(360, anchor, Number(inset));
    const b = hudPosition(960, anchor, Number(inset));
    const before = 3, after = 2;
    const displayed = value === "state" ? after : before;
    return {
      checks: [
        check("手机视口", `距右边 ${a.right}px`, a.right === 12),
        check("桌面视口", `距右边 ${b.right}px`, b.right === 12),
        check("扣除一格后的 HUD", `电量显示 ${displayed}/3`, displayed === after),
      ],
      plot: { width: 360, height: 160, items: [{ x: a.x, y: Number(inset), w: a.w, h: 34, label: `${displayed}/3` }] },
    };
  },
};

export function inspectSheet(mode: string, ppu: number, licence: string) {
  const frames = mode === "multiple" ? 2 : 1;
  const poseWidth = 128 / frames;
  return { frames, measuredWidth: poseWidth / ppu, releasable: licence === "owned" };
}
const assets: Bench = {
  fields: [
    select("mode", "精灵导入方式", "single", [["single", "Single · 整图"], ["multiple", "Multiple · 每帧 64×64"]]),
    select("ppu", "每单位像素（PPU）", "16", numbered([16, 32, 64])),
    select("sound", "使用的提示音来源", "unknown", [["unknown", "未知许可的网盘样本"], ["owned", "项目自制音效"]]),
  ],
  run({ mode = "single", ppu = "16", sound = "unknown" }) {
    const r = inspectSheet(mode, Number(ppu), sound);
    return { checks: [
      check("128×64 图集", `切出 ${r.frames} 帧`, r.frames === 2),
      check("单帧场景宽度", `${r.measuredWidth} 单位`, r.measuredWidth === 2),
      check("声音可再分发", r.releasable ? "该音效由项目自制" : "未能确认许可", r.releasable),
    ] };
  },
};

export function probePackage(entry: string, includeAssets: boolean, path: string) {
  const base = "https://example.invalid/robot/";
  const files = new Set(entry === "workshop" ? ["/robot/index.html"] : []);
  if (includeAssets) files.add("/robot/assets/level.json");
  const resource = new URL(path, base).pathname;
  return { index: files.has("/robot/index.html"), assets: files.has(resource), resource };
}
const release: Bench = {
  fields: [
    select("scene", "入口场景", "menu", [["menu", "菜单场景 · 示例尚无入口"], ["workshop", "巡检工坊"]]),
    toggle("pack", "包含关卡数据"),
    select("path", "关卡数据引用", "absolute", [["absolute", "/assets/level.json"], ["relative", "./assets/level.json"]]),
  ],
  run({ scene = "menu", pack, path }) {
    const r = probePackage(scene, pack === "on", path === "relative" ? "./assets/level.json" : "/assets/level.json");
    return {
      checks: [
        check("读取 /robot/index.html", r.index ? "模拟产物中找到入口" : "模拟入口缺失", r.index),
        check("读取关卡数据", `${r.resource} · ${r.assets ? "产物中存在" : "缺失"}`, r.assets),
      ],
      note: "检查的是本地生成的文件清单和解析后的路径。",
    };
  },
};

export const benches = { collision, editor, components, scripting, physics, hud, assets, release };
export type BenchKey = keyof typeof benches;
