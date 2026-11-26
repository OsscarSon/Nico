import { useEffect, useMemo, useRef, useState } from "react";
import { allCatalogLessons, getLesson, nextAvailableAfter } from "../../content";
import { getTrack } from "../../content/catalog";
import type { Block } from "../../content/schema";
import { Link } from "../../app/router";
import { artUrl } from "../../art";
import { aiEnabled } from "../../ai/config";
import { EmptyState, ProgressBar, QualityPill } from "../../components/ui";
import { completeLesson, localDay, recordStep } from "../../progress/store";
import { getProgress, updateProgress, useProgress } from "../../progress/useProgress";
import {
  ExplainBlock,
  HookBlock,
  QuizBlock,
  SimBlock,
  SummaryBlock,
  TransferBlock,
  type QuizStats,
} from "./blocks";

const stepLabel = (b: Block): string => {
  switch (b.type) {
    case "hook": return "开场";
    case "explain": return b.title;
    case "sim": return b.title;
    case "quiz": return "检查";
    case "transfer": return "换个场景";
    case "summary": return "小结";
  }
};

/** 这个块是否需要学习者完成互动才能继续。 */
const needsInteraction = (b: Block) =>
  b.type === "quiz" || b.type === "transfer" || (b.type === "sim" && b.mode === "challenge");

export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const lesson = getLesson(lessonId);
  if (!lesson)
    return (
      <EmptyState
        title="这一课还没有开放"
        action={<Link to="/paths" className="btn">回到路线</Link>}
      >
        目录里有这个名字，但课程内容还在准备中。
      </EmptyState>
    );
  return <Player key={lesson.id} lessonId={lesson.id} />;
}

