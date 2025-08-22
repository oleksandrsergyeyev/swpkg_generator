import React from "react";

export default function Tabs({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        padding: 24,
        background: "#fff",
        borderBottom: "1px solid #eee",
      }}
    >
      <button
        style={{
          fontSize: 20,
          fontWeight: active === "profile" ? "bold" : "normal",
          background: active === "profile" ? "#eee" : "#fff",
          border: "none",
          borderBottom:
            active === "profile"
              ? "2px solid #339"
              : "2px solid transparent",
          cursor: "pointer",
        }}
        onClick={() => onChange("profile")}
      >
        Profile Management
      </button>
      <button
        style={{
          fontSize: 20,
          fontWeight: active === "generate" ? "bold" : "normal",
          background: active === "generate" ? "#eee" : "#fff",
          border: "none",
          borderBottom:
            active === "generate"
              ? "2px solid #339"
              : "2px solid transparent",
          cursor: "pointer",
        }}
        onClick={() => onChange("generate")}
      >
        Generate Package
      </button>
    </div>
  );
}
