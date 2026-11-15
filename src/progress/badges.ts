import { getLesson } from "../content";
import { streak, type Progress } from "./store";

export type Badge = {
  id: string;
  art: string;
  title: string;
  how: string;
  /** 需要完成的课时；全部完成才算获得 */
  requires: string[];
  /** 连续学习天数门槛（与 requires 二选一） */
  streakDays?: number;
};

export const badges: Badge[] = [
  { id: "first-bit", art: "badge-first-bit.png", title: "第一个比特", how: "完成第一节课", requires: ["a01-binary"] },
  { id: "streak-7", art: "badge-streak-7.png", title: "连续七天", how: "连续 7 天有学习记录", requires: [], streakDays: 7 },
  { id: "gatekeeper", art: "badge-gatekeeper.png", title: "守门人", how: "完成逻辑门单元（A03、A04）", requires: ["a03-logic-gates", "a04-adder"] },
  { id: "packet-pilot", art: "badge-packet-pilot.png", title: "数据包领航员", how: "完成路线 A 的网络单元（A09 到 A17）", requires: ["a09-network-layers", "a10-ip-subnet", "a11-devices", "a12-packets", "a13-dns", "a14-tcp", "a15-udp", "a16-http-https", "a17-web-journey"] },
  { id: "prompt-smith", art: "badge-prompt-smith.png", title: "提示词匠", how: "完成提示词单元（路线 C）", requires: ["c05-prompt-structure"] },
  { id: "agent-builder", art: "badge-agent-builder.png", title: "助手工匠", how: "完成 AI 助手作品（路线 C）", requires: ["c18-assistant-project"] },
  { id: "formula-wizard", art: "badge-formula-wizard.png", title: "公式达人", how: "完成公式单元（路线 E）", requires: ["e01-formula-basics"] },
  { id: "game-maker", art: "badge-game-maker.png", title: "游戏制作人", how: "完成游戏作品（路线 D）", requires: ["d16-game-project"] },
];

export type BadgeStatus = Badge & {
  /** 获得条件是否已经满足 */
  earned: boolean;
  /** 对应的课时是否已经开放；没开放就不可能获得 */
  obtainable: boolean;
};

/** 徽章只按真实的完成记录发放；课程还没开放的徽章不可获得，界面据此说明。 */
export function evaluateBadges(
  p: Progress,
  today: Date,
  hasLesson: (id: string) => boolean = (id) => Boolean(getLesson(id)),
): BadgeStatus[] {
  return badges.map((b) => {
    const obtainable = b.streakDays !== undefined || b.requires.every(hasLesson);
    const earned =
      b.streakDays !== undefined
        ? streak(p, today) >= b.streakDays
        : obtainable && b.requires.every((id) => Boolean(p.lessons[id]));
    return { ...b, earned, obtainable };
  });
}
