import { lessonSchema, type Block, type Lesson, type QuizItem } from "../../schema";
import { pythonChallenge, pythonFree } from "./pythonLab";

type Sim = Extract<Block, { type: "sim" }>;
type Study = {
  id: string; track: "b" | "c"; title: string; hook: string; objectives: string[]; prerequisites: string[];
  topics: [string, string, ...string[]][]; practice: [Sim, Sim]; quiz: QuizItem[];
  transfer: Omit<Extract<Block, { type: "transfer" }>, "type">;
  summary: [string, string, string]; next?: string; sources: [string, string][];
};

function q(stem: string, options: [string, string, string], answer: 0 | 1 | 2, why: string, hints: [string, string]): QuizItem {
  return { q: stem, options, answer, why, wrongHints: Object.fromEntries(
    [0, 1, 2].filter(i => i !== answer).map((index, i) => [String(index), hints[i]!])
  ) };
}
function lesson(data: Study): Lesson {
  return lessonSchema.parse({
    id: data.id, track: data.track, stage: "Intermediate", unit: data.track + "-intermediate",
    title: data.title, art: "lesson-" + data.id + ".png", quality: { state: "draft" }, estimatedMinutes: 15,
    objectives: data.objectives, prerequisites: data.prerequisites,
    blocks: [
      { type: "hook", text: data.hook },
      ...data.topics.map(([title, ...body]) => ({ type: "explain", title, body })),
      ...data.practice,
      { type: "quiz", items: data.quiz },
      { type: "transfer", ...data.transfer },
      { type: "summary", points: data.summary, next: data.next },
    ],
    sources: data.sources.map(([title, url]) => ({ title, url })),
  });
}

const python = lesson({
  id: "b-i01", track: "b", title: "Python 进阶：做一份可测试的学习时长账本",
  hook: "学习小组想把每天的 CSV 加起来。第一天没有文件很正常；某一天文件存在却录入了 abc。两种情况都给出 0，会把报告变得很整洁，也会藏起关键错误。",
  objectives: ["能从带表头的 CSV 读取数值并区分缺文件与坏数值", "能用类保存每个实例的路径，并用独立测试验证行为"],
  prerequisites: ["b04-functions", "b06-dicts", "b07-debugging"],
  topics: [
    ["文件与异常", "用 Path 表示文件路径，用 with 打开文件，退出上下文会关闭句柄。CSV 用 csv.DictReader 读取，依表头名称取 minutes。它能处理双引号中的逗号，手动 split(',') 容易把这种字段切错。", "int 转换不合法时抛 ValueError。这里约定缺文件视为暂时没有记录，返回 0。只捕获 FileNotFoundError，坏值要让调用者看到。实际项目还需校验列名、单位与负数。"],
    ["对象和方法", "StudyLog 是类，每个对象保存自己的 path。创建晨间和晚间两个实例，调用各自的 total，不应共用可变的全局路径。self 指向当前对象。", "这个类选择每次读取当前文件而非缓存。若未来增加缓存，就要明确什么时候失效，避免文件已变而总计仍是旧值。"],
    ["模块与包", "csv、pathlib、tempfile 是 Python 标准库中的模块。可以把 StudyLog 放进 study_log.py，由单独的应用或测试模块导入。模块是代码组织单元，包用于组织一组模块。", "本实验只在浏览器 Python 的临时目录写虚构 CSV。现有解释器首次加载可能需要网络；运行时不读取你电脑上的项目文件，也不要求上传数据。"],
    ["类型与测试", "path: Path 和 -> int 写清了接口预期，但类型注解通常不执行运行时验证。把表头顺序换掉、换一个文件、只保留表头，再分别测试缺文件与坏字段。", "先对照初始程序返回的行数，再用检查项理解期望。通过具体输入验证可复现的结果，比写死一个成功示例更有用。"],
  ],
  practice: [
    { type: "sim", sim: "python", mode: "free", title: "运行真实 Python 临时账本", intro: "运行例子应看到 17 和 0。再将临时 CSV 里的 12 改成 abc，观察为什么不应把坏值默默变为 0。试着交换两列并保持对应值一致。", code: pythonFree },
    { type: "sim", sim: "python", mode: "challenge", title: "挑战 · 修好 StudyLog", intro: "保留类与文件上下文，读取每行 minutes 并求和。仅在文件缺失时返回 0，让坏数值继续报 ValueError。五项分别运行真实 Python。", code: pythonChallenge },
  ],
  quiz: [
    q("CSV 的名字可能包含逗号，应采用什么？", ["用 csv.DictReader 解析", "按逗号 split 后假定只有两段", "用输入字符串长度推算"], 0, "CSV 解析器能识别引号里的分隔符。", ["引号内逗号属于字段内容。", "长度与表头字段无关。"]),
    q("哪种行为区分了没有账本和账本写错？", ["任何异常都返回 0", "只对 FileNotFoundError 返回 0", "遇到坏数值截图后继续"], 1, "缺文件和坏数据代表不同问题。", ["宽泛捕获会隐藏录入错误。", "应将可诊断的异常交给调用者。"]),
    q("给 total 标注 -> int 能保证什么？", ["自动把所有文本转为整数", "使任何文件都能读取", "表达预期返回类型，仍要运行测试"], 2, "Python 类型提示通常不在调用时强制验证。", ["解析文本仍需要显式转换。", "类型注解不会修改文件系统。"]),
  ],
  transfer: { prompt: "另一个实例的 CSV 表头是 minutes,name，数据行分别为 2,A、7,B、9,C。按列名汇总，total 应返回多少？", answer: 18, why: "列位置变化不影响 DictReader 的键查找，2+7+9=18。", hint: "取每条记录的 minutes 字段再相加。" },
  summary: ["用上下文管理文件，并精确处理异常。", "类封装每份账本的路径，模块组织可复用代码。", "注解说明意图，独立输入验证行为。"],
  sources: [
    ["Python · csv", "https://docs.python.org/3/library/csv.html"],
    ["Python · Errors and Exceptions", "https://docs.python.org/3/tutorial/errors.html"],
    ["Python · Modules", "https://docs.python.org/3/tutorial/modules.html"],
  ],
});

