import { check, field, type Lab } from "./model";

const revisions = {
  "rev-a": { checks: { lint: true, unit: true }, reviewed: true },
  "rev-b": { checks: { lint: true, unit: false }, reviewed: false },
  "rev-c": { checks: { lint: true, unit: true }, reviewed: true },
};
export const workflowLab: Lab = {
  task: "候选提交 rev-b 的单测失败。修好后让新提交独立通过 CI、绑定复审并发布该版本，同时验证旧的通过记录不能为新提交开门。",
  fields: [field("候选分支", "保持 rev-b", "提交修复 rev-c"), field("发布门槛", "复用 rev-a 的通过记录", "读取候选 SHA 所属检查及评审"), field("产物来源", "人工选择旧包 rev-a", "发布同一 SHA 的产物")],
  run: ([fix, fresh, artifact]) => {
    function gate(candidate: keyof typeof revisions) {
      const evidence = revisions[fresh ? candidate : "rev-a"];
      return evidence.checks.lint && evidence.checks.unit && evidence.reviewed;
    }
    const candidate = fix ? "rev-c" : "rev-b";
    return [
      check("未修复提交 rev-b", gate("rev-b") ? "误放行" : "阻止发布", "阻止发布"),
      check("当前候选检查及复审", candidate + " / " + (gate(candidate) ? "通过" : "未通过"), "rev-c / 通过"),
      check("发布版本", gate(candidate) ? (artifact ? candidate : "rev-a") : "无", "rev-c"),
    ];
  },
};

export const fullstackLab: Lab = {
  task: "发布共享阅读清单。普通读者可以打开页面，但只有编辑能新增。重放同一请求并重启服务后，仍只有一条正确的记录。",
  fields: [field("客户端请求路径", "/books", "/api/books"), field("API 写入条件", "只在页面隐藏按钮", "服务端核验编辑角色"), field("存储生命周期", "进程临时数据", "独立持久存储"), field("重复请求策略", "每次追加", "使用请求 ID 去重")],
  run: ([routing, auth, persistence, idempotency]) => {
    const path = routing ? "/api/books" : "/books";
    let database: { id: string; title: string }[] = [];
    const write = (role: string, id: string, title: string) => {
      if (path !== "/api/books") return 404;
      if (auth && role !== "editor") return 403;
      if (idempotency && database.some(record => record.id === id)) return 200;
      database.push({ id, title });
      return 201;
    };
    const editor = write("editor", "d1", "星空手册");
    const repeat = write("editor", "d1", "星空手册");
    const guest = write("reader", "d2", "未经审核");
    if (!persistence) database = [];
    return [
      check("静态页面 / 新增 API / 重放", "200 / " + editor + " / " + repeat, "200 / 201 / 200"),
      check("普通读者尝试写入", guest, 403),
      check("服务重启后重新渲染", database.map(record => record.title).join("、"), "星空手册"),
      check("持久存储实际行数", database.length, 1),
    ];
  },
};
