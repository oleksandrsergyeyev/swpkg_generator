import React from "react";
import { orderGeneratedForDisplay } from "../utils/profile";

export default function GeneratedJsonPanel({ value }) {
  return (
    <div
      style={{
        width: 420,
        minWidth: 320,
        background: "#222",
        color: "#d7ffb8",
        borderRadius: 8,
        padding: 24,
        fontSize: 14,
        height: 500,
        overflowY: "auto",
      }}
    >
      <h4 style={{ color: "#fff" }}>Generated JSON</h4>
      <pre>{JSON.stringify(orderGeneratedForDisplay(value || {}), null, 2)}</pre>
    </div>
  );
}
