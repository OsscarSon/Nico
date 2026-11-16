import { useEffect, useRef, useState } from "react";
import { dnsNames, dnsScenario, emptyCache, resolve, scenarioAnswers, type Cache, type DnsStep, type Resolution } from "../grading/dns";
import { Feedback } from "../components/ui";

type Props = { mode: "free" | "challenge"; onSolved?: () => void };

function StepCard({ s, n }: { s: DnsStep; n: number }) {
  return (
    <li className={`dns-step ${s.kind}`}>
      <span className="dns-route"><span className="dns-n">{n}</span>{s.from} → {s.to}</span>
      <span className="dns-q">问：{s.question}</span>
      {s.reply && <span className="dns-a">答：{s.reply}</span>}
    </li>
  );
}

function CacheView({ cache }: { cache: Cache }) {
  const answers = Object.entries(cache.answers);
  return (
    <div className="dns-cache">
      <strong>解析器的缓存：</strong>
      {answers.length === 0 && cache.zones.length === 0 ? (
        <span className="muted">空的</span>
      ) : (
        <ul>
          {answers.map(([n, ip]) => <li key={n} className="mono">{n} → {ip}</li>)}
          {cache.zones.map((z) => <li key={z} className="mono">知道谁管 {z.includes(".") ? z : "." + z}</li>)}
        </ul>
      )}
    </div>
  );
}

const askedList = (steps: DnsStep[]): string =>
  steps.filter((s) => s.asksServer).map((s) => s.to).join(" → ");

function Free() {
  const [cache, setCache] = useState<Cache>(emptyCache());
  const [run, setRun] = useState<{ name: string; res: Resolution; shown: number } | null>(null);

  const start = (name: string) => {
    const res = resolve(name, cache);
    setRun({ name, res, shown: 1 });
  };
  const finished = run ? run.shown >= run.res.steps.length : false;
  const reveal = () => {
    if (!run) return;
    const shown = run.shown + 1;
    setRun({ ...run, shown });
    if (shown >= run.res.steps.length) setCache(run.res.cache); // 查询结束才写入缓存
  };

  return (
    <div>
      <div className="gate-picker" role="group" aria-label="选择要查询的名字">
        {dnsNames.map((n) => (
          <button key={n} type="button" className="btn secondary" onClick={() => start(n)} disabled={run !== null && !finished}>
            查 {n}
          </button>
        ))}
      </div>
      {run && (
        <>
          <ol className="dns-steps" aria-label={`查询 ${run.name} 的过程`}>
            {run.res.steps.slice(0, run.shown).map((s, i) => <StepCard key={i} s={s} n={i + 1} />)}
          </ol>
          {!finished ? (
            <button type="button" className="btn" onClick={reveal}>下一个回应</button>
          ) : (
            <Feedback ok>
              查询完成：{run.name} 的地址是 {run.res.ip ?? "（没有找到）"}。这次问了 {run.res.serversAsked} 个服务器
              {run.res.serversAsked ? `（${askedList(run.res.steps)}）` : "，全程用缓存"}。
            </Feedback>
          )}
        </>
      )}
      {!run && <p className="muted">点上面的名字开始一次查询。缓存现在是空的。</p>}
      <CacheView cache={cache} />
      <div className="row" style={{ marginTop: "var(--s3)" }}>
        <button type="button" className="btn ghost" onClick={() => { setCache(emptyCache()); setRun(null); }}>清空缓存</button>
        <span className="muted dns-note">真实缓存会按 TTL 过期；这里一直保留，点\u201C清空缓存\u201D就相当于过期了。</span>
      </div>
    </div>
  );
}

function Challenge({ onSolved }: { onSolved?: () => void }) {
  const answers = scenarioAnswers();
  const [idx, setIdx] = useState(0);
  const [cache, setCache] = useState<Cache>(emptyCache());
  const [wrong, setWrong] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const fired = useRef(false);
  const all = idx >= dnsScenario.length;

  useEffect(() => {
    if (all && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [all, onSolved]);

  if (all) return <Feedback ok>四次预测都对了。你已经懂了解析器的缓存是怎么省掉查询的。</Feedback>;

  const name = dnsScenario[idx] as string;
  const res = resolve(name, cache);
  const choose = (n: number) => {
    if (done || wrong.includes(n)) return;
    if (n === answers[idx]) setDone(true);
    else setWrong((w) => [...w, n]);
  };
  const next = () => { setCache(res.cache); setIdx(idx + 1); setWrong([]); setDone(false); };

  return (
    <div>
      <p className="qmeta">第 {idx + 1} / {dnsScenario.length} 次查询（缓存会延续到下一次）</p>
      <p className="target">现在要解析 <span className="mono">{name}</span>。这次解析器需要问几个服务器？</p>
      <p className="muted" style={{ margin: "0 0 var(--s2)" }}>根服务器、TLD 服务器、权威服务器各算 1 个；只问解析器自己的缓存不算。</p>
      <CacheView cache={cache} />
      <div className="gate-picker" role="group" aria-label="需要问几个服务器">
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className={`btn ${wrong.includes(n) ? "ghost" : "secondary"}`}
            disabled={done || wrong.includes(n)}
            aria-label={`${n} 个${wrong.includes(n) ? "（已排除）" : ""}`}
            onClick={() => choose(n)}
          >
            {n} 个
          </button>
        ))}
      </div>
      {wrong.length > 0 && !done && (
        <Feedback ok={false}>不是 {wrong.at(-1)} 个。先看缓存里已经有什么：有这个名字的答案吗？有谁管这个域名的信息吗？</Feedback>
      )}
      {done && (
        <>
          <Feedback ok>
            对了，是 {res.serversAsked} 个。{res.serversAsked ? `解析器依次问了：${askedList(res.steps)}。` : "缓存里已经有答案，不用问任何服务器。"}
          </Feedback>
          <ol className="dns-steps" aria-label="这次查询的完整过程">
            {res.steps.map((s, i) => <StepCard key={i} s={s} n={i + 1} />)}
          </ol>
          <div className="row"><button type="button" className="btn" onClick={next}>{idx + 1 < dnsScenario.length ? "下一次查询" : "完成"}</button></div>
        </>
      )}
    </div>
  );
}

export function DnsSim({ mode, onSolved }: Props) {
  return mode === "free" ? <Free /> : <Challenge onSolved={onSolved} />;
}
