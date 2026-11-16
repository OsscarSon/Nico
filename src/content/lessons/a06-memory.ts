import { lessonSchema, type Lesson } from "../schema";

export const a06: Lesson = lessonSchema.parse({
  id: "a06-memory", track: "a", unit: "a2", title: "内存与存储：为什么要分层", art: "lesson-a06-memory-layers.png",
  objectives: ["能区分缓存、RAM 与持久存储的作用", "能预测未保存修改在断电后的结果", "能通过操作解释缓存命中与容量取舍"],
  prerequisites: ["a05-cpu-cycle"], estimatedMinutes: 12,
  blocks: [
    { type: "hook", text: "你写好一段笔记，却在保存前断电。重开文档，刚才的修改不见了；以前保存的内容还在。同样是电脑里的数据，为什么命运不同？" },
    { type: "explain", title: "RAM 是工作台，存储是档案柜", body: [
      "**RAM（随机存取内存）**暂时放正在使用的程序和数据。A05 里的 CPU 从内存取指令，也会把结果写回内存。这里的 RAM 通常断电就会丢失内容。",
      "SSD、硬盘等**持久存储**容量较大，断电后仍能保留已经成功写入的数据。打开文档时，程序把需要的内容加载进 RAM；编辑先改变工作副本。",
      "**保存**让工作副本的内容写入持久存储。关闭程序、增加 RAM 或多读几次，都不能代替保存。真实软件可能自动保存，但必须确认保存成功。",
    ] },
    { type: "explain", title: "缓存减少等待，不增加永久副本", body: [
      "CPU 很快，但访问 RAM 仍需要等待。**Cache（缓存）**把近期需要的一小部分内容放在更靠近 CPU 的位置：找到就是**命中**，找不到就是**未命中**，需要到下一层取。",
      "CPU 缓存通常比 RAM 更快、更小；RAM 比 SSD/硬盘更适合频繁的工作访问，但单位容量成本更高。分层是在速度、容量与成本间取舍，不是把全部数据放在最贵的地方。",
      "CPU 缓存通常也是易失的。读到了缓存，不等于文档已经保存到 SSD。网页缓存、磁盘缓存等也叫缓存，但位置和机制可能不同，不要把它们都当成同一块硬件。",
    ], callout: "本实验只表示一个文档、一个 RAM 副本和一个缓存项。写 RAM 时使缓存失效；保存立即成功，断电清空 RAM/缓存。真实系统有缓存一致性、写缓冲、文件系统同步与断电保护，保存不总是瞬间落盘。" },
    { type: "explain", title: "容量不够与速度慢是两件事", body: [
      "RAM 容量决定能同时容纳多少工作数据。假设有 8 GiB，已经占了 5 GiB，剩余只有 3 GiB；再来一个需要 4 GiB 的任务，就放不下。",
      "操作系统有时把部分数据换到存储设备，叫**交换（swap）**。它能缓解容量压力，但访问存储通常更慢，不等于凭空增加同速 RAM。",
      "读数据遇到缓存未命中不表示程序出错；它只是需要往下一层取。判断电脑瓶颈时要区分容量不足、CPU 工作和存储等待。",
    ] },
    { type: "sim", sim: "memory", mode: "free", title: "实验：修改、保存与断电", intro: "先打开文档，改为修改稿，不保存就断电重启，再打开。然后重试一次，这次先保存。比较三个层里的内容；连续点两次读取，观察命中。" },
    { type: "sim", sim: "memory", mode: "challenge", title: "挑战：让修改经得起重启", intro: "从原稿开始：修改并保存，断电重启后恢复修改稿，再连续读取观察缓存命中。只有完成任务清单才能继续。" },
    { type: "quiz", items: [
      { q: "文档只在 RAM 中修改，未保存就断电。重启后打开最可能看到什么？", options: ["修改稿一定还在", "上次成功保存的原稿", "缓存自动永久保存"], answer: 1, why: "RAM 的修改副本随断电丢失，持久存储仍是上次保存的内容。", wrongHints: { "0": "本题没有自动保存；修改 RAM 不会自动改写持久存储。", "2": "这里的 CPU 缓存是易失的，也不能代替保存。" } },
      { q: "缓存命中意味着什么？", options: ["所需内容已经在缓存里", "数据已经保存到 SSD", "RAM 容量自动增加"], answer: 0, why: "命中表示能从缓存读取所需内容，减少访问下一层的等待。", wrongHints: { "1": "命中说的是读取位置，不是文档保存状态。", "2": "缓存只是保存部分副本，不会增加 RAM 的容量。" } },
      { q: "为什么不把全部数据都放进 CPU 缓存？", options: ["缓存不能放数据", "RAM 断电不会丢失", "速度、容量与成本需要取舍"], answer: 2, why: "越靠近 CPU 的高速层通常越小、单位容量成本越高，分层才能兼顾速度和容量。", wrongHints: { "0": "缓存正是保存近期可能用到的数据副本。", "1": "普通 RAM 仍是易失的；分层的理由还包括速度和成本。" } },
    ] },
    { type: "transfer", prompt: "一台电脑有 8 GiB RAM，已有任务占用 5 GiB，新任务需要额外 4 GiB。不考虑交换、压缩或释放旧任务，至少还缺多少 GiB RAM？只填整数。", answer: 1, hint: "先计算剩余 RAM，再与新任务需求比较。", why: "可用 8−5=3 GiB，新任务需要 4 GiB，所以还缺 1 GiB。" },
    { type: "summary", points: ["RAM 放工作副本；成功保存到持久存储的内容才有机会经受断电。", "缓存命中减少访问下一层的等待，不等于永久保存。", "缓存、RAM、SSD/硬盘用速度、容量和成本的取舍组成层次。"], next: "a07-os" },
  ],
  sources: [{ title: "OSTEP：Address Spaces（内存地址空间）", url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf" }, { title: "OSTEP：Files and Directories（持久存储与保存）", url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf" }],
  quality: { state: "draft" },
});
