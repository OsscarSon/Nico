import { Link } from "../../app/router";
import { artUrl } from "../../art";
import { getLesson } from "../../content";
import { academyTracks } from "../../content/academy";
import { routeCounts, routeView } from "../../content/route-view";
import { recommendedLesson } from "../../content/academy2/model";
import { getPersonalPath } from "../../content/academy2/paths";
import { useAcademyPath } from "../academy2/learningPreference";
import { ProgressBar } from "../../components/ui";
import { evaluateBadges } from "../../progress/badges";
import { streak } from "../../progress/store";
import { useProgress } from "../../progress/useProgress";
import { usePreferences } from "../../preferences/store";
import { ProfileEditor } from "./ProfileEditor";

export function ProfilePage() {
  const progress = useProgress(), preferences = usePreferences(), today = new Date(), days = streak(progress, today);
  const earned = evaluateBadges(progress, today), nextBadge = earned.find(b => b.obtainable && !b.earned);
  const { id: personalId } = useAcademyPath();
  const selectedPath = getPersonalPath(personalId);
  const next = recommendedLesson(progress, preferences.resumeHome, preferences.learningPath, personalId);
  const recent = Object.entries(progress.lessons).sort((a, b) => Date.parse(b[1].completedAt) - Date.parse(a[1].completedAt)).slice(0, 4);
  const preferred = academyTracks.find(t => t.id.toLowerCase() === preferences.learningPath);
  return <>
    <header className="page-head"><h1>我的</h1><p>你的学习空间。每一点进步，都来自实际学习记录。</p></header>
    <section className="identity-card" aria-label="本机学习身份卡">
      <img className="identity-backdrop" src={artUrl("profile-identity-background.png")} alt="" width={1600} height={900} />
      <div className="identity-person"><img className="identity-avatar" src={artUrl("nico-academy-icon-final-180.png")} alt="Nico，默认学习头像" width={88} height={88} /><div><span className="identity-caption">NICO · 本机学习档案</span><h2>{preferences.nickname || "学习者"}</h2><p>{selectedPath ? selectedPath.title + "主线" : preferred ? `${preferred.id} 路线学习者` : "自主学习者"} · 记录仅存本机</p></div></div>
      <div className="stats"><div className="stat"><strong>{Object.keys(progress.lessons).length}</strong><span>已完成课时</span></div><div className="stat"><strong>{days}</strong><span>连续学习天数</span></div><div className="stat"><strong>{earned.filter(b => b.earned).length}</strong><span>已获得徽章</span></div></div>
      <details className="identity-edit"><summary>编辑个人资料</summary><ProfileEditor /></details>
    </section>
    <div className="dashboard-grid">
      <section className="panel"><span className="eyebrow">接着动手</span><h2>{next ? next.title : "目前可学的课都学完了"}</h2><p className="muted">{progress.resume && next?.id === progress.resume.lessonId ? "继续上次的学习位置，当前未完成挑战仍需要实际操作。" : "按真实完成记录与偏好路线，推荐下一门可学习课程。"}</p>{next ? <Link className="btn" to={`/lesson/${next.id}`}>继续学习</Link> : <Link className="btn secondary" to="/paths">探索路线</Link>}</section>
      <section className="panel"><span className="eyebrow">下一枚徽章</span><h2>{nextBadge?.title ?? "已获得目前可达成的徽章"}</h2><p className="muted">{nextBadge?.how ?? "可以复习已完成课程，后续徽章将随对应课程开放。"}</p><button className="btn secondary" onClick={() => { document.getElementById("profile-badges")?.scrollIntoView({ behavior: preferences.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); document.getElementById("profile-badges")?.focus({ preventScroll: true }); }}>查看徽章条件</button></section>
      <section className="panel"><h2>最近完成</h2>{recent.length ? <ul className="recent-lessons">{recent.map(([id, r]) => <li key={id}><div>{getLesson(id) ? <Link to={`/lesson/${id}`}>{getLesson(id)!.title}</Link> : <span>{id}（备份中保留的课程记录）</span>}<small>{new Date(r.completedAt).toLocaleDateString()} · 首次检查 {r.firstTryCorrect}/{r.quizTotal}</small></div><span className="pill done">已完成</span></li>)}</ul> : <div className="profile-empty"><img src={artUrl("empty-no-progress.png")} alt="" width={160} height={120} /><p>还没有已完成的课程。完成一课后，真实记录会出现在这里。</p></div>}</section>
      <section className="panel"><h2>路线进度</h2><div className="profile-routes">{academyTracks.map(t => { const route = routeView(t.id); if (!route?.nodes.length) return null; const c = routeCounts(route.nodes, progress); return <div key={t.id}><div className="row"><Link to={`/paths/${t.id.toLowerCase()}`}>{t.id} · {t.title}</Link><span>{c.completed} / {c.available} 已上线课程完成</span></div>{c.available ? <ProgressBar value={c.completed} max={c.available} label={`${t.id}路线已完成${c.completed}共${c.available}门已上线课`} /> : <p className="muted">尚未开放课程，规划不计作可学习进度。</p>}</div>; })}</div></section>
    </div>
    <h2 id="profile-badges" tabIndex={-1} className="section-title">徽章</h2>
    <ul className="badges" aria-label="徽章">{earned.map(b => <li key={b.id} className={`badge ${b.earned ? "earned" : ""}`}><img src={artUrl(b.art)} alt="" width={96} height={96} /><strong>{b.title}</strong><span className="muted">{b.how}</span><span className={`pill ${b.earned ? "done" : ""}`}>{b.earned ? "已获得" : b.obtainable ? "未获得" : "对应课程尚未开放"}</span><details><summary>查看获得条件</summary><p>{b.streakDays ? `当前连续${days}天，需要${b.streakDays}天。` : b.requires.map(id => `${getLesson(id)?.title ?? id}：${progress.lessons[id] && getLesson(id) ? "已完成" : getLesson(id) ? "尚未完成" : "尚未开放"}`).join("；")}</p></details></li>)}</ul>
    <h2 className="section-title">学习工具</h2><div className="row"><Link to="/lab" className="btn secondary">打开实验台</Link><Link to="/lab/prompt" className="btn secondary">Prompt 训练场</Link><Link to="/projects" className="btn secondary">查看作品</Link><Link to="/settings" className="btn ghost">管理偏好与数据</Link></div>
  </>;
}
