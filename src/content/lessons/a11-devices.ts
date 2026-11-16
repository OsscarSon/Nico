import { lessonSchema, type Lesson } from "../schema";
export const a11: Lesson = lessonSchema.parse({
  id: "a11-devices", track: "a", unit: "a3", title: "交换机与路由器：找到下一站", artPending: true,
  objectives: ["能区分 MAC、IP、交换机、路由器与默认网关", "能观察源 MAC 学习和未知单播泛洪", "能选择同网段/跨网段的正确首跳并解释逐跳 MAC 变化"],
  prerequisites: ["a09-network-layers", "a10-ip-subnet"], estimatedMinutes: 14,
  blocks: [
    { type: "hook", text: "你给隔壁同学传作业，一台交换机就能送到。换成另一个教室的电脑，明明也插着网线，为什么还需要“默认网关”？今天你来当网络邮递员：让消息在两个局域网之间找到下一站。" },
    { type: "explain", title: "两种地址，回答两个问题", body: [
      "A10 中的 **IP 地址**描述网络层的位置，配合掩码判断目标是否同网段。**MAC 地址**是以太网接口在本地链路上的地址，用来决定一帧交给哪个接口。一个数据包可以装进带有 MAC 地址的以太网帧。",
      "IP 像信封上写的最终目的地，MAC 像这一程要交给的下一位接力者。跨过路由器时，下一程的帧头会重写，IP 目的地在本实验中仍是那台远端电脑。",
      "MAC 常写成 6 组十六进制数；它可能由硬件提供，也能由软件配置，不是不可改变的永久身份。同一设备的不同接口可以有不同的 MAC 与 IP。",
    ] },
    { type: "explain", title: "交换机靠源地址学习，不会读心术", body: [
      "**交换机（switch）**在局域网中转发以太网帧。收到帧时，它把“源 MAC 从哪个入口端口来”记进学习表；再用**目标 MAC**查表决定往哪里送。",
      "表里有目标，就只向对应端口转发；目标端口就是入口时，不需要再转回。表里没有目标，就向同一 LAN 内除入口外的其他端口发送副本，叫**未知单播泛洪**。目标 MAC 仍是原来的单播地址，不会变成广播地址。",
      "只有真正的目标接口接收这帧，其他接口会忽略。A 向 B 发一帧只能让交换机学到 A；B 发出回复后才会教会交换机 B 在哪。表项不是凭空从目标地址学来的。",
    ] },
    { type: "explain", title: "跨网段，先把信交给默认网关", body: [
      "发送端先按目标 IP 和掩码判断：同网段时，首帧直接发给目标 MAC；不在同网段时，通常把帧发给本地**默认网关（default gateway）**的 MAC，IP 目标仍写远端电脑。默认网关是路由器的本地接口。",
      "**路由器（router）**收到发给本接口的帧，取出 IP 数据包，依据目标 IP 查路由表选择下一跳/出口，再装进新帧。在本实验里，LAN 1 是 192.168.1.0/24，LAN 2 是 192.168.2.0/24，路由器两侧分别有 .1 接口。",
      "A→C 的路径是 A→S1→R→S2→C。第一程目标 MAC 是 R1；第二程源 MAC 是 R2、目标 MAC 是 C。IP 源/目的不变，经过路由器时 TTL 减 1。MAC 不能代替跨网段的 IP 路由。",
    ] },
    { type: "explain", title: "ARP 与广播：实验省略了什么", body: [
      "知道下一跳的 IP 后，还需要其本地 MAC。IPv4 以太网上通常用 **ARP（地址解析协议）**询问；ARP 请求可用广播发给本广播域内设备，目标再回应。",
      "广播与未知单播都可能被交换机向多个端口转发，但不是同一种帧。普通路由器不会把本 LAN 的二层广播原样扩散到另一个 LAN。",
      "实验直接提供已知 IP→MAC 映射，不展示 ARP 请求/回应或缓存过期。你也能故意强制使用远端电脑 MAC：即使知道这个 MAC，帧也不能靠交换机越过路由器到另一个 LAN。",
    ], callout: "拓扑无环路，只含两个直连 /24 路由，不模拟 VLAN、STP、动态路由、NAT、链路错误或表项老化；ARP 映射直接提供。源/目的 IP 不变仅针对本实验无 NAT 的路径。" },
    { type: "sim", sim: "forwarding", mode: "free", title: "Network Forwarding Lab：你来转发", intro: "先发 A→B，逐跳处理完；再发 B→A，观察源 MAC 学习。换成 A→C，对比自动首跳与强制直接找目标 MAC。展开记录查看泛洪副本为何被非目标设备忽略。" },
    { type: "sim", sim: "forwarding", mode: "challenge", title: "挑战：四张通信委托单", intro: "依次完成同 LAN、跨 LAN、冷 MAC 表泛洪和默认网关任务。每次从真实空表开始，选择端点与首跳，逐跳送达并检查结果；多点几次检查不能代替转发。" },
    { type: "quiz", items: [
      { q: "交换机收到 A→B 的第一帧，能立刻从这帧学到哪条位置？", options: ["B 的 MAC 所在端口", "A 的 MAC 所在入口端口", "全网所有 IP 的路由"], answer: 1, why: "交换机从收到帧的源 MAC 与入口端口学习 A 的位置；目标 B 是否已知要查原有表。", wrongHints: { "0": "帧从 A 进入，不能据此知道 B 接在哪个出口；B 发帧后才可学习它的源地址。", "2": "普通二层交换机的 MAC 学习不等于维护全网 IP 路由。" } },
      { q: "A 要发送到另一个网段的 C。自动首跳时，帧目标 MAC 和 IP 目标分别是谁？", options: ["本地网关 MAC，C 的 IP", "C 的 MAC，本地网关 IP", "两个都是本地网关"], answer: 0, why: "帧交给本地下一跳网关，IP 数据包仍去往远端 C。", wrongHints: { "1": "远端 C 的 MAC 不能在本 LAN 直接送达；IP 目标也不应改成网关。", "2": "改成网关 IP 就改变了最终目的地，网关只是接力的下一跳。" } },
      { q: "未知单播泛洪时，哪种描述正确？", options: ["目标 MAC 自动变成广播地址", "所有 LAN 都会收到，路由器无条件转发", "同 LAN 的多个出口收到副本，目标 MAC 保持单播"], answer: 2, why: "交换机扩大出口范围，不改写单播目标地址；路由器不会无条件跨 LAN 转发这些副本。", wrongHints: { "0": "泛洪是转发方式，目标地址仍是那个未知的单播 MAC。", "1": "二层泛洪局限于本广播域，本实验的路由器会忽略未发给本接口的帧。" } },
    ] },
    { type: "transfer", prompt: "A 向另一个网段的 C 发送一个数据包，途中只有一台路由器、没有 NAT。连线为 A—S1—R—S2—C。包含原发送端发出的帧在内，成功路径上共有几段不同的以太网链路封装（经过交换机不重新封装，经过路由器才新建帧头）？", answer: 2, hint: "把路由器当分界；交换机只是沿本 LAN 转发原帧。", why: "A→R 一段以太网封装，R→C 另一段，共 2 段；两个 LAN 使用不同的下一跳 MAC 帧头。" },
    { type: "summary", points: ["IP 与掩码帮助选择网段/下一跳；MAC 决定本地以太网帧交给哪个接口。", "交换机从源 MAC 学习，未知单播泛洪不等于把目标 MAC 改成广播。", "跨网段先到默认网关；路由器按 IP 选出口并重新封装帧头。"], next: "a12-packets" },
  ],
  sources: [{ title: "RFC 826：Ethernet Address Resolution Protocol", url: "https://www.rfc-editor.org/rfc/rfc826" }, { title: "RFC 1812：IPv4 Routers，下一跳与转发", url: "https://www.rfc-editor.org/rfc/rfc1812" }, { title: "RFC 4188：Bridge MIB，源地址学习与转发表", url: "https://www.rfc-editor.org/rfc/rfc4188" }], quality: { state: "draft" },
});
