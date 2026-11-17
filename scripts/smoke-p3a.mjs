// Actual learner operations only: no state injection, no API token, no real deploy.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4197", OUT = process.env.SCREENSHOT_DIR ?? "test-results/p3a";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(), failures = []; let checks = 0;
const ids = ["b13-fetch-json", "b16-github", "b17-pages"];
const transfers = [1, 2, 2];
const target = '<h1>编程社</h1>\n<p>联系：club@example.invalid</p>';
const html = '<h1>编程社</h1>\n<link rel="stylesheet" href="./style.css">\n<p id="message">等待脚本</p>\n<script src="./app.js"></script>';
const button = (p, name) => p.getByRole("button", { name, exact: true });
const click = (p, name) => button(p, name).click();
const next = p => button(p, "下一步");
const text = p => p.locator(".p3-lab").innerText();
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
function check(name, ok) { checks++; console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failures.push(name); }
async function wait(test, label) { const end = Date.now() + 10000; while (Date.now() < end) { if (await test()) return; await new Promise(r => setTimeout(r, 50)); } throw Error(`timeout: ${label}`); }
async function editor(p, label, value) {
  const box = p.getByRole("textbox", { name: label, exact: true }); await box.waitFor(); await box.focus();
  await p.keyboard.press("ControlOrMeta+A"); await p.keyboard.insertText(value);
}
async function send(p) { await click(p, "发送本地请求"); await wait(() => button(p, "发送本地请求").isEnabled(), "local Promise settled"); }
async function read(p, touch = false) {
  if (touch) {
    const control = button(p, "发送本地请求"); await control.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    const box = await control.boundingBox(); await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await wait(() => control.isEnabled(), "native touch request settled");
  } else await send(p);
  await click(p, "解析响应 JSON"); await click(p, "把字段显示到页面");
}
async function command(p, cmd) { await p.getByLabel("本地Git命令", { exact: true }).fill(cmd); await p.getByLabel("本地Git命令", { exact: true }).press("Enter"); }
async function empty(p, last, label) { await click(p, "检查当前任务"); check(`${label}: no-op cannot advance`, await button(p, last ? "完成挑战" : "下一任务").isDisabled() && await next(p).isDisabled()); }
async function complete(p, last, label) { await click(p, "检查当前任务"); const name = last ? "完成挑战" : "下一任务"; const ok = await button(p, name).isEnabled(); check(`${label}: real state passes`, ok); if (!ok) throw Error(await text(p)); await click(p, name); }
async function snap(p, id, width) {
  if (width === 360) return;
  if (id === "b17-pages") {
    await p.locator(".p3-preview").evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await p.waitForTimeout(150); // Let the cross-origin iframe paint within the actual viewport.
    await p.screenshot({ path: `${OUT}/${id}-${width}.png` });
  } else await p.locator(".device").screenshot({ path: `${OUT}/${id}-${width}.png` });
}
async function fetchChallenge(p, width) {
  for (let task = 0; task < 4; task++) {
    const label = `${width}/B13/${task + 1}`; await empty(p, task === 3, label);
    await send(p); if (task < 2) await click(p, "解析响应 JSON"); if (task === 1) await click(p, "把字段显示到页面");
    check(`${label}: failure actually observed`, (await text(p)).includes(["JSON解析失败", "不存在或不是", "没有 HTTP Response", "HTTP 404"][task]));
    if (task === 0) await editor(p, "响应JSON编辑器", '{"id":2,"name":"Mina","points":8}');
    if (task === 1) await p.getByLabel("显示字段", { exact: true }).fill("name");
    if (task === 2) await p.getByRole("checkbox", { name: "模拟网络可用" }).check();
    if (task === 3) await p.getByLabel("本地请求路径", { exact: true }).fill("/api/profile?id=1");
    if (task === 1) await click(p, "把字段显示到页面"); else await read(p);
    check(`${label}: page displays actual returned value`, (await p.getByLabel("数据页面", { exact: true }).innerText()) === (task < 2 ? "Mina" : "Nico"));
    check(`${label}: no overflow`, !await overflow(p));
    await complete(p, task === 3, label);
    if (task === 3) await snap(p, ids[0], width);
  }
}
async function githubChallenge(p, width) {
  const label = `${width}/B16`; await empty(p, true, label);
  await click(p, "Clone到本地"); await command(p, "git switch -c feature");
  await p.getByLabel("本地 index.html", { exact: true }).fill("<h1>编程社</h1>");
  await command(p, 'git commit -m "漏了add"'); check(`${label}: no staged changes cannot commit`, (await text(p)).includes("没 git add") || (await text(p)).includes("nothing added"));
  await command(p, "git add ."); await command(p, 'git commit -m "更新标题"');
  check(`${label}: local commit has not updated remote`, (await p.getByLabel("远程仓库", { exact: true }).innerText()).includes("旧标题"));
  await click(p, "创建 Pull Request"); check(`${label}: unpublished branch cannot open PR`, (await text(p)).includes("先把本地功能分支push"));
  await click(p, "Push当前分支"); await click(p, "创建 Pull Request"); await click(p, "队友提交更新");
  await click(p, "批准当前版本"); check(`${label}: review needs current diff inspection`, (await text(p)).includes("请先查看当前远程差异"));
  await click(p, "查看远程差异"); await click(p, "批准当前版本"); await click(p, "合并 Pull Request");
  check(`${label}: genuine divergent files block remote merge`, (await text(p)).includes("CONFLICT"));
  await click(p, "Pull远程main"); check(`${label}: local conflict shows base and both actual versions`, (await text(p)).includes("共同祖先") && (await text(p)).includes("club@example.invalid"));
  await p.getByLabel("本地 index.html", { exact: true }).fill("<<<<<<< ours\n=======\n>>>>>>> theirs"); await click(p, "完成冲突解决"); check(`${label}: unresolved markers rejected`, (await text(p)).includes("仍有冲突标记"));
  await p.getByLabel("本地 index.html", { exact: true }).fill(target); await click(p, "完成冲突解决"); await click(p, "Push当前分支");
  await click(p, "合并 Pull Request"); check(`${label}: new push invalidates old approval`, (await text(p)).includes("需要对当前远程版本完成审查"));
  await click(p, "查看远程差异"); await click(p, "批准当前版本"); await click(p, "合并 Pull Request");
  await click(p, "检查当前任务"); check(`${label}: remote merge alone cannot complete local sync`, await button(p, "完成挑战").isDisabled());
  await command(p, "git switch main"); await click(p, "Pull远程main");
  check(`${label}: both contributions really present locally`, await p.getByLabel("本地 index.html", { exact: true }).inputValue() === target);
  check(`${label}: no overflow`, !await overflow(p)); await complete(p, true, label); await snap(p, ids[1], width);
}
async function build(p) { await click(p, "检查项目文件"); await click(p, "构建静态产物"); }
async function visit(p) { await click(p, "访问并验证页面"); await wait(async () => await button(p, "访问并验证页面").count() === 1 && await button(p, "访问并验证页面").isEnabled(), "published sandbox finished"); }
async function deploy(p) { await build(p); await click(p, "部署到模拟站点"); await visit(p); }
async function deploymentChallenge(p, width) {
  for (let task = 0; task < 3; task++) {
    const label = `${width}/B17/${task + 1}`; await empty(p, task === 2, label);
    await click(p, "部署到模拟站点"); check(`${label}: no output cannot deploy`, (await text(p)).includes("还没有构建产物"));
    await deploy(p); check(`${label}: actual page/asset 404`, (await p.getByLabel("发布请求记录", { exact: true }).innerText()).includes("404"));
    if (task === 0) await p.getByLabel("发布目录", { exact: true }).fill("dist"); else await editor(p, "发布项目代码编辑器", html);
    await deploy(p);
    const requests = await p.getByLabel("发布请求记录", { exact: true }).innerText(); check(`${label}: page, CSS and JS actually 200`, requests.split("\n").filter(Boolean).every(line => line.startsWith("200 ")));
    const frame = p.frameLocator('.p3-preview iframe'); await frame.locator("#message").waitFor();
    check(`${label}: published JS and CSS actually executed`, await frame.locator("#message").innerText() === "来自已发布的 JS" && await frame.locator("h1").evaluate(el => getComputedStyle(el).color) === "rgb(36, 87, 245)");
    if (task === 1) {
      await p.getByLabel("项目文件", { exact: true }).selectOption("src/app.js"); await editor(p, "发布项目代码编辑器", 'throw new Error("测试异常");');
      await click(p, "检查当前任务"); check(`${label}: editing source invalidates challenge but cannot change live snapshot`, await button(p, "下一任务").isDisabled());
      await visit(p); check(`${label}: old deployed JS still works until a new deployment`, await frame.locator("#message").innerText() === "来自已发布的 JS");
      await deploy(p); check(`${label}: newly published JS error truthfully fails`, (await text(p)).includes("发布页面执行失败"));
      await p.getByLabel("项目文件", { exact: true }).selectOption("src/app.js"); await editor(p, "发布项目代码编辑器", 'document.querySelector("#message").textContent = "来自已发布的 JS";'); await deploy(p);
    }
    check(`${label}: no overflow`, !await overflow(p)); await complete(p, task === 2, label); if (task === 2) await snap(p, ids[2], width);
  }
}
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 900 });
    const p = await context.newPage(), errors = [], external = []; p.on("pageerror", e => errors.push(e.message));
    p.on("request", r => { if (/pages\.example\.invalid|api\.example\.invalid|api\.github\.com/.test(r.url())) external.push(r.url()); });
    for (let i = 0; i < ids.length; i++) {
      await p.goto(`${BASE}/#/lesson/${ids[i]}`); await p.locator(".lesson-body").waitFor();
      check(`${width}/${ids[i]}: draft, formal art placeholder, preserved dark`, (await p.locator(".lesson-head").innerText()).includes("草稿") && await p.locator(".foundation-art-pending").count() === 1 && await p.locator("html").getAttribute("data-theme") === "dark");
      for (let step = 0; step < 5; step++) await next(p).click();
      check(`${width}/${ids[i]}: explicit simulated lab`, await p.locator(".device header .pill").innerText() === "模拟");
      if (i === 0) {
        await editor(p, "响应JSON编辑器", ""); await p.getByLabel("请求方法", { exact: true }).selectOption("POST"); await editor(p, "请求JSON编辑器", '{"name":"Ada"}'); await read(p, width === 360);
        check(`${width}/B13: free POST JSON creates a different real response`, (await p.getByLabel("API响应", { exact: true }).innerText()).includes("201") && await p.getByLabel("数据页面", { exact: true }).innerText() === "Ada");
      } else if (i === 1) { await click(p, "Clone到本地"); await command(p, "git status"); check(`${width}/B16: free clone creates a local repository`, (await p.getByLabel("本地仓库", { exact: true }).innerText()).includes("main")); }
      else { await deploy(p); check(`${width}/B17: free wrong-dir publish has genuine404`, (await text(p)).includes("入口404")); }
      await next(p).click(); check(`${width}/${ids[i]}: new challenge instance starts locked`, await next(p).isDisabled());
      await [fetchChallenge, githubChallenge, deploymentChallenge][i](p, width);
      check(`${width}/${ids[i]}: operations unlock next`, await next(p).isEnabled()); await next(p).click();
      // Each check question includes a real misconception diagnosis before the correct choice.
      for (let q = 0; q < 3; q++) { await p.locator(".option").nth(1).click(); check(`${width}/${ids[i]}/quiz${q}: targeted wrong feedback`, (await p.locator(".feedback.bad").innerText()).length > 15); await p.locator(".option").nth(0).click(); await click(p, q < 2 ? "下一题" : "完成检查"); }
      await next(p).click(); await p.getByLabel("你的答案（一个整数）").fill("99"); await click(p, "检查答案"); check(`${width}/${ids[i]}: transfer wrong remains locked`, await next(p).isDisabled());
      await p.getByLabel("你的答案（一个整数）").fill(String(transfers[i])); await click(p, "检查答案"); await next(p).click();
      const record = await p.evaluate(id => JSON.parse(localStorage.getItem("nico-progress")).lessons[id], ids[i]);
      check(`${width}/${ids[i]}: original v1 records actual completion and four assessments`, record.quizTotal === 4 && record.firstTryCorrect === 0 && await p.locator(".foundation-sources a").count() >= 3);
      await p.reload(); check(`${width}/${ids[i]}: completion persists after reload`, (await p.locator(".lesson-head").innerText()).includes("已完成"));
    }
    check(`${width}: no fake remote API, GitHub or deployment requests`, external.length === 0);
    check(`${width}: no uncaught JavaScript errors`, errors.length === 0); await context.close();
  }
} finally { await browser.close(); }
console.log(`P3-A: ${checks - failures.length}/${checks} passed; ${failures.length} failures; six key screenshots.`);
if (failures.length) throw Error(failures.join("\n"));
