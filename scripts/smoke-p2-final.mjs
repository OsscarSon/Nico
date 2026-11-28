// Final incremental brief: real artwork/brand placement, clean Settings and retained My data.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4194";
const OUT = process.env.SCREENSHOT_DIR ?? "test-results/p2-final";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(), failures = [], measurements = [];
let count = 0;
function check(name, ok) { count++; console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failures.push(name); }
const go = async (p, path) => { await p.goto(`${BASE}/#${path}`); await p.locator("main").waitFor(); };
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const click = (p, name) => p.getByRole("button", { name, exact: true }).click();
try {
  for (const width of [1440, 1280, 1024, 390, 360]) {
    const c = await browser.newContext({ viewport: { width, height: width < 900 ? 1200 : 1000 }, hasTouch: width < 900, deviceScaleFactor: 1 });
    const p = await c.newPage(), errors = []; p.on("pageerror", e => errors.push(e.message));
    await go(p, "/");
    await p.locator(".home-preview img").evaluate(i => i.decode());
    const m = await p.evaluate(() => {
      const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
      const left = rect(".final-hero"), copy = rect(".hero-copy"), right = rect(".final-continue");
      const logo = [...document.querySelectorAll(".brand .nico-logo")].find(i => i.getBoundingClientRect().width > 0);
      const old = document.querySelector(".home-preview img");
      return { left, copy, right, logo: { width: logo.width, height: logo.height, loaded: logo.complete && logo.naturalWidth > 0 }, old: { ...rect(".home-preview img"), loaded: old.complete && old.naturalWidth === 1600, src: old.getAttribute("src") }, preview: { ...rect(".home-preview"), insideHero: old.closest(".final-hero") === document.querySelector(".final-hero"), onlyTwoCards: document.querySelector(".home-grid").children.length === 2 && document.querySelectorAll(".home-preview").length === 1, fit: getComputedStyle(old).objectFit }, background: getComputedStyle(document.querySelector(".final-hero .hero-artwork")).backgroundSize, theme: document.documentElement.dataset.theme };
    });
    measurements.push({ width, ...m });
    check(`${width}: default dark, no overflow, real CTA and no fabricated stats`, m.theme === "dark" && !await overflow(p) && await p.getByRole("button", { name: "探索学习路线 ↗", exact: true }).count() === 1 && await p.locator(".today .stat").count() === 0);
    check(`${width}: supplied independent backgrounds actually loaded`, await p.evaluate(async () => {
      const nodes = [...document.querySelectorAll(".home-grid .hero-artwork")];
      const sources = nodes.map(e => getComputedStyle(e).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]);
      if (!sources[0]?.endsWith("home-hero-left-final.png") || !sources[1]?.endsWith("home-continue-final.png")) return false;
      return (await Promise.all(sources.map(async src => { const image = new window.Image(); image.src = src; await image.decode(); return image.naturalWidth === 1672 && image.naturalHeight === 941; }))).every(Boolean);
    }));
    check(`${width}: old pale illustration intact, full ratio, inside left Hero below CTA, no third card`, m.old.loaded && m.old.src.endsWith("hero-home-1600x900.png") && Math.abs(m.old.width / m.old.height - 16 / 9) < .01 && m.preview.insideHero && m.preview.onlyTwoCards && m.preview.y >= m.copy.bottom && m.preview.bottom < m.left.bottom && m.old.right < m.left.right && m.preview.fit === "contain" && Math.abs(m.old.x - m.copy.x) <= 1);
    check(`${width}: actual logo ${width < 374 ? 24 : width < 1200 ? 32 : 48}px`, m.logo.loaded && m.logo.width === (width < 374 ? 24 : width < 1200 ? 32 : 48) && m.logo.height === m.logo.width);
    if (width >= 900) check(`${width}: aligned desktop columns, copy stays in quiet left region`, Math.abs(m.left.height - m.right.height) < 1 && m.left.y === m.right.y && m.copy.right < m.left.x + m.left.width * (width < 1200 ? .65 : .57));
    else check(`${width}: stacked mobile cards, full background below copy/CTA and white preview`, m.right.y >= m.left.bottom && m.right.x === m.left.x && m.background === "100% auto" && m.preview.bottom <= m.left.bottom - m.left.width * 941 / 1672);
    await p.screenshot({ path: `${OUT}/home-dark-${width}.png`, fullPage: true });
    await p.getByRole("button", { name: "探索学习路线 ↗", exact: true }).focus(); await p.keyboard.press("Enter");
    await p.waitForURL(url => url.hash === "#/paths"); check(`${width}: CTA keyboard navigation`, new URL(p.url()).hash === "#/paths");
    await go(p, "/settings");
    check(`${width}: four settings groups and the later full backup panel; removed modules stay absent`,
      await p.locator(".settings-grid .settings-list").count() === 4 &&
      await p.getByRole("region", { name: "完整学习备份", exact: true })
        .getByRole("link", { name: "打开完整备份 ↗", exact: true })
        .getAttribute("href") === "#/study?view=backup" &&
      !/关于 Nico|v0\.1\.0|配置状态|已配置服务地址|未检测连接|尚未提供：/.test(await p.locator("main").innerText()) &&
      await p.locator(".profile-editor").count() === 0 &&
      await p.getByRole("link", { name: "查看我的学习档案", exact: true }).count() === 0 &&
      await p.getByRole("checkbox", { name: "显示AI快捷入口", exact: true }).count() === 1 &&
      !await overflow(p));
    if ([1440, 390].includes(width)) await p.screenshot({ path: `${OUT}/settings-dark-${width}.png`, fullPage: true });
    // The old persistence assertions remain in smoke:p2. Here confirm the new exclusive entry,
    // including an existing record surviving Settings navigation without a progress write.
    const original = await p.evaluate(() => localStorage.getItem("nico-progress"));
    await go(p, "/me"); await p.getByText("编辑个人资料", { exact: true }).click();
    await p.getByLabel("昵称", { exact: true }).fill("认真学习的 Nico"); await click(p, "保存个人资料");
    await p.reload(); await p.getByText("编辑个人资料", { exact: true }).click();
    check(`${width}: My retains actual entered profile and zero real completions`, await p.getByLabel("昵称", { exact: true }).inputValue() === "认真学习的 Nico" && await p.locator(".identity-card .stat strong").first().innerText() === "0" && !await overflow(p));
    if (width === 390) await p.locator(".identity-card").screenshot({ path: `${OUT}/my-profile-390.png` });
    await go(p, "/settings"); await p.reload();
    check(`${width}: cleanup preserves saved preferences and byte-identical progress`, await p.evaluate(() => JSON.parse(localStorage.getItem("nico-preferences")).nickname) === "认真学习的 Nico" && await p.evaluate(() => localStorage.getItem("nico-progress")) === original);
    if ([1440, 390].includes(width)) {
      await p.getByRole("group", { name: "主题", exact: true }).getByRole("button", { name: "亮色", exact: true }).click();
      await go(p, "/"); check(`${width}: readable Hero still works with light option`, await p.locator("html").getAttribute("data-theme") === "light" && !await overflow(p));
      await p.screenshot({ path: `${OUT}/home-light-${width}.png`, fullPage: true });
    }
    check(`${width}: no JavaScript errors`, errors.length === 0);
    await c.close();
  }
  const p = await browser.newPage(); await go(p, "/");
  const icons = await p.locator('link[rel="icon"],link[rel="apple-touch-icon"]').evaluateAll(els => els.map(el => ({ href: el.href, sizes: el.getAttribute("sizes") })));
  for (const icon of icons) check(`actual browser icon resource: ${icon.href.split("/").at(-1)}`, (await p.request.get(icon.href)).status() === 200);
  const manifestURL = await p.locator('link[rel="manifest"]').evaluate(el => el.href);
  const manifest = await (await p.request.get(manifestURL)).json();
  check("manifest brand and relative install scope", manifest.name === "Nico Academy" && manifest.short_name === "Nico" && manifest.scope === "." && manifest.start_url === ".");
  for (const icon of manifest.icons) {
    const size = await p.evaluate(async url => { const image = new window.Image(); image.src = url; await image.decode(); return `${image.naturalWidth}x${image.naturalHeight}`; }, new URL(icon.src, manifestURL).href);
    check(`manifest app icon ${icon.sizes} loads at declared intrinsic size`, size === icon.sizes);
  }
  // Brand review on the actual app: temporarily substitute the supplied candidate in
  // the same sidebar/header mark, then capture both at native 24/32/48px. No source mutation.
  const comparison = [];
  for (const size of [24, 32, 48]) {
    for (const [label, file] of [["上传候选 PNG", "nico-academy-logo-candidate-final.png"], ["精简 SVG", "nico-academy-mark-final.svg"]]) {
      const row = await p.evaluate(async ({ size, label, file }) => {
        const brand = document.querySelector(".sidenav .brand").cloneNode(true);
        const img = brand.querySelector("img"); img.src = new URL(`art/${file}`, document.baseURI); img.style.width = img.style.height = `${size}px`; await img.decode();
        brand.removeAttribute("href"); brand.style.cssText = "display:flex;align-items:center;gap:12px;color:#f4f7ff;text-decoration:none;min-height:64px;";
        return `<div class="brand-case"><p>${label} · ${size}px</p>${brand.outerHTML}</div>`;
      }, { size, label, file });
      comparison.push(row);
    }
  }
  await p.setViewportSize({ width: 760, height: 640 });
  await p.setContent(`<html lang="zh-Hans"><head><title>Nico Logo native-size review</title><style>body{margin:0;padding:32px;background:#0e1420;color:#f4f7ff;font:16px system-ui}h1{font-size:20px}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}.brand-case{padding:16px;background:#172238;border:1px solid #344b70;border-radius:14px}.brand-case p{font-size:12px;color:#bbcde8;margin:0 0 8px}.brand span{font-size:22px;font-weight:700}.brand small{display:block;letter-spacing:2px;font-size:10px;font-weight:400}</style></head><body><h1>上传候选与小尺寸 SVG · 原生像素对照</h1><main>${comparison.join("")}</main></body></html>`);
  await p.screenshot({ path: `${OUT}/logo-native-24-32-48.png` });
  // Screenshots are rendered browser evidence, never formal production art.
  writeFileSync(`${OUT}/measurements.json`, JSON.stringify(measurements, null, 2) + "\n");
} finally { await browser.close(); }
console.log(`P2 final: ${count - failures.length}/${count} passed.`);
if (failures.length) throw Error(failures.join("\n"));
