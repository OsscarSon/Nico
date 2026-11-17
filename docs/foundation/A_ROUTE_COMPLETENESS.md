# Foundation A01–A20 最终完整性审查

基于 main `23198d3` 加本轮 A18–A20；2026-11-17。检查的是真实课程注册表、Schema、先修/下一课关系及实际浏览器入口，**不是学习者试学或正式质量认证**。

- 原有 A01–A20 ID 连续且唯一，20门均 `available`；全部符合现有 Schema。每门都有Hook、互动挑战、3道诊断检查题、数值迁移、3点总结。
- 先修都指向本路线更早的实际课程；下一课从A01连续到A20，A20无下一课、返回A路线。
- 浏览器360px逐一打开20门开场：无空白、无横向溢出，已有课程图片加载且保持原比例。新三课另在1440/390/360px完成真实操作挑战。
- 路线PathMap为20/20可访问；Academy较大的规划目录仍保留A21/A22为next。因此Academy基础A显示20/22，而不是擅自把两门未来规划删除。Foundation总计35/100，全目录212不变。

| 课程ID | 讲解段 | 自由 / 挑战 | 检查 / 迁移 / 总结 | 插画 | 来源数 | 下一课 |
|---|---:|---|---|---|---:|---|
| a01-binary | 2 | bit-switches / bit-switches | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 0 | A02 |
| a02-hex-encoding | 4 | 无独立自由块 / bit-switches | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 0 | A03 |
| a03-logic-gates | 3 | logic-gate / logic-gate | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 0 | A04 |
| a04-adder | 2 | half-adder / half-adder | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 0 | A05 |
| a05-cpu-cycle | 3 | mini-cpu / mini-cpu | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 0 | A06 |
| a06-memory | 3 | memory / memory | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 2 | A07 |
| a07-os | 3 | os / os | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 2 | A08 |
| a08-command-line | 3 | terminal / terminal | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 3 | A09 |
| a09-network-layers | 4 | layers / layers | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 0 | A10 |
| a10-ip-subnet | 3 | subnet / subnet | 3题 / 有 / 3点 | 未设置插画 | 0 | A11 |
| a11-devices | 4 | forwarding / forwarding | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 3 | A12 |
| a12-packets | 4 | reassembly / reassembly | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 2 | A13 |
| a13-dns | 3 | dns / dns | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 0 | A14 |
| a14-tcp | 4 | tcp / tcp | 3题 / 有 / 3点 | 正式图（原文件/居中成果保留） | 2 | A15 |
| a15-udp | 4 | udp / udp | 3题 / 有 / 3点 | 正式占位 | 4 | A16 |
| a16-http-https | 4 | http / http | 3题 / 有 / 3点 | 正式占位 | 3 | A17 |
| a17-web-journey | 4 | journey / journey | 3题 / 有 / 3点 | 正式占位 | 5 | A18 |
| a18-passwords | 4 | password / password | 3题 / 有 / 3点 | 正式占位 | 3 | A19 |
| a19-phishing | 4 | phishing / phishing | 3题 / 有 / 3点 | 正式占位 | 4 | A20 |
| a20-least-privilege | 4 | privilege / privilege | 3题 / 有 / 3点 | 正式占位 | 3 | 返回A路线 |

## 如实保留的历史缺项

- 所有20门仍为draft；没有真实学习者试学证据，本轮不提升任何质量状态。可访问20/20不等于已获20门教学质量验收。
- A01–A05、A09、A10、A13的sources仍为空。A01/A04各2段讲解，未达到新课采用的4段编排；A02没有独立的free模拟器块，但有可操作挑战。这些均为旧内容，本轮只记录，不越范围补写。
- A10原本未设置课头插画；A15–A20保留正式插画占位。不用临时图标补齐。A05/A09等历史美术复核事项仍见既有ART_LAYOUT_AUDIT.md。
- A18–A20本轮均有4段讲解、自由实验、3项真实状态挑战、3道带诊断反馈的检查题、迁移、3点总结与至少3项参考来源。

## 保护检查

- `public/art/`基线67个文件逐个SHA-256一致（包括A–F路线、Logo/Hero/Byte/徽章、原图和已居中副本），没有新增、覆盖、删除美术资源。
- 既有A01–A17及B/C课程内容、旧模拟器/判分、进度与AI源文件保持原字节；LessonPlayer和Academy UI未改。
- 新课只注册新的sim类型与内容；目录只改A18/A19/A20上线状态及实验说明。

结构自动校验：[security-lessons.test.ts](../../tests/security-lessons.test.ts)；真实入口审查：[smoke-security.mjs](../../scripts/smoke-security.mjs)。
