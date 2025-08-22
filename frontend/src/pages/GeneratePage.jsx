import React, { useState } from "react";
import { useProfiles } from "../context/ProfilesContext";
import { fillVersionFields, renumberSourceReferences, orderGeneratedForDisplay } from "../utils/profile";
import GeneratedJsonPanel from "../components/GeneratedJsonPanel";

export default function GeneratePage() {
  const { profiles } = useProfiles();
  const [selectedProfileIdx, setSelectedProfileIdx] = useState(0);
  const [generationInput, setGenerationInput] = useState({ sw_version: "" });
  const [generated, setGenerated] = useState(null);

  const handleGenerate = () => {
    const sw_version = generationInput.sw_version;
    if (!sw_version) return;
    const sw_package_version = sw_version.split("_").pop() + ".0";
    const filledProfile = fillVersionFields(profiles[selectedProfileIdx], sw_version);
    const { profile_name, ...profileNoName } = filledProfile;
    const result = {
      ...profileNoName,
      source_references: renumberSourceReferences(
        (profileNoName.source_references || []).map((sr) => ({
          ...sr,
          components: Array.isArray(sr.components) ? sr.components : [],
        }))
      ),
      sw_package_version,
      sw_version,
    };
    setGenerated(orderGeneratedForDisplay(result));
  };

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: 32,
        display: "flex",
        gap: 32,
      }}
    >
      <div style={{ flex: 1 }}>
        <h2>Generate SW Package JSON</h2>
        <label style={{ fontWeight: "bold" }}>Select Profile: </label>
        <select
          value={selectedProfileIdx}
          onChange={(e) => setSelectedProfileIdx(Number(e.target.value))}
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
            onChange={(e) =>
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
      <GeneratedJsonPanel value={generated} />
    </div>
  );
}
