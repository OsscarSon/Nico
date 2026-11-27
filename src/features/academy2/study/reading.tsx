import { useEffect, useState } from "react";
import { Link, usePath } from "../../../app/router";
import { bookmarkPath, chooseRecent, readingLink, saveVisit } from "./readingState";
import { changeStudy, getStudy, useStudy, type Bookmark } from "../../../progress/study";
import "./study.css";

export function Favorite({ item }: { item: Omit<Bookmark, "active" | "at"> }) {
  const { data, warning } = useStudy();
  const key = item.kind + ":" + item.topic + (item.anchor ? ":" + item.anchor : "");
  const active = data.bookmarks[key]?.active ?? false;
  return (
    <span className="study-favorite">
      <button
        type="button"
        className="btn ghost"
        aria-pressed={active}
        onClick={() =>
          changeStudy((old) => ({
            ...old,
            bookmarks: { ...old.bookmarks, [key]: { ...item, active: !active, at: Date.now() } },
          }))
        }
      >
        {active
          ? "取消收藏"
          : "收藏" + { course: "课程", topic: "知识点", formula: "公式", example: "例题" }[item.kind]}
      </button>
      {warning && <span role="status">{warning}</span>}
    </span>
  );
}

export function CopyFormula({ latex }: { latex: string }) {
  const [status, setStatus] = useState("");
  return (
    <>
      <button
        type="button"
        className="btn ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(latex);
            setStatus("已复制 LaTeX。");
          } catch {
            setStatus("复制权限不可用，可从下面选取原文。");
          }
        }}
      >
        复制 LaTeX
      </button>
      {status && <span role="status">{status}</span>}
      {status.startsWith("复制权限") && (
        <textarea
          aria-label="公式 LaTeX 原文"
          readOnly
          value={latex}
          rows={2}
          onFocus={(event) => event.target.select()}
        />
      )}
    </>
  );
}

const sections = [
  ["reading-top", "课时概览"],
  ["reading-theory", "概念与理论"],
  ["reading-enhanced", "例题与推导"],
  ["reading-lab", "实验与代码"],
  ["reading-practice", "练习与评估"],
] as const;
export function ReadingTools({
  id,
  title,
  focus,
  onFocus,
}: {
  id: string;
  title: string;
  focus: boolean;
  onFocus: () => void;
}) {
  const route = usePath(),
    anchor = new URLSearchParams(route.split("?")[1]).get("at");
  useEffect(() => {
    const start = getStudy().visits[id]?.anchor ?? "reading-top";
    saveVisit(id, start);
    let latest = start,
      pending: number | null = null;
    function flush() {
      if (pending !== null) {
        window.clearTimeout(pending);
        pending = null;
      }
      if (latest !== getStudy().visits[id]?.anchor) saveVisit(id, latest);
    }
    function scroll() {
      const visible = sections.filter(
        ([key]) => (document.getElementById(key)?.getBoundingClientRect().top ?? Infinity) <= 120,
      );
      const value = visible.at(-1)?.[0] ?? "reading-top";
      if (value === latest) return;
      latest = value;
      if (pending !== null) window.clearTimeout(pending);
      pending = window.setTimeout(flush, 500);
    }
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [id]);
  useEffect(() => {
    if (!anchor || !/^[-a-z0-9]{1,100}$/.test(anchor)) return;
    const observer = new MutationObserver(() => locate());
    function locate() {
      const element = document.getElementById(anchor!);
      if (!element) return;
      let parent = element.parentElement;
      while (parent) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      observer.disconnect();
      window.clearTimeout(timer);
      window.requestAnimationFrame(() => element.scrollIntoView({ block: "start" }));
    }
    const timer = window.setTimeout(() => observer.disconnect(), 8000);
    observer.observe(document.querySelector("main") ?? document.body, {
      childList: true,
      subtree: true,
    });
    locate();
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [anchor]);
  return (
    <section className="a2-panel study-toolbar" id="reading-top">
      <div className="row">
        <Favorite item={{ kind: "topic", title, topic: id }} />
        <button className="btn ghost" type="button" aria-pressed={focus} onClick={onFocus}>
          {focus ? "退出专注模式" : "专注模式"}
        </button>
        <Link to="/study">学习资料</Link>
      </div>
      <details>
        <summary>本节目录</summary>
        <ul className="a2-link-list">
          {sections.map(([key, label]) => (
            <li key={key}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  document.getElementById(key)?.scrollIntoView({ block: "start" });
                  saveVisit(id, key);
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </details>
      <TopicNote id={id} />
    </section>
  );
}
function TopicNote({ id }: { id: string }) {
  const { data } = useStudy();
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  return (
    <details className="study-note">
      <summary>个人笔记</summary>
      <label>
        此知识点的笔记
        <textarea
          rows={4}
          value={draft ?? data.notes[id]?.body ?? ""}
          maxLength={6000}
          onChange={(e) => {
            setDraft(e.target.value);
            setStatus("");
          }}
        />
      </label>
      <button
        className="btn secondary"
        type="button"
        onClick={() => {
          const body = draft ?? data.notes[id]?.body ?? "";
          const saved = changeStudy((old) => ({
            ...old,
            notes: { ...old.notes, [id]: { body, at: Date.now() } },
          }));
          setDraft(null);
          setStatus(saved ? "已保存笔记。" : "本次笔记未写入浏览器。");
        }}
      >
        保存笔记
      </button>
      {status && <p role="status">{status}</p>}
    </details>
  );
}
export function ContinueTopic() {
  const { data } = useStudy();
  const item = chooseRecent(data)[0];
  return item ? (
    <Link className="btn secondary" to={readingLink(item.id, item.anchor)}>
      继续学习知识点 · {item.title}
    </Link>
  ) : null;
}
export { bookmarkPath };
