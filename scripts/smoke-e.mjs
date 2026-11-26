// Use BASE_URL with npm run preview, then npm run smoke:e.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = process.env.SCREENSHOT_DIR ?? "test-results/e";
mkdirSync(out, { recursive: true });

const request = JSON.stringify({ contents: [{ role: "user", parts: [{ text: "核对公开活动汇总。" }] }], generationConfig: { responseMimeType: "application/json" } });
const cleanFields = { "去首尾空格": "on", "严格金额检查": "on", "按单号去重": "on" };
const cases = [
  { id: "e01-formula-basics", quiz: [0, 1, 2], answer: "9", formula: "=SUM(A2:A4)", evidence: /→ 18/ },
  { id: "e02-cell-references", quiz: [1, 2, 0], answer: "5", formula: "=A2*$B$1", evidence: /\$B\$1 → 15/ },
  { id: "e03-conditional-formulas", quiz: [2, 0, 1], answer: "3", formula: '=IF(B2>=60,"通过","跟进")', evidence: /刚好达线.*→ 通过/ },
  { id: "e04-lookup", quiz: [1, 2, 0], answer: "15", formula: '=XLOOKUP(A2,B2:B4,C2:C4,"未找到")', evidence: /→ 未找到/ },
  { id: "e05-dates-text", quiz: [1, 0, 2], answer: "3", formula: '=TEXT(DATE(A2,B2,C2),"yyyy-mm-dd")&" · "&TRIM(D2)', evidence: /→ 2024-02-29 · 社团 A/ },
  { id: "e06-data-cleaning", quiz: [1, 2, 0], answer: "3", fields: cleanFields, evidence: /有效数据 · 5 条；合计 34/ },
  { id: "e07-pivot", quiz: [2, 0, 1], answer: "22", fields: { "分组字段": "team", "汇总方式": "sum" }, evidence: /科学队 · 21/ },
  { id: "e08-charts", quiz: [0, 1, 2], answer: "4", fields: { "分组字段": "team", "图形": "bar" }, evidence: /从零起算的柱高/ },
  { id: "e09-apps-script", quiz: [0, 1, 2], answer: "28", fields: { "读取行数": "3", "写入列数": "2" }, evidence: /已写入本地输出预览/ },
  { id: "e10-triggers", quiz: [2, 0, 1], answer: "2", fields: { "触发类型": "clock", "模拟时段": "8", "同一报告只执行一次": "on" }, evidence: /周一报告、周二报告/ },
  { id: "e11-workflow", quiz: [0, 1, 2], answer: "0" },
  { id: "e12-gemini-api", quiz: [0, 1, 2], answer: "2", fields: { "数据范围": "summary", "离线请求 JSON": request }, evidence: /合计 34；记录 5/ },
  { id: "e13-colab", quiz: [1, 2, 0], answer: "1" },
  { id: "e14-looker-studio", quiz: [2, 0, 1], answer: "10", fields: { "看板队名筛选": "science", "日期窗口": "later", "汇总方式": "sum" }, evidence: /过滤后明细 · 1 条；s3/ },
  { id: "e15-data-pipeline", quiz: [0, 1, 2], answer: "5", fields: { "装载策略": "upsert" }, evidence: /重放同一批次 · 6 条；合计 38/ },
  { id: "e16-report-project", quiz: [1, 2, 0], answer: "22" },
];

const button = (p, label) => p.getByRole("button", { name: label, exact: true });
const click = (p, label) => button(p, label).click();
const next = p => button(p, "下一步");
const choice = (p, label, value) => p.getByLabel(label, { exact: true }).selectOption(value);
const status = p => p.locator(".p3-lab").getByRole("status").first().innerText();
const output = (p, name) => p.getByRole("list", { name });
const verifyLocked = async p => {
  await click(p, "检查当前任务");
  assert.ok(await next(p).isDisabled());
  assert.ok(await button(p, "完成挑战").isDisabled());
};
const fit = async p => {
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, p.url() + ": horizontal overflow " + overflow);
};
async function setFields(p, fields) {
  for (const [label, setting] of Object.entries(fields)) {
    if (label === "离线请求 JSON") await p.getByRole("textbox", { name: label, exact: true }).fill(setting);
    else await choice(p, label, setting);
  }
}

