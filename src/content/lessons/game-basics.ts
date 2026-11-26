import { lessonSchema, type Block, type Lesson, type QuizItem } from "../schema";

type Sim = "game-loop" | "game-coordinates" | "game-motion" | "game-input";
type GameLesson = Omit<Lesson, "track" | "unit" | "quality" | "blocks" | "estimatedMinutes">
  & { hook: string; explain: Omit<Extract<Block, { type: "explain" }>, "type">[]; sim: Sim;
      lab: string; free: string; challenge: string; quiz: QuizItem[];
      transfer: Omit<Extract<Block, { type: "transfer" }>, "type">; summary: string[]; next?: string };

function gameLesson({ hook, explain, sim, lab, free, challenge, quiz, transfer, summary, next, ...meta }: GameLesson): Lesson {
  return lessonSchema.parse({
    ...meta, track: "d", unit: "d1", estimatedMinutes: 11, quality: { state: "draft" },
    blocks: [
      { type: "hook", text: hook },
      ...explain.map(section => ({ type: "explain", ...section })),
      { type: "sim", sim, mode: "free", title: lab, intro: free },
      { type: "sim", sim, mode: "challenge", title: `挑战 · ${lab}`, intro: challenge },
      { type: "quiz", items: quiz },
      { type: "transfer", ...transfer },
      { type: "summary", points: summary, next },
    ],
  });
}

export const d01 = gameLesson({
  id: "d01-game-loop", title: "游戏循环：世界动了，画面怎么还没动？", art: "lesson-d01-game-loop-centered.png",
  prerequisites: [],
  objectives: ["能按顺序说明读取输入、更新状态、绘制画面", "能从一次手动模拟区分世界位置与上一帧画面"],
  hook: "你按下右键，屏幕里的巡检机器人应该向右走。可是你暂停了游戏，只更新了地图上的坐标，屏幕上的它还站在原地。机器人到底在哪？先把一帧拆开，看坐标和画面分别什么时候变化。",
  explain: [
    { title: "一帧里，游戏问三个问题", body: [
      "先读输入（input），例如这一帧要向左、向右还是不动。再更新（update）世界状态，例如把角色的 x 坐标加 1。最后绘制（render），用新坐标画出角色。帧（frame）可以理解为游戏交给屏幕的一张图。",
      "循环反复执行这三步。角色没有移动，也可能仍在计时或绘制。你看到的连续运动，来自一连串状态变化和结果画面。",
    ] },
    { title: "世界位置可以先变，屏幕再追上", body: [
      "假设世界和画面都在 x=1。读到向右后，更新把世界位置改成 x=2。绘制尚未发生，画面仍表示 x=1。直到绘制读取新状态，它才显示 x=2。",
      "本实验把待采样的输入和本帧已经读到的方向分开。点击读取后再改下拉框，会影响下一次读取，本帧仍沿采样到的方向更新。",
    ], callout: "依次点读取输入和更新世界，然后先别点绘制。对照场地中的角色和它下方的世界坐标。" },
    { title: "浏览器里的节拍", body: [
      "浏览器游戏常用 requestAnimationFrame 请求下一次绘制前的回调，再在回调中更新和绘制。刷新频率有差异，后台页面还可能暂停回调。",
      "本实验把一帧分成三个按钮，方便看清先后顺序。实际游戏可能在一次绘制之间更新多次，也可能复用上一状态；本课每次只向左或向右一格，稍后再用秒来计速度。",
    ] },
  ],
  sim: "game-loop", lab: "拆开一帧", free: "选向右，读取输入后改成向左，再更新世界。先读两个位置，最后绘制。观察下一次采样会读到哪一个方向。",
  challenge: "从 x=1 出发，留下连续两次正确的绘制结果。先看到世界与画面的差异，再观察它们重新对齐。",
  quiz: [
    { q: "哪组操作最适合让画面反映本帧的输入？", options: ["绘制 → 读输入 → 更新", "读输入 → 更新 → 绘制", "更新 → 绘制 → 读输入", "读输入 → 绘制 → 更新"], answer: 1, why: "本帧先用输入更新世界，再把新状态画出来。", wrongHints: { "0": "先绘制会用到旧状态，本帧输入的结果还没更新。", "2": "先更新时，本帧输入尚未被读取。", "3": "绘制发生在更新之前，画面还是旧位置。" } },
    { q: "世界从 x=1 更新到 x=2，还没执行绘制，此时画面 x 是多少？", options: ["2", "0", "1", "世界坐标会变回 1"], answer: 2, why: "世界到了 x=2，上一幅画面仍表示 x=1。", wrongHints: { "0": "这是世界位置，先等绘制读取新状态。", "1": "更新和绘制之间不会清空成坐标原点。", "3": "画面延迟不会撤销世界状态的更新。" } },
    { q: "实验已读取向左，这时改成向右，但还没更新。本帧用哪个方向？", options: ["向左", "向右", "两次都执行", "原地不动"], answer: 0, why: "本帧已经记下了向左，改选会在下一次读取时看到。", wrongHints: { "1": "新选项还只是待采样输入，读按钮没有重跑。", "2": "一次更新只消费本帧选定的方向。", "3": "等待更新不等于丢弃已经采样的向左输入。" } },
  ],
  transfer: { prompt: "遥控车的画面和世界都在 x=4。世界连续两次按向左更新，每次一格，只有最后一次更新后才绘制。最后画面上的 x 是多少？", answer: 2, why: "世界先后到了 3 和 2，最后绘制读的是 x=2。", hint: "把两个更新应用到世界，再单独处理绘制。" },
  summary: ["输入决定这一步采用的操作。", "更新改变世界状态，绘制表现状态。", "游戏循环重复执行这些步骤。下一课用两个坐标精确描述角色位置。"],
  next: "d02-coordinates",
  sources: [
    { title: "MDN · Window.requestAnimationFrame", url: "https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame" },
    { title: "Game Programming Patterns · Game Loop", url: "https://gameprogrammingpatterns.com/game-loop.html" },
  ],
});

