import { trackBUnits, trackBCatalog } from "./track-b-catalog";
import { trackCUnits, trackCCatalog } from "./track-c-catalog";
import { trackDCatalog, trackDUnits } from "./track-d";
import { trackECatalog, trackEUnits } from "./track-e";
import { trackFCatalog, trackFUnits } from "./track-f";
export type TrackId = "a" | "b" | "c" | "d" | "e" | "f";
export type CatalogLesson = {
  id: string;
  title: string;
  unit: string;
  status: "available" | "planned";
};
export type Track = {
  id: TrackId;
  title: string;
  english: string;
  /** public/art/ 下的路线徽记文件名 */
  art: string;
  tagline: string;
  /** building = 正在做；planned = 只是规划，没有可学课时 */
  status: "building" | "planned";
  plannedSummary: string;
  units: { id: string; title: string }[];
  lessons: CatalogLesson[];
};

const L = (
  id: string,
  title: string,
  unit: string,
  status: CatalogLesson["status"] = "planned",
): CatalogLesson => ({ id, title, unit, status });

export const tracks: Track[] = [
  {
    id: "a",
    title: "电脑基础与网络",
    english: "Computers & Networks",
    art: "track-a-network.png",
    tagline: "从 0 和 1 一路走到一次网页访问。",
    status: "building",
    plannedSummary: "22 课 · 4 个单元",
    units: [
      { id: "a1", title: "数字世界的语言" },
      { id: "a2", title: "电脑内部" },
      { id: "a3", title: "网络如何连接" },
      { id: "a4", title: "安全意识（防御向）" },
    ],
    lessons: [
      L("a01-binary", "二进制：电脑只认 0 和 1", "a1", "available"),
      L("a02-hex-encoding", "十六进制与文字编码", "a1", "available"),
      L("a03-logic-gates", "逻辑门：AND、OR、NOT、XOR", "a1", "available"),
      L("a04-adder", "用门搭一个加法器", "a1", "available"),
      L("a05-cpu-cycle", "CPU：取指、译码、执行", "a2", "available"),
      L("a06-memory", "内存与存储为什么要分层", "a2", "available"),
      L("a07-os", "操作系统做什么", "a2", "available"),
      L("a08-command-line", "命令行第一步", "a2", "available"),
      L("a09-network-layers", "网络是什么：分层的想法", "a3", "available"),
      L("a10-ip-subnet", "IP 地址与子网", "a3", "available"),
      L("a11-devices", "交换机与路由器各司何职", "a3", "available"),
      L("a12-packets", "数据包：切开、编号、再拼起来", "a3", "available"),
      L("a13-dns", "DNS：名字怎么变成地址", "a3", "available"),
      L("a14-tcp", "TCP：三次握手与可靠传输", "a3", "available"),
      L("a15-udp", "UDP：何时不需要可靠", "a3", "available"),
      L("a16-http-https", "HTTP 与 HTTPS", "a3", "available"),
      L("a17-web-journey", "一次网页访问的完整旅程", "a3", "available"),
      L("a18-passwords", "密码与哈希", "a4", "available"),
      L("a19-phishing", "识别钓鱼与社会工程", "a4", "available"),
      L("a20-least-privilege", "最小权限与日常防护", "a4", "available"),
      L("a21-http-status", "状态码是服务器的回话（404、429）", "a3", "available"),
      L("a22-error-logs", "读懂报错与日志", "a3", "available"),
    ],
  },
  {
    id: "b",
    title: "编程与网站",
    english: "Code & Web",
    art: "track-b-code.png",
    tagline: "写出第一个程序，再做出自己的网页。",
    status: "building",
    plannedSummary: "约 20 课 · Python、网页、Git",
    units: trackBUnits,
    lessons: trackBCatalog,
  },
  {
    id: "c",
    title: "AI 与提示词",
    english: "AI & Prompts",
    art: "track-c-ai.png",
    tagline: "学会给 AI 下清楚的指令，并判断结果好不好。",
    status: "building",
    plannedSummary: "约 18 课 · Prompt 训练场、RAG、Agent",
    units: trackCUnits,
    lessons: trackCCatalog,
  },
  {
    id: "d",
    title: "游戏开发",
    english: "Game Dev",
    art: "track-d-games.png",
    tagline: "从游戏循环到 Unity 的第一个场景。",
    status: "building",
    plannedSummary: "约 16 课 · 小游戏与 Unity 基础",
    units: trackDUnits,
    lessons: trackDCatalog,
  },
  {
    id: "e",
    title: "Google 与效率自动化",
    english: "Sheets & Automation",
    art: "track-e-google.png",
    tagline: "用公式、脚本和 AI 把重复的事交给电脑。",
    status: "building",
    plannedSummary: "16 课 · 公式、Apps Script、Gemini",
    units: trackEUnits,
    lessons: trackECatalog,
  },
  {
    id: "f",
    title: "硬件与机器人",
    english: "Hardware & Robotics",
    art: "track-f-hardware.png",
    tagline: "连接软件与现实。",
    status: "building",
    plannedSummary: "8 课 · 电路、Arduino 与避障小车",
    units: trackFUnits,
    lessons: trackFCatalog,
  },
];

export const getTrack = (id: string) => tracks.find((t) => t.id === id);
