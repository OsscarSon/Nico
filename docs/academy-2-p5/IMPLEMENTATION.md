# P5 与平台补强

- `src/content/academy2/applied/` 在 3 门课程内补齐 Word 的 50 个原节点。讲解、证明、练习和实验共用当前教学播放器。另接入 7 条显式先修或关联、50 个双语术语、3 个项目和原学习数据结构。
- `src/grading/academy2/applied/` 扩展 33 个应用与研究实验及 6 个模型训练实验。六类训练既有独立纯函数，也有学习率、轮数、随机种子、误差曲线和实际留出结果。凸显测量条件、模型限制及外部环境。
- `src/features/academy2/advanced/` 的可运行实验支持先存基准、选指标、预测变化、调整一个输入、得出实际反馈，并用原格式保存或导出 Markdown。项目页提供本机源代码和评分量规。`projects/p4/`、`projects/p5/` 收纳可复现实例。
- 修复专业路线把已有知识点显示为「大纲」的情况。知识图谱读取旧课状态与续学标记。先修直达实际课时，关闭 AI 快捷入口时隐藏原有空折叠区域。实验报告在恢复后能跳回相应课时或工作台。
- qa 覆盖课程全部入口、知识点路由、深浅色、小屏宽度、键盘操作、判分、数据备份和历史播放器。原插画和 Logo、旧版 Runtime、进度格式及美术文件不改。[浏览器结果](../qa/academy-2-p5/README.md)

## 开源选型

继续使用 React、CodeMirror、Pyodide、KaTeX、SQLite 与已有图表。小游戏、网格相交和光学公式直接用可读纯函数，方便输出推导中间量。Phaser 是可用于完整 2D 游戏的 MIT 引擎，Three.js 是可用于实际 3D 显示的 MIT 库。本轮的课堂计算不需要引擎资源和插件。Unity 示例保持独立 C# 源码，FreeRTOS 与 Arduino 按原厂文档说明外部验证。生产地理空间的椭球与投影可用 PROJ，本轮直接算球面近似。浏览器没有新增依赖，项目核验只用 Python 标准库和本地 C++ 编译器。[Phaser](https://github.com/phaserjs/phaser) · [Three.js](https://github.com/mrdoob/three.js) · [FreeRTOS](https://www.freertos.org/) · [PROJ](https://proj.org/)
