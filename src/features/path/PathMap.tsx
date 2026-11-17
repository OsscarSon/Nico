import { useEffect, useRef } from "react";
import { Link, usePath } from "../../app/router";
import { artUrl } from "../../art";
import { QualityPill } from "../../components/ui";
import { nodeState, routeCounts, type RouteView } from "../../content/route-view";
import { useProgress } from "../../progress/useProgress";
import { usePreferences } from "../../preferences/store";

/** Fluid DOM nodes: no fixed row heights, invented locks, or lit gaps for unfinished lessons. */
export function PathMap({ track }: { track: RouteView }) {
  const progress = useProgress(), preferences = usePreferences(), root = useRef<HTMLDivElement>(null);
  const unitContext = new URLSearchParams(usePath().split("?")[1]).get("unit");
  const resume = track.nodes.find(n => n.available && n.id === progress.resume?.lessonId && !progress.lessons[n.id]);
  const current = resume ?? track.nodes.find(n => n.available && !progress.lessons[n.id]);
  useEffect(() => {
    const segment = [...(root.current?.querySelectorAll<HTMLDetailsElement>("details[data-unit]") ?? [])].find(el => el.dataset.unit === unitContext);
    if (segment) { segment.open = true; segment.querySelector("summary")?.focus(); segment.scrollIntoView({ block: "start" }); }
  }, [track.id, track.stage, unitContext]);
  return <div className="pathmap" ref={root}>
    <p className="route-legend">已完成 · 接下来 / 续学 · 可以开始 · 规划中。草稿 / 试学表示课程质量；完成进度来自你的学习记录。</p>
    <div className="route-units">{track.units.map(unit => {
      const counts = routeCounts(unit.nodes, progress), visible = unit.nodes.filter(n => preferences.showPlanned || n.available);
      return <details className="route-unit" key={unit.id} data-unit={unit.id} open>
        <summary className="pm-unit">{unit.art && <img src={artUrl(unit.art)} alt="" width={120} height={68} />}<span><span className="eyebrow">{unit.id.endsWith("-planned") ? `${track.id.toUpperCase()} · 规划` : unit.id.toUpperCase()}</span><strong>{unit.title}</strong><small>{counts.completed} / {counts.available} 已上线课完成 · {counts.planned} 门规划</small></span><span className="unit-toggle" aria-hidden="true">⌄</span></summary>
        <ol aria-label={`${unit.title}的课时`}>{visible.map(node => {
          const state = nodeState(node, progress, current?.id);
          const body = <><span className="route-code mono">{node.code}</span><span className="route-title"><strong>{node.course.title}</strong>{node.lesson && <small>{node.lesson.estimatedMinutes}分钟 · {state === "current" ? resume?.id === node.id ? "上次学到这里" : "推荐下一课" : "动手实验与检查题"}</small>}</span>{node.lesson ? <span className="route-pills"><QualityPill state={node.lesson.quality.state} /><span className={`pill ${state === "completed" ? "done" : "available"}`}>{state === "completed" ? "已完成" : "可以开始"}</span></span> : <><span className="pill">规划中{node.course.status === "next" ? " · 下一批 / 试点" : ""}</span><small>尚未开放，不能开始学习</small></>}</>;
          return <li key={node.code} className="pm-lesson" data-code={node.code} data-state={state}>
            <svg className="route-wire" viewBox="0 0 32 100" preserveAspectRatio="none" aria-hidden="true"><path d="M16 0V32L23 39V61L16 68V100" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={state === "completed" ? undefined : "4 5"} /></svg><span className="route-pad" aria-hidden="true">{state === "completed" ? "✓" : ""}</span>
            {node.available ? <Link className={`pm-card${state === "current" ? " current" : ""}`} to={`/lesson/${node.id}`} aria-current={state === "current" ? "step" : undefined}>{body}</Link> : <div className="pm-card planned">{node.plannedArt && <img className="planned-thumbnail" src={artUrl(node.plannedArt)} alt="" width={128} height={72} />}{body}</div>}
          </li>;
        })}</ol>{!visible.length && <p className="route-hidden-note">当前只包含规划课程，已按你的偏好隐藏。可在设置中打开“显示规划课程”。</p>}
      </details>;
    })}</div>
  </div>;
}
