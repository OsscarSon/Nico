// Three full conclusion lessons through the public browser UI, no injected progress.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4173";
const output = process.env.SCREENSHOT_DIR ?? "test-results/p3b";
mkdirSync(output, { recursive: true });
const ids = ["b18-project-page", "b19-project-tool", "b20-review"];
const portfolio = `<style>h1 { color: #2457f5; }</style>
<header><h1>我的作品页</h1><nav><a href="#projects">看作品</a></nav></header>
<main><p>我在学习网页。</p><section id="projects"><h2>作品</h2>
<ul><li>位开关练习</li><li>阅读时间估算器</li></ul></section></main>`;
const calculator = `const pages = document.querySelector("#pages"), speed = document.querySelector("#speed");
const result = document.querySelector("#result");
document.querySelector("#estimate").addEventListener("click", function () {
  const p = Number(pages.value), s = Number(speed.value), n = Math.ceil(p / s);
  result.textContent = Number.isSafeInteger(p) && p > 0 && Number.isFinite(s) && s > 0 && Number.isFinite(n)
    ? "约 " + n + " 分钟"
    : "请输入有效数字";
});`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const button = (page, name) => page.getByRole("button", { name, exact: true });
const next = (page) => button(page, "下一步");
const click = (page, name) => button(page, name).click();
const noOverflow = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
const contains = async (page, text) => page.getByText(text, { exact: false }).first().waitFor();
async function fillCode(page, source) {
  const editor = page.locator('.code-editor[data-engine="cm"], .code-editor[data-engine="fallback"]');
  await editor.waitFor();
  const field = editor.locator("textarea, .cm-content").first();
  await field.fill(source);
}

async function webChallenge(page) {
  await click(page, "检查答案");
  await page.locator('.checklist li[data-ok="false"]').first().waitFor();
  assert.ok(await next(page).isDisabled());
  await fillCode(page, portfolio);
  const preview = page.frameLocator('iframe[title="网页预览"]').first();
  await preview.locator("#projects li").first().waitFor();
  assert.equal(await preview.locator("#projects li").count(), 2);
  assert.equal(await preview.locator("header nav a").getAttribute("href"), "#projects");
  await click(page, "检查答案");
  await contains(page, "全部检查通过");
}

async function tryCalculator(page) {
  await click(page, "运行");
  const preview = page.frameLocator('iframe[title="页面预览"]').first();
  await preview.locator("#pages").fill("37");
  await preview.locator("#speed").fill("4");
  await preview.locator("#estimate").click();
  assert.equal(await preview.locator("#result").innerText(), "约 10 分钟");
  await preview.locator("#speed").fill("0");
  await preview.locator("#estimate").press("Enter");
  assert.equal(await preview.locator("#result").innerText(), "请输入有效数字");
}

async function jsChallenge(page) {
  await click(page, "检查答案");
  await page.locator('.checklist li[data-ok="false"]').first().waitFor();
  assert.ok(await next(page).isDisabled());
  await fillCode(page, calculator);
  await tryCalculator(page);
  await click(page, "检查答案");
  await contains(page, "全部检查通过");
}

