# 开源选型及执行边界

本分支沿用已锁定的 React、TypeScript、KaTeX、CodeMirror、Pyodide、SQLite、Vitest 和 Playwright。P4 的数据处理、模型练习和模拟逻辑使用可独立测试的 TypeScript。浏览器原生 Web Crypto 用于无需外部服务的签名和认证加密验证。

| 技术 | 许可和适用场景 | P4 决定 |
| --- | --- | --- |
| DuckDB-Wasm | MIT。浏览器列式分析、分析 SQL、Parquet 快照。 | 保留评估。现有 SQLite 已支持实际 SQL、查询计划和本机可下载数据库。轻量实验不承担两套数据库运行时。 |
| Apache Arrow、Parquet | Apache-2.0。Arrow 为列式内存与交换格式，Parquet 为列式持久格式。 | 浏览器数据管道用小型 CSV。外部 DuckDB `1.4.4` 脚本生成五个 Parquet 行组，输出实际查询计划，并用独立逐行计算核对结果。 |
| TensorFlow.js | Apache-2.0。浏览器训练、张量运算及多种后端。 | 当前课内小型梯度采用可输出中间状态的 TypeScript，Pyodide 继续服务可编辑 Python 及专业库对照。 |
| ONNX Runtime Web | MIT。部署已导出的模型，以 WASM/WebGPU 推理。 | 作为浏览器推理选型。需要目标模型、算子覆盖和设备测试，当前原理实验不依赖该运行时。 |
| Transformers.js | Apache-2.0。Tokenizer 和现成 Transformer 模型推理。 | 作为轻量端侧推理候选。平台差异、模型许可、下载量及内存需随所选模型实测。 |
| PyTorch | BSD-style。完整张量、自动微分及外部训练环境。 | 课程标明外部 PyTorch 示例与浏览器内微型自动微分的执行位置。 |
| 原生传输及编排 | 浏览器原生工具能执行 JS、Wasm、Worker 及密码学。 | CUDA、Docker、Kubernetes、Spark、Kafka 的大规模运行仍需各自环境。课堂的缓存、操作系统、流式窗口和多数派模型均标注模拟。 |

GitHub Pages 继续采用相对资源路径和 hash 路由。先进实验与课时只在相关路由加载，重型 Python 及 SQL 延用现有按需机制。npm 元数据用于核对维护版本及许可，未将发行包完整解压体积视为页面下载量。[DuckDB-Wasm](https://duckdb.org/docs/stable/clients/wasm/overview.html) · [Arrow](https://arrow.apache.org/) · [TensorFlow.js](https://www.tensorflow.org/js) · [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) · [Transformers.js](https://huggingface.co/docs/transformers.js) · [PyTorch](https://pytorch.org/)
