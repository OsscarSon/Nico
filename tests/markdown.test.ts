import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown, safeHref } from "../src/ai/markdown";

const html = (text: string) => renderToStaticMarkup(createElement(Markdown, { text }));

describe("AI reply renderer", () => {
  it("renders basic markdown", () => {
    expect(html("**粗** 和 *斜* 和 `code`")).toBe('<div class="md"><p><strong>粗</strong> 和 <em>斜</em> 和 <code>code</code></p></div>');
  });
  it("renders lists, code blocks and tables", () => {
    expect(html("- 一\n- 二")).toContain("<ul><li><p>一</p></li><li><p>二</p></li></ul>");
    expect(html("```\nlet a = 1\n```")).toContain("<pre><code>let a = 1</code></pre>");
    const t = html("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(t).toContain("<th>");
    expect(t).toContain("<td>");
  });
  it("shows raw HTML as text instead of executing it", () => {
    const out = html("<script>alert(1)</script> 和 <img src=x onerror=alert(1)>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });
  it("only http(s) links become links; javascript: and data: stay plain text", () => {
    expect(html("[好的](https://example.com/a)")).toContain('<a href="https://example.com/a" target="_blank" rel="noopener noreferrer nofollow">好的</a>');
    expect(html("[坏的](javascript:alert(1))")).not.toContain("<a");
    expect(html("[坏的](data:text/html;base64,AAAA)")).not.toContain("<a");
    expect(safeHref("ftp://x.com")).toBe(null);
    expect(safeHref("//evil.com")).toBe(null);
    expect(safeHref(undefined)).toBe(null);
  });
  it("does not render images", () => {
    const out = html("![替代文字](https://example.com/x.png)");
    expect(out).not.toContain("<img");
    expect(out).toContain("替代文字");
  });
  it("turns headings into bold paragraphs instead of page-sized headings", () => {
    const out = html("# 大标题");
    expect(out).not.toContain("<h1");
    expect(out).toContain("<strong>大标题</strong>");
  });
  it("survives deeply nested quotes without blowing the stack", () => {
    expect(() => html(">".repeat(200) + " x")).not.toThrow();
  });
  it("handles empty text", () => {
    expect(html("")).toBe('<div class="md"></div>');
  });
});
