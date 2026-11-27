import assert from "node:assert/strict";
import { mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { Buffer } from "node:buffer";
import { basename, join } from "node:path";
import { chromium } from "playwright";
import ids from "../src/content/academy2/knowledge-ids.json" with { type: "json" };

const base = process.env.BASE_URL ?? "http://localhost:4173";
const shots = process.env.SCREENSHOT_DIR ?? "test-results/academy2-data-ml";
const browser = await chromium.launch();
const button = (node, name) => node.getByRole("button", { name, exact: true });
const headings = (node, name) =>
  node.getByRole("heading", { name, exact: true });
const details = (node, name) =>
  node.locator("summary").filter({ hasText: name }).first();
const route = async (page, path) => {
  await page.goto(base + "/#" + path);
  await page.locator("main h1").waitFor();
};
const fit = async (page) => {
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    vw: document.documentElement.clientWidth,
    overflow: [...document.querySelectorAll("main > .a2-page > *")]
      .filter(
        (e) =>
          e.getBoundingClientRect().right >
          document.documentElement.clientWidth + 1,
      )
      .map((e) => e.className),
  }));
  assert.ok(
    sizes.scroll <= sizes.vw + 1,
    JSON.stringify(sizes) + " " + page.url(),
  );
};
const capture = async (page, name, width) => {
  if (width === 360) return;
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: join(shots, name + "-" + width + ".png") });
};
const focusShot = async (page, selector, name, width) => {
  const locator = page.locator(selector).first();
  await locator.waitFor();
  await locator.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await capture(page, name, width);
};
const analysis =
  "先核查实际观测范围和有效样本。图表由可复现工作区产生，指标只描述当前分割，额外采样和独立验证仍有必要。";
