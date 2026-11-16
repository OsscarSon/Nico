// 路线 B 的浏览器冒烟测试（手机宽度 390px）：把 B01、B02、B03、B08 从头点到尾，
// 并检查：Python 真的运行、检查答案能判对判错、死循环会被停止、没网时的诚实提示、
// HTML 预览不执行脚本。
// 用法：先 `npm run build && npm run preview`（保持运行），再在另一个终端：
//   PowerShell：$env:BASE_URL = "http://localhost:4173"; npm run smoke:b
//   macOS/Linux：BASE_URL=http://localhost:4173 npm run smoke:b
// 默认使用真实的 Pyodide（从 jsDelivr 下载，需要联网，首次约几十秒）。
// 离线 / 无法联网的环境：设置 PYODIDE_STUB=某个 JS 文件路径，它会代替 jsDelivr 上的 pyodide.js。
const { chromium } = await import(process.env.PW_PATH ?? "playwright");
import { readFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const STUB = process.env.PYODIDE_STUB;
const CDN = "https://cdn.jsdelivr.net/pyodide/**";

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  if (!ok) failures.push(name);
};
const soon = async (name, fn, timeout = 20000) => {
  const end = Date.now() + timeout;
  let ok = false, detail = "";
  while (Date.now() < end) {
    try { ok = Boolean(await fn()); } catch (e) { ok = false; detail = String(e.message).split("\n")[0]; }
    if (ok) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  check(name, ok, detail);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
if (STUB) {
  const body = readFileSync(STUB, "utf8");
  await ctx.route(CDN, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body }));
}
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource|net::ERR|Blocked script execution in 'about:srcdoc'/.test(m.text())) errors.push(`console: ${m.text()}`);
});

const btn = (name) => page.getByRole("button", { name, exact: true }).first();
const next = () => page.getByRole("button", { name: "下一步", exact: true });
const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const outputText = () => page.locator(".code-output").first().innerText();

/** 往编辑器里放代码：CodeMirror 是 contenteditable，退回模式是文本框，两种都支持。 */
async function setCode(code) {
  const ta = page.locator(".code-textarea").first();
  if (await ta.count()) { await ta.fill(code); return; }
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(code);
}

async function quiz(correct) {
  for (let i = 0; i < correct.length; i++) {
    await page.getByRole("button", { name: correct[i], exact: false }).first().click();
    await btn(i + 1 < correct.length ? "下一题" : "完成检查").click();
  }
}
async function transfer(n) {
  await page.getByLabel("你的答案（一个整数）").fill(String(n));
  await btn("检查答案").click();
}

async function openLesson(id) {
  await page.goto(`${BASE}/#/lesson/${id}`);
  await page.waitForSelector(".lesson-body");
}

// ---- 路线页 ----
await page.goto(`${BASE}/#/paths/b`);
await soon("路线 B 页面显示 20 课规划", async () => (await page.locator("main").innerText()).includes("共 20 课规划，现在可学 14 课"));
check("路线 B 有 6 个规划中的课", (await page.locator(".pm-card.planned").count()) === 6);
check("手机宽度无横向溢出：路线 B", await noOverflow());

// ---- B01 ----
await openLesson("b01-variables");
check("B01 带「草稿」标记", (await page.locator(".lesson-head").innerText()).includes("草稿"));
await next().click(); await next().click(); await next().click();
check("Python 互动不标「模拟」，标「真实 Python」", (await page.locator(".device header .pill").first().innerText()) === "真实 Python");
check("互动里有代码编辑器", (await page.locator(".code-editor").count()) === 1);
await btn("运行").click();
await soon("B01 自由练习：Python 运行并显示输出", async () => {
  const t = await outputText();
  return t.includes("你好，Nico") && t.split("\n").includes("36");
});
await setCode('print("第二次")');
await btn("运行").click();
await soon("改了代码再运行，输出跟着变", async () => (await outputText()).trim() === "第二次");
await setCode("print(1 +");
await btn("运行").click();
await soon("语法错误：显示行号与中文提示", async () => {
  const t = await page.locator(".code-out .feedback").first().innerText();
  return t.includes("SyntaxError") && t.includes("第 1 行");
});
check("手机宽度无横向溢出：Python 互动", await noOverflow());
await next().click();
check("挑战没完成时「下一步」是禁用的", await next().isDisabled());
await btn("检查答案").click();
await soon("挑战：没写答案时，指出期望输出 60（而不是先说写法）", async () => (await page.locator(".checklist").innerText()).includes("期望输出「60」"));
await setCode("price = 15\ncount = 4\nprint(60)");
await btn("检查答案").click();
await soon("挑战：输出对但把答案写死，被拦下", async () => (await page.locator(".code-checks").innerText()).includes("请用变量 price 和 count"));
check("被拦下时不算通过（下一步仍禁用）", await next().isDisabled());
await setCode("price = 15\ncount = 4\nprint(price * count)");
await btn("检查答案").click();
await soon("挑战：正确答案通过", async () => (await page.locator("main").innerText()).includes("全部检查通过"));
check("通过后「下一步」可用", await next().isEnabled());
await next().click();
await quiz(["6", "my_price", "34"]);
await next().click();
await transfer(14);
await soon("B01 迁移题通过", async () => (await page.locator("main").innerText()).includes("答对了"));
await next().click();
check("B01 小结有 3 条", (await page.locator(".points li").count()) === 3);
check("B01 完成后记录了进度", await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("nico-progress") ?? "{}").lessons?.["b01-variables"])));
check("B01 的下一课「条件」可进入", (await page.getByRole("link", { name: "下一课" }).getAttribute("href")) === "#/lesson/b02-conditions");

