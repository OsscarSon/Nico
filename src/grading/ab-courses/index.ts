import { logsLab, protocolLab, routingLab, statusLab } from "./network";
import { cloudLab, linuxLab, registerLab, responseLab } from "./systems";
import { asyncLab, backendLab, databaseLab, frontendLab, structuresLab } from "./programming";
import { fullstackLab, workflowLab } from "./delivery";
import type { Lab, LabId } from "./model";

export const abLabs: Record<LabId, Lab> = {
  status: statusLab, logs: logsLab, register: registerLab, linux: linuxLab, protocol: protocolLab,
  routing: routingLab, response: responseLab, cloud: cloudLab, "async-types": asyncLab, backend: backendLab,
  frontend: frontendLab, database: databaseLab, structures: structuresLab, workflow: workflowLab, fullstack: fullstackLab,
};
