import React, { useState } from "react";
import { useProfiles } from "../context/ProfilesContext";
import ProfileList from "../components/ProfileList";
import ProfileEditor from "../components/ProfileEditor";
import { renumberSourceReferences } from "../utils/profile";

export default function ProfilePage() {
  const { profiles, showToast, saveProfile, deleteProfile } = useProfiles();
  const [editIdx, setEditIdx] = useState(null);
  const [editProfile, setEditProfile] = useState(null);
  const [askDeleteIdx, setAskDeleteIdx] = useState(null);

  const startAddProfile = () => {
    setEditIdx(null);
    setEditProfile({
      sw_package_id: "",
      profile_name: "",
      generic_product_module: { location: "", id: "", version: "" },
      source_references: [],
      swad: [],
      swdd: [],
      artifacts: [],
    });
  };

  const startEditProfile = (idx) => {
    const p = profiles[idx];
    setEditIdx(idx);
    setEditProfile({
      ...p,
      swad: [...(p.swad || [])],
      swdd: [...(p.swdd || [])],
      source_references: renumberSourceReferences(
        (p.source_references || []).map((sr) => ({
          ...sr,
          components: Array.isArray(sr.components) ? [...sr.components] : [],
          additional_information: [...(sr.additional_information || [])],
        }))
      ),
      artifacts: [...(p.artifacts || [])],
    });
  };

  const cancelEditProfile = () => {
    setEditProfile(null);
    setEditIdx(null);
  };

  const onSaved = async (profile, index) => {
    try {
      await saveProfile(profile, index);
      setEditProfile(null);
      setEditIdx(null);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
      <h2>Profiles</h2>
      {!editProfile && (
        <>
          <ProfileList
            profiles={profiles}
            onAdd={startAddProfile}
            onEdit={startEditProfile}
            onAskDelete={setAskDeleteIdx}
          />
          {askDeleteIdx !== null && (
            <div style={{ marginTop: 16 }}>
              <strong>
                Delete profile {profiles[askDeleteIdx].sw_package_id}?
              </strong>
              <button
                style={{ marginLeft: 12 }}
                onClick={async () => {
                  await deleteProfile(askDeleteIdx);
                  setAskDeleteIdx(null);
                }}
              >
                Yes
              </button>
              <button
                style={{ marginLeft: 8 }}
                onClick={() => setAskDeleteIdx(null)}
              >
                No
              </button>
            </div>
          )}
        </>
      )}
      {editProfile && (
        <ProfileEditor
          initial={editProfile}
          editIdx={editIdx}
          onCancel={cancelEditProfile}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
