// 浏览器冒烟测试：把 A01 整节课从头点到尾，并检查手机宽度、续学、404。
// 用法：先 `npm run build && npm run preview`（保持运行），再在另一个终端：
//   PowerShell：$env:BASE_URL = "http://localhost:4173"; npm run smoke
//   macOS/Linux：BASE_URL=http://localhost:4173 npm run smoke
// 首次需要：npx playwright install chromium
const { chromium } = await import(process.env.PW_PATH ?? "playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  if (!ok) failures.push(name);
};

// 页面更新是异步的：反复检查直到条件成立（最多 3 秒），避免把时序问题误报成失败。
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

const imagesOk = () =>
  page.evaluate(async () => {
    const imgs = [...document.querySelectorAll("img")];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    return imgs.length > 0 && imgs.every((i) => i.naturalWidth > 0);
  });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
});

const text = async (sel) => (await page.locator(sel).first().innerText()).trim();
const btn = (name) => page.getByRole("button", { name, exact: false }).first();
const nextBtn = () => page.getByRole("button", { name: "下一步", exact: true });
const noOverflow = async () =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

// ---- 首页 ----
await page.goto(`${BASE}/#/`);
check("首页显示 Academy 主标题", (await text("h1")).includes("你的知识世界"));
check("基础阶段有 A–F 六条路线", (await page.locator(".academy-track").count()) === 6);
check("A–E 仍使用五张原版插画", (await page.locator(".academy-track img.track-emblem").count()) === 5);
check("首页没有假进度（未学习时不显示统计）", (await page.locator(".stats").count()) === 0);
check("手机宽度无横向溢出：首页", await noOverflow());
check("首页主视觉图片加载成功", await imagesOk());

// ---- 徽章：没学之前一个都没有 ----
await page.goto(`${BASE}/#/me`);
await soon("我的页面有 8 个徽章", async () => (await page.locator(".badge").count()) === 8);
check("还没学习时没有任何已获得的徽章", (await page.locator(".badge.earned").count()) === 0);
check("徽章图片加载成功", await imagesOk());
await page.goto(`${BASE}/#/`);

// ---- 开始 A01 ----
await page.getByRole("link", { name: "开始这一课" }).click();
await soon("A01 课头插图加载成功", async () => (await page.locator(".lesson-art").count()) === 1 && (await imagesOk()));
await soon("进入课时页", async () => (await text("h1")).includes("二进制"));
await soon("课时显示为草稿，不冒充正式", async () => (await page.locator(".pill.draft").count()) === 1);
check("第一步前进按钮可用（开场不需要互动）", await nextBtn().isEnabled());
await nextBtn().click(); // -> 讲解 1
await nextBtn().click(); // -> 讲解 2
check("讲解里的粗体被渲染为 strong", (await page.locator(".explain strong").count()) >= 1);
check("简化提示（callout）出现", (await page.locator(".callout").count()) === 1);
await nextBtn().click(); // -> 自由练习

// ---- 自由练习：位开关 ----
const sw = (pv) => page.getByRole("switch", { name: new RegExp(`分量 ${pv}，`) });
await sw(32).click();
await sw(4).click();
await sw(1).click();
check("拨 32+4+1 显示 37", (await text(".readout .big")) === "37");
check("读数里列出算式", (await text(".readout")).includes("32 + 4 + 1 = 37"));
check("开关有 aria-checked", (await sw(32).getAttribute("aria-checked")) === "true");
await nextBtn().click(); // -> 挑战

// ---- 挑战：前进按钮被门控 ----
check("挑战未完成时『下一步』被禁用", await nextBtn().isDisabled());
await sw(32).click(); // 目标 5，故意拨错
await btn("检查").click();
check("拨错时给出具体差值", (await text(".feedback")).includes("多了 27"));
await sw(32).click(); // 关掉
await sw(4).click();
await sw(1).click();
await btn("检查").click();
check("拨对目标 5 得到正确反馈", (await text(".feedback")).includes("正确"));
await btn("下一个目标").click();
for (const [target, pvs] of [[37, [32, 4, 1]], [200, [128, 64, 8]]]) {
  for (const pv of pvs) await sw(pv).click();
  await btn("检查").click();
  check(`拨对目标 ${target}`, (await text(".feedback")).includes("正确"));
  await btn(target === 200 ? "完成" : "下一个目标").click();
}
await soon("三个目标完成后门控解除", () => nextBtn().isEnabled());

