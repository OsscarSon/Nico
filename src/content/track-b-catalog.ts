import type { CatalogLesson } from "./catalog";

// 路线 B 的目录单独放在这里，避免和别的路线同时改 catalog.ts 时冲突。
const L = (id: string, title: string, unit: string, status: CatalogLesson["status"] = "planned"): CatalogLesson => ({
  id, title, unit, status,
});

export const trackBUnits = [
  { id: "b1", title: "Python 第一步" },
  { id: "b2", title: "网页三件套" },
  { id: "b3", title: "Git 与发布" },
  { id: "b4", title: "作品" },
];

export const trackBCatalog: CatalogLesson[] = [
  L("b01-variables", "变量：给数据起名字", "b1", "available"),
  L("b02-conditions", "条件：让程序做选择", "b1", "available"),
  L("b03-loops", "循环：让程序重复做事", "b1", "available"),
  L("b04-functions", "函数：把做法打包", "b1", "available"),
  L("b05-lists", "列表：一排数据", "b1", "available"),
  L("b06-dicts", "字典：用名字找数据", "b1", "available"),
  L("b07-debugging", "调试：读懂报错", "b1", "available"),
  L("b08-html", "HTML：网页的骨架", "b2", "available"),
  L("b09-css", "CSS：给网页穿衣服", "b2", "available"),
  L("b10-css-layout", "CSS 布局：盒子与弹性布局", "b2", "available"),
  L("b11-js-dom", "JavaScript 与 DOM", "b2", "available"),
  L("b12-events", "事件：让网页有反应", "b2", "available"),
  L("b13-fetch-json", "fetch 与 JSON", "b2"),
  L("b14-git-basics", "Git 第一步：保存快照", "b3", "available"),
  L("b15-git-branches", "分支与合并", "b3", "available"),
  L("b16-github", "GitHub：把代码放到网上", "b3"),
  L("b17-pages", "发布一个静态网页", "b3"),
  L("b18-project-page", "作品一：个人网页", "b4"),
  L("b19-project-tool", "作品二：一个小工具", "b4"),
  L("b20-review", "路线回顾与自测", "b4"),
];
