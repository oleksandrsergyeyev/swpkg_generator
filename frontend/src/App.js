import React, { useState, useEffect } from "react";

// Adjust if your FastAPI backend runs elsewhere
const API_URL = "http://localhost:8000/api";

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
  swad: [], // no default entry
  swdd: [],
  generic_product_module: { location: "", id: "", version: "" },
  source_references: [],
  artifacts: [],
});

function App() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [profileEditIdx, setProfileEditIdx] = useState(null);
  const [editProfile, setEditProfile] = useState(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);
  const [selectedProfileIdx, setSelectedProfileIdx] = useState(0);
  const [generationInput, setGenerationInput] = useState({ sw_version: "" });
  const [generatedJSON, setGeneratedJSON] = useState(null);

  // -- API functions --
  async function fetchProfiles() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/profiles`);
      setProfiles(await res.json());
    } finally {
      setLoading(false);
    }
  }
  async function addProfile(profile) {
    const res = await fetch(`${API_URL}/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error(await res.text());
    await fetchProfiles();
  }
  async function updateProfile(profile) {
    const res = await fetch(`${API_URL}/profiles/${profile.sw_package_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error(await res.text());
    await fetchProfiles();
  }
  async function deleteProfileById(sw_package_id) {
    const res = await fetch(`${API_URL}/profiles/${sw_package_id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    await fetchProfiles();
  }

  // -- Load profiles from backend on mount --
  useEffect(() => { fetchProfiles(); }, []);

  // Profile helpers
  const startAddProfile = () => {
    setProfileEditIdx(null);
    setEditProfile(EMPTY_PROFILE());
  };
  const startEditProfile = idx => {
    setProfileEditIdx(idx);
    setEditProfile(JSON.parse(JSON.stringify(profiles[idx])));
  };
  const cancelEditProfile = () => {
    setEditProfile(null);
    setProfileEditIdx(null);
  };
  const saveProfile = async () => {
    if (!editProfile.sw_package_id) return alert("Profile must have SW Package ID!");
    try {
      if (profileEditIdx === null) {
        await addProfile({ ...editProfile, sw_package_id: Number(editProfile.sw_package_id) });
      } else {
        await updateProfile({ ...editProfile, sw_package_id: Number(editProfile.sw_package_id) });
      }
      setEditProfile(null);
      setProfileEditIdx(null);
      setSelectedProfileIdx(0);
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };
  const deleteProfile = async idx => {
    try {
      await deleteProfileById(profiles[idx].sw_package_id);
      setConfirmDeleteIdx(null);
      setSelectedProfileIdx(0);
    } catch (err) {
      alert("Error deleting: " + err.message);
    }
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
    const profile = profiles[selectedProfileIdx];
    const filledProfile = fillVersionFields(profile, sw_version);
    setGeneratedJSON({
      ...filledProfile,
      sw_package_version,
      sw_version,
    });
  };

  // --- UI ---
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

      {/* PROFILE MANAGEMENT TAB */}
      {activeTab === "profile" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
          <h2>Profiles</h2>
          {loading && <div>Loading...</div>}
          {!editProfile && !loading && (
            <>
              <button onClick={startAddProfile}>Add Profile</button>
              <table style={{ width: "100%", marginTop: 18, borderCollapse: "collapse" }}>
                <thead><tr>
                  <th>ID</th><th>GPM Location</th><th>SWAD count</th><th>SWDD count</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {profiles.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                      <td>{p.sw_package_id}</td>
                      <td>{p.generic_product_module.location}</td>
                      <td>{p.swad.length}</td>
                      <td>{p.swdd.length}</td>
                      <td>
                        <button onClick={() => startEditProfile(idx)}>Edit</button>
                        <button style={{ marginLeft: 8, color: "red" }} onClick={() => setConfirmDeleteIdx(idx)}>Delete</button>
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
              <div>
                <label>SW Package ID: </label>
                <input
                  value={editProfile.sw_package_id}
                  onChange={e => setEditProfile(p => ({ ...p, sw_package_id: e.target.value.replace(/\D/, "") }))}
                  style={{ width: 80 }}
                  disabled={profileEditIdx !== null}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <label>Generic Product Module Location: </label>
                <input
                  value={editProfile.generic_product_module.location}
                  onChange={e =>
                    setEditProfile(p => ({
                      ...p, generic_product_module: { ...p.generic_product_module, location: e.target.value }
                    }))
                  }
                  style={{ width: 320 }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <label>GPM id: </label>
                <input
                  value={editProfile.generic_product_module.id}
                  onChange={e =>
                    setEditProfile(p => ({
                      ...p, generic_product_module: { ...p.generic_product_module, id: e.target.value }
                    }))
                  }
                  style={{ width: 120 }}
                />
                <label style={{ marginLeft: 16 }}>GPM version: </label>
                <input
                  value={editProfile.generic_product_module.version}
                  onChange={e =>
                    setEditProfile(p => ({
                      ...p, generic_product_module: { ...p.generic_product_module, version: e.target.value }
                    }))
                  }
                  style={{ width: 60 }}
                />
              </div>

              {/* -------- SOURCE REFERENCES FIRST -------- */}
              <div style={{ marginTop: 18 }}>
                <h4>Source References</h4>
                {editProfile.source_references.map((ref, idx) => (
                  <div key={idx} style={{ border: "1px solid #ddd", margin: 8, padding: 10, borderRadius: 8 }}>
                    <div>
                      <label>Name:</label>
                      <input value={ref.name}
                        onChange={e => {
                          const arr = [...editProfile.source_references];
                          arr[idx].name = e.target.value;
                          setEditProfile(p => ({ ...p, source_references: arr }));
                        }} />
                    </div>
                    <div>
                      <label>Location:</label>
                      <input value={ref.location}
                        onChange={e => {
                          const arr = [...editProfile.source_references];
                          arr[idx].location = e.target.value;
                          setEditProfile(p => ({ ...p, source_references: arr }));
                        }} />
                    </div>
                    <div>
                      <label>Version:</label>
                      <input value={ref.version} readOnly style={{ background: "#eee" }} placeholder="Will be filled at generation" />
                    </div>
                    {/* Additional Information */}
                    <div>
                      <strong>Additional Information</strong>
                      {ref.additional_information && ref.additional_information.map((info, infoIdx) => (
                        <div key={infoIdx} style={{ marginBottom: 8, padding: 4, background: "#f4f8fc", borderRadius: 6 }}>
                          <input placeholder="Title" value={info.title}
                            onChange={e => {
                              const refs = [...editProfile.source_references];
                              refs[idx].additional_information[infoIdx].title = e.target.value;
                              setEditProfile(p => ({ ...p, source_references: refs }));
                            }} style={{ marginRight: 6 }} />
                          <input placeholder="Category" value={info.category}
                            onChange={e => {
                              const refs = [...editProfile.source_references];
                              refs[idx].additional_information[infoIdx].category = e.target.value;
                              setEditProfile(p => ({ ...p, source_references: refs }));
                            }} style={{ width: 100, marginRight: 6 }} />
                          <select value={info.kind}
                            onChange={e => {
                              const refs = [...editProfile.source_references];
                              refs[idx].additional_information[infoIdx].kind = e.target.value;
                              setEditProfile(p => ({ ...p, source_references: refs }));
                            }} style={{ marginRight: 6 }}>
                            <option value="Simulink">Simulink</option>
                            <option value="Generated Code">Generated Code</option>
                          </select>
                          <select value={info.content_type}
                            onChange={e => {
                              const refs = [...editProfile.source_references];
                              refs[idx].additional_information[infoIdx].content_type = e.target.value;
                              setEditProfile(p => ({ ...p, source_references: refs }));
                            }} style={{ marginRight: 6 }}>
                            <option value="application/model">application/model</option>
                            <option value="application/source code">application/source code</option>
                          </select>
                          <input placeholder="Location" value={info.location}
                            onChange={e => {
                              const refs = [...editProfile.source_references];
                              refs[idx].additional_information[infoIdx].location = e.target.value;
                              setEditProfile(p => ({ ...p, source_references: refs }));
                            }} style={{ width: 180, marginRight: 6 }} />
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
              <div style={{ marginTop: 18 }}>
                <h4>SWAD</h4>
                {editProfile.swad.length === 0 && <div style={{ color: "#999" }}>No SWAD entries</div>}
                {editProfile.swad.map((sw, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center" }}>
                    <input placeholder="id" value={sw.id}
                      onChange={e => {
                        const arr = [...editProfile.swad];
                        arr[idx].id = e.target.value;
                        setEditProfile(p => ({ ...p, swad: arr }));
                      }}
                    />
                    <input placeholder="name" value={sw.name}
                      onChange={e => {
                        const arr = [...editProfile.swad];
                        arr[idx].name = e.target.value;
                        setEditProfile(p => ({ ...p, swad: arr }));
                      }}
                    />
                    <input placeholder="location" value={sw.location}
                      onChange={e => {
                        const arr = [...editProfile.swad];
                        arr[idx].location = e.target.value;
                        setEditProfile(p => ({ ...p, swad: arr }));
                      }}
                    />
                    <button style={{ marginLeft: 8, color: "red" }}
                      onClick={() => setEditProfile(p => ({
                        ...p,
                        swad: p.swad.filter((_, i) => i !== idx)
                      }))}
                    >Remove</button>
                  </div>
                ))}
                <button style={{ marginTop: 4 }} onClick={() => setEditProfile(p => ({ ...p, swad: [...p.swad, { id: "", name: "", location: "" }] }))}>Add SWAD</button>
              </div>
              {/* -------- SWDD -------- */}
              <div style={{ marginTop: 18 }}>
                <h4>SWDD</h4>
                {editProfile.swdd.length === 0 && <div style={{ color: "#999" }}>No SWDD entries</div>}
                {editProfile.swdd.map((sw, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center" }}>
                    <input placeholder="id" value={sw.id}
                      onChange={e => {
                        const arr = [...editProfile.swdd];
                        arr[idx].id = e.target.value;
                        setEditProfile(p => ({ ...p, swdd: arr }));
                      }}
                    />
                    <input placeholder="name" value={sw.name}
                      onChange={e => {
                        const arr = [...editProfile.swdd];
                        arr[idx].name = e.target.value;
                        setEditProfile(p => ({ ...p, swdd: arr }));
                      }}
                    />
                    <input placeholder="location" value={sw.location}
                      onChange={e => {
                        const arr = [...editProfile.swdd];
                        arr[idx].location = e.target.value;
                        setEditProfile(p => ({ ...p, swdd: arr }));
                      }}
                    />
                    <button style={{ marginLeft: 8, color: "red" }}
                      onClick={() => setEditProfile(p => ({
                        ...p,
                        swdd: p.swdd.filter((_, i) => i !== idx)
                      }))}
                    >Remove</button>
                  </div>
                ))}
                <button style={{ marginTop: 4 }} onClick={() => setEditProfile(p => ({ ...p, swdd: [...p.swdd, { id: "", name: "", location: "" }] }))}>Add SWDD</button>
              </div>
              {/* -------- ARTIFACTS -------- */}
              <div style={{ marginTop: 18 }}>
                <h4>Artifacts</h4>
                {editProfile.artifacts.map((art, idx) => (
                  <div key={idx} style={{ border: "1px solid #bbb", margin: 5, padding: 10, borderRadius: 8 }}>
                    <label>Name:</label>
                    <select
                      value={art.name}
                      onChange={e => {
                        const arr = [...editProfile.artifacts];
                        arr[idx].name = e.target.value;
                        setEditProfile(p => ({ ...p, artifacts: arr }));
                      }}
                    >
                      <option value="">Select</option>
                      <option value="SUM SWLM">SUM SWLM</option>
                      <option value="SUM SWP1">SUM SWP1</option>
                      <option value="SUM SWP2">SUM SWP2</option>
                      <option value="SUM SWP3">SUM SWP3</option>
                      <option value="SUM SWP4">SUM SWP4</option>
                    </select>
                    <label style={{ marginLeft: 8 }}>Version:</label>
                    <input
                      value={art.version}
                      readOnly
                      style={{ background: "#eee" }}
                      placeholder="Will be filled at generation"
                    />
                  </div>
                ))}
                <button onClick={() => setEditProfile(p => ({
                  ...p,
                  artifacts: [...p.artifacts, {
                    idx: (p.artifacts?.length || 0) + 1,
                    name: "",
                    kind: "VBF file",
                    version: "",
                    location: "",
                    sha256: "",
                    target_platform: DEFAULT_TARGET_PLATFORM,
                    buildtime_configurations: [{ cp: DEFAULT_CP, cpv: [DEFAULT_CPV] }],
                    source_references_idx: []
                  }]
                }))}>Add Artifact</button>
              </div>
              <div style={{ marginTop: 16 }}>
                <button onClick={saveProfile}>Save Profile</button>
                <button style={{ marginLeft: 12 }} onClick={cancelEditProfile}>Cancel</button>
              </div>
              <div style={{
                width: 420,
                minWidth: 320,
                background: "#222",
                color: "#d7ffb8",
                borderRadius: 8,
                padding: 18,
                fontSize: 13,
                marginTop: 16
              }}>
                <h4 style={{ color: "#fff" }}>Profile Preview</h4>
                <pre>{JSON.stringify(editProfile, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GENERATION TAB */}
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
                  SW Package {p.sw_package_id}
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
