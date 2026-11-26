import { dLesson, question } from "./lesson";

export const d09 = dLesson({
  id: "d09-unity-editor", unit: "d3", title: "Unity 编辑器：停止播放后，改动去哪了？", previous: "d08-feedback", next: "d10-game-object",
  objectives: ["能定位编辑器中对象、场景视图和属性的分工", "能区分保存的场景、编辑草稿和播放中的位置"],
  hook: "你在播放时把机器人挪到入口，再按停止，它忽然回了原位。朋友的副本更奇怪，一打开就还在昨天的位置。这两种“失踪”是同一件事吗？",
  sections: [
    ["在哪找它，在哪改它", "Unity 的 Hierarchy（层级窗口）列出当前场景对象，Scene（场景视图）用来查看和布置这些对象。选中对象后，Inspector（检视器）显示它的组件及参数。Project（项目窗口）管理场景、图片、声音等资源文件。"],
    ["播放值可以和编辑值不同", "点 Play（播放）后，脚本可以改变对象的运行状态。默认情况下，许多在播放模式里对场景对象做的改动会在退出播放后还原。要把起点真的改掉，在编辑模式设置 Transform（变换）的位置。", "Game（游戏视图）展示相机画面。Scene 里能看到对象，不表示它一定在相机视野内。"],
    ["保存属于某一个场景", "工坊和入口是两个不同的场景资源。只改入口的位置不会更改工坊的出生点。本实验比较原保存、编辑、播放、停止和重开五个数值。它模拟一个活动场景，省略多场景载入及能在播放模式中直接写入的某些资源设置。"],
  ],
  simulator: "game-editor", experiment: ["场景编辑与播放", "选择场景，修改编辑点，并设置一段播放移动。先不保存，运行后对照停止位置和重开位置。", "在入口场景把编辑出生点改为 3，播放时向右移动 2 格。保存编辑值，再验证播放 x=5、停止和重新打开均为 x=3。"],
  quiz: [
    question("要找出当前场景中具体哪个角色对象被选中，先查看哪里？", ["Audio Mixer", "Hierarchy", "构建输出文件夹", "操作系统音量"], 1, "Hierarchy 列出场景中的对象及父子关系。", ["混音器处理声音信号。", "构建文件夹装产物，不是场景对象目录。", "系统音量与对象选择无关。"]),
    question("默认退出播放，角色运行中改变的位置通常如何？", ["变成新的全局原点", "所有场景一起保存同一值", "回到播放前编辑位置", "自动复制到项目的所有角色"], 2, "播放状态中的场景对象改动一般不会写回编辑场景。", ["位置改动不会平移坐标系。", "不同场景资源独立。", "播放位置属于当前实例。"]),
    question("希望明天重开时保留新的出生点，通常应该怎么做？", ["编辑 Transform 后保存对应场景", "只在 Game 视图看到它", "保持 Play 一直运行", "只切换到另一个场景"], 0, "编辑值需要保存到对应场景资源中。", ["看到某一帧不代表文件已保存。", "运行进度没有替代编辑保存。", "切换资源本身不会确认保存。"]),
  ],
  transfer: { prompt: "新场景原保存 x=1，编辑改为 x=4 未保存，播放把它移动到 x=5。停止后关掉场景并丢弃未保存编辑，再打开，x 是多少？", answer: 1, why: "播放变化已回退，未保存编辑也丢弃，重新载入的是保存的 1。", hint: "重开读取资源文件，区别于只按停止。" },
  summary: ["层级、场景视图、属性和资源窗口分工不同。", "播放值和编辑值要分开看。", "验证持久变化要重新打开保存过的场景。"],
  sources: [["Unity Manual · Hierarchy window", "https://docs.unity3d.com/Manual/Hierarchy.html"], ["Unity Manual · Scene view", "https://docs.unity3d.com/Manual/UsingTheSceneView.html"]],
});

