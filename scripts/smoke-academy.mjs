// Academy P0：真实浏览器、主题与旧进度兼容；不改写课程或判分逻辑。
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SCREENSHOT_DIR ?? "test-results/academy";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const failures = [];
let checks = 0;
const check = (name, ok) => {
  checks++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failures.push(name);
};
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const ready = async page => {
  await page.locator(".academy-course, .academy-stage, .settings-list").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
};
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, colorScheme: "light" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${BASE}/#/`);
    await ready(page);
    check(`${width}: 系统亮色时首次访问仍默认暗色`, await page.locator("html").getAttribute("data-theme") === "dark");
    check(`${width}: 背景为深蓝`, await page.locator("body").evaluate(el => getComputedStyle(el).backgroundColor) === "rgb(14, 20, 32)");
    check(`${width}: 新用户没有虚构进度`, await page.locator(".stats").count() === 0);
    check(`${width}: 首页无横向溢出`, await noOverflow(page));
    await page.screenshot({ path: `${OUT}/after-home-${width}.png` });
    await page.screenshot({ path: `${OUT}/after-home-full-${width}.png`, fullPage: true });
    check(`${width}: 首页不再重复路线列表`, await page.locator(".academy-track").count() === 0 && await page.locator(".academy-stage").count() === 3);
    await page.getByRole("button", { name: "探索学习路线 ↗" }).click();
    await page.waitForFunction(() => window.location.hash === "#/paths");
    await page.locator("#academy-tracks").waitFor();
    check(`${width}: Hero 按钮进入路线页`, new URL(page.url()).hash === "#/paths");
    const sources = await page.locator(".academy-track img").evaluateAll(images => images.map(i => new URL(i.src).pathname.split("/").pop()));
    check(`${width}: 六张路线图片（A–F）都加载且路径正确`, JSON.stringify(sources) === JSON.stringify(["track-a-network.png", "track-b-code.png", "track-c-ai.png", "track-d-games.png", "track-e-google.png", "track-f-hardware.png"])
      && await page.locator(".academy-track img").evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0)));
    check(`${width}: Foundation 只显示六条路线`, await page.locator(".academy-track").count() === 6);
    await page.getByRole("button", { name: /PHASE 02/ }).click();
    await page.getByRole("button", { name: /PHASE 02/ }).and(page.locator('[aria-pressed="true"]')).waitFor();
    check(`${width}: Intermediate 有七条路线`, await page.locator(".academy-track").count() === 7);
    check(`${width}: 七条路线都有插画，无占位`, await page.locator(".art-placeholder").count() === 0 && await page.locator(".academy-track img").count() === 7);
    await page.getByRole("button", { name: /M · 数学基础/ }).click();
    await page.getByRole("button", { name: /M · 数学基础/ }).and(page.locator('[aria-pressed="true"]')).waitFor();
    check(`${width}: 中阶数学两门`, await page.locator(".academy-course").count() === 2);
    await page.getByRole("button", { name: /PHASE 03/ }).click();
    await page.getByRole("button", { name: /PHASE 03/ }).and(page.locator('[aria-pressed="true"]')).waitFor();
    check(`${width}: 进阶保留选中 M，显示三门`, await page.locator(".academy-course").count() === 3);
    await page.getByRole("button", { name: /F · 硬件与机器人/ }).click();
    await page.getByRole("button", { name: /F · 硬件与机器人/ }).and(page.locator('[aria-pressed="true"]')).waitFor();
    check(`${width}: F 精选四门且无学习链接`, await page.locator(".academy-course .course-tag.flagship").count() === 4 && await page.locator(".academy-course a").count() === 0);
    await page.locator(".academy-course summary").first().click();
    check(`${width}: 规划详情诚实说明尚未开放`, await page.locator("details[open]").innerText().then(t => t.includes("尚未开放")));
    check(`${width}: 长英文标题与展开详情无横向溢出`, await noOverflow(page));
    await page.goto(`${BASE}/#/paths`); await ready(page);
    check(`${width}: 路线页不带搜索框`, await page.getByRole("searchbox").count() === 0);
    await page.goto(`${BASE}/#/courses`); await ready(page);
    check(`${width}: 课程页不显示路线卡片`, await page.locator(".academy-track").count() === 0);
    const search = page.getByRole("searchbox", { name: "搜索课程标题或编号" });
    await search.fill(" a01 ");
    check(`${width}: 编号搜索`, await page.locator(".academy-course").count() === 1 && await page.locator(".academy-course a").getAttribute("href") === "#/lesson/a01-binary");
    await page.getByLabel("筛选课程状态").selectOption("planned");
    check(`${width}: 搜索与状态筛选可组合`, await page.getByText("没有符合条件的课程", { exact: true }).isVisible());
    await page.getByRole("button", { name: "清除搜索与筛选" }).click();
    await page.getByRole("button", { name: "全部", exact: true }).click();
    await page.getByLabel("筛选课程状态").selectOption("live");
    check(`${width}: 课程分页先显示30门且结果总数41`, await page.locator(".academy-course a").count() === 30 && (await page.locator(".academy-result-count").innerText()).includes("41"));
    await page.getByRole("button", { name: /^显示更多/ }).click();
    check(`${width}: 跨阶段查找全部41个真实入口`, await page.locator(".academy-course a").count() === 41);
    await search.fill("B01");
    check(`${width}: B01 保留旧课程地址`, await page.locator(".academy-course a").getAttribute("href") === "#/lesson/b01-variables");
    await search.fill("c05");
    check(`${width}: C05 保留旧课程地址`, await page.locator(".academy-course a").getAttribute("href") === "#/lesson/c05-prompt-structure");
    await page.goto(`${BASE}/#/settings`); await ready(page);
    check(`${width}: 右上角不再有主题按钮`, await page.locator(".academy-topbar button").count() === 0);
    await page.getByRole("button", { name: "亮色", exact: true }).click();
    await page.reload(); await ready(page);
    check(`${width}: 亮色主动选择刷新后保留`, await page.locator("html").getAttribute("data-theme") === "light");
    check(`${width}: 亮色无横向溢出`, await noOverflow(page));
    await page.getByRole("button", { name: "暗色", exact: true }).click();
    await page.reload(); await ready(page);
    check(`${width}: 暗色选择刷新后保留`, await page.locator("html").getAttribute("data-theme") === "dark");
    await page.goto(`${BASE}/#/paths`); await ready(page);
    const stageButton = page.getByRole("button", { name: /PHASE 02/ });
    await stageButton.focus();
    check(`${width}: 键盘焦点可见`, await stageButton.evaluate(el => getComputedStyle(el).outlineStyle !== "none"));
    await page.keyboard.press("Enter");
    await stageButton.and(page.locator('[aria-pressed="true"]')).waitFor();
    check(`${width}: 键盘可切换阶段`, await stageButton.getAttribute("aria-pressed") === "true");
    await page.goto(`${BASE}/#/paths`); await ready(page);
    await page.locator("#academy-tracks").evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.screenshot({ path: `${OUT}/after-tracks-${width}.png` });
    await page.locator(".academy-course-panel").evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.screenshot({ path: `${OUT}/after-courses-${width}.png` });
    for (const path of ["/paths/a", "/paths/b", "/paths/c", "/lesson/a01-binary", "/lesson/b01-variables", "/lesson/c05-prompt-structure", "/lab", "/lab/prompt", "/lab/tutor", "/projects", "/me"]) {
      await page.goto(`${BASE}/#${path}`);
      await page.locator("h1,h2").first().waitFor();
      check(`${width}: 旧入口 ${path} 无溢出且非空`, await noOverflow(page) && (await page.locator("main").innerText()).length > 30);
    }
    if (width < 900) {
      const bottom = page.getByRole("navigation", { name: "主导航（手机）" });
      check(`${width}: 手机底栏有五个可见入口`, await bottom.locator("a:visible").count() === 5);
      for (const [label, hash] of [["首页", "#/"], ["路线", "#/paths"], ["课程", "#/courses"], ["设置", "#/settings"], ["我的", "#/me"]]) {
        await bottom.getByRole("link", { name: label, exact: true }).click();
        await page.waitForURL(url => url.hash === hash);
        check(`${width}: 底栏 ${label} 可用`, new URL(page.url()).hash === hash);
      }
      await page.getByRole("heading", { name: "学习工具", exact: true }).waitFor();
      check(`${width}: 实验台和作品在手机仍可访问`, await page.getByRole("link", { name: "打开实验台", exact: true }).isVisible() && await page.getByRole("link", { name: "查看作品", exact: true }).isVisible());
      await page.getByRole("link", { name: "查看作品", exact: true }).scrollIntoViewIfNeeded();
      const linkRect = await page.getByRole("link", { name: "查看作品", exact: true }).boundingBox();
      const navRect = await bottom.boundingBox();
      check(`${width}: 页面末尾操作不被底栏遮挡`, linkRect.y + linkRect.height <= navRect.y);
    }
    check(`${width}: 无浏览器 JS 异常`, errors.length === 0);
    await context.close();
  }
  // A09/A10/A13 的既有互动在两套主题、360px 下仍可操作。
  const networkContext = await browser.newContext({ viewport: { width: 360, height: 844 } });
  const networkPage = await networkContext.newPage();
  for (const theme of ["dark", "light"]) {
    await networkPage.goto(`${BASE}/#/`);
    await networkPage.evaluate(value => localStorage.setItem("nico-theme", value), theme);
    for (const id of ["a09-network-layers", "a10-ip-subnet", "a13-dns"]) {
      await networkPage.goto(`${BASE}/#/lesson/${id}`);
      await networkPage.reload();
      for (let i = 0; i < 12 && await networkPage.locator(".device").count() === 0; i++) {
        await networkPage.getByRole("button", { name: "下一步", exact: true }).click();
      }
      if (id.startsWith("a09")) {
        const before = await networkPage.locator(".frames-total").innerText();
        await networkPage.getByRole("button", { name: "下一阶段", exact: true }).click();
        check(`${theme}: A09 封装模拟可操作`, await networkPage.locator(".frames-total").innerText() !== before);
      } else if (id.startsWith("a10")) {
        await networkPage.getByRole("textbox", { name: "IP 地址", exact: true }).fill("192.168.2.10");
        check(`${theme}: A10 子网计算器更新`, (await networkPage.locator(".ip-table").innerText()).includes("192.168.2.0"));
      } else {
        await networkPage.getByRole("button", { name: "查 www.example.com", exact: true }).click();
        const before = await networkPage.locator(".dns-step").count();
        await networkPage.getByRole("button", { name: "下一个回应", exact: true }).click();
        check(`${theme}: A13 DNS 模拟可操作`, await networkPage.locator(".dns-step").count() > before);
      }
      check(`${theme}: ${id} 互动无溢出`, await noOverflow(networkPage));
      if (theme === "dark") await networkPage.screenshot({ path: `${OUT}/after-${id}-360.png` });
    }
  }
  await networkContext.close();
  const preferenceContext = await browser.newContext();
  await preferenceContext.addInitScript(() => localStorage.setItem("nico-settings", '{"font":"large","theme":"light"}'));
  const preferencePage = await preferenceContext.newPage();
  await preferencePage.goto(`${BASE}/#/`); await ready(preferencePage);
  check("保留旧用户亮色与大字号偏好", await preferencePage.locator("html").evaluate(el => el.dataset.theme === "light" && el.dataset.font === "large"));
  await preferenceContext.close();
  const saved = {
    schemaVersion: 1,
    lessons: { "a01-binary": { completedAt: "2026-11-15T10:00:00.000Z", firstTryCorrect: 3, quizTotal: 4 } },
    resume: { lessonId: "b01-variables", step: 2 }, activeDays: ["2026-11-15"],
  };
  const context = await browser.newContext();
  await context.addInitScript(value => { if (!localStorage.getItem("nico-progress")) localStorage.setItem("nico-progress", value); }, JSON.stringify(saved));
  const page = await context.newPage();
  await page.goto(`${BASE}/#/`); await ready(page);
  check("原进度：首页显示真实已完成1课", await page.locator(".stats .stat strong").first().innerText() === "1");
  check("原进度：首页继续上次 B01", await page.locator(".today").innerText().then(t => t.includes("继续上次的位置") && t.includes("变量")));
  await page.goto(`${BASE}/#/paths`); await ready(page);
  await page.getByRole("button", { name: /PHASE 03/ }).click();
  await page.getByRole("button", { name: /PHASE 03/ }).and(page.locator('[aria-pressed="true"]')).waitFor();
  await page.goto(`${BASE}/#/settings`); await ready(page);
  await page.getByRole("button", { name: "亮色", exact: true }).click();
  check("浏览目录/切换主题不写入或迁移学习进度", await page.evaluate(() => localStorage.getItem("nico-progress")) === JSON.stringify(saved));
  await page.goto(`${BASE}/#/`); await ready(page);
  await page.getByRole("link", { name: "继续这一课", exact: true }).click();
  await page.locator('.steps li[aria-current="step"]').waitFor({ state: "attached" });
  check("原进度：B01 从旧步骤续学", await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")).resume.step) === 2);
  check("原进度：已完成成绩和版本不变", await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("nico-progress")); return p.schemaVersion === 1 && p.lessons["a01-binary"].firstTryCorrect === 3; }));
  await context.close();
} finally { await browser.close(); }
console.log(`${checks} 项检查，${failures.length} 项失败`);
if (failures.length) process.exitCode = 1;
