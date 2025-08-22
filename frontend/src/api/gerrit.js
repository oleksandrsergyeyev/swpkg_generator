const BASE = "http://localhost:8000/api";

export async function getGerritTagUrl(project, tag) {
  const params = new URLSearchParams({ project, tag }).toString();
  const r = await fetch(`${BASE}/gerrit/tag_url?${params}`);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || `Gerrit tag URL fetch failed: ${r.status}`);
  }
  return r.json(); // { url }
}
