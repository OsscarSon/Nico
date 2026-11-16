/** 纯内存虚拟文件系统。没有 eval、宿主文件访问、进程启动或网络调用。 */
export type VNode = { kind: "dir" } | { kind: "file"; content: string };
export type TerminalState = { cwd: string; nodes: Record<string, VNode>; read: string[]; output: string; error: boolean };
export const initialTerminal = (): TerminalState => ({ cwd: "/home/nico", nodes: {
  "/": { kind: "dir" }, "/home": { kind: "dir" }, "/home/nico": { kind: "dir" },
  "/home/nico/projects": { kind: "dir" }, "/home/nico/README.txt": { kind: "file", content: "欢迎来到 Nico 命令行。先确认位置，再操作文件。" },
}, read: [], output: "输入 help 查看支持的命令。这里只操作虚拟文件。", error: false });
export function resolvePath(cwd: string, path: string): string {
  const parts: string[] = [];
  for (const p of (path.startsWith("/") ? path : `${cwd}/${path}`).split("/")) {
    if (p === "..") parts.pop(); else if (p && p !== ".") parts.push(p);
  }
  return "/" + parts.join("/");
}
export function tokenize(line: string): string[] | null {
  const out: string[] = []; let word = "", quote = "", started = false;
  for (const ch of line.trim()) {
    if (quote) { if (ch === quote) quote = ""; else word += ch; started = true; }
    else if (ch === '"' || ch === "'") { quote = ch; started = true; }
    else if (/\s/.test(ch)) { if (started) { out.push(word); word = ""; started = false; } }
    else if (/[|;&<>`$\\]/.test(ch)) return null;
    else { word += ch; started = true; }
  }
  if (quote) return null;
  if (started) out.push(word);
  return out;
}
export function terminalStep(s: TerminalState, line: string): TerminalState {
  const fail = (output: string) => ({ ...s, output, error: true });
  if (line.length > 240) return fail("命令过长，请限制在 240 字符以内。");
  const tokens = tokenize(line);
  if (!tokens) return fail("引号未闭合，或使用了未支持的管道、重定向、组合命令。请一次输入一条命令。");
  const [cmd, ...args] = tokens;
  if (!cmd) return { ...s, output: "请输入命令。", error: false };
  const arity: Record<string, number[]> = { help: [0], pwd: [0], ls: [0, 1], cd: [1], mkdir: [1], touch: [1], cat: [1], cp: [2] };
  if (!Object.hasOwn(arity, cmd)) return fail(`不支持命令 ${cmd}。输入 help 查看本练习支持的命令。`);
  if (!arity[cmd]!.includes(args.length) || args.some(a => !a || a.includes("\0"))) return fail(`参数不正确。用法：${({ cd: "cd 路径", cp: "cp 源文件 目标路径", mkdir: "mkdir 目录", touch: "touch 文件", cat: "cat 文件", ls: "ls [目录]" } as Record<string, string>)[cmd] ?? cmd}`);
  const path = resolvePath(s.cwd, args[0] ?? ".");
  const node = s.nodes[path];
  if (cmd === "help") return { ...s, error: false, output: "pwd：当前位置\nls [目录]：列出内容\ncd 路径：进入目录\nmkdir 目录：新建目录\ntouch 文件：新建空文件\ncat 文件：查看内容\ncp 源文件 目标路径：复制文件\n支持引号包住带空格的路径；不支持通配符、管道、重定向或真实系统命令。" };
  if (cmd === "pwd") return { ...s, error: false, output: s.cwd };
  if (cmd === "cd") return node?.kind === "dir" ? { ...s, cwd: path, error: false, output: `当前目录：${path}` } : fail("目录不存在或目标不是目录；用 ls 检查路径。");
  if (cmd === "cat") return node?.kind === "file" ? { ...s, error: false, read: [...new Set([...s.read, path])], output: node.content || "（空文件）" } : fail("文件不存在或目标是目录；用 ls 检查文件名。");
  if (cmd === "ls") {
    if (node?.kind !== "dir") return fail("目录不存在或目标不是目录。");
    const prefix = path === "/" ? "/" : path + "/";
    const names = Object.entries(s.nodes).filter(([p]) => p.startsWith(prefix) && p !== path && !p.slice(prefix.length).includes("/"))
      .map(([p, n]) => p.slice(prefix.length) + (n.kind === "dir" ? "/" : "")).sort();
    return { ...s, error: false, output: names.join("\n") || "（空目录）" };
  }
  let dest = path; let value: VNode;
  if (cmd === "cp") {
    if (node?.kind !== "file") return fail("源文件不存在或是目录；本模型只复制文件。");
    dest = resolvePath(s.cwd, args[1]!);
    if (s.nodes[dest]?.kind === "dir") dest = resolvePath(dest, path.split("/").at(-1)!);
    value = { ...node };
  } else value = cmd === "mkdir" ? { kind: "dir" } : { kind: "file", content: "" };
  if (!dest.startsWith("/home/nico/")) return fail("虚拟权限拒绝：只能在 /home/nico 内创建或复制文件。");
  const parent = dest.slice(0, dest.lastIndexOf("/")) || "/";
  if (s.nodes[parent]?.kind !== "dir") return fail("父目录不存在；先用 mkdir 创建目录。");
  if (s.nodes[dest]) {
    if (cmd === "touch" && s.nodes[dest]?.kind === "file") return { ...s, error: false, output: "文件已存在，内容保持不变。" };
    return fail("目标已存在；本练习不覆盖已有内容，请换一个名字。");
  }
  if (Object.keys(s.nodes).length >= 80) return fail("虚拟文件数量已达上限，请重置实验后再试。");
  return { ...s, nodes: { ...s.nodes, [dest]: value }, error: false, output: `已创建：${dest}` };
}
export const terminalGoals = (s: TerminalState) => {
  const copy = s.nodes["/home/nico/practice/note.txt"];
  const source = s.nodes["/home/nico/README.txt"];
  return [
  { label: "建立 /home/nico/practice 目录", ok: s.nodes["/home/nico/practice"]?.kind === "dir" },
  { label: "将 README.txt 复制为 practice/note.txt", ok: copy?.kind === "file" && source?.kind === "file" && copy.content === source.content },
  { label: "进入 practice 并用 cat 查看 note.txt", ok: s.cwd === "/home/nico/practice" && s.read.includes("/home/nico/practice/note.txt") },
];
};