export const d02 = gameLesson({
  id: "d02-coordinates", title: "坐标：把补给投到正确的格子", art: "lesson-d02-coordinates.png",
  prerequisites: ["d01-game-loop"],
  objectives: ["能在左上角为原点的场地中用 (x, y) 定位", "能把相对平台的局部坐标转换成场景坐标"],
  hook: "巡检机器人收到一条指令：“向左一格，向下两格拾取补给。”问题是，从整张地图的左上角出发，还是从你脚下的平台出发？找到起点之后，两张地图上的点才能对得上。",
  explain: [
    { title: "先找到原点和正方向", body: [
      "这块场地左上格的中心是 (0, 0)。x 向右增大，y 向下增大，(4, 2) 表示向右 4 格、向下 2 格。浏览器 Canvas 常从画布左上开始度量，数学课上的 y 常向上。每次换系统都先看约定。",
      "用 0 开始编号时，6 列的合法 x 是 0 到 5，4 行的合法 y 是 0 到 3。x=6 已在场地外，即使你能数出六列。",
    ] },
    { title: "同一点可以有两种坐标", body: [
      "场景坐标（world coordinates）从地图原点开始。局部坐标（local coordinates）从所选对象的原点开始。本课用平台中心作为局部原点。",
      "平台在场景 (2, 1)。站在平台看，向左 1、向下 2 是局部 (-1, 2)。在场景里找到同一点，要将两个方向分别相加，得到 (2-1, 1+2) = (1, 3)。",
    ], callout: "局部坐标可以为负。最终要不要落图，检查的是换算后的场景坐标。" },
    { title: "移动平台，局部规则仍能复用", body: [
      "如果平台挪到 (3, 0)，同样的局部 (-1, 2) 就落在场景 (2, 2)。把“灯挂在左边一格”记成局部偏移，平台挪动后可以复用这个规则。",
      "实验只考虑平移，平台和场景的轴方向与单位相同。如果对象旋转或缩放，简单相加就不够了。现实游戏还可能把场景坐标再换算到相机或屏幕坐标。",
    ] },
  ],
  sim: "game-coordinates", lab: "双坐标标记", free: "切换场景和相对平台，试着用同一组数落标记。再试一次越界坐标，观察已有标记会怎样。",
  challenge: "先放补给，接着从平台出发计算停靠点。系统会核对两个独立标记的坐标及所用参照。",
  quiz: [
    { q: "在本场地，谁在 (1, 2) 的正下方一格？", options: ["(1, 1)", "(2, 2)", "(2, 1)", "(1, 3)"], answer: 3, why: "x 不变，按屏幕坐标约定向下使 y 加 1。", wrongHints: { "0": "你用了 y 向上的约定。本课向下才增加 y。", "1": "x 增加是向右移动。题目只向下。", "2": "两个分量都变了，既向右又向上。" } },
    { q: "平台在 (2, 1)，其局部原点 (0, 0) 对应场景哪里？", options: ["(0, 0)", "(2, 1)", "(1, 2)", "(-2, -1)"], answer: 1, why: "局部原点就是平台自身，在整张图里的位置是 (2, 1)。", wrongHints: { "0": "这个是场景原点。这里从平台自身出发。", "2": "保持 x 在前，y 在后；不要交换两个方向。", "3": "从平台换到场景应加平台位置。反向转换才减。" } },
    { q: "6 列从 0 编号，哪个 x 已超出右边界？", options: ["6", "5", "4", "0"], answer: 0, why: "0 到 5 正好 6 列，一共有六个有效编号。", wrongHints: { "1": "5 是最右侧有效列。", "2": "4 是有效列，右边还存在一列。", "3": "0 是第一列，超出左边界要小于 0。" } },
  ],
  transfer: { prompt: "地图上起重机中心在 (4, 2)。挂钩在它的局部坐标 (-3, 1)。挂钩的场景 x 是多少？", answer: 1, why: "以起重机为原点向左 3 格，场景 x=4-3=1。", hint: "平台的 x 与局部 x 相加，y 不参与这一步。" },
  summary: ["坐标要先说明原点、轴方向与单位。", "只考虑平移时，场景位置等于对象位置加局部偏移。", "检查越界要用最终场景坐标。下一课计算角色随时间改变了多少位置。"],
  next: "d03-vector-movement",
  sources: [
    { title: "MDN · Canvas：绘制形状与坐标网格", url: "https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes" },
    { title: "Godot Docs · Transforms", url: "https://docs.godotengine.org/en/stable/tutorials/math/matrices_and_transforms.html" },
  ],
});

