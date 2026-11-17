/** TLS 1.3 security-state teaching model. No cryptography, real certificates or network IO. */
export type CertificateCase = "valid" | "wrong-name" | "untrusted" | "expired" | "tampered";
export const certificateLabels: Record<CertificateCase, string> = {
  valid: "域名、信任、有效期与握手证明均正确", "wrong-name": "证书域名不匹配", untrusted: "签发者不受信任", expired: "证书已过期", tampered: "握手完整性证明被篡改",
};
export type TlsAction = "hello" | "server" | "verify" | "finish";
export type TlsState = {
  hostname: string; certificateCase: CertificateCase;
  phase: "idle" | "client-hello" | "server-flight" | "verified" | "established" | "failed";
  certificate: { hostname: string; trusted: boolean; inDate: boolean; handshakeProof: boolean } | null;
  keysDerived: boolean; identityVerified: boolean; serverFinishedVerified: boolean; clientFinishedVerified: boolean;
  note: string; trace: string[];
};
export function initialTls(hostname = "www.example.com", certificateCase: CertificateCase = "valid"): TlsState {
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(hostname) || hostname.length > 253) throw Error("请输入不含路径、空格或端口的教学主机名。");
  return { hostname: hostname.toLowerCase(), certificateCase, phase: "idle", certificate: null, keysDerived: false, identityVerified: false, serverFinishedVerified: false, clientFinishedVerified: false, note: "尚未开始TLS；先要有可用的TCP连接。", trace: [] };
}
const note = (s: TlsState, text: string): TlsState => ({ ...s, note: text, trace: [...s.trace, text].slice(-40) });
export function tlsStep(s: TlsState, action: TlsAction, transportReady: boolean): TlsState {
  if (!transportReady) return note(s, "TCP尚未建立，TLS握手不能凭空完成。");
  if (action === "hello" && s.phase === "idle") return note({ ...s, phase: "client-hello" }, `客户端发送ClientHello，声明目标${s.hostname}与协商参数。`);
  if (action === "server" && s.phase === "client-hello") {
    const certificate = { hostname: s.certificateCase === "wrong-name" ? "other.example.com" : s.hostname, trusted: s.certificateCase !== "untrusted", inDate: s.certificateCase !== "expired", handshakeProof: s.certificateCase !== "tampered" };
    return note({ ...s, phase: "server-flight", keysDerived: true, certificate }, "收到服务器握手flight：ServerHello、证书/签名与Finished；模拟协商出密钥，尚未核验身份和握手完整性，不能发送HTTP应用数据。");
  }
  if (action === "verify" && s.phase === "server-flight" && s.certificate) {
    const c = s.certificate;
    const error = c.hostname !== s.hostname ? "证书域名不匹配" : !c.trusted ? "证书链不受信任" : !c.inDate ? "证书已过期" : !c.handshakeProof ? "证书握手签名或服务器Finished完整性核验失败" : null;
    if (error) return note({ ...s, phase: "failed" }, `${error}；拒绝此TLS会话，不允许忽略验证后继续。`);
    return note({ ...s, phase: "verified", identityVerified: true, serverFinishedVerified: true }, "域名、信任链、有效期、握手签名与服务器Finished均核验通过；还需客户端Finished。");
  }
  if (action === "finish" && s.phase === "verified" && s.keysDerived && s.identityVerified && s.serverFinishedVerified) return note({ ...s, phase: "established", clientFinishedVerified: true }, "客户端发送Finished，服务器核验通过；本教学TLS会话建立，可以传输受保护的HTTP应用记录。");
  return note(s, "当前握手状态不允许这项操作；失败的会话需要重新建立，不能跳过核验。");
}
export const tlsProtected = (s: TlsState): boolean => s.phase === "established" && s.keysDerived && s.identityVerified && s.serverFinishedVerified && s.clientFinishedVerified && s.certificate?.hostname === s.hostname && s.certificate.trusted && s.certificate.inDate && s.certificate.handshakeProof;
