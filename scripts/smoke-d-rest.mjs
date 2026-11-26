// Runs D05–D16 using only the lesson player and learner controls.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = process.env.SCREENSHOT_DIR ?? "test-results/d";
mkdirSync(out, { recursive: true });
const button = (p, title) => p.getByRole("button", { name: title, exact: true });
const click = (p, title) => button(p, title).click();
const next = p => button(p, "下一步");
const choose = (p, name, value) => p.getByLabel(name, { exact: true }).selectOption(value);
const status = p => p.locator(".p3-lab").getByRole("status").first().innerText();
const results = p => p.getByRole("list", { name: "实验结果" });
const negative = async p => {
  await click(p, "检查当前任务");
  assert.ok(await button(p, "完成挑战").isDisabled());
  assert.ok(await next(p).isDisabled());
};

const cases = [
  ["d05-collision", [1, 2, 0], "1", { "角色 X": "3", "角色 Y": "1" }, /检测到正面积交叠/],
  ["d06-gravity", [0, 3, 1], "3"],
  ["d07-state-machine", [2, 0, 3], "1"],
  ["d08-feedback", [2, 0, 1], "2"],
  ["d09-unity-editor", [1, 2, 0], "1", { "打开场景": "entrance", "编辑模式出生点 X": "3", "播放模式移动量": "2", "保存编辑模式场景": "on" }, /播放中 x=5；停止后 x=3/],
  ["d10-game-object", [2, 0, 3], "2", { "移动脚本": "on", "碰撞组件": "on" }, /在墙前停下/],
  ["d11-csharp", [1, 2, 0], "2", { "C# 条件语句": "return grounded && energy > 2;" }, /22 个边界与对照样本都匹配/],
  ["d12-unity-physics", [3, 0, 1], "1", { "角色刚体": "dynamic", "地面形状": "solid", "签到区域": "trigger" }, /落地阻挡，垂直速度归零/],
  ["d13-hud", [0, 3, 1], "284", { "水平锚点": "right", "安全边距": "12", "界面数据来源": "state" }, /电量显示 2\/3/],
  ["d14-assets", [2, 3, 0], "2", { "精灵导入方式": "multiple", "每单位像素（PPU）": "32", "使用的提示音来源": "owned" }, /切出 2 帧/],
  ["d15-release", [1, 2, 0], "1", { "入口场景": "workshop", "包含关卡数据": "on", "关卡数据引用": "relative" }, /\/robot\/assets\/level\.json · 产物中存在/],
  ["d16-game-project", [1, 2, 3], "5"],
];

async function bench(p, challenge, id, fields, expected) {
  await click(p, "运行实验");
  assert.match(await results(p).innerText(), /需调整/);
  if (challenge) await negative(p);
  if (id === "d11-csharp") {
    await p.getByRole("textbox", { name: "C# 条件语句" }).fill("return energy >= 3");
    await click(p, "运行实验");
    assert.match(await results(p).innerText(), /带分号/);
  }
  if (id === "d12-unity-physics") {
    await choose(p, "角色刚体", "dynamic");
    await click(p, "运行实验");
    assert.match(await results(p).innerText(), /y=-0.5/);
  }
  if (id === "d15-release") {
    await choose(p, "入口场景", "workshop");
    await choose(p, "包含关卡数据", "on");
    await click(p, "运行实验");
    assert.match(await results(p).innerText(), /\/assets\/level\.json · 缺失/);
  }
  for (const [field, value] of Object.entries(fields)) {
    if (field === "C# 条件语句") await p.getByRole("textbox", { name: field }).fill(value);
    else await choose(p, field, value);
  }
  assert.equal(await results(p).count(), 0, "changing input invalidates the prior report");
  await click(p, "运行实验");
  assert.match(await results(p).innerText(), expected);
  assert.doesNotMatch(await results(p).innerText(), /需调整/);
}

async function gravity(p, challenge) {
  await click(p, "推进重力一步");
  assert.match(await status(p), /高度 2 · 竖直速度 0/);
  if (challenge) await negative(p);
  await click(p, "回到起点");
  await choose(p, "重力加速度（单位／秒²）", "4");
  for (let i = 0; i < 4; i++) await click(p, "推进重力一步");
  assert.match(await status(p), /高度 0 · 竖直速度 0 · 已落地/);
  assert.ok(await p.getByText(/1.75 → 1.25 → 0.5 → 0/).isVisible());
}

async function machine(p, challenge) {
  for (const action of ["开始巡检", "停靠", "移动并捡电池", "暂停", "移动并捡电池"]) await click(p, action);
  assert.match(await status(p), /已暂停 · 电量 1\/2 · 暂停期间移动被拒绝/);
  if (challenge) await negative(p);
  for (const action of ["继续巡检", "移动并捡电池", "停靠"]) await click(p, action);
  assert.match(await status(p), /已结束 · 电量 2\/2/);
}

async function feedback(p, challenge) {
  await p.getByRole("checkbox", { name: "启用提示音" }).check();
  await click(p, "收集电池 A");
  assert.match(await status(p), /发出音效请求/);
  await click(p, "收集电池 A");
  assert.match(await status(p), /没有发出第二次提示/);
  assert.equal(await p.getByRole("list", { name: "反馈记录" }).locator("li").count(), 1);
  if (challenge) await negative(p);
  await p.getByRole("checkbox", { name: "静音", exact: true }).check();
  await click(p, "收集电池 B");
  assert.match(await status(p), /有视觉提示 · 无音效请求/);
  assert.ok(await p.getByText("已收到电池 B。", { exact: true }).isVisible());
}