async function formulas(p, row, mode, width) {
  const text = p.getByRole("textbox", { name: "工作表公式" });
  if (width === 1440) await button(p, "计算所有样例").press("Enter");
  else await click(p, "计算所有样例");
  assert.match(await output(p, "公式验证结果").innerText(), /需调整/);
  if (mode) await verifyLocked(p);
  await choice(p, "示例数据", "1");
  await text.fill("=1/0");
  await click(p, "计算所有样例");
  assert.match(await output(p, "公式验证结果").innerText(), /除数不能为零/);
  await text.fill(row.formula);
  assert.equal(await output(p, "公式验证结果").count(), 0);
  await click(p, "计算所有样例");
  assert.match(await output(p, "公式验证结果").innerText(), row.evidence);
  assert.doesNotMatch(await output(p, "公式验证结果").innerText(), /需调整/);
}

async function bench(p, row, mode) {
  await click(p, "运行实验");
  assert.match(await output(p, "运行结果").innerText(), /需调整/);
  if (mode) await verifyLocked(p);
  if (row.id === "e12-gemini-api") {
    assert.match(await output(p, "运行结果").innerText(), /私人字段/);
    await setFields(p, { "数据范围": "summary", "离线请求 JSON": "{" });
    await click(p, "运行实验");
    assert.match(await output(p, "运行结果").innerText(), /不是合法 JSON/);
    await setFields(p, { "数据范围": "later", "离线请求 JSON": request });
    await click(p, "运行实验");
    assert.match(await output(p, "运行结果").innerText(), /合计 17；记录 3/);
  }
  await setFields(p, row.fields);
  assert.equal(await output(p, "运行结果").count(), 0);
  await click(p, "运行实验");
  assert.match(await output(p, "运行结果").innerText(), row.evidence);
  assert.doesNotMatch(await output(p, "运行结果").innerText(), /需调整/);
}

async function workflow(p, mode) {
  await click(p, "模拟交付");
  assert.match(await status(p), /交付已阻止/);
  for (const action of ["生成待审预览", "批准当前预览", "校正源数据", "模拟交付"]) await click(p, action);
  assert.match(await status(p), /过期/);
  if (mode) await verifyLocked(p);
  for (const action of ["生成待审预览", "批准当前预览", "模拟交付", "模拟交付"]) await click(p, action);
  assert.match(await status(p), /去重/);
  const receipts = p.getByRole("table", { name: "本地交付记录" }).locator("tbody tr");
  assert.equal(await receipts.count(), 1);
  assert.deepEqual(await receipts.first().locator("td").allTextContents(), ["2", "35"]);
}

async function notebook(p, mode) {
  const cells = ["运行加载单元", "运行清洗单元", "运行汇总单元"];
  for (const cell of cells) await click(p, cell);
  await click(p, "重启运行时");
  await click(p, "运行汇总单元");
  assert.match(await status(p), /没有变量 cleaned/);
  if (mode) await verifyLocked(p);
  for (const cell of cells) await click(p, cell);
  assert.ok(await p.getByText(/cleaned 5 条 · amount 34/).isVisible());
}

async function report(p, mode, width) {
  await click(p, "生成报表草稿");
  assert.match(await status(p), /对账未通过/);
  assert.ok(await button(p, "核对并批准报表").isDisabled());
  await setFields(p, cleanFields);
  if (width === 360) await button(p, "生成报表草稿").tap();
  else await click(p, "生成报表草稿");
  assert.match(await status(p), /有效 5 条，拒绝 3 条，合计 34.*对照合计 37/);
  await click(p, "核对并批准报表");
  if (mode) await verifyLocked(p);
  const [file] = await Promise.all([p.waitForEvent("download"), click(p, "导出 CSV")]);
  assert.equal(file.suggestedFilename(), "nico-e16-activity-report.csv");
  const rows = readFileSync(await file.path(), "utf8").replace(/^\uFEFF/, "").trim().split("\r\n");
  assert.equal(rows[0], "队名,金额");
  assert.deepEqual(new Set(rows.slice(1)), new Set(["科学,21", "艺术,5", "社区,8", "合计,34"]));
  if (!mode) {
    await choice(p, "按单号去重", "off");
    assert.ok(await button(p, "导出 CSV").isDisabled());
  }
}

