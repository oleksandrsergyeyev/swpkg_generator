import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchProfiles, addProfile, updateProfile, deleteProfileRequest } from "../api/profiles";
import { EMPTY_PROFILE } from "../utils/constants";
import { orderProfileForDisplay, renumberSourceReferences } from "../utils/profile";

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
      const toSave = orderProfileForDisplay({
        ...editProfile,
        sw_package_id: numericId,
        source_references: renumberSourceReferences(
          (editProfile.source_references || []).map((sr) => ({
            ...sr,
            components: Array.isArray(sr.components) ? sr.components : [],
          }))
        ),
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