// ---- B02：input() ----
await openLesson("b02-conditions");
await next().click(); await next().click(); await next().click();
await page.getByLabel(/程序输入/).fill("59");
await btn("运行").click();
await soon("B02 自由练习：输入 59 显示 不及格", async () => (await outputText()).includes("不及格"));
await page.getByLabel(/程序输入/).fill("60");
await btn("运行").click();
await soon("B02 自由练习：输入 60 显示 及格", async () => (await outputText()).trim().endsWith("及格") && !(await outputText()).includes("不及格"));
await next().click();
await setCode(`score = int(input())
if score > 90:
    print("优秀")
elif score > 60:
    print("及格")
else:
    print("不及格")`);
await btn("检查答案").click();
await soon("B02 挑战：边界写成 > 时，指出 90 和 60 两个边界没过", async () => {
  const t = await page.locator(".checklist").innerText();
  return t.includes("输入 90") && t.includes("输入 60") && t.includes("想想用 > 还是 >=");
});
await setCode(`score = int(input())
if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")`);
await btn("检查答案").click();
await soon("B02 挑战：5 项检查全部通过", async () => (await page.locator(".checklist li[data-ok='true']").count()) === 5);
await next().click();
await quiz(["True", "a == b", "A 然后 B"]);
await next().click();
await transfer(15);
await next().click();
check("B02 完成后记录了进度", await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("nico-progress") ?? "{}").lessons?.["b02-conditions"])));

// ---- B03：死循环会被停止 ----
await openLesson("b03-loops");
await next().click(); await next().click(); await next().click();
await setCode("while True:\n    pass");
const t0 = Date.now();
await btn("运行").click();
await soon("B03 死循环：约 5 秒后被自动停止并提示", async () => (await page.locator("main").innerText()).includes("运行超过 5 秒"), 30000);
check("停止发生在合理时间内（不是卡死）", Date.now() - t0 < 30000);
check("停止后「运行」按钮回来了", await btn("运行").isVisible());
await setCode("print('还能再跑')");
await btn("运行").click();
await soon("停止后可以继续运行新代码", async () => (await outputText()).includes("还能再跑"), 60000);
// 学习者手动停止
await setCode("while True:\n    pass");
await btn("运行").click();
await btn("停止").click();
await soon("点「停止」能终止运行", async () => (await page.locator("main").innerText()).includes("已停止"));
await next().click();
await setCode("n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    total = total + i\nprint(total)");
await btn("检查答案").click();
await soon("B03 挑战：4 项检查全部通过", async () => (await page.locator(".checklist li[data-ok='true']").count()) === 4, 40000);
await next().click();
await quiz(["0、1、2", "4", "条件永远是 True"]);
await next().click();
await transfer(10);
await next().click();
check("B03 的下一课是 B04", (await page.getByRole("link", { name: "下一课" }).getAttribute("href")) === "#/lesson/b04-functions");

