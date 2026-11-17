# 状态

当前：P0/P1及插画PR #1–#6已合并。基于main `23198d3`（含用户导航/F素材上传），分支 `codex/nico-foundation-a18-a20`，完成原A路线剩余A18–A20实现，待独立PR审阅；不合并或部署。

## 本轮完成
- A18：公开样本真实PBKDF2、不同Salt/独立口令、演示密码库、MFA与离线恢复；不接受真实密码。
- A19：五封虚构邮件、实际证据快照、独立核实和三类风险决策；不靠关键词或点击次数判分。
- A20：按任务最小授权、实际功能验证、补丁/锁屏探测、真正复制/丢失/恢复同版本笔记。
- 每课Hook、四段讲解、自由实验、三项挑战、三道诊断题、迁移、总结/先修/来源；三课draft和正式插画占位，无试学证据。
- 原A01–A20均可访问；Foundation32→35/100，全目录212，B14/C1不变。67个美术文件及182个受保护旧实现文件原字节保留，无新依赖。

## 验证
- typecheck、lint、build通过；39文件599项单元测试通过。
- smoke、smoke:b、smoke:ai（关闭及启用mock）、smoke:academy、smoke:foundation/network/web与新smoke:security均通过；1440/390/360px、触屏/键盘、真实完成/首次成绩/续学验证。
- [设计](foundation/A18_A20_DESIGN.md)、[实施/文件清单/限制](foundation/A18_A20_REPORT.md)、[六张实际截图与日志](qa/security-foundation/README.md)、[A路线完整性](foundation/A_ROUTE_COMPLETENESS.md)。旧smoke按最新main入口/分页适配，未删断言。

## 未完成 / 限制
- 无真实试学，全部新课不能升级质量；时间估计未试学验证，新图待提供。下一步先真实试学与记录卡点。
- 密码库/MFA、邮件核查、OS权限/更新/锁屏/备份均有明确教学边界，不是生产安全产品；PBKDF2为真实原生运算。
- 旧课历史缺sources、A02无独立free块、A01/A04讲解段较少、A10无图如实记录，未越范围修写。Academy A21/A22仍为未来规划。
- 未测实体手机/Safari/Firefox或真实AI；既有大chunk提示保留。挑战刷新需重做实操，原步骤和成绩机制不变。
