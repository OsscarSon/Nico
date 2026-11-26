import { predict, context, sample, claims } from "./foundations";
import { examples, format, pipeline, verify, iterate } from "./prompting";
import { retrieve, agent, evaluate, local } from "./building";
import { fairness, trust, delegate, capstone } from "./responsibility";
import type { CLab, CLabKey } from "./types";

export const cLabs: Record<CLabKey, CLab> = {
  predict, context, sample, claims, examples, format, pipeline, verify, iterate,
  retrieve, agent, evaluate, local, fairness, trust, delegate, capstone,
};
