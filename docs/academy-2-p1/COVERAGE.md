# P1A–P1D 与 Word 的知识点对照

基线为 Nico Academy 2.0 完整课程规划与 PR #21。以下每个知识点都是独立教学页，可从对应课程模块进入。原文共 81 项。P1A 续用 PR #21 的拓展知识点「向量点积」，因此共有 82 页。

## P1A · Foundation Mathematics

| Word 知识点 | 对应知识点 ID |
| --- | --- |
| 集合、数系、代数运算、方程与不等式 | `fm-sets`、`fm-numbers`、`fm-algebra`、`fm-equations` |
| 函数与反函数、多项式、指数与对数、数列 | `fm-inverse`、`fm-polynomial`、`fm-exponential`、`fm-sequences` |
| 三角函数、坐标几何、向量、矩阵入门 | `fm-trig`、`fm-coordinate`、`fm-vector`、`fm-matrix` |
| 数学逻辑、数学证明入门 | `fm-logic`、`fm-proof` |
| 保留拓展：向量点积 | `fm-dot` |
| 项目：交互式函数与数学可视化实验室 | `#/projects/foundation-mathematics` |

项目交付系数、曲线、零点、顶点与新输入点的核验记录。数学实验室有集合与不等式、函数、旋转、真值表四项。

## P1B · Foundation Statistics

| Word 知识点 | 对应知识点 ID |
| --- | --- |
| 总体与样本、变量分类、测量尺度 | `fs-population`、`fs-variables`、`fs-scales` |
| 平均数、中位数、众数、方差、标准差 | `fs-mean`、`fs-median`、`fs-mode`、`fs-variance`、`fs-sd` |
| 四分位数、百分位数、异常值 | `fs-quartiles`、`fs-percentiles`、`fs-outliers` |
| 排列组合、概率规则、条件概率、贝叶斯公式入门 | `fs-counting`、`fs-probability`、`fs-conditional`、`fs-bayes` |
| 相关性、常见统计图表 | `fs-correlation`、`fs-charts` |
| 项目：真实数据统计分析报告 | `#/projects/foundation-statistics` |

项目使用 150 条 Iris 校正测量记录。同一对变量按物种过滤后计算散点、均值、中位数、标准差、IQR 与相关。附样本来源与单位，分开讨论组内与汇总关联。统计实验室提供样本描述、分位和围栏、条件概率、真实散点四项。[UCI Iris，DOI 10.24432/C56C76，CC BY 4.0](https://archive.ics.uci.edu/dataset/53/iris)

## P1C · Intermediate Mathematics

| Word 知识点 | 对应知识点 ID |
| --- | --- |
| 矩阵运算、行列式、秩、线性方程组 | `im-matrix`、`im-determinant`、`im-rank`、`im-systems` |
| 向量空间、基底、线性变换、特征值与特征向量 | `im-space`、`im-basis`、`im-transformation`、`im-eigen` |
| 正交投影、最小二乘、SVD | `im-projection`、`im-least-squares`、`im-svd` |
| 极限、连续、微分、积分 | `im-limit`、`im-continuity`、`im-derivative`、`im-integral` |
| 多元函数、偏导数、梯度、Jacobian、Hessian | `im-multivariable`、`im-partial`、`im-gradient`、`im-jacobian`、`im-hessian` |
| 集合论、命题与谓词逻辑、归纳法、关系、组合数学、图论、数论 | `im-sets`、`im-logic`、`im-induction`、`im-relations`、`im-counting`、`im-graphs`、`im-number-theory` |
| 项目：矩阵、梯度与图论交互实验室 | `#/projects/intermediate-mathematics` |

项目组合矩阵方向反转、数值目标下降和无向图最短路径，输出独立可核对的三项结果。数学实验室还有矩阵、差商与积分、离散图和整数三个模块。

## P1D · Intermediate Statistics

| Word 知识点 | 对应知识点 ID |
| --- | --- |
| 随机变量、期望、方差、协方差、联合与条件分布 | `is-variable`、`is-expectation`、`is-variance`、`is-covariance`、`is-joint` |
| Bernoulli、Binomial、Poisson、Normal、Exponential 分布 | `is-bernoulli`、`is-binomial`、`is-poisson`、`is-normal`、`is-exponential` |
| 大数定律、中心极限定理、抽样分布 | `is-lln`、`is-clt`、`is-sampling` |
| 置信区间、假设检验、p-value、效应量、Z-test、T-test | `is-ci`、`is-testing`、`is-pvalue`、`is-effect`、`is-ztest`、`is-ttest` |
| 卡方检验、ANOVA、线性回归、非参数检验 | `is-chisquare`、`is-anova`、`is-regression`、`is-nonparametric` |
| 项目：设计并分析一次 A/B Test | `#/projects/intermediate-statistics` |

项目包含实验单位、双侧假设、效应阈值、对照及变更条件、差异区间与近似适用性分析。可复现模拟计数与真实 Iris 数据分别标明来源。实验室提供分布、抽样、推断和四类模型对照。
