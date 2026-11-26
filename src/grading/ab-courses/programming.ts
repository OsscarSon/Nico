import { check, field, type Lab } from "./model";

type CatalogItem = { name: string; available: number };
export function isCatalogItem(value: unknown): value is CatalogItem {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return typeof data.name === "string" && typeof data.available === "number" && Number.isInteger(data.available) && data.available >= 0;
}
export const asyncLab: Lab = {
  task: "搜索“光”比旧搜索“火”晚发先回。只保留最新请求的结果，再用实际检查阻止畸形响应覆盖页面。连接失败时应显示重试提示。",
  fields: [field("结果更新策略", "谁最后回就显示谁", "只接受当前请求编号"), field("处理 API 数据", "只写 TypeScript 类型断言", "检查运行时字段"), field("失败状态", "仍显示加载", "显示可重试错误")],
  run: ([sequence, validate, failure]) => {
    const pending = [
      { id: 1, at: 80, payload: { name: "火山", available: 5 } },
      { id: 2, at: 20, payload: { name: "光学", available: 2 } },
    ].sort((a, b) => a.at - b.at);
    const render = (item: unknown) => {
      if (validate && !isCatalogItem(item)) return "数据格式错误";
      const assumed = item as CatalogItem;
      return assumed.name + " / " + assumed.available;
    };
    const shown = pending.filter(item => !sequence || item.id === 2).at(-1)!;
    return [
      check("搜索页面最终显示", render(shown.payload), "光学 / 2"),
      check("available 为字符串时", render({ name: "光学", available: "2" }), "数据格式错误"),
      check("连接失败后", failure ? "错误 · 可以重试" : "加载中", "错误 · 可以重试"),
    ];
  },
};

export const backendLab: Lab = {
  task: "给阅览室 API 发三种请求。只有有权限的读者提交合法时段才创建预约；错误场景仍要给出可判断的响应。",
  fields: [field("写接口权限", "仅靠页面按钮", "服务端核对预约权限"), field("请求体验证", "直接存储", "检查时段的整数与范围"), field("创建成功处理", "只回 200，不写入", "写入并返回 201 与 Location")],
  run: ([auth, validate, persist]) => {
    const rows: number[] = [];
    function request(canBook: boolean, slot: unknown) {
      if (auth && !canBook) return "403";
      if (validate && (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > 4)) return "400";
      if (!persist) return "200";
      rows.push(slot as number);
      return "201 /bookings/" + rows.length;
    }
    const denied = request(false, 2);
    const invalid = request(true, "下午");
    const reserved = request(true, 3);
    return [
      check("访客提交", denied, 403),
      check("已授权，但时段不是数值", invalid, 400),
      check("已授权创建并定位资源", reserved, "201 /bookings/1"),
      check("实际储存的时段", rows.join(", "), "3"),
    ];
  },
};

export const frontendLab: Lab = {
  task: "修好借书列表的表单。空白时能读到验证提示；提交后只有一笔新增；切换路由再回来仍有数据，确认提示可被读屏发现。",
  fields: [field("表单提交逻辑", "直接写入表单原值", "校验 trim 后的书名"), field("列表状态位置", "只放在页面组件内", "由两个视图的共同父级持有"), field("通知输出", "只有边框颜色", "带文本的可读状态")],
  run: ([validated, shared, accessible]) => {
    let items: string[] = [];
    function submit(title: string) {
      const value = validated ? title.trim() : title;
      if (!value) return accessible ? "请输入书名" : "红色边框";
      items = [...items, value];
      return accessible ? "已新增：" + value : "绿色边框";
    }
    const blank = submit(" ");
    const saved = submit("  月球手册  ");
    const before = items.length;
    if (!shared) items = [];
    return [
      check("空白表单的反馈", blank, "请输入书名"),
      check("新增后的文本状态", saved, "已新增：月球手册"),
      check("切换视图前后", before + " → " + items.length + " 条 / " + items.join("、"), "1 → 1 条 / 月球手册"),
    ];
  },
};

const books = [{ id: 1, title: "星图", topic: "science" }, { id: 2, title: "花园", topic: "art" }];
const loans = [{ bookId: 1, minutes: 10 }, { bookId: 2, minutes: 7 }, { bookId: 1, minutes: 15 }];
export const databaseLab: Lab = {
  task: "连接藏书与借阅表，求 science 类总时长。然后尝试批量导入：第二行引用不存在的书，这一批应整体回滚。",
  fields: [field("表的关联条件", "每条借阅配每本书", "loan.book_id = book.id"), field("统计范围", "全部主题", "仅 science"), field("提交策略", "每行各自提交", "两行放在同一个事务")],
  run: ([join, filter, transaction]) => {
    const selected = loans.flatMap(loan => books.filter(book => (!join || book.id === loan.bookId) && (!filter || book.topic === "science"))
      .map(book => ({ book: book.title, minutes: loan.minutes })));
    let saved = [...loans];
    let rejection = "";
    for (const entry of [{ bookId: 2, minutes: 5 }, { bookId: 99, minutes: 4 }]) {
      if (!books.some(book => book.id === entry.bookId)) {
        rejection = "外键拒绝 #99";
        if (transaction) saved = [...loans];
        break;
      }
      saved.push(entry);
    }
    return [
      check("查询行", selected.map(row => row.book + "/" + row.minutes).join(", "), "星图/10, 星图/15"),
      check("SUM(minutes)", selected.reduce((sum, row) => sum + row.minutes, 0), 25),
      check("导入结果与保留的借阅数", rejection + " / " + saved.length, "外键拒绝 #99 / 3"),
    ];
  },
};

export const structuresLab: Lab = {
  task: "按到达顺序处理三张借阅单，撤销最近一次编辑，并让第二次更新后按书号查到最新名字。区分按键取值和停在首次命中。",
  fields: [field("待处理借阅单", "末尾取出（LIFO）", "头部取出（FIFO）"), field("撤销编辑", "撤销最早的一次", "撤销最近的一次"), field("书号查询", "逐条扫历史", "以书号为 Map 的键")],
  run: ([queue, undo, indexed]) => {
    const inbox = ["甲", "乙", "丙"];
    const order = [];
    while (inbox.length) order.push(queue ? inbox.shift() : inbox.pop());
    const edits = ["书名", "作者", "索引"];
    const reverted = undo ? edits.pop() : edits.shift();
    const entries: [string, string][] = [["b8", "银河图册"], ["b1", "森林"], ["b8", "新版银河"]];
    const latest = indexed ? new Map(entries).get("b8") : entries.find(row => row[0] === "b8")?.[1];
    return [
      check("处理顺序", order.join(" → "), "甲 → 乙 → 丙"),
      check("撤销后留下的编辑 / 本次撤销", edits.join("、") + " / " + reverted, "书名、作者 / 索引"),
      check("b8 的现行书名", latest ?? "未找到", "新版银河"),
    ];
  },
};
