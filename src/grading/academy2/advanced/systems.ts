export type Job = { id: string; release: number; duration: number };

export function roundRobin(jobs: Job[], quantum: number) {
  if (
    !Number.isInteger(quantum) ||
    quantum < 1 ||
    jobs.some((row) => row.duration < 1 || row.release < 0)
  )
    throw Error("需要正时间片和有效进程数据。");
  const pending = [...jobs].sort((a, b) => a.release - b.release);
  const ready: (Job & { remaining: number })[] = [];
  const trace: { id: string; start: number; end: number; remaining: number }[] =
    [];
  const done: {
    id: string;
    finish: number;
    wait: number;
    turnaround: number;
  }[] = [];
  let time = 0,
    maxQueue = 0;
  const enqueue = () => {
    while (pending[0] && pending[0].release <= time) {
      const job = pending.shift()!;
      ready.push({ ...job, remaining: job.duration });
    }
  };
  while (pending.length || ready.length) {
    if (!ready.length) time = Math.max(time, pending[0]!.release);
    enqueue();
    maxQueue = Math.max(maxQueue, ready.length);
    const next = ready.shift()!,
      start = time;
    const run = Math.min(next.remaining, quantum);
    next.remaining -= run;
    time += run;
    trace.push({ id: next.id, start, end: time, remaining: next.remaining });
    enqueue();
    if (next.remaining) ready.push(next);
    else
      done.push({
        id: next.id,
        finish: time,
        turnaround: time - next.release,
        wait: time - next.release - next.duration,
      });
  }
  return { trace, done, maxQueue };
}

export function waitCycle(edges: [string, string][]) {
  const stack = new Set<string>(),
    closed = new Set<string>();
  function traverse(task: string): string[] {
    if (stack.has(task))
      return [...[...stack].slice([...stack].indexOf(task)), task];
    if (closed.has(task)) return [];
    stack.add(task);
    for (const [from, to] of edges) {
      if (from === task) {
        const cycle = traverse(to);
        if (cycle.length) return cycle;
      }
    }
    stack.delete(task);
    closed.add(task);
    return [];
  }
  for (const [from] of edges) {
    const cycle = traverse(from);
    if (cycle.length) return cycle;
  }
  return [];
}

export function lru(sequence: string[], capacity: number) {
  if (!Number.isInteger(capacity) || capacity < 1)
    throw Error("缓存容量至少为 1。");
  const entries = new Set<string>();
  let hits = 0;
  const trace = sequence.map((key) => {
    const hit = entries.delete(key);
    if (hit) hits++;
    let evicted: string | undefined;
    if (!hit && entries.size === capacity) {
      evicted = entries.values().next().value;
      entries.delete(evicted!);
    }
    entries.add(key);
    return { key, hit, evicted, order: [...entries] };
  });
  return { hits, misses: sequence.length - hits, trace };
}

export function partitionVote(
  voters: number,
  reachable: number,
  stale: number,
) {
  const required = Math.floor(voters / 2) + 1;
  const obtained = Math.max(0, reachable - stale);
  return { required, obtained, canElect: obtained >= required };
}

export function lamport(
  nodes: number,
  events: { on: number; from?: number }[],
) {
  const clocks = Array<number>(nodes).fill(0);
  return events.map(({ on, from }) => {
    const incoming = from === undefined ? 0 : clocks[from]!;
    clocks[on] = Math.max(clocks[on]!, incoming) + 1;
    return [...clocks];
  });
}

type Log =
  | { kind: "begin" | "commit"; tx: string }
  | { kind: "write"; tx: string; key: string; value: number };
export function recover(
  checkpoint: Record<string, number>,
  log: Log[],
  durable: number,
) {
  // Teaching model writes data pages only on commit after a known complete checkpoint.
  const active = new Map<string, { key: string; value: number }[]>();
  const result = new Map(Object.entries(checkpoint)),
    committed: string[] = [];
  for (const record of log.slice(0, durable)) {
    if (record.kind === "begin") active.set(record.tx, []);
    else if (record.kind === "write") active.get(record.tx)?.push(record);
    else {
      const writes = active.get(record.tx);
      if (!writes) throw Error("提交标记没有对应的日志事务。");
      for (const update of writes) result.set(update.key, update.value);
      committed.push(record.tx);
      active.delete(record.tx);
    }
  }
  return {
    rows: Object.fromEntries(result),
    committed,
    aborted: [...active.keys()],
  };
}

type Event = { id: string; time: number; value: number };
export function windows(events: Event[], width: number, lateness: number) {
  const found = new Set<string>(),
    state = new Map<number, number>(),
    emitted = new Map<number, number>();
  const late: string[] = [],
    duplicates: string[] = [];
  let latest = -Infinity;
  for (const event of events) {
    if (found.has(event.id)) {
      duplicates.push(event.id);
      continue;
    }
    found.add(event.id);
    const start = Math.floor(event.time / width) * width;
    if (start + width <= latest - lateness) {
      late.push(event.id);
      continue;
    }
    state.set(start, (state.get(start) ?? 0) + event.value);
    latest = Math.max(event.time, latest);
    for (const [window, value] of state) {
      if (window + width <= latest - lateness) {
        emitted.set(window, value);
        state.delete(window);
      }
    }
  }
  return {
    emitted: [...emitted.entries()],
    pending: [...state.entries()],
    late,
    duplicates,
    watermark: latest - lateness,
  };
}