// ---- B04–B07：Python 基础的其余四课（每课：错误写法 → 正确写法 → 选择题 → 迁移题）----
const python4 = [
  { id: "b04-functions", wrong: "def area(w, h):\n    print(w * h)", right: "def area(w, h):\n    return w * h", failSees: "area(2, 3) + area(1, 1)", quiz: ["3", "None", "不会执行：函数在 return 处结束"], transfer: 11, next: "b05-lists" },
  { id: "b05-lists", wrong: "nums = list(map(int, input().split()))\nbest = 0\nfor n in nums:\n    if n > best:\n        best = n\nprint(best)", right: "nums = list(map(int, input().split()))\nbest = nums[0]\nfor n in nums:\n    if n > best:\n        best = n\nprint(best)", failSees: "全是负数", quiz: ["20", "[1, 2, 9]", "3"], transfer: 12, next: "b06-dicts" },
  { id: "b06-dicts", wrong: "words = input().split()\ncounts = {}\nfor w in words:\n    counts[w] = 1\nfor w in counts:\n    print(w, counts[w])", right: "words = input().split()\ncounts = {}\nfor w in words:\n    if w in counts:\n        counts[w] = counts[w] + 1\n    else:\n        counts[w] = 1\nfor w in counts:\n    print(w, counts[w])", failSees: "输入 a b a c b a", quiz: ["2", "报错（KeyError）", "1"], transfer: 12, next: "b07-debugging" },
  { id: "b07-debugging", wrong: "total = 0\nfor i in range(1, 5):\n    total = total + i\nprint(total)", right: "total = 0\nfor i in range(1, 6):\n    total = total + i\nprint(total)", failSees: "15", quiz: ["最后一行（错误类型和说明）", "totl 还没定义", "逻辑错误"], transfer: 10, next: "b08-html" },
];
for (const L of python4) {
  await openLesson(L.id);
  for (let i = 0; i < 3; i++) await next().click();
  await btn("运行").click();
  await soon(`${L.id} 自由练习能运行`, async () => (await page.locator(".code-output").count()) === 1 && !(await page.locator(".code-out .feedback").count()));
  await next().click();
  if (L.id === "b07-debugging") {
    await btn("运行").click();
    await soon("B07 起始代码：读到语法错误和行号", async () => { const t = await page.locator(".code-out .feedback").first().innerText(); return t.includes("SyntaxError") && t.includes("第 2 行"); });
  }
  await setCode(L.wrong);
  await btn("检查答案").click();
  await soon(`${L.id} 常见错误写法被指出`, async () => (await page.locator(".checklist li[data-ok='false']").count()) >= 1 && (await page.locator(".checklist").innerText()).includes(L.failSees), 40000);
  await setCode(L.right);
  await btn("检查答案").click();
  await soon(`${L.id} 正确答案全部通过`, async () => (await page.locator("main").innerText()).includes("全部检查通过"), 40000);
  await next().click();
  await quiz(L.quiz);
  await next().click();
  await transfer(L.transfer);
  await next().click();
  check(`${L.id} 完成后记录了进度，下一课指向 ${L.next}`, (await page.evaluate((id) => Boolean(JSON.parse(localStorage.getItem("nico-progress") ?? "{}").lessons?.[id]), L.id)) && (await page.getByRole("link", { name: "下一课" }).getAttribute("href")) === `#/lesson/${L.next}`);
}

// ---- B08：HTML 预览 ----
await openLesson("b08-html");
await next().click(); await next().click();
const frame = () => page.locator("iframe.web-preview");
check("预览 iframe 的 sandbox 为空（禁止脚本）", (await frame().getAttribute("sandbox")) === "");
await setCode("<h2>改过了</h2>");
await soon("预览跟着代码变", async () => (await frame().getAttribute("srcdoc")).includes("改过了"));
const titleBefore = await page.title();
await setCode("<script>window.parent.document.title='pwned'</script><p>x</p>");
await page.waitForTimeout(800);
check("预览里的脚本不会执行、改不了外层页面", (await page.title()) === titleBefore);
check("预览文档带内容安全策略", (await frame().getAttribute("srcdoc")).startsWith('<meta http-equiv="Content-Security-Policy"'));
check("手机宽度无横向溢出：HTML 互动", await noOverflow());
await next().click();
await btn("检查答案").click();
await soon("B08 挑战：空页面四项都没过", async () => (await page.locator(".checklist li[data-ok='false']").count()) === 4);
await setCode(`<h1>关于我</h1>
<p>我叫 Nico。</p>
<p>三个爱好：</p>
<ul><li>画画</li><li>游戏</li></ul>
<a href="https://developer.mozilla.org/">MDN</a>`);
await btn("检查答案").click();
await soon("B08 挑战：只有 2 项列表时指出还差一项", async () => (await page.locator(".checklist").innerText()).includes("需要至少 3 个，现在只有 2 个"));
await setCode(`<h1>关于我</h1>
<p>我叫 Nico。</p>
<p>三个爱好：</p>
<ul><li>画画</li><li>游戏</li><li>编程</li></ul>
<a href="https://developer.mozilla.org/">MDN</a>`);
await btn("检查答案").click();
await soon("B08 挑战：四项全部通过", async () => (await page.locator(".checklist li[data-ok='true']").count()) === 4);
await next().click();
await quiz(["h1", "li", "href"]);
await next().click();
await transfer(4);
await next().click();
check("B08 完成后记录了进度", await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("nico-progress") ?? "{}").lessons?.["b08-html"])));

