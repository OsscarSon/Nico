import type { ReactNode } from "react";
import type { QualityState } from "../content/schema";
import { artUrl } from "../art";

/** 把 **粗体** 渲染为 <strong>、`代码` 渲染为 <code>，其余按纯文本输出（不使用 innerHTML）。 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
          <code key={i} className="inline-code">{p.slice(1, -1)}</code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function Device({
  title,
  label,
  children,
}: {
  title: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <section className="device" aria-label={title}>
      <header>
        <h3>{title}</h3>
        {label && <span className="pill sim">{label}</span>}
      </header>
      {children}
    </section>
  );
}

const qualityText: Record<QualityState, string> = {
  draft: "草稿 · 尚未经真实试学",
  pilot: "试学中",
  published: "正式",
};
export function QualityPill({ state }: { state: QualityState }) {
  return <span className={`pill ${state === "draft" ? "draft" : "available"}`}>{qualityText[state]}</span>;
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="callout" role="note">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  art,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /** public/art/ 下的插图文件名；不传则用内置的占位图形 */
  art?: string;
}) {
  return (
    <div className="panel empty">
      {art ? (
        <img className="empty-art" src={artUrl(art)} alt="" width={400} height={300} />
      ) : (
      <svg viewBox="0 0 72 72" aria-hidden="true" fill="none" stroke="#14213d" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="20" y="20" width="32" height="32" rx="4" fill="#e6ecff" />
        <path d="M12 30h8M12 42h8M52 30h8M52 42h8M30 12v8M42 12v8M30 52v8M42 52v8" />
        <circle cx="36" cy="36" r="4" fill="#ffb020" />
      </svg>
      )}
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <i style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

export function Feedback({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div className={`feedback ${ok ? "ok" : "bad"}`} role="status">
      <b aria-hidden="true">{ok ? "✓" : "✗"}</b>
      <span>
        <span className="sr-only">{ok ? "答对了。" : "还不对。"}</span>
        {children}
      </span>
    </div>
  );
}

const paths: Record<string, string> = {
  courses: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5",
  ai: "M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z",
  home: "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z",
  paths: "M5 4v6a3 3 0 0 0 3 3h8a3 3 0 0 1 3 3v4M5 4h.01M19 20h.01",
  lab: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3",
  projects: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  settings: "M4 7h9M17 7h3M4 17h2M10 17h10M13 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
};
export function NavIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#2457f5" />
      <path d="M11 26V10l14 16V10" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="25" cy="10" r="3" fill="#ffb020" />
    </svg>
  );
}
