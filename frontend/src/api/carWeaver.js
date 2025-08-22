const BASE = "http://localhost:8000/api";

export async function carWeaverGetSourceComponents(itemId) {
  const res = await fetch(
    `${BASE}/carweaver/source_components/${encodeURIComponent(itemId)}`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `CarWeaver fetch failed: ${res.status}`);
  }
  return res.json();
}
