/**
 * AI 功能用到的新插图。文件还没出图时保持 undefined，界面就不显示图片（不会出现破图）。tutor、quota 已接入用户修好的第三批图。
 * 出图后把 PNG 放进 public/art/，再把文件名填在这里；tests/aiArt.test.ts 会检查文件真的存在。
 * 出图提示词见 docs/blueprint/07_ART_PROMPTS_AI.md。
 */
export const aiArt: {
  /** AI 导师页顶部：Byte 举着对话气泡（800×600） */
  tutor?: string;
  /** AI 用不了时：直接用仓库里已有的离线图（芯片小人和断开的线，800×600） */
  unavailable?: string;
  /** 今日额度用完：Byte 趴着睡觉（800×600） */
  quota?: string;
} = { tutor: "tutor-byte.png", unavailable: "error-offline.png", quota: "quota-sleeping.png" };
