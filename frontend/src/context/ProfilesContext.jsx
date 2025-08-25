// src/context/ProfilesContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchProfiles,
  addProfile,
  updateProfile,
  deleteProfileRequest,
} from "../api/profiles";
import { EMPTY_PROFILE } from "../utils/constants";
import { orderProfileForDisplay, renumberSourceReferences } from "../utils/profile";
import { toProjectName } from "../utils/gerrit";

const ProfilesContext = createContext(null);

export function useProfiles() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error("useProfiles must be used within <ProfilesProvider>");
  return ctx;
}

// Map content_type from kind
function contentTypeForKind(kind) {
  return kind === "Generated Code" ? "application/source code" : "application/model";
}

export function ProfilesProvider({ children }) {
  const [profiles, setProfiles] = useState([]);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    fetchProfiles().then(setProfiles).catch((e) => showToast(e.message, "error"));
  }, []);

  const actions = useMemo(
    () => ({
      startEmpty: () => EMPTY_PROFILE(),

      /**
       * Save (create or update) a profile.
       * Normalizes before persisting:
       *  - source_references[].location => Gerrit project name (no URLs)
       *  - additional_information[].{category,kind,content_type,location}
       *      category: "design" (static)
       *      content_type derived from kind
       *      location stored as Gerrit project name (optional; blank = inherit)
       *  - change_log: keep filenamn, clear version/location (resolved during Generate)
       *  - artifacts: keep only editable fields; static/auto fields empty/preset
       */
      saveProfile: async (editProfile, profileEditIdx) => {
        if (!editProfile?.sw_package_id) {
          throw new Error("Profile must have SW Package ID!");
        }

        const arr = [...profiles];
        const numericId = Number(editProfile.sw_package_id);

        // Normalize & renumber source references
        const normalizedRefs = renumberSourceReferences(
          (editProfile.source_references || []).map((sr) => {
            // Always store Gerrit project name only
            const projectName = toProjectName(sr.location);

            // Additional Information normalization
            const normAI = Array.isArray(sr.additional_information)
              ? sr.additional_information.map((ai) => {
                  const kind = ai.kind === "Generated Code" ? "Generated Code" : "Simulink";
                  return {
                    ...ai,
                    category: "design",
                    kind,
                    content_type: contentTypeForKind(kind),
                    // store as Gerrit project name only (optional)
                    location: toProjectName(ai.location || ""),
                  };
                })
              : [];

            // Keep filenamn, clear version/location to be resolved at Generate
            const prevCL =
              sr.change_log && typeof sr.change_log === "object" ? sr.change_log : {};
            const filenamn =
              typeof prevCL.filenamn === "string" && prevCL.filenamn
                ? prevCL.filenamn
                : "Gerrit log"; // fallback; we’ll rename key later as requested
            const normCL = {
              filenamn,
              version: "", // filled from release version at Generate
              location: "", // resolved tag URL at Generate
            };

            return {
              ...sr,
              location: projectName, // store project name only
              components: Array.isArray(sr.components) ? sr.components : [],
              additional_information: normAI,
              change_log: normCL,
            };
          })
        );

        // Normalize Artifacts: enforce static fields; keep blanks for generated fields
        const normalizedArtifacts = (editProfile.artifacts || []).map((a, i) => ({
          idx: i + 1,
          name: a.name || "",
          kind: "VBF file",
          version: "", // generated later from SW version
          location: "", // generated later from Artifactory
          sha256: "", // generated later from Artifactory
          target_platform: "SUM1",
          buildtime_configurations: [{ cp: "VCTN", cpv: ["PRR"] }],
          source_references_idx: Array.isArray(a.source_references_idx)
            ? [...a.source_references_idx].sort((x, y) => x - y)
            : [],
        }));

        // Final ordered shape for saving
        const toSave = orderProfileForDisplay({
          ...editProfile,
          sw_package_id: numericId,
          source_references: normalizedRefs,
          artifacts: normalizedArtifacts,
        });

        let newIdx;
        if (profileEditIdx === null || profileEditIdx === undefined) {
          arr.push(toSave);
          await addProfile(toSave);
          newIdx = arr.length - 1;
        } else {
          arr[profileEditIdx] = toSave;
          await updateProfile(toSave);
          newIdx = profileEditIdx;
        }

        setProfiles(arr);
        showToast("Profile saved", "success");
        return newIdx;
      },

      deleteProfile: async (idx) => {
        const arr = [...profiles];
        const sw_package_id = arr[idx].sw_package_id;
        arr.splice(idx, 1);
        await deleteProfileRequest(sw_package_id);
        setProfiles(arr);
        showToast("Profile deleted", "success");
        return 0;
      },

      setProfiles,
      showToast,
    }),
    [profiles]
  );

  const value = useMemo(
    () => ({ profiles, toast, showToast, ...actions }),
    [profiles, toast, actions]
  );

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}