const browser = await chromium.launch();
const special = { "e11-workflow": workflow, "e13-colab": notebook, "e16-report-project": report };
let completed = 0;
try {
  await Promise.all([1440, 390, 360].map(async width => {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, hasTouch: width < 900 });
    const p = await context.newPage();
    p.setDefaultTimeout(18000);
    const errors = [], cloudRequests = [];
    p.on("pageerror", error => errors.push(error.message));
    p.on("request", req => {
      if (/googleapis\.com|script\.google\.com|colab\.research\.google\.com|lookerstudio\.google\.com/.test(req.url())) cloudRequests.push(req.url());
    });
    await p.goto(base + "/#/paths/e");
    await p.locator(".pathmap").waitFor();
    assert.equal(await p.locator("a.pm-card").count(), 16);
    assert.equal(await p.locator(".route-unit").count(), 4);
    for (const { id } of cases) assert.equal(await p.locator('a.pm-card[href="#/lesson/' + id + '"]').count(), 1);
    await fit(p);
    for (const row of cases) {
      const { id } = row;
      await p.goto(base + "/#/lesson/" + id);
      const art = p.locator(".lesson-art");
      await art.waitFor();
      const file = "lesson-" + id + (id === "e01-formula-basics" ? "-centered" : "") + ".png";
      assert.ok(await art.evaluate(async (image, name) => {
        await image.decode();
        const style = getComputedStyle(image);
        const box = image.getBoundingClientRect();
        const body = image.closest(".lesson-body").getBoundingClientRect();
        return image.src.endsWith("/art/" + name) && image.naturalWidth === 1600 && image.naturalHeight === 900
          && style.objectFit === "contain" && style.objectPosition === "50% 50%"
          && Math.abs(box.width / box.height - 16 / 9) < .02 && Math.abs(box.left + box.right - body.left - body.right) < 2;
      }, file), id + " art");
      assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
      assert.equal(await p.locator(".pill.draft").count(), 1);
      await fit(p);
      if (width !== 360) await p.screenshot({ path: out + "/" + id + "-" + width + ".png" });
      for (let step = 0; step < 4; step++) await next(p).click();
      assert.equal(await p.locator(".device header .pill").innerText(), "模拟");
      const play = mode => row.formula ? formulas(p, row, mode, width) : row.fields ? bench(p, row, mode) : special[id](p, mode, width);
      await play(false);
      await fit(p);
      await next(p).click();
      await verifyLocked(p);
      await play(true);
      await click(p, "检查当前任务");
      await click(p, "完成挑战");
      await fit(p);
      if (width === 390 && id === "e16-report-project") {
        await p.getByText(/本地模板摘要/).evaluate(element => element.scrollIntoView({ block: "center" }));
        await p.screenshot({ path: out + "/e16-report-result-390.png" });
      }
      await next(p).click();
      for (const [index, correct] of row.quiz.entries()) {
        await p.locator(".option").nth((correct + 1) % 3).click();
        assert.ok((await p.locator(".feedback.bad").innerText()).length > 4);
        await p.locator(".option").nth(correct).click();
        await click(p, index === 2 ? "完成检查" : "下一题");
      }
      await next(p).click();
      const answer = p.getByLabel("你的答案（一个整数）");
      await answer.fill("987");
      await click(p, "检查答案");
      assert.ok(await next(p).isDisabled());
      await answer.fill(row.answer);
      await click(p, "检查答案");
      await next(p).click();
      assert.equal(await p.locator(".foundation-sources a").count(), 2);
      const record = await p.evaluate(key => JSON.parse(localStorage.getItem("nico-progress")).lessons[key], id);
      assert.equal(record.quizTotal, 4);
      assert.equal(record.firstTryCorrect, 0);
      await p.reload();
      assert.match(await p.locator(".lesson-head").innerText(), /已完成/);
      await fit(p);
      if (id === "e01-formula-basics") {
        await p.goto(base + "/#/me");
        await p.locator(".badge.earned").filter({ hasText: "公式达人" }).waitFor();
      }
      completed++;
      console.log("PASS " + width + "px " + id + " · 插图、实验、门控、问答、迁移、进度");
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(cloudRequests, []);
    await context.close();
  }));
  console.log(completed + " 条 Foundation E 完整流程通过。");
} finally {
  await browser.close();
}
