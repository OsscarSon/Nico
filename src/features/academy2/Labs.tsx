import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, usePath } from "../../app/router";
import { Device, EmptyState } from "../../components/ui";
import { courseLink } from "../../content/academy2/model";
import { laboratories } from "../../content/academy2/resources";
import { initialSortInput, insertionFrames, parseSortInput, sampleBernoulliDistribution, samplePolynomial } from "../../grading/academy2/labs";
import { BitSwitches } from "../../sims/BitSwitches";
import { PageHeading } from "./Curriculum";
import { benches, Workbench } from "./P1";
import { benchLink } from "../../content/academy2/p1/navigation";
import { findP1Lesson } from "../../content/academy2/p1";
import { knowledgeLink } from "../../content/academy2/knowledgeRegistry";

function MathWorkbench() {
  const [a, setA] = useState(1), [b, setB] = useState(0), [c, setC] = useState(0);
  const graph = useRef<HTMLCanvasElement>(null);
  const expression = "y = " + a + "x² " + (b < 0 ? "− " : "+ ") + Math.abs(b) + "x " + (c < 0 ? "− " : "+ ") + Math.abs(c);
  useEffect(() => {
    const canvas = graph.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = "#101b30";
    ctx.fillRect(0, 0, w, h);
    const points = samplePolynomial(a, b, c);
    const extent = Math.max(10, ...points.map(point => Math.abs(point.y)));
    const x = (n: number) => w * (n + 5) / 10;
    const y = (n: number) => h / 2 - n / extent * h * .43;
    ctx.strokeStyle = "#283957";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -5; i <= 5; i++) { ctx.moveTo(x(i), 0); ctx.lineTo(x(i), h); }
    for (let i = -4; i <= 4; i++) { ctx.moveTo(0, h / 2 - i * h / 10); ctx.lineTo(w, h / 2 - i * h / 10); }
    ctx.stroke();
    ctx.strokeStyle = "#718bad";
    ctx.beginPath(); ctx.moveTo(0, y(0)); ctx.lineTo(w, y(0)); ctx.moveTo(x(0), 0); ctx.lineTo(x(0), h); ctx.stroke();
    ctx.strokeStyle = "#7ee9be"; ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((point, i) => i ? ctx.lineTo(x(point.x), y(point.y)) : ctx.moveTo(x(point.x), y(point.y)));
    ctx.stroke();
  }, [a, b, c]);
  return <section className="a2-panel a2-workbench">
    <div><h2>一次与二次函数绘图</h2><p>将 a 设为 0 对比直线，改变 c 观察纵截距。</p></div>
    <div className="a2-lab-controls">
      <label htmlFor="math-a">二次项 a <output>{a}</output><input id="math-a" type="range" min="-3" max="3" step=".5" value={a} onChange={event => setA(Number(event.target.value))} /></label>
      <label htmlFor="math-b">一次项 b <output>{b}</output><input id="math-b" type="range" min="-5" max="5" step=".5" value={b} onChange={event => setB(Number(event.target.value))} /></label>
      <label htmlFor="math-c">常数 c <output>{c}</output><input id="math-c" type="range" min="-5" max="5" step=".5" value={c} onChange={event => setC(Number(event.target.value))} /></label>
    </div>
    <p className="a2-equation" aria-live="polite">{expression}</p>
    <canvas ref={graph} width={720} height={360} role="img" aria-label={expression + " 的函数图象，以下列出代表性数值"} />
    <p className="a2-series" aria-live="polite">{[-2, -1, 0, 1, 2].map(x => <span key={x}>f({x}) = {a*x*x+b*x+c}</span>)}</p>
    <button className="btn secondary" type="button" onClick={() => { setA(1); setB(0); setC(0); }}>重置系数</button>
  </section>;
}

function StatisticsWorkbench() {
  const [probability, setProbability] = useState(.5), [size, setSize] = useState(20), [seed, setSeed] = useState(2027);
  const replications = 120;
  const data = sampleBernoulliDistribution(probability, size, replications, seed);
  const tallest = Math.max(...data.bins);
  return <section className="a2-panel a2-workbench">
    <div><h2>伯努利抽样与样本比例</h2><p>每次抽取 {size} 个独立事件，共重复 {replications} 次。观察样本量如何改变比例的波动。</p></div>
    <div className="a2-lab-controls">
      <label htmlFor="stats-probability">成功概率 <output>{probability.toFixed(2)}</output><input id="stats-probability" type="range" min="0" max="1" step=".05" value={probability} onChange={event => setProbability(Number(event.target.value))} /></label>
      <label htmlFor="stats-size">每组样本量 <output>{size}</output><input id="stats-size" type="range" min="5" max="120" step="5" value={size} onChange={event => setSize(Number(event.target.value))} /></label>
    </div>
    <ol className="a2-histogram" aria-label="样本比例分布">{data.bins.map((count, i) => <li key={i}>
      <div className="a2-histogram-plot" aria-hidden="true"><i style={{ height: count / tallest * 100 + "%" }} /></div>
      <span title={count + " 组"}>{i / 10}</span><span className="sr-only">起始比例区间有 {count} 组</span>
    </li>)}</ol>
    <p className="a2-series" aria-live="polite"><span>抽样平均 {data.mean.toFixed(3)}</span><span>理论标准差 {data.theoreticalSD.toFixed(3)}</span><span>随机种子 {seed}</span></p>
    <button className="btn secondary" type="button" onClick={() => setSeed(seed + 1)}>重新抽样</button>
  </section>;
}

