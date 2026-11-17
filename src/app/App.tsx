import { useEffect, useRef } from "react";
import { Link, matchRoute, usePath } from "./router";
import { ThemeToggle } from "../components/ThemeToggle";
import { Logo, NavIcon } from "../components/ui";
import { LessonPlayer } from "../features/lesson/LessonPlayer";
import { PromptLab } from "../features/prompt-lab/PromptLab";
import { TutorPage } from "../features/prompt-lab/TutorPage";
import {
  CoursesPage, HomePage, LabPage, MePage, NotFoundPage, PathsPage, ProjectsPage, SettingsPage, TrackPage,
} from "../pages/pages";

const nav = [
  { to: "/", label: "首页", icon: "home", match: (p: string) => p === "/" },
  { to: "/paths", label: "路线", icon: "paths", match: (p: string) => p.startsWith("/paths") || p.startsWith("/lesson") },
  { to: "/courses", label: "课程", icon: "courses", match: (p: string) => p === "/courses" },
  { to: "/lab", label: "实验", icon: "lab", match: (p: string) => p.startsWith("/lab") },
  { to: "/projects", label: "作品", icon: "projects", match: (p: string) => p.startsWith("/projects") },
  { to: "/me", label: "我的", icon: "me", match: (p: string) => p.startsWith("/me") },
  { to: "/settings", label: "设置", icon: "settings", match: (p: string) => p.startsWith("/settings") },
] as const;

function NavLinks({ path }: { path: string }) {
  return (
    <>
      {nav.map((n) => (
        <Link key={n.to} to={n.to} className={`navlink${["/lab", "/projects"].includes(n.to) ? " desktop-extra" : ""}`} aria-current={n.match(path) ? "page" : undefined}>
          <NavIcon name={n.icon} />
          <span>{n.label}</span>
        </Link>
      ))}
    </>
  );
}

export function App() {
  const path = usePath();
  const route = matchRoute(path);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [path]);

  const page = (() => {
    switch (route.name) {
      case "home": return <HomePage />;
      case "paths": return <PathsPage />;
      case "courses": return <CoursesPage />;
      case "track": return <TrackPage trackId={route.trackId} />;
      case "lesson": return <LessonPlayer lessonId={route.lessonId} />;
      case "lab": return <LabPage />;
      case "prompt-lab": return <PromptLab />;
      case "tutor": return <TutorPage lessonId={route.lessonId} />;
      case "projects": return <ProjectsPage />;
      case "me": return <MePage />;
      case "settings": return <SettingsPage />;
      default: return <NotFoundPage />;
    }
  })();

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>跳到主要内容</a>
      <nav className="sidenav" aria-label="主导航">
        <Link to="/" className="brand"><Logo /><span>Nico<small>ACADEMY</small></span></Link>
        <span className="nav-caption">学习空间</span>
        <NavLinks path={path} />
        <p className="nav-footer">从入门到深入<br />每天一点，动手理解。</p>
      </nav>
      <main id="main" className="main" tabIndex={-1} ref={mainRef}>
        <header className="academy-topbar"><Link to="/" className="brand mobile-brand"><Logo /><span>Nico<small>ACADEMY</small></span></Link><span className="academy-breadcrumb">Nico Academy / 学习空间</span><ThemeToggle /></header>
        {page}
      </main>
      <nav className="bottomnav" aria-label="主导航（手机）">
        <NavLinks path={path} />
      </nav>
    </div>
  );
}