// ---- 续学：刷新后回到同一步 ----
await page.reload();
await soon("刷新后仍在课时页", async () => (await text("h1")).includes("二进制"));
check("刷新后回到续学的步骤（目录标记当前步）", (await text('.steps li[aria-current="step"]')).includes("拨出指定的数"));
check("续学后挑战步骤仍需重新完成（门控生效）", await nextBtn().isDisabled());
await page.getByRole("button", { name: "上一步", exact: true }).click();
await soon("续学后可以回到上一步，且不被门控卡住", () => nextBtn().isEnabled());
await nextBtn().click();
// 重新完成挑战以继续
for (const [, pvs, last] of [[5, [4, 1], false], [37, [32, 4, 1], false], [200, [128, 64, 8], true]]) {
  for (const pv of pvs) await sw(pv).click();
  await btn("检查").click();
  await btn(last ? "完成" : "下一个目标").click();
}
await nextBtn().click(); // -> 检查题

// ---- 选择题 ----
check("答题前『下一步』被禁用", await nextBtn().isDisabled());
await page.getByRole("button", { name: /^11/ }).click(); // 第 1 题故意选错
check("选错显示诊断提示", (await text(".feedback")).includes("00001011"));
await page.getByRole("button", { name: /^13/ }).click();
check("选对显示解释", (await text(".feedback")).includes("8 + 4 + 1 = 13"));
await btn("下一题").click();
await page.getByRole("button", { name: /^32/ }).click();
await btn("下一题").click();
await page.getByRole("button", { name: /更不容易|可靠得多/ }).first().click();
await btn("完成检查").click();
check("检查完成后显示第一次答对数", (await text(".feedback")).includes("第一次就答对 2 / 3"));
await nextBtn().click(); // -> 迁移题

// ---- 迁移题 ----
const input = page.getByRole("textbox");
await input.fill("很多");
await btn("检查答案").click();
check("非整数输入给出清晰提示", (await text(".feedback")).includes("请输入一个整数"));
await input.fill("512");
await btn("检查答案").click();
check("答错给出提示", (await text(".feedback")).includes("翻了几倍"));
await input.fill("1,024");
await btn("检查答案").click();
check("接受带千分位的正确答案", (await text(".feedback")).includes("答对了"));
await nextBtn().click(); // -> 小结

// ---- 小结与完成 ----
check("小结有三点", (await page.locator(".points li").count()) === 3);
check("A01 小结的『下一课』指向已开放的 A02", (await page.getByRole("link", { name: "下一课", exact: true }).count()) === 1);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress") ?? "null"));
check("完成后进度已保存", saved?.lessons?.["a01-binary"]?.quizTotal === 4, JSON.stringify(saved));
check("记录了真实的一次性答对数（3 道选择题 2 对 + 迁移题错过 → 2/4）", saved?.lessons?.["a01-binary"]?.firstTryCorrect === 2, JSON.stringify(saved?.lessons));

// ---- 路线地图 / 首页 / 其它页面 ----
await page.goto(`${BASE}/#/paths/a`);
await soon("路线页头有徽记且图片加载成功", async () => (await page.locator(".track-head img").count()) === 1 && (await imagesOk()));
await soon("路线地图显示已完成", async () => (await page.locator(".pm-card .pill.done").count()) === 1);
await soon("路线地图里有 3 个规划中的课", async () => (await page.locator(".pm-card.planned").count()) === 3);
await soon("路线地图上其余十六门已上线课显示『可以开始』", async () => (await page.locator(".pm-card .pill.available").count()) === 16);
await page.goto(`${BASE}/#/`);
await soon("首页现在显示已完成 1 课", async () => (await text(".stats")).includes("1"));
await soon("首页推荐下一课 A02", async () => (await text(".today")).includes("十六进制") && (await text(".today")).includes("下一课"));

