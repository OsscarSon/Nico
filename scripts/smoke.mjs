// 浏览器冒烟测试：把 A01 整节课从头点到尾，并检查手机宽度、续学、404。
// 用法：先 `pnpm build && pnpm preview`，再 `BASE_URL=http://localhost:4173 pnpm smoke`
// 首次需要：pnpm exec playwright install chromium
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
check("首页标题是 Nico", (await text("h1")) === "Nico");
check("首页有 5 张路线卡", (await page.locator(".trackcard").count()) === 5);
check("每张路线卡都有徽记图片", (await page.locator(".trackcard img.track-emblem").count()) === 5);
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
for (const [t, pvs, last] of [[5, [4, 1], false], [37, [32, 4, 1], false], [200, [128, 64, 8], true]]) {
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
check("下一课未开放时不放假链接", (await page.getByRole("link", { name: "下一课", exact: true }).count()) === 0);
check("提示下一课还在准备中", (await text(".lesson-wrap")).includes("下一课还在准备中"));
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("nico-progress") ?? "null"));
check("完成后进度已保存", saved?.lessons?.["a01-binary"]?.quizTotal === 4, JSON.stringify(saved));
check("记录了真实的一次性答对数（3 道选择题 2 对 + 迁移题错过 → 2/4）", saved?.lessons?.["a01-binary"]?.firstTryCorrect === 2, JSON.stringify(saved?.lessons));

// ---- 路线地图 / 首页 / 其它页面 ----
await page.getByRole("link", { name: "回到路线" }).click();
await soon("路线页头有徽记且图片加载成功", async () => (await page.locator(".track-head img").count()) === 1 && (await imagesOk()));
await soon("路线地图显示已完成", async () => (await page.locator(".pm-card .pill.done").count()) === 1);
await soon("路线地图里有 19 个规划中的课", async () => (await page.locator(".pm-card.planned").count()) === 19);
await page.goto(`${BASE}/#/`);
await soon("首页现在显示已完成 1 课", async () => (await text(".stats")).includes("1"));
await soon("首页诚实说明没有下一课可学", async () => (await text(".today")).includes("目前可学的课都学完了"));

// ---- 完成后徽章按真实条件点亮 ----
await page.goto(`${BASE}/#/me`);
await soon("完成 A01 后只获得『第一个比特』", async () => (await page.locator(".badge.earned").count()) === 1 && (await text(".badge.earned")).includes("第一个比特"));
check("课程未开放的徽章如实标注", (await page.getByText("对应课程尚未开放").count()) === 6);
check("连续七天徽章未获得但可获得", (await page.locator(".badge", { hasText: "连续七天" }).getByText("未获得").count()) === 1);

await page.goto(`${BASE}/#/projects`);
await soon("作品页空状态插图加载成功", async () => (await page.locator(".empty-art").count()) === 1 && (await imagesOk()));
await page.goto(`${BASE}/#/nonsense`);
await soon("404 页插图加载成功", async () => (await page.locator(".empty-art").count()) === 1 && (await imagesOk()));

for (const p of ["/paths", "/paths/a", "/paths/c", "/lab", "/projects", "/me", "/lesson/a02-hex-encoding", "/nonsense"]) {
  await page.goto(`${BASE}/#${p}`);
  await page.waitForTimeout(50);
  check(`手机宽度无横向溢出：${p}`, await noOverflow());
  check(`页面非空：${p}`, (await text("main")).length > 20);
}
await soon("未知地址显示找不到页面", async () => (await text("main")).includes("找不到这个页面"));
await page.goto(`${BASE}/#/lesson/a02-hex-encoding`);
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
