import { localApi, type ApiResponse, type FetchRequest } from "../grading/fetchLab";
/** A real asynchronous Promise over an explicit local fixture. Never contacts the network. */
export async function requestLocalApi(request: FetchRequest, delayMs = 250): Promise<ApiResponse> {
  await new Promise<void>(resolve => setTimeout(resolve, delayMs));
  const outcome = localApi(request);
  if (outcome.error !== undefined) throw new TypeError(outcome.error);
  return outcome.response;
}
