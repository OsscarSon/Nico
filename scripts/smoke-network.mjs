// Real UI interactions only: no React state injection. Network models never send real packets.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SCREENSHOT_DIR ?? "test-results/network";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const failures = []; let checks = 0;
const check = (name, ok) => { checks++; console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failures.push(name); };
const button = (p, name) => p.getByRole("button", { name, exact: true });
const click = (p, name) => button(p, name).click();
const next = p => button(p, "下一步");
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const ids = ["a11-devices", "a12-packets", "a14-tcp"];
const targets = ["a12-packets", "a13-dns", "a15-udp"];
const quiz = [[1, 0, 2], [0, 1, 2], [1, 0, 2]];
const transfer = [2, 5, 1006];
async function forwarding(p) {
  for (let task = 0; task < 4; task++) {
    await click(p, "检查当前任务");
    check(`A11 任务${task + 1}无送达不能通过`, !(await button(p, task === 3 ? "完成挑战" : "下一任务").isEnabled()));
    await click(p, "开始发送");
    let steps = 0; while (await button(p, "转发下一跳").isEnabled() && steps++ < 30) await click(p, "转发下一跳");
    check(`A11 任务${task + 1}实际通道完成`, steps < 30);
    await click(p, "检查当前任务");
    check(`A11 任务${task + 1}真实路径通过`, await button(p, task === 3 ? "完成挑战" : "下一任务").isEnabled());
    check(`A11 任务${task + 1}无溢出`, !(await overflow(p)));
    await click(p, task === 3 ? "完成挑战" : "下一任务");
  }
}
async function deliverChunks(p) {
  let count = 0; while (await button(p, "投递下一片段").isEnabled() && count++ < 30) await click(p, "投递下一片段");
  if (count >= 30) throw Error("chunk channel did not drain");
}
async function sortChunks(p) {
  const count = await p.locator(".net-chunks > li").count();
  for (let seq = 1; seq <= count; seq++) {
    let order = await p.locator(".net-chunks > li").evaluateAll(nodes => nodes.map(n => Number(n.dataset.seq)));
    let index = order.indexOf(seq);
    while (index > seq - 1) { await click(p, `上移片段 ${seq}`); order = await p.locator(".net-chunks > li").evaluateAll(nodes => nodes.map(n => Number(n.dataset.seq))); index = order.indexOf(seq); }
  }
}
async function reassembly(p) {
  for (let task = 0; task < 2; task++) {
    await click(p, "检查当前任务"); check(`A12 任务${task + 1}空操作无法通过`, await next(p).isDisabled());
    if (task === 1) await click(p, "丢弃下一片段");
    await deliverChunks(p); await click(p, "尝试重组");
    if (task === 0) check("A12 乱序片段未重排不输出原文", await p.locator(".net-output").count() === 0);
    else {
      check("A12 缺块明确失败且不编造原文", await p.locator(".net-output").count() === 0 && (await p.locator(".feedback.bad").first().innerText()).includes("缺少"));
      await p.getByRole("button", { name: /^重发片段 / }).first().click(); await deliverChunks(p);
    }
    await sortChunks(p); await click(p, "尝试重组");
    check(`A12 任务${task + 1}由实际内容恢复`, await p.getByLabel("重组输出").innerText() === "今晚七点在图书馆见面");
    await click(p, "检查当前任务"); check(`A12 任务${task + 1}操作证据通过`, await button(p, task ? "完成挑战" : "下一任务").isEnabled());
    check(`A12 任务${task + 1}无溢出`, !(await overflow(p)));
    await click(p, task ? "完成挑战" : "下一任务");
  }
}
async function wireId(p, kind) { return Number(await p.locator(`.net-channel li[data-kind="${kind}"]`).first().getAttribute("data-id")); }
async function deliver(p, kind) { await click(p, `投递报文 ${await wireId(p, kind)}`); }
async function drop(p, kind) { await click(p, `丢弃报文 ${await wireId(p, kind)}`); }
async function clock(p) { for (let i = 0; i < 3; i++) await click(p, "推进逻辑时钟"); }
async function tcp(p) {
  for (let task = 0; task < 3; task++) {
    await click(p, "检查当前任务"); check(`A14 任务${task + 1}空操作无法通过`, await next(p).isDisabled());
    check("A14 握手前不能发送数据", await button(p, "发送下一段").isDisabled());
    await click(p, "启动三次握手"); await deliver(p, "SYN"); await deliver(p, "SYN-ACK");
    if (task === 1) {
      await drop(p, "ACK");
      check("A14 最终ACK丢失时双方状态不同", (await p.getByLabel("客户端状态").innerText()).includes("ESTABLISHED") && (await p.getByLabel("服务器状态").innerText()).includes("SYN-RECEIVED"));
      check("A14 未到期不能重传", await button(p, "服务器超时重传").isDisabled());
      await clock(p); await click(p, "服务器超时重传"); await deliver(p, "SYN-ACK");
    }
    await deliver(p, "ACK");
    for (let segment = 0; segment < 2; segment++) {
      await click(p, "发送下一段"); check("A14 未确认时停等门控", await button(p, "发送下一段").isDisabled());
      await deliver(p, "DATA");
      if (task === 2 && segment === 0) {
        await drop(p, "DATA-ACK"); await clock(p); await click(p, "客户端超时重传"); await deliver(p, "DATA");
        const receiver = await p.getByLabel("服务器状态").innerText(); check("A14 ACK丢失后的重复段不重复交付", receiver.includes("「HEL」") && !receiver.includes("HELHEL"));
      }
      await deliver(p, "DATA-ACK");
    }
    check(`A14 任务${task + 1}原文完整且6字节确认`, (await p.getByLabel("服务器状态").innerText()).includes("HELLO!") && (await p.getByLabel("客户端状态").innerText()).includes("6 / 6"));
    await click(p, "检查当前任务"); check(`A14 任务${task + 1}状态机证据通过`, await button(p, task === 2 ? "完成挑战" : "下一任务").isEnabled());
    check(`A14 任务${task + 1}无溢出`, !(await overflow(p)));
    await click(p, task === 2 ? "完成挑战" : "下一任务");
  }
}
const solve = [forwarding, reassembly, tcp];
async function toFree(p) { for (let i = 0; i < 5; i++) await next(p).click(); await p.locator(".net-lab").waitFor(); }
async function shots(p, id, label) {
  await p.locator(".net-lab").evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await p.screenshot({ path: `${OUT}/${id}-${label}.png` });
  await p.screenshot({ path: `${OUT}/${id}-${label}-full.png`, fullPage: true });
}
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
  const saved = { schemaVersion: 1, lessons: { "a01-binary": { completedAt: "2026-11-15T10:00:00.000Z", firstTryCorrect: 3, quizTotal: 4 } }, resume: null, activeDays: ["2026-11-15"] };
  await ctx.addInitScript(value => { if (!localStorage.getItem("nico-progress")) localStorage.setItem("nico-progress", value); }, JSON.stringify(saved));
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", e => errors.push(e.message));
  for (let course = 0; course < ids.length; course++) {
    const id = ids[course]; await p.goto(`${BASE}/#/lesson/${id}`); await p.locator(".hook").waitFor();
    check(`${id} 默认深色且为草稿`, await p.locator("html").getAttribute("data-theme") === "dark" && await p.locator(".pill.draft").count() === 1);
    check(`${id} 居中新插画加载且没有待补占位`, await p.locator(".lesson-art").evaluate((el, file) => el.complete && el.naturalWidth === 1672 && el.naturalHeight === 941 && new URL(el.src).pathname.endsWith(`/art/${file}`), id === "a12-packets" ? "lesson-a12-packets-centered-batch02.png" : `lesson-${id}.png`) && await p.locator(".foundation-art-pending").count() === 0);
    await toFree(p); check(`${id} 自由实验标模拟`, await p.locator(".device header .pill").innerText() === "模拟");
    if (course === 0) {
      await p.getByLabel("目标端", { exact: true }).selectOption("C"); await p.getByLabel("首跳策略").selectOption("direct"); await click(p, "开始发送");
      while (await button(p, "转发下一跳").isEnabled()) await click(p, "转发下一跳");
      check("A11 错误远端MAC无法跨网段送达", (await p.locator(".forwarding-lab").innerText()).includes("实际送达：尚未送达"));
    } else if (course === 1) {
      await p.getByLabel("待发送消息").fill(""); await click(p, "生成片段"); check("A12 空消息有诊断", (await p.locator(".feedback.bad").innerText()).includes("非空消息"));
    } else {
      await p.getByLabel("传输内容（ASCII）").fill("中文"); await click(p, "生成新会话"); check("A14 字节单位限制有明确诊断", (await p.locator(".feedback.bad").innerText()).includes("ASCII"));
      await click(p, "启动三次握手"); const syn = await wireId(p, "SYN"); await click(p, `延迟报文 ${syn}`);
      check("A14 延迟时不可立即投递", await button(p, `投递报文 ${syn}`).isDisabled());
      await click(p, "推进逻辑时钟"); await click(p, "推进逻辑时钟"); await click(p, `投递报文 ${syn}`);
      check("A14 延迟后能正常投递而非凭空丢失", (await p.getByLabel("服务器状态").innerText()).includes("SYN-RECEIVED"));
    }
    check(`${id} 自由实验无溢出`, !(await overflow(p)));
    await next(p).click(); check(`${id} 挑战初始门控`, await next(p).isDisabled());
    await p.reload(); await p.locator(".net-lab").waitFor();
    check(`${id} 续学回到挑战且需实际重做`, await next(p).isDisabled() && await p.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")).resume.step) === 6);
    await solve[course](p); check(`${id} 全部操作完成后解除门控`, await next(p).isEnabled());
    await shots(p, id, "dark-390");
    if (course === 2) {
      await next(p).evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
      const rect = await next(p).boundingBox(); const nav = await p.locator(".bottomnav").boundingBox();
      check("390px 下一步按钮不被底栏遮挡", rect.y + rect.height <= nav.y);
    }
    await next(p).click();
    for (let q = 0; q < 3; q++) {
      if (q === 0) { await p.locator(".option").nth((quiz[course][q] + 1) % 3).click(); check(`${id} 错误诊断且保持门控`, await next(p).isDisabled() && (await p.locator(".feedback.bad").innerText()).length > 15); }
      await p.locator(".option").nth(quiz[course][q]).click(); await click(p, q < 2 ? "下一题" : "完成检查");
    }
    check(`${id} 真实首次答对2/3`, (await p.locator(".feedback").innerText()).includes("2 / 3")); await next(p).click();
    const input = p.getByLabel("你的答案（一个整数）"); await input.fill("不确定"); await click(p, "检查答案"); check(`${id} 迁移题拒绝非法输入`, (await p.locator(".feedback").innerText()).includes("请输入一个整数"));
    await input.fill(String(transfer[course] + 1)); await click(p, "检查答案"); check(`${id} 迁移题错答门控`, await next(p).isDisabled());
    await input.fill(String(transfer[course])); await click(p, "检查答案"); await next(p).click();
    check(`${id} 三点小结和权威来源`, await p.locator(".points li").count() === 3 && await p.locator(".foundation-sources a").count() >= 2);
    const link = p.locator(".stepnav a"); check(`${id} 下一课建议正确`, await link.getAttribute("href") === `#/lesson/${targets[course]}`);
    if (course === 2) check("A14可继续已上线A15且不显示筹备提示", !(await p.locator(".lesson-wrap").innerText()).includes("下一课还在准备中") && await link.getAttribute("href") === "#/lesson/a15-udp");
    const progress = await p.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")));
    check(`${id} 保存真实成绩2/4且不改旧数据`, progress.lessons[id]?.firstTryCorrect === 2 && progress.lessons[id]?.quizTotal === 4 && progress.schemaVersion === 1 && JSON.stringify(progress.lessons["a01-binary"]) === JSON.stringify(saved.lessons["a01-binary"]));
  }
  check("390px完整流程没有JS异常", errors.length === 0); await ctx.close();
  // Touch events and keyboard activation on the actual lab controls, beyond viewport resizing.
  for (let course = 0; course < ids.length; course++) {
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await touchContext.newPage(); await page.goto(`${BASE}/#/lesson/${ids[course]}`); await page.locator(".hook").waitFor();
    for (let step = 0; step < 5; step++) await next(page).tap();
    if (course === 0) {
      await button(page, "开始发送").tap(); while (await button(page, "转发下一跳").isEnabled()) await button(page, "转发下一跳").tap();
      check("触屏A11：逐跳送达", (await page.locator(".forwarding-lab").innerText()).includes("实际送达：A → B"));
    } else if (course === 1) {
      while (await button(page, "投递下一片段").isEnabled()) await button(page, "投递下一片段").tap();
      const count = await page.locator(".net-chunks > li").count();
      for (let seq = 1; seq <= count; seq++) {
        let order = await page.locator(".net-chunks > li").evaluateAll(nodes => nodes.map(n => Number(n.dataset.seq)));
        while (order.indexOf(seq) > seq - 1) { await button(page, `上移片段 ${seq}`).tap(); order = await page.locator(".net-chunks > li").evaluateAll(nodes => nodes.map(n => Number(n.dataset.seq))); }
      }
      await button(page, "尝试重组").tap(); check("触屏A12：移动并重组", await page.getByLabel("重组输出").innerText() === "今晚七点在图书馆见面");
    } else {
      await button(page, "启动三次握手").tap();
      for (const kind of ["SYN", "SYN-ACK", "ACK"]) await button(page, `投递报文 ${await wireId(page, kind)}`).tap();
      await button(page, "发送下一段").tap(); for (const kind of ["DATA", "DATA-ACK"]) await button(page, `投递报文 ${await wireId(page, kind)}`).tap();
      check("触屏A14：握手并确认一段", (await page.getByLabel("客户端状态").innerText()).includes("3 / 6"));
    }
    check(`触屏${ids[course]}无横向溢出`, !(await overflow(page))); await touchContext.close();
    const keyContext = await browser.newContext({ viewport: { width: 360, height: 844 } });
    const keyPage = await keyContext.newPage(); await keyPage.goto(`${BASE}/#/lesson/${ids[course]}`); await keyPage.locator(".hook").waitFor(); await toFree(keyPage);
    const enter = async name => { await button(keyPage, name).focus(); await keyPage.keyboard.press("Enter"); };
    if (course === 0) {
      await enter("开始发送"); await enter("转发下一跳");
      check("键盘A11：Enter转发并学习源MAC", (await keyPage.locator(".net-tables").innerText()).includes("02:00:00:01:00:0a"));
    } else if (course === 1) {
      await enter("投递下一片段"); await enter("投递下一片段");
      const before = await keyPage.locator(".net-chunks > li").evaluateAll(nodes => nodes.map(n => n.dataset.seq));
      await enter(`上移片段 ${before[1]}`);
      const after = await keyPage.locator(".net-chunks > li").evaluateAll(nodes => nodes.map(n => n.dataset.seq));
      check("键盘A12：Enter移动实际片段", after[0] === before[1] && after[1] === before[0]);
    } else {
      await enter("启动三次握手"); await enter(`投递报文 ${await wireId(keyPage, "SYN")}`);
      check("键盘A14：Enter推进实际握手", (await keyPage.getByLabel("服务器状态").innerText()).includes("SYN-RECEIVED"));
    }
    await keyContext.close();
  }
  for (const width of [1440, 360]) for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 } });
    await context.addInitScript(value => localStorage.setItem("nico-theme", value), theme);
    const page = await context.newPage(); const issues = []; page.on("pageerror", e => issues.push(e.message));
    for (let i = 0; i < ids.length; i++) {
      await page.goto(`${BASE}/#/lesson/${ids[i]}`); await page.locator(".hook").waitFor(); await toFree(page); await next(page).click();
      await solve[i](page); check(`${width}/${theme}/${ids[i]} 所有任务可操作且无溢出`, await next(page).isEnabled() && !(await overflow(page)));
      await shots(page, ids[i], `${theme}-${width}`);
      if (width === 360) {
        await next(page).focus();
        // Enter keyboard modality after pointer-based task solving; programmatic focus alone is not :focus-visible.
        await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
        await next(page).evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
        const rect = await next(page).boundingBox(), nav = await page.locator(".bottomnav").boundingBox();
        check(`360/${theme}/${ids[i]} 键盘焦点和底栏不遮挡`, await next(page).evaluate(el => getComputedStyle(el).outlineStyle !== "none") && rect.y + rect.height <= nav.y);
      }
    }
    check(`${width}/${theme} 无JS异常`, issues.length === 0); await context.close();
  }
} finally { await browser.close(); }
console.log(`${checks} 项检查，${failures.length} 项失败`);
if (failures.length) process.exitCode = 1;
