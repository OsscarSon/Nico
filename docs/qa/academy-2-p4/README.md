# P4 浏览器验收与性能

Chromium 打开生产构建，在 1440、390 和 360px 下验证数值积分、编译器、Data Studio、多类别训练和旧课。390px 流程另外逐一打开 248 个新增课时、检查页面宽度，并实际执行 Simpson Python 判题、节点隔离项目及研究报告导出。移动端的公式及宽表在自身区域内滚动。

| 实际页面 | 1440px 桌面 | 390px 手机 |
| --- | --- | --- |
| 数值积分 · Simpson 实验输出 | [桌面](math-lesson-1440.png) | [手机](math-lesson-390.png) |
| Data Studio · 自定义 CSV 的质量检查 | [桌面](data-pipeline-1440.png) | [手机](data-pipeline-390.png) |
| ML Playground · 留出集和多类别混淆矩阵 | [桌面](multiclass-final-1440.png) | [手机](multiclass-final-390.png) |
| Research Hub · Web Crypto 加密核验 |  | [手机](web-crypto-390.png) |

## 测试结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck`、`npm run lint`、`npm run build` | 通过。Rollup 报告既有大包提醒和上游 Zod 注解。 |
| `npm test` | 63 个测试文件，847 个测试。覆盖显式知识图谱、数据兼容、编程变式、独立算例与全部 P4 实验的默认输入。 |
| `npm run smoke`、`npm run smoke:academy`、`npm run smoke:ai` | 旧导航与播放器通过。Academy 166 项检查通过。AI 关闭时原学习流程通过。 |
| `npm run smoke:academy2`、`npm run smoke:academy2-p1` | 课程目录、路线、旧课链接和学习进度回归通过。 |
| `npm run smoke:academy2-p15`、`npm run smoke:academy2-completion` | 教学引擎、29 个实验、独立核验、真实 Python 双栏运行、离线加载错误与跨设备恢复通过。 |
| `npm run smoke:academy2-algorithms`、`npm run smoke:academy2-data-ml` | 算法判题和项目、P3 的 87 个课时、四个项目及浏览器 Python 专业库通过。 |
| `npm run smoke:academy2-advanced` | 三种宽度、248 页遍历、独立迁移判分及刷新恢复、验证指标与测试指标隔离、实际 Pyodide 判题、Web Crypto 及报告导出通过。 |

本机用 Pyodide 官方发行文件的本地镜像降低下载波动。浏览器执行真实 Python 和已锁定的库。浏览器截图中的 Softmax 采用页面默认配置，固定种子独立复算使用种子 17。[独立结果](../../academy-2-p4/RESULTS.md)

一次受限沙箱的本地回归出现旧 CPython 子进程标准输入超时和 JS 定时断言失败。用等价的子进程 I/O 环境独立重跑后 847 个用例通过，保持原断言和时间限制。

## 构建与加载

以合并 P3 的 `0ebc19f` 和本次 P4 生产构建对比。以下仅计算 `dist/index.html` 直接引用的 JS 与 CSS，以 Node gzip 计字节，图片、字体及按需路由另行加载。

| 首页入口 | P3 gzip | P4 gzip | 变化 |
| --- | ---: | ---: | ---: |
| JS | 596,485 B | 603,294 B | +6,809 B（+1.14%） |
| CSS | 16,849 B | 16,849 B | 0 B |

以静态服务模拟 GitHub Pages 的 `/Nico/` 子路径，Chromium 确认首页仅请求入口 JS 与 CSS。打开课程和训练模型后才请求对应动态资源，ML Worker 从同一子路径启动并给出验证结果。上述产物大小反映传输开销，交互耗时随设备和网络改变。[开源选型](../../academy-2-p4/TECHNOLOGY.md)
