import type { GateId } from "../grading/gates";

/** 逻辑门符号：线条颜色表示当前信号（琥珀=1，灰=0），数值另用文字标出，不只靠颜色。 */
export function GateSymbol({
  gate,
  a,
  b,
  out,
}: {
  gate: GateId;
  a: 0 | 1;
  b?: 0 | 1;
  out: 0 | 1;
}) {
  const col = (v: 0 | 1) => (v ? "#ffb020" : "#8c97a8");
  const body: Record<GateId, string> = {
    and: "M30 12 H62 A28 28 0 0 1 62 68 H30 Z",
    or: "M30 12 Q66 12 98 40 Q66 68 30 68 Q48 40 30 12 Z",
    xor: "M38 12 Q74 12 104 40 Q74 68 38 68 Q56 40 38 12 Z",
    not: "M30 12 L86 40 L30 68 Z",
  };
  const two = gate !== "not";
  const outX = gate === "not" ? 98 : gate === "xor" ? 104 : 98;
  return (
    <svg viewBox="0 0 160 80" className="gate-symbol" role="img" aria-label={`${gate.toUpperCase()} 门符号`}>
      <path d={body[gate]} fill="#fff" stroke="#14213d" strokeWidth="2.5" strokeLinejoin="round" />
      {gate === "xor" && <path d="M26 12 Q44 40 26 68" fill="none" stroke="#14213d" strokeWidth="2.5" />}
      {gate === "not" && <circle cx="91" cy="40" r="5" fill="#fff" stroke="#14213d" strokeWidth="2.5" />}
      {/* 输入线 */}
      {two ? (
        <>
          <line x1="2" y1="26" x2={gate === "xor" ? 36 : 32} y2="26" stroke={col(a)} strokeWidth="4" strokeLinecap="round" />
          <line x1="2" y1="54" x2={gate === "xor" ? 36 : 32} y2="54" stroke={col(b ?? 0)} strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <line x1="2" y1="40" x2="30" y2="40" stroke={col(a)} strokeWidth="4" strokeLinecap="round" />
      )}
      {/* 输出线 */}
      <line x1={gate === "not" ? 96 : outX} y1="40" x2="136" y2="40" stroke={col(out)} strokeWidth="4" strokeLinecap="round" />
      <circle cx="146" cy="40" r="9" fill={out ? "#ffb020" : "#f2f4f7"} stroke="#14213d" strokeWidth="2.5" />
    </svg>
  );
}
