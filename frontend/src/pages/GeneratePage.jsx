import React, { useState } from "react";
import { useProfiles } from "../context/ProfilesContext";
import {
  fillVersionFields,
  renumberSourceReferences,
  orderGeneratedForDisplay,
} from "../utils/profile";
import GeneratedJsonPanel from "../components/GeneratedJsonPanel";
import { getGerritTagUrl } from "../api/gerrit";

export default function GeneratePage() {
  const { profiles } = useProfiles();
  const [selectedProfileIdx, setSelectedProfileIdx] = useState(0);
  const [generationInput, setGenerationInput] = useState({ sw_version: "" });
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const sw_version = generationInput.sw_version;
    if (!sw_version) return;

    try {
      setLoading(true);

      const profile = profiles[selectedProfileIdx];
      const sw_package_version =
        (sw_version.includes("_") ? sw_version.split("_").pop() : sw_version) +
        ".0";

      // fill empty "version" fields with sw_version
      const filledProfile = fillVersionFields(profile, sw_version);

      // Remove profile_name in result
      const { profile_name, ...profileNoName } = filledProfile;

      // Resolve Gerrit URLs for each source reference (location holds PROJECT NAME)
      const refs = profileNoName.source_references || [];
      const resolvedRefs = await Promise.all(
        refs.map(async (ref) => {
          // Resolve URL for the Source Reference project
          const refProject = (ref.location || "").trim();
          let refUrl = refProject;
          if (refProject) {
            try {
              const res = await getGerritTagUrl(refProject, sw_version); // { url }
              refUrl = res.url || refProject;
            } catch {
              refUrl = refProject; // fallback to project string
            }
          }

          // clone and write resolved URL for the ref
          const out = { ...ref, location: refUrl };

          // change_log uses the ref URL
          if (out.change_log && typeof out.change_log === "object") {
            out.change_log = { ...out.change_log, location: refUrl };
          }

          // additional_information: resolve each item individually (fallback to ref project)
          if (Array.isArray(out.additional_information)) {
            out.additional_information = await Promise.all(
              out.additional_information.map(async (ai) => {
                const aiProject = (ai.location || "").trim();
                if (!aiProject) {
                  // no AI project specified -> use refUrl
                  return { ...ai, location: refUrl };
                }
                try {
                  const r = await getGerritTagUrl(aiProject, sw_version);
                  return { ...ai, location: r.url || aiProject };
                } catch {
                  return { ...ai, location: aiProject };
                }
              })
            );
          }

          // keep components array sane
          out.components = Array.isArray(out.components) ? out.components : [];
          return out;
        })
      );

      const result = {
        ...profileNoName,
        source_references: renumberSourceReferences(resolvedRefs),
        sw_package_version,
        sw_version,
      };

      setGenerated(orderGeneratedForDisplay(result));
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate JSON"}
          </button>
        </div>
      </div>
      <GeneratedJsonPanel value={generated} />
    </div>
  );
}