async function releaseChallenge(page) {
  await click(page, "检查当前任务");
  assert.ok(await button(page, "完成挑战").isDisabled());
  await click(page, "查询并解析 JSON");
  await click(page, "写入工作区");
  await contains(page, "名字或编号不能当成积分");
  await page.getByLabel("接口路径", { exact: true }).fill("/api/profile?id=2");
  await page.getByLabel("读取字段", { exact: true }).selectOption("points");
  await click(page, "查询并解析 JSON");
  await click(page, "写入工作区");

  await click(page, "从提交构建");
  await page.getByLabel("发布目录", { exact: true }).selectOption("dist");
  await click(page, "发布模拟快照");
  await page.getByLabel("访问路径", { exact: true }).fill("/club/");
  await click(page, "访问模拟站点");
  const releasePage = page.frameLocator('iframe[title="发布快照预览"]');
  await releasePage.getByText("成员 2 的积分：3", { exact: true }).waitFor();
  assert.ok(await button(page, "完成挑战").isDisabled());

  await click(page, "暂存文件");
  await click(page, "提交快照");
  await click(page, "从提交构建");
  await page.getByLabel("发布目录", { exact: true }).selectOption(".");
  await click(page, "发布模拟快照");
  await click(page, "访问模拟站点");
  assert.match(await page.getByLabel("访问结果", { exact: true }).innerText(), /HTTP 404/);
  await page.getByLabel("发布目录", { exact: true }).selectOption("dist");
  await click(page, "发布模拟快照");
  await click(page, "访问模拟站点");
  assert.match(await page.getByLabel("访问结果", { exact: true }).innerText(), /HTTP 200/);
  await releasePage.getByText("成员 2 的积分：8", { exact: true }).waitFor();
  await click(page, "检查当前任务");
  await click(page, "完成挑战");
}

try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 900 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/#/paths/b");
    assert.equal(await page.locator("a.pm-card").count(), 20);
    for (const [index, id] of ids.entries()) {
      await page.goto(base + "/#/lesson/" + id);
      const art = page.locator(".lesson-art");
      await art.evaluate(image => image.decode());
      assert.match(await art.getAttribute("src"), new RegExp("lesson-" + id + "\\.png$"));
      assert.ok(await art.evaluate(image => image.naturalWidth > 0 && getComputedStyle(image).objectFit === "contain" && Math.abs(image.width / image.height - 16 / 9) < 0.02));
      assert.match(await page.locator(".lesson-head").innerText(), /草稿/);
      await noOverflow(page);
      if (width !== 360) await page.screenshot({ path: `${output}/${id}-${width}.png` });

      for (let step = 0; step < 5; step++) await next(page).click();
      if (index === 0) {
        const frame = page.frameLocator('iframe[title="网页预览"]');
        await frame.getByRole("link", { name: "看作品" }).waitFor();
        assert.equal(await frame.locator("#projects li").count(), 2);
      } else if (index === 1) await tryCalculator(page);
      else await click(page, "查询并解析 JSON");
      await noOverflow(page);
      await next(page).click();
      assert.ok(await next(page).isDisabled());
      await [webChallenge, jsChallenge, releaseChallenge][index](page);
      await noOverflow(page);

      await next(page).click();
      for (let q = 0; q < 3; q++) {
        await page.locator(".option").nth(1).click();
        assert.ok((await page.locator(".feedback.bad").innerText()).length > 10);
        await page.locator(".option").first().click();
        await click(page, q < 2 ? "下一题" : "完成检查");
      }
      await next(page).click();
      const answer = page.getByLabel("你的答案（一个整数）");
      await answer.fill("99");
      await click(page, "检查答案");
      assert.ok(await next(page).isDisabled());
      await answer.fill(String([4, 15, 6][index]));
      await answer.press("Enter");
      await next(page).click();
      const record = await page.evaluate(lessonId => JSON.parse(localStorage.getItem("nico-progress")).lessons[lessonId], id);
      assert.equal(record.quizTotal, 4);
      assert.equal(record.firstTryCorrect, 0);
      assert.equal(await page.locator(".foundation-sources a").count(), 3);
      if (index < 2) assert.equal(await page.getByRole("link", { name: "下一课", exact: true }).getAttribute("href"), "#/lesson/" + ids[index + 1]);
      else assert.equal(await page.getByRole("navigation", { name: "课时导航" }).getByRole("link", { name: "回到路线", exact: true }).getAttribute("href"), "#/paths/b");
      await page.reload();
      assert.match(await page.locator(".lesson-head").innerText(), /已完成/);
      await noOverflow(page);
      console.log(`PASS ${width}px ${id}: illustration, free task, failure/recovery, challenge, quiz, transfer, saved completion`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await browser.close(); }
console.log("P3-B: 9 complete lesson flows passed.");
