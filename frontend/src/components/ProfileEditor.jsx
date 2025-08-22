import React, { useState } from "react";
import { useProfiles } from "../context/ProfilesContext";
import {
  EMPTY_PROFILE,
  DEFAULT_CATEGORY,
  DEFAULT_KIND,
  DEFAULT_CONTENT_TYPE,
  DEFAULT_REG_REQ,
  DEFAULT_FILENAMN,
  DEFAULT_TARGET_PLATFORM,
  DEFAULT_CP,
  DEFAULT_CPV,
} from "../utils/constants";
import { orderProfileForDisplay, renumberSourceReferences } from "../utils/profile";
import {
  carWeaverGetSourceComponents,
  carWeaverGetGenericProductModule,
} from "../api/carWeaver";

export default function ProfileEditor({ initial, editIdx, onCancel, onSaved }) {
  const { showToast } = useProfiles();
  const [editProfile, setEditProfile] = useState(() => initial ?? EMPTY_PROFILE());
  // Loading flags for CarWeaver calls
  const [gpmLoading, setGpmLoading] = useState(false);
  const [compLoading, setCompLoading] = useState({}); // keys like "refIdx:compIdx" => boolean


  // ---- UPDATED: Use the new GPM endpoint
  const updateGpmFromCarWeaver = async () => {
      try {
        const loc = (editProfile.generic_product_module?.location || "").trim();
        if (!loc) {
          showToast("Set Generic Product Module location first.", "error");
          return;
        }
        setGpmLoading(true);
        const data = await carWeaverGetGenericProductModule(loc); // { id, version }
        setEditProfile((p) => ({
          ...p,
          generic_product_module: {
            ...p.generic_product_module,
            id: data.id ?? p.generic_product_module.id ?? "",
            version:
              data.version != null
                ? String(data.version)
                : p.generic_product_module.version ?? "",
          },
        }));
        showToast("GPM updated from CarWeaver", "success");
      } catch (e) {
        showToast(`CarWeaver error: ${e.message}`, "error");
      } finally {
        setGpmLoading(false);
      }
    };


  // Components operations (unchanged)
  const addComponent = (refIdx) => {
    const refs = [...(editProfile.source_references || [])];
    refs[refIdx].components = refs[refIdx].components || [];
    refs[refIdx].components.push({ id: "", persistent_id: "", version: "", location: "" });
    setEditProfile((p) => ({ ...p, source_references: refs }));
  };
  const removeComponent = (refIdx, compIdx) => {
    const refs = [...(editProfile.source_references || [])];
    refs[refIdx].components.splice(compIdx, 1);
    setEditProfile((p) => ({ ...p, source_references: refs }));
  };
  const updateComponentField = (refIdx, compIdx, field, value) => {
    const refs = [...(editProfile.source_references || [])];
    refs[refIdx].components[compIdx][field] = value;
    setEditProfile((p) => ({ ...p, source_references: refs }));
  };
  const updateComponentFromCarWeaver = async (refIdx, compIdx) => {
      const key = `${refIdx}:${compIdx}`;
      try {
        const refs = [...(editProfile.source_references || [])];
        const comp = refs[refIdx].components[compIdx];
        const locator = (comp.location || refs[refIdx].location || "").trim();
        if (!locator) {
          showToast("Set a component location or source reference location first.", "error");
          return;
        }
        setCompLoading((m) => ({ ...m, [key]: true }));
        const data = await carWeaverGetSourceComponents(locator);
        refs[refIdx].components[compIdx] = {
          ...comp,
          id: data.id ?? comp.id ?? "",
          persistent_id: data.persistent_id ?? "",
          version: data.version != null ? String(data.version) : "",
        };
        setEditProfile((p) => ({ ...p, source_references: refs }));
        showToast("Component updated from CarWeaver", "success");
      } catch (e) {
        showToast(`CarWeaver error: ${e.message}`, "error");
      } finally {
        setCompLoading((m) => ({ ...m, [key]: false }));
      }
    };


  const save = async () => {
    onSaved && onSaved(editProfile, editIdx);
  };

  return (
  <div
    style={{
      marginTop: 18,
      background: "#fff",
      borderRadius: 12,
      padding: 24,
      boxShadow: "0 0 8px #eee",
    }}
  >
    {/* Global loading banner */}
    {(gpmLoading || Object.values(compLoading).some(Boolean)) && (
      <div
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#424242",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 6,
          zIndex: 1000,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          fontSize: 13,
        }}
      >
        Contacting CarWeaver…
      </div>
    )}
      <h3>{editIdx === null ? "Add New Profile" : "Edit Profile"}</h3>

      {/* -------- BASICS BLOCK -------- */}
      <div
        style={{
          background: "#f3f7ff",
          padding: 18,
          borderRadius: 8,
          marginBottom: 24,
          border: "1px solid #e0e4ef",
        }}
      >
        <h4 style={{ margin: 0, marginBottom: 12, color: "#274060" }}>
          Profile Basics
        </h4>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <input
            value={editProfile.sw_package_id}
            onChange={(e) =>
              setEditProfile((p) => ({
                ...p,
                sw_package_id: e.target.value.replace(/\D/, ""),
              }))
            }
            style={{ width: 120, marginRight: 10 }}
            disabled={editIdx !== null}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <input
            value={editProfile.profile_name}
            onChange={(e) =>
              setEditProfile((p) => ({ ...p, profile_name: e.target.value }))
            }
            style={{ width: 260, marginRight: 10 }}
          />
        </div>

        {/* GPM: labeled, read-only id/version, each on its own line */}
        <div style={{ marginTop: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666" }}>location</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={editProfile.generic_product_module.location}
              onChange={(e) =>
                setEditProfile((p) => ({
                  ...p,
                  generic_product_module: {
                    ...p.generic_product_module,
                    location: e.target.value,
                  },
                }))
              }
              style={{ width: 480 }}
              placeholder="Generic Product Module location (CarWeaver/SystemWeaver link)"
            />
            <button
              type="button"
              onClick={updateGpmFromCarWeaver}
              disabled={gpmLoading}
              style={{
                whiteSpace: "nowrap",
                opacity: gpmLoading ? 0.6 : 1,
                cursor: gpmLoading ? "not-allowed" : "pointer",
              }}
            >
              {gpmLoading ? "Updating…" : "Update GPM from CarWeaver"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666" }}>id</label>
          <input
            value={editProfile.generic_product_module.id}
            readOnly
            style={{ width: 480, background: "#eee" }}
            placeholder="(filled from CarWeaver)"
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666" }}>version</label>
          <input
            value={editProfile.generic_product_module.version}
            readOnly
            style={{ width: 180, background: "#eee" }}
            placeholder="(filled from CarWeaver)"
          />
        </div>

      </div>

      {/* -------- SOURCE REFERENCES -------- */}
      <div
        style={{
          background: "#f9f6ef",
          padding: 18,
          borderRadius: 8,
          marginBottom: 24,
          border: "1px solid #eee",
        }}
      >
        <h4 style={{ margin: 0, marginBottom: 12, color: "#755610" }}>
          Source References
        </h4>

        {(editProfile.source_references || []).map((ref, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid #ddd",
              margin: 8,
              padding: 10,
              borderRadius: 8,
              background: "#fff",
              position: "relative",
            }}
          >
            {/* Read-only ID */}
            <div style={{ position: "absolute", left: 10, top: 8 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 12,
                  border: "1px solid #c9a94a",
                  fontSize: 12,
                  background: "#fff8e1",
                  color: "#6b5208",
                  fontWeight: 600,
                }}
                title="Source Reference ID"
              >
                ID: {ref.idx}
              </span>
            </div>

            {/* Remove Source Reference button */}
            <button
              type="button"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                color: "red",
                background: "transparent",
                border: "none",
                fontWeight: "bold",
              }}
              onClick={() => {
                const refs = [...(editProfile.source_references || [])];
                refs.splice(idx, 1);
                const renumbered = renumberSourceReferences(refs);
                setEditProfile((p) => ({
                  ...p,
                  source_references: renumbered,
                }));
              }}
              title="Remove this Source Reference"
            >
              Remove Source
            </button>

            {/* Name */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 28,
                marginBottom: 10,
              }}
            >
              <input
                value={ref.name}
                onChange={(e) => {
                  const arr = [...editProfile.source_references];
                  arr[idx].name = e.target.value;
                  setEditProfile((p) => ({
                    ...p,
                    source_references: arr,
                  }));
                }}
                style={{ width: 280, marginRight: 10 }}
              />
              <span style={{ color: "#555", fontSize: 13 }}>
                Source Name
              </span>
            </div>

            {/* Location */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <textarea
                value={ref.location}
                onChange={(e) => {
                  const arr = [...editProfile.source_references];
                  arr[idx].location = e.target.value;
                  setEditProfile((p) => ({ ...p, source_references: arr }));
                }}
                style={{
                  width: 600,
                  minHeight: 45,
                  marginRight: 10,
                  resize: "vertical",
                }}
              />
              <span style={{ color: "#555", fontSize: 13 }}>Gerrit Link</span>
            </div>

            {/* Version (read-only) */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <input
                value={ref.version}
                readOnly
                style={{ background: "#eee", width: 180, marginRight: 10 }}
                placeholder="Will be filled at generation"
              />
            </div>

            {/* Components */}
            <div
              style={{
                marginTop: 12,
                marginBottom: 10,
                borderTop: "1px dashed #ddd",
                paddingTop: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ marginRight: 8 }}>Components</strong>
                <button type="button" onClick={() => addComponent(idx)}>
                  + Add Component
                </button>
              </div>

              {(ref.components || []).length === 0 && (
                <div style={{ color: "#777", fontSize: 13, marginBottom: 8 }}>
                  No components yet. Add one to start.
                </div>
              )}

              {(ref.components || []).map((c, cIdx) => (
                <div
                  key={cIdx}
                  style={{
                    background: "#f6fbff",
                    border: "1px solid #d7e8f6",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                      location
                    </label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={c.location}
                        onChange={(e) => updateComponentField(idx, cIdx, "location", e.target.value)}
                        style={{ flex: 1 }}
                        placeholder="Link (CarWeaver/SystemWeaver)"
                      />
                      <button
                          type="button"
                          onClick={() => updateComponentFromCarWeaver(idx, cIdx)}
                          title="Fetch id/persistent_id/version from CarWeaver"
                          disabled={!!compLoading[`${idx}:${cIdx}`]}
                          style={{
                            whiteSpace: "nowrap",
                            opacity: compLoading[`${idx}:${cIdx}`] ? 0.6 : 1,
                            cursor: compLoading[`${idx}:${cIdx}`] ? "not-allowed" : "pointer",
                          }}
                        >
                          {compLoading[`${idx}:${cIdx}`] ? "Updating…" : "Update from CarWeaver"}
                        </button>

                      <button
                        type="button"
                        style={{ color: "red", whiteSpace: "nowrap" }}
                        onClick={() => removeComponent(idx, cIdx)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                      id
                    </label>
                    <input
                      value={c.id}
                      readOnly
                      style={{ width: "100%", background: "#eee" }}
                      placeholder="(filled from CarWeaver)"
                    />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                      persistent_id
                    </label>
                    <input
                      value={c.persistent_id}
                      readOnly
                      style={{ width: "100%", background: "#eee" }}
                      placeholder="(filled from CarWeaver)"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                      version
                    </label>
                    <input
                      value={c.version}
                      readOnly
                      style={{ width: "100%", background: "#eee" }}
                      placeholder="(filled from CarWeaver)"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Information */}
            <div style={{ marginTop: 12, marginBottom: 10 }}>
              <strong>Additional Information</strong>
              {(ref.additional_information || []).map((info, infoIdx) => (
                <div
                  key={infoIdx}
                  style={{
                    background: "#f4f8fc",
                    borderRadius: 6,
                    marginBottom: 12,
                    padding: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <input
                      placeholder="Title"
                      value={info.title}
                      onChange={(e) => {
                        const refs = [...editProfile.source_references];
                        refs[idx].additional_information[infoIdx].title = e.target.value;
                        setEditProfile((p) => ({ ...p, source_references: refs }));
                      }}
                      style={{ width: 180, marginRight: 8 }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <input
                      placeholder="Category"
                      value={info.category}
                      onChange={(e) => {
                        const refs = [...editProfile.source_references];
                        refs[idx].additional_information[infoIdx].category = e.target.value;
                        setEditProfile((p) => ({ ...p, source_references: refs }));
                      }}
                      style={{ width: 120, marginRight: 8 }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <select
                      value={info.kind}
                      onChange={(e) => {
                        const refs = [...editProfile.source_references];
                        refs[idx].additional_information[infoIdx].kind = e.target.value;
                        setEditProfile((p) => ({ ...p, source_references: refs }));
                      }}
                      style={{ width: 140, marginRight: 8 }}
                    >
                      <option value="Simulink">Simulink</option>
                      <option value="Generated Code">Generated Code</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <select
                      value={info.content_type}
                      onChange={(e) => {
                        const refs = [...editProfile.source_references];
                        refs[idx].additional_information[infoIdx].content_type = e.target.value;
                        setEditProfile((p) => ({ ...p, source_references: refs }));
                      }}
                      style={{ width: 180, marginRight: 8 }}
                    >
                      <option value="application/model">application/model</option>
                      <option value="application/source code">application/source code</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <textarea
                      placeholder="Location"
                      value={info.location}
                      onChange={(e) => {
                        const refs = [...editProfile.source_references];
                        refs[idx].additional_information[infoIdx].location = e.target.value;
                        setEditProfile((p) => ({ ...p, source_references: refs }));
                      }}
                      style={{
                        width: 600,
                        minHeight: 40,
                        marginRight: 8,
                        resize: "vertical",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    style={{
                      color: "red",
                      border: "none",
                      background: "transparent",
                      fontWeight: "bold",
                    }}
                    onClick={() => {
                      const refs = [...editProfile.source_references];
                      refs[idx].additional_information.splice(infoIdx, 1);
                      setEditProfile((p) => ({ ...p, source_references: refs }));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const refs = [...(editProfile.source_references || [])];
                  refs[idx].additional_information =
                    refs[idx].additional_information || [];
                  refs[idx].additional_information.push({
                    title: "",
                    category: DEFAULT_CATEGORY,
                    kind: DEFAULT_KIND,
                    content_type: DEFAULT_CONTENT_TYPE,
                    location: "",
                  });
                  setEditProfile((p) => ({ ...p, source_references: refs }));
                }}
              >
                Add Additional Information
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            const existing = [...(editProfile.source_references || [])];
            const next = {
              idx: existing.length + 1,
              name: "",
              version: "",
              location: "",
              components: [],
              additional_information: [],
              regulatory_requirements: [DEFAULT_REG_REQ],
              change_log: { filenamn: DEFAULT_FILENAMN, version: "", location: "" },
            };
            const renumbered = renumberSourceReferences([...existing, next]);
            setEditProfile((p) => ({
              ...p,
              source_references: renumbered,
            }));
          }}
        >
          Add Source Reference
        </button>
      </div>

      {/* -------- SWAD -------- */}
      <div
        style={{
          background: "#f2fcf6",
          padding: 18,
          borderRadius: 8,
          marginBottom: 24,
          border: "1px solid #bdf6cd",
        }}
      >
        <h4 style={{ margin: 0, marginBottom: 12, color: "#277044" }}>SWAD</h4>
        {(editProfile.swad || []).map((sw, idx) => (
          <div
            key={idx}
            style={{
              background: "#e8fff4",
              borderRadius: 8,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <input
                placeholder="id"
                value={sw.id}
                onChange={(e) => {
                  const arr = [...editProfile.swad];
                  arr[idx].id = e.target.value;
                  setEditProfile((p) => ({ ...p, swad: arr }));
                }}
                style={{ width: 120, marginRight: 8 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <input
                placeholder="name"
                value={sw.name}
                onChange={(e) => {
                  const arr = [...editProfile.swad];
                  arr[idx].name = e.target.value;
                  setEditProfile((p) => ({ ...p, swad: arr }));
                }}
                style={{ width: 200, marginRight: 8 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <textarea
                placeholder="location"
                value={sw.location}
                onChange={(e) => {
                  const arr = [...editProfile.swad];
                  arr[idx].location = e.target.value;
                  setEditProfile((p) => ({ ...p, swad: arr }));
                }}
                style={{
                  width: 600,
                  minHeight: 40,
                  marginRight: 8,
                  resize: "vertical",
                }}
              />
              <button
                type="button"
                style={{ color: "red", marginLeft: 12 }}
                onClick={() => {
                  const arr = [...editProfile.swad];
                  arr.splice(idx, 1);
                  setEditProfile((p) => ({ ...p, swad: arr }));
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          style={{ marginTop: 4 }}
          onClick={() =>
            setEditProfile((p) => ({
              ...p,
              swad: [...(p.swad || []), { id: "", name: "", location: "" }],
            }))
          }
        >
          Add SWAD
        </button>
      </div>

      {/* -------- SWDD -------- */}
      <div
        style={{
          background: "#f7f8fc",
          padding: 18,
          borderRadius: 8,
          marginBottom: 24,
          border: "1px solid #dbe3f8",
        }}
      >
        <h4 style={{ margin: 0, marginBottom: 12, color: "#3b4a6b" }}>SWDD</h4>
        {(editProfile.swdd || []).map((sw, idx) => (
          <div
            key={idx}
            style={{
              background: "#eaeefe",
              borderRadius: 8,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <input
                placeholder="id"
                value={sw.id}
                onChange={(e) => {
                  const arr = [...editProfile.swdd];
                  arr[idx].id = e.target.value;
                  setEditProfile((p) => ({ ...p, swdd: arr }));
                }}
                style={{ width: 120, marginRight: 8 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <input
                placeholder="name"
                value={sw.name}
                onChange={(e) => {
                  const arr = [...editProfile.swdd];
                  arr[idx].name = e.target.value;
                  setEditProfile((p) => ({ ...p, swdd: arr }));
                }}
                style={{ width: 200, marginRight: 8 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <textarea
                placeholder="location"
                value={sw.location}
                onChange={(e) => {
                  const arr = [...editProfile.swdd];
                  arr[idx].location = e.target.value;
                  setEditProfile((p) => ({ ...p, swdd: arr }));
                }}
                style={{
                  width: 600,
                  minHeight: 40,
                  marginRight: 8,
                  resize: "vertical",
                }}
              />
              <button
                type="button"
                style={{ color: "red", marginLeft: 12 }}
                onClick={() => {
                  const arr = [...editProfile.swdd];
                  arr.splice(idx, 1);
                  setEditProfile((p) => ({ ...p, swdd: arr }));
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          style={{ marginTop: 4 }}
          onClick={() =>
            setEditProfile((p) => ({
              ...p,
              swdd: [...(p.swdd || []), { id: "", name: "", location: "" }],
            }))
          }
        >
          Add SWDD
        </button>
      </div>

      {/* -------- ARTIFACTS -------- */}
      <div
        style={{
          background: "#fef7fa",
          padding: 18,
          borderRadius: 8,
          marginBottom: 16,
          border: "1px solid #eed3e4",
        }}
      >
        <h4 style={{ margin: 0, marginBottom: 12, color: "#7d3557" }}>Artifacts</h4>
        {(editProfile.artifacts || []).map((art, idx) => (
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
              position: "relative",
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
                fontWeight: "bold",
              }}
              onClick={() => {
                const arr = [...editProfile.artifacts];
                arr.splice(idx, 1);
                setEditProfile((p) => ({ ...p, artifacts: arr }));
              }}
              title="Remove this Artifact"
            >
              Remove
            </button>
            <label>Name:</label>
            <select
              value={art.name}
              onChange={(e) => {
                const arr = [...editProfile.artifacts];
                arr[idx].name = e.target.value;
                setEditProfile((p) => ({ ...p, artifacts: arr }));
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
            <span
              style={{
                color: "#555",
                fontSize: 13,
                marginLeft: 10,
                marginRight: 10,
              }}
            >
              Artifact name
            </span>
            <label>Version:</label>
            <input
              value={art.version}
              readOnly
              style={{
                background: "#eee",
                width: 140,
                marginLeft: 6,
                marginRight: 10,
              }}
              placeholder="Will be filled at generation"
            />
          </div>
        ))}
        <button
          onClick={() =>
            setEditProfile((p) => ({
              ...p,
              artifacts: [
                ...(p.artifacts || []),
                {
                  idx: (p.artifacts?.length || 0) + 1,
                  name: "",
                  kind: "VBF file",
                  version: "",
                  location: "",
                  sha256: "",
                  target_platform: DEFAULT_TARGET_PLATFORM,
                  buildtime_configurations: [
                    { cp: DEFAULT_CP, cpv: [DEFAULT_CPV] },
                  ],
                  source_references_idx: [],
                },
              ],
            }))
          }
        >
          Add Artifact
        </button>
      </div>

      {/* ---- SAVE / CANCEL ---- */}
      <div style={{ marginTop: 16 }}>
        <button onClick={save}>Save Profile</button>
        <button style={{ marginLeft: 12 }} onClick={onCancel}>
          Cancel
        </button>
      </div>

      {/* --- Profile Preview panel (ordered) --- */}
      <div
        style={{
          background: "#222",
          color: "#d7ffb8",
          borderRadius: 8,
          marginTop: 16,
          width: "100%",
          maxWidth: 800,
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
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            boxSizing: "border-box",
            overflow: "visible",
          }}
        >
          {JSON.stringify(orderProfileForDisplay(editProfile), null, 2)}
        </pre>
      </div>
    </div>
  );
}