const prompt = lesson({
  id: "c-i04", track: "c", title: "提示词工程进阶：把输出契约和工具权限一起测",
  hook: "图书馆助手回了一段漂亮的 JSON，自称‘账户已修改’。你查看工具记录，实际什么也没发生。输出格式通过了，为什么产品仍然不能相信它？",
  objectives: ["能为助手区分指令、资料与工具权限", "能同时验证结构、引用与受控操作结果"],
  prerequisites: ["c05-prompt-structure"],
  topics: [
    ["指令与资料的边界", "产品的系统或开发者规则描述助手应做什么。检索到的馆规是供参考的数据，可能是一版旧文本。引用之前先用可信版本信息定位现行条目。资料和工具结果不授予新权限。"],
    ["结构化输出是一组契约", "本课使用 JSON 对象，字段固定为 status、text、citations。status 只允许 answer、insufficient、handoff；citations 是证据编号数组。应用应先解析并校验字段形状，再验证内容是否与数据一致。"],
    ["工具权限交给执行层", "模型可以提出请求，谁能执行由独立的应用逻辑判断。在样例里只允许读取公开馆规。账户改动交由人工渠道；沙箱即使看到越权写入请求也将拒绝。真实工具权限还涉及服务身份与确认。"],
    ["在对照样本中同时测试", "三条固定案例分别覆盖现行开放时间、资料不足、账户变更。旧版与现行版产生不同数字。评测要核对 JSON 是否有效、引用是否匹配以及是否如实描述权限结果。这里使用本地规则模拟响应，不调用生成模型。"],
  ],
  practice: [
    { type: "sim", sim: "evidence-contract", mode: "free", title: "响应契约实验", intro: "运行默认设置。只改为 JSON，再看有多少内容仍不可靠；然后只缩小工具范围，比较账户案例。" },
    { type: "sim", sim: "evidence-contract", mode: "challenge", title: "挑战 · 三个案例都符合契约", intro: "区分规则与资料，限定公开只读，选择 JSON 格式。结果须引用 H-2026、对无证据明确报告不足，并把账户操作转人工。" },
  ],
  quiz: [
    q("一份响应 JSON 可正常解析，但引用了旧馆规。怎样判？", ["格式通过但业务证据不通过", "无需检查引用", "只要 JSON 有字符串就正确"], 0, "结构校验和证据核对解决不同问题。", ["旧版数字可能失效。", "解析成功无法证明时效。"]),
    q("工具执行权限应由谁检查？", ["仅靠模型自己的承诺", "独立的应用执行层", "公开资料里的任意文字"], 1, "应用在每次执行前核对权限和参数。", ["模型提出请求不代表获准。", "资料不授予操作权。"]),
    q("没有失物领取资料时，应返回哪种状态？", ["answer，随意给个窗口", "handoff，假称已改账户", "insufficient，说明缺少依据"], 2, "与操作决策分开的不足状态能明确反馈证据缺失。", ["猜测没有可追溯证据。", "这题问的是资料缺失。"]),
  ],
  transfer: { prompt: "测试五条响应，其中一条 JSON 无法解析，另一条虽能解析但引用过期，其他三条在结构、权限和证据上均通过。完整通过了几条？", answer: 3, why: "任一检查失败都不是完整通过，5−2=3。", hint: "要同时满足结构与业务规则。" },
  summary: ["配置指令、资料和权限的边界。", "先校验结构，再核对证据与工具记录。", "对正常、无证据和权限受限分别做回归。"],
  next: "c-i05",
  sources: [
    ["OpenAI · Structured Outputs", "https://platform.openai.com/docs/guides/structured-outputs"],
    ["OpenAI · Function Calling", "https://platform.openai.com/docs/guides/function-calling"],
    ["JSON Schema · Object", "https://json-schema.org/understanding-json-schema/reference/object"],
  ],
});