function AlgorithmWorkbench() {
  const [text, setText] = useState(initialSortInput);
  const [input, setInput] = useState(() => parseSortInput(initialSortInput)!);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const frames = insertionFrames(input);
  const frame = frames[step]!;
  function load(event: FormEvent) {
    event.preventDefault();
    const result = parseSortInput(text);
    if (!result) { setError("请用逗号或空格输入 2–12 个 −99 到 99 的整数。"); return; }
    setInput(result); setStep(0); setError("");
  }
  return <section className="a2-panel a2-workbench">
    <div><h2>插入排序可视化</h2><p>每一步执行比较或向右移动。完成后可修改输入，再比较不同顺序需要多少次比较。</p></div>
    <form className="a2-lab-form" onSubmit={load}><label>排序数据<input type="text" value={text} onChange={event => setText(event.target.value)} /></label><button className="btn" type="submit">加载数据</button></form>
    {error && <p className="feedback bad" role="alert">{error}</p>}
    <ol className="a2-sort" aria-label="当前元素顺序">{frame.order.map((value, i) => <li key={i}
      data-compare={frame.left === i || frame.right === i ? "true" : undefined}
      data-sorted={i < frame.sorted ? "true" : undefined}>{value}</li>)}</ol>
    <p aria-live="polite">{frame.message} 比较 {frame.comparisons} 次 · 步骤 {step + 1}/{frames.length}</p>
    <div className="row"><button type="button" className="btn secondary" disabled={!step} onClick={() => setStep(step - 1)}>上一步</button>
      <button type="button" className="btn" disabled={step === frames.length - 1} onClick={() => setStep(step + 1)}>执行下一步</button>
      <button type="button" className="btn ghost" onClick={() => setStep(0)}>回到起点</button></div>
  </section>;
}

export function AcademyLabPage({ id }: { id: string }) {
  const params=new URLSearchParams(usePath().split("?")[1]);
  const bench=params.get("bench");
  const from=params.get("from");
  const subject=id==="math" ? "-mathematics/" : id==="statistics" ? "-statistics/" : null;
  const labs=subject ? Object.entries(benches).filter(([key])=>key.includes(subject)) : [];
  const selected=labs.find(([key])=>key===bench);
  const lab = laboratories.find(item => item.id === id);
  if (!lab) return <EmptyState title="找不到这个实验室" action={<Link to="/lab" className="btn">查看实验室</Link>}>请从实验室目录选择一个场景。</EmptyState>;
  return <div className="a2-page">
    <div className="a2-crumbs"><Link to="/lab">实验室</Link><span>/</span><span>{lab.title}</span></div>
    <PageHeading title={lab.title} english={lab.english} intro={lab.intro} />
    {selected&&<>
      {from&&findP1Lesson(from)&&<Link to={knowledgeLink(from)}>← 返回知识点学习</Link>}
      <Workbench key={selected[0]} bench={selected[1]} />
    </>}
    {!selected&&id === "math" && <MathWorkbench />}
    {!selected&&id === "statistics" && <StatisticsWorkbench />}
    {labs.length>0&&<section className="a2-panel"><h2>课程配套实验</h2><ul className="a2-link-list">{labs.map(([key,work])=><li key={key}><Link to={benchLink(key)}>{work.title} ↗</Link></li>)}</ul></section>}
    {id === "algorithms" && <AlgorithmWorkbench />}
    {id === "systems" && <Device title="位开关" label="模拟"><p>切换各位，看二进制与十进制之间的关系。</p><BitSwitches mode="free" /></Device>}
    {lab.links.length > 0 && <section className="a2-panel a2-lab-links"><h2>{lab.available ? "继续动手" : lab.primary}</h2><ul className="a2-link-list">
      {lab.links.map(([title, path]) => <li key={path}><Link to={path}>{title} ↗</Link></li>)}
    </ul></section>}
    <section className="a2-panel a2-lab-links"><h2>后续建设</h2><p>{lab.planned}</p><Link to={courseLink(lab.course)}>查看相关课程入口 ↗</Link></section>
  </div>;
}
