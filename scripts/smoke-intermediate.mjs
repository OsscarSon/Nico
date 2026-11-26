// Run against the production preview with the same Pyodide runtime used by learners.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = process.env.SCREENSHOT_DIR ?? "test-results/intermediate";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ proxy: process.env.BROWSER_PROXY
  ? { server: process.env.BROWSER_PROXY, bypass: "localhost,127.0.0.1" } : undefined });

const lessons = [
  { id: "b-i01", track: "b", quiz: [0, 1, 2], transfer: "18" },
  { id: "c-i04", track: "c", quiz: [0, 1, 2], transfer: "3" },
  { id: "c-i05", track: "c", quiz: [1, 2, 0], transfer: "1" },
];
const btn = (p, name) => p.getByRole("button", { name, exact: true });
const click = (p, name) => btn(p, name).click();
const next = p => btn(p, "下一步");
const choose = (p, label, value) => p.getByLabel(label, { exact: true }).selectOption(value);

async function fits(p) {
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, p.url() + " 横向溢出 " + overflow + "px");
}

async function setCode(p, code) {
  await p.locator('.code-editor[data-engine="cm"], .code-editor[data-engine="fallback"]').waitFor();
  if (await p.locator(".code-textarea").count()) await p.locator(".code-textarea").fill(code);
  else {
    await p.locator(".cm-content").click();
    await p.keyboard.press("ControlOrMeta+A");
    await p.keyboard.insertText(code);
  }
}

const pythonSolution = [
  "from pathlib import Path",
  "from tempfile import TemporaryDirectory",
  "import csv",
  "",
  "class StudyLog:",
  "    def __init__(self, path: Path) -> None:",
  "        self.path = path",
  "",
  "    def total(self) -> int:",
  "        try:",
  '            with self.path.open(encoding="utf-8", newline="") as source:',
  '                return sum(int(row["minutes"]) for row in csv.DictReader(source))',
  "        except FileNotFoundError:",
  "            return 0",
].join("\n");

async function python(p, challenge) {
  if (!challenge) {
    await click(p, "运行");
    await p.locator(".code-out, .feedback.bad").first().waitFor({ timeout: 100000 });
    const loadError = p.locator(".feedback.bad");
    if (await loadError.count()) throw Error(await loadError.first().innerText());
    assert.equal((await p.locator(".code-output").innerText()).trim(), "17\n0");
    return;
  }
  await click(p, "检查答案");
  await p.locator(".code-checks").waitFor({ timeout: 100000 });
  assert.ok(await p.locator(".checklist li[data-ok=false]").count() > 0);
  assert.ok(await next(p).isDisabled());
  await setCode(p, pythonSolution);
  await click(p, "检查答案");
  const results = p.locator(".code-checks");
  await results.waitFor({ timeout: 100000 });
  assert.equal(await p.locator(".checklist li[data-ok=true]").count(), 5, await results.innerText());
  assert.match(await p.locator(".codesim .feedback.ok").innerText(), /全部检查通过。/);
}

async function checkLocked(p) {
  await click(p, "检查当前任务");
  assert.ok(await next(p).isDisabled());
  assert.ok(await btn(p, "完成挑战").isDisabled());
}

async function prompt(p, challenge) {
  const run = () => click(p, "运行评测");
  await run();
  assert.ok(await p.getByText("通过 0/3 个案例", { exact: true }).isVisible());
  if (challenge) await checkLocked(p);
  await choose(p, "响应格式", "json");
  await run();
  const scores = p.getByRole("list", { name: "响应评测" });
  assert.match(await scores.innerText(), /H-2024/);
  assert.match(await scores.innerText(), /工具守卫拒绝/);
  assert.ok(await p.getByText("通过 0/3 个案例", { exact: true }).isVisible());
  await choose(p, "指令与资料边界", "bounded");
  await choose(p, "工具请求范围", "read");
  await run();
  assert.ok(await p.getByText("通过 3/3 个案例", { exact: true }).isVisible());
  const report = await scores.innerText();
  assert.match(report, /H-2026/);
  assert.match(report, /"status":"insufficient"/);
  assert.match(report, /"status":"handoff"/);
}

async function rag(p, challenge, width) {
  const run = () => click(p, "检索并核对");
  await run();
  assert.ok(await p.getByText(/候选召回 0\/2 · 最终通过 0\/3/).isVisible());
  if (challenge) await checkLocked(p);
  await choose(p, "分块粒度", "1");
  await choose(p, "候选重排", "true");
  await choose(p, "没有相关证据时", "true");
  await run();
  assert.ok(await p.getByText(/候选召回 0\/2 · 最终通过 1\/3/).isVisible());
  await choose(p, "候选数量", "2");
  if (width === 360) await btn(p, "检索并核对").tap();
  else await run();
  assert.ok(await p.getByText(/候选召回 2\/2 · 最终通过 3\/3/).isVisible());
  const facts = await p.getByRole("list", { name: "检索评测" }).innerText();
  assert.match(facts, /馆规-2026\/1 · 现行：周六 10:00–17:00/);
  assert.match(facts, /馆规-2026\/2 · 现行：续借延长 14 天/);
  assert.match(facts, /最终证据 无 · 资料不足/);
}

