// Real UI only: all protocol state and challenge evidence comes from user-operable controls.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SCREENSHOT_DIR ?? "test-results/web";
mkdirSync(OUT, { recursive: true });
const ids = ["a15-udp", "a16-http-https", "a17-web-journey"];
const answers = [[1, 0, 2], [0, 2, 1], [0, 1, 2]], transfers = [112, 2000, 1];
const browser = await chromium.launch(); const failures = []; let checks = 0;
const check = (label, ok) => { checks++; console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failures.push(label); };
// Inactive protocol panels are collapsed: inspect their disabled controls too.
// Playwright click/tap still require visibility; no hidden controls are forced.
const button = (p, text) => p.getByRole("button", { name: text, exact: true, includeHidden: true });
const click = (p, text) => button(p, text).click();
const next = p => button(p, "下一步");
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
async function open(p, title) { const summary = p.getByText(title, { exact: true }); if (await summary.locator("..").getAttribute("open") === null) await summary.click(); }
async function pumpTcp(p) {
  let guard = 0;
  while (await p.locator(".web-tcp .net-channel > li").count() && guard++ < 30) {
    const id = await p.locator(".web-tcp .net-channel > li").first().getAttribute("data-id");
    if (await button(p, `投递 TCP 报文 ${id}`).isDisabled()) throw Error("TCP packet still delayed");
    await click(p, `投递 TCP 报文 ${id}`);
  }
  if (guard >= 30) throw Error("TCP did not drain");
}
async function tls(p) { for (const label of ["发送 ClientHello", "接收服务器握手", "核验服务器身份与证明", "完成 Finished"]) await click(p, label); }
async function http(p) { for (const label of ["发送 HTTP 请求", "服务器处理请求", "接收 HTTP 响应"]) await click(p, label); }
async function dns(p) {
  let guard = 0; while (await button(p, "处理下一条 DNS 消息").isEnabled() && guard++ < 20) await click(p, "处理下一条 DNS 消息");
  if (guard >= 20) throw Error("DNS did not complete");
}
async function startVisit(p, url) { if (url) await p.getByLabel("访问网址", { exact: true }).fill(url); await click(p, "开始本次访问"); await dns(p); }
async function connection(p) { await click(p, "启动 TCP 握手"); await pumpTcp(p); }
async function website(p, url, label) {
  await startVisit(p, url); await connection(p); await tls(p); await http(p);
  if (label) { await click(p, "检查当前任务"); check(`${label}收到响应但未显示不能通过`, await button(p, "下一任务").count() ? await button(p, "下一任务").isDisabled() : await button(p, "完成挑战").isDisabled()); }
  await click(p, "从响应显示页面");
}
async function checked(p, task, label) {
  await click(p, "检查当前任务"); const action = task === 2 ? "完成挑战" : "下一任务";
  check(`${label}真实状态通过`, await button(p, action).isEnabled()); check(`${label}无横向溢出`, !(await overflow(p))); await click(p, action);
}
async function emptyCheck(p, task, label) { await click(p, "检查当前任务"); check(`${label}空操作不能通过`, await button(p, task === 2 ? "完成挑战" : "下一任务").isDisabled()); }
async function udp(p, prefix) {
  for (let task = 0; task < 3; task++) {
    const label = `${prefix}/A15任务${task + 1}`; await emptyCheck(p, task, label);
    if (task < 2) {
      if (task === 1) await p.getByRole("combobox", { name: "应用显示策略", exact: true }).selectOption("fresh");
      for (let n = 0; n < 3; n++) await click(p, "发送下一份 UDP 快照");
      if (task === 0) {
        await click(p, "丢弃 UDP 数据报 2"); await click(p, "投递 UDP 数据报 3"); await click(p, "投递 UDP 数据报 1");
        check(`${label}实际画面倒退到10`, (await p.getByLabel("UDP画面位置").innerText()).includes("位置10"));
      } else {
        await click(p, "投递 UDP 数据报 3"); await click(p, "投递 UDP 数据报 2"); await click(p, "延迟 UDP 数据报 1"); await click(p, "延迟 UDP 数据报 1");
        check(`${label}延迟中不能立即投递`, await button(p, "投递 UDP 数据报 1").isDisabled());
        for (let n = 0; n < 4; n++) await click(p, "推进 UDP 逻辑时钟"); await click(p, "投递 UDP 数据报 1");
        check(`${label}保留30并记录旧/过期拒绝`, (await p.getByLabel("UDP画面位置").innerText()).includes("位置30") && (await p.locator(".udp-lab").innerText()).includes("应用拒绝旧编号") && (await p.locator(".udp-lab").innerText()).includes("应用拒绝过期"));
      }
    } else {
      await connection(p); await click(p, "TCP 发送下一段"); const id = await p.locator('.web-tcp li[data-kind="DATA"]').getAttribute("data-id"); await click(p, `丢弃 TCP 报文 ${id}`);
      check(`${label}上一段未确认不能发下一段`, await button(p, "TCP 发送下一段").isDisabled());
      for (let n = 0; n < 3; n++) await click(p, "推进 TCP 逻辑时钟"); await click(p, "TCP 客户端超时重传"); await pumpTcp(p);
      for (let n = 0; n < 2; n++) { await click(p, "TCP 发送下一段"); await pumpTcp(p); }
      check(`${label}原字节流仅交付一次`, (await p.getByLabel("TCP服务器状态").innerText()).includes("10|20|30|") && (await p.getByLabel("TCP客户端状态").innerText()).includes("9/9"));
    }
    await checked(p, task, label);
  }
}
async function httpLab(p, prefix) {
  for (let task = 0; task < 3; task++) {
    const label = `${prefix}/A16任务${task + 1}`; await emptyCheck(p, task, label);
    if (task === 0) {
      await http(p); check(`${label}服务器真实404`, await p.getByLabel("HTTP响应", { exact: true }).getAttribute("data-status") === "404");
      await p.getByRole("textbox", { name: "请求路径", exact: true }).fill("/lesson"); await http(p);
    } else if (task === 1) {
      await http(p); check(`${label}错误媒体类型415`, await p.getByLabel("HTTP响应", { exact: true }).getAttribute("data-status") === "415");
      await p.getByRole("textbox", { name: "请求Headers", exact: true }).fill("Host: www.example.com\nContent-Type: application/json"); await p.getByRole("textbox", { name: "JSON请求体", exact: true }).fill("{broken"); await http(p);
      check(`${label}非法JSON实际400`, await p.getByLabel("HTTP响应", { exact: true }).getAttribute("data-status") === "400");
      await p.getByRole("textbox", { name: "JSON请求体", exact: true }).fill('{"note":"真实创建"}'); await http(p);
      check(`${label}实际201且只有一条创建记录`, await p.getByLabel("HTTP响应", { exact: true }).getAttribute("data-status") === "201" && (await p.locator(".http-lab").innerText()).includes("服务器记录：1条"));
    } else {
      for (const name of ["发送 ClientHello", "接收服务器握手", "核验服务器身份与证明"]) await click(p, name);
      check(`${label}错误身份阻止Finished`, await button(p, "完成 Finished").isDisabled()); await click(p, "发送 HTTP 请求");
      check(`${label}错误身份不能发送HTTP`, await button(p, "服务器处理请求").isDisabled() && (await p.locator(".http-lab > .net-note").innerText()).includes("HTTPS需要"));
      await p.getByRole("combobox", { name: "服务器证书情景", exact: true }).selectOption("valid"); await click(p, "重建 TLS 会话"); await tls(p); await http(p);
      check(`${label}观察者看到TLS保护状态`, (await p.getByLabel("网络观察者视角").innerText()).includes("TLS受保护"));
    }
    await checked(p, task, label);
  }
}
async function journey(p, prefix) {
  for (let task = 0; task < 3; task++) {
    const label = `${prefix}/A17情景${task + 1}`; await emptyCheck(p, task, label);
    if (task === 0) {
      await startVisit(p); check(`${label}旧缓存实际返回错误地址`, (await p.getByLabel("访问协议状态").innerText()).includes("203.0.113.99"));
      await click(p, "启动 TCP 握手"); await click(p, "投递 TCP 报文 1");
      check(`${label}旧地址没有伪造服务器响应`, (await p.getByLabel("TCP服务器状态").innerText()).includes("LISTEN") && await button(p, "发送 ClientHello").isDisabled());
      await open(p, "DNS：缓存、查询与实际目标"); await click(p, "清除 DNS 答案缓存");
      check(`${label}清缓存不会魔法改写已有地址`, (await p.getByLabel("访问协议状态").innerText()).includes("203.0.113.99"));
      await website(p, undefined, label);
      check(`${label}复用区指引只问权威一次`, (await p.locator(".journey-lab").innerText()).includes("累计外部DNS查询1次"));
    } else if (task === 1) {
      await startVisit(p); await click(p, "启动 TCP 握手"); await click(p, "投递 TCP 报文 1"); await click(p, "投递 TCP 报文 2"); await click(p, "丢弃 TCP 报文 3");
      check(`${label}最后ACK丢失时两端状态不同`, (await p.getByLabel("TCP客户端状态").innerText()).includes("ESTABLISHED") && (await p.getByLabel("TCP服务器状态").innerText()).includes("SYN-RECEIVED"));
      for (let n = 0; n < 3; n++) await click(p, "推进 TCP 逻辑时钟"); await click(p, "TCP 服务器超时重传"); await pumpTcp(p); await tls(p); await http(p); await click(p, "从响应显示页面");
    } else {
      await website(p); check(`${label}从真实404显示错误页`, await p.getByLabel("实际页面预览").getAttribute("data-status") === "404");
      await click(p, "检查当前任务"); check(`${label}404不当作成功`, await button(p, "完成挑战").isDisabled());
      await website(p, "https://www.example.com/lesson", label);
      check(`${label}改路径沿用有效DNS答案`, (await p.locator(".journey-lab").innerText()).includes("累计外部DNS查询3次"));
    }
    check(`${label}页面来自200响应`, await p.getByLabel("实际页面预览").getAttribute("data-status") === "200" && (await p.getByLabel("实际页面预览").innerText()).includes("Nico Academy"));
    await checked(p, task, label);
  }
}
const solvers = [udp, httpLab, journey];
async function navigate(p, id, steps) { await p.goto(`${BASE}/#/lesson/${id}`); await p.locator(".hook").waitFor(); for (let n = 0; n < steps; n++) await next(p).click(); }
async function shots(p, id, label) {
  await p.locator(".net-lab").evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" })); await p.screenshot({ path: `${OUT}/${id}-${label}.png` }); await p.screenshot({ path: `${OUT}/${id}-${label}-full.png`, fullPage: true });
  if (id === "a17-web-journey") { await p.getByLabel("实际页面预览").scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${id}-${label}-result.png` }); }
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
  const saved = { schemaVersion: 1, lessons: { "a01-binary": { completedAt: "2026-11-15T10:00:00.000Z", firstTryCorrect: 3, quizTotal: 4 } }, resume: null, activeDays: ["2026-11-15"] };
  await context.addInitScript(value => { if (!localStorage.getItem("nico-progress")) localStorage.setItem("nico-progress", value); }, JSON.stringify(saved));
  const page = await context.newPage(); const errors = []; page.on("pageerror", e => errors.push(e.message));
  for (let course = 0; course < ids.length; course++) {
    const id = ids[course]; await navigate(page, id, 0);
    check(`${id} 默认深色、draft、正式插画占位`, await page.locator("html").getAttribute("data-theme") === "dark" && await page.locator(".pill.draft").count() === 1 && await page.locator(".foundation-art-pending").count() === 1 && await page.locator(".lesson-art").count() === 0);
    await page.screenshot({ path: `${OUT}/${id}-hook-390.png` });
    for (let n = 0; n < 5; n++) await next(page).click();
    check(`${id} 自由实验标模拟`, (await page.locator(".device header .pill").innerText()) === "模拟");
    if (course === 0) {
      await page.getByLabel("三个位置（逗号分隔）").fill("bad"); await click(page, "生成位置实验"); check("A15无效位置有诊断", (await page.locator(".feedback.bad").innerText()).includes("整数"));
      await page.getByLabel("三个位置（逗号分隔）").fill("11,22,33"); await click(page, "生成位置实验"); await click(page, "发送下一份 UDP 快照"); await click(page, "丢弃 UDP 数据报 1"); await click(page, "应用重发缺失编号 1"); await click(page, "投递 UDP 数据报 2");
      check("A15应用实际补偿缺失记录", (await page.getByLabel("UDP画面位置").innerText()).includes("位置11") && (await page.locator(".udp-lab").innerText()).includes("#1=11"));
      await click(page, "重置实验"); check("A15重置同时恢复位置输入与实际状态", await page.getByLabel("三个位置（逗号分隔）").inputValue() === "10,20,30" && (await page.getByLabel("UDP画面位置").innerText()).includes("尚无"));
    } else if (course === 1) {
      await page.getByRole("combobox", { name: "访问协议", exact: true }).selectOption("https"); await click(page, "发送 HTTP 请求"); check("A16不能仅切换https就发请求", await button(page, "服务器处理请求").isDisabled()); await tls(page); await http(page);
      check("A16自由实验收到真实安全200", await page.getByLabel("HTTP响应", { exact: true }).getAttribute("data-status") === "200");
    } else {
      await page.getByLabel("访问网址").fill("ftp://www.example.com/lesson"); await click(page, "开始本次访问"); check("A17拒绝非教学URL协议", (await page.locator(".journey-lab > .net-note").innerText()).includes("默认端口"));
      await startVisit(page, "https://unknown.example.com/lesson"); check("A17未知域名不伪造连接", await button(page, "启动 TCP 握手").isDisabled() && (await page.getByLabel("访问协议状态").innerText()).includes("未找到名字"));
      await website(page, "https://www.example.com/lesson"); check("A17自由实验串联至实际页面", await page.getByLabel("实际页面预览").getAttribute("data-status") === "200");
    }
    await next(page).click(); check(`${id} 操作挑战门控`, await next(page).isDisabled());
    if (course === 0) await click(page, "发送下一份 UDP 快照"); else if (course === 1) await click(page, "发送 HTTP 请求"); else await click(page, "开始本次访问");
    await page.reload(); await page.locator(".net-lab").waitFor(); const resume = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")).resume);
    check(`${id}刷新续学保留步骤且挑战需真实重做`, resume.lessonId === id && resume.step === 6 && await next(page).isDisabled());
    await solvers[course](page, "390/dark"); check(`${id}九任务完成后才解锁检查`, await next(page).isEnabled()); await shots(page, id, "dark-390");
    await next(page).evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" })); const rect = await next(page).boundingBox(), nav = await page.locator(".bottomnav").boundingBox(); check(`${id}下一步不被底栏遮挡`, rect.y + rect.height <= nav.y);
    await next(page).click();
    for (let q = 0; q < 3; q++) {
      if (q === 0) { await page.locator(".option").nth((answers[course][q] + 1) % 3).click(); check(`${id}错误有针对性诊断且不放行`, await next(page).isDisabled() && (await page.locator(".feedback.bad").innerText()).length > 15); }
      await page.locator(".option").nth(answers[course][q]).click(); await click(page, q < 2 ? "下一题" : "完成检查");
    }
    check(`${id}首次检查题记录2/3`, (await page.locator(".feedback").innerText()).includes("2 / 3")); await next(page).click();
    const input = page.getByLabel("你的答案（一个整数）"); await input.fill("不确定"); await click(page, "检查答案"); check(`${id}迁移拒绝非法输入`, (await page.locator(".feedback").innerText()).includes("请输入一个整数"));
    await input.fill(String(transfers[course] + 1)); await click(page, "检查答案"); check(`${id}迁移错答不放行`, await next(page).isDisabled()); await input.fill(String(transfers[course])); await click(page, "检查答案"); await next(page).click();
    check(`${id}总结三点且有权威来源`, await page.locator(".points li").count() === 3 && await page.locator(".foundation-sources a").count() >= 2);
    check(`${id}下一课与筹备状态诚实`, await page.locator(".stepnav a").getAttribute("href") === (course < 2 ? `#/lesson/${ids[course + 1]}` : "#/paths/a"));
    if (course === 2) check("A17如实说明A18尚未开放", (await page.locator(".lesson-wrap").innerText()).includes("下一课还在准备中"));
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")));
    check(`${id}真实2/4首次成绩且旧进度不变`, progress.schemaVersion === 1 && progress.lessons[id]?.firstTryCorrect === 2 && progress.lessons[id]?.quizTotal === 4 && JSON.stringify(progress.lessons["a01-binary"]) === JSON.stringify(saved.lessons["a01-binary"]));
  }
  check("390完整流程无JS异常", errors.length === 0); await context.close();
  for (const width of [1440, 360]) for (const theme of ["dark", "light"]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 800 } }); await ctx.addInitScript(value => localStorage.setItem("nico-theme", value), theme);
    const p = await ctx.newPage(); const issues = []; p.on("pageerror", e => issues.push(e.message));
    for (let i = 0; i < ids.length; i++) {
      await navigate(p, ids[i], 6); await solvers[i](p, `${width}/${theme}`); check(`${width}/${theme}/${ids[i]}完成且无溢出`, await next(p).isEnabled() && !(await overflow(p)));
      await shots(p, ids[i], `${theme}-${width}`);
      await next(p).focus(); await p.keyboard.press("Tab"); await p.keyboard.press("Shift+Tab"); await next(p).evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
      const rect = await next(p).boundingBox(), nav = await p.locator(".bottomnav").boundingBox(); check(`${width}/${theme}/${ids[i]}键盘焦点与底栏安全`, await next(p).evaluate(el => getComputedStyle(el).outlineStyle !== "none") && (nav === null || rect.y + rect.height <= nav.y));
    }
    check(`${width}/${theme}无JS异常`, issues.length === 0); await ctx.close();
  }
  for (let i = 0; i < ids.length; i++) {
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await touch.newPage(); await p.goto(`${BASE}/#/lesson/${ids[i]}`); await p.locator(".hook").waitFor(); for (let n = 0; n < 5; n++) await next(p).tap();
    const action = i === 0 ? "发送下一份 UDP 快照" : i === 1 ? "发送 HTTP 请求" : "开始本次访问"; await button(p, action).tap();
    if (i === 0) check("触摸A15真实发送数据报", await p.locator('.udp-lab [aria-label="UDP教学通道"] li').count() === 1);
    else if (i === 1) { await button(p, "服务器处理请求").tap(); await button(p, "接收 HTTP 响应").tap(); check("触摸A16真实200响应", await p.getByLabel("HTTP响应", { exact: true }).getAttribute("data-status") === "200"); }
    else { await button(p, "处理下一条 DNS 消息").tap(); check("触摸A17处理DNS实际消息", (await p.locator(".journey-lab > .net-note").innerText()).includes("DNS")); }
    await touch.close();
    const keyboard = await browser.newContext({ viewport: { width: 360, height: 800 } }); const k = await keyboard.newPage(); await navigate(k, ids[i], 5); await button(k, action).focus(); await k.keyboard.press("Shift+Tab"); await k.keyboard.press("Tab");
    check(`键盘${ids[i]}实际Tab焦点可见`, await button(k, action).evaluate(el => document.activeElement === el && getComputedStyle(el).outlineStyle !== "none")); await k.keyboard.press("Enter");
    check(`键盘${ids[i]}Enter产生真实状态`, i === 0 ? await k.locator('.udp-lab [aria-label="UDP教学通道"] li').count() === 1 : i === 1 ? await button(k, "服务器处理请求").isEnabled() : await button(k, "处理下一条 DNS 消息").isEnabled()); await keyboard.close();
  }
} catch (error) {
  let n = 0;
  for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: `${OUT}/failure-${n++}.png`, fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
console.log(`${checks} checks, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
