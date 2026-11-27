export function arenaLink(model: string, from?: string) {
  return (
    "/lab/algorithms?model=" +
    encodeURIComponent(model) +
    (from ? "&from=" + encodeURIComponent(from) : "")
  );
}