const play = [python, prompt, rag];
let passed = 0;
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, hasTouch: width < 900 });
    const p = await context.newPage();
    p.setDefaultTimeout(18000);
    const errors = [], ai = [];
    p.on("pageerror", error => errors.push(error.message));
    p.on("request", req => {
      if (/api\.openai\.com|generativelanguage\.googleapis\.com|\/api\/ai/.test(req.url())) ai.push(req.url());
    });
    await p.goto(base + "/#/courses?view=legacy");
    await click(p, "中阶阶段");
    await p.getByRole("searchbox").fill("b-i01");
    const first = p.locator(".academy-course a");
    assert.equal(await first.getAttribute("href"), "#/lesson/b-i01");
    await p.goto(base + "/#/paths/c?stage=Intermediate");
    await p.locator(".pathmap").waitFor();
    assert.equal(await p.locator("a.pm-card").count(), 2);
    assert.equal(await p.locator(".pm-card.planned a").count(), 0);
    await p.goto(base + "/#/lesson/c-i03");
    assert.ok(await p.getByText("这一课还没有开放", { exact: true }).isVisible());
    for (const [i, lesson] of lessons.entries()) {
      await p.goto(base + "/#/lesson/" + lesson.id);
      const art = p.locator(".lesson-art");
      await art.waitFor();
      assert.ok(await art.evaluate(async (img, filename) => {
        await img.decode();
        const box = img.getBoundingClientRect(), parent = img.closest(".lesson-body").getBoundingClientRect();
        const css = getComputedStyle(img);
        return img.src.endsWith("/art/" + filename) && img.naturalWidth === 1600 && img.naturalHeight === 900
          && css.objectFit === "contain" && css.objectPosition === "50% 50%"
          && Math.abs(box.width / box.height - 16 / 9) < .02 && Math.abs(box.left + box.right - parent.left - parent.right) < 2;
      }, "lesson-" + lesson.id + ".png"));
      assert.equal(await p.locator(".backlink").getAttribute("href"), "#/paths/" + lesson.track + "?stage=Intermediate");
      assert.equal(await p.locator(".pill.draft").count(), 1);
      assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
      await fits(p);
      if (width !== 360) await p.screenshot({ path: out + "/" + lesson.id + "-" + width + ".png" });
      for (let j = 0; j < 5; j++) await next(p).click();
      assert.equal(await p.locator(".device header .pill").innerText(), i === 0 ? "真实 Python" : "模拟");
      await play[i](p, false, width);
      await fits(p);
      await next(p).click();
      assert.ok(await next(p).isDisabled());
      await play[i](p, true, width);
      if (i > 0) {
        await click(p, "检查当前任务");
        await click(p, "完成挑战");
      }
      assert.ok(await next(p).isEnabled());
      await fits(p);
      if (width === 390 && i !== 1) {
        const section = i === 0 ? p.locator(".code-checks") : p.getByRole("list", { name: "检索评测" });
        await section.evaluate(el => el.scrollIntoView({ block: "center" }));
        await p.screenshot({ path: out + "/" + lesson.id + "-result-390.png" });
      }
      await next(p).click();
      for (const [j, answer] of lesson.quiz.entries()) {
        await p.locator(".option").nth((answer + 1) % 3).click();
        assert.ok((await p.locator(".feedback.bad").innerText()).length > 5);
        await p.locator(".option").nth(answer).click();
        await click(p, j === 2 ? "完成检查" : "下一题");
      }
      await next(p).click();
      const input = p.getByLabel("你的答案（一个整数）");
      await input.fill("999");
      await click(p, "检查答案");
      assert.ok(await next(p).isDisabled());
      await input.fill(lesson.transfer);
      await click(p, "检查答案");
      await next(p).click();
      assert.equal(await p.locator(".foundation-sources a").count(), 3);
      if (lesson.id === "c-i04") {
        assert.equal(await p.getByRole("link", { name: "下一课", exact: true }).getAttribute("href"), "#/lesson/c-i05");
      }
      const record = await p.evaluate(id => JSON.parse(localStorage.getItem("nico-progress")).lessons[id], lesson.id);
      assert.equal(record.quizTotal, 4);
      assert.equal(record.firstTryCorrect, 0);
      await p.reload();
      assert.match(await p.locator(".lesson-head").innerText(), /已完成/);
      await fits(p);
      passed++;
      console.log("PASS " + width + "px " + lesson.id + " · 插图、真实结果、反馈、迁移、进度");
    }
    assert.deepEqual(ai, []);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(passed + " 条中阶课程完整流程通过。");
} finally {
  await browser.close();
}