export function errorBudget(total: number, succeeded: number, target: number) {
  if (
    total <= 0 ||
    succeeded < 0 ||
    succeeded > total ||
    target <= 0 ||
    target > 1
  )
    throw Error("检查预算输入。");
  const failed = total - succeeded,
    budget = Math.floor(total * (1 - target) + 1e-9);
  return { sli: succeeded / total, failed, budget, remaining: budget - failed };
}

export function databaseSnapshot(
  rows: { key: string; revision: number; value: number | null }[],
  snapshot: number,
) {
  const versions = new Map<string, (typeof rows)[number]>();
  for (const row of rows)
    if (
      row.revision <= snapshot &&
      (versions.get(row.key)?.revision ?? -1) < row.revision
    )
      versions.set(row.key, row);
  return [...versions.values()]
    .filter((row) => row.value !== null)
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function indexedRange(
  keys: number[],
  leafSize: number,
  begin: number,
  end: number,
) {
  const leaves: number[][] = [];
  const sorted = [...keys].sort((a, b) => a - b);
  for (let offset = 0; offset < sorted.length; offset += leafSize)
    leaves.push(sorted.slice(offset, offset + leafSize));
  const separators = leaves.slice(1).map((page) => page[0]!);
  let left = 0,
    right = separators.length,
    comparisons = 0;
  // First separator whose key is >= lower bound. On equality start on the left
  // so duplicates spanning multiple leaf pages remain visible.
  while (left < right) {
    const mid = (left + right) >>> 1;
    comparisons++;
    if (separators[mid]! < begin) left = mid + 1;
    else right = mid;
  }
  let reads = 0;
  const values: number[] = [];
  for (let i = left; i < leaves.length && leaves[i]![0]! <= end; i++) {
    reads++;
    for (const v of leaves[i]!) if (v >= begin && v <= end) values.push(v);
  }
  return { leaves, separators, values, reads, comparisons };
}

export function workload(arrivals: number[], capacity: number, limit: number) {
  let queued = 0,
    completed = 0,
    dropped = 0;
  return arrivals.map((received, time) => {
    const overflow = Math.max(0, queued + received - limit);
    dropped += overflow;
    queued = queued + received - overflow;
    const served = Math.min(queued, capacity);
    queued -= served;
    completed += served;
    return { time, received, served, queued, dropped, completed };
  });
}

export function routeService(
  path: string,
  authenticated: boolean,
  available: boolean,
  requestId: string,
  known: ReadonlySet<string>,
) {
  if (path !== "/books" && path !== "/loans")
    return { status: 404, accepted: false };
  if (path === "/loans" && !authenticated)
    return { status: 401, accepted: false };
  if (!available) return { status: 503, accepted: false };
  if (path === "/loans" && known.has(requestId))
    return { status: 200, accepted: false };
  if (path === "/loans") return { status: 201, accepted: true };
  return { status: 200, accepted: false };
}

export function replicaCommit(
  nodes: number,
  reachable: number,
  acknowledged: number,
) {
  const majority = Math.floor(nodes / 2) + 1;
  if (
    reachable < 1 ||
    reachable > nodes ||
    acknowledged < 1 ||
    acknowledged > reachable
  )
    throw Error("确认数须在可达副本范围内，含 leader。");
  const replicated = Array.from({ length: nodes }, (_, i) => i < acknowledged);
  const committed = acknowledged >= majority;
  return { majority, replicated, committed, remaining: nodes - acknowledged };
}

export function transactionDecision(
  votes: (boolean | null)[],
  durable: boolean,
) {
  const decision = votes.includes(false)
    ? "abort"
    : votes.every((x) => x === true)
      ? "commit"
      : null;
  const persisted = durable ? decision : null;
  return {
    decision: persisted,
    participants: votes.map((vote) =>
      vote === false
        ? "aborted"
        : vote === null
          ? "waiting"
          : persisted === "commit"
            ? "committed"
            : persisted === "abort"
              ? "aborted"
              : "prepared",
    ),
  };
}

export function distribute(
  jobs: number,
  replicas: number,
  unavailable: number,
) {
  const active = Array.from({ length: replicas }, (_, i) => i >= unavailable),
    counts = Array<number>(replicas).fill(0);
  const healthy = active.flatMap((state, i) => (state ? [i] : []));
  if (!healthy.length) return { counts, unserved: jobs, healthy: 0 };
  for (let i = 0; i < jobs; i++) counts[healthy[i % healthy.length]!]!++;
  return { counts, unserved: 0, healthy: healthy.length };
}
