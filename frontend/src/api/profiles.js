const BASE = "http://localhost:8000/api";

export async function fetchProfiles() {
  const r = await fetch(`${BASE}/profiles`);
  if (!r.ok) throw new Error(`Failed to fetch profiles: ${r.status}`);
  return r.json();
}

export async function addProfile(profile) {
  const r = await fetch(`${BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!r.ok) throw new Error(`Failed to add profile: ${r.status}`);
}

export async function updateProfile(profile) {
  const r = await fetch(`${BASE}/profiles/${profile.sw_package_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!r.ok) throw new Error(`Failed to update profile: ${r.status}`);
}

export async function deleteProfileRequest(sw_package_id) {
  const r = await fetch(`${BASE}/profiles/${sw_package_id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`Failed to delete profile: ${r.status}`);
}
