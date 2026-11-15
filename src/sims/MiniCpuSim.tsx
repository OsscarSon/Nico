import { useEffect, useRef, useState } from "react";
import {
  answerFor, cellText, challengePrograms, freeProgram, initMachine, instrText, phaseName,
  RESULT_CELL, step, traceSummary, type Machine,
} from "../grading/cpu";
import { gradeNumber, REVEAL_AFTER_WRONG } from "../grading/quiz";
import { Feedback } from "../components/ui";

type Props = { mode: "free" | "challenge"; onSolved?: () => void };

function Registers({ m }: { m: Machine }) {
  const regs: [string, string, string][] = [
    ["PC", String(m.pc), "下一条指令在第几格"],
    ["IR", m.ir ? instrText(m.ir) : "空", "当前指令"],
    ["ACC", String(m.acc), "计算的中间结果"],
  ];
  return (
    <div className="cpu-regs">
      {regs.map(([name, val, hint]) => (
        <div className="cpu-reg" key={name} data-reg={name}>
          <span className="cpu-reg-name">{name}</span>
          <span className="cpu-reg-val mono">{val}</span>
          <span className="cpu-reg-hint">{hint}</span>
        </div>
      ))}
    </div>
  );
}

function Memory({ m }: { m: Machine }) {
  const { fetched, read, write } = m.highlight;
  return (
    <ul className="cpu-mem" aria-label="内存，共 10 格">
      {m.mem.map((c, i) => {
        const tags: string[] = [];
        if (!m.halted && i === m.pc) tags.push("PC");
        if (i === fetched) tags.push("刚取出");
        if (i === read) tags.push("被读");
        if (i === write) tags.push("被写");
        return (
          <li
            key={i}
            className={`cpu-cell ${c.kind} ${tags.length ? "hot" : ""} ${i === write ? "wrote" : ""}`}
            aria-label={`第 ${i} 格，${c.kind === "instr" ? "指令" : "数据"} ${cellText(c)}${tags.length ? "，" + tags.join("、") : ""}`}
          >
            <span className="cpu-addr">{i}</span>
            <span className="cpu-content mono">{cellText(c)}</span>
            <span className="cpu-tag">{tags.join(" ")}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Stepper({ m, onStep, onReset }: { m: Machine; onStep: () => void; onReset: () => void }) {
  return (
    <div>
      <Registers m={m} />
      <Memory m={m} />
      <p className="cpu-note" aria-live="polite">{m.note}</p>
      <div className="row">
        <button type="button" className="btn" onClick={onStep} disabled={m.halted}>
          下一步：{phaseName[m.phase]}
        </button>
        <button type="button" className="btn ghost" onClick={onReset}>重置</button>
        <span className="muted cpu-steps">已走 {m.steps} 步{m.halted && !m.error ? "，程序已停止" : ""}</span>
      </div>
    </div>
  );
}

function Free() {
  const [m, setM] = useState(() => initMachine(freeProgram()));
  return <Stepper m={m} onStep={() => setM(step(m))} onReset={() => setM(initMachine(freeProgram()))} />;
}

function Challenge({ onSolved }: { onSolved?: () => void }) {
  const [idx, setIdx] = useState(0);
  const prog = challengePrograms[idx];
  const [m, setM] = useState(() => initMachine((challengePrograms[0] as (typeof challengePrograms)[number]).mem));
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(0);
  const [status, setStatus] = useState<"idle" | "invalid" | "wrong" | "right">("idle");
  const [revealed, setRevealed] = useState(false);
  const fired = useRef(false);
  const allDone = idx >= challengePrograms.length;

  useEffect(() => {
    if (allDone && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [allDone, onSolved]);

  if (allDone || !prog) return <Feedback ok>三个程序都预测对了。你已经会像 CPU 一样一步一步跟着走了。</Feedback>;

  const answer = answerFor(prog);
  const submit = () => {
    if (status === "right") return;
    const r = gradeNumber(answer, value);
    if (!r.valid) return setStatus("invalid");
    if (r.correct) setStatus("right");
    else {
      setStatus("wrong");
      setWrong((n) => n + 1);
    }
  };
  const next = () => {
    const n = idx + 1;
    setIdx(n);
    const p = challengePrograms[n];
    if (p) setM(initMachine(p.mem));
    setValue(""); setWrong(0); setStatus("idle"); setRevealed(false);
  };
  const done = status === "right";

  return (
    <div>
      <p className="target">{prog.title} / {challengePrograms.length}：停下来之后，第 {RESULT_CELL} 格是多少？</p>
      <Stepper m={m} onStep={() => setM(step(m))} onReset={() => setM(initMachine(prog.mem))} />
      <div className="numfield" style={{ marginTop: "var(--s4)" }}>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`你的预测：第 ${RESULT_CELL} 格最后是多少（一个整数）`}
          value={value}
          disabled={done}
          onChange={(e) => { setValue(e.target.value); if (status === "invalid") setStatus("idle"); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button type="button" className="btn" onClick={submit} disabled={done}>检查预测</button>
      </div>
      {status === "invalid" && <Feedback ok={false}>请输入一个整数，只写数字。</Feedback>}
      {status === "wrong" && (
        <Feedback ok={false}>
          还不对。一条一条跟着 ACC 和内存走，每条指令之后，哪个数变了？可以用上面的单步运行核对。
        </Feedback>
      )}
      {done && (
        <Feedback ok>
          {revealed ? `答案是 ${answer}。` : "对了。"}
          {traceSummary(prog.mem).join("；")}。
        </Feedback>
      )}
      {!done && wrong >= REVEAL_AFTER_WRONG && (
        <div className="row" style={{ marginTop: "var(--s3)" }}>
          <button type="button" className="btn ghost" onClick={() => { setRevealed(true); setStatus("right"); }}>看答案</button>
        </div>
      )}
      {done && (
        <div className="row" style={{ marginTop: "var(--s3)" }}>
          <button type="button" className="btn" onClick={next}>
            {idx + 1 < challengePrograms.length ? "下一个程序" : "完成"}
          </button>
        </div>
      )}
    </div>
  );
}

export function MiniCpuSim({ mode, onSolved }: Props) {
  return mode === "free" ? <Free /> : <Challenge onSolved={onSolved} />;
}
