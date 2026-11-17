import { lessonSchema, type Lesson } from "../schema";
export const b17: Lesson = lessonSchema.parse({
  id: "b17-pages", track: "b", unit: "b3", title: "发布一个静态网页", artPending: true,
  objectives: ["能检查HTML/CSS/JS入口及引用并区分源码与构建产物", "能选择正确发布目录并解释项目子路径中的相对URL", "能排查入口404、资源404和大小写错误，实际验证发布页面的样式与脚本"], prerequisites: ["b12-events", "b16-github"], estimatedMinutes: 15, quality: { state: "draft" },
  blocks: [
    { type: "hook", text: "你把社团网页“发布”了，发给朋友却只看见404；改好后有标题，却没样式，按钮也不动。本机打开明明好好的，为什么？今天不靠“部署成功”的绿色字样，而是沿着真实访问路径找到发布的到底是什么。" },
    { type: "explain", title: "静态站点：交付文件，而不是你的编辑器", body: ["静态站点把HTML、CSS、JavaScript等文件交给浏览器。静态不等于不能互动：浏览器里的JS仍能响应事件、改DOM、请求API；只是站点本身不在服务器执行你的Python或数据库逻辑。", "先检查小写`index.html`入口、样式和脚本文件。HTML引用的名字必须与产物中的名字对应，不要把密码、Token或私有数据打包进公开站点。真实GitHub Pages还有仓库可见性、权限、使用限制等规则。", "这次文件都在src目录；纯文件网站可以直接发布一个包含入口的目录。本课另设复制型构建，把src里的文件原样输出到dist，帮助你分清“正在编辑的源码”与“交付的文件”。并不是所有网站都必须npm build。" ] },
    { type: "explain", title: "构建、部署、访问，三件不同的事", body: ["构建生成一个产物快照；部署把选定目录的文件复制成站点快照；访问再从这个快照查找URL。源目录、构建输出目录、发布目录不是同一个词。发布错目录，即使里面有很多文件，也可能没有入口index.html。", "在本课，src/index.html经构建成为dist/index.html。发布dist后，站点根入口对应的是dist里面的index.html，不是`/club/dist/index.html`。如果发布项目根目录`.`，浏览器在`/club/`下找不到根入口。", "修改源文件不会魔法般改掉旧站点。需要重新检查、构建、部署、访问，才能证明新版本到了站点。真实构建器可能会压缩、改写文件名、打包依赖；本实验只复制，不假装实现Vite或Jekyll。" ] },
    { type: "explain", title: "相对路径：从哪个地址出发", body: ["假设项目部署在`https://pages.example.invalid/club/`。HTML中的`./style.css`从当前页面所在目录解析为`/club/style.css`；而`/style.css`从域名根出发，指向`https://pages.example.invalid/style.css`，不在这个项目目录里。", "同一个相对引用放在嵌套页中，出发点可能改变，所以要在实际部署地址验证，不能只在本机文件夹里猜。完整URL、根绝对路径、相对路径各有用途，没有一种写法适合所有站点；本课选择相对路径以适应项目子路径。", "本模拟文件服务器区分大小写：app.js与App.js是两个名字。有些本机文件系统会掩盖这个错误，真实托管环境未必如此。URL查询参数不是文件名的一部分，但路径层级与大小写确实影响查找。" ] },
    { type: "explain", title: "验收不是只看首页200", body: ["入口404：先检查发布目录与index.html。入口200但没样式：查看样式请求的实际URL和状态。没有脚本效果：检查脚本文件是否404、大小写是否一致，再检查JS运行错误和选择器。", "本实验会列出每个解析后的资源URL，并在原隔离沙盒中运行发布快照的HTML/CSS/JS。标题必须实际变成蓝色，脚本必须把页面文字改为“来自已发布的 JS”；没有加载的文件不会靠动画假装成功。", "这里没有真实互联网部署，也没有GitHub登录、DNS、HTTPS签发、Actions队列或缓存。保留域名只标记模拟地址。HTML资源解析只支持常见字面量stylesheet和script引用，预览移除内联事件/额外脚本，JS走原有循环保护；复杂模块、打包配置、服务端路由不在本课模型里。" ] },
    { type: "sim", sim: "deployment-lab", mode: "free", title: "静态网页发布实验室", intro: "从三个真实文件开始；检查、构建、部署再访问。试着编辑标题但不重新部署，观察站点仍是旧快照；再改路径或JS，查看具体错误。" },
    { type: "sim", sim: "deployment-lab", mode: "challenge", title: "挑战：修好三次发布故障", intro: "先观察入口/资源404，再修复目录、相对路径、文件大小写。每次都需重建发布，并在实际隔离预览中验证标题、CSS与JS结果，才能进入下一任务。" },
    { type: "quiz", items: [
      { q: "src/index.html已改好，但站点仍是旧版本。下一步最合理的是？", options: ["检查后重新构建、部署正确产物，再访问验证", "只要保存源码，所有站点都会自动变化", "删除浏览器就能更新服务器文件", "把源码文件名改成任何名字都行"], answer: 0, why: "本课发布的是独立快照，源码编辑与站点更新之间还有构建/部署步骤。", wrongHints: { "1": "只有额外配置了自动部署才可能触发流水线，不能假设保存即发布。", "2": "清本机数据不会改变服务器发布快照。", "3": "入口和引用有明确名字要求，任意改名反而可能404。" } },
      { q: "页面在/club/，希望加载同目录style.css，哪种写法适合本次项目？", options: ["./style.css", "/style.css", "C:\\my-site\\style.css", "路径怎么写都由浏览器自动纠正"], answer: 0, why: "相对路径从当前页面目录解析，得到/club/style.css。", wrongHints: { "1": "斜杠开头从域名根出发，会绕过/club/。", "2": "朋友的浏览器无法读取你电脑的盘符路径。", "3": "浏览器按URL规则解析，不知道你心里想找哪个文件。" } },
      { q: "模拟部署记录已生成，首页也200，能据此宣布整个站点正常吗？", options: ["不能，还需检查资源请求及实际样式/脚本效果", "能，HTTP200保证所有JS都正确", "能，部署按钮点击过就算通过", "不能，因为静态站点不允许任何JavaScript"], answer: 0, why: "HTML能返回不代表CSS/JS存在或运行正确；需要检查页面真实结果。", wrongHints: { "1": "200仅针对那一个请求，不会验证脚本逻辑。", "2": "操作次数不是交付结果，必须访问验证。", "3": "静态站点可以交付在浏览器运行的JavaScript。" } },
    ] },
    { type: "transfer", prompt: "页面在/club/，发布目录里只有index.html、style.css、app.js（区分大小写）。页面依次请求/style.css、./app.js、./Style.css、./index.html。按本实验的项目子路径规则，几次请求会404？", answer: 2, why: "根绝对/style.css不在/club/下，./Style.css大小写不匹配；另外两次分别找到app.js和index.html。", hint: "先写出每个完整URL，再逐个比较站点路径与文件名。" },
    { type: "summary", points: ["源码、构建产物与发布快照分开检查；静态站点可以有浏览器JS互动。", "发布目录需含入口；相对路径按页面地址解析，项目子路径和大小写都重要。", "访问入口、资源和实际运行效果才算验证；本课模拟成功不等于真实互联网部署。"], next: "b18-project-page" },
  ],
  sources: [{ title: "GitHub Docs：About GitHub Pages", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages" }, { title: "GitHub Docs：Configuring a publishing source", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site" }, { title: "MDN：Resolving relative references to a URL", url: "https://developer.mozilla.org/en-US/docs/Web/API/URL_API/Resolving_relative_references" }],
});