// ---- A02 十六进制与文字编码 ----
await page.goto(`${BASE}/#/lesson/a02-hex-encoding`);
await soon("进入 A02", async () => (await text("h1")).includes("十六进制"));
await soon("A02 课头插图加载成功", async () => (await page.locator(".lesson-art").count()) === 1 && (await imagesOk()));
check("A02 显示为草稿", (await page.locator(".pill.draft").count()) === 1);
for (let i = 0; i < 4; i++) await nextBtn().click(); // 开场 -> 讲解 1..4
check("A02 简化提示（callout）出现", (await page.locator(".callout").count()) === 1);
await nextBtn().click(); // -> 挑战
check("A02 挑战未完成时『下一步』被禁用", await nextBtn().isDisabled());
check("手机宽度无横向溢出：A02 挑战", await noOverflow());
for (const [target, pvs, last] of [[10, [8, 2], false], [65, [64, 1], false], [97, [64, 32, 1], true]]) {
  for (const pv of pvs) await sw(pv).click();
  await btn("检查").click();
  check(`A02 拨对目标 ${target}`, (await text(".feedback")).includes("正确"));
  await btn(last ? "完成" : "下一个目标").click();
}
await soon("A02 三个目标完成后门控解除", () => nextBtn().isEnabled());
await nextBtn().click(); // -> 检查题
await page.getByRole("button", { name: /^17/ }).click(); // 第 1 题故意选错
await soon("A02 Q1 选错给出诊断", async () => (await text(".feedback")).includes("分量是 16"));
await page.getByRole("button", { name: /^47/ }).click();
await soon("A02 Q1 选对显示解释", async () => (await text(".feedback")).includes("32 + 15 = 47"));
await btn("下一题").click();
await page.getByRole("button", { name: "红色", exact: true }).click();
await btn("下一题").click();
await page.getByRole("button", { name: /^因为 1 位十六进制/ }).click();
await btn("完成检查").click();
await soon("A02 检查完成：第一次答对 2 / 3", async () => (await text(".feedback")).includes("第一次就答对 2 / 3"));
await nextBtn().click(); // -> 迁移题
await page.getByRole("textbox").fill("abc");
await btn("检查答案").click();
await soon("A02 无效输入的提示不泄露答案", async () => { const t = await text(".feedback"); return t.includes("请输入一个整数") && !t.includes("128"); });
await page.getByRole("textbox").fill("80");
await btn("检查答案").click();
await soon("A02 迁移题答错给出提示", async () => (await text(".feedback")).includes("别把 80"));
await page.getByRole("textbox").fill("128");
await btn("检查答案").click();
await soon("A02 迁移题答对", async () => (await text(".feedback")).includes("答对了"));
await nextBtn().click(); // -> 小结
check("A02 小结有三点", (await page.locator(".points li").count()) === 3);
check("A02 小结的『下一课』指向 A03", (await page.getByRole("link", { name: "下一课", exact: true }).count()) === 1);
const saved2 = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress") ?? "null"));
check("A02 完成后进度已保存（选择题错 1 次、迁移题错 1 次 → 第一次答对 2 / 4）", saved2?.lessons?.["a02-hex-encoding"]?.firstTryCorrect === 2 && saved2?.lessons?.["a02-hex-encoding"]?.quizTotal === 4, JSON.stringify(saved2?.lessons));
await page.goto(`${BASE}/#/`);
await soon("首页推荐下一课 A03", async () => (await text(".today")).includes("逻辑门") && (await text(".today")).includes("下一课"));

