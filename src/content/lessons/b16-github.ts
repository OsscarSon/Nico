import { lessonSchema, type Lesson } from "../schema";
export const b16: Lesson = lessonSchema.parse({
  id: "b16-github", track: "b", unit: "b3", title: "GitHub：把代码放到网上", artPending: true,
  objectives: ["能区分Git、本地仓库、GitHub远程仓库及commit/push", "能用clone/pull同步提交并通过分支PR与审查协作", "能对照双方内容处理简单冲突，验证远程与本地最终版本一致"], prerequisites: ["b15-git-branches"], estimatedMinutes: 15, quality: { state: "draft" },
  blocks: [
    { type: "hook", text: "你对队友说：“我已经commit了，怎么你还看不到？”她也保存了联系方式，你保存了新标题。两个人手里的“最新版本”居然不一样！今天让两份历史真的相遇，而不是靠发“最终最终版.zip”碰运气。" },
    { type: "explain", title: "Git是工具，GitHub是托管与协作服务", body: ["Git负责记录提交和分支，离线也能使用。GitHub是托管Git仓库、讨论代码和审查PR的服务；Git不等于GitHub，还有其他托管服务，也可以自己运行远程仓库。", "本地仓库在你的设备上；远程仓库是另一份提交历史。commit把暂存内容记入本地历史，不会自动上传。push把本地分支缺少的提交传到远程并尝试更新远程分支；还没commit的工作区内容不会跟着上传。", "真实远程写入需要相应权限与认证。本课不要求Token，不使用你的账号，不连接任何真实仓库。把代码上传到GitHub也不等于把网页部署好了，下一课才研究发布产物。" ] },
    { type: "explain", title: "clone、fetch与pull：同步有方向", body: ["clone把远程仓库复制到本地，通常同时建立origin这个远程名称。之后远程变了，本地不会自己变：fetch取回远程的提交信息；pull通常再把所取内容整合到当前分支，具体方式取决于配置。", "本实验把Pull按钮明确简化为fetch origin/main后merge进当前分支。它不等于“用远程无条件覆盖本地”。先看当前分支和工作区，避免把改动带错地方；本模型要求先提交再pull。", "push也不是不问三七二十一地覆盖。如果远程分支已有本地历史不包含的新提交，非快进push会被拒绝。先理解差异并同步，不用强推抹掉队友工作。" ] },
    { type: "explain", title: "PR是一份提议，不是另一种commit", body: ["在feature分支修改、add、commit，然后push这个分支；Pull Request（PR）才有远程分支可以比较。PR把“希望将这个分支并到main”变成一份可讨论、可审查的提议。创建PR并不会自动合并，也不会上传未提交的文件。", "审查者要看实际差异：这次改了什么、有没有漏掉队友内容。之后又push了新代码，旧审查并不说明新代码被看过。本实验把审查绑定到当前head/base，变化后要重新看。真实保护规则可以按仓库配置。", "本实验中你轮流扮演作者和队友审查者，不是在真实GitHub上批准自己的PR。main在本实验设为受保护；真实仓库是否需要审批、检查通过、谁能合并，由权限和规则决定。" ] },
    { type: "explain", title: "冲突不是文件坏了，是需要你作决定", body: ["如果双方从共同祖先出发，分别改了同一处，Git可能无法自动决定保留哪一个。冲突不是谁写错了，也不是随机选一方覆盖；先读本地、远程以及原来共同版本的意图，再组合正确结果。", "本课按整文件作简化三方比较：标题改为“编程社”，队友增加联系方式。你要手动写出同时保留两项改动的文件，再完成双亲合并提交，push后重新审查与合并。“完成冲突解决”按钮在本实验合并代表暂存解决后的文件和创建合并提交，真实Git需执行add/commit。真实Git常按行合并，会显示冲突标记；还可能有文件删除/重命名等情况。", "合并发生在远程，不会立刻改你的本地main。切回本地main并pull，最后比较提交ID、文件内容与干净状态；“合并按钮点过了”不能证明你的设备已经更新。短提交ID、单一origin和单文件冲突都是教学简化，不是完整GitHub客户端。" ] },
    { type: "sim", sim: "github-lab", mode: "free", title: "GitHub协作实验室", intro: "先试commit但不push，观察远程不动；再试PR、队友更新、过期审查和冲突。每个操作都改变独立仓库状态，没有真实网络或Token。" },
    { type: "sim", sim: "github-lab", mode: "challenge", title: "挑战：把双方修改安全带回main", intro: "完成界面列出的协作情景。必须发生真实历史分歧并手动解决，远程文件同时保留标题和联系方式，经当前版本审查合并，最后本地main同步且干净。" },
    { type: "quiz", items: [
      { q: "本地已经commit，但还没有push。队友能从远程clone到这次新提交吗？", options: ["不能，这次提交还只在本地", "能，commit自动上传", "能，创建PR会自动上传工作区", "不能，因为Git只能在联网时commit"], answer: 0, why: "commit保存本地快照；push才尝试传输提交和更新远程引用。", wrongHints: { "1": "commit没有上传功能，必须另行push。", "2": "PR比较远程已有分支，不能代替add/commit/push。", "3": "Git能离线commit，不联网也能保存本地历史。" } },
      { q: "关于Git与GitHub，哪句话准确？", options: ["Git是版本控制工具，GitHub是可托管Git仓库的协作服务", "GitHub就是Git命令的全称", "不注册GitHub就无法使用Git", "代码放到GitHub后网页必然已公开发布"], answer: 0, why: "工具与服务不同；仓库托管和网站发布也是不同步骤。", wrongHints: { "1": "Git与GitHub不是同一个名称。", "2": "可以本地使用Git，也可以选择其他远程服务。", "3": "仓库中的源码不等于已经部署的可访问站点。" } },
      { q: "双方改了同一处而发生冲突，应该怎样处理？", options: ["对照双方意图，手动形成正确内容再提交并验证", "固定选远程，保证不出错", "删除所有提交再来", "强推把队友版本覆盖即可"], answer: 0, why: "冲突需要业务判断；Git无法替你决定哪种组合正确。解决后还要验证，不能只消除提示。", wrongHints: { "1": "远程也可能缺少你的有效修改，不能盲选一方。", "2": "历史没有坏，不需要把已有工作全删掉。", "3": "强推可能破坏协作历史，并不等于解决内容冲突。" } },
    ] },
    { type: "transfer", prompt: "一条顺序历史的feature分支本地有5个提交，远程同名分支已有其中前3个。没有分叉且无需计公共对象，这次快进push还需传出几个新的提交？", answer: 2, why: "第4、第5个提交在本地但远程没有；前3个已共享。push不是重新发送整个工作区，更不是只发送未commit文件。", hint: "把本地历史中远程还没有的部分圈出来。" },
    { type: "summary", points: ["Git管理历史，GitHub托管与协作；commit在本地，push才更新远程分支。", "clone取得仓库，pull取回并整合历史；PR提出合并，审查要对应当前真实差异。", "冲突靠理解双方意图来解决；合并后再同步本地并检查内容与状态。"], next: "b17-pages" },
  ],
  sources: [{ title: "Pro Git：Working with Remotes", url: "https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes" }, { title: "GitHub Docs：About pull requests", url: "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests" }, { title: "GitHub Docs：Resolving a merge conflict using the command line", url: "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line" }],
});
