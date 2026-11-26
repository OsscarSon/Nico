// Run against the production preview: BASE_URL=http://localhost:4173 npm run smoke:d
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = process.env.SCREENSHOT_DIR ?? "test-results/d";
mkdirSync(out, { recursive: true });

const lessonIds = ["d01-game-loop", "d02-coordinates", "d03-vector-movement", "d04-input"];
const artFiles = ["lesson-d01-game-loop-centered.png", ...lessonIds.slice(1).map(id => `lesson-${id}.png`)];
const answers = [[1, 2, 0], [3, 1, 0], [1, 2, 0], [1, 3, 0]];
const transfer = ["2", "1", "2", "2"];
const button = (p, name) => p.getByRole("button", { name, exact: true });
const click = (p, name) => button(p, name).click();
const next = p => button(p, "下一步");
const choose = (p, label, value) => p.getByLabel(label, { exact: true }).selectOption(String(value));
const lab = p => p.locator(".p3-lab");
const status = p => lab(p).getByRole("status").first().innerText();
const unlocked = async p => {
  await click(p, "检查当前任务");
  return button(p, "完成挑战").isEnabled();
};

async function loop(p, challenge) {
  await choose(p, "本帧待采样的输入", 1);
  assert.ok(await button(p, "绘制画面").isDisabled());
  await click(p, "读取输入");
  await choose(p, "本帧待采样的输入", -1);
  await click(p, "更新世界");
  assert.match(await status(p), /世界 x=2 · 画面 x=1/);
  assert.ok(await button(p, "更新世界").isDisabled());
  await click(p, "绘制画面");
  assert.match(await status(p), /世界 x=2 · 画面 x=2/);
  if (!challenge) return;
  assert.equal(await unlocked(p), false);
  await choose(p, "本帧待采样的输入", 1);
  for (const action of ["读取输入", "更新世界", "绘制画面"]) await click(p, action);
  assert.match(await status(p), /2 → 3/);
}

async function coordinates(p, challenge) {
  await choose(p, "X 坐标", -1);
  await click(p, "落下标记");
  assert.match(await status(p), /场地外/);
  await choose(p, "坐标系", "local");
  await choose(p, "Y 坐标", 2);
  await click(p, "落下标记");
  assert.match(await status(p), /\(1, 3\)/);
  if (!challenge) return;
  await choose(p, "坐标系", "world");
  await choose(p, "X 坐标", 4);
  await click(p, "落下标记");
  await choose(p, "标记", "dock");
  await choose(p, "X 坐标", 1);
  await choose(p, "Y 坐标", 3);
  await click(p, "落下标记");
  assert.equal(await unlocked(p), false, "world coordinates cannot substitute for the local-coordinate challenge");
  await choose(p, "坐标系", "local");
  await choose(p, "X 坐标", -1);
  await choose(p, "Y 坐标", 2);
  await click(p, "落下标记");
  assert.match(await lab(p).getByRole("img").getAttribute("aria-label"), /补给 \(4, 2\).*停靠 \(1, 3\)/);
}

async function motion(p, challenge) {
  await choose(p, "横向速度（格／秒）", challenge ? 4 : -3);
  await choose(p, "纵向速度（格／秒）", challenge ? 4 : 2);
  await click(p, "推进一步");
  assert.match(await status(p), challenge ? /\(2, 2\).*500ms/ : /\(-1.5, 1\).*500ms/);
  assert.ok(await button(p, "保存本次试验").isDisabled());
  if (!challenge) return;
  await choose(p, "纵向速度（格／秒）", 0);
  await click(p, "推进一步");
  await click(p, "保存本次试验");
  assert.match(await p.getByRole("list", { name: "试验记录" }).innerText(), /\(4, 2\) · 请核对速度和步长/);
  assert.equal(await unlocked(p), false);
  await click(p, "回到起点");
  await choose(p, "纵向速度（格／秒）", 2);
  for (let i = 0; i < 2; i++) await click(p, "推进一步");
  await click(p, "保存本次试验");
  assert.equal(await unlocked(p), false);
  await click(p, "回到起点");
  await choose(p, "步长（ms）", 250);
  for (let i = 0; i < 4; i++) await click(p, "推进一步");
  await click(p, "保存本次试验");
  assert.equal(await p.getByText(/符合目标/).count(), 2);
}

