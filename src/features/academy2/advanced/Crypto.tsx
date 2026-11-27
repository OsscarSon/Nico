import { useState } from "react";
import {
  authenticatedPair,
  verifySignature,
} from "../../../grading/academy2/advanced/crypto";

export default function Crypto() {
  const [mode, setMode] = useState<"signature" | "encryption">("signature");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [rows, setRows] = useState<[string, string][]>([]);
  return (
    <section className="a2-panel p3-card p3-lab">
      <h2>密码学完整性实验</h2>
      <p>
        真实浏览器 Web Crypto。使用固定的合成消息和临时密钥。实验在本机执行。
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          setRows([]);
          try {
            if (!globalThis.crypto?.subtle)
              throw Error("此环境未提供 Web Crypto。需要安全上下文。");
            if (mode === "signature") {
              const out = await verifySignature();
              setRows([
                ["原消息核验", out.original ? "通过" : "失败"],
                ["替代消息核验", out.changed ? "通过" : "拒绝"],
                ["签名字节数", String(out.byteCount)],
              ]);
            } else {
              const out = await authenticatedPair();
              setRows([
                ["合法密文还原", out.match ? "通过" : "失败"],
                ["不匹配的附加数据", out.rejectsModified ? "拒绝" : "通过"],
                ["随机 nonce 字节数", String(out.nonceSize)],
              ]);
            }
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "密码学 API 未完成运行。",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          密码学操作
          <select
            value={mode}
            disabled={busy}
            onChange={(event) => {
              setMode(
                event.target.value === "signature" ? "signature" : "encryption",
              );
              setRows([]);
            }}
          >
            <option value="signature">ECDSA 签名与验证</option>
            <option value="encryption">AES-GCM 带认证加密</option>
          </select>
        </label>
        <button className="btn" type="submit" disabled={busy}>
          运行 Web Crypto 核验
        </button>
      </form>
      {error && (
        <p className="feedback bad" role="alert">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <dl className="p3-values" aria-live="polite">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
