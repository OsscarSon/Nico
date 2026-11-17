// 浏览器冒烟测试：Prompt 训练场、AI 导师、C05 整节课。
// 两种模式，脚本自己判断：
//   · 构建时没有设 VITE_AI_ENDPOINT → 检查“AI 关闭”时界面是否诚实（本地检查可用，没有假的 AI 内容）。
//   · 构建时设了 VITE_AI_ENDPOINT → 脚本拦截发往它的请求并返回假回复，检查 AI 相关界面、错误提示和安全渲染。
//     需要同时设置 AI_ENDPOINT，值和构建时的 VITE_AI_ENDPOINT 一样。
// 用法：先 `npm run build && npm run preview`（保持运行），再在另一个终端：
//   BASE_URL=http://localhost:4173 npm run smoke:ai
//   AI 模式：VITE_AI_ENDPOINT=http://localhost:8787/ai npm run build 之后，加上 AI_ENDPOINT=http://localhost:8787/ai
const { chromium } = await import(process.env.PW_PATH ?? "playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const ENDPOINT = process.env.AI_ENDPOINT ?? "";

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  if (!ok) failures.push(name);
};
const soon = async (name, fn, timeout = 3000) => {
  const end = Date.now() + timeout;
  let ok = false, detail = "";
  while (Date.now() < end) {
    try { ok = Boolean(await fn()); } catch (e) { ok = false; detail = String(e.message).split("\n")[0]; }
    if (ok) break;
    await new Promise((r) => setTimeout(r, 80));
  }
  check(name, ok, detail);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
});

const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const imagesOk = () =>
  page.evaluate(async () => {
    const imgs = [...document.querySelectorAll("img")];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    return imgs.length > 0 && imgs.every((i) => i.naturalWidth > 0);
  });
const body = () => page.locator("body").innerText();
const btn = (name) => page.getByRole("button", { name, exact: false }).first();

// ---- 假 AI 服务（只在 AI 模式下用） ----
const calls = [];
let mode = "ok"; // ok | rate | down | evil
if (ENDPOINT) {
  await page.route(ENDPOINT, async (route) => {
    const req = route.request();
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const data = JSON.parse(req.postData() ?? "{}");
    calls.push(data);
    const json = (status, obj) => route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(obj) });
    if (mode === "rate") return json(429, { ok: false, code: "rate_limited", message: "x", retryAfterSec: 30 });
    if (mode === "down") return json(502, { ok: false, code: "upstream_error", message: "x" });
    if (data.kind === "critique")
      return json(200, { ok: true, kind: "critique", model: "fake-model", data: { summary: "指令太短，缺少背景。", strengths: ["任务清楚"], fixes: [{ element: "context", advice: "说明你是谁、写给谁" }], rewrite: "请帮我写一封给班主任的请假邮件。【请填写：请假原因】" } });
    if (data.kind === "tutor")
      return json(200, { ok: true, kind: "tutor", model: "fake-model", text: mode === "evil" ? "看这里 <img src=x onerror=window.__pwned=1> [点我](javascript:window.__pwned=1) **加粗**" : "**8 位**是一个字节。先想想每一位有几种取值？" });
    return json(200, { ok: true, kind: "run", model: "fake-model", text: data.prompt.length < 20 ? "（一封很普通的请假邮件）" : "| 事项 | 负责人 |\n|---|---|\n| 提交报告 | 小王 |" });
  });
}

// ---- Prompt 训练场（两种模式都做） ----
await page.goto(`${BASE}/#/lab`);
await soon("实验台有 Prompt 训练场和 AI 导师入口", async () => (await body()).includes("Prompt 训练场") && (await body()).includes("AI 导师"));
await page.goto(`${BASE}/#/lab/prompt`);
await soon("训练场打开，有输入框和插图", async () => (await page.locator("#pl-text").count()) === 1 && (await imagesOk()));
check("没写内容时提示先写点什么", (await body()).includes("写点什么"));

await page.locator("#pl-text").fill("写个请假邮件");
await soon("差指令：只亮 1 / 6 项，等级“只有任务”", async () => (await body()).includes("1 / 6 项") && (await body()).includes("只有任务"));
check("没写的项给出提示和下一步建议", (await body()).includes("下一步先补「背景」"));
check("页面如实说明这是规则检查、会漏判", (await body()).includes("只看有没有写，不判断写得好不好"));

