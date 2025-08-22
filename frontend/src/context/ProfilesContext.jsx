import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchProfiles, addProfile, updateProfile, deleteProfileRequest } from "../api/profiles";
import { EMPTY_PROFILE } from "../utils/constants";
import { orderProfileForDisplay, renumberSourceReferences } from "../utils/profile";
import { toProjectName } from "../utils/gerrit"; // ADD


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
    fetchProfiles().then(setProfiles).catch(e => showToast(e.message, "error"));
  }, []);

  const actions = useMemo(() => ({
    startEmpty: () => EMPTY_PROFILE(),
    saveProfile: async (editProfile, profileEditIdx) => {
      if (!editProfile?.sw_package_id) {
        throw new Error("Profile must have SW Package ID!");
      }
      let arr = [...profiles];
      const numericId = Number(editProfile.sw_package_id);

      // Ensure idxs are tidy before saving
      // 1) Normalize Source Reference project names
        const normalizedRefs = renumberSourceReferences(
          (editProfile.source_references || []).map((sr) => {
            const projectName = toProjectName(sr.location);
            // 2) Additional info + change_log locations are generated later → clear them in storage
            const clearedAI = Array.isArray(sr.additional_information)
              ? sr.additional_information.map(ai => ({ ...ai, location: "" }))
              : [];
            const clearedCL = sr.change_log && typeof sr.change_log === "object"
              ? { ...sr.change_log, location: "" }
              : { filenamn: "", version: "", location: "" };

            return {
              ...sr,
              location: projectName,            // store project name only
              components: Array.isArray(sr.components) ? sr.components : [],
              additional_information: clearedAI,
              change_log: clearedCL,
            };
          })
        );

        // Final shape for saving
        const toSave = orderProfileForDisplay({
          ...editProfile,
          sw_package_id: numericId,
          source_references: normalizedRefs,
        });


      if (profileEditIdx === null || profileEditIdx === undefined) {
        arr.push(toSave);
        await addProfile(toSave);
      } else {
        arr[profileEditIdx] = toSave;
        await updateProfile(toSave);
      }
      setProfiles(arr);
      showToast("Profile saved", "success");
      return arr.length - 1; // return new selected index
    },
    deleteProfile: async (idx) => {
      let arr = [...profiles];
      const sw_package_id = arr[idx].sw_package_id;
      arr.splice(idx, 1);
      await deleteProfileRequest(sw_package_id);
      setProfiles(arr);
      showToast("Profile deleted", "success");
      return 0;
    },
    setProfiles,
    showToast,
  }), [profiles]);

  const value = useMemo(() => ({ profiles, toast, showToast, ...actions }), [profiles, toast, actions]);

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}
