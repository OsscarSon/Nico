import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { chromium } from "playwright";
import lessonIds from "../src/content/academy2/advanced/available.json" with { type: "json" };

const base = process.env.BASE_URL ?? "http://localhost:4173";
const path = process.env.SCREENSHOT_DIR ?? "test-results/academy2-advanced";
mkdirSync(path, { recursive: true });
const browser = await chromium.launch();
const button = (page, name) => page.getByRole("button", { name, exact: true });
async function go(page, route, title) {
  await page.goto(base + "/#" + route);
  await page
    .getByRole("heading", { name: title, exact: true })
    .first()
    .waitFor();
}
async function fit(page) {
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
    "horizontal overflow at " + page.url(),
  );
}
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({
      viewport: { width, height: width > 500 ? 1000 : 850 },
      hasTouch: width < 500,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await go(page, "/topics/k-ec0de2c9e5b0", "数值积分");
    await page.locator(".katex").first().waitFor();
    await page.getByText("打开课程实验", { exact: true }).click();
    await button(page, "执行实验").click();
    await page.getByText("Simpson 误差", { exact: true }).waitFor();
    await fit(page);
    if (width !== 360)
      await page.screenshot({ path: `${path}/math-lesson-${width}.png` });

    await go(page, "/lab/algorithms?advanced=compiler", "从 token 到栈字节码");
    await page.getByLabel("整数表达式").fill("3+");
    await button(page, "执行实验").click();
    await page
      .getByRole("alert")
      .getByText(/缺少操作数/)
      .waitFor();
    await page.getByLabel("整数表达式").fill("x*(2+3)-4");
    await button(page, "执行实验").click();
    assert.equal(
      await page
        .getByText("解释/编译结果", { exact: true })
        .locator("..")
        .locator("dd")
        .textContent(),
      "16",
    );
    await fit(page);

    await go(page, "/lab/data?advanced=pipeline", "导入、质量检查与批次聚合");
    await button(page, "执行实验").click();
    assert.equal(
      await page
        .getByText("拒收", { exact: true })
        .locator("..")
        .locator("dd")
        .textContent(),
      "2",
    );
    await page
      .getByLabel("CSV 数据批次")
      .fill("id,group,value\na,north,2\nb,south,5\nd,north,4");
    await button(page, "执行实验").click();
    assert.equal(
      await page
        .getByText("拒收", { exact: true })
        .locator("..")
        .locator("dd")
        .textContent(),
      "0",
    );
    await fit(page);
    if (width !== 360)
      await page.screenshot({ path: `${path}/data-pipeline-${width}.png` });

    await go(page, "/lab/ml?experiment=softmax", "训练配置");
    await button(page, "训练与预测").click();
    await page
      .getByRole("heading", { name: "验证集指标", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "测试集指标", exact: true })
        .count(),
      0,
    );
    await button(page, "训练对比模型").click();
    await page.getByText("K 近邻 · 同一验证集", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "测试集指标", exact: true })
        .count(),
      0,
    );
    await button(page, "显示留出测试集").click();
    const matrix = page.getByRole("table", { name: "多类别混淆矩阵" });
    await matrix.waitFor();
    const entries = (await matrix.locator("tbody td").allTextContents()).map(
      Number,
    );
    assert.equal(entries.length, 9);
    assert.equal(
      entries.reduce((a, b) => a + b, 0),
      30,
    );
    assert.equal(await page.getByText("Macro F1", { exact: true }).count(), 3);
    await fit(page);
    await matrix.evaluate((el) => el.scrollIntoView({ block: "center" }));
    if (width !== 360)
      await page.screenshot({ path: `${path}/multiclass-final-${width}.png` });

    await go(page, "/topics/k-07387eec8e2c", "二进制：电脑只认 0 和 1");
    await fit(page);
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}px · 进阶课、编译器、Data Studio、多类别最终评估与旧课`,
    );
    await context.close();
  }
  const page = await browser.newPage({
    viewport: { width: 390, height: 850 },
    acceptDownloads: true,
  });
  const pythonAssets = process.env.PYODIDE_ASSET_DIR;
  if (pythonAssets) {
    await page
      .context()
      .route("https://cdn.jsdelivr.net/pyodide/v314.0.8/full/**", (route) => {
        const file = basename(new URL(route.request().url()).pathname);
        const path = join(pythonAssets, file);
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
      });
  }
  await go(page, "/topics/k-ec0de2c9e5b0", "数值积分");
  await page
    .getByRole("heading", { name: /Simpson 对非光滑函数的行为/ })
    .waitFor();
  const practice = page.locator("#reading-practice form");
  const mastery = button(page, "核验掌握");
  assert.ok(await mastery.isDisabled());
  await practice.nth(0).getByRole("textbox").fill("奇数");
  await button(practice.nth(0), "检查答案").click();
  await practice.nth(0).getByText(/核对你的假设和计算/).waitFor();
  for (const [index, answer] of ["偶数", "4", "8/3"].entries()) {
    const question = practice.nth(index);
    await question.getByRole("textbox").fill(answer);
    await button(question, "检查答案").click();
  }
  assert.ok(await mastery.isEnabled());
  await practice.nth(3).getByRole("textbox").fill("24");
  await mastery.click();
  await page.getByText("已掌握", { exact: true }).first().waitFor();
  await page.reload();
  await page.getByText("已掌握", { exact: true }).first().waitFor();
  console.log("PASS 390px · 由练习和独立迁移判分，刷新后保留掌握记录");
  await page.getByText("Python 判题与种子变式", { exact: true }).click();
  await button(page, "换一组核验数据").click();
  await page.locator(".study-program .cm-content")
    .fill(`def simpson_square(bounds, controls):
    a, b = bounds
    n = controls[0]
    h = (b-a)/n
    internal = sum((4 if i%2 else 2)*(a+i*h)**2 for i in range(1, n))
    return h*(a*a+b*b+internal)/3`);
  await button(page, "运行并检查代码").click();
  await page
    .getByText("已通过 6 组运行核验。", { exact: true })
    .waitFor({ timeout: 90_000 });
  console.log("PASS 390px · Pyodide 运行 Simpson 判题与种子变式");
  await go(page, "/projects/advanced-systems", "节点隔离演练");
  const election = page
    .getByRole("heading", { name: "分区与多数派选举", exact: true })
    .locator("..");
  await button(election, "执行实验").click();
  // Keyboard changes the controlled slider through an actual browser action.
  await page.getByRole("slider", { name: "候选人可达节点" }).press("Home");
  await button(election, "执行实验").click();
  for (const title of ["一条当前任期记录的复制", "两阶段提交的状态"]) {
    const section = page
      .getByRole("heading", { name: title, exact: true })
      .locator("..");
    await button(section, "执行实验").click();
  }
  await page
    .getByLabel("结果解释与局限")
    .fill(
      "固定节点总数后改变候选者可达节点。多数无法形成时，不应启动相同任期的服务。",
    );
  const download = page.waitForEvent("download");
  await button(page, "保存并下载项目报告").click();
  assert.match(readFileSync(await (await download).path(), "utf8"), /执行证据/);
  await go(page, "/lab/research?crypto=1", "密码学完整性实验");
  await button(page, "运行 Web Crypto 核验").click();
  await page.getByText("原消息核验", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByText("替代消息核验", { exact: true })
      .locator("..")
      .locator("dd")
      .textContent(),
    "拒绝",
  );
  await page.getByLabel("密码学操作").selectOption("encryption");
  await button(page, "运行 Web Crypto 核验").click();
  await page.getByText("合法密文还原", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByText("不匹配的附加数据", { exact: true })
      .locator("..")
      .locator("dd")
      .textContent(),
    "拒绝",
  );
  await fit(page);
  await page.screenshot({ path: path + "/web-crypto-390.png" });
  await go(page, "/lab/research", "研究复现记录");
  await page.getByLabel("研究名称").fill("浏览器复现记录");
  await page
    .getByLabel("研究问题和待验证主张")
    .fill("检查多数派在网络分区下的可达性。");
  await page
    .getByLabel("数据版本、环境、种子与步骤")
    .fill("五节点教学模型，分别比较可达三台与两台。");
  await page
    .getByLabel("实际输出、差异与局限")
    .fill("不足多数的分区未能选举，教学模型只描述一任投票。");
  await page.getByLabel("书目标题").fill("Raft");
  await page.getByLabel("书目 HTTPS 地址").fill("https://raft.github.io/");
  await button(page, "添加书目").click();
  const report = page.waitForEvent("download");
  await button(page, "保存并下载研究记录").click();
  assert.match(
    readFileSync(await (await report).path(), "utf8"),
    /raft.github.io/,
  );
  await fit(page);
  console.log("PASS 390px · 项目基于实际执行解锁，研究报告保存与导出");
  for (const id of lessonIds) {
    await page.goto(base + "/#/topics/" + id);
    await page.locator(".p4-topic h1").waitFor();
    await fit(page);
  }
  console.log(
    `PASS 390px · ${lessonIds.length} 个新增知识点逐一打开并检查宽度`,
  );
} finally {
  await browser.close();
}
