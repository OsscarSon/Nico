import { CopyFormula,Favorite } from "../study/reading";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "../../../app/router";
import { Markdown } from "../../../ai/markdown";
import { knowledgeLink } from "../../../content/academy2/knowledgeRegistry";
import type { TeachingBlock } from "../../../content/academy2/teaching/schema";
import { MathText, RichText } from "./math";

const PythonExample = lazy(() => import("./TeachingPython"));
type Interactives = Readonly<Record<string, () => ReactNode>>;
const rich = (text: string) => <RichText text={text} />;
type Steps = Extract<TeachingBlock, { type: "sequence" }>["steps"];
function StepList({ steps }: { steps: Steps }) {
  return (
    <ol className="teaching-steps">
      {steps.map((step, index) => (
        <li key={index}>
          <strong>{step.title}</strong>
          <p>{rich(step.body)}</p>
          {step.formula && <MathText latex={step.formula} display />}
        </li>
      ))}
    </ol>
  );
}
function Example({
  example,
}: {
  example: Extract<TeachingBlock, { type: "example" }>;
}) {
  const stats = example.kind === "statistics";
  const solution = (
    <>
      <StepList steps={example.steps} />
      <p>
        <strong>{stats ? "结果解释" : "最终答案"} </strong>
        {rich(example.answer)}
      </p>
      <p>
        <strong>{stats ? "局限性" : "结果检查"} </strong>
        {rich(example.check)}
      </p>
    </>
  );
  return (
    <div className="teaching-example">
      <dl>
        <dt>{stats ? "研究问题" : "目标"}</dt>
        <dd>{rich(example.goal)}</dd>
        <dt>{stats ? "数据与抽样条件" : "已知条件"}</dt>
        <dd>{rich(example.given)}</dd>
        {example.assumptions && (
          <>
            <dt>模型假设</dt>
            <dd>{rich(example.assumptions)}</dd>
          </>
        )}
        <dt>{stats ? "方法选择" : "公式或定理"}</dt>
        <dd>{rich(example.method)}</dd>
      </dl>
      {example.reveal ? (
        <details>
          <summary>展开逐步解答</summary>
          {solution}
        </details>
      ) : (
        solution
      )}
    </div>
  );
}
const tones = {
  definition: "定义",
  theorem: "定理",
  warning: "重点提醒",
  mistake: "误区与反例",
  term: "术语",
  application: "实际应用",
} as const;
const exampleLabels = {
  basic: "基础",
  standard: "标准",
  variant: "变式",
  application: "应用",
  challenge: "挑战",
  correction: "纠错",
} as const;
type BlockProps = {
  item: TeachingBlock;
  widgets: Interactives;
  level: number;
  sectionClass?: string;
  topic?: string;
  anchor: string;
};
function Block({ item, widgets, level, sectionClass, topic, anchor }: BlockProps) {
  const Heading = `h${Math.min(level, 6)}` as "h2" | "h3" | "h4" | "h5" | "h6";
  switch (item.type) {
    case "section":
      return (
        <section
          className={
            sectionClass
              ? "teaching-section " + sectionClass
              : "teaching-section"
          }
        >
          <Heading>{item.title}</Heading>
          <BlockList blocks={item.blocks} widgets={widgets} level={level + 1} topic={topic} prefix={anchor} />
        </section>
      );
    case "disclosure":
      return (
        <details className="teaching-disclosure">
          <summary>{item.title}</summary>
          <BlockList blocks={item.blocks} widgets={widgets} level={level + 1} topic={topic} prefix={anchor} />
        </details>
      );
    case "paragraph":
      return <p>{rich(item.body)}</p>;
    case "math":
      return (
        <figure className="teaching-formula" id={topic?anchor:undefined}>
          <MathText latex={item.latex} display />
          {item.caption && <figcaption>{rich(item.caption)}</figcaption>}
          {topic&&<div className="study-tools"><CopyFormula latex={item.latex}/><Favorite item={{kind:"formula",topic,anchor,title:item.caption??"数学公式",text:item.latex}}/></div>}
        </figure>
      );
    case "note":
      return (
        <aside className="teaching-note" data-tone={item.tone}>
          <Heading>
            {tones[item.tone]} · {item.title}
          </Heading>
          <p>{rich(item.body)}</p>
        </aside>
      );
    case "sequence":
      return (
        <section>
          <Heading>{item.title}</Heading>
          <p>{rich(item.strategy)}</p>
          <StepList steps={item.steps} />
          {item.check && <p>{rich(item.check)}</p>}
        </section>
      );
    case "example":
      return (
        <section id={topic?anchor:undefined}>
          <Heading>
            {exampleLabels[item.level]}例题 · {item.title}
          </Heading>
          <Example example={item} />
          {topic&&<Favorite item={{kind:"example",topic,anchor,title:item.title}}/>}
        </section>
      );
    case "table":
      return (
        <div
          className="teaching-table"
          role="region"
          aria-label={item.title}
          tabIndex={0}
        >
          <table>
            <caption>{item.title}</caption>
            <thead>
              <tr>
                {item.columns.map((column, i) => (
                  <th scope="col" key={i}>
                    {rich(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{rich(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "image":
      return (
        <figure className="teaching-image">
          <img
            src={import.meta.env.BASE_URL + item.src}
            alt={item.alt}
            loading="lazy"
            decoding="async"
          />
          {item.caption && <figcaption>{rich(item.caption)}</figcaption>}
        </figure>
      );
    case "interactive":
      return widgets[item.id] ? (
        <details>
          <summary>{item.title}</summary>
          <MountOnOpen render={widgets[item.id]!} />
        </details>
      ) : null;
    case "code":
      return (
        <section className="teaching-code">
          <Heading>
            {item.title} ·{" "}
            {item.language === "cpp" ? "C++" : item.language.toUpperCase()}
          </Heading>
          <pre tabIndex={0}>
            <code>{item.code}</code>
          </pre>
          {item.expected && (
            <>
              <p>示例输出</p>
              <pre tabIndex={0}>{item.expected}</pre>
            </>
          )}
          {item.runnable && (
            <details>
              <summary>编辑并在浏览器运行 Python</summary>
              <MountOnOpen
                render={() => (
                  <Suspense fallback={<p role="status">正在加载代码编辑器…</p>}>
                    <PythonExample initial={item.code} />
                  </Suspense>
                )}
              />
            </details>
          )}
        </section>
      );
    case "markdown":
      return <Markdown text={item.body} />;
    case "links":
      return (
        <section>
          <Heading>{item.title}</Heading>
          <ul className="a2-link-list">
            {item.topics.map((topic) => (
              <li key={topic.id}>
                <Link to={knowledgeLink(topic.id)}>{topic.title} ↗</Link>
              </li>
            ))}
          </ul>
        </section>
      );
    case "summary":
      return (
        <section>
          <Heading>小结</Heading>
          <ul>
            {item.points.map((point, i) => (
              <li key={i}>{rich(point)}</li>
            ))}
          </ul>
        </section>
      );
    case "references":
      return (
        <section>
          <Heading>教材与参考</Heading>
          <ul className="a2-link-list">
            {item.items.map((source, i) => (
              <li key={i}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      );
  }
}

function MountOnOpen({ render }: { render: () => ReactNode }) {
  const marker = useRef<HTMLSpanElement>(null);
  const [mount, setMount] = useState(false);
  useEffect(() => {
    const details = marker.current?.parentElement;
    if (!(details instanceof HTMLDetailsElement)) return;
    const sync = () => {
      if (details.open) setMount(true);
    };
    sync();
    details.addEventListener("toggle", sync);
    return () => details.removeEventListener("toggle", sync);
  }, []);
  return (
    <>
      <span hidden ref={marker} />
      {mount && render()}
    </>
  );
}
export function BlockList({
  blocks,
  widgets = {},
  level = 2,
  sectionClass,
  topic,
  prefix="advanced",
}: {
  blocks: TeachingBlock[];
  widgets?: Interactives;
  level?: number;
  sectionClass?: string;
  topic?: string;
  prefix?: string;
}) {
  return (
    <>
      {blocks.map((item, i) => (
        <Block
          key={i}
          item={item}
          widgets={widgets}
          level={level}
          sectionClass={sectionClass}
          topic={topic}
          anchor={prefix+"-"+(i+1)}
        />
      ))}
    </>
  );
}
