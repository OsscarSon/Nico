/** 网络分层与封装（教学用，四层简化模型）。 */
export type LayerId = "app" | "transport" | "network" | "link";

export const layers: { id: LayerId; name: string; role: string; examples: string }[] = [
  { id: "app", name: "应用层", role: "决定\u201C说什么\u201D：程序之间交换的内容", examples: "HTTP、DNS" },
  { id: "transport", name: "传输层", role: "决定\u201C交给哪个程序、要不要保证送到\u201D", examples: "TCP、UDP（端口号）" },
  { id: "network", name: "网络层", role: "决定\u201C送到哪台设备、往哪个方向走\u201D", examples: "IP（IP 地址）" },
  { id: "link", name: "链路层", role: "决定\u201C在这一段线路上怎么送\u201D", examples: "以太网、Wi-Fi" },
];
export const layerName = (id: LayerId): string => (layers.find((l) => l.id === id) as (typeof layers)[number]).name;

/** 演示数据：每层加一个头。字节数是演示用的典型值（TCP 20、IP 20、以太网 14）。 */
export const DATA_BYTES = 100;
export const HEADER_BYTES: Record<Exclude<LayerId, "app">, number> = { transport: 20, network: 20, link: 14 };
export const HEADER_TEXT: Record<Exclude<LayerId, "app">, string> = {
  transport: "TCP 头：来源端口 52000 → 目标端口 443",
  network: "IP 头：来源 192.0.2.10 → 目标 203.0.113.10",
  link: "以太网头：来源网卡 → 下一跳设备的网卡",
};

export type DemoState = { caption: string; /** 当前包着的各层（从外到内），例如 ["link","network","transport","app"] */ frames: LayerId[]; bytes: number; sending: boolean };

const sizeOf = (frames: LayerId[]): number =>
  frames.reduce((n, f) => n + (f === "app" ? DATA_BYTES : HEADER_BYTES[f]), 0);

const mk = (caption: string, frames: LayerId[], sending: boolean): DemoState => ({ caption, frames, bytes: sizeOf(frames), sending });

/** 发送方一路封装，接收方一路拆封。 */
export const demoStates: DemoState[] = [
  mk("应用层：浏览器生成要发送的内容（演示里是 100 字节）。", ["app"], true),
  mk("传输层：加上 TCP 头，写明交给对方的哪个程序（端口号）。", ["transport", "app"], true),
  mk("网络层：再加上 IP 头，写明从哪台设备到哪台设备（IP 地址）。", ["network", "transport", "app"], true),
  mk("链路层：再加上以太网头，只管这一段线路的下一站。到这里变成比特发出去。", ["link", "network", "transport", "app"], true),
  mk("接收方的链路层：确认是给自己的，拆掉以太网头，交给上一层。", ["network", "transport", "app"], false),
  mk("接收方的网络层：确认目标 IP 是自己，拆掉 IP 头。", ["transport", "app"], false),
  mk("接收方的传输层：按端口号找到对应的程序，拆掉 TCP 头，把内容交给应用层。", ["app"], false),
];

export type LayerTask = {
  text: string;
  answer: LayerId;
  why: string;
  hints: Record<Exclude<LayerId, never>, string>;
};

/** 每个错误选项都有指向该误解的提示。 */
export const layerTasks: LayerTask[] = [
  {
    text: "浏览器决定向网站请求 /index.html 这个页面。",
    answer: "app",
    why: "\u201C要什么内容\u201D是程序之间交换的信息，属于应用层（这里是 HTTP）。",
    hints: {
      app: "",
      transport: "传输层只管把数据交给对方的哪个程序、要不要保证送到，不关心数据的内容是什么。",
      network: "网络层只管送到哪台设备，不关心里面是一个网页请求还是别的东西。",
      link: "链路层只管这一段线路上怎么传，完全不懂内容。",
    },
  },
  {
    text: "在数据前面写上目标端口号 443，让数据交给对方的浏览器程序，而不是别的程序。",
    answer: "transport",
    why: "端口号用来区分同一台设备上的不同程序，由传输层（TCP / UDP）负责。",
    hints: {
      app: "应用层决定内容。端口号是用来把数据交给哪个程序的，这是传输层的工作。",
      transport: "",
      network: "网络层只认设备的 IP 地址，到了设备之后找哪个程序，是上面一层的事。",
      link: "链路层只管相邻两台设备之间怎么传，不涉及程序。",
    },
  },
  {
    text: "根据目标 IP 地址，决定这个数据包下一步往哪个方向转发。",
    answer: "network",
    why: "IP 地址和\u201C往哪个方向走\u201D（路由）是网络层的工作。",
    hints: {
      app: "应用层不管数据怎么走，只管内容。",
      transport: "传输层关心的是端口和是否可靠，不决定走哪条路。",
      network: "",
      link: "链路层只管相邻的下一台设备，不看整条路线，也不看 IP 地址。",
    },
  },
  {
    text: "把数据变成 Wi-Fi 的无线电信号，在这一段无线链路上发出去。",
    answer: "link",
    why: "在一段具体的线路（网线、Wi-Fi）上怎么传，属于链路层。",
    hints: {
      app: "应用层离线路很远，它不关心数据是用 Wi-Fi 还是网线传的。",
      transport: "传输层同样不关心底下是什么线路，所以换成网线也不用改它。",
      network: "网络层管整条路径上的地址和方向，具体某一段用什么技术传，是链路层的事。",
      link: "",
    },
  },
  {
    text: "TCP 发现有一块数据没有收到，要求对方重新发送。",
    answer: "transport",
    why: "保证数据可靠送到（确认、重传）是 TCP 的功能，属于传输层。",
    hints: {
      app: "应用层只负责内容。可靠与否是传输层的功能，应用层不用操心。",
      transport: "",
      network: "IP 只负责尽力转发，不保证送到，也不会重发。重传是 TCP 做的。",
      link: "链路层只负责一段线路，不知道整条通信是不是丢了数据。",
    },
  },
];

export function gradeLayer(task: LayerTask, choice: LayerId): { ok: boolean; message: string } {
  return choice === task.answer
    ? { ok: true, message: `对了，是${layerName(task.answer)}。${task.why}` }
    : { ok: false, message: `不是${layerName(choice)}。${task.hints[choice]}` };
}
