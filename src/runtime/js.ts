import { instrumentLoops, JsSyntaxError, type Parse } from "./loopGuard";
import { describeJsError, type JsError } from "../grading/js";

export type JsRunResult = {
  stdout: string;
  /** 已经整理成中文提示的错误；没出错为 null */
  error: string | null;
  timedOut: boolean;
  /** iframe 没有按时回话（被卡住或加载失败） */
  noResponse: boolean;
  truncated: boolean;
};

export type JsRunOptions = {
  /** 脚本运行之前就在页面里的 HTML（可为空） */
  page?: string;
  code: string;
  /** 接在学习者代码后面运行的检查代码（用 console.log 输出结果） */
  harness?: string;
  /** 把 iframe 放进这个容器里显示（预览）；不给就放进屏幕外看不见的位置 */
  container?: HTMLElement | null;
  /** 单次同步执行的时间预算（毫秒），超过就抛出 LoopTimeout */
  budgetMs?: number;
  /** 脚本跑完后，再等多久收集定时器等异步输出 */
  settleMs?: number;
  /** 整次运行的总上限 */
  timeoutMs?: number;
  parse?: Parse;
};

export const JS_BUDGET_MS = 2000;
export const JS_SETTLE_MS = 120;
export const JS_TIMEOUT_MS = 6000;

/** 在 iframe 最前面运行的小脚本：捕获 console、错误，提供循环保护函数，并在最后把结果报告给外层。 */
export function shimSource(token: string, budgetMs: number): string {
  return `(function(){
var T=${JSON.stringify(token)},BUDGET=${Number(budgetMs)},LOOP="__NICO_LOOP__";
var lines=[],chars=0,trunc=false,err=null;
function post(m){m.token=T;parent.postMessage(m,"*");}
function fmt(v){
  if(typeof v==="string")return v;
  if(v===undefined)return "undefined";
  if(typeof v==="function")return "[Function]";
  if(typeof v==="symbol")return String(v);
  if(v instanceof Error)return v.name+": "+v.message;
  try{var s=JSON.stringify(v);return s===undefined?String(v):s;}catch(e){return String(v);}
}
function add(args){
  if(trunc)return;
  var s=Array.prototype.map.call(args,fmt).join(" ");
  chars+=s.length+1;
  if(lines.length>=500||chars>20000){trunc=true;return;}
  lines.push(s);
}
["log","info","warn","error","debug"].forEach(function(k){console[k]=function(){add(arguments);};});
window.alert=function(m){add(["[alert] "+m]);};
window.confirm=function(){return false;};
window.prompt=function(){return null;};
function record(name,message,line){
  if(err)return;
  if(message===LOOP){name="LoopTimeout";message="";}
  err={name:name||"Error",message:String(message||""),line:line||null};
}
window.addEventListener("error",function(e){
  e.preventDefault();
  record(e.error&&e.error.name,e.error?e.error.message:e.message,e.lineno);
});
window.addEventListener("unhandledrejection",function(e){
  e.preventDefault();
  var r=e.reason;record(r&&r.name,r&&r.message?r.message:String(r),null);
});
var last=0,armed=false,n=0,dead=false;
window.__nicoG=function(){
  if(dead)throw new Error(LOOP);
  if(!armed){armed=true;last=Date.now();queueMicrotask(function(){armed=false;});}
  if((++n&255)===0&&Date.now()-last>BUDGET){dead=true;throw new Error(LOOP);}
};
window.__nicoDone=function(){post({type:"done",lines:lines,truncated:trunc,error:err});};
})();`;
}

const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:";

/** 拼出 iframe 的完整文档。返回文档，以及学习者代码第一行在文档里的行号（用来换算报错的行号）。 */
export function buildJsDocument(o: {
  page: string;
  code: string;
  harness: string;
  token: string;
  budgetMs: number;
  settleMs: number;
}): { doc: string; firstLine: number } {
  const head =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">` +
    `<script>${shimSource(o.token, o.budgetMs)}</script></head><body>\n${o.page}\n<script>\n`;
  const firstLine = head.split("\n").length; // 学习者代码的第 1 行所在的文档行
  const doc =
    head +
    o.code +
    `\n</script>\n<script>\n${o.harness}\n</script>\n` +
    `<script>setTimeout(function(){window.__nicoDone();},${Number(o.settleMs)});</script></body></html>`;
  return { doc, firstLine };
}

let parserPromise: Promise<Parse> | null = null;
/** acorn 只在第一次运行 JS 时才下载。 */
export function getParser(): Promise<Parse> {
  parserPromise ??= import("acorn").then((m) => m.parse as unknown as Parse);
  return parserPromise;
}

type Done = { type: "done"; token: string; lines: string[]; truncated: boolean; error: JsError | null };

let counter = 0;

export async function runJs(o: JsRunOptions): Promise<JsRunResult> {
  const blank: JsRunResult = { stdout: "", error: null, timedOut: false, noResponse: false, truncated: false };
  const budgetMs = o.budgetMs ?? JS_BUDGET_MS;
  const token = `nico-${Date.now()}-${++counter}`;

  let code: string;
  let harness = "";
  try {
    const parse = o.parse ?? (await getParser());
    code = instrumentLoops(o.code, parse);
    if (o.harness) harness = instrumentLoops(o.harness, parse);
  } catch (e) {
    if (e instanceof JsSyntaxError)
      return { ...blank, error: describeJsError({ name: "SyntaxError", message: e.message, line: e.line }) };
    return { ...blank, error: "没能加载 JavaScript 检查工具（acorn）。请检查网络后再试一次。" };
  }

  const { doc, firstLine } = buildJsDocument({
    page: o.page ?? "",
    code,
    harness,
    token,
    budgetMs,
    settleMs: o.settleMs ?? JS_SETTLE_MS,
  });
  const learnerLines = o.code.split("\n").length;

  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts"); // 不给 allow-same-origin：学习者的代码碰不到我们的页面
  frame.title = "页面预览";
  frame.className = "web-preview";
  const visible = Boolean(o.container);
  if (!visible) {
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;height:600px;border:0;";
  }

  return new Promise<JsRunResult>((resolve) => {
    let finished = false;
    const finish = (r: JsRunResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (!visible) frame.remove();
      resolve(r);
    };
    const onMessage = (ev: MessageEvent) => {
      const m = ev.data as Done | undefined;
      if (ev.source !== frame.contentWindow || !m || m.token !== token || m.type !== "done") return;
      let error: string | null = null;
      let timedOut = false;
      if (m.error) {
        timedOut = m.error.name === "LoopTimeout";
        const inLearner = m.error.line !== null && m.error.line >= firstLine && m.error.line < firstLine + learnerLines;
        error = describeJsError({
          ...m.error,
          line: inLearner ? m.error.line! - firstLine + 1 : null,
        });
      }
      finish({ stdout: m.lines.join("\n"), error, timedOut, noResponse: false, truncated: m.truncated });
    };
    const timer = setTimeout(
      () => finish({ ...blank, noResponse: true, timedOut: true, error: "运行太久没有响应，已被停止。" }),
      o.timeoutMs ?? JS_TIMEOUT_MS,
    );
    window.addEventListener("message", onMessage);
    frame.srcdoc = doc;
    if (visible) o.container!.replaceChildren(frame);
    else document.body.appendChild(frame);
  });
}