async function delivery(p, challenge, width) {
  for (let i = 0; i < 3; i++) await click(p, "向右一步");
  assert.match(await status(p), /落在缺口/);
  if (challenge) await negative(p);
  await click(p, "重开关卡");
  if (width === 360) await button(p, "向右一步").tap();
  else await click(p, "向右一步");
  for (const action of ["向右一步", "向右起跳", "推进落地帧", "向右一步", "向右一步", "向右一步"]) await click(p, action);
  assert.match(await status(p), /位置 x=7 · 电池 2\/2 · 两块电池已送达/);
  if (!challenge) return;
  const [file] = await Promise.all([p.waitForEvent("download"), click(p, "导出通关记录")]);
  assert.equal(file.suggestedFilename(), "nico-d16-delivery.json");
  const replay = JSON.parse(readFileSync(await file.path(), "utf8"));
  assert.deepEqual(replay, { version: 1, layout: "gap", actions: ["right", "right", "jump-right", "land", "right", "right", "right"], collected: [1, 5], position: 7, crossedGap: true });
}

const labs = { "d06-gravity": gravity, "d07-state-machine": machine, "d08-feedback": feedback, "d16-game-project": delivery };
const fits = async p => {
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${p.url()}: 页面横向溢出 ${overflow}px`);
};
const browser = await chromium.launch();
let passed = 0;
try {
  await Promise.all([1440, 390, 360].map(async width => {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, hasTouch: width < 900 });
    const p = await context.newPage();
    p.setDefaultTimeout(15000);
    const errors = [];
    p.on("pageerror", error => errors.push(error.message));
    await p.goto(`${base}/#/paths/d`);
    await p.locator(".pathmap").waitFor();
    assert.equal(await p.locator("a.pm-card").count(), 16);
    assert.equal(await p.locator(".route-unit").count(), 4);
    for (const [id] of cases) {
      const href = `#/lesson/${id}`;
      assert.equal(await p.locator(`a.pm-card[href="${href}"]`).count(), 1);
    }
    for (const [id, quiz, transfer, fields, expected] of cases) {
      await p.goto(`${base}/#/lesson/${id}`);
      const art = p.locator(".lesson-art");
      await art.waitFor();
      const expectedArt = id === "d10-game-object" ? "lesson-d10-game-object-centered.png" : `lesson-${id}.png`;
      assert.ok(await art.evaluate(async (image, file) => {
        await image.decode();
        const style = getComputedStyle(image);
        const rect = image.getBoundingClientRect();
        const body = image.closest(".lesson-body").getBoundingClientRect();
        return image.src.endsWith(`/art/${file}`) && image.naturalWidth === 1600 && image.naturalHeight === 900
          && style.objectFit === "contain" && style.objectPosition === "50% 50%"
          && Math.abs(rect.width / rect.height - 16 / 9) < .02 && Math.abs(rect.left + rect.right - body.left - body.right) < 2;
      }, expectedArt));
      assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
      assert.equal(await p.locator(".pill.draft").count(), 1);
      await fits(p);
      if (width !== 360) await p.screenshot({ path: `${out}/${id}-${width}.png` });
      for (let step = 0; step < 4; step++) await next(p).click();
      assert.equal(await p.locator(".device header .pill").innerText(), "模拟");
      const play = async challenge => fields ? bench(p, challenge, id, fields, expected) : labs[id](p, challenge, width);
      await play(false);
      await fits(p);
      await next(p).click();
      await negative(p);
      await play(true);
      await click(p, "检查当前任务");
      await click(p, "完成挑战");
      await fits(p);
      if (id === "d16-game-project" && width === 390) {
        await p.locator(".game-delivery").evaluate(element => element.scrollIntoView({ block: "start" }));
        await p.screenshot({ path: `${out}/d16-game-project-result-390.png` });
      }
      await next(p).click();
      for (const [i, choice] of quiz.entries()) {
        await p.locator(".option").nth((choice + 1) % 4).click();
        assert.ok((await p.locator(".feedback.bad").innerText()).length > 9);
        await p.locator(".option").nth(choice).click();
        await click(p, i === 2 ? "完成检查" : "下一题");
      }
      await next(p).click();
      const answer = p.getByLabel("你的答案（一个整数）");
      await answer.fill("99");
      await click(p, "检查答案");
      assert.ok(await next(p).isDisabled());
      await answer.fill(transfer);
      await click(p, "检查答案");
      await next(p).click();
      assert.equal(await p.locator(".foundation-sources a").count(), 2);
      const record = await p.evaluate(key => JSON.parse(localStorage.getItem("nico-progress")).lessons[key], id);
      assert.equal(record.quizTotal, 4);
      assert.equal(record.firstTryCorrect, 0);
      await p.reload();
      assert.match(await p.locator(".lesson-head").innerText(), /已完成/);
      await fits(p);
      if (id === "d16-game-project") {
        await p.goto(`${base}/#/me`);
        await p.locator(".badge.earned").filter({ hasText: "游戏制作人" }).waitFor();
      }
      passed++;
      console.log(`PASS ${width}px ${id} · 插图、实验、门控、问答、迁移、进度`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }));
  console.log(`${passed} 条 D05–D16 完整流程通过。`);
} finally {
  await browser.close();
}
