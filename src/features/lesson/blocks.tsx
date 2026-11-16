import { useState } from "react";
import type { Block, QuizItem } from "../../content/schema";
import { Callout, Device, Feedback, RichText } from "../../components/ui";
import { BitSwitches } from "../../sims/BitSwitches";
import { LogicGateSim } from "../../sims/LogicGateSim";
import { HalfAdderSim } from "../../sims/HalfAdderSim";
import { MiniCpuSim } from "../../sims/MiniCpuSim";
import { LayersSim } from "../../sims/LayersSim";
import { SubnetSim } from "../../sims/SubnetSim";
import { DnsSim } from "../../sims/DnsSim";
import { PythonSim } from "../../sims/code/PythonSim";
import { WebSim } from "../../sims/code/WebSim";
import { JsSim } from "../../sims/code/JsSim";
import { GitSim } from "../../sims/GitSim";
import { gradeChoice, gradeNumber, REVEAL_AFTER_WRONG } from "../../grading/quiz";

export type QuizStats = { firstTryCorrect: number; total: number };

type Common = { onDone: () => void };

export function HookBlock({ text }: { text: string }) {
  return <p className="hook">{text}</p>;
}

export function ExplainBlock({
  block,
}: {
  block: Extract<Block, { type: "explain" }>;
}) {
  return (
    <div className="explain">
      <h2>{block.title}</h2>
      {block.body.map((p, i) => (
        <p key={i}>
          <RichText text={p} />
        </p>
      ))}
      {block.callout && <Callout>{block.callout}</Callout>}
    </div>
  );
}

/** 电路类互动是模拟；Python 是浏览器里的真解释器，不能标"模拟"。 */
const simLabel = (sim: Extract<Block, { type: "sim" }>["sim"]) =>
  sim === "python" ? "真实 Python" : sim === "js" ? "真实 JavaScript" : sim === "web" ? "实时预览" : "模拟";

export function SimBlock({
  block,
  onDone,
}: { block: Extract<Block, { type: "sim" }> } & Common) {
  return (
    <div>
      <p>{block.intro}</p>
      <Device title={block.title} label={simLabel(block.sim)}>
        {block.sim === "python" && block.code ? (
          <PythonSim mode={block.mode} spec={block.code} onSolved={onDone} />
        ) : block.sim === "js" && block.code ? (
          <JsSim mode={block.mode} spec={block.code} onSolved={onDone} />
        ) : block.sim === "git" && block.git ? (
          <GitSim mode={block.mode} spec={block.git} onSolved={onDone} />
        ) : block.sim === "web" && block.code ? (
          <WebSim mode={block.mode} spec={block.code} onSolved={onDone} />
        ) : block.sim === "logic-gate" ? (
          <LogicGateSim mode={block.mode} gates={block.gates} onSolved={onDone} />
        ) : block.sim === "half-adder" ? (
          <HalfAdderSim mode={block.mode} onSolved={onDone} />
        ) : block.sim === "mini-cpu" ? (
          <MiniCpuSim mode={block.mode} onSolved={onDone} />
        ) : block.sim === "layers" ? (
          <LayersSim mode={block.mode} onSolved={onDone} />
        ) : block.sim === "subnet" ? (
          <SubnetSim mode={block.mode} onSolved={onDone} />
        ) : block.sim === "dns" ? (
          <DnsSim mode={block.mode} onSolved={onDone} />
        ) : (
          <BitSwitches mode={block.mode} targets={block.targets} onSolved={onDone} />
        )}
      </Device>
      {block.mode === "free" && (
        <p className="muted">这是自由练习，准备好了就进入下一步。</p>
      )}
    </div>
  );
}

