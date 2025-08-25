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

      // Fill all empty "version" fields with sw_version (artifacts too)
      const filledProfile = fillVersionFields(profile, sw_version);

      // Remove profile_name from the payload
      const { profile_name, ...profileNoName } = filledProfile;

      // ----- Resolve Gerrit URLs for each source reference -----
      // ref.location holds a Gerrit *project name*, not a URL
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
              refUrl = baseProject; // fall back to project string
            }
          }

          // Resolve each Additional Information item individually:
          // if info.location provided, use that project name; else inherit ref project
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
              return {
                ...info,
                location: aiUrl, // write resolved URL
              };
            })
          );

          // change_log: set version to the release (sw_version) and location to refUrl
          const change_log =
            ref.change_log && typeof ref.change_log === "object"
              ? {
                  ...ref.change_log,
                  version: sw_version,
                  location: refUrl,
                }
              : { filenamn: "Gerrit log", version: sw_version, location: refUrl };

          return {
            ...ref,
            location: refUrl, // write resolved URL into the ref itself
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
              // Non-fatal: keep empty values and let user inspect toast/error
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
            version: a.version || sw_version, // keep filled by fillVersionFields or default to sw_version
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

      // Build final result
      const result = {
        ...profileNoName,
        source_references: renumberSourceReferences(resolvedRefs),
        artifacts: resolvedArtifacts,
        sw_version, // explicit
        // sw_package_version is usually the numeric part + ".0" but
        // it's already not strictly required when sw_version is present.
        // If you still want it computed, uncomment below:
        // sw_package_version:
        //   (sw_version.includes("_") ? sw_version.split("_").pop() : sw_version) + ".0",
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
            style={{ width: 220, marginLeft: 8 }}
            placeholder="BSW_VCC_20.0.1"
          />
          <button
            style={{ marginLeft: 16, padding: "4px 16px" }}
            onClick={handleGenerate}
            disabled={loading}
            title="Generate JSON using Gerrit & Artifactory lookups"
          >
            {loading ? "Generating…" : "Generate JSON"}
          </button>
        </div>
      </div>

      <GeneratedJsonPanel value={generated} />
    </div>
  );
}
