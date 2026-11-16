import { useMemo, useState } from "react";
import { Link } from "../../app/router";
import { askAi } from "../../ai/client";
import { aiEnabled } from "../../ai/config";
import { aiArt } from "../../ai/art";
import { Markdown } from "../../ai/markdown";
import { LIMITS, type AiFail, type CritiqueOutput } from "../../ai/protocol";
import { ELEMENTS } from "../../ai/elements";
import { AiBox } from "../../components/AiLabel";
import { Device } from "../../components/ui";
import { artUrl } from "../../art";
import { scorePrompt } from "../../grading/promptScore";
import { presets } from "./presets";
import { ReportView } from "./PromptReport";
import "../../styles/ai.css";
import { AiError } from "./AiError";

type Pending = "critique" | "run" | null;
type RunOutputs = { weak?: string; strong?: string; model?: string };

export function PromptLab() {
  const [text, setText] = useState("");
  const [presetId, setPresetId] = useState(presets[0]!.id);
  const [pending, setPending] = useState<Pending>(null);
  const [critique, setCritique] = useState<{ data: CritiqueOutput; model: string } | null>(null);
  const [outputs, setOutputs] = useState<RunOutputs | null>(null);
  const [error, setError] = useState<AiFail | null>(null);

  const report = useMemo(() => scorePrompt(text), [text]);
  const preset = presets.find((p) => p.id === presetId)!;
  const enabled = aiEnabled();
  const tooLong = text.length > LIMITS.prompt;
  const busy = pending !== null;

  const askCritique = async () => {
    setPending("critique");
    setError(null);
    setCritique(null);
    const r = await askAi({
      kind: "critique",
      prompt: text,
      scenario: preset.scenario,
      local: report.results.map((x) => ({ element: x.id, present: x.present })),
    });
    setPending(null);
    if (r.ok && r.kind === "critique") setCritique({ data: r.data, model: r.model });
    else if (!r.ok) setError(r);
  };

  const runCompare = async () => {
    setPending("run");
    setError(null);
    setOutputs(null);
    // 两条指令依次发出，而不是同时发：对额度和限速都更温和
    const weak = await askAi({ kind: "run", prompt: preset.weak });
    if (!weak.ok) return void (setPending(null), setError(weak));
    const strong = await askAi({ kind: "run", prompt: preset.strong });
    setPending(null);
    if (!strong.ok) return void setError(strong);
    if (weak.kind === "run" && strong.kind === "run")
      setOutputs({ weak: weak.text, strong: strong.text, model: strong.model });
  };

  return (
    <>
      <Link to="/lab" className="backlink">← 实验台</Link>
      <header className="page-head">
        <h1>Prompt 训练场</h1>
        <p>写一条给 AI 的指令，先在本地检查六个要素，再决定要不要请 AI 点评。</p>
      </header>
      <img className="lesson-art" src={artUrl("lesson-c05-prompt-structure.png")} alt="" width={1600} height={900} />

      <Device title="我的指令">
        <label htmlFor="pl-text" className="pl-label">
          在这里写你的指令
        </label>
        <textarea
          id="pl-text"
          className="pl-text"
          rows={8}
          value={text}
          maxLength={LIMITS.prompt + 200}
          placeholder="例如：你是一位……请帮我……"
          onChange={(e) => {
            setText(e.target.value);
            setCritique(null);
          }}
        />
        <div className="row pl-meta">
          <span className={tooLong ? "pl-count over" : "pl-count"} aria-live="polite">
            {text.length} / {LIMITS.prompt} 字
          </span>
          <button type="button" className="btn ghost" onClick={() => setText(preset.weak)}>载入示例：差指令</button>
          <button type="button" className="btn ghost" onClick={() => setText(preset.strong)}>载入示例：好指令</button>
        </div>
        <div className="pl-scenario">
          <label htmlFor="pl-preset">示例场景</label>
          <select id="pl-preset" value={presetId} onChange={(e) => { setPresetId(e.target.value); setOutputs(null); }}>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <span className="pill">示例指令是我们写的</span>
        </div>
      </Device>

      <h2 className="section-title">本地检查</h2>
      <section className="panel" aria-label="本地检查结果">
        {text.trim() === "" ? (
          <p className="muted" style={{ margin: 0 }}>写点什么，或者载入一条示例，这里就会显示六个要素各自有没有写到。这一步完全在你的浏览器里完成，不联网。</p>
        ) : (
          <ReportView report={report} />
        )}
      </section>

      <h2 className="section-title">请 AI 帮忙</h2>
      {!enabled ? (
        <AiUnavailable />
      ) : (
        <section className="panel">
          <p className="muted">会把你的指令发给 AI 服务。每天有次数限制。请不要写入密码、真实姓名、住址等隐私信息。</p>
          <div className="row">
            <button type="button" className="btn" disabled={busy || text.trim() === "" || tooLong} onClick={askCritique}>
              {pending === "critique" ? "AI 正在看……" : "请 AI 点评我的指令"}
            </button>
            <button type="button" className="btn secondary" disabled={busy} onClick={runCompare}>
              {pending === "run" ? "AI 正在做两遍……" : "对比：差指令 vs 好指令的结果"}
            </button>
          </div>
          {error && <AiError error={error} />}
        </section>
      )}

      {critique && (
        <AiBox title="AI 点评" model={critique.model}>
          <p>{critique.data.summary}</p>
          {critique.data.strengths.length > 0 && (
            <>
              <h3>写得好的地方</h3>
              <ul>{critique.data.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {critique.data.fixes.length > 0 && (
            <>
              <h3>可以这样改</h3>
              <ul>
                {critique.data.fixes.map((f, i) => (
                  <li key={i}><strong>{ELEMENTS[f.element].name}：</strong>{f.advice}</li>
                ))}
              </ul>
            </>
          )}
          <h3>改写版本</h3>
          <pre className="pl-rewrite">{critique.data.rewrite}</pre>
          <button type="button" className="btn secondary" onClick={() => setText(critique.data.rewrite)}>用这个改写替换我的指令</button>
        </AiBox>
      )}

      {outputs && (
        <>
          <h2 className="section-title">同一件事，两条指令，两种结果</h2>
          <p className="muted">场景：{preset.scenario} 两条指令都是我们写的示例；下面的回答是 AI 实时生成的，每次运行都可能不一样。</p>
          <div className="pl-compare">
            <div>
              <h3>差指令</h3>
              <pre className="pl-prompt">{preset.weak}</pre>
              <AiBox title="AI 的回答" model={outputs.model}><Markdown text={outputs.weak ?? ""} /></AiBox>
            </div>
            <div>
              <h3>好指令</h3>
              <pre className="pl-prompt">{preset.strong}</pre>
              <AiBox title="AI 的回答" model={outputs.model}><Markdown text={outputs.strong ?? ""} /></AiBox>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function AiUnavailable() {
  return (
    <section className="panel">
      {aiArt.unavailable && <img className="empty-art" src={artUrl(aiArt.unavailable)} alt="" width={400} height={300} />}
      <h3>AI 功能还没有接上服务器</h3>
      <p className="muted" style={{ margin: 0 }}>
        点评和对比需要一个 AI 服务。现在这个版本还没有配置服务地址，所以这两个按钮不会出现，也不会拿预先写好的内容冒充 AI 的回答。上面的本地检查不受影响。
      </p>
    </section>
  );
}
