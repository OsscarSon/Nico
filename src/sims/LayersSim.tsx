import { useEffect, useRef, useState } from "react";
import {
  HEADER_BYTES, HEADER_TEXT, DATA_BYTES, demoStates, gradeLayer, layerName, layerTasks, layers,
  type LayerId,
} from "../grading/layers";
import { Feedback } from "../components/ui";

type Props = { mode: "free" | "challenge"; onSolved?: () => void };

/** 一层包一层：frames 从外到内。 */
function Nested({ frames }: { frames: LayerId[] }) {
  const [outer, ...inner] = frames;
  if (!outer) return null;
  if (outer === "app")
    return (
      <div className="frame f-app">
        <strong>应用数据</strong>
        <span className="mono">{DATA_BYTES} 字节</span>
      </div>
    );
  return (
    <div className={`frame f-${outer}`}>
      <div className="frame-head">
        <strong>{layerName(outer)}的头</strong>
        <span className="mono">{HEADER_BYTES[outer as Exclude<LayerId, "app">]} 字节</span>
        <span className="frame-text">{HEADER_TEXT[outer as Exclude<LayerId, "app">]}</span>
      </div>
      <Nested frames={inner} />
    </div>
  );
}

function Free() {
  const [i, setI] = useState(0);
  const s = demoStates[i] as (typeof demoStates)[number];
  return (
    <div>
      <p className="muted" style={{ margin: "0 0 var(--s2)" }}>
        {s.sending ? "发送方：从上往下，一层一层加头" : "接收方：从下往上，一层一层拆头"}
      </p>
      <div className="frames" role="img" aria-label={`当前包着的层，从外到内：${s.frames.map(layerName).join("、")}，共 ${s.bytes} 字节`}>
        <Nested frames={s.frames} />
      </div>
      <p className="cpu-note" aria-live="polite">{s.caption}</p>
      <p className="mono frames-total">现在一共 {s.bytes} 字节</p>
      <div className="row">
        <button type="button" className="btn ghost" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>上一阶段</button>
        <button type="button" className="btn" onClick={() => setI(Math.min(demoStates.length - 1, i + 1))} disabled={i === demoStates.length - 1}>
          下一阶段
        </button>
        <button type="button" className="btn ghost" onClick={() => setI(0)}>重来</button>
        <span className="muted">第 {i + 1} / {demoStates.length} 步</span>
      </div>
    </div>
  );
}

function Challenge({ onSolved }: { onSolved?: () => void }) {
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<LayerId[]>([]);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const fired = useRef(false);
  const task = layerTasks[idx];
  const all = idx >= layerTasks.length;

  useEffect(() => {
    if (all && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [all, onSolved]);

  if (all || !task) return <Feedback ok>五件事都分对了层。你已经懂了\u201C一层只管一件事\u201D。</Feedback>;

  const choose = (id: LayerId) => {
    if (done || wrong.includes(id)) return;
    const r = gradeLayer(task, id);
    setMsg(r);
    if (r.ok) setDone(true);
    else setWrong((w) => [...w, id]);
  };
  const next = () => {
    setIdx(idx + 1); setWrong([]); setDone(false); setMsg(null);
  };

  return (
    <div>
      <p className="qmeta">第 {idx + 1} / {layerTasks.length} 件</p>
      <h4 style={{ margin: "0 0 var(--s3)", fontSize: "1.0625rem" }}>{task.text}</h4>
      <div className="options" role="group" aria-label="这是哪一层的工作">
        {layers.map((l) => (
          <button
            key={l.id}
            type="button"
            className="option"
            data-state={done && l.id === task.answer ? "right" : wrong.includes(l.id) ? "wrong" : "idle"}
            disabled={done || wrong.includes(l.id)}
            aria-label={`${l.name}${wrong.includes(l.id) ? "（已排除）" : done && l.id === task.answer ? "（正确答案）" : ""}`}
            onClick={() => choose(l.id)}
          >
            {l.name}
            <span className="option-sub"> · {l.examples}</span>
          </button>
        ))}
      </div>
      {msg && <Feedback ok={msg.ok}>{msg.message}</Feedback>}
      {done && (
        <div className="row" style={{ marginTop: "var(--s3)" }}>
          <button type="button" className="btn" onClick={next}>{idx + 1 < layerTasks.length ? "下一件" : "完成"}</button>
        </div>
      )}
    </div>
  );
}

export function LayersSim({ mode, onSolved }: Props) {
  return mode === "free" ? <Free /> : <Challenge onSolved={onSolved} />;
}