// ---- A03 逻辑门 ----
await page.goto(`${BASE}/#/lesson/a03-logic-gates`);
await soon("进入 A03", async () => (await text("h1")).includes("逻辑门"));
await soon("A03 课头插图加载成功", async () => (await page.locator(".lesson-art").count()) === 1 && (await imagesOk()));
check("A03 显示为草稿", (await page.locator(".pill.draft").count()) === 1);
for (let i = 0; i < 4; i++) await nextBtn().click(); // -> 自由练习
const swIn = (name) => page.getByRole("switch", { name: new RegExp(`输入 ${name}，`) });
const outDigit = () => text(".gate-out .digit");
await soon("自由练习默认 AND，输出 0", async () => (await outDigit()) === "0" && (await page.getByRole("button", { name: "AND", exact: true }).getAttribute("aria-pressed")) === "true");
check("手机宽度无横向溢出：A03 自由练习", await noOverflow());
await swIn("A").click();
await swIn("B").click();
await soon("AND 两个输入都开时输出 1", async () => (await outDigit()) === "1");
check("真值表标出当前行", (await page.locator('tr[aria-current="true"]').count()) === 1 && (await text('tr[aria-current="true"]')).includes("现在"));
check("门符号有图", (await page.locator(".gate-symbol").count()) === 1);
await page.getByRole("button", { name: "XOR", exact: true }).click();
await soon("切到 XOR，11 时输出 0", async () => (await outDigit()) === "0");
await page.getByRole("button", { name: "NOT", exact: true }).click();
await soon("NOT 只有一个输入（没有 B 开关）", async () => (await page.getByRole("switch", { name: /输入 B，/ }).count()) === 0);
await nextBtn().click(); // -> 神秘门

// ---- 神秘门挑战：NOT、OR、XOR ----
check("神秘门未完成时『下一步』被禁用", await nextBtn().isDisabled());
check("手机宽度无横向溢出：A03 挑战", await noOverflow());
const guessBtns = () => page.getByRole("group", { name: "猜这是哪个门" }).getByRole("button");
const guess = (name) => page.getByRole("group", { name: "猜这是哪个门" }).getByRole("button", { name, exact: true }).click();
check("没试完所有输入前不能猜", await guessBtns().first().isDisabled());
await swIn("A").click(); // 神秘门 1（NOT）：试过 0 和 1
await soon("试完输入后可以猜", () => guessBtns().first().isEnabled());
await guess("AND");
await soon("猜错时说明输入个数不符，且不泄露答案", async () => { const t = await text(".feedback"); return t.includes("只有一个输入") && !t.includes("NOT"); });
await guess("NOT");
await soon("猜对神秘门 1", async () => (await text(".feedback")).includes("对了"));
await btn("下一个神秘门").click();

await soon("神秘门 2 开始时表格只揭开了当前行", async () => (await page.locator(".truth tbody td:nth-child(3)").allInnerTexts()).filter((t) => t.trim() === "?").length === 3);
await swIn("A").click(); await swIn("B").click(); await swIn("A").click(); // 10, 11, 01
await soon("试完 4 种输入后可以猜", () => guessBtns().first().isEnabled());
await guess("AND");
await soon("猜错时指出一条矛盾的行", async () => { const t = await text(".feedback"); return t.includes("A=0，B=1") && t.includes("应该输出 0") && t.includes("你看到的是 1"); });
await guess("OR");
await soon("猜对神秘门 2", async () => (await text(".feedback")).includes("对了"));
await btn("下一个神秘门").click();

await soon("神秘门 3 开始时 00 行已经揭开", async () => (await page.locator(".truth tbody td:nth-child(3)").allInnerTexts()).filter((t) => t.trim() === "?").length === 3);
await swIn("A").click(); await swIn("B").click(); await swIn("A").click();
await soon("神秘门 3 可以猜", () => guessBtns().first().isEnabled());
await guess("OR");
await soon("猜错 OR 时指出 11 这一行", async () => { const t = await text(".feedback"); return t.includes("A=1，B=1") && t.includes("应该输出 1") && t.includes("你看到的是 0"); });
await guess("XOR");
await soon("猜对神秘门 3", async () => (await text(".feedback")).includes("对了"));
await btn("完成").click();
await soon("三个神秘门完成后门控解除", () => nextBtn().isEnabled());
await nextBtn().click(); // -> 检查题