export const d10 = dLesson({
  id: "d10-game-object", unit: "d3", title: "GameObject：给机器人装上所需组件", previous: "d09-unity-editor", next: "d11-csharp",
  objectives: ["能解释 GameObject 和 Component 的关系", "能按显示、运动和碰撞结果检查组件组合"],
  hook: "你从场景里复制一台机器人。它看起来完全一样，却既不会移动也不会碰墙。你要复制一张更像的图，还是检查组装少了哪些部分？",
  sections: [
    ["对象装组件", "GameObject（游戏对象）是场景中的实体容器，Component（组件）给它能力。GameObject 都有 Transform（变换），记录位置、旋转和缩放。可见的图像、运行代码、物理形状则由不同组件提供。"],
    ["一项能力对应一次实际检查", "Sprite Renderer（精灵渲染器）可在画面显示图像。移动脚本更新位置，Collider2D 碰撞体描述参与检测的形状。外观和碰撞形状可以同大，也可以有意不同。"],
    ["本实验的墙如何响应", "试车时移动脚本请求走到 x=2，简化碰撞系统若检测到与墙重叠，会让角色停在 x=1。这个规则由课程模型定义。在真实 Unity 中，只加一个 Collider2D 并不自动赋予移动、力度或所有阻挡行为。要配合 Rigidbody2D、正确的移动 API 或自写检测。"],
  ],
  simulator: "game-components", experiment: ["组件组装台", "关掉 Sprite Renderer，再尝试只装移动脚本。对照位置改变与是否可见；最后加入碰撞组件比较穿过位置与停下位置。", "把机器人组装为能绘制、能移动、能在墙前停下。运行后检查三项行为全部满足。"],
  quiz: [
    question("哪个组件负责精灵绘制？", ["Collider2D", "Transform", "Sprite Renderer", "输入按键"], 2, "渲染组件把精灵显示出来。", ["碰撞体给出形状。", "变换记位置、旋转和缩放。", "按键是输入信号。"]),
    question("图像显示但没有移动，应该先检查什么？", ["是否有移动逻辑在更新位置", "精灵颜色要更亮", "只把贴图分辨率翻倍", "名字是否叫 Robot"], 0, "移动应由脚本或物理系统改变位置。", ["颜色与坐标更新无关。", "像素尺寸不自动产生运动。", "名称本身不会给对象速度。"]),
    question("碰撞体最接近下面哪项？", ["描边动画", "输入处理器", "场景名称", "用于接触检测的形状"], 3, "碰撞体描述计算的几何边界。", ["描边是显示效果。", "输入决定意图，不定义几何。", "场景名称标识资源。"]),
  ],
  transfer: { prompt: "已有 Transform 的新对象需要显示精灵、接受手写移动规则，并向检测系统提供形状。三项分别需要对应组件，已经装了渲染器，还差几个？", answer: 2, why: "再加移动脚本和碰撞体。题目假定响应系统已有。", hint: "按三个独立职责一项一项核对。" },
  summary: ["对象容纳组件并用 Transform 给出空间关系。", "绘制、运动和检测是可单独核对的行为。", "碰撞形状要配合运动和响应系统。"],
  sources: [["Unity Manual · GameObjects", "https://docs.unity3d.com/Manual/GameObjects.html"], ["Unity Manual · Sprite Renderer", "https://docs.unity3d.com/Manual/class-SpriteRenderer.html"]],
});

export const d11 = dLesson({
  id: "d11-csharp", unit: "d3", title: "C#：让边界样本替你找错", previous: "d10-game-object", next: "d12-unity-physics",
  objectives: ["能写出带比较和短路与运算的布尔返回语句", "能用阈值与独立反例检查条件逻辑"],
  hook: "安全门要求电量至少 3 且机器人站在地面。旧脚本只试过满电，似乎一切顺利。直到电量正好为 3 的试玩者被挡在门外。",
  sections: [
    ["变量类型和返回值", "把 energy 当作 int 整数参数，把 grounded 当作 bool 布尔参数。用返回类型是 bool 的方法决定能否启动，例如 bool CanStart(int energy, bool grounded)。方法里的 return 返回 true 或 false。这里编辑该方法的一条语句。"],
    ["至少三格，需要两道门", "至少包含等于，应写 energy >= 3。两个条件都满足使用 &&（逻辑与）；只需满足一个时用 ||（逻辑或）。比较表达式产生布尔结果。对 &&，左侧为 false 时 C# 不再求值右侧。"],
    ["用反例找出错条件", "电量 2 且在地面能抓到漏查阈值；电量 3 且不在地面能抓到用了 ||；电量 3 且在地面能抓到误用 >。本实验解析 return、比较和 &&／|| 的限定子集并执行样本，不编译完整 C#，不支持括号、函数调用或其他语句。"],
  ],
  simulator: "game-csharp", experiment: ["条件边界测试器", "运行起始语句，找出错误的放行与拒绝。再试着去掉分号，查看语法提示。", "改写一条返回语句，使 0–10 电量和两种在地面状态的 22 个测试都符合‘至少 3 且在地面’。"],
  quiz: [
    question("‘电量至少为 3’用哪个比较？", ["energy > 3", "energy >= 3", "energy < 3", "energy == 3"], 1, "大于等于包含边界和更高的值。", ["严格大于会漏掉正好 3。", "方向相反。", "相等排除了大于 3。"]),
    question("两个条件必须同时成立，选什么符号？", ["||", "=", "&&", "!= 单独写在两个表达式之间"], 2, "&& 表示两个布尔子表达式都为真。", ["|| 允许仅一侧为真。", "赋值不是与运算。", "!= 比较是否不同，并不要求两侧同时为真。"]),
    question("哪组输入能分辨 > 3 与 >= 3，且另一个条件为真？", ["电量 3，站在地面", "电量 4，站在地面", "电量 1，站在地面", "电量 4，正在腾空"], 0, "边界 3 只会被包含等号的条件通过。", ["4 在两种比较中都通过。", "1 在两种比较中都拒绝。", "腾空已经会让正确的与条件失败。"]),
  ],
  transfer: { prompt: "条件改为 fuel >= 2 && grounded。依次测试 (1, 真)、(2, 真)、(2, 假)、(3, 真)。其中有几项返回真？", answer: 2, why: "第二项和第四项同时满足。第三项只满足燃料条件。", hint: "把两个条件逐一打勾，必须都打勾。" },
  summary: ["整数比较返回布尔值。", "用明确的与／或描述允许条件。", "边界与独立反例比只测试顺利场景更有用。"],
  sources: [["Microsoft Learn · Boolean logical operators", "https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/boolean-logical-operators"], ["Microsoft Learn · Comparison operators", "https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/comparison-operators"]],
});

