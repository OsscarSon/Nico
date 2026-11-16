import { lessonSchema, type Lesson } from "../schema";

/** B15。状态为 draft：没有真实学习者试学记录。Git 互动是简化的模拟（见 src/grading/git.ts）。 */
export const b15: Lesson = lessonSchema.parse({
  id: "b15-git-branches",
  track: "b",
  unit: "b3",
  title: "分支与合并",
  art: "lesson-b10-git-branches.png",
  objectives: [
    "能解释分支是什么，以及为什么要在分支上做新功能",
    "能用 git branch、git switch 创建并切换分支",
    "能用 git merge 把分支合并回 main",
  ],
  prerequisites: ["b14-git-basics"],
  estimatedMinutes: 12,
  blocks: [
    {
      type: "hook",
      text: "你想给网页加一个新样式，但又怕改坏了现在能用的版本。办法：开一条「平行的时间线」，在上面随便折腾；满意了再并回来，不满意就丢掉。这条时间线，就叫分支。",
    },
    {
      type: "explain",
      title: "分支：一条独立的历史",
      body: [
        "默认的分支叫 **main**。`git branch feature` 在现在这个位置新建一条叫 feature 的分支；`git switch feature` 切换过去。切换后，你做的提交只记在 feature 上，main 原封不动。",
        "切回 `git switch main`，工作区里的文件会变回 main 的样子：feature 上新建的文件会「消失」，因为它们只属于那条分支。切回去又会出现。",
        "`git switch -c feature` 等于「新建并切换」，一步完成。",
      ],
      callout: "切换分支之前，先把当前的修改提交（或者 add 后提交）。有还没提交的修改时，这个模拟会拒绝切换，免得弄丢它们。",
    },
    {
      type: "explain",
      title: "合并：把成果带回来",
      body: [
        "`git merge feature` 要在 **main** 上敲：意思是「把 feature 的成果并进我现在所在的分支」。",
        "如果 main 在你开分支之后没有新提交，Git 只需把 main 的指针往前挪，叫 **Fast-forward**。如果两边都有新提交，Git 会自动把两边的改动合在一起，生成一个有两个「父亲」的**合并提交**。",
        "如果两边改了**同一个文件的同一处**，Git 不知道听谁的，这叫**冲突**，需要你手动选。这个模拟不处理冲突，真实使用时遇到再学。",
      ],
    },
    {
      type: "sim",
      sim: "git",
      mode: "free",
      title: "分支和合并（模拟）",
      intro: "仓库里已经有一次提交。试试：git switch -c feature → new style.css → git add style.css → commit → git switch main → ls（style.css 不见了）→ git merge feature → ls（回来了）。",
      git: {
        files: { "index.html": "v1" },
        committed: true,
        chips: ["git status", "git branch", "git switch -c feature", "git switch main", "git merge feature", "new style.css", "edit index.html", "git add .", 'git commit -m "说明"', "git log --oneline", "ls"],
      },
    },
    {
      type: "sim",
      sim: "git",
      mode: "challenge",
      title: "挑战：做功能再合并（模拟）",
      intro: "在 feature 分支上新建 style.css 并提交；回到 main 改一下 index.html 并提交；最后把 feature 合并进 main。结束时你应该在 main 上，工作区干净。",
      git: {
        files: { "index.html": "v1" },
        committed: true,
        chips: ["git switch -c feature", "git switch main", "git merge feature", "new style.css", "edit index.html", "git add .", 'git commit -m "说明"', "git log --oneline", "git status"],
        goals: [
          { kind: "branchExists", label: "有一个叫 feature 的分支", branch: "feature" },
          { kind: "fileOnBranch", label: "feature 上有 style.css", branch: "feature", file: "style.css" },
          { kind: "merged", label: "feature 已经合并进 main", branch: "feature", into: "main" },
          { kind: "fileOnBranch", label: "main 上现在也有 style.css", branch: "main", file: "style.css" },
          { kind: "commitCount", label: "main 的历史里有 4 条提交（含合并提交）", branch: "main", min: 4 },
          { kind: "onBranch", label: "你现在在 main 上", branch: "main" },
          { kind: "clean", label: "工作区是干净的" },
        ],
        solution: [
          "git switch -c feature",
          "new style.css",
          "git add style.css",
          'git commit -m "add css"',
          "git switch main",
          "edit index.html",
          "git add index.html",
          'git commit -m "update title"',
          "git merge feature",
        ],
      },
    },
    {
      type: "quiz",
      items: [
        {
          q: "想把 feature 分支的成果合并进 main，应该先做什么？",
          options: ["先切换到 main，再 git merge feature", "留在 feature，再 git merge main", "直接 git merge，不用管在哪个分支", "删掉 feature 分支"],
          answer: 0,
          why: "merge 总是把「别的分支」并进「你现在所在的分支」。要并进 main，就得先站在 main 上。",
          wrongHints: {
            "1": "那是把 main 并进 feature，方向反了。",
            "2": "必须说明要合并哪个分支，而且位置很重要。",
            "3": "删掉分支会丢掉那条线上的成果（如果还没合并）。",
          },
        },
        {
          q: "你在 feature 上新建并提交了 style.css，然后 git switch main。工作区里的 style.css 会怎样？",
          options: ["看不到了，因为它只属于 feature 分支", "还在，分支不影响文件", "被永久删除", "变成未跟踪文件"],
          answer: 0,
          why: "切换分支会把工作区换成那条分支的快照。style.css 没在 main 的历史里，所以暂时消失；切回 feature 它就回来了，没有丢。",
          wrongHints: {
            "1": "分支正是用来隔离文件和改动的，切换后工作区会跟着变。",
            "2": "没有被删除，它仍然安全地保存在 feature 的提交里。",
            "3": "它已经提交过，不是未跟踪文件，只是不在 main 的快照里。",
          },
        },
        {
          q: "Fast-forward（快进）合并发生在什么时候？",
          options: ["main 在分出分支后没有任何新提交", "两边改了同一个文件", "分支名相同", "没有提交的时候"],
          answer: 0,
          why: "main 没有新提交时，feature 的历史就是 main 历史的直接延长，Git 只要把 main 指针往前移，不需要新的合并提交。",
          wrongHints: {
            "1": "那是冲突，需要手动解决。",
            "2": "分支名不能重复，这和快进无关。",
            "3": "没有提交就没有东西可合并。",
          },
        },
      ],
    },
    {
      type: "transfer",
      prompt: "main 上有 3 次提交。你从 main 开出 feature，在 feature 上又提交了 2 次，一直没有回到 main。这时 main 上有几次提交？",
      answer: 3,
      why: "feature 上的提交只记在 feature 上。没合并之前，main 的历史还是原来的 3 次。",
      hint: "提交记在「当时所在的分支」上。",
    },
    {
      type: "summary",
      points: [
        "分支是一条独立的历史：`git switch -c 名字` 新建并切换，提交只记在当前分支上。",
        "`git merge 分支名` 要站在**接收方**（通常是 main）上敲。",
        "两边都有新提交会生成合并提交；改了同一处会冲突，需要手动解决。",
      ],
      next: "b16-github",
    },
  ],
  sources: [
    { title: "Pro Git（中文版）：Git 分支 - 分支简介", url: "https://git-scm.com/book/zh/v2/Git-分支-分支简介" },
    { title: "Pro Git（中文版）：分支的新建与合并", url: "https://git-scm.com/book/zh/v2/Git-分支-分支的新建与合并" },
  ],
  quality: { state: "draft" },
});
