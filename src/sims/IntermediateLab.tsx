import { useState } from "react";
import { evaluatePrompt, evaluateRag, type PromptSettings, type RagSettings } from "../grading/intermediate/evidence";
import { LabCheck, type P3Props } from "./p3aShared";
import "../styles/intermediate.css";

const promptStart: PromptSettings = { priority: "merged", tool: "wide", format: "text" };
export function EvidenceContractLab({ mode, onSolved }: P3Props) {
  const [settings, setSettings] = useState(promptStart);
  const [report, setReport] = useState<ReturnType<typeof evaluatePrompt> | null>(null);
  function change(next: PromptSettings) { setSettings(next); setReport(null); }

  return <div className="p3-lab">
    <div className="intermediate-fields">
      <label>指令与资料边界<select aria-label="指令与资料边界" value={settings.priority}
        onChange={e => change({ ...settings, priority: e.target.value === "bounded" ? "bounded" : "merged" })}>
        <option value="merged">混合处理资料与规则</option><option value="bounded">规则独立，核对现行证据</option>
      </select></label>
      <label>工具请求范围<select aria-label="工具请求范围" value={settings.tool}
        onChange={e => change({ ...settings, tool: e.target.value === "read" ? "read" : "wide" })}>
        <option value="wide">允许提出账户操作请求</option><option value="read">仅请求公开目录读取</option>
      </select></label>
      <label>响应格式<select aria-label="响应格式" value={settings.format}
        onChange={e => change({ ...settings, format: e.target.value === "json" ? "json" : "text" })}>
        <option value="text">普通文本</option><option value="json">JSON：状态、文本、证据</option>
      </select></label>
    </div>
    <div className="row">
      <button className="btn" type="button" onClick={() => setReport(evaluatePrompt(settings))}>运行评测</button>
      <button className="btn ghost" type="button" onClick={() => change(promptStart)}>重置实验</button>
    </div>
    {report && <div className="p3-snapshot">
      <p role="status">通过 {report.filter(row => row.accepted).length}/{report.length} 个案例</p>
      <ul className="p3-output" aria-label="响应评测">
        {report.map(row => <li key={row.name}>
          <strong>{row.name}</strong> · {row.permission} · {row.accepted ? "通过" : "需调整"}
          <pre className="intermediate-code">{row.raw}</pre>
        </li>)}
      </ul>
    </div>}
    {mode === "challenge" && <LabCheck valid={Boolean(report?.every(row => row.accepted))} last onNext={() => onSolved?.()} />}
  </div>;
}

const ragStart: RagSettings = { size: 2, top: 1, rerank: false, abstain: false };
export function RetrievalLab({ mode, onSolved }: P3Props) {
  const [settings, setSettings] = useState(ragStart);
  const [report, setReport] = useState<ReturnType<typeof evaluateRag> | null>(null);
  function change(next: RagSettings) { setSettings(next); setReport(null); }

  return <div className="p3-lab">
    <div className="intermediate-fields">
      <label>分块粒度<select aria-label="分块粒度" value={String(settings.size)}
        onChange={e => change({ ...settings, size: e.target.value === "1" ? 1 : 2 })}>
        <option value="2">每块两小节</option><option value="1">每块一小节</option>
      </select></label>
      <label>候选数量<select aria-label="候选数量" value={String(settings.top)}
        onChange={e => change({ ...settings, top: e.target.value === "1" ? 1 : e.target.value === "2" ? 2 : 3 })}>
        {[1, 2, 3].map(n => <option value={n} key={n}>{n}</option>)}
      </select></label>
      <label>候选重排<select aria-label="候选重排" value={String(settings.rerank)}
        onChange={e => change({ ...settings, rerank: e.target.value === "true" })}>
        <option value="false">只按向量分</option><option value="true">相关候选中现行版本优先</option>
      </select></label>
      <label>没有相关证据时<select aria-label="没有相关证据时" value={String(settings.abstain)}
        onChange={e => change({ ...settings, abstain: e.target.value === "true" })}>
        <option value="false">尝试猜测</option><option value="true">报告资料不足</option>
      </select></label>
    </div>
    <div className="row">
      <button type="button" className="btn" onClick={() => setReport(evaluateRag(settings))}>检索并核对</button>
      <button type="button" className="btn ghost" onClick={() => change(ragStart)}>重置实验</button>
    </div>
    {report && <div className="p3-snapshot">
      <p role="status">{report.indexSize} 个索引块 · 候选召回 {report.recall}/{report.supported} · 最终通过 {report.accepted}/{report.rows.length}</p>
      <ul className="p3-output" aria-label="检索评测">
        {report.rows.map(row => <li key={row.name}>
          <strong>{row.name}</strong> · {row.accepted ? "通过" : "需调整"}
          <div>初筛候选 {row.initial.map(hit => hit.id + " " + hit.score.toFixed(2)).join("、") || "无"}</div>
          <div>最终证据 {row.evidence ?? "无"} · {row.text}</div>
        </li>)}
      </ul>
    </div>}
    {mode === "challenge" && <LabCheck valid={Boolean(report && report.accepted === report.rows.length)} last onNext={() => onSolved?.()} />}
  </div>;
}
