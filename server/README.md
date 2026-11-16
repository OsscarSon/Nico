# AI 代理：部署说明

浏览器**不能**直接调用模型：密钥放在网页里等于公开。所以由这个小服务（`server/core.ts`）代为调用。核心代码只依赖 Web 标准（Request / Response / fetch），同一份可以放在 Cloudflare Workers 或 Vercel。

> **状态：没有在真实环境部署或调用过真实模型。** 下面的步骤按官方文档写，请边做边核对；哪一步不对，把报错贴回来。

## 第 0 步：拿一个模型密钥
- 默认写的是 Google Gemini：到 Google AI Studio 创建 API key。**模型名会变，免费额度也会变**，请在 AI Studio 里确认当前可用的模型名（填进 `AI_MODEL`）和限额。
- 想换别的服务，或在本机用 Ollama 等开源模型：把 `AI_PROVIDER` 设成 `openai-compatible`，再设 `AI_BASE_URL`（例如 Ollama 的 `http://localhost:11434/v1`）和 `AI_MODEL`。本机开发时零费用。

## 方案 A：Cloudflare Workers（推荐，免费额度够用）
1. 安装并登录：`npx wrangler login`
2. 编辑 `server/wrangler.toml`，设置 `AI_MODEL` 和 `ALLOWED_ORIGINS`（你的网站来源，例如 `https://你的用户名.github.io`，**不含路径**）。
3. 设置密钥（不要写进文件）：`cd server && npx wrangler secret put AI_API_KEY`；再 `npx wrangler secret put QUOTA_SALT`（随便一串随机字符）。
4. 部署：`npx wrangler deploy`。得到形如 `https://nico-ai.<你的账号>.workers.dev` 的地址。
5. （可选）让额度计数跨实例共享：`npx wrangler kv namespace create QUOTA`，把返回的 id 填进 `wrangler.toml` 里被注释的 `[[kv_namespaces]]`。

## 方案 B：Vercel
1. 把仓库导入 Vercel（`api/ai.ts` 放在 `/api` 下，Node.js 运行时，不需要额外配置）。
2. 在项目的 Environment Variables 里设置 `.env.example` 里列出的变量（至少 `AI_MODEL`、`AI_API_KEY`、`ALLOWED_ORIGINS`、`QUOTA_SALT`）。
3. 端点是 `https://<你的项目>.vercel.app/api/ai`。
4. 注意：Vercel 按需启动多个实例，**内存里的额度计数每个实例各算各的**，限额只是大致有效。

## 把前端接上
- 在 GitHub 仓库：Settings → Secrets and variables → Actions → **Variables** → 新建 `VITE_AI_ENDPOINT`，值是上面得到的完整地址。下次部署网站时就会带上（`.github/workflows/deploy.yml` 已经会读它）。
- 本机开发：复制根目录的 `.env.example` 为 `.env.local` 并填 `VITE_AI_ENDPOINT`；`ALLOWED_ORIGINS` 不设时代理只放行 `localhost`。
- **前端只放地址，绝不放密钥。**

## 自己测一下（把地址换成你的）
```bash
curl -s -X POST "$ENDPOINT" -H "Origin: https://你的用户名.github.io" \
  -H "Content-Type: application/json" \
  -d '{"kind":"run","prompt":"用一句话解释什么是 DNS"}'
```
正常返回 `{"ok":true,"kind":"run","text":"…","model":"…"}`。常见失败码：`not_configured`（缺 `AI_MODEL` / `AI_API_KEY`）、`origin_forbidden`（来源不在白名单）、`rate_limited` / `quota_exhausted`、`upstream_error`（模型服务出错，日志里有状态码）、`bad_output`。

## 成本与额度
- 默认每人每分钟 6 次、每天 30 次、全站每天 500 次（环境变量 `LIMIT_PER_MINUTE`、`LIMIT_PER_DAY`、`LIMIT_GLOBAL_PER_DAY` 可调）。这是软限制，见 `docs/AI.md`。
- 每次请求的输出长度有上限（导师 900 / 点评 1400 / 运行 700 个 token）。部分模型会把“思考”也算进输出 token，如果经常 `bad_output`，说明上限被思考用光了，需要调高 `src/ai/prompts.ts` 里的 `maxOutputTokens`。

## 隐私
- 学习者写的内容会发给你选的模型服务。代理不保存内容，日志只记错误类别；访客标识是 IP 加盐哈希，原始 IP 不进存储。
- 但 Cloudflare / Vercel / 模型服务各自有自己的日志和政策，请对照它们的说明。
