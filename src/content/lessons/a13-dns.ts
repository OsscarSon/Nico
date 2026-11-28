import { lessonSchema, type Lesson } from "../schema";

/** A13。状态为 draft：没有真实学习者试学记录，来源尚未补齐。暂无课头插图。 */
export const a13: Lesson = lessonSchema.parse({
  id: "a13-dns",
  track: "a",
  unit: "a3",
  art: "lesson-a13-dns.png",
  title: "DNS：名字怎么变成地址",
  objectives: [
    "能说明 DNS 的作用：把域名翻译成 IP 地址",
    "能按顺序说出一次解析会问到谁：解析器、根服务器、TLD 服务器、权威服务器",
    "能解释缓存为什么让后面的查询更快，并判断一次查询要问几个服务器",
  ],
  prerequisites: ["a09-network-layers", "a10-ip-subnet"],
  estimatedMinutes: 10,
  blocks: [
    {
      type: "hook",
      text: "你输入的是 `www.example.com`，可网络上的设备只认 IP 地址。把名字翻译成地址的，是一个全球分工合作的\u201C电话簿\u201D：DNS。这一课，你要跟着一次查询，看它到底问了谁。",
    },
    {
      type: "explain",
      title: "名字 → 地址",
      body: [
        "人记名字，机器用 IP 地址。**DNS（域名系统）**负责把域名翻译成 IP 地址。",
        "域名是**从右往左**一层层管的：`www.example.com` 最右边的 `com` 最大，往左依次是 `example`、`www`。管理也是同样的层级：根 → `.com` → `example.com` → `www.example.com`。",
      ],
    },
    {
      type: "explain",
      title: "一次查询要问谁",
      body: [
        "你的设备先问一个叫**解析器**的帮手（通常由运营商或公共 DNS 提供）。它替你一站一站去问：",
        "先问**根服务器**：\u201C谁管 `.com`？\u201D根服务器不知道最终答案，但告诉它去问 `.com` 的服务器（**TLD 服务器**）。",
        "再问 TLD 服务器：\u201C谁管 `example.com`？\u201D它指向 `example.com` 自己的**权威服务器**。",
        "最后问权威服务器：\u201C`www.example.com` 的地址是什么？\u201D在本次无缓存、无别名的演练中，此时获得答案。前两步都只是\u201C该去问谁\u201D。",
      ],
    },
    {
      type: "explain",
      title: "缓存：问过的不用再问",
      body: [
        "解析器会把答案，以及\u201C该问谁\u201D的结果，暂时存起来，叫**缓存**。存多久由记录里的 **TTL** 决定，过期了就要重新问。",
        "所以第二次查同一个名字，几乎不用再问外面的服务器；就算查的是同一个域名下的另一个名字，也能跳过根服务器和 TLD 服务器，直接问权威服务器。",
      ],
      callout:
        "这里做了简化：真实解析还可能返回别名、IPv6 记录或不存在的结果。符合条件的否定结果也可按规则缓存。演示里的缓存不会自动过期。示例用的 `example.com` 和 `203.0.113.x` 是专门留给文档的名字和地址。",
    },
    {
      type: "sim",
      sim: "dns",
      mode: "free",
      title: "DNS 查询器：跟着一次查询走",
      intro:
        "点一个名字开始查询，再一步一步看解析器问了谁、对方怎么回答。查完之后，再查同一个名字，或同一个域名下的另一个名字，对比一下问了几个服务器。",
    },
    {
      type: "sim",
      sim: "dns",
      mode: "challenge",
      title: "挑战：这次要问几个服务器",
      intro:
        "连续 4 次查询，缓存会一直延续。每次先预测解析器要问几个服务器（根、TLD、权威各算 1 个），再看真实过程。",
    },
    {
      type: "quiz",
      items: [
        {
          q: "DNS 的主要作用是什么？",
          options: [
            "把域名翻译成 IP 地址",
            "加密网页里的内容",
            "让网页打开得更快",
            "给每台设备分配一个 IP 地址",
          ],
          answer: 0,
          why: "DNS 像一本分层管理的电话簿，把人好记的域名翻译成机器用的 IP 地址。",
          wrongHints: {
            "1": "加密是 HTTPS 的事。DNS 只负责把名字翻译成地址。",
            "2": "DNS 本身只是翻译地址。缓存能省掉重复的查询，但它不是用来提速的主要工具。",
            "3": "给设备分配 IP 地址是另一个协议（DHCP）的工作。DNS 是把名字翻译成已有的地址。",
          },
        },
        {
          q: "解析 `www.example.com` 时，根服务器会直接告诉解析器它的 IP 地址吗？",
          options: [
            "会，根服务器存着所有域名的地址",
            "不会，它只告诉解析器去问负责 .com 的服务器",
            "会，但要先去问 .com 服务器",
            "不会，它会直接拒绝这个请求",
          ],
          answer: 1,
          why: "根服务器只知道每个顶级域（.com、.org……）由谁管，它给出的是\u201C该去问谁\u201D，而不是最终答案。",
          wrongHints: {
            "0": "全世界的域名太多，根服务器不可能存所有地址。它只记顶级域由谁管。",
            "2": "根服务器不会替解析器去问别人，它只是告诉解析器下一站该问谁。",
            "3": "根服务器会正常回应，只是回应的内容是\u201C该去问 .com 服务器\u201D。",
          },
        },
        {
          q: "为什么第二次访问同一个网站，名字解析通常更快？",
          options: [
            "因为网站换了更快的服务器",
            "因为解析器把上次的结果缓存了一段时间",
            "因为根服务器记住了你的电脑",
            "因为 IP 地址变短了",
          ],
          answer: 1,
          why: "解析器把答案和\u201C该问谁\u201D都存进了缓存，缓存没过期（TTL）之前，不用再问外面的服务器。",
          wrongHints: {
            "0": "解析更快和网站服务器的速度无关，是解析器自己缓存了答案。",
            "2": "根服务器不记得单个用户，它只记顶级域由谁管。",
            "3": "IP 地址不会变短，IPv4 地址永远是 32 位。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt:
        "解析器的缓存一开始是空的。先解析 `www.example.com`，再解析 `mail.example.com`。在这两次解析里，根服务器一共被问了几次？",
      answer: 1,
      hint: "第一次查询之后，解析器已经知道谁管 .com 和 example.com。第二次还需要问根服务器吗？",
      why: "第一次要问根服务器，之后缓存里已经有 .com 和 example.com 归谁管，所以查 mail.example.com 时直接问权威服务器，不用再问根。根服务器一共只被问了 1 次。",
    },
    {
      type: "summary",
      points: [
        "DNS 把域名翻译成 IP 地址，域名从右往左一层层由不同的服务器管。",
        "在本课的冷缓存演练里，解析器依次问根、TLD、权威服务器；前两步回答\u201C该去问谁\u201D，只有权威服务器给出最终答案。",
        "缓存把答案和\u201C该问谁\u201D存起来，让后面的查询少问甚至不问服务器，直到 TTL 过期。",
      ],
      next: "a14-tcp",
    },
  ],
  sources: [
    { title: "RFC 1034 · Domain Names: Concepts and Facilities", url: "https://www.rfc-editor.org/rfc/rfc1034" },
    { title: "RFC 2308 · Negative Caching of DNS Queries", url: "https://www.rfc-editor.org/rfc/rfc2308" },
  ],
  quality: { state: "draft" },
});
