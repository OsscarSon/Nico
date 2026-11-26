import { lessonSchema, type Lesson } from "../schema";

const page = `<h2>阅读时间估算</h2>
<label>页数 <input id="pages" type="number" min="1" step="1"></label>
<label>每分钟页数 <input id="speed" type="number" min="0.1" step="any"></label>
<button id="estimate" type="button">估算</button>
<p id="result" role="status"></p>`;

export const readingToolExample = `const pagesInput = document.querySelector("#pages");
const speedInput = document.querySelector("#speed");
const result = document.querySelector("#result");

document.querySelector("#estimate").addEventListener("click", () => {
  const pageText = pagesInput.value.trim();
  const speedText = speedInput.value.trim();
  const pages = Number(pageText);
  const speed = Number(speedText);
  if (!pageText || !speedText || !Number.isSafeInteger(pages)
      || pages < 1 || !Number.isFinite(speed) || speed <= 0) {
    result.textContent = "请输入有效数字";
    return;
  }
  const minutes = Math.ceil(pages / speed);
  result.textContent = Number.isFinite(minutes)
    ? "约 " + minutes + " 分钟"
    : "请输入有效数字";
});`;

function checkEstimate(pages: string, speed: string) {
  return `document.querySelector("#pages").value = ${JSON.stringify(pages)};
document.querySelector("#speed").value = ${JSON.stringify(speed)};
document.querySelector("#estimate").click();`;
}
const readResult = 'console.log(document.querySelector("#result").textContent);';

