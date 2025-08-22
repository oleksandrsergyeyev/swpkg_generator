import React from "react";

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        background:
          toast.type === "success"
            ? "#2e7d32"
            : toast.type === "error"
            ? "#c62828"
            : "#424242",
        color: "white",
        padding: "10px 14px",
        borderRadius: 8,
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        zIndex: 1000,
      }}
    >
      {toast.msg}
    </div>
  );
}
