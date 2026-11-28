import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { chromium } from "playwright";
import topics from "../src/content/academy2/knowledge-ids.json" with { type: "json" };
import applied from "../src/content/academy2/applied/available.json" with { type: "json" };

const base = process.env.BASE_URL ?? "http://localhost:4173";
const screenshots =
  process.env.SCREENSHOT_DIR ?? "test-results/academy2-applied";
mkdirSync(screenshots, { recursive: true });
const browser = await chromium.launch();
const button = (page, name) => page.getByRole("button", { name, exact: true });
const heading = (page, name) =>
  page.getByRole("heading", { name, exact: true }).first();
async function go(page, route, title) {
  await page.goto(base + "/#" + route);
  if (title) await heading(page, title).waitFor();
  else await page.locator("main h1").first().waitFor();
}
async function fit(page) {
  const widths = await page.evaluate(() => ({
    body: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  assert.ok(
    widths.body <= widths.viewport + 1,
    JSON.stringify(widths) + " at " + page.url(),
  );
}
async function capture(page, name) {
  await page.screenshot({ path: join(screenshots, name + ".png") });
}
async function metric(page, label) {
  return (
    await page
      .getByText(label, { exact: true })
      .locator("..")
      .locator("dd")
      .textContent()
  )?.trim();
}
async function localPython(context) {
  if (!process.env.PYODIDE_ASSET_DIR) return;
  await context.route(
    "https://cdn.jsdelivr.net/pyodide/v314.0.8/full/**",
    (route) => {
      const file = basename(new URL(route.request().url()).pathname);
      const path = join(process.env.PYODIDE_ASSET_DIR, file);
      if (!existsSync(path)) return route.abort();
      const contentType = file.endsWith(".wasm")
        ? "application/wasm"
        : /\.m?js$/.test(file)
          ? "text/javascript"
          : file.endsWith(".json")
            ? "application/json"
            : "application/octet-stream";
      return route.fulfill({
        path,
        contentType,
        headers: { "access-control-allow-origin": "*" },
      });
    },
  );
}

try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({
      viewport: { width, height: width > 600 ? 1000 : 860 },
      hasTouch: width < 600,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await go(page, "/courses?phase=all", "课程目录");
    assert.equal(await page.locator("[data-course]").count(), 30);
    assert.match(
      await page.locator("[data-course='foundation-applied']").textContent(),
      /14 个知识点/,
    );
    assert.match(
      await page.locator("[data-course='intermediate-applied']").textContent(),
      /16 个知识点/,
    );
    assert.match(
      await page.locator("[data-course='advanced-applied']").textContent(),
      /20 个知识点/,
    );
    await fit(page);
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");

    const quantum = "k-74f74b2295b6";
    const quantumTitle = topics.find(([id]) => id === quantum)[3];
    await go(page, "/topics/" + quantum, quantumTitle);
    await page.locator(".katex").first().waitFor();
    await page.getByText("打开课程实验", { exact: true }).click();
    await button(page, "执行实验").click();
    assert.equal(await metric(page, "概率总和"), "1");
    await page.getByRole("slider", { name: "相位（度）" }).press("Home");
    await button(page, "执行实验").click();
    assert.equal(await metric(page, "测得 0 的概率"), "1");
    await fit(page);
    if (width !== 360) await capture(page, "quantum-" + width);

    await go(page, "/lab/ml?advanced=train-transformer", "因果注意力层训练");
    await button(page, "执行实验").click();
    const before = Number(await metric(page, "留出集基线损失")),
      after = Number(await metric(page, "留出集训练后损失"));
    assert.ok(after < before);
    await fit(page);
    if (width !== 360) await capture(page, "transformer-" + width);

    await go(page, "/settings", "设置");
    await button(page, "亮色").click();
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      "light",
    );
    const ai = page.getByRole("checkbox", { name: "显示AI快捷入口" });
    if (await ai.isChecked()) await ai.uncheck();
    await go(page, "/topics/" + quantum, quantumTitle);
    assert.equal(
      await page.getByText("AI 学习帮助", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      "light",
    );
    await fit(page);
    if (width === 390) await capture(page, "quantum-light-390");
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS " + width + "px · 30 门目录、量子课与实际训练、主题和关闭 AI",
    );
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 860 },
    acceptDownloads: true,
  });
  await localPython(context);
  const page = await context.newPage();
  const collision = "k-46fe981be8f5";
  const title = topics.find(([id]) => id === collision)[3];
  await go(page, "/topics/" + collision, title);
  await page.getByText("打开课程实验", { exact: true }).click();
  await button(page, "执行实验").click();
  assert.equal(await metric(page, "交集面积"), "2");
  await button(page, "以本次为对照").click();
  await page.getByLabel("预计变化").selectOption("down");
  await page.getByRole("slider", { name: "移动盒横坐标" }).press("Home");
  await button(page, "执行实验").click();
  await page
    .getByRole("status")
    .filter({ hasText: /预测吻合/ })
    .waitFor();
  const draft = page.waitForEvent("download");
  await button(page, "保存并下载实验报告").click();
  assert.match(readFileSync(await (await draft).path(), "utf8"), /交集面积/);

  const reasoning = page
    .locator("details")
    .filter({ has: page.getByText("结构化推理与独立变式", { exact: true }) });
  await reasoning.locator("summary").click();
  await button(reasoning, "换一组推理参数").click();
  for (const [name, value] of [
    ["横向交叠", "2"],
    ["纵向交叠", "3"],
    ["交集面积", "6"],
  ]) {
    await reasoning.getByLabel(name, { exact: true }).fill(value);
    const step = button(reasoning, "核对本步");
    if (await step.count()) await step.click();
  }
  await button(reasoning, "提交答案").click();
  await reasoning.getByText(/把第二个矩形的左边界/).waitFor();
  await page.getByText("Python 判题与种子变式", { exact: true }).click();
  await button(page, "换一组核验数据").click();
  await page
    .locator(".study-program .cm-content")
    .fill(
      "def intersection_area(a, b):\n    return max(0,min(a[0]+a[2],b[0]+b[2])-max(a[0],b[0]))*max(0,min(a[1]+a[3],b[1]+b[3])-max(a[1],b[1]))",
    );
  await button(page, "运行并检查代码").click();
  await page
    .getByText("已通过 6 组运行核验。", { exact: true })
    .waitFor({ timeout: 90_000 });

  await go(page, "/projects/advanced-applied", "定位、感知和路径规划综合研究");
  assert.ok(await button(page, "保存并下载项目报告").isDisabled());
  await fit(page);
  await capture(page, "applied-project-390");
  await go(page, "/projects/advanced-security");
  await heading(page, "在本机完成代码交付").waitFor();
  await page
    .getByText("python projects/p4/verify.py --only paper", { exact: true })
    .waitFor();

  await go(
    page,
    "/lab/research?advanced=research-permutation",
    "穷举随机分配检验",
  );
  await button(page, "执行实验").click();
  assert.equal(await metric(page, "精确双侧 p 值"), "0.1");
  const standalone = page.waitForEvent("download");
  await button(page, "保存并下载实验报告").click();
  await standalone;

  await go(page, "/study?view=backup");
  const backup = page.waitForEvent("download");
  await button(page, "导出完整备份").click();
  const file = await (await backup).path();
  const contents = JSON.parse(readFileSync(file, "utf8"));
  assert.ok(
    Object.values(contents.library.reports).some(
      (report) =>
        report.topic === collision && report.markdown.includes("交集面积"),
    ),
  );
  assert.ok(
    Object.values(contents.knowledge.questionBank[collision]).some(
      (value) => value.lastCorrect,
    ),
  );
  const fresh = await browser.newContext({
    viewport: { width: 390, height: 860 },
  });
  const restored = await fresh.newPage();
  await go(restored, "/study?view=backup");
  await restored.getByLabel("完整备份 JSON 文件").setInputFiles(file);
  await button(restored, "确认恢复完整备份").click();
  await restored
    .getByRole("status")
    .filter({ hasText: "已合并恢复" })
    .waitFor();
  await go(restored, "/study?view=saved");
  const recoveredReport = restored
    .locator("summary")
    .filter({ hasText: /两个矩形相撞吗 · 实验/ });
  await recoveredReport.waitFor();
  await recoveredReport.click();
  await recoveredReport
    .locator("..")
    .getByRole("link", { name: /相关教学/ })
    .click();
  await heading(restored, title).waitFor();
  await go(restored, "/study?view=saved");
  const recoveredLab = restored
    .locator("summary")
    .filter({ hasText: /穷举随机分配检验 · 实验/ });
  await recoveredLab.click();
  await recoveredLab
    .locator("..")
    .getByRole("link", { name: /相关教学/ })
    .click();
  await heading(restored, "穷举随机分配检验").waitFor();
  await fresh.close();
  console.log("PASS · 对照预测、报告、结构化评分、真实 Python、项目和备份恢复");

  const courses = [...new Set(topics.map(([, course]) => course))];
  for (const course of courses) {
    await go(page, "/courses/" + course);
    await fit(page);
    assert.equal(
      await page.getByText("找不到这个课程入口", { exact: true }).count(),
      0,
    );
  }
  for (const [id, , , topicTitle] of topics) {
    await go(
      page,
      "/topics/" + id,
      applied.includes(id) ? topicTitle : undefined,
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(resolve),
          ),
        ),
    );
    await fit(page);
    assert.equal(
      await page.getByText("这个知识点尚未开课", { exact: true }).count(),
      0,
      id,
    );
  }
  console.log(
    "PASS 390px · " +
      courses.length +
      " 门课程和 " +
      topics.length +
      " 个知识点路径逐一打开",
  );
  await context.close();
} finally {
  await browser.close();
}
