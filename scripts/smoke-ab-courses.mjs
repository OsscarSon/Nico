// Production-browser coverage for all fifteen new lessons.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4173";
const images = process.env.SCREENSHOT_DIR ?? "test-results/ab-courses";
mkdirSync(images, { recursive: true });
const cases = [
  ["A21", "a21-http-status", [1, 1, 1], [0, 1, 2], 11, "3s/200"],
  ["A22", "a22-error-logs", [2, 1, 1], [1, 2, 0], 33, "41ms 上游等待超时"],
  ["A-I01", "a-i01", [1, 1, 1], [1, 2, 0], 6, "3 / 7"],
  ["A-I02", "a-i02", [1, 1, 1], [0, 2, 1], 9, "active · 文件读入"],
  ["A-I03", "a-i03", [1, 1, 1, 1], [2, 1, 0], 400, "600 B"],
  ["A-I04", "a-i04", [1, 1, 1], [1, 2, 0], 20, "阅览室 · 保留内部源地址"],
  ["A-I05", "a-i05", [1, 1, 0], [0, 2, 1], 6, "401"],
  ["A-I06", "a-i06", [1, 1, 1], [2, 0, 1], 5, "node-b · 8 条 / 8 条"],
  ["B-I02", "b-i02", [1, 1, 1], [1, 2, 0], 6, "光学 / 2"],
  ["B-I03", "b-i03", [1, 1, 1], [1, 0, 2], 4, "201 /bookings/1"],
  ["B-I04", "b-i04", [1, 1, 1], [2, 0, 1], 5, "1 → 1 条 / 月球手册"],
  ["B-I05", "b-i05", [1, 1, 1], [0, 1, 2], 22, "外键拒绝 #99 / 3"],
  ["B-I06", "b-i06", [1, 1, 1], [2, 0, 1], 8, "新版银河"],
  ["B-I07", "b-i07", [1, 1, 1], [0, 2, 1], 2, "rev-c / 通过"],
  ["B-I08", "b-i08", [1, 1, 1, 1], [1, 2, 0], 2, "200 / 201 / 200"],
];
const picture = new Set(["a21-http-status", "a22-error-logs", "a-i04", "b-i05", "b-i08"]);
const btn = (p, name) => p.getByRole("button", { name, exact: true });
const click = (p, name) => btn(p, name).click();
const next = "下一步";
const report = (p) => p.getByRole("list", { name: "实验记录" });

async function fits(p) {
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, p.url());
}
async function fill(p, settings) {
  const select = p.locator(".intermediate-fields select");
  assert.equal(await select.count(), settings.length);
  for (const [i, value] of settings.entries()) await select.nth(i).selectOption(String(value));
}

