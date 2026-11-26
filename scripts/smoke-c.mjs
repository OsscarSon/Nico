import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const cases = JSON.parse(readFileSync(new URL("../tests/fixtures/c-route-cases.json", import.meta.url), "utf-8"));
const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = process.env.SCREENSHOT_DIR ?? "test-results/c";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const button = (page, name) => page.getByRole("button", { name, exact: true });
const click = (page, name) => button(page, name).click();
const next = page => button(page, "下一步");
const shotLessons = new Set(["c02-tokens-context", "c07-output-format", "c11-rag", "c18-assistant-project"]);

async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
}

async function runLab(page, sample) {
  await click(page, "检查当前任务");
  assert.ok(await next(page).isDisabled());
  await click(page, "运行实验");
  await page.getByRole("list", { name: "模拟结果" }).waitFor();
  await click(page, "检查当前任务");
  assert.ok(await button(page, "完成挑战").isDisabled());

  for (const [name, value] of Object.entries(sample.values)) {
    const field = page.locator(`[name="${name}"]`);
    if (await field.evaluate(element => element.tagName === "SELECT")) await field.selectOption(value);
    else await field.fill(value);
  }
  assert.equal(await page.getByRole("list", { name: "模拟结果" }).count(), 0);
  await click(page, "运行实验");
  assert.ok((await page.locator(".p3-snapshot").innerText()).includes(sample.evidence));
  if (sample.lab === "capstone") {
    await click(page, "检查当前任务");
    assert.ok(await button(page, "完成挑战").isDisabled());
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      click(page, "导出评估 CSV"),
    ]);
    assert.equal(download.suggestedFilename(), "nico-c18-evaluation.csv");
    const csv = readFileSync(await download.path(), "utf-8");
    assert.equal(csv.trim().split("\r\n").length, 5);
    assert.match(csv, /周六 10:00–17:00 开放/);
    assert.match(csv, /"要求替人修改账户","转人工","转人工"/);
    assert.ok(csv.trim().split("\r\n").slice(1).every(row => row.endsWith('"是"')));
  }
  await click(page, "检查当前任务");
  await click(page, "完成挑战");
  assert.ok(await next(page).isEnabled());
}

try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 900, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (!new URL(request.url()).href.startsWith(base)) requests.push(request.url()); });
    await page.goto(base + "/#/paths/c");
    assert.equal(await page.locator("a.pm-card").count(), 18);
    for (const sample of cases) {
      await page.goto(base + "/#/lesson/" + sample.id);
      const art = page.locator(".lesson-art");
      await art.evaluate(img => img.decode());
      assert.ok(await art.evaluate(img => img.naturalWidth === 1600 && img.naturalHeight === 900
        && getComputedStyle(img).objectFit === "contain" && Math.abs(img.width / img.height - 16 / 9) < .02));
      assert.match(await page.locator(".lesson-head").innerText(), /草稿/);
      await noOverflow(page);
      if (width !== 360 && shotLessons.has(sample.id)) {
        await page.screenshot({ path: `${out}/${sample.id}-${width}.png` });
      }

      for (let step = 0; step < 4; step++) await next(page).click();
      assert.equal(await page.locator(".device header .pill").innerText(), "模拟");
      await click(page, "运行实验");
      await page.getByRole("list", { name: "模拟结果" }).waitFor();
      await noOverflow(page);
      await next(page).click();
      assert.ok(await next(page).isDisabled());
      await runLab(page, sample);
      if (width !== 360 && sample.lab === "capstone") {
        await page.locator(".p3-snapshot").evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
        await page.screenshot({ path: `${out}/c18-evaluation-${width}.png` });
      }
      await noOverflow(page);

      await next(page).click();
      for (const [i, correct] of sample.answers.entries()) {
        await page.locator(".option").nth((correct + 1) % 3).click();
        assert.ok((await page.locator(".feedback.bad").innerText()).length > 7);
        await page.locator(".option").nth(correct).click();
        await click(page, i < 2 ? "下一题" : "完成检查");
      }
      await next(page).click();
      const answer = page.getByLabel("你的答案（一个整数）");
      await answer.fill("99");
      await click(page, "检查答案");
      assert.ok(await next(page).isDisabled());
      await answer.fill(String(sample.transfer));
      await answer.press("Enter");
      await next(page).click();
      const record = await page.evaluate(id => JSON.parse(localStorage.getItem("nico-progress")).lessons[id], sample.id);
      assert.equal(record.quizTotal, 4);
      assert.equal(record.firstTryCorrect, 0);
      assert.equal(await page.locator(".foundation-sources a").count(), 2);
      await page.reload();
      assert.match(await page.locator(".lesson-head").innerText(), /已完成/);
      await noOverflow(page);
      console.log(`PASS ${width}px ${sample.id} · 插图、自由实验、错误与修复、问答、迁移、进度`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    await page.goto(base + "/#/me");
    assert.ok(await page.locator(".badge.earned", { hasText: "助手工匠" }).isVisible());
    await context.close();
  }
} finally {
  await browser.close();
}
console.log("C 路线新课 51 条完整流程通过。");
