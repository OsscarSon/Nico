// Run against the production preview, optionally setting BASE_URL and SCREENSHOT_DIR.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = process.env.SCREENSHOT_DIR ?? "test-results/f";
mkdirSync(out, { recursive: true });

const cases = [
  { id: "f01-circuits-current", quiz: [0, 1, 2], answer: "20", fields: { "电源电压（V）": "3", "第一段电阻（Ω）": "100", "第二段电阻（Ω）": "200", "开关": "closed" }, evidence: /当前电流 · 10 mA/ },
  { id: "f02-sensors-actuators", quiz: [1, 0, 2], answer: "2", fields: { "读取输入": "light", "控制输出": "lamp", "开关规则": "dual" }, evidence: /关 → 开 → 开 → 关/ },
  { id: "f03-arduino-intro", quiz: [0, 1, 2], answer: "1500" },
  { id: "f04-signals", quiz: [1, 0, 2], answer: "25", fields: { "ADC 参考电压（V）": "3.3", "输入电压（V）": "1.65", "PWM 每八拍的高电平数": "2" }, evidence: /10 位 ADC 读数 · 512/ },
  { id: "f05-read-sensors", quiz: [2, 0, 1], answer: "35", fields: { "读取策略": "median", "读数超时": "unknown" }, evidence: /超时为未知，恢复后 45/ },
  { id: "f06-motors-servos", quiz: [0, 1, 2], answer: "80", fields: { "模拟电机驱动": "on", "直流电机方向": "forward", "直流电机控制占空（%）": "60", "舵机目标角（°）": "90" }, evidence: /60%（有符号指令）/ },
  { id: "f07-uart-i2c", quiz: [1, 0, 2], answer: "2", fields: { "UART 接收端波特率": "9600", "I²C 目标地址": "2a", "I²C 读取寄存器": "01" }, evidence: /I²C 数据 · 42/ },
  { id: "f08-rover-project", quiz: [2, 0, 1], answer: "3" },
];

const button = (p, name) => p.getByRole("button", { name, exact: true });
const click = (p, name) => button(p, name).click();
const next = p => button(p, "下一步");
const choose = (p, label, value) => p.getByLabel(label, { exact: true }).selectOption(value);
const status = p => p.locator(".p3-lab").getByRole("status").first().innerText();
const output = (p, name) => p.getByRole("list", { name });
const fit = async p => {
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, p.url() + " 横向溢出 " + overflow + "px");
};
const locked = async p => {
  await click(p, "检查当前任务");
  assert.ok(await next(p).isDisabled());
  assert.ok(await button(p, "完成挑战").isDisabled());
};
async function fields(p, values) {
  for (const [key, value] of Object.entries(values)) await choose(p, key, value);
}

async function bench(p, row, mode, width) {
  if (width === 1440) await button(p, "运行实验").press("Enter");
  else await click(p, "运行实验");
  assert.match(await output(p, "实验结果").innerText(), /需调整/);
  if (mode) await locked(p);
  if (row.id === "f01-circuits-current") {
    await fields(p, { "开关": "closed", "第一段电阻（Ω）": "0", "第二段电阻（Ω）": "0" });
    await click(p, "运行实验");
    assert.match(await output(p, "实验结果").innerText(), /零总电阻/);
  }
  if (row.id === "f07-uart-i2c") {
    await fields(p, { "UART 接收端波特率": "9600", "I²C 目标地址": "2a" });
    await click(p, "运行实验");
    assert.match(await output(p, "实验结果").innerText(), /I²C 数据 · 17/);
  }
  await fields(p, row.fields);
  assert.equal(await output(p, "实验结果").count(), 0);
  await click(p, "运行实验");
  const text = await output(p, "实验结果").innerText();
  assert.match(text, row.evidence);
  assert.doesNotMatch(text, /需调整/);
  if (row.id === "f04-signals") assert.equal(await p.locator(".f-pwm .high").count(), 4);
}

async function arduino(p, mode) {
  const editor = p.getByRole("textbox", { name: "Arduino 教学代码", exact: true });
  const initial = await editor.inputValue();
  await click(p, "模拟运行两轮");
  assert.match(await output(p, "板载灯时间线").innerText(), /亮 · 持续 500ms/);
  if (mode) await locked(p);
  await editor.fill(initial.replace("OUTPUT", "INPUT"));
  await click(p, "模拟运行两轮");
  assert.ok(await p.getByText(/请在 setup 中/).isVisible());
  await editor.fill(initial.replace("delay(500);", "delay(250);").replace("delay(500);", "delay(750);"));
  await click(p, "模拟运行两轮");
  assert.match(await status(p), /一个周期 1000ms，两轮共 2000ms/);
  const timeline = await output(p, "板载灯时间线").locator("li").allTextContents();
  assert.deepEqual(timeline, ["0–250ms · 亮 · 持续 250ms", "250–1000ms · 灭 · 持续 750ms", "1000–1250ms · 亮 · 持续 250ms", "1250–2000ms · 灭 · 持续 750ms"]);
}

