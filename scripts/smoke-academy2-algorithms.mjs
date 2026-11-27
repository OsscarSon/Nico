import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { basename, join } from "node:path";
import { chromium } from "playwright";
import ids from "../src/content/academy2/knowledge-ids.json" with { type: "json" };

const base = process.env.BASE_URL ?? "http://localhost:4173";
const screenshots =
  process.env.SCREENSHOT_DIR ?? "test-results/academy2-algorithms";
const browser = await chromium.launch();
const button = (root, name) => root.getByRole("button", { name, exact: true });
const lesson = (title) =>
  "/topics/" +
  ids.find((item) => item[1].endsWith("-algorithms") && item[3] === title)[0];
const algorithms = ids.filter((item) => item[1].endsWith("-algorithms"));
const bound = async (page) => {
  const [w, s] = await page.evaluate(() => [
    document.documentElement.clientWidth,
    document.documentElement.scrollWidth,
  ]);
  assert.ok(s <= w + 1, page.url() + " . " + s + " > " + w);
};
async function go(page, path) {
  await page.goto(base + "/#" + path);
  await page.locator("main h1").waitFor();
  await bound(page);
}
const opening = (page, title) =>
  page.locator("summary").filter({ hasText: title }).first().click();
const capture = async (page, name, width) => {
  if (width === 360) return;
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({
    path: join(screenshots, name + "-" + width + ".png"),
  });
};
function pythonAssets(context) {
  const assets = process.env.PYODIDE_ASSET_DIR;
  if (!assets) return;
  const types = {
    "pyodide.mjs": "text/javascript",
    "pyodide.asm.mjs": "text/javascript",
    "pyodide.asm.wasm": "application/wasm",
    "pyodide-lock.json": "application/json",
    "python_stdlib.zip": "application/zip",
  };
  return context.route(
    "https://cdn.jsdelivr.net/pyodide/v314.0.8/full/**",
    (route) => {
      const file = basename(new URL(route.request().url()).pathname);
      return Object.hasOwn(types, file)
        ? route.fulfill({
            body: readFileSync(join(assets, file)),
            contentType: types[file],
            headers: { "access-control-allow-origin": "*" },
          })
        : route.abort();
    },
  );
}