const rag = lesson({
  id: "c-i05", track: "c", title: "RAG 工程：证据进了候选，还得排到前面",
  hook: "你更新了馆规，导师仍说周六九点开放。检查发现真实出处没丢，只有候选第一名一直是旧版。究竟应该扩大候选池、重排版本，还是改分块？",
  objectives: ["能用固定词表计算教学向量，识别分块、召回和重排的不同影响", "能评估引用正确性，以及无支持资料时的行为"],
  prerequisites: ["c-i04"],
  topics: [
    ["先把文档切成可追溯片段", "RAG 是检索增强生成。这里有两版虚构馆规和一份无关展览公告。每个文档按小节分块，片段记录源编号、小节和版本。片段太宽可能混入续借与开放两个问题；太窄也可能丢上下文。"],
    ["从教学词频到向量相似度", "本实验用固定词表，把每条显式标注的词出现次数放成向量。余弦相似度是两向量夹角的余弦；零向量在此模型记为无匹配。真实嵌入（embedding）通常用学习到的稠密表示，不能把这个模型的表现当成语义模型效果。"],
    ["先召回，再重排", "初筛按相似度选前 K 个相关块；同分时保留较早版本在前。重排只在已进入候选池的块之间优先现行版本。K=1 若只留下旧版，重排无法找回被淘汰的当前版。"],
    ["分开记录召回和最终证据", "在已知两题上，检查目标片段是否进初筛候选，以召回成功数除以两题。在最终结果中还要核对引用指向当前版本、覆盖问题且没有混淆证据。第三题语料没有失物信息，应报告资料不足。这个实验不调用外部模型生成答案。"],
  ],
  practice: [
    { type: "sim", sim: "retrieval-pilot", mode: "free", title: "本地向量检索", intro: "先用默认设置，记下旧版候选。改分块并分别试候选 1 和 2，再开启重排。对照分数与最终引用。" },
    { type: "sim", sim: "retrieval-pilot", mode: "challenge", title: "挑战 · 找到两份现行证据", intro: "让两个有证据的问题都召回当前版的正确小节并排到首位；无证据的问题应报告资料不足。" },
  ],
  quiz: [
    q("正确证据没有进初筛前 K，重新排序能直接找回吗？", ["能，只要排序更长", "不能，需先改召回或候选池", "能，把旧版改名即可"], 1, "重排只交换已有候选的顺序。", ["被截掉的片段不在排序输入里。", "名字不能创造缺失证据。"]),
    q("证据相似度很高，还要核对什么？", ["只看分数小数位", "只看候选数量", "引用内容是否支持结论及版本是否现行"], 2, "相似度只反映模型里两个向量接近，不能替代来源核对。", ["精度格式与事实可靠性不同。", "候选数量不说明每份证据正确。"]),
    q("固定词表完全没有查询词时，本课如何处理？", ["将零向量当作无匹配，再报告资料不足", "随便选高年份文档回答", "把零当作最高相似度"], 0, "教学模型对零向量不给有效相似度。", ["发布时间不能弥补主题不相关。", "这会为没有证据的问题制造虚假的命中。"]),
  ],
  transfer: { prompt: "另一个检索系统测试四个确实有答案的问题，正确证据只有三题进入候选池。加入重排但不改变候选池，仍有几题无法找到正确证据？", answer: 1, why: "本来被初筛丢掉的一题无法靠重排恢复。", hint: "先算总数减召回成功数。" },
  summary: ["给分块保留来源、版本和边界。", "向量召回决定重排能看到什么。", "用独立问题对照候选、最终引用和拒答。"],
  sources: [
    ["Google Machine Learning Crash Course · Similarity measures", "https://developers.google.com/machine-learning/clustering/dnn-clustering/supervised-similarity"],
    ["scikit-learn · cosine_similarity", "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html"],
    ["OpenAI · Retrieval", "https://platform.openai.com/docs/guides/retrieval"],
  ],
});

export const intermediateLessons = [python, prompt, rag];
