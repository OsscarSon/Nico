/** Numbered application message chunks, NOT IP fragments or TCP segments. Unicode code points, NOT bytes. */
export type Chunk = { seq: number; content: string };
export type Assembly = { ok: boolean; message: string; text: string | null };
export type ReassemblyState = { original: string; chunks: Chunk[]; wire: Chunk[]; received: Chunk[]; lost: Chunk[]; arrivals: number[]; lostSeq: number[]; recoveredSeq: number[]; sawMissing: boolean; result: Assembly | null; seed: number };
export function shuffleChunks(chunks: Chunk[], seed: number): Chunk[] {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error("种子须为 0 到 4294967295 的整数。");
  let x = (seed >>> 0) || 0x9e3779b9;
  const out = chunks.map(c => ({ ...c }));
  for (let i = out.length - 1; i > 0; i--) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    const j = (x >>> 0) % (i + 1); [out[i], out[j]] = [out[j]!, out[i]!];
  }
  if (out.length > 1 && out.every((c, i) => c.seq === chunks[i]?.seq)) out.push(out.shift()!);
  return out;
}
export function initialReassembly(message = "今晚七点在图书馆见面", size = 3, seed = 17): ReassemblyState {
  const chars = Array.from(message);
  if (!chars.length || chars.length > 36 || !message.trim()) throw Error("请输入 1–36 个 Unicode 码点的非空消息。");
  if (!Number.isInteger(size) || size < 2 || size > 8) throw Error("每块字符数须为 2–8 的整数。");
  const chunks: Chunk[] = [];
  for (let i = 0; i < chars.length; i += size) chunks.push({ seq: chunks.length + 1, content: chars.slice(i, i + size).join("") });
  return { original: message, chunks, wire: shuffleChunks(chunks, seed), received: [], lost: [], arrivals: [], lostSeq: [], recoveredSeq: [], sawMissing: false, result: null, seed };
}
export function deliverChunk(s: ReassemblyState, drop = false): ReassemblyState {
  const [c, ...wire] = s.wire;
  if (!c) return s;
  if (drop) return { ...s, wire, lost: [...s.lost, c], lostSeq: [...new Set([...s.lostSeq, c.seq])], result: null };
  return { ...s, wire, received: s.received.some(p => p.seq === c.seq) ? s.received : [...s.received, c], arrivals: [...s.arrivals, c.seq], recoveredSeq: s.lostSeq.includes(c.seq) ? [...new Set([...s.recoveredSeq, c.seq])] : s.recoveredSeq, result: null };
}
export function resendChunk(s: ReassemblyState, seq: number): ReassemblyState {
  const c = s.lost.find(c => c.seq === seq);
  return c ? { ...s, wire: [...s.wire, c], lost: s.lost.filter(c => c.seq !== seq), result: null } : s;
}
export function moveChunk(s: ReassemblyState, index: number, delta: -1 | 1): ReassemblyState {
  if (!Number.isInteger(index) || index < 0 || index >= s.received.length || index + delta < 0 || index + delta >= s.received.length) return s;
  const received = [...s.received]; [received[index], received[index + delta]] = [received[index + delta]!, received[index]!];
  return { ...s, received, result: null };
}
export function inspectAssembly(s: ReassemblyState): Assembly {
  const seqs = new Set(s.received.map(c => c.seq));
  const missing = s.chunks.filter(c => !seqs.has(c.seq));
  if (missing.length) return { ok: false, text: null, message: `无法完整重组：缺少 #${missing.map(c => c.seq).join("、#")}。请等待或重发缺块，不猜测内容。` };
  if (seqs.size !== s.received.length || s.received.length !== s.chunks.length) return { ok: false, text: null, message: "编号重复或数量不符，不能完整重组。" };
  if (s.received.some((c, i) => c.seq !== i + 1)) return { ok: false, text: null, message: "片段齐了，但顺序不对。按编号用上移/下移排列，再尝试重组。" };
  if (s.received.some((c, i) => c.content !== s.chunks[i]?.content)) return { ok: false, text: null, message: "片段内容与发送内容不符，不能输出正确原文。" };
  return { ok: true, text: s.received.map(c => c.content).join(""), message: "编号连续、内容完整，已由收到的片段恢复消息。" };
}
export function assembleChunks(s: ReassemblyState): ReassemblyState {
  const result = inspectAssembly(s);
  const missing = s.chunks.some(c => !s.received.some(r => r.seq === c.seq));
  return { ...s, result, sawMissing: s.sawMissing || (missing && s.lostSeq.length > 0 && s.wire.length === 0) };
}
export function gradeReassembly(s: ReassemblyState, lossTask: boolean) {
  if (!s.result?.ok || !inspectAssembly(s).ok || s.result.text !== s.original) return { ok: false, message: "尚未用完整、正确排序的实际片段重组出消息。" };
  if (!lossTask && !s.arrivals.some((seq, i) => i > 0 && seq < s.arrivals[i - 1]!)) return { ok: false, message: "请实际完成一次乱序到达，再依据编号重排。" };
  if (lossTask && (!s.sawMissing || !s.recoveredSeq.length)) return { ok: false, message: "本任务还需要先观察丢块导致重组失败，再重发缺块恢复。" };
  return { ok: true, message: lossTask ? "已观察缺块失败，并靠重发与排序完整恢复。" : "已将实际乱序到达的片段排好并恢复原文。" };
}
