import { lessonSchema, type Lesson } from "../schema";
export const a16: Lesson = lessonSchema.parse({
  id: "a16-http-https", track: "a", unit: "a3", title: "HTTP / HTTPS：请求、响应与可信连接", art: "lesson-a16-http-https.png",
  objectives: ["能构造方法、路径、Headers和请求体并诊断实际HTTP响应", "能区分HTTP、TLS与TCP的工作", "能操作TLS身份与握手完整性核验，拒绝不符合条件的安全会话"],
  prerequisites: ["a09-network-layers", "a14-tcp", "a15-udp"], estimatedMinutes: 15,
  blocks: [
    { type: "hook", text: "你去图书馆借书，馆员说“找不到这本”，不等于图书馆失联了。若来接待的其实是假馆员，就算回答得再快也不能放心。网站里的404和证书错误也是两类问题：今天你既写借书单，也核对接待者身份。" },
    { type: "explain", title: "HTTP：把请求写成双方读得懂的单子", body: [
      "**HTTP**是应用层的请求/响应语义。请求里有**方法**（想做什么）、**路径**（对哪个资源）、**Headers**（附加说明），有时还有请求体。它不负责把域名变成IP，也不替代TCP连接。",
      "GET请求取得资源表示；HEAD像GET，但响应不发送正文，常用来查看元信息；POST把内容交给资源处理，可能创建记录。方法能否使用，要看该资源允许什么，不是每个路径都接受全部方法。",
      "本课HTTP/1.1用Host说明目标主机，Content-Type说明请求体是什么格式，Accept表达期望的响应格式。Headers名不区分大小写。对/api/note提交JSON时，方法、媒体类型和实际JSON内容要互相匹配。",
    ] },
    { type: "explain", title: "状态码：服务器在回答什么问题", body: [
      "200表示请求成功处理；201表示创建了资源；404表示服务器收到请求，但找不到这个资源。看到404，说明至少得到了HTTP回答，不能直接判定DNS没工作或网络完全断了。",
      "400可能是本实验缺少正确Host或JSON内容不合法；405表示资源不接受这个方法，Allow会列出支持的方法；415表示媒体类型不符合接口要求。按证据修正请求，比不断重连更有用。",
      "HEAD即使返回200并带Content-Length，也没有响应体；这个长度描述GET本会发送的表示长度。条件GET携带If-None-Match，ETag匹配时可返回304，表示可以使用已有副本；没有缓存副本时，304不会自动变出页面内容。",
    ] },
    { type: "explain", title: "HTTPS不是给HTTP贴一枚锁", body: [
      "本课选择**HTTP/1.1 → TLS1.3 → TCP → IP**这条教学链路：HTTP表达请求/响应，TCP提供可靠有序字节流，TLS协商密钥并保护通信，IP负责地址与转发。TCP握手和TLS握手是两回事。",
      "HTTPS使用经过正确建立的TLS会话保护HTTP内容，使方法、路径、Headers和正文不会作为明文应用数据暴露给被动网络观察者。IP/端口、流量特征，以及普通SNI中的域名等元数据仍可能可见；不是“什么都隐藏”。",
      "正确的身份核验把连接绑定到所请求的域名，不保证网站一定诚实、文章真实或业务已经成功。仅改网址前缀为https、仅协商出密钥，或者画一个锁，都不足以证明身份核验和握手完整性已完成。",
    ], callout: "这里限定HTTP/1.1 over TCP/TLS，不把它泛化为所有Web传输。HTTP/2、HTTP/3/QUIC等版本与优化不在模拟范围。" },
    { type: "explain", title: "TLS：协商、验身份、验完整性，再传应用数据", body: [
      "客户端ClientHello声明协商参数。TLS1.3服务器握手flight含ServerHello及后续身份/握手消息；在ServerHello后可派生握手密钥，但此时客户端还不能把“有密钥”当成“对方可信”。",
      "客户端要检查证书的目标域名、信任链和有效期，并验证握手签名与服务器Finished完整性证明。通过后再发送客户端Finished，服务器核验。本模型把这些状态分开，任一关键核验失败都不能发送HTTPS请求，必须重建会话解决问题。",
      "实验端点诊断能展示自己知道的明文，不代表网络旁观者也看得到。TLS界面只表达密钥与安全状态，不生成冒充真实加密的字符串。真正的密码学、证书链构建、会话恢复与0-RTT都比本模型复杂。",
    ], callout: "为看清依赖，本实验预设TCP已建立，并在客户端Finished完成且服务器核验后允许HTTP。服务器握手消息合并展示；这不是完整TLS实现，也不把此保守串行流程当作全部TLS1.3时序。" },
    { type: "sim", sim: "http", mode: "free", title: "Request / TLS Lab：你来写请求", intro: "尝试GET /lesson、HEAD、错误方法或路径；向/api/note发JSON。发送、服务器处理、接收响应分开操作，看看改输入是否会改写已发送快照。再切HTTPS，试试错误证书和握手证明，比较端点诊断与网络观察者视角。" },
    { type: "sim", sim: "http", mode: "challenge", title: "挑战：找对资源，也要认对服务器", intro: "实际观察并修复404、415；最后拒绝错误身份，重建正确TLS并接收受保护的200响应。每项按服务器真实状态和收到的响应判分，不靠固定点击次数。" },
    { type: "quiz", items: [
      { q: "HTTPS站点已返回404，最直接应该检查什么？", options: ["请求路径是否存在", "立刻认定DNS完全没返回地址", "跳过TLS证书核验"], answer: 0, why: "404是服务器对HTTP资源的回答，先定位路径和资源；它不是DNS失败的同义词。", wrongHints: { "1": "既然已收到HTTP响应，就不能用404证明前面完全没建立通信。", "2": "跳过身份验证既不能创建不存在的资源，也破坏安全前提。" } },
      { q: "TLS已模拟协商密钥，但服务器证书域名不匹配，接下来应怎样？", options: ["有密钥就继续发HTTP", "只把界面图标改成锁", "拒绝该会话并解决身份问题后重建"], answer: 2, why: "加密密钥不等于正确身份；必须把连接认证到请求的主机并核验握手完整性。", wrongHints: { "0": "与错误对象加密通信仍可能泄露信息，不能绕过身份核验。", "1": "图标不建立会话，也不验证任何证书或握手证明。" } },
      { q: "HEAD响应200且Content-Length: 1200，本次响应体有多少字节？", options: ["1200", "0", "取决于锁图标"], answer: 1, why: "HEAD不携带表示正文；长度描述GET本会发送的表示大小，不是本次实际正文。", wrongHints: { "0": "把表示的长度误当成本次发送的响应体长度了，HEAD有特殊语义。", "2": "响应体规则来自HTTP方法，与图标或是否TLS无关。" } },
    ] },
    { type: "transfer", prompt: "一个小工具依次取得：GET页面正文1200字节、GET图片正文800字节、HEAD另一资源（Content-Length为600）。三次都成功。不计Headers、TLS或其他协议开销，这三次实际接收到的响应体共多少字节？", answer: 2000, hint: "HEAD的Content-Length不意味着它发送了正文。先逐项列出实际响应体。", why: "1200+800+0=2000字节。HEAD带回元信息，不把那600字节正文传回来。" },
    { type: "summary", points: ["HTTP用方法、路径、Headers和请求体表达请求，状态码说明服务器如何处理；错误要按层定位。", "HEAD/304的空正文有明确语义；修改表单不等于改写已经发送的请求快照。", "HTTPS依赖TLS身份与握手完整性核验及密钥协商，不是锁图标；HTTP、TLS和TCP分别承担不同工作。"], next: "a17-web-journey" },
  ],
  sources: [{ title: "RFC 9110：HTTP Semantics", url: "https://www.rfc-editor.org/rfc/rfc9110" }, { title: "RFC 9112：HTTP/1.1", url: "https://www.rfc-editor.org/rfc/rfc9112" }, { title: "RFC 8446：TLS 1.3", url: "https://www.rfc-editor.org/rfc/rfc8446" }], quality: { state: "draft" },
});