/** 一组选择题：点选项即判分；错误选项显示针对该误解的提示。 */
export function QuizBlock({
  items,
  onDone,
  onStats,
}: { items: QuizItem[]; onStats: (s: QuizStats) => void } & Common) {
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [right, setRight] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const item = items[idx];
  if (!item) return null;
  const solved = right !== null;
  const canReveal = !solved && wrong.length >= REVEAL_AFTER_WRONG;

  const choose = (i: number) => {
    if (solved || wrong.includes(i)) return;
    const r = gradeChoice(item, i);
    setMessage(r.message);
    if (r.correct) {
      setRight(i);
      if (wrong.length === 0) setFirstTry((n) => n + 1);
    } else setWrong((w) => [...w, i]);
  };
  const reveal = () => {
    setRight(item.answer);
    setMessage(item.why);
  };
  const advance = () => {
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setWrong([]);
      setRight(null);
      setMessage(null);
    } else {
      setFinished(true);
      onStats({ firstTryCorrect: firstTry, total: items.length });
      onDone();
    }
  };

  if (finished)
    return (
      <Feedback ok>
        检查完成：第一次就答对 {firstTry} / {items.length} 题。可以进入下一步。
      </Feedback>
    );

  return (
    <div>
      <p className="qmeta">
        第 {idx + 1} / {items.length} 题
      </p>
      <h2 style={{ fontSize: "1.25rem" }}>{item.q}</h2>
      <div className="options" role="group" aria-label="选项">
        {item.options.map((o, i) => {
          const state = right === i ? "right" : wrong.includes(i) ? "wrong" : "idle";
          return (
            <button
              key={i}
              type="button"
              className="option"
              data-state={state}
              disabled={solved || wrong.includes(i)}
              aria-label={`${o}${state === "wrong" ? "（已排除）" : state === "right" ? "（正确答案）" : ""}`}
              onClick={() => choose(i)}
            >
              {o}
            </button>
          );
        })}
      </div>
      {message && <Feedback ok={solved}>{message}</Feedback>}
      <div className="row" style={{ marginTop: "var(--s4)" }}>
        {canReveal && (
          <button type="button" className="btn ghost" onClick={reveal}>
            看答案
          </button>
        )}
        {solved && (
          <button type="button" className="btn" onClick={advance}>
            {idx + 1 < items.length ? "下一题" : "完成检查"}
          </button>
        )}
      </div>
    </div>
  );
}

export function TransferBlock({
  block,
  onDone,
  onStats,
}: { block: Extract<Block, { type: "transfer" }>; onStats: (s: QuizStats) => void } & Common) {
  const [value, setValue] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "invalid" | "wrong" | "right">("idle");
  const [revealed, setRevealed] = useState(false);

  const finish = (firstTry: boolean) => {
    onStats({ firstTryCorrect: firstTry ? 1 : 0, total: 1 });
    onDone();
  };
  const submit = () => {
    if (status === "right") return;
    const r = gradeNumber(block.answer, value);
    if (!r.valid) return setStatus("invalid");
    if (r.correct) {
      setStatus("right");
      finish(wrongCount === 0);
    } else {
      setStatus("wrong");
      setWrongCount((n) => n + 1);
    }
  };
  const reveal = () => {
    setRevealed(true);
    setStatus("right");
    finish(false);
  };
  const done = status === "right";

  return (
    <div>
      <h2>换个场景试试</h2>
      <p>{block.prompt}</p>
      <div className="numfield">
        <input
          type="text"
          inputMode="numeric"
          aria-label="你的答案（一个整数）"
          value={value}
          disabled={done}
          onChange={(e) => {
            setValue(e.target.value);
            if (status === "invalid") setStatus("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button type="button" className="btn" onClick={submit} disabled={done}>
          检查答案
        </button>
      </div>
      {status === "invalid" && <Feedback ok={false}>请输入一个整数，只写数字。</Feedback>}
      {status === "wrong" && (
        <Feedback ok={false}>
          还不对。{block.hint ?? "再想一想。"}
        </Feedback>
      )}
      {done && (
        <Feedback ok>
          {revealed ? `答案是 ${block.answer}。` : "答对了。"}
          {block.why}
        </Feedback>
      )}
      {!done && wrongCount >= REVEAL_AFTER_WRONG && (
        <div className="row" style={{ marginTop: "var(--s3)" }}>
          <button type="button" className="btn ghost" onClick={reveal}>
            看答案
          </button>
        </div>
      )}
    </div>
  );
}

export function SummaryBlock({
  block,
}: {
  block: Extract<Block, { type: "summary" }>;
}) {
  return (
    <div>
      <h2>这节课你带走了三件事</h2>
      <ul className="points">
        {block.points.map((p, i) => (
          <li key={i}>
            <RichText text={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}