// ---- A03 检查题 ----
const opt = (name) => page.getByRole("button", { name, exact: true });
await opt("AND 和 OR").click();
await soon("Q1 选错给出诊断", async () => (await text(".feedback")).includes("AND 需要两个输入都是 1"));
await opt("OR 和 XOR").click();
await btn("下一题").click();
await opt("XOR").click();
await btn("下一题").click();
await opt("OR").click();
await btn("完成检查").click();
await soon("A03 检查完成：第一次答对 2 / 3", async () => (await text(".feedback")).includes("第一次就答对 2 / 3"));
await nextBtn().click(); // -> 迁移题
await page.getByRole("textbox").fill("8");
await btn("检查答案").click();
await soon("A03 迁移题答错给出提示", async () => (await text(".feedback")).includes("连乘"));
await page.getByRole("textbox").fill("16");
await btn("检查答案").click();
await soon("A03 迁移题答对", async () => (await text(".feedback")).includes("答对了"));
await nextBtn().click(); // -> 小结
check("A03 小结有三点", (await page.locator(".points li").count()) === 3);
check("A03 小结的『下一课』指向 A04", (await page.getByRole("link", { name: "下一课", exact: true }).count()) === 1);
const saved3 = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress") ?? "null"));
check("A03 完成后进度已保存（选择题错 1 次、迁移题错 1 次 → 第一次答对 2 / 4）", saved3?.lessons?.["a03-logic-gates"]?.firstTryCorrect === 2 && saved3?.lessons?.["a03-logic-gates"]?.quizTotal === 4, JSON.stringify(saved3?.lessons));

await page.goto(`${BASE}/#/`);
await soon("首页现在显示已完成 3 课", async () => (await text(".stats .stat strong")) === "3");
await soon("首页推荐下一课 A04", async () => (await text(".today")).includes("用门搭一个加法器") && (await text(".today")).includes("下一课"));

