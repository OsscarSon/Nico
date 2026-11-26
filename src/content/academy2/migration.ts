/** Primary locations for the existing 212 records. Retains the stable catalog and player IDs. */
export const placements: Record<string, Record<string, string>> = {
  "foundation-mathematics": { algebra: "M01" },
  "foundation-programming": { syntax: "B01", control: "B02–B04", collections: "B05–B06", testing: "B07" },
  "foundation-systems": { representation: "A01–A02", hardware: "A03–A06", os: "A07–A08", network: "A09–A17 A21–A22" },
  "foundation-data-science": { cleaning: "E01 E05–E06", tables: "E02–E04 E07", stories: "E08 E13–E16" },
  "foundation-ai": { models: "C01–C04 C14", prompts: "C05–C10", assistants: "C11–C13 C15–C18" },
  "foundation-software": { interface: "B08–B12", requests: "B13", versioning: "B14–B17", quality: "B18–B20" },
  "foundation-security": { account: "A18–A20" },
  "foundation-applied": { games: "D01–D16", hardware: "F01–F08", automation: "E09–E12" },
  "intermediate-mathematics": { "linear-algebra": "M02 C-I02", calculus: "M03", discrete: "M05" },
  "intermediate-statistics": { variables: "M04" },
  "intermediate-programming": { python: "B-I01", async: "B-I02" },
  "intermediate-algorithms": { structures: "B-I06" },
  "intermediate-systems": { architecture: "A-I01", os: "A-I02", networks: "A-I03–A-I04", virtualization: "A-I06" },
  "intermediate-data-science": { tools: "C-I01 E-I04", analysis: "E-I01", "database-design": "B-I05 E-I03", bi: "E-I06 E-I07" },
  "intermediate-ai": { supervised: "C-I03", evaluation: "C-I08–C-I09", reasoning: "C-I04–C-I07 C-I10" },
  "intermediate-software": { "full-stack": "B-I03–B-I04 B-I08", delivery: "B-I07" },
  "intermediate-security": { defensive: "A-I05" },
  "intermediate-applied": { games: "D-I01–D-I07", embedded: "F-I01–F-I02 F-I06", robotics: "F-I03–F-I05", automation: "E-I02 E-I05" },
  "advanced-statistics": { decisions: "E-U06 E-U10" },
  "advanced-programming": { language: "B-U04", compiler: "B-U05", runtime: "B-U09" },
  "advanced-algorithms": { "advanced-structures": "B-U01", algorithms: "B-U02", computability: "B-U11" },
  "advanced-systems": { parallel: "A-U01–A-U02 A-U07 B-U12", distributed: "A-U03–A-U04 A-U08", production: "A-U06" },
  "advanced-data-science": { storage: "B-U03", warehousing: "E-U02", pipelines: "E-U01 E-U03–E-U05 E-U09", governance: "E-U07–E-U08" },
  "advanced-ai": { "deep-models": "C-U01–C-U02", attention: "C-U03–C-U04", vision: "C-U11–C-U12", llm: "C-U05–C-U06 C-U13", specialized: "C-U07", mlops: "C-U08" },
  "advanced-software": { architecture: "B-U06 B-U08", scaling: "B-U07", operations: "B-U10" },
  "advanced-security": { systems: "A-U05 A-U09", privacy: "C-U09", research: "C-U10" },
  "advanced-applied": { graphics: "D-U01–D-U02 D-U04", simulation: "D-U03 D-U05–D-U09 F-U06", robotics: "F-U01–F-U05 F-U07–F-U10" },
};

export function expandCodes(spec: string) {
  return spec.trim().split(/\s+/).filter(Boolean).flatMap(range => {
    const [first, last] = range.split("–");
    if (!last) return first!;
    const prefix = first!.slice(0, -2);
    const from = Number(first!.slice(-2)), to = Number(last.slice(-2));
    if (prefix !== last.slice(0, -2) || !Number.isInteger(from) || !Number.isInteger(to) || from > to) {
      throw new Error("无效的旧目录编号范围：" + range);
    }
    return Array.from({ length: to - from + 1 }, (_, offset) => prefix + String(from + offset).padStart(2, "0"));
  });
}

export const relatedEntries: Record<string, string> = {
  "foundation-data-science/collection": "B13",
  "foundation-security/ethics": "C15–C17",
  "foundation-algorithms/structures": "B05–B06 B-I06",
  "foundation-ai/principles": "E12",
  "intermediate-statistics/variables": "C-I02",
  "intermediate-programming/languages": "F-I01",
  "intermediate-data-science/sql": "B-I05 E-I03",
  "intermediate-ai/reasoning": "B-I06",
  "intermediate-systems/networks": "A21–A22",
  "intermediate-security/cryptography": "A16",
  "advanced-mathematics/optimization": "M05",
  "advanced-ai/attention": "C-I05",
};