await btn("载入示例：好指令").click();
await soon("好指令：至少 5 项，并给出依据原文", async () => /[5-6] \/ 6 项/.test(await body()) && (await body()).includes("依据：「"));
await btn("载入示例：差指令").click();
await soon("切回差指令后重新判定", async () => (await body()).includes("1 / 6 项"));

await page.locator("#pl-text").fill("角色 任务 背景 格式 约束 示例");
await soon("只堆六个标签名，不会被判成写了", async () => (await body()).includes("0 / 6 项"));

check("手机宽度无横向溢出", await noOverflow());

// ---- C05 整节课 ----
await page.goto(`${BASE}/#/lesson/c05-prompt-structure`);
const next = () => page.getByRole("button", { name: "下一步", exact: true });
await soon("C05 打开，标题正确", async () => (await body()).includes("指令的六要素"));
for (let i = 0; i < 4 && (await next().count()); i++) await next().click(); // 钩子 + 3 段讲解
await soon("到了自由检查互动，标“规则检查”而不是“模拟”", async () => (await body()).includes("规则检查") && !(await body()).includes("模拟"));
await page.locator("#pc-text").fill("你是一位老师。请解释 DNS，不超过 100 字。");
await soon("自由模式实时显示六项", async () => (await body()).includes("3 / 6 项"));
await next().click();

await soon("挑战：显示场景和必须写到的项", async () => (await body()).includes("摄影社") && (await body()).includes("任务、背景、格式、约束"));
check("挑战通过前不能进入下一步", (await next().count()) === 0 || (await next().isDisabled()));
await page.locator("#pc-text").fill("写个通知");
await btn("检查指令").click();
await soon("答错：说清还差哪几项并给出先补哪一项", async () => (await body()).includes("还差：背景、格式、约束") && (await body()).includes("先补「背景」"));
await btn("检查指令").click();
await soon("答错两次后才出现“看参考写法”", async () => (await btn("看参考写法").count()) === 1);
await page.locator("#pc-text").fill("请帮我写一条发在班级群里的活动通知。\n背景：我是摄影社社长，周六下午 2 点在图书馆门口集合，约 3 小时，请大家带相机。\n格式：先写时间和地点，再写要带的东西，最后邀请大家报名。\n要求：语气轻松，不超过 120 字。");
await btn("检查指令").click();
await soon("写对后通过，可以继续", async () => (await body()).includes("都写到了") && (await next().count()) === 1);
await next().click();
await soon("进入选择题", async () => (await body()).includes("初中生"));
check("C05 手机宽度无溢出", await noOverflow());

// ---- 关闭 / 开启 两种模式分叉 ----
await page.goto(`${BASE}/#/lab/prompt`);
await page.locator("#pl-text").fill("写个请假邮件");
const aiOff = (await body()).includes("AI 功能还没有接上服务器");