export const b19: Lesson = lessonSchema.parse({
  id: "b19-project-tool", track: "b", unit: "b4", title: "作品二：一个小工具",
  art: "lesson-b19-project-tool.png", prerequisites: ["b12-events", "b18-project-page"],
  estimatedMinutes: 15, quality: { state: "draft" },
  objectives: ["从实际问题定义输入、规则和结果", "用事件读取当前输入并检查边界值", "用普通、错误和连续输入验证工具"],
  blocks: [
    { type: "hook", text: "还有 37 页，读得完吗？每分钟读 4 页，算出来是 9.25 分钟。安排时间通常要留整分钟，那就给自己 10 分钟。今天把这类重复计算做成一个随输随算的小工具。" },
    { type: "explain", title: "先写规则，后写代码", body: [
      "输入是页数与阅读速度。页数是正整数，速度是大于零的有限数字，可带小数。输出是预计的整分钟数。用 Math.ceil 将商向上取整，避免少预留最后不足一分钟的时间。",
      "页面给的是估算。速度会受段落难度影响；这条计算规则仅做规划，不会测量真实阅读速度。",
    ] },
    { type: "explain", title: "表单值是文本，先看空不空", body: [
      "input.value 给字符串。必须在转 Number 前判断空值，因为 Number(空字符串) 会得到 0。再用 Number.isSafeInteger 和 Number.isFinite 检查对应数字，排除负数、零和无限结果。",
      "HTML 的 min 和 step 可以提示输入规则。点击普通按钮时要落实程序中的校验逻辑，不能假定浏览器会替你的事件处理器判断每个值。",
    ] },
    { type: "explain", title: "事件里读取当前输入，再写回页面", body: [
      "用 addEventListener 监听估算按钮。每次点击都从两个输入框重新取值并计算，把结果写入 result 的 textContent。",
      "遇到无效输入要替换上一条成功结果，用户才知道当前值没有算出结果。role=status 让辅助技术也能收到更新。",
    ] },
    { type: "explain", title: "一个成功例子还不够", body: [
      "试整除、非整除和小数速度。再试空的页数、零速度、负数。有效之后输错，再恢复有效输入，检查有没有沿用上一次结果。",
      "调试时把问题拆开：没有触发就检查事件；触发但数字异常就检查值和类型；数字正确却没更新，就检查 DOM 选择器。",
    ] },
    { type: "sim", sim: "js", mode: "free", title: "试用并修改阅读时间工具", intro: "运行后输入 37 页和每分钟 4 页，再试空或零。修改取整规则为 Math.floor，比较对计划时间的影响。", code: { page, starter: readingToolExample } },
    { type: "sim", sim: "js", mode: "challenge", title: "完成阅读时间估算器", intro: "给 #estimate 加点击事件。读取 #pages 和 #speed，写入 #result。合法输入显示「约 N 分钟」，向上取整；空值、非法数或非正数显示「请输入有效数字」。每次重新读取，不保留旧结果。", code: {
      page, solution: readingToolExample,
      starter: '// 页面已经提供 #pages、#speed、#estimate 和 #result。\n// 监听点击，再在事件函数里读取、校验、计算和显示。',
      checks: [
        { label: "37 页，每分钟 4 页 → 约 10 分钟", harness: checkEstimate("37", "4") + readResult, expect: "约 10 分钟" },
        { label: "15 页，每分钟 2.5 页 → 约 6 分钟", harness: checkEstimate("15", "2.5") + readResult, expect: "约 6 分钟" },
        { label: "拒绝空值、零速度、负页数和小数页数", harness: [
          checkEstimate("", "4") + readResult, checkEstimate("10", "0") + readResult,
          checkEstimate("-5", "2") + readResult, checkEstimate("3.5", "2") + readResult,
        ].join("\n"), expect: Array(4).fill("请输入有效数字").join("\n") },
        { label: "一次页面内连续点击，先成功、再报错、然后恢复", harness: [
          checkEstimate("9", "2") + readResult, checkEstimate("9", "") + readResult,
          checkEstimate("3", "100") + readResult,
        ].join("\n"), expect: "约 5 分钟\n请输入有效数字\n约 1 分钟" },
      ],
    } },
    { type: "quiz", items: [
      { q: "用户清空页数输入，程序开始计算前应做什么？", options: ["先判断 value 是不是空字符串", "让 Number 自动决定，得到 0 就是合法页数", "把上次值悄悄补回去"], answer: 0, why: "空输入表示缺少信息。先判断空文本，才能清楚区分它与数字零。", wrongHints: { "1": "Number 会把空字符串转成 0，0 也不符合正页数要求。", "2": "使用旧值会给出与当前输入无关的结果。" } },
      { q: "用 25 页 ÷ 4 页/分钟估算，安排整分钟且不能少留时间，应该怎样取整？", options: ["向上取整得到 7", "直接截断得到 6", "四舍五入得到 6"], answer: 0, why: "商为 6.25，向上取整得到最小的足够整分钟数 7。", wrongHints: { "1": "截断会少预留剩下的一部分时间。", "2": "四舍五入可能向下取，不能保证足够。" } },
      { q: "第二次点击仍显示第一次结果，首先检查哪一项？", options: ["是否在点击处理函数内部读取当前输入", "是否把标题设成 h2", "是否把按钮改成蓝色"], answer: 0, why: "在监听回调里读取 .value，每次才会得到最新文本。", wrongHints: { "1": "标题级别不改变事件中读取的值。", "2": "颜色对事件读取输入没有影响。" } },
    ] },
    { type: "transfer", prompt: "你把同样的向上取整规则用在排练安排。第一段需要 9.5 分钟，第二段需要 4.2 分钟。若两段分别占用整分钟的独立时段，至少一共排多少分钟？", answer: 15, why: "第一段需 10 分钟，第二段需 5 分钟，分别取整后相加得 15。", hint: "时段各自独立，不能把两段先相加再取整。" },
    { type: "summary", points: ["明确输入范围、单位与计算规则。", "每次事件读取当前值，先校验再计算与显示。", "用不同输入和连续操作验证 UI，保存可以重复运行的代码。"], next: "b20-review" },
  ],
  sources: [
    { title: "MDN：HTMLInputElement.value", url: "https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/value" },
    { title: "MDN：Math.ceil", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/ceil" },
    { title: "MDN：DOM 事件", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Events" },
  ],
});
