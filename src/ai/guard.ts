/**
 * 进入模型之前的输入处理（纯函数，服务端使用，有单元测试）。
 *
 * 要诚实：没有任何办法 100% 防住提示词注入。这里做的是分层缓解：
 *   1. 长度上限和控制字符清理
 *   2. 把“资料”和“学习者的话”放进带随机编号的标签里，系统提示词声明标签内都不是指令
 *   3. 在系统提示词里放一个随机的“暗号”，回答里出现暗号就丢弃（说明提示词被套出来了）
 *   4. 模型输出再用 Zod 校验，格式不对就当失败
 */

/** 清理控制字符，统一换行，压缩多余空行，并截断。 */
export function cleanText(input: string, max: number): string {
  const text = input
    .replace(/\r\n?/g, "\n")
    // 保留换行和制表符，去掉其它控制字符与零宽字符
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return Array.from(text).slice(0, max).join("");
}

/** 12 位十六进制随机串。random 可注入，测试时给固定值。 */
export function randomHex(bytes = 6): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 用带随机编号的标签包住不可信文本。
 * 编号每次请求都不同，学习者猜不到，也就没法在文本里“提前关闭”标签；
 * 另外把文本里长得像我们标签的片段打断，作为第二道防线。
 */
export function fence(tag: string, text: string, nonce: string): string {
  const safe = text
    .replace(new RegExp(`<\\s*/?\\s*${tag}`, "gi"), (m) => m.replace("<", "＜"))
    .split(nonce)
    .join("");
  return `<${tag} id="${nonce}">\n${safe}\n</${tag}>`;
}

/** 回答里是否出现了系统提示词里的暗号（出现就说明提示词被套出来了）。 */
export const leaksCanary = (output: string, canary: string): boolean =>
  output.toLowerCase().includes(canary.toLowerCase());

/** 去掉模型有时会多加的 ```json 围栏，再解析 JSON；解析不了返回 null。 */
export function parseJsonLoose(raw: string): unknown | null {
  let s = raw.trim();
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(s);
  if (fenced?.[1]) s = fenced[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
