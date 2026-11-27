import type { Table } from "./table";

/** Row order matters for seeded splits. The typed JSON encoding distinguishes 7, "7", and null. */
export function tableFingerprint(table: Table) {
  const bytes = new TextEncoder().encode(
    JSON.stringify([table.columns, table.rows]),
  );
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes)
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return "fnv1a64:" + bytes.length + ":" + hash.toString(16).padStart(16, "0");
}
