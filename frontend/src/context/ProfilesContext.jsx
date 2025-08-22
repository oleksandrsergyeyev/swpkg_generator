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
       * Normalizes:
       *  - source_references[].location => Gerrit project name (no URLs)
       *  - source_references[].additional_information[].location => Gerrit project name (optional)
       *  - source_references[].change_log.location => "" (URL resolved during Generate)
       */
      saveProfile: async (editProfile, profileEditIdx) => {
        if (!editProfile?.sw_package_id) {
          throw new Error("Profile must have SW Package ID!");
        }

        const arr = [...profiles];
        const numericId = Number(editProfile.sw_package_id);

        // Normalize and renumber source references before saving
        const normalizedRefs = renumberSourceReferences(
          (editProfile.source_references || []).map((sr) => {
            const projectName = toProjectName(sr.location);

            const normAI = Array.isArray(sr.additional_information)
              ? sr.additional_information.map((ai) => ({
                  ...ai,
                  // Store as Gerrit project name if provided; empty means "inherit from ref"
                  location: toProjectName(ai.location || ""),
                }))
              : [];

            const normCL =
              sr.change_log && typeof sr.change_log === "object"
                ? { ...sr.change_log, location: "" } // resolved at Generate time
                : { filenamn: "", version: "", location: "" };

            return {
              ...sr,
              location: projectName, // store project name only
              components: Array.isArray(sr.components) ? sr.components : [],
              additional_information: normAI,
              change_log: normCL,
            };
          })
        );

        // Final shape for saving (preserves desired ordering of fields)
        const toSave = orderProfileForDisplay({
          ...editProfile,
          sw_package_id: numericId,
          source_references: normalizedRefs,
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
        return newIdx; // caller can set the selected index
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
