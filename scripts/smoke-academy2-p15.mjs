import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = process.env.SCREENSHOT_DIR ?? "test-results/academy2-p15";
mkdirSync(out, { recursive: true });
const phaseSamples = [
  { name: "p1a", id: "fm-equations", title: "区间、绝对值与方程分类" },
  { name: "p1b", id: "fs-bayes", title: "贝叶斯更新：先验、似然、后验" },
  { name: "p1c", id: "im-svd", title: "完整手算 SVD，以及与 PCA 的连接" },
  { name: "p1d", id: "is-ttest", title: "单样本、独立双样本、Welch 与配对 t" },
];
const catalogue = JSON.parse(
  readFileSync(
    new URL("../src/content/academy2/knowledge-ids.json", import.meta.url),
    "utf8",
  ),
);
const p1Ids = catalogue
  .map(([id]) => id)
  .filter((id) => /^(fm|fs|im|is)-/.test(id));
assert.equal(p1Ids.length, 82);
const browser = await chromium.launch();
async function go(page, path) {
  await page.goto(base + "/#" + path);
  await page.locator("main h1").waitFor();
}
async function fit(page) {
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
    page.url(),
  );
}
const legacy = JSON.stringify({
  schemaVersion: 1,
  lessons: {
    "a01-binary": {
      completedAt: "2026-11-26T00:00:00Z",
      firstTryCorrect: 3,
      quizTotal: 4,
    },
  },
  resume: null,
  activeDays: ["2026-11-26"],
});
const original = {
  version: 1,
  records: {
    "fm-equations": {
      startedAt: 100,
      practice: [null, null, null],
      verification: null,
    },
  },
  selfChecks: { "fm-numbers": true },
};

