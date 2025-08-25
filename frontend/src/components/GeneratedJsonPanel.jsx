// src/components/GeneratedJsonPanel.jsx
import React from "react";

export default function GeneratedJsonPanel({
  value,
  title = "Generated JSON",
  height = "calc(100vh - 140px)", // default viewport height minus top bar
}) {
  const pretty = JSON.stringify(value || {}, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
    } catch {
      // no-op
    }
  };

  const handleDownload = () => {
    const blob = new Blob([pretty], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sw_package.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        width: "100%",
        background: "#222",
        color: "#d7ffb8",
        borderRadius: 8,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <h4 style={{ color: "#fff", margin: 0, marginRight: "auto" }}>{title}</h4>
        <button onClick={handleCopy} title="Copy JSON to clipboard">
          Copy
        </button>
        <button onClick={handleDownload} title="Download JSON file">
          Download
        </button>
      </div>

      <div
        style={{
          height,
          overflow: "auto",
          borderRadius: 6,
          background: "#111",
          padding: 12,
        }}
      >
        <pre
          style={{
            margin: 0,
            color: "#d7ffb8",
            fontSize: 13,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
        >
          {pretty}
        </pre>
      </div>
    </div>
  );
}
