import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { chromium } from "playwright";
const base = process.env.BASE_URL ?? "http://localhost:4173";
const screen = process.env.SCREENSHOT_DIR ?? "test-results/academy2-completion";
mkdirSync(screen, { recursive: true });
const browser = await chromium.launch();
const button = (node, name) => node.getByRole("button", { name, exact: true });
const go = async (page, path) => {
  await page.goto(base + "/#" + path);
  await page.locator("main h1").waitFor();
};
const fit = async (page) =>
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
    true,
    page.url(),
  );
const opening = (page, title) => page.locator("summary").filter({ hasText: title }).first().click();
const shot = async (page, name, width) => {
  if (width === 1440 || width === 390)
    await page.screenshot({ path: screen + "/" + name + "-" + width + ".png" });
};
const run = (page) => button(page, "运行实验").click();
const independent = (form) =>
  form
    .locator("p")
    .first()
    .innerText()
    .then((text) => {
      const match = /3x \+ (\d+) = (\d+)/.exec(text);
      assert.ok(match, text);
      return String((Number(match[2]) - Number(match[1])) / 3);
    });
try {
  for (const width of [1440, 390, 360]) {
    const ctx = await browser.newContext({
      viewport: { width, height: width === 1440 ? 980 : 844 },
      hasTouch: width < 600,
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(18000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await go(page, "/");
    const downloads = await page.evaluate(() =>
      globalThis.performance.getEntriesByType("resource").map((item) => item.name),
    );
    assert.equal(
      downloads.some((path) =>
        /P1Teaching|ExperimentPanel|StudyPage|katexRenderer|pyodide|CodeComparison/.test(path),
      ),
      false,
    );
    await page.evaluate(() => localStorage.setItem("nico-academy2-path", "data-science"));
    await go(page, "/topics/fm-equations");
    await button(page, "收藏知识点").click();
    await opening(page, /个人笔记/);
    await page.getByLabel("此知识点的笔记").fill("移动端笔记：除以负数必须反向。");
    await button(page, "保存笔记").click();
    await button(page, "专注模式").click();
    await page.locator(".study-focus").waitFor();
    assert.equal(await page.locator(".bottomnav").isVisible(), false);
    await button(page, "退出专注模式").click();
    await page.locator(".p1-page .teaching-formula").first().waitFor();
    await button(page, "收藏公式").first().click();
    await button(page, "收藏例题").first().click();
    await button(page, "复制 LaTeX").first().click();
    await page
      .getByText(/已复制 LaTeX|可从下面选取原文/)
      .first()
      .waitFor();
    for (const [label, value] of [
      ["基础题", "-2"],
      ["应用题", "-2"],
      ["挑战题", "6"],
    ]) {
      await page.getByLabel(label + "答案", { exact: true }).fill(value);
      await button(page, "检查" + label).click();
    }
    await opening(page, /参数变式与独立核验/);
    const variants = page
      .locator("details")
      .filter({ has: page.getByText("参数变式与独立核验", { exact: true }) });
    const prior = variants.locator("form").first();
    const original = await prior.locator("p").first().innerText();
    await button(variants, "换一组参数").click();
    assert.notEqual(await prior.locator("p").first().innerText(), original);
    const first = await independent(prior);
    await prior.getByRole("textbox").fill(first);
    await button(prior, "提交答案").click();
    const verify = variants.locator("form").nth(1);
    await verify.waitFor();
    await verify.getByRole("textbox").fill(first);
    await button(verify, "提交答案").click();
    assert.match(await page.locator(".p1-page > .row .p1-state").innerText(), /需要复习/);
    await verify.getByRole("textbox").fill(await independent(verify));
    await button(verify, "提交答案").click();
    assert.match(await page.locator(".p1-page > .row .p1-state").innerText(), /已掌握/);
    await opening(page, /本节目录/);
    await button(page, "练习与评估").click();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("nico-study-library")).visits["fm-equations"].anchor ===
        "reading-practice",
    );
    await fit(page);

    await go(page, "/lab/math?experiment=elimination&from=im-systems");
    await page.getByLabel("增广矩阵（行用分号）").fill("1,2;1,5,7");
    await run(page);
    assert.match(await page.getByRole("alert").innerText(), /等宽|相同/);
    await page.getByLabel("增广矩阵（行用分号）").fill("0,2,4;1,1,3");
    await run(page);
    assert.match(await page.locator(".study-result dl").innerText(), /唯一解/);
    while (await button(page, "下一步").isEnabled()) await button(page, "下一步").click();
    assert.deepEqual(
      await page.getByRole("table", { name: "当前矩阵" }).locator("td").allTextContents(),
      ["1", "0", "1", "0", "1", "2"],
    );
    await button(page, "保存实验报告").click();
    await page.getByText("报告已保存到我的学习资料。").waitFor();
    await page.locator(".study-experiment h2").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await shot(page, "math-elimination", width);
    await fit(page);
    await go(page, "/lab/statistics?experiment=testing&from=is-ttest");
    await run(page);
    assert.match(await page.locator(".study-result dl").innerText(), /0\.178462/);
    await page.getByLabel("设计").selectOption("配对");
    await run(page);
    assert.match(await page.locator(".study-result dl").innerText(), /自由度/);
    await shot(page, "statistics-testing", width);
    await fit(page);

    await go(page, "/study");
    await page.getByRole("searchbox").fill("Gram–Schmidt");
    await page.getByRole("link", { name: "正交投影", exact: true }).first().waitFor();
    await page.getByRole("link", { name: "公式手册", exact: true }).click();
    await page.getByRole("heading", { name: "Formula Handbook" }).waitFor();
    await page.getByRole("searchbox").fill("正交投影");
    await page.locator(".study-search .katex").first().waitFor();
    await shot(page, "formula-library", width);
    await fit(page);
    await go(page, "/settings");
    await button(page, "亮色").click();
    await page.getByRole("link", { name: /打开完整备份/ }).click();
    const downloading = page.waitForEvent("download");
    await button(page, "导出完整备份").click();
    const file = await downloading,
      source = await file.path();
    const parsed = JSON.parse(readFileSync(source, "utf8"));
    assert.equal(parsed.professionalPath, "data-science");
    assert.equal(parsed.preferences.theme, "light");
    assert.match(parsed.library.notes["fm-equations"].body, /不等式|负数/);
    assert.equal(parsed.knowledge.records["fm-equations"].verification.lastCorrect, true);
    assert.equal(Object.values(parsed.library.bookmarks).filter((x) => x.active).length, 3);
    assert.equal(Object.values(parsed.library.reports).length, 1);
    const newDevice = await browser.newContext({ viewport: { width, height: 844 } });
    const restored = await newDevice.newPage();
    await go(restored, "/study?view=backup");
    await restored.getByLabel("完整备份 JSON 文件").setInputFiles(source);
    await button(restored, "确认恢复完整备份").click();
    await restored.getByRole("status").filter({ hasText: "已合并恢复" }).waitFor();
    await go(restored, "/study?view=saved");
    await restored.getByText(/移动端笔记/).waitFor();
    await restored.locator("summary").filter({hasText:/Gaussian 消元/}).waitFor();
    const contents = await restored.evaluate(() => ({
      path: localStorage.getItem("nico-academy2-path"),
      know: JSON.parse(localStorage.getItem("nico-knowledge-progress")),
    }));
    assert.equal(await restored.locator("html").getAttribute("data-theme"), "light");
    assert.equal(contents.path, "data-science");
    assert.equal(contents.know.records["fm-equations"].verification.lastCorrect, true);
    await fit(restored);
    assert.deepEqual(errors, []);
    await newDevice.close();
    await ctx.close();
    console.log("PASS " + width + "px · 学习、独立核验、专题实验、搜索和跨设备恢复");
  }
  const topics = {
    math: "functions unit-circle projection matrix-map elimination eigen svd limit tangent integral taylor gradient hessian discrete",
    statistics:
      "descriptive boxplot correlation pmf pdf clt confidence testing rejection power residuals anova rank ab chi-square",
  };
  const sweep = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const [domain, names] of Object.entries(topics))
    for (const name of names.split(" ")) {
      await go(sweep, "/lab/" + domain + "?experiment=" + name);
      await run(sweep);
      await sweep.locator(".study-result dl").waitFor();
      await fit(sweep);
    }
  await sweep.close();
  console.log("PASS 390px · 29 个专题实验实际计算");

  const assets = process.env.PYODIDE_ASSET_DIR;
  if (assets) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const contentTypes = {
      "pyodide.mjs": "text/javascript",
      "pyodide.asm.mjs": "text/javascript",
      "pyodide.asm.wasm": "application/wasm",
      "pyodide-lock.json": "application/json",
      "python_stdlib.zip": "application/zip",
    };
    await ctx.route("https://cdn.jsdelivr.net/pyodide/v314.0.8/full/**", (route) => {
      const file = basename(new URL(route.request().url()).pathname);
      return Object.hasOwn(contentTypes, file)
        ? route.fulfill({
            body: readFileSync(join(assets, file)),
            contentType: contentTypes[file],
            headers: { "access-control-allow-origin": "*" },
          })
        : route.abort();
    });
    const py = await ctx.newPage();
    await go(py, "/topics/fs-mean");
    await opening(py, /进阶题库/);
    const program = py.locator(".study-program");
    await program.locator(".cm-content").fill("def mean(values):\n    return sum(values) / len(values)");
    await button(program, "运行并检查代码").click();
    await program.getByText("已通过 3 组运行核验。", { exact: true }).waitFor({ timeout: 100000 });
    await opening(py, /双栏运行对照/);
    const compare = py.locator("details").filter({ has: py.getByText(/双栏运行对照/) });
    await compare.locator(".teaching-python").nth(1).waitFor();
    for (const runner of await compare.locator(".teaching-python").all()) {
      await button(runner, "运行 Python").click();
      await runner
        .locator("pre[role=status]")
        .filter({ hasText: /^4(?:\.0)?$/ })
        .waitFor();
    }
    await compare.getByText(/两次真实运行结果一致/).waitFor();
    await ctx.close();
    console.log("PASS Pyodide · 编程题三组输入与双栏真实运行");
  }
  if (process.env.AI_BASE_URL) {
    const page = await browser.newPage();
    let request;
    await page.route("**/api/p15-test", async (route) => {
      request = route.request().postDataJSON();
      await route.fulfill({
        json: { ok: true, kind: "tutor", model: "本地测试替身", text: "先检查正交性，再比较误差。" },
      });
    });
    await page.goto(process.env.AI_BASE_URL + "/#/lab/math?experiment=svd&from=im-svd");
    await opening(page, /课内 AI 导师/);
    await page.getByLabel("帮助方式").selectOption("答题提示");
    await page.getByLabel("补充问题").fill("如何开始？");
    await button(page, "向 AI 导师提问").click();
    await page.getByText("先检查正交性，再比较误差。", { exact: true }).waitFor();
    assert.equal(request.kind, "tutor");
    assert.match(request.context, /实验目标：SVD/);
    assert.match(request.context, /练习题面/);
    assert.match(request.context, /例题条件/);
    assert.doesNotMatch(request.context, /完整分解为|个人笔记/);
    assert.match(request.question, /只给第一步/);
    console.log("PASS AI · 配置模式使用本地测试替身核验请求和标识");
    await page.close();
  }
} finally {
  await browser.close();
}
