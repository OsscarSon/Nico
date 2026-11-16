import { Fragment, type ReactNode } from "react";
import { Lexer } from "marked";

/**
 * 把 AI 回复渲染成界面。用开源的 marked 只做“解析”（Lexer），再自己把词法单元映射成 React 元素。
 * 全程不使用 innerHTML，所以模型输出里即使有 <script>、<img onerror> 也只会被当作文字显示；
 * 链接只放行 http / https，其余（javascript:、data: 等）一律显示为纯文字。图片不渲染。
 */

type Tok = {
  type: string;
  text?: string;
  tokens?: Tok[];
  items?: Tok[];
  ordered?: boolean;
  start?: number | string;
  depth?: number;
  href?: string;
  header?: Tok[];
  rows?: Tok[][];
};

const MAX_DEPTH = 8;

export const safeHref = (href: string | undefined): string | null => {
  if (!href) return null;
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
};

function inline(tokens: Tok[] | undefined, depth: number): ReactNode[] {
  if (!tokens || depth > MAX_DEPTH) return [];
  return tokens.map((t, i): ReactNode => {
    switch (t.type) {
      case "strong": return <strong key={i}>{inline(t.tokens, depth + 1)}</strong>;
      case "em": return <em key={i}>{inline(t.tokens, depth + 1)}</em>;
      case "del": return <del key={i}>{inline(t.tokens, depth + 1)}</del>;
      case "codespan": return <code key={i}>{t.text}</code>;
      case "br": return <br key={i} />;
      case "link": {
        const href = safeHref(t.href);
        const kids = inline(t.tokens, depth + 1);
        return href ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow">{kids}</a>
        ) : (
          <Fragment key={i}>{kids}</Fragment>
        );
      }
      case "image": return <Fragment key={i}>{t.text}</Fragment>; // 不渲染图片，只留替代文字
      case "text":
      case "escape":
        return <Fragment key={i}>{t.tokens ? inline(t.tokens, depth + 1) : t.text}</Fragment>;
      default: // html 等：当作普通文字显示，React 会转义
        return <Fragment key={i}>{t.text ?? ""}</Fragment>;
    }
  });
}

function block(tokens: Tok[] | undefined, depth: number): ReactNode[] {
  if (!tokens || depth > MAX_DEPTH) return [];
  const out: ReactNode[] = [];
  tokens.forEach((t, i) => {
    switch (t.type) {
      case "space": return;
      case "paragraph": out.push(<p key={i}>{inline(t.tokens, depth)}</p>); return;
      case "text": out.push(<p key={i}>{t.tokens ? inline(t.tokens, depth) : t.text}</p>); return;
      case "heading": out.push(<p key={i}><strong>{inline(t.tokens, depth)}</strong></p>); return; // 回复里的标题不做成大标题
      case "code": out.push(<pre key={i}><code>{t.text}</code></pre>); return;
      case "blockquote": out.push(<blockquote key={i}>{block(t.tokens, depth + 1)}</blockquote>); return;
      case "hr": out.push(<hr key={i} />); return;
      case "list": {
        const items = (t.items ?? []).map((it, j) => <li key={j}>{block(it.tokens, depth + 1)}</li>);
        out.push(t.ordered ? <ol key={i} start={Number(t.start) || 1}>{items}</ol> : <ul key={i}>{items}</ul>);
        return;
      }
      case "table":
        out.push(
          <div key={i} className="md-table">
            <table>
              <thead><tr>{(t.header ?? []).map((c, j) => <th key={j}>{inline(c.tokens, depth)}</th>)}</tr></thead>
              <tbody>
                {(t.rows ?? []).map((r, j) => (
                  <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c.tokens, depth)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        return;
      default:
        if (t.text) out.push(<p key={i}>{t.text}</p>);
    }
  });
  return out;
}

export function Markdown({ text }: { text: string }) {
  const tokens = Lexer.lex(text) as unknown as Tok[];
  return <div className="md">{block(tokens, 0)}</div>;
}
