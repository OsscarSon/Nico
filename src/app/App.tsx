import { useEffect, useRef } from "react";
import { Link, matchRoute, usePath } from "./router";
import { Logo, NavIcon } from "../components/ui";
import { LessonPlayer } from "../features/lesson/LessonPlayer";
import {
  HomePage, LabPage, MePage, NotFoundPage, PathsPage, ProjectsPage, TrackPage,
} from "../pages/pages";

const nav = [
  { to: "/", label: "首页", icon: "home", match: (p: string) => p === "/" },
  { to: "/paths", label: "路线", icon: "paths", match: (p: string) => p.startsWith("/paths") || p.startsWith("/lesson") },
  { to: "/lab", label: "实验", icon: "lab", match: (p: string) => p.startsWith("/lab") },
  { to: "/projects", label: "作品", icon: "projects", match: (p: string) => p.startsWith("/projects") },
  { to: "/me", label: "我的", icon: "me", match: (p: string) => p.startsWith("/me") },
] as const;

function NavLinks({ path }: { path: string }) {
  return (
    <>
      {nav.map((n) => (
        <Link key={n.to} to={n.to} className="navlink" aria-current={n.match(path) ? "page" : undefined}>
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
      case "track": return <TrackPage trackId={route.trackId} />;
      case "lesson": return <LessonPlayer lessonId={route.lessonId} />;
      case "lab": return <LabPage />;
      case "projects": return <ProjectsPage />;
      case "me": return <MePage />;
      default: return <NotFoundPage />;
    }
  })();

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>跳到主要内容</a>
      <nav className="sidenav" aria-label="主导航">
        <Link to="/" className="brand"><Logo />Nico</Link>
        <NavLinks path={path} />
      </nav>
      <main id="main" className="main" tabIndex={-1} ref={mainRef}>
        <div className="mobilebar"><Link to="/" className="brand"><Logo />Nico</Link></div>
        {page}
      </main>
      <nav className="bottomnav" aria-label="主导航（手机）">
        <NavLinks path={path} />
      </nav>
    </div>
  );
}
