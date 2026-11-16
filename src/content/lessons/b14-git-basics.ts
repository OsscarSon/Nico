import { lessonSchema, type Lesson } from "../schema";

/** B14。状态为 draft：没有真实学习者试学记录。Git 互动是简化的模拟（见 src/grading/git.ts）。 */
export const b14: Lesson = lessonSchema.parse({
  id: "b14-git-basics",
  track: "b",
  unit: "b3",
  title: "Git 第一步：保存快照",
  objectives: [
    "能说清工作区、暂存区、提交（commit）三个地方的关系",
    "能用 git init、add、commit、status、log 完成一次完整的保存",
    "能看懂 git status 在说什么，并知道下一步该做什么",
  ],
  prerequisites: ["b08-html"],
  estimatedMinutes: 12,
  blocks: [
    {
      type: "hook",
      text: "写作业时你是不是存过「最终版」「最终版2」「真的最终版」？Git 就是替你做这件事的工具：每次你说「存一下」，它就拍一张整个项目的快照，以后随时能回到任何一张。",
    },
    {
      type: "explain",
      title: "三个地方：工作区、暂存区、提交",
      body: [
        "**工作区**是你平时改文件的地方。**暂存区**像一个购物篮：你挑出「这次要存的修改」放进去。**提交（commit）**是把篮子里的东西拍成一张快照，永久记在历史里，并附一句说明。",
        "为什么要分两步？因为你可能同时改了好几个文件，但只想把其中相关的几个存成一次提交。先 `git add` 挑，再 `git commit` 存。",
      ],
      callout: "提交不会改变你的文件，只是多记一张快照。每一次提交都有一个 7 位的编号和你写的说明。",
    },
    {
      type: "explain",
      title: "五条命令",
      body: [
        "`git init`：在当前文件夹开始用 Git（每个项目只做一次）。`git status`：看现在是什么状态（最常用，迷路了就敲它）。",
        "`git add 文件名`：把这个文件的当前内容放进暂存区；`git add .` 表示「所有改动都放进去」。`git commit -m \"说明\"`：拍快照，引号里写这次改了什么。`git log --oneline`：一行一条地看历史。",
        "下面的练习是**模拟**，不会碰你的电脑。里面多了两条模拟专用命令：`edit 文件名` 表示「我用编辑器改了这个文件」，`new 文件名` 表示「新建了一个文件」。",
      ],
    },
    {
      type: "sim",
      sim: "git",
      mode: "free",
      title: "自由试试 Git（模拟）",
      intro: "工作区里有一个 index.html。按顺序试：git status → git init → git status → git add index.html → git status → git commit。每一步之后看一眼 status 和上面三个区域怎么变。",
      git: {
        files: { "index.html": "v1" },
        committed: false,
        chips: ["git status", "git init", "git add .", 'git commit -m "第一次提交"', "git log --oneline", "edit index.html", "new style.css"],
      },
    },
    {
      type: "sim",
      sim: "git",
      mode: "challenge",
      title: "挑战：保存两张快照（模拟）",
      intro: "从零开始：开始用 Git，把 index.html 提交一次；然后改一下它，再提交第二次。最后工作区要是干净的。",
      git: {
        files: { "index.html": "v1" },
        committed: false,
        chips: ["git status", "git init", "git add .", 'git commit -m "说明"', "edit index.html", "git log --oneline"],
        goals: [
          { kind: "initialized", label: "已经 git init" },
          { kind: "commitCount", label: "main 上至少有 2 次提交", branch: "main", min: 2 },
          { kind: "fileOnBranch", label: "最新快照里有 index.html", branch: "main", file: "index.html" },
          { kind: "clean", label: "工作区是干净的（git status 没有待处理的东西）" },
        ],
        solution: ["git init", "git add .", 'git commit -m "first"', "edit index.html", "git add index.html", 'git commit -m "second"'],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "你改了 index.html，但还没有 git add。这时直接 git commit，会怎样？",
          options: ["没有东西可提交，什么也不会存", "改动被自动存进快照", "文件被删除", "Git 自己帮你 add 再提交"],
          answer: 0,
          why: "commit 只存暂存区里的东西。没 add，暂存区里没有这次的改动，所以没有东西可提交。",
          wrongHints: {
            "1": "不会自动存。必须先 git add，把改动放进暂存区。",
            "2": "提交不会删除任何文件。",
            "3": "Git 不会替你 add，这样你才能挑选每次提交里放什么。",
          },
        },
        {
          q: "git status 显示 index.html 在「Changes not staged for commit」下面，意思是？",
          options: ["改了，但还没 git add", "已经暂存，等着提交", "Git 还没在管这个文件", "文件已经提交了"],
          answer: 0,
          why: "not staged 就是「没放进暂存区」：文件被 Git 管着，也被改过，但这次改动还没 add。",
          wrongHints: {
            "1": "已暂存的会显示在「Changes to be committed」下面。",
            "2": "Git 还没在管的新文件显示在「Untracked files」下面。",
            "3": "已提交且没再改过的文件不会出现在 status 里。",
          },
        },
        {
          q: "commit 时的 -m 后面的引号里应该写什么？",
          options: ["这次改了什么的一句说明", "文件名", "你的密码", "上一次提交的编号"],
          answer: 0,
          why: "说明是写给以后的你（和队友）看的：翻历史时，靠它找到哪次改了什么。",
          wrongHints: {
            "1": "文件名放在 git add 后面，不是 -m 后面。",
            "2": "Git 提交不需要密码，别在说明里写私密信息。",
            "3": "编号是 Git 自动生成的。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "你已经 commit 过 2 次。然后改了文件并 git add，但还没有 commit。这时 git log --oneline 会显示几行？",
      answer: 2,
      why: "log 只列已经提交的快照。暂存区里的改动还没有拍成快照，所以仍然是 2 行。",
      hint: "log 显示的是「已经拍好的快照」。",
    },
    {
      type: "summary",
      points: [
        "改动要经过三个地方：工作区 → `git add` → 暂存区 → `git commit` → 历史。",
        "迷路时先 `git status`：它会告诉你有哪些改动、在哪个区、下一步做什么。",
        "提交说明写「改了什么」，以后翻历史就靠它。",
      ],
      next: "b15-git-branches",
    },
  ],
  sources: [
    { title: "Pro Git（中文版）：Git 基础 - 记录每次更新到仓库", url: "https://git-scm.com/book/zh/v2/Git-基础-记录每次更新到仓库" },
    { title: "Git 官方文档", url: "https://git-scm.com/docs" },
  ],
  quality: { state: "draft" },
});
