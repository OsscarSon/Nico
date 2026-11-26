export const benchLink = (id: string, topic?: string) => {
  const query = new URLSearchParams({bench:id});
  if (topic) query.set("from",topic);
  return "/lab/" + (id.includes("-mathematics/") ? "math" : "statistics") + "?" + query;
};
export const projectKey = (id: string) => "project-" + id;