// ---- A04 半加器 ----
await page.goto(`${BASE}/#/lesson/a04-adder`);
await soon("进入 A04", async () => (await text("h1")).includes("加法器"));
await soon("A04 课头插图加载成功", async () => (await page.locator(".lesson-art").count()) === 1 && (await imagesOk()));
check("A04 显示为草稿", (await page.locator(".pill.draft").count()) === 1);
for (let i = 0; i < 3; i++) await nextBtn().click(); // 开场 → 讲解 ×2 → 半加器自由练习
await soon("自由练习：0 + 0 = 00", async () => (await text(".adder-equation")).includes("0 + 0 = 00"));
check("自由练习显示两个门符号", (await page.locator(".gate-symbol").count()) === 2);
check("手机宽度无横向溢出：A04 自由练习", await noOverflow());
await swIn("A").click();
await swIn("B").click();
await soon("1 + 1 = 10（进位 1，和 0）", async () => { const t = await text(".adder-equation"); return t.includes("1 + 1 = 10") && t.includes("进位 1") && t.includes("和 0"); });
await nextBtn().click(); // -> 挑战
check("搭电路挑战未完成时『下一步』被禁用", await nextBtn().isDisabled());
check("手机宽度无横向溢出：A04 挑战", await noOverflow());
await btn("测试电路").click();
await soon("两个都用 OR：3 种输入不对，先指出进位", async () => { const t = await text(".feedback"); return t.includes("有 3 种输入不对") && t.includes("「进位」这一位不对"); });
check("测试结果表里有 3 行不对", (await page.getByText("✗ 不对").count()) === 3);
const pickGate = (group, name) => page.getByRole("group", { name: group }).getByRole("button", { name, exact: true }).click();
await pickGate("和用哪个门", "XOR");
await soon("改选门后旧的测试结果被清除", async () => (await page.locator(".truth").count()) === 0 && (await page.locator(".feedback").count()) === 0);
await btn("测试电路").click();
await soon("和选对后只剩进位不对", async () => { const t = await text(".feedback"); return t.includes("「进位」这一位不对") && !t.includes("「和」"); });
await pickGate("进位用哪个门", "AND");
await btn("测试电路").click();
await soon("XOR + AND 四种输入全部通过", async () => (await text(".feedback")).includes("四种输入全部正确"));
check("测试结果表里 4 行都通过", (await page.getByText("✓ 通过").count()) === 4);
await soon("搭对后门控解除", () => nextBtn().isEnabled());
await nextBtn().click(); // -> 检查题
await opt("2").click();
await soon("A04 Q1 选错给出诊断", async () => (await text(".feedback")).includes("二进制里没有数字 2"));
await opt("10").click();
await btn("下一题").click();
await opt("AND").click();
await btn("下一题").click();
await opt("和 0，进位 1").click();
await btn("完成检查").click();
await soon("A04 检查完成：第一次答对 2 / 3", async () => (await text(".feedback")).includes("第一次就答对 2 / 3"));
await nextBtn().click(); // -> 迁移题
await page.getByRole("textbox").fill("8");
await btn("检查答案").click();
await soon("A04 迁移题答错给出提示", async () => (await text(".feedback")).includes("255 + 255 = 510"));
await page.getByRole("textbox").fill("9");
await btn("检查答案").click();
await soon("A04 迁移题答对", async () => (await text(".feedback")).includes("答对了"));
await nextBtn().click(); // -> 小结
check("A04 小结有三点", (await page.locator(".points li").count()) === 3);
check("A04 小结的『下一课』指向 A05", (await page.getByRole("link", { name: "下一课", exact: true }).count()) === 1);
const saved4 = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress") ?? "null"));
check("A04 完成后进度已保存（第一次答对 2 / 4）", saved4?.lessons?.["a04-adder"]?.firstTryCorrect === 2 && saved4?.lessons?.["a04-adder"]?.quizTotal === 4, JSON.stringify(saved4?.lessons));

await page.goto(`${BASE}/#/`);
await soon("首页现在显示已完成 4 课", async () => (await text(".stats .stat strong")) === "4");
await soon("首页推荐下一课 A05", async () => (await text(".today")).includes("CPU") && (await text(".today")).includes("下一课"));

// ---- A05 CPU：取指、译码、执行 ----
await page.goto(`${BASE}/#/lesson/a05-cpu-cycle`);
await soon("进入 A05", async () => (await text("h1")).includes("CPU"));
check("A05 显示为草稿", (await page.locator(".pill.draft").count()) === 1);
for (let i = 0; i < 3; i++) await nextBtn().click(); // 开场 → 讲解 ×2 → 第 3 段讲解（有简化提示）
check("A05 简化提示（callout）出现", (await page.locator(".callout").count()) === 1);
await nextBtn().click(); // -> 单步运行
const cpuStep = () => page.getByRole("button", { name: /^下一步：/ });
const reg = (name) => text(`.cpu-reg[data-reg="${name}"] .cpu-reg-val`);
check("手机宽度无横向溢出：A05 单步运行", await noOverflow());
check("初始：PC=0、IR 为空、ACC=0，按钮是『下一步：取指』", (await reg("PC")) === "0" && (await reg("IR")) === "空" && (await reg("ACC")) === "0" && (await cpuStep().innerText()).includes("取指"));
await cpuStep().click();
await soon("取指后 IR=LOAD 6、PC=1，说明里写明了取指", async () => (await reg("IR")) === "LOAD 6" && (await reg("PC")) === "1" && (await text(".cpu-note")).includes("取指：PC 指向第 0 格"));
check("按钮变成『下一步：译码』", (await cpuStep().innerText()).includes("译码"));
await cpuStep().click();
await soon("译码只解释，不改 ACC", async () => (await text(".cpu-note")).includes("译码：IR 里是「LOAD 6」") && (await reg("ACC")) === "0");
await cpuStep().click();
await soon("执行 LOAD 6 后 ACC=5，第 6 格标『被读』", async () => (await reg("ACC")) === "5" && (await page.locator(".cpu-cell", { hasText: "被读" }).count()) === 1);
for (let i = 0; i < 9; i++) await cpuStep().click();
await soon("走完 12 步后程序停止", async () => (await text(".cpu-steps")).includes("已走 12 步") && (await text(".cpu-steps")).includes("程序已停止"));
check("5 + 3 = 8 写进了第 8 格", (await page.locator('.cpu-cell[aria-label^="第 8 格"]').getAttribute("aria-label"))?.includes("数据 8") === true);
check("停止后『下一步』按钮被禁用", await cpuStep().isDisabled());
await btn("重置").click();
await soon("重置后回到初始状态", async () => (await reg("PC")) === "0" && (await text(".cpu-steps")).includes("已走 0 步"));
await nextBtn().click(); // -> 挑战

