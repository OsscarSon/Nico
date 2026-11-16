import type { Lesson } from "../content/schema";
import { LIMITS } from "./protocol";

const plain = (s: string) => s.replace(/\*\*/g, "");

/**
 * 把一节课整理成给 AI 导师的“参考资料”：目标、讲解、互动说明。
 * **不包含**检查题、迁移题和它们的答案与提示，这样 AI 导师手里根本没有答案可泄露。
 */
export function buildLessonContext(lesson: Lesson, max: number = LIMITS.context): string {
  const chunks: string[] = [`本课目标：\n${lesson.objectives.map((o) => `- ${o}`).join("\n")}`];
  for (const b of lesson.blocks) {
    if (b.type === "hook") chunks.push(plain(b.text));
    else if (b.type === "explain")
      chunks.push([`【${b.title}】`, ...b.body.map(plain), b.callout ? `注意：${plain(b.callout)}` : ""].filter(Boolean).join("\n"));
    else if (b.type === "sim") chunks.push(`互动「${b.title}」：${plain(b.intro)}`);
    else if (b.type === "summary") chunks.push(`小结：\n${b.points.map((p) => `- ${plain(p)}`).join("\n")}`);
  }
  // 按块截断，而不是从句子中间切断
  let out = "";
  for (const c of chunks) {
    const next = out ? `${out}\n\n${c}` : c;
    if (Array.from(next).length > max) break;
    out = next;
  }
  return out || Array.from(chunks[0] ?? "").slice(0, max).join("");
}
