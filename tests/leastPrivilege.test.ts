import { describe, it, expect } from "vitest";
import { initialPrivilege, neededPermissions, inspectPurpose, changeGrant, revokeApp, changeMeetingMode, runApp, selectNoteDraft, setAutoUpdate, installUpdate, setScreenLock, lockDevice, probeDevice, backupNotes, loseNotes, restoreNotes, gradePrivilege, publicNotes, type PrivilegeState, type AppId } from "../src/grading/leastPrivilege";
function minimal(s: PrivilegeState, id: AppId) { s = inspectPurpose(revokeApp(s, id), id); for (const p of neededPermissions(id, s.meetingMode)) s = changeGrant(s, id, p, true); return runApp(s, id); }
function twoTasks() { let s = minimal(initialPrivilege(), "scanner"); s = minimal(s, "meeting"); return minimal(changeMeetingMode(s, "video"), "meeting"); }
function defenses(s: PrivilegeState) { return probeDevice(lockDevice(setScreenLock(installUpdate(setAutoUpdate(s, true)), true), true)); }
describe("A20 current capability states and actual task/recovery outputs", () => {
  it("overgranting works but is not minimal, while deny-all and administrator alone cannot run camera tasks", () => {
    const s = initialPrivilege(); expect(runApp(s, "scanner").apps.scanner.proof?.output).toContain("receipt-demo"); expect(gradePrivilege(runApp(s, "scanner"), "scanner").ok).toBe(false);
    const none = revokeApp(s, "scanner"); expect(runApp(none, "scanner").apps.scanner.proof).toBeNull();
    expect(runApp(changeGrant(none, "scanner", "admin", true), "scanner").apps.scanner.proof).toBeNull(); expect(s.apps.scanner.grants.length).toBe(8);
  });
  it("requires inspected requirements and successful execution under the current grants", () => {
    let s = minimal(initialPrivilege(), "scanner"); expect(gradePrivilege(s, "scanner").ok).toBe(true);
    s = changeGrant(s, "scanner", "contacts", true); expect(s.apps.scanner.proof).toBeNull();
    s = changeGrant(s, "scanner", "contacts", false); expect(gradePrivilege(s, "scanner").ok).toBe(false); s = runApp(s, "scanner"); expect(gradePrivilege(s, "scanner").ok).toBe(true);
    expect(gradePrivilege({ ...s, apps: { ...s.apps, scanner: { ...s.apps.scanner, inspectedPurpose: null } } }, "scanner").ok).toBe(false);
  });
  it("context changes the minimum: audio needs microphone, video also needs camera and a fresh purpose check", () => {
    let s = minimal(initialPrivilege(), "scanner"); s = minimal(s, "meeting"); expect(s.audioProof?.output).toContain("语音");
    s = changeMeetingMode(s, "video"); expect(runApp(s, "meeting").apps.meeting.proof).toBeNull();
    s = changeGrant(s, "meeting", "camera", true); s = runApp(s, "meeting"); expect(gradePrivilege(s, "meeting").ok).toBe(false);
    s = runApp(inspectPurpose(s, "meeting"), "meeting"); expect(gradePrivilege(s, "meeting").ok).toBe(true);
    expect(gradePrivilege(minimal(changeMeetingMode(minimal(initialPrivilege(), "scanner"), "video"), "meeting"), "meeting").ok).toBe(false);
  });
  it("policy switches alone do not prove an installed patch or blocked access", () => {
    let s = minimal(twoTasks(), "notes"); s = setScreenLock(setAutoUpdate(s, true), true);
    expect(s.installed).toBe(1); expect(probeDevice(s).blockedProbe).toBeNull(); expect(gradePrivilege(s, "defense").ok).toBe(false);
    s = defenses(s); expect(s.blockedProbe).toBe(s.lockRevision); expect(s.installed).toBe(2);
    expect(runApp(s, "notes").note).toContain("已锁屏"); expect(setScreenLock(s, false).blockedProbe).toBeNull();
  });
  it("same-storage failure destroys the original and its local backup, without fabricating a restore", () => {
    const s = loseNotes(backupNotes(initialPrivilege(), "same-device")); expect(s.notes).toBeNull(); expect(s.backup).toBeNull();
    expect(restoreNotes(s).notes).toBeNull(); expect(backupNotes(s, "offline").backup).toBeNull(); expect(runApp(s, "notes").apps.notes.proof).toBeNull();
  });
  it("restoring an old offline copy cannot claim current-version recovery, even if a later edit writes newer text", () => {
    let s = minimal(twoTasks(), "notes"); s = backupNotes(s, "offline"); s = runApp(selectNoteDraft(s, publicNotes[1]), "notes");
    s = restoreNotes(loseNotes(s)); expect(s.notes).toBe(publicNotes[0]); expect(s.lossTarget).toBe(publicNotes[1]); expect(s.restored).not.toBe(s.lossTarget);
    s = runApp(lockDevice(defenses(s), false), "notes"); expect(s.notes).toBe(publicNotes[1]); expect(gradePrivilege(s, "defense").ok).toBe(false);
  });
  it("passes integrated protection only after current least privilege, installed update, locked probe and byte-identical restore", () => {
    let s = minimal(twoTasks(), "notes"); s = runApp(selectNoteDraft(s, publicNotes[1]), "notes");
    s = backupNotes(s, "offline"); s = lockDevice(defenses(s), false); s = restoreNotes(loseNotes(s));
    expect(gradePrivilege(s, "defense").ok).toBe(false); // Recovery invalidates the old functional result.
    s = runApp(s, "notes"); expect(gradePrivilege(s, "defense").ok).toBe(true);
    expect(gradePrivilege(changeGrant(s, "notes", "all-files", true), "defense").ok).toBe(false);
    expect(gradePrivilege(setAutoUpdate(s, false), "defense").ok).toBe(false);
  });
  it("derives the transfer answer from per-app scopes, not distinct global permission names", () => {
    expect((["scanner", "meeting", "notes"] as const).reduce((sum, id) => sum + neededPermissions(id, "video").length, 0)).toBe(5);
  });
});
