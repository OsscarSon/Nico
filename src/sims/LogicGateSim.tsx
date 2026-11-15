import { useEffect, useRef, useState } from "react";
import {
  allGates, evalGate, gateInfo, identifyFeedback, inputRows, rowKey, truthTable,
  type Bit, type GateId,
} from "../grading/gates";
import { Feedback } from "../components/ui";
import { GateSymbol } from "./GateSymbol";

type Props = { mode: "free" | "challenge"; gates?: GateId[]; onSolved?: () => void };

export function InputSwitch({ label, value, onToggle }: { label: string; value: Bit; onToggle: () => void }) {
  return (
    <div className="gate-input">
      <span className="pv">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value === 1}
        aria-label={`输入 ${label}，当前 ${value}`}
        className="switch"
        onClick={onToggle}
      >
        <span className="knob" />
      </button>
      <span className="digit" aria-hidden="true">{value}</span>
    </div>
  );
}

export function LogicGateSim({ mode, gates = [], onSolved }: Props) {
  const challenge = mode === "challenge";
  const [freeGate, setFreeGate] = useState<GateId>("and");
  const [idx, setIdx] = useState(0);
  const [inputs, setInputs] = useState<[Bit, Bit]>([0, 0]);
  const [observed, setObserved] = useState<string[]>([]);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [solvedCurrent, setSolvedCurrent] = useState(false);
  const fired = useRef(false);

  const allSolved = challenge && idx >= gates.length;
  const gate: GateId = challenge ? (gates[idx] ?? "and") : freeGate;
  const arity = gateInfo[gate].arity;
  const [a, b] = inputs;
  const out = evalGate(gate, a, b);
  const curKey = rowKey(arity === 1 ? [a] : [a, b]);

  useEffect(() => {
    if (allSolved && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [allSolved, onSolved]);

  // 挑战里：当前输入组合一旦出现，就记为"已观察到"
  useEffect(() => {
    if (challenge && !allSolved) setObserved((o) => (o.includes(curKey) ? o : [...o, curKey]));
  }, [challenge, allSolved, curKey, idx]);

  const toggle = (which: 0 | 1) => {
    setResult(null);
    setInputs((cur) => (which === 0 ? [cur[0] === 1 ? 0 : 1, cur[1]] : [cur[0], cur[1] === 1 ? 0 : 1]));
  };
  const rows = inputRows(gate);
  const allSeen = rows.every((r) => observed.includes(rowKey(r)));

  const guess = (g: GateId) => {
    const r = identifyFeedback(gate, g, observed);
    setResult(r);
    if (r.ok) setSolvedCurrent(true);
  };
  const nextGate = () => {
    setIdx((i) => i + 1);
    setInputs([0, 0]);
    setObserved([]);
    setResult(null);
    setSolvedCurrent(false);
  };

  if (allSolved) return <Feedback ok>三个神秘门全部猜对了。你已经会读真值表了。</Feedback>;

  return (
    <div>
      {challenge ? (
        <p className="target">神秘门 {idx + 1} / {gates.length}</p>
      ) : (
        <div className="gate-picker" role="group" aria-label="选择逻辑门">
          {allGates.map((g) => (
            <button
              key={g}
              type="button"
              className={`btn ${g === freeGate ? "" : "secondary"}`}
              aria-pressed={g === freeGate}
              onClick={() => { setFreeGate(g); setResult(null); }}
            >
              {gateInfo[g].name}
            </button>
          ))}
        </div>
      )}

      <div className="gate-stage">
        <div className="gate-inputs">
          <InputSwitch label="A" value={a} onToggle={() => toggle(0)} />
          {arity === 2 && <InputSwitch label="B" value={b} onToggle={() => toggle(1)} />}
        </div>
        {challenge ? (
          <div className="gate-box" aria-label="神秘门">?</div>
        ) : (
          <GateSymbol gate={gate} a={a} b={arity === 2 ? b : undefined} out={out} />
        )}
        <div className="gate-out" aria-live="polite">
          <span className="pv">输出</span>
          <span className={`lamp ${out ? "on" : ""}`} aria-hidden="true" />
          <span className="digit">{out}</span>
        </div>
      </div>

      {!challenge && <p className="muted">{gateInfo[gate].name}：{gateInfo[gate].rule}</p>}

      <table className="truth">
        <caption className="sr-only">{challenge ? "神秘门的真值表（试过的行才会显示输出）" : `${gateInfo[gate].name} 的真值表`}</caption>
        <thead>
          <tr>
            <th scope="col">A</th>
            {arity === 2 && <th scope="col">B</th>}
            <th scope="col">输出</th>
            <th scope="col"><span className="sr-only">当前行</span></th>
          </tr>
        </thead>
        <tbody>
          {truthTable(gate).map((r) => {
            const k = rowKey(r.inputs);
            const current = k === curKey;
            const known = !challenge || observed.includes(k);
            return (
              <tr key={k} className={current ? "current" : ""} aria-current={current ? "true" : undefined}>
                <td>{r.inputs[0]}</td>
                {arity === 2 && <td>{r.inputs[1]}</td>}
                <td>{known ? r.out : "?"}</td>
                <td aria-hidden="true">{current ? "◀ 现在" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {challenge && (
        <>
          {!allSeen && <p className="muted">还有输入没试过。把每一种输入都拨一遍，表格才能全部揭开。</p>}
          <div className="gate-picker" role="group" aria-label="猜这是哪个门">
            {allGates.map((g) => (
              <button
                key={g}
                type="button"
                className="btn secondary"
                disabled={!allSeen || solvedCurrent}
                onClick={() => guess(g)}
              >
                {gateInfo[g].name}
              </button>
            ))}
          </div>
          {result && <Feedback ok={result.ok}>{result.message}</Feedback>}
          {solvedCurrent && (
            <div className="row" style={{ marginTop: "var(--s3)" }}>
              <button type="button" className="btn" onClick={nextGate}>
                {idx + 1 < gates.length ? "下一个神秘门" : "完成"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