export const d03 = gameLesson({
  id: "d03-vector-movement", title: "向量与移动：同一秒，走同样远", art: "lesson-d03-vector-movement.png",
  prerequisites: ["d02-coordinates"],
  objectives: ["能用有方向的两个分量表达二维速度", "能用速度和经过的时间计算位移，验证不同步长的恒速结果"],
  hook: "两台电脑玩同一关。一秒内，一台更新两次，另一台更新四次。你把角色写成“每次更新向右两格”，结果第二台电脑的机器人先跑出地图。怎样让两台电脑上的机器人在一秒内走同样远？",
  explain: [
    { title: "位置、速度和位移各回答一个问题", body: [
      "位置表示在哪里，例如 (1, 1)。速度向量（velocity vector）表示每秒往哪个方向走多少，例如 (4, 2) 格／秒，向右 4、向下 2。位移（displacement）表示一段时间里改变的是多少。",
      "实验中每个分量独立计算：新 x = 旧 x + 横向速度 × 秒数，y 同理。负速度沿相反方向。例如 vx=-2 表示向左。",
    ] },
    { title: "先把毫秒换成秒", body: [
      "500 毫秒 = 0.5 秒。在速度 (4, 2) 下，这一步的位移是 (2, 1)。若用 250 毫秒，位移变成 (1, 0.5)。格子只是单位，允许落在两个整数坐标之间。",
      "两步 500 毫秒和四步 250 毫秒相加都是 1 秒。只要速度一直相同，两个试验的终点就一样。若把 500 直接当秒数，结果会放大一千倍。",
    ], callout: "实验按固定步长手动推进，只算恒速移动，省略碰撞、加速与计时抖动。真实游戏在有碰撞时，步长还会影响检测结果。" },
    { title: "方向分量不等于整段路程", body: [
      "速度 (4, 2) 向右又向下。每秒的直线距离是 √(4²+2²)，约 4.47 格，不能把横纵方向直接相加成 6 格。",
      "游戏常限制斜向输入的总速度，避免同时按两键比只按一键跑得更快。这一步称为归一化方向后乘速度；本实验明确指定两个速度分量，不自动缩短向量。",
    ] },
  ],
  sim: "game-motion", lab: "两种步长的移动试验",
  free: "设一种速度推进半秒，再把另一个分量改成负数，看看两步的差别。用回到起点重跑同样的一秒。",
  challenge: "记录两次独立试验，系统核对每一步采用的时间和速度，以及两组最终位置。",
  quiz: [
    { q: "速度 (4, 2) 格／秒，半秒的位移是多少？", options: ["(4, 2)", "(2, 1)", "(8, 4)", "(2000, 1000)"], answer: 1, why: "把 500ms 换成 0.5s，两个分量都乘以 0.5。", wrongHints: { "0": "这是整整一秒的位移，时间只有一半。", "2": "乘 2 等于跑了两秒。半秒要乘 0.5。", "3": "使用了毫秒的数值，但速度单位是每秒。" } },
    { q: "从 (1, 1) 出发以 (-2, 0) 格／秒移动一秒，会去哪里？", options: ["(3, 1)", "(-2, 0)", "(-1, 1)", "(1, -1)"], answer: 2, why: "x 改变 -2，y 改变 0，从原位置累加后得到 (-1, 1)。", wrongHints: { "0": "这是往右两格。负的 x 速度向左。", "1": "这是这段时间的位移，并未加初始位置。", "3": "题目改的是 x，不是 y。" } },
    { q: "哪个做法能让这种恒速模型在一秒内位移与更新次数无关？", options: ["每次位移乘这一步过去的秒数", "让更新越快的设备每次走越远", "每次更新固定加一格", "只在第一帧加一次速度分量，其他时刻都不更新"], answer: 0, why: "逐步用速度乘真实经过的时间，一秒内的位移总和相同。", wrongHints: { "1": "更新更多且每步更远，一秒位移差会扩大。", "2": "快设备做更多次固定步进，会走更远。", "3": "会跳到终点，但中间不体现按经过的时间移动。" } },
  ],
  transfer: { prompt: "一辆玩具车从 x=5 开始，以 -4 格／秒向左。先过 250ms，再过 500ms。最终 x 是多少？", answer: 2, why: "两步合计 0.75 秒，位移是 -3，和起点相加得到 2。", hint: "先把两段时间相加并换算成秒。" },
  summary: ["位置、速度、位移各有各的单位。", "每次更新对两个方向分别应用速度 × 秒数。", "恒速下总时间决定总位移。下一课用按键改变每帧采用的方向。"],
  next: "d04-input",
  sources: [
    { title: "Godot Docs · Vector math", url: "https://docs.godotengine.org/en/stable/tutorials/math/vector_math.html" },
    { title: "MDN · Window.requestAnimationFrame", url: "https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame" },
  ],
});

