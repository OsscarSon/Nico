import { adc, circuit, distanceFixture, exchange, indicator, pwm, readDistance, testMotion } from "./circuits";

type Values = Record<string, string>;
type Field = { key: string; label: string; initial: string; options: [string, string][] };
type Check = { label: string; text: string; ok: boolean };
export type BenchReport = { checks: Check[]; trace?: string[]; pulse?: boolean[] };
type Bench = { fields: Field[]; run: (values: Values) => BenchReport };
export const select = (key: string, label: string, initial: string, options: [string, string][]): Field => ({ key, label, initial, options });
const counts = (values: number[]): [string, string][] => values.map(n => [String(n), String(n)]);
const check = (label: string, text: string, ok: boolean): Check => ({ label, text, ok });
const num = (n: number) => String(Number(n.toFixed(2)));
export const passed = (report: BenchReport | null) => Boolean(report?.checks.length && report.checks.every(c => c.ok));

const series: Bench = {
  fields: [
    select("voltage", "电源电压（V）", "6", counts([3, 6])),
    select("r1", "第一段电阻（Ω）", "100", counts([0, 100, 200])),
    select("r2", "第二段电阻（Ω）", "100", counts([0, 100, 200, 300])),
    select("switch", "开关", "open", [["open", "断开"], ["closed", "闭合"]]),
  ],
  run(v) {
    const voltage = Number(v.voltage);
    const pieces = [Number(v.r1), Number(v.r2)];
    const closed = v.switch === "closed";
    const result = circuit(voltage, pieces, closed);
    const opened = circuit(voltage, pieces, false);
    return {
      checks: [
        check("总电阻", result.resistance + " Ω", result.resistance === 300),
        check("当前电流", result.current === null ? "零总电阻，理想模型无法给出安全的有限电流" : num(result.current) + " mA",
          closed && voltage === 3 && result.current === 10),
        check("断开对照", opened.current + " mA", opened.current === 0),
      ],
      trace: closed && !result.fault ? ["第一段压降 " + num(result.drops[0]!) + " V", "第二段压降 " + num(result.drops[1]!) + " V"] : [],
    };
  },
};

const io: Bench = {
  fields: [
    select("sensor", "读取输入", "distance", [["distance", "距离传感器"], ["light", "亮度传感器"]]),
    select("actor", "控制输出", "sound", [["sound", "蜂鸣提示"], ["lamp", "指示灯"]]),
    select("rule", "开关规则", "single", [["single", "单门槛 30"], ["dual", "低于或等于 30 开，达到 60 关"]]),
  ],
  run(v) {
    const readings = v.sensor === "light" ? [85, 21, 45, 78] : [10, 15, 40, 75];
    const high = v.rule === "dual" ? 60 : 30;
    const result = indicator(readings, 30, high);
    return {
      checks: [
        check("输入来源", v.sensor === "light" ? "读取 0–100 的教学亮度" : "读取距离单位", v.sensor === "light"),
        check("输出装置", v.actor === "lamp" ? "指示灯" : "蜂鸣提示", v.actor === "lamp"),
        check("保持区间", result.map(sample => sample.enabled ? "开" : "关").join(" → "),
          JSON.stringify(result.map(sample => sample.enabled)) === "[false,true,true,false]"),
      ],
      trace: result.map(sample => sample.value + " · 输出" + (sample.enabled ? "打开" : "关闭")),
    };
  },
};

const signals: Bench = {
  fields: [
    select("reference", "ADC 参考电压（V）", "5", counts([3.3, 5])),
    select("voltage", "输入电压（V）", "3.3", counts([0, 1.65, 3.3])),
    select("slots", "PWM 每八拍的高电平数", "4", counts([0, 2, 4, 8])),
  ],
  run(v) {
    const reference = Number(v.reference);
    const sample = adc(Number(v.voltage), reference, 10);
    const pulse = pwm(Number(v.slots));
    const high = pulse.filter(Boolean).length;
    return {
      checks: [
        check("10 位 ADC 读数", String(sample), reference === 3.3 && sample === 512),
        check("参考电压处的饱和读数", String(adc(reference, reference, 10)), adc(reference, reference, 10) === 1023),
        check("两周期高电平", high + " / 16 拍", high === 4),
      ],
      pulse,
    };
  },
};

const reading: Bench = {
  fields: [
    select("filter", "读取策略", "latest", [["latest", "直接用最新值"], ["median", "最近三条有效值的中位数"]]),
    select("missing", "读数超时", "zero", [["zero", "把缺失当成 0"], ["unknown", "标记未知并重建窗口"]]),
  ],
  run(v) {
    const result = readDistance(distanceFixture, v.filter === "median" ? "median" : "latest", v.missing === "unknown" ? "unknown" : "zero");
    const suppress = result.slice(0, 3).every(row => row.value === null || row.value >= 25);
    return {
      checks: [
        check("孤立低读数", suppress ? "未误报" : "短时噪声被当成靠近", suppress),
        check("持续靠近", "第五拍 " + result[4]!.value, result[4]!.value !== null && result[4]!.value < 25),
        check("失效与恢复", result[5]!.value === null ? "超时为未知，恢复后 " + result[8]!.value : "超时错误地变成 0",
          result[5]!.value === null && result[8]!.value === 45),
      ],
      trace: result.map(({ raw, value }, i) => (i + 1) + " · 原读数 " + (raw ?? "超时") + " → 输出 " + (value ?? "未知或窗口不足")),
    };
  },
};

const motors: Bench = {
  fields: [
    select("driver", "模拟电机驱动", "off", [["off", "缺少驱动"], ["on", "驱动可用"]]),
    select("direction", "直流电机方向", "reverse", [["forward", "正转"], ["reverse", "反转"]]),
    select("duty", "直流电机控制占空（%）", "40", counts([0, 40, 60])),
    select("angle", "舵机目标角（°）", "45", counts([0, 45, 90, 180])),
  ],
  run(v) {
    const direction = v.direction === "forward" ? "forward" : "reverse";
    const duty = Number(v.duty);
    const target = Number(v.angle);
    const result = testMotion(v.driver === "on", direction, duty, target);
    const zero = testMotion(v.driver === "on", direction, 0, target);
    return {
      checks: [
        check("直流电机控制量", result.blocked ? "缺少驱动，指令被拦截" : num(result.effort) + "%（有符号指令）", result.effort === 60),
        check("舵机", "请求角 " + result.target + "°", result.target === 90),
        check("停止对照", "直流电机控制量 " + num(zero.effort) + "%，舵机请求角 " + zero.target + "°", zero.effort === 0 && zero.target === 90),
      ],
    };
  },
};

const bus: Bench = {
  fields: [
    select("baud", "UART 接收端波特率", "115200", counts([9600, 115200])),
    select("address", "I²C 目标地址", "2b", [["2a", "0x2A"], ["2b", "0x2B"]]),
    select("register", "I²C 读取寄存器", "02", [["01", "0x01"], ["02", "0x02"], ["03", "0x03"]]),
  ],
  run(v) {
    const r = exchange(Number(v.baud), v.address ?? "", v.register ?? "");
    return {
      checks: [
        check("UART 接收", r.serial ?? "参数不匹配，未识别 READY", r.serial === "READY"),
        check("I²C 地址响应", r.ack ? "ACK" : "无 ACK", r.ack),
        check("I²C 数据", r.value === null ? "未取得数据" : String(r.value), r.value === 42),
      ],
    };
  },
};
export const benches = { series, io, signals, reading, motors, bus };
export type BenchKey = keyof typeof benches;