check("A05 挑战未完成时『下一步』被禁用", await nextBtn().isDisabled());
check("手机宽度无横向溢出：A05 挑战", await noOverflow());
const guessBox = () => page.getByRole("textbox");
const checkGuess = () => btn("检查预测").click();
await guessBox().fill("很多"); await checkGuess();
await soon("非整数输入给出提示", async () => (await text(".feedback")).includes("请输入一个整数"));
await guessBox().fill("7"); await checkGuess();
await soon("程序 1 预测错：提示去跟着 ACC 走", async () => (await text(".feedback")).includes("跟着 ACC"));
await guessBox().fill("8"); await checkGuess();
await soon("程序 1 预测对，并列出每条指令的变化", async () => { const t = await text(".feedback"); return t.includes("对了") && t.includes("LOAD 6：ACC 变成 5") && t.includes("STORE 8：第 8 格变成 8"); });
await btn("下一个程序").click();
await guessBox().fill("11"); await checkGuess();
await soon("程序 2 预测对（11）", async () => (await text(".feedback")).includes("对了"));
await btn("下一个程序").click();
await guessBox().fill("8"); await checkGuess(); // 陷阱：以为第 7 格还是 3
await soon("程序 3 掉进陷阱（填 8）会被指出", async () => (await text(".feedback")).includes("还不对"));
check("答错 1 次还不能直接看答案", (await btn("看答案").count()) === 0);
await guessBox().fill("3"); await checkGuess();
await soon("答错 2 次后可以看答案", async () => (await btn("看答案").count()) === 1);
await guessBox().fill("10"); await checkGuess();
await soon("程序 3 预测对（10），并讲清楚 STORE 7 覆盖了数据", async () => { const t = await text(".feedback"); return t.includes("对了") && t.includes("STORE 7：第 7 格变成 5") && t.includes("ADD 7：ACC 变成 10"); });
await btn("完成").click();
await soon("三个程序完成后门控解除", () => nextBtn().isEnabled());
await nextBtn().click(); // -> 检查题
await opt("停下来等待").click();
await soon("A05 Q1 选错给出诊断", async () => (await text(".feedback")).includes("只有遇到 HALT"));
await opt("回到取指，按 PC 取下一条指令").click();
await btn("下一题").click();
await opt("下一条要取的指令在内存的第几格").click();
await btn("下一题").click();
await opt("8").click();
await btn("完成检查").click();
await soon("A05 检查完成：第一次答对 2 / 3", async () => (await text(".feedback")).includes("第一次就答对 2 / 3"));
await nextBtn().click(); // -> 迁移题
await page.getByRole("textbox").fill("9");
await btn("检查答案").click();
await soon("A05 迁移题答错给出提示", async () => (await text(".feedback")).includes("先数指令有几条"));
await page.getByRole("textbox").fill("12");
await btn("检查答案").click();
await soon("A05 迁移题答对（12，和单步运行的真实步数一致）", async () => (await text(".feedback")).includes("答对了"));
await nextBtn().click(); // -> 小结
check("A05 小结有三点", (await page.locator(".points li").count()) === 3);
check("A05 之后按顺序进入 A06", (await page.getByRole("link", { name: "下一课", exact: true }).getAttribute("href")) === "#/lesson/a06-memory");
check("A05 不再显示下一课未完成", !(await text(".lesson-wrap")).includes("还在制作中"));
const saved5 = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress") ?? "null"));
check("A05 完成后进度已保存（第一次答对 2 / 4）", saved5?.lessons?.["a05-cpu-cycle"]?.firstTryCorrect === 2 && saved5?.lessons?.["a05-cpu-cycle"]?.quizTotal === 4, JSON.stringify(saved5?.lessons));
await page.goto(`${BASE}/#/`);
await soon("首页现在显示已完成 5 课", async () => (await text(".stats .stat strong")) === "5");
// A06 已上线：A01–A05 完成后按顺序推荐 A06。
await soon("首页推荐下一门还没学的课（A06）", async () => {
  const t = await text(".today");
  return t.includes("内存与存储") && !t.includes("目前可学的课都学完了");
});

