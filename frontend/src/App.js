import React, { useState } from "react";

// Dummy initial profiles (simulate loading from backend)
const INITIAL_PROFILES = [
  {
    sw_package_id: 175,
    swad: [{ id: "", name: "", location: "" }],
    swdd: [{ id: "", name: "", location: "" }],
    generic_product_module: { location: "", id: "", version: "" },
    source_references: [],
    artifacts: [],
  },
  {
    sw_package_id: 201,
    swad: [{ id: "", name: "", location: "" }],
    swdd: [{ id: "", name: "", location: "" }],
    generic_product_module: { location: "", id: "", version: "" },
    source_references: [],
    artifacts: [],
  }
];

const DEFAULT_CATEGORY = "design";
const DEFAULT_KIND = "Simulink";
const DEFAULT_CONTENT_TYPE = "application/model";
const DEFAULT_REG_REQ = "N/A";
const DEFAULT_FILENAMN = "Gerrit log";
const DEFAULT_TARGET_PLATFORM = "SUM1";
const DEFAULT_CP = "VCTN";
const DEFAULT_CPV = "PRR";

function App() {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" or "generate"
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0].sw_package_id);

  // Find the selected profile for editing
  const selectedProfile = profiles.find(p => p.sw_package_id === selectedProfileId);

  // Profile field update helpers
  const updateProfile = updated => {
    setProfiles(ps => ps.map(
      p => p.sw_package_id === selectedProfileId ? { ...p, ...updated } : p
    ));
  };

  // Add Source Reference
  const addSourceReference = () => {
    updateProfile({
      source_references: [
        ...(selectedProfile.source_references || []),
        {
          idx: (selectedProfile.source_references?.length || 0) + 1,
          name: "",
          version: "", // Per-run, filled at generation
          location: "",
          components: [],
          additional_information: [],
          regulatory_requirements: [DEFAULT_REG_REQ],
          change_log: { filenamn: DEFAULT_FILENAMN, version: "", location: "" }
        }
      ]
    });
  };

  // Add Artifact
  const addArtifact = () => {
    updateProfile({
      artifacts: [
        ...(selectedProfile.artifacts || []),
        {
          idx: (selectedProfile.artifacts?.length || 0) + 1,
          name: "",
          kind: "VBF file",
          version: "", // Per-run, filled at generation
          location: "",
          sha256: "",
          target_platform: DEFAULT_TARGET_PLATFORM,
          buildtime_configurations: [{ cp: DEFAULT_CP, cpv: [DEFAULT_CPV] }],
          source_references_idx: []
        }
      ]
    });
  };

  // --- JSON GENERATION PAGE ---
  const [generationInput, setGenerationInput] = useState({ sw_version: "" });
  const [generatedJSON, setGeneratedJSON] = useState(null);

  // Fill all empty "version" fields recursively
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
    const sw_package_version = sw_version.split("_").pop() + ".0";
    // Fill any empty version field
    const filledProfile = fillVersionFields(selectedProfile, sw_version);

    setGeneratedJSON({
      ...filledProfile,
      sw_package_version,
      sw_version,
    });
  };

  // UI
  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f6f6f6" }}>
      {/* Tabs */}
      <div style={{
        display: "flex", gap: 24, padding: 24, background: "#fff", borderBottom: "1px solid #eee"
      }}>
        <button
          style={{
            fontSize: 20,
            fontWeight: activeTab === "profile" ? "bold" : "normal",
            background: activeTab === "profile" ? "#eee" : "#fff",
            border: "none",
            borderBottom: activeTab === "profile" ? "2px solid #339" : "2px solid transparent",
            cursor: "pointer"
          }}
          onClick={() => setActiveTab("profile")}
        >
          Profile Configuration
        </button>
        <button
          style={{
            fontSize: 20,
            fontWeight: activeTab === "generate" ? "bold" : "normal",
            background: activeTab === "generate" ? "#eee" : "#fff",
            border: "none",
            borderBottom: activeTab === "generate" ? "2px solid #339" : "2px solid transparent",
            cursor: "pointer"
          }}
          onClick={() => setActiveTab("generate")}
        >
          JSON Generation
        </button>
      </div>

      {/* Main Content */}
      {activeTab === "profile" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32, display: "flex", gap: 32 }}>
          <div style={{ flex: 1, minWidth: 420 }}>
            <h2>Profile Configuration</h2>
            <label style={{ fontWeight: "bold" }}>Select Software Package: </label>
            <select
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(Number(e.target.value))}
              style={{ fontSize: 16, marginLeft: 8 }}
            >
              {profiles.map(p => (
                <option key={p.sw_package_id} value={p.sw_package_id}>
                  SW Package {p.sw_package_id}
                </option>
              ))}
            </select>
            <hr />
            {/* --- FULL PROFILE FORM GOES HERE --- */}
            <div>
              <h3>Generic Product Module</h3>
              <input
                placeholder="Location"
                value={selectedProfile.generic_product_module.location}
                onChange={e =>
                  updateProfile({
                    generic_product_module: {
                      ...selectedProfile.generic_product_module,
                      location: e.target.value
                    }
                  })
                }
                style={{ width: 350 }}
              />
              {/* Add id/version and fetch logic as needed */}
            </div>
            <hr />
            <h3>Source References</h3>
            {selectedProfile.source_references.map((ref, idx) => (
              <div key={idx} style={{ border: "1px solid #ddd", padding: 10, margin: 10, borderRadius: 8 }}>
                <div>
                  <label>Gerrit link (location): </label>
                  <input
                    value={ref.location}
                    onChange={e => {
                      const arr = [...selectedProfile.source_references];
                      arr[idx].location = e.target.value;
                      updateProfile({ source_references: arr });
                    }}
                  />
                </div>
                <div>
                  <label>Name:</label>
                  <input
                    value={ref.name}
                    onChange={e => {
                      const arr = [...selectedProfile.source_references];
                      arr[idx].name = e.target.value;
                      updateProfile({ source_references: arr });
                    }}
                  />
                </div>
                <div>
                  <label>Version:</label>
                  <input
                    value={ref.version}
                    readOnly
                    style={{ background: "#eee" }}
                    placeholder="Will be filled at generation"
                  />
                </div>
                {/* --- Additional Information --- */}
                <h4>Additional Information</h4>
                {ref.additional_information && ref.additional_information.map((info, infoIdx) => (
                  <div key={infoIdx} style={{ marginBottom: 10, padding: 6, background: "#f4f8fc", borderRadius: 6 }}>
                    <input
                      placeholder="Title"
                      value={info.title}
                      style={{ marginRight: 8 }}
                      onChange={e => {
                        const refs = [...selectedProfile.source_references];
                        refs[idx].additional_information[infoIdx].title = e.target.value;
                        updateProfile({ source_references: refs });
                      }}
                    />
                    <input
                      placeholder="Category"
                      value={info.category}
                      style={{ width: 100, marginRight: 8 }}
                      onChange={e => {
                        const refs = [...selectedProfile.source_references];
                        refs[idx].additional_information[infoIdx].category = e.target.value;
                        updateProfile({ source_references: refs });
                      }}
                    />
                    <select
                      value={info.kind}
                      style={{ marginRight: 8 }}
                      onChange={e => {
                        const refs = [...selectedProfile.source_references];
                        refs[idx].additional_information[infoIdx].kind = e.target.value;
                        updateProfile({ source_references: refs });
                      }}
                    >
                      <option value="Simulink">Simulink</option>
                      <option value="Generated Code">Generated Code</option>
                    </select>
                    <select
                      value={info.content_type}
                      style={{ marginRight: 8 }}
                      onChange={e => {
                        const refs = [...selectedProfile.source_references];
                        refs[idx].additional_information[infoIdx].content_type = e.target.value;
                        updateProfile({ source_references: refs });
                      }}
                    >
                      <option value="application/model">application/model</option>
                      <option value="application/source code">application/source code</option>
                    </select>
                    <input
                      placeholder="Location"
                      value={info.location}
                      style={{ width: 220, marginRight: 8 }}
                      onChange={e => {
                        const refs = [...selectedProfile.source_references];
                        refs[idx].additional_information[infoIdx].location = e.target.value;
                        updateProfile({ source_references: refs });
                      }}
                    />
                    <button
                      type="button"
                      style={{ color: "red", border: "none", background: "transparent", fontWeight: "bold" }}
                      onClick={() => {
                        const refs = [...selectedProfile.source_references];
                        refs[idx].additional_information.splice(infoIdx, 1);
                        updateProfile({ source_references: refs });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const refs = [...selectedProfile.source_references];
                    refs[idx].additional_information = refs[idx].additional_information || [];
                    refs[idx].additional_information.push({
                      title: "",
                      category: "",
                      kind: "Simulink",
                      content_type: "application/model",
                      location: ""
                    });
                    updateProfile({ source_references: refs });
                  }}
                >
                  Add Additional Information
                </button>
              </div>
            ))}
            <button onClick={addSourceReference}>Add Source Reference</button>
            <hr />
            <h3>SWAD</h3>
            {selectedProfile.swad.map((sw, idx) => (
              <div key={idx}>
                <input
                  placeholder="id"
                  value={sw.id}
                  onChange={e => {
                    const arr = [...selectedProfile.swad];
                    arr[idx].id = e.target.value;
                    updateProfile({ swad: arr });
                  }}
                />
                {/* Add inputs for name/location */}
              </div>
            ))}
            <hr />
            <h3>Artifacts</h3>
            {selectedProfile.artifacts.map((art, idx) => (
              <div key={idx} style={{ border: "1px solid #bbb", margin: 5, padding: 10, borderRadius: 8 }}>
                <label>Name:</label>
                <select
                  value={art.name}
                  onChange={e => {
                    const arr = [...selectedProfile.artifacts];
                    arr[idx].name = e.target.value;
                    updateProfile({ artifacts: arr });
                  }}
                >
                  <option value="">Select</option>
                  <option value="SUM SWLM">SUM SWLM</option>
                  <option value="SUM SWP1">SUM SWP1</option>
                  <option value="SUM SWP2">SUM SWP2</option>
                  <option value="SUM SWP3">SUM SWP3</option>
                  <option value="SUM SWP4">SUM SWP4</option>
                </select>
                <div>
                  <label>Version:</label>
                  <input
                    value={art.version}
                    readOnly
                    style={{ background: "#eee" }}
                    placeholder="Will be filled at generation"
                  />
                </div>
                {/* Add more fields for kind, location, sha256, etc. */}
              </div>
            ))}
            <button onClick={addArtifact}>Add Artifact</button>
          </div>
          <div style={{
            width: 420,
            minWidth: 320,
            background: "#222",
            color: "#d7ffb8",
            borderRadius: 8,
            padding: 24,
            fontSize: 14,
            height: 600,
            overflowY: "auto"
          }}>
            <h4 style={{ color: "#fff" }}>Profile JSON</h4>
            <pre>{JSON.stringify(selectedProfile, null, 2)}</pre>
          </div>
        </div>
      )}

      {activeTab === "generate" && (
        <div style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: 32,
          display: "flex",
          gap: 32
        }}>
          <div style={{ flex: 1 }}>
            <h2>JSON Generation</h2>
            <label style={{ fontWeight: "bold" }}>Select Software Package: </label>
            <select
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(Number(e.target.value))}
              style={{ fontSize: 16, marginLeft: 8 }}
            >
              {profiles.map(p => (
                <option key={p.sw_package_id} value={p.sw_package_id}>
                  SW Package {p.sw_package_id}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 20 }}>
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
