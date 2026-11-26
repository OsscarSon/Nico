import type { TopicLesson } from "../schema";
import { foundationMathUpgrade } from "./foundationMath";
import { foundationStatsUpgrade } from "./foundationStats";
import { intermediateMathUpgrade } from "./intermediateMath";
import { intermediateStatsUpgrade } from "./intermediateStats";
import type { Enrichment } from "./authoring";
import { extras } from "./extras";

export const upgrades: Readonly<Record<string, Enrichment>> = {
  ...foundationMathUpgrade,
  ...foundationStatsUpgrade,
  ...intermediateMathUpgrade,
  ...intermediateStatsUpgrade,
};

export function enhanceLesson(id: string): TopicLesson {
  const upgrade = upgrades[id];
  if (!upgrade) throw new Error("缺少 P1.5 补充课时：" + id);
  const extra = extras[id];
  return {
    id,
    blocks: [...upgrade.blocks, ...(extra?.blocks ?? [])],
    questions: [...upgrade.questions, ...(extra?.questions ?? [])],
  };
}
