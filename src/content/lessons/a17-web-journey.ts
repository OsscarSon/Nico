import { lessonSchema, type Lesson } from "../schema";
export const a17: Lesson = lessonSchema.parse({
  id: "a17-web-journey", track: "a", unit: "a3", title: "一次网页访问：你来排查整条链路", art: "lesson-a17-web-journey.png",
  objectives: ["能从URL走完DNS、TCP、TLS、HTTP、响应和页面显示", "能凭实际协议状态区分旧DNS答案、握手丢包和HTTP资源错误", "能用缓存失效、到期重传和请求修正解决三个真实状态情景"],
  prerequisites: ["a09-network-layers", "a10-ip-subnet", "a11-devices", "a12-packets", "a13-dns", "a14-tcp", "a15-udp", "a16-http-https"], estimatedMinutes: 15,
  blocks: [
    { type: "hook", text: "朋友说“网站打不开”。你有三把工具：清DNS缓存、等连接重传、修改网址路径。乱用可能白忙一场。今天屏幕不替你演电影：你要亲手把网址送过每一道关，并拿出证据解释究竟是哪一层出了问题。" },
    { type: "explain", title: "网址拆开看：名字不是路径", body: [
      "看https://www.example.com/lesson：https选择受TLS保护的访问，www.example.com是主机名，/lesson是HTTP资源路径。URL里的#片段用于客户端定位，不发送给HTTP服务器。",
      "DNS把**主机名**解析成IP，不把整条URL变成网页。本实验复用A13的根、TLD、权威查询与区指引缓存；你要逐条处理实际查询/回答，完成后才有可用于连接的地址。",
      "本课为答案缓存加上5个教学逻辑时刻的TTL，命中不续期，到期后重新问；区指引仍沿用A13的简化模型。缓存有值也可能指向已经不再提供本站服务的旧地址，不能把“DNS返回了东西”当成“整条访问已成功”。",
    ], callout: "虚构域名与文档专用IP只在浏览器内模拟。缓存场景是服务地址迁移后的旧答案；手动清除答案用于诊断练习，不代表真实网站迁移应靠所有用户清缓存。" },
    { type: "explain", title: "TCP：地址对了，还要真正建连", body: [
      "有了目标地址，客户端发SYN、服务器回SYN-ACK、客户端回ACK。复用A14状态机：最后ACK丢失时，客户端可能已ESTABLISHED，服务器却还在等待。只看一边状态不能算双方已建立。",
      "你可以丢弃、延迟任意握手报文。未确认一方要等待到期再用相同序号重传，不会因为点“下一阶段”就自动成功。若地址指向无本站服务的位置，SYN也收不到正确服务器的回答；单纯重传不会改正DNS答案。",
      "本实验用手动时钟推进超时：3个连接逻辑时刻到期。这不是现实的3秒。清DNS答案也不会魔法改写当前连接或已选地址，要重新访问才会用新查询结果。",
    ] },
    { type: "explain", title: "TLS与HTTP：接通，不等于可信或资源存在", body: [
      "HTTPS在可用TCP连接之上完成TLS身份与握手核验。目标身份来自URL主机名，不是随便一张证书。错误身份不能因为IP能通就被忽略；TLS成功也不保证某个资源路径存在。",
      "接着浏览器提交HTTP方法、路径和Headers。服务器处理的是**提交时的快照**；你还需要真正接收响应。200、404或400来自服务器对请求的实际处理，不是随机抽取的剧情卡。",
      "本课HTTP/1.1数据阶段按完整消息交换抽象，丢包控制集中在TCP握手；真实数据分段、ACK与重传见A14/A15。TLS仍是安全状态模型，不实现密码学。不要把这个教学范围说成完整浏览器或协议栈。",
    ] },
    { type: "explain", title: "显示页面，并用证据定位故障", body: [
      "只有接收了本次响应体，才能从它显示内容。404也可以显示真实错误页；看到错误页说明某些前面的阶段已经工作。HEAD或304没有正文，本模型又没有HTTP缓存副本，就不能凭空生成一个成功页面。",
      "旧DNS答案要检查缓存地址、期限和重新查询后的结果；握手丢包要检查两端状态、通道和到期重传；404要检查HTTP路径与实际响应。三种故障都可能表现为“打不开”，但修复动作不同。",
      "真实页面还会请求样式、脚本和图片，可能涉及CDN、连接复用和HTTP/2、HTTP/3。这里专注一份文档的可诊断链路，页面区仅预览虚构站点固定HTML文本，不执行JavaScript或模拟完整渲染树。",
    ] },
    { type: "sim", sim: "journey", mode: "free", title: "Web Journey Lab：网址到页面", intro: "输入完整网址，亲手处理DNS消息、TCP通道、TLS核验及HTTP交换，再从实际响应显示页面。试试未知域名、/missing、HEAD、错误证书或握手延迟；观察不同故障停在哪一层。正确页面示例为https://www.example.com/lesson。" },
    { type: "sim", sim: "journey", mode: "challenge", title: "综合挑战：三个“打不开”", intro: "先观察情景中的实际故障，再修复旧DNS答案、握手丢包、404路径三个问题。每个任务最后都必须完成正确DNS→双方TCP→已核验TLS→GET /lesson→实际200响应→页面显示，不能只按固定顺序点按钮。" },
    { type: "quiz", items: [
      { q: "已收到404错误页，最合理的下一步是什么？", options: ["修正资源路径并检查新响应", "把404当作DNS没有解析的证据", "反复跳过证书核验"], answer: 0, why: "真实HTTP错误页说明已收到资源层回答，应先检查路径；DNS缓存和TLS身份是不同层的问题。", wrongHints: { "1": "404来自服务器HTTP响应，不是DNS的不存在记录。", "2": "放弃身份检查既不能修好资源，也会破坏安全前提。" } },
      { q: "旧缓存地址没有本站服务，SYN重传几次后仍无回应，哪种动作能针对地址问题？", options: ["直接显示一个预制成功页面", "让答案失效后重新解析，并重新开始访问", "只把请求路径换成更短的文字"], answer: 1, why: "重传仍去相同旧地址；刷新解析结果后还要实际验证新地址能建立连接。", wrongHints: { "0": "页面必须来自真实收到的响应，预制成功会掩盖故障。", "2": "HTTP路径还没被服务器处理，换路径不能改变SYN发送到哪个IP。" } },
      { q: "TCP已建立、TLS已核验，但HTTP响应尚未到达。现在可以宣布页面内容已获得吗？", options: ["可以，连接就是页面", "可以，TLS会自动生成内容", "不可以，还要接收实际响应体并显示"], answer: 2, why: "连接与安全状态是前提，不等于应用响应和页面内容已经收到。", wrongHints: { "0": "TCP连接只提供通信能力，不携带预定网页内容。", "1": "TLS保护数据，不替服务器创作或返回HTTP资源。" } },
    ] },
    { type: "transfer", prompt: "解析器在t=0缓存www.example.com的答案，有效到t=5（t=5即失效）；.com与example.com区指引仍有效。t=2和t=5各访问一次：HTTP第一次返回404，第二次返回200，其他缓存不变。这两次访问合计需要向外部DNS服务器查询几次？", answer: 1, hint: "404不会使DNS缓存失效；到期时答案要重新问，但已知区指引还在，需再问根和TLD吗？", why: "t=2命中答案，外询0次；t=5答案到期，利用仍有效的区指引只问权威服务器1次，总计1次。HTTP状态与DNS缓存期限不能混算。" },
    { type: "summary", points: ["URL、DNS、TCP、TLS、HTTP和页面显示各有自己的输入与完成条件，前一阶段成功不等于整个访问成功。", "按地址/缓存、两端连接状态、身份核验、请求与响应分层诊断，故障证据决定修复动作。", "页面应来自本次实际收到的响应体；缓存、重传和改路径要真正改变状态，不能用预制动画代替。"], next: "a18-passwords" },
  ],
  sources: [{ title: "RFC 1034：DNS Concepts and Facilities", url: "https://www.rfc-editor.org/rfc/rfc1034" }, { title: "RFC 1035：DNS Implementation and Specification", url: "https://www.rfc-editor.org/rfc/rfc1035" }, { title: "RFC 9293：TCP状态机", url: "https://www.rfc-editor.org/rfc/rfc9293" }, { title: "RFC 8446：TLS1.3", url: "https://www.rfc-editor.org/rfc/rfc8446" }, { title: "RFC 9110：HTTP Semantics", url: "https://www.rfc-editor.org/rfc/rfc9110" }], quality: { state: "draft" },
});
