import { Link } from "../app/router";
import type { Track } from "../content/catalog";
import { artUrl } from "../art";

export function TrackCard({ track }: { track: Track }) {
  const available = track.lessons.filter((l) => l.status === "available").length;
  return (
    <Link to={`/paths/${track.id}`} className={`panel trackcard ${track.status}`}>
      <img className="track-emblem" src={artUrl(track.art)} alt="" width={64} height={64} />
      <h3>{track.title}</h3>
      <p>{track.tagline}</p>
      <p>{track.plannedSummary}</p>
      <span className={`pill ${available ? "available" : ""}`} style={{ alignSelf: "flex-start" }}>
        {available ? `现在可学 ${available} 课` : "规划中"}
      </span>
    </Link>
  );
}
