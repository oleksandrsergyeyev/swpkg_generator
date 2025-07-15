const API = "http://localhost:8000/api";

export async function fetchProfiles() {
  const res = await fetch(`${API}/profiles`);
  return await res.json();
}
export async function addProfile(profile) {
  const res = await fetch(`${API}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  });
  if (!res.ok) throw new Error("Failed to add profile");
  return await res.json();
}
export async function updateProfile(profile) {
  const res = await fetch(`${API}/profiles/${profile.sw_package_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return await res.json();
}
export async function deleteProfile(sw_package_id) {
  const res = await fetch(`${API}/profiles/${sw_package_id}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete profile");
  return await res.json();
}
