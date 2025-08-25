// src/api/artifacts.js
export async function resolveArtifactMeta(name, sw_version) {
  const u = new URL("http://localhost:8000/api/artifacts/resolve");
  u.searchParams.set("name", name);
  u.searchParams.set("sw_version", sw_version);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // { location, sha256, version? }
}
