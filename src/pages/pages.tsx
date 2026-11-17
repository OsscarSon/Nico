import { useState } from "react";
import { Link, navigate } from "../app/router";
import { getLesson, allCatalogLessons } from "../content";
import { getTrack } from "../content/catalog";
import { Device, EmptyState } from "../components/ui";
import { artUrl } from "../art";
import { evaluateBadges } from "../progress/badges";
import { CoursesCatalog, PathsCatalog, StageOverview } from "../features/academy/AcademyCatalog";
import { PathMap } from "../features/path/PathMap";
import { BitSwitches } from "../sims/BitSwitches";
import { clearProgress, getProgress, useProgress } from "../progress/useProgress";
import { streak } from "../progress/store";
import { applyTheme, type Theme } from "../progress/theme";
import { applyFontSize, loadFontSize, type FontSize } from "../progress/settings";

export function HomePage() {
  const progress = useProgress();
  const completedCount = Object.keys(progress.lessons).length;
  const days = streak(progress, new Date());

  const learnable = allCatalogLessons().filter((l) => l.status === "available");
  const nextLesson = learnable.find((l) => !progress.lessons[l.id]);
  const resume = progress.resume && !progress.lessons[progress.resume.lessonId] ? progress.resume : null;
  const target = resume ? learnable.find((l) => l.id === resume.lessonId) : nextLesson;
  const targetLesson = target ? getLesson(target.id) : undefined;

  return (
    <>
      <section className="academy-hero">
        <div><span className="academy-eyebrow">EXPLORE · BUILD · UNDERSTAND</span>
          <h1>每一步，都在构建<br />你的知识世界。</h1>
          <p>从第一行代码，到理解复杂系统。<br />选择你的路线，让学习真正发生。</p>
          <button className="btn" onClick={() => navigate("/paths")}>探索学习路线 ↗</button>
        </div>
        <img src={artUrl("hero-home-1600x900.png")} alt="Nico 原版 Byte 与电路学习路线插画" width={1600} height={900} />
      </section>

      <section className="panel today" aria-labelledby="today-title">
        {targetLesson ? (
          <>
            <span className="pill available" style={{ justifySelf: "start" }}>
              {resume ? "继续上次的位置" : completedCount ? "下一课" : "从这里开始"}
            </span>
            <h2 id="today-title">{targetLesson.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              约 {targetLesson.estimatedMinutes} 分钟 · 有互动、检查题和一道迁移题
            </p>
            <div>
              <Link to={`/lesson/${targetLesson.id}`} className="btn">
                {resume ? "继续这一课" : "开始这一课"}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 id="today-title">目前可学的课都学完了</h2>
            <p className="muted" style={{ margin: 0 }}>
              新的课还在制作中。可以回到实验台继续练习，或看看后面的课程规划。
            </p>
            <div className="row">
              <Link to="/lab" className="btn">去实验台</Link>
              <Link to="/paths" className="btn secondary">看路线</Link>
            </div>
          </>
        )}
        {(completedCount > 0 || days > 0) && (
          <div className="stats">
            <div className="stat"><strong>{completedCount}</strong><span>已完成课时</span></div>
            <div className="stat"><strong>{days}</strong><span>连续学习天数</span></div>
          </div>
        )}
      </section>

      <StageOverview />
    </>
  );
}

export function PathsPage() {
  return <><header className="page-head"><h1>学习路线</h1><p>从入门到深入的自学路径。先选阶段和路线，再看路线里的课程。</p></header><PathsCatalog /></>;
}

export function CoursesPage() {
  return <><header className="page-head"><h1>课程目录</h1><p>搜索并筛选所有课程，已上线课程可直接进入学习。</p></header><CoursesCatalog /></>;
}

export function TrackPage({ trackId }: { trackId: string }) {
  const track = getTrack(trackId);
  if (!track) return <NotFoundPage />;
  const available = track.lessons.filter((l) => l.status === "available").length;
  return (
    <>
      <Link to="/paths" className="backlink">← 所有路线</Link>
      <header className="page-head track-head">
        <img className="track-emblem lg" src={artUrl(track.art)} alt="" width={88} height={88} />
        <div>
          <h1>{track.title}</h1>
          <p>{track.tagline}</p>
        </div>
      </header>
      {track.status === "building" ? (
        <>
          <p className="muted">
            共 {track.lessons.length} 课规划，现在可学 {available} 课。灰色虚线的是还在制作的课。
          </p>
          <PathMap track={track} />
        </>
      ) : (
        <EmptyState title="这条路线还在规划中" action={<Link to="/paths/a" className="btn">先去路线 A</Link>}>
          {track.plannedSummary}。现在还没有可学的课，会在路线 A 打磨好之后开始制作。
        </EmptyState>
      )}
    </>
  );
}

export function LabPage() {
  const planned = ["子网计算器", "DNS 解析动画", "TCP 握手时序图", "公式沙盒"];
  return (
    <>
      <header className="page-head">
        <h1>实验台</h1>
        <p>不用上课，直接动手。这里放所有可以单独使用的小器件。</p>
      </header>
      <Device title="位开关" label="模拟">
        <p className="muted">点开关，看二进制怎么变成十进制。</p>
        <BitSwitches mode="free" />
      </Device>
      <h2 className="section-title">AI 与提示词</h2>
      <div className="grid cols-2">
        <Link to="/lab/prompt" className="panel trackcard">
          <h3>Prompt 训练场</h3>
          <p>写一条给 AI 的指令，检查六个要素有没有写到。不联网也能用。</p>
        </Link>
        <Link to="/lab/tutor" className="panel trackcard">
          <h3>AI 导师</h3>
          <p>围绕一节课向 AI 提问。需要接上 AI 服务才能用。</p>
        </Link>
      </div>
      <h2 className="section-title">制作中</h2>
      <div className="grid cols-3">
        {planned.map((p) => (
          <div key={p} className="panel" style={{ borderStyle: "dashed" }}>
            <h3 style={{ marginBottom: 4 }}>{p}</h3>
            <span className="pill">规划中</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ProjectsPage() {
  return (
    <>
      <header className="page-head"><h1>作品</h1></header>
      <EmptyState title="作品功能还在准备中" art="empty-no-projects.png" action={<Link to="/paths/a" className="btn">去学路线 A</Link>}>
        每条路线结尾都会有一个小项目，做完后会收集在这里。
      </EmptyState>
    </>
  );
}

export function MePage() {
  const progress = useProgress();
  const days = streak(progress, new Date());

  return (
    <>
      <header className="page-head"><h1>我的</h1></header>
      <section className="panel">
        <div className="stats" style={{ marginTop: 0 }}>
          <div className="stat"><strong>{Object.keys(progress.lessons).length}</strong><span>已完成课时</span></div>
          <div className="stat"><strong>{days}</strong><span>连续学习天数</span></div>
        </div>
      </section>

      <h2 className="section-title">徽章</h2>
      <ul className="badges" aria-label="徽章">
        {evaluateBadges(progress, new Date()).map((b) => (
          <li key={b.id} className={`badge ${b.earned ? "earned" : ""}`}>
            <img src={artUrl(b.art)} alt="" width={96} height={96} />
            <strong>{b.title}</strong>
            <span className="muted">{b.how}</span>
            <span className={`pill ${b.earned ? "done" : ""}`}>
              {b.earned ? "已获得" : b.obtainable ? "未获得" : "对应课程尚未开放"}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="section-title">学习工具</h2>
      <div className="row">
        <Link to="/lab" className="btn secondary">打开实验台</Link>
        <Link to="/lab/prompt" className="btn secondary">Prompt 训练场</Link>
        <Link to="/projects" className="btn secondary">查看作品</Link>
      </div>
    </>
  );
}

export function SettingsPage() {
  const [font, setFont] = useState<FontSize>(loadFontSize);
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === "light" ? "light" : "dark");
  const [confirming, setConfirming] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nico-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const changeFont = (f: FontSize) => {
    setFont(f);
    applyFontSize(f);
  };
  const changeTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };

  return (
    <>
      <header className="page-head"><h1>设置</h1><p>外观与学习记录。所有设置只保存在这台设备的浏览器里。</p></header>

      <h2 className="section-title">外观</h2>
      <section className="panel">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, marginBottom: 8 }}>主题</legend>
          <div className="row">
            <button type="button" className={`btn ${theme === "dark" ? "" : "secondary"}`} aria-pressed={theme === "dark"} onClick={() => changeTheme("dark")}>暗色</button>
            <button type="button" className={`btn ${theme === "light" ? "" : "secondary"}`} aria-pressed={theme === "light"} onClick={() => changeTheme("light")}>亮色</button>
          </div>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: "20px 0 0" }}>
          <legend style={{ fontWeight: 700, marginBottom: 8 }}>字号</legend>
          <div className="row">
            <button type="button" className={`btn ${font === "normal" ? "" : "secondary"}`} aria-pressed={font === "normal"} onClick={() => changeFont("normal")}>标准</button>
            <button type="button" className={`btn ${font === "large" ? "" : "secondary"}`} aria-pressed={font === "large"} onClick={() => changeFont("large")}>大</button>
          </div>
        </fieldset>
      </section>

      <h2 className="section-title">数据</h2>
      <section className="panel">
        <p className="muted">学习记录只保存在这台设备的浏览器里，不会上传。换设备或清除浏览器数据会丢失，建议偶尔导出备份。</p>
        <div className="row">
          <button type="button" className="btn secondary" onClick={exportData}>导出学习记录</button>
          {confirming ? (
            <>
              <button type="button" className="btn" style={{ background: "var(--fault)", borderColor: "var(--fault)" }} onClick={() => { clearProgress(); setConfirming(false); }}>
                确认清除，无法恢复
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirming(false)}>取消</button>
            </>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setConfirming(true)}>清除学习记录</button>
          )}
        </div>
      </section>
    </>
  );
}

export function NotFoundPage() {
  return (
    <EmptyState title="找不到这个页面" art="error-404.png" action={<Link to="/" className="btn">回到首页</Link>}>
      地址可能输错了，或者这一课还没有开放。
    </EmptyState>
  );
}
