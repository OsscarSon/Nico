import { useEffect, useRef, useState } from "react";
import {
  describeSubnet, formatIPv4, gradeSubnetTask, parseIPv4, subnetTasks, toBinaryDotted,
} from "../grading/ip";
import { Feedback } from "../components/ui";

type Props = { mode: "free" | "challenge"; onSolved?: () => void };

/** 把 32 位二进制分成「网络号」和「主机号」两段着色（同时有文字说明，不只靠颜色）。 */
function Bits({ ip, prefix }: { ip: number; prefix: number }) {
  const dotted = toBinaryDotted(ip);
  let bit = 0;
  return (
    <span className="ipbits mono" aria-hidden="true">
      {[...dotted].map((ch, i) => {
        if (ch === ".") return <span key={i} className="ipdot">.</span>;
        const isNet = bit < prefix;
        bit += 1;
        return <span key={i} className={isNet ? "bit-net" : "bit-host"}>{ch}</span>;
      })}
    </span>
  );
}

function Free() {
  const [text, setText] = useState("192.168.1.10");
  const [prefix, setPrefix] = useState(24);
  const ip = parseIPv4(text);
  const d = ip === null ? null : describeSubnet(ip, prefix);

  return (
    <div>
      <div className="subnet-inputs">
        <label className="field">
          <span>IP 地址</span>
          <input type="text" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={ip === null} />
        </label>
        <label className="field">
          <span>网络号的长度：/{prefix}</span>
          <input type="range" min={8} max={30} value={prefix} onChange={(e) => setPrefix(Number(e.target.value))} aria-label={`网络号的长度，当前 ${prefix} 位`} />
        </label>
      </div>
      {d === null ? (
        <Feedback ok={false}>请输入 4 段 0 到 255 的数字，用点隔开，不要多余的 0 或空格以外的字符。</Feedback>
      ) : (
        <>
          <p className="ip-legend">
            <span className="bit-net mono">蓝色粗体：网络号 {prefix} 位</span>
            <span className="bit-host mono">灰色：主机号 {32 - prefix} 位</span>
          </p>
          <p className="ip-binary"><Bits ip={d.ip} prefix={prefix} /></p>
          <p className="sr-only">二进制里前 {prefix} 位是网络号，后 {32 - prefix} 位是主机号。</p>
          <table className="truth ip-table">
            <tbody>
              <tr><th scope="row">子网掩码</th><td className="mono">{formatIPv4(d.mask)}</td></tr>
              <tr><th scope="row">网络地址<small>主机位全 0</small></th><td className="mono">{formatIPv4(d.network)}</td></tr>
              <tr><th scope="row">广播地址<small>主机位全 1</small></th><td className="mono">{formatIPv4(d.broadcast)}</td></tr>
              <tr><th scope="row">可分配的地址范围</th><td className="mono">{formatIPv4(d.firstHost)} 到 {formatIPv4(d.lastHost)}</td></tr>
              <tr><th scope="row">最多能接的设备数</th><td className="mono">{d.hosts}</td></tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function Challenge({ onSolved }: { onSolved?: () => void }) {
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [done, setDone] = useState(false);
  const fired = useRef(false);
  const task = subnetTasks[idx];
  const all = idx >= subnetTasks.length;

  useEffect(() => {
    if (all && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [all, onSolved]);

  if (all || !task) return <Feedback ok>四组都判断对了。你已经会用网络地址判断同一网段了。</Feedback>;

  const answer = (saysSame: boolean) => {
    if (done) return;
    const r = gradeSubnetTask(task, saysSame);
    setMsg(r);
    if (r.ok) setDone(true);
  };
  const next = () => { setIdx(idx + 1); setMsg(null); setDone(false); };
  const a = parseIPv4(task.a) as number;
  const b = parseIPv4(task.b) as number;

  return (
    <div>
      <p className="qmeta">第 {idx + 1} / {subnetTasks.length} 组</p>
      <p className="target">掩码 <span className="mono">/{task.prefix}</span>：这两台设备在同一个网段吗？</p>
      <div className="ip-pair">
        <div><span className="muted">设备 A</span><span className="mono">{task.a}</span><Bits ip={a} prefix={task.prefix} /></div>
        <div><span className="muted">设备 B</span><span className="mono">{task.b}</span><Bits ip={b} prefix={task.prefix} /></div>
      </div>
      <div className="row" style={{ marginTop: "var(--s3)" }}>
        <button type="button" className="btn secondary" disabled={done} onClick={() => answer(true)}>同一网段</button>
        <button type="button" className="btn secondary" disabled={done} onClick={() => answer(false)}>不同网段</button>
      </div>
      {msg && <Feedback ok={msg.ok}>{msg.message}</Feedback>}
      {done && (
        <div className="row" style={{ marginTop: "var(--s3)" }}>
          <button type="button" className="btn" onClick={next}>{idx + 1 < subnetTasks.length ? "下一组" : "完成"}</button>
        </div>
      )}
    </div>
  );
}

export function SubnetSim({ mode, onSolved }: Props) {
  return mode === "free" ? <Free /> : <Challenge onSolved={onSolved} />;
}