function mime(file) {
  if (file.endsWith(".wasm")) return "application/wasm";
  if (file.endsWith(".mjs") || file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}
async function localPython(context) {
  const assets = process.env.PYODIDE_ASSET_DIR;
  if (!assets) return;
  await context.route(
    "https://cdn.jsdelivr.net/pyodide/v314.0.8/full/**",
    (route) => {
      const asset = basename(new URL(route.request().url()).pathname),
        path = join(assets, asset);
      if (!existsSync(path) || !statSync(path).isFile()) return route.abort();
      return route.fulfill({
        path,
        contentType: mime(asset),
        headers: { "access-control-allow-origin": "*" },
      });
    },
  );
}
async function runSQL(page, code, cell = 0) {
  const node = page.locator(".p3-notebook-cell").nth(cell);
  await node.getByRole("textbox").fill(code);
  await button(node, "执行 SQL").click();
  return node;
}
async function saveProject(page) {
  const save = button(page, "保存并下载项目报告");
  await page.getByLabel("研究说明与局限").fill(analysis);
  const pending = page.waitForEvent("download");
  await save.click();
  const output = readFileSync(await (await pending).path(), "utf8");
  assert.match(output, /分析与限制/);
  await page.getByText("已提交可核验的项目证据", { exact: true }).waitFor();
}

try {
  for (const width of [1440, 390, 360]) {
    const ctx = await browser.newContext({
      viewport: { width, height: width > 600 ? 1000 : 850 },
      hasTouch: width < 600,
      acceptDownloads: true,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await route(page, "/courses?phase=all");
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.locator('[data-course="foundation-data-science"]').click();
    await headings(page, "数据素养与分析").waitFor();
    await page.getByRole("link", { name: /开始学习/ }).click();
    await page.locator(".p3-lesson h1").waitFor();
    await route(page, "/topics/k-988b00ef49ec");
    await headings(page, "CSV").waitFor();
    await fit(page);
    await capture(page, "foundation-data-lesson", width);
    for (const [i, [question, value]] of [
      ["概念核查", "否"],
      ["动手计算", "检查"],
      ["分析", "否"],
      ["迁移核验", "2"],
    ].entries()) {
      const form = page.locator("#reading-practice > form").nth(i);
      await form.getByLabel(question + "答案").fill(value);
      await form.getByRole("button").click();
      await form.locator(".feedback.ok").waitFor();
    }
    await page.getByText("已掌握", { exact: true }).waitFor();
    await button(page, "收藏知识点").click();
    await route(page, "/topics/k-092fc4770111");
    await page.locator(".p3-lesson .katex").first().waitFor();
    await fit(page);
    await capture(page, "intermediate-ai-lesson", width);
    await route(page, "/topics/k-80f569c6910d");
    await page.getByRole("link", { name: /打开原版互动课/ }).waitFor();
    await capture(page, "foundation-ai-lesson", width);
    await route(page, "/topics/k-2ba5eb019fed");
    await headings(page, "窗口函数").waitFor();
    await capture(page, "intermediate-data-lesson", width);
    await route(page, "/lab/data?experiment=missing");
    await button(page, "使用 Air Quality").waitFor();
    await details(page, "缺失值和描述统计").click();
    const missing = page.getByRole("table", { name: "列统计摘要" });
    assert.match(
      await missing.getByRole("row").nth(1).textContent(),
      /ozone.*37/,
    );
    await page.getByLabel("操作列").selectOption("ozone");
    await page.getByLabel("清洗操作").selectOption("median");
    await button(page, "应用清洗").click();
    assert.match(
      await page
        .getByRole("table", { name: "数据预览" })
        .locator("caption")
        .textContent(),
      /153 行/,
    );
    await button(page, "撤销上一步").click();
    await page.getByLabel("图表类型").selectOption("heatmap");
    await page.getByRole("img", { name: "Pearson 相关矩阵" }).waitFor();
    await focusShot(
      page,
      width < 600 ? ".p3-grid .p3-card:nth-child(2)" : ".p3-grid",
      "data-studio",
      width,
    );
    await fit(page);
    if (width < 600) {
      const region = page.getByRole("region", {
        name: "列统计摘要，可横向滚动",
      });
      await region.focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() => document.activeElement?.scrollLeft > 0);
    }
    const cell = await runSQL(page, "SELECT no_such_column FROM dataset");
    await page
      .getByRole("alert")
      .filter({ hasText: /no such column/ })
      .first()
      .waitFor();
    await runSQL(
      page,
      "SELECT COUNT(*) AS days, COUNT(ozone) AS observed FROM dataset",
    );
    const sql = cell.getByRole("table", { name: "SQL 结果 1" });
    await sql.locator("tbody td").last().waitFor();
    assert.deepEqual(await sql.locator("tbody td").allTextContents(), [
      "153",
      "116",
    ]);
    const dbEvent = page.waitForEvent("download");
    await button(cell, "导出 SQLite 数据库").click();
    assert.equal(
      readFileSync(await (await dbEvent).path())
        .subarray(0, 15)
        .toString(),
      "SQLite format 3",
    );
    await details(page, "比较全表扫描与索引").click();
    await button(page, "测量查询性能").click();
    await page.getByText(/USING COVERING INDEX/).waitFor();
    if (width === 390) {
      await details(page, "导入 CSV 或 JSON").click();
      await page.getByLabel("选择数据文件").setInputFiles({
        name: "sample.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("id,value\n001,4\n002,\n"),
      });
      await page
        .getByRole("table", { name: "数据预览" })
        .getByText("001", { exact: true })
        .waitFor();
      await page.getByLabel("选择数据文件").setInputFiles({
        name: "sample.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          '[{"id":"009","value":8},{"id":"010","value":null}]',
        ),
      });
      await page
        .getByRole("table", { name: "数据预览" })
        .getByText("009", { exact: true })
        .waitFor();
      await details(page, "保存和恢复工作区").click();
      await page.getByLabel("工作区名称").fill("跨设备数据示例");
      await button(page, "保存工作区").click();
      await page
        .getByText("工作区已保存到统一学习备份。", { exact: true })
        .waitFor();
    }
    await route(page, "/lab/ml");
    await page.getByLabel(/自定义预测/).fill("5,1.7");
    await button(page, "训练与预测").click();
    await headings(page, "验证集指标").waitFor();
    await page.getByText(/自定义输入预测/).waitFor();
    await button(page, "训练对比模型").click();
    await headings(page, "CART 决策树 · 同一验证集").waitFor();
    await button(page, "显示留出测试集").click();
    await page.getByRole("table", { name: "混淆矩阵" }).waitFor();
    const counts = await page
      .getByRole("table", { name: "混淆矩阵" })
      .locator("td")
      .allTextContents();
    assert.equal(
      counts.map(Number).reduce((a, b) => a + b, 0),
      30,
    );
    await page.getByRole("img", { name: "模型决策边界与测试观测" }).waitFor();
    await focusShot(
      page,
      width < 600 ? ".p3-ml-grid .p3-card:nth-child(2)" : ".p3-ml-grid",
      "ml-playground",
      width,
    );
    await fit(page);
    if (width === 390) {
      await details(page, "保存和恢复工作区").click();
      await page.getByLabel("工作区名称").fill("跨设备 Iris 配置");
      await button(page, "保存工作区").click();
      await page
        .getByText("工作区已保存到统一学习备份。", { exact: true })
        .waitFor();
      await route(page, "/study?view=backup");
      const exported = page.waitForEvent("download");
      await button(page, "导出完整备份").click();
      const bytes = readFileSync(await (await exported).path()),
        file = JSON.parse(bytes.toString());
      assert.equal(
        file.knowledge.records["k-988b00ef49ec"].verification.lastCorrect,
        true,
      );
      assert.equal(Object.values(file.library.workspaces).length, 2);
      const restored = await browser.newContext({
        viewport: { width, height: 850 },
      });
      const device = await restored.newPage();
      await route(device, "/study?view=backup");
      await device.getByLabel("完整备份 JSON 文件").setInputFiles({
        name: "p3.json",
        mimeType: "application/json",
        buffer: bytes,
      });
      await button(device, "确认恢复完整备份").click();
      await device.getByText(/已合并恢复/).waitFor();
      await route(device, "/lab/data");
      await details(device, "保存和恢复工作区").click();
      const saved = device.getByLabel("已保存版本");
      await saved.selectOption({ index: 1 });
      await button(device, "恢复工作区").click();
      await device
        .getByRole("table", { name: "数据预览" })
        .getByText("009", { exact: true })
        .waitFor();
      await route(device, "/lab/ml");
      await details(device, "保存和恢复工作区").click();
      await device.getByLabel("已保存版本").selectOption({ index: 1 });
      await button(device, "恢复工作区").click();
      await button(device, "训练与预测").click();
      await headings(device, "验证集指标").waitFor();
      await restored.close();
    }
    assert.deepEqual(errors, []);
    await ctx.close();
    console.log(
      "PASS " +
        width +
        "px · 四门课入口、掌握判分、SQL、数据图、真实模型预测与留出评估",
    );
  }

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 850 },
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  const courses = new Set([
    "foundation-data-science",
    "intermediate-data-science",
    "foundation-ai",
    "intermediate-ai",
  ]);
  for (const [id, , , title] of ids.filter((row) => courses.has(row[1]))) {
    await route(page, "/topics/" + id);
    await headings(page, title).waitFor();
    await page.locator(".p3-lesson #reading-theory").waitFor();
    await fit(page);
  }
  console.log("PASS 390px · 87 个知识点逐页打开并检查布局");
  await route(page, "/projects/foundation-data-science");
  assert.equal(await button(page, "保存并下载项目报告").isDisabled(), true);
  await page.getByLabel("操作列").selectOption("ozone");
  await page.getByLabel("清洗操作").selectOption("median");
  await button(page, "应用清洗").click();
  await button(page, "记录本次图表").click();
  await page.getByLabel("图表类型").selectOption("histogram");
  await button(page, "记录本次图表").click();
  await details(page, "分组和透视汇总").click();
  await button(page, "生成透视汇总").click();
  await saveProject(page);
  await route(page, "/projects/intermediate-data-science");
  await button(page, "执行 SQL").click();
  await page.getByRole("table", { name: "SQL 结果 1" }).waitFor();
  await saveProject(page);
  await route(page, "/projects/foundation-ai");
  await button(page, "训练与预测").click();
  await headings(page, "验证集指标").waitFor();
  await button(page, "验证资料助手").click();
  await headings(page, "固定任务通过 4/4").waitFor();
  await saveProject(page);
  await route(page, "/projects/intermediate-ai");
  await button(page, "训练与预测").click();
  await headings(page, "验证集指标").waitFor();
  await button(page, "训练对比模型").click();
  await headings(page, "CART 决策树 · 同一验证集").waitFor();
  await saveProject(page);
  await fit(page);
  console.log("PASS 四个实践项目均由真实输出解锁，报告下载和学习记录成功");

  await route(page, "/lab/ml?experiment=kmeans");
  await button(page, "训练与预测").click();
  await page.getByRole("img", { name: "聚类与噪声分布" }).waitFor();
  await fit(page);
  await route(page, "/lab/ml?experiment=linear");
  await button(page, "训练与预测").click();
  await page.getByText("RMSE", { exact: true }).first().waitFor();
  await button(page, "显示留出测试集").click();
  await page.getByRole("img", { name: "实际值与模型预测" }).waitFor();
  await route(page, "/lab/ml?experiment=astar");
  await button(page, "运行智能系统实验").click();
  await page.getByText(/最短路 10 步/).waitFor();
  await ctx.close();
  console.log("PASS 聚类、线性回归和 A* 网格搜索");
  const py = await browser.newContext({
    viewport: { width: 390, height: 850 },
  });
  await localPython(py);
  const notebook = await py.newPage();
  for (const [scenario, expected] of [
    ["numpy", /3\.758/],
    ["pandas", /setosa.*1\.462/],
    ["polars", /Polars 1\.462/],
    ["matplotlib", /\[1\.0, 1\.74/],
    ["seaborn", /versicolor/],
  ]) {
    await route(notebook, "/lab/data?experiment=" + scenario);
    const cell = notebook.locator(".p3-notebook-cell").nth(1);
    await details(cell, "打开 Python 编辑器").click();
    await button(cell, "运行 Python").click();
    const output = cell.locator("pre[role=status]");
    await output.waitFor({ timeout: 110000 });
    assert.match(
      await output.textContent(),
      expected,
      scenario + " 浏览器运行输出",
    );
  }
  await route(notebook, "/topics/k-8e3c17ec3572");
  await details(notebook, "手写 Python 与实际库对照").click();
  const pair = notebook.locator(".p3-code");
  await button(pair, "运行 Python").first().click();
  const scratchOutput = pair.locator("pre[role=status]").first();
  await scratchOutput.waitFor({ timeout: 105000 });
  assert.match(await scratchOutput.textContent(), /^7/);
  await button(pair, "运行 Python").nth(1).click();
  await pair
    .getByText("运行结果一致。", { exact: true })
    .waitFor({ timeout: 110000 });
  await details(notebook, "打开 Python 自动判题").click();
  const program = notebook.locator(".study-program");
  await program
    .locator(".cm-content")
    .fill(
      "def predict_line(x,y,query):\n    center=sum(x)/len(x)\n    avg=sum(y)/len(y)\n    slope=sum((a-center)*(b-avg) for a,b in zip(x,y))/sum((a-center)**2 for a in x)\n    return avg+slope*(query[0]-center)",
    );
  await button(program, "运行并检查代码").click();
  await program
    .getByText("已通过 4 组运行核验。", { exact: true })
    .waitFor({ timeout: 60000 });
  await py.close();
  console.log(
    "PASS 浏览器实际执行 NumPy、Pandas、Polars、Seaborn 和 scikit-learn，并完成自动判题",
  );
  if (process.env.AI_BASE_URL) {
    const tutor = await browser.newPage();
    let sent;
    await tutor.route("**/api/p3-test", async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({
        json: {
          ok: true,
          kind: "tutor",
          model: "本地测试替身",
          text: "从训练样本的中心化计算开始。",
        },
      });
    });
    await tutor.goto(
      process.env.AI_BASE_URL +
        "/#/lab/ml?experiment=linear&from=k-8e3c17ec3572",
    );
    await details(tutor, "实验 AI 学习帮助").click();
    await tutor.getByLabel("帮助方式").selectOption("答题提示");
    await tutor.getByLabel("补充问题").fill("怎样开始最小二乘推导？");
    await button(tutor, "向 AI 导师提问").click();
    await tutor
      .getByText("从训练样本的中心化计算开始。", { exact: true })
      .waitFor();
    assert.equal(sent.lessonTitle, "线性回归");
    assert.match(sent.context, /实验目标：ML Playground/);
    assert.match(sent.context, /练习题面/);
    assert.doesNotMatch(sent.context, /训练样本的中心化计算开始/);
    await tutor.close();
    console.log("PASS AI 导师使用公开课材与实验目标，本地测试响应正常显示");
  }
} finally {
  await browser.close();
}
