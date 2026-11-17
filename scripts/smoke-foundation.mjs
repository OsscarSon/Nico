// P1：三个完整学习流程、真实状态挑战、诊断、成绩持久化与响应式。
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SCREENSHOT_DIR ?? "test-results/foundation";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let checks = 0;
const failures = [];
function check(name, ok) { checks++; console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failures.push(name); }
const ids = ["a06-memory", "a07-os", "a08-command-line"];
const nextIds = ["a07-os", "a08-command-line", "a09-network-layers"];
const answers = [[1, 0, 2], [1, 0, 2], [2, 0, 1]];
const transfers = [1, 4, 2];
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const next = page => page.getByRole("button", { name: "下一步", exact: true });
const click = (page, name) => page.getByRole("button", { name, exact: true }).click();
async function command(page, line) { await page.getByRole("textbox", { name: "输入命令", exact: true }).fill(line); await click(page, "运行命令"); }
async function solve(page, index) {
  if (index === 0) {
    for (const name of ["打开文档", "改为修改稿", "保存文档", "断电重启", "打开文档", "读取工作副本", "读取工作副本"]) await click(page, name);
  } else if (index === 1) {
    for (const name of ["调度浏览器", "请求 I/O浏览器", "调度编辑器", "CPU 推进一步", "写入所选文件"]) await click(page, name);
    await page.getByLabel("编辑器写入目标").selectOption("system");
    await click(page, "写入所选文件");
    check("A07 只读写入有明确诊断", (await page.locator(".foundation-note").innerText()).includes("权限拒绝"));
  } else {
    for (const line of ["pwd", "mkdir practice", "cp README.txt practice/note.txt", "cd practice", "cat note.txt"]) await command(page, line);
  }
  await click(page, "检查任务");
}
try {
  const saved = { schemaVersion: 1, lessons: { "a01-binary": { completedAt: "2026-11-15T10:00:00.000Z", firstTryCorrect: 3, quizTotal: 4 } }, resume: null, activeDays: ["2026-11-15"] };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
  await ctx.addInitScript(value => { if (!localStorage.getItem("nico-progress")) localStorage.setItem("nico-progress", value); }, JSON.stringify(saved));
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index]; await page.goto(`${BASE}/#/lesson/${id}`); await page.locator(".hook").waitFor();
    check(`${id} 默认暗色与草稿标记`, await page.locator("html").getAttribute("data-theme") === "dark" && await page.locator(".pill.draft").count() === 1);
    check(`${id} 插画加载且没有待补占位`, await page.locator(".lesson-art").evaluate(el => el.complete && el.naturalWidth > 0) && await page.locator(".foundation-art-pending").count() === 0);
    await page.screenshot({ path: `${OUT}/${id}-hook-390.png` });
    for (let i = 0; i < 4; i++) await next(page).click();
    check(`${id} 自由互动有模拟标记`, (await page.locator(".device header .pill").innerText()) === "模拟");
    if (index === 0) {
      for (const name of ["打开文档", "改为修改稿", "断电重启", "打开文档"]) await click(page, name);
      check("A06 未保存修改丢失", (await page.locator(".foundation-memory dd").allTextContents()).join("|") === "空|原稿|原稿");
    } else if (index === 1) {
      await click(page, "写入所选文件");
      check("A07 编辑器没有 CPU 时不能写入", (await page.locator(".foundation-note").innerText()).includes("先获得 CPU"));
    } else {
      await command(page, "cat missing");
      check("A08 不存在文件显示诊断", (await page.locator(".foundation-note").innerText()).includes("文件不存在"));
      await command(page, "ls | cat");
      check("A08 拒绝组合命令", (await page.locator(".foundation-note").innerText()).includes("未支持的管道"));
      await command(page, "pwd");
      check("A08 出错后当前位置保持", (await page.locator(".foundation-note").innerText()).includes("/home/nico"));
    }
    check(`${id} 自由实验无溢出`, await noOverflow(page));
    await page.screenshot({ path: `${OUT}/${id}-free-390.png` });
    await next(page).click();
    check(`${id} 挑战初始门控`, await next(page).isDisabled());
    await click(page, "检查任务");
    check(`${id} 空操作无法通过且给出任务诊断`, await next(page).isDisabled() && (await page.locator(".feedback").innerText()).includes("还有任务未完成"));
    await page.reload(); await page.locator(".foundation-goals").waitFor();
    check(`${id} 续学回到挑战且需重新完成`, await next(page).isDisabled() && await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")).resume.step) === 5);
    await solve(page, index);
    check(`${id} 实际状态达标解除门控`, await next(page).isEnabled());
    check(`${id} 挑战成功后锁定操作`, await page.getByRole("button", { name: "检查任务", exact: true }).isDisabled());
    check(`${id} 挑战无溢出`, await noOverflow(page));
    await page.screenshot({ path: `${OUT}/${id}-challenge-390.png` });
    await next(page).click();
    for (let q = 0; q < 3; q++) {
      if (q === 0) {
        await page.locator(".option").nth(0).click();
        check(`${id} 检查题错误有诊断且门控未解除`, await next(page).isDisabled() && (await page.locator(".feedback.bad").innerText()).length > 12);
      }
      await page.locator(".option").nth(answers[index][q]).click();
      await click(page, q < 2 ? "下一题" : "完成检查");
    }
    check(`${id} 检查题成绩真实`, (await page.locator(".feedback").innerText()).includes("2 / 3"));
    await next(page).click();
    const input = page.getByRole("textbox", { name: "你的答案（一个整数）" });
    await input.fill("不确定"); await click(page, "检查答案");
    check(`${id} 迁移题拒绝无效输入`, (await page.locator(".feedback").innerText()).includes("请输入一个整数"));
    await input.fill(String(transfers[index] + 1)); await click(page, "检查答案");
    check(`${id} 迁移题答错仍有门控`, await next(page).isDisabled());
    await input.fill(String(transfers[index])); await click(page, "检查答案");
    await next(page).click();
    check(`${id} 三点小结与真实来源`, await page.locator(".points li").count() === 3 && await page.locator(".foundation-sources a").count() >= 2);
    check(`${id} 下一课正确`, await page.getByRole("link", { name: "下一课", exact: true }).getAttribute("href") === `#/lesson/${nextIds[index]}`);
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")));
    check(`${id} 完成与首次成绩保存`, progress.lessons[id]?.firstTryCorrect === 2 && progress.lessons[id]?.quizTotal === 4);
    check(`${id} 旧成绩和 schema 不变`, progress.schemaVersion === 1 && JSON.stringify(progress.lessons["a01-binary"]) === JSON.stringify(saved.lessons["a01-binary"]));
  }
  check("完整学习流程无 JS 异常", errors.length === 0);
  await page.goto(`${BASE}/#/paths/a`); await page.locator(".pm-card").first().waitFor();
  check("PathMap 可学20门、规划0门", await page.locator(".pm-card.planned").count() === 0 && await page.locator("a.pm-card").count() === 20);
  await ctx.close();
  for (const width of [1440, 360]) for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 } });
    await context.addInitScript(value => localStorage.setItem("nico-theme", value), theme);
    const p = await context.newPage();
    for (let i = 0; i < ids.length; i++) {
      await p.goto(`${BASE}/#/lesson/${ids[i]}`); await p.locator(".hook").waitFor();
      for (let step = 0; step < 5; step++) await next(p).click();
      await solve(p, i);
      check(`${width}/${theme}/${ids[i]} 挑战可操作、通过且不溢出`, await next(p).isEnabled() && await noOverflow(p));
      await p.screenshot({ path: `${OUT}/${ids[i]}-${theme}-${width}.png` });
    }
    await context.close();
  }
} finally { await browser.close(); }
console.log(`${checks} 项检查，${failures.length} 项失败`);
if (failures.length) process.exitCode = 1;
