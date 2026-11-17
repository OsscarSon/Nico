/** In-memory capabilities only. Never requests real camera, microphone, files or OS permissions. */
export type AppId = "scanner" | "meeting" | "notes";
export type Permission = "camera" | "microphone" | "selected-folder" | "selected-file" | "contacts" | "location" | "all-files" | "admin";
export const permissionLabels: Record<Permission, string> = { camera: "相机", microphone: "麦克风", "selected-folder": "所选收据文件夹", "selected-file": "所选笔记文件", contacts: "通讯录", location: "精确位置", "all-files": "全部文件", admin: "管理员" };
export const appLabels: Record<AppId, string> = { scanner: "收据扫描器", meeting: "课堂会议", notes: "复习笔记" };
export const publicNotes = ["公开笔记v1：复习DNS", "公开笔记v2：复习DNS、TLS与最小权限"] as const;
type Proof = { revision: number; purpose: number; mode: "audio" | "video"; output: string; minimal: boolean };
type LabApp = { grants: Permission[]; revision: number; purpose: number; inspectedPurpose: number | null; proof: Proof | null };
export type PrivilegeState = {
  apps: Record<AppId, LabApp>; meetingMode: "audio" | "video"; audioProof: Proof | null;
  notes: string | null; noteDraft: string; backup: { data: string; location: "same-device" | "offline" } | null;
  lossTarget: string | null; restored: string | null; autoUpdate: boolean; installed: 1 | 2;
  lockEnabled: boolean; locked: boolean; lockRevision: number; blockedProbe: number | null; note: string; trace: string[];
};
const app = (): LabApp => ({ grants: Object.keys(permissionLabels) as Permission[], revision: 0, purpose: 0, inspectedPurpose: null, proof: null });
export const initialPrivilege = (): PrivilegeState => ({ apps: { scanner: app(), meeting: app(), notes: app() }, meetingMode: "audio", audioProof: null, notes: publicNotes[0], noteDraft: publicNotes[0], backup: null, lossTarget: null, restored: null, autoUpdate: false, installed: 1, lockEnabled: false, locked: false, lockRevision: 0, blockedProbe: null, note: "模拟应用起初过度授权；先检查任务，再逐项缩小权限并实际运行。所有数据均为公开虚构样本。", trace: [] });
const say = (s: PrivilegeState, text: string): PrivilegeState => ({ ...s, note: text, trace: [...s.trace, text].slice(-36) });
const replace = (s: PrivilegeState, id: AppId, a: LabApp): PrivilegeState => ({ ...s, apps: { ...s.apps, [id]: a } });
export function neededPermissions(id: AppId, mode: "audio" | "video"): Permission[] {
  return id === "scanner" ? ["camera", "selected-folder"] : id === "meeting" ? mode === "audio" ? ["microphone"] : ["microphone", "camera"] : ["selected-file"];
}
export function purposeText(id: AppId, mode: "audio" | "video"): string {
  return id === "scanner" ? "拍摄收据并保存到用户所选文件夹；需要相机与所选收据文件夹，不需要全部文件或管理员。" : id === "meeting" ? mode === "audio" ? "仅语音课堂：采集声音，需要麦克风，不需要相机。" : "视频课堂：采集声音和画面，需要麦克风与相机，不需要通讯录或位置。" : "读取并保存用户所选的一份公开笔记，只需所选笔记文件，不需要整个磁盘。";
}
export const minimalPermissions = (s: PrivilegeState, id: AppId): boolean => {
  const required = neededPermissions(id, s.meetingMode), grants = s.apps[id].grants;
  return grants.length === required.length && required.every(p => grants.includes(p));
};
export function inspectPurpose(s: PrivilegeState, id: AppId): PrivilegeState {
  return say(replace(s, id, { ...s.apps[id], inspectedPurpose: s.apps[id].purpose }), purposeText(id, s.meetingMode));
}
export function changeGrant(s: PrivilegeState, id: AppId, permission: Permission, enabled: boolean): PrivilegeState {
  const a = s.apps[id]; if (!Object.hasOwn(permissionLabels, permission) || a.grants.includes(permission) === enabled) return s;
  const grants = enabled ? [...a.grants, permission] : a.grants.filter(p => p !== permission);
  return say(replace(s, id, { ...a, grants, revision: a.revision + 1, proof: null }), "授权已改变，旧功能证明失效；需重新运行验证，不能靠曾经成功过关。");
}
export function revokeApp(s: PrivilegeState, id: AppId): PrivilegeState {
  const a = s.apps[id]; return say(replace(s, id, { ...a, grants: [], revision: a.revision + 1, proof: null }), "已撤销该应用全部授权；这还不是答案，需要补回任务真正需要的权限并验证功能。");
}
export function changeMeetingMode(s: PrivilegeState, mode: "audio" | "video"): PrivilegeState {
  if (s.meetingMode === mode) return s; const a = s.apps.meeting;
  return say(replace({ ...s, meetingMode: mode }, "meeting", { ...a, purpose: a.purpose + 1, inspectedPurpose: null, proof: null }), "课堂任务已改变，重新检查当前需求；只因相机曾经多余，不代表视频课堂永远不需要它。");
}
export function selectNoteDraft(s: PrivilegeState, value: string): PrivilegeState {
  if (!(publicNotes as readonly string[]).includes(value)) return say(s, "只能选择公开笔记样本。");
  return replace({ ...s, noteDraft: value }, "notes", { ...s.apps.notes, proof: null });
}
export function runApp(s: PrivilegeState, id: AppId): PrivilegeState {
  if (s.locked) return say(s, "演示设备已锁屏，先由设备拥有者解锁，再运行应用。");
  const a = s.apps[id], required = neededPermissions(id, s.meetingMode);
  const missing = required.filter(p => !a.grants.includes(p) && !((p === "selected-file" || p === "selected-folder") && a.grants.includes("all-files")));
  if (missing.length) return say(replace(s, id, { ...a, proof: null }), `功能失败：缺少${missing.map(p => permissionLabels[p]).join("、")}；管理员不能代替相机或麦克风授权。`);
  if (id === "notes" && s.notes === null) return say(replace(s, id, { ...a, proof: null }), "所选笔记已丢失，授权不能凭空恢复内容；先从有效副本恢复。");
  const output = id === "scanner" ? "所选收据文件夹/receipt-demo.txt：已拍摄并保存公开收据S-21" : id === "meeting" ? `已接通${s.meetingMode === "audio" ? "语音：采集麦克风音频" : "视频：采集麦克风音频与相机画面"}` : s.noteDraft;
  const proof: Proof = { revision: a.revision, purpose: a.purpose, mode: s.meetingMode, output, minimal: minimalPermissions(s, id) };
  const next = replace({ ...s, notes: id === "notes" ? output : s.notes, audioProof: id === "meeting" && s.meetingMode === "audio" && proof.minimal && a.inspectedPurpose === a.purpose ? proof : s.audioProof }, id, { ...a, proof });
  return say(next, `实际模拟功能成功：${output}${proof.minimal ? "；当前授权恰好满足需求。" : "；但仍有不必要的授权，能运行不等于最小权限。"}`);
}
export function setAutoUpdate(s: PrivilegeState, enabled: boolean): PrivilegeState { return say({ ...s, autoUpdate: enabled }, "更新策略已改变；开启策略不等于待安装补丁已经安装。"); }
export function installUpdate(s: PrivilegeState): PrivilegeState { return say({ ...s, installed: 2 }, "已实际安装模拟补丁v2；不下载或修改你的真实系统。"); }
export function setScreenLock(s: PrivilegeState, enabled: boolean): PrivilegeState {
  if (s.lockEnabled === enabled) return s;
  return say({ ...s, lockEnabled: enabled, locked: false, lockRevision: s.lockRevision + 1, blockedProbe: null }, "锁屏策略已改变；需要实际锁定并测试陌生人读取是否被阻止。");
}
export function lockDevice(s: PrivilegeState, locked: boolean): PrivilegeState {
  return say({ ...s, locked: locked && s.lockEnabled }, locked && !s.lockEnabled ? "尚未启用锁屏策略，设备仍敞开。" : locked ? "模拟设备已锁定。" : "设备拥有者已解锁模拟设备。");
}
export function probeDevice(s: PrivilegeState): PrivilegeState {
  const blocked = s.lockEnabled && s.locked;
  return say({ ...s, blockedProbe: blocked ? s.lockRevision : null }, blocked ? "陌生人读取请求被当前锁屏状态阻止。锁屏不等于磁盘加密，也不模拟抵御物理取盘。" : "陌生人可以从未锁定的屏幕读取公开样本；仅打开设置开关不够。");
}
export function backupNotes(s: PrivilegeState, location: "same-device" | "offline"): PrivilegeState {
  if (s.notes === null) return say(s, "当前笔记不存在，不能创建一个编造内容的备份。");
  return say({ ...s, backup: { data: s.notes, location } }, `已复制实际笔记“${s.notes}”到${location === "offline" ? "独立离线位置" : "同一存储区"}；这不是同步服务。`);
}
export function loseNotes(s: PrivilegeState): PrivilegeState {
  if (s.notes === null) return say(s, "笔记已经丢失，重复故障不会生成新内容。");
  return say(replace({ ...s, lossTarget: s.notes, notes: null, restored: null, backup: s.backup?.location === "offline" ? s.backup : null }, "notes", { ...s.apps.notes, proof: null }), "模拟笔记存储区故障：原文与同区备份丢失，独立离线副本若存在则保留。目标是恢复故障前的实际版本。");
}
export function restoreNotes(s: PrivilegeState): PrivilegeState {
  if (!s.backup || s.lossTarget === null || s.notes !== null) return say(s, "需先发生笔记丢失且存在备份；不能凭恢复按钮生成原文。");
  return say(replace({ ...s, notes: s.backup.data, restored: s.backup.data }, "notes", { ...s.apps.notes, proof: null }), `实际恢复副本：“${s.backup.data}”。${s.backup.data === s.lossTarget ? "与故障前版本一致，仍需验证功能。" : "副本过旧，与故障前版本不同；不能宣称无损恢复。"}`);
}
export type PrivilegeTask = "scanner" | "meeting" | "defense";
const verified = (s: PrivilegeState, id: AppId): boolean => {
  const a = s.apps[id]; return minimalPermissions(s, id) && a.inspectedPurpose === a.purpose && !!a.proof && a.proof.revision === a.revision && a.proof.purpose === a.purpose && a.proof.minimal && (id !== "notes" || a.proof.output === s.notes);
};
export function gradePrivilege(s: PrivilegeState, task: PrivilegeTask) {
  if (!verified(s, "scanner")) return { ok: false, message: "扫描器要先检查需求，只授予相机与所选收据文件夹，并在当前授权下实际拍摄保存成功。" };
  if (task !== "scanner" && !(s.audioProof && s.meetingMode === "video" && verified(s, "meeting"))) return { ok: false, message: "先完成最小权限的语音课堂，再切换视频、重新检查需求，仅增加相机并实际接通视频。旧模式或旧授权的结果不能替代当前验证。" };
  if (task === "defense") {
    if (!verified(s, "notes")) return { ok: false, message: "笔记只需所选笔记文件；检查需求、缩小授权并实际读写验证，全部文件或管理员不符合最小权限。" };
    if (!(s.autoUpdate && s.installed === 2 && s.lockEnabled && s.blockedProbe === s.lockRevision)) return { ok: false, message: "需要保持自动更新、实际安装补丁，以及在当前锁屏策略下实际阻止陌生人读取；设置勾选不等于效果验证。" };
    if (!(s.backup?.location === "offline" && s.lossTarget !== null && s.restored === s.lossTarget && s.notes === s.lossTarget)) return { ok: false, message: "把故障前的实际笔记复制到独立离线位置，模拟丢失，再恢复同一版本并验证功能；同区或过旧备份不算完整恢复。" };
  }
  return { ok: true, message: "当前授权与真实功能结果一致，满足本任务；综合防护还核验补丁、锁屏阻止与实际恢复内容。" };
}
