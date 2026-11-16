import { aiArt } from "../../ai/art";
import type { AiFail } from "../../ai/protocol";
import { Feedback } from "../../components/ui";
import { artUrl } from "../../art";

/** AI 调用失败时的说明：如实显示原因和多久后可以再试；额度用完时配一张图（图出了才显示）。 */
export function AiError({ error }: { error: AiFail }) {
  return (
    <>
      {error.code === "quota_exhausted" && aiArt.quota && (
        <img className="empty-art" src={artUrl(aiArt.quota)} alt="" width={400} height={300} />
      )}
      <Feedback ok={false}>
        {error.message}
        {error.retryAfterSec ? `（约 ${error.retryAfterSec} 秒后可再试）` : ""}
      </Feedback>
    </>
  );
}