// ---- B09、B10：CSS（读浏览器真正算出来的样式）----
const css2 = [
  { id: "b09-css", failN: 4, right: `<style>
  h1 { color: #2457f5; }
  p { font-size: 20px; }
  .note { background-color: #ffb020; text-align: center; }
</style>
<h1>我的小站</h1><p>欢迎</p><p class="note">提示</p>`,
    partial: `<style>
  h1 { color: red; }
  p { font-size: 20px; }
  .note { background-color: #ffb020; text-align: center; }
</style>
<h1>我的小站</h1><p>欢迎</p><p class="note">提示</p>`, partialSees: "color 现在是 rgb(255, 0, 0)",
    inline: `<h1 style="color:#2457f5">x</h1><p style="font-size:20px">y</p><p class="note" style="font-size:20px;background-color:#ffb020;text-align:center">z</p>`,
    quiz: ["属性", ".note", "blue"], transfer: 24, next: "b10-css-layout" },
  { id: "b10-css-layout", failN: 6, right: `<style>
  .row { display: flex; gap: 16px; justify-content: space-between; }
  .card { padding: 16px; border: 2px solid #14213d; }
</style>
<div class="row"><div class="card">一</div><div class="card">二</div><div class="card">三</div></div>`,
    partial: `<style>
  .row { display: flex; gap: 16px; justify-content: space-between; }
  .card { padding: 16px; border: 2px #14213d; }
</style>
<div class="row"><div class="card">一</div><div class="card">二</div><div class="card">三</div></div>`, partialSees: "border-top-width 现在是 0px",
    inline: null, quiz: ["内容 → 内边距 → 边框 → 外边距", "外层的容器上", "padding 在边框里面，margin 在边框外面"], transfer: 134, next: "b11-js-dom" },
];
for (const L of css2) {
  await openLesson(L.id);
  for (let i = 0; i < 3; i++) await next().click();
  await soon(`${L.id} 自由练习：预览里有内容`, async () => (await page.locator("iframe.web-preview").getAttribute("srcdoc")).includes("<style>"));
  await next().click();
  await btn("检查答案").click();
  await soon(`${L.id} 起始代码：${L.failN} 项都没过`, async () => (await page.locator(".checklist li[data-ok='false']").count()) === L.failN);
  await setCode(L.partial);
  await btn("检查答案").click();
  await soon(`${L.id} 写错一项：指出浏览器算出的实际值`, async () => (await page.locator(".checklist").innerText()).includes(L.partialSees));
  if (L.inline) {
    await setCode(L.inline);
    await btn("检查答案").click();
    await soon(`${L.id} 用行内 style 绕过：被要求写进 <style>`, async () => (await page.locator("main").innerText()).includes("请把 CSS 写在 <style> 标签里"));
    check(`${L.id} 绕过时不算通过`, await next().isDisabled());
  }
  await setCode(L.right);
  await btn("检查答案").click();
  await soon(`${L.id} 正确答案全部通过`, async () => (await page.locator("main").innerText()).includes("全部检查通过"));
  await next().click();
  await quiz(L.quiz);
  await next().click();
  await transfer(L.transfer);
  await next().click();
  check(`${L.id} 完成后下一课指向 ${L.next}`, (await page.getByRole("link", { name: "下一课" }).count()) === 0 ? L.next === "b11-js-dom" : (await page.getByRole("link", { name: "下一课" }).getAttribute("href")) === `#/lesson/${L.next}`);
}
// B08 的真浏览器判分：起始代码不过、参考答案通过

