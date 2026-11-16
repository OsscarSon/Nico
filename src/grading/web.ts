// HTML 练习的判分：纯函数。真正的文档解析（DOMParser）在组件里，
// 这里只依赖一个"探针"，所以不用浏览器也能测试。

export type WebCheck = {
  label: string;
  /** CSS 选择器，例如 "ul li" */
  selector: string;
  /** 至少要匹配几个元素，默认 1 */
  min?: number;
  /** 匹配到的元素里，至少有一个的文字包含它（不区分大小写） */
  text?: string;
  /** 匹配到的每个元素，计算后样式的 prop 都要等于 value */
  style?: { prop: string; value: string };
  hint?: string;
};

export type WebProbe = {
  count: (selector: string) => number;
  texts: (selector: string) => string[];
  /** 每个匹配元素的计算后样式（只有需要判样式时才会用到） */
  styles?: (selector: string, prop: string) => string[];
  /** 把一个样式值写成浏览器统一的形式，例如 red → rgb(255, 0, 0) */
  normalize?: (prop: string, value: string) => string;
};

export type WebCheckResult = { label: string; ok: boolean; detail: string };

export function gradeWebChecks(
  checks: WebCheck[],
  probe: WebProbe,
): { ok: boolean; results: WebCheckResult[] } {
  const results = checks.map((c): WebCheckResult => {
    const min = c.min ?? 1;
    let found: number;
    let texts: string[];
    try {
      found = probe.count(c.selector);
      texts = c.text ? probe.texts(c.selector) : [];
    } catch {
      return { label: c.label, ok: false, detail: "这一项没法检查。" };
    }
    if (found < min) {
      const need = min === 1 ? "还没有" : `需要至少 ${min} 个，现在只有 ${found} 个`;
      return { label: c.label, ok: false, detail: `${need}。${c.hint ?? ""}`.trim() };
    }
    if (c.text) {
      const want = c.text.toLowerCase();
      if (!texts.some((t) => t.toLowerCase().includes(want)))
        return { label: c.label, ok: false, detail: `标签有了，但里面的文字没有包含「${c.text}」。${c.hint ?? ""}`.trim() };
    }
    if (c.style) {
      if (!probe.styles || !probe.normalize)
        return { label: c.label, ok: false, detail: "这一项没法检查。" };
      let actual: string[];
      let want: string;
      try {
        actual = probe.styles(c.selector, c.style.prop);
        want = probe.normalize(c.style.prop, c.style.value);
      } catch {
        return { label: c.label, ok: false, detail: "这一项没法检查。" };
      }
      const bad = actual.find((v) => v !== want);
      if (bad !== undefined)
        return {
          label: c.label,
          ok: false,
          detail: `${c.style.prop} 现在是 ${bad}，应该是 ${want}。${c.hint ?? ""}`.trim(),
        };
    }
    return { label: c.label, ok: true, detail: "通过。" };
  });
  return { ok: results.length > 0 && results.every((r) => r.ok), results };
}

/** 预览用的完整文档：开头加一条内容安全策略，禁止预览里的页面联网或运行脚本。 */
export const PREVIEW_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

export function previewDocument(html: string): string {
  return `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">${html}`;
}