export const d12 = dLesson({
  id: "d12-unity-physics", unit: "d3", title: "Unity 2D 物理：会挡住的地板，会打招呼的区域", previous: "d11-csharp", next: "d13-hud",
  objectives: ["能解释三类 Rigidbody2D 在当前样例中的行为", "能分别选择实体地面和不阻挡运动的触发区"],
  hook: "同样是长方形，蓝色地板应该接住机器人，琥珀色签到框却应该让它通过并登记。你把两个都改成触发区后，机器人直接穿地。",
  sections: [
    ["刚体类型决定该怎么移动", "Unity Rigidbody2D 的 Dynamic（动态）可受重力和力影响。Static（静态）适合不动的地形，通常由引擎视为固定。Kinematic（运动学）适合由代码明确驱动的移动对象，它不会因重力自行落下。"],
    ["碰撞体和触发器分工", "Collider2D 供引擎检测接触，启用 Is Trigger 后主要产生进入、停留或离开事件，不施加实体阻挡。实际事件还取决于刚体、层和项目配置。这个教学关卡假设层允许交互且设备使用 2D 组件。"],
    ["把签到放在落地前", "角色从高度 2 在重力作用下下落。它先进入高度 1 以下的签到区，随后被实体地面挡住。本实验沿用 D06 的四步计算，不处理弹性或摩擦，也没有真实 Unity 求解器。"],
  ],
  simulator: "game-physics", experiment: ["地板与触发区", "先选动态角色与 Trigger 地板，看它是否穿过零点。再选择实体地面，并单独切换签到触发区。", "使角色自然下落并停在 y=0，同时产生独立的签到进入事件。核对三项测试。"],
  quiz: [
    question("角色应该在重力下自行落下，选择哪类刚体？", ["Static", "没有 Rigidbody2D", "Kinematic 且没有指令", "Dynamic"], 3, "动态刚体可以应用重力，前提是相应重力设置启用。", ["静态对象在这个模型中固定。", "这是引擎物理，不会自动移动普通对象。", "运动学对象依赖明确的移动控制。"]),
    question("签到不应阻挡角色时，区域应该承担什么角色？", ["Trigger 记录进入事件", "实体墙", "把场景时间停住", "重力控制器"], 0, "触发器用于通知接触而不阻挡。", ["实体墙会阻挡运动。", "签到无需改变时间。", "重力决定下落速度，不负责签到。"]),
    question("地板也设为 Trigger 后，会怎样？", ["变成更硬的地板", "允许通过而无法用实体反应承重", "所有提示声音一定关闭", "角色立即成为静态体"], 1, "触发形状可以产生事件，但不会作为实体地板接住角色。", ["触发器不会施加实体反应。", "是否发声取决于事件处理。", "地板选项不会改角色刚体类型。"]),
  ],
  transfer: { prompt: "一个走廊需要两块实体挡板和一个只登记通过的签到框。三块形状中应把几个设为 Trigger？", answer: 1, why: "只有签到框不阻挡，两个挡板应参与实体阻挡。", hint: "识别只通知、无需承重或阻挡的形状。" },
  summary: ["刚体类型决定运动受什么控制。", "实体碰撞和触发事件分别服务于阻挡与通知。", "参考检测结果分别验证落地和签到。"],
  sources: [["Unity Manual · Rigidbody 2D", "https://docs.unity3d.com/Manual/class-Rigidbody2D.html"], ["Unity API · OnTriggerEnter2D", "https://docs.unity3d.com/ScriptReference/MonoBehaviour.OnTriggerEnter2D.html"]],
});