export const d04 = gameLesson({
  id: "d04-input", title: "输入：按下一次，还是一直按住？", art: "lesson-d04-input.png",
  prerequisites: ["d03-vector-movement", "b12-events"],
  objectives: ["能区分按下、按住和松开的可观测状态", "能用持续方向键移动并用按下边沿触发一次动作"],
  hook: "你按住右方向键让机器人一直往前，空格则用来发签到信号。如果两者都按“只要按住就每帧执行”，按一次空格就会发出一串签到。怎样让按钮各做各的事？",
  explain: [
    { title: "按住是一段状态，按下是一次变化", body: [
      "左、右方向键用按住状态（held state）。每次更新问“此刻还按着吗？”按住右键两帧就移动两步，松开后帧仍继续，但不再靠这个键改变位置。",
      "空格发信号用按下边沿（press edge），只看从未按到已按的变化。一直接着按，没有新的边沿。要多发一次，先松开再按。",
    ] },
    { title: "给帧留一张输入便条", body: [
      "按键可能在两帧之间发生。浏览器送来 keydown 和 keyup，游戏把当前按住状态保存下来，也可以把新按下的动作暂存到下一次更新。",
      "实验把空格新按下记成一个待处理信号，每帧最多消费一次。即使按下后很快松开，下一帧仍可收到这次信号。多次快速按下落在同一帧会合并。这是教学简化。",
    ] },
    { title: "手机按钮和键盘共用状态模型", body: [
      "在键盘控制区，方向键和空格提供输入，回车推进一帧。手机可用按钮切换按住和松开，再更新一帧。两种方式可以看到相同规则。",
      "长按时浏览器可能派发重复的 keydown，已按住的状态不会因此变成新按下。实验离开键盘控制区会清理按住状态以免卡键。若左右键同时按住，本实验让两个方向抵消。",
    ], callout: "真实游戏通常连续推进、支持重绑键位，也可能为输入维护事件队列。这里让学习者手动更新，便于观察两帧之间发生了什么。" },
  ],
  sim: "game-input", lab: "移动与一次性信号",
  free: "按住空格推进两帧，比较信号计数。再按住右方向键，观察位置每帧改变。两种输入可以同时使用。",
  challenge: "用持续方向输入把角色送到目标，再用两次真实按下发信号。试着在按住期间多更新一帧确认没有重复发送。",
  quiz: [
    { q: "如果右键按住三帧，该用哪种规则连续移动？", options: ["只检查首次按下", "检查每一帧是否仍按住", "只检查松开", "每帧先把历史状态清空再猜方向"], answer: 1, why: "移动取决于该帧的持续输入。", wrongHints: { "0": "首次按下只会移动一帧。", "2": "松开只发生一次，无法代表持续按住。", "3": "清掉当前按住状态就无法稳定追踪输入。" } },
    { q: "空格从松开变成按住，保持四帧，中间没松开。实验应发几次信号？", options: ["4", "0", "2", "1"], answer: 3, why: "只有从松开转成按住的一次变化产生信号。", wrongHints: { "0": "这是按住状态驱动的结果。发信号用按下边沿。", "1": "首次按下已产生一次新边沿。", "2": "中间没有松开再按，第二个边沿并不存在。" } },
    { q: "空格在两帧间快速按下再松开，继续更新会怎样？", options: ["下一帧仍消费一次缓存的按下", "信号必须维持按住才有", "下一帧消费两次，按下和松开各一次", "从下一帧开始一直重复发送"], answer: 0, why: "本模型保留待处理的按下，松开只更新按住状态。信号消费后会清除。", wrongHints: { "1": "缓存了边沿，所以短按也能得到响应。", "2": "题目的动作只有按下才触发。", "3": "待处理标记消费后清空，无新按下就不触发。" } },
  ],
  transfer: { prompt: "小船每次新按下鸣笛键响一次。第一次按着过了两帧后松开。第二次按下又立刻松开，接着推进一帧，模型保留两帧间的按下。总共响几次？", answer: 2, why: "第一次只响一次，第二次短按保存在待处理标记中，再响一次。", hint: "数从抬起到按下的变化，再检查是否在后续帧消费。" },
  summary: ["持续动作在每帧检查按住状态。", "单次动作由新的按下触发，可暂存等待下一次更新。", "触屏和键盘可以共用行为规则。后续碰撞课将检查移动时有没有碰到障碍。"],
  sources: [
    { title: "MDN · KeyboardEvent.repeat", url: "https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat" },
    { title: "Godot Docs · Input", url: "https://docs.godotengine.org/en/stable/classes/class_input.html" },
  ],
});
