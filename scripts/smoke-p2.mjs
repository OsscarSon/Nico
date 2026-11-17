// P2 actual browser audit: all pages/sizes, preference effects, real import/export/clear and planned consistency.
import { Buffer } from "node:buffer";
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4191", OUT = process.env.SCREENSHOT_DIR ?? "test-results/p2";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(); let checks = 0; const failures = [];
function check(name, ok) { checks++; console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failures.push(name); }
const button = (p, name) => p.getByRole("button", { name, exact: true });
const click = (p, name) => button(p, name).click();
const go = async (p, path) => { await p.goto(`${BASE}/#${path}`); await p.locator("main").waitFor(); };
const raw = p => p.evaluate(() => localStorage.getItem("nico-progress"));
const prefs = p => p.evaluate(() => JSON.parse(localStorage.getItem("nico-preferences") ?? "null"));
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const group = (p, name) => p.getByRole("group", { name, exact: true });
const setOption = (p, label, name) => group(p, label).getByRole("button", { name, exact: true }).click();
try {
  const paths = ["/", "/paths", "/paths/a", "/courses", "/lesson/a17-web-journey", "/lab", "/lab/prompt", "/lab/tutor", "/projects", "/me", "/settings"];
  for (const width of [1440, 1280, 1024, 768, 390, 360]) {
    const c = await browser.newContext({ viewport: { width, height: width >= 900 ? 1000 : 844 }, colorScheme: "light", hasTouch: width < 900 });
    const p = await c.newPage(), errors = []; p.on("pageerror", e => errors.push(e.message));
    for (const path of paths) {
      await go(p, path); await p.locator("h1,h2").first().waitFor();
      check(`${width}${path}: default dark / content / no horizontal overflow`, await p.locator("html").getAttribute("data-theme") === "dark" && (await p.locator("main").innerText()).length > 30 && await noOverflow(p));
    }
    const navigation = p.getByRole("navigation", { name: width >= 900 ? "主导航" : "主导航（手机）", exact: true });
    await navigation.getByRole("link", { name: "课程", exact: true }).focus(); await p.keyboard.press("Enter"); await p.waitForURL(url => url.hash === "#/courses");
    check(`${width}: named navigation works by keyboard`, new URL(p.url()).hash === "#/courses");
    await go(p, "/paths/a");
    check(`${width}: 20 real links, 2 nonlearnable previews, four units`, await p.locator("a.pm-card").count() === 20 && await p.locator(".pm-card.planned").count() === 2 && await p.locator(".route-unit").count() === 4 && await p.locator(".pm-card.planned a").count() === 0);
    for (const code of ["A21", "A22"]) check(`${width}: ${code} planned with its independent art`, await p.locator(`li[data-code="${code}"]`).getAttribute("data-state") === "planned" && await p.locator(`li[data-code="${code}"] img`).evaluate(i => i.complete && i.naturalWidth > 0));
    const summary = p.locator('details[data-unit="a1"] > summary'); await summary.focus(); await p.keyboard.press("Enter");
    check(`${width}: keyboard collapse keeps focus and URL`, await p.locator('details[data-unit="a1"]').getAttribute("open") === null && await summary.evaluate(el => el === document.activeElement) && new URL(p.url()).hash === "#/paths/a"); await p.keyboard.press("Enter");
    await go(p, "/paths/a?unit=a3"); check(`${width}: unit context focuses real summary`, await p.locator('details[data-unit="a3"] > summary').evaluate(el => el === document.activeElement));
    for (const [id, file] of [["a15-udp", "lesson-a15-udp.png"], ["a16-http-https", "lesson-a16-http-https.png"], ["a17-web-journey", "lesson-a17-web-journey.png"], ["a18-passwords", "lesson-a18-passwords.png"], ["a19-phishing", "lesson-a19-phishing.png"], ["a20-least-privilege", "lesson-a20-least-privilege.png"]]) {
      await go(p, `/lesson/${id}`); await p.locator(".lesson-art").waitFor();
      const art = await p.locator(".lesson-art").evaluate(async i => { await i.decode(); const s = getComputedStyle(i); return { width: i.width, height: i.height, natural: i.naturalWidth / i.naturalHeight, fit: s.objectFit, position: s.objectPosition, src: i.getAttribute("src") }; });
      check(`${width}/${id}: formal PNG 200, 16:9, contain/center, draft`, art.src.endsWith(file) && art.natural === 16 / 9 && Math.abs(art.width / art.height - 16 / 9) < .02 && art.fit === "contain" && art.position === "50% 50%" && await p.locator(".pill.draft").count() === 1 && (await c.request.get(new URL(art.src, p.url()).href)).status() === 200);
    }
    for (const code of ["A21", "A22"]) {
      await go(p, "/courses"); await p.getByRole("searchbox").fill(code); await p.locator(".academy-course summary").click();
      check(`${width}: catalog ${code} matches planned map and never links to lesson`, await p.locator(".academy-course a").count() === 0 && (await p.locator(".course-details").innerText()).includes("尚未开放") && await p.locator(".planned-preview").count() === 1);
    }
    await go(p, "/lesson/a21"); check(`${width}: direct planned URL stays unavailable`, (await p.locator("main").innerText()).includes("这一课还没有开放"));
    for (const [id, stage] of [["b", "Foundation"], ["c", "Foundation"], ["d", "Foundation"], ["e", "Foundation"], ["f", "Foundation"], ["m", "Intermediate"]]) { await go(p, `/paths/${id}?stage=${stage}`); check(`${width}: ${id} actual route scope and honest planning`, (await p.locator("main").innerText()).length > 30 && await noOverflow(p) && (["d", "e", "f", "m"].includes(id) ? await p.locator("a.pm-card").count() === 0 : await p.locator("a.pm-card").count() > 0)); }
    if ([1440, 390].includes(width)) for (const theme of ["dark", "light"]) {
      await go(p, "/settings"); await setOption(p, "主题", theme === "dark" ? "暗色" : "亮色");
      for (const [name, path] of [["route", "/paths/a"], ["lesson", "/lesson/a17-web-journey"], ["profile", "/me"], ["settings", "/settings"]]) { await go(p, path); await p.screenshot({ path: `${OUT}/${name}-${theme}-${width}.png` }); check(`${width}/${name}/${theme}: actual screenshot and no overflow`, await noOverflow(p)); }
    }
    check(`${width}: no JavaScript errors`, errors.length === 0); await c.close();
  }
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light", hasTouch: true }), p = await c.newPage(); const errors = []; p.on("pageerror", e => errors.push(e.message));
  await go(p, "/settings");
  const untouched = await raw(p);
  await setOption(p, "主题", "跟随系统"); check("system preference resolves light", await p.locator("html").getAttribute("data-theme") === "light");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForFunction(() => document.documentElement.dataset.theme === "dark"); check("system preference reacts to OS change", await p.locator("html").getAttribute("data-theme") === "dark");
  await p.reload(); check("system choice persists", (await prefs(p)).theme === "system");
  await setOption(p, "主题", "暗色"); await p.emulateMedia({ colorScheme: "light" }); check("explicit dark ignores OS", await p.locator("html").getAttribute("data-theme") === "dark");
  await setOption(p, "字号", "大"); check("large font actual CSS effect", await p.locator("html").evaluate(el => getComputedStyle(el).fontSize) === "18px"); await setOption(p, "字号", "标准");
  const comfortable = await p.locator(".settings-grid > section").first().evaluate(el => getComputedStyle(el).paddingTop);
  await setOption(p, "信息密度", "紧凑"); check("compact density has actual CSS effect", comfortable !== await p.locator(".settings-grid > section").first().evaluate(el => getComputedStyle(el).paddingTop));
  check("normal motion has an actual preview transition", await p.locator(".appearance-preview").evaluate(el => getComputedStyle(el).transitionDuration) !== "0s");
  await setOption(p, "动效", "减少动效"); check("reduced motion actually removes transitions", await p.locator(".appearance-preview").evaluate(el => getComputedStyle(el).transitionDuration) === "0s");
  await p.getByLabel("昵称", { exact: true }).fill("x".repeat(25)); await click(p, "保存个人资料"); check("nickname validation blocks invalid save", (await p.locator(".profile-editor").innerText()).includes("最多24") && (await prefs(p)).nickname === "");
  await p.getByLabel("昵称", { exact: true }).fill("认真学习的Nico"); await p.getByLabel("偏好学习路线").selectOption("b"); await click(p, "保存个人资料"); await p.reload(); check("nickname and preferred path persist", (await prefs(p)).nickname === "认真学习的Nico" && (await prefs(p)).learningPath === "b");
  await go(p, "/me"); check("profile has real nickname and zero completed, no invented level", (await p.locator(".identity-person").innerText()).includes("认真学习的Nico") && (await p.locator(".stat strong").first().innerText()) === "0" && await p.locator(".badge.earned").count() === 0); await go(p, "/"); check("preferred path changes actual next lesson", (await p.locator(".today").innerText()).includes("变量"));
  await go(p, "/settings"); await p.getByLabel("默认进入页面", { exact: true }).selectOption("/courses");
  const tab = await c.newPage(); await tab.goto(BASE); await tab.waitForURL(url => url.hash === "#/courses"); check("unaddressed visit respects landing", new URL(tab.url()).hash === "#/courses"); await tab.goto(`${BASE}/#/`); check("explicit home stays home", (await tab.locator("h1").innerText()).includes("你的知识世界"));
  await p.getByRole("checkbox", { name: "显示规划课程", exact: true }).uncheck(); await go(p, "/paths/a"); check("planned preference hides map previews only", await p.locator(".pm-card.planned").count() === 0 && await p.locator("a.pm-card").count() === 20); await go(p, "/courses"); await p.getByRole("searchbox").fill("A21"); check("same planned preference hides catalog previews", await p.locator(".academy-course").count() === 0);
  await go(p, "/settings"); await p.getByRole("checkbox", { name: "显示规划课程", exact: true }).check(); await p.getByRole("checkbox", { name: "显示AI快捷入口", exact: true }).uncheck(); await go(p, "/lab"); check("AI shortcut visibility has real effect, local prompt remains", await p.locator(".ai-shortcut:visible").count() === 0 && await p.getByRole("link", { name: /Prompt 训练场/ }).isVisible()); await go(p, "/lab/tutor"); check("hiding shortcuts does not fabricate disconnection", (await p.locator("main").innerText()).includes("AI"));
  await go(p, "/settings"); check("preferences/profile browsing never writes progress", await raw(p) === untouched);
  const fileInput = p.getByLabel("选择要导入的学习记录文件");
  const chooserEvent = p.waitForEvent("filechooser"); await click(p, "导入"); const chooser = await chooserEvent; await chooser.setFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"schemaVersion":2}') }); check("invalid import rejected without writes", (await p.locator(".settings-message").innerText()).includes("无法导入") && await raw(p) === untouched);
  const fixture = { schemaVersion: 1, lessons: {}, resume: { lessonId: "a07-os", step: 2 }, activeDays: [] };
  await fileInput.setInputFiles({ name: "resume-fixture.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture)) }); check("valid import staged without writes", await button(p, "确认合并导入").isVisible() && await raw(p) === untouched); await click(p, "取消导入"); check("import cancel preserves all records", await raw(p) === untouched);
  await fileInput.setInputFiles({ name: "resume-fixture.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture)) }); await click(p, "确认合并导入"); check("confirm actually merges resume under schema v1", JSON.parse(await raw(p)).resume.lessonId === "a07-os");
  await go(p, "/"); check("resume recommendation uses stored unfinished lesson", (await p.locator(".today").innerText()).includes("操作系统")); await go(p, "/settings"); await p.getByRole("checkbox", { name: "首页优先继续上次学习", exact: true }).uncheck(); await go(p, "/"); check("turning home resume off uses preferred next lesson", (await p.locator(".today").innerText()).includes("变量"));
  await go(p, "/lesson/a07-os"); check("home preference leaves actual lesson resume intact", await p.locator('.steps li[aria-current="step"]').evaluateAll(nodes => nodes.some(el => el.parentElement.children[2] === el)));
  await go(p, "/settings");
  const downloadEvent = p.waitForEvent("download"); await click(p, "导出"); const download = await downloadEvent;
  const exported = JSON.parse(readFileSync(await download.path(), "utf8")); check("export contains exact real progress, no profile", JSON.stringify(exported) === await raw(p) && !Object.hasOwn(exported, "nickname"));
  const existing = await raw(p); await click(p, "清除学习记录"); await click(p, "取消"); check("clear cancel preserves byte-identical record", await raw(p) === existing);
  await click(p, "清除学习记录"); await click(p, "确认清除，无法恢复"); check("clear success removes only progress, preserves preferences", await raw(p) === null && (await prefs(p)).nickname === "认真学习的Nico");
  await click(p, "清除本机个人资料"); await click(p, "取消清除个人资料"); check("profile clear cancel preserves nickname", (await prefs(p)).nickname === "认真学习的Nico"); await click(p, "清除本机个人资料"); await click(p, "确认清除个人资料"); check("profile clear leaves progress and appearance alone", (await prefs(p)).nickname === "" && (await prefs(p)).density === "compact" && await raw(p) === null);
  await tab.goto(`${BASE}/#/settings`); await setOption(tab, "主题", "亮色"); await p.waitForFunction(() => document.documentElement.dataset.theme === "light"); check("cross-tab preference change updates current view", await p.locator("html").getAttribute("data-theme") === "light");
  check("settings flows no JS errors or mobile overflow", errors.length === 0 && await noOverflow(p)); await c.close();
  const largeContext = await browser.newContext({ viewport: { width: 360, height: 844 } }), largePage = await largeContext.newPage();
  await go(largePage, "/settings"); await setOption(largePage, "字号", "大");
  for (const path of ["/", "/paths/a", "/courses", "/lesson/a16-http-https", "/lab", "/lab/prompt", "/me", "/settings"]) { await go(largePage, path); check(`360 large font ${path}: readable without page overflow`, await noOverflow(largePage)); }
  await largeContext.close();
  const future = await browser.newContext(); const futureRaw = '{"schemaVersion":99,"nickname":"future-data-preserved"}';
  await future.addInitScript(value => { if (!localStorage.getItem("nico-preferences")) localStorage.setItem("nico-preferences", value); }, futureRaw);
  const futurePage = await future.newPage(); await go(futurePage, "/settings"); await setOption(futurePage, "主题", "亮色");
  check("unsupported preference version is backed up before a user writes new choices", await futurePage.evaluate(value => Object.keys(localStorage).some(k => k.startsWith("nico-preferences-backup-") && localStorage.getItem(k) === value), futureRaw)); await future.close();
  const blocked = await browser.newContext(); await blocked.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw Error("blocked"); } })); const bp = await blocked.newPage(); await go(bp, "/settings"); await setOption(bp, "主题", "亮色"); check("blocked storage remains usable and honest", await bp.locator("html").getAttribute("data-theme") === "light" && (await bp.locator("main").innerText()).includes("浏览器无法保存偏好")); await blocked.close();
} finally { await browser.close(); }
console.log(`P2: ${checks - failures.length}/${checks} passed; ${failures.length} failures; 16 main after screenshots.`);
if (failures.length) throw Error(failures.join("\n"));
