import React, { useState, useEffect } from "react";

// Defaults and helpers
const DEFAULT_CATEGORY = "design";
const DEFAULT_KIND = "Simulink";
const DEFAULT_CONTENT_TYPE = "application/model";
const DEFAULT_REG_REQ = "N/A";
const DEFAULT_FILENAMN = "Gerrit log";
const DEFAULT_TARGET_PLATFORM = "SUM1";
const DEFAULT_CP = "VCTN";
const DEFAULT_CPV = "PRR";

const EMPTY_PROFILE = () => ({
  sw_package_id: "",
  profile_name: "",
  swad: [],
  swdd: [],
  generic_product_module: { location: "", id: "", version: "" },
  source_references: [],
  artifacts: [],
});

async function fetchProfiles() {
  const r = await fetch("http://localhost:8000/api/profiles");
  return await r.json();
}

async function addProfile(profile) {
  await fetch("http://localhost:8000/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

async function updateProfile(profile) {
  await fetch(`http://localhost:8000/api/profiles/${profile.sw_package_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

async function deleteProfileRequest(sw_package_id) {
  await fetch(`http://localhost:8000/api/profiles/${sw_package_id}`, {
    method: "DELETE",
  });
}

function App() {
  // State for all profiles
  const [profiles, setProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");
  const [profileEditIdx, setProfileEditIdx] = useState(null);
  const [editProfile, setEditProfile] = useState(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);

  // State for generation
  const [selectedProfileIdx, setSelectedProfileIdx] = useState(0);
  const [generationInput, setGenerationInput] = useState({ sw_version: "" });
  const [generatedJSON, setGeneratedJSON] = useState(null);

  // Load profiles from backend when the app starts
  useEffect(() => {
    fetchProfiles().then(setProfiles);
  }, []);

  // Profile helpers
  const startAddProfile = () => {
    setProfileEditIdx(null);
    setEditProfile(EMPTY_PROFILE());
  };
  const startEditProfile = idx => {
    setProfileEditIdx(idx);
    setEditProfile({
      ...profiles[idx],
      swad: [...profiles[idx].swad],
      swdd: [...profiles[idx].swdd],
      source_references: profiles[idx].source_references.map(sr => ({
        ...sr,
        additional_information: [...(sr.additional_information || [])]
      })),
      artifacts: [...profiles[idx].artifacts]
    });
  };
  const cancelEditProfile = () => {
    setEditProfile(null);
    setProfileEditIdx(null);
  };

  const saveProfile = async () => {
    if (!editProfile.sw_package_id) return alert("Profile must have SW Package ID!");
    let arr = [...profiles];
    if (profileEditIdx === null) {
      arr.push({ ...editProfile, sw_package_id: Number(editProfile.sw_package_id) });
      await addProfile({ ...editProfile, sw_package_id: Number(editProfile.sw_package_id) });
    } else {
      arr[profileEditIdx] = { ...editProfile, sw_package_id: Number(editProfile.sw_package_id) };
      await updateProfile({ ...editProfile, sw_package_id: Number(editProfile.sw_package_id) });
    }
    setProfiles(arr);
    setEditProfile(null);
    setProfileEditIdx(null);
    setSelectedProfileIdx(arr.length - 1);
  };

  const deleteProfile = async idx => {
    let arr = [...profiles];
    const sw_package_id = arr[idx].sw_package_id;
    arr.splice(idx, 1);
    await deleteProfileRequest(sw_package_id);
    setProfiles(arr);
    setConfirmDeleteIdx(null);
    setSelectedProfileIdx(0);
  };

  // JSON Generation helpers
  function fillVersionFields(obj, sw_version) {
    if (Array.isArray(obj)) {
      return obj.map(item => fillVersionFields(item, sw_version));
    } else if (obj && typeof obj === 'object') {
      const newObj = { ...obj };
      for (const key of Object.keys(newObj)) {
        if (key === "version" && (!newObj[key] || newObj[key] === "")) {
          newObj[key] = sw_version;
        } else {
          newObj[key] = fillVersionFields(newObj[key], sw_version);
        }
      }
      return newObj;
    }
    return obj;
  }

  const handleGenerate = () => {
    const sw_version = generationInput.sw_version;
    if (!sw_version) return;
    const sw_package_version = sw_version.split("_").pop() + ".0";
    const filledProfile = fillVersionFields(profiles[selectedProfileIdx], sw_version);
    // Remove profile_name from result
    const { profile_name, ...profileNoName } = filledProfile;
    setGeneratedJSON({
      ...profileNoName,
      sw_package_version,
      sw_version,
    });
  };

  // ----- UI -----
  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f6f6f6" }}>
      {/* Tabs */}
      <div style={{
        display: "flex", gap: 24, padding: 24, background: "#fff", borderBottom: "1px solid #eee"
      }}>
        <button
          style={{
            fontSize: 20, fontWeight: activeTab === "profile" ? "bold" : "normal",
            background: activeTab === "profile" ? "#eee" : "#fff",
            border: "none",
            borderBottom: activeTab === "profile" ? "2px solid #339" : "2px solid transparent",
            cursor: "pointer"
          }}
          onClick={() => setActiveTab("profile")}
        >Profile Management</button>
        <button
          style={{
            fontSize: 20, fontWeight: activeTab === "generate" ? "bold" : "normal",
            background: activeTab === "generate" ? "#eee" : "#fff",
            border: "none",
            borderBottom: activeTab === "generate" ? "2px solid #339" : "2px solid transparent",
            cursor: "pointer"
          }}
          onClick={() => setActiveTab("generate")}
        >Generate Package</button>
      </div>

      {/* ---- PROFILE MANAGEMENT TAB ---- */}
      {activeTab === "profile" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
          <h2>Profiles</h2>
          {!editProfile && (
            <>
              <button onClick={startAddProfile}>Add Profile</button>
              <table style={{ width: "100%", marginTop: 18, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "center" }}>ID</th>
                    <th style={{ textAlign: "center" }}>Name</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ textAlign: "center" }}>{p.sw_package_id}</td>
                      <td style={{ textAlign: "center" }}>{p.profile_name}</td>
                      <td style={{ textAlign: "center" }}>
                        <button onClick={() => startEditProfile(idx)}>Edit</button>
                        <button
                          style={{ marginLeft: 8, color: "red" }}
                          onClick={() => setConfirmDeleteIdx(idx)}
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {confirmDeleteIdx !== null && (
                <div style={{ marginTop: 16 }}>
                  <strong>Delete profile {profiles[confirmDeleteIdx].sw_package_id}?</strong>
                  <button style={{ marginLeft: 12 }} onClick={() => deleteProfile(confirmDeleteIdx)}>Yes</button>
                  <button style={{ marginLeft: 8 }} onClick={() => setConfirmDeleteIdx(null)}>No</button>
                </div>
              )}
            </>
          )}
          {editProfile && (
              <div style={{ marginTop: 18, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 0 8px #eee" }}>
                <h3>{profileEditIdx === null ? "Add New Profile" : "Edit Profile"}</h3>

                {/* -------- BASICS BLOCK -------- */}
                <div style={{
                  background: "#f3f7ff",
                  padding: 18,
                  borderRadius: 8,
                  marginBottom: 24,
                  border: "1px solid #e0e4ef"
                }}>
                  <h4 style={{ margin: 0, marginBottom: 12, color: "#274060" }}>Profile Basics</h4>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <input
                      value={editProfile.sw_package_id}
                      onChange={e => setEditProfile(p => ({ ...p, sw_package_id: e.target.value.replace(/\D/, "") }))}
                      style={{ width: 120, marginRight: 10 }}
                      disabled={profileEditIdx !== null}
                    />
                    <span style={{ color: "#555", fontSize: 13 }}>Unique SW Package ID (numeric)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <input
                      value={editProfile.profile_name}
                      onChange={e => setEditProfile(p => ({ ...p, profile_name: e.target.value }))}
                      style={{ width: 260, marginRight: 10 }}
                    />
                    <span style={{ color: "#555", fontSize: 13 }}>Profile Name (your label)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <input
                      value={editProfile.generic_product_module.location}
                      onChange={e =>
                        setEditProfile(p => ({
                          ...p, generic_product_module: { ...p.generic_product_module, location: e.target.value }
                        }))
                      }
                      style={{ width: 480, marginRight: 10 }}
                    />
                    <span style={{ color: "#555", fontSize: 13 }}>GPM Location (CarWeaver URL)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <input
                      value={editProfile.generic_product_module.id}
                      onChange={e =>
                        setEditProfile(p => ({
                          ...p, generic_product_module: { ...p.generic_product_module, id: e.target.value }
                        }))
                      }
                      style={{ width: 120, marginRight: 10 }}
                    />
                    <span style={{ color: "#555", fontSize: 13 }}>GPM ID (from SystemWeaver)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <input
                      value={editProfile.generic_product_module.version}
                      onChange={e =>
                        setEditProfile(p => ({
                          ...p, generic_product_module: { ...p.generic_product_module, version: e.target.value }
                        }))
                      }
                      style={{ width: 80, marginRight: 10 }}
                    />
                    <span style={{ color: "#555", fontSize: 13 }}>GPM Version (from SystemWeaver)</span>
                  </div>
                </div>

                {/* -------- SOURCE REFERENCES -------- */}
                <div style={{
                  background: "#f9f6ef",
                  padding: 18,
                  borderRadius: 8,
                  marginBottom: 24,
                  border: "1px solid #eee"
                }}>
                  <h4 style={{ margin: 0, marginBottom: 12, color: "#755610" }}>Source References</h4>
                  {editProfile.source_references.map((ref, idx) => (
                    <div key={idx} style={{ border: "1px solid #ddd", margin: 8, padding: 10, borderRadius: 8, background: "#fff", position: "relative" }}>
                      {/* Remove Source Reference button */}
                      <button
                        type="button"
                        style={{
                          position: "absolute", top: 10, right: 10, color: "red",
                          background: "transparent", border: "none", fontWeight: "bold"
                        }}
                        onClick={() => {
                          const refs = [...editProfile.source_references];
                          refs.splice(idx, 1);
                          setEditProfile(p => ({ ...p, source_references: refs }));
                        }}
                        title="Remove this Source Reference"
                      >Remove Source</button>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                        <input
                          value={ref.name}
                          onChange={e => {
                            const arr = [...editProfile.source_references];
                            arr[idx].name = e.target.value;
                            setEditProfile(p => ({ ...p, source_references: arr }));
                          }}
                          style={{ width: 280, marginRight: 10 }}
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>Source Name (from SystemWeaver)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                        <textarea
                          value={ref.location}
                          onChange={e => {
                            const arr = [...editProfile.source_references];
                            arr[idx].location = e.target.value;
                            setEditProfile(p => ({ ...p, source_references: arr }));
                          }}
                          style={{ width: 600, minHeight: 45, marginRight: 10, resize: "vertical" }}
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>Gerrit Link</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                        <input
                          value={ref.version}
                          readOnly
                          style={{ background: "#eee", width: 180, marginRight: 10 }}
                          placeholder="Will be filled at generation"
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>Version (from SW input at generation)</span>
                      </div>
                      {/* Additional Information (each field on its own line) */}
                      <div style={{ marginTop: 12, marginBottom: 10 }}>
                        <strong>Additional Information</strong>
                        {ref.additional_information && ref.additional_information.map((info, infoIdx) => (
                          <div key={infoIdx} style={{ background: "#f4f8fc", borderRadius: 6, marginBottom: 12, padding: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                              <input placeholder="Title" value={info.title}
                                onChange={e => {
                                  const refs = [...editProfile.source_references];
                                  refs[idx].additional_information[infoIdx].title = e.target.value;
                                  setEditProfile(p => ({ ...p, source_references: refs }));
                                }} style={{ width: 180, marginRight: 8 }} />
                              <span style={{ color: "#888", fontSize: 13 }}>Title</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                              <input placeholder="Category" value={info.category}
                                onChange={e => {
                                  const refs = [...editProfile.source_references];
                                  refs[idx].additional_information[infoIdx].category = e.target.value;
                                  setEditProfile(p => ({ ...p, source_references: refs }));
                                }} style={{ width: 120, marginRight: 8 }} />
                              <span style={{ color: "#888", fontSize: 13 }}>Category</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                              <select value={info.kind}
                                onChange={e => {
                                  const refs = [...editProfile.source_references];
                                  refs[idx].additional_information[infoIdx].kind = e.target.value;
                                  setEditProfile(p => ({ ...p, source_references: refs }));
                                }} style={{ width: 140, marginRight: 8 }}>
                                <option value="Simulink">Simulink</option>
                                <option value="Generated Code">Generated Code</option>
                              </select>
                              <span style={{ color: "#888", fontSize: 13 }}>Kind</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                              <select value={info.content_type}
                                onChange={e => {
                                  const refs = [...editProfile.source_references];
                                  refs[idx].additional_information[infoIdx].content_type = e.target.value;
                                  setEditProfile(p => ({ ...p, source_references: refs }));
                                }} style={{ width: 180, marginRight: 8 }}>
                                <option value="application/model">application/model</option>
                                <option value="application/source code">application/source code</option>
                              </select>
                              <span style={{ color: "#888", fontSize: 13 }}>Content Type</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                              <textarea
                                  placeholder="Location"
                                  value={info.location}
                                  onChange={e => {
                                    const refs = [...editProfile.source_references];
                                    refs[idx].additional_information[infoIdx].location = e.target.value;
                                    setEditProfile(p => ({ ...p, source_references: refs }));
                                  }}
                                  style={{ width: 600, minHeight: 40, marginRight: 8, resize: "vertical" }}
                                />
                              <span style={{ color: "#888", fontSize: 13 }}>Location (link to model or code)</span>
                            </div>
                            <button type="button" style={{ color: "red", border: "none", background: "transparent", fontWeight: "bold" }}
                              onClick={() => {
                                const refs = [...editProfile.source_references];
                                refs[idx].additional_information.splice(infoIdx, 1);
                                setEditProfile(p => ({ ...p, source_references: refs }));
                              }}>Remove</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const refs = [...editProfile.source_references];
                          refs[idx].additional_information = refs[idx].additional_information || [];
                          refs[idx].additional_information.push({
                            title: "", category: DEFAULT_CATEGORY, kind: DEFAULT_KIND, content_type: DEFAULT_CONTENT_TYPE, location: ""
                          });
                          setEditProfile(p => ({ ...p, source_references: refs }));
                        }}>Add Additional Information</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setEditProfile(p => ({
                    ...p,
                    source_references: [...p.source_references, {
                      idx: (p.source_references?.length || 0) + 1,
                      name: "",
                      version: "",
                      location: "",
                      components: [],
                      additional_information: [],
                      regulatory_requirements: [DEFAULT_REG_REQ],
                      change_log: { filenamn: DEFAULT_FILENAMN, version: "", location: "" }
                    }]
                  }))}>Add Source Reference</button>
                </div>


                {/* -------- SWAD -------- */}
                <div style={{
                  background: "#f2fcf6",
                  padding: 18,
                  borderRadius: 8,
                  marginBottom: 24,
                  border: "1px solid #bdf6cd"
                }}>
                  <h4 style={{ margin: 0, marginBottom: 12, color: "#277044" }}>SWAD</h4>
                  {editProfile.swad.map((sw, idx) => (
                    <div key={idx} style={{ background: "#e8fff4", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                        <input placeholder="id" value={sw.id}
                          onChange={e => {
                            const arr = [...editProfile.swad];
                            arr[idx].id = e.target.value;
                            setEditProfile(p => ({ ...p, swad: arr }));
                          }}
                          style={{ width: 120, marginRight: 8 }}
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>Manual ID for SWAD</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                        <input placeholder="name" value={sw.name}
                          onChange={e => {
                            const arr = [...editProfile.swad];
                            arr[idx].name = e.target.value;
                            setEditProfile(p => ({ ...p, swad: arr }));
                          }}
                          style={{ width: 200, marginRight: 8 }}
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>SWAD Name</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                        <textarea
                          placeholder="location"
                          value={sw.location}
                          onChange={e => {
                            const arr = [...editProfile.swad];
                            arr[idx].location = e.target.value;
                            setEditProfile(p => ({ ...p, swad: arr }));
                          }}
                          style={{ width: 600, minHeight: 40, marginRight: 8, resize: "vertical" }}
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>SWAD Documentation/Link</span>
                        <button
                          type="button"
                          style={{ color: "red", marginLeft: 12 }}
                          onClick={() => {
                            const arr = [...editProfile.swad];
                            arr.splice(idx, 1);
                            setEditProfile(p => ({ ...p, swad: arr }));
                          }}
                        >Remove</button>
                      </div>
                    </div>
                  ))}
                  <button style={{ marginTop: 4 }} onClick={() => setEditProfile(p => ({ ...p, swad: [...p.swad, { id: "", name: "", location: "" }] }))}>Add SWAD</button>
                </div>

                {/* -------- SWDD -------- */}
                <div style={{
                  background: "#f7f8fc",
                  padding: 18,
                  borderRadius: 8,
                  marginBottom: 24,
                  border: "1px solid #dbe3f8"
                }}>
                  <h4 style={{ margin: 0, marginBottom: 12, color: "#3b4a6b" }}>SWDD</h4>
                  {editProfile.swdd.map((sw, idx) => (
                    <div key={idx} style={{ background: "#eaeefe", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                        <input placeholder="id" value={sw.id}
                          onChange={e => {
                            const arr = [...editProfile.swdd];
                            arr[idx].id = e.target.value;
                            setEditProfile(p => ({ ...p, swdd: arr }));
                          }}
                          style={{ width: 120, marginRight: 8 }}
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>Manual ID for SWDD</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                        <input placeholder="name" value={sw.name}
                          onChange={e => {
                            const arr = [...editProfile.swdd];
                            arr[idx].name = e.target.value;
                            setEditProfile(p => ({ ...p, swdd: arr }));
                          }}
                          style={{ width: 200, marginRight: 8 }}
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>SWDD Name</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                        <textarea
                          placeholder="location"
                          value={sw.location}
                          onChange={e => {
                            const arr = [...editProfile.swdd];
                            arr[idx].location = e.target.value;
                            setEditProfile(p => ({ ...p, swdd: arr }));
                          }}
                          style={{ width: 600, minHeight: 40, marginRight: 8, resize: "vertical" }}
                        />
                        <span style={{ color: "#555", fontSize: 13 }}>SWDD Documentation/Link</span>
                        <button
                          type="button"
                          style={{ color: "red", marginLeft: 12 }}
                          onClick={() => {
                            const arr = [...editProfile.swdd];
                            arr.splice(idx, 1);
                            setEditProfile(p => ({ ...p, swdd: arr }));
                          }}
                        >Remove</button>
                      </div>
                    </div>
                  ))}
                  <button style={{ marginTop: 4 }} onClick={() => setEditProfile(p => ({ ...p, swdd: [...p.swdd, { id: "", name: "", location: "" }] }))}>Add SWDD</button>
                </div>

                {/* -------- ARTIFACTS -------- */}
                <div style={{
                  background: "#fef7fa",
                  padding: 18,
                  borderRadius: 8,
                  marginBottom: 16,
                  border: "1px solid #eed3e4"
                }}>
                  <h4 style={{ margin: 0, marginBottom: 12, color: "#7d3557" }}>Artifacts</h4>
                  {editProfile.artifacts.map((art, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #bbb",
                        margin: 5,
                        padding: 10,
                        borderRadius: 8,
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        position: "relative"
                      }}
                    >
                      {/* Remove Artifact Button */}
                      <button
                        type="button"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          color: "red",
                          background: "transparent",
                          border: "none",
                          fontWeight: "bold"
                        }}
                        onClick={() => {
                          const arr = [...editProfile.artifacts];
                          arr.splice(idx, 1);
                          setEditProfile(p => ({ ...p, artifacts: arr }));
                        }}
                        title="Remove this Artifact"
                      >
                        Remove
                      </button>
                      <label>Name:</label>
                      <select
                        value={art.name}
                        onChange={e => {
                          const arr = [...editProfile.artifacts];
                          arr[idx].name = e.target.value;
                          setEditProfile(p => ({ ...p, artifacts: arr }));
                        }}
                        style={{ marginLeft: 6, width: 120 }}
                      >
                        <option value="">Select</option>
                        <option value="SUM SWLM">SUM SWLM</option>
                        <option value="SUM SWP1">SUM SWP1</option>
                        <option value="SUM SWP2">SUM SWP2</option>
                        <option value="SUM SWP3">SUM SWP3</option>
                        <option value="SUM SWP4">SUM SWP4</option>
                      </select>
                      <span style={{ color: "#555", fontSize: 13, marginLeft: 10, marginRight: 10 }}>Artifact name</span>
                      <label>Version:</label>
                      <input
                        value={art.version}
                        readOnly
                        style={{ background: "#eee", width: 140, marginLeft: 6, marginRight: 10 }}
                        placeholder="Will be filled at generation"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditProfile(p => ({
                        ...p,
                        artifacts: [
                          ...p.artifacts,
                          {
                            idx: (p.artifacts?.length || 0) + 1,
                            name: "",
                            kind: "VBF file",
                            version: "",
                            location: "",
                            sha256: "",
                            target_platform: DEFAULT_TARGET_PLATFORM,
                            buildtime_configurations: [{ cp: DEFAULT_CP, cpv: [DEFAULT_CPV] }],
                            source_references_idx: []
                          }
                        ]
                      }))
                    }
                  >
                    Add Artifact
                  </button>
                </div>

                {/* ---- SAVE / CANCEL ---- */}
                <div style={{ marginTop: 16 }}>
                  <button onClick={saveProfile}>Save Profile</button>
                  <button style={{ marginLeft: 12 }} onClick={cancelEditProfile}>Cancel</button>
                </div>

                {/* --- Preview panel as before --- */}
<div
  style={{
    background: "#222",
    color: "#d7ffb8",
    borderRadius: 8,
    marginTop: 16,
    width: "100%",
    maxWidth: 800,        // set to whatever fits your page
    minWidth: 320,
    boxSizing: "border-box",
  }}
>
  <h4 style={{ color: "#fff", padding: "18px 18px 0 18px", margin: 0 }}>
    Profile Preview
  </h4>
  <pre
    style={{
      margin: 0,
      padding: 18,
      background: "#222",
      borderRadius: "0 0 8px 8px",
      width: "100%",
      color: "#d7ffb8",
      fontSize: 13,
      whiteSpace: "pre-wrap",   // Wrap lines
      wordBreak: "break-all",   // Break long URLs/words
      boxSizing: "border-box",
      overflow: "visible",      // Allow to grow with content, no scroll
    }}
  >
    {JSON.stringify(editProfile, null, 2)}
  </pre>
</div>



              </div>
            )}
        </div>
      )}

      {/* ---- GENERATION TAB ---- */}
      {activeTab === "generate" && (
        <div style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: 32,
          display: "flex",
          gap: 32
        }}>
          <div style={{ flex: 1 }}>
            <h2>Generate SW Package JSON</h2>
            <label style={{ fontWeight: "bold" }}>Select Profile: </label>
            <select
              value={selectedProfileIdx}
              onChange={e => setSelectedProfileIdx(Number(e.target.value))}
              style={{ fontSize: 16, marginLeft: 8 }}
            >
              {profiles.map((p, idx) => (
                <option key={p.sw_package_id} value={idx}>
                  SW Package {p.sw_package_id} ({p.profile_name})
                </option>
              ))}
            </select>
            <div style={{ marginTop: 18 }}>
              <label>SW Version (e.g. BSW_VCC_20.0.1): </label>
              <input
                value={generationInput.sw_version}
                onChange={e =>
                  setGenerationInput({ ...generationInput, sw_version: e.target.value })
                }
                style={{ width: 200, marginLeft: 8 }}
              />
              <button
                style={{ marginLeft: 16, padding: "4px 16px" }}
                onClick={handleGenerate}
              >
                Generate JSON
              </button>
            </div>
          </div>
          <div style={{
            width: 420,
            minWidth: 320,
            background: "#222",
            color: "#d7ffb8",
            borderRadius: 8,
            padding: 24,
            fontSize: 14,
            height: 500,
            overflowY: "auto"
          }}>
            <h4 style={{ color: "#fff" }}>Generated JSON</h4>
            <pre>{JSON.stringify(generatedJSON, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
