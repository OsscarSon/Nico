import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "../../app/router";
import { aiEnabled } from "../../ai/config";
import { clearProgress, getProgress, importProgress, useProgress } from "../../progress/useProgress";
import { parseProgress, streak } from "../../progress/store";
import { applyTheme, type Theme } from "../../progress/theme";
import { applyFontSize, loadFontSize, type FontSize } from "../../progress/settings";

const MAX_IMPORT_BYTES = 1_000_000;

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; text: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(o => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.text}</button>)}
    </div>
  );
}

export function SettingsPage() {
  const progress = useProgress();
  const [font, setFont] = useState<FontSize>(loadFontSize);
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === "light" ? "light" : "dark");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const completed = Object.keys(progress.lessons).length;
  const days = streak(progress, new Date());

  const changeTheme = (t: Theme) => { setTheme(t); applyTheme(t); };
  const changeFont = (f: FontSize) => { setFont(f); applyFontSize(f); };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nico-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage({ kind: "ok", text: "已导出学习记录。请把文件保存在安全的地方。" });
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { setMessage({ kind: "error", text: "文件太大，不像是 Nico 的学习记录备份。" }); return; }
    const incoming = parseProgress(await file.text());
    if (!incoming) { setMessage({ kind: "error", text: "无法导入：这不是有效的 Nico 学习记录备份（或版本不匹配）。当前记录没有被改动。" }); return; }
    const before = getProgress();
    importProgress(incoming);
    const after = getProgress();
    const addedLessons = Object.keys(after.lessons).length - Object.keys(before.lessons).length;
    const addedDays = after.activeDays.length - before.activeDays.length;
    setMessage({ kind: "ok", text: `已合并导入：新增 ${addedLessons} 个已完成课时、${addedDays} 个学习日。已有记录不会被覆盖。` });
  };

  const ai = aiEnabled();

  return (
    <>
      <header className="page-head"><h1>设置</h1><p>外观、学习记录与 AI 服务。所有设置只保存在这台设备的浏览器里。</p></header>

      <h2 className="section-title">外观</h2>
      <section className="panel settings-list">
        <div className="setting-row">
          <div className="setting-text"><strong>主题</strong><p>默认暗色，长时间学习更柔和；白天可以切到亮色。</p></div>
          <Segmented label="主题" value={theme} onChange={changeTheme} options={[{ value: "dark", text: "暗色" }, { value: "light", text: "亮色" }]} />
        </div>
        <div className="setting-row">
          <div className="setting-text"><strong>字号</strong><p>放大界面与课程文字，适合小屏或需要更舒适阅读时。</p></div>
          <Segmented label="字号" value={font} onChange={changeFont} options={[{ value: "normal", text: "标准" }, { value: "large", text: "大" }]} />
        </div>
      </section>

      <h2 className="section-title">学习记录</h2>
      <section className="panel settings-list">
        <div className="setting-row">
          <div className="setting-text"><strong>当前记录</strong><p>{completed} 个已完成课时 · 连续学习 {days} 天 · 共 {progress.activeDays.length} 个学习日</p></div>
        </div>
        <div className="setting-row">
          <div className="setting-text"><strong>备份与恢复</strong><p>记录只在这台设备上，不会上传。换设备或清除浏览器数据前，请先导出；导入会与现有记录合并，不会覆盖已有进度。</p></div>
          <div className="row">
            <button type="button" className="btn secondary" onClick={exportData}>导出</button>
            <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}>导入</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPick} aria-label="选择要导入的学习记录文件" />
          </div>
        </div>
        {message && <p className={`settings-message ${message.kind}`} role="status">{message.text}</p>}
      </section>

      <h2 className="section-title">AI 服务</h2>
      <section className="panel settings-list">
        <div className="setting-row">
          <div className="setting-text"><strong>连接状态</strong><p>{ai ? "已配置 AI 服务地址，AI 导师和 Prompt 点评可以使用。" : "尚未配置 AI 服务地址，AI 功能已关闭。指令的本地检查等功能不受影响。"}</p></div>
          <span className={`pill ${ai ? "done" : "draft"}`}>{ai ? "已连接" : "未配置"}</span>
        </div>
        <div className="setting-row">
          <div className="setting-text"><strong>去试试</strong><p>AI 功能都在实验台里。</p></div>
          <Link to="/lab" className="btn ghost">打开实验台</Link>
        </div>
      </section>

      <h2 className="section-title">关于</h2>
      <section className="panel settings-list">
        <div className="setting-row">
          <div className="setting-text"><strong>Nico Academy</strong><p>一个从入门到深入的自学空间：每天一点，动手理解。没有账号，也没有云端同步。</p></div>
          <a className="btn ghost" href="https://github.com/osscarson/Nico" target="_blank" rel="noopener noreferrer">源码 ↗</a>
        </div>
      </section>

      <h2 className="section-title">危险操作</h2>
      <section className="panel settings-list danger-zone">
        <div className="setting-row">
          <div className="setting-text"><strong>清除学习记录</strong><p>删除这台设备上的全部进度、连续天数和徽章，无法恢复。建议先导出备份。</p></div>
          {confirming ? (
            <div className="row">
              <button type="button" className="btn" style={{ background: "var(--fault)", borderColor: "var(--fault)", color: "var(--paper)" }} onClick={() => { clearProgress(); setConfirming(false); setMessage({ kind: "ok", text: "学习记录已清除。" }); }}>确认清除，无法恢复</button>
              <button type="button" className="btn ghost" onClick={() => setConfirming(false)}>取消</button>
            </div>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setConfirming(true)}>清除学习记录</button>
          )}
        </div>
      </section>
    </>
  );
}
