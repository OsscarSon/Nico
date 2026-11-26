export function circuit(source: number, parts: number[], closed: boolean) {
  const resistance = parts.reduce((sum, r) => sum + r, 0);
  if (!Number.isFinite(source) || source < 0 || parts.some(r => !Number.isFinite(r) || r < 0)) return { fault: true, resistance, current: null, drops: [] };
  if (!closed) return { fault: false, resistance, current: 0, drops: parts.map(() => 0) };
  if (!resistance) return { fault: true, resistance, current: null, drops: [] };
  const current = 1000 * source / resistance;
  return { fault: false, resistance, current, drops: parts.map(r => current * r / 1000) };
}

export function indicator(samples: readonly number[], low: number, high: number) {
  let enabled = false;
  return samples.map(value => {
    if (value <= low) enabled = true;
    else if (value >= high) enabled = false;
    return { value, enabled };
  });
}
export function adc(voltage: number, reference: number, bits: number) {
  if (!Number.isFinite(voltage) || !Number.isFinite(reference) || reference <= 0 || !Number.isInteger(bits) || bits < 1 || bits > 16) return null;
  const levels = 2 ** bits;
  return Math.max(0, Math.min(levels - 1, Math.floor(voltage * levels / reference)));
}
export function pwm(highSlots: number) {
  return Array.from({ length: 16 }, (_, index) => index % 8 < highSlots);
}

export const distanceFixture: readonly (number | null)[] = [50, 17, 49, 18, 19, null, 42, 45, 46];
export function readDistance(samples: readonly (number | null)[], mode: "latest" | "median", onMissing: "unknown" | "zero") {
  let window: number[] = [];
  return samples.map(raw => {
    if (raw === null) {
      window = [];
      return { raw, value: onMissing === "unknown" ? null : 0 };
    }
    window = [...window.slice(-2), raw];
    const value = mode === "latest" ? raw : window.length === 3 ? [...window].sort((a, b) => a - b)[1]! : null;
    return { raw, value };
  });
}

export function testMotion(driver: boolean, direction: "forward" | "reverse", duty: number, target: number) {
  return { effort: driver && duty !== 0 ? (direction === "forward" ? 1 : -1) * duty : 0, target: Math.min(180, Math.max(0, target)), blocked: !driver };
}

const device = { address: "2a", registers: { "01": 42, "02": 17 } as Record<string, number> };
export function exchange(rxBaud: number, address: string, register: string) {
  const ack = address.toLowerCase() === device.address;
  return {
    serial: rxBaud === 9600 ? "READY" : null,
    ack,
    value: ack ? device.registers[register.toLowerCase()] ?? null : null,
  };
}
