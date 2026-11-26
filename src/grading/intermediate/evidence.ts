type Status = "answer" | "insufficient" | "handoff";
type Contract = { status: Status; text: string; citations: string[] };

export function readContract(raw: string): Contract | undefined {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const fields = value as Record<string, unknown>;
  const { status, text, citations } = fields;
  if (Object.keys(fields).length !== 3
    || (status !== "answer" && status !== "insufficient" && status !== "handoff")
    || typeof text !== "string" || !text.trim()
    || !Array.isArray(citations) || citations.some(id => typeof id !== "string" || !id.trim())) return;
  return { status, text, citations };
}

const opening = [
  { source: "H-2024", text: "周六 09:00–18:00", current: false },
  { source: "H-2026", text: "周六 10:00–17:00", current: true },
] as const;
export type PromptSettings = { priority: "bounded" | "merged"; tool: "read" | "wide"; format: "json" | "text" };

function applyTools(action: "find-hours" | "update-account", settings: PromptSettings) {
  if (action === "update-account") return { outcome: "denied" as const, evidence: [] };
  const evidence = settings.priority === "bounded" ? opening.filter(row => row.current) : opening;
  return { outcome: "read" as const, evidence };
}

export function evaluatePrompt(settings: PromptSettings) {
  const allowed = applyTools("find-hours", settings);
  const found = allowed.evidence[0]!;
  const denied = applyTools("update-account", settings);
  const cases: { name: string; permission: string; proposed: Contract; expect: Contract }[] = [
    { name: "开放时间", permission: "读取公开馆规", proposed: { status: "answer", text: found.text, citations: [found.source] },
      expect: { status: "answer", text: opening[1].text, citations: [opening[1].source] } },
    { name: "尚无失物资料", permission: "资料为空", proposed: settings.priority === "bounded"
      ? { status: "insufficient", text: "资料不足", citations: [] }
      : { status: "answer", text: "失物可在任意柜台领回", citations: [] },
      expect: { status: "insufficient", text: "资料不足", citations: [] } },
    { name: "账户变更", permission: settings.tool === "wide" ? "请求写入，工具守卫拒绝" : "仅开放读取，账户事项转人工",
      proposed: settings.tool === "wide" && denied.outcome === "denied"
        ? { status: "answer", text: "账户已修改", citations: [] } : { status: "handoff", text: "请使用人工渠道", citations: [] },
      expect: { status: "handoff", text: "请使用人工渠道", citations: [] } },
  ];
  return cases.map(row => {
    const raw = settings.format === "json" ? JSON.stringify(row.proposed) : row.proposed.text;
    const parsed = readContract(raw);
    return {
      name: row.name, permission: row.permission, raw,
      accepted: Boolean(parsed && parsed.status === row.expect.status && parsed.text === row.expect.text
        && parsed.citations.join(",") === row.expect.citations.join(",")),
    };
  });
}

const vocabulary = ["周六", "开放", "续借", "借阅", "展览", "登记"];
type Fact = { terms: string[]; text: string };
const documents: { id: string; edition: number; sections: Fact[] }[] = [
  { id: "馆规-2024", edition: 2024, sections: [
    { terms: ["周六", "开放"], text: "旧版：周六 09:00–18:00。" },
    { terms: ["续借", "借阅"], text: "旧版：续借延长 7 天。" },
  ] },
  { id: "馆规-2026", edition: 2026, sections: [
    { terms: ["周六", "开放"], text: "现行：周六 10:00–17:00。" },
    { terms: ["续借", "借阅"], text: "现行：续借延长 14 天。" },
  ] },
  { id: "公告-2026", edition: 2026, sections: [
    { terms: ["展览", "登记"], text: "展览在服务台登记。" },
  ] },
];
const queries = [
  { name: "周六何时开放？", terms: ["周六", "开放"], expected: "馆规-2026/1" },
  { name: "续借能延长多久？", terms: ["续借", "借阅"], expected: "馆规-2026/2" },
  { name: "雨伞失物在哪领取？", terms: ["雨伞", "失物"], expected: null },
] as const;

export function embed(terms: readonly string[]) {
  return vocabulary.map(token => terms.filter(term => term === token).length);
}
export function cosine(a: readonly number[], b: readonly number[]) {
  if (a.length !== b.length) return 0;
  const normA = Math.hypot(...a), normB = Math.hypot(...b);
  return normA && normB ? a.reduce((dot, x, i) => dot + x * b[i]!, 0) / (normA * normB) : 0;
}

export function buildIndex(chunkSize: 1 | 2) {
  return documents.flatMap(doc => {
    const chunks = [];
    for (let i = 0; i < doc.sections.length; i += chunkSize) {
      const parts = doc.sections.slice(i, i + chunkSize);
      chunks.push({
        id: doc.id + "/" + (i + 1), edition: doc.edition,
        sections: parts.length, vector: embed(parts.flatMap(part => part.terms)),
        text: parts.map(part => part.text).join(" "),
      });
    }
    return chunks;
  });
}

export type RagSettings = { size: 1 | 2; top: 1 | 2 | 3; rerank: boolean; abstain: boolean };
export function evaluateRag(settings: RagSettings) {
  const index = buildIndex(settings.size);
  const rows = queries.map(query => {
    const vector = embed(query.terms);
    const initial = index.map(chunk => ({ ...chunk, score: cosine(vector, chunk.vector) }))
      .filter(hit => hit.score > 0)
      .sort((a, b) => b.score - a.score || a.edition - b.edition || a.id.localeCompare(b.id))
      .slice(0, settings.top);
    const sorted = settings.rerank ? [...initial].sort((a, b) => b.edition - a.edition || b.score - a.score) : initial;
    const picked = sorted[0];
    const accepted = query.expected
      ? picked?.id === query.expected && picked.sections === 1
      : !picked && settings.abstain;
    return {
      name: query.name, expected: query.expected, initial,
      evidence: picked?.id ?? null,
      text: picked?.text ?? (settings.abstain ? "资料不足" : "猜测：可在任意窗口办理"),
      accepted: Boolean(accepted),
      recalled: Boolean(query.expected && initial.some(hit => hit.id === query.expected && hit.sections === 1)),
    };
  });
  const supported = rows.filter(row => row.expected);
  return {
    indexSize: index.length, recall: supported.filter(row => row.recalled).length,
    supported: supported.length, accepted: rows.filter(row => row.accepted).length, rows,
  };
}
