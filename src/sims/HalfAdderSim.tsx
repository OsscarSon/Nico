import { useEffect, useRef, useState } from "react";
import {
  adderGates, asBinary, circuitOutput, runTests, testFeedback, type AdderGate, type CaseResult,
} from "../grading/adder";
import { gateInfo, type Bit } from "../grading/gates";
import { Feedback } from "../components/ui";
import { GateSymbol } from "./GateSymbol";
import { InputSwitch } from "./LogicGateSim";

type Props = { mode: "free" | "challenge"; onSolved?: () => void };

function GatePicker({
  label, value, onChange,
}: { label: string; value: AdderGate; onChange: (g: AdderGate) => void }) {
  return (
    <div className="gate-picker" role="group" aria-label={`${label}用哪个门`}>
      {adderGates.map((g) => (
        <button
          key={g}
          type="button"
          className={`btn ${g === value ? "" : "secondary"}`}
          aria-pressed={g === value}
          onClick={() => onChange(g)}
        >
          {gateInfo[g].name}
        </button>
      ))}
    </div>
  );
}

export function HalfAdderSim({ mode, onSolved }: Props) {
  const challenge = mode === "challenge";
  const [a, setA] = useState<Bit>(0);
  const [b, setB] = useState<Bit>(0);
  // 自由练习固定是 XOR + AND；挑战里从两个都不对的 OR 开始，让学习者自己选
  const [sumGate, setSumGate] = useState<AdderGate>(challenge ? "or" : "xor");
  const [carryGate, setCarryGate] = useState<AdderGate>(challenge ? "or" : "and");
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const fired = useRef(false);

  const out = circuitOutput(sumGate, carryGate, a, b);
  const feedback = results ? testFeedback(results) : null;
  const solved = feedback?.ok === true;

  useEffect(() => {
    if (solved && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [solved, onSolved]);

  const pick = (which: "sum" | "carry", g: AdderGate) => {
    setResults(null);
    if (which === "sum") setSumGate(g);
    else setCarryGate(g);
  };

  return (
    <div>
      <div className="adder-inputs">
        <InputSwitch label="A" value={a} onToggle={() => setA(a === 1 ? 0 : 1)} />
        <InputSwitch label="B" value={b} onToggle={() => setB(b === 1 ? 0 : 1)} />
        <p className="adder-equation mono" aria-live="polite">
          {a} + {b} = {asBinary(out)}
          <span className="muted">（进位 {out.carry}，和 {out.sum}）</span>
        </p>
      </div>

      <div className="adder-row">
        <h4>和（Sum）</h4>
        {challenge ? (
          <GatePicker label="和" value={sumGate} onChange={(g) => pick("sum", g)} />
        ) : (
          <p className="muted">固定用 {gateInfo[sumGate].name}</p>
        )}
        <GateSymbol gate={sumGate} a={a} b={b} out={out.sum} />
      </div>
      <div className="adder-row">
        <h4>进位（Carry）</h4>
        {challenge ? (
          <GatePicker label="进位" value={carryGate} onChange={(g) => pick("carry", g)} />
        ) : (
          <p className="muted">固定用 {gateInfo[carryGate].name}</p>
        )}
        <GateSymbol gate={carryGate} a={a} b={b} out={out.carry} />
      </div>

      {challenge && (
        <>
          <div className="row" style={{ marginTop: "var(--s3)" }}>
            <button type="button" className="btn" onClick={() => setResults(runTests(sumGate, carryGate))}>
              测试电路
            </button>
          </div>
          {results && (
            <table className="truth results" aria-label="电路测试结果">
              <thead>
                <tr>
                  <th scope="col">A + B</th>
                  <th scope="col">应该是</th>
                  <th scope="col">你的电路</th>
                  <th scope="col">结果</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={`${r.a}${r.b}`}>
                    <td>{r.a} + {r.b}</td>
                    <td>{asBinary(r.expected)}</td>
                    <td>{asBinary(r.actual)}</td>
                    <td className={r.pass ? "pass" : "fail"}>{r.pass ? "✓ 通过" : "✗ 不对"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {feedback && <Feedback ok={feedback.ok}>{feedback.message}</Feedback>}
        </>
      )}
    </div>
  );
}
