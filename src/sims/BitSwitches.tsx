import { useEffect, useRef, useState } from "react";
import {
  bitsToNumber,
  challengeFeedback,
  onSwitches,
  placeValues,
  toBinaryString,
} from "../grading/binary";
import { Feedback } from "../components/ui";

type Props = {
  width?: number;
  mode: "free" | "challenge";
  targets?: number[];
  onSolved?: () => void;
};

export function BitSwitches({ width = 8, mode, targets = [], onSolved }: Props) {
  const [bits, setBits] = useState<boolean[]>(() => Array(width).fill(false));
  const [targetIdx, setTargetIdx] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const solvedFired = useRef(false);

  const pv = placeValues(width);
  const value = bitsToNumber(bits);
  const on = onSwitches(bits);
  const allSolved = mode === "challenge" && targetIdx >= targets.length;

  useEffect(() => {
    if (allSolved && !solvedFired.current) {
      solvedFired.current = true;
      onSolved?.();
    }
  }, [allSolved, onSolved]);

  const toggle = (i: number) => {
    setResult(null);
    setBits((b) => b.map((x, j) => (j === i ? !x : x)));
  };
  const reset = () => {
    setResult(null);
    setBits(Array(width).fill(false));
  };
  const check = () => {
    const target = targets[targetIdx];
    if (target === undefined) return;
    setResult(challengeFeedback(bits, target));
  };
  const next = () => {
    setResult(null);
    setBits(Array(width).fill(false));
    setTargetIdx((i) => i + 1);
  };

  const expression = on.length ? `${on.join(" + ")} = ${value}` : "没有开着的开关 = 0";

  return (
    <div>
      {mode === "challenge" && !allSolved && (
        <p className="target">
          目标 {targetIdx + 1} / {targets.length}：拨出 <span className="mono">{targets[targetIdx]}</span>
        </p>
      )}
      {allSolved ? (
        <Feedback ok>三个目标全部完成。你已经会读二进制了。</Feedback>
      ) : (
        <>
          <div className="bits" role="group" aria-label={`${width} 个开关，从左到右分量依次为 ${pv.join("、")}`}>
            {bits.map((isOn, i) => (
              <div className="bitcol" key={i}>
                <span className="pv">{pv[i]}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={`分量 ${pv[i]}，当前${isOn ? "开" : "关"}`}
                  className="switch"
                  onClick={() => toggle(i)}
                >
                  <span className="knob" />
                </button>
                <span className="digit" aria-hidden="true">{isOn ? 1 : 0}</span>
              </div>
            ))}
          </div>
          <div className="readout" aria-live="polite">
            <span>二进制 {toBinaryString(bits)}</span>
            <span className="big">{value}</span>
            <span className="muted">{expression}</span>
          </div>
          <div className="row" style={{ marginTop: "var(--s4)" }}>
            {mode === "challenge" && (
              <button type="button" className="btn" onClick={check} disabled={result?.ok === true}>
                检查
              </button>
            )}
            <button type="button" className="btn ghost" onClick={reset}>
              全部归零
            </button>
            {result?.ok && (
              <button type="button" className="btn secondary" onClick={next}>
                {targetIdx + 1 < targets.length ? "下一个目标" : "完成"}
              </button>
            )}
          </div>
          {result && <Feedback ok={result.ok}>{result.message}</Feedback>}
        </>
      )}
    </div>
  );
}
