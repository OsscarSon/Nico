import { useRef, useState } from "react";
import {
  applyBackup,
  mergeBackup,
  readBackup,
  ACADEMY_PATH_KEY,
  type Backup,
} from "../../../progress/backup";
import { getProgress, importProgress } from "../../../progress/useProgress";
import { getKnowledge } from "../../../progress/knowledge";
import { getStudy } from "../../../progress/study";
import { getPreferences } from "../../../preferences/store";
import { getPersonalPath } from "../../../content/academy2/paths";
import { downloadText } from "./files";

function current(): Backup {
  return {
    format: "nico-academy-backup",
    version: 1,
    legacy: getProgress(),
    knowledge: getKnowledge(),
    library: getStudy(),
    preferences: getPreferences(),
    professionalPath: getPersonalPath(localStorage.getItem(ACADEMY_PATH_KEY) ?? "")?.id ?? "",
  };
}
export default function BackupPanel() {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ReturnType<typeof readBackup>>(null);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(true);
  async function select(file: File | undefined) {
    setPending(null);
    if (!file) return;
    try {
      const parsed = file.size > 4_000_000 ? null : readBackup(await file.text());
      setPending(parsed);
      setMessage(
        parsed ? "文件已验证，请确认后恢复。" : "无法验证此备份。请使用有效的 Nico JSON 文件。",
      );
    } catch {
      setMessage("无法读取文件。");
    }
  }
  function restore() {
    if (!pending) return;
    try {
      if ("format" in pending) {
        applyBackup(localStorage, mergeBackup(current(), pending, settings));
        try {
          sessionStorage.setItem("nico-imported", "已合并恢复跨设备学习备份。");
        } catch {
          /* persisted restore does not depend on the one-time message */
        }
        window.location.reload();
      } else {
        importProgress(pending);
        setPending(null);
        setMessage("已合并旧版课时记录。");
      }
    } catch (issue) {
      setMessage(issue instanceof Error ? issue.message : "恢复失败。");
    }
  }
  return (
    <section className="a2-panel">
      <h2>完整学习备份</h2>
      <p>
        备份包含旧课时、知识点与题库、笔记、收藏、报告、阅读位置、设置和专业路线。文件只在设备间手动传送。
      </p>
      <div className="row">
        <button
          className="btn secondary"
          onClick={() => {
            try {
              downloadText(
                "nico-academy-complete.json",
                JSON.stringify(current(), null, 2),
                "application/json",
              );
              setMessage("已导出完整备份。");
            } catch {
              setMessage("浏览器无法读取完整备份。");
            }
          }}
        >
          导出完整备份
        </button>
        <button className="btn secondary" onClick={() => ref.current?.click()}>
          选择恢复文件
        </button>
        <input
          ref={ref}
          aria-label="完整备份 JSON 文件"
          type="file"
          hidden
          accept=".json,application/json"
          onChange={(event) => {
            void select(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {message && <p role="status">{message}</p>}
      {pending && (
        <div>
          {"format" in pending && (
            <label>
              <input
                type="checkbox"
                checked={settings}
                onChange={(event) => setSettings(event.target.checked)}
              />{" "}
              同时从文件恢复设置和专业路线
            </label>
          )}
          <div className="row">
            <button className="btn" onClick={restore}>
              确认恢复完整备份
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setPending(null);
                setMessage("已取消。");
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
