import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { serveCachedPython } from "./smoke-python-assets.mjs";

const site = process.env.BASE_URL ?? "http://localhost:4173";
const output = process.env.SCREENSHOT_DIR ?? "test-results/academy2-final-qa";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const button = (item, name) => item.getByRole("button", { name, exact: true });
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
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({
      viewport: { width, height: width > 500 ? 980 : 850 },
      hasTouch: width < 500,
    });
    if (width === 390) await serveCachedPython(context);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(site + "/#/topics/k-c47d7505d81e");
    await page
      .getByRole("heading", { name: "实验功效", exact: true, level: 1 })
      .waitFor();
    await page
      .getByRole("heading", {
        name: "用众数附近的概率计算极端上尾",
        exact: true,
      })
      .waitFor();
    if (width === 1440)
      await page
        .getByRole("heading", {
          name: "用众数附近的概率计算极端上尾",
          exact: true,
        })
        .scrollIntoViewIfNeeded();
    if (width === 1440)
      await page.screenshot({ path: join(output, "stable-binomial-1440.png") });
    const panel = page
      .locator("details")
      .filter({ has: page.getByText("结构化推理与独立变式", { exact: true }) });
    await panel.locator("summary").click();
    await panel.getByLabel("X≥3 在零假设的概率", { exact: true }).fill("1/16");
    await button(panel, "核对本步").click();
    await panel.getByRole("status").filter({ hasText: "(4+1)/16" }).waitFor();
    for (const [label, answer] of [
      ["X≥3 在零假设的概率", "5/16"],
      ["允许的最小 k", "4"],
      ["实际第一类错误", "1/16"],
      ["功效", "81/256"],
    ]) {
      const field = panel.getByLabel(label, { exact: true });
      await field.fill(answer);
      const step = button(panel, "核对本步");
      if (await step.count()) await step.click();
    }
    await button(panel, "提交答案").click();
    await panel
      .getByRole("status")
      .filter({ hasText: /实际第一类错误可以小于/ })
      .waitFor();
    await fit(page);
    if (width === 390)
      await page.screenshot({ path: join(output, "power-structured-390.png") });
    if (width === 390) {
      await page.getByText("Python 判题与种子变式", { exact: true }).click();
      await button(page, "换一组核验数据").click();
      await page
        .locator(".study-program .cm-content")
        .fill(
          "from math import comb\ndef fair_right_tail(counts):\n    n,k=counts\n    return sum(comb(n,i) for i in range(k,n+1))/2**n",
        );
      await button(page, "运行并检查代码").click();
      await page
        .getByText("已通过 6 组运行核验。", { exact: true })
        .waitFor({ timeout: 90_000 });
      await page.reload();
      await page.getByText("结构化推理与独立变式", { exact: true }).click();
      await page
        .getByText(/已答对/)
        .first()
        .waitFor();
    }
    await page.goto(site + "/#/lab/research?advanced=research-permutation");
    await page
      .getByRole("heading", { name: "穷举随机分配检验", exact: true })
      .waitFor();
    await page
      .getByLabel("输入读数，前 n 个属于 A")
      .fill("1e-12 2e-12 9e-12 10e-12");
    await page.getByRole("slider", { name: "A 组人数" }).press("Home");
    await button(page, "执行实验").click();
    assert.equal(
      await page
        .getByText("精确双侧 p 值", { exact: true })
        .locator("..")
        .locator("dd")
        .textContent(),
      "0.3333333",
    );
    await fit(page);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS " + width + "px · 极端二项推导、逐步判分及单位不变的随机化检验",
    );
  }
} finally {
  await browser.close();
}