if (aiOff) {
  check("AI 关闭：说明没有接服务器，且不出现 AI 按钮", !(await btn("请 AI 点评").count()) && !(await btn("对比：差指令").count()));
  check("AI 关闭：没有任何“AI 生成”标签", !(await body()).includes("AI 生成"));
  await page.goto(`${BASE}/#/lab/tutor`);
  await soon("AI 关闭：导师页如实说明用不了", async () => (await body()).includes("AI 功能还没有接上服务器"));
  await page.goto(`${BASE}/#/lesson/a01-binary`);
  await soon("AI 关闭：课时页不显示“问 AI 导师”", async () => !(await body()).includes("问 AI 导师"));
  check("AI 关闭：没有发出任何网络请求到 AI", calls.length === 0);
} else {
  check("AI 开启：看得到两个 AI 按钮，并提醒不要写隐私", (await btn("请 AI 点评").count()) === 1 && (await body()).includes("请不要写入密码"));
  await btn("请 AI 点评").click();
  await soon("AI 点评：显示总评、建议、改写，并带“AI 生成”标签", async () => {
    const b = await body();
    return b.includes("指令太短，缺少背景。") && b.includes("说明你是谁、写给谁") && b.includes("【请填写：请假原因】") && b.includes("AI 生成");
  });
  check("发出的点评请求带上了场景和本地检查结果", calls.some((c) => c.kind === "critique" && c.scenario && c.local?.length === 6));
  await btn("用这个改写替换我的指令").click();
  await soon("可以用改写替换输入框", async () => (await page.locator("#pl-text").inputValue()).includes("班主任"));

  await btn("对比：差指令").click();
  await soon("对比：两栏结果，表格正确渲染，都带 AI 标签", async () => (await page.locator(".pl-compare table").count()) === 1 && (await page.locator(".pl-compare .pill.ai").count()) === 2);
  check("对比：说明回答是 AI 实时生成、每次可能不同", (await body()).includes("每次运行都可能不一样"));
  check("对比：只发了两条示例指令，没有发学习者输入框里的内容", calls.filter((c) => c.kind === "run").every((c) => !c.prompt.includes("班主任的请假邮件。【请填写")));

  mode = "rate";
  await btn("请 AI 点评").click();
  await soon("限速：显示友好提示和重试时间", async () => (await body()).includes("问得太快了") && (await body()).includes("30 秒"));
  mode = "down";
  await btn("请 AI 点评").click();
  await soon("服务出错：如实提示，不显示假回答", async () => (await body()).includes("AI 服务暂时出错了"));

  // 导师
  mode = "ok";
  await page.goto(`${BASE}/#/lab/tutor/a01-binary`);
  await soon("导师页：已选课，可以提问", async () => (await page.locator("#tutor-q").count()) === 1);
  await page.locator("#tutor-q").fill("为什么是 8 个开关？");
  await btn("提问").click();
  await soon("导师回答：Markdown 渲染并带标签", async () => (await page.locator(".aibox strong").count()) >= 1 && (await body()).includes("每一位有几种取值"));
  const tutorCall = calls.filter((c) => c.kind === "tutor").at(-1);
  check("发给导师的资料是课程讲解（以“本课目标”开头、不超长），问题原样带上", Boolean(tutorCall) && tutorCall.context.startsWith("本课目标") && tutorCall.context.length <= 2000 && tutorCall.question === "为什么是 8 个开关？");
  await page.locator("#tutor-q").fill("再举个例子");
  await btn("提问").click();
  await soon("第二问带上了前一轮对话", async () => calls.filter((c) => c.kind === "tutor").at(-1)?.history?.length === 2);
  mode = "evil";
  await page.locator("#tutor-q").fill("攻击测试");
  await btn("提问").click();
  await soon("恶意回复：HTML 被当作文字显示", async () => (await body()).includes("<img src=x onerror="));
  check("恶意回复：没有执行脚本，也没有生成危险链接或图片", (await page.evaluate(() => window.__pwned === undefined && !document.querySelector(".aibox img") && ![...document.querySelectorAll(".aibox a")].some((a) => a.href.startsWith("javascript:")))));
  check("导师页手机宽度无溢出", await noOverflow());
  await page.goto(`${BASE}/#/lesson/a01-binary`);
  await soon("AI 开启：课时页出现“问 AI 导师”入口", async () => (await body()).includes("问 AI 导师"));
}

await page.goto(`${BASE}/#/settings`);
await page.getByRole("heading", { name: "AI 服务", exact: true }).waitFor();
// Latest brief removes diagnostics from Settings; actual disabled/failure semantics remain checked above on the AI feature pages.
check("设置不展示工程诊断，保留实际快捷入口选项", !/配置状态|已配置服务地址|尚未检测连通性|尚未配置 AI 服务地址/.test(await page.locator("main").innerText()) && await page.getByRole("checkbox", { name: "显示AI快捷入口", exact: true }).count() === 1);
check("配置状态不冒充已连接服务", await page.getByText("已连接", { exact: true }).count() === 0);
check("没有 JS 报错", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(`\n模式：${aiOff ? "AI 关闭" : "AI 开启（假服务）"}`);
console.log(failures.length ? `失败 ${failures.length} 项：${failures.join("；")}` : "全部通过");
process.exit(failures.length ? 1 : 0);
