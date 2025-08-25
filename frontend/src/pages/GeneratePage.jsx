// src/pages/GeneratePage.jsx
import React, { useState } from "react";
import { useProfiles } from "../context/ProfilesContext";
import {
  fillVersionFields,
  renumberSourceReferences,
  orderGeneratedForDisplay,
} from "../utils/profile";
import GeneratedJsonPanel from "../components/GeneratedJsonPanel";
import { getGerritTagUrl } from "../api/gerrit";
import { resolveArtifactMeta } from "../api/artifacts";

export default function GeneratePage() {
  const { profiles, showToast } = useProfiles();
  const [selectedProfileIdx, setSelectedProfileIdx] = useState(0);
  const [generationInput, setGenerationInput] = useState({ sw_version: "" });
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const sw_version = generationInput.sw_version.trim();
    if (!sw_version) return;

    try {
      setLoading(true);

      const profile = profiles[selectedProfileIdx];

      // Fill all empty "version" fields with sw_version
      const filledProfile = fillVersionFields(profile, sw_version);

      // Remove profile_name from the payload
      const { profile_name, ...profileNoName } = filledProfile;

      // ----- Resolve Gerrit URLs for each source reference -----
      const refs = Array.isArray(profileNoName.source_references)
        ? profileNoName.source_references
        : [];

      const resolvedRefs = await Promise.all(
        refs.map(async (ref) => {
          const baseProject = (ref.location || "").trim();

          // Resolve URL for the ref itself (if project provided)
          let refUrl = baseProject;
          if (baseProject) {
            try {
              const r = await getGerritTagUrl(baseProject, sw_version); // { url }
              refUrl = r.url || baseProject;
            } catch {
              refUrl = baseProject;
            }
          }

          // Resolve Additional Information entries
          const ai = Array.isArray(ref.additional_information)
            ? ref.additional_information
            : [];
          const resolvedAI = await Promise.all(
            ai.map(async (info) => {
              const aiProject = (info.location || baseProject || "").trim();
              let aiUrl = aiProject;
              if (aiProject) {
                try {
                  const r = await getGerritTagUrl(aiProject, sw_version);
                  aiUrl = r.url || aiProject;
                } catch {
                  aiUrl = aiProject;
                }
              }
              return { ...info, location: aiUrl };
            })
          );

          // change_log: version set to sw_version, location to resolved refUrl
          const change_log =
            ref.change_log && typeof ref.change_log === "object"
              ? { ...ref.change_log, version: sw_version, location: refUrl }
              : { filenamn: "Gerrit log", version: sw_version, location: refUrl };

          return {
            ...ref,
            location: refUrl,
            additional_information: resolvedAI,
            change_log,
            components: Array.isArray(ref.components) ? ref.components : [],
          };
        })
      );

      // ----- Resolve Artifacts via Artifactory API -----
      const arts = Array.isArray(profileNoName.artifacts)
        ? profileNoName.artifacts
        : [];

      const resolvedArtifacts = await Promise.all(
        arts.map(async (a, i) => {
          const name = (a.name || "").trim();
          let location = "";
          let sha256 = "";

          if (name) {
            try {
              const meta = await resolveArtifactMeta(name, sw_version); // { location, sha256 }
              location = meta.location || "";
              sha256 = meta.sha256 || "";
            } catch (e) {
              showToast?.(
                `Artifact "${name}": ${e?.message || "failed to resolve"}`,
                "error"
              );
            }
          }

          return {
            idx: i + 1,
            name,
            kind: "VBF file",
            version: a.version || sw_version,
            location,
            sha256,
            target_platform: "SUM1",
            buildtime_configurations: [{ cp: "VCTN", cpv: ["PRR"] }],
            source_references_idx: Array.isArray(a.source_references_idx)
              ? [...a.source_references_idx].sort((x, y) => x - y)
              : [],
          };
        })
      );

      const result = {
        ...profileNoName,
        source_references: renumberSourceReferences(resolvedRefs),
        artifacts: resolvedArtifacts,
        sw_version,
      };

      setGenerated(orderGeneratedForDisplay(result));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 16 }}>
      {/* Top bar with the single-line controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          padding: "12px 0",
          borderBottom: "1px solid #eee",
          marginBottom: 12,
        }}
      >
        <strong>Generate SW Package JSON</strong>

        <label style={{ marginLeft: 8 }}>Select Profile:</label>
        <select
          value={selectedProfileIdx}
          onChange={(e) => setSelectedProfileIdx(Number(e.target.value))}
          style={{ fontSize: 14 }}
        >
          {profiles.map((p, idx) => (
            <option key={p.sw_package_id} value={idx}>
              SW Package {p.sw_package_id} ({p.profile_name})
            </option>
          ))}
        </select>

        <label>SW Version:</label>
        <input
          value={generationInput.sw_version}
          onChange={(e) =>
            setGenerationInput({ ...generationInput, sw_version: e.target.value })
          }
          style={{ width: 240 }}
          placeholder="BSW_VCC_20.0.1"
        />

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ padding: "4px 16px" }}
          title="Generate JSON using Gerrit & Artifactory lookups"
        >
          {loading ? "Generating…" : "Generate JSON"}
        </button>
      </div>

      {/* Full-width, full-height JSON panel */}
      <GeneratedJsonPanel
        value={generated}
        height={`calc(100vh - 140px)`} // adjust if your header is taller
      />
    </div>
  );
}