async function rover(p, mode, width) {
  await click(p, "跑完本场景");
  assert.match(await status(p), /通道受阻/);
  if (mode) await locked(p);
  await fields(p, { "场景": "second", "前方绕行门槛": "30", "绕行去向": "lower", "失效响应": "true" });
  await click(p, "跑完本场景");
  assert.match(await status(p), /通道受阻/);
  await fields(p, { "前方绕行门槛": "20", "场景": "first" });
  assert.equal(await output(p, "场景验收").getByText(/未验收/).count(), 3);
  if (width === 360) await button(p, "推进一步").tap();
  else await click(p, "推进一步");
  assert.match(await status(p), /行进中 · 位置 \(0, 2\)/);
  await click(p, "跑完本场景");
  assert.match(await status(p), /已抵达 · 位置 \(5, 2\)/);
  if (mode) await locked(p);
  await choose(p, "场景", "second");
  await click(p, "跑完本场景");
  await choose(p, "场景", "missing");
  await click(p, "跑完本场景");
  assert.match(await status(p), /安全停车 · 位置 \(1, 1\) · 无读数，停车/);
  const events = output(p, "场景验收").locator("li");
  assert.deepEqual(await events.allTextContents(), ["近障碍 · 已抵达", "晚出现的障碍 · 已抵达", "传感器失效 · 安全停车"]);
  if (!mode) return;
  const [exported] = await Promise.all([p.waitForEvent("download"), click(p, "导出验收 JSON")]);
  assert.equal(exported.suggestedFilename(), "nico-f08-rover-replay.json");
  const replay = JSON.parse(readFileSync(await exported.path(), "utf8"));
  assert.deepEqual(replay.rules, { threshold: 20, side: "lower", failsafe: true });
  assert.equal(replay.trials.first.status, "arrived");
  assert.equal(replay.trials.second.status, "arrived");
  assert.equal(replay.trials.missing.status, "parked");
  assert.deepEqual(replay.trials.missing.trace.at(-1), { x: 1, y: 1, distance: null, action: "无读数，停车" });
}

const browser = await chromium.launch();
let complete = 0;
try {
  await Promise.all([1440, 390, 360].map(async width => {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, hasTouch: width < 900 });
    const p = await context.newPage();
    p.setDefaultTimeout(16000);
    const errors = [];
    p.on("pageerror", error => errors.push(error.message));
    await p.goto(base + "/#/paths/f");
    await p.locator(".pathmap").waitFor();
    assert.equal(await p.locator("a.pm-card").count(), 8);
    assert.equal(await p.locator(".route-unit").count(), 2);
    for (const { id } of cases) assert.equal(await p.locator('a.pm-card[href="#/lesson/' + id + '"]').count(), 1);
    await fit(p);
    for (const row of cases) {
      const { id } = row;
      await p.goto(base + "/#/lesson/" + id);
      const art = p.locator(".lesson-art");
      await art.waitFor();
      assert.ok(await art.evaluate(async (img, file) => {
        await img.decode();
        const style = getComputedStyle(img);
        const rect = img.getBoundingClientRect();
        const body = img.closest(".lesson-body").getBoundingClientRect();
        return img.src.endsWith("/art/" + file) && img.naturalWidth === 1600 && img.naturalHeight === 900
          && style.objectFit === "contain" && style.objectPosition === "50% 50%" && Math.abs(rect.width / rect.height - 16 / 9) < .02
          && Math.abs(rect.left + rect.right - body.left - body.right) < 2;
      }, "lesson-" + id + ".png"));
      assert.equal(await p.locator("html").getAttribute("data-theme"), "dark");
      assert.equal(await p.locator(".pill.draft").count(), 1);
      await fit(p);
      if (width !== 360) await p.screenshot({ path: out + "/" + id + "-" + width + ".png" });
      for (let i = 0; i < 4; i++) await next(p).click();
      assert.equal(await p.locator(".device header .pill").innerText(), "模拟");
      const play = mode => row.fields ? bench(p, row, mode, width) : id === "f03-arduino-intro" ? arduino(p, mode) : rover(p, mode, width);
      await play(false);
      await fit(p);
      await next(p).click();
      await locked(p);
      await play(true);
      await click(p, "检查当前任务");
      await click(p, "完成挑战");
      await fit(p);
      if (width === 390 && id === "f08-rover-project") {
        await output(p, "场景验收").evaluate(el => el.scrollIntoView({ block: "center" }));
        await p.screenshot({ path: out + "/f08-rover-result-390.png" });
      }
      await next(p).click();
      for (const [index, right] of row.quiz.entries()) {
        await p.locator(".option").nth((right + 1) % 3).click();
        assert.ok((await p.locator(".feedback.bad").innerText()).length > 4);
        await p.locator(".option").nth(right).click();
        await click(p, index === 2 ? "完成检查" : "下一题");
      }
      await next(p).click();
      const field = p.getByLabel("你的答案（一个整数）");
      await field.fill("999");
      await click(p, "检查答案");
      assert.ok(await next(p).isDisabled());
      await field.fill(row.answer);
      await click(p, "检查答案");
      await next(p).click();
      assert.equal(await p.locator(".foundation-sources a").count(), 2);
      const saved = await p.evaluate(id => JSON.parse(localStorage.getItem("nico-progress")).lessons[id], id);
      assert.equal(saved.quizTotal, 4);
      assert.equal(saved.firstTryCorrect, 0);
      await p.reload();
      assert.match(await p.locator(".lesson-head").innerText(), /已完成/);
      await fit(p);
      complete++;
      console.log("PASS " + width + "px " + id + " · 开场、实验、故障、判分、迁移、进度");
    }
    assert.deepEqual(errors, []);
    await context.close();
  }));
  console.log(complete + " 条 Foundation F 完整流程通过。");
} finally {
  await browser.close();
}