function Player({ lessonId }: { lessonId: string }) {
  const lesson = getLesson(lessonId)!;
  const progress = useProgress();
  const total = lesson.blocks.length;
  const track = getTrack(lesson.track);
  const routeHref = "/paths/" + lesson.track + (lesson.stage === "Intermediate" ? "?stage=Intermediate" : "");

  const [step, setStep] = useState(() => {
    const r = getProgress().resume;
    return r && r.lessonId === lessonId ? Math.min(r.step, total - 1) : 0;
  });
  // 已经过去的步骤视为完成，这样从续学点回来不会被卡住。
  const [done, setDone] = useState<boolean[]>(() =>
    lesson.blocks.map((b, i) => i < step || !needsInteraction(b)),
  );
  const stats = useRef<Record<number, QuizStats>>({});
  const bodyRef = useRef<HTMLDivElement>(null);

  const block = lesson.blocks[step] as Block;
  const isLast = step === total - 1;
  const completed = Boolean(progress.lessons[lessonId]);

  useEffect(() => {
    updateProgress((p) => recordStep(p, lessonId, step, localDay(new Date())));
  }, [lessonId, step]);

  useEffect(() => {
    if (!isLast || getProgress().lessons[lessonId]) return;
    const all = Object.values(stats.current);
    const firstTryCorrect = all.reduce((n, s) => n + s.firstTryCorrect, 0);
    const quizTotal = all.reduce((n, s) => n + s.total, 0);
    updateProgress((p) => completeLesson(p, lessonId, { firstTryCorrect, quizTotal }, new Date()));
  }, [isLast, lessonId]);

  useEffect(() => {
    bodyRef.current?.focus({ preventScroll: true });
  }, [step]);

  const markDone = useMemo(
    () => (i: number) => setDone((d) => (d[i] ? d : d.map((x, j) => (j === i ? true : x)))),
    [],
  );
  const setStats = (i: number) => (s: QuizStats) => {
    if (!stats.current[i]) stats.current[i] = s;
  };

  const canNext = done[step] === true;
  const summaryBlock = lesson.blocks.at(-1);
  const declaredNext = summaryBlock?.type === "summary" ? summaryBlock.next : undefined;
  const declaredReady = Boolean(declaredNext && getLesson(declaredNext));
  // 按顺序的下一课还没做时，推荐目录里之后第一个已开放的课，而不是让学习者卡住
  const fallback = declaredReady ? undefined : nextAvailableAfter(lessonId);
  const declaredTitle = declaredNext
    ? allCatalogLessons().find((l) => l.id === declaredNext)?.title
    : undefined;

  const content = (() => {
    switch (block.type) {
      case "hook":
        return (
          <>
            {lesson.art && (
              <img className="lesson-art" src={artUrl(lesson.art)} alt="" width={1600} height={900} />
            )}
            {lesson.artPending && <div className="foundation-art-pending">课程插画待提供</div>}
            <HookBlock text={block.text} />
          </>
        );
      case "explain": return <ExplainBlock block={block} />;
      case "sim": return <SimBlock block={block} onDone={() => markDone(step)} />;
      case "quiz":
        return <QuizBlock items={block.items} onStats={setStats(step)} onDone={() => markDone(step)} />;
      case "transfer":
        return <TransferBlock block={block} onStats={setStats(step)} onDone={() => markDone(step)} />;
      case "summary": return (
        <>
          <SummaryBlock block={block} />
          {lesson.sources.length > 0 && (
            <aside className="foundation-sources">
              <h3>想再深入</h3>
              <ul>{lesson.sources.map(source => (
                <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>
              ))}</ul>
            </aside>
          )}
        </>
      );
    }
  })();

  return (
    <div className="lesson-wrap">
      <div>
        <header className="lesson-head">
          <Link to={routeHref} className="backlink">
            ← {track?.title ?? "路线"}
          </Link>
          <h1>{lesson.title}</h1>
          <div className="row">
            <span className="muted">约 {lesson.estimatedMinutes} 分钟</span>
            <QualityPill state={lesson.quality.state} />
            {completed && <span className="pill done">已完成</span>}
            {aiEnabled() && <Link to={`/lab/tutor/${lessonId}`} className="pill available ai-shortcut">问 AI 导师</Link>}
          </div>
          <ProgressBar value={step + 1} max={total} label={`课程进度，第 ${step + 1} 步，共 ${total} 步`} />
        </header>
        <div className={`lesson-body lesson-${block.type}`} ref={bodyRef} tabIndex={-1} aria-live="off">
          {/* key={step}：每一步都重新挂载，避免相邻的同类互动块互相沿用状态 */}
          <div key={step}>{content}</div>
        </div>
        <nav className="stepnav" aria-label="课时导航">
          <button type="button" className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            上一步
          </button>
          {isLast ? (
            declaredReady ? (
              <Link to={`/lesson/${declaredNext}`} className="btn">下一课</Link>
            ) : fallback ? (
              <Link to={`/lesson/${fallback.id}`} className="btn">继续：{fallback.title}</Link>
            ) : (
              <Link to={routeHref} className="btn">回到路线</Link>
            )
          ) : (
            <button
              type="button"
              className="btn"
              disabled={!canNext}
              aria-describedby={canNext ? undefined : "gate-hint"}
              onClick={() => setStep(step + 1)}
            >
              下一步
            </button>
          )}
        </nav>
        {!canNext && !isLast && (
          <p id="gate-hint" className="muted" style={{ maxWidth: "68ch" }}>
            完成这一步的练习后，才能继续。
          </p>
        )}
        {isLast && !declaredReady && (
          <p className="muted" style={{ maxWidth: "68ch" }}>
            {fallback
              ? declaredTitle
                ? `按顺序的下一课「${declaredTitle}」还在制作中，你可以先学这一课。`
                : "按顺序的下一课还在制作中，你可以先学这一课。"
              : "下一课还在准备中。"}
          </p>
        )}
      </div>
      <ol className="steps" aria-label="本课目录">
        {lesson.blocks.map((b, i) => (
          <li
            key={i}
            className={done[i] && i < step ? "done" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <span className="dot" aria-hidden="true" />
            {stepLabel(b)}
          </li>
        ))}
      </ol>
    </div>
  );
}
