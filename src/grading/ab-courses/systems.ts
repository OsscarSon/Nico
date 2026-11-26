import { check, field, type Lab } from "./model";

export const registerLab: Lab = {
  task: "让四位寄存器 R1 保存指令 ADD R1, R2 的低四位结果。两条测试向量应正确，进位另行显示，R2 保持原值。",
  fields: [field("译码选择", "XOR", "ADD"), field("写回目的", "R2", "R1"), field("时钟写使能", "关闭", "开启")],
  run: ([add, dest, clock]) => [[3, 5], [12, 7]].flatMap(([x, y]) => {
    const raw = add ? x! + y! : x! ^ y!;
    const low = raw & 15;
    const regs = [x, y];
    if (clock) regs[dest ? 0 : 1] = low;
    return [
      check(x + " 与 " + y + "，时钟沿后的 R1 / R2", regs.join(" / "), ((x! + y!) & 15) + " / " + y),
      check("组合电路当前进位", raw >> 4, (x! + y!) >> 4),
    ];
  }),
};

const services = [{ port: 8080, name: "catalog", owner: "reader", state: "active" }, { port: 8081, name: "index", owner: "indexer", state: "failed" }];
export const linuxLab: Lab = {
  task: "目录服务活着，索引服务的日志报 EACCES。确认两者状态，恢复运行身份对数据文件的读取，同时保持访客无权访问。",
  fields: [field("检查范围", "只查目录服务", "查目录与索引服务"), field("权限修复", "保留权限", "仅给索引身份读权限", "所有人可读"), field("修复后", "不验证", "重启索引并查询状态")],
  run: ([inspect, permission, verify]) => {
    const before = services.slice(0, inspect ? 2 : 1).map(s => s.name + " " + s.state).join(" / ");
    const readable = permission === 1 || permission === 2;
    const after = verify ? (readable ? "active · 文件读入" : "failed · EACCES") : "尚未重启";
    return [
      check("服务清单", before, "catalog active / index failed"),
      check("索引服务状态", after, "active · 文件读入"),
      check("访客读取敏感文件", permission === 2 ? "可读" : "拒绝", "拒绝"),
    ];
  },
};

export const responseLab: Lab = {
  task: "在虚构事件记录中撤销被标记的旧编辑会话，保存审计证据。新登录的编辑员仍能保存文章，读者仍只能查看。",
  fields: [field("事件遏制", "保留旧会话", "撤销被标记会话", "冻结所有编辑权限"), field("访问决策", "信任界面按钮", "服务端核对会话与角色"), field("审计证据", "保留带时间与请求 ID 的摘要", "清空记录")],
  run: ([contain, enforce, evidence]) => {
    function write(role: "editor" | "reader", stale = false) {
      if (!enforce) return 200;
      return stale && (contain === 1 || contain === 2) ? 401 : role === "reader" || contain === 2 ? 403 : 200;
    }
    return [
      check("旧编辑会话保存", write("editor", true), 401),
      check("新编辑会话保存", write("editor"), 200),
      check("读者提交保存请求", write("reader"), 403),
      check("可关联事件", evidence ? 0 : 1, 1),
    ];
  },
};

export const cloudLab: Lab = {
  task: "让两台节点同时提供服务。一台计算节点离线后，剩下的节点负责两次查询并读到同一份目录。探针必须反映依赖没有就绪的情况。",
  fields: [field("应用实例布局", "单实例", "两个节点各一个"), field("可用性探针", "只检查进程存在", "检查服务和目录可读"), field("目录持久化位置", "节点临时卷", "共享持久化存储")],
  run: ([replicas, probe, store]) => {
    const nodes = [{ name: "node-a", running: true, data: true }, { name: "node-b", running: replicas === 1, data: store === 1 }];
    const available = (n: typeof nodes[number]) => n.running && (!probe || n.data);
    const before = nodes.filter(available).map(n => n.name).join(" + ");
    const after = nodes.slice(1).find(available);
    return [
      check("故障前的可用实例", before, "node-a + node-b"),
      check("node-a 离线后的两次查询", after ? after.name + (after.data ? " · 8 条 / 8 条" : " · 0 条 / 0 条") : "无可用后端", "node-b · 8 条 / 8 条"),
      check("依赖不可读时的探针", available({ name: "node-c", running: true, data: false }) ? "放行" : "暂不接流量", "暂不接流量"),
    ];
  },
};
