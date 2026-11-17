import { describe, it, expect } from "vitest";
import { initialTls, tlsStep, tlsProtected, type CertificateCase, type TlsAction } from "../src/grading/tls";
const actions: TlsAction[] = ["hello", "server", "verify", "finish"];
const complete = (variant: CertificateCase = "valid") => actions.reduce((s, a) => tlsStep(s, a, true), initialTls("www.example.com", variant));
describe("TLS security state (no fake cryptography)", () => {
  it("derives handshake keys before authentication, but protects application data only after both Finished checks", () => {
    let s = initialTls(); expect(tlsProtected(s)).toBe(false);
    s = tlsStep(s, "hello", true); s = tlsStep(s, "server", true);
    expect(s.keysDerived).toBe(true); expect(s.identityVerified).toBe(false); expect(tlsProtected(s)).toBe(false);
    s = tlsStep(s, "verify", true); expect(s.serverFinishedVerified).toBe(true); expect(tlsProtected(s)).toBe(false);
    s = tlsStep(s, "finish", true); expect(tlsProtected(s)).toBe(true);
  });
  it.each<CertificateCase>(["wrong-name", "untrusted", "expired", "tampered"])("rejects %s without bypass", variant => {
    const s = complete(variant); expect(s.phase).toBe("failed"); expect(tlsProtected(s)).toBe(false); expect(s.identityVerified).toBe(false);
    expect(tlsStep(s, "finish", true).phase).toBe("failed");
  });
  it("cannot skip handshake stages or start without TCP", () => {
    for (const a of actions) expect(tlsStep(initialTls(), a, false).phase).toBe("idle");
    for (const a of ["server", "verify", "finish"] as const) expect(tlsStep(initialTls(), a, true).phase).toBe("idle");
    const hello = tlsStep(initialTls(), "hello", true); expect(tlsStep(hello, "finish", true).phase).toBe("client-hello");
  });
  it("binds identity to the URL hostname and rejects contradictory certificate state", () => {
    const s = complete(); expect(tlsProtected({ ...s, hostname: "other.example.com" })).toBe(false);
    expect(tlsProtected({ ...s, certificate: { ...s.certificate!, trusted: false } })).toBe(false);
    expect(tlsProtected({ ...s, serverFinishedVerified: false })).toBe(false);
  });
  it("normalizes hostname without mutating prior states", () => {
    const s = initialTls("WWW.EXAMPLE.COM"), before = structuredClone(s); complete(); tlsStep(s, "hello", true);
    expect(s.hostname).toBe("www.example.com"); expect(s).toEqual(before);
  });
  it.each(["", "www.example.com/path", "has space", "bad:443", "a".repeat(254)])("diagnoses invalid identity %s", value => expect(() => initialTls(value)).toThrow());
});