// ---- B11、B12：真实 JavaScript（沙盒 iframe）----
async function toChallenge() {
  for (let i = 0; i < 8; i++) {
    const b = page.getByRole("button", { name: "检查答案", exact: true });
    if ((await b.count()) > 0 && (await b.last().isEnabled())) return;
    await next().click();
  }
}
async function passJs(L) {
  await setCode(L.right);
  await btn("检查答案").click();
  await soon(`${L.id} 正确答案全部通过`, async () => (await page.locator("main").innerText()).includes("全部检查通过"));
}
// B11
await page.evaluate(() => localStorage.clear());
await openLesson("b11-js-dom");
for (let i = 0; i < 2; i++) await next().click();
await btn("运行").click();
await soon("b11 自由练习：console 输出 36 和 你好，Nico", async () => { const t = await outputText(); return t.includes("36") && t.includes("你好，Nico") && t.includes("3"); });
await toChallenge();
await btn("检查答案").click();
await soon("b11 sumTo 起始代码：5 项都没过", async () => (await page.locator(".checklist li[data-ok='false']").count()) === 5);
await setCode("function sumTo(n) { return 15; }");
await btn("检查答案").click();
await soon("b11 写死答案：被指出", async () => (await page.locator(".checklist").innerText()).includes("期望输出"));
await setCode("function sumTo(n) { let t = 0; for (let i = 1; i <= n; i++) { t += i; } return t; }");
await btn("检查答案").click();
await soon("b11 sumTo 通过", async () => (await page.locator("main").innerText()).includes("全部检查通过"));
// 死循环：被停止，页面仍可操作
await setCode("function sumTo(n) { while (true) {} }");
await page.getByRole("button", { name: "重置", exact: true }).click();
await setCode("while (true) {}");
const tLoop = Date.now();
await btn("运行").click();
await soon("b11 死循环被停止并给出提示", async () => (await page.locator("main").innerText()).includes("太久") || (await page.locator("main").innerText()).includes("停不下来"), 15000);
check("b11 死循环之后页面仍然可以操作", (await btn("重置").isEnabled()) && Date.now() - tLoop < 14000);

// B11 第二个挑战（DOM）和 B12：页面在沙盒 iframe 里，检查程序读 DOM
await page.evaluate(() => localStorage.clear());
await page.goto("about:blank");
await openLesson("b11-js-dom");
await toChallenge();
await passJs({ id: "b11 sumTo", right: "function sumTo(n){let t=0;for(let i=1;i<=n;i++){t+=i;}return t;}" });
await next().click();
await next().click();
await soon("b11 页面：运行后标题变成「你好，JS」", async () => { await btn("运行").click(); return (await page.frameLocator("iframe").first().locator("#title").innerText()) === "你好，JS"; });
await toChallenge();
await page.getByRole("button", { name: "检查答案", exact: true }).last().click();
await soon("b11 DOM 起始代码：3 项都没过", async () => (await page.locator(".checklist li[data-ok='false']").count()) === 3);
await passJs({ id: "b11 DOM", right: `document.querySelector("#title").textContent = "你好，JS";
const list = document.querySelector("#list");
for (let i = 1; i <= 3; i++) { const li = document.createElement("li"); li.textContent = i; list.appendChild(li); }` });

await page.evaluate(() => localStorage.clear());
await page.goto("about:blank");
await openLesson("b12-events");
for (let i = 0; i < 3; i++) await next().click();
await btn("运行").click();
await soon("b12 计数器：真的点击按钮，页面数字变 2", async () => {
  const f = page.frameLocator("iframe").first();
  await f.locator("#btn").click(); await f.locator("#btn").click();
  return (await f.locator("#out").innerText()) === "2";
});
await toChallenge();
await btn("检查答案").click();
await soon("b12 起始代码：3 项没过（「还没点击时为空」本来就成立）", async () => (await page.locator(".checklist li[data-ok='false']").count()) === 3);
await setCode(`const go = document.querySelector("#go");
const msg = document.querySelector("#msg");
go.addEventListener("click", greet());
function greet() { msg.textContent = "你好，" + document.querySelector("#name").value; }`);
await btn("检查答案").click();
await soon("b12 多写括号 greet()：被检查出来", async () => (await page.locator(".checklist li[data-ok='false']").count()) >= 1);
await passJs({ id: "b12", right: `const nameInput = document.querySelector("#name");
const go = document.querySelector("#go");
const msg = document.querySelector("#msg");
go.addEventListener("click", () => { msg.textContent = "你好，" + nameInput.value; });` });
check("b12 无 JS 报错、无横向溢出", await noOverflow());

