import { describe, it, expect } from "vitest";
import { pbkdf2Sync } from "node:crypto";
import { DEMO_PASSWORDS, DEMO_SALTS, KDF_ITERATIONS, initialPasswordLab, deriveDemoVerifier, chooseDemo, enrollDemo, verifyDemo, setManager, storeDemoInVault, setDemoMfa, setRecoveryPlace, presentDemoFactor, gradePassword, type PasswordLabState, type DemoPasswordId } from "../src/grading/password";
async function enroll(s: PasswordLabState, id: "mail" | "photos", sample: DemoPasswordId, salt: "A" | "B") { return enrollDemo(chooseDemo(s, id, sample, salt), id); }
async function managed() {
  let s = await enroll(initialPasswordLab(), "mail", "managerA", "A"); s = await enroll(s, "photos", "managerB", "B"); s = setManager(s, true);
  return storeDemoInVault(storeDemoInVault(s, "mail"), "photos");
}
describe("A18 real public-fixture password verification", () => {
  it("matches an independent native PBKDF2 oracle, has public salt and reproducible derived bytes", async () => {
    const v = await deriveDemoVerifier("reused", "A");
    expect(v.digest).toBe(pbkdf2Sync(DEMO_PASSWORDS.reused.value, Buffer.from(DEMO_SALTS.A, "hex"), KDF_ITERATIONS, 32, "sha256").toString("hex"));
    expect(v.algorithm).toBe("PBKDF2-HMAC-SHA-256"); expect(v.iterations).toBe(600000); expect(v.salt).toBe(DEMO_SALTS.A);
    expect((await deriveDemoVerifier("reused", "A")).digest).toBe(v.digest);
    expect((await deriveDemoVerifier("reused", "B")).digest).not.toBe(v.digest);
  });
  it("rejects non-fixture passwords and unknown salts instead of accepting private user input", async () => {
    await expect(deriveDemoVerifier("a private string" as DemoPasswordId, "A")).rejects.toThrow("公开");
    await expect(deriveDemoVerifier("reused", "C" as "A")).rejects.toThrow("Salt");
  });
  it("requires actual enrollment and wrong/right re-derivation; changing a draft cannot replace a record", async () => {
    const empty = initialPasswordLab(); expect(gradePassword(empty, "salt").ok).toBe(false);
    expect((await verifyDemo(empty, "mail", "reused")).accounts.mail.auth.stage).toBe("none");
    let s = await enroll(empty, "mail", "reused", "A"); s = await enroll(s, "photos", "reused", "B");
    expect(gradePassword(s, "salt").ok).toBe(false);
    s = await verifyDemo(s, "mail", "long"); expect(s.accounts.mail.auth.stage).toBe("rejected");
    s = await verifyDemo(s, "mail", "reused"); expect(gradePassword(s, "salt").ok).toBe(true);
    const edited = chooseDemo(s, "mail", "managerA", "B"); expect(edited.accounts.mail.verifier).toEqual(s.accounts.mail.verifier);
    const changed = await enrollDemo(edited, "mail"); expect(gradePassword(changed, "salt").ok).toBe(false); expect(s.accounts.mail.version).toBe(1); expect(empty.accounts.mail.verifier).toBeNull();
  });
  it("distinguishes long predictable/reused samples from independent samples and invalidates vault/login on reenrollment", async () => {
    let s = await managed(); expect(gradePassword(s, "unique").ok).toBe(true);
    expect(gradePassword(setManager(s, false), "unique").ok).toBe(false);
    const sameSalt = storeDemoInVault(await enroll(s, "photos", "managerB", "A"), "photos"); expect(gradePassword(sameSalt, "unique").ok).toBe(false);
    s = await enroll(s, "photos", "managerA", "B"); s = storeDemoInVault(s, "photos"); expect(gradePassword(s, "unique").ok).toBe(false);
    s = await enroll(s, "photos", "long", "B"); s = storeDemoInVault(s, "photos"); expect(gradePassword(s, "unique").ok).toBe(false);
    s = await enroll(s, "photos", "managerB", "B"); expect(s.accounts.photos.vaultVersion).toBeNull(); expect(s.accounts.photos.auth.stage).toBe("none"); expect(gradePassword(s, "unique").ok).toBe(false);
  });
  it("requires both actual factor validation and independent recovery, not configuration switches alone", async () => {
    let s = await managed(); for (const id of ["mail", "photos"] as const) s = setRecoveryPlace(setDemoMfa(s, id, true), id, "offline");
    expect(presentDemoFactor(s, "mail", "registered").accounts.mail.auth.stage).toBe("none"); expect(gradePassword(s, "mfa").ok).toBe(false);
    s = await verifyDemo(s, "mail", "managerA"); expect(s.accounts.mail.auth.stage).toBe("factor-needed");
    s = presentDemoFactor(s, "mail", "stranger"); expect(s.accounts.mail.auth.stage).toBe("factor-needed");
    s = presentDemoFactor(s, "mail", "registered"); expect(gradePassword(s, "mfa").ok).toBe(true);
    expect(gradePassword(setRecoveryPlace(s, "photos", "same-device"), "mfa").ok).toBe(false);
    expect(gradePassword(setDemoMfa(s, "mail", false), "mfa").ok).toBe(false);
    expect(gradePassword(await enrollDemo(s, "mail"), "mfa").ok).toBe(false);
  });
});
