# A18–A20 实际截图与验证

六张均由最终构建的真实Playwright操作流程拍摄，没有拼图、渲染稿或注入完成状态。桌面1440×1000、手机390×844；360px另有实操/溢出检查，不重复保存图片。截图位于已成功检查的第三项挑战，展示实际证据区域；可见的手机底栏属于现有UI。

|课程与画面|桌面1440|手机390|
|---|---|---|
|A18：真实PBKDF2记录、MFA验证后的登录状态|[桌面](a18-passwords-1440.png)|[手机](a18-passwords-390.png)|
|A19：未确认新流程的实际证据与独立核实|[桌面](a19-phishing-1440.png)|[手机](a19-phishing-390.png)|
|A20：实际笔记v2、独立副本与恢复结果|[桌面](a20-least-privilege-1440.png)|[手机](a20-least-privilege-390.png)|

运行记录与初次失败修复：[VALIDATION.log](VALIDATION.log)。教学设计、限制和全部修改文件见[实施报告](../../foundation/A18_A20_REPORT.md)。

复现：`npm ci`（Node>=22）→`npm run build`→`npm run preview -- --port 4188`，另一个终端运行 `BASE_URL=http://localhost:4188 npm run smoke:security`。默认输出六张图片到被git忽略的`test-results/security/`。