try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1440 ? 1000 : 850 },
      hasTouch: width < 800,
      acceptDownloads: true,
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await go(page, "/courses?phase=all");
    await page.locator('[data-course="foundation-algorithms"]').waitFor();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.locator('[data-course="foundation-algorithms"]').click();
    await page.getByRole("link", { name: /开始学习/ }).click();
    await page.locator(".p2-teaching h1").waitFor();
    for (const [title, slug] of [
      ["基础排序", "foundation"],
      ["Dijkstra", "intermediate"],
      ["网络流", "advanced"],
    ]) {
      await go(page, lesson(title));
      await page.locator(".p2-teaching .katex").first().waitFor();
      assert.equal(
        await page.getByRole("heading", { level: 1 }).textContent(),
        title,
      );
      await capture(page, slug + "-lesson", width);
      await opening(page, /课内实验/);
      const arena = page.locator(".p2-arena");
      await button(arena, "运行算法").click();
      await arena.locator(".p2-transport").waitFor();
      const cursor = arena.getByRole("slider", { name: "执行步骤" });
      await cursor.focus();
      await cursor.press("End");
      assert.equal(
        await arena.getByRole("heading", { name: "执行结束" }).count(),
        1,
      );
      if (title === "基础排序")
        await button(arena, "比较同一输入的排序").click();
      await bound(page);
    }

    await go(page, "/lab/algorithms?model=dijkstra");
    const arena = page.locator(".p2-arena");
    await arena.getByLabel("加权有向边，格式 A>B:2").fill("A>B:-2,B>D:1");
    await button(arena, "运行算法").click();
    await arena
      .getByRole("alert")
      .getByText(/非负边/)
      .waitFor();
    await arena
      .getByLabel("加权有向边，格式 A>B:2")
      .fill("A>B:10,A>C:2,C>B:1,B>D:4");
    await button(arena, "运行算法").click();
    const range = arena.getByRole("slider", { name: "执行步骤" });
    await button(arena, "下一步").click();
    assert.equal(await range.inputValue(), "1");
    await button(arena, "上一步").click();
    assert.equal(await range.inputValue(), "0");
    await arena.getByRole("combobox", { name: "速度" }).selectOption("4");
    await button(arena, "播放").press("Enter");
    await button(arena, "暂停").click();
    await range.focus();
    await range.press("End");
    await arena.getByText("本步记录 A → C → B → D", { exact: true }).waitFor();
    assert.match(await arena.textContent(), /结果7/);
    await arena
      .locator(".p2-trace-frame")
      .evaluate((node) => node.scrollIntoView({ block: "center" }));
    await capture(page, "arena", width);
    await bound(page);
    const download = page.waitForEvent("download");
    await button(arena, "保存实验报告").click();
    assert.match(
      readFileSync(await (await download).path(), "utf8"),
      /结果：7/,
    );

    await go(page, lesson("基础排序"));
    assert.equal(await button(page, "核验掌握").isDisabled(), true);
    for (const [i, [label, answer]] of [
      ["概念与计算", "10"],
      ["应用", "是"],
      ["分析", "线性"],
    ].entries()) {
      const card = page.locator(".p2-exercises > form").nth(i);
      await card.getByLabel(label + "答案").fill(answer);
      await button(card, "检查答案").click();
      await card.locator(".feedback.ok").waitFor();
    }
    await page.getByText("已完成", { exact: true }).first().waitFor();
    await page.getByLabel("独立迁移核验答案").fill("6");
    await button(page, "核验掌握").click();
    await page.getByText("已掌握", { exact: true }).first().waitFor();
    await button(page, "收藏知识点").click();
    await button(page, "生成练习变式").click();
    const variant = page.locator(".p2-exercises section form").first();
    const solve = async (form) => {
      const text = await form.locator("p").first().textContent();
      const input = /待排序列表为「([^」]+)」/.exec(text)?.[1];
      assert.ok(input, text);
      await form.getByRole("textbox").fill(
        input
          .split(",")
          .map(Number)
          .sort((a, b) => a - b)
          .join(","),
      );
      await button(form, "提交答案").click();
      await form.locator(".feedback.ok").waitFor();
    };
    await solve(variant);
    await button(page, "开启独立参数核验").click();
    const verification = page.locator(".p2-exercises section form").nth(1);
    assert.notEqual(
      await verification.locator("p").first().textContent(),
      await variant.locator("p").first().textContent(),
    );
    await solve(verification);
    await bound(page);

    for (const [stage, expected] of [
      ["foundation", "两组"],
      ["intermediate", "负环回归"],
      ["advanced", "字符串重叠核验"],
    ]) {
      await go(page, "/projects/" + stage + "-algorithms");
      const save = button(page, "保存并下载 Markdown 报告");
      assert.equal(await save.isDisabled(), true);
      if (stage === "foundation") {
        const input = page.getByLabel("第二组整数");
        await input.fill("1,2,3,4");
        await button(page, "执行并核对项目").click();
        await page
          .getByRole("alert")
          .getByText(/重复键/)
          .waitFor();
        await input.fill("4,3,3,0");
      }
      await button(page, "执行并核对项目").click();
      await page.getByRole("heading", { name: "独立核验结果" }).waitFor();
      if (stage === "foundation") {
        const pending = page.waitForEvent("download");
        await button(page, "导出第 1 组轨迹播放器").click();
        const file = await pending;
        const folder = mkdtempSync(join(tmpdir(), "nico-project-"));
        const asset = join(folder, file.suggestedFilename());
        const replay = await context.newPage();
        try {
          await file.saveAs(asset);
          await replay.goto(pathToFileURL(asset).href);
          await button(replay, "下一步").click();
          assert.match(
            await replay.locator("#frame").textContent(),
            /2 \/ \d+/,
          );
        } finally {
          await replay.close();
          rmSync(folder, { recursive: true, force: true });
        }
      } else
        await page
          .getByRole("heading", { name: expected, exact: true })
          .waitFor();
      if (stage === "advanced") {
        assert.equal(await save.isDisabled(), true);
        await button(page, "运行两组基准").click();
        await page.getByLabel("真实计时结果").waitFor();
        if (width === 1440 || width === 390)
          await capture(page, "advanced-project", width);
      }
      await page
        .getByLabel("我的分析")
        .fill(
          "两组输入使用相同的索引约定。只有可比较的单位才能对照，实测受到浏览器预热影响。",
        );
      const pending = page.waitForEvent("download");
      await save.click();
      const report = readFileSync(await (await pending).path(), "utf8");
      assert.match(report, /## 学员分析/);
      assert.match(report, /人工/);
      await page.getByText("已提交可核验的项目证据", { exact: true }).waitFor();
      await bound(page);
    }
    await go(page, "/study?view=saved");
    await page
      .getByRole("link", { name: "基础排序", exact: true })
      .first()
      .waitFor();
    await page
      .locator("summary")
      .filter({ hasText: "Dijkstra 非负最短路 · 执行报告" })
      .waitFor();
    await go(page, "/study");
    await page.getByRole("searchbox").fill("Dijkstra");
    await page
      .locator('a[href*="' + lesson("Dijkstra").split("/").at(-1) + '"]')
      .first()
      .waitFor();
    if (width === 390) {
      const topic = lesson("基础排序").split("/").at(-1);
      await go(page, lesson("基础排序"));
      await opening(page, /个人笔记/);
      await page
        .getByLabel("此知识点的笔记")
        .fill("用重复键核查原始排序的稳定性。");
      await button(page, "保存笔记").click();
      await go(page, "/study?view=backup");
      const saved = page.waitForEvent("download");
      await button(page, "导出完整备份").click();
      const file = await (await saved).path();
      const backup = JSON.parse(readFileSync(file, "utf8"));
      assert.equal(
        backup.knowledge.records[topic].verification.lastCorrect,
        true,
      );
      assert.equal(
        Object.values(backup.knowledge.questionBank[topic]).length,
        2,
      );
      assert.match(backup.library.notes[topic].body, /重复键/);
      assert.ok(
        Object.values(backup.library.reports).some(
          (report) => report.kind === "experiment",
        ),
      );
      assert.equal(
        Object.values(backup.library.reports).filter(
          (report) => report.kind === "project",
        ).length,
        3,
      );
      const device = await browser.newContext({
        viewport: { width: 390, height: 850 },
      });
      const restored = await device.newPage();
      await go(restored, "/study?view=backup");
      await restored
        .getByLabel("完整备份 JSON 文件")
        .setInputFiles({
          name: "nico-p2.json",
          mimeType: "application/json",
          buffer: readFileSync(file),
        });
      await button(restored, "确认恢复完整备份").click();
      await restored
        .getByRole("status")
        .filter({ hasText: "已合并恢复" })
        .waitFor();
      await go(restored, lesson("基础排序"));
      await restored.getByText("已掌握", { exact: true }).first().waitFor();
      await opening(restored, /个人笔记/);
      assert.match(
        await restored.getByLabel("此知识点的笔记").inputValue(),
        /重复键/,
      );
      await device.close();
      console.log(
        "PASS 390px · P2 掌握度、题库、笔记和四份报告随整站备份跨设备恢复",
      );
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS " + width + "px · 课时、竞技场、掌握核验、三个项目、下载与资料库",
    );
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
  for (const [id, , , title] of algorithms) {
    await go(page, "/topics/" + id);
    await page.locator(".p2-teaching .katex").first().waitFor();
    assert.equal(
      await page.getByRole("heading", { level: 1 }).textContent(),
      title,
    );
    await bound(page);
  }
  await page.close();
  console.log("PASS 390px · 60 个算法课时逐页打开、数学公式与响应布局");

  const py = await browser.newContext({
    viewport: { width: 390, height: 850 },
  });
  await pythonAssets(py);
  const editor = await py.newPage();
  await go(editor, lesson("二分搜索"));
  await opening(editor, /打开 Python 编程任务/);
  const task = editor.locator(".study-program");
  const scratch = task.locator(".cm-content");
  await scratch.fill("def solve(data, target):\n    return 0");
  await button(task, "运行并检查代码").click();
  await task
    .getByRole("status")
    .filter({ hasText: /相等时保留左侧候选|不同/ })
    .last()
    .waitFor({ timeout: 100000 });
  await scratch.fill(
    "from bisect import bisect_left\ndef solve(data, target):\n    return bisect_left(data, target[0])",
  );
  await button(task, "运行并检查代码").click();
  await task
    .getByText("已通过 4 组运行核验。", { exact: true })
    .waitFor({ timeout: 100000 });
  await opening(editor, /运行两种 Python 实现/);
  const pair = editor
    .locator("details")
    .filter({
      has: editor
        .locator("summary")
        .filter({ hasText: /运行两种 Python 实现/ }),
    })
    .first();
  await button(pair, "运行 Python").first().click();
  await button(pair, "运行 Python").nth(1).click();
  await pair
    .getByText("两次运行结果一致。", { exact: true })
    .waitFor({ timeout: 100000 });
  await bound(editor);
  await py.close();
  console.log(
    "PASS Pyodide · 错解未通过、正确解 4 组用例、手写/标准库输出对照",
  );
  if (process.env.AI_BASE_URL) {
    const tutor = await browser.newPage();
    let payload;
    await tutor.route("**/api/p2-test", async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({
        json: {
          ok: true,
          kind: "tutor",
          model: "本地测试替身",
          text: "先检查边权是否非负。",
        },
      });
    });
    await tutor.goto(process.env.AI_BASE_URL + "/#" + lesson("Dijkstra"));
    await opening(tutor, /AI 学习帮助/);
    await opening(tutor, /课内 AI 导师/);
    await tutor.getByLabel("帮助方式").selectOption("答题提示");
    await tutor.getByLabel("补充问题").fill("我该怎样开始？");
    await button(tutor, "向 AI 导师提问").click();
    await tutor.getByText("先检查边权是否非负。", { exact: true }).waitFor();
    assert.match(payload.context, /实验目标：Dijkstra/);
    assert.match(payload.context, /例题条件与思路/);
    assert.match(payload.context, /练习题面/);
    assert.doesNotMatch(payload.context, /走 A,C,B,D/);
    await tutor.close();
    console.log("PASS AI · 公开算法例题与实验上下文经本地测试响应核验");
  }
} finally {
  await browser.close();
}
