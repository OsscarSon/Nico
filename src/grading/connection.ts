/** Adapter shared only by new labs. Existing A14 TCP model remains untouched. */
import { startTcp, sendTcpData, deliverTcp, dropTcp, delayTcp, tickTcp, retryTcp, type TcpState } from "./tcp";
export type TcpCommand = { type: "start" | "data" | "tick" } | { type: "deliver" | "drop" | "delay"; id: number } | { type: "retry"; side: "client" | "server" };
export const connectedTcp = (s: TcpState): boolean => s.client === "ESTABLISHED" && s.server === "ESTABLISHED";
export function applyTcpCommand(s: TcpState, command: TcpCommand): TcpState {
  switch (command.type) {
    case "start": return startTcp(s);
    case "data": return sendTcpData(s);
    case "tick": return tickTcp(s);
    case "deliver": return deliverTcp(s, command.id);
    case "drop": return dropTcp(s, command.id);
    case "delay": return delayTcp(s, command.id);
    case "retry": return retryTcp(s, command.side);
  }
}
