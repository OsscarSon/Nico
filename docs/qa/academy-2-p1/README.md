# P1 四阶段验收及截图

以下截图来自生产构建的 Chromium。四个阶段的完整流程另分别检查了 1440px、390px、360px。

| 阶段 | 课时截图 | 项目实际结果 |
| --- | --- | --- |
| P1A 数学基础 | [1440px](p1a-lesson-1440.png) · [390px](p1a-lesson-390.png) | [二次函数的零点和顶点](p1a-project-390.png) |
| P1B 概率与统计基础 | [1440px](p1b-lesson-1440.png) · [390px](p1b-lesson-390.png) | [Iris 组内描述与相关](p1b-project-390.png) |
| P1C 计算数学核心 | [1440px](p1c-lesson-1440.png) · [390px](p1c-lesson-390.png) | [矩阵、梯度与图运算](p1c-project-390.png) |
| P1D 概率论与统计推断 | [1440px](p1d-lesson-1440.png) · [390px](p1d-lesson-390.png) | [A/B 差异、区间与检验](p1d-project-390.png) |

[知识图谱三类关系](graph-1440.png) · [逐知识点覆盖](../../academy-2-p1/COVERAGE.md) · [分阶段教学质量与边界](../../academy-2-p1/QUALITY.md)

### 四个阶段的实测条件

- P1A 用负系数核对不等号与分层答题，二次函数用首次有误的输入检验作业门槛后，提交顶点、轴和新坐标。
- P1B 通过样本方差练习完成与掌握，再用真实全表和 setosa 子集检验样本计数、均值、组内 Pearson r。下载的报告包含数据链接。
- P1C 完成特征值与特征向量的练习，在矩阵实验查看奇异值并返回原知识点，设置图的捷径后核验行列式、下降的目标值和 BFS 距离。
- P1D 完成 p 值练习，打开检验实验，并在 A/B 项目更正分配单位与成功计数，按差异、双侧概率、区间下限核验。
- 各阶段都实际走过答错、修正、完成、复核答错待复习、核验掌握、刷新续学、项目失败和成功。检查点考察非阻塞先修及自评与正式记录的分离。同一浏览器场景确认旧 JSON 字节一致以及页面无横向溢出。

### 测试结果

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck`、`npm run lint`、`npm run build` | 均通过。构建仍提示部分资源包超过默认体积警戒值。 |
| `npm test` | 57 个测试文件、789 项通过。 |
| `npm run smoke:academy2-p1` | 生产构建通过 12 组完整流程。四个阶段均覆盖三种宽度。 |
| 原有 `smoke`、`smoke:p2`、`smoke:academy2`、`smoke:intermediate` | 分别通过 188 项、276 项、15 组、9 组。 |
| 原有 `smoke:ai` | AI 关闭配置下 28 项通过。 |
| `python3 scripts/verify-academy2-p1-libraries.py` | 实际运行 17 个 NumPy、SciPy、SymPy、scikit-learn 课堂示例。 |

### 待完成

- 四门课为草稿，仍需真实学习者试学。开放证明、解释与项目写作按检查点人工复核。
- 新的知识点记录保存在当前浏览器。旧课进度沿用原来的导入与导出方式。