const browser = await chromium.launch();
let passed = 0;
try {
  for (const width of [1440, 390, 360]) {
    const c = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, hasTouch: width < 500 });
    const p = await c.newPage(), errors = [], requests = [];
    p.on("pageerror", error => errors.push(error.message));
    p.on("request", request => {
      if (!request.url().startsWith(base + "/") && ["fetch", "xhr"].includes(request.resourceType())) requests.push(request.url());
    });
    for (const [path, count] of [["/paths/a", 22], ["/paths/a?stage=Intermediate", 6], ["/paths/b?stage=Intermediate", 8]]) {
      await p.goto(base + "/#" + path);
      await p.locator(".pathmap").waitFor();
      assert.equal(await p.locator("a.pm-card").count(), count);
      assert.equal(await p.locator(".pm-card.planned").count(), 0);
      await fits(p);
    }

    for (const [catalogId, id, settings, answers, transfer, witness] of cases) {
      const intermediate = catalogId.includes("-");
      await p.goto(base + "/#/courses");
      if (intermediate) await click(p, "中阶阶段");
      await p.getByRole("searchbox").fill(catalogId);
      const entry = p.locator(".academy-course a");
      assert.equal(await entry.getAttribute("href"), "#/lesson/" + id);
      await entry.click();
      const art = p.locator(".lesson-art");
      await art.waitFor();
      assert.ok(await art.evaluate(async img => {
        await img.decode();
        const css = getComputedStyle(img);
        const box = img.getBoundingClientRect(), container = img.closest(".lesson-body").getBoundingClientRect();
        return img.naturalWidth === 1600 && img.naturalHeight === 900
          && css.objectFit === "contain" && css.objectPosition === "50% 50%"
          && Math.abs(box.width / box.height - 16 / 9) < .02
          && Math.abs((box.left + box.right) - (container.left + container.right)) < 2;
      }));
      assert.equal(await p.locator(".pill.draft").count(), 1);
      assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
      assert.equal(await p.locator(".backlink").getAttribute("href"), "#/paths/" + id[0] + (intermediate ? "?stage=Intermediate" : ""));
      await fits(p);
      if (picture.has(id) && width !== 360) await p.screenshot({ path: images + "/" + id + "-" + width + ".png" });

      for (let step = 0; step < 5; step++) await click(p, next);
      assert.equal(await p.locator(".device header .pill").innerText(), "模拟");
      if (width === 360) await btn(p, "运行实验").tap();
      else if (width === 1440) await btn(p, "运行实验").press("Enter");
      else await click(p, "运行实验");
      const original = await report(p).innerText();
      await fill(p, settings);
      assert.equal(await report(p).count(), 0);
      await click(p, "运行实验");
      assert.notEqual(await report(p).innerText(), original);
      assert.ok((await report(p).innerText()).includes(witness));

      await click(p, next);
      assert.ok(await btn(p, next).isDisabled());
      await click(p, "运行实验");
      await click(p, "检查当前任务");
      assert.ok(await btn(p, "完成挑战").isDisabled());
      await fill(p, settings);
      assert.ok(await btn(p, "完成挑战").isDisabled());
      await click(p, "运行实验");
      assert.ok((await report(p).innerText()).includes(witness));
      await click(p, "检查当前任务");
      await fits(p);
      if (id === "b-i08") {
        const pending = p.waitForEvent("download");
        await click(p, "导出验收 JSON");
        const file = await pending;
        assert.equal(file.suggestedFilename(), "nico-b-i08-acceptance.json");
        const saved = JSON.parse(readFileSync(await file.path(), "utf8"));
        assert.equal(saved.environment, "教学模拟");
        assert.equal(saved.checks.length, 4);
        assert.ok(saved.checks.every(check => check.observed === check.expected));
        if (width !== 360) {
          await report(p).evaluate(el => el.scrollIntoView({ block: "center" }));
          await p.screenshot({ path: images + "/b-i08-results-" + width + ".png" });
        }
      }
      await click(p, "完成挑战");
      await click(p, next);
      for (const [index, answer] of answers.entries()) {
        await p.locator(".option").nth((answer + 1) % 3).click();
        assert.ok((await p.locator(".feedback.bad").innerText()).length > 10);
        await p.locator(".option").nth(answer).click();
        await click(p, index < 2 ? "下一题" : "完成检查");
      }
      await click(p, next);
      const input = p.getByLabel("你的答案（一个整数）");
      await input.fill("9999");
      await click(p, "检查答案");
      assert.ok(await btn(p, next).isDisabled());
      await input.fill(String(transfer));
      await click(p, "检查答案");
      await click(p, next);
      assert.ok(await p.locator(".foundation-sources a").count() >= 2);
      const progress = await p.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")));
      assert.equal(progress.schemaVersion, 1);
      assert.equal(progress.lessons[id].quizTotal, 4);
      assert.equal(progress.lessons[id].firstTryCorrect, 0);
      await p.reload();
      assert.match(await p.locator(".lesson-head").innerText(), /已完成/);
      await fits(p);
      passed++;
      console.log("PASS " + width + "px " + id + " · 课头、错误恢复、挑战、迁移、进度");
    }
    for (const [alias, id] of [["a21", "a21-http-status"], ["a22", "a22-error-logs"]]) {
      await p.goto(base + "/#/lesson/" + alias);
      await p.locator(".lesson-head").waitFor();
      assert.ok(await p.getByText("已完成", { exact: true }).isVisible());
      const stored = await p.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")));
      assert.ok(stored.lessons[id]);
      assert.equal(stored.lessons[alias], undefined);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    await c.close();
  }
  console.log(passed + " 条新课完整浏览器流程通过。");
} finally {
  await browser.close();
}
