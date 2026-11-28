# Final QA 回归与实测

## 浏览器证据

- [1440px 深色桌面 · 二项尾数值推导](stable-binomial-1440.png)
- [390px 深色手机 · 四步功效答案与诊断](power-structured-390.png)

实测 1440、390、360px。新增流程先提交错解、核查针对性的分步提示，再提交四个正确中间量。390px 用真实 Pyodide 运行六组编程用例，并刷新检查结构化练习成绩。三个宽度均实测改用小计量单位后，随机化实验仍报告相同 p 值。浏览器使用既有发行版 Pyodide 的实际文件，本地缓存仅绕过 CDN 的环境网络限制。另有主动断网及恢复用例。

## 数值与实验

| 验证 | 实际输出 |
| --- | --- |
| SciPy 二项尾概率 | 100 组，最大绝对误差 8.33 × 10⁻¹⁵ |
| NumPy 对称主成分 | 120 组，最大归一化特征值差或特征方程残差 1.58 × 10⁻¹⁵，向量正交 |
| Python 精确分数 | 36 组随机化检验，极端分派数、总分派数和 p 值一致 |
| NumPy FFT | 32 组，最大复数绝对误差 3.04 × 10⁻¹⁴ |
| 扩展实验库 | 115 个实验配置逐一执行默认值及各参数端点。带交叉约束的无效输入显示教学错误，无 Infinity/NaN 图表 |
| 七个浏览器工作台 | 原有 Math、Statistics、Algorithm Arena、Data Studio、ML Playground、Systems 和 Research 工作流回归。包含部分导出、项目判分、留出评估及实际训练 |
| 独立 Python 编程任务 | 七个新练习的双实现与固定值、种子值共 112 次，真实 CPython 3.12.14 |
| P4 原有七个项目 | 使用种子 251128，全数通过。验证 31 个线性系统、31 个解释器程序及 6 个非法程序、四分片子进程失败重试、事件窗 SQLite 管道、本机 HTTP 模型、服务设计和 Dijkstra 论文案例 |

上述结果按实测输入记录。既有测试还对照了卷积有限差分、因果注意力掩码、训练集划分、留出模型、多分类和强化学习小环境。尚未逐模型、逐参数对照外部实现。该范围及课内学术审计的差异见[主报告](../../academy-2-final-qa/README.md)。

## 真实外部工具链

| 运行环境 | 实际结果及范围 |
| --- | --- |
| .NET SDK 8.0.428 | 编译和运行现有 C# 时间推进内核，核对分割区间、位置和非法负区间。Unity 编辑器、场景与 API 联动未核验。 |
| Arduino AVR 1.8.6 | 示例编译至 Uno AVR，1826 字节 Flash、192 字节 RAM。实物烧录、传感器、时序和 ADC 测量未核验。 |
| Chromium WebGL2 · SwiftShader | 实际编译和运行 GLSL ES 3.00。三组像素为 [51,102,153,255]、[26,51,76,255]、[0,0,0,255]，与解析结果差不超过 1 个量化单位。未使用物理 GPU。 |
| Docker 29.9.2 · 单宿主机 | 三个容器隔离在临时 Docker 内网。用容器内探针观察分片总量 650 → 节点 b 停止时缺失并拒绝报告总量 → 更换节点 b 后总量恢复 650。无外部端口和部署。未验证多主机或 Kubernetes。 |
| g++ C++17 | 原嵌入式固定点和队列示例使用 `-Wall -Wextra -Werror` 编译并运行，其断言通过。 |
| GitHub Pages 子路径 · 本地 | 用生产构建在 `/Nico/` 打开首页和直接话题链接，CSS、JS、KaTeX 加载正常，无同路径 4xx。首页未请求 Python 或 SQL WebAssembly。 |

复现从仓库根目录运行。工具链仅供验证，应用生产依赖无需改变。

```sh
node scripts/final-qa.mjs reference
python3 -B projects/p4/verify.py --seed 251128
bash projects/p4/containers/verify.sh
dotnet run --project projects/p5/verification/dotnet/MotionKernelVerification.csproj
arduino-cli compile --fqbn arduino:avr:uno projects/p5/verification/AnalogSampler
node scripts/verify-qa-shader.mjs
```

## 构建及安全扫描

首页入口与 P5 基线比较。按实际 `index.html` 直接引用的文件计算，以下大小不含字体、插画、用户随后打开的功能块及传输负载。

| 文件 | 原始字节 | gzip 字节 | P5 gzip |
| --- | ---: | ---: | ---: |
| 首屏 JS | 1,683,356 | 605,360 | 604,644 |
| 首屏 CSS | 83,138 | 16,849 | 16,849 |

入口 JS gzip 增加 716 字节，约 0.12%。构建仍有大块提示。尚未对真实低端手机、慢网、所有后续页面或连续大型模型训练进行性能测量。

`npm audit` 在原测试依赖树报告 3 个受影响包。仅升级开发用 Vitest 后，复扫为 0。生产依赖版本与完整性摘要逐项比较一致。公告及兼容选择见 [依赖说明](../../DEPENDENCIES.md)。

## 回归命令

| 检查组 | 命令 | 覆盖要点 |
| --- | --- | --- |
| 工程 | `npm run typecheck`、`npm run lint`、`npm test`、`npm run build` | TypeScript、ESLint、65 个测试文件和生产构建 |
| 基础、旧课程、AI | `smoke`、`smoke:academy`、`smoke:ai`、`smoke:b`、`smoke:foundation`、`smoke:network`、`smoke:web`、`smoke:security` | 旧课真实判分、深浅色、老师提示、AI mock/off、旧插画、进度和移动端 |
| 历史设计及路线 | `smoke:p2`、`smoke:p2-final`、`smoke:p3a`、`smoke:intermediate`、`smoke:p3b`、`smoke:c`、`smoke:d`、`smoke:e`、`smoke:f`、`smoke:ab-courses` | 首页、设置、完整备份入口、原始品牌与插画、旧挑战故障恢复、学习状态兼容 |
| Academy 2.0 | `smoke:academy2`、`smoke:academy2-p1`、`smoke:academy2-p15`、`smoke:academy2-completion`、`smoke:academy2-algorithms`、`smoke:academy2-data-ml`、`smoke:academy2-advanced`、`smoke:academy2-applied`、`smoke:academy2-final-qa` | 七个工作台、图谱、练习、编程判题、备份、项目、真实训练。390px 依次打开 30 门目录和 604 个课时路径 |

Typecheck、lint、构建和 Vitest 4.1.12 通过，共 65 个测试文件、870 个测试，无失败或跳过。生产构建仍报告已有的大块提示。

两项历史浏览器套件首次失败。B 路线因环境无法加载 jsDelivr 上的 Pyodide，改用同版本正式发行文件后原断言通过。P2 Final 保持原有四组设置的检查，另精确检查后续加入的备份面板入口。测试未移除现有功能断言。