// ---- B14、B15：Git 模拟器 ----
const term = async (cmd) => {
  await page.locator("#git-input").fill(cmd);
  await page.locator("#git-input").press("Enter");
};
const termText = () => page.locator(".git-term").innerText();
const gitLesson = async (id) => {
  await page.evaluate(() => localStorage.clear());
  await page.goto("about:blank");
  await openLesson(id);
  for (let i = 0; i < 10 && (await page.locator("#git-input").count()) === 0; i++) await next().click();
};
await gitLesson("b14-git-basics");
await term("git status");
await soon("b14 没 init 时给出诚实提示", async () => (await termText()).includes("not a git repository"));
await term("git init"); await term("git status");
await soon("b14 init 后 status 显示未跟踪文件", async () => (await termText()).includes("Untracked"));
await term("git add ."); await term("git commit -m \"一\"");
await soon("b14 提交成功", async () => (await termText()).includes("[main "));
check("b14 手机宽度没有横向溢出", await noOverflow());
await next().click();
await soon("b14 挑战：起始 4 项未达成", async () => (await page.locator(".checklist li[data-ok='false']").count()) === 4);
for (const c of ["git init", "git add .", 'git commit -m "first"', "edit index.html"]) await term(c);
await term("git commit -m \"x\"");
await soon("b14 没 add 就 commit：被解释", async () => (await termText()).includes("没 git add"));
for (const c of ["git add index.html", 'git commit -m "second"']) await term(c);
await soon("b14 挑战通过", async () => (await page.locator("main").innerText()).includes("全部目标达成"));
check("b14 通过后输入框被禁用", await page.locator("#git-input").isDisabled());

await gitLesson("b15-git-branches");
for (const c of ["git switch -c feature", "new style.css", "git add style.css", 'git commit -m "css"', "git switch main", "ls"]) await term(c);
await soon("b15 切回 main 后 style.css 不见了", async () => { const t = await termText(); return t.trimEnd().endsWith("index.html"); });
await term("git merge feature"); await term("ls");
await soon("b15 快进合并后 style.css 回来了", async () => (await termText()).includes("Fast-forward") && (await termText()).trimEnd().endsWith("index.html  style.css"));
await page.getByRole("button", { name: "下一步", exact: true }).click();
await page.getByRole("button", { name: "下一步", exact: true }).click().catch(() => {});
for (let i = 0; i < 4 && (await page.locator(".checklist").count()) === 0; i++) await next().click();
for (const c of ["git switch -c feature", "new style.css", "git add style.css", 'git commit -m "add css"', "git switch main", "edit index.html"]) await term(c);
await term("git switch feature");
await soon("b15 有未提交修改时拒绝切换", async () => (await termText()).includes("切换分支会弄丢"));
for (const c of ["git add index.html", 'git commit -m "t"', "git merge feature"]) await term(c);
await soon("b15 挑战通过（合并提交）", async () => (await page.locator("main").innerText()).includes("全部目标达成"));
check("b15 手机宽度没有横向溢出", await noOverflow());

// ---- 看答案：连续答错 2 次后出现 ----
await page.evaluate(() => localStorage.clear());
await openLesson("b01-variables");
await next().click(); await next().click(); await next().click(); await next().click();
await btn("检查答案").click();
await btn("检查答案").click();
await soon("答错 2 次后出现「看参考答案」", async () => (await btn("看参考答案").count()) === 1);
await btn("看参考答案").click();
await soon("参考答案显示出来，并且可以继续", async () => (await page.locator(".code-solution").innerText()).includes("print(price * count)") && (await next().isEnabled()));

// ---- 没网：诚实的提示，而且之后可以重试 ----
await page.unroute?.(CDN).catch(() => {});
await ctx.unroute(CDN).catch(() => {});
await ctx.route(CDN, (r) => r.abort());
await page.evaluate(() => localStorage.clear());
await page.goto("about:blank");
await openLesson("b01-variables");
await page.waitForSelector(".lesson-body");
await next().click(); await next().click(); await next().click();
await btn("运行").click();
await soon("Pyodide 下载失败：说明是没网，不假装运行成功", async () => (await page.locator("main").innerText()).includes("Python 没能加载"));
check("失败后「运行」按钮还在，可重试", await btn("运行").isVisible());

check("整个过程没有 JS 报错", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(failures.length ? `\n${failures.length} 项失败：\n- ${failures.join("\n- ")}` : "\n全部通过");
process.exit(failures.length ? 1 : 0);