async function input(p, challenge, width) {
  if (!challenge && width === 1440) {
    await button(p, "键盘控制区").focus();
    await p.keyboard.down("ArrowRight");
    await p.keyboard.down("Space");
    await p.keyboard.press("Enter");
    await p.keyboard.down("Space"); // browser key repeat while held
    await p.keyboard.press("Enter");
    await p.keyboard.up("Space");
    await p.keyboard.up("ArrowRight");
    assert.match(await status(p), /位置 x=2 · 信号 1 次 · 第 2 帧/);
    return;
  }
  if (width === 360) await button(p, "按下右方向键").tap();
  else await click(p, "按下右方向键");
  await click(p, "按下空格键");
  await click(p, "更新一帧");
  await click(p, "更新一帧");
  assert.match(await status(p), /位置 x=2 · 信号 1 次 · 第 2 帧/);
  if (!challenge) return;
  await click(p, "松开空格键");
  await click(p, "更新一帧");
  await click(p, "松开右方向键");
  await click(p, "按下空格键");
  await click(p, "更新一帧");
  assert.equal(await unlocked(p), false);
  await click(p, "松开空格键");
  assert.match(await status(p), /位置 x=3 · 信号 2 次/);
}

async function fits(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${page.url()}: 页面横向溢出 ${overflow}px`);
}

const browser = await chromium.launch();
let passed = 0;
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, hasTouch: width < 900 });
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", error => errors.push(error.message));
    await p.goto(`${base}/#/paths/d`);
    await p.locator(".pathmap").waitFor();
    assert.equal(await p.locator("a.pm-card").count(), 4);
    assert.equal(await p.locator(".pm-card.planned").count(), 12);
    assert.equal(await p.locator(".pm-card.planned a").count(), 0);
    await fits(p);
    for (const [index, id] of lessonIds.entries()) {
      await p.goto(`${base}/#/lesson/${id}`);
      const art = p.locator(".lesson-art");
      await art.waitFor();
      const placement = await art.evaluate(async (image, file) => {
        await image.decode();
        const style = getComputedStyle(image);
        const rect = image.getBoundingClientRect();
        const body = image.closest(".lesson-body").getBoundingClientRect();
        return new URL(image.src).pathname.endsWith(`/art/${file}`)
          && image.naturalWidth === 1600 && image.naturalHeight === 900
          && style.objectFit === "contain" && style.objectPosition === "50% 50%"
          && Math.abs(rect.width / rect.height - 16 / 9) < .02
          && Math.abs(rect.left + rect.right - body.left - body.right) < 2;
      }, artFiles[index]);
      assert.ok(placement);
      assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
      assert.equal(await p.locator(".pill.draft").count(), 1);
      await fits(p);
      if (width !== 360) await p.screenshot({ path: `${out}/${id}-${width}.png` });
      const exercise = [loop, coordinates, motion, input][index];
      for (let step = 0; step < 4; step++) await next(p).click();
      assert.equal(await p.locator(".device header .pill").innerText(), "模拟");
      await exercise(p, false, width);
      await fits(p);
      await next(p).click();
      assert.ok(await next(p).isDisabled());
      assert.equal(await unlocked(p), false);
      await exercise(p, true, width);
      await fits(p);
      assert.equal(await unlocked(p), true);
      await click(p, "完成挑战");
      assert.ok(await next(p).isEnabled());
      if (index === 3 && width === 390) {
        await p.locator(".p3-check").evaluate(el => el.scrollIntoView({ block: "center" }));
        await p.screenshot({ path: `${out}/d04-input-result-390.png` });
      }
      await next(p).click();

      for (const [q, correct] of answers[index].entries()) {
        await p.locator(".option").nth((correct + 1) % 4).click();
        assert.ok((await p.locator(".feedback.bad").innerText()).length > 10);
        await p.locator(".option").nth(correct).click();
        await click(p, q < 2 ? "下一题" : "完成检查");
      }
      await next(p).click();
      const answer = p.getByLabel("你的答案（一个整数）");
      await answer.fill("99");
      await click(p, "检查答案");
      assert.ok(await next(p).isDisabled());
      await answer.fill(transfer[index]);
      await click(p, "检查答案");
      await next(p).click();
      assert.equal(await p.locator(".foundation-sources a").count(), 2);
      const saved = await p.evaluate(key => JSON.parse(localStorage.getItem("nico-progress")).lessons[key], id);
      assert.equal(saved.quizTotal, 4);
      assert.equal(saved.firstTryCorrect, 0);
      await p.reload();
      assert.match(await p.locator(".lesson-head").innerText(), /已完成/);
      passed++;
      console.log(`PASS ${width}px ${id} · 插图、实验、错误与修复、诊断题、迁移、进度`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(`${passed} 条 D 路线完整流程通过。`);
} finally {
  await browser.close();
}
