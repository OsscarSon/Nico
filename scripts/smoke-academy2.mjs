import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = process.env.SCREENSHOT_DIR ?? "test-results/academy2";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const fixture = JSON.stringify({
  schemaVersion: 1,
  lessons: { "a01-binary": { completedAt: "2026-11-26T00:00:00Z", firstTryCorrect: 3, quizTotal: 4 } },
  resume: { lessonId: "a22-error-logs", step: 2 }, activeDays: ["2026-11-26"],
});
const getProgress = page => page.evaluate(() => localStorage.getItem("nico-progress"));
const button = (page, name) => page.getByRole("button", { name, exact: true });
let passed = 0;

try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: width > 800 ? 1100 : 844 }, hasTouch: width < 800, colorScheme: "light" });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", event => errors.push(event.message));
    const go = async path => {
      await page.goto(base + "/#" + path);
      await page.locator("main h1").waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1), "横向溢出 " + page.url());
    };
    const screenshot = (name, fullPage = false) => page.screenshot({ path: out + "/" + name + "-" + width + ".png", fullPage });
    await go("/");
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    assert.ok(await page.locator(".home-preview").evaluate(el => Boolean(el.closest(".final-hero"))));
    assert.match(await page.locator(".a2-home-summary").innerText(), /30[\s\S]*116/);
    if (width !== 360) await screenshot("home", true);
    await page.locator(".a2-hero-secondary").click();
    await page.locator(".a2-course-card").first().waitFor();
    assert.equal(await page.locator(".a2-course-card").count(), 10);
    const all = page.getByRole("link", { name: "全部阶段", exact: true });
    if (width === 1440) await all.press("Enter");
    else await all.tap();
    await page.locator('.a2-course-card[data-course="advanced-ai"]').waitFor();
    assert.equal(await page.locator(".a2-course-card").count(), 30);
    const active = page.getByRole("combobox", { name: "知识领域" });
    await active.selectOption("statistics");
    assert.equal(await page.locator(".a2-course-card").count(), 3);
    await active.selectOption("");
    if (width === 1440) await screenshot("catalog");
    const search = page.getByRole("searchbox");
    await search.fill("A22");
    assert.equal(await page.locator(".a2-course-card").count(), 1);
    assert.equal(await page.locator(".a2-course-card").getAttribute("href"), "#/courses/foundation-systems?module=network");
    await page.locator(".a2-course-card").click();
    const network = page.locator('details[data-module="network"]');
    await network.locator("a", { hasText: "读懂报错与日志" }).waitFor();
    assert.equal(await network.getAttribute("open"), "");
    assert.notEqual(await network.locator("a", { hasText: "读懂报错与日志" }).getAttribute("href"), null);
    assert.equal(await page.locator(".a2-chapter").count() > 4, true);
    if (width === 390) await screenshot("course");
    assert.equal(await getProgress(page), null);
    console.log("PASS " + width + "px · 分期筛选、30 个入口与旧编号定位");
    passed++;

    await go("/graph");
    await page.getByLabel("选择课程").selectOption("advanced-ai");
    const example = page.getByRole("link", { name: /Attention 的五项先修/ });
    await example.click();
    const topics = page.locator(".a2-chapter .a2-prereq");
    await topics.waitFor();
    assert.equal(await topics.getByRole("checkbox").count(), 5);
    await topics.getByRole("checkbox", { name: "我已掌握：向量点积" }).check();
    assert.match(await topics.innerText(), /自评 1\/5/);
    const prerequisite = topics.getByRole("link", { name: /向量点积/ });
    assert.equal(await prerequisite.getAttribute("href"), "#/topics/fm-dot");
    await prerequisite.click();
    await page.getByRole("heading", { name: "向量点积", exact: true, level: 1 }).waitFor();
    await page.locator(".a2-crumbs a").first().click();
    const review = page.getByRole("link", { name: "向量点积", exact: true }).and(page.locator('[aria-current="location"]'));
    await review.waitFor();
    assert.equal(await review.innerText(), "向量点积");
    assert.equal(await getProgress(page), null);
    if (width === 1440) { await go("/graph"); await screenshot("graph"); }
    console.log("PASS " + width + "px · Attention 先修自评、跨模块复习");
    passed++;

    await go("/paths?path=statistics");
    assert.equal(await page.locator(".a2-guide-nav a").count(), 6);
    await page.locator(".a2-guide-nav a", { hasText: "Data Science" }).click();
    await button(page, "设为我的主线").click();
    assert.equal(await page.evaluate(() => localStorage.getItem("nico-academy2-path")), "data-science");
    await page.reload();
    await button(page, "取消设为我的主线").waitFor();
    assert.equal(await page.locator(".a2-guide-steps li").count(), 7);
    if (width === 1440) await screenshot("paths");
    await go("/");
    assert.match(await page.locator(".today").innerText(), /我的主线 · 数据科学/);
    assert.equal(await page.getByRole("link", { name: "开始这一课", exact: true }).getAttribute("href"), "#/lesson/b01-variables");
    assert.equal(await getProgress(page), null);
    console.log("PASS " + width + "px · 选择专业主线、持久化和真实推荐");
    passed++;

    await go("/lab");
    assert.equal(await page.locator(".a2-labs > a").count(), 7);
    await go("/lab/math");
    await page.getByRole("slider", { name: /常数 c/ }).press("End");
    assert.match(await page.locator(".a2-series").innerText(), /f\(0\) = 5/);
    assert.equal(await page.locator("canvas").evaluate(el => el.getContext("2d").getImageData(0,0,1,1).data[3]), 255);
    await go("/lab/statistics");
    const stat = page.locator(".a2-series");
    assert.match(await stat.innerText(), /理论标准差 0.112/);
    await page.getByRole("slider", { name: /每组样本量/ }).press("End");
    assert.match(await stat.innerText(), /理论标准差 0.046/);
    await button(page, "重新抽样").click();
    assert.match(await stat.innerText(), /随机种子 2028/);
    if (width === 390) await screenshot("statistics");
    await go("/lab/algorithms");
    const input = page.getByLabel("排序数据");
    await input.fill("a, b");
    await button(page, "加载数据").click();
    assert.match(await page.getByRole("alert").innerText(), /2–12/);
    await input.fill("3，-2，1");
    await button(page, "加载数据").click();
    const next = button(page, "执行下一步");
    for (let i = 0; i < 20 && await next.isEnabled(); i++) await next.click();
    assert.ok(await next.isDisabled());
    const order = page.getByRole("list", { name: "当前元素顺序" });
    assert.deepEqual(await order.locator("li").allTextContents(), ["-2", "1", "3"]);
    await button(page, "回到起点").click();
    assert.deepEqual(await order.locator("li").allTextContents(), ["3", "-2", "1"]);
    await go("/lab/systems");
    await page.getByRole("switch", { name: /分量 32/ }).click();
    assert.equal(await page.locator(".readout .big").innerText(), "32");
    await go("/resources");
    assert.equal(await page.locator("a[target=_blank]").count(), 15);
    assert.equal(await page.locator(".a2-roadmap li").count(), 6);
    console.log("PASS " + width + "px · 四个可操作实验、七个入口和公开资源");
    passed++;

    await go("/courses?view=legacy");
    assert.ok(await page.locator(".academy-course").count() > 0);
    await go("/paths/a?stage=Foundation");
    assert.equal(await page.locator("a.pm-card").count(), 22);
    await page.evaluate(value => localStorage.setItem("nico-progress", value), fixture);
    await page.reload();
    await go("/");
    const resume = page.getByRole("link", { name: "继续这一课", exact: true });
    assert.equal(await resume.getAttribute("href"), "#/lesson/a22-error-logs");
    assert.equal(await getProgress(page), fixture);
    await resume.click();
    await page.locator(".a2-lesson-link").waitFor();
    assert.equal(await page.locator(".a2-lesson-link").getAttribute("href"), "#/courses/foundation-systems?module=network");
    const stored = JSON.parse(await getProgress(page));
    assert.equal(stored.schemaVersion, 1);
    assert.deepEqual(stored.lessons, JSON.parse(fixture).lessons);
    assert.equal(stored.resume.step, 2);
    assert.deepEqual(errors, []);
    console.log("PASS " + width + "px · 原课程和目录兼容、原进度继续学习");
    passed++;
    await context.close();
  }
  console.log(passed + " 组新版流程通过。");
} finally {
  await browser.close();
}
