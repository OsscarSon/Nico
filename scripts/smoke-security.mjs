// User-visible interactions only. One full 390px course flow; focused 1440/360px labs.
// Exactly six review screenshots by default. No progress injection, eval-to-solve or live credentials/URLs.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SCREENSHOT_DIR ?? "test-results/security";
mkdirSync(OUT, { recursive: true });
const ids = ["a18-passwords", "a19-phishing", "a20-least-privilege"];
const answers = [[1, 0, 2], [2, 0, 1], [0, 1, 2]], transfers = [1, 1, 5];
const browser = await chromium.launch(), failures = []; let checks = 0;
function check(name, ok) { checks++; console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failures.push(name); }
const button = (p, name) => p.getByRole("button", { name, exact: true });
const click = (p, name) => button(p, name).click();
const next = p => button(p, "下一步");
const select = (p, label, value) => p.getByRole("combobox", { name: label, exact: true }).selectOption(value);
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
async function calc(p, label) { await click(p, label); await button(p, label).waitFor(); await p.waitForFunction(() => !document.querySelector('.password-lab fieldset')?.disabled); }
async function checked(p, task, label, width, course) {
  await click(p, "检查当前任务"); const action = task === 2 ? "完成挑战" : "下一任务";
  check(`${label}实际状态通过`, await button(p, action).isEnabled()); check(`${label}无横向溢出`, !(await overflow(p)));
  if (task === 2 && width !== 360) {
    // Actual viewport with navigation; show the operative evidence rather than an enormous stitched lab.
    const target = p.getByLabel(course === 0 ? "派生验证记录" : course === 1 ? "已查看邮件证据" : "实际笔记内容");
    await target.evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await p.screenshot({ path: `${OUT}/${ids[course]}-${width}.png` });
  }
  await click(p, action);
}
async function empty(p, task, label) { await click(p, "检查当前任务"); check(`${label}空操作不通过`, await button(p, task === 2 ? "完成挑战" : "下一任务").isDisabled()); }
async function passwords(p, width) {
  const label = `${width}/A18`;
  await empty(p, 0, label);
  await calc(p, "实际派生并注册当前样本"); await select(p, "演示账户", "photos"); await select(p, "演示 Salt", "B"); await calc(p, "实际派生并注册当前样本");
  await select(p, "登录候选公开样本", "long"); await calc(p, "重新派生并验证候选"); check(`${label}错误派生拒绝`, (await p.getByLabel("演示登录状态").innerText()).includes("不匹配"));
  await select(p, "登录候选公开样本", "reused"); await calc(p, "重新派生并验证候选");
  const saltB = await p.getByLabel("派生验证记录").innerText(); await select(p, "演示账户", "mail"); check(`${label}同一口令不同Salt的实际记录不同`, (await p.getByLabel("派生验证记录").innerText()) !== saltB);
  await checked(p, 0, label, width, 0); await empty(p, 1, label);
  await p.getByRole("checkbox", { name: "启用演示密码库", exact: true }).check();
  for (const [account, sample] of [["mail", "managerA"], ["photos", "managerB"]]) {
    await select(p, "演示账户", account); await select(p, "待注册公开样本", sample); await calc(p, "实际派生并注册当前样本"); await click(p, "保存当前记录到演示密码库");
  }
  await checked(p, 1, label, width, 0); await empty(p, 2, label);
  for (const account of ["mail", "photos"]) { await select(p, "演示账户", account); await p.getByRole("checkbox", { name: "当前账户登记演示MFA", exact: true }).check(); await select(p, "当前账户恢复资料位置", "offline"); }
  await select(p, "登录候选公开样本", "managerB"); await calc(p, "重新派生并验证候选");
  check(`${label}正确口令仍等待因子`, (await p.getByLabel("演示登录状态").innerText()).includes("等待第二因子"));
  await click(p, "提交陌生演示钥匙"); check(`${label}陌生因子仍不放行`, (await p.getByLabel("演示登录状态").innerText()).includes("等待第二因子"));
  await click(p, "提交登记演示钥匙"); check(`${label}实际因子验证后登录`, (await p.getByLabel("演示登录状态").innerText()).includes("第二因子已通过"));
  await checked(p, 2, label, width, 0);
}
async function phishing(p, width) {
  for (let task = 0; task < 3; task++) {
    const label = `${width}/A19情景${task + 1}`; await empty(p, task, label);
    if (task === 0) {
      await click(p, "拒绝并报告"); await click(p, "检查当前任务"); check(`${label}猜中决策缺证据仍不通过`, await button(p, "下一任务").isDisabled());
    }
    for (const kind of ["发件身份", "链接目标", "请求内容", "施压方式"]) await click(p, `检查${kind}`);
    await click(p, "询问邮件提供的联系人"); await click(p, ["拒绝并报告", "从已知官方入口处理", "暂缓并继续核实"][task]); await click(p, "检查当前任务");
    check(`${label}消息自带联系人不能担保`, await button(p, task === 2 ? "完成挑战" : "下一任务").isDisabled());
    await click(p, "用既有通讯录独立核实"); await click(p, ["拒绝并报告", "从已知官方入口处理", "暂缓并继续核实"][task]);
    check(`${label}证据网址没有可打开的恶意链接`, await p.locator('.phishing-lab a').count() === 0);
    await checked(p, task, label, width, 1);
  }
}
async function minimal(p, app, permissions) {
  await select(p, "虚构应用", app); await click(p, "检查当前应用需求"); await click(p, "撤销该应用全部授权"); await click(p, "运行当前应用功能");
  check(`${app}全部撤销实际失败`, (await p.getByLabel("当前功能验证").innerText()).includes("尚无成功"));
  for (const name of permissions) await p.getByRole("checkbox", { name, exact: true }).check(); await click(p, "运行当前应用功能");
}
async function privilege(p, width) {
  const label = `${width}/A20`; await empty(p, 0, label); await minimal(p, "scanner", ["相机", "所选收据文件夹"]); await checked(p, 0, label, width, 2);
  await empty(p, 1, label); await minimal(p, "meeting", ["麦克风"]); await select(p, "课堂任务", "video"); await click(p, "运行当前应用功能");
  check(`${label}视频缺相机实际失败`, (await p.getByLabel("当前功能验证").innerText()).includes("尚无成功"));
  await click(p, "检查当前应用需求"); await p.getByRole("checkbox", { name: "相机", exact: true }).check(); await click(p, "运行当前应用功能"); await checked(p, 1, label, width, 2);
  await empty(p, 2, label); await minimal(p, "notes", ["所选笔记文件"]); await select(p, "待保存公开笔记", "公开笔记v2：复习DNS、TLS与最小权限"); await click(p, "运行当前应用功能");
  await p.getByRole("checkbox", { name: "保持自动更新", exact: true }).check(); await p.getByRole("checkbox", { name: "启用锁屏策略", exact: true }).check();
  await click(p, "模拟陌生人读取"); check(`${label}未锁屏即使开策略也无证明`, (await p.getByLabel("设备防护状态").innerText()).includes("尚无当前"));
  await click(p, "安装模拟补丁v2"); await click(p, "锁定模拟设备"); await click(p, "模拟陌生人读取"); await click(p, "拥有者解锁");
  await click(p, "复制到独立离线位置"); await click(p, "模拟笔记存储故障"); check(`${label}故障实际移除原文`, (await p.getByLabel("实际笔记内容").innerText()).includes("已丢失"));
  await click(p, "从实际副本恢复"); await click(p, "检查当前任务"); check(`${label}恢复后旧功能证明不算数`, await button(p, "完成挑战").isDisabled());
  await click(p, "运行当前应用功能"); check(`${label}实际恢复v2而非预制原文`, (await p.getByLabel("实际笔记内容").innerText()).includes("公开笔记v2") && (await p.getByLabel("实际恢复结果").innerText()).includes("一致"));
  await checked(p, 2, label, width, 2);
}
const solvers = [passwords, phishing, privilege];
try {
  for (const width of [390, 1440, 360]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, hasTouch: width !== 1440 });
    const p = await context.newPage(), errors = [], requests = []; p.on("pageerror", e => errors.push(e.message));
    p.on("request", r => { const u = new URL(r.url()); if (!r.url().startsWith(BASE) && u.protocol !== "data:" && !["fonts.googleapis.com", "fonts.gstatic.com"].includes(u.hostname)) requests.push(r.url()); });
    await p.goto(BASE); check(`${width}无偏好默认深色`, await p.locator("html").getAttribute("data-theme") === "dark");
    const oldProgress = await p.evaluate(() => localStorage.getItem("nico-progress"));
    for (let course = 0; course < 3; course++) {
      const id = ids[course]; await p.goto(`${BASE}/#/lesson/${id}`); await p.locator(".lesson-wrap").waitFor();
      check(`${width}/${id}草稿和已安装正式插画`, await p.locator(".pill.draft").count() === 1 && await p.locator(".foundation-art-pending").count() === 0 && await p.locator(".lesson-art").count() === 1);
      for (let i = 0; i < 5; i++) { check(`${width}/${id}讲解${i}无溢出`, !(await overflow(p))); await next(p).click(); }
      await p.locator(".security-lab").waitFor(); check(`${width}/${id}自由实验可操作`, await p.locator('.security-lab button:enabled').count() >= 3);
      if (course === 1 && width === 390) {
        await select(p, "虚构邮件", "quiet");
        for (const kind of ["发件身份", "链接目标", "请求内容", "施压方式"]) await click(p, `检查${kind}`);
        check("自由实验的无紧急索密反例", (await p.getByLabel("已查看邮件证据").innerText()).includes("MFA验证码"));
        await click(p, "用既有通讯录独立核实"); await click(p, "拒绝并报告"); await click(p, "评估当前决策");
        await select(p, "虚构邮件", "survey"); check("自由实验评估成功后仍可换场景探索", (await p.getByLabel("虚构邮件正文").innerText()).includes("匿名阅读"));
      }
      await next(p).click(); check(`${width}/${id}挑战阻止直接下一步`, await next(p).isDisabled());
      if (course === 0 && width === 390) { await calc(p, "实际派生并注册当前样本"); await p.reload(); await p.locator(".password-lab").waitFor(); check("挑战刷新保留步骤但要求重新实操", await next(p).isDisabled() && (await p.getByLabel("派生验证记录").innerText()).includes("尚无验证")); }
      await solvers[course](p, width); check(`${width}/${id}全部挑战完成才放行`, await next(p).isEnabled());
      await next(p).evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
      const rect = await next(p).boundingBox(), nav = await p.locator(".bottomnav").boundingBox(); check(`${width}/${id}下一步未被导航遮挡`, !nav || rect.y + rect.height <= nav.y);
      // Quiz/transfer/progress are existing shared UI: run one full mobile flow, not three duplicates.
      if (width === 390) {
        await next(p).click();
        for (let q = 0; q < 3; q++) {
          if (q === 0) { await p.locator(".option").nth((answers[course][q] + 1) % 3).click(); check(`${id}诊断错答且不放行`, await next(p).isDisabled() && (await p.locator(".feedback.bad").innerText()).length > 15); }
          await p.locator(".option").nth(answers[course][q]).click(); await click(p, q < 2 ? "下一题" : "完成检查");
        }
        await next(p).click(); await p.getByLabel("你的答案（一个整数）").fill(String(transfers[course] + 1)); await click(p, "检查答案"); check(`${id}迁移错答未放行`, await next(p).isDisabled());
        await p.getByLabel("你的答案（一个整数）").fill(String(transfers[course])); await click(p, "检查答案"); await next(p).click();
        check(`${id}三点总结与参考来源`, await p.locator(".points li").count() === 3 && await p.locator(".foundation-sources a").count() >= 3);
        check(`${id}下一课或返回A路线`, await p.locator(".stepnav a").getAttribute("href") === (course < 2 ? `#/lesson/${ids[course + 1]}` : "#/paths/a"));
        const progress = await p.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")));
        check(`${id}真实首次成绩2/4与版本1`, progress.schemaVersion === 1 && progress.lessons[id]?.firstTryCorrect === 2 && progress.lessons[id]?.quizTotal === 4);
      }
    }
    if (width === 390) {
      const completed = await p.evaluate(() => JSON.parse(localStorage.getItem("nico-progress")));
      check("仅三门新课实际完成，未注入伪进度", Object.keys(completed.lessons).length === 3 && (!oldProgress || Object.keys(JSON.parse(oldProgress).lessons).length === 0));
    }
    if (errors.length || requests.length) console.log(JSON.stringify({ errors, unexpectedRequests: requests }));
    check(`${width}无JS异常或额外外部请求（保留网站原有字体）`, errors.length === 0 && requests.length === 0);
    await context.close();
  }
  // Actual touch + keyboard operation, distinct from mouse-driven functional flow.
  const c = await browser.newContext({ viewport: { width: 360, height: 844 }, hasTouch: true }), p = await c.newPage();
  await p.goto(`${BASE}/#/lesson/a19-phishing`); for (let i = 0; i < 5; i++) await next(p).click();
  await button(p, "检查链接目标").tap(); check("360触屏实际展开目标URL", (await p.getByLabel("已查看邮件证据").innerText()).includes("account-check.example"));
  await button(p, "检查请求内容").focus(); await p.keyboard.press("Enter"); check("键盘Enter实际检查请求", (await p.getByLabel("已查看邮件证据").innerText()).includes("MFA验证码"));
  // Final A-route audit: open every actual link at 360px without manufacturing completion records.
  await p.goto(`${BASE}/#/paths/a`); const links = await p.locator("a.pm-card").evaluateAll(nodes => nodes.map(a => a.getAttribute("href")));
  check("A路线20个真实入口且A21/A22规划不冒充课程", links.length === 20 && await p.locator(".pm-card.planned").count() === 2);
  const issues = [];
  for (const href of links) {
    await p.goto(`${BASE}/${href}`); await p.locator(".lesson-body").waitFor();
    const imagesOk = await p.locator(".lesson-art").evaluateAll(async images => { await Promise.all(images.map(i => i.decode().catch(() => {}))); return images.every(i => i.naturalWidth > 0 && Math.abs(i.width / i.height - i.naturalWidth / i.naturalHeight) < 0.02); });
    if (await overflow(p) || !imagesOk || (await p.locator(".lesson-body").innerText()).length < 20) issues.push(href);
  }
  check(`A01–A20开场实测无空白、图片拉伸或360px溢出${issues.length ? `：${issues.join(",")}` : ""}`, issues.length === 0);
  await c.close();
} finally { await browser.close(); }
console.log(`Security browser checks: ${checks - failures.length}/${checks}; screenshots: 6; failures: ${failures.length}`);
if (failures.length) throw Error(failures.join("\n"));
