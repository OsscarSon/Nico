import { useEffect, useRef, useState } from "react";
import { Link, navigate } from "../../app/router";
import { askAi } from "../../ai/client";
import { aiEnabled } from "../../ai/config";
import { aiArt } from "../../ai/art";
import { buildLessonContext } from "../../ai/context";
import { Markdown } from "../../ai/markdown";
import { LIMITS, type AiFail } from "../../ai/protocol";
import { AiBox } from "../../components/AiLabel";
import { EmptyState } from "../../components/ui";
import { artUrl } from "../../art";
import { allCatalogLessons, getLesson } from "../../content";
import { AiUnavailable } from "./PromptLab";
import "../../styles/ai.css";
import { AiError } from "./AiError";

type Turn = { role: "user" | "assistant"; text: string; model?: string };

/**
 * AI 导师：围绕一节课提问。对话只保存在这个页面的内存里，离开就没了，不上传到别处保存。
 * 发给 AI 的“课程资料”不含检查题和答案（见 src/ai/context.ts）。
 */
export function TutorPage({ lessonId }: { lessonId?: string }) {
  const learnable = allCatalogLessons().filter((l) => l.status === "available");
  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiFail | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTurns([]);
    setError(null);
  }, [lessonId]);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [turns.length, busy]);

  if (lessonId && !lesson)
    return (
      <EmptyState title="找不到这一课" action={<Link to="/lab/tutor" className="btn">选一节课</Link>}>
        这一课还没有开放，没法围绕它提问。
      </EmptyState>
    );

  const send = async () => {
    if (!lesson || busy || question.trim() === "") return;
    const asked = question.trim();
    const history = turns.slice(-LIMITS.historyTurns).map((t) => ({ role: t.role, text: t.text.slice(0, LIMITS.historyText) }));
    setTurns((t) => [...t, { role: "user", text: asked }]);
    setQuestion("");
    setBusy(true);
    setError(null);
    const r = await askAi({
      kind: "tutor",
      lessonTitle: lesson.title,
      context: buildLessonContext(lesson),
      question: asked,
      history,
    });
    setBusy(false);
    if (r.ok && r.kind === "tutor") setTurns((t) => [...t, { role: "assistant", text: r.text, model: r.model }]);
    else if (!r.ok) setError(r);
  };

  return (
    <>
      <Link to="/lab" className="backlink">← 实验台</Link>
      <header className="page-head">
        <h1>AI 导师</h1>
        <p>围绕一节课提问。它会先给提示，不直接替你做练习题。</p>
      </header>
      {aiArt.tutor && <img className="empty-art" src={artUrl(aiArt.tutor)} alt="" width={400} height={300} />}

      <div className="panel">
        <label htmlFor="tutor-lesson" className="pl-label">选一节课</label>
        <select id="tutor-lesson" value={lessonId ?? ""} onChange={(e) => navigate(e.target.value ? `/lab/tutor/${e.target.value}` : "/lab/tutor")}>
          <option value="">请选择……</option>
          {learnable.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>

      {!aiEnabled() ? (
        <AiUnavailable />
      ) : !lesson ? (
        <p className="muted">先选一节课，再提问。</p>
      ) : (
        <>
          <div className="tutor-log" aria-live="polite">
            {turns.length === 0 && <p className="muted">还没有提问。可以问「这里为什么是……」「能换个例子吗」。</p>}
            {turns.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="turn user"><strong>我</strong><p>{t.text}</p></div>
              ) : (
                <AiBox key={i} title="AI 导师" model={t.model}><Markdown text={t.text} /></AiBox>
              ),
            )}
            {busy && <p className="muted">AI 导师正在想……</p>}
            <div ref={endRef} />
          </div>
          {error && <AiError error={error} />}
          <div className="numfield" style={{ marginTop: "var(--s3)" }}>
            <label htmlFor="tutor-q" className="sr-only">你的问题</label>
            <textarea
              id="tutor-q"
              className="pl-text"
              rows={3}
              maxLength={LIMITS.question}
              value={question}
              placeholder="写下你的问题（不要写密码、真实姓名等隐私信息）"
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button type="button" className="btn" disabled={busy || question.trim() === ""} onClick={send}>
              提问
            </button>
          </div>
          <p className="muted">对话只留在这个页面里，离开或刷新就没了。每天有次数限制。</p>
        </>
      )}
    </>
  );
}