try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({
      viewport: { width, height: width > 800 ? 1000 : 844 },
      hasTouch: width < 800,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(18000);
    const errors = [],
      homeRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const collect = (request) => homeRequests.push(request.url());
    page.on("request", collect);
    await go(page, "/");
    await page.waitForLoadState("networkidle");
    page.off("request", collect);
    assert.ok(
      !homeRequests.some((url) =>
        /katexRenderer|P1Teaching|TeachingPython|pyodide/i.test(url),
      ),
      "首页下载了教学专属资源",
    );
    await page.evaluate(
      ({ legacy, original }) => {
        localStorage.setItem("nico-progress", legacy);
        localStorage.setItem(
          "nico-knowledge-progress",
          JSON.stringify(original),
        );
      },
      { legacy, original },
    );
    await page.reload();
    for (const spec of phaseSamples) {
      await go(page, "/topics/" + spec.id);
      await page
        .getByRole("heading", { name: spec.title, exact: true })
        .waitFor();
      const panel = page.locator(".teaching-engine").first();
      await panel
        .locator(".katex-mathml math")
        .first()
        .waitFor({ state: "attached" });
      assert.equal(await page.locator("[data-math-fallback]").count(), 0);
      const example = panel
        .locator("details")
        .filter({ has: page.getByText("展开逐步解答", { exact: true }) })
        .first();
      assert.equal(await example.evaluate((node) => node.open), false);
      await example.locator("summary").first().press("Enter");
      assert.equal(await example.evaluate((node) => node.open), true);
      assert.ok((await example.locator(".teaching-steps li").count()) > 1);
      if (spec.name === "p1c") {
        const formula = panel
          .locator(".teaching-formula .teaching-math-scroll")
          .first();
        const size = await formula.evaluate((node) => [
          node.clientWidth,
          node.scrollWidth,
        ]);
        if (width < 500) {
          assert.ok(size[1] > size[0], "超长 SVD 公式应在手机容器内部滚动");
          await formula.focus();
          await formula.press("End");
          assert.equal(
            await formula.evaluate((node) => node === document.activeElement),
            true,
          );
          await formula.evaluate((node) => {
            node.scrollLeft = node.scrollWidth;
          });
          assert.ok((await formula.evaluate((node) => node.scrollLeft)) > 0);
          await formula.evaluate((node) => {
            node.scrollLeft = 0;
          });
        }
        await panel.getByText("为什么截断误差无法比下一奇异值更小？").click();
        await panel
          .getByRole("heading", { name: "最优谱范数误差的下界" })
          .waitFor();
      }
      if (spec.name === "p1b") {
        await panel.getByText("打开交互式概率树", { exact: true }).click();
        const slider = panel.getByRole("slider", { name: /^良品报警率/ });
        await slider.press("Home");
        await panel.getByText(/不良率为 100%/).waitFor();
        await panel.getByRole("slider", { name: /不良品报警率/ }).press("Home");
        await panel.getByText(/后验未定义/).waitFor();
        await slider.press("ArrowRight");
        await panel.getByText(/不良率为 0%/).waitFor();
      }
      await fit(page);
      if (width !== 360) {
        await panel
          .getByRole("heading", { name: spec.title, exact: true })
          .evaluate((node) => node.scrollIntoView({ block: "start" }));
        await page.screenshot({
          path: out + "/" + spec.name + "-" + width + ".png",
        });
      }
      console.log(
        "PASS " +
          width +
          "px " +
          spec.name +
          " · KaTeX、分步解答、局部滚动与页面宽度",
      );
    }

    await go(page, "/topics/fm-equations");
    const bank = page.locator(".teaching-bank");
    await bank.locator("summary").press("Enter");
    const vector = bank.getByRole("textbox", { name: /向量答案/ });
    const vectorForm = vector.locator("xpath=ancestor::form");
    await vector.fill("5,1");
    await vectorForm.getByRole("button", { name: "提交答案" }).click();
    assert.match(await vectorForm.getByRole("status").innerText(), /不等式/);
    await vector.fill("（1/1，5）");
    await vectorForm.getByRole("button", { name: "提交答案" }).click();
    await vectorForm.getByText("已答对", { exact: false }).first().waitFor();
    await bank.getByRole("radio", { name: /14/ }).first().check();
    await bank.getByRole("button", { name: "提交答案" }).last().click();
    await page.reload();
    await bank.locator("summary").press("Enter");
    await vectorForm.getByText("已答对", { exact: false }).first().waitFor();
    const progress = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("nico-knowledge-progress")),
    );
    assert.equal(progress.questionBank["fm-equations"].endpoints.passed, true);
    assert.equal(progress.questionBank["fm-equations"].endpoints.count, 2);
    assert.deepEqual(
      progress.records["fm-equations"],
      original.records["fm-equations"],
    );
    assert.deepEqual(progress.selfChecks, original.selfChecks);

    await go(page, "/topics/fs-population");
    await bank.locator("summary").click();
    await bank.getByRole("checkbox", { name: /每个年级各抽/ }).check();
    await bank.getByRole("checkbox", { name: /对所有年级学生普查/ }).check();
    await bank.getByRole("button", { name: "提交答案" }).click();
    await bank.getByText("已答对", { exact: false }).first().waitFor();

    await go(page, "/topics/fm-proof");
    await bank.locator("summary").click();
    await bank
      .getByRole("textbox", { name: "写下你的论证" })
      .fill("有理数可写为整数之比，平方后仍是。");
    await bank.getByRole("button", { name: "按检查点自行复核" }).click();
    await bank.getByText("开放题由你或教师复核。", { exact: false }).waitFor();
    assert.ok(
      !(await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("nico-knowledge-progress"))
            .questionBank["fm-proof"],
      )),
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("nico-progress")),
      legacy,
    );
    await fit(page);
    assert.deepEqual(errors, []);
    console.log(
      "PASS " + width + "px · 向量、单选、多选、开放题及兼容的持久记录",
    );
    await context.close();
  }

  const sweep = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  for (const id of p1Ids) {
    await go(sweep, "/topics/" + id);
    await sweep
      .locator(".teaching-engine .katex")
      .first()
      .waitFor({ state: "attached" });
    assert.equal(await sweep.locator("[data-math-fallback]").count(), 0, id);
    await fit(sweep);
  }
  await sweep.close();
  console.log("PASS 390px · 82 个强化课时逐页打开并验证公式与宽度");

  // Always exercise an honest offline failure; optional verified package files exercise the genuine Worker.
  const runtimePattern = "https://cdn.jsdelivr.net/pyodide/v314.0.8/full/**";
  const offline = await browser.newContext();
  await offline.route(runtimePattern, (route) => route.abort());
  const offlinePage = await offline.newPage();
  await go(offlinePage, "/topics/fm-trig");
  await offlinePage
    .getByText("编辑并在浏览器运行 Python", { exact: true })
    .click();
  await offlinePage
    .getByRole("button", { name: "运行 Python", exact: true })
    .click();
  await offlinePage
    .locator(".teaching-python pre[role=status]", {
      hasText: "Python 加载失败",
    })
    .waitFor();
  await offline.close();
  console.log("PASS Pyodide · 离线加载失败有真实反馈");

  if (process.env.VERIFY_PYTHON === "1") {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const assets = process.env.PYODIDE_ASSET_DIR;
    if (assets) {
      const official = {
        "pyodide.mjs": "text/javascript",
        "pyodide.asm.mjs": "text/javascript",
        "pyodide.asm.wasm": "application/wasm",
        "pyodide-lock.json": "application/json",
        "python_stdlib.zip": "application/zip",
      };
      await context.route(runtimePattern, async (route) => {
        const file = basename(new URL(route.request().url()).pathname);
        if (!Object.hasOwn(official, file)) return route.abort();
        await route.fulfill({
          body: readFileSync(join(assets, file)),
          contentType: official[file],
          headers: { "access-control-allow-origin": "*" },
        });
      });
    }
    const code = await context.newPage();
    await go(code, "/topics/fm-trig");
    await code.getByText("编辑并在浏览器运行 Python", { exact: true }).click();
    await code
      .locator(".teaching-python .code-editor[data-engine=cm]")
      .waitFor();
    await code
      .getByRole("button", { name: "运行 Python", exact: true })
      .click();
    const output = code.locator(".teaching-python pre[role=status]");
    await output.waitFor({ timeout: 100000 });
    assert.equal((await output.innerText()).trim(), "True");
    console.log("PASS Pyodide · 浏览器实际运行正弦公式核对");
    await context.close();
  }
} finally {
  await browser.close();
}
