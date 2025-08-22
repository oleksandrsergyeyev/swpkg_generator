import React from "react";

export default function ProfileList({ profiles, onAdd, onEdit, onAskDelete }) {
  return (
    <div>
      <button onClick={onAdd}>Add Profile</button>
      <table style={{ width: "100%", marginTop: 18, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>ID</th>
            <th style={{ textAlign: "center" }}>Name</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p, idx) => (
            <tr key={p.sw_package_id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ textAlign: "center" }}>{p.sw_package_id}</td>
              <td style={{ textAlign: "center" }}>{p.profile_name}</td>
              <td style={{ textAlign: "center" }}>
                <button onClick={() => onEdit(idx)}>Edit</button>
                <button
                  style={{ marginLeft: 8, color: "red" }}
                  onClick={() => onAskDelete(idx)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
