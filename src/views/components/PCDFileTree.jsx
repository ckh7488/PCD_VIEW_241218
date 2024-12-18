import React, { useState, useEffect } from "react";

const PCDFileTree = ({ files, onToggleVisibility, onRemoveFile, onSelectFile, selectedFileName }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "t" || event.key === "T") {
        setVisible((prevVisible) => !prevVisible);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: visible ? 0 : "-250px",
        width: "250px",
        height: "100%",
        backgroundColor: "#222",
        color: "#fff",
        padding: "10px",
        boxSizing: "border-box",
        transition: "right 0.3s ease-in-out",
        overflowY: "auto",
        zIndex: 5,
      }}
    >
      <h3 style={{ borderBottom: "1px solid #555", paddingBottom: "5px" }}>
        Loaded PCD Files
      </h3>
      {files.map((file) => (
        <div
          key={file.name}
          onClick={() => onSelectFile(file.name)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "5px",
            backgroundColor: file.name === selectedFileName ? "#444" : "transparent",
            cursor: "pointer"
          }}
        >
          <div style={{ flex: 1 }}>
            {file.name}
          </div>
          <input
            type="checkbox"
            checked={file.visible}
            onChange={(e) => { e.stopPropagation(); onToggleVisibility(file.name); }}
            style={{ marginRight: "10px" }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveFile(file.name); }}
            style={{
              backgroundColor: "#ff5555",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "2px 5px",
            }}
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
};

export default PCDFileTree;
