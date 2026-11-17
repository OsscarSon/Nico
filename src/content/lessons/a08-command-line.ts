import { lessonSchema, type Lesson } from "../schema";

export const a08: Lesson = lessonSchema.parse({
  id: "a08-command-line", track: "a", unit: "a2", title: "命令行基础：在目录中找到方向", art: "lesson-a08-command-line.png",
  objectives: ["能用 pwd、ls、cd 确认位置并导航", "能区分相对路径、绝对路径、. 与 ..", "能在虚拟终端新建目录、复制并读取文件，读懂错误反馈"],
  prerequisites: ["a07-os"], estimatedMinutes: 12,
  blocks: [
    { type: "hook", text: "图形界面靠点文件夹，命令行靠输入一句明确的请求。两者都需要知道你在哪个目录、想操作哪个文件。这一课先在虚拟文件系统里练习，每次只执行一条支持的命令。" },
    { type: "explain", title: "命令、参数与当前目录", body: [
      "**终端（terminal）**是输入文字、查看输出的界面；真实电脑上通常由 **Shell（命令解释器）**解析命令。命令名后面可跟参数，比如 `cat README.txt`：cat 是命令，文件名是参数。",
      "**当前目录（working directory）**是相对路径的起点。`pwd` 显示当前位置，`ls` 列出当前目录内容，`cd projects` 进入 projects 子目录。cd 改变位置，不会复制或删除文件。",
      "本课从 `/home/nico` 开始。先输入 `pwd`，再输入 `ls`，你会看到 `README.txt` 和 `projects/`。名字区分大小写；`README.txt` 和 `readme.txt` 不同。",
    ] },
    { type: "explain", title: "路径是从哪里出发的路线", body: [
      "**绝对路径**以 `/` 开头，从虚拟根目录出发，例如 `/home/nico/README.txt`；**相对路径**从当前目录出发，例如 `projects`。路径正确与否要结合当前位置。",
      "`.` 表示当前目录，`..` 表示上一级。进入 projects 后，`cd ..` 会回到 `/home/nico`；`cd /home/nico` 则不受当前位置影响。",
      "名字带空格时可以用成对引号：`mkdir \"my notes\"`、`cd \"my notes\"`。不要把提示符 `$` 一起输入；它表示可以开始输入，不是命令的一部分。",
    ] },
    { type: "explain", title: "创建、复制与查看", body: [
      "`mkdir practice` 创建目录；`touch empty.txt` 创建空文件，在本模型中碰到已有文件不会改变内容；`cat README.txt` 显示文件内容，不改变当前目录。",
      "`cp README.txt practice/note.txt` 将源文件复制到新路径；源文件保留。practice 必须已经存在。本模型拒绝覆盖已有目标；真实 cp 在某些选项下会覆盖，因此不能把实验的保护当成系统保证。",
      "看到“文件不存在”先用 pwd 和 ls 核对位置、大小写与父目录。看到“权限拒绝”先确认操作范围，不应盲目提权。错误输出是诊断线索，不代表整台电脑坏了。",
    ], callout: "这是 POSIX 风格的教学模拟，不是真实 Shell。只支持 help、pwd、ls、cd、mkdir、touch、cat、cp；只在 /home/nico 内创建内容。不支持 rm、sudo、通配符、脚本、管道、重定向、环境变量或真实命令执行。重置只重置实验。" },
    { type: "sim", sim: "terminal", mode: "free", title: "实验：用命令探索文件", intro: "依次试 pwd、ls、cat README.txt、cd projects、pwd、cd ..。再新建一个目录与空文件。故意输入不存在的路径，使用错误信息定位原因。help 可以随时查看命令范围。" },
    { type: "sim", sim: "terminal", mode: "challenge", title: "挑战：整理一份笔记副本", intro: "在 /home/nico 下创建 practice 目录，把 README.txt 复制为 practice/note.txt，进入 practice 并用 cat 读取 note.txt。命令可采用相对或绝对路径；按实际文件与阅读结果判定。" },
    { type: "quiz", items: [
      { q: "当前目录是 /home/nico/projects。哪个命令只显示位置，不改变它？", options: ["cd ..", "mkdir demo", "pwd"], answer: 2, why: "pwd 显示当前目录；cd 会改变位置，mkdir 会创建目录。", wrongHints: { "0": "cd .. 会回到上一级，位置已经改变。", "1": "mkdir 创建目录，不是查询当前位置。" } },
      { q: "在 /home/nico/projects 输入 cat ../README.txt，会从哪里读取？", options: ["/home/nico/README.txt", "/README.txt", "/home/nico/projects/README.txt"], answer: 0, why: ".. 先回到 /home/nico，再查找 README.txt。", wrongHints: { "1": ".. 只回一级，不是直接回到根目录。", "2": "相对路径里的 .. 会先离开 projects 这一层。" } },
      { q: "cp 源文件 新目标成功后，源文件怎样？", options: ["被移动走了", "仍然存在，目标得到一份副本", "变成空文件"], answer: 1, why: "cp 表示复制，源文件内容与位置保留。", wrongHints: { "0": "复制不同于移动。cp 不会移走源文件。", "2": "复制读取源文件，不会清空它。" } },
    ] },
    { type: "transfer", prompt: "当前目录是 /home/nico/projects/demo。每次只执行 cd ..，至少需要执行几次才能回到 /home/nico？只填次数。", answer: 2, hint: "一次去掉路径末尾的一级目录，先离开 demo，再离开 projects。", why: "第一次到 /home/nico/projects，第二次到 /home/nico，共 2 次。" },
    { type: "summary", points: ["先用 pwd 和 ls 确认位置与名字，再操作文件。", "绝对路径从 / 出发，相对路径从当前目录出发；.. 表示上一级。", "mkdir 创建目录，cp 复制，cat 读取；结合错误信息检查路径与权限。"], next: "a09-network-layers" },
  ],
  sources: [{ title: "GNU Coreutils：cp 手册", url: "https://man7.org/linux/man-pages/man1/cp.1.html" }, { title: "GNU Coreutils：ls 手册", url: "https://man7.org/linux/man-pages/man1/ls.1.html" }, { title: "POSIX.1-2024：cd", url: "https://pubs.opengroup.org/onlinepubs/9799919799/utilities/cd.html" }],
  quality: { state: "draft" },
});