// ---- 完成后徽章按真实条件点亮 ----
await page.goto(`${BASE}/#/me`);
await soon("完成 A01、A03、A04 后获得『第一个比特』和『守门人』", async () => (await page.locator(".badge.earned").count()) === 2 && (await page.locator(".badge.earned", { hasText: "第一个比特" }).count()) === 1 && (await page.locator(".badge.earned", { hasText: "守门人" }).count()) === 1);
// C05与A09–A17均开放后，提示词匠/数据包领航员可按真实完成记录获得，剩余3种仍未开放。
check("课程未开放的徽章如实标注", (await page.getByText("对应课程尚未开放").count()) === 3);
check("连续七天徽章未获得但可获得", (await page.locator(".badge", { hasText: "连续七天" }).getByText("未获得").count()) === 1);

await page.goto(`${BASE}/#/projects`);
await soon("作品页空状态插图加载成功", async () => (await page.locator(".empty-art").count()) === 1 && (await imagesOk()));
await page.goto(`${BASE}/#/nonsense`);
await soon("404 页插图加载成功", async () => (await page.locator(".empty-art").count()) === 1 && (await imagesOk()));

for (const p of ["/paths", "/paths/a", "/paths/c", "/lab", "/projects", "/me", "/lesson/a06-memory", "/nonsense"]) {
  await page.goto(`${BASE}/#${p}`);
  await page.waitForTimeout(50);
  check(`手机宽度无横向溢出：${p}`, await noOverflow());
  check(`页面非空：${p}`, (await text("main")).length > 20);
}
await soon("未知地址显示找不到页面", async () => (await text("main")).includes("找不到这个页面"));
await page.goto(`${BASE}/#/lesson/a18-passwords`);
await soon("规划中的课不会显示假内容", async () => (await text("main")).includes("还没有开放"));

// ---- 清除数据需要二次确认 ----
await page.goto(`${BASE}/#/me`);
await btn("清除学习记录").click();
check("清除前有二次确认", (await page.getByRole("button", { name: /确认清除/ }).count()) === 1);
await page.getByRole("button", { name: /确认清除/ }).click();
const cleared = await page.evaluate(() => localStorage.getItem("nico-progress"));
check("确认后记录被清除", cleared === null);

// ---- 桌面宽度 ----
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/#/lesson/a01-binary`);
await soon("桌面显示侧边导航", () => page.locator(".sidenav").isVisible());
await soon("桌面显示本课目录", () => page.locator(".steps").isVisible());
check("桌面宽度无横向溢出", await noOverflow());

check("全程没有 JS 报错", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
console.log(failures.length ? `\n${failures.length} 项失败` : "\n全部通过");
process.exit(failures.length ? 1 : 0);
